import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAIM_USES, COMPONENT_SOURCES, NOT_PACKED, buildEngineDefaults, buildEvidencePack } from "../lib/evidence-pack.mjs";
import { themeColors } from "../build-component-contracts.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { schemaErrors } from "../lib/schema-lite.mjs";
import { TOUCH_FLOOR, normalizeEngineDefaults, normalizeEvidencePack, proposeSystem } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const references = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/references");
const readJson = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const bytes = (value) => `${JSON.stringify(value, null, 1)}\n`;
// Every .tsx under engine/components, keyed by repository path (readdirSync returns backslashes on Windows).
const componentFiles = () => Object.fromEntries(readdirSync(resolve(repoRoot, "engine/components"), { recursive: true }).map((file) => String(file).replaceAll("\\", "/")).filter((file) => file.endsWith(".tsx")).sort().map((file) => [`engine/components/${file}`, readFileSync(resolve(repoRoot, "engine/components", file), "utf8")]));

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
    // A WO-12 set row: its buckets do not add up to measured; the builder leaves it out.
    row("button.height", "all", "adapt", 4, [bucket(32, 4, 3, 1), bucket(40, 3, 2, 1)], { valueKind: "set", viewport: 390 }),
    row("button.height", "detail", "adapt", 4, [bucket(32, 4, 3, 1)], { valueKind: "value" }),
    // Every non-set row of a WO-12 run carries valueKind "single" and is packed.
    row("button.height", "dashboard", "adapt", 4, [bucket(36, 4, 3, 1)], { valueKind: "single" }),
  );
  const { problems, pack } = buildEvidencePack(input);
  assert.deepEqual(problems, []);
  assert.equal(pack.run.consensusVersion, 2, "copied, not checked");
  assert.ok(pack.lineages.some((lineage) => lineage.id === "epsilon" && lineage.screens === 1));
  assert.ok(pack.rows.some((entry) => entry.claim === "button.height" && entry.pageType === "wizard"));
  assert.ok(pack.rows.some((entry) => entry.claim === "button.height" && entry.pageType === "detail"), "valueKind value is a known kind");
  assert.ok(pack.rows.some((entry) => entry.claim === "button.height" && entry.pageType === "dashboard"), "valueKind single is a known kind");
  assert.ok(!pack.rows.some((entry) => entry.viewport === 390), "the set row is not packed");
  assert.ok(!pack.claims.some((claim) => claim.id === "controls.rowShareRadius"));
  // A claim whose only rows are set rows is not packed at all, and nothing fails.
  const setOnly = synthetic();
  setOnly.consensus.rows.push(row("table.rowHeight", "list", "adapt", 3, [bucket(40, 3, 2, 1), bucket(48, 2, 1, 1)], { valueKind: "set" }));
  const built = buildEvidencePack(setOnly);
  assert.deepEqual(built.problems, []);
  assert.ok(!built.pack.claims.some((claim) => claim.id === "table.rowHeight"));
  // A kind the builder does not know is a problem on a mapped claim (left out silently, a whole run could
  // give an empty pack), and no problem on a claim without a CLAIM_USES line.
  const unknown = synthetic();
  unknown.consensus.rows.push(row("button.height", "wizard", "adapt", 3, [bucket(32, 3, 2, 1)], { valueKind: "range" }), row("icons.oneFamily", "all", "keep", 4, [bucket(false, 3, 2, 1)], { valueKind: "range" }));
  const refused = buildEvidencePack(unknown);
  assert.equal(refused.problems.length, 1);
  assert.match(refused.problems[0], /\(button\.height\) has valueKind "range", which this builder does not know/u);
  assert.ok(!refused.pack.rows.some((entry) => entry.pageType === "wizard"));

  // The proposer reads claims[] generically: a claim whose use (or axis) it does not know changes nothing.
  const base = normalizeEvidencePack(buildEvidencePack(synthetic()).pack);
  const future = normalizeEvidencePack({ ...clone(base), claims: [...clone(base.claims), { id: "button.height2", axis: "controlHeights", use: "range", label: "a future use", futureField: [1, 2] }, { id: "panel.inset", axis: "panelInsets", use: "value", label: "a future axis" }], rows: [...clone(base.rows), { ...clone(base.rows[0]), claim: "button.height2" }, { ...clone(base.rows[0]), claim: "panel.inset" }] });
  assert.equal(future.claims.at(-2).futureField.length, 2, "unknown keys in a claim are kept");
  const defaults = normalizeEngineDefaults(JSON.parse(readFileSync(resolve(references, "engine-defaults.json"), "utf8")));
  const proposal = (pack) => proposeSystem({ pack, defaults, project: { mode: "legacy", decisions: [], density: null, recipe: "enterprise-workbench", ledger: { path: ".styleseed/decisions.json", entries: 0, nextId: "D-001" } }, context: { page: "form", surface: "pointer" } });
  assert.deepEqual(proposal(future), proposal(base));
});

test("buildEvidencePack is deterministic: same input, same bytes", () => {
  assert.equal(bytes(buildEvidencePack(synthetic()).pack), bytes(buildEvidencePack(synthetic()).pack));
  const sources = Object.fromEntries(Object.entries(COMPONENT_SOURCES).map(([id, path]) => [id, readFileSync(resolve(repoRoot, path), "utf8")]));
  const input = () => ({ sources, componentFiles: componentFiles(), colours: themeColors(), recipesCss: readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8"), rules: readJson("engine/rules/catalog.json").rules });
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
  const defaults = buildEngineDefaults({ sources: componentSources(), componentFiles: componentFiles(), colours: themeColors(), recipesCss: readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8"), rules: catalogRules });
  assert.deepEqual(defaults.problems, []);
  assert.equal(committedDefaultsText, bytes(defaults.defaults), "run node scripts/build-evidence-pack.mjs");
  const schema = JSON.parse(readFileSync(resolve(references, "evidence-pack.schema.json"), "utf8"));
  assert.deepEqual(schemaErrors(schema, committedPack), []);
  assert.deepEqual(Object.keys(schema.properties), Object.keys(committedPack));
  assert.ok(schemaErrors(schema, { ...committedPack, extra: 1 }).length, "no unknown top-level key");
  assert.ok(schemaErrors(schema, { ...committedPack, rows: [{ ...committedPack.rows[0], lineages: [] }] }).length, "a row cannot carry per-lineage values");
  assert.deepEqual(schemaErrors(schema, { ...committedPack, claims: [{ ...committedPack.claims[0], futureField: true }] }), [], "claims keep unknown keys");
  assert.ok(!committedPack.claims.some((claim) => claim.id === "lineage.spacingBase") && !committedPack.rows.some((row) => row.claim === "lineage.spacingBase"), "lineage.spacingBase is not packed (its test does not find a system's spacing unit)");
  assert.ok(Object.hasOwn(NOT_PACKED, "lineage.spacingBase") && !Object.hasOwn(CLAIM_USES, "lineage.spacingBase"));
  assert.deepEqual(normalizeEvidencePack(committedPack), committedPack, "the pack passes its normalizer unchanged");
  assert.deepEqual(normalizeEngineDefaults(committedDefaults), committedDefaults, "the engine defaults pass theirs");
  assert.throws(() => normalizeEvidencePack({ ...committedPack, schemaVersion: 2 }, { file: "ss-resolve/references/evidence-pack.json" }), /^Error: ss-resolve\/references\/evidence-pack\.json: schemaVersion: is 2, newer than this proposer reads \(1\); rebuild with `node scripts\/build-evidence-pack\.mjs`, or reinstall the skill$/u);
  assert.throws(() => normalizeEvidencePack({ ...committedPack, rows: [{ ...committedPack.rows[0], lineages: [] }] }), /rows\[0\]: unknown key\(s\) lineages/u);
  assert.throws(() => normalizeEvidencePack({ ...committedPack, rows: [{ ...committedPack.rows[0], buckets: [{ value: "32px", lineages: 1, productSystems: 1, kits: 0 }] }] }), /rows\[0\]\.buckets\[0\]\.value: must be a number, a boolean, or "mixed"/u);
  assert.throws(() => normalizeEngineDefaults({ ...committedDefaults, measured: true }), /measured: must be false/u);
  assert.throws(() => normalizeEngineDefaults({ ...committedDefaults, components: { ...committedDefaults.components, input: { ...committedDefaults.components.input, height: null } } }), /components\.input\.height: must be a positive number/u);
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
  const recipesCss = readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8");
  const contracts = readJson("demo-pricing/content/component-contracts.json").components;
  const sizes = (id) => contracts.find((component) => component.id === id).code.sizes.map(({ key, height, text, paddingX }) => ({ key, height, text, paddingX }));
  assert.deepEqual(committedDefaults.components.button.sizes, sizes("button"));
  assert.deepEqual(committedDefaults.components.select.sizes, sizes("select"));
  assert.equal(committedDefaults.components.button.defaultSize, "md");
  assert.equal(committedDefaults.components.select.defaultSize, "default");
  assert.deepEqual(committedDefaults.components.input, { source: "engine/components/ui/input.tsx", height: 40, text: 16, textFromMd: 14, paddingX: 12 }, "the heights at the :root value (WO-17 B1: input 40)");
  assert.deepEqual(committedDefaults.components.select.sizes.map((size) => [size.key, size.height]), [["default", 40], ["sm", 36]]);
  assert.deepEqual(committedDefaults.components.table, { source: "engine/components/ui/table.tsx", headHeight: 40, headPaddingX: 8, text: 14 });
  assert.equal(committedDefaults.measured, false);
  assert.equal(Object.keys(committedDefaults.recipes).length, 10);
  assert.deepEqual(committedDefaults.recipes["enterprise-workbench"], { controlRadius: 3, insetRadius: 2, surfaceRadius: 4, sectionGap: 16, pageGutter: 24, surfacePadding: 20, controlHeight: 36 });
  assert.equal(committedDefaults.recipes["expressive-brand"].sectionGap, null, "a clamp() value is not a plain px number");
  const statement = catalogRules.find((rule) => rule.id === "CRAFT-spacing-scale").statement;
  assert.equal(committedDefaults.spacingScale.rule, "CRAFT-spacing-scale");
  assert.ok(statement.includes(`{${committedDefaults.spacingScale.values.join(", ")}}`), statement);
  assert.ok(catalogRules.find((rule) => rule.id === TOUCH_FLOOR.rule).statement.includes(TOUCH_FLOOR.clause), "the touch floor quotes CRAFT-control-heights");

  const sources = componentSources();
  const heightless = sources.input.replace(" h-[var(--ss-control-height,40px)] ", " ");
  assert.notEqual(heightless, sources.input, "the input's height class was removed");
  const without = buildEngineDefaults({ sources: { ...sources, input: heightless }, componentFiles: componentFiles(), colours: themeColors(), recipesCss, rules: catalogRules });
  assert.match(without.problems.join("\n"), /engine\/components\/ui\/input\.tsx: input height could not be read; the engine defaults need it/u);
  const noMd = buildEngineDefaults({ sources: { ...sources, input: sources.input.replace(" md:text-sm", "") }, colours: themeColors(), recipesCss: "", rules: [] });
  assert.match(noMd.problems.join("\n"), /input text size from md \(md:text-sm\) could not be read/u);
  assert.match(noMd.problems.join("\n"), /recipes\.css: no :root block/u);
  assert.match(noMd.problems.join("\n"), /the statement of CRAFT-spacing-scale holds no \{…\} set/u);
  // WO-17 A3: a class naming --ss-control-height in another form than the one the reader knows is a problem, not a silent null.
  const shorthand = sources.button.replace(/md: "\S+ /u, "md: \"h-(--ss-control-height,40px) ");
  assert.notEqual(shorthand, sources.button);
  const misfit = buildEngineDefaults({ sources: { ...sources, button: shorthand }, componentFiles: componentFiles(), colours: themeColors(), recipesCss, rules: catalogRules });
  assert.match(misfit.problems.join("\n"), /^engine\/components\/ui\/button\.tsx: `h-\(--ss-control-height,40px\)` names --ss-control-height in a form the readers do not know/mu);
  assert.equal(misfit.problems.filter((problem) => problem.includes("names --ss-control-height")).length, 1, "reported once");
});

// WO-17 B2, B3: version 2 carries each recipe's control height and the offsets the shipped components draw.
const B2_HEIGHTS = { default: 40, "calm-consumer": 40, "native-mobile": 44, "enterprise-workbench": 36, "developer-platform": 36, "commerce-operator": 40, "public-service": 40, "creative-professional": 40, "editorial-authority": 40, "expressive-brand": 40 };

test("engine defaults version 2: every recipe's control height, the offsets read from every component file, problems that name the block or the file", () => {
  const recipesCss = readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8");
  const files = componentFiles();
  assert.ok(Object.keys(files).includes("engine/components/patterns/top-bar.tsx") && Object.keys(files).every((path) => /^engine\/components\/[a-z0-9/-]+\.tsx$/u.test(path)), "repository paths with forward slashes");
  const build = (over = {}) => buildEngineDefaults({ sources: componentSources(), componentFiles: files, colours: themeColors(), recipesCss, rules: catalogRules, ...over });
  assert.equal(committedDefaults.schemaVersion, 2);
  assert.deepEqual(Object.keys(committedDefaults), ["schemaVersion", "generatedBy", "measured", "components", "recipes", "controlHeight", "spacingScale"]);
  assert.deepEqual(Object.fromEntries(Object.entries(committedDefaults.recipes).map(([id, recipe]) => [id, recipe.controlHeight])), B2_HEIGHTS);
  assert.deepEqual(committedDefaults.controlHeight, { variable: "--ss-control-height", offsets: [-12, -8, -4, 0, 4, 12] });
  assert.deepEqual(build().problems, []);

  // A block that does not declare the variable, or declares it in another form, is a problem naming the block.
  const missing = recipesCss.replace(/(\[data-styleseed-recipe="public-service"\] \{[^}]*?)\n  --ss-control-height: 40px;/u, "$1");
  assert.notEqual(missing, recipesCss);
  assert.deepEqual(build({ recipesCss: missing }).problems, ["engine/css/recipes.css: the [data-styleseed-recipe=\"public-service\"] block does not declare --ss-control-height; every block states the height its controls draw, as a plain px value such as 40px"]);
  const rem = recipesCss.replace(/(:root \{[^}]*?)--ss-control-height: 40px;/u, "$1--ss-control-height: 2.5rem;");
  assert.notEqual(rem, recipesCss);
  assert.match(build({ recipesCss: rem }).problems.join("\n"), /^engine\/css\/recipes\.css: the :root block declares --ss-control-height: 2\.5rem; write a positive plain px value such as 40px/mu);
  assert.equal(build({ recipesCss: rem }).defaults.recipes.default.controlHeight, null, "never read as a number");

  // A component with an extra offset changes `offsets`; min-w-[…] is not a height; another form names the file.
  const drawer = "engine/components/ui/drawer.tsx";
  const extra = files[drawer].replace("size-[calc(var(--ss-control-height,40px)-8px)]", "size-[calc(var(--ss-control-height,40px)+20px)]");
  assert.notEqual(extra, files[drawer]);
  const wider = build({ componentFiles: { ...files, [drawer]: extra } });
  assert.deepEqual(wider.problems, []);
  assert.deepEqual(wider.defaults.controlHeight.offsets, [-12, -8, -4, 0, 4, 12, 20], "the button xs still draws -8; the drawer adds +20");
  const minWidthOnly = build({ componentFiles: { ...files, "engine/components/ui/extra.tsx": "const c = \"min-w-[calc(var(--ss-control-height,40px)+28px)]\";" } });
  assert.deepEqual(minWidthOnly.defaults.controlHeight.offsets, [-12, -8, -4, 0, 4, 12], "min-w-[…] is not read");
  const other = build({ componentFiles: { ...files, "engine/components/patterns/extra.tsx": "const s = { height: \"var(--ss-control-height)\" };" } });
  assert.deepEqual(other.problems, ["engine/components/patterns/extra.tsx: `var(--ss-control-height)` names --ss-control-height in a form the readers do not know; write h-[var(--ss-control-height,40px)] or h-[calc(var(--ss-control-height,40px)-4px)] (size-[…] and min-w-[…] the same; no spaces, the fallback equal to the :root value in engine/css/recipes.css), or teach SPACING in scripts/build-component-contracts.mjs"]);
  assert.match(build({ componentFiles: undefined }).problems.join("\n"), /^engine\/components: the component files were not read/mu);
});
