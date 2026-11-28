import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAIMS, HEIGHT_STEP, OUT_PATH, PICK_PATH, SOURCE_PATH, buildSystemsShowcase, loadInputs, pickFileOf, serialize, shapeOf } from "../build-systems-showcase.mjs";
import { px4 } from "../lib/consensus.mjs";
import { MEASURED_CLAIMS, normalizeMeasuredSystems } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const script = join(repoRoot, "scripts/build-systems-showcase.mjs");
// The run this test reads, named here so a later move of the source file does not change what it checks.
const RUN = "2026-11-16";
const RUN_PATH = `research/consensus/runs/${RUN}`;
const readJson = (relative) => JSON.parse(readFileSync(join(repoRoot, relative), "utf8"));
const inputs = () => ({
  source: { ...readJson(SOURCE_PATH), run: RUN },
  consensus: readJson(`${RUN_PATH}/consensus.json`),
  run: readJson(`${RUN_PATH}/run.json`),
  manifest: readJson(`${RUN_PATH}/manifest.json`),
});

// WO-18 fact 4: per lineage, measured screens of tier "screen", then [value, eligible, holding] for each claim
// in CLAIMS order. holding is null for "mixed" and null.
const TABLE = {
  cloudscape: [8, [32, 8, 8], [32, 4, 4], [999, 8, 8], [8, 4, 4], [40, 4, 3], [28, 6, 6]],
  patternfly: [7, [36, 7, 7], [36, 4, 4], [999, 7, 5], [6, 4, 4], ["mixed", 2, null], [36, 7, 7]],
  antpro: [10, [32, 7, 6], [32, 6, 6], [6, 7, 6], [6, 6, 5], [48, 5, 3], [40, 10, 10]],
  shadcn: [2, ["mixed", 2, null], ["mixed", 2, null], [8, 2, 2], [8, 2, 2], [52, 1, 1], [32, 1, 1]],
  primer: [3, [32, 1, 1], [null, 0, null], [6, 1, 1], [null, 0, null], [null, 0, null], [null, 0, null]],
  mui: [5, [40, 5, 4], ["mixed", 5, null], [8, 5, 5], [8, 5, 3], ["mixed", 2, null], [32, 2, 2]],
  govuk: [8, [40, 8, 8], [40, 4, 4], [0, 8, 8], [0, 4, 4], [48, 1, 1], [null, 0, null]],
};

test("the claims are the six of WO-18 A1, in order", () => {
  assert.deepEqual([...CLAIMS], ["button.height", "field.height", "button.radius", "field.radius", "table.bodyRowHeight", "nav.itemHeight"]);
});

test(`run ${RUN} gives the table of fact 4: value, eligible, holding for every cell, and the screens column`, () => {
  const json = buildSystemsShowcase(inputs());
  assert.equal(json.run, RUN);
  assert.deepEqual(json.systems.map((system) => system.id), Object.keys(TABLE), "the systems follow the manifest's lineage order");
  for (const system of json.systems) {
    const [screens, ...cells] = TABLE[system.id];
    assert.equal(system.screens, screens, `${system.id}: screens`);
    assert.deepEqual(Object.keys(system.values), [...CLAIMS], `${system.id}: values keys`);
    CLAIMS.forEach((claim, index) => {
      const [value, eligible, holding] = cells[index];
      assert.deepEqual(system.values[claim], { value, eligible, holding }, `${system.id} ${claim}`);
    });
  }
  assert.deepEqual(json.partly, [{ id: "carbon", name: "IBM Carbon", note: "it was measured on a single form." }]);
});

test("each system carries the manifest's fields, its page types in first-seen order, and its example's URL", () => {
  const json = buildSystemsShowcase(inputs());
  const byId = Object.fromEntries(json.systems.map((system) => [system.id, system]));
  assert.deepEqual(Object.keys(byId.cloudscape), ["id", "name", "kind", "licence", "repository", "access", "commit", "summary", "exampleUrl", "screens", "pageTypes", "values", "shape"]);
  assert.equal(byId.cloudscape.access, "self-hosted");
  assert.equal(byId.cloudscape.commit, "9b6815f");
  assert.equal(byId.patternfly.access, "self-hosted");
  assert.equal(byId.patternfly.commit, "73cec7b");
  assert.equal(byId.antpro.access, "hosted");
  assert.equal(byId.antpro.commit, null);
  for (const id of ["antpro", "shadcn", "primer", "mui", "govuk"]) assert.equal(byId[id].commit, null, `${id}: commit`);
  assert.deepEqual(byId.cloudscape.pageTypes, ["dashboard", "list", "form", "detail"]);
  assert.deepEqual(byId.patternfly.pageTypes, ["dashboard", "list", "detail"], "the PatternFly fragment is not counted");
  assert.deepEqual(byId.govuk.pageTypes, ["list", "form", "detail"]);
  assert.equal(byId.cloudscape.kind, "product-system");
  assert.equal(byId.antpro.kind, "kit");
  const { manifest } = inputs();
  const source = readJson(SOURCE_PATH);
  for (const entry of source.systems) {
    const screen = manifest.screens.find((item) => item.id === entry.example);
    assert.equal(byId[entry.id].exampleUrl, screen.url, `${entry.id}: exampleUrl is the url of ${entry.example}`);
    assert.equal(byId[entry.id].summary, entry.summary, `${entry.id}: summary from the source file`);
  }
});

test("shape: clauses by value kind, joined, capitalised, one full stop", () => {
  const byId = Object.fromEntries(buildSystemsShowcase(inputs()).systems.map((system) => [system.id, system.shape]));
  assert.equal(byId.cloudscape, "Buttons are about 32px tall; fields are about 32px tall; buttons are pills; fields have 8px corners; table rows are about 40px.");
  assert.ok(byId.patternfly.endsWith("; table rows have no single height."), byId.patternfly);
  assert.equal(byId.primer, "Buttons are about 32px tall; buttons have 6px corners.");
  assert.ok(byId.shadcn.startsWith("Button height has no single value; field height has no single value;"), byId.shadcn);
  assert.equal(byId.govuk, "Buttons are about 40px tall; fields are about 40px tall; buttons are square; fields are square; table rows are about 48px.");
  assert.equal(shapeOf(Object.fromEntries(CLAIMS.map((claim) => [claim, { value: null }]))), "");
  assert.equal(shapeOf({ "nav.itemHeight": { value: 32 } }), "", "nav.itemHeight has no clause");
});

test("the committed systems.json is what the generator writes from the committed source file", () => {
  assert.equal(readFileSync(join(repoRoot, OUT_PATH), "utf8"), serialize(buildSystemsShowcase(loadInputs(repoRoot))));
});

// A temporary --root holding the source file (run set to RUN), the run's three files, and whatever the mutation
// changes. Returns the root; the caller removes it.
function makeRoot(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), "styleseed-systems-"));
  const files = inputs();
  mutate(files);
  mkdirSync(join(root, "demo-pricing/content"), { recursive: true });
  mkdirSync(join(root, RUN_PATH), { recursive: true });
  writeFileSync(join(root, SOURCE_PATH), `${JSON.stringify(files.source, null, 2)}\n`);
  for (const name of ["consensus", "run", "manifest"]) writeFileSync(join(root, RUN_PATH, `${name}.json`), JSON.stringify(files[name]));
  return root;
}
const cli = (root, ...args) => spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf8" });
const allRow = (consensus, claim) => consensus.rows.find((row) => row.claim === claim && row.pageType === "all" && row.viewport === 1440);

test("--check passes on a fresh file, fails after one value is edited, and a deleted file regenerates byte for byte", () => {
  const root = makeRoot();
  try {
    const write = cli(root);
    assert.equal(write.status, 0, write.stderr);
    const out = join(root, OUT_PATH);
    const first = readFileSync(out, "utf8");
    assert.equal(first, serialize(buildSystemsShowcase(inputs())));
    const pass = cli(root, "--check");
    assert.equal(pass.status, 0, pass.stderr);
    unlinkSync(out);
    const missing = cli(root, "--check");
    assert.equal(missing.status, 1, "--check fails when the file is missing");
    assert.throws(() => readFileSync(out), /ENOENT/u, "--check writes nothing");
    assert.equal(cli(root).status, 0);
    assert.equal(readFileSync(out, "utf8"), first, "deleting systems.json and running the generator gives the same file");
    const edited = JSON.parse(first);
    edited.systems[0].values["button.height"].value = 36;
    writeFileSync(out, serialize(edited));
    const fail = cli(root, "--check");
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /demo-pricing\/content\/systems\.json is out of date; run node scripts\/build-systems-showcase\.mjs/u);
    assert.equal(readFileSync(out, "utf8"), serialize(edited), "--check leaves the file as it is");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const THROWS = [
  ["a row removed", (f) => { f.consensus.rows = f.consensus.rows.filter((row) => row !== allRow(f.consensus, "button.height")); },
    `research/consensus/runs/${RUN}/consensus.json: no row has claim "button.height" with pageType "all", viewport 1440; the page reads exactly one.`],
  ["a row doubled", (f) => { f.consensus.rows.push(structuredClone(allRow(f.consensus, "field.radius"))); },
    `research/consensus/runs/${RUN}/consensus.json: 2 rows have claim "field.radius" with pageType "all", viewport 1440; the page reads exactly one.`],
  ["an unknown lineage id in the source file", (f) => { f.source.systems.push({ id: "harbour", example: "harbour-form", summary: "A fictional system." }); },
    `${SOURCE_PATH}: systems[7].id "harbour" is not a lineage of research/consensus/runs/${RUN}/manifest.json (cloudscape, patternfly, antpro, shadcn, primer, carbon, mui, govuk); use one of those ids or remove the entry.`],
  ["one lineage's entry deleted from a row's lineages[]", (f) => { const row = allRow(f.consensus, "table.bodyRowHeight"); row.lineages = row.lineages.filter((item) => item.lineage !== "mui"); },
    `research/consensus/runs/${RUN}/consensus.json: lineage "mui" has no entry in lineages[] of the row claim "table.bodyRowHeight" (pageType "all", viewport 1440);`],
  ["a value \"x\"", (f) => { allRow(f.consensus, "button.radius").lineages.find((item) => item.lineage === "antpro").value = "x"; },
    `research/consensus/runs/${RUN}/consensus.json: row claim "button.radius" (pageType "all", viewport 1440), lineage "antpro": value "x" is not a number, "mixed", or null;`],
  ["an example that is a fragment", (f) => { f.source.systems.find((entry) => entry.id === "patternfly").example = "patternfly-form"; },
    `${SOURCE_PATH}: systems[1].example "patternfly-form" is not a measured tier "screen" screen of patternfly (it is tier "fragment" in manifest.json);`],
  ["an example that is not measured", (f) => { f.source.systems.find((entry) => entry.id === "govuk").example = "govuk-feedback"; },
    `${SOURCE_PATH}: systems[6].example "govuk-feedback" is not a measured tier "screen" screen of govuk (its status in run.json is "failed");`],
  ["cloudscape put into partly", (f) => { f.source.systems = f.source.systems.filter((entry) => entry.id !== "cloudscape"); f.source.partly.push({ id: "cloudscape", note: "a fictional note." }); },
    `${SOURCE_PATH}: partly[1].id "cloudscape" is on `],
];

for (const [name, mutate, message] of THROWS) {
  test(`throws, with its own message: ${name}`, () => {
    const root = makeRoot(mutate);
    try {
      const result = cli(root);
      assert.equal(result.status, 1, `${name}: exit 1`);
      assert.ok(result.stderr.startsWith(`systems showcase: ${message}`), `${name}: stderr was\n${result.stderr}`);
      assert.throws(() => readFileSync(join(root, OUT_PATH)), /ENOENT/u, `${name}: nothing written`);
      assert.throws(() => readFileSync(join(root, PICK_PATH)), /ENOENT/u, `${name}: no skill file written`);
    } finally { rmSync(root, { recursive: true, force: true }); }
    assert.throws(() => buildSystemsShowcase((() => { const f = inputs(); mutate(f); return f; })()), (error) => error.message.startsWith(message));
  });
}

// --- the skill's measured-systems.json (WO-20 C1) ------------------------------------------------------------------

const committedPick = () => readFileSync(join(repoRoot, PICK_PATH), "utf8");

test("the committed measured-systems.json is what pickFileOf gives for the committed build; systems.json is untouched by it", () => {
  const showcase = buildSystemsShowcase(loadInputs(repoRoot));
  const before = serialize(showcase);
  assert.equal(committedPick(), serialize(pickFileOf(showcase)));
  assert.equal(serialize(showcase), before, "pickFileOf does not change the page's object");
  assert.equal(readFileSync(join(repoRoot, OUT_PATH), "utf8"), before, "systems.json is still what the generator writes for the page");
  assert.equal(PICK_PATH, "engine/.claude/skills/styleseed/workflows/ss-resolve/references/measured-systems.json");
});

test("measured-systems.json holds only the listed keys: no text, no address; the systems and readings in the page's order", () => {
  const text = committedPick();
  const file = JSON.parse(text);
  assert.deepEqual(Object.keys(file), ["schemaVersion", "run", "heightStep", "systems"]);
  assert.deepEqual([file.schemaVersion, file.run, file.heightStep], [1, RUN, 4]);
  assert.deepEqual(file.systems.map((system) => system.id), Object.keys(TABLE), "the page's order");
  for (const system of file.systems) {
    assert.deepEqual(Object.keys(system), ["id", "name", "screens", "readings"], system.id);
    assert.deepEqual(Object.keys(system.readings), [...CLAIMS], `${system.id}: CLAIMS order`);
    const [screens, ...cells] = TABLE[system.id];
    assert.equal(system.screens, screens, system.id);
    CLAIMS.forEach((claim, index) => {
      assert.deepEqual(Object.keys(system.readings[claim]), ["value", "eligible", "holding"], `${system.id} ${claim}`);
      const [value, eligible, holding] = cells[index];
      assert.deepEqual(system.readings[claim], { value, eligible, holding }, `${system.id} ${claim}: the page's reading unchanged`);
    });
  }
  assert.ok(!text.includes("://"), "no address");
  for (const key of ["summary", "shape", "exampleUrl", "repository", "licence", "commit", "kind", "access", "pageTypes", "partly"]) assert.ok(!text.includes(`"${key}"`), `no ${key}`);
  const source = readJson(SOURCE_PATH);
  for (const entry of source.systems) assert.ok(!text.includes(entry.summary), `${entry.id}: no summary text`);
  assert.deepEqual([...MEASURED_CLAIMS], [...CLAIMS], "the skill reads the claims the page's generator writes, in its order");
  assert.deepEqual(normalizeMeasuredSystems(file), file, "the committed file passes the skill's normaliser unchanged");
});

test("heightStep is the study's rounding: px4 equals rounding to heightStep for every whole px from 0 to 200, and every height is a multiple", () => {
  const file = JSON.parse(committedPick());
  assert.equal(HEIGHT_STEP, 4);
  assert.equal(file.heightStep, HEIGHT_STEP);
  for (let v = 0; v <= 200; v += 1) assert.equal(px4(v), Math.round(v / file.heightStep) * file.heightStep, `px4(${v})`);
  let heights = 0;
  for (const system of file.systems) for (const claim of ["button.height", "field.height", "table.bodyRowHeight", "nav.itemHeight"]) {
    const { value } = system.readings[claim];
    if (typeof value !== "number") continue;
    heights += 1;
    assert.equal(value % file.heightStep, 0, `${system.id} ${claim}: ${value}`);
  }
  assert.equal(heights, 19, "the numeric heights of TABLE");
});

test("--check names the stale file, for each of the two; a --root without the skill's folder gets it", () => {
  const root = makeRoot();
  try {
    assert.equal(cli(root).status, 0);
    const pickFile = join(root, PICK_PATH);
    const first = readFileSync(pickFile, "utf8");
    assert.equal(first, committedPick(), "the temporary root writes the committed bytes");
    assert.equal(cli(root, "--check").status, 0);
    const edited = JSON.parse(first);
    edited.systems[0].readings["field.radius"].value = 6;
    writeFileSync(pickFile, serialize(edited));
    let result = cli(root, "--check");
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `systems showcase: ${PICK_PATH} is out of date; run node scripts/build-systems-showcase.mjs\n`);
    assert.equal(readFileSync(pickFile, "utf8"), serialize(edited), "--check leaves it as it is");
    assert.equal(cli(root).status, 0);
    assert.equal(readFileSync(pickFile, "utf8"), first, "the generator rewrites it");
    const out = join(root, OUT_PATH);
    writeFileSync(out, `${readFileSync(out, "utf8")} `);
    result = cli(root, "--check");
    assert.equal(result.stderr, `systems showcase: ${OUT_PATH} is out of date; run node scripts/build-systems-showcase.mjs\n`);
    writeFileSync(pickFile, "{}\n");
    result = cli(root, "--check");
    assert.equal(result.stderr, `systems showcase: ${OUT_PATH} and ${PICK_PATH} are out of date; run node scripts/build-systems-showcase.mjs\n`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the normaliser refuses what no entry can hold, with the file, the field, and the rebuild hint", () => {
  const good = () => JSON.parse(committedPick());
  const at = (file, id) => file.systems.find((system) => system.id === id);
  const refusals = [
    ["an unknown key", (f) => { f.summary = "text"; }, /measured-systems\.json: file: unknown key\(s\) summary; rebuild with `node scripts\/build-systems-showcase\.mjs`, or reinstall the skill/u],
    ["an unknown key in a system", (f) => { f.systems[0].exampleUrl = "x"; }, /systems\[0\]: unknown key\(s\) exampleUrl/u],
    ["another schemaVersion", (f) => { f.schemaVersion = 2; }, /schemaVersion: is 2, newer than this proposer reads \(1\)/u],
    ["a number with holding: null", (f) => { at(f, "cloudscape").readings["button.height"].holding = null; }, /systems\[0\]\.readings\.button\.height\.holding: must be a count of at most eligible/u],
    ["holding > eligible", (f) => { at(f, "antpro").readings["button.radius"].holding = 8; }, /systems\[2\]\.readings\.button\.radius\.holding: must be a count of at most eligible/u],
    ["\"mixed\" with a count", (f) => { at(f, "shadcn").readings["button.height"].holding = 2; }, /systems\[3\]\.readings\.button\.height\.holding: must be null when the value is "mixed"/u],
    ["null with a count", (f) => { at(f, "primer").readings["field.height"].holding = 0; }, /systems\[4\]\.readings\.field\.height\.holding: must be null when the value is null/u],
    ["a height of 37.5", (f) => { at(f, "patternfly").readings["button.height"].value = 37.5; }, /systems\[1\]\.readings\.button\.height\.value: must be a whole multiple of heightStep \(4\), at least 4/u],
    ["a height off the step", (f) => { at(f, "patternfly").readings["field.height"].value = 37; }, /systems\[1\]\.readings\.field\.height\.value: must be a whole multiple of heightStep/u],
    ["a corner of 250", (f) => { at(f, "govuk").readings["field.radius"].value = 250; }, /systems\[6\]\.readings\.field\.radius\.value: must be a whole number from 0 to 200, or 999 for a pill/u],
    ["a name with |", (f) => { at(f, "mui").name = "MUI | templates"; }, /systems\[5\]\.name: must be one line of at most 80 characters without \| or a backtick/u],
    ["a name with a backtick", (f) => { at(f, "mui").name = "MUI `templates`"; }, /systems\[5\]\.name: must be one line/u],
    ["two systems with one id", (f) => { f.systems[1].id = "cloudscape"; }, /systems\[1\]\.id: "cloudscape" is listed twice; each system is listed once/u],
    ["an id with a capital", (f) => { f.systems[0].id = "Cloudscape"; }, /systems\[0\]\.id: must be a system id/u],
    ["a run that is not a date", (f) => { f.run = "latest"; }, /run: must be the run's date \(YYYY-MM-DD\)/u],
    ["a heightStep of 0", (f) => { f.heightStep = 0; }, /heightStep: must be a whole number of at least 1/u],
    ["a reading left out", (f) => { delete at(f, "cloudscape").readings["nav.itemHeight"]; }, /systems\[0\]\.readings: missing nav\.itemHeight/u],
    ["a value that is text", (f) => { at(f, "cloudscape").readings["button.radius"].value = "pill"; }, /button\.radius\.value: must be a number, "mixed", or null/u],
  ];
  for (const [name, mutate, pattern] of refusals) {
    const file = good();
    mutate(file);
    assert.throws(() => normalizeMeasuredSystems(file), pattern, name);
  }
  assert.doesNotThrow(() => normalizeMeasuredSystems(good()));
});

