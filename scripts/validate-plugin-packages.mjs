#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  linkSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildPluginPackage } from "./build-plugin-packages.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const allowlist = JSON.parse(readFileSync(resolve(repoRoot, "packaging/codex/allowlist.json"), "utf8"));

function parseArgs(argv) {
  const args = { selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--self-test") {
      args.selfTest = true;
      continue;
    }
    if (!value.startsWith("--") && !args.stageRoot) {
      args.stageRoot = value;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    args[key] = next;
    index += 1;
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalize(path) {
  return path.split("\\").join("/");
}

function stageFiles(currentRoot, prefix = "") {
  return readdirSync(currentRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = resolve(currentRoot, entry.name);
      const stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) throw new Error(`Staged symlink is forbidden: ${relative}`);
      if (entry.isDirectory()) return stageFiles(absolute, relative);
      if (!entry.isFile()) throw new Error(`Staged special file is forbidden: ${relative}`);
      return [{
        path: relative,
        bytes: stats.size,
        content: readFileSync(absolute),
      }];
    });
}

function candidateImports(source) {
  const patterns = [
    /from\s+["'](\.{1,2}\/[^"']+)["']/gu,
    /import\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/gu,
    /export\s+\*\s+from\s+["'](\.{1,2}\/[^"']+)["']/gu,
    /export\s+\{[^}]*\}\s+from\s+["'](\.{1,2}\/[^"']+)["']/gu,
  ];
  const found = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

function resolveImportWithinStage(stageRoot, fromFile, specifier) {
  const origin = resolve(stageRoot, dirname(fromFile), specifier);
  const candidates = [
    origin,
    `${origin}.mjs`,
    `${origin}.js`,
    `${origin}.json`,
    `${origin}.ts`,
    `${origin}.mts`,
    resolve(origin, "index.mjs"),
    resolve(origin, "index.js"),
    resolve(origin, "index.json"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function copyAllowedFixture(targetRoot) {
  for (const relative of [...allowlist.literalFiles, ...allowlist.skillTrees, ...allowlist.discoverySkillTrees]) {
    const source = resolve(repoRoot, relative);
    const destination = resolve(targetRoot, relative);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
}

function runNode(cwd, args) {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function writeLock(projectRoot) {
  writeFileSync(
    resolve(projectRoot, "STYLESEED.md"),
    `# StyleSeed - Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Brand recipe: enterprise-workbench
- Palette recipe: auto
- Aesthetic profile: swiss
- Primary action: #0F766E
`,
  );
}

async function runSelfTests() {
  const sandbox = mkdtempSync(resolve(tmpdir(), "styleseed-pkg-selftest-"));
  try {
    const cleanSource = resolve(sandbox, "clean-source");
    copyAllowedFixture(cleanSource);

    const cleanStage = resolve(sandbox, "clean-stage");
    const built = await buildPluginPackage({ sourceRoot: cleanSource, stageRoot: cleanStage, clean: true });
    assert.equal(readJson(resolve(cleanStage, "inventory.json")).files.length, built.inventory.files.length);
    assert.equal(built.inventory.distributionSource.channel, "edge");

    const releaseStage = resolve(sandbox, "release-stage");
    const releaseVersion = readJson(resolve(cleanSource, "engine/.claude/skills/ss-resolve/references/catalog.json")).engineVersion;
    const releaseArchiveName = `styleseed-core-${releaseVersion}.tar.gz`;
    const released = await buildPluginPackage({
      sourceRoot: cleanSource,
      stageRoot: releaseStage,
      clean: true,
      release: { version: releaseVersion, tag: `v${releaseVersion}` },
      archiveName: releaseArchiveName,
    });
    assert.equal(released.inventory.distributionSource.channel, "stable");
    assert.equal(released.inventory.archive.path, releaseArchiveName);
    const stableCatalog = readJson(resolve(releaseStage, "skills/ss-resolve/references/catalog.json"));
    assert.equal(stableCatalog.distributionSource.channel, "stable");
    assert.equal(stableCatalog.distributionSource.install.includes(`/${releaseArchiveName} --agent codex`), true);

    const secretSource = resolve(sandbox, "secret-source");
    copyAllowedFixture(secretSource);
    writeFileSync(resolve(secretSource, "engine/.claude/skills/ss-build/.env"), "OPENAI_API_KEY=sk-test-secret\n");
    await assert.rejects(
      () => buildPluginPackage({ sourceRoot: secretSource, stageRoot: resolve(sandbox, "secret-stage"), clean: true }),
      /Denied secret-like/,
    );

    const symlinkSource = resolve(sandbox, "symlink-source");
    copyAllowedFixture(symlinkSource);
    symlinkSync("../ss-build/SKILL.md", resolve(symlinkSource, "engine/.claude/skills/ss-a11y/linked.md"));
    await assert.rejects(
      () => buildPluginPackage({ sourceRoot: symlinkSource, stageRoot: resolve(sandbox, "symlink-stage"), clean: true }),
      /Denied symlink/,
    );

    const hardlinkSource = resolve(sandbox, "hardlink-source");
    copyAllowedFixture(hardlinkSource);
    linkSync(
      resolve(hardlinkSource, "engine/.claude/skills/ss-build/SKILL.md"),
      resolve(hardlinkSource, "engine/.claude/skills/ss-build/SKILL-hardlink.md"),
    );
    const hardlinkStats = lstatSync(resolve(hardlinkSource, "engine/.claude/skills/ss-build/SKILL-hardlink.md"));
    if (hardlinkStats.nlink > 1) {
      await assert.rejects(
        () => buildPluginPackage({ sourceRoot: hardlinkSource, stageRoot: resolve(sandbox, "hardlink-stage"), clean: true }),
        /Denied hardlink/,
      );
    }

    const specialSource = resolve(sandbox, "special-source");
    copyAllowedFixture(specialSource);
    const specialPath = resolve(specialSource, "engine/.claude/skills/ss-build/fifo");
    const fifo = spawnSync("mkfifo", [specialPath], { encoding: "utf8" });
    if (fifo.status === 0) {
      await assert.rejects(
        () => buildPluginPackage({ sourceRoot: specialSource, stageRoot: resolve(sandbox, "special-stage"), clean: true }),
        /Denied special file/,
      );
    }

    console.log("PKG-001 self-tests passed");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

async function validateStage(stageRoot) {
  const inventory = readJson(resolve(stageRoot, "inventory.json"));
  const files = stageFiles(stageRoot);
  const archiveName = inventory.archive?.path ?? allowlist.archiveName;
  const archiveFile = files.find((entry) => entry.path === archiveName);
  if (!archiveFile) throw new Error(`Missing staged archive: ${archiveName}`);
  if (archiveFile.bytes !== inventory.archive?.bytes) throw new Error("Staged archive byte count differs from inventory");
  if (createHash("sha256").update(archiveFile.content).digest("hex") !== inventory.archive?.sha256) {
    throw new Error("Staged archive checksum differs from inventory");
  }
  const payloadFiles = files.filter((entry) => entry.path !== "inventory.json" && entry.path !== archiveName);
  const topLevel = new Set(files.map((entry) => entry.path.split("/")[0]));
  for (const required of [".codex-plugin", "engine", "skills", "LICENSE", "SECURITY.md", "inventory.json", archiveName]) {
    if (!topLevel.has(required)) throw new Error(`Missing staged top-level entry: ${required}`);
  }

  for (const entry of payloadFiles) {
    const parts = entry.path.split("/");
    if (parts.some((part) => allowlist.deniedPathSegments.includes(part))) {
      throw new Error(`Denied staged path: ${entry.path}`);
    }
  }

  const expectedTotal = payloadFiles.reduce((sum, entry) => sum + entry.bytes, 0);
  if (expectedTotal > allowlist.maxPayloadBytes) {
    throw new Error(`Staged payload exceeds size limit: ${expectedTotal}`);
  }
  if (inventory.payloadBytes !== expectedTotal) {
    throw new Error(`Inventory payloadBytes mismatch: ${inventory.payloadBytes} != ${expectedTotal}`);
  }

  const actualEntries = payloadFiles.map((entry) => ({
    path: entry.path,
    bytes: entry.bytes,
    sha256: createHash("sha256").update(entry.content).digest("hex"),
  }));
  if (JSON.stringify(inventory.files) !== JSON.stringify(actualEntries)) {
    throw new Error("Inventory file set does not match staged payload bytes");
  }

  const manifest = readJson(resolve(stageRoot, ".codex-plugin/plugin.json"));
  if (manifest.skills !== "./skills/") throw new Error("Staged manifest skills path drifted");
  if ("mcpServers" in manifest) throw new Error("Staged manifest must expose zero MCP servers");
  if (!existsSync(resolve(stageRoot, manifest.skills))) throw new Error("Staged manifest skills path does not resolve");
  const canonicalCatalog = readJson(resolve(stageRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"));
  const discoveryCatalog = readJson(resolve(stageRoot, "skills/ss-resolve/references/catalog.json"));
  if (JSON.stringify(canonicalCatalog.distributionSource) !== JSON.stringify(discoveryCatalog.distributionSource)) {
    throw new Error("Staged canonical and discovery catalogs disagree on distribution source");
  }
  if (JSON.stringify(inventory.distributionSource) !== JSON.stringify(discoveryCatalog.distributionSource)) {
    throw new Error("Inventory distribution source differs from the staged catalog");
  }

  for (const entry of payloadFiles.filter((file) => /\.(?:mjs|js|ts|mts)$/u.test(file.path))) {
    for (const specifier of candidateImports(entry.content.toString("utf8"))) {
      const resolved = resolveImportWithinStage(stageRoot, entry.path, specifier);
      if (!resolved) throw new Error(`Relative import escaped or failed to resolve: ${entry.path} -> ${specifier}`);
      const normalized = normalize(resolved);
      if (!normalized.startsWith(normalize(stageRoot) + "/")) {
        throw new Error(`Relative import escaped staging: ${entry.path} -> ${specifier}`);
      }
    }
  }

  const smokeRoot = mkdtempSync(resolve(tmpdir(), "styleseed-pkg-smoke-"));
  const projectRoot = resolve(smokeRoot, "project");
  try {
    cpSync(stageRoot, projectRoot, { recursive: true });
    writeLock(projectRoot);

    const listRun = runNode(projectRoot, ["skills/ss-resolve/scripts/resolve-context.mjs", "--list"]);
    if (listRun.status !== 0) throw new Error(`Staged resolver --list failed:\n${listRun.stderr || listRun.stdout}`);

    const resolveRun = runNode(projectRoot, [
      "skills/ss-resolve/scripts/resolve-context.mjs",
      "--project-root",
      ".",
      "--from-lock",
      "STYLESEED.md",
      "--agent",
      "codex",
    ]);
    if (resolveRun.status !== 0) throw new Error(`Staged resolver build failed:\n${resolveRun.stderr || resolveRun.stdout}`);

    const checkRun = runNode(projectRoot, [
      "skills/ss-resolve/scripts/resolve-context.mjs",
      "--project-root",
      ".",
      "--from-lock",
      "STYLESEED.md",
      "--agent",
      "codex",
      "--check",
    ]);
    if (checkRun.status !== 0) throw new Error(`Staged resolver --check failed:\n${checkRun.stderr || checkRun.stdout}`);

    const catalog = readJson(resolve(projectRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"));
    const versionJsonPath = resolve(projectRoot, "version.json");
    writeFileSync(versionJsonPath, `${JSON.stringify({
      version: catalog.engineVersion,
      revision: catalog.engineRevision,
      skillsRevision: catalog.distributions.skills.revision,
    }, null, 2)}\n`);
    const updateRun = runNode(projectRoot, [
      "skills/ss-update/scripts/check-update.mjs",
      "--project-root",
      ".",
      "--remote",
      versionJsonPath,
      "--json",
    ]);
    if (updateRun.status !== 0) throw new Error(`Staged update check failed:\n${updateRun.stderr || updateRun.stdout}`);
    const updateResult = JSON.parse(updateRun.stdout);
    if (updateResult.status !== "current" || updateResult.installed?.verificationStatus !== "verified") {
      throw new Error(`Staged update integrity is not current + verified:\n${updateRun.stdout}`);
    }
  } finally {
    rmSync(smokeRoot, { recursive: true, force: true });
  }

  const officialValidator = {
    status: "NOT VERIFIED",
    note: "No official plugin validator binary was found in the current workspace; nothing was installed.",
  };

  return {
    status: "VERIFIED",
    payloadBytes: expectedTotal,
    fileCount: actualEntries.length,
    archive: inventory.archive,
    officialValidator,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    await runSelfTests();
    return;
  }
  const stageRoot = resolve(repoRoot, args.stageRoot ?? allowlist.stageRoot);
  const result = await validateStage(stageRoot);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
