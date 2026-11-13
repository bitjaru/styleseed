import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { buildFacts, FACT_FAMILIES } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { screenValues } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { STAYS_OPEN } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { buildEvidence, parseArgs, run } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-contract.mjs";
import {
  COMPARE_OPS, CONTRACT_AXES, CONTRACT_FILES, DEFAULT_TOKEN_TRANSFERS, DEFAULT_TRANSFERS, FACT_AXES, RENDERED_FILES, TOKEN_AXES, TRANSFERS,
  contractHash, defaultTokenTransfers, defaultTransfer, isApproved, normalizeReferenceEvidence, proposeDecisions, renderContractFiles,
  renderedHashes, renderRuleset, tokenProblems,
} from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/reference-contract.mjs";
import { normalizeDecisions } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { schemaErrors } from "../lib/schema-lite.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const scripts = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows");
const resolver = resolve(scripts, "ss-resolve/scripts/resolve-context.mjs");
const catalog = JSON.parse(readFileSync(resolve(scripts, "ss-resolve/references/catalog.json"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

// The shared synthetic settings page of reference-structure.test.mjs: top bar, 240px side nav,
// 2fr/5fr settings groups, a table with 40px rows, a 768px breakpoint, one unreadable stylesheet.
const TEAL = "rgb(15, 118, 110)";
const structure = (width, over = {}) => {
  const wide = width >= 768;
  return {
    version: 1, viewport: { width, height: wide ? 900 : 844 }, elements: 120, truncated: false,
    shell: { documentHeight: wide ? 1347 : 1551, bodyScrolls: true, overflowX: 0, scrollContainers: 0 },
    regions: [
      { kind: "topBar", by: "landmark", x: 0, y: 0, w: width, h: 56, position: "sticky", items: 2, itemHeight: 32, contentWidth: width - 48, insetLeft: 24 },
      ...(wide ? [{ kind: "sideNav", by: "geometry", x: 0, y: 56, w: 240, h: 844, position: "sticky", items: 6, itemHeight: 32, contentWidth: 223, insetLeft: 8 }] : []),
      { kind: "main", by: "landmark", x: wide ? 240 : 0, y: 56, w: wide ? width - 240 : width, h: 1291, position: "static", items: 12, itemHeight: 36, contentWidth: wide ? 1136 : 358, insetLeft: wide ? 32 : 16 },
    ],
    sections: [
      { kind: "heading-block", y: 88, h: 52, gapBefore: 0, surface: false, cols: [1], heading: { level: 1, size: 24, weight: 600 }, filled: {} },
      ...[172, 450, 728].map((y) => ({ kind: "form-group", y, h: 246, gapBefore: 32, surface: false, cols: wide ? [0.29, 0.71] : [1], heading: { level: 2, size: 16, weight: 600 }, filled: { [TEAL]: 1 } })),
      { kind: "table", y: 1006, h: 309, gapBefore: 32, surface: false, cols: [1], heading: { level: 2, size: 16, weight: 600 }, filled: {} },
    ],
    columns: wide ? { "1": 2, "2|0.29/0.71|16": 3 } : { "1": 5 },
    gaps: { section: { "32": 4 }, group: { "16": 6, "8": 4 }, stack: { "8": 6 }, inline: { "8": 3, "16": 3 }, inset: { "24": 3 } },
    headings: { main: { "1|24|600|32": 1, "2|16|600|24": 4 }, skips: 0 },
    controls: {
      buttons: { "text|rgb(77, 81, 80)|32|topBar": 2, "outline|rgb(180, 189, 187)|36|main": 3, [`filled|${TEAL}|36|main`]: 3 },
      inputs: { "text|36|full": 4, "select|36|full": 2 }, labels: { above: 6, left: 0, none: 0 }, leftEdges: 1,
    },
    tables: [{ rows: 6, cols: 3, headerH: 36, rowH: { "40": 6 }, padX: 16, rowBorder: true, stickyHeader: false, endAligned: 1 }],
    lists: [], tabs: [{ tabs: 4, h: 36, indicator: "underline" }],
    stickies: [{ position: "sticky", edge: "top", w: width, h: 56 }],
    media: { img: 0, video: 0, canvas: 1, chartLike: 1, areaShare: 0.08, iconSizes: { "16": 12 } },
    css: { hover: 3, focusVisible: 2, disabled: 1, reducedMotion: 1, breakpoints: { "768": 3 }, unreadableSheets: 1 },
    skipped: { shadowHosts: 0, iframes: 0 },
    ...over,
  };
};
const observation = (width, { structureOver = {}, ...over } = {}) => ({
  viewport: { width, height: width >= 768 ? 900 : 844 }, documentHeight: width >= 768 ? 1347 : 1551, elements: 94, truncated: false,
  actions: { [`bg:${TEAL}`]: 3, "text:rgb(77, 81, 80)": 2 }, actionText: {}, links: {}, text: { "rgb(9, 12, 11)": 30, "rgb(77, 81, 80)": 12 }, headings: { "rgb(9, 12, 11)": 5 },
  surfaces: { "rgb(255, 255, 255)": 5, "rgb(246, 248, 248)": 2 }, spacing: { 8: 40, 16: 30, 24: 6, 32: 8 },
  type: { "14|400|20": 40, "16|600|24": 4, "24|600|32": 1 }, radii: { 4: 20, 8: 3 }, controlHeights: { 36: 12, 32: 2 }, fonts: { Inter: 45 },
  shadows: { "rgba(0, 0, 0, 0.08) 0px 1px 3px 0px": 3 }, borders: { "1|rgb(227, 232, 231)": 12, "1|rgb(180, 189, 187)": 6 },
  body: { color: "rgb(9, 12, 11)", background: "rgb(246, 248, 248)", fontFamily: "Inter", fontSize: 14 },
  actionPairs: { [`${TEAL}|rgb(250, 252, 252)`]: 3 }, motion: { transitions: { "color|150|ease-out": 3 }, animations: { "1000|linear|infinite": 1 } },
  targets: { 36: 12, 32: 8 }, tabular: 7, structure: structure(width, structureOver),
  ...over,
});
const URL_ = "https://example.test/settings";
function measurement(over1440 = {}, over390 = {}) {
  const summary = summarize([observation(1440, over1440), observation(390, over390)]);
  return { summary, facts: buildFacts(summary, summary.structure, URL_, "2026-11-10"), robots: "allowed" };
}
// A second page shape: a list, a bottom bar, an aside, three main landmarks, a heading whose line
// height is `normal`, and zero stylesheet counts that are lower bounds (two unreadable sheets).
const variant = () => {
  const over = (width) => ({
    regions: [
      { kind: "main", by: "landmark", x: 0, y: 0, w: width, h: 2600, position: "static", items: 9, itemHeight: 48, contentWidth: width - 32, insetLeft: 16, parts: 3 },
      { kind: "aside", by: "landmark", x: width - 320, y: 0, w: 320, h: 900, position: "static", items: 4, itemHeight: 40, contentWidth: 300, insetLeft: 12 },
      { kind: "bottomBar", by: "geometry", x: 0, y: 780, w: width, h: 64, position: "fixed", items: 4, itemHeight: 48, contentWidth: width, insetLeft: 0 },
    ],
    lists: [{ items: 6, itemH: { "48": 6 }, divider: true, trailingAction: false }],
    headings: { main: { "1|28|700|normal": 1 }, skips: 1 },
    css: { hover: 0, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 2 },
  });
  return measurement({ structureOver: over(1440) }, { structureOver: over(390) });
};

// The default transfer each fact-id template of analyze-structure.mjs must get, written from the
// work order's table rather than from DEFAULT_TRANSFERS.
const keepMax = { transfer: "keep", compare: { op: "max" } };
const observe = { transfer: "observe" };
const adapt = (tolerance) => ({ transfer: "adapt", compare: { op: "within", tolerance } });
const densityAdapt = (fact) => adapt(fact.unit === "px" ? 4 : 0.1);
const numeric = (value) => typeof value === "number" || (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number"));
const EXPECTED = {
  "attention.emphasis.ratio": observe, "attention.firstViewport.sections": observe, "attention.primary.count": observe,
  "attention.primary.firstViewport": observe, "attention.primary.placement": observe, "attention.text.largest": observe, "attention.text.largestOverBody": observe,
  "composition.columns.count": observe, "composition.columns.gap": observe, "composition.columns.max": observe, "composition.columns.ratio": observe, "composition.columns.sections": observe,
  "composition.main.contentWidth": adapt(8), "composition.main.insetLeft": adapt(8),
  "composition.region.*.height": observe, "composition.region.*.position": observe, "composition.region.*.width": observe, "composition.region.main.parts": observe,
  "composition.rhythm.group": adapt(8), "composition.rhythm.section": adapt(8),
  "composition.sections.count": observe, "composition.sections.sequence": observe,
  "composition.shell.bodyScrolls": observe, "composition.shell.documentHeight": observe, "composition.shell.scrollContainers": observe,
  "density.gap.inline": densityAdapt, "density.gap.stack": densityAdapt, "density.inset": densityAdapt, "density.list.divider": densityAdapt, "density.list.itemHeight": densityAdapt,
  "density.table.headerHeight": densityAdapt, "density.table.padX": densityAdapt, "density.table.rowBorder": densityAdapt, "density.table.rowHeight": densityAdapt,
  "density.targets.mode": densityAdapt, "density.targets.under24Share": densityAdapt, "density.targets.under44Share": densityAdapt,
  "imagery.icon.sizes": observe, "imagery.media.*": observe, "imagery.media.areaShare": observe, "imagery.media.chartLike": observe, "imagery.table.endAligned": observe, "imagery.tabular.share": observe,
  "navigation.buttons.*": observe, "navigation.inputs.count": observe, "navigation.inputs.leftEdges": observe, "navigation.labels.*": observe,
  "navigation.primary.perSectionMax": keepMax, "navigation.primary.region.*": observe, "navigation.primary.sectionsOverOne": keepMax,
  "navigation.region.*.itemHeight": adapt(4), "navigation.region.*.items": observe, "navigation.tabs.height": adapt(4), "navigation.tabs.indicator": observe, "navigation.tabs.sets": observe,
  "responsive.breakpoints": observe, "responsive.columns": observe, "responsive.heading.max": observe, "responsive.main.contentWidth": observe, "responsive.main.insetLeft": observe,
  "responsive.overflowX": observe, "responsive.region.*": observe, "responsive.rhythm.section": observe, "responsive.sections.count": observe, "responsive.table.rowHeight": observe,
  "states.css.*": (fact) => (["focusVisible", "reducedMotion"].includes(fact.id.split(".")[2]) && !(fact.bound === "lower" && fact.value === 0) ? { transfer: "keep", compare: { op: "present" } } : observe),
  "states.css.unreadableSheets": observe, "states.motion.animations": observe, "states.motion.duration": adapt(50), "states.motion.durations": adapt(50),
  "states.motion.easing": observe, "states.motion.infinite": observe, "states.motion.transitions": observe,
  "tells.controlHeights.distinct": keepMax, "tells.headings.skips": keepMax, "tells.radii.distinct": keepMax, "tells.spacing.offScaleShare": adapt(0.1), "tells.table.rowHeightSpread": keepMax, "tells.typeSizes.distinct": keepMax,
  "typography.heading.h*.lineHeight": (fact) => (numeric(fact.value) ? adapt(2) : observe), "typography.heading.h*.size": adapt(2), "typography.heading.h*.weight": adapt(2), "typography.heading.sizes": adapt(2),
};
const templateOf = (id) => {
  if (Object.hasOwn(EXPECTED, id)) return id;
  const hits = Object.keys(EXPECTED).filter((key) => key.includes("*") && new RegExp(`^${key.replace(/\./gu, "\\.").replace(/\*/gu, "[A-Za-z0-9]+")}$`, "u").test(id));
  assert.equal(hits.length, 1, `${id} matches exactly one fact-id template (${hits.join(", ")})`);
  return hits[0];
};

test("every fact-id template WO-04 can emit has exactly one default transfer, as the work order's table says", () => {
  const source = readFileSync(resolve(scripts, "ss-reference/scripts/analyze-structure.mjs"), "utf8");
  const templates = [...new Set([...source.matchAll(/\b(?:add|change)\(\s*['`]([^'`]+)['`]/gu)].map((match) => match[1].replace(/\$\{[^}]*\}/gu, "*")))].sort();
  assert.deepEqual(templates, Object.keys(EXPECTED).sort(), "a new fact id needs a decided default before it ships");
  const seen = new Set();
  for (const doc of [measurement().facts, variant().facts, measurement({ structureOver: { css: { hover: 1, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 0 } } }).facts]) {
    for (const fact of doc.facts) {
      const template = templateOf(fact.id);
      seen.add(template);
      const want = typeof EXPECTED[template] === "function" ? EXPECTED[template](fact) : EXPECTED[template];
      assert.deepEqual(defaultTransfer(fact), want, `${fact.id} @${fact.viewport} = ${JSON.stringify(fact.value)}${fact.bound ? " (lower bound)" : ""}`);
    }
  }
  assert.deepEqual(templates.filter((template) => !seen.has(template)), [], "the synthetic pages emit every template");
  // Lower bounds: zero is not absence; a lower bound above zero keeps its row.
  assert.deepEqual(defaultTransfer({ id: "states.css.focusVisible", bound: "lower", value: 0 }), observe);
  assert.deepEqual(defaultTransfer({ id: "states.css.focusVisible", bound: "lower", value: 3 }), { transfer: "keep", compare: { op: "present" } });
  assert.deepEqual(defaultTransfer({ id: "states.css.focusVisible", value: 0 }), { transfer: "keep", compare: { op: "present" } }, "an unbounded zero is an observation");
  assert.deepEqual(defaultTransfer({ id: "responsive.breakpoints", bound: "lower", value: [] }), observe);
  assert.deepEqual(defaultTransfer({ id: "density.table.rowHeight", bound: "lower", value: 40, unit: "px" }), observe, "within is not valid on a lower bound, so the row does not apply");
  assert.equal(DEFAULT_TRANSFERS.at(-1).match.join(), "*", "the last row is the everything-else row");
  assert.deepEqual(DEFAULT_TOKEN_TRANSFERS, { accent: "avoid", ink: "observe", canvas: "observe", spacingBase: "adapt", spacingScale: "adapt", typeSizes: "adapt", radii: "adapt", fonts: "avoid", controlHeights: "adapt" });
});

test("a reference measured only in system or generic fonts proposes observe for fonts, not avoid", () => {
  assert.equal(defaultTokenTransfers({ fonts: ["-apple-system"] }).fonts, "observe", "a platform stack is nobody's brand");
  assert.equal(defaultTokenTransfers({ fonts: ["system-ui", "Segoe UI", "sans-serif"] }).fonts, "observe");
  assert.equal(defaultTokenTransfers({ fonts: ["Inter"] }).fonts, "avoid", "a named family stays avoid");
  assert.equal(defaultTokenTransfers({ fonts: ["Inter", "system-ui"] }).fonts, "avoid", "one named family is enough to keep avoid");
  assert.equal(defaultTokenTransfers({ fonts: [] }).fonts, "avoid");
  assert.deepEqual({ ...defaultTokenTransfers({ fonts: ["-apple-system"] }), fonts: "avoid" }, { ...DEFAULT_TOKEN_TRANSFERS }, "no other axis changes");
});

test("resolver-side copies stay in parity with ss-reference: fact families, token axes, open questions", () => {
  assert.deepEqual(FACT_AXES, { ...FACT_FAMILIES });
  const { offScale, ...values } = screenValues(measurement().summary);
  assert.ok(offScale);
  assert.deepEqual(Object.keys(values), [...TOKEN_AXES]);
  const evidence = buildEvidence({ ...measurement(), slug: "ops-console", fallback: "operations-console", adapter: "product-ui" });
  assert.deepEqual(Object.fromEntries(evidence.open.map((entry) => [entry.axis, entry.question])), { ...STAYS_OPEN });
  assert.deepEqual(evidence.open.map((entry) => entry.axis), ["user-job", "attention", "composition", "imagery-data", "navigation-action", "states-motion", "tells"], "twelve-axis order");
});

const draft = (m = measurement()) => normalizeReferenceEvidence(buildEvidence({ ...m, slug: "ops-console", fallback: "operations-console", adapter: "product-ui" }), { catalog });

const evidenceSchema = JSON.parse(readFileSync(resolve(scripts, "ss-resolve/references/reference-evidence.schema.json"), "utf8"));

test("reference-evidence.schema.json describes what normalizeReferenceEvidence accepts", () => {
  const evidence = draft(variant());
  const files = renderContractFiles(evidence);
  const rendered = { ...evidence, rendered: renderedHashes(files) };
  const approved = { ...rendered, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(evidence) } };
  for (const doc of [evidence, rendered, approved]) assert.deepEqual(schemaErrors(evidenceSchema, doc), []);
  assert.ok(evidence.facts.some((fact) => Array.isArray(fact.value) && !fact.value.length && fact.bound === "lower"), "an empty lower-bound list is covered");
  assert.deepEqual(evidenceSchema.$defs.transfer.enum, [...TRANSFERS]);
  assert.deepEqual(evidenceSchema.$defs.fact.properties.compare.properties.op.enum, [...COMPARE_OPS]);
  assert.deepEqual(evidenceSchema.$defs.fact.properties.axis.enum.sort(), [...new Set(Object.values(FACT_AXES))].sort());
  assert.deepEqual(evidenceSchema.$defs.contractAxis.enum, CONTRACT_AXES.map(([axis]) => axis));
  assert.deepEqual(evidenceSchema.properties.tokens.properties.measured.required, [...TOKEN_AXES]);
  assert.deepEqual(evidenceSchema.properties.rendered.required, [...RENDERED_FILES]);
  assert.deepEqual(Object.keys(evidenceSchema.properties).sort(), Object.keys(approved).sort());
  assert.ok(schemaErrors(evidenceSchema, { ...evidence, facts: [{ ...evidence.facts[0], transfer: "copy" }] }).length);
  assert.ok(schemaErrors(evidenceSchema, { ...evidence, approval: { status: "approved" } }).length);
});


test("normalizeReferenceEvidence refuses what cannot be applied and names the field", () => {
  const base = draft();
  const at = (id, viewport) => base.facts.findIndex((fact) => fact.id === id && fact.viewport === viewport);
  const edit = (fn) => { const copy = clone(base); fn(copy); return copy; };
  const cases = [
    [edit((e) => { e.facts.push(clone(e.facts[0])); }), /duplicate \(id, viewport\) pair/u],
    [edit((e) => { e.facts[at("composition.columns.ratio", 1440)].compare = { op: "eq" }; }), /composition\.columns\.ratio @1440\)\.compare: is not allowed when transfer is observe; remove it/u],
    [edit((e) => { e.facts[at("density.inset", 1440)].compare = { op: "near" }; }), /compare\.op "near" is not one of eq, max, min, present, within/u],
    [edit((e) => { delete e.facts[at("density.inset", 1440)].compare; }), /density\.inset @1440\)\.compare: is required when transfer is adapt/u],
    [edit((e) => { Object.assign(e.facts[at("composition.columns.ratio", 1440)], { transfer: "keep", compare: { op: "max" } }); }), /max needs a single number; a string, boolean, or list may only use eq/u],
    [edit((e) => { Object.assign(e.facts[at("composition.columns.ratio", 1440)], { transfer: "keep", compare: { op: "within", tolerance: 1 } }); }), /within needs a number or a list of numbers/u],
    [edit((e) => { e.facts[at("density.inset", 1440)].compare = { op: "max", tolerance: 2 }; }), /tolerance is only used with within/u],
    [edit((e) => { Object.assign(e.facts[at("states.css.focusVisible", "both")], { compare: { op: "max" } }); }), /states\.css\.focusVisible @both\)\.compare: a lower-bound count .* set transfer to observe/u],
    [edit((e) => { e.facts[at("states.css.focusVisible", "both")].value = 0; }), /a lower-bound count \(bound: "lower"\) can only be compared with present or min, and only when its value is above 0; set transfer to observe/u],
    [edit((e) => { e.facts[0].axis = "density"; }), /\.axis: must be composition/u],
    [edit((e) => { e.facts[0].note = "x".repeat(201); }), /\.note: must be single-line text of 0-200 characters/u],
    [edit((e) => { e.facts[0].source = "S9"; }), /\.source: must name a source in sources\[\] \(S1\)/u],
    [edit((e) => { e.tokens.transfer.accent = "copy"; }), /tokens\.transfer\.accent: must be one of keep, adapt, observe, avoid/u],
    [edit((e) => { e.fallback = "not-a-grammar"; }), /fallback: "not-a-grammar" is not a built-in grammar/u],
    [edit((e) => { e.extra = 1; }), /evidence: unknown key\(s\) extra/u],
    [edit((e) => { e.approval = { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: `sha256:${"0".repeat(64)}` }; }), /approval\.contractHash: does not match the contract: evidence\.json changed after approval/u],
  ];
  for (const [input, expected] of cases) assert.throws(() => normalizeReferenceEvidence(input, { catalog, file: ".styleseed/rulesets/ops-console/evidence.json" }), expected, String(expected));
  assert.throws(() => normalizeReferenceEvidence(edit((e) => { e.facts[0].compare = { op: "eq" }; }), { file: ".styleseed/rulesets/ops-console/evidence.json" }), /^Error: \.styleseed\/rulesets\/ops-console\/evidence\.json: facts\[0\]/u, "messages start with the file");
  // A stale approval passes only when the caller asks to reset it.
  const stale = edit((e) => { e.approval = { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: `sha256:${"0".repeat(64)}` }; });
  assert.equal(normalizeReferenceEvidence(stale, { verifyApproval: false }).approval.status, "approved");
  assert.equal(isApproved(normalizeReferenceEvidence(stale, { verifyApproval: false })), false);
  // A lower-bound count above zero may use present or min.
  assert.equal(normalizeReferenceEvidence(edit((e) => { e.facts[at("states.css.focusVisible", "both")].compare = { op: "min" }; })).facts[at("states.css.focusVisible", "both")].compare.op, "min");
});

test("rendering is deterministic, tokens.json passes the canon checks, RULESET.md holds no observe or avoid fact", () => {
  const evidence = draft();
  const files = renderContractFiles(evidence);
  assert.deepEqual(Object.keys(files), [...RENDERED_FILES]);
  assert.deepEqual(renderContractFiles(normalizeReferenceEvidence(JSON.parse(JSON.stringify(evidence)))), files, "same input, same bytes");
  const reverseKeys = (value) => (Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)])) : value);
  const shuffled = reverseKeys(evidence);
  assert.deepEqual(renderContractFiles(normalizeReferenceEvidence(shuffled)), files, "key order in evidence.json does not matter");
  assert.equal(contractHash(normalizeReferenceEvidence(shuffled)), contractHash(evidence));
  assert.deepEqual(renderContractFiles({ ...evidence, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(evidence) } }), files, "approval changes no rendered byte");

  assert.deepEqual(tokenProblems(files["tokens.json"]), []);
  const tokens = JSON.parse(files["tokens.json"]);
  assert.deepEqual(Object.keys(tokens.primitive).sort(), ["control-height", "font-size", "radius", "space"], "only adapt and keep token axes; the avoid accent and fonts and the observed ink and canvas are left out");
  assert.equal(tokens.semantic.space.base.$value, "{primitive.space.8}");
  assert.ok(!files["tokens.json"].includes("#0F766E") && !files["tokens.json"].includes("Inter"));
  const everything = { ...clone(evidence), tokens: { ...evidence.tokens, transfer: Object.fromEntries(TOKEN_AXES.map((axis) => [axis, "keep"])) } };
  assert.deepEqual(tokenProblems(renderContractFiles(normalizeReferenceEvidence(everything))["tokens.json"]), [], "colours and fonts kept: still canon-valid");
  const none = { ...clone(evidence), tokens: { ...evidence.tokens, transfer: Object.fromEntries(TOKEN_AXES.map((axis) => [axis, "observe"])) } };
  assert.deepEqual(tokenProblems(renderContractFiles(normalizeReferenceEvidence(none))["tokens.json"]), []);

  const ruleset = files["RULESET.md"];
  const lines = ruleset.split("\n");
  for (const fact of evidence.facts.filter((item) => ["observe", "avoid"].includes(item.transfer))) {
    const place = fact.viewport === "both" ? "at both viewports" : `at ${fact.viewport}`;
    assert.ok(!lines.some((line) => line.includes(fact.id) && line.includes(place)), `${fact.id} @${fact.viewport} is observed and stays out of RULESET.md`);
  }
  assert.ok(!ruleset.includes("composition.region."), "no region fact");
  for (const width of ["1200px", "240px"]) assert.ok(!ruleset.includes(width), `no measured region width (${width})`);
  assert.ok(!ruleset.includes("#0f766e") && !ruleset.includes("Inter"), "the avoided accent and font are not in RULESET.md");
  let index = -1;
  for (const title of ["User job", "Attention", "Information architecture", "Density", "Typography", "Color", "Surface", "Imagery", "Navigation", "State", "Responsive", "Characteristic"]) {
    const next = lines.findIndex((line) => line.startsWith("## ") && line.includes(title));
    assert.ok(next > index, `${title} follows the RULESETS.md order`);
    index = next;
  }
  assert.ok(ruleset.includes("- Primary actions per section, at 1440: at most 1 (`navigation.primary.perSectionMax`)."), ruleset);
  assert.ok(ruleset.includes("- Open (a person's call): the job itself."));
  assert.ok(ruleset.endsWith("- S1: https://example.test/settings · observed 2026-11-10 · viewports 1440, 390 · robots.txt allowed\n"), "provenance ends the file");
  assert.ok(files["checks.md"].includes("- The reference accent (#0f766e): do not adopt it unless the project already owns it."));
  assert.ok(files["checks.md"].includes("- Focus-visible style rules, at both viewports: present (the reference has at least 2) (`states.css.focusVisible`)."), "a lower-bound count reads at least");
  assert.equal(files["adapter.json"], "{\n  \"adapter\": \"product-ui\"\n}\n");
  assert.doesNotMatch(files["reference-board.html"], /<script|<img|src=|href=|@import|url\(/u, "a static page: no scripts, images, or remote resources");
});

// --- the CLI and the resolver, end to end in a temporary project ----------------------------------

function writeMeasurements(dir, m = measurement()) {
  mkdirSync(join(dir, "measurements"), { recursive: true });
  writeFileSync(join(dir, "measurements/summary.json"), JSON.stringify(m.summary, null, 2));
  writeFileSync(join(dir, "measurements/facts.json"), `${JSON.stringify(m.facts, null, 2)}\n`);
  writeFileSync(join(dir, "case.draft.json"), `${JSON.stringify({ sources: [{ id: "S1", robots: m.robots }] })}\n`);
  return join(dir, "measurements");
}
function writeProject(root, { selection = {} } = {}) {
  mkdirSync(join(root, ".styleseed/artifacts"), { recursive: true });
  writeFileSync(join(root, ".styleseed/project.json"), `${JSON.stringify({
    schemaVersion: 1, projectId: "contract-test",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#175CD3", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" },
  }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-ops", config: "app-ops.json" }] }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/app-ops.json"), `${JSON.stringify({
    schemaVersion: 1, id: "app-ops", target: { kind: "route", locator: "/ops" },
    selection: { grammar: "reference:ops-console", adapter: null, domain: null, page: "settings", recipe: null, palette: null, profile: null, fallback: "operations-console", ...selection },
    decisions: { primaryDecision: "Which setting needs attention?", primaryAction: "Save settings", signatureMove: "Keep groups aligned." },
    implementation: { sourceRoots: ["src"], tokenFiles: [] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  }, null, 2)}\n`);
}
const resolve_ = (root, args = []) => spawnSync(process.execPath, [resolver, "--project-root", root, "--artifact", "app-ops", "--agent", "codex", ...args], { encoding: "utf8" });
const quiet = { log: () => {}, warn: () => {}, out: () => {}, date: "2026-11-11" };
const cli = (argv, options = {}) => run(parseArgs(argv), { ...quiet, ...options });
const evidencePath = (root) => join(root, ".styleseed/rulesets/ops-console/evidence.json");
const readEvidence = (root) => JSON.parse(readFileSync(evidencePath(root), "utf8"));
const writeEvidence = (root, evidence) => writeFileSync(evidencePath(root), `${JSON.stringify(evidence, null, 2)}\n`);
// What a person does before approving: one sentence on each kept derived fact.
const explain = (root) => { const e = readEvidence(root); for (const f of e.facts) if (f.transfer === "keep" && f.level === "derived") f.note = "Holds across this product's screens."; writeEvidence(root, e); };
function sandbox(fn) {
  const root = mkdtempSync(join(tmpdir(), "ss-contract-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("draft refused, approve compiles, an edited transfer or a hand-edited file is refused again", () => sandbox((tmp) => {
  const root = join(tmp, "project");
  writeProject(root);
  const measurements = writeMeasurements(join(tmp, "case"));
  const logs = [];
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements], { log: (line) => logs.push(line) });
  assert.equal(existsSync(join(root, ".styleseed/rulesets")), false, "a dry run writes nothing");
  assert.match(logs.join("\n"), /facts: \d+ · keep \d+ · adapt \d+ · observe \d+ · avoid 0\n {2}token axes: keep 0 · adapt 5 · observe 2 · avoid 2\n {2}would write: \.styleseed\/rulesets\/ops-console\/evidence\.json, /u);

  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  assert.deepEqual(readdirSync(join(root, ".styleseed")).sort(), ["artifacts", "project.json", "rulesets"], "writes only under .styleseed/rulesets");
  assert.deepEqual(readdirSync(join(root, ".styleseed/rulesets")), ["ops-console"]);
  assert.deepEqual(readdirSync(join(root, ".styleseed/rulesets/ops-console")).sort(), [...CONTRACT_FILES].sort());
  const written = readEvidence(root);
  assert.deepEqual([written.fallback, written.adapter, written.approval], ["operations-console", "product-ui", { status: "draft" }], "fallback and adapter come from the one artifact selecting reference:ops-console");
  assert.equal(written.sources[0].robots, "allowed", "the robots verdict comes from case.draft.json");

  let compiled = resolve_(root);
  assert.equal(compiled.status, 1);
  assert.match(compiled.stderr, /\.styleseed\/rulesets\/ops-console\/evidence\.json is a draft: .* --approve --reviewer <name>/u);

  assert.throws(() => cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]), /Not approved: \d+ kept fact\(s\) are derived and have no note[\s\S]*- navigation\.primary\.perSectionMax @1440/u);
  explain(root);
  assert.throws(() => cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]), /does not match evidence\.json .*run --write first, then --approve/u, "an edited evidence.json is re-rendered before approval");
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]);
  const approved = readEvidence(root);
  assert.deepEqual(approved.approval, { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(normalizeReferenceEvidence(approved)) });

  compiled = resolve_(root);
  assert.equal(compiled.status, 0, compiled.stderr);
  const manifest = JSON.parse(readFileSync(join(root, ".styleseed/manifests/app-ops.json"), "utf8"));
  assert.equal(manifest.selection.referenceContract, "reference-contract-v3");
  assert.deepEqual(manifest.sources.filter((entry) => entry.id.startsWith("reference:")).map((entry) => entry.path), ["RULESET.md", "tokens.json", "evidence.json", "checks.md", "reference-board.html", "adapter.json"].map((name) => `.styleseed/rulesets/ops-console/${name}`));
  const bundle = readFileSync(join(root, ".styleseed/bundles/app-ops.md"), "utf8");
  assert.ok(bundle.includes(`## Project-local reference grammar override\n\n${readFileSync(join(root, ".styleseed/rulesets/ops-console/RULESET.md"), "utf8").trim()}\n\n## Reference grammar checks\n\n${readFileSync(join(root, ".styleseed/rulesets/ops-console/checks.md"), "utf8").trim()}`), "fallback + RULESET.md + checks.md, as for hand-written contracts");
  assert.ok(!bundle.includes("composition.region.") && !bundle.includes("composition.columns.ratio"), "observed structure stays out of the bundle");
  assert.equal(resolve_(root, ["--check"]).status, 0);

  // Editing one transfer after approval: refused with the hash message.
  const edited = readEvidence(root);
  const inset = edited.facts.find((fact) => fact.id === "density.inset" && fact.viewport === 1440);
  inset.transfer = "observe";
  delete inset.compare;
  writeEvidence(root, edited);
  compiled = resolve_(root);
  assert.equal(compiled.status, 1);
  assert.match(compiled.stderr, /evidence\.json changed after approval \(approved sha256:[0-9a-f]{64}, now sha256:[0-9a-f]{64}\): run .*--write, then --approve --reviewer <name> again/u);
  writeEvidence(root, approved);
  assert.equal(resolve_(root).status, 0, "restoring the approved bytes restores the approval");

  // Editing a rendered file by hand: refused with the re-render message.
  const rulesetPath = join(root, ".styleseed/rulesets/ops-console/RULESET.md");
  const original = readFileSync(rulesetPath, "utf8");
  writeFileSync(rulesetPath, `${original}- Always use a hero image.\n`);
  compiled = resolve_(root);
  assert.equal(compiled.status, 1);
  assert.match(compiled.stderr, /\.styleseed\/rulesets\/ops-console\/RULESET\.md was edited by hand or is stale .*run .*--write, then approve again/u);
  // Even with its hash updated in evidence.json the hand edit is refused: the file is not what the contract renders.
  writeEvidence(root, { ...approved, rendered: { ...approved.rendered, "RULESET.md": renderedHashes({ "RULESET.md": readFileSync(rulesetPath, "utf8"), "tokens.json": "", "checks.md": "", "adapter.json": "", "reference-board.html": "" })["RULESET.md"] } });
  assert.match(resolve_(root).stderr, /RULESET\.md is not what this engine renders from evidence\.json/u);
  writeFileSync(rulesetPath, original);
  writeEvidence(root, approved);
  assert.equal(resolve_(root).status, 0);
}));

test("--write twice keeps a person's transfer, compare, and note; an approved contract needs --force", () => sandbox((tmp) => {
  const root = join(tmp, "project");
  writeProject(root);
  const measurements = writeMeasurements(join(tmp, "case"));
  const write = (extra = []) => cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write", ...extra]);
  write();
  const e = readEvidence(root);
  const rows = e.facts.filter((fact) => fact.id === "density.table.rowHeight");
  for (const fact of rows) Object.assign(fact, { transfer: "keep", compare: { op: "within", tolerance: 2 }, note: "Tables read the same as the reference." });
  const ratio = e.facts.find((fact) => fact.id === "composition.columns.ratio" && fact.viewport === 1440);
  Object.assign(ratio, { transfer: "keep", compare: { op: "eq" }, note: "The settings columns keep this split." });
  e.tokens.transfer.radii = "keep";
  writeEvidence(root, e);
  const logs = [];
  write([]);
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"], { log: (line) => logs.push(line) });
  assert.match(logs.join("\n"), /unchanged; nothing written/u, "a third identical --write changes nothing");
  const again = readEvidence(root);
  for (const fact of again.facts.filter((item) => item.id === "density.table.rowHeight")) assert.deepEqual([fact.transfer, fact.compare, fact.note], ["keep", { op: "within", tolerance: 2 }, "Tables read the same as the reference."]);
  assert.deepEqual(again.facts.find((fact) => fact.id === "composition.columns.ratio" && fact.viewport === 1440).compare, { op: "eq" });
  assert.equal(again.tokens.transfer.radii, "keep");
  assert.ok(readFileSync(join(root, ".styleseed/rulesets/ops-console/checks.md"), "utf8").includes("- Table row height, at 1440: 40px, within 2px (`density.table.rowHeight`)."), "the re-render shows the edit");

  // A new measurement: facts that vanished are dropped and listed, new ones get defaults, edits stay.
  const without = measurement({ structureOver: { tables: [] } }, { structureOver: { tables: [] } });
  writeMeasurements(join(tmp, "case"), without);
  const dropped = [];
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements], { log: (line) => dropped.push(line) });
  assert.match(dropped.join("\n"), /dropped \d+ fact\(s\) no longer in facts\.json: .*density\.table\.rowHeight@1440 \(keep\)/u);
  write([]);
  assert.equal(readEvidence(root).facts.some((fact) => fact.id === "density.table.rowHeight"), false);
  writeMeasurements(join(tmp, "case"));
  write([]);
  const restored = readEvidence(root);
  assert.equal(restored.facts.find((fact) => fact.id === "density.table.rowHeight").transfer, "adapt", "a fact that vanished and came back starts from its default");
  assert.equal(restored.facts.find((fact) => fact.id === "composition.columns.ratio" && fact.viewport === 1440).transfer, "keep", "facts that stayed keep their edits");

  // Approved: --write that would change anything needs --force; with it, a changed contract resets to draft.
  explain(root);
  write([]);
  cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]);
  const approved = readEvidence(root);
  write([]);
  assert.deepEqual(readEvidence(root), approved, "nothing would change: nothing written, approval kept");
  writeMeasurements(join(tmp, "case"), without);
  assert.throws(() => write([]), /is approved \(reviewer-a, 2026-11-11\); this --write would change the approved contract\. Nothing was written\. Pass --write --force/u);
  assert.deepEqual(readEvidence(root), approved);
  write(["--force"]);
  assert.deepEqual(readEvidence(root).approval, { status: "draft" }, "--force: a changed contract resets to draft");
}));

test("--approve refuses a kept derived fact without a note, and the reviewer is only what the person typed", () => sandbox((tmp) => {
  const root = join(tmp, "project");
  writeProject(root);
  const measurements = writeMeasurements(join(tmp, "case"));
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  const e = readEvidence(root);
  for (const f of e.facts) if (f.transfer === "keep" && f.level === "derived") f.note = "Holds across this product's screens.";
  e.facts.find((fact) => fact.id === "tells.radii.distinct").note = "   ";
  writeEvidence(root, e);
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  assert.throws(() => cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]), (error) => /Not approved: 1 kept fact\(s\) are derived and have no note/u.test(error.message) && error.message.endsWith("\n  - tells.radii.distinct @both"));
  const names = { GIT_AUTHOR_NAME: "env-name", GIT_COMMITTER_NAME: "env-name", STYLESEED_REVIEWER: "env-reviewer" };
  const saved = Object.fromEntries(Object.keys(names).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, names);
    assert.throws(() => parseArgs(["--project-root", root, "--slug", "ops-console", "--approve"]), /--approve needs --reviewer <name>: .*The tool never fills it in\./u);
    assert.throws(() => parseArgs(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", " "]), /--approve needs --reviewer/u);
  } finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  assert.throws(() => parseArgs(["--project-root", root, "--slug", "ops-console", "--measurements", "m", "--write", "--approve", "--reviewer", "reviewer-a"]), /--write and --approve cannot run together/u);
  assert.throws(() => parseArgs(["--project-root", root, "--slug", "../escape", "--measurements", "m"]), /--slug must be a safe id/u);
  assert.throws(() => parseArgs(["--project-root", root, "--slug", "ops-console", "--measurements", "m", "--force"]), /--force only applies to --write/u);
  assert.throws(() => parseArgs(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a", "--measurements", "m"]), /--approve reads the existing evidence\.json/u);
}));

test("a fallback or adapter that disagrees with the artifact is refused by the resolver", () => sandbox((tmp) => {
  const measurements = writeMeasurements(join(tmp, "case"));
  const approve = (root, extra = []) => {
    cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write", ...extra]);
    explain(root);
    cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write", ...extra]);
    cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]);
  };
  const fallbackRoot = join(tmp, "fallback");
  writeProject(fallbackRoot);
  approve(fallbackRoot, ["--fallback", "technical-instrument"]);
  let result = resolve_(fallbackRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /evidence\.json: fallback is technical-instrument but the artifact selecting reference:ops-console uses fallback operations-console/u);

  const adapterRoot = join(tmp, "adapter");
  writeProject(adapterRoot, { selection: { adapter: "product-ui" } });
  approve(adapterRoot, ["--adapter", "document-report"]);
  result = resolve_(adapterRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /evidence\.json: adapter is document-report but the artifact selecting reference:ops-console names adapter product-ui/u);

  const noRegistry = join(tmp, "bare");
  mkdirSync(noRegistry);
  assert.throws(() => cli(["--project-root", noRegistry, "--slug", "ops-console", "--measurements", measurements]), /--fallback <grammar> is required: no artifact selects reference:ops-console yet/u);
  assert.throws(() => cli(["--project-root", noRegistry, "--slug", "ops-console", "--measurements", measurements, "--fallback", "made-up"]), /--fallback made-up is not a built-in grammar/u);
}));

test("hand-written contract files are never overwritten by compile-contract", () => sandbox((tmp) => {
  const root = join(tmp, "project");
  writeProject(root);
  const measurements = writeMeasurements(join(tmp, "case"));
  mkdirSync(join(root, ".styleseed/rulesets/ops-console"), { recursive: true });
  writeFileSync(join(root, ".styleseed/rulesets/ops-console/RULESET.md"), "# Hand-written\n");
  assert.throws(() => cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]), /already holds RULESET\.md without a generated evidence\.json/u);
  writeFileSync(join(root, ".styleseed/rulesets/ops-console/evidence.json"), "{\n  \"evidence\": []\n}\n");
  assert.throws(() => cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]), /exists but is not a generated contract/u);
  assert.equal(readFileSync(join(root, ".styleseed/rulesets/ops-console/RULESET.md"), "utf8"), "# Hand-written\n");
}));

test("proposeDecisions: each mapping row, entries that validate once given ids, nothing for avoid, observe, adapt, or colours", () => {
  const evidence = clone(draft());
  const keep = (id, compare) => { for (const fact of evidence.facts.filter((item) => item.id === id)) Object.assign(fact, { transfer: "keep", compare, note: "Kept on purpose." }); };
  keep("density.table.rowHeight", { op: "within", tolerance: 4 });
  keep("composition.rhythm.section", { op: "within", tolerance: 8 });
  keep("typography.heading.sizes", { op: "within", tolerance: 2 });
  keep("states.motion.durations", { op: "within", tolerance: 50 });
  for (const axis of ["controlHeights", "radii", "typeSizes", "spacingScale", "spacingBase", "fonts", "accent", "ink", "canvas"]) evidence.tokens.transfer[axis] = "keep";
  const listed = normalizeReferenceEvidence(evidence);
  assert.throws(() => proposeDecisions(listed), /needs an approved contract/u);
  const approved = { ...listed, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(listed) } };
  const proposals = proposeDecisions(approved);
  assert.deepEqual(proposals.map((entry) => [entry.axis, entry.values, entry.source]), [
    ["spacingBase", [8], "reference:ops-console#tokens.spacingBase"],
    ["spacingScale", [8, 16, 24, 32], "reference:ops-console#tokens.spacingScale"],
    ["typeSizes", [14, 16, 24], "reference:ops-console#tokens.typeSizes"],
    ["radii", [4, 8], "reference:ops-console#tokens.radii"],
    ["fonts", ["Inter"], "reference:ops-console#tokens.fonts"],
    ["controlHeights", [32, 36], "reference:ops-console#tokens.controlHeights"],
    ["tableRowHeights", [40], "reference:ops-console#density.table.rowHeight"],
    ["headingSizes", [16, 24], "reference:ops-console#typography.heading.sizes"],
    ["sectionGaps", [32], "reference:ops-console#composition.rhythm.section"],
    ["primariesPerSection", [1], "reference:ops-console#navigation.primary.perSectionMax"],
    ["transitionDurations", [150], "reference:ops-console#states.motion.durations"],
  ], "one entry per ledger axis, viewports merged; no accent, ink, or canvas");
  for (const entry of proposals) {
    assert.deepEqual(Object.keys(entry), ["kind", "axis", "values", "statement", "approvedBy", "date", "source"], "no id: the person assigns D-NNN");
    assert.deepEqual([entry.kind, entry.approvedBy, entry.date], ["decision", "reviewer-a", "2026-11-11"]);
  }
  assert.equal(proposals.find((entry) => entry.axis === "tableRowHeights").statement, "Table row heights follow the reference contract ops-console: 40px (density.table.rowHeight).");
  const ledger = normalizeDecisions(proposals.map((entry, index) => ({ id: `D-${String(index + 1).padStart(3, "0")}`, ...entry })), catalog);
  assert.equal(ledger.length, proposals.length, "every proposal validates once given an id");
  assert.deepEqual(ledger.find((entry) => entry.axis === "primariesPerSection").values, [1]);

  // Defaults only: perSectionMax is the one kept fact that maps; avoid, observe, and adapt map to nothing.
  const defaults = normalizeReferenceEvidence(clone(draft()));
  const plain = proposeDecisions({ ...defaults, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(defaults) } }, { date: "2026-11-12" });
  assert.deepEqual(plain.map((entry) => [entry.axis, entry.date]), [["primariesPerSection", "2026-11-12"]]);
});

test("the allow-list walker passes a generated evidence.json; only person-written and non-page fields are left out", () => sandbox((tmp) => {
  const root = join(tmp, "project");
  writeProject(root);
  const measurements = writeMeasurements(join(tmp, "case"));
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  explain(root);
  cli(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write"]);
  cli(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]);
  const evidence = readEvidence(root);
  const scrubbed = clone(evidence);
  // Left out by the work order: what the person writes, and the source URL.
  for (const fact of scrubbed.facts) delete fact.note;
  delete scrubbed.approval.reviewer;
  for (const source of scrubbed.sources) delete source.url;
  // Not page-derived, so not vocabulary; each is asserted on its own instead.
  assert.deepEqual(Object.keys(scrubbed.rendered), [...RENDERED_FILES]);
  for (const digest of [...Object.values(scrubbed.rendered), scrubbed.approval.contractHash]) assert.match(digest, /^sha256:[0-9a-f]{64}$/u);
  delete scrubbed.rendered;
  delete scrubbed.approval.contractHash;
  assert.deepEqual([scrubbed.slug, scrubbed.fallback, scrubbed.adapter, scrubbed.generator.tool], ["ops-console", "operations-console", "product-ui", "compile-contract.mjs"]);
  delete scrubbed.slug; delete scrubbed.fallback; delete scrubbed.adapter; delete scrubbed.generator.tool;
  assert.deepEqual(scrubbed.open.map((entry) => entry.question), Object.values(STAYS_OPEN), "the open questions are the twelve-axis draft's fixed lines");
  for (const entry of scrubbed.open) delete entry.question;
  assert.deepEqual(scrubbed.tokens.measured.fonts, measurement().summary.fonts.map((font) => font.family), "font family names, as summary.json and the drift report carry them");
  delete scrubbed.tokens.measured.fonts;
  assert.deepEqual(disallowedStrings(scrubbed), []);
  assert.deepEqual(disallowedStrings(evidence.facts.map((fact) => fact.value)), [], "every fact value passes on its own");
  for (const leak of ["Payments", "결제 대시보드", ".btn-primary", "Save changes"]) {
    const bad = clone(scrubbed);
    bad.facts[0].value = leak;
    assert.equal(disallowedStrings(bad).length, 1, `value ${leak}`);
  }
}));

test("renderRuleset prints kept and adapted token axes under their axis and nothing for avoid or observe", () => {
  const evidence = clone(draft());
  Object.assign(evidence.tokens.transfer, { radii: "keep", ink: "adapt", spacingScale: "observe", typeSizes: "avoid" });
  const ruleset = renderRuleset(normalizeReferenceEvidence(evidence));
  assert.ok(ruleset.includes("- Corner radii: 4px, 8px (token axis `radii`, kept; listed in tokens.json)."));
  assert.ok(ruleset.includes("- Ink: the reference used #090c0b; keep the relationship"));
  assert.ok(!ruleset.includes("`spacingScale`") && !ruleset.includes("`typeSizes`"));
  const surfaces = ruleset.slice(ruleset.indexOf("## 7."), ruleset.indexOf("## 8."));
  assert.ok(surfaces.includes("Corner radii"), "radii sit under surfaces");
});
