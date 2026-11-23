#!/usr/bin/env node
// The measured design systems page (WO-18 Part A): demo-pricing/content/systems.json, which /systems renders,
// generated from demo-pricing/content/systems-source.json and the corpus run it names
// (research/consensus/runs/<run>/consensus.json, run.json, manifest.json). Nothing on the page is typed by hand
// except the source file's summaries and example ids.
//
// A system's reading is the study's own row value: the one row with that claim, pageType "all", viewport 1440,
// and the system's entry in its lineages[]. Heights are the study's 4px buckets and corners are rounded to 1px
// (scripts/lib/consensus.mjs); this script derives no second, exact value beside the study's.
//
//   node scripts/build-systems-showcase.mjs [--root <dir>]            write the JSON
//   node scripts/build-systems-showcase.mjs [--root <dir>] --check    exit 1 if the JSON would change
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_PATH = "demo-pricing/content/systems-source.json";
export const OUT_PATH = "demo-pricing/content/systems.json";
export const CLAIMS = Object.freeze(["button.height", "field.height", "button.radius", "field.radius", "table.bodyRowHeight", "nav.itemHeight"]);
const RUN_NAME = /^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$/u;
const SITE = "pageType \"all\", viewport 1440";

const corner = (who, n) => (n === 999 ? `${who} are pills` : n === 0 ? `${who} are square` : `${who} have ${n}px corners`);
// The clauses of `shape`, in order: claim, the words for a number, the words for "mixed". nav.itemHeight has none.
const CLAUSES = Object.freeze([
  ["button.height", (n) => `buttons are about ${n}px tall`, "button height has no single value"],
  ["field.height", (n) => `fields are about ${n}px tall`, "field height has no single value"],
  ["button.radius", (n) => corner("buttons", n), "button corners have no single value"],
  ["field.radius", (n) => corner("fields", n), "field corners have no single value"],
  ["table.bodyRowHeight", (n) => `table rows are about ${n}px`, "table rows have no single height"],
]);

// One sentence from a system's values: clauses joined with "; ", first letter capitalised, one full stop; a
// clause whose value is null is left out, and no clause at all gives "".
export function shapeOf(values) {
  const parts = [];
  for (const [claim, number, mixed] of CLAUSES) {
    const value = values[claim]?.value;
    if (value === null || value === undefined) continue;
    parts.push(value === "mixed" ? mixed : number(value));
  }
  const joined = parts.join("; ");
  return joined ? `${joined[0].toUpperCase()}${joined.slice(1)}.` : "";
}

function checkSource(source) {
  const isText = (value) => typeof value === "string" && value.trim() !== "";
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`${SOURCE_PATH}: must be an object { run, systems, partly }; restore it from the work order (WO-18 A2).`);
  if (typeof source.run !== "string" || !RUN_NAME.test(source.run)) throw new Error(`${SOURCE_PATH}: "run" must be the name of a folder under research/consensus/runs/ (found ${JSON.stringify(source.run)}).`);
  if (!Array.isArray(source.systems) || source.systems.length === 0) throw new Error(`${SOURCE_PATH}: "systems" must be a non-empty array of { id, example, summary }.`);
  source.systems.forEach((entry, index) => { for (const field of ["id", "example", "summary"]) if (!isText(entry?.[field])) throw new Error(`${SOURCE_PATH}: systems[${index}].${field} must be a non-empty string.`); });
  if (!Array.isArray(source.partly)) throw new Error(`${SOURCE_PATH}: "partly" must be an array of { id, note } (an empty array when every lineage is shown).`);
  source.partly.forEach((entry, index) => { for (const field of ["id", "note"]) if (!isText(entry?.[field])) throw new Error(`${SOURCE_PATH}: partly[${index}].${field} must be a non-empty string.`); });
  const ids = source.systems.map((entry) => entry.id);
  const twice = ids.find((id, index) => ids.indexOf(id) !== index);
  if (twice) throw new Error(`${SOURCE_PATH}: "${twice}" is listed twice in "systems"; list each lineage once.`);
}

// Returns the JSON object of systems.json. Throws an Error naming the file, the field, and what to do next.
export function buildSystemsShowcase({ source, consensus, run, manifest }) {
  checkSource(source);
  const runPath = `research/consensus/runs/${source.run}`;
  const lineages = Array.isArray(manifest?.lineages) ? manifest.lineages : [];
  const screens = Array.isArray(manifest?.screens) ? manifest.screens : [];
  const rows = Array.isArray(consensus?.rows) ? consensus.rows : [];
  const status = new Map((Array.isArray(run?.screens) ? run.screens : []).map((entry) => [entry.screen, entry.status]));

  // Throws 1 and 2: exactly one row per claim on the whole site at 1440.
  const rowOf = new Map(CLAIMS.map((claim) => {
    const found = rows.filter((row) => row.claim === claim && row.pageType === "all" && row.viewport === 1440);
    if (found.length === 0) throw new Error(`${runPath}/consensus.json: no row has claim "${claim}" with ${SITE}; the page reads exactly one. Point "run" in ${SOURCE_PATH} at a run that has it, or take the claim out of CLAIMS in scripts/build-systems-showcase.mjs.`);
    if (found.length > 1) throw new Error(`${runPath}/consensus.json: ${found.length} rows have claim "${claim}" with ${SITE}; the page reads exactly one. Regenerate the run's report (node scripts/consensus-study.mjs --report --run ${source.run}) or point "run" in ${SOURCE_PATH} at another run.`);
    return [claim, found[0]];
  }));

  // Throw 3: every listed lineage, shown or partly, is in the run's manifest.
  const known = lineages.map((lineage) => lineage.id);
  const listed = [...source.systems.map((entry, index) => [entry, `systems[${index}]`]), ...source.partly.map((entry, index) => [entry, `partly[${index}]`])];
  for (const [entry, where] of listed) if (!known.includes(entry.id)) throw new Error(`${SOURCE_PATH}: ${where}.id "${entry.id}" is not a lineage of ${runPath}/manifest.json (${known.join(", ")}); use one of those ids or remove the entry.`);

  const bySource = new Map(source.systems.map((entry, index) => [entry.id, { entry, index }]));
  const systems = lineages.filter((lineage) => bySource.has(lineage.id)).map((lineage) => {
    const { entry, index } = bySource.get(lineage.id);
    const own = screens.filter((screen) => screen.lineage === lineage.id && screen.tier === "screen" && status.get(screen.id) === "measured");

    // Throw 6: the example is a measured tier "screen" screen of this lineage.
    const example = screens.find((screen) => screen.id === entry.example);
    const why = !example ? "it is not in manifest.json"
      : example.lineage !== lineage.id ? `it belongs to lineage "${example.lineage}"`
      : example.tier !== "screen" ? `it is tier "${example.tier}" in manifest.json`
      : status.get(example.id) !== "measured" ? `its status in run.json is ${JSON.stringify(status.get(example.id) ?? null)}`
      : null;
    if (why) throw new Error(`${SOURCE_PATH}: systems[${index}].example "${entry.example}" is not a measured tier "screen" screen of ${lineage.id} (${why}); name a screen of that lineage with tier "screen" in ${runPath}/manifest.json and status "measured" in run.json.`);

    const values = {};
    for (const claim of CLAIMS) {
      const reading = rowOf.get(claim).lineages?.find((item) => item.lineage === lineage.id);
      // Throw 4: the lineage is on every shown row.
      if (!reading) throw new Error(`${runPath}/consensus.json: lineage "${lineage.id}" has no entry in lineages[] of the row claim "${claim}" (${SITE}); move it to "partly" in ${SOURCE_PATH} or point "run" at a run that measured it.`);
      const { value } = reading;
      // Throw 5: only a number, "mixed", or null can be printed.
      if (!(typeof value === "number" && Number.isFinite(value)) && value !== "mixed" && value !== null) throw new Error(`${runPath}/consensus.json: row claim "${claim}" (${SITE}), lineage "${lineage.id}": value ${JSON.stringify(value)} is not a number, "mixed", or null; the page prints only those three. Regenerate the run's report or correct the row.`);
      const holding = typeof value === "number" ? (Array.isArray(reading.raw) ? reading.raw : []).filter((item) => item.value === value).length : null;
      values[claim] = { value, eligible: reading.eligible, holding };
    }

    return {
      id: lineage.id,
      name: lineage.name,
      kind: lineage.kind,
      licence: lineage.licence,
      repository: lineage.repository,
      access: lineage.access,
      commit: lineage.access === "self-hosted" && typeof lineage.selfHosted?.commit === "string" ? lineage.selfHosted.commit.slice(0, 7) : null,
      summary: entry.summary,
      exampleUrl: example.url,
      screens: own.length,
      pageTypes: [...new Set(own.map((screen) => screen.pageType))],
      values,
      shape: shapeOf(values),
    };
  });

  // Throw 7: a lineage named in "partly" is on no row that pools the page types.
  const partly = source.partly.map((entry, index) => {
    const on = rows.filter((row) => row.pageType === "all" && (row.lineages ?? []).some((item) => item.lineage === entry.id)).length;
    if (on > 0) throw new Error(`${SOURCE_PATH}: partly[${index}].id "${entry.id}" is on ${on} row(s) with pageType "all" in ${runPath}/consensus.json, so it was measured as a whole system; move it to "systems" with an example screen.`);
    return { id: entry.id, name: lineages.find((lineage) => lineage.id === entry.id).name, note: entry.note };
  });

  return { run: source.run, systems, partly };
}

function readJson(root, relative, hint) {
  const path = join(root, relative);
  if (!existsSync(path)) throw new Error(`${relative} is missing; ${hint}`);
  try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { throw new Error(`${relative} is not valid JSON (${error.message}); ${hint}`); }
}

export function loadInputs(root) {
  const source = readJson(root, SOURCE_PATH, "restore it from the work order (WO-18 A2)");
  checkSource(source);
  const runPath = `research/consensus/runs/${source.run}`;
  const hint = `"run" in ${SOURCE_PATH} names ${runPath}; set it to a run folder that holds consensus.json, run.json, and manifest.json`;
  return { source, consensus: readJson(root, `${runPath}/consensus.json`, hint), run: readJson(root, `${runPath}/run.json`, hint), manifest: readJson(root, `${runPath}/manifest.json`, hint) };
}

export const serialize = (json) => `${JSON.stringify(json, null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const usage = "usage: node scripts/build-systems-showcase.mjs [--root <dir>] [--check]";
  const fail = (message) => { console.error(`systems showcase: ${message}`); process.exit(1); };
  const args = process.argv.slice(2);
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let check = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--check") check = true;
    else if (args[index] === "--root") { if (!args[index + 1] || args[index + 1].startsWith("--")) fail(`--root needs a directory; ${usage}`); root = resolve(args[(index += 1)]); }
    else fail(`unknown argument ${args[index]}; ${usage}`);
  }
  let json;
  try { json = buildSystemsShowcase(loadInputs(root)); } catch (error) { fail(error.message); }
  const next = serialize(json);
  const outFile = join(root, OUT_PATH);
  const stale = !existsSync(outFile) || readFileSync(outFile, "utf8") !== next;
  if (check && stale) fail(`${OUT_PATH} is out of date; run node scripts/build-systems-showcase.mjs`);
  if (stale && !check) writeFileSync(outFile, next);
  console.log(`systems showcase: run ${json.run}, ${json.systems.length} systems (${json.systems.map((system) => system.id).join(", ")}), ${json.partly.length} partly${stale && !check ? `; wrote ${OUT_PATH}` : ""}`);
}
