#!/usr/bin/env node
// Scan every artifact in the repository's own registry (.styleseed/artifacts/index.json) with the
// deterministic checker and fail on any contract error (SS000): a manifest whose method hash, bundle
// hash, or inputs no longer match the current engine and artifact config. Detector findings
// (SS001–SS006) are printed as counts per artifact and do not fail this step.
//
//   node scripts/check-registry-artifacts.mjs
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checker = join(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-score/scripts/styleseed-check.mjs");
export const RECOMPILE = "node engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs --project-root . --all --agent codex";

export function registryArtifactIds(root = repoRoot) {
  const index = join(root, ".styleseed/artifacts/index.json");
  if (!existsSync(index)) throw new Error(".styleseed/artifacts/index.json is missing; it lists the site artifacts this check scans");
  const ids = (JSON.parse(readFileSync(index, "utf8")).artifacts ?? []).map((entry) => entry.id);
  if (!ids.length) throw new Error(".styleseed/artifacts/index.json lists no artifacts; add each site artifact to \"artifacts\"");
  return ids;
}

export function scanRegistryArtifact(id, root = repoRoot) {
  const run = spawnSync(process.execPath, [checker, "scan", "--project-root", ".", "--artifact", id, "--format", "json"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let report;
  try { report = JSON.parse(run.stdout); } catch { throw new Error(`styleseed-check scan --artifact ${id} printed no JSON report (exit ${run.status}): ${run.stderr.trim() || "no stderr"}`); }
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const counts = {};
  for (const finding of findings) counts[finding.id] = (counts[finding.id] ?? 0) + 1;
  return { id, counts, contractErrors: findings.filter((finding) => finding.id === "SS000") };
}

function main() {
  const results = registryArtifactIds().map((id) => scanRegistryArtifact(id));
  for (const { id, counts } of results) {
    const parts = Object.keys(counts).sort().map((key) => `${key} ${counts[key]}`);
    console.log(`${id}: ${parts.length ? parts.join(" · ") : "no findings"}`);
  }
  const errors = results.flatMap(({ id, contractErrors }) => contractErrors.map((finding) => `${id}: ${finding.file}: ${finding.message}`));
  if (errors.length) {
    console.error(`registry check: ${errors.length} contract error(s) (SS000)`);
    for (const line of errors) console.error(`  - ${line}`);
    console.error(`Recompile with \`${RECOMPILE}\`, then commit .styleseed/bundles, .styleseed/manifests and .styleseed/palettes.`);
    process.exit(1);
  }
  console.log(`registry check: ${results.length} artifact(s), no contract errors; detector findings above do not fail this step`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
