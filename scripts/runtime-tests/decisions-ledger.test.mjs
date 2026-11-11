import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DECISION_AXES, normalizeDecisions, normalizeProject } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";
import { decisionsFor, renderRulesSection } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/rules-in-scope.mjs";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { COLOR_AXES, SET_AXES, STRUCTURE_AXES, compareScreens, renderDriftMarkdown } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { gateFailure, loadDecisions, parseArgs } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const references = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/references");
const catalog = JSON.parse(readFileSync(resolve(references, "catalog.json"), "utf8"));
const projectSchema = JSON.parse(readFileSync(resolve(references, "project.schema.json"), "utf8"));
const resolver = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs");

// The two entries from the work order, verbatim.
const D001 = { id: "D-001", kind: "decision", axis: "controlHeights", values: [44, 36], statement: "Form controls are 36px; primary page actions are 44px.", approvedBy: "design lead", date: "2026-11-10", source: "review:batch-01#2" };
const D002 = { id: "D-002", kind: "exception", to: "D-001", rule: "CRAFT-control-heights", axis: "controlHeights", values: [32], scope: { screens: ["orders"], artifacts: ["app-orders"] }, statement: "The orders table toolbar uses 32px filter controls.", approvedBy: "bitjaru", date: "2026-11-10" };
// Five entries: one scoped to another artifact, one prose decision without an axis, one rule-only exception.
const D003 = { id: "D-003", kind: "decision", axis: "accent", values: ["#0f766e"], scope: { artifacts: ["app-billing"] }, statement: "Billing keeps the teal accent.", approvedBy: "design lead", date: "2026-11-09" };
const D004 = { id: "D-004", kind: "decision", statement: "Tables use hairline rows, never zebra stripes.", approvedBy: "design lead", date: "2026-11-08" };
const D005 = { id: "D-005", kind: "exception", rule: "CRAFT-spacing-scale", axis: "spacingScale", values: [12], scope: { screens: ["orders"] }, statement: "The orders table uses a 12px cell inset.", approvedBy: "bitjaru", date: "2026-11-10" };
const FIVE = [D005, D003, D001, D004, D002];
const clone = (value) => JSON.parse(JSON.stringify(value));

test("normalizeDecisions accepts the documented entries, normalizes values and sorts by id", () => {
  const ledger = normalizeDecisions(clone([D002, D001]), catalog);
  assert.deepEqual(ledger.map((entry) => entry.id), ["D-001", "D-002"]);
  assert.deepEqual(ledger[0].values, [36, 44], "numbers sort ascending");
  assert.deepEqual(ledger[1].scope, { artifacts: ["app-orders"], screens: ["orders"] });
  assert.equal(ledger[0].source, "review:batch-01#2");
  const colour = normalizeDecisions([{ ...clone(D003), values: ["#0f766e"] }], catalog);
  assert.deepEqual(colour[0].values, ["#0F766E"], "colours normalize to upper case");
  assert.deepEqual(normalizeDecisions([{ ...clone(D001), values: [40, 36, 40] }], catalog)[0].values, [36, 40], "numbers de-duplicate");
  assert.deepEqual(normalizeDecisions(clone(FIVE), catalog).map((entry) => entry.id), ["D-001", "D-002", "D-003", "D-004", "D-005"]);
  assert.deepEqual(normalizeDecisions([], catalog), []);
  // An older catalog without rules keeps the id without a lookup.
  assert.equal(normalizeDecisions([{ ...clone(D005), rule: "CRAFT-retired-rule" }], { grammars: {} })[0].rule, "CRAFT-retired-rule");
});

test("normalizeDecisions rejects ledgers that cannot be applied unambiguously", () => {
  const cases = [
    [[D001, { ...D002, id: "D-001" }], /D-001: duplicate decision ID/u],
    [[{ ...D001, rule: "CRAFT-not-a-rule" }], /rule CRAFT-not-a-rule is not in the current rule catalog/u],
    [[{ ...D002, to: undefined, rule: "INV-04-controls-operable" }], /D-002: exceptions cannot waive an invariant \(INV-04-controls-operable\)/u],
    [[D001, { ...D002, to: undefined, rule: undefined }], /D-002: an exception must name the default rule \(rule\) or the decision \(to\)/u],
    [[{ ...D002, to: "D-009" }], /D-002\.to: D-009 is not a decision in this ledger/u],
    [[D001, { ...D002, rule: undefined, axis: "radii", values: [32] }], /D-002\.to: D-001 decides controlHeights, not radii/u],
    [[{ ...D004, values: [4] }], /D-004\.values needs an axis/u],
    [[{ ...D003, values: ["#0F766E", "#2563EB"] }], /D-003\.values must hold exactly one #RRGGBB colour for accent/u],
    [[D001, { ...D001, id: "D-007", values: [40] }], /D-001 and D-007 both decide controlHeights/u],
    [[D001, { ...D001, id: "D-007", to: "D-001" }], /D-007\.to is only allowed on an exception/u],
    [[{ ...D001, scope: { screens: ["orders"] } }, { ...D001, id: "D-008", scope: { screens: ["orders", "billing"] } }], /D-001 and D-008 both decide controlHeights on screen orders/u],
    [[{ ...D001, axis: "spacingBase", values: [4, 8] }], /exactly one positive integer for spacingBase/u],
    [[{ ...D001, values: [-4] }], /finite numbers >= 0 for controlHeights/u],
    [[{ ...D001, values: [] }], /non-empty array of at most 24 values/u],
    [[{ ...D001, id: "D-1" }], /\.id must look like D-001/u],
    [[{ ...D001, date: "2026-02-30" }], /D-001\.date must be a calendar date/u],
    [[{ ...D001, scope: {} }], /D-001\.scope must name screens or artifacts/u],
    [[{ ...D001, scope: { screens: ["orders?state=error"] } }], /D-001\.scope\.screens must contain/u],
    [[{ ...D001, approvedBy: "x".repeat(81) }], /D-001\.approvedBy \(max 80 characters\)/u],
    [[{ ...D001, extra: true }], /contains unknown keys: extra/u],
    [Array.from({ length: 201 }, (_, index) => ({ ...D004, id: `D-${String(index).padStart(3, "0")}` })), /at most 200/u],
  ];
  for (const [ledger, expected] of cases) assert.throws(() => normalizeDecisions(clone(ledger), catalog), expected, String(expected));
  const projectCatalog = { rules: [{ id: "PD-template", kind: "project-decision" }] };
  assert.throws(() => normalizeDecisions([{ ...D005, rule: "PD-template" }], projectCatalog), /exceptions apply only to default rules \(PD-template is project-decision\)/u);
});

test("the ledger axes match the drift report axes and the project schema", () => {
  assert.deepEqual([...DECISION_AXES], [...COLOR_AXES, "spacingBase", ...SET_AXES, ...STRUCTURE_AXES], "same axes, same order: colours, spacing base, set axes, then the structure axes");
  assert.deepEqual(projectSchema.$defs.decision.properties.axis.enum, [...DECISION_AXES]);
  assert.deepEqual(Object.keys(projectSchema.$defs.decision.properties).sort(), ["approvedBy", "axis", "date", "id", "kind", "rule", "scope", "source", "statement", "to", "values"]);
  assert.equal(projectSchema.properties.decisions.maxItems, 200);
  const project = { schemaVersion: 1, projectId: "ledger", defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: null }, brand: { keyColor: "#175CD3", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" } };
  assert.equal(Object.hasOwn(normalizeProject(clone(project), catalog), "decisions"), false, "no ledger, no key");
  assert.deepEqual(normalizeProject({ ...clone(project), decisions: clone(FIVE) }, catalog).decisions.map((entry) => entry.id), ["D-001", "D-002", "D-003", "D-004", "D-005"]);
  assert.throws(() => normalizeProject({ ...clone(project), decisions: [{ ...D002, to: undefined, rule: "INV-04-controls-operable" }] }, catalog), /exceptions cannot waive an invariant/u);
});

test("the six structure axes: numeric value sets, primariesPerSection holds one integer meaning at most", () => {
  const entry = (axis, values, id = "D-030") => ({ id, kind: "decision", axis, values, statement: `Structure decision on ${axis}.`, approvedBy: "reviewer-a", date: "2026-11-11", source: `reference:ops-console#${axis}` });
  const ledger = normalizeDecisions([
    entry("tableRowHeights", [44, 40, 40], "D-030"), entry("listItemHeights", [48], "D-031"), entry("headingSizes", [24, 16, 32], "D-032"),
    entry("sectionGaps", [32, 24], "D-033"), entry("primariesPerSection", [1], "D-034"), entry("transitionDurations", [150, 200], "D-035"),
  ], catalog);
  assert.deepEqual(ledger.map((item) => [item.axis, item.values]), [
    ["tableRowHeights", [40, 44]], ["listItemHeights", [48]], ["headingSizes", [16, 24, 32]], ["sectionGaps", [24, 32]], ["primariesPerSection", [1]], ["transitionDurations", [150, 200]],
  ], "sorted and de-duplicated like the other numeric axes");
  for (const values of [[1, 2], [1.5], [-1], ["1"]]) assert.throws(() => normalizeDecisions([entry("primariesPerSection", values)], catalog), /exactly one integer >= 0 for primariesPerSection \(at most this many primary actions per section\)/u, JSON.stringify(values));
  assert.throws(() => normalizeDecisions([entry("tableRowHeights", [-4])], catalog), /finite numbers >= 0 for tableRowHeights/u);
  assert.throws(() => normalizeDecisions([entry("tableRowHeights", [40], "D-030"), entry("tableRowHeights", [44], "D-031")], catalog), /D-030 and D-031 both decide tableRowHeights/u);
  const project = { schemaVersion: 1, projectId: "ledger", defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: null }, brand: { keyColor: "#175CD3", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" } };
  assert.equal(normalizeProject({ ...clone(project), decisions: [entry("sectionGaps", [32])] }, catalog).decisions[0].axis, "sectionGaps");
  assert.ok(renderRulesSection(catalog.rules, { grammar: "operations-console", adapter: "product-ui", domain: "saas", page: "list" }, { decisions: ledger, artifactId: "app-orders" }).includes("- **D-034** (decision · primariesPerSection = 1 · approved by reviewer-a, 2026-11-11): Structure decision on primariesPerSection."));
});

test("renderRulesSection lists the decisions that apply to the artifact and annotates excepted defaults", () => {
  const ledger = normalizeDecisions(clone(FIVE), catalog);
  const selection = { grammar: "operations-console", adapter: "product-ui", domain: "saas", page: "list" };
  const plain = renderRulesSection(catalog.rules, selection);
  const section = renderRulesSection(catalog.rules, selection, { decisions: ledger, artifactId: "app-orders" });
  assert.ok(section.startsWith(plain.slice(0, plain.indexOf("## Invariants"))), "the intro paragraph is unchanged");
  assert.ok(section.includes([
    "## Project decisions",
    "",
    "Recorded in `.styleseed/project.json`. A decision outranks a default; it never outranks an invariant.",
    "",
    "- **D-001** (decision · controlHeights = 36, 44 · approved by design lead, 2026-11-10): Form controls are 36px; primary page actions are 44px.",
    "- **D-002** (exception to D-001, CRAFT-control-heights · controlHeights + 32 · screens: orders · approved by bitjaru, 2026-11-10): The orders table toolbar uses 32px filter controls.",
    "- **D-004** (decision · approved by design lead, 2026-11-08): Tables use hairline rows, never zebra stripes.",
    "- **D-005** (exception to CRAFT-spacing-scale · spacingScale + 12 · screens: orders · approved by bitjaru, 2026-11-10): The orders table uses a 12px cell inset.",
    "",
    "## Invariants",
  ].join("\n")), section);
  assert.ok(!section.includes("D-003"), "a decision scoped to another artifact is omitted");
  const line = (id) => section.split("\n").find((text) => text.startsWith(`- **${id}** (`));
  assert.ok(line("CRAFT-control-heights").endsWith(" Project exception: D-002."), line("CRAFT-control-heights"));
  assert.ok(line("CRAFT-spacing-scale").endsWith(" Project exception: D-005."), line("CRAFT-spacing-scale"));
  assert.ok(!line("INV-04-controls-operable").includes("Project exception"));
  assert.ok(!line("CRAFT-semantic-tokens").includes("Project exception"));
  // The billing artifact sees D-003 and none of the orders-only artifact entries.
  const billing = renderRulesSection(catalog.rules, selection, { decisions: ledger, artifactId: "app-billing" });
  assert.deepEqual(decisionsFor(ledger, "app-billing").map((entry) => entry.id), ["D-001", "D-003", "D-004", "D-005"]);
  assert.ok(billing.includes("- **D-003** (decision · accent = #0F766E · approved by design lead, 2026-11-09): Billing keeps the teal accent."));
  assert.ok(!billing.includes("- **D-002**"));
  // No applicable decision: byte-identical to a project without a ledger.
  assert.equal(renderRulesSection(catalog.rules, selection, { decisions: [], artifactId: "app-orders" }), plain);
  assert.equal(renderRulesSection(catalog.rules, selection, { decisions: normalizeDecisions(clone([D003]), catalog), artifactId: "app-orders" }), plain);
  assert.ok(!plain.includes("## Project decisions"));
  // Decisions still render without catalog rules.
  const rulesless = renderRulesSection([], selection, { decisions: ledger, artifactId: "app-orders" });
  assert.ok(rulesless.startsWith("# Rules in scope\n"));
  assert.ok(rulesless.includes("## Project decisions") && rulesless.includes("## Invariants\n\n- none"));
  assert.equal(renderRulesSection([], selection), "");
});

// Synthetic summaries in the shape drift-report.test.mjs uses.
const observation = (over = {}) => ({
  viewport: { width: 1440, height: 900 }, elements: 400, truncated: false,
  actions: { "bg:rgb(15, 118, 110)": 6, "bg:rgb(255, 255, 255)": 3 }, actionText: {},
  links: { "rgb(15, 118, 110)": 14, "rgb(9, 12, 11)": 20 },
  text: { "rgb(9, 12, 11)": 120, "rgb(77, 81, 80)": 40 }, headings: { "rgb(9, 12, 11)": 9 },
  surfaces: { "rgb(250, 253, 253)": 30 },
  spacing: { 8: 60, 16: 80, 24: 40, 32: 20, 48: 10 },
  type: { "14|400|20": 90, "16|400|24": 60, "24|700|32": 12 },
  radii: { 4: 30 }, controlHeights: { 36: 9, 44: 4 }, fonts: { Pretendard: 170 }, shadows: {}, borders: {},
  body: { color: "rgb(9, 12, 11)", background: "rgb(239, 245, 244)", fontFamily: "Pretendard", fontSize: 16 },
  ...over,
});
const screen = (label, over, state = null) => ({ label, url: `https://example.test/${label}`, state, summary: summarize(observation(over)) });
const screens = () => [
  screen("home"),
  screen("settings", { controlHeights: { 32: 4, 36: 9, 40: 6 } }),
  screen("orders", { controlHeights: { 32: 5, 36: 9, 44: 3 } }),
  screen("pricing"),
];

test("compareScreens: a recorded decision turns an outside value into a violation; an exception into an approval", () => {
  const decided = compareScreens(screens(), { decisions: normalizeDecisions(clone([D001]), catalog) });
  const heights = decided.axes.controlHeights;
  assert.deepEqual(heights.baseline, [36, 44], "the decided set replaces the majority set");
  assert.equal(heights.decision, "D-001");
  assert.deepEqual(heights.screens[1], { label: "settings", value: [32, 36, 40], extra: [32, 40], status: "violates", decision: "D-001" });
  assert.equal(heights.screens[2].status, "violates");
  assert.deepEqual(heights.deviating, [], "a violation is not ordinary drift");
  assert.deepEqual(decided.decisions.violations, [
    { id: "D-001", screen: "settings", axis: "controlHeights", values: [32, 40] },
    { id: "D-001", screen: "orders", axis: "controlHeights", values: [32] },
  ]);
  assert.match(decided.verdict, /3 value\(s\) violate recorded decisions: D-001 on settings \(32, 40\); D-001 on orders \(32\)\./u);

  const withException = compareScreens(screens(), { decisions: normalizeDecisions(clone([D001, D002]), catalog) });
  const orders = withException.axes.controlHeights.screens[2];
  assert.deepEqual(orders, { label: "orders", value: [32, 36, 44], extra: [], status: "excepted", decision: "D-001", exception: "D-002", excepted: [32] });
  assert.equal(withException.axes.controlHeights.screens[1].status, "violates", "the exception is scoped to orders; 32 still violates on settings");
  assert.deepEqual(withException.axes.controlHeights.screens[1].extra, [32, 40]);
  assert.deepEqual(withException.decisions.applied, ["D-001", "D-002"]);
  assert.deepEqual(withException.decisions.violations, [{ id: "D-001", screen: "settings", axis: "controlHeights", values: [32, 40] }]);
  assert.deepEqual(withException.decisions.excepted, [{ id: "D-002", screen: "orders", axis: "controlHeights", values: [32] }]);
  assert.match(withException.verdict, /2 value\(s\) violate recorded decisions: D-001 on settings \(32, 40\)\. Approved exceptions used: D-002 on orders\./u);

  const md = renderDriftMarkdown(withException);
  assert.ok(md.includes("| control heights | 36, 44 (decided D-001) | 36, 44 | 32, 36, 40 (violates D-001: 32, 40) | 32, 36, 44 (approved D-002: 32) | 36, 44 |"), md);
  assert.ok(md.includes("`violates D-…` (outside a recorded project decision), `approved D-…` (covered by an approved exception)."), md);
  assert.ok(md.includes("## Recorded decisions\n\nFrom the project's decisions ledger."), md);
  assert.ok(md.includes("- D-001 · decision · control heights = 36, 44 · whole project\n- D-002 · exception to D-001, CRAFT-control-heights · control heights + 32 · screens: orders · artifacts: app-orders"), md);
});

test("compareScreens: colour and spacing-base decisions, near shades, scoped decisions, and state variants", () => {
  const ledger = normalizeDecisions([
    { id: "D-010", kind: "decision", axis: "accent", values: ["#0F766E"], statement: "The accent is teal.", approvedBy: "design lead", date: "2026-11-10" },
    { id: "D-011", kind: "exception", to: "D-010", axis: "accent", values: ["#2563EB"], scope: { screens: ["pricing"] }, statement: "Pricing uses the partner blue.", approvedBy: "design lead", date: "2026-11-10" },
    { id: "D-012", kind: "decision", axis: "spacingBase", values: [4], scope: { screens: ["settings"] }, statement: "Settings is a dense 4px grid.", approvedBy: "design lead", date: "2026-11-10" },
    { id: "D-013", kind: "decision", axis: "radii", values: [4], scope: { artifacts: ["app-other"] }, statement: "Only the other artifact decides radii.", approvedBy: "design lead", date: "2026-11-10" },
  ], catalog);
  const blue = { actions: { "bg:rgb(37, 99, 235)": 6 }, links: { "rgb(37, 99, 235)": 3 } };
  const report = compareScreens([
    screen("home", { actions: { "bg:rgb(20, 122, 114)": 6 } }),
    screen("settings", blue),
    screen("pricing", blue),
    screen("billing", { radii: { 4: 30, 10: 20 } }),
    screen("billing?state=error", { ...blue, spacing: { 4: 50, 12: 30 } }, "error"),
  ], { decisions: ledger });
  const accent = report.axes.accent.screens;
  assert.equal(accent[0].status, "near", "near still applies within nearDistance of the decided colour");
  assert.deepEqual(accent[1], { label: "settings", value: "#2563eb", status: "violates", decision: "D-010" });
  assert.deepEqual(accent[2], { label: "pricing", value: "#2563eb", status: "excepted", decision: "D-010", exception: "D-011" });
  assert.equal(accent[4].status, "violates", "a state variant's accent is measured against the decision too");
  assert.equal(report.axes.spacingBase.screens[1].status, "violates", "settings is measured against its scoped 4px decision");
  assert.equal(report.axes.spacingBase.screens[1].decision, "D-012");
  assert.equal(report.axes.spacingBase.screens[0].status, "same", "other screens keep the majority base");
  assert.equal(report.axes.radii.screens[3].status, "extra", "an artifact-only decision names no screen and is not applied");
  assert.deepEqual(report.axes.radii.deviating, ["billing"]);
  assert.deepEqual(report.screensWithDrift, [], "violations and approvals are not drift");
  assert.deepEqual(report.decisions.applied, ["D-010", "D-011", "D-012"]);
  assert.deepEqual(report.decisions.violations.map((v) => `${v.id}:${v.screen}:${v.axis}`), ["D-010:settings:accent", "D-010:billing?state=error:accent", "D-012:settings:spacingBase"], "the accent counts state variants, as accent drift does");
  assert.equal(report.baseline.source, "majority across screens; recorded project decisions for accent");
  const md = renderDriftMarkdown(report);
  assert.ok(md.includes("| accent | #0f766e (decided D-010) | #147a72 (near) | #2563eb (violates D-010) | #2563eb (approved D-011) | #0f766e | #2563eb (violates D-010) |"), md);
  assert.ok(md.includes("| spacing base | 8 | 8 | 8 (violates D-012) |"), md);
  assert.ok(gateFailure(report).includes("D-010 on settings (accent #2563eb)"));
});

test("compareScreens without decisions is unchanged and the gate passes on approved exceptions alone", () => {
  const base = compareScreens(screens());
  assert.deepEqual(compareScreens(screens(), { decisions: [] }), base);
  assert.equal(Object.hasOwn(base, "decisions"), false);
  assert.deepEqual(base.axes.controlHeights.deviating, ["settings"]);
  assert.equal(renderDriftMarkdown(compareScreens(screens(), { decisions: [] })), renderDriftMarkdown(base));
  assert.ok(!renderDriftMarkdown(base).includes("violates"));
  assert.equal(gateFailure(base), null, "set-axis extras alone do not fail the gate");
  const approved = compareScreens(screens(), { decisions: normalizeDecisions([
    { ...clone(D001), values: [32, 36, 44] },
    { id: "D-002", kind: "exception", to: "D-001", axis: "controlHeights", values: [40], scope: { screens: ["settings"] }, statement: "Settings keeps a 40px search field.", approvedBy: "bitjaru", date: "2026-11-10" },
  ], catalog) });
  assert.deepEqual(approved.decisions.violations, []);
  assert.equal(approved.axes.controlHeights.screens[1].status, "excepted");
  assert.equal(gateFailure(approved), null);
  const violated = compareScreens(screens(), { decisions: normalizeDecisions(clone([D001]), catalog) });
  assert.equal(gateFailure(violated), "drift gate: FAIL — decision violations: D-001 on settings (controlHeights 32, 40); D-001 on orders (controlHeights 32)");
});

// A registry project like resolver-tokens.test.mjs builds, with two artifacts.
function writeRegistry(root, decisions) {
  mkdirSync(join(root, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, ".styleseed/project.json"), `${JSON.stringify({
    schemaVersion: 1, projectId: "ledger-project",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Pretendard"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" },
    ...(decisions === undefined ? {} : { decisions }),
  }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-orders", config: "app-orders.json" }, { id: "app-billing", config: "app-billing.json" }] }, null, 2)}\n`);
  for (const [id, locator, page] of [["app-orders", "/orders", "list"], ["app-billing", "/billing", "settings"]]) {
    writeFileSync(join(root, `.styleseed/artifacts/${id}.json`), `${JSON.stringify({
      schemaVersion: 1, id, target: { kind: "route", locator },
      selection: { grammar: "operations-console", adapter: null, domain: null, page, recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: "Which order needs action?", primaryAction: "Open order", signatureMove: "Keep the table stable." },
      implementation: { sourceRoots: ["src"], tokenFiles: [] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    }, null, 2)}\n`);
  }
}
const resolve_ = (root, args = []) => spawnSync(process.execPath, [resolver, "--project-root", root, "--all", ...args], { encoding: "utf8" });

test("resolver round trip: decisions compile into the bundle, --check tracks them, invariant exceptions fail", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-ledger-"));
  const bare = mkdtempSync(join(tmpdir(), "ss-ledger-bare-"));
  try {
    writeRegistry(bare);
    assert.equal(resolve_(bare).status, 0);
    writeRegistry(root, clone(FIVE));
    const compiled = resolve_(root);
    assert.equal(compiled.status, 0, compiled.stderr);
    const orders = readFileSync(join(root, ".styleseed/bundles/app-orders.md"), "utf8");
    assert.match(orders, /## Project decisions\n\nRecorded in `\.styleseed\/project\.json`\./u);
    for (const id of ["D-001", "D-002", "D-004", "D-005"]) assert.ok(orders.includes(`- **${id}** (`), id);
    assert.ok(!orders.includes("- **D-003** ("));
    assert.match(orders, /- \*\*CRAFT-control-heights\*\* .* Project exception: D-002\./u);
    const billing = readFileSync(join(root, ".styleseed/bundles/app-billing.md"), "utf8");
    assert.ok(billing.includes("- **D-003** (decision · accent = #0F766E"));
    assert.ok(!billing.includes("Project exception: D-002"));
    // Without a ledger the same project compiles to the same bundle as before the ledger existed.
    const bareOrders = readFileSync(join(bare, ".styleseed/bundles/app-orders.md"), "utf8");
    assert.ok(!bareOrders.includes("## Project decisions"));
    assert.equal(orders.replace(/## Project decisions\n[\s\S]*?\n\n## Invariants/u, "## Invariants").replace(/ Project exceptions?: [D0-9, -]+\./gu, ""), bareOrders);
    assert.equal(resolve_(root, ["--check"]).status, 0);

    // Editing one decision's values reaches the bundle and therefore the method hash.
    const before = JSON.parse(readFileSync(join(root, ".styleseed/manifests/app-orders.json"), "utf8")).methodHash;
    writeRegistry(root, clone(FIVE).map((entry) => (entry.id === "D-001" ? { ...entry, values: [36, 48] } : entry)));
    const drifted = resolve_(root, ["--check"]);
    assert.equal(drifted.status, 2);
    assert.match(drifted.stderr, /methodHash mismatch/u);
    assert.equal(resolve_(root).status, 0);
    const after = JSON.parse(readFileSync(join(root, ".styleseed/manifests/app-orders.json"), "utf8")).methodHash;
    assert.notEqual(after, before);
    assert.ok(readFileSync(join(root, ".styleseed/bundles/app-orders.md"), "utf8").includes("controlHeights = 36, 48"));

    // An exception cannot waive an invariant; the resolve fails and names the entry and the rule.
    writeRegistry(root, [clone(D001), { ...clone(D002), to: undefined, rule: "INV-04-controls-operable" }]);
    const refused = resolve_(root);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /D-002: exceptions cannot waive an invariant \(INV-04-controls-operable\)/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(bare, { recursive: true, force: true });
  }
});

test("drift CLI: --decisions loads and validates a file; --project-root reads the registry ledger and appends the file", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-ledger-drift-"));
  try {
    assert.equal(parseArgs(["https://a.test/", "--out", "o", "--decisions", "ledger.json"]).decisions, "ledger.json");
    assert.throws(() => parseArgs(["https://a.test/", "--out", "o", "--decisions"]), /--decisions needs a JSON file path/u);
    const file = join(root, "ledger.json");
    writeFileSync(file, JSON.stringify([D002, D001]));
    assert.deepEqual(loadDecisions({ decisions: file }).map((entry) => entry.id), ["D-001", "D-002"]);
    writeFileSync(file, JSON.stringify([{ ...D003, values: ["#0F766E", "#2563EB"] }]));
    assert.throws(() => loadDecisions({ decisions: file }), /ledger\.json D-003\.values must hold exactly one #RRGGBB colour/u);

    const project = join(root, "project");
    writeRegistry(project, [clone(D001)]);
    assert.deepEqual(loadDecisions({ projectRoot: project }).map((entry) => entry.id), ["D-001"]);
    writeFileSync(file, JSON.stringify([D002]));
    assert.deepEqual(loadDecisions({ projectRoot: project, decisions: file }).map((entry) => entry.id), ["D-001", "D-002"], "the file is appended to the registry ledger");
    writeFileSync(file, JSON.stringify([{ ...D001, values: [40] }]));
    assert.throws(() => loadDecisions({ projectRoot: project, decisions: file }), /D-001: duplicate decision ID/u);

    writeRegistry(project, [{ ...clone(D002), to: undefined, rule: "INV-04-controls-operable" }]);
    assert.throws(() => loadDecisions({ projectRoot: project }), /exceptions cannot waive an invariant .*while reading the \.styleseed registry/u, "a registry that fails to load is an error, not a fallback");
    rmSync(join(project, ".styleseed/artifacts/index.json"));
    assert.throws(() => loadDecisions({ projectRoot: project }), /Incomplete \.styleseed registry/u);
    assert.deepEqual(loadDecisions({ projectRoot: join(root, "no-registry") }), [], "no registry, no ledger");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
