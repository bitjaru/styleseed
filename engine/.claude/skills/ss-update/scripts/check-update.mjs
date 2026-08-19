#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDistribution } from "../../ss-resolve/scripts/distribution-integrity.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (["json", "help"].includes(key)) {
      out[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function readRemote(source) {
  if (existsSync(source)) return readJson(resolve(source));
  if (!/^https?:\/\//.test(source)) {
    throw new Error(`Remote version source is neither a file nor an HTTP URL: ${source}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(source, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Remote version request failed: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function firstJson(paths) {
  const path = paths.find((candidate) => existsSync(candidate));
  return path ? { path, value: readJson(path) } : null;
}

function shortRevision(value) {
  return value?.startsWith("sha256:") ? value.slice(7, 19) : value ?? "unknown";
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`StyleSeed update checker

Usage:
  check-update.mjs [--project-root <path>] [--remote <URL-or-file>] [--json]

Compares the installed distribution revision, the project's last resolved revision, and the
published revision. It is read-only and never updates project or skill files.`);
  process.exit(0);
}

const projectRoot = resolve(args["project-root"] ?? process.cwd());
const remoteSource = args.remote ?? "https://styleseed-demo.vercel.app/version.json";
const installed = firstJson([
  resolve(projectRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"),
  resolve(projectRoot, ".claude/skills/ss-resolve/references/catalog.json"),
  resolve(projectRoot, ".agents/skills/ss-resolve/references/catalog.json"),
  resolve(scriptDir, "../../ss-resolve/references/catalog.json"),
]);
const projectManifest = firstJson([
  resolve(projectRoot, ".styleseed/manifest.json"),
]);
const legacyConflicts = [
  ".agents/skills/styleseed-design-review/SKILL.md",
  ".claude/skills/styleseed-design-review/SKILL.md",
  ".cursor/skills/styleseed-design-review/SKILL.md",
  ".github/skills/styleseed-design-review/SKILL.md",
  ".gemini/skills/styleseed-design-review/SKILL.md",
  ".opencode/skills/styleseed-design-review/SKILL.md",
].flatMap((relativePath) => {
  const path = resolve(projectRoot, relativePath);
  if (!existsSync(path)) return [];
  const content = readFileSync(path);
  return [{
    path,
    sha256: createHash("sha256").update(content).digest("hex"),
    reason: "Retired standalone seven-category reviewer can conflict with canonical ss-score.",
  }];
});
const remote = await readRemote(remoteSource);

const installedVersion = installed?.value.engineVersion ?? null;
const installedDeclaredRevision = installed?.value.distributions?.core?.revision ?? installed?.value.engineRevision ?? null;
const projectVersion = projectManifest?.value.engineVersion ?? null;
const projectRevision = projectManifest?.value.engineRevision ?? null;
const remoteVersion = remote.version ?? null;
const remoteRevision = remote.revision ?? null;
const installedScriptPath = installed?.path
  ? resolve(dirname(installed.path), "..", "..", "ss-update", "scripts", "check-update.mjs")
  : null;
const installedVerification = installed
  ? (() => {
    try {
      return {
        ...verifyDistribution({ catalog: installed.value, scriptPath: installedScriptPath }),
        error: null,
      };
    } catch (error) {
      return {
        status: "unverified",
        computedRevision: null,
        mismatches: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })()
  : null;
const installedDistribution = installedVerification?.distribution ?? null;
const installedDistributionRevision = installedVerification?.computedRevision ?? null;
const installedDeclaredDistributionRevision = installedDistribution
  ? installed?.value.distributions?.[installedDistribution]?.revision ?? null
  : null;
const remoteDistributionRevision = installedDistribution === "skills"
  ? remote.skillsRevision ?? null
  : remoteRevision;
const registryPresent = existsSync(resolve(projectRoot, ".styleseed/project.json"))
  && existsSync(resolve(projectRoot, ".styleseed/artifacts/index.json"));
const artifactImpact = registryPresent
  ? (await import("./artifact-impact.mjs")).inspectArtifactImpact({
      projectRoot,
      installedCatalog: installed?.value ?? null,
    })
  : { artifacts: [] };

let status;
let reason;
if (installed && installedVerification?.status === "unverified") {
  status = "installed-revision-unverified";
  reason = installedVerification.error ?? "The installed catalog cannot prove the staged core distribution bytes.";
} else if (installedVerification?.status === "incomplete") {
  status = "installed-revision-unverified";
  reason = `The installed ${installedDistribution ?? "core"} distribution is missing required files, so its declared revision cannot be trusted.`;
} else if (installedVerification?.status === "tampered") {
  status = "installed-revision-tampered";
  reason = `Installed ${installedDistribution ?? "core"} distribution bytes differ from the catalog inventory, so the declared revision is not current.`;
} else if (!installedDistributionRevision && remoteDistributionRevision) {
  status = "update-available";
  reason = "The installed payload predates revision tracking; refresh it once to establish an exact baseline.";
} else if (
  installedDistributionRevision
  && remoteDistributionRevision
  && installedDistributionRevision !== remoteDistributionRevision
) {
  status = "update-available";
  reason = `The published ${installedDistribution ?? "core"} payload differs from the installed payload, even if the release version is unchanged.`;
} else if (installedDeclaredRevision && remoteRevision && installedDeclaredRevision !== remoteRevision) {
  status = "update-available";
  reason = "The published engine metadata differs from the installed catalog, even if this channel's executable bytes are unchanged.";
} else if (!remoteRevision && installedVersion && remoteVersion && installedVersion !== remoteVersion) {
  status = "update-available";
  reason = "The published release version differs; the remote endpoint does not expose an exact revision yet.";
} else if (!remoteRevision || !remoteDistributionRevision) {
  status = "remote-revision-unavailable";
  reason = `The remote endpoint cannot prove exact ${installedDistribution ?? "core"} payload equality; do not claim the install is current from version alone.`;
} else if (legacyConflicts.length > 0) {
  status = "legacy-skill-conflict";
  reason = "The canonical payload is current, but a retired standalone reviewer still competes with ss-score.";
} else if (projectManifest && projectRevision !== installedDeclaredRevision) {
  status = "project-bundle-stale";
  reason = "The installed engine is current, but this project's effective bundle was resolved from another revision.";
} else {
  status = "current";
  reason = "Installed and published distribution revisions match, and the project bundle is aligned when present.";
}

const result = {
  schemaVersion: 1,
  status,
  reason,
  installed: {
    version: installedVersion,
    revision: installedDeclaredRevision,
    declaredRevision: installedDeclaredRevision,
    distribution: installedDistribution,
    distributionRevision: installedDistributionRevision,
    declaredDistributionRevision: installedDeclaredDistributionRevision,
    computedRevision: installedDistributionRevision,
    verificationStatus: installedVerification?.status ?? null,
    catalogPath: installed?.path ?? null,
    mismatches: installedVerification?.mismatches ?? [],
    verificationError: installedVerification?.error ?? null,
  },
  project: {
    version: projectVersion,
    revision: projectRevision,
    manifestPath: projectManifest?.path ?? null,
  },
  remote: {
    version: remoteVersion,
    revision: remoteRevision,
    distribution: installedDistribution,
    distributionRevision: remoteDistributionRevision,
    source: remoteSource,
  },
  legacyConflicts,
  artifacts: artifactImpact.artifacts,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`StyleSeed update status: ${status}`);
  console.log(`installed ${installedVersion ?? "unknown"} @ ${shortRevision(installedDeclaredRevision)}`);
  console.log(`payload   ${installedDistribution ?? "unknown"} @ ${shortRevision(installedDistributionRevision)}`);
  console.log(`project   ${projectVersion ?? "not resolved"} @ ${shortRevision(projectRevision)}`);
  console.log(`published ${remoteVersion ?? "unknown"} @ ${shortRevision(remoteRevision)}`);
  console.log(reason);
}
