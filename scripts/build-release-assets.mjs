#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPluginPackage } from "./build-plugin-packages.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(repoRoot, "dist");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
    args[value.slice(2)] = next;
    index += 1;
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function asset(path) {
  return {
    path,
    bytes: statSync(path).size,
    sha256: `sha256:${sha256(path)}`,
  };
}

function requireMatch(value, pattern, label) {
  if (!value || !pattern.test(value)) throw new Error(`Invalid ${label}: ${String(value)}`);
  return value;
}

function normalizeCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --created-at: ${value}`);
  return date.toISOString();
}

function assertReleaseOutput(path) {
  const normalized = resolve(path);
  if (!normalized.startsWith(`${distRoot}${sep}`)) {
    throw new Error(`Release output must stay inside ${distRoot}`);
  }
  return normalized;
}

function buildCoreSpdx({ inventory, stageRoot, version, tag, gitSha, createdAt, archiveAsset }) {
  const archiveUrl = `https://github.com/bitjaru/styleseed/releases/download/${tag}/${archiveAsset.path}`;
  const files = inventory.files.map((entry, index) => ({
    fileName: entry.path,
    SPDXID: `SPDXRef-File-${String(index + 1).padStart(3, "0")}`,
    checksums: [{ algorithm: "SHA256", checksumValue: entry.sha256 }],
    licenseConcluded: "NOASSERTION",
    copyrightText: "NOASSERTION",
  }));
  for (const entry of inventory.files) {
    const currentHash = sha256(resolve(stageRoot, entry.path));
    if (currentHash !== entry.sha256) throw new Error(`Staged file changed after inventory: ${entry.path}`);
  }
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `styleseed-core-${version}`,
    documentNamespace: `https://github.com/bitjaru/styleseed/releases/download/${tag}/spdx/${gitSha}`,
    creationInfo: {
      created: createdAt,
      creators: ["Tool: styleseed-build-release-assets/1"],
    },
    packages: [{
      name: "styleseed-core",
      SPDXID: "SPDXRef-Package-styleseed-core",
      versionInfo: version,
      downloadLocation: archiveUrl,
      filesAnalyzed: true,
      checksums: [{ algorithm: "SHA256", checksumValue: archiveAsset.sha256.slice(7) }],
      homepage: "https://github.com/bitjaru/styleseed",
      licenseConcluded: "MIT",
      licenseDeclared: "MIT",
      copyrightText: "NOASSERTION",
      externalRefs: [{
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: `pkg:generic/styleseed-core@${version}`,
      }],
    }],
    files,
    relationships: [
      {
        spdxElementId: "SPDXRef-DOCUMENT",
        relationshipType: "DESCRIBES",
        relatedSpdxElement: "SPDXRef-Package-styleseed-core",
      },
      ...files.map((file) => ({
        spdxElementId: "SPDXRef-Package-styleseed-core",
        relationshipType: "CONTAINS",
        relatedSpdxElement: file.SPDXID,
      })),
    ],
  };
}

function buildDemoCycloneDx(createdAt) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmCommand,
    ["sbom", "--package-lock-only", "--sbom-format", "cyclonedx", "--omit=dev"],
    {
      cwd: resolve(repoRoot, "demo-pricing"),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.status !== 0) throw new Error(`npm sbom failed:\n${result.stderr || result.stdout}`);
  const sbom = JSON.parse(result.stdout);
  delete sbom.serialNumber;
  sbom.metadata = { ...sbom.metadata, timestamp: createdAt };
  const serialized = JSON.stringify(sbom);
  if (serialized.includes(repoRoot)) throw new Error("CycloneDX SBOM leaked the local repository path");
  return sbom;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const version = requireMatch(args.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u, "--version");
  const tag = requireMatch(args.tag ?? `v${version}`, /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u, "--tag");
  if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match version ${version}`);
  const gitSha = requireMatch(args["git-sha"], /^[0-9a-f]{40}$/u, "--git-sha");
  const createdAt = normalizeCreatedAt(args["created-at"]);
  const engineVersion = readFileSync(resolve(repoRoot, "engine/VERSION"), "utf8").trim();
  if (engineVersion !== version) throw new Error(`engine/VERSION ${engineVersion} does not match ${version}`);

  const outputRoot = assertReleaseOutput(args["output-dir"] ?? resolve(distRoot, "release"));
  const stageRoot = resolve(outputRoot, "stage");
  const archiveName = `styleseed-core-${version}.tar.gz`;
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  const built = await buildPluginPackage({
    sourceRoot: repoRoot,
    stageRoot,
    clean: true,
    release: { version, tag },
    archiveName,
  });
  const inventorySource = resolve(stageRoot, "inventory.json");
  const archiveSource = resolve(stageRoot, archiveName);
  const inventoryTarget = resolve(outputRoot, "inventory.json");
  const archiveTarget = resolve(outputRoot, archiveName);
  copyFileSync(inventorySource, inventoryTarget);
  copyFileSync(archiveSource, archiveTarget);

  const inventory = readJson(inventoryTarget);
  if (inventory.distributionSource?.channel !== "stable") throw new Error("Release inventory is not stable-channel bound");
  if (inventory.files.some((entry) => /ss-learn|extensions\/learning|\/mcp\//iu.test(entry.path))) {
    throw new Error("Optional learning or MCP content leaked into the core release inventory");
  }

  const archiveAsset = asset(archiveTarget);
  const inventoryAsset = asset(inventoryTarget);
  const coreSbomPath = resolve(outputRoot, "sbom-core.spdx.json");
  const demoSbomPath = resolve(outputRoot, "sbom-demo.cdx.json");
  writeJson(coreSbomPath, buildCoreSpdx({
    inventory,
    stageRoot,
    version,
    tag,
    gitSha,
    createdAt,
    archiveAsset: { ...archiveAsset, path: archiveName },
  }));
  writeJson(demoSbomPath, buildDemoCycloneDx(createdAt));
  const coreSbomAsset = asset(coreSbomPath);
  const demoSbomAsset = asset(demoSbomPath);
  const catalog = readJson(resolve(repoRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"));
  const workflowRunUrl = args["workflow-run-url"] ?? null;
  const tagVerified = args["tag-verified"] === "true";
  if (args["tag-verified"] && !["true", "false"].includes(args["tag-verified"])) {
    throw new Error("--tag-verified must be true or false");
  }

  const manifest = {
    schemaVersion: 2,
    status: "draft-prepared",
    version,
    tag,
    preparedOn: createdAt.slice(0, 10),
    createdAt,
    gitSha,
    engine: {
      version,
      coreRevision: catalog.engineRevision,
      coreRevisionFiles: catalog.distributions.core.files.length,
      skillsRevision: catalog.distributions.skills.revision,
      skillsRevisionFiles: catalog.distributions.skills.files.length,
      coreSkills: 23,
    },
    package: {
      name: inventory.packageName,
      payloadBytes: inventory.payloadBytes,
      fileCount: inventory.files.length,
      optionalLearningIncluded: false,
      distributionSource: inventory.distributionSource,
      archive: { ...archiveAsset, path: archiveName },
      inventory: { ...inventoryAsset, path: "inventory.json" },
      deterministicRebuild: "deterministic-builder-used",
    },
    sboms: [
      { ...coreSbomAsset, path: "sbom-core.spdx.json", format: "SPDX-2.3", scope: "core release archive files" },
      { ...demoSbomAsset, path: "sbom-demo.cdx.json", format: "CycloneDX", scope: "demo-pricing production lockfile dependencies" },
    ],
    verification: {
      status: workflowRunUrl && tagVerified ? "ci-passed-before-manifest" : "local-only",
      workflowRunUrl,
      requiredChecks: [
        "generated-file drift",
        "engine and runtime contracts",
        "learning security and isolation",
        "palette validation",
        "package validation",
        "markdown links",
        "production web build",
        "browser smoke",
      ],
    },
    benchmark: {
      status: "not-run",
      reason: "This release-preparation workflow does not execute a new benchmark.",
      claimRestrictions: [
        "no new performance claim",
        "no new gate-effect claim",
        "no superiority claim",
      ],
    },
    releaseBoundaries: {
      tag: tagVerified ? "checked-out-and-matched" : "not-verified",
      githubRelease: "not-created",
      productionDeploy: "not-run",
    },
  };
  const manifestPath = resolve(outputRoot, "release-manifest.json");
  writeJson(manifestPath, manifest);

  const checksumAssets = [archiveTarget, inventoryTarget, coreSbomPath, demoSbomPath, manifestPath]
    .map((path) => ({ name: path.slice(outputRoot.length + 1), sha256: sha256(path) }))
    .sort((left, right) => left.name.localeCompare(right.name));
  writeFileSync(
    resolve(outputRoot, "SHA256SUMS"),
    `${checksumAssets.map((entry) => `${entry.sha256}  ${entry.name}`).join("\n")}\n`,
  );
  rmSync(stageRoot, { recursive: true, force: true });

  console.log(JSON.stringify({
    outputRoot,
    version,
    tag,
    gitSha,
    assets: [...checksumAssets.map((entry) => entry.name), "SHA256SUMS"],
  }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
