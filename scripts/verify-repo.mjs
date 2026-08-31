#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = resolve(repoRoot, "demo-pricing");
const flags = new Set(process.argv.slice(2));
const allowedFlags = new Set(["--core", "--browser", "--webpack", "--help"]);
for (const flag of flags) {
  if (!allowedFlags.has(flag)) throw new Error(`Unknown option: ${flag}`);
}
if (flags.has("--help")) {
  console.log(`Usage: node scripts/verify-repo.mjs [--core] [--browser] [--webpack]

Runs the canonical generated-file, engine, runtime, package, link, and diff gates.
The default also builds demo-pricing. Install demo dependencies first with npm ci --prefix demo-pricing.
--core skips the demo build. --browser adds the Playwright smoke suite. --webpack uses the documented
Next.js Webpack fallback for constrained local environments; CI intentionally exercises Turbopack.`);
  process.exit(0);
}
if (flags.has("--core") && (flags.has("--browser") || flags.has("--webpack"))) {
  throw new Error("--core cannot be combined with --browser or --webpack");
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const runtimeTests = readdirSync(resolve(repoRoot, "scripts/runtime-tests"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => resolve(repoRoot, "scripts/runtime-tests", name));

function gitSnapshot() {
  const diff = spawnSync("git", ["diff", "--binary", "--no-ext-diff", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (diff.status !== 0 || status.status !== 0) throw new Error("Could not capture the repository baseline");
  return `${status.stdout}\n---PATCH---\n${diff.stdout}`;
}

function run(label, command, args, cwd = repoRoot) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed with exit ${result.status}`);
}

const node = process.execPath;
const initialSnapshot = gitSnapshot();
const coreChecks = [
  ["Build context catalog", node, ["scripts/build-context-catalog.mjs"]],
  ["Build learning catalog", node, ["extensions/learning/runtime/scripts/build-learning-catalog.mjs"]],
  ["Build public catalogs", node, ["demo-pricing/scripts/build-llms.mjs"]],
  ["Validate skill contracts", node, ["scripts/validate-skill-contracts.mjs"]],
  ["Test router contract", node, ["scripts/test-router-contract.mjs"]],
  ["Test core/learning isolation", node, ["scripts/test-core-learning-isolation.mjs"]],
  ["Test core plugin boundary", node, ["scripts/test-core-plugin-boundary.mjs"]],
  ["Test public claims", node, ["scripts/test-public-claims.mjs"]],
  ["Test learning security", node, ["scripts/test-learning-security.mjs"]],
  ["Validate palettes", node, ["scripts/validate-palettes.mjs"]],
  ["Run runtime tests", node, ["--test", ...runtimeTests]],
  ["Validate engine", node, ["scripts/validate-engine.mjs"]],
  ["Build core plugin package", node, ["scripts/build-plugin-packages.mjs", "--clean"]],
  ["Validate core plugin package", node, ["scripts/validate-plugin-packages.mjs"]],
  ["Check Markdown links", node, ["scripts/check-markdown-links.mjs"]],
];
for (const [label, command, args] of coreChecks) run(label, command, args);

if (!flags.has("--core")) {
  const buildArgs = flags.has("--webpack") ? ["run", "build", "--", "--webpack"] : ["run", "build"];
  run(flags.has("--webpack") ? "Build demo with Webpack" : "Build demo with Turbopack", npmCommand, buildArgs, demoRoot);
  if (flags.has("--browser")) run("Run browser smoke tests", npmCommand, ["run", "test:browser"], demoRoot);
}

run("Check patch whitespace", "git", ["diff", "--check"]);
if (gitSnapshot() !== initialSnapshot) {
  throw new Error("Generated files drifted during verification; inspect and commit the maintained outputs, then rerun");
}
console.log(`\nRepository verification passed (${flags.has("--core") ? "core" : flags.has("--browser") ? "full + browser" : "full"}).`);
