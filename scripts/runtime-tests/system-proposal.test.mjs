import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PAGE_ROWS, PROPOSAL_AXES, PROPOSAL_RULE, TOUCH_FLOOR, engineDefault, engineDefaultsTable, entryForValues, normalizeEngineDefaults, normalizeEvidencePack,
  proposeSystem, referenceValues, renderEngineDefaultsMarkdown, renderProposalMarkdown, rowStatus, selectRow,
} from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs";
import { contractHash, normalizeReferenceEvidence } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/reference-contract.mjs";
import { normalizeDecisions } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolveDir = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve");
const catalog = JSON.parse(readFileSync(resolve(resolveDir, "references/catalog.json"), "utf8"));
const committedPack = normalizeEvidencePack(JSON.parse(readFileSync(resolve(resolveDir, "references/evidence-pack.json"), "utf8")));
const defaults = normalizeEngineDefaults(JSON.parse(readFileSync(resolve(resolveDir, "references/engine-defaults.json"), "utf8")));
const proposer = resolve(resolveDir, "scripts/propose-system.mjs");
const resolver = resolve(resolveDir, "scripts/resolve-context.mjs");
const clone = (value) => JSON.parse(JSON.stringify(value));

// The wording rule of the order: none of these words, case-insensitive, whole words (`approvedBy` passes).
const BANNED = /\b(expert|approved|endorsed|validated|best practice|industry standard|proven|consensus|score|recommended by)\b/iu;

// --- synthetic packs (fictional lineages alpha, beta, gamma, kit-one) ------------------------------------------

const b = (value, lineages, productSystems, kits) => ({ value, lineages, productSystems, kits });
const prow = (claim, pageType, measured, buckets, { viewport = 1440, withFragments = null } = {}) => ({ claim, pageType, viewport, measured, buckets, withFragments });
const USES = {
  "button.height": { axis: "controlHeights", use: "value", unit: "px", label: "default button height" },
  "field.height": { axis: "controlHeights", use: "value", unit: "px", label: "default text field height" },
  "field.textSize": { axis: "typeSizes", use: "value", unit: "px", complete: false, label: "text field text size" },
  "text.bodySize": { axis: "typeSizes", use: "value", unit: "px", complete: false, label: "body text size" },
  "table.rowHeight": { axis: "tableRowHeights", use: "value", unit: "px", label: "table row height" },
  "primary.onePerSection": { axis: "primariesPerSection", use: "flag", values: [1], label: "at most one primary action per section" },
  "controls.shareHeight": { axis: "controlHeights", use: "note", label: "fields and buttons share one height" },
  "lineage.spacingBase": { axis: "spacingBase", use: "note", viewport: "both", label: "one spacing base across a system's measured screens" },
};
function makePack(rows, { touch = false, extraClaims = [] } = {}) {
  const ids = [...new Set(rows.map((row) => row.claim))];
  return normalizeEvidencePack({
    schemaVersion: 1, generatedBy: "scripts/build-evidence-pack.mjs",
    run: { id: "2026-01-02", path: "research/consensus/runs/2026-01-02", consensusVersion: 1, viewports: [[1440, 900], [390, 844]], scroll: false, touch, screens: { listed: 6, measured: 6, failed: 0, skipped: 0 } },
    lineages: [
      { id: "alpha", name: "Alpha System", kind: "product-system", screens: 3, fragments: 0 },
      { id: "beta", name: "Beta System", kind: "product-system", screens: 1, fragments: 0 },
      { id: "gamma", name: "Gamma System", kind: "product-system", screens: 0, fragments: 1 },
      { id: "kit-one", name: "Kit One", kind: "kit", screens: 2, fragments: 0 },
    ],
    claims: [...ids.filter((id) => USES[id]).map((id) => ({ id, ...USES[id] })), ...extraClaims],
    rows,
  });
}
const project = (over = {}) => ({ mode: "legacy", decisions: [], density: "compact", recipe: "enterprise-workbench", ledger: { path: ".styleseed/decisions.json", entries: 0, nextId: "D-001" }, ...over });
const propose = (pack, { page = "form", surface = "pointer", references = [], decisions = [], recipe = "enterprise-workbench", rule } = {}) => proposeSystem({ pack, defaults, project: project({ decisions, recipe }), context: { page, surface }, references, ...(rule ? { rule } : {}) });
const axisOf = (proposal, axis) => proposal.axes.find((entry) => entry.axis === axis);

test("rowStatus: agreement needs 3 systems, two thirds, and the product systems the rule asks for", () => {
  assert.deepEqual(rowStatus(prow("button.height", "form", 4, [b(32, 3, 1, 2), b(36, 1, 0, 1)])), { status: "agree", lead: b(32, 3, 1, 2) }, "3 of 4 with one product system");
  assert.equal(rowStatus(prow("button.height", "form", 3, [b(32, 3, 0, 3)])).status, "split", "3 of 3 kits");
  assert.equal(rowStatus(prow("button.height", "form", 3, [b(32, 2, 1, 1), b(36, 1, 1, 0)])).status, "split", "2 of 3");
  assert.deepEqual(rowStatus(prow("button.height", "form", 2, [b(32, 2, 1, 1)])), { status: "thin", lead: b(32, 2, 1, 1) }, "2 of 2 is thin, with a lead");
  assert.deepEqual(rowStatus(prow("button.height", "form", 4, [b(32, 2, 1, 1), b(36, 2, 1, 1)])), { status: "split", lead: null }, "a 2–2 tie has no lead");
  assert.deepEqual(rowStatus(prow("text.bodySize", "form", 5, [b("mixed", 3, 1, 2), b(14, 2, 1, 1)])), { status: "split", lead: b(14, 2, 1, 1) }, "a mixed top bucket is skipped");
  assert.equal(rowStatus(prow("text.bodySize", "form", 4, [b("mixed", 1, 1, 0), b(14, 3, 2, 1)])).status, "agree");
  assert.equal(rowStatus(prow("button.height", "form", 4, [b(32, 3, 1, 2), b(36, 1, 0, 1)]), { ...PROPOSAL_RULE, minProductSystems: 2 }).status, "split", "the second switch: 2 product systems");
  assert.deepEqual(rowStatus(null), { status: "none", lead: null });
  assert.deepEqual(rowStatus(prow("button.height", "form", 0, [])), { status: "none", lead: null });
});

test("selectRow: the page row with three systems, else pooled, else the fuller row; settings reads form; landing reads pooled", () => {
  const pack = makePack([
    prow("button.height", "form", 3, [b(32, 3, 2, 1)]),
    prow("button.height", "list", 2, [b(32, 2, 1, 1)]),
    prow("button.height", "detail", 1, [b(36, 1, 1, 0)]),
    prow("button.height", "all", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)]),
    prow("field.height", "dashboard", 2, [b(32, 2, 1, 1)]),
    prow("field.height", "all", 1, [b(36, 1, 1, 0)]),
    prow("field.height", "list", 1, [b(36, 1, 1, 0)]),
    prow("lineage.spacingBase", "all", 3, [b(false, 3, 2, 1)], { viewport: "both" }),
  ]);
  const at = (claim, page, viewport = 1440) => { const row = selectRow(pack, claim, { page, viewport }); return row && `${row.pageType}:${row.measured}`; };
  assert.equal(at("button.height", "form"), "form:3", "the page row has three systems");
  assert.equal(at("button.height", "list"), "all:4", "fallback to pooled");
  assert.equal(at("button.height", "settings"), "form:3", "settings reads form");
  assert.equal(at("button.height", "landing"), "all:4", "landing reads pooled");
  assert.equal(at("field.height", "dashboard"), "dashboard:2", "the fuller of two thin rows");
  assert.equal(at("field.height", "list"), "list:1", "a tie goes to the page's own row");
  assert.equal(at("field.height", "onboarding"), "all:1", "no page row: the pooled row that exists");
  assert.equal(at("field.height", "form"), "all:1", "no form row: the pooled row that exists");
  assert.equal(at("lineage.spacingBase", "form"), "all:3", "a \"both\" row matches a 1440 read");
  assert.equal(at("lineage.spacingBase", "form", "both"), "all:3");
  assert.equal(at("table.rowHeight", "form"), null);
  assert.deepEqual(Object.keys(PAGE_ROWS), ["dashboard", "list", "form", "settings", "detail"]);
});

test("corpus per axis: agreed values make one option; splits add lines, never values; flags; notes change nothing", () => {
  const both = propose(makePack([
    prow("field.textSize", "form", 3, [b(14, 3, 1, 2)]),
    prow("text.bodySize", "form", 3, [b(14, 3, 2, 1)]),
  ]));
  const types = axisOf(both, "typeSizes");
  assert.equal(types.corpus.status, "agree");
  assert.deepEqual(types.options.filter((o) => o.basis === "corpus").map((o) => o.values), [[14]], "two claims agreeing on one value: one option");
  assert.equal(types.options[0].entry.statement, "The text field text size and the body text size are 14px. Basis: text field text size 14px on 3 of 3 measured systems, body text size 14px on 3 of 3 measured systems (form pages, corpus run 2026-01-02).");
  assert.equal(types.options[0].entry.source, "corpus:2026-01-02#field.textSize+text.bodySize@form/1440");

  const two = axisOf(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)]), prow("field.height", "form", 3, [b(36, 3, 2, 1)])])), "controlHeights");
  assert.deepEqual(two.options[0].values, [32, 36]);
  assert.equal(two.options[0].entry.statement.split(" Basis: ")[0], "The default button height is 32px; the default text field height is 36px.", "agreeing on two values: two clauses");

  const mixed = axisOf(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)]), prow("field.height", "form", 3, [b(32, 2, 1, 1), b(36, 1, 1, 0)])])), "controlHeights");
  assert.equal(mixed.status, "proposed");
  assert.equal(mixed.corpus.lines.length, 2, "the split claim adds a line");
  assert.deepEqual(mixed.options.filter((o) => o.basis === "corpus").map((o) => o.values), [[32]], "and no value");
  assert.match(mixed.corpus.lines[1].text, /Under the proposal rule; shown as measured\./u);

  const split = axisOf(propose(makePack([prow("button.height", "form", 4, [b(32, 2, 1, 1), b(36, 1, 1, 0), b(40, 1, 1, 0)]), prow("field.height", "form", 3, [b(36, 2, 1, 1), b(32, 1, 1, 0)])])), "controlHeights");
  assert.equal(split.status, "split");
  assert.equal(split.proposed, null);
  assert.deepEqual(split.options.filter((o) => o.basis === "corpus").map((o) => [o.values, o.counts.map((c) => `${c.claim}:${c.lineages}`)]), [
    [[32], ["button.height:2", "field.height:1"]], [[36], ["button.height:1", "field.height:2"]], [[40], ["button.height:1"]],
  ], "one option per bucket: most lineages first, then the smaller value");

  const flag = axisOf(propose(makePack([prow("primary.onePerSection", "form", 4, [b(true, 4, 3, 1)])])), "primariesPerSection");
  assert.equal(flag.status, "proposed");
  assert.deepEqual(flag.options.map((o) => o.basis), ["corpus"], "no engine default for this axis");
  assert.equal(flag.options[0].entry.statement, "At most 1 primary action per section. Basis: holds on 4 of 4 measured systems (form pages, corpus run 2026-01-02).");
  const flagFalse = axisOf(propose(makePack([prow("primary.onePerSection", "form", 4, [b(false, 3, 2, 1), b(true, 1, 1, 0)])])), "primariesPerSection");
  assert.equal(flagFalse.proposed, null, "agreement on false proposes nothing");
  assert.deepEqual(flagFalse.options[0].values, [1], "the true bucket is an option");

  const rows = [prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])];
  const withNote = axisOf(propose(makePack([...rows, prow("controls.shareHeight", "form", 3, [b(false, 3, 2, 1)])])), "controlHeights");
  const without = axisOf(propose(makePack(rows)), "controlHeights");
  assert.equal(withNote.corpus.notes.length, 1);
  assert.deepEqual([withNote.status, withNote.proposed, withNote.options], [without.status, without.proposed, without.options], "a note never changes the proposal");
});

// A synthetic reference as referenceValues returns it.
const ref = (slug, values, kept = []) => ({ slug, observedAt: "2026-11-01", kept, values, factIds: Object.fromEntries(Object.keys(values).map((axis) => [axis, axis === "tableRowHeights" ? "density.table.rowHeight" : `tokens.${axis}`])), skipped: [] });

test("basis order: recorded, then kept reference, measured reference, corpus, engine default", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const recorded = { id: "D-004", kind: "decision", axis: "controlHeights", values: [36], statement: "Controls are 36px.", approvedBy: "example-designer", date: "2026-11-01" };
  const scoped = { id: "D-005", kind: "exception", to: "D-004", axis: "controlHeights", values: [28], scope: { screens: ["orders"] }, statement: "Orders filters are 28px.", approvedBy: "example-designer", date: "2026-11-01" };
  const withRecord = propose(pack, { decisions: normalizeDecisions([recorded, scoped], catalog) });
  const heights = axisOf(withRecord, "controlHeights");
  assert.equal(heights.status, "recorded");
  assert.deepEqual(heights.options, []);
  assert.deepEqual(heights.recorded, { id: "D-004", values: [36], by: "example-designer", date: "2026-11-01" });
  assert.deepEqual(heights.scoped, ["D-005"]);
  assert.equal(heights.corpus.lines.length, 1, "a recorded axis keeps its corpus lines");
  const md = renderProposalMarkdown(withRecord);
  assert.ok(md.includes("**Recorded: 36px** as D-004 (example-designer, 2026-11-01). Nothing is proposed for a recorded axis."), md);
  assert.ok(md.includes("- Scoped entries already on this axis: D-005."));
  assert.throws(() => entryForValues(withRecord, "controlHeights", [36, 40]), /controlHeights: already recorded as D-004; change that entry or record an exception/u);

  const measured = ref("ref-measured", { controlHeights: [40] });
  const kept = ref("ref-kept", { controlHeights: [36] }, ["controlHeights"]);
  const ordered = axisOf(propose(pack, { references: [measured, kept] }), "controlHeights");
  assert.deepEqual(ordered.options.map((o) => `${o.basis}:${o.slug ?? ""}:${o.values}`), ["reference:ref-kept:36", "reference:ref-measured:40", "corpus::32", "engine-default::36,40"]);
  assert.equal(ordered.proposed, 0, "a reference outranks an agreeing corpus row");
  assert.equal(ordered.status, "proposed");
  assert.equal(ordered.options[0].source, "reference:ref-kept#tokens.controlHeights");
  assert.equal(ordered.options[1].source, "measured:ref-measured#tokens.controlHeights");
  assert.equal(ordered.options[0].entry.statement, "Controls use these heights: 36px. Basis: kept in the project's reference contract ref-kept, 2026-11-01.");
  assert.equal(ordered.options[1].entry.statement, "Controls use these heights: 40px. Basis: measured on the project's reference ref-measured, 2026-11-01.");
  const refMd = renderProposalMarkdown(propose(pack, { references: [measured, kept] }));
  assert.ok(refMd.includes("**Proposed: 36px** — from the project's reference `ref-kept` (kept in its contract)."), refMd);
  assert.ok(refMd.includes("- Other options: 40px (reference `ref-measured`, measured) · 32px (3 of 4) · 36, 40px (engine default, not measured: button md 40px, input 36px, select 36px)."), refMd);
  assert.ok(refMd.includes("Entry for a chosen value") === false || !refMd.includes("--entry controlHeights="), "a proposed axis prints its entry, not the command");
  assert.ok(renderProposalMarkdown(propose(pack, { references: [measured] })).includes("— from the project's reference `ref-measured` (measured, not kept in a contract)."));

  const bare = axisOf(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)])])), "tableRowHeights");
  assert.equal(bare.status, "unmeasured");
  assert.equal(bare.proposed, null);
  assert.deepEqual(bare.options.map((o) => [o.basis, o.values, o.source]), [["engine-default", [40], "engine-default:components (not measured)"]]);
  assert.equal(bare.corpus.reason, "no-claim");
  const noClaimMd = renderProposalMarkdown(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)])])));
  assert.ok(noClaimMd.includes("## 4. Table row height (`tableRowHeights`)\n\n**No measured basis.** The corpus has no row for this axis yet."), noClaimMd);
  assert.ok(!noClaimMd.includes("Heading sizes"), "a non-core axis with no basis is left out");
  const withHeadings = propose(makePack([]), { references: [ref("ref-measured", { headingSizes: [16, 24] })] });
  assert.deepEqual(withHeadings.axes.map((a) => a.axis), ["controlHeights", "typeSizes", "radii", "tableRowHeights", "spacingBase", "headingSizes"], "a non-core axis with a reference basis gets a section");
});

test("touch: no corpus proposal, the 44px floor, the engine default above it, values under the floor marked", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 4, 3, 1)]), prow("field.textSize", "form", 3, [b(14, 3, 2, 1)]), prow("primary.onePerSection", "form", 4, [b(true, 4, 3, 1)])]);
  const proposal = propose(pack, { surface: "touch", page: "dashboard", recipe: "calm-consumer" });
  for (const axis of proposal.axes) assert.deepEqual([axis.axis, axis.corpus.status, axis.corpus.reason, axis.corpus.lines, axis.corpus.notes], [axis.axis, "not-applicable", "touch", [], []]);
  assert.ok(!proposal.axes.some((axis) => axis.options.some((o) => o.basis === "corpus")));
  const heights = axisOf(proposal, "controlHeights");
  assert.deepEqual(heights.floor, TOUCH_FLOOR);
  assert.deepEqual(heights.options.map((o) => [o.basis, o.values]), [["engine-default", [52]]], "only shipped sizes at or above 44px");
  assert.equal(heights.options[0].from, "button lg 52px; the default button 40px, input 36px and select 36px are under 44px");
  assert.ok(!proposal.axes.some((axis) => axis.axis === "primariesPerSection"), "no basis on touch: the non-core axis is left out");
  const md = renderProposalMarkdown(proposal);
  assert.ok(md.includes("- **This run holds no touch measurement, so nothing below is proposed from the corpus.**"));
  assert.ok(md.includes("**No measured basis.** The corpus has no touch measurement.\n\n- Floor: rule `CRAFT-control-heights` says \"Touch surfaces provide at least 44px targets\"."), md);
  const withRef = axisOf(propose(pack, { surface: "touch", references: [ref("ref-measured", { controlHeights: [36, 48] })] }), "controlHeights");
  assert.equal(withRef.status, "proposed", "a measured reference still proposes on touch");
  assert.deepEqual(withRef.options[0].underFloor, [36]);
  assert.ok(renderProposalMarkdown(propose(pack, { surface: "touch", references: [ref("ref-measured", { controlHeights: [36, 48] }), ref("ref-two", { controlHeights: [32] })] })).includes("32px (reference `ref-two`, measured; 32px is under the floor)"));
  assert.deepEqual(engineDefault("typeSizes", defaults, { surface: "touch" }).values, [14, 16]);
  assert.equal(engineDefault("controlHeights", { ...defaults, components: { ...defaults.components, button: { ...defaults.components.button, sizes: defaults.components.button.sizes.filter((s) => s.height < 44) } } }, { surface: "touch" }), null);
  assert.ok(catalog.rules.find((rule) => rule.id === TOUCH_FLOOR.rule).statement.includes(TOUCH_FLOOR.clause));
});

test("partial: a value that is one member of a set axis says so; a reference does not", () => {
  const pack = makePack([prow("field.textSize", "form", 3, [b(14, 3, 2, 1)])]);
  const proposal = propose(pack);
  assert.equal(axisOf(proposal, "typeSizes").partial, true);
  const md = renderProposalMarkdown(proposal);
  assert.ok(md.includes("**Proposed: 14px** — one part of this axis, not the whole set — from the corpus."));
  assert.ok(md.includes("- Before recording: this holds one value of a larger set. Add the other values the product uses with `--entry typeSizes=<all values>`; they have no measured basis here, and the entry's `source` says so."));
  const fromRef = propose(pack, { references: [ref("ref-measured", { typeSizes: [12, 14, 20] })] });
  assert.equal(axisOf(fromRef, "typeSizes").partial, false);
  assert.ok(!renderProposalMarkdown(fromRef).includes("Before recording"));
});

// A minimal generated contract that keeps spacingBase, typeSizes, and the table row height.
function contract({ approved }) {
  const evidence = normalizeReferenceEvidence({
    schemaVersion: 1, generator: { tool: "compile-contract.mjs", factsVersion: 1 }, slug: "ref-kept", fallback: "operations-console", adapter: "product-ui",
    sources: [{ id: "S1", url: "http://127.0.0.1:9/reference.html", observedAt: "2026-11-01", viewports: [1440, 390], robots: "not-checked" }],
    facts: [{ id: "density.table.rowHeight", axis: "density", level: "observed", viewport: 1440, value: 44, unit: "px", source: "S1", transfer: "keep", compare: { op: "eq" } }],
    tokens: {
      measured: { accent: "#0f766e", ink: null, canvas: null, spacingBase: 8, spacingScale: [8, 16, 24], typeSizes: [13, 15], radii: [6], fonts: ["Example Sans"], controlHeights: [36] },
      transfer: { accent: "keep", ink: "observe", canvas: "observe", spacingBase: "keep", spacingScale: "adapt", typeSizes: "keep", radii: "adapt", fonts: "keep", controlHeights: "adapt" },
    },
    open: [], approval: { status: "draft" },
  }, { catalog });
  return approved ? { ...evidence, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-02", contractHash: contractHash(evidence) } } : evidence;
}
const summary = { controlHeights: [40, 32], radii: [8, 4], typeStepDetail: [{ px: 16, share: 0.1 }, { px: 14, share: 0.7 }, { px: 14, share: 0.1 }], spacingBase: 8, spacingScale: [8, 16, 24], fonts: ["Example Sans"], accent: "#0f766e" };
const facts = {
  factsVersion: 1, url: "http://127.0.0.1:9/reference.html", observedAt: "2026-11-03", viewports: [1440, 390], scroll: true,
  facts: [
    { id: "density.table.rowHeight", axis: "density", level: "observed", value: 40, unit: "px", viewport: 1440 },
    { id: "density.table.rowHeight", axis: "density", level: "observed", value: 44, unit: "px", viewport: 390 },
    { id: "density.list.itemHeight", axis: "density", level: "observed", value: 48, unit: "px", viewport: 1440 },
    { id: "typography.heading.sizes", axis: "typography", level: "observed", value: [24, 16], unit: "px", viewport: 1440 },
    { id: "composition.rhythm.section", axis: "composition", level: "observed", value: 24, unit: "px", viewport: 1440 },
    { id: "navigation.primary.perSectionMax", axis: "navigation-action", level: "derived", value: 1, viewport: 1440 },
    { id: "navigation.primary.perSectionMax", axis: "navigation-action", level: "derived", value: 2, viewport: 390 },
    { id: "states.motion.durations", axis: "states-motion", level: "observed", value: [200, 150], unit: "ms", viewport: "both" },
    { id: "responsive.table.rowHeight", axis: "responsive", level: "derived", value: "40 -> 44", unit: "px", viewport: "both" },
  ],
};

test("referenceValues: every axis from summary and facts; an approved contract marks kept axes; never the URL", () => {
  const measured = referenceValues({ slug: "own-ref", summary, facts, evidence: null });
  assert.deepEqual(measured.values, {
    controlHeights: [32, 40], typeSizes: [14, 16], radii: [4, 8], tableRowHeights: [40, 44], spacingBase: [8], spacingScale: [8, 16, 24],
    headingSizes: [16, 24], listItemHeights: [48], sectionGaps: [24], primariesPerSection: [2], transitionDurations: [150, 200],
  });
  assert.deepEqual(measured.kept, []);
  assert.equal(measured.observedAt, "2026-11-03");
  assert.equal(measured.factIds.tableRowHeights, "density.table.rowHeight");
  assert.equal(measured.factIds.radii, "tokens.radii");
  assert.ok(!JSON.stringify(measured).includes("127.0.0.1") && !JSON.stringify(measured).includes("://"), "the reference's URL is never copied");

  const kept = referenceValues({ slug: "ref-kept", summary, facts, evidence: contract({ approved: true }) });
  assert.deepEqual(kept.kept, ["typeSizes", "tableRowHeights", "spacingBase"], "fonts and accent are not proposer axes");
  assert.deepEqual(kept.values.typeSizes, [13, 15], "a kept axis takes the contract's values");
  assert.deepEqual(kept.values.tableRowHeights, [44]);
  assert.deepEqual(kept.values.controlHeights, [32, 40], "an adapted axis keeps the measured values");
  assert.ok(!JSON.stringify(kept).includes("://"));
  const options = propose(makePack([]), { references: [kept] });
  assert.equal(axisOf(options, "typeSizes").options[0].source, "reference:ref-kept#tokens.typeSizes", "the contract's own source");
  assert.equal(axisOf(options, "tableRowHeights").options[0].source, "reference:ref-kept#density.table.rowHeight");
  assert.equal(axisOf(options, "radii").options[0].source, "measured:ref-kept#tokens.radii");

  assert.deepEqual(referenceValues({ slug: "ref-kept", summary, facts, evidence: contract({ approved: false }) }).kept, [], "a draft keeps nothing");
  const long = referenceValues({ slug: "own-ref", summary: { ...summary, spacingScale: Array.from({ length: 25 }, (_, i) => (i + 1) * 4) }, facts: null });
  assert.deepEqual(long.skipped, [{ axis: "spacingScale", count: 25 }]);
  assert.ok(!Object.hasOwn(long.values, "spacingScale"));
  assert.equal(long.observedAt, null);
  assert.deepEqual(referenceValues({ slug: "own-ref", summary: { ...summary, spacingBase: null }, facts: null }).values.spacingBase, undefined);
});

test("entryForValues: an exact option, a superset of the corpus value, values in no option, a recorded axis", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)]), prow("field.textSize", "form", 3, [b(14, 3, 2, 1)])]);
  const proposal = propose(pack, { references: [ref("own-ref", { controlHeights: [32, 44] })] });
  assert.deepEqual(entryForValues(proposal, "controlHeights", [44, 32]), axisOf(proposal, "controlHeights").options[0].entry, "values equal to an option as a set: that option's entry");
  const corpusOnly = propose(pack);
  assert.deepEqual(entryForValues(corpusOnly, "controlHeights", [32]), { kind: "decision", axis: "controlHeights", values: [32], statement: "The default button height is 32px. Basis: 32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02).", approvedBy: "", date: "", source: "corpus:2026-01-02#button.height@form/1440" });
  assert.deepEqual(entryForValues(corpusOnly, "typeSizes", [12, 14, 16]), {
    kind: "decision", axis: "typeSizes", values: [12, 14, 16],
    statement: "Text uses these sizes: 12, 14, 16px. Basis: text field text size 14px on 3 of 3 measured systems (form pages, corpus run 2026-01-02); 12, 16px chosen without a measured basis.",
    approvedBy: "", date: "", source: "corpus:2026-01-02#field.textSize@form/1440; chosen: 12, 16",
  }, "a superset of the corpus value: attributed, then chosen");
  assert.deepEqual(entryForValues(corpusOnly, "controlHeights", [32, 40]).source, "corpus:2026-01-02#button.height@form/1440; engine-default:components (not measured)", "40 is attributed to the engine default");
  assert.deepEqual(entryForValues(corpusOnly, "radii", [5, 7]), { kind: "decision", axis: "radii", values: [5, 7], statement: "Corners use these radii: 5, 7px. Basis: 5, 7px chosen without a measured basis.", approvedBy: "", date: "", source: "chosen: 5, 7" }, "values in no option");
  assert.equal(entryForValues(corpusOnly, "headingSizes", [16, 24]).statement, "Headings in the main region use these sizes: 16, 24px. Basis: 16, 24px chosen without a measured basis.", "an axis without a section");
  assert.throws(() => entryForValues(corpusOnly, "accent", [1]), /not an axis the proposer covers/u);
  assert.throws(() => entryForValues(corpusOnly, "spacingBase", [4, 8]), /exactly one positive integer/u);
  assert.throws(() => entryForValues(corpusOnly, "controlHeights", [-1]), /numbers >= 0/u);
  assert.equal(entryForValues(corpusOnly, "spacingBase", [8]).statement, "Spacing follows an 8px unit. Basis: 8px chosen without a measured basis.");
});

// Every proposal the committed pack can make: every page, both surfaces, every recipe.
function committedScenarios() {
  const out = [];
  for (const page of [...Object.keys(catalog.pages), "none"]) for (const surface of ["pointer", "touch"]) for (const recipe of Object.keys(catalog.recipes)) {
    out.push(propose(committedPack, { page, surface, recipe, references: [referenceValues({ slug: "own-ref", summary, facts }), referenceValues({ slug: "ref-kept", summary, facts, evidence: contract({ approved: true }) })] }));
    out.push(propose(committedPack, { page, surface, recipe }));
  }
  return out;
}

test("every printed entry compiles once a person names it, and never as printed; limits and fallbacks", () => {
  const scenarios = committedScenarios();
  let entries = 0;
  for (const proposal of scenarios) for (const axis of proposal.axes) for (const option of axis.options) {
    const { entry } = option;
    entries += 1;
    assert.equal(entry.approvedBy, "");
    assert.equal(entry.date, "");
    assert.ok(entry.statement.length <= 300, `${entry.statement.length}: ${entry.statement}`);
    assert.ok(entry.source.length <= 200, entry.source);
    assert.doesNotThrow(() => normalizeDecisions([{ ...entry, id: "D-001", approvedBy: "example-designer", date: "2026-11-13" }], catalog), JSON.stringify(entry));
    assert.throws(() => normalizeDecisions([{ ...entry, id: "D-001" }], catalog), /D-001\.approvedBy/u, "an empty name does not compile");
  }
  assert.ok(entries > 500, `${entries} entries checked`);
  for (const values of [[32], [12, 14, 16, 20], [5, 7], [40, 44, 48]]) {
    const entry = entryForValues(scenarios[0], values.length === 2 ? "radii" : values.length === 4 ? "typeSizes" : "controlHeights", values);
    assert.doesNotThrow(() => normalizeDecisions([{ ...entry, id: "D-002", approvedBy: "example-designer", date: "2026-11-13" }], catalog));
  }

  // Forced overflow: long labels push the statement past 300, long claim ids push the source past 200.
  const label = (n) => `default control height of a long-named role number ${n} in the toolbar`;
  const extraClaims = [1, 2, 3].map((n) => ({ id: `controls.${"h".repeat(60)}${n}`, axis: "controlHeights", use: "value", unit: "px", label: label(n) }));
  const pack = makePack([1, 2, 3].map((n) => prow(`controls.${"h".repeat(60)}${n}`, "form", 4, [b(28 + 4 * n, 4, 3, 1)])), { extraClaims });
  const option = axisOf(propose(pack), "controlHeights").options[0];
  assert.equal(option.entry.statement, `The ${label(1)} is 32px; the ${label(2)} is 36px; the ${label(3)} is 40px. Basis: see source.`);
  assert.equal(option.entry.source, "corpus:2026-01-02#controlHeights (several rows; see .styleseed/proposals/system.json)");
  assert.doesNotThrow(() => normalizeDecisions([{ ...option.entry, id: "D-001", approvedBy: "example-designer", date: "2026-11-13" }], catalog));
  // Labels so long that even "Basis: see source." overflows fall back to the axis's generic sentence.
  const huge = makePack([1, 2, 3].map((n) => prow(`controls.h${n}`, "form", 4, [b(28 + 4 * n, 4, 3, 1)])), { extraClaims: [1, 2, 3].map((n) => ({ id: `controls.h${n}`, axis: "controlHeights", use: "value", unit: "px", label: `${"x".repeat(110)}${n}` })) });
  assert.equal(axisOf(propose(huge), "controlHeights").options[0].entry.statement, "Controls use these heights: 32, 36, 40px. Basis: see source.");
  const many = entryForValues(propose(committedPack, { page: "settings" }), "typeSizes", Array.from({ length: 24 }, (_, i) => 1000 + i * 7));
  assert.ok(many.statement.length <= 300 && many.source.length <= 200, JSON.stringify(many));
});

test("determinism: same input, same bytes; axes in PROPOSAL_AXES order", () => {
  const run = () => propose(committedPack, { page: "settings", references: [referenceValues({ slug: "own-ref", summary, facts })] });
  assert.equal(JSON.stringify(run(), null, 2), JSON.stringify(run(), null, 2));
  assert.equal(renderProposalMarkdown(run()), renderProposalMarkdown(run()));
  const order = PROPOSAL_AXES.map((axis) => axis.axis);
  for (const proposal of committedScenarios().slice(0, 12)) {
    const axes = proposal.axes.map((axis) => axis.axis);
    assert.deepEqual(axes, order.filter((axis) => axes.includes(axis)));
    assert.deepEqual(axes.slice(0, 5), ["controlHeights", "typeSizes", "radii", "tableRowHeights", "spacingBase"], "core axes always");
  }
  assert.equal(renderEngineDefaultsMarkdown(engineDefaultsTable(committedPack, defaults)), renderEngineDefaultsMarkdown(engineDefaultsTable(committedPack, defaults)));
});

test("wording: no banned word in any rendered proposal, statement, or the engine-defaults table", () => {
  for (const proposal of committedScenarios()) {
    const md = renderProposalMarkdown(proposal);
    assert.ok(!BANNED.test(md), md.match(BANNED)?.[0]);
    for (const axis of proposal.axes) for (const option of axis.options) assert.ok(!BANNED.test(option.entry.statement), option.entry.statement);
  }
  const table = renderEngineDefaultsMarkdown(engineDefaultsTable(committedPack, defaults, { page: "form" }));
  assert.ok(!BANNED.test(table), table.match(BANNED)?.[0]);
  assert.ok(table.includes("| Button `md` (default) | 40px | default button height | 32px on 3 of 4; 36px on 1 | in no bucket (with form fragments: 40px on 1 of 5) |"), table);
  assert.ok(table.includes("| Table header cell | 40px | table row height (list pages) | 40px on 1 of 2; 48px on 1 | a bucket held by 1 of 2; fewer than 3 measured |"), table);
});

// --- the CLI -----------------------------------------------------------------------------------------------------

const LOCK = `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: settings
- Output grammar: operations-console
- Brand recipe: enterprise-workbench
- Density: compact
`;
const cli = (cwd, args) => spawnSync(process.execPath, [proposer, ...args], { cwd, encoding: "utf8" });
const files = (root) => { const out = []; const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else out.push(relative(root, path).split("\\").join("/")); } }; walk(root); return out.sort(); };

test("CLI: refusals exit 1 with their message; --write writes two files; --entry and --json write nothing; --engine-defaults needs no project", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-propose-"));
  const outside = mkdtempSync(join(tmpdir(), "ss-propose-outside-"));
  try {
    writeFileSync(join(root, "STYLESEED.md"), LOCK);
    mkdirSync(join(root, "src"));
    let result = cli(root, ["--project-root", "."]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pass --surface pointer \(mouse or trackpad first\) or --surface touch \(touch first\): the corpus was measured with pointer input only/u);
    result = cli(root, ["--project-root", ".", "--surface", "pointer"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.styleseed\/manifest\.json is missing: resolve first with `node <installed-ss-resolve>\/scripts\/resolve-context\.mjs --project-root \. --from-lock STYLESEED\.md --agent <agent>`/u);

    assert.equal(spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" }).status, 0);
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--reference", "nothing-here"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--reference nothing-here: neither \.styleseed\/evidence\/_reference\/nothing-here\/measurements\/summary\.json nor \.styleseed\/evidence\/_reference\/nothing-here\/measurements\/facts\.json can be read\. Measure it first: measure-reference\.mjs <url> --project-root \. --slug nothing-here/u);

    const before = files(root);
    result = cli(root, ["--project-root", ".", "--surface", "pointer"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.startsWith("# System proposal — settings page, pointer input\n"));
    assert.ok(result.stdout.includes("**Proposed: 32px** — from the corpus."));
    for (const args of [["--json"], ["--entry", "controlHeights=32"], ["--entry", "radii=2,3,4"]]) {
      result = cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(files(root), before, `${args.join(" ")} writes nothing`);
    }
    assert.equal(JSON.parse(cli(root, ["--project-root", ".", "--surface", "pointer", "--json"]).stdout).proposalVersion, 1);
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--entry", "controlHeights=32"]);
    assert.equal(JSON.parse(result.stdout).source, "corpus:2026-11-12#button.height@form/1440");
    assert.match(result.stderr, /Append it to \.styleseed\/decisions\.json as D-001/u);

    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--write"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(files(root), [...before, ".styleseed/proposals/SYSTEM.md", ".styleseed/proposals/system.json"].sort(), "exactly two files");
    assert.ok(result.stdout.includes("controlHeights: proposed 32px (corpus)\n") && result.stdout.includes("radii: no measured basis\n"), result.stdout);
    assert.equal(readFileSync(join(root, ".styleseed/proposals/SYSTEM.md"), "utf8"), cli(root, ["--project-root", ".", "--surface", "pointer"]).stdout);

    writeFileSync(join(root, ".styleseed/manifest.json"), JSON.stringify({ selection: { adapter: "slide-deck", page: "none", recipe: "expressive-brand" } }));
    result = cli(root, ["--project-root", ".", "--surface", "pointer"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /proposals cover product UI measured in CSS pixels; this artifact uses `slide-deck`/u);

    result = cli(outside, ["--engine-defaults"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.startsWith("# Engine defaults against the corpus — form page, pointer input\n"));
    assert.deepEqual(readdirSync(outside), [], "nothing written outside a project");
    assert.match(cli(outside, ["--engine-defaults", "--page", "list"]).stdout, /list page, pointer input/u);
    assert.equal(cli(outside, ["--engine-defaults", "--page", "atlas"]).status, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
  assert.ok(!existsSync(root));
});
