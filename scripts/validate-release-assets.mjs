#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(repoRoot, process.argv[2] ?? "dist/release");
const allowedRoot = resolve(repoRoot, "dist");
if (!outputRoot.startsWith(`${allowedRoot}${sep}`)) throw new Error("Release assets must be under dist/");

const readJson = (name) => JSON.parse(readFileSync(resolve(outputRoot, name), "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const manifest = readJson("release-manifest.json");
const inventory = readJson("inventory.json");
const catalog = JSON.parse(readFileSync(resolve(repoRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"), "utf8"));
const version = readFileSync(resolve(repoRoot, "engine/VERSION"), "utf8").trim();
const archiveName = `styleseed-core-${version}.tar.gz`;
const expectedFiles = [
  "SHA256SUMS",
  archiveName,
  "inventory.json",
  "release-manifest.json",
  "sbom-core.spdx.json",
  "sbom-demo.cdx.json",
].sort();
const actualFiles = readdirSync(outputRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();
assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), `Unexpected release file set: ${actualFiles.join(", ")}`);

const checksumLines = readFileSync(resolve(outputRoot, "SHA256SUMS"), "utf8").trim().split("\n");
const checksums = new Map(checksumLines.map((line) => {
  const match = line.match(/^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/u);
  if (!match) throw new Error(`Invalid checksum line: ${line}`);
  return [match[2], match[1]];
}));
for (const name of expectedFiles.filter((name) => name !== "SHA256SUMS")) {
  assert(checksums.get(name) === sha256(resolve(outputRoot, name)), `Checksum mismatch: ${name}`);
}

assert(manifest.schemaVersion === 2 && manifest.status === "draft-prepared", "Release manifest must remain draft-prepared");
assert(manifest.version === version && manifest.tag === `v${version}`, "Release version/tag drifted from engine/VERSION");
assert(/^[0-9a-f]{40}$/u.test(manifest.gitSha), "Release manifest Git SHA is invalid");
assert(manifest.engine.coreRevision === catalog.engineRevision, "Release core revision differs from the canonical catalog");
assert(manifest.engine.skillsRevision === catalog.distributions.skills.revision, "Release skills revision differs from the canonical catalog");
assert(manifest.package.optionalLearningIncluded === false, "Release manifest claims optional learning is included");
assert(inventory.distributionSource?.channel === "stable", "Release inventory is not stable-channel bound");
assert(inventory.files.length === manifest.package.fileCount, "Release inventory file count drifted");
assert(!inventory.files.some((entry) => /ss-learn|extensions\/learning|\/mcp\//iu.test(entry.path)), "Learning or MCP path leaked into core inventory");
assert(statSync(resolve(outputRoot, archiveName)).size === manifest.package.archive.bytes, "Archive byte count differs from manifest");
assert(`sha256:${sha256(resolve(outputRoot, archiveName))}` === manifest.package.archive.sha256, "Archive checksum differs from manifest");
assert(manifest.benchmark.status === "not-run" && manifest.benchmark.claimRestrictions.length === 3, "Benchmark boundary is incomplete");
assert(manifest.releaseBoundaries.githubRelease === "not-created", "Asset preparation must not claim a GitHub release");
if (manifest.verification.status === "ci-passed-before-manifest") {
  assert(manifest.releaseBoundaries.tag === "checked-out-and-matched", "CI release assets must verify the tag boundary");
}

const spdx = readJson("sbom-core.spdx.json");
const cycloneDx = readJson("sbom-demo.cdx.json");
assert(spdx.spdxVersion === "SPDX-2.3" && spdx.files.length === inventory.files.length, "Core SPDX SBOM is incomplete");
assert(cycloneDx.bomFormat === "CycloneDX" && Array.isArray(cycloneDx.components), "Demo CycloneDX SBOM is invalid");
const serialized = JSON.stringify({ manifest, inventory, spdx, cycloneDx });
assert(!serialized.includes(repoRoot), "Release metadata leaked the local repository path");

console.log(`Release assets verified: ${version}, ${inventory.files.length} core files, ${expectedFiles.length} artifacts, stable channel.`);
