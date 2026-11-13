import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAIM_USES, COMPONENT_SOURCES, NOT_PACKED, buildEngineDefaults, buildEvidencePack } from "../lib/evidence-pack.mjs";
import { themeColors } from "../build-component-contracts.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { schemaErrors } from "../lib/schema-lite.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const references = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/references");
const readJson = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const bytes = (value) => `${JSON.stringify(value, null, 1)}\n`;

// --- a synthetic run: three product systems, one kit, one lineage with nothing measured -----------------

const bucket = (value, lineages, productSystems, kits) => ({ bucket: value, lineages, productSystems, kits });
const row = (claim, pageType, transfer, measured, distribution, over = {}) => ({
  claim, pageType, viewport: 1440, transfer, rule: null, card: [], measured, agree: distribution[0]?.lineages ?? 0,
  agreeProductSystems: distribution[0]?.productSystems ?? 0, agreeKits: distribution[0]?.kits ?? 0, top: distribution[0]?.bucket ?? null,
  supportsRule: null, status: "candidate", distribution,
  lineages: [{ lineage: "alpha", kind: "product-system", value: distribution[0]?.bucket ?? null, eligible: 1, raw: [{ screen: "alpha-form", value: distribution[0]?.bucket ?? null }] }],
  withFragments: null, ...over,
});
const synthetic = () => ({
  consensus: {
    consensusVersion: 1, run: "2026-01-02", screens: { listed: 6, measured: 5, failed: 0, skipped: 1 },
    rows: [
      row("button.height", "form", "adapt", 4, [bucket(32, 3, 2, 1), bucket(36, 1, 1, 0)], { withFragments: { measured: 5, agree: 3, agreeProductSystems: 2, agreeKits: 1, top: 32, distribution: [bucket(32, 3, 2, 1), bucket(36, 1, 1, 0), bucket(40, 1, 1, 0)] } }),
      row("controls.shareHeight", "form", "keep", 3, [bucket(true, 3, 2, 1)]),
      row("icons.noEmoji", "all", "keep", 4, [bucket(true, 4, 3, 1)]),
      row("motion.transitionAll", "all", "adapt", 4, [bucket(0.1, 3, 2, 1), bucket(0.5, 1, 1, 0)]),
      row("button.height", "all", "adapt", 4, [bucket(32, 2, 1, 1), bucket("mixed", 2, 2, 0)]),
      row("primary.onePerSection", "form", "keep", 4, [bucket(true, 4, 3, 1)]),
    ],
  },
  manifest: {
    lineages: [
      { id: "alpha", name: "Alpha System", kind: "product-system" },
      { id: "beta", name: "Beta System", kind: "product-system" },
      { id: "gamma", name: "Gamma System", kind: "product-system" },
      { id: "kit-one", name: "Kit One", kind: "kit" },
      { id: "delta", name: "Delta System", kind: "product-system" },
    ],
    screens: [
      { id: "alpha-form", lineage: "alpha", pageType: "form", tier: "screen" },
      { id: "alpha-list", lineage: "alpha", pageType: "list", tier: "screen" },
      { id: "beta-form", lineage: "beta", pageType: "form", tier: "screen" },
      { id: "gamma-form", lineage: "gamma", pageType: "form", tier: "fragment" },
      { id: "kit-one-form", lineage: "kit-one", pageType: "form", tier: "screen" },
      { id: "delta-form", lineage: "delta", pageType: "form", tier: "screen" },
    ],
  },
  run: {
    viewports: [[1440, 900], [390, 844]], scroll: false,
    screens: ["alpha-form", "alpha-list", "beta-form", "gamma-form", "kit-one-form"].map((screen) => ({ screen, status: "measured" })).concat([{ screen: "delta-form", status: "skipped", reason: "terms" }]),
  },
  runPath: "research/consensus/runs/2026-01-02",
});

test("buildEvidencePack: packed claims only, rows in file order, buckets equal the distribution, lineages with both counts", () => {
  const input = synthetic();
  const { problems, pack } = buildEvidencePack(input);
  assert.deepEqual(problems, []);
  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.generatedBy, "scripts/build-evidence-pack.mjs");
  assert.deepEqual(pack.run, { id: "2026-01-02", path: "research/consensus/runs/2026-01-02", consensusVersion: 1, viewports: [[1440, 900], [390, 844]], scroll: false, touch: false, screens: { listed: 6, measured: 5, failed: 0, skipped: 1 } });
  assert.deepEqual(pack.claims.map((claim) => claim.id), ["button.height", "controls.shareHeight", "primary.onePerSection"], "first appearance in consensus.json, packed claims only");
  assert.deepEqual(pack.claims[0], { id: "button.height", ...CLAIM_USES["button.height"] });
  assert.deepEqual(pack.rows.map((entry) => `${entry.claim}@${entry.pageType}`), ["button.height@form", "controls.shareHeight@form", "button.height@all", "primary.onePerSection@form"], "file order; the keep claim without a line and the NOT_PACKED claim are absent");
  const source = input.consensus.rows[0];
  assert.deepEqual(pack.rows[0].buckets, source.distribution.map((entry) => ({ value: entry.bucket, lineages: entry.lineages, productSystems: entry.productSystems, kits: entry.kits })));
  assert.deepEqual(pack.rows[0].withFragments, { measured: 5, buckets: source.withFragments.distribution.map((entry) => ({ value: entry.bucket, lineages: entry.lineages, productSystems: entry.productSystems, kits: entry.kits })) });
  assert.equal(pack.rows[1].withFragments, null);
  assert.deepEqual(pack.rows[2].buckets[1], { value: "mixed", lineages: 2, productSystems: 2, kits: 0 });
  for (const entry of pack.rows) assert.deepEqual(Object.keys(entry), ["claim", "pageType", "viewport", "measured", "buckets", "withFragments"], "nothing else of a row is copied");
  assert.deepEqual(pack.lineages, [
    { id: "alpha", name: "Alpha System", kind: "product-system", screens: 2, fragments: 0 },
    { id: "beta", name: "Beta System", kind: "product-system", screens: 1, fragments: 0 },
    { id: "gamma", name: "Gamma System", kind: "product-system", screens: 0, fragments: 1 },
    { id: "kit-one", name: "Kit One", kind: "kit", screens: 1, fragments: 0 },
  ], "the lineage with no measured screen is left out");
  assert.equal(input.consensus.rows[0].lineages.length, 1, "the input is not modified");
});

test("buildEvidencePack problems: an unmapped adapt claim, an axis outside the ledger, a colour axis, a boolean bucket on a value claim", () => {
  const unmapped = synthetic();
  unmapped.consensus.rows.push(row("panel.padding", "form", "adapt", 3, [bucket(16, 3, 2, 1)]));
  const one = buildEvidencePack(unmapped).problems;
  assert.equal(one.length, 1);
  assert.match(one[0], /^research\/consensus\/runs\/2026-01-02\/consensus\.json: claim panel\.padding is an adapt claim with no line in CLAIM_USES or NOT_PACKED; add a line to CLAIM_USES in scripts\/lib\/evidence-pack\.mjs, or to NOT_PACKED with a reason$/u);
  assert.deepEqual(buildEvidencePack({ ...unmapped, notPacked: { ...NOT_PACKED, "panel.padding": "no ledger axis yet" } }).problems, [], "NOT_PACKED with a reason clears it");

  const axis = buildEvidencePack({ ...synthetic(), claimUses: { ...CLAIM_USES, "button.height": { ...CLAIM_USES["button.height"], axis: "buttonHeights" } } }).problems;
  assert.match(axis.join("\n"), /CLAIM_USES\["button\.height"\]\.axis "buttonHeights" is not a ledger axis/u);
  const colour = buildEvidencePack({ ...synthetic(), claimUses: { ...CLAIM_USES, "button.height": { ...CLAIM_USES["button.height"], axis: "accent" } } }).problems;
  assert.match(colour.join("\n"), /CLAIM_USES\["button\.height"\]\.axis "accent" is never proposed/u);
  const fonts = buildEvidencePack({ ...synthetic(), claimUses: { ...CLAIM_USES, "button.height": { ...CLAIM_USES["button.height"], axis: "fonts" } } }).problems;
  assert.match(fonts.join("\n"), /"fonts" is never proposed/u);

  const boolean = synthetic();
  boolean.consensus.rows[0].distribution.push(bucket(true, 1, 1, 0));
  assert.match(buildEvidencePack(boolean).problems.join("\n"), /claim button\.height \(form\/1440\) has a boolean bucket but CLAIM_USES says use "value"/u);
  const numericFlag = synthetic();
  numericFlag.consensus.rows[5].distribution.push(bucket(2, 1, 1, 0));
  assert.match(buildEvidencePack(numericFlag).problems.join("\n"), /claim primary\.onePerSection \(form\/1440\) has a numeric bucket but CLAIM_USES says use "flag"/u);
  const incomplete = synthetic();
  delete incomplete.consensus.rows[1].distribution;
  assert.match(buildEvidencePack(incomplete).problems.join("\n"), /rows\[1\] \(controls\.shareHeight\) has no distribution; a packed row needs claim, pageType, viewport, measured, and distribution/u);

  const keep = synthetic();
  keep.consensus.rows.push(row("icons.oneFamily", "all", "keep", 4, [bucket(false, 3, 2, 1)]));
  const built = buildEvidencePack(keep);
  assert.deepEqual(built.problems, [], "an unmapped keep claim is no problem");
  assert.ok(!built.pack.claims.some((claim) => claim.id === "icons.oneFamily") && !built.pack.rows.some((entry) => entry.claim === "icons.oneFamily"));
});

test("buildEvidencePack is additive: a new keep claim, lineage, page type, and a set row build", () => {
  const input = synthetic();
  input.manifest.lineages.push({ id: "epsilon", name: "Epsilon Kit", kind: "kit" });
  input.manifest.screens.push({ id: "epsilon-wizard", lineage: "epsilon", pageType: "wizard", tier: "screen" });
  input.run.screens.push({ screen: "epsilon-wizard", status: "measured" });
  input.consensus.consensusVersion = 2;
  input.consensus.rows.push(
    row("controls.rowShareRadius", "wizard", "keep", 3, [bucket(true, 3, 2, 1)]),
    row("button.height", "wizard", "adapt", 3, [bucket(32, 3, 2, 1)]),
    // A WO-12 set row: its buckets do not add up to measured; this builder does not know the kind and skips it.
    row("button.height", "all", "adapt", 4, [bucket(32, 4, 3, 1), bucket(40, 3, 2, 1)], { valueKind: "set", viewport: 390 }),
    row("button.height", "detail", "adapt", 4, [bucket(32, 4, 3, 1)], { valueKind: "value" }),
  );
  const { problems, pack } = buildEvidencePack(input);
  assert.deepEqual(problems, []);
  assert.equal(pack.run.consensusVersion, 2, "copied, not checked");
  assert.ok(pack.lineages.some((lineage) => lineage.id === "epsilon" && lineage.screens === 1));
  assert.ok(pack.rows.some((entry) => entry.claim === "button.height" && entry.pageType === "wizard"));
  assert.ok(pack.rows.some((entry) => entry.claim === "button.height" && entry.pageType === "detail"), "valueKind value is a known kind");
  assert.ok(!pack.rows.some((entry) => entry.viewport === 390), "the set row is not packed");
  assert.ok(!pack.claims.some((claim) => claim.id === "controls.rowShareRadius"));
  // A claim whose only rows are set rows is not packed at all, and nothing fails.
  const setOnly = synthetic();
  setOnly.consensus.rows.push(row("table.rowHeight", "list", "adapt", 3, [bucket(40, 3, 2, 1), bucket(48, 2, 1, 1)], { valueKind: "set" }));
  const built = buildEvidencePack(setOnly);
  assert.deepEqual(built.problems, []);
  assert.ok(!built.pack.claims.some((claim) => claim.id === "table.rowHeight"));
});

test("buildEvidencePack is deterministic: same input, same bytes", () => {
  assert.equal(bytes(buildEvidencePack(synthetic()).pack), bytes(buildEvidencePack(synthetic()).pack));
  const sources = Object.fromEntries(Object.entries(COMPONENT_SOURCES).map(([id, path]) => [id, readFileSync(resolve(repoRoot, path), "utf8")]));
  const input = () => ({ sources, colours: themeColors(), recipesCss: readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8"), rules: readJson("engine/rules/catalog.json").rules });
  assert.equal(bytes(buildEngineDefaults(input()).defaults), bytes(buildEngineDefaults(input()).defaults));
});

// --- the committed files ------------------------------------------------------------------------------------

const pointer = readJson("research/consensus/evidence-pack-run.json");
const runPath = `research/consensus/runs/${pointer.run}`;
const committedPackText = readFileSync(resolve(references, "evidence-pack.json"), "utf8");
const committedDefaultsText = readFileSync(resolve(references, "engine-defaults.json"), "utf8");
const committedPack = JSON.parse(committedPackText);
const committedDefaults = JSON.parse(committedDefaultsText);
const catalogRules = readJson("engine/rules/catalog.json").rules;
const componentSources = () => Object.fromEntries(Object.entries(COMPONENT_SOURCES).map(([id, path]) => [id, readFileSync(resolve(repoRoot, path), "utf8")]));

test("the committed pack and engine defaults are what the builder makes from the pointer's run; the pack passes its schema", () => {
  assert.deepEqual(Object.keys(pointer), ["run"]);
  const built = buildEvidencePack({ consensus: readJson(`${runPath}/consensus.json`), manifest: readJson(`${runPath}/manifest.json`), run: readJson(`${runPath}/run.json`), runPath });
  assert.deepEqual(built.problems, []);
  assert.equal(committedPackText, bytes(built.pack), "run node scripts/build-evidence-pack.mjs");
  const defaults = buildEngineDefaults({ sources: componentSources(), colours: themeColors(), recipesCss: readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8"), rules: catalogRules });
  assert.deepEqual(defaults.problems, []);
  assert.equal(committedDefaultsText, bytes(defaults.defaults), "run node scripts/build-evidence-pack.mjs");
  const schema = JSON.parse(readFileSync(resolve(references, "evidence-pack.schema.json"), "utf8"));
  assert.deepEqual(schemaErrors(schema, committedPack), []);
  assert.deepEqual(Object.keys(schema.properties), Object.keys(committedPack));
  assert.ok(schemaErrors(schema, { ...committedPack, extra: 1 }).length, "no unknown top-level key");
  assert.ok(schemaErrors(schema, { ...committedPack, rows: [{ ...committedPack.rows[0], lineages: [] }] }).length, "a row cannot carry per-lineage values");
  assert.deepEqual(schemaErrors(schema, { ...committedPack, claims: [{ ...committedPack.claims[0], futureField: true }] }), [], "claims keep unknown keys");
});

test("the committed pack holds no text and no URL: only counts, enums, and the lineage names", () => {
  const stripped = clone(committedPack);
  delete stripped.generatedBy;
  delete stripped.run.path;
  const ids = stripped.lineages.map((lineage) => { const { id, name } = lineage; delete lineage.id; delete lineage.name; return { id, name }; });
  const texts = stripped.claims.map((claim) => { const { id, label, caveat } = claim; delete claim.label; delete claim.caveat; return { id, label, caveat }; });
  assert.deepEqual(disallowedStrings(stripped), []);
  const manifest = readJson(`${runPath}/manifest.json`);
  for (const { id, name } of ids) assert.equal(manifest.lineages.find((lineage) => lineage.id === id)?.name, name, `${id} comes from the run's manifest.json`);
  for (const { id, label, caveat } of texts) {
    assert.equal(label, CLAIM_USES[id].label);
    assert.equal(caveat, CLAIM_USES[id].caveat);
  }
  // A row's own keys (a bucket's `lineages` is a count and stays).
  for (const entry of committedPack.rows) for (const key of [...Object.keys(entry), ...Object.keys(entry.withFragments ?? {})]) assert.ok(!["lineages", "raw", "screen", "url"].includes(key), `${entry.claim}@${entry.pageType} carries ${key}`);
  const strings = [];
  const walk = (value) => {
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) { strings.push(key); walk(item); }
  };
  walk(committedPack);
  for (const text of strings) assert.ok(!text.includes("://") && !text.includes("www.") && !text.includes("@"), text);
});

test("engine defaults: sizes equal the component contracts, the spacing set is the rule's, a missing height is a build problem", () => {
  const contracts = readJson("demo-pricing/content/component-contracts.json").components;
  const sizes = (id) => contracts.find((component) => component.id === id).code.sizes.map(({ key, height, text, paddingX }) => ({ key, height, text, paddingX }));
  assert.deepEqual(committedDefaults.components.button.sizes, sizes("button"));
  assert.deepEqual(committedDefaults.components.select.sizes, sizes("select"));
  assert.equal(committedDefaults.components.button.defaultSize, "md");
  assert.equal(committedDefaults.components.select.defaultSize, "default");
  assert.deepEqual(committedDefaults.components.input, { source: "engine/components/ui/input.tsx", height: 36, text: 16, textFromMd: 14, paddingX: 12 });
  assert.deepEqual(committedDefaults.components.table, { source: "engine/components/ui/table.tsx", headHeight: 40, headPaddingX: 8, text: 14 });
  assert.equal(committedDefaults.measured, false);
  assert.equal(Object.keys(committedDefaults.recipes).length, 10);
  assert.deepEqual(committedDefaults.recipes["enterprise-workbench"], { controlRadius: 3, insetRadius: 2, surfaceRadius: 4, sectionGap: 16, pageGutter: 24, surfacePadding: 20 });
  assert.equal(committedDefaults.recipes["expressive-brand"].sectionGap, null, "a clamp() value is not a plain px number");
  const statement = catalogRules.find((rule) => rule.id === "CRAFT-spacing-scale").statement;
  assert.equal(committedDefaults.spacingScale.rule, "CRAFT-spacing-scale");
  assert.ok(statement.includes(`{${committedDefaults.spacingScale.values.join(", ")}}`), statement);

  const sources = componentSources();
  const without = buildEngineDefaults({ sources: { ...sources, input: sources.input.replace(" h-9 ", " ") }, colours: themeColors(), recipesCss: readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8"), rules: catalogRules });
  assert.match(without.problems.join("\n"), /engine\/components\/ui\/input\.tsx: input height could not be read; the engine defaults need it/u);
  const noMd = buildEngineDefaults({ sources: { ...sources, input: sources.input.replace(" md:text-sm", "") }, colours: themeColors(), recipesCss: "", rules: [] });
  assert.match(noMd.problems.join("\n"), /input text size from md \(md:text-sm\) could not be read/u);
  assert.match(noMd.problems.join("\n"), /recipes\.css: no :root block/u);
  assert.match(noMd.problems.join("\n"), /the statement of CRAFT-spacing-scale holds no \{…\} set/u);
});
