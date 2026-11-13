#!/usr/bin/env node
// The evidence pack and the engine defaults (WO-11 A3): the two generated files inside the skill that the
// system proposer (ss-resolve/scripts/propose-system.mjs) reads. The pack is built from the one corpus run
// named in research/consensus/evidence-pack-run.json; `research/` itself does not ship. The engine
// defaults are read from the component sources, engine/css/recipes.css, and the rule catalog.
//
//   node scripts/build-evidence-pack.mjs            write both files
//   node scripts/build-evidence-pack.mjs --check    exit 1 if either would change
//
// Runs first in verify-repo.mjs: build-context-catalog.mjs hashes every file under the skill, so the
// files it writes must exist before the catalog is built.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENT_SOURCES, buildEngineDefaults, buildEvidencePack } from "./lib/evidence-pack.mjs";
import { themeColors } from "./build-component-contracts.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = "research/consensus/evidence-pack-run.json";
const REFERENCES = "engine/.claude/skills/styleseed/workflows/ss-resolve/references";
const PACK_PATH = `${REFERENCES}/evidence-pack.json`;
const DEFAULTS_PATH = `${REFERENCES}/engine-defaults.json`;
const POINTER_HINT = `set \`run\` in ${POINTER} to a folder under research/consensus/runs/`;

const fail = (message) => { console.error(`evidence pack: ${message}`); process.exit(1); };
function readJson(relative, hint) {
  const path = join(root, relative);
  if (!existsSync(path)) fail(`${relative} is missing; ${hint}`);
  try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { return fail(`${relative} is not valid JSON (${error.message}); ${hint}`); }
}
function readText(relative) {
  const path = join(root, relative);
  if (!existsSync(path)) fail(`${relative} is missing; the engine defaults read it`);
  return readFileSync(path, "utf8");
}

const check = process.argv.includes("--check");
const unknown = process.argv.slice(2).filter((arg) => arg !== "--check");
if (unknown.length) fail(`unknown argument ${unknown.join(" ")}; usage: node scripts/build-evidence-pack.mjs [--check]`);

const pointer = readJson(POINTER, `write { "run": "<date>" } there and ${POINTER_HINT}`);
if (!pointer || typeof pointer !== "object" || Array.isArray(pointer) || Object.keys(pointer).join() !== "run" || typeof pointer.run !== "string" || !/^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$/u.test(pointer.run)) {
  fail(`${POINTER} must be exactly { "run": "<run folder name>" }; ${POINTER_HINT}`);
}
const runPath = `research/consensus/runs/${pointer.run}`;
if (!existsSync(join(root, runPath))) fail(`${runPath} does not exist; ${POINTER_HINT}`);
const consensus = readJson(`${runPath}/consensus.json`, POINTER_HINT);
const manifest = readJson(`${runPath}/manifest.json`, POINTER_HINT);
const run = readJson(`${runPath}/run.json`, POINTER_HINT);
const catalog = readJson("engine/rules/catalog.json", "the engine defaults read the CRAFT-spacing-scale rule from it");
const sources = Object.fromEntries(Object.entries(COMPONENT_SOURCES).map(([id, path]) => [id, readText(path)]));

const built = buildEvidencePack({ consensus, manifest, run, runPath });
const defaults = buildEngineDefaults({ sources, colours: themeColors(), recipesCss: readText("engine/css/recipes.css"), rules: catalog.rules ?? [] });
const problems = [...built.problems, ...defaults.problems];
if (problems.length) {
  console.error(`evidence pack: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const stale = [];
for (const [relative, value] of [[PACK_PATH, built.pack], [DEFAULTS_PATH, defaults.defaults]]) {
  const path = join(root, relative);
  const next = `${JSON.stringify(value, null, 1)}\n`;
  if (existsSync(path) && readFileSync(path, "utf8") === next) continue;
  stale.push(relative);
  if (!check) writeFileSync(path, next);
}
if (check && stale.length) {
  console.error(`evidence pack: out of date — run node scripts/build-evidence-pack.mjs\n${stale.map((path) => `  - ${path}`).join("\n")}`);
  process.exit(1);
}
const { pack } = built;
const components = Object.values(defaults.defaults.components).filter(Boolean).length;
console.log(`evidence pack: run ${pack.run.id}, ${pack.claims.length} claims, ${pack.rows.length} rows, ${pack.lineages.length} lineages; engine defaults: ${components} components, ${Object.keys(defaults.defaults.recipes).length} recipes${stale.length && !check ? `; wrote ${stale.length} file(s)` : ""}`);
