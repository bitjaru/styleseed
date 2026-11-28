import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PAGE_ROWS, PROPOSAL_AXES, PROPOSAL_RULE, TOUCH_FLOOR, cornerEntry, defaultHeightEntry, defaultHeightEntryFor, engineDefault, engineDefaultsTable, entryForValues, normalizeEngineDefaults, normalizeEvidencePack, normalizeInventory,
  normalizeMeasuredSystems, ownScreens, proposePick, proposeSystem, referenceValues, renderEngineDefaultsMarkdown, renderPickMarkdown, renderProposalMarkdown, rowStatus, selectRow,
} from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs";
import { systemLine } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/propose-system.mjs";
import { contractHash, normalizeReferenceEvidence } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/reference-contract.mjs";
import { defaultHeightSource, normalizeDecisions, parseDefaultHeight } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { DOMINANT_SHARE, INVENTORY_TOOL, INVENTORY_VERSION, systemInventory } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/system-inventory.mjs";

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
  // A synthetic note read from a row measured at both widths (viewport "both"): row selection and wording.
  "synthetic.bothWidths": { axis: "radii", use: "note", viewport: "both", label: "a synthetic note read at both widths" },
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
const propose = (pack, { page = "form", surface = "pointer", references = [], own = null, decisions = [], recipe = "enterprise-workbench", rule } = {}) => proposeSystem({ pack, defaults, project: project({ decisions, recipe }), context: { page, surface }, references, own, ...(rule ? { rule } : {}) });
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
    prow("synthetic.bothWidths", "all", 3, [b(false, 3, 2, 1)], { viewport: "both" }),
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
  assert.equal(at("synthetic.bothWidths", "form"), "all:3", "a \"both\" row matches a 1440 read");
  assert.equal(at("synthetic.bothWidths", "form", "both"), "all:3");
  const both = axisOf(propose(pack), "radii");
  assert.deepEqual(both.corpus.notes.map((note) => note.text), ["A synthetic note read at both widths: no on 3 of 3 measured systems (2 product systems, 1 kit). All page types pooled, 1440 and 390 wide."], "a note claim with viewport both reads its \"both\" row");
  assert.deepEqual(both.options.map((option) => option.basis), ["engine-default"], "a note proposes nothing");
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
  assert.deepEqual(ordered.options.map((o) => `${o.basis}:${o.slug ?? ""}:${o.values}`), ["reference:ref-kept:36", "reference:ref-measured:40", "corpus::32", "engine-default::24,28,32,36,40,48"]);
  assert.equal(ordered.proposed, 0, "a reference outranks an agreeing corpus row");
  assert.equal(ordered.status, "proposed");
  assert.equal(ordered.options[0].source, "reference:ref-kept#tokens.controlHeights");
  assert.equal(ordered.options[1].source, "measured:ref-measured#tokens.controlHeights");
  assert.equal(ordered.options[0].entry.statement, "Controls use these heights: 36px. Basis: kept in the project's reference contract ref-kept, 2026-11-01.");
  assert.equal(ordered.options[1].entry.statement, "Controls use these heights: 40px. Basis: measured on the project's reference ref-measured, 2026-11-01.");
  const refMd = renderProposalMarkdown(propose(pack, { references: [measured, kept] }));
  assert.ok(refMd.includes("**Proposed: 36px** — from the project's reference `ref-kept` (kept in its contract)."), refMd);
  assert.ok(refMd.includes("- Other options: 40px (reference `ref-measured`, measured) · 32px (3 of 4) · 24, 28, 32, 36, 40, 48px (engine default, not measured: brand recipe enterprise-workbench: default controls 36px; the components of this StyleSeed version draw 24, 28, 32, 36, 40, 48px)."), refMd);
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

test("touch: no corpus proposal, the 44px floor, the engine default is the recipe's family, values under the floor marked", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 4, 3, 1)]), prow("field.textSize", "form", 3, [b(14, 3, 2, 1)]), prow("primary.onePerSection", "form", 4, [b(true, 4, 3, 1)])]);
  const proposal = propose(pack, { surface: "touch", page: "dashboard", recipe: "calm-consumer" });
  for (const axis of proposal.axes) assert.deepEqual([axis.axis, axis.corpus.status, axis.corpus.reason, axis.corpus.lines, axis.corpus.notes], [axis.axis, "not-applicable", "touch", [], []]);
  assert.ok(!proposal.axes.some((axis) => axis.options.some((o) => o.basis === "corpus")));
  const heights = axisOf(proposal, "controlHeights");
  assert.deepEqual(heights.floor, TOUCH_FLOOR);
  assert.deepEqual(heights.options.map((o) => [o.basis, o.values]), [["engine-default", [28, 32, 36, 40, 44, 52]]], "the family calm-consumer's components draw, not only the sizes at or above 44px (WO-17 B4)");
  assert.equal(heights.options[0].from, "brand recipe calm-consumer: default controls 40px; the components of this StyleSeed version draw 28, 32, 36, 40, 44, 52px", "nothing about the floor in the basis");
  assert.deepEqual(heights.options[0].underFloor, [28, 32, 36, 40], "the block marks the values under the floor");
  assert.ok(!proposal.axes.some((axis) => axis.axis === "primariesPerSection"), "no basis on touch: the non-core axis is left out");
  const md = renderProposalMarkdown(proposal);
  assert.ok(md.includes("- **This run holds no touch measurement, so nothing below is proposed from the corpus.**"));
  assert.ok(md.includes("**No measured basis.** The corpus has no touch measurement.\n\n- Floor: rule `CRAFT-control-heights` says \"Touch surfaces provide at least 44px targets\"."), md);
  assert.ok(md.includes("- Options: 28, 32, 36, 40, 44, 52px (engine default, not measured: brand recipe calm-consumer: default controls 40px; the components of this StyleSeed version draw 28, 32, 36, 40, 44, 52px; 28, 32, 36, 40px are under the floor)."), md);
  const withRef = axisOf(propose(pack, { surface: "touch", references: [ref("ref-measured", { controlHeights: [36, 48] })] }), "controlHeights");
  assert.equal(withRef.status, "proposed", "a measured reference still proposes on touch");
  assert.deepEqual(withRef.options[0].underFloor, [36]);
  assert.ok(renderProposalMarkdown(propose(pack, { surface: "touch", references: [ref("ref-measured", { controlHeights: [36, 48] }), ref("ref-two", { controlHeights: [32] })] })).includes("32px (reference `ref-two`, measured; 32px is under the floor)"));
  assert.deepEqual(engineDefault("typeSizes", defaults, { surface: "touch" }).values, [14, 16]);
  const short = { ...defaults, components: { ...defaults.components, button: { ...defaults.components.button, sizes: defaults.components.button.sizes.filter((s) => s.height < 44) } } };
  assert.deepEqual(engineDefault("controlHeights", short, { recipe: "enterprise-workbench", surface: "touch" }).values, [24, 28, 32, 36, 40, 48], "never null on touch: the family the recipe draws, read from the recipe and the offsets, not from the component rows");
  assert.ok(catalog.rules.find((rule) => rule.id === TOUCH_FLOOR.rule).statement.includes(TOUCH_FLOOR.clause));
});

test("engine default for control heights: the family the recipe's components draw, on both surfaces (WO-17 B4)", () => {
  const values = (recipe, surface = "pointer") => engineDefault("controlHeights", defaults, { recipe, surface }).values;
  assert.deepEqual(values("enterprise-workbench"), [24, 28, 32, 36, 40, 48]);
  assert.deepEqual(values("developer-platform"), [24, 28, 32, 36, 40, 48]);
  assert.deepEqual(values(null), [28, 32, 36, 40, 44, 52], "no recipe: the :root block's family, because that is what the CSS draws");
  assert.deepEqual(values("unknown-recipe"), [28, 32, 36, 40, 44, 52], "a recipe the file does not have: the :root family");
  assert.deepEqual(values("native-mobile", "touch"), [32, 36, 40, 44, 48, 56]);
  assert.deepEqual(values("calm-consumer", "touch"), [28, 32, 36, 40, 44, 52], "the 40 family on touch, not null");
  assert.deepEqual(engineDefault("controlHeights", defaults, { recipe: "enterprise-workbench" }), { id: "recipe.enterprise-workbench", values: [24, 28, 32, 36, 40, 48], from: "brand recipe enterprise-workbench: default controls 36px; the components of this StyleSeed version draw 24, 28, 32, 36, 40, 48px" });
  assert.equal(engineDefault("controlHeights", defaults, {}).id, "recipe.default");
  assert.equal(engineDefault("radii", defaults, {}), null, "the radii axis still returns null without a recipe; the difference is intended");
  for (const recipe of [...Object.keys(defaults.recipes), null]) assert.deepEqual(values(recipe, "touch"), values(recipe, "pointer"), `${recipe}: the same family on touch`);
});

test("the engine-default control-height statement of every recipe on both surfaces stays within the ledger's 300 characters (WO-17 B4)", () => {
  const pack = makePack([]);
  for (const recipe of [...Object.keys(catalog.recipes), ...Object.keys(defaults.recipes), null, "unknown-recipe"]) for (const surface of ["pointer", "touch"]) {
    const option = axisOf(propose(pack, { surface, recipe }), "controlHeights").options.find((o) => o.basis === "engine-default");
    assert.ok(option, `${recipe}/${surface}: an engine-default option`);
    assert.ok(option.entry.statement.length <= 300, `${recipe}/${surface}: ${option.entry.statement.length}`);
    assert.ok(!option.entry.statement.includes("Basis: see source."), `${recipe}/${surface}: the statement carries its basis: ${option.entry.statement}`);
    assert.match(option.entry.statement, /^Controls use these heights: [\d, ]+px\. Basis: engine default, not measured \(brand recipe [a-z-]+: default controls \d+px; the components of this StyleSeed version draw [\d, ]+px\)\.$/u);
  }
});

test("engine defaults: version 1 is refused with the rebuild hint, version 2 needs controlHeight and every recipe's control height; the pack still reads only 1", () => {
  const raw = JSON.parse(readFileSync(resolve(resolveDir, "references/engine-defaults.json"), "utf8"));
  const file = { file: "ss-resolve/references/engine-defaults.json" };
  assert.equal(raw.schemaVersion, 2);
  assert.throws(() => normalizeEngineDefaults({ ...raw, schemaVersion: 1 }, file), /^Error: ss-resolve\/references\/engine-defaults\.json: schemaVersion: is 1, older than this proposer reads \(2\); rebuild with `node scripts\/build-evidence-pack\.mjs`, or reinstall the skill$/u);
  assert.throws(() => normalizeEngineDefaults({ ...raw, schemaVersion: 3 }, file), /schemaVersion: is 3, newer than this proposer reads \(2\)/u);
  const { controlHeight, ...withoutKey } = raw;
  assert.throws(() => normalizeEngineDefaults(withoutKey), /defaults: missing controlHeight/u);
  const bad = (over, pattern) => assert.throws(() => normalizeEngineDefaults({ ...raw, controlHeight: { ...controlHeight, ...over } }), pattern);
  bad({ variable: "--ss-height" }, /controlHeight\.variable: must be "--ss-control-height"/u);
  bad({ offsets: [] }, /controlHeight\.offsets: must be a non-empty array/u);
  bad({ offsets: [-4, 4] }, /controlHeight\.offsets: must contain 0/u);
  bad({ offsets: [0, -4] }, /controlHeight\.offsets: must be distinct whole numbers in ascending order/u);
  bad({ offsets: [0, 0, 4] }, /must be distinct whole numbers in ascending order/u);
  bad({ offsets: [0, 4.5] }, /must be distinct whole numbers in ascending order/u);
  const recipe = (value) => ({ ...raw, recipes: { ...raw.recipes, "enterprise-workbench": { ...raw.recipes["enterprise-workbench"], controlHeight: value } } });
  assert.throws(() => normalizeEngineDefaults(recipe(null)), /recipes\.enterprise-workbench\.controlHeight: must be a positive number/u);
  assert.throws(() => normalizeEngineDefaults(recipe(0)), /recipes\.enterprise-workbench\.controlHeight: must be a positive number/u);
  const { controlHeight: _, ...recipeWithout } = raw.recipes["native-mobile"];
  assert.throws(() => normalizeEngineDefaults({ ...raw, recipes: { ...raw.recipes, "native-mobile": recipeWithout } }), /recipes\.native-mobile: missing controlHeight/u);
  const { default: _root, ...withoutRoot } = raw.recipes;
  assert.throws(() => normalizeEngineDefaults({ ...raw, recipes: withoutRoot }), /recipes: must hold `default`/u);
  assert.deepEqual(normalizeEngineDefaults(raw), raw, "the committed file passes unchanged");
  const pack = JSON.parse(readFileSync(resolve(resolveDir, "references/evidence-pack.json"), "utf8"));
  assert.equal(normalizeEvidencePack(pack).schemaVersion, 1);
  assert.throws(() => normalizeEvidencePack({ ...pack, schemaVersion: 2 }), /schemaVersion: is 2, newer than this proposer reads \(1\)/u);
});

test("engine-defaults table: one row for the default control height after the component rows, by recipe (WO-17 B4)", () => {
  const table = engineDefaultsTable(committedPack, defaults, { page: "form" });
  const at = table.rows.findIndex((row) => row.item === "Default control height");
  assert.equal(table.rows[at - 1].item, "Table text", "after the component rows");
  assert.equal(table.rows[at + 1].item, "Control, inset, and surface radius");
  assert.deepEqual(table.rows[at], { item: "Default control height", value: "by brand recipe, 36 to 44px (36px: enterprise-workbench, developer-platform · 40px: default, calm-consumer, commerce-operator, public-service, creative-professional, editorial-authority, expressive-brand · 44px: native-mobile)", claim: null, label: "none", row: "—", where: "compared per component above" });
  const md = renderEngineDefaultsMarkdown(table);
  assert.ok(md.includes("| Input | 40px | default text field height |"), "component rows at the :root value");
  assert.ok(md.includes("| Select `sm` | 36px | same |"), md);
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
  assert.equal(referenceValues({ slug: "own-ref", summary: { ...summary, spacingBase: 0 }, facts: null }).values.spacingBase, undefined, "a spacing unit is a positive integer, as the ledger requires");
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
  assert.deepEqual(entryForValues(corpusOnly, "controlHeights", [32, 40]).source, "corpus:2026-01-02#button.height@form/1440; engine-default:recipe.enterprise-workbench (not measured)", "40 is attributed to the engine default, the recipe's family");
  assert.deepEqual(entryForValues(corpusOnly, "radii", [5, 7]), { kind: "decision", axis: "radii", values: [5, 7], statement: "Corners use these radii: 5, 7px. Basis: 5, 7px chosen without a measured basis.", approvedBy: "", date: "", source: "chosen: 5, 7" }, "values in no option");
  assert.equal(entryForValues(corpusOnly, "headingSizes", [16, 24]).statement, "Headings in the main region use these sizes: 16, 24px. Basis: 16, 24px chosen without a measured basis.", "an axis without a section");
  assert.throws(() => entryForValues(corpusOnly, "accent", [1]), /not an axis the proposer covers/u);
  assert.throws(() => entryForValues(corpusOnly, "spacingBase", [4, 8]), /exactly one positive integer/u);
  assert.throws(() => entryForValues(corpusOnly, "controlHeights", [-1]), /numbers >= 0/u);
  assert.equal(entryForValues(corpusOnly, "spacingBase", [8]).statement, "Spacing follows an 8px unit. Basis: 8px chosen without a measured basis.");
});

// The two corner axes (WO-20 A): recorded, never proposed; --entry prints one chosen value.
const corner = (id, axis, value) => ({ id, kind: "decision", axis, values: [value], statement: `Recorded ${axis}.`, approvedBy: "example-designer", date: "2026-11-25" });

test("corner entries: the exact statements and sources of one chosen value; one value from 0 to 200 or 999", () => {
  const proposal = propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)])]));
  const cases = [
    ["controlRadius", 8, "Buttons and the other controls that share their corner use an 8px corner. Basis: 8px chosen without a measured basis.", "chosen: 8"],
    ["controlRadius", 999, "Buttons and the other controls that share their corner are pills. Basis: pill corners chosen without a measured basis.", "chosen: 999"],
    ["controlRadius", 0, "Buttons and the other controls that share their corner have square corners. Basis: square corners chosen without a measured basis.", "chosen: 0"],
    ["fieldRadius", 8, "Inputs, selects, and textareas use an 8px corner. Basis: 8px chosen without a measured basis.", "chosen: 8"],
  ];
  for (const [axis, value, statement, source] of cases) {
    const entry = entryForValues(proposal, axis, [value]);
    assert.deepEqual(entry, { kind: "decision", axis, values: [value], statement, approvedBy: "", date: "", source }, `${axis}=${value}`);
    assert.ok(!BANNED.test(entry.statement), entry.statement.match(BANNED)?.[0]);
    assert.doesNotThrow(() => normalizeDecisions([{ ...entry, id: "D-001", approvedBy: "example-designer", date: "2026-11-25" }], catalog), JSON.stringify(entry));
    assert.throws(() => normalizeDecisions([{ ...entry, id: "D-001" }], catalog), /D-001\.approvedBy/u, "an empty name does not compile");
  }
  assert.equal(entryForValues(proposal, "fieldRadius", [999]).statement, "Inputs, selects, and textareas are pills. Basis: pill corners chosen without a measured basis.");
  assert.equal(entryForValues(proposal, "fieldRadius", [0]).statement, "Inputs, selects, and textareas have square corners. Basis: square corners chosen without a measured basis.");
  assert.equal(entryForValues(proposal, "controlRadius", [4]).statement, "Buttons and the other controls that share their corner use a 4px corner. Basis: 4px chosen without a measured basis.");
  assert.equal(entryForValues(proposal, "controlRadius", [200]).source, "chosen: 200");
  for (const values of [[8, 12], [250], [201], [1000], [8.5], [-1]]) {
    assert.throws(() => entryForValues(proposal, "controlRadius", values), /--entry controlRadius: give exactly one whole number from 0 to 200, or 999 for a pill \(the control corner in px, for example --entry controlRadius=8\)/u, JSON.stringify(values));
  }
  assert.throws(() => entryForValues(proposal, "fieldRadius", [8, 12]), /--entry fieldRadius: give exactly one whole number from 0 to 200, or 999 for a pill \(the field corner in px/u);
  assert.throws(() => entryForValues(proposal, "accent", [1]), /not an axis the proposer covers \(controlHeights, typeSizes, radii, tableRowHeights, spacingBase, spacingScale, headingSizes, listItemHeights, sectionGaps, primariesPerSection, transitionDurations, controlRadius, fieldRadius\)/u);
  assert.ok(!proposal.axes.some((a) => a.axis === "controlRadius" || a.axis === "fieldRadius"), "no block for a corner");
});

test("the radii block's engine default carries the recorded corners; without them it is unchanged", () => {
  const pack = makePack([]);
  const today = { id: "recipe.enterprise-workbench", values: [2, 3, 4], from: "brand recipe enterprise-workbench: control 3px, inset 2px, surface 4px" };
  assert.deepEqual(engineDefault("radii", defaults, { recipe: "enterprise-workbench" }), today);
  assert.deepEqual(engineDefault("radii", defaults, { recipe: "enterprise-workbench", corners: {} }), today);
  const both = { controlRadius: { id: "D-001", value: 999 }, fieldRadius: { id: "D-002", value: 8 } };
  assert.deepEqual(engineDefault("radii", defaults, { recipe: "enterprise-workbench", corners: both }), { id: "recipe.enterprise-workbench", values: [2, 4, 8, 999], from: "brand recipe enterprise-workbench: inset 2px, surface 4px; recorded control corner 999px (D-001) in place of the recipe's 3px; recorded field corner 8px (D-002)" });
  assert.deepEqual(engineDefault("radii", defaults, { recipe: "public-service", corners: { fieldRadius: { id: "D-002", value: 0 } } }), { id: "recipe.public-service", values: [0], from: "brand recipe public-service: control 0px, inset 0px, surface 0px; recorded field corner 0px (D-002)" });
  assert.equal(engineDefault("radii", defaults, { corners: both }), null, "no recipe: still null");

  // A project without a recorded corner: the block's option, byte for byte.
  const bare = axisOf(propose(pack), "radii");
  assert.deepEqual(bare.options, [{
    basis: "engine-default", values: [2, 3, 4], from: today.from, source: "engine-default:recipe.enterprise-workbench (not measured)",
    entry: { kind: "decision", axis: "radii", values: [2, 3, 4], statement: "Corners use these radii: 2, 3, 4px. Basis: engine default, not measured (brand recipe enterprise-workbench: control 3px, inset 2px, surface 4px).", approvedBy: "", date: "", source: "engine-default:recipe.enterprise-workbench (not measured)" },
  }]);
  assert.equal(JSON.stringify(axisOf(propose(pack, { decisions: normalizeDecisions([corner("D-001", "spacingBase", 8)], catalog) }), "radii")), JSON.stringify(bare), "another axis recorded: the same bytes");

  // With both corners recorded: the option holds them and its entry passes the ledger beside them.
  const corners = [corner("D-001", "controlRadius", 999), corner("D-002", "fieldRadius", 8)];
  const block = axisOf(propose(pack, { decisions: normalizeDecisions(clone(corners), catalog) }), "radii");
  assert.equal(block.status, "unmeasured");
  assert.deepEqual(block.options[0].values, [2, 4, 8, 999]);
  assert.equal(block.options[0].entry.statement, "Corners use these radii: 2, 4, 8, 999px. Basis: engine default, not measured (brand recipe enterprise-workbench: inset 2px, surface 4px; recorded control corner 999px (D-001) in place of the recipe's 3px; recorded field corner 8px (D-002)).");
  assert.ok(!BANNED.test(block.options[0].entry.statement));
  assert.doesNotThrow(() => normalizeDecisions([...clone(corners), { ...block.options[0].entry, id: "D-003", approvedBy: "example-designer", date: "2026-11-25" }], catalog));
  assert.ok(renderProposalMarkdown(propose(pack, { decisions: normalizeDecisions(clone(corners), catalog) })).includes("- Options: 2, 4, 8, 999px (engine default, not measured: brand recipe enterprise-workbench: inset 2px, surface 4px; recorded control corner 999px (D-001) in place of the recipe's 3px; recorded field corner 8px (D-002))."));
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
    assert.equal(JSON.parse(cli(root, ["--project-root", ".", "--surface", "pointer", "--json"]).stdout).proposalVersion, 2);
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

test("CLI --entry on a corner: prints one value, refuses a recorded corner with its id, names a radii decision that lacks the value", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-propose-corner-"));
  try {
    writeFileSync(join(root, "STYLESEED.md"), LOCK);
    mkdirSync(join(root, "src"));
    assert.equal(spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" }).status, 0);
    const entry = (arg) => cli(root, ["--project-root", ".", "--surface", "pointer", "--entry", arg]);
    const ledger = (entries) => writeFileSync(join(root, ".styleseed/decisions.json"), `${JSON.stringify(entries, null, 2)}\n`);
    let result = entry("controlRadius=8");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { kind: "decision", axis: "controlRadius", values: [8], statement: "Buttons and the other controls that share their corner use an 8px corner. Basis: 8px chosen without a measured basis.", approvedBy: "", date: "", source: "chosen: 8" });
    assert.ok(!result.stderr.includes("radii"), result.stderr);
    for (const arg of ["controlRadius=8,12", "controlRadius=250", "fieldRadius=8.5"]) {
      result = entry(arg);
      assert.equal(result.status, 1, arg);
      assert.match(result.stderr, /give exactly one whole number from 0 to 200, or 999 for a pill/u, arg);
    }

    ledger([corner("D-001", "controlRadius", 8)]);
    result = entry("controlRadius=12");
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "--entry controlRadius: the control corner is already recorded as D-001; change that entry\n");
    assert.equal(result.stdout, "", "nothing printed");
    result = entry("fieldRadius=4");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Append it to \.styleseed\/decisions\.json as D-002/u);

    ledger([{ ...corner("D-001", "radii", 2), values: [2, 3, 4] }]);
    result = entry("fieldRadius=8");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "chosen: 8");
    assert.ok(result.stderr.includes("radii decision D-001 does not hold 8; add 8 to its values when you append this entry, or the next resolve refuses the ledger.\n"), result.stderr);
    result = entry("fieldRadius=4");
    assert.ok(!result.stderr.includes("does not hold"), "the radii decision holds 4");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- the product's own screens (Part B) ---------------------------------------------------------------------------

// The wording rule of B2 for the own-screens bullets: none of these, case-insensitive, whole words.
const OWN_BANNED = /\b(too many|should|inconsistent|messy|wrong|fix|clean|normally)\b/iu;
const OWN_PATH = ".styleseed/evidence/drift/2026-11-14/inventory.json";
const ownObservation = ({ heights = {}, fields = {}, buttons = {}, radii = {}, type = {}, spacing = { 8: 40, 16: 30 }, box = true } = {}) => ({
  viewport: { width: 1440, height: 900 }, controlHeights: heights, radii, type, spacing, actions: {}, links: {}, text: {}, surfaces: {}, body: {},
  ...(box ? { controlHeightsByKind: { field: fields, button: buttons }, controlBoxVersion: 1 } : {}),
});
// inventory.json as drift-report.mjs --inventory writes it, for synthetic screens (one observation each).
const inventoryFile = (list) => clone({ tool: INVENTORY_TOOL, version: INVENTORY_VERSION, ...systemInventory(list.map(([label, o]) => ({ label, observations: [o], summary: summarize([o]) })), { observedAt: "2026-11-14" }) });
const THREE_SCREENS = [
  ["home", ownObservation({ heights: { 32: 30, 40: 4, 28: 2 }, fields: { 32: 20 }, buttons: { 32: 10, 40: 4, 28: 2 }, radii: { 4: 40, 8: 6, 2: 3 }, type: { "14|400|20": 50, "24|700|32": 3, "12|400|16": 6 } })],
  ["orders", ownObservation({ heights: { 32: 20, 36: 6, 30: 2 }, fields: { 32: 10, 36: 6 }, buttons: { 32: 10, 30: 2 }, radii: { 4: 30, 10: 5 }, type: { "14|400|20": 40, "13|400|20": 10, "20|600|28": 2 }, spacing: { 8: 40, 12: 20 } })],
  ["billing", ownObservation({ heights: { 32: 12, 44: 3 }, fields: { 32: 8 }, buttons: { 32: 4, 44: 3 }, radii: { 4: 20, 8: 4 }, type: { "14|400|20": 30, "12|400|16": 5, "24|700|32": 2 }, spacing: { 4: 20, 12: 20 } })],
];
const ownOf = (file = inventoryFile(THREE_SCREENS)) => ownScreens({ path: OWN_PATH, inventory: normalizeInventory(file) });
const ownBullets = (md) => md.split("\n").filter((line) => line.startsWith("- This product") || line.includes("Values in use that would then read") || line.includes("No value in use on these screens"));

test("own screens: the option sits after the references and before the corpus, and makes the axis proposed", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const own = ownOf();
  assert.deepEqual(own.values, { controlHeights: [32], radii: [4], typeSizes: [12, 14, 24], spacingBase: [8] }, "dominant, dominant, shared, majority");
  const alone = propose(pack, { own });
  for (const axis of ["controlHeights", "radii", "typeSizes", "spacingBase"]) {
    const block = axisOf(alone, axis);
    assert.equal(block.options[0].basis, "own-screens", axis);
    assert.equal(block.status, "proposed", axis);
    assert.equal(block.proposed, 0, axis);
    assert.equal(block.partial, false, axis);
  }
  assert.equal(axisOf(alone, "tableRowHeights").own, null, "the inventory covers four axes");
  assert.equal(alone.inputs.own, OWN_PATH);
  const heights = axisOf(alone, "controlHeights");
  assert.deepEqual(heights.options.map((o) => o.basis), ["own-screens", "corpus", "engine-default"], "own screens outrank an agreeing corpus row");
  assert.equal(heights.options[0].source, "own-screens:2026-11-14#controlHeights");
  assert.equal(heights.options[0].entry.statement, "Controls use these heights: 32px. Basis: measured on 3 screens of this product, 2026-11-14.");
  const withRef = axisOf(propose(pack, { own, references: [ref("ref-measured", { controlHeights: [36, 40] }), ref("ref-kept", { controlHeights: [36] }, ["controlHeights"])] }), "controlHeights");
  assert.deepEqual(withRef.options.map((o) => `${o.basis}:${o.values}`), ["reference:36", "reference:36,40", "own-screens:32", "corpus:32", "engine-default:24,28,32,36,40,48"], "kept reference, measured reference, own screens, corpus, engine default");
  assert.equal(withRef.proposed, 0);
  const md = renderProposalMarkdown(propose(pack, { own }));
  assert.ok(md.includes("## 1. Control height (`controlHeights`)\n\n**Proposed: 32px** — from this product's own screens.\n\n- This product (3 screens measured 2026-11-14):"), md);
  assert.ok(md.includes("- Other options: 32px (3 of 4) · 24, 28, 32, 36, 40, 48px (engine default, not measured: brand recipe enterprise-workbench: default controls 36px; the components of this StyleSeed version draw 24, 28, 32, 36, 40, 48px)."), md);
  assert.ok(md.includes("Entry for a chosen value: `propose-system.mjs --project-root . --own .styleseed/evidence/drift/2026-11-14/inventory.json --surface pointer --entry tableRowHeights=<values>`"), "the --entry command carries --own");
  assert.ok(renderProposalMarkdown(propose(pack, { own, references: [ref("ref-measured", { controlHeights: [36, 40] })] })).includes("- Other options: 32px (this product's own screens) · 32px (3 of 4)"), "listed as an option under a reference");
  assert.throws(() => propose(pack, { own: { values: {} } }), /pass the ownScreens result/u);
});

test("own screens: the product's line before the corpus lines, and the values that would then read as violations", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const proposal = propose(pack, { own: ownOf() });
  const md = renderProposalMarkdown(proposal);
  const heights = [
    "- This product (3 screens measured 2026-11-14): 6 control heights in use; 32px on 78% of 79 controls; 5 more under 10% each (28, 30, 36, 40, 44px). Fields: 32px on 86% of 44 fields, 36px on 14%. Buttons: 32px on 69% of 35 buttons, 40px on 11%; 3 more under 10% each (28, 30, 44px). The own-screens option takes the control heights on at least 10% of the controls, and at least the most frequent one.",
    "- Default button height: 32px on 3 of 4 measured systems",
  ].join("\n");
  assert.ok(md.includes(heights), `the product's line, then the corpus line unchanged\n${md}`);
  assert.ok(md.includes("- If recorded: the drift report reads any other control height as `violates D-…`. Add the other sizes the product uses to `values` first, or record an exception later. Values in use that would then read as violations: 36px (6 controls, 1 screen), 40px (4, 1), 44px (3, 1), 28px (2, 1), 30px (2, 1)."), md);
  assert.ok(md.includes("- This product (3 screens measured 2026-11-14): 5 type sizes in use; 14px on 81% of 148 text elements; 4 more under 10% each (12, 13, 20, 24px). The own-screens option takes the sizes on at least half of the screens, as the drift report counts them: 12, 14, 24px. A size used on few elements can be a real heading, so the share of elements does not decide here."), md);
  assert.ok(md.includes("Values in use that would then read as violations: 13px (10 text elements, 1 screen), 20px (2, 1)."), md);
  assert.ok(md.includes("- This product (3 screens measured 2026-11-14): 4 radii in use; 4px on 83% of 108 boxes with a visible edge; 3 more under 10% each (2, 8, 10px). The own-screens option takes the radii on at least 10% of the boxes with a visible edge, and at least the most frequent one."), md);
  assert.ok(md.includes("Values in use that would then read as violations: 8px (10 boxes with a visible edge, 2 screens), 10px (5, 1), 2px (3, 1)."), md);
  assert.ok(md.includes("- This product (3 screens measured 2026-11-14): spacing base 8px on 2 of 3 screens; 4px on 1. The own-screens option takes the base on the most screens, as the drift report reads it."), md);
  assert.ok(md.includes("reads a screen whose measured spacing base differs as `violates D-…`. Values in use that would then read as violations: 4px (1 screen)."), md);
  assert.ok(md.includes(`${pctOf(DOMINANT_SHARE)} of the controls`), "the proposer states the inventory's dominant share");
  // Recording the consolidated set leaves nothing to flag.
  const all = axisOf(propose(pack, { own: ownOf(), references: [ref("own-all", { controlHeights: [28, 30, 32, 36, 40, 44] })] }), "controlHeights");
  assert.equal(all.own.violationsText, "No value in use on these screens would then read as a violation.");
  // At most eight values, then "and N more"; a value the drift row does not list is left out.
  const many = Object.fromEntries([[32, 40], ...[20, 22, 24, 26, 28, 30, 34, 36, 38, 42, 44, 46].map((v) => [v, 2])]);
  const wide = axisOf(propose(pack, { own: ownOf(inventoryFile([["wide", ownObservation({ heights: { ...many, 50: 1 }, buttons: { ...many, 50: 1 }, radii: { 4: 1 } })]])) }), "controlHeights");
  assert.equal(wide.own.violations.length, 12, "50px holds 1 of 65 controls, under the drift row's 3% cut");
  assert.equal(wide.own.violationsText, "Values in use that would then read as violations: 20px (2 controls, 1 screen), 22px (2, 1), 24px (2, 1), 26px (2, 1), 28px (2, 1), 30px (2, 1), 34px (2, 1), 36px (2, 1) and 4 more.");
  // A recorded axis keeps the product's line and prints no violation list.
  const recorded = { id: "D-001", kind: "decision", axis: "radii", values: [4, 8], statement: "Corners use 4 and 8px.", approvedBy: "example-designer", date: "2026-11-14" };
  const withRecord = axisOf(propose(pack, { own: ownOf(), decisions: normalizeDecisions([recorded], catalog) }), "radii");
  assert.equal(withRecord.status, "recorded");
  assert.match(withRecord.own.text, /^This product \(3 screens measured 2026-11-14\): 4 radii in use/u);
  assert.equal(withRecord.own.violations, null);
});

const pctOf = (share) => `${Math.round(share * 100)}%`;

test("own screens: the older control-height reading gives no option; empty sets give none", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const older = inventoryFile([["home", ownObservation({ heights: { 36: 10 }, radii: { 4: 3 }, type: { "14|400|20": 10 }, box: false })]]);
  assert.equal(older.axes.controlHeights.controlBoxVersion, null);
  const own = ownOf(older);
  assert.equal(own.values.controlHeights, undefined);
  const heights = axisOf(propose(pack, { own }), "controlHeights");
  assert.deepEqual(heights.options.map((o) => o.basis), ["corpus", "engine-default"], "no own-screens option from the older reading");
  assert.match(heights.own.text, /these control heights were read from the input element, the older reading without the visible control box, so they give no option here/u);
  assert.equal(heights.own.violations, null);
  assert.deepEqual(axisOf(propose(pack, { own }), "radii").options[0].values, [4], "the other axes still have their option");
  const split = inventoryFile([["a", ownObservation({ type: { "14|400|20": 10 }, radii: { 4: 1 }, heights: { 32: 1 } })], ["b", ownObservation({ type: { "15|400|20": 10 }, radii: { 4: 1 }, heights: { 32: 1 } })], ["c", ownObservation({ type: { "16|400|20": 10 }, radii: { 4: 1 }, heights: { 32: 1 } })]]);
  assert.deepEqual(split.axes.typeSizes.shared, [], "no size on two of three screens");
  const types = axisOf(propose(pack, { own: ownOf(split) }), "typeSizes");
  assert.ok(!types.options.some((o) => o.basis === "own-screens"));
  assert.ok(types.own.text.startsWith("This product (3 screens measured 2026-11-14): 3 type sizes in use;"), types.own.text);
});

test("own screens: entries, attribution with --entry, the wording rules, and inventory refusals", () => {
  const scenarios = [];
  for (const page of [...Object.keys(catalog.pages), "none"]) for (const surface of ["pointer", "touch"]) {
    scenarios.push(propose(committedPack, { page, surface, own: ownOf() }));
    scenarios.push(propose(committedPack, { page, surface, own: ownOf(inventoryFile([["home", ownObservation({ heights: { 36: 10 }, radii: { 4: 3 }, box: false })]])), references: [referenceValues({ slug: "own-ref", summary, facts })] }));
  }
  let ownEntries = 0;
  for (const proposal of scenarios) {
    const md = renderProposalMarkdown(proposal);
    assert.ok(!BANNED.test(md), md.match(BANNED)?.[0]);
    for (const line of ownBullets(md)) assert.ok(!OWN_BANNED.test(line), `${line.match(OWN_BANNED)?.[0]}: ${line}`);
    for (const axis of proposal.axes) {
      if (axis.own) assert.ok(!OWN_BANNED.test(`${axis.own.text} ${axis.own.violationsText ?? ""}`), axis.own.text);
      for (const option of axis.options) {
        const { entry } = option;
        if (option.basis === "own-screens") ownEntries += 1;
        assert.ok(entry.statement.length <= 300 && entry.source.length <= 200, JSON.stringify(entry));
        assert.ok(!BANNED.test(entry.statement), entry.statement);
        assert.doesNotThrow(() => normalizeDecisions([{ ...entry, id: "D-001", approvedBy: "example-designer", date: "2026-11-14" }], catalog), JSON.stringify(entry));
        assert.throws(() => normalizeDecisions([{ ...entry, id: "D-001" }], catalog), /D-001\.approvedBy/u);
      }
    }
  }
  assert.ok(ownEntries >= 40, `${ownEntries} own-screens entries checked`);
  const proposal = propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]), { own: ownOf() });
  assert.deepEqual(entryForValues(proposal, "controlHeights", [32]), axisOf(proposal, "controlHeights").options[0].entry, "the own-screens option's own entry");
  const consolidated = entryForValues(proposal, "controlHeights", [32, 40, 44]);
  // With enterprise-workbench the attributed basis runs past 300 characters, so the statement points at the source.
  assert.deepEqual(consolidated, {
    kind: "decision", axis: "controlHeights", values: [32, 40, 44],
    statement: "Controls use these heights: 32, 40, 44px. Basis: see source.",
    approvedBy: "", date: "", source: "own-screens:2026-11-14#controlHeights; engine-default:recipe.enterprise-workbench (not measured); chosen: 44",
  });
  assert.doesNotThrow(() => normalizeDecisions([{ ...consolidated, id: "D-001", approvedBy: "example-designer", date: "2026-11-14" }], catalog));
  const noRecipe = proposeSystem({ pack: makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]), defaults, project: project({ recipe: null }), context: { page: "form", surface: "pointer" }, own: ownOf() });
  assert.deepEqual(entryForValues(noRecipe, "controlHeights", [32, 40, 44]), {
    kind: "decision", axis: "controlHeights", values: [32, 40, 44],
    statement: "Controls use these heights: 32, 40, 44px. Basis: 32px measured on 3 screens of this product, 2026-11-14; 40, 44px engine default, not measured (brand recipe default: default controls 40px; the components of this StyleSeed version draw 28, 32, 36, 40, 44, 52px).",
    approvedBy: "", date: "", source: "own-screens:2026-11-14#controlHeights; engine-default:recipe.default (not measured)",
  }, "without a recipe, 44 is in the :root family: attributed to own screens and the engine default");
  assert.equal(JSON.stringify(propose(committedPack, { page: "settings", own: ownOf() })), JSON.stringify(propose(committedPack, { page: "settings", own: ownOf() })), "same input, same bytes");

  const good = inventoryFile(THREE_SCREENS);
  assert.deepEqual(normalizeInventory(clone(good)), good, "a written inventory round-trips");
  const refuse = (mutate, pattern) => { const bad = clone(good); mutate(bad); assert.throws(() => normalizeInventory(bad, { file: OWN_PATH }), pattern); };
  refuse((x) => { x.tool = "styleseed drift-report"; }, /inventory\.json: tool: must be "styleseed system-inventory"; count the screens again with `drift-report\.mjs <url>… --out <dir> --inventory`/u);
  refuse((x) => { x.version = "2"; }, /version: is "2"; this proposer reads version "1"/u);
  refuse((x) => { x.url = "https://example.test/"; }, /inventory: unknown key\(s\) url/u);
  refuse((x) => { delete x.axes.radii; }, /axes: missing radii/u);
  refuse((x) => { x.axes.radii.values[0].count = 0; }, /axes\.radii\.values\[0\]\.count: must be a positive count/u);
  refuse((x) => { x.axes.radii.total += 1; }, /axes\.radii: values must add up to total and distinct/u);
  refuse((x) => { x.axes.controlHeights.controlBoxVersion = "1"; }, /controlBoxVersion: must be a version number or null/u);
  refuse((x) => { x.axes.typeSizes.values[0].screens = 4; }, /must be a count of at most 3 screens/u);
  refuse((x) => { x.observedAt = "16 Nov"; }, /observedAt: must be the measurement date/u);
});

test("CLI --own: reads the inventory by its project path, carries it into --entry, refuses a missing or outside file", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-propose-own-"));
  try {
    writeFileSync(join(root, "STYLESEED.md"), LOCK);
    assert.equal(spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" }).status, 0);
    mkdirSync(join(root, ".styleseed/evidence/drift/2026-11-14"), { recursive: true });
    writeFileSync(join(root, OWN_PATH), `${JSON.stringify(inventoryFile(THREE_SCREENS), null, 2)}\n`);
    const before = files(root);
    let result = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", `./${OWN_PATH}`]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes("**Proposed: 32px** — from this product's own screens."), result.stdout);
    assert.ok(result.stdout.includes(`\`propose-system.mjs --project-root . --own ${OWN_PATH} --surface pointer --entry tableRowHeights=<values>\``), "a leading ./ is dropped");
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", OWN_PATH, "--entry", "controlHeights=32,40"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "own-screens:2026-11-14#controlHeights; engine-default:recipe.enterprise-workbench (not measured)");
    assert.equal(JSON.parse(cli(root, ["--project-root", ".", "--surface", "pointer", "--own", OWN_PATH, "--json"]).stdout).inputs.own, OWN_PATH);
    assert.deepEqual(files(root), before, "nothing written without --write");
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", OWN_PATH, "--write"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes("controlHeights: proposed 32px (own screens)\n"), result.stdout);
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", ".styleseed/evidence/drift/none/inventory.json"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--own \.styleseed\/evidence\/drift\/none\/inventory\.json: the file does not exist\. Count the screens first: drift-report\.mjs <url>… --out <dir> --project-root \. --inventory, then pass --own <dir>\/inventory\.json/u);
    result = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", "../inventory.json"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--own \.\.\/inventory\.json: .*; pass the path of inventory\.json relative to --project-root/u);
    writeFileSync(join(root, "broken.json"), "{");
    assert.match(cli(root, ["--project-root", ".", "--surface", "pointer", "--own", "broken.json"]).stderr, /--own broken\.json: not valid JSON/u);
    assert.equal(cli(root, ["--engine-defaults", "--own", OWN_PATH]).status, 1, "--engine-defaults takes no --own");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- a default control height (WO-20 C2) ---------------------------------------------------------------------------

const familyOf = (height) => defaults.controlHeight.offsets.map((offset) => height + offset);
const FAMILY = (height) => `at that default the shipped components of this StyleSeed version draw ${familyOf(height).join(", ")}px`;
const heightEntry = (proposal, height, options) => defaultHeightEntry(proposal, defaults, height, options);
const namedAs = (entry, id) => ({ ...entry, id, approvedBy: "example-designer", date: "2026-11-26" });
// Every printed height entry: the family, the ledger's limits, the wording rule, compiles once named and never as
// printed, and the token reads back the height.
function checkHeightEntry(entry, height) {
  assert.deepEqual(entry.values, familyOf(height), "the height and every offset the shipped components draw");
  assert.equal(entry.approvedBy, "");
  assert.equal(entry.date, "");
  assert.ok(entry.statement.length <= 300, `${entry.statement.length}: ${entry.statement}`);
  assert.ok(entry.source.length <= 200, entry.source);
  assert.ok(!BANNED.test(entry.statement), entry.statement.match(BANNED)?.[0]);
  assert.doesNotThrow(() => normalizeDecisions([namedAs(entry, "D-001")], catalog), JSON.stringify(entry));
  assert.throws(() => normalizeDecisions([{ ...entry, id: "D-001" }], catalog), /D-001\.approvedBy/u, "an empty name does not compile");
  assert.equal(parseDefaultHeight(entry)?.height, height, entry.source);
}
const heightException = { id: "D-002", kind: "exception", to: "D-001", axis: "controlHeights", values: [30], scope: { screens: ["orders"] }, statement: "Orders filters are 30px.", approvedBy: "example-designer", date: "2026-11-26" };

test("default-height token: the writer and the parser hold one grammar (WO-20 C2)", () => {
  assert.equal(defaultHeightSource(32, "chosen: 32"), "default-height:32; chosen: 32");
  for (const height of [0, -4, 32.5, "32", Number.NaN, 2 ** 53]) assert.throws(() => defaultHeightSource(height, "chosen: 32"), /give a whole number of px, at least 1/u, String(height));
  for (const rest of ["", "two\nlines", 5, null, undefined]) assert.throws(() => defaultHeightSource(32, rest), /say where the height comes from in one line of text after the token/u, JSON.stringify(rest));
  const family = [24, 28, 32, 36, 40, 48];
  const read = (source, values = family) => parseDefaultHeight({ source, values });
  assert.deepEqual(read("default-height:36; engine-default:recipe.enterprise-workbench (not measured)"), { height: 36, lookDefault: true }, "the look's own default");
  assert.deepEqual(read("default-height:40; engine-default:recipe.default (not measured)", [28, 32, 36, 40, 44, 52]), { height: 40, lookDefault: true }, "no recipe: the :root height");
  for (const rest of ["corpus:2026-11-12#button.height@form/1440", "reference:ref-kept#tokens.controlHeights", "measured:ref-measured#tokens.controlHeights", "own-screens:2026-11-14#controlHeights", "chosen: 32", "system:example-system@2026-11-16#button.height", "engine-default:components (not measured)", "corpus:2026-11-12#controlHeights (several rows; see .styleseed/proposals/system.json)"]) {
    assert.deepEqual(read(`default-height:32; ${rest}`), { height: 32, lookDefault: false }, `a height taken from elsewhere: ${rest}`);
  }
  for (const source of [
    "corpus:2026-11-12#button.height@form/1440", "default-height:032; chosen: 32", "default-height:0; chosen: 0", "default-height:32;chosen: 32", "default-height:32; ",
    "default-height: 32; chosen: 32", "Default-height:32; chosen: 32", " default-height:32; chosen: 32", "default-height:32.5; chosen: 32", "default-height:32; two\nlines",
    "default-height:30; chosen: 30",
  ]) assert.equal(read(source), null, JSON.stringify(source));
  assert.equal(parseDefaultHeight({ values: family }), null, "no source");
  assert.equal(parseDefaultHeight({ source: "default-height:32; chosen: 32" }), null, "no values");
  assert.equal(parseDefaultHeight(null), null);
  assert.equal(parseDefaultHeight({ source: "default-height:99999999999999999999; chosen", values: [1e20] }), null, "not a safe whole number");
  for (const [height, rest] of [[32, "chosen: 32"], [13, "x"], [1000, "measured:m#tokens.controlHeights"]]) assert.equal(parseDefaultHeight({ source: defaultHeightSource(height, rest), values: [height] }).height, height, "what the writer writes, the parser reads");
});

test("--default-height entry for each basis: exact statement and source; the token reads back (WO-20 C2)", () => {
  const agree = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const split = makePack([prow("button.height", "form", 4, [b(32, 2, 1, 1), b(36, 1, 1, 0), b(40, 1, 1, 0)])]);
  const kept = ref("ref-kept", { controlHeights: [36] }, ["controlHeights"]);
  assert.deepEqual(heightEntry(propose(agree), 32).entry, {
    kind: "decision", axis: "controlHeights", values: [20, 24, 28, 32, 36, 44],
    statement: "Default controls are 32px tall; at that default the shipped components of this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: 32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02).",
    approvedBy: "", date: "", source: "default-height:32; corpus:2026-01-02#button.height@form/1440",
  });
  const cases = [
    ["a corpus row that agrees", propose(agree), 32, "32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02)", "corpus:2026-01-02#button.height@form/1440", false],
    ["a split row is no basis: chosen", propose(split), 32, "chosen; brand recipe enterprise-workbench draws 36px by default", "chosen: 32", false],
    ["M8: a kept reference [36] at the recipe's own height; the person's measurement is the basis", propose(agree, { references: [kept] }), 36, "kept in the project's reference contract ref-kept, 2026-11-01", "reference:ref-kept#tokens.controlHeights", false],
    ["a measured reference", propose(agree, { references: [ref("ref-measured", { controlHeights: [32, 40] })] }), 40, "measured on the project's reference ref-measured, 2026-11-01", "measured:ref-measured#tokens.controlHeights", false],
    ["own screens", propose(agree, { own: ownOf() }), 32, "measured on 3 screens of this product, 2026-11-14", "own-screens:2026-11-14#controlHeights", false],
    ["the recipe's own height", propose(agree), 36, "engine default of brand recipe enterprise-workbench, not measured", "engine-default:recipe.enterprise-workbench (not measured)", true],
    ["no recipe, the :root height", propose(agree, { recipe: null }), 40, "engine default, not measured", "engine-default:recipe.default (not measured)", true],
    ["no recipe, another height", propose(agree, { recipe: null }), 36, "chosen; the shipped components draw 40px by default", "chosen: 36", false],
    ["a recipe the file does not have reads as none", propose(agree, { recipe: "unknown-recipe" }), 36, "chosen; the shipped components draw 40px by default", "chosen: 36", false],
    ["M5: a kept reference [36] stands first and the corpus row agrees on 32", propose(agree, { references: [kept] }), 32, "32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02)", "corpus:2026-01-02#button.height@form/1440", false],
  ];
  for (const [label, proposal, height, basis, source, lookDefault] of cases) {
    const { entry, underFloor } = heightEntry(proposal, height);
    assert.equal(entry.statement, `Default controls are ${height}px tall; ${FAMILY(height)}. Basis: ${basis}.`, label);
    assert.equal(entry.source, `default-height:${height}; ${source}`, label);
    assert.deepEqual(parseDefaultHeight(entry), { height, lookDefault }, label);
    assert.deepEqual(underFloor, [], `${label}: no floor on pointer`);
    checkHeightEntry(entry, height);
  }
});

test("--default-height fitting: two claims on one row keep the full form, a page row and the pooled row take the shortened one, three claims see source (WO-20 C2, N5)", () => {
  const select = { id: "select.height", axis: "controlHeights", use: "value", unit: "px", label: "default select trigger height" };
  const sameRow = heightEntry(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "form", 4, [b(32, 3, 2, 1)])])), 32).entry;
  assert.equal(sameRow.statement, "Default controls are 32px tall; at that default the shipped components of this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: default button height 32px on 3 of 4 measured systems, default text field height 32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02).");
  assert.equal(sameRow.statement.length, 284);
  assert.equal(sameRow.source, "default-height:32; corpus:2026-01-02#button.height+field.height@form/1440");
  // The field's form row has two systems, so its claim is read from the pooled row; the full form would be 310.
  const twoRows = heightEntry(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "form", 2, [b(32, 2, 1, 1)]), prow("field.height", "all", 4, [b(32, 3, 2, 1)])])), 32).entry;
  assert.equal(twoRows.statement, "Default controls are 32px tall (at that default, shipped sizes 20 to 44px). Basis: default button height 32px on 3 of 4 measured systems, default text field height 32px on 3 of 4 measured systems (form pages and all page types pooled, corpus run 2026-01-02).");
  assert.equal(twoRows.statement.length, 258);
  assert.equal(twoRows.source, "default-height:32; corpus:2026-01-02#button.height+field.height@form/1440,all/1440");
  const three = heightEntry(propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "all", 4, [b(32, 3, 2, 1)]), prow("select.height", "all", 4, [b(32, 3, 2, 1)])], { extraClaims: [select] })), 32).entry;
  assert.equal(three.statement, "Default controls are 32px tall (at that default, shipped sizes 20 to 44px). Basis: see source.");
  assert.equal(three.source, "default-height:32; corpus:2026-01-02#button.height+field.height+select.height@form/1440,all/1440", "the token is kept");
  // A source over 200 characters takes the fallback and keeps the token.
  const extraClaims = [1, 2, 3].map((n) => ({ id: `controls.${"h".repeat(60)}${n}`, axis: "controlHeights", use: "value", unit: "px", label: `toolbar control ${n}` }));
  const long = heightEntry(propose(makePack(extraClaims.map((claim) => prow(claim.id, "form", 4, [b(32, 3, 2, 1)])), { extraClaims })), 32).entry;
  assert.equal(long.source, "default-height:32; corpus:2026-01-02#controlHeights (several rows; see .styleseed/proposals/system.json)");
  for (const entry of [sameRow, twoRows, three, long]) checkHeightEntry(entry, 32);
});

test("--default-height: an agreeing option that holds two values quotes the count of the height alone (N1)", () => {
  const proposal = propose(makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "form", 4, [b(36, 3, 2, 1)])]), { recipe: "calm-consumer" });
  assert.deepEqual(axisOf(proposal, "controlHeights").options.map((o) => `${o.basis}:${o.values}`), ["corpus:32,36", "engine-default:28,32,36,40,44,52"], "two claims that agree on different values are one option");
  const at36 = heightEntry(proposal, 36).entry;
  assert.equal(at36.statement, "Default controls are 36px tall; at that default the shipped components of this StyleSeed version draw 24, 28, 32, 36, 40, 48px. Basis: 36px on 3 of 4 measured systems (form pages, corpus run 2026-01-02).");
  assert.equal(at36.source, "default-height:36; corpus:2026-01-02#field.height@form/1440");
  const at32 = heightEntry(proposal, 32).entry;
  assert.ok(at32.statement.endsWith(". Basis: 32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02)."), at32.statement);
  assert.equal(at32.source, "default-height:32; corpus:2026-01-02#button.height@form/1440");
  for (const [entry, height] of [[at36, 36], [at32, 32]]) checkHeightEntry(entry, height);
});

test("--default-height one step from the recipe's height on both surfaces; the sizes under the touch floor", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const pointer = propose(pack);
  const touch = propose(pack, { surface: "touch" });
  const chosen = "Basis: chosen; brand recipe enterprise-workbench draws 36px by default.";
  for (const [proposal, height, basis, source, under] of [
    [pointer, 32, "Basis: 32px on 3 of 4 measured systems (form pages, corpus run 2026-01-02).", "corpus:2026-01-02#button.height@form/1440", []],
    [pointer, 40, chosen, "chosen: 40", []],
    [touch, 32, chosen, "chosen: 32", [20, 24, 28, 32, 36]],
    [touch, 40, chosen, "chosen: 40", [28, 32, 36, 40]],
    [touch, 44, chosen, "chosen: 44", [32, 36, 40]],
  ]) {
    const { entry, underFloor } = heightEntry(proposal, height);
    assert.ok(entry.statement.endsWith(` ${basis}`), entry.statement);
    assert.equal(entry.source, `default-height:${height}; ${source}`);
    assert.deepEqual(underFloor, under, `${proposal.inputs.surface} ${height}`);
    checkHeightEntry(entry, height);
  }
});

test("--default-height over the shipped pack: every source reads back, its height is one of values, and each is the look's own default or a height from elsewhere", () => {
  let look = 0;
  let elsewhere = 0;
  for (const recipe of [...Object.keys(catalog.recipes), null]) for (const surface of ["pointer", "touch"]) for (const page of [...Object.keys(catalog.pages), "none"]) {
    const proposal = propose(committedPack, { page, surface, recipe });
    const drawn = engineDefault("controlHeights", defaults, { recipe });
    const own = defaults.recipes[drawn.id.slice("recipe.".length)].controlHeight;
    for (const height of new Set([own - 4, own, own + 4, 32])) {
      const { entry } = heightEntry(proposal, height);
      checkHeightEntry(entry, height);
      const parsed = parseDefaultHeight(entry);
      assert.equal(parsed.lookDefault, entry.source.slice(entry.source.indexOf("; ") + 2).startsWith("engine-default:recipe."), entry.source);
      if (parsed.lookDefault) {
        look += 1;
        assert.equal(height, own, entry.source);
        assert.deepEqual(entry.values, drawn.values, "the look's own height: the family the recipe's components draw");
      } else elsewhere += 1;
    }
  }
  assert.ok(look >= 40 && elsewhere >= 120, `${look} the look's own default, ${elsewhere} from elsewhere`);
});

test("--default-height on a recorded axis: the basis from the proposal without the record; the replacing entry keeps the id (M6, N2, N3)", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1), b(36, 1, 1, 0)])]);
  const family36 = namedAs(heightEntry(propose(pack), 36).entry, "D-001");
  const ledger = normalizeDecisions(clone([family36, heightException]), catalog);
  const recorded = propose(pack, { decisions: ledger });
  assert.equal(axisOf(recorded, "controlHeights").status, "recorded");
  assert.throws(() => heightEntry(recorded, 32), /controlHeights: recorded as D-001, so its block has no options; read the basis from the proposal made without that decision/u);
  const printed = JSON.stringify(recorded);
  const without = propose(pack, { decisions: ledger.filter((entry) => entry.id !== "D-001") });
  assert.equal(JSON.stringify(axisOf(without, "controlHeights").options), JSON.stringify(axisOf(propose(pack), "controlHeights").options), "the options of a project with nothing recorded, byte for byte");
  assert.deepEqual(axisOf(without, "controlHeights").scoped, ["D-002"], "the exception stays in the second proposal");
  assert.equal(JSON.stringify(recorded), printed, "the first proposal does not change");
  const replacing = heightEntry(without, 32).entry;
  assert.equal(replacing.source, "default-height:32; corpus:2026-01-02#button.height@form/1440", "the measured basis is kept");
  assert.throws(() => normalizeDecisions(clone([family36, heightException, namedAs(replacing, "D-003")]), catalog), /D-001 and D-003 both decide controlHeights/u, "appended beside D-001");
  assert.throws(() => normalizeDecisions(clone([heightException, namedAs(replacing, "D-003")]), catalog), /D-002\.to: D-001 is not a decision in this ledger/u, "in place of D-001 under a new id");
  assert.doesNotThrow(() => normalizeDecisions(clone([namedAs(replacing, "D-001"), heightException]), catalog), "in place of D-001, keeping the id");
});

test("--default-height builder: a caller's basis follows the token as given; the bounds of a height", () => {
  const pack = makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)])]);
  const proposal = propose(pack);
  const basis = { words: "about 36px on 8 of 8 screens of Example System (run 2026-11-16; heights rounded to the nearest 4px)", source: "system:example-system@2026-11-16#button.height" };
  const { entry } = heightEntry(proposal, 36, { basis });
  assert.equal(entry.statement, `Default controls are 36px tall; ${FAMILY(36)}. Basis: ${basis.words}.`);
  assert.equal(entry.source, "default-height:36; system:example-system@2026-11-16#button.height");
  assert.deepEqual(parseDefaultHeight(entry), { height: 36, lookDefault: false }, "the recipe's own height handed in by a caller is a height taken from elsewhere");
  checkHeightEntry(entry, 36);
  const recorded = propose(pack, { decisions: normalizeDecisions([namedAs(entry, "D-001")], catalog) });
  assert.equal(heightEntry(recorded, 32, { basis }).entry.source, "default-height:32; system:example-system@2026-11-16#button.height", "a caller's basis reads no options");
  assert.throws(() => heightEntry(proposal, 32, { basis: { words: "x", source: "s".repeat(190) } }), /default height basis: the source is 209 characters with the token; a ledger source holds at most 200/u);
  assert.throws(() => heightEntry(proposal, 32, { basis: { source: "chosen: 32" } }), /default height basis: pass \{words, source\}, each one line of text/u);
  assert.throws(() => heightEntry(proposal, 12), /--default-height 12: the smallest size around it would be 0px; give at least 13/u);
  assert.deepEqual(heightEntry(proposal, 13).entry.values, [1, 5, 9, 13, 17, 25], "the smallest size is at least 1");
  for (const height of [32.5, 0, "32"]) assert.throws(() => heightEntry(proposal, height), /give the default control height as a whole number of px/u, String(height));
});

const APPEND_HEIGHT = "Append it to .styleseed/decisions.json as D-001, with approvedBy set to the name the person gives and date to today. Keep `source` as printed; it carries the default height. Nothing was written.\n";
// WO-20 B2: in a project without a registry the command says what .styleseed/system.css will do with the entry.
const drawnAt = (height, look, x, sizes) => `Recorded: after the next resolve \`.styleseed/system.css\` draws ${height}px in place of ${look}. Import the file once in the global stylesheet, outside every \`@layer\`; where it is not imported the components keep ${x}px and the drift report reads ${sizes} as \`violates\`.\n`;
const DRAWN_32 = "Recorded: after the next resolve `.styleseed/system.css` draws 32px in place of the brand recipe's 36px. Import the file once in the global stylesheet, outside every `@layer`; where it is not imported the components keep 36px and the drift report reads 40, 48px as `violates`.\n";
assert.equal(drawnAt(32, "the brand recipe's 36px", 36, "40, 48px"), DRAWN_32, "the test's own template");
const lockProject = (prefix) => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(root, "STYLESEED.md"), LOCK);
  mkdirSync(join(root, "src"));
  assert.equal(spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" }).status, 0);
  return root;
};

test("CLI --default-height: the entry on stdout, what stderr says, nothing written; the refusals (WO-20 C2)", () => {
  const root = lockProject("ss-propose-height-");
  try {
    const run = (...args) => cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
    const before = files(root);
    let result = run("--default-height", "32");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { kind: "decision", axis: "controlHeights", values: [20, 24, 28, 32, 36, 44], statement: "Default controls are 32px tall; at that default the shipped components of this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: 32px on 3 of 4 measured systems (form pages, corpus run 2026-11-12).", approvedBy: "", date: "", source: "default-height:32; corpus:2026-11-12#button.height@form/1440" });
    assert.equal(result.stderr, `${DRAWN_32}${APPEND_HEIGHT}`);
    result = run("--default-height", "36");
    assert.equal(JSON.parse(result.stdout).source, "default-height:36; engine-default:recipe.enterprise-workbench (not measured)");
    assert.equal(result.stderr, APPEND_HEIGHT, "the recipe's own height: no sentence about drawing");
    assert.ok(run("--default-height", "40").stderr.startsWith(drawnAt(40, "the brand recipe's 36px", 36, "24, 48px")));
    result = cli(root, ["--project-root", ".", "--surface", "touch", "--default-height", "32"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "default-height:32; chosen: 32", "no corpus basis on touch");
    assert.equal(result.stderr, `Floor: rule \`CRAFT-control-heights\` says "Touch surfaces provide at least 44px targets". This entry's default is 32px; its sizes under the floor are 20, 24, 28, 32, 36px. The entry is printed: a recorded decision outranks a default rule.\n${DRAWN_32}${APPEND_HEIGHT}`);
    assert.ok(!cli(root, ["--project-root", ".", "--surface", "touch", "--default-height", "44"]).stderr.includes("Floor:"), "a default at the floor: no floor line");
    assert.deepEqual(files(root), before, "--default-height writes nothing");

    result = run("--entry", "controlHeights=32");
    assert.ok(result.stderr.includes("One control height recorded alone flags the other sizes of the shipped components; for them use `--default-height 32`.\nAppend it to .styleseed/decisions.json as D-001"), result.stderr);
    for (const arg of ["controlHeights=32,40", "controlRadius=8", "typeSizes=14"]) assert.ok(!run("--entry", arg).stderr.includes("One control height"), arg);

    for (const [args, pattern] of [
      [["--default-height", "32px"], /^--default-height 32px: give the default control height as a whole number of px, for example --default-height 32\n$/u],
      [["--default-height", "36.5"], /^--default-height 36\.5: give the default control height as a whole number of px/u],
      [["--default-height", "12"], /^--default-height 12: the smallest size around it would be 0px; give at least 13\n$/u],
      [["--default-height", "32", "--default-height", "36"], /^--default-height: pass one height\n$/u],
      [["--default-height"], /^--default-height needs a value/u],
      [["--default-height", "32", "--entry", "controlHeights=32"], /^--default-height prints one entry and writes nothing; drop --entry\n$/u],
      [["--default-height", "32", "--write"], /drop --write\n$/u],
      [["--default-height", "32", "--json"], /drop --json\n$/u],
      [["--write", "--default-height", "32", "--json"], /drop --write, --json\n$/u],
    ]) {
      result = run(...args);
      assert.equal(result.status, 1, args.join(" "));
      assert.match(result.stderr, pattern, args.join(" "));
      assert.equal(result.stdout, "", args.join(" "));
    }
    result = cli(root, ["--engine-defaults", "--default-height", "32"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--engine-defaults reads only the skill's files and takes --page alone; drop --default-height/u);
    assert.match(cli(root, ["--help"]).stdout, /\[same inputs\] --default-height <px>\n/u, "the usage names the flag");
    assert.deepEqual(files(root), before, "nothing written by a refusal");

    // N6: a project that names no recipe.
    writeFileSync(join(root, ".styleseed/manifest.json"), JSON.stringify({ selection: { adapter: "product-ui", page: "settings" } }));
    result = run("--default-height", "32");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, `${drawnAt(32, "the default 40px", 40, "40, 52px")}${APPEND_HEIGHT}`);
    assert.ok(run("--default-height", "36").stderr.startsWith(drawnAt(36, "the default 40px", 40, "44, 52px")));
    result = run("--default-height", "40");
    assert.equal(JSON.parse(result.stdout).source, "default-height:40; engine-default:recipe.default (not measured)");
    assert.equal(result.stderr, APPEND_HEIGHT);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("CLI --default-height on a recorded axis: the measured basis is kept, the line names the id, and the entry takes its place (M6, N2)", () => {
  const root = lockProject("ss-propose-height-recorded-");
  try {
    const run = (...args) => cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
    const ledger = (entries) => writeFileSync(join(root, ".styleseed/decisions.json"), `${JSON.stringify(entries, null, 2)}\n`);
    const family36 = namedAs(JSON.parse(run("--default-height", "36").stdout), "D-001");
    ledger([family36, heightException]);
    let result = run("--default-height", "32");
    assert.equal(result.status, 0, result.stderr);
    const replacing = JSON.parse(result.stdout);
    assert.equal(replacing.source, "default-height:32; corpus:2026-11-12#button.height@form/1440", "the basis read without D-001");
    assert.equal(result.stderr, [
      DRAWN_32.trimEnd(),
      "This entry replaces D-001: a ledger holds one project-wide decision on an axis.",
      "Put it in .styleseed/decisions.json in place of D-001, keeping the id D-001 (an exception may point at it), with approvedBy set to the name the person gives and date to today. Keep `source` as printed; it carries the default height. Nothing was written.",
      "",
    ].join("\n"));
    assert.ok(!/ as D-\d{3}/u.test(result.stderr) && !result.stderr.includes("Append it"), "no line that appends under a new id");
    assert.equal(run("--entry", "controlHeights=32").status, 1, "--entry still refuses a recorded axis");
    ledger([family36, heightException, namedAs(replacing, "D-003")]);
    result = run("--default-height", "32");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /D-001 and D-003 both decide controlHeights/u, "appended beside D-001");
    ledger([heightException, namedAs(replacing, "D-003")]);
    result = run("--default-height", "32");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /D-002\.to: D-001 is not a decision in this ledger/u, "in place of D-001 under a new id");
    ledger([namedAs(replacing, "D-001"), heightException]);
    result = run("--default-height", "36");
    assert.equal(result.status, 0, `in place of D-001, keeping the id: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).source, "default-height:36; engine-default:recipe.enterprise-workbench (not measured)");
    assert.match(result.stderr, /^This entry replaces D-001: /u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Three screens of this product whose controls are all `height` px tall.
const screensAt = (height) => ["home", "orders", "billing"].map((label) => [label, ownObservation({ heights: { [height]: 20 }, fields: { [height]: 10 }, buttons: { [height]: 10 } })]);

test("CLI --default-height in a registry project: the registry's sentence and its ledger", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-propose-height-registry-"));
  try {
    mkdirSync(join(root, ".styleseed/artifacts"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, ".styleseed/project.json"), `${JSON.stringify({
      schemaVersion: 1, projectId: "propose-height-registry",
      defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
      brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" },
    }, null, 2)}\n`);
    writeFileSync(join(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-settings", config: "app-settings.json" }] }, null, 2)}\n`);
    writeFileSync(join(root, ".styleseed/artifacts/app-settings.json"), `${JSON.stringify({
      schemaVersion: 1, id: "app-settings", target: { kind: "route", locator: "/settings" },
      selection: { grammar: "operations-console", adapter: null, domain: null, page: "settings", recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: "Which setting needs a change?", primaryAction: "Save settings", signatureMove: "Keep the form stable." },
      implementation: { sourceRoots: ["src"], tokenFiles: [] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    }, null, 2)}\n`);
    assert.equal(spawnSync(process.execPath, [resolver, "--project-root", root, "--all"], { encoding: "utf8" }).status, 0);
    const before = files(root);
    const result = cli(root, ["--project-root", ".", "--surface", "pointer", "--default-height", "32"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "default-height:32; corpus:2026-11-12#button.height@form/1440");
    assert.equal(result.stderr, "Recorded, not drawn: a registry project's recorded default height is not drawn. The components keep the brand recipe's 36px, and the drift report reads 40, 48px as `violates`.\nAppend it to .styleseed/project.json (decisions) as D-001, with approvedBy set to the name the person gives and date to today. Keep `source` as printed; it carries the default height. Nothing was written.\n");
    assert.deepEqual(files(root), before, "nothing written");
    // The look's own height with a measured source: the registry's sentence is not printed (the height is the recipe's).
    mkdirSync(join(root, ".styleseed/evidence/drift/2026-11-14"), { recursive: true });
    writeFileSync(join(root, OWN_PATH), `${JSON.stringify(inventoryFile(screensAt(36)), null, 2)}\n`);
    const own = cli(root, ["--project-root", ".", "--surface", "pointer", "--own", OWN_PATH, "--default-height", "36"]);
    assert.equal(own.status, 0, own.stderr);
    assert.equal(JSON.parse(own.stdout).source, "default-height:36; own-screens:2026-11-14#controlHeights");
    assert.ok(own.stderr.startsWith("Append it to .styleseed/project.json (decisions) as D-001"), own.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("CLI --default-height in a project without a registry: what .styleseed/system.css will do, and silence for the look's own default (WO-20 B2)", () => {
  const root = lockProject("ss-propose-height-drawn-");
  try {
    const run = (...args) => cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
    mkdirSync(join(root, ".styleseed/evidence/drift/2026-11-14"), { recursive: true });
    writeFileSync(join(root, OWN_PATH), `${JSON.stringify(inventoryFile(screensAt(36)), null, 2)}\n`);
    // A height that differs from the look's: the first sentence (also pinned above for 32, 40, and no recipe).
    let result = run("--default-height", "32");
    assert.equal(result.stderr, `${DRAWN_32}${APPEND_HEIGHT}`);
    // The look's own height with a measured source: the file sets it and keeps it if the look changes.
    result = run("--own", OWN_PATH, "--default-height", "36");
    assert.equal(result.status, 0, result.stderr);
    const measured = JSON.parse(result.stdout);
    assert.equal(measured.source, "default-height:36; own-screens:2026-11-14#controlHeights");
    assert.deepEqual(parseDefaultHeight(measured), { height: 36, lookDefault: false }, "the file draws it");
    assert.equal(result.stderr, `Recorded: after the next resolve \`.styleseed/system.css\` sets 36px, which is the brand recipe's height today, and keeps it if the look changes.\n${APPEND_HEIGHT}`);
    // The look's own default: neither sentence.
    result = run("--default-height", "36");
    assert.equal(JSON.parse(result.stdout).source, "default-height:36; engine-default:recipe.enterprise-workbench (not measured)");
    assert.equal(result.stderr, APPEND_HEIGHT, "an entry that took the look's own default: silence about drawing");
    assert.ok(!result.stderr.includes("system.css") && !result.stderr.includes("Recorded"), result.stderr);
    // A project that names no recipe: the default height.
    writeFileSync(join(root, OWN_PATH), `${JSON.stringify(inventoryFile(screensAt(40)), null, 2)}\n`);
    writeFileSync(join(root, ".styleseed/manifest.json"), JSON.stringify({ selection: { adapter: "product-ui", page: "settings" } }));
    result = run("--own", OWN_PATH, "--default-height", "40");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "default-height:40; own-screens:2026-11-14#controlHeights");
    assert.equal(result.stderr, `Recorded: after the next resolve \`.styleseed/system.css\` sets 40px, which is the default height today, and keeps it if the look changes.\n${APPEND_HEIGHT}`);
    result = run("--default-height", "40");
    assert.equal(result.stderr, APPEND_HEIGHT, "no recipe, the default's own height: silence");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- the documentation this order adds -------------------------------------------------------------------------

const workflows = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows");
const doc = (path) => readFileSync(resolve(workflows, path), "utf8");
// The text from a heading line to the next heading of the same or a higher level.
function section(text, heading) {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `missing heading ${heading}`);
  const level = heading.match(/^#+/u)[0].length;
  const rest = text.slice(start + heading.length);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `, "u"));
  return heading + (next < 0 ? rest : rest.slice(0, next));
}
// The lock template of ss-setup step 8, as it was before this order: the workflow still writes it unchanged.
const LOCK_TEMPLATE = `\`\`\`markdown
# StyleSeed — Design Lock
<!-- Selections persist here. This file cannot waive StyleSeed core invariants. -->
- App domain: fintech
- Surface: mobile-app
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: consumer-service
- Grammar path: built-in:engine/RULESETS.md
- Grammar fallback: consumer-service
- Reference confidence: n/a
- Brand recipe: calm-consumer
- Palette recipe: quiet-mineral
- Key color: #3182F6
- Palette character: calm
- Palette mode: light
- Palette harmony: auto
- Surface temperature: neutral
- Aesthetic profile: none
- Skin: custom
- Primary action: #3182F6
- Font: Pretendard
- Radius: soft
- Elevation: light=tonal grouping + restrained shadow · dark=tonal ramp + hairline
- Density: comfortable
- Motion: Spring restrained
- Imagery/data role: personal state first; charts only for a decision
- Signature move: one calm contextual briefing above the account summary
- Locked: YYYY-MM-DD
\`\`\``;

test("wording of the added documentation: counts only, no banned word; setup still writes the same lock", () => {
  const setup = doc("ss-setup/WORKFLOW.md");
  const resolveWorkflow = doc("ss-resolve/WORKFLOW.md");
  const proposing = resolveWorkflow.slice(resolveWorkflow.indexOf("To propose the values a person may record"), resolveWorkflow.indexOf("\n\n", resolveWorkflow.indexOf("To propose the values a person may record")));
  const parts = {
    "proposals.md": doc("ss-resolve/references/proposals.md"),
    "ss-setup 9a": section(setup, "### 9a. Propose the system values and record what the person decides"),
    "ss-tokens propose": section(doc("ss-tokens/WORKFLOW.md"), "### `propose` — sizes, radii, and spacing with their basis"),
    "decisions: Proposed with a basis": section(doc("ss-resolve/references/decisions.md"), "## Proposed with a basis"),
    "decisions: A project without a registry": section(doc("ss-resolve/references/decisions.md"), "## A project without a registry"),
    "ss-resolve: proposing": proposing,
  };
  // WO-20 S: the first section, in each place that describes the document.
  const flat = (text) => text.replace(/\s+/gu, " ");
  assert.ok(flat(proposing).includes("Its `SYSTEM.md` opens with the system the project starts with: one table of what the shipped components draw with the project's look and what its ledger records, then one entry to take it or the reason there is none."), proposing);
  for (const name of ["ss-setup 9a", "ss-tokens propose"]) {
    assert.ok(flat(parts[name]).includes("The document opens with \"The system this project starts with\", one table of what the look draws and what the ledger records, and under \"To take it\" one entry or the reason there is none; present that first, then the blocks."), name);
    assert.ok(flat(parts[name]).includes("For a control height taken from the corpus or chosen by the person, get the entry from `--default-height <px>`: one height recorded alone flags the other sizes of the shipped components."), name);
  }
  assert.ok(parts["proposals.md"].includes("\n## The system first\n"), "proposals.md: the section on the first part of the document");
  for (const kind of ["recorded", "no-default", "registry", "floor", "entry", "replace"]) assert.ok(parts["proposals.md"].includes(`| \`${kind}\` |`), `proposals.md names the kind ${kind}`);
  assert.ok(flat(parts["decisions: Proposed with a basis"]).includes("block names `--default-height <px>` in place of an entry"), "decisions.md says where the height entry is");
  for (const [name, text] of Object.entries(parts)) {
    assert.ok(text.length > 200, `${name} is there`);
    assert.ok(!BANNED.test(text), `${name}: ${text.match(BANNED)?.[0]}`);
  }
  assert.ok(parts["ss-setup 9a"].includes("propose-system.mjs --project-root . --surface pointer --write"));
  assert.ok(parts["ss-setup 9a"].includes("Never fill in a name yourself and never record a"), "the workflow forbids typing a name");
  assert.ok(!parts["ss-setup 9a"].includes("If the user asked for a first screen"), "the first screen has its own heading");
  assert.ok(setup.includes("### 9b. First screen\n\nIf the user asked for a first screen"));
  const step8 = setup.slice(setup.indexOf("### 8. Write the design lock"));
  assert.equal(step8.slice(step8.indexOf("```markdown"), step8.indexOf("```\n", step8.indexOf("```markdown") + 3) + 3), LOCK_TEMPLATE, "the lock gains no field");
  assert.ok(parts["proposals.md"].includes("at least 3 measured systems, on at least two thirds") && parts["proposals.md"].includes("at least 1 product system"), "the rule with its three numbers");
  for (const status of ["recorded", "proposed", "split", "thin", "unmeasured"]) assert.ok(parts["proposals.md"].includes(`| \`${status}\` |`), status);
});

// Where setup recommends a brand recipe it says the recommendation is StyleSeed's own and not measured, and gives the
// page of measured systems. The files are hard-wrapped: every run of whitespace becomes one space before matching.
const RECIPE_BASIS_URL = "https://styleseed-demo.vercel.app/systems";
const RECIPE_BASIS_LINES = [
  "This is StyleSeed's default for <kind of product>. It is not measured.",
  "This is my recommendation from StyleSeed's built-in looks. It is not measured.",
  `Design systems we measured: ${RECIPE_BASIS_URL}`,
];

test("a recommended brand recipe states its basis and gives the link in setup, CLAUDE.md, and AGENTS.md", () => {
  const files = {
    "ss-setup/WORKFLOW.md": doc("ss-setup/WORKFLOW.md"),
    "engine/CLAUDE.md": readFileSync(resolve(repoRoot, "engine/CLAUDE.md"), "utf8"),
    "engine/AGENTS.md": readFileSync(resolve(repoRoot, "engine/AGENTS.md"), "utf8"),
  };
  for (const [name, text] of Object.entries(files)) {
    const flat = text.replace(/\s+/gu, " ");
    for (const line of RECIPE_BASIS_LINES) assert.ok(flat.includes(line), `${name} lacks the line: ${line}`);
    assert.ok(flat.includes(RECIPE_BASIS_URL), `${name} lacks the link ${RECIPE_BASIS_URL}`);
  }
});

// --- SYSTEM.md opens with the system (WO-20 S) ----------------------------------------------------------------------
// Expected text is written from the order's words. A proposal rendered from the object gets the command `main` passes
// when --page is given.

const inputOf = ({ decisions = [], recipe = "enterprise-workbench", surface = "pointer", page = "settings", mode = "legacy", artifact = null, own = null, references = [], pack = committedPack } = {}) => ({
  pack, defaults, references, own,
  project: project({ mode, recipe, decisions: normalizeDecisions(clone(decisions), catalog), ...(mode === "registry" ? { ledger: { path: ".styleseed/project.json", entries: decisions.length, nextId: "D-901" } } : {}) }),
  context: { artifact, page, surface },
});
const sys = (options) => proposeSystem(inputOf(options));
const mainCommand = (p) => `propose-system.mjs --project-root .${p.inputs.artifact ? ` --artifact ${p.inputs.artifact}` : ""} --page ${p.inputs.page}${p.inputs.references.map((slug) => ` --reference ${slug}`).join("")}${p.inputs.own ? ` --own ${p.inputs.own}` : ""} --surface ${p.inputs.surface}`;
const mdOf = (p) => renderProposalMarkdown(p, { command: mainCommand(p) });
const between = (text, from, to) => {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, `${from.trim()} … ${to.trim()}\n${text}`);
  return text.slice(start + from.length, end);
};
// Section 2 (from its heading to "## To take it") and section 3 (its text alone).
const firstSection = (md) => `## The system this project starts with\n${between(md, "## The system this project starts with\n", "## To take it\n")}`;
const takeOf = (md) => between(md, "## To take it\n\n", "\n\n## Details and counts\n");
const rowOf = (p, key) => p.system.rows.find((row) => row.key === key);
const cellsOf = (p, key) => { const row = rowOf(p, key); return [row.value, row.from]; };
// What --default-height prints for a project (the entry a person records), named as D-001 or another id.
const printedHeight = (height, options = {}) => defaultHeightEntryFor(inputOf(options), height).entry;
const recorded = (entry, id = "D-001") => namedAs(entry, id);
// A hand-written control-height decision.
const handHeights = (values, source, id = "D-001") => ({ id, kind: "decision", axis: "controlHeights", values, statement: "Controls use these heights.", approvedBy: "example-designer", date: "2026-11-27", ...(source === undefined ? {} : { source }) });
const SYSTEM_CSS_DRAWS = (id, instead) => `recorded as ${id}. \`.styleseed/system.css\` draws it after a resolve, where the file is imported, in place of ${instead}.`;
const SYSTEM_CSS_KEEPS = (id) => `recorded as ${id}. \`.styleseed/system.css\` sets it after a resolve, where the file is imported, and keeps it if the look changes.`;
const NOT_PINNED = "Recording it changes nothing that is drawn; the drift report then reads any other control height as `violates`.";
const PINNED = (x) => `Recording it changes no size today: \`.styleseed/system.css\` then sets ${x}px, which the look draws already, and keeps it if the look changes. The drift report then reads any other control height as \`violates\`.`;
const TAIL = "The other rows need no entry. Block 1 is about this same height: what it prints gives another `controlHeights` entry, and a ledger holds one project-wide decision on an axis. The blocks from 2 on are separate choices.";
const entryText = (p, effect) => ["One entry records the default height above with the sizes around it:", "", "```json", JSON.stringify(p.system.take.entry, null, 2), "```", "", `It is what \`${mainCommand(p)} --default-height ${p.system.take.height}\` prints. Record it under the name of the person who decides, as "Recording" says. ${effect} ${TAIL}`].join("\n");
const replaceText = (p, id, pinned = "") => [`This entry replaces \`${id}\`, whose default the look does not draw:`, "", "```json", JSON.stringify(p.system.take.entry, null, 2), "```", "", `It is what \`${mainCommand(p)} --default-height ${p.system.take.height}\` prints. Put it in place of \`${id}\` and keep the id \`${id}\`, with the name of the person who decides and today's date.${pinned}`].join("\n");
const INTRO_RECIPE = (id, artifact = "") => `What the shipped components draw with brand recipe \`${id}\`${artifact}, and what this project's ledger records. The brand recipe's values are engine defaults, not measured; counts over measured design systems are under "Details and counts".`;
const INTRO_NONE = "What the shipped components draw for a project that names no brand recipe, and what this project's ledger records. These values are engine defaults, not measured; counts over measured design systems are under \"Details and counts\".";
const HEAD = ["| | Value | Where it comes from |", "|---|---|---|"];
const REGISTRY_TEXT = "No entry is offered in a registry project: a decision there is project-wide, and its artifacts can have different looks. What block 1 prints is project-wide too. A height for one artifact is a decision with `scope.artifacts`; the drift report applies it to the screens named in its `scope.screens`.";
const FLOOR_NOTE = (h) => `Floor: rule \`CRAFT-control-heights\` says "Touch surfaces provide at least 44px targets". The default height drawn here, ${h}px, is under it.`;

test("SYSTEM.md: the opening paragraph, then the system, \"To take it\", and the old header bullets under \"Details and counts\" (WO-20 S)", () => {
  const md = mdOf(sys());
  const head = md.slice(0, md.indexOf("## The system this project starts with"));
  assert.equal(head, "# System proposal — settings page, pointer input\n\nThe tool records nothing. The first section shows what this project draws today and what its ledger already records. Each block under \"Details and counts\" is a count and a choice that stays with the person who decides for this project. Nothing here reviews the product, and the drift report holds the project to a value only once it is recorded in the ledger under that person's name.\n\n");
  const order = ["## The system this project starts with\n", "## To take it\n", "## Details and counts\n\n- Corpus: run `2026-11-12`.", "- Project: page `settings`", "- Rule: a corpus value is proposed", "## 1. Control height (`controlHeights`)", "## Measured systems", "## Recording"].map((part) => md.indexOf(part));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), JSON.stringify(order));
  const touch = mdOf(sys({ surface: "touch", recipe: "native-mobile" }));
  assert.ok(touch.includes("## Details and counts\n\n- Corpus:") && touch.indexOf("- **This run holds no touch measurement") > touch.indexOf("## Details and counts"), "the touch bullet stays with the header bullets");
});

test("the table, whole and exact: enterprise-workbench, no recipe, expressive-brand, calm-consumer, public-service (WO-20 S)", () => {
  const workbench = sys();
  assert.equal(firstSection(mdOf(workbench)), [
    "## The system this project starts with", "", INTRO_RECIPE("enterprise-workbench"), "", ...HEAD,
    "| Default height of controls (buttons, inputs, selects, tabs) | 36px; the other shipped sizes are 24, 28, 32, 40, 48px | the brand recipe, not measured. Not recorded; the entry under \"To take it\" records it. Block 1 proposes 32px from the corpus, which measured desktop consoles. |",
    "| Corner of buttons and the controls that share it | 3px | the brand recipe, not measured |",
    "| Corner of inputs, selects, and textareas | the skin's corner | the skin, not measured; no brand recipe sets it |",
    "| Corner of list rows | 2px | the brand recipe, not measured |",
    "| Corner of cards | 4px | the brand recipe, not measured |",
    "| Padding inside a section card and the other pattern cards | 20px | the brand recipe, not measured |",
    "| Gap between sections | 16px | the brand recipe, not measured |",
    "| Side margin of the page | 24px | the brand recipe, not measured |",
    "", "",
  ].join("\n"));
  assert.equal(takeOf(mdOf(workbench)), entryText(workbench, NOT_PINNED));

  const none = sys({ recipe: null });
  assert.equal(firstSection(mdOf(none)), [
    "## The system this project starts with", "", INTRO_NONE, "", ...HEAD,
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px; the other shipped sizes are 28, 32, 36, 44, 52px | StyleSeed's default, not measured. Not recorded; the entry under \"To take it\" records it. Block 1 proposes 32px from the corpus, which measured desktop consoles. |",
    "| Corner of buttons and the controls that share it | 6px | StyleSeed's default, not measured |",
    "| Corner of inputs, selects, and textareas | the skin's corner | the skin, not measured; no brand recipe sets it |",
    "| Corner of list rows | 6px | StyleSeed's default, not measured |",
    "| Corner of cards | 10px | StyleSeed's default, not measured |",
    "| Padding inside a section card and the other pattern cards | 20px | StyleSeed's default, not measured |",
    "| Gap between sections | 24px | StyleSeed's default, not measured |",
    "| Side margin of the page | 20px | StyleSeed's default, not measured |",
    "", "",
  ].join("\n"));
  assert.deepEqual(none.system.look, { recipe: null, height: 40, values: [28, 32, 36, 40, 44, 52] });
  assert.deepEqual(sys({ recipe: "unknown-recipe" }).system.rows, none.system.rows, "a look the file does not have is the \"without\" column");

  const table = (p) => firstSection(mdOf(p)).split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| |"));
  assert.deepEqual(table(sys({ recipe: "expressive-brand", page: "dashboard" })), [
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px; the other shipped sizes are 28, 32, 36, 44, 52px | the brand recipe, not measured. Not recorded; the entry under \"To take it\" records it. |",
    "| Corner of buttons and the controls that share it | 10px | the brand recipe, not measured |",
    "| Corner of inputs, selects, and textareas | the skin's corner | the skin, not measured; no brand recipe sets it |",
    "| Corner of list rows | 10px | the brand recipe, not measured |",
    "| Corner of cards | 16px | the brand recipe, not measured |",
    "| Padding inside a section card and the other pattern cards | not a fixed value in this brand recipe | the brand recipe, not measured |",
    "| Gap between sections | not a fixed value in this brand recipe | the brand recipe, not measured |",
    "| Side margin of the page | not a fixed value in this brand recipe | the brand recipe, not measured |",
  ]);
  assert.deepEqual(table(sys({ recipe: "calm-consumer", page: "dashboard" })), [
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px; the other shipped sizes are 28, 32, 36, 44, 52px | the brand recipe, not measured. Not recorded; the entry under \"To take it\" records it. |",
    "| Corner of buttons and the controls that share it | pill | the brand recipe, not measured |",
    "| Corner of inputs, selects, and textareas | the skin's corner | the skin, not measured; no brand recipe sets it |",
    "| Corner of list rows | 12px | the brand recipe, not measured |",
    "| Corner of cards | 20px | the brand recipe, not measured |",
    "| Padding inside a section card and the other pattern cards | 24px | the brand recipe, not measured |",
    "| Gap between sections | 24px | the brand recipe, not measured |",
    "| Side margin of the page | 24px | the brand recipe, not measured |",
  ]);
  assert.deepEqual(table(sys({ recipe: "public-service", page: "dashboard" })), [
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px; the other shipped sizes are 28, 32, 36, 44, 52px | the brand recipe, not measured. Not recorded; the entry under \"To take it\" records it. |",
    "| Corner of buttons and the controls that share it | square | the brand recipe, not measured |",
    "| Corner of inputs, selects, and textareas | the skin's corner | the skin, not measured; no brand recipe sets it |",
    "| Corner of list rows | square | the brand recipe, not measured |",
    "| Corner of cards | square | the brand recipe, not measured |",
    "| Padding inside a section card and the other pattern cards | 0px | the brand recipe, not measured |",
    "| Gap between sections | 32px | the brand recipe, not measured |",
    "| Side margin of the page | 24px | the brand recipe, not measured |",
  ]);
  assert.deepEqual(workbench.system.rows.map((row) => Object.keys(row)), workbench.system.rows.map(() => ["key", "name", "value", "from"]));
  assert.deepEqual(workbench.system.rows.map((row) => row.key), ["controlHeight", "controlRadius", "fieldRadius", "insetRadius", "surfaceRadius", "surfacePadding", "sectionGap", "pageGutter"]);
});

test("the height row of H0: block 1's proposal from the corpus, several values, own screens, a reference (WO-20 S)", () => {
  const ending = (p) => rowOf(p, "controlHeight").from.slice("the brand recipe, not measured. Not recorded; the entry under \"To take it\" records it.".length);
  assert.equal(ending(sys()), " Block 1 proposes 32px from the corpus, which measured desktop consoles.");
  assert.equal(ending(sys({ own: ownOf(inventoryFile(screensAt(32))) })), " Block 1 proposes 32px from this product's own screens.");
  assert.equal(ending(sys({ references: [ref("ref-kept", { controlHeights: [36] }, ["controlHeights"])] })), " Block 1 proposes 36px from the project's reference `ref-kept`.");
  const two = sys({ pack: makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "form", 4, [b(36, 3, 2, 1)])]), page: "form" });
  assert.equal(ending(two), " Block 1 proposes 32, 36px from the corpus, which measured desktop consoles.");
  assert.equal(ending(sys({ page: "dashboard" })), "", "nothing proposed: no sentence");
  assert.equal(systemLine(sys()), "system: default control height 36px (the brand recipe, not measured); not recorded");
});

test("H1 to H4 without a registry: the height row, \"To take it\", and what `system` holds (WO-20 S)", () => {
  // H1: a recorded default the file draws, D not X; D equal to X; one recorded value.
  let p = sys({ decisions: [recorded(printedHeight(32))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["32px; the other recorded sizes are 20, 24, 28, 36, 44px", SYSTEM_CSS_DRAWS("D-001", "the brand recipe's 36px")]);
  assert.equal(takeOf(mdOf(p)), "Nothing to record: the default height is recorded as `D-001`.");
  assert.deepEqual([p.system.heightRow, p.system.recorded, p.system.take], ["H1", 32, { kind: "recorded", entry: null, id: "D-001", height: 32, pinned: false }]);
  assert.equal(systemLine(p), "system: default control height 32px, recorded as D-001");
  const own36 = ownOf(inventoryFile(screensAt(36)));
  p = sys({ decisions: [recorded(printedHeight(36, { own: own36 }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["36px; the other recorded sizes are 24, 28, 32, 40, 48px", SYSTEM_CSS_KEEPS("D-001")]);
  assert.equal(p.system.heightRow, "H1");
  p = sys({ decisions: [handHeights([32], "default-height:32; chosen: 32")] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["32px", SYSTEM_CSS_DRAWS("D-001", "the brand recipe's 36px")]);

  // H2: a look's own default at the height the look draws, this look and another.
  p = sys({ decisions: [recorded(printedHeight(36))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["36px; the other recorded sizes are 24, 28, 32, 40, 48px", "recorded as D-001 as the brand recipe's own default; the brand recipe draws it."]);
  assert.deepEqual([p.system.heightRow, p.system.recorded, p.system.take.kind, p.system.take.height], ["H2", 36, "recorded", 36]);
  assert.equal(systemLine(p), "system: default control height 36px, recorded as D-001");
  p = sys({ decisions: [recorded(printedHeight(36, { recipe: "developer-platform" }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["36px; the other recorded sizes are 24, 28, 32, 40, 48px", "recorded as D-001 as the own default of brand recipe `developer-platform`; the brand recipe draws the same height."]);
  assert.equal(takeOf(mdOf(p)), "Nothing to record: the default height is recorded as `D-001`.");

  // H3: another look at another height; this look at another height (an earlier own default).
  p = sys({ decisions: [recorded(printedHeight(40, { recipe: "calm-consumer" }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["40px recorded; the brand recipe draws 36px", "recorded as D-001 as the own default of brand recipe `calm-consumer`, and this project's look now draws 36px. The entry under \"To take it\" replaces D-001."]);
  assert.deepEqual([p.system.heightRow, p.system.recorded, p.system.take.kind, p.system.take.id, p.system.take.height, p.system.take.pinned], ["H3", 40, "replace", "D-001", 36, false]);
  assert.deepEqual(p.system.take.entry, printedHeight(36), "the entry for the height the look draws, from the proposal without D-001");
  assert.equal(takeOf(mdOf(p)), replaceText(p, "D-001"));
  assert.equal(systemLine(p), "system: default control height 40px recorded as D-001; the look draws 36px");
  p = sys({ decisions: [handHeights(familyOf(32), "default-height:32; engine-default:recipe.enterprise-workbench (not measured)")] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["32px recorded; the brand recipe draws 36px", "recorded as D-001 as an earlier own default of the brand recipe, and this project's look now draws 36px. The entry under \"To take it\" replaces D-001."]);

  // H4: recorded without a default height; several values, one value at X, one value that is not X.
  p = sys({ decisions: [handHeights([32, 36])] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["recorded sizes 32, 36px", "recorded as D-001 without a default height; the brand recipe draws 36px by default."]);
  assert.equal(takeOf(mdOf(p)), `The control heights are recorded as \`D-001\` without a default height. To name one: \`${mainCommand(p)} --default-height <px>\`; its entry goes in place of \`D-001\`.`);
  assert.deepEqual([p.system.heightRow, p.system.recorded, p.system.take], ["H4", null, { kind: "no-default", entry: null, id: "D-001", height: null, pinned: false }]);
  assert.equal(systemLine(p), "system: control heights recorded as D-001 without a default height");
  p = sys({ decisions: [handHeights([36])] });
  assert.equal(takeOf(mdOf(p)), `The control heights are recorded as \`D-001\` without a default height. To make 36px the default height, with the sizes around it: \`${mainCommand(p)} --default-height 36\`; its entry goes in place of \`D-001\`.`);
  assert.equal(p.system.take.height, 36);
  p = sys({ decisions: [handHeights([32])] });
  assert.equal(takeOf(mdOf(p)), `The control heights are recorded as \`D-001\` without a default height. To make 32px the default height, with the sizes around it: \`${mainCommand(p)} --default-height 32\`; its entry goes in place of \`D-001\`, and \`.styleseed/system.css\` then draws 32px in place of the brand recipe's 36px.`);
  assert.equal(sys({ decisions: [handHeights(familyOf(32), "default-height:30; chosen: 30")] }).system.heightRow, "H4", "a token whose height the values do not hold");

  // A scoped decision or an exception alone changes nothing here.
  const scopedOnly = sys({ decisions: [{ ...handHeights([28], "default-height:28; chosen: 28", "D-002"), scope: { screens: ["orders"] } }] });
  assert.deepEqual([scopedOnly.system.heightRow, scopedOnly.system.take.kind], ["H0", "entry"]);
});

test("a project that names no brand recipe: every \"without\" word in the height row, the corner row, and \"To take it\" (WO-20 S)", () => {
  const none = (options) => sys({ recipe: null, ...options });
  let p = none({ decisions: [recorded(printedHeight(32, { recipe: null }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["32px; the other recorded sizes are 20, 24, 28, 36, 44px", SYSTEM_CSS_DRAWS("D-001", "the default 40px")]);
  p = none({ decisions: [recorded(printedHeight(40, { recipe: null }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["40px; the other recorded sizes are 28, 32, 36, 44, 52px", "recorded as D-001 as StyleSeed's own default; the components draw it."]);
  p = none({ decisions: [handHeights(familyOf(36), "default-height:36; engine-default:recipe.default (not measured)")] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["36px recorded; the components draw 40px", "recorded as D-001 as an earlier default of StyleSeed's own, and this project's look now draws 40px. The entry under \"To take it\" replaces D-001."]);
  assert.equal(takeOf(mdOf(p)), replaceText(p, "D-001"));
  p = none({ decisions: [handHeights([32])] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["recorded sizes 32px", "recorded as D-001 without a default height; the components draw 40px by default."]);
  assert.equal(takeOf(mdOf(p)), `The control heights are recorded as \`D-001\` without a default height. To make 32px the default height, with the sizes around it: \`${mainCommand(p)} --default-height 32\`; its entry goes in place of \`D-001\`, and \`.styleseed/system.css\` then draws 32px in place of the default 40px.`);
  const registry = (decisions) => none({ mode: "registry", artifact: "app-settings", decisions });
  assert.equal(rowOf(registry([recorded(printedHeight(32, { recipe: null }))]), "controlHeight").from, "recorded as D-001. Not drawn for a registry project: the components draw the default 40px.");
  assert.equal(rowOf(registry([recorded(printedHeight(40, { recipe: null, own: ownOf(inventoryFile(screensAt(40))) }))]), "controlHeight").from, "recorded as D-001; the components draw the same height.");
  assert.equal(rowOf(registry([corner("D-002", "controlRadius", 8)]), "controlRadius").from, "recorded as D-002. Not drawn for a registry project: the components draw the default 6px.");
  assert.equal(rowOf(registry([corner("D-002", "controlRadius", 6)]), "controlRadius").from, "recorded as D-002; the components draw the same corner.");
  assert.equal(registry([]).system.intro, INTRO_NONE, "a registry artifact without a brand recipe: the \"without\" introduction");
});

test("the look a recorded default was taken from: only the exact form the proposer writes; nothing typed reaches the table (WO-20 S)", () => {
  const from = (source, options = {}, values = familyOf(36)) => rowOf(sys({ decisions: [handHeights(values, source)], ...options }), "controlHeight").from;
  for (const source of ["default-height:36; engine-default:recipe.a|b` (not measured)", "default-height:36; engine-default:recipe.enterprise-workbench", "default-height:36; engine-default:recipe. (not measured)", "default-height:36; engine-default:recipe.unknown-look (not measured)"]) {
    const p = sys({ decisions: [handHeights(familyOf(36), source)] });
    assert.equal(rowOf(p, "controlHeight").from, "recorded as D-001 as the own default of another look; the brand recipe draws the same height.", source);
    const section = firstSection(mdOf(p));
    for (const piece of ["a|b", "unknown-look", "`(", "engine-default"]) assert.ok(!section.includes(piece), `${source}: ${piece}`);
    assert.equal(section.split("\n").filter((line) => line.startsWith("| ")).every((line) => line.split(" | ").length === 3), true, "every row keeps three cells");
  }
  assert.equal(from("default-height:40; engine-default:recipe.default (not measured)", { recipe: "calm-consumer" }, familyOf(40)), "recorded as D-001 as StyleSeed's own default; the brand recipe draws the same height.");
  assert.equal(from("default-height:40; engine-default:recipe.default (not measured)", {}, familyOf(40)), "recorded as D-001 as StyleSeed's own default, and this project's look now draws 36px. The entry under \"To take it\" replaces D-001.");
  assert.equal(from("default-height:40; engine-default:recipe.calm-consumer (not measured)", { recipe: null }, familyOf(40)), "recorded as D-001 as the own default of brand recipe `calm-consumer`; the components draw the same height.");
});

test("the split holds: for every ordered pair of looks, H3 exactly when the two heights differ, H2 otherwise (WO-20 S, S1)", () => {
  const looks = Object.keys(defaults.recipes);
  const recipeOf = (look) => (look === "default" ? null : look);
  let pairs = 0;
  let same = 0;
  for (const first of looks) for (const second of looks) {
    if (first === second) continue;
    pairs += 1;
    const entry = printedHeight(defaults.recipes[first].controlHeight, { recipe: recipeOf(first) });
    const p = sys({ recipe: recipeOf(second), decisions: [recorded(entry)] });
    const differ = defaults.recipes[first].controlHeight !== defaults.recipes[second].controlHeight;
    if (!differ) same += 1;
    assert.deepEqual([p.system.heightRow, p.system.take.kind], differ ? ["H3", "replace"] : ["H2", "recorded"], `${first} -> ${second}`);
    if (!differ) assert.ok(!mdOf(p).includes("does not draw") && rowOf(p, "controlHeight").from.endsWith("the same height."), `${first} -> ${second}`);
  }
  assert.deepEqual([pairs, same], [90, 44]);
});

test("a registry project: H0, H1 in both forms, and H3 with their words; no entry offered; two artifacts with two looks (WO-20 S, S3)", () => {
  const registry = (options = {}) => sys({ mode: "registry", artifact: "app-settings", ...options });
  let p = registry();
  assert.equal(p.system.intro, INTRO_RECIPE("enterprise-workbench", " (artifact `app-settings`)"));
  assert.equal(sys({ mode: "registry" }).system.intro, INTRO_RECIPE("enterprise-workbench"), "without inputs.artifact the parenthesis is left out");
  assert.equal(p.inputs.artifact, "app-settings");
  assert.equal(rowOf(p, "controlHeight").from, "the brand recipe, not measured. Not recorded. Block 1 proposes 32px from the corpus, which measured desktop consoles.");
  assert.equal(takeOf(mdOf(p)), REGISTRY_TEXT);
  assert.deepEqual(p.system.take, { kind: "registry", entry: null, id: null, height: null, pinned: false });
  assert.ok(!takeOf(mdOf(p)).includes("```"));

  p = registry({ decisions: [recorded(printedHeight(32))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["32px; the other recorded sizes are 20, 24, 28, 36, 44px", "recorded as D-001. Not drawn for a registry project: the components draw the brand recipe's 36px."]);
  assert.equal(takeOf(mdOf(p)), "Nothing to record: the default height is recorded as `D-001`.");
  p = registry({ decisions: [recorded(printedHeight(36, { own: ownOf(inventoryFile(screensAt(36))) }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["36px; the other recorded sizes are 24, 28, 32, 40, 48px", "recorded as D-001; the brand recipe draws the same height."]);

  p = registry({ decisions: [recorded(printedHeight(40, { recipe: "calm-consumer" }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["40px recorded; the brand recipe draws 36px", "recorded as D-001 as the own default of brand recipe `calm-consumer`, and this artifact's look now draws 36px."]);
  assert.deepEqual(p.system.take, { kind: "registry", entry: null, id: "D-001", height: null, pinned: false });
  assert.equal(takeOf(mdOf(p)), REGISTRY_TEXT);
  assert.equal(registry({ surface: "touch", recipe: "calm-consumer" }).system.take.kind, "registry", "registry comes before floor");

  // One project, two artifacts whose looks draw 36px and 40px, with nothing recorded and with one artifact's own default recorded.
  for (const decisions of [[], [recorded(printedHeight(36), "D-900")]]) {
    for (const [artifact, recipe] of [["site-gate", "developer-platform"], ["site-docs", "editorial-authority"]]) {
      const one = sys({ mode: "registry", artifact, recipe, decisions });
      assert.equal(one.system.take.entry, null, `${artifact}: no entry offered`);
      assert.ok(!takeOf(mdOf(one)).includes("```json"), `${artifact}: no entry printed`);
      assert.ok(["registry", "recorded"].includes(one.system.take.kind), one.system.take.kind);
    }
  }
  assert.equal(sys({ mode: "registry", artifact: "site-docs", recipe: "editorial-authority", decisions: [recorded(printedHeight(36), "D-900")] }).system.heightRow, "H3");
});

test("the corner rows: recorded control and field corners, equal to the look's or not, with and without a registry; the note; system.corners (WO-20 S)", () => {
  const control = (value, id = "D-002") => corner(id, "controlRadius", value);
  const field = (value, id = "D-003") => corner(id, "fieldRadius", value);
  let p = sys({ decisions: [control(999)] });
  assert.deepEqual(cellsOf(p, "controlRadius"), ["pill", SYSTEM_CSS_DRAWS("D-002", "the brand recipe's 3px")]);
  assert.deepEqual(cellsOf(p, "fieldRadius"), ["the skin's corner", "the skin, not measured; no brand recipe sets it"]);
  assert.deepEqual(p.system.corners, { controlRadius: { id: "D-002", value: 999 }, fieldRadius: null });
  assert.deepEqual(p.system.notes, ["The drift report does not check a button's or a field's corner."]);
  assert.ok(firstSection(mdOf(p)).endsWith("| Side margin of the page | 24px | the brand recipe, not measured |\n\nThe drift report does not check a button's or a field's corner.\n\n"), firstSection(mdOf(p)));
  p = sys({ decisions: [field(8)] });
  assert.deepEqual(cellsOf(p, "fieldRadius"), ["8px", SYSTEM_CSS_DRAWS("D-003", "the skin's corner")]);
  assert.deepEqual(p.system.corners, { controlRadius: null, fieldRadius: { id: "D-003", value: 8 } });
  p = sys({ decisions: [control(0), field(999)] });
  assert.deepEqual([cellsOf(p, "controlRadius"), cellsOf(p, "fieldRadius")], [["square", SYSTEM_CSS_DRAWS("D-002", "the brand recipe's 3px")], ["pill", SYSTEM_CSS_DRAWS("D-003", "the skin's corner")]]);
  assert.equal(p.system.notes.length, 1, "one note for both corners");
  p = sys({ decisions: [control(3)] });
  assert.deepEqual(cellsOf(p, "controlRadius"), ["3px", SYSTEM_CSS_KEEPS("D-002")], "equal to the look's: the file's words");
  assert.deepEqual(cellsOf(sys({ recipe: "calm-consumer", decisions: [control(4)] }), "controlRadius"), ["4px", SYSTEM_CSS_DRAWS("D-002", "the brand recipe's pill corners")]);
  assert.deepEqual(cellsOf(sys({ recipe: "public-service", decisions: [control(8)] }), "controlRadius"), ["8px", SYSTEM_CSS_DRAWS("D-002", "the brand recipe's square corners")]);
  assert.deepEqual(cellsOf(sys({ recipe: null, decisions: [control(8)] }), "controlRadius"), ["8px", SYSTEM_CSS_DRAWS("D-002", "the default 6px")]);

  const registry = (decisions) => sys({ mode: "registry", artifact: "app-settings", decisions });
  assert.deepEqual(cellsOf(registry([control(999)]), "controlRadius"), ["pill", "recorded as D-002. Not drawn for a registry project: the components draw the brand recipe's 3px."]);
  assert.deepEqual(cellsOf(registry([control(3)]), "controlRadius"), ["3px", "recorded as D-002; the brand recipe draws the same corner."]);
  assert.deepEqual(cellsOf(registry([field(8)]), "fieldRadius"), ["8px", "recorded as D-003. Not drawn for a registry project: the components draw the skin's corner."]);
  assert.deepEqual(registry([field(8)]).system.notes, ["The drift report does not check a button's or a field's corner."]);
  assert.deepEqual(sys().system.notes, [], "no corner recorded: no note");
  assert.deepEqual(sys().system.corners, { controlRadius: null, fieldRadius: null });
});

test("touch: the floor kind, the note, and an entry at 44px; H3 under the floor; H1 at 32px reads 32 (WO-20 S)", () => {
  let p = sys({ recipe: "calm-consumer", surface: "touch", page: "dashboard" });
  assert.equal(rowOf(p, "controlHeight").from, "the brand recipe, not measured. Not recorded.");
  assert.deepEqual(p.system.notes, [FLOOR_NOTE(40)]);
  assert.deepEqual(p.system.take, { kind: "floor", entry: null, id: null, height: 44, pinned: false });
  assert.equal(takeOf(mdOf(p)), `No entry is offered: the height the look draws, 40px, is under the touch floor (rule \`CRAFT-control-heights\`). To record a default of 44px with the sizes around it: \`${mainCommand(p)} --default-height 44\`.`);
  assert.ok(firstSection(mdOf(p)).endsWith(`|\n\n${FLOOR_NOTE(40)}\n\n`));

  p = sys({ recipe: "native-mobile", surface: "touch", page: "dashboard" });
  assert.deepEqual([p.system.take.kind, p.system.take.height, p.system.notes], ["entry", 44, []]);
  assert.equal(takeOf(mdOf(p)), entryText(p, NOT_PINNED));

  p = sys({ recipe: "calm-consumer", surface: "touch", page: "dashboard", decisions: [recorded(printedHeight(44, { recipe: "native-mobile", surface: "touch" }))] });
  assert.deepEqual(cellsOf(p, "controlHeight"), ["44px recorded; the brand recipe draws 40px", "recorded as D-001 as the own default of brand recipe `native-mobile`, and this project's look now draws 40px. No entry is offered (touch, below)."]);
  assert.deepEqual(p.system.take, { kind: "floor", entry: null, id: "D-001", height: 44, pinned: false });
  assert.equal(takeOf(mdOf(p)), `No entry is offered: the height the look draws, 40px, is under the touch floor (rule \`CRAFT-control-heights\`). To record a default of 44px with the sizes around it: \`${mainCommand(p)} --default-height 44\`; its entry goes in place of \`D-001\`.`);
  assert.deepEqual(p.system.notes, [FLOOR_NOTE(40)], "the note reads the height the look draws");

  p = sys({ recipe: "calm-consumer", surface: "touch", page: "dashboard", decisions: [recorded(printedHeight(32, { recipe: "calm-consumer", surface: "touch" }))] });
  assert.equal(p.system.heightRow, "H1");
  assert.deepEqual(p.system.notes, [FLOOR_NOTE(32)], "H1 without a registry: the note reads the recorded default");
  assert.deepEqual(sys({ mode: "registry", artifact: "app-settings", recipe: "calm-consumer", surface: "touch", page: "dashboard", decisions: [recorded(printedHeight(32, { recipe: "calm-consumer", surface: "touch" }))] }).system.notes, [FLOOR_NOTE(40)], "in a registry the note reads what the look draws");
  assert.equal(sys({ recipe: "calm-consumer", surface: "touch", decisions: [handHeights([32])] }).system.take.kind, "no-default", "no-default comes before floor");
});

test("pinned: own screens at the look's height pin the entry and the paragraph says so; without them it does not (WO-20 S, S5)", () => {
  const own = ownOf(inventoryFile(screensAt(36)));
  let p = sys({ own });
  assert.equal(p.system.take.pinned, true);
  assert.equal(p.system.take.entry.source, "default-height:36; own-screens:2026-11-14#controlHeights");
  assert.equal(takeOf(mdOf(p)), entryText(p, PINNED(36)));
  p = sys();
  assert.equal(p.system.take.pinned, false);
  assert.equal(takeOf(mdOf(p)), entryText(p, NOT_PINNED));
  p = sys({ own, decisions: [recorded(printedHeight(40, { recipe: "calm-consumer" }))] });
  assert.deepEqual([p.system.take.kind, p.system.take.pinned], ["replace", true]);
  assert.equal(takeOf(mdOf(p)), replaceText(p, "D-001", " `.styleseed/system.css` then sets 36px, which the look draws already, and keeps it if the look changes."));
  for (const proposal of [sys({ own }), sys(), sys({ recipe: null }), sys({ recipe: "native-mobile", surface: "touch" })]) assert.equal(proposal.system.take.pinned, parseDefaultHeight(proposal.system.take.entry).lookDefault === false, "the parser's answer");
});

test("block 1: the corpus names --default-height, own screens and a reference keep the entry, nothing proposed names both commands (WO-20 S)", () => {
  const block1 = (md) => between(md, "## 1. Control height (`controlHeights`)\n", "## 2. ");
  let p = sys();
  let md = mdOf(p);
  assert.ok(block1(md).endsWith(`\n\nTo record 32px as the default height, with the sizes around it: \`${mainCommand(p)} --default-height 32\`\n\n`), block1(md));
  assert.ok(!block1(md).includes("```json"), "no json block");
  assert.ok(!md.includes("--entry controlHeights="), "no one-value entry anywhere");
  assert.ok(block1(md).includes("- If recorded: the drift report reads any other control height as `violates D-…`."), "the bullets stay");
  assert.ok(p.axes[0].options[0].entry, "the proposal object keeps the option's entry");
  const two = sys({ pack: makePack([prow("button.height", "form", 4, [b(32, 3, 2, 1)]), prow("field.height", "form", 4, [b(36, 3, 2, 1)])]), page: "form" });
  assert.ok(block1(mdOf(two)).endsWith(`\n\nTo record one of these as the default height, with the sizes around it: \`${mainCommand(two)} --default-height <px>\`\n\n`));
  for (const options of [{ own: ownOf() }, { references: [ref("ref-kept", { controlHeights: [36] }, ["controlHeights"])] }]) {
    p = sys(options);
    assert.ok(block1(mdOf(p)).endsWith(`\`\`\`json\n${JSON.stringify(p.axes[0].options[0].entry, null, 2)}\n\`\`\`\n\n`), JSON.stringify(Object.keys(options)));
  }
  for (const options of [{ page: "dashboard" }, { surface: "touch" }]) {
    p = sys(options);
    assert.ok(block1(mdOf(p)).endsWith(`\n\nEntry for a default height, with the sizes around it: \`${mainCommand(p)} --default-height <px>\`. Entry for a set the project brings: \`${mainCommand(p)} --entry controlHeights=<values>\`\n\n`), block1(mdOf(p)));
  }
  assert.ok(mdOf(sys({ page: "dashboard" })).includes("Entry for a chosen value: `"), "the other blocks keep their line");
});

test("the radii bullet: one corner lacking and two, the command's values, its place, absent when the entry holds them; that entry resolves (WO-20 S)", () => {
  const own = ownOf();
  const radiiBullets = (p) => between(mdOf(p), "## 3. Corner radius (`radii`)\n", "## 4. ").split("\n").filter((line) => line.startsWith("- "));
  const both = [corner("D-001", "controlRadius", 999), corner("D-002", "fieldRadius", 8)];
  let p = sys({ own, decisions: both });
  let bullets = radiiBullets(p);
  assert.equal(bullets.at(-2), `- Before recording: this entry lacks the recorded field corner 8 (D-002) and control corner 999 (D-001), and a \`radii\` decision must hold every recorded corner. Take the entry from \`${mainCommand(p)} --entry radii=4,8,999\` instead, or the next resolve refuses the ledger.`);
  assert.ok(bullets.at(-1).startsWith("- If recorded: "), "directly before \"If recorded\"");
  const named = (entry, id) => ({ ...entry, id, approvedBy: "example-designer", date: "2026-11-27" });
  assert.throws(() => normalizeDecisions(clone([...both, named(p.axes[2].options[0].entry, "D-003")]), catalog), /add 8 and 999 to D-003\.values/u, "the ready entry is refused");
  const commanded = entryForValues(p, "radii", [4, 8, 999]);
  assert.doesNotThrow(() => normalizeDecisions(clone([...both, named(commanded, "D-003")]), catalog), "the entry its command names resolves");
  p = sys({ own, decisions: [both[0]] });
  assert.equal(radiiBullets(p).at(-2), `- Before recording: this entry lacks the recorded control corner 999 (D-001), and a \`radii\` decision must hold every recorded corner. Take the entry from \`${mainCommand(p)} --entry radii=4,999\` instead, or the next resolve refuses the ledger.`);
  p = sys({ own, decisions: [corner("D-001", "controlRadius", 8), corner("D-002", "fieldRadius", 8)] });
  assert.ok(radiiBullets(p).at(-2).startsWith("- Before recording: this entry lacks the recorded control corner 8 (D-001) and field corner 8 (D-002), and ") && radiiBullets(p).at(-2).includes("--entry radii=4,8`"), radiiBullets(p).at(-2));
  p = sys({ own, decisions: [corner("D-001", "controlRadius", 2), corner("D-002", "fieldRadius", 999)] });
  assert.equal(radiiBullets(p).at(-2), `- Before recording: this entry lacks the recorded control corner 2 (D-001) and field corner 999 (D-002), and a \`radii\` decision must hold every recorded corner. Take the entry from \`${mainCommand(p)} --entry radii=2,4,999\` instead, or the next resolve refuses the ledger.`, "a lacking corner below the entry's value: ascending");
  p = sys({ own, decisions: [corner("D-001", "controlRadius", 4)] });
  assert.ok(!radiiBullets(p).some((line) => line.includes("lacks the recorded")), "the entry holds the corner");
  assert.ok(!radiiBullets(sys({ decisions: both })).some((line) => line.includes("lacks the recorded")), "nothing proposed: no ready entry, no bullet");

  // Beside a partial block's bullet: after it, and directly before "If recorded".
  const panel = { id: "panel.radius", axis: "radii", use: "value", unit: "px", complete: false, label: "panel radius" };
  p = sys({ pack: makePack([prow("panel.radius", "form", 4, [b(6, 3, 2, 1)])], { extraClaims: [panel] }), page: "form", decisions: both });
  bullets = radiiBullets(p);
  assert.ok(bullets.at(-3).startsWith("- Before recording: this holds one value of a larger set."), bullets.join("\n"));
  assert.ok(bullets.at(-2).startsWith("- Before recording: this entry lacks the recorded field corner 8 (D-002) and control corner 999 (D-001)") && bullets.at(-2).includes("--entry radii=6,8,999`"), bullets.at(-2));
  assert.ok(bullets.at(-1).startsWith("- If recorded: "));
});

test("one entry, two printers: the entry under \"To take it\" is the stdout of --default-height, for entry and replace, through main (WO-20 S, S11)", () => {
  const root = lockProject("ss-propose-system-first-");
  try {
    const run = (...args) => cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
    const json = (md) => between(takeOf(md), "```json\n", "\n```");
    let md = run().stdout;
    assert.equal(`${json(md)}\n`, run("--default-height", "36").stdout, "entry");
    assert.ok(takeOf(md).includes("It is what `propose-system.mjs --project-root . --surface pointer --default-height 36` prints."), takeOf(md));
    mkdirSync(join(root, ".styleseed/evidence/drift/2026-11-14"), { recursive: true });
    writeFileSync(join(root, OWN_PATH), `${JSON.stringify(inventoryFile(screensAt(36)), null, 2)}\n`);
    md = run("--own", OWN_PATH).stdout;
    assert.equal(`${json(md)}\n`, run("--own", OWN_PATH, "--default-height", "36").stdout, "entry, pinned");
    assert.ok(takeOf(md).includes(PINNED(36)));
    writeFileSync(join(root, ".styleseed/decisions.json"), `${JSON.stringify([recorded(printedHeight(40, { recipe: "calm-consumer" })), heightException], null, 2)}\n`);
    md = run().stdout;
    assert.ok(takeOf(md).startsWith("This entry replaces `D-001`, whose default the look does not draw:"), takeOf(md));
    assert.equal(`${json(md)}\n`, run("--default-height", "36").stdout, "replace");
    md = run("--page", "dashboard", "--own", OWN_PATH).stdout;
    assert.equal(`${json(md)}\n`, run("--page", "dashboard", "--own", OWN_PATH, "--default-height", "36").stdout, "replace, pinned, with --page");
    assert.ok(takeOf(md).includes("It is what `propose-system.mjs --project-root . --page dashboard --own .styleseed/evidence/drift/2026-11-14/inventory.json --surface pointer --default-height 36` prints."), takeOf(md));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("--write: the system line after the notes and before the axis lines; system.json carries system last and proposalVersion 2 (WO-20 S)", () => {
  const root = lockProject("ss-propose-system-write-");
  try {
    mkdirSync(join(root, ".styleseed/evidence/_reference/ref-a/measurements"), { recursive: true });
    writeFileSync(join(root, ".styleseed/evidence/_reference/ref-a/measurements/summary.json"), JSON.stringify(summary));
    mkdirSync(join(root, ".styleseed/rulesets/ref-a"), { recursive: true });
    writeFileSync(join(root, ".styleseed/rulesets/ref-a/evidence.json"), "{}\n");
    const result = cli(root, ["--project-root", ".", "--surface", "pointer", "--reference", "ref-a", "--write"]);
    assert.equal(result.status, 0, result.stderr);
    const lines = result.stdout.split("\n");
    assert.equal(lines[0], "--reference ref-a: .styleseed/rulesets/ref-a/evidence.json is a hand-written contract, so its values count as measured, not kept.");
    assert.equal(lines[1], "system: default control height 36px (the brand recipe, not measured); not recorded");
    assert.ok(lines[2].startsWith("controlHeights: "), lines[2]);
    const written = JSON.parse(readFileSync(join(root, ".styleseed/proposals/system.json"), "utf8"));
    assert.equal(written.proposalVersion, 2);
    assert.equal(Object.keys(written).at(-1), "system");
    assert.deepEqual(Object.keys(written.system), ["look", "heightRow", "recorded", "corners", "intro", "rows", "notes", "take"]);
    assert.deepEqual(Object.keys(written.system.take), ["kind", "entry", "id", "height", "pinned"]);
    assert.deepEqual(written.system.look, { recipe: "enterprise-workbench", height: 36, values: [24, 28, 32, 36, 40, 48] });
    assert.deepEqual(written, JSON.parse(cli(root, ["--project-root", ".", "--surface", "pointer", "--reference", "ref-a", "--json"]).stdout), "--json prints the same object");
  } finally { rmSync(root, { recursive: true, force: true }); }
  const noRecipe = sys({ recipe: null });
  assert.equal(systemLine(noRecipe), "system: default control height 40px (StyleSeed's default, not measured); not recorded");
});

test("the renderer prints sections 2 and 3 from `system` and the command alone (WO-20 S)", () => {
  const p = sys();
  const edited = clone(p);
  edited.system.intro = "An intro edited by hand.";
  edited.system.rows = [{ key: "controlHeight", name: "Row edited by hand", value: "1px", from: "nowhere" }];
  edited.system.notes = ["A note edited by hand.", "A second note."];
  edited.system.take = { kind: "recorded", entry: null, id: "D-777", height: 1, pinned: false };
  assert.equal(between(mdOf(edited), "## The system this project starts with\n", "\n\n## Details and counts\n"), [
    "", "An intro edited by hand.", "", ...HEAD, "| Row edited by hand | 1px | nowhere |", "", "A note edited by hand.", "", "A second note.", "", "## To take it", "",
    "Nothing to record: the default height is recorded as `D-777`.",
  ].join("\n"));
  assert.ok(mdOf(edited).slice(mdOf(edited).indexOf("## Details and counts")) === mdOf(p).slice(mdOf(p).indexOf("## Details and counts")), "the rest is the proposal's");
  // Another proposal's system in place of this one prints that proposal's first two sections.
  const other = sys({ recipe: "calm-consumer", surface: "touch", page: "dashboard" });
  const command = "propose-system.mjs --project-root . --surface touch";
  const firstTwo = (proposal) => between(renderProposalMarkdown(proposal, { command }), "## The system this project starts with\n", "## Details and counts\n");
  assert.equal(firstTwo({ ...p, system: other.system }), firstTwo(other));
});

test("the names hold: each row name is true of the component sources and recipes.css (WO-20 S, S7)", () => {
  const engine = resolve(repoRoot, "engine");
  const source = (path) => readFileSync(resolve(engine, path), "utf8");
  const recipesCss = source("css/recipes.css");
  for (const path of ["ui/button.tsx", "ui/input.tsx", "ui/select.tsx", "ui/tabs.tsx"]) assert.ok(source(`components/${path}`).includes("var(--ss-control-height"), `${path} reads --ss-control-height`);
  const carries = (path, name) => new RegExp(`(^|[^a-z-])${name}([^a-z-]|$)`, "u").test(source(`components/${path}`));
  assert.ok(carries("ui/button.tsx", "ss-pattern-control"), "button.tsx carries ss-pattern-control");
  for (const path of ["ui/input.tsx", "ui/select.tsx", "ui/textarea.tsx"]) {
    assert.ok(!carries(path, "ss-pattern-control"), `${path} does not carry ss-pattern-control`);
    assert.ok(carries(path, "ss-pattern-field"), `${path} carries ss-pattern-field`);
  }
  assert.ok(carries("patterns/list-item.tsx", "ss-pattern-inset"));
  assert.ok(carries("patterns/section-card.tsx", "ss-pattern-surface"));
  assert.ok(!carries("ui/card.tsx", "ss-pattern-surface"), "card.tsx does not take the padding; read the padding row's name again the day it does");
  assert.ok(carries("ui/card.tsx", "ss-component-surface"));
  assert.ok(carries("patterns/page-shell.tsx", "ss-pattern-stack"));
  const all = [];
  const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else if (entry.name.endsWith(".tsx")) all.push(relative(resolve(engine, "components"), path).split("\\").join("/")); } };
  walk(resolve(engine, "components"));
  assert.ok(all.some((path) => carries(path, "ss-page-gutter") || carries(path, "ss-page-padding")), "a component carries ss-page-gutter or ss-page-padding");
  // Each class holds its variable in recipes.css, and some component carries each class.
  const rule = (selector) => { const at = recipesCss.indexOf(`${selector} {`); assert.ok(at >= 0, `recipes.css has ${selector}`); return recipesCss.slice(at, recipesCss.indexOf("}", at)); };
  for (const [selector, className, variable] of [
    [".ss-pattern-control", "ss-pattern-control", "--ss-control-radius"],
    [":where(.ss-pattern-field)", "ss-pattern-field", "--ss-field-radius"],
    [".ss-pattern-inset", "ss-pattern-inset", "--ss-inset-radius"],
    [".ss-pattern-surface", "ss-pattern-surface", "--ss-surface-radius"],
    [".ss-pattern-surface", "ss-pattern-surface", "--ss-surface-padding"],
    [".ss-component-surface", "ss-component-surface", "--ss-surface-radius"],
    [".ss-pattern-stack", "ss-pattern-stack", "--ss-section-gap"],
    [".ss-page-gutter", "ss-page-gutter", "--ss-page-gutter"],
    [".ss-page-padding", "ss-page-padding", "--ss-page-gutter"],
  ]) {
    assert.ok(rule(selector).includes(`var(${variable}`), `${selector} holds ${variable}`);
    assert.ok(all.some((path) => carries(path, className)), `a component carries ${className}`);
  }
});

test("wording: the first section of every new state carries no banned word; every entry offered compiles once named; the --write line (WO-20 S)", () => {
  const own36 = ownOf(inventoryFile(screensAt(36)));
  const heights = [
    [], [recorded(printedHeight(32))], [recorded(printedHeight(36, { own: own36 }))], [handHeights([32], "default-height:32; chosen: 32")],
    [recorded(printedHeight(36))], [recorded(printedHeight(36, { recipe: "developer-platform" }))], [recorded(printedHeight(40, { recipe: "calm-consumer" }))],
    [handHeights(familyOf(32), "default-height:32; engine-default:recipe.enterprise-workbench (not measured)")], [handHeights([32, 36])], [handHeights([32])], [handHeights([36])],
  ];
  const corners = [[], [corner("D-002", "controlRadius", 999)], [corner("D-002", "controlRadius", 3), corner("D-003", "fieldRadius", 8)]];
  const kinds = new Set();
  const rowsSeen = new Set();
  let checked = 0;
  for (const recipe of ["enterprise-workbench", "calm-consumer", null]) for (const surface of ["pointer", "touch"]) for (const mode of ["legacy", "registry"]) for (const decisions of heights) for (const extra of corners) for (const own of [null, ownOf()]) {
    const p = sys({ recipe, surface, mode, artifact: mode === "registry" ? "app-settings" : null, decisions: [...decisions, ...extra], own });
    const md = mdOf(p);
    assert.ok(!BANNED.test(md), `${md.match(BANNED)?.[0]}`);
    assert.ok(!BANNED.test(systemLine(p)), systemLine(p));
    kinds.add(p.system.take.kind);
    rowsSeen.add(p.system.heightRow);
    if (p.system.take.entry) {
      checkHeightEntry(p.system.take.entry, p.system.take.height);
      assert.doesNotThrow(() => normalizeDecisions(clone([...extra, namedAs(p.system.take.entry, p.system.take.id ?? "D-001")]), catalog));
    }
    checked += 1;
  }
  assert.deepEqual([...kinds].sort(), ["entry", "floor", "no-default", "recorded", "registry", "replace"]);
  assert.deepEqual([...rowsSeen].sort(), ["H0", "H1", "H2", "H3", "H4"]);
  assert.ok(checked >= 700, `${checked} documents`);
  assert.ok(mdOf(sys({ own: ownOf(), decisions: [corner("D-001", "controlRadius", 999)] })).includes("this entry lacks the recorded control corner 999 (D-001)"), "the radii bullet is among them");
});

test("determinism: the same input gives the same system, and the second proposal never recurses (WO-20 S)", () => {
  const run = () => sys({ decisions: [recorded(printedHeight(40, { recipe: "calm-consumer" }))], own: ownOf() });
  assert.equal(JSON.stringify(run(), null, 2), JSON.stringify(run(), null, 2));
  assert.equal(mdOf(run()), mdOf(run()));
  const input = inputOf({ decisions: [recorded(printedHeight(40, { recipe: "calm-consumer" }))] });
  const before = JSON.stringify(input);
  assert.deepEqual(defaultHeightEntryFor(input, 36), defaultHeightEntry(sys(), defaults, 36), "the proposal without D-001 is the proposal with nothing recorded");
  assert.equal(JSON.stringify(input), before, "the inputs are not changed");
  assert.throws(() => defaultHeightEntry(proposeSystem(input), defaults, 36), /controlHeights: recorded as D-001, so its block has no options/u, "defaultHeightEntry keeps its throw");
});

// --- a pick from a measured system (WO-20 C) -----------------------------------------------------------------------
// Expected text is written from the order's words. The file is the committed one; the ledger's next id is computed as
// the command computes it.

const measured = normalizeMeasuredSystems(JSON.parse(readFileSync(resolve(resolveDir, "references/measured-systems.json"), "utf8")));
const SYSTEM_IDS = ["cloudscape", "patternfly", "antpro", "shadcn", "primer", "mui", "govuk"];
const LOOKS = [...Object.keys(catalog.recipes), null];
const nextIdOf = (decisions) => `D-${String(decisions.reduce((max, entry) => Math.max(max, Number(entry.id.slice(2))), 0) + 1).padStart(3, "0")}`;
const pickInput = ({ decisions = [], recipe = "enterprise-workbench", surface = "pointer", page = "settings", withMeasured = true } = {}) => {
  const normalized = normalizeDecisions(clone(decisions), catalog);
  return {
    pack: committedPack, defaults, ...(withMeasured ? { measured } : {}), references: [], own: null,
    project: project({ recipe, decisions: normalized, ledger: { path: ".styleseed/decisions.json", entries: normalized.length, nextId: nextIdOf(normalized) } }),
    context: { artifact: null, page, surface },
  };
};
const pickOf = (id, options) => proposePick(pickInput(options), measured, id);
const pickMd = (pick) => renderPickMarkdown(pick, { ledgerAt: ".styleseed/decisions.json", command: `propose-system.mjs --project-root . --surface ${pick.surface}` });
const rowsOf = (pick) => pick.rows.map((row) => [row.outcome, row.why, row.entry ? (row.what === "height" ? parseDefaultHeight(row.entry).height : row.entry.values[0]) : null]);
const jsonBlock = (entry) => ["```json", JSON.stringify(entry, null, 2), "```"].join("\n");
const RESOLVE = "Then resolve. `.styleseed/system.css` draws the recorded values where it is imported: once in the global stylesheet, outside every `@layer`.";
const HEIGHT_NAME = "Default height of controls (buttons, inputs, selects, tabs)";
const CONTROL_NAME = "Corner of buttons and the controls that share it";
const FIELD_NAME = "Corner of inputs, selects, and textareas";
const named = (entry, id, date = "2026-11-28") => ({ ...entry, id, approvedBy: "example-designer", date });
// The entries of a pick, named under the ids it gives them, the optional one only when asked.
const recordedPick = (pick, { optional = false } = {}) => pick.rows.filter((row) => row.outcome === "entry" || (optional && row.outcome === "optional")).map((row) => named(row.entry, row.place.append ?? row.place.replace));
const heightOwnDefault = (height, recipe) => named(printedHeight(height, { recipe }), "D-001");

test("the seven on enterprise-workbench, pointer: the outcome and the value of each row (WO-20 C)", () => {
  assert.deepEqual(measured.systems.map((system) => system.id), SYSTEM_IDS);
  const expected = {
    cloudscape: [["entry", null, 32], ["optional", "becomes-pill", 999], ["entry", null, 8]],
    patternfly: [["entry", null, 36], ["optional", "becomes-pill", 999], ["entry", null, 6]],
    antpro: [["entry", null, 32], ["entry", null, 6], ["entry", null, 6]],
    shadcn: [["kept", "mixed", null], ["entry", null, 8], ["entry", null, 8]],
    primer: [["entry", null, 32], ["entry", null, 6], ["kept", "not-measured", null]],
    mui: [["entry", null, 40], ["entry", null, 8], ["entry", null, 8]],
    govuk: [["entry", null, 40], ["entry", null, 0], ["entry", null, 0]],
  };
  for (const id of SYSTEM_IDS) assert.deepEqual(rowsOf(pickOf(id)), expected[id], id);
  const cloudscape = pickOf("cloudscape");
  assert.deepEqual(Object.keys(cloudscape), ["pickVersion", "system", "count", "surface", "look", "rows", "notApplied", "radii"]);
  assert.deepEqual(Object.keys(cloudscape.rows[0]), ["what", "claim", "name", "now", "reading", "beside", "outcome", "why", "entry", "place", "dropped", "radii"]);
  assert.deepEqual(cloudscape.system, { id: "cloudscape", name: "AWS Cloudscape", run: "2026-11-16", screens: 8, page: "https://styleseed-demo.vercel.app/systems#cloudscape" });
  assert.deepEqual([cloudscape.pickVersion, cloudscape.count, cloudscape.surface], [1, 7, "pointer"]);
  assert.deepEqual(cloudscape.look, { recipe: "enterprise-workbench", height: 36, values: [24, 28, 32, 36, 40, 48], cardCorner: 4 });
  assert.deepEqual(cloudscape.rows.map((row) => [row.what, row.claim, row.name]), [["height", "button.height", HEIGHT_NAME], ["controlCorner", "button.radius", CONTROL_NAME], ["fieldCorner", "field.radius", FIELD_NAME]]);
  assert.deepEqual(cloudscape.rows.map((row) => row.name), sys().system.rows.slice(0, 3).map((row) => row.name), "the names of Part S's table");
  assert.deepEqual(cloudscape.rows.map((row) => row.now), [{ value: 36, from: "look", id: null }, { value: 3, from: "look", id: null }, { value: null, from: "look", id: null }]);
  assert.deepEqual(cloudscape.rows[0].beside, { value: 32, eligible: 4, holding: 4 });
  assert.deepEqual([cloudscape.rows[1].beside, cloudscape.rows[2].beside], [null, null]);
  assert.deepEqual(cloudscape.notApplied, [{ claim: "table.bodyRowHeight", reading: { value: 40, eligible: 4, holding: 3 } }, { claim: "nav.itemHeight", reading: { value: 28, eligible: 6, holding: 6 } }]);
  assert.deepEqual(pickOf("mui").rows[0].beside, { value: "mixed", eligible: 5, holding: null }, "mui: the fields are mixed");
  assert.ok(pickMd(pickOf("mui")).includes("| buttons about 40px on 4 of 5 screens; fields no single value on 5 screens |"));
  assert.ok(pickMd(pickOf("patternfly")).includes(`| ${HEIGHT_NAME} | 36px, the brand recipe \`enterprise-workbench\` | 36px, the same; recorded so it stays if the look changes |`), "patternfly: the same height, still an entry");
  assert.ok(pickMd(pickOf("shadcn")).includes(`| ${HEIGHT_NAME} | 36px, the brand recipe \`enterprise-workbench\` | no change | buttons no single value on 2 screens; fields no single value on 2 screens |`));
  assert.ok(pickMd(pickOf("primer")).includes(`| ${FIELD_NAME} | the skin's corner | no change | not measured |`));
});

test("whole documents, exact: cloudscape on enterprise-workbench; govuk on calm-consumer; primer on calm-consumer, touch; antpro over a ledger (WO-20 C, W6)", () => {
  assert.equal(pickMd(pickOf("cloudscape")), [
    "# Starting from AWS Cloudscape",
    "",
    "AWS Cloudscape is one of 7 public design systems StyleSeed measured on 2026-11-16, on 8 of its published demo screens. The readings are StyleSeed's own; StyleSeed is not affiliated with AWS Cloudscape.",
    "Taking it would change two of the three sizes a pick can bring. Nothing was written.",
    "Every reading, screen by screen: https://styleseed-demo.vercel.app/systems#cloudscape",
    "",
    "## What it changes",
    "",
    "| | Now | With AWS Cloudscape | Measured there |",
    "|---|---|---|---|",
    "| Default height of controls (buttons, inputs, selects, tabs) | 36px, the brand recipe `enterprise-workbench` | 32px | buttons about 32px on 8 of 8 screens; fields about 32px on 4 of 4 screens |",
    "| Corner of buttons and the controls that share it | 3px, the brand recipe `enterprise-workbench` | no change unless asked: see \"Optional\" | pills on 8 of 8 screens |",
    "| Corner of inputs, selects, and textareas | the skin's corner | 8px | 8px corners on 4 of 4 screens |",
    "",
    "## What stays",
    "",
    "- Cards, panels, and list rows keep the corners of the brand recipe `enterprise-workbench`; gaps and text sizes stay.",
    "- Table rows (about 40px on 3 of 4 screens there) and menu items (about 28px on 6 of 6 screens) are shown on the page and not recorded: the shipped components cannot draw them from a recorded value yet.",
    "",
    "## To take it",
    "",
    "2 entries, each with approvedBy set to the name the person gives and date to today. Keep `source` as printed.",
    "",
    "### Default height of controls (buttons, inputs, selects, tabs)",
    "",
    jsonBlock({ kind: "decision", axis: "controlHeights", values: [20, 24, 28, 32, 36, 44], statement: "Default controls are 32px tall; at that default the shipped components of this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: buttons about 32px on 8 of 8 screens of AWS Cloudscape (run 2026-11-16; heights rounded to the nearest 4px).", approvedBy: "", date: "", source: "default-height:32; system:cloudscape@2026-11-16#button.height" }),
    "",
    "Append it to .styleseed/decisions.json as D-001.",
    "",
    "### Corner of inputs, selects, and textareas",
    "",
    jsonBlock({ kind: "decision", axis: "fieldRadius", values: [8], statement: "Inputs, selects, and textareas use an 8px corner. Basis: 8px corners on 4 of 4 screens of AWS Cloudscape (run 2026-11-16).", approvedBy: "", date: "", source: "system:cloudscape@2026-11-16#field.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-002.",
    "",
    RESOLVE,
    "",
    "The drift report then reads any control height outside `D-001`'s values as `violates`; where the file is not imported the components keep 36px and it reads 40, 48px so. It does not check the corners.",
    "",
    "## Optional: pill buttons",
    "",
    "The buttons of AWS Cloudscape are pills (on 8 of 8 screens). This project's buttons have 3px corners, and a pick does not change whether buttons are pills. To make them pills too, also record:",
    "",
    jsonBlock({ kind: "decision", axis: "controlRadius", values: [999], statement: "Buttons and the other controls that share their corner are pills. Basis: pills on 8 of 8 screens of AWS Cloudscape (run 2026-11-16).", approvedBy: "", date: "", source: "system:cloudscape@2026-11-16#button.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-003, the next free id; if entries were added since, run the command again.",
    "",
    "Pill buttons beside cards with 4px corners can read as two looks in one product; take this when the person asks for pill buttons.",
    "",
  ].join("\n"));

  assert.equal(pickMd(pickOf("govuk", { recipe: "calm-consumer", page: "dashboard" })), [
    "# Starting from GOV.UK Frontend",
    "",
    "GOV.UK Frontend is one of 7 public design systems StyleSeed measured on 2026-11-16, on 8 of its published demo screens. The readings are StyleSeed's own; StyleSeed is not affiliated with GOV.UK Frontend.",
    "Taking it would change one of the three sizes a pick can bring. Nothing was written.",
    "Every reading, screen by screen: https://styleseed-demo.vercel.app/systems#govuk",
    "",
    "## What it changes",
    "",
    "| | Now | With GOV.UK Frontend | Measured there |",
    "|---|---|---|---|",
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px, the brand recipe `calm-consumer` | 40px, the same; recorded so it stays if the look changes | buttons about 40px on 8 of 8 screens; fields about 40px on 4 of 4 screens |",
    "| Corner of buttons and the controls that share it | pills, the brand recipe `calm-consumer` | no change unless asked: see \"Optional\" | square corners on 8 of 8 screens |",
    "| Corner of inputs, selects, and textareas | the skin's corner | square | square corners on 4 of 4 screens |",
    "",
    "## What stays",
    "",
    "- Cards, panels, and list rows keep the corners of the brand recipe `calm-consumer`; gaps and text sizes stay.",
    "- Table rows (about 48px on 1 of 1 screens there) are shown on the page and not recorded; menu items were not measured there. The shipped components cannot draw either from a recorded value yet.",
    "",
    "## To take it",
    "",
    "2 entries, each with approvedBy set to the name the person gives and date to today. Keep `source` as printed.",
    "",
    "### Default height of controls (buttons, inputs, selects, tabs)",
    "",
    jsonBlock({ kind: "decision", axis: "controlHeights", values: [28, 32, 36, 40, 44, 52], statement: "Default controls are 40px tall; at that default the shipped components of this StyleSeed version draw 28, 32, 36, 40, 44, 52px. Basis: buttons about 40px on 8 of 8 screens of GOV.UK Frontend (run 2026-11-16; heights rounded to the nearest 4px).", approvedBy: "", date: "", source: "default-height:40; system:govuk@2026-11-16#button.height" }),
    "",
    "Append it to .styleseed/decisions.json as D-001.",
    "",
    "### Corner of inputs, selects, and textareas",
    "",
    jsonBlock({ kind: "decision", axis: "fieldRadius", values: [0], statement: "Inputs, selects, and textareas have square corners. Basis: square corners on 4 of 4 screens of GOV.UK Frontend (run 2026-11-16).", approvedBy: "", date: "", source: "system:govuk@2026-11-16#field.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-002.",
    "",
    RESOLVE,
    "",
    "The drift report then reads any control height outside `D-001`'s values as `violates`. It does not check the corners.",
    "",
    "## Optional: buttons that are not pills",
    "",
    "The buttons of GOV.UK Frontend have square corners (on 8 of 8 screens). This project's buttons are pills, and a pick does not change whether buttons are pills. To give them that corner too, also record:",
    "",
    jsonBlock({ kind: "decision", axis: "controlRadius", values: [0], statement: "Buttons and the other controls that share their corner have square corners. Basis: square corners on 8 of 8 screens of GOV.UK Frontend (run 2026-11-16).", approvedBy: "", date: "", source: "system:govuk@2026-11-16#button.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-003, the next free id; if entries were added since, run the command again.",
    "",
  ].join("\n"));

  assert.equal(pickMd(pickOf("primer", { recipe: "calm-consumer", page: "dashboard", surface: "touch" })), [
    "# Starting from GitHub Primer",
    "",
    "GitHub Primer is one of 7 public design systems StyleSeed measured on 2026-11-16, on 3 of its published demo screens. The readings are StyleSeed's own; StyleSeed is not affiliated with GitHub Primer.",
    "Taking it would change none of the three sizes a pick can bring. Nothing was written.",
    "Every reading, screen by screen: https://styleseed-demo.vercel.app/systems#primer",
    "",
    "## What it changes",
    "",
    "| | Now | With GitHub Primer | Measured there |",
    "|---|---|---|---|",
    "| Default height of controls (buttons, inputs, selects, tabs) | 40px, the brand recipe `calm-consumer` | no change | buttons about 32px on 1 of 1 screens; fields not measured; under the 44px floor for touch (rule `CRAFT-control-heights`) |",
    "| Corner of buttons and the controls that share it | pills, the brand recipe `calm-consumer` | no change unless asked: see \"Optional\" | 6px corners on 1 of 1 screens |",
    "| Corner of inputs, selects, and textareas | the skin's corner | no change | not measured |",
    "",
    "## What stays",
    "",
    "- Cards, panels, and list rows keep the corners of the brand recipe `calm-consumer`; gaps and text sizes stay.",
    "- Table rows and menu items were not measured there; the shipped components could not draw them from a recorded value yet.",
    "",
    "## To take it",
    "",
    "Nothing to record: the buttons there are under the 44px floor for touch; the buttons' shape changes only when asked (see \"Optional\"); the fields' corner was not measured there.",
    "",
    "To record a 44px default with the sizes around it: `propose-system.mjs --project-root . --surface touch --default-height 44`.",
    "",
    "## Optional: buttons that are not pills",
    "",
    "The buttons of GitHub Primer have 6px corners (on 1 of 1 screens). This project's buttons are pills, and a pick does not change whether buttons are pills. To give them that corner too, record:",
    "",
    jsonBlock({ kind: "decision", axis: "controlRadius", values: [6], statement: "Buttons and the other controls that share their corner use a 6px corner. Basis: 6px corners on 1 of 1 screens of GitHub Primer (run 2026-11-16).", approvedBy: "", date: "", source: "system:primer@2026-11-16#button.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-001, the next free id; if entries were added since, run the command again.",
    "",
    RESOLVE,
    "",
  ].join("\n"));

  // A look's own default of another look (row H3), a radii decision lacking 6, and a recorded control corner of 8.
  const ledger = [heightOwnDefault(40, "calm-consumer"), { ...corner("D-002", "radii", 2), values: [2, 4, 8] }, corner("D-003", "controlRadius", 8)];
  assert.equal(sys({ decisions: ledger }).system.heightRow, "H3");
  assert.equal(pickMd(pickOf("antpro", { decisions: ledger })), [
    "# Starting from Ant Design Pro",
    "",
    "Ant Design Pro is one of 7 public design systems StyleSeed measured on 2026-11-16, on 10 of its published demo screens. The readings are StyleSeed's own; StyleSeed is not affiliated with Ant Design Pro.",
    "Taking it would change all three sizes a pick can bring. Nothing was written.",
    "Every reading, screen by screen: https://styleseed-demo.vercel.app/systems#antpro",
    "",
    "## What it changes",
    "",
    "| | Now | With Ant Design Pro | Measured there |",
    "|---|---|---|---|",
    "| Default height of controls (buttons, inputs, selects, tabs) | 36px, the brand recipe `enterprise-workbench` | 32px | buttons about 32px on 6 of 7 screens; fields about 32px on 6 of 6 screens |",
    "| Corner of buttons and the controls that share it | 8px, recorded as D-003 | 6px | 6px corners on 6 of 7 screens |",
    "| Corner of inputs, selects, and textareas | the skin's corner | 6px | 6px corners on 5 of 6 screens |",
    "",
    "## What stays",
    "",
    "- Cards, panels, and list rows keep the corners of the brand recipe `enterprise-workbench`; gaps and text sizes stay.",
    "- Table rows (about 48px on 3 of 5 screens there) and menu items (about 40px on 10 of 10 screens) are shown on the page and not recorded: the shipped components cannot draw them from a recorded value yet.",
    "",
    "## To take it",
    "",
    "3 entries, each with approvedBy set to the name the person gives and date to today. Keep `source` as printed.",
    "",
    "### Default height of controls (buttons, inputs, selects, tabs)",
    "",
    jsonBlock({ kind: "decision", axis: "controlHeights", values: [20, 24, 28, 32, 36, 44], statement: "Default controls are 32px tall; at that default the shipped components of this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: buttons about 32px on 6 of 7 screens of Ant Design Pro (run 2026-11-16; heights rounded to the nearest 4px).", approvedBy: "", date: "", source: "default-height:32; system:antpro@2026-11-16#button.height" }),
    "",
    "Put it in .styleseed/decisions.json in place of D-001, keeping the id D-001 (an exception may point at it). `D-001` held 40, 52px, which this entry does not hold; add the ones the product keeps to its values.",
    "",
    "### Corner of buttons and the controls that share it",
    "",
    jsonBlock({ kind: "decision", axis: "controlRadius", values: [6], statement: "Buttons and the other controls that share their corner use a 6px corner. Basis: 6px corners on 6 of 7 screens of Ant Design Pro (run 2026-11-16).", approvedBy: "", date: "", source: "system:antpro@2026-11-16#button.radius" }),
    "",
    "Put it in .styleseed/decisions.json in place of D-003, keeping the id D-003.",
    "",
    "### Corner of inputs, selects, and textareas",
    "",
    jsonBlock({ kind: "decision", axis: "fieldRadius", values: [6], statement: "Inputs, selects, and textareas use a 6px corner. Basis: 6px corners on 5 of 6 screens of Ant Design Pro (run 2026-11-16).", approvedBy: "", date: "", source: "system:antpro@2026-11-16#field.radius" }),
    "",
    "Append it to .styleseed/decisions.json as D-004.",
    "",
    "Every radii decision holds the recorded corners: add 6 to D-002.values before the next resolve, or it refuses the ledger.",
    "",
    RESOLVE,
    "",
    "The drift report then reads any control height outside `D-001`'s values as `violates`; where the file is not imported the components keep 36px and it reads 40, 48px so. It does not check the corners.",
    "",
  ].join("\n"));
});

test("pills both ways: a pick never changes whether buttons are pills unless asked; 20 is not a pill (WO-20 C)", () => {
  const calm = { recipe: "calm-consumer", page: "dashboard" };
  let pick = pickOf("cloudscape", calm);
  assert.deepEqual(rowsOf(pick)[1], ["entry", null, 999], "cloudscape on calm-consumer: both pills, an entry");
  assert.ok(pickMd(pick).includes(`| ${CONTROL_NAME} | pills, the brand recipe \`calm-consumer\` | pills, the same; recorded so it stays if the look changes | pills on 8 of 8 screens |`));
  assert.ok(!pickMd(pick).includes("## Optional"));
  pick = pickOf("govuk", calm);
  assert.deepEqual(rowsOf(pick)[1], ["optional", "stops-being-pill", 0]);
  const pill = [corner("D-001", "controlRadius", 999)];
  pick = pickOf("cloudscape", { decisions: pill });
  assert.deepEqual([pick.rows[1].outcome, pick.rows[1].now, pick.rows[1].entry, pick.rows[1].place], ["same", { value: 999, from: "recorded", id: "D-001" }, null, null]);
  assert.ok(pickMd(pick).includes(`| ${CONTROL_NAME} | pills, recorded as D-001 | no change: already recorded as D-001 | pills on 8 of 8 screens |`));
  pick = pickOf("antpro", { decisions: pill });
  assert.deepEqual([rowsOf(pick)[1], pick.rows[1].place], [["optional", "stops-being-pill", 6], { replace: "D-001" }]);
  const optional = between(pickMd(pick), "## Optional: buttons that are not pills\n\n", "\n\n```json");
  assert.equal(optional, "The buttons of Ant Design Pro have 6px corners (on 6 of 7 screens). This project's buttons are pills, and a pick does not change whether buttons are pills. To give them that corner too, also record:");
  assert.ok(pickMd(pick).endsWith("\n```\n\nPut it in .styleseed/decisions.json in place of D-001, keeping the id D-001.\n"), "a replaced optional entry: the replacing sentence, no caution");
  const twenty = [corner("D-001", "controlRadius", 20)];
  pick = pickOf("cloudscape", { decisions: twenty });
  assert.deepEqual([rowsOf(pick)[1], pick.rows[1].place], [["optional", "becomes-pill", 999], { replace: "D-001" }], "20 is not a pill");
  assert.ok(pickMd(pick).includes("This project's buttons have 20px corners, and a pick does not change whether buttons are pills. To make them pills too, also record:"));
  pick = pickOf("antpro", { decisions: twenty });
  assert.deepEqual([rowsOf(pick)[1], pick.rows[1].place], [["entry", null, 6], { replace: "D-001" }]);
  // Square words: a project whose buttons are square, and one whose cards are square.
  pick = pickOf("cloudscape", { recipe: "public-service", page: "dashboard" });
  assert.ok(pickMd(pick).includes("This project's buttons have square corners, and a pick does not change whether buttons are pills."));
  assert.ok(pickMd(pick).includes("Pill buttons beside square cards can read as two looks in one product; take this when the person asks for pill buttons."));
  assert.ok(pickMd(pickOf("cloudscape", { recipe: null })).includes("Pill buttons beside cards with 10px corners can read"), "no recipe: the :root card corner");
});

test("what is drawn, not what is written: a recorded default the file does not draw is never `now` (WO-20 C, W1)", () => {
  // On enterprise-workbench (36px) a recorded default that is calm-consumer's own 40: the file sets no height.
  const ledger = [heightOwnDefault(40, "calm-consumer")];
  const pick = pickOf("mui", { decisions: ledger });
  assert.deepEqual(pick.rows[0].now, { value: 36, from: "look", id: null });
  assert.deepEqual([pick.rows[0].outcome, pick.rows[0].place, pick.rows[0].dropped], ["entry", { replace: "D-001" }, []], "the 40px family holds every value of D-001");
  assert.ok(pickMd(pick).includes(`| ${HEIGHT_NAME} | 36px, the brand recipe \`enterprise-workbench\` | 40px | buttons about 40px on 4 of 5 screens; fields no single value on 5 screens |`));
  for (const id of SYSTEM_IDS) assert.notEqual(pickOf(id, { decisions: ledger }).rows[0].outcome, "same", id);
  // H4 (no default height) and H2 (this look's own default) are not `now` either; H1 is.
  assert.deepEqual(pickOf("mui", { decisions: [handHeights([36, 40])] }).rows[0].now, { value: 36, from: "look", id: null });
  assert.deepEqual(pickOf("patternfly", { decisions: [heightOwnDefault(36, "enterprise-workbench")] }).rows[0].now, { value: 36, from: "look", id: null });
  assert.equal(pickOf("patternfly", { decisions: [heightOwnDefault(36, "enterprise-workbench")] }).rows[0].outcome, "entry", "the look's own default recorded: the system's 36 is still an entry");
  assert.deepEqual(pickOf("mui", { decisions: [handHeights(familyOf(40), "default-height:40; chosen: 40")] }).rows[0].now, { value: 40, from: "recorded", id: "D-001" });
  assert.equal(pickOf("mui", { decisions: [handHeights(familyOf(40), "default-height:40; chosen: 40")] }).rows[0].outcome, "same");
});

test("touch, on enterprise-workbench: six heights kept under the floor with the 44px line, shadcn mixed without it; corners as on pointer (WO-20 C)", () => {
  const LINE = "To record a 44px default with the sizes around it: `propose-system.mjs --project-root . --surface touch --default-height 44`.";
  for (const id of SYSTEM_IDS) {
    const pick = pickOf(id, { surface: "touch" });
    const pointer = pickOf(id);
    const md = pickMd(pick);
    if (id === "shadcn") assert.deepEqual([rowsOf(pick)[0], md.includes(LINE)], [["kept", "mixed", null], false], id);
    else {
      assert.deepEqual(rowsOf(pick)[0], ["kept", "touch-floor", null], id);
      assert.equal(pick.rows[0].entry, null, id);
      assert.ok(md.includes(`\n\n${LINE}\n`), id);
      assert.ok(md.includes("; under the 44px floor for touch (rule `CRAFT-control-heights`) |"), id);
    }
    assert.deepEqual(rowsOf(pick).slice(1), rowsOf(pointer).slice(1), `${id}: the corners as on pointer`);
    assert.ok(!md.includes("controlHeights"), `${id}: no height entry`);
  }
  // A recorded default of 44 the file draws, and native-mobile, which draws 44: no 44px line.
  const at44 = pickOf("cloudscape", { surface: "touch", decisions: [handHeights(familyOf(44), "default-height:44; chosen: 44")] });
  assert.deepEqual([at44.rows[0].now, at44.rows[0].why], [{ value: 44, from: "recorded", id: "D-001" }, "touch-floor"]);
  assert.ok(!pickMd(at44).includes("--default-height 44"));
  const mobile = pickOf("cloudscape", { surface: "touch", recipe: "native-mobile", page: "dashboard" });
  assert.deepEqual([mobile.rows[0].now.value, mobile.rows[0].why], [44, "touch-floor"]);
  assert.ok(!pickMd(mobile).includes("--default-height 44"));
  // Nothing to record on touch: the reasons, and the line after them.
  const md = pickMd(pickOf("shadcn", { surface: "touch", decisions: [corner("D-001", "controlRadius", 8), corner("D-002", "fieldRadius", 8)] }));
  assert.ok(md.endsWith("## To take it\n\nNothing to record: the buttons' height has no single value there; the buttons' corner is already recorded as D-001; the fields' corner is already recorded as D-002.\n"), md);
  assert.ok(!md.includes("Then resolve") && !md.includes("The drift report"), "the three sentences do not follow");
});

test("entries: exact sources, the token, the limits, and no banned word, for all seven on every look and no recipe, both surfaces (WO-20 C)", () => {
  let entries = 0;
  let documents = 0;
  let longestStatement = 0;
  for (const recipe of LOOKS) for (const surface of ["pointer", "touch"]) for (const id of SYSTEM_IDS) {
    const pick = pickOf(id, { recipe, surface, page: "dashboard" });
    const md = pickMd(pick);
    documents += 1;
    assert.ok(!BANNED.test(md), `${id} ${recipe} ${surface}: ${md.match(BANNED)?.[0]}`);
    assert.ok(!md.includes(`${pick.system.name}'s`), "no possessive of the system's name");
    for (const row of pick.rows) {
      if (!row.entry) continue;
      entries += 1;
      const { entry } = row;
      const source = `system:${id}@2026-11-16#${row.claim}`;
      if (row.what === "height") {
        assert.equal(entry.source, `default-height:${row.reading.value}; ${source}`);
        assert.deepEqual(parseDefaultHeight(entry), { height: row.reading.value, lookDefault: false });
        checkHeightEntry(entry, row.reading.value);
      } else {
        assert.equal(entry.source, source);
        assert.deepEqual(entry.values, [row.reading.value]);
      }
      assert.ok(entry.statement.length <= 300, `${entry.statement.length}: ${entry.statement}`);
      assert.ok(entry.source.length <= 200, entry.source);
      longestStatement = Math.max(longestStatement, entry.statement.length);
      assert.ok(!BANNED.test(entry.statement), entry.statement);
      assert.doesNotThrow(() => normalizeDecisions([named(entry, "D-001")], catalog), JSON.stringify(entry));
      assert.throws(() => normalizeDecisions([{ ...entry, id: "D-001" }], catalog), /D-001\.approvedBy/u, "an empty name does not compile");
    }
  }
  assert.equal(documents, 140, "seven systems, nine brand recipes and no recipe, two surfaces");
  assert.ok(entries > 300, `${entries} entries`);
  assert.ok(longestStatement > 200, `${longestStatement}`);
  // One corner statement whole, with its basis.
  assert.deepEqual(pickOf("mui").rows[2].entry, { kind: "decision", axis: "fieldRadius", values: [8], statement: "Inputs, selects, and textareas use an 8px corner. Basis: 8px corners on 3 of 5 screens of MUI templates (run 2026-11-16).", approvedBy: "", date: "", source: "system:mui@2026-11-16#field.radius" });
});

test("placing: ids in row order from the next id, the optional entry after them, replaced decisions keep their id, dropped values on a height only (WO-20 C, W2, Z2)", () => {
  let pick = pickOf("cloudscape");
  assert.deepEqual(pick.rows.map((row) => row.place), [{ append: "D-001" }, { append: "D-003" }, { append: "D-002" }]);
  assert.deepEqual(pick.rows.map((row) => row.dropped), [null, null, null]);
  assert.deepEqual(pickOf("antpro").rows.map((row) => row.place), [{ append: "D-001" }, { append: "D-002" }, { append: "D-003" }]);
  assert.deepEqual(pickOf("shadcn").rows.map((row) => row.place), [null, { append: "D-001" }, { append: "D-002" }]);

  // D-001 a height, D-002 a field corner, D-003 radii: two replacements, and the optional entry is D-004, not D-003.
  const ledger = [handHeights(familyOf(36), "default-height:36; chosen: 36"), corner("D-002", "fieldRadius", 4), { ...corner("D-003", "radii", 2), values: [2, 4] }];
  pick = pickOf("cloudscape", { decisions: ledger });
  assert.deepEqual(pick.rows.map((row) => [row.outcome, row.place, row.dropped]), [["entry", { replace: "D-001" }, [40, 48]], ["optional", { append: "D-004" }, null], ["entry", { replace: "D-002" }, null]]);
  const md = pickMd(pick);
  assert.ok(md.includes("Put it in .styleseed/decisions.json in place of D-001, keeping the id D-001 (an exception may point at it). `D-001` held 40, 48px, which this entry does not hold; add the ones the product keeps to its values.\n"));
  assert.ok(md.includes("Put it in .styleseed/decisions.json in place of D-002, keeping the id D-002.\n"), "a replaced corner: no exception, no dropped values");
  assert.ok(!md.includes("`D-002` held"));
  assert.ok(md.includes("Append it to .styleseed/decisions.json as D-004, the next free id; if entries were added since, run the command again."));
  assert.ok(md.includes("| Default height of controls (buttons, inputs, selects, tabs) | 36px, recorded as D-001 | 32px |"));
  assert.ok(md.includes(`| ${FIELD_NAME} | 4px, recorded as D-002 | 8px |`));

  // A project-wide controlHeights decision without a default height, and one that is a look's own: replaced, the id kept.
  pick = pickOf("antpro", { decisions: [handHeights([30, 36])] });
  assert.deepEqual([pick.rows[0].place, pick.rows[0].dropped], [{ replace: "D-001" }, [30]]);
  assert.ok(pickMd(pick).includes("keeping the id D-001 (an exception may point at it). `D-001` held 30px, which this entry does not hold;"));
  pick = pickOf("antpro", { decisions: [handHeights([24, 36])] });
  assert.deepEqual([pick.rows[0].place, pick.rows[0].dropped], [{ replace: "D-001" }, []]);
  assert.ok(pickMd(pick).includes("keeping the id D-001 (an exception may point at it).\n"), "nothing dropped: no sentence");
  pick = pickOf("antpro", { decisions: [heightOwnDefault(40, "calm-consumer")] });
  assert.deepEqual([pick.rows[0].place, pick.rows[0].dropped], [{ replace: "D-001" }, [40, 52]]);
  // An exception that points at the height decision stays valid after the replacement.
  const withException = [heightOwnDefault(36, "enterprise-workbench"), { ...heightException }];
  pick = pickOf("antpro", { decisions: withException });
  assert.deepEqual(pick.rows.map((row) => row.place), [{ replace: "D-001" }, { append: "D-003" }, { append: "D-004" }]);
  const placed = withException.map((entry) => (entry.id === "D-001" ? named(pick.rows[0].entry, "D-001") : entry));
  assert.doesNotThrow(() => normalizeDecisions(clone([...placed, ...recordedPick(pick).filter((entry) => entry.id !== "D-001")]), catalog));

  // A second pick of antpro over its own recorded entries: three rows the same, nothing to record.
  const first = pickOf("antpro");
  const again = pickOf("antpro", { decisions: recordedPick(first) });
  assert.deepEqual(again.rows.map((row) => row.outcome), ["same", "same", "same"]);
  assert.ok(pickMd(again).includes("## To take it\n\nNothing to record: the buttons' height is already recorded as D-001; the buttons' corner is already recorded as D-002; the fields' corner is already recorded as D-003.\n"));
  assert.ok(pickMd(again).includes("Taking it would change none of the three sizes a pick can bring."));
  assert.ok(!pickMd(again).includes("Then resolve"));
});

test("radii: project-wide and scoped decisions that lack a picked corner are named with the values to add; the optional value in its own section only (WO-20 C, Z6)", () => {
  const radii = (id, values, screens) => ({ ...corner(id, "radii", values[0]), values, ...(screens ? { scope: { screens } } : {}) });
  let pick = pickOf("antpro", { decisions: [radii("D-001", [2, 3, 4]), radii("D-002", [2, 4], ["orders"]), radii("D-003", [6, 8], ["billing"])] });
  assert.deepEqual(pick.radii, [{ id: "D-001", add: [6] }, { id: "D-002", add: [6] }], "the one that holds 6 is not named");
  assert.deepEqual([pick.rows[1].radii, pick.rows[2].radii], [[{ id: "D-001", add: [6] }, { id: "D-002", add: [6] }], [{ id: "D-001", add: [6] }, { id: "D-002", add: [6] }]]);
  assert.ok(pickMd(pick).includes("\n\nEvery radii decision holds the recorded corners: add 6 to D-001.values, and 6 to D-002.values before the next resolve, or it refuses the ledger.\n\n"));
  // Two corners of different values on one decision.
  pick = pickOf("govuk", { decisions: [radii("D-001", [2, 4])] });
  assert.deepEqual(pick.radii, [{ id: "D-001", add: [0] }]);
  pick = pickOf("mui", { decisions: [radii("D-001", [2, 4])], recipe: "developer-platform" });
  assert.deepEqual(pick.radii, [{ id: "D-001", add: [8] }]);
  const both = pickOf("antpro", { decisions: [corner("D-001", "fieldRadius", 4), radii("D-002", [2, 4])] });
  assert.deepEqual(both.radii, [{ id: "D-002", add: [6] }]);
  // cloudscape: the field corner's 8 under "To take it", the optional 999 in its own section only.
  pick = pickOf("cloudscape", { decisions: [radii("D-001", [2, 3, 4])] });
  assert.deepEqual([pick.radii, pick.rows[1].radii], [[{ id: "D-001", add: [8] }], [{ id: "D-001", add: [999] }]]);
  const md = pickMd(pick);
  const take = between(md, "## To take it\n", "## Optional");
  assert.ok(take.includes("Every radii decision holds the recorded corners: add 8 to D-001.values before the next resolve, or it refuses the ledger.") && !take.includes("999 to"), take);
  assert.ok(md.slice(md.indexOf("## Optional")).includes("\n\nEvery radii decision holds the recorded corners: add 999 to D-001.values before the next resolve, or it refuses the ledger.\n\nPill buttons beside"), "after the placing sentence, before the caution");
  // The optional value already added by the edits above: no second sentence (Z6).
  pick = pickOf("antpro", { recipe: "calm-consumer", page: "dashboard", decisions: [radii("D-001", [12, 20])] });
  assert.deepEqual([pick.rows[1].outcome, pick.rows[1].radii, pick.radii], ["optional", [{ id: "D-001", add: [6] }], [{ id: "D-001", add: [6] }]]);
  assert.equal(pickMd(pick).split("Every radii decision").length, 2, "one radii sentence");
  // A radii exception does not count, and a radii decision that holds the corner is not named.
  assert.deepEqual(pickOf("antpro", { decisions: [radii("D-001", [2, 4, 6])] }).radii, []);
});

test("it holds: the printed entries, named and placed with the radii edits, resolve and system.css draws them; without the edits the resolve refuses (WO-20 C, Z9)", () => {
  const root = lockProject("ss-like-holds-");
  try {
    const ledgerPath = join(root, ".styleseed/decisions.json");
    const ledger = (entries) => writeFileSync(ledgerPath, `${JSON.stringify(entries, null, 2)}\n`);
    const resolveIt = () => spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" });
    const radiiD1 = { ...corner("D-001", "radii", 2), values: [2, 4] };
    const take = (id, { optional = false } = {}) => {
      ledger([radiiD1]);
      const result = cli(root, ["--project-root", ".", "--surface", "pointer", "--like", id, "--json"]);
      assert.equal(result.status, 0, result.stderr);
      const pick = JSON.parse(result.stdout);
      const entries = recordedPick(pick, { optional });
      const adds = [...pick.radii.flatMap((item) => item.add), ...(optional ? pick.rows.find((row) => row.outcome === "optional").radii.flatMap((item) => item.add) : [])];
      return { pick, entries, adds };
    };

    let { pick, entries, adds } = take("antpro");
    assert.deepEqual(entries.map((entry) => [entry.id, entry.axis]), [["D-002", "controlHeights"], ["D-003", "controlRadius"], ["D-004", "fieldRadius"]]);
    assert.deepEqual(pick.radii, [{ id: "D-001", add: [6] }]);
    ledger([radiiD1, ...entries]);
    let result = resolveIt();
    assert.equal(result.status, 1, "without the radii edits the resolve refuses");
    assert.ok(result.stderr.includes(".styleseed/decisions.json: D-001 decides radii 2, 4 without 6, the control corner recorded as D-003; and without 6, the field corner recorded as D-004; add 6 to D-001.values. Every radii decision, scoped or not, holds the recorded corners; an exception on radii does not count"), result.stderr);
    ledger([{ ...radiiD1, values: numericSet([...radiiD1.values, ...adds]) }, ...entries]);
    result = resolveIt();
    assert.equal(result.status, 0, result.stderr);
    let css = readFileSync(join(root, ".styleseed/system.css"), "utf8");
    for (const line of ["  --ss-control-height: 32px; /* D-002 */", "  --ss-control-radius: 6px; /* D-003 */", "  --ss-field-radius: 6px; /* D-004 */"]) assert.ok(css.includes(`${line}\n`), `${line}\n${css}`);

    ({ pick, entries, adds } = take("cloudscape", { optional: true }));
    assert.deepEqual(entries.map((entry) => [entry.id, entry.axis]), [["D-002", "controlHeights"], ["D-004", "controlRadius"], ["D-003", "fieldRadius"]], "rows in order; the optional entry takes the id after the others");
    assert.deepEqual(numericSet(adds), [8, 999], "the edits add 8 and 999");
    ledger([radiiD1, ...entries]);
    assert.equal(resolveIt().status, 1, "without the radii edits the resolve refuses");
    ledger([{ ...radiiD1, values: numericSet([...radiiD1.values, ...adds]) }, ...entries]);
    result = resolveIt();
    assert.equal(result.status, 0, result.stderr);
    css = readFileSync(join(root, ".styleseed/system.css"), "utf8");
    for (const line of ["  --ss-control-height: 32px; /* D-002 */", "  --ss-control-radius: 999px; /* D-004 */", "  --ss-field-radius: 8px; /* D-003 */"]) assert.ok(css.includes(`${line}\n`), `${line}\n${css}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
const numericSet = (values) => [...new Set(values)].sort((a, b) => a - b);

test("the command: each refusal exact, the registry sentence before --artifact is read, --json is what the document is rendered from, the usage (WO-20 C, Z4)", () => {
  const root = lockProject("ss-like-cli-");
  const registryRoot = mkdtempSync(join(tmpdir(), "ss-like-registry-"));
  try {
    const run = (...args) => cli(root, ["--project-root", ".", "--surface", "pointer", ...args]);
    const before = files(root);
    for (const [args, flag] of [[["--write"], "--write"], [["--entry", "controlRadius=8"], "--entry"], [["--default-height", "32"], "--default-height"], [["--engine-defaults"], "--engine-defaults"], [["--reference", "ref-a"], "--reference"], [["--own", OWN_PATH], "--own"], [["--write", "--json"], "--write"]]) {
      const result = run("--like", "antpro", ...args);
      assert.equal(result.status, 1, args.join(" "));
      assert.equal(result.stderr, `--like does not take ${flag}: a pick reads only the project, --surface, and --page.\n`, args.join(" "));
      assert.equal(result.stdout, "");
    }
    let result = run("--like", "carbon");
    assert.deepEqual([result.status, result.stderr, result.stdout], [1, "--like carbon: not one of the measured systems (cloudscape, patternfly, antpro, shadcn, primer, mui, govuk); see https://styleseed-demo.vercel.app/systems.\n", ""]);
    result = run("--like", "antpro", "--artifact", "app-settings");
    assert.deepEqual([result.status, result.stderr], [1, "--like does not take --artifact: a project set up with a lock has no artifacts.\n"]);
    assert.equal(run("--like", "antpro", "--like", "govuk").stderr, "--like: pass one system\n");
    assert.match(run("--like").stderr, /^--like needs a value/u);
    assert.match(cli(root, ["--help"]).stdout, /\n {7}propose-system\.mjs --project-root <dir> --surface pointer\|touch \[--page <id>\] --like <system> \[--json\]\n/u, "the usage names the flag");
    assert.match(cli(root, ["--help"]).stdout, /\[same inputs\] --default-height <px>\n/u, "the line before it stays");

    // --json is the object the document is rendered from; neither writes a file.
    result = run("--like", "cloudscape", "--json");
    assert.equal(result.status, 0, result.stderr);
    const pick = JSON.parse(result.stdout);
    const md = run("--like", "cloudscape");
    assert.equal(md.status, 0, md.stderr);
    assert.equal(md.stderr, "");
    assert.equal(md.stdout, renderPickMarkdown(pick, { ledgerAt: ".styleseed/decisions.json", command: "propose-system.mjs --project-root . --surface pointer" }));
    assert.deepEqual(pick, JSON.parse(JSON.stringify(pickOf("cloudscape"))), "the pick of the same project, made in the test");
    const withPage = cli(root, ["--project-root", ".", "--surface", "touch", "--page", "dashboard", "--like", "cloudscape"]);
    assert.ok(withPage.stdout.includes("To record a 44px default with the sizes around it: `propose-system.mjs --project-root . --page dashboard --surface touch --default-height 44`."), withPage.stdout);
    assert.deepEqual(files(root), before, "--like writes nothing");

    // A registry with two artifacts: the registry sentence, with and without --artifact, before --artifact is asked for.
    mkdirSync(join(registryRoot, ".styleseed/artifacts"), { recursive: true });
    mkdirSync(join(registryRoot, "src"), { recursive: true });
    writeFileSync(join(registryRoot, ".styleseed/project.json"), `${JSON.stringify({
      schemaVersion: 1, projectId: "like-registry",
      defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
      brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first" },
    }, null, 2)}\n`);
    const artifact = (id, page) => ({
      schemaVersion: 1, id, target: { kind: "route", locator: `/${id}` },
      selection: { grammar: "operations-console", adapter: null, domain: null, page, recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: "Which setting needs a change?", primaryAction: "Save settings", signatureMove: "Keep the form stable." },
      implementation: { sourceRoots: ["src"], tokenFiles: [] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    });
    writeFileSync(join(registryRoot, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-settings", config: "app-settings.json" }, { id: "app-list", config: "app-list.json" }] }, null, 2)}\n`);
    writeFileSync(join(registryRoot, ".styleseed/artifacts/app-settings.json"), `${JSON.stringify(artifact("app-settings", "settings"), null, 2)}\n`);
    writeFileSync(join(registryRoot, ".styleseed/artifacts/app-list.json"), `${JSON.stringify(artifact("app-list", "list"), null, 2)}\n`);
    assert.equal(spawnSync(process.execPath, [resolver, "--project-root", registryRoot, "--all"], { encoding: "utf8" }).status, 0);
    const REGISTRY = "`--like` works in a project set up with a lock (`STYLESEED.md`): a registry project does not draw a recorded height or corner.\n";
    for (const extra of [[], ["--artifact", "app-settings"]]) {
      result = cli(registryRoot, ["--project-root", ".", "--surface", "pointer", "--like", "antpro", ...extra]);
      assert.deepEqual([result.status, result.stderr, result.stdout], [1, REGISTRY, ""], extra.join(" "));
    }
    assert.match(cli(registryRoot, ["--project-root", ".", "--surface", "pointer"]).stderr, /pass --artifact <id>/u, "without --like the registry asks for --artifact");
    assert.throws(() => proposePick({ ...pickInput(), project: { ...pickInput().project, mode: "registry" } }, measured, "antpro"), (error) => `${error.message}\n` === REGISTRY);
    assert.throws(() => pickOf("carbon"), /--like carbon: not one of the measured systems/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(registryRoot, { recursive: true, force: true });
  }
});

test("the count: only entries whose value differs from what is drawn; a field corner over the skin's counts (WO-20 C, Z1)", () => {
  let pick = pickOf("govuk", { recipe: "calm-consumer", page: "dashboard" });
  assert.deepEqual(rowsOf(pick), [["entry", null, 40], ["optional", "stops-being-pill", 0], ["entry", null, 0]]);
  assert.ok(pickMd(pick).includes("\nTaking it would change one of the three sizes a pick can bring. Nothing was written.\n"));
  pick = pickOf("patternfly");
  assert.deepEqual(rowsOf(pick)[0], ["entry", null, 36]);
  assert.ok(pickMd(pick).includes("\nTaking it would change one of the three sizes a pick can bring. Nothing was written.\n"));
  assert.ok(pickMd(pickOf("antpro")).includes("\nTaking it would change all three sizes a pick can bring. Nothing was written.\n"));
  assert.ok(pickMd(pickOf("shadcn")).includes("\nTaking it would change two of the three sizes a pick can bring. Nothing was written.\n"));
  for (const id of SYSTEM_IDS) assert.ok(!/would change [0-9]/u.test(pickMd(pickOf(id))), `${id}: the count in words`);
  assert.ok(pickMd(pickOf("primer", { surface: "touch" })).includes("\nTaking it would change one of the three sizes a pick can bring."), "primer on touch: the control corner alone");
});

test("Part S names the system a recorded value was taken from, only for the exact source, a date, this row's claim, and the reading (WO-20 C5, W3)", () => {
  const SENTENCE = " From StyleSeed's reading of Ant Design Pro, run 2026-11-16 (https://styleseed-demo.vercel.app/systems#antpro).";
  const taken = recordedPick(pickOf("antpro"));
  let p = proposeSystem(pickInput({ decisions: taken }));
  assert.equal(p.system.heightRow, "H1");
  assert.deepEqual(p.system.rows.slice(0, 3).map((row) => row.from), [
    `${SYSTEM_CSS_DRAWS("D-001", "the brand recipe's 36px")}${SENTENCE}`,
    `${SYSTEM_CSS_DRAWS("D-002", "the brand recipe's 3px")}${SENTENCE}`,
    `${SYSTEM_CSS_DRAWS("D-003", "the skin's corner")}${SENTENCE}`,
  ]);
  assert.ok(mdOf(p).includes(`| Corner of inputs, selects, and textareas | 6px | ${SYSTEM_CSS_DRAWS("D-003", "the skin's corner")}${SENTENCE} |`));
  assert.ok(!BANNED.test(mdOf(p)));
  // Without the file, the same ledger gives today's rows.
  const without = proposeSystem(pickInput({ decisions: taken, withMeasured: false }));
  assert.deepEqual(without.system.rows.slice(0, 3).map((row) => row.from), [SYSTEM_CSS_DRAWS("D-001", "the brand recipe's 36px"), SYSTEM_CSS_DRAWS("D-002", "the brand recipe's 3px"), SYSTEM_CSS_DRAWS("D-003", "the skin's corner")]);
  assert.equal(JSON.stringify(proposeSystem(pickInput({ decisions: taken })).axes), JSON.stringify(without.axes), "only the rows' text differs");

  const fromOf = (decisions, key) => proposeSystem(pickInput({ decisions })).system.rows.find((row) => row.key === key).from;
  const control = (value, source) => ({ ...corner("D-001", "controlRadius", value), source });
  for (const [label, entry] of [
    ["a run that is not a date", control(6, "system:antpro@latest#button.radius")],
    ["typed text as the run", control(6, "system:antpro@by our design panel#button.radius")],
    ["an unknown id", control(6, "system:carbon@2026-11-16#button.radius")],
    ["another row's claim", control(6, "system:antpro@2026-11-16#field.radius")],
    ["a value edited by hand", control(7, "system:antpro@2026-11-16#button.radius")],
    ["a prefix", control(6, "x system:antpro@2026-11-16#button.radius")],
    ["no source", corner("D-001", "controlRadius", 6)],
  ]) {
    const from = fromOf([entry], "controlRadius");
    assert.ok(!from.includes("From StyleSeed"), `${label}: ${from}`);
    assert.ok(!from.includes("panel") && !from.includes("carbon"), label);
  }
  assert.ok(fromOf([control(7, "system:antpro@2026-11-12#button.radius")], "controlRadius").endsWith(" From StyleSeed's reading of Ant Design Pro, run 2026-11-12 (https://styleseed-demo.vercel.app/systems#antpro)."), "another run: the run it names, the value not compared");
  assert.ok(fromOf([{ ...corner("D-001", "fieldRadius", 8), source: "system:cloudscape@2026-11-16#field.radius" }], "fieldRadius").endsWith(" From StyleSeed's reading of AWS Cloudscape, run 2026-11-16 (https://styleseed-demo.vercel.app/systems#cloudscape)."));
  // The height: H1 only.
  const h1 = handHeights(familyOf(32), "default-height:32; system:antpro@2026-11-16#button.height");
  assert.ok(fromOf([h1], "controlHeight").endsWith(SENTENCE));
  assert.ok(!fromOf([handHeights(familyOf(36), "default-height:36; system:antpro@2026-11-16#button.height")], "controlHeight").includes("From StyleSeed"), "a height edited by hand");
  const h4 = handHeights([32], "system:antpro@2026-11-16#button.height");
  assert.equal(proposeSystem(pickInput({ decisions: [h4] })).system.heightRow, "H4");
  assert.ok(!fromOf([h4], "controlHeight").includes("From StyleSeed"), "a height row that is not H1");
  const h4token = handHeights(familyOf(32), "default-height:30; system:antpro@2026-11-16#button.height");
  assert.ok(!fromOf([h4token], "controlHeight").includes("From StyleSeed"), "a token the values do not hold: H4");

  // With the file and no such entry, the proposal is today's, object and Markdown.
  for (const recipe of [...LOOKS, "unknown-recipe"]) for (const surface of ["pointer", "touch"]) for (const decisions of [[], [recorded(printedHeight(32))], [corner("D-001", "controlRadius", 999), corner("D-002", "fieldRadius", 8)], [handHeights([32, 36])]]) {
    const withFile = proposeSystem(pickInput({ recipe, surface, decisions }));
    const plain = proposeSystem(pickInput({ recipe, surface, decisions, withMeasured: false }));
    assert.equal(JSON.stringify(withFile), JSON.stringify(plain), `${recipe} ${surface}`);
    assert.equal(mdOf(withFile), mdOf(plain));
  }
});

test("the corner builder: without a basis it is the --entry entry; with one, the statement and source as given; the bounds (WO-20 C2)", () => {
  const proposal = sys();
  for (const axis of ["controlRadius", "fieldRadius"]) for (const value of [0, 8, 999]) assert.deepEqual(cornerEntry(axis, value), entryForValues(proposal, axis, [value]), `${axis} ${value}`);
  assert.deepEqual(cornerEntry("fieldRadius", 8, { basis: { words: "8px corners on 4 of 4 screens of Example System (run 2026-11-16)", source: "system:example-system@2026-11-16#field.radius" } }), { kind: "decision", axis: "fieldRadius", values: [8], statement: "Inputs, selects, and textareas use an 8px corner. Basis: 8px corners on 4 of 4 screens of Example System (run 2026-11-16).", approvedBy: "", date: "", source: "system:example-system@2026-11-16#field.radius" });
  assert.throws(() => cornerEntry("controlRadius", 8, { basis: { words: "x" } }), /corner basis: pass \{words, source\}, each one line of text/u);
  assert.throws(() => cornerEntry("controlRadius", 8, { basis: { words: "two\nlines", source: "s" } }), /corner basis: pass \{words, source\}/u);
  assert.throws(() => cornerEntry("controlRadius", 8, { basis: { words: "w".repeat(260), source: "s" } }), /corner basis: the statement is \d+ characters; a ledger statement holds at most 300/u);
  assert.throws(() => cornerEntry("controlRadius", 250), /--entry controlRadius: give exactly one whole number from 0 to 200, or 999 for a pill/u);
  assert.throws(() => cornerEntry("radii", 8), /corner entry: radii is not a corner axis \(controlRadius, fieldRadius\)/u);
});

test("the texts of a pick: proposals.md, decisions.md, and the resolve workflow name it; setup and ss-tokens do not yet (WO-20 C6)", () => {
  const flat = (text) => text.replace(/\s+/gu, " ");
  const proposals = doc("ss-resolve/references/proposals.md");
  assert.ok(proposals.indexOf("\n## The system first\n") < proposals.indexOf("\n## A pick from a measured system\n") && proposals.indexOf("\n## A pick from a measured system\n") < proposals.indexOf("\n## Basis order\n"), "the new section follows \"The system first\"");
  const pickSection = section(proposals, "## A pick from a measured system");
  for (const words of ["--like <system>", "Nothing is written", "table row height and menu item height", "never changes whether buttons are pills unless the person asks", "never mixed in one sentence", "a registry project does not draw a recorded height or corner", "`--engine-defaults`, `--reference`, `--own`, and `--artifact`"]) assert.ok(flat(pickSection).includes(words), words);
  assert.ok(!BANNED.test(pickSection), pickSection.match(BANNED)?.[0]);
  assert.ok(flat(proposals).includes("It holds no per-system value and nothing from the measured pages' text. The readings of the systems of the page are in a second file, `measured-systems.json`, written by the page's generator; `--like` reads it."));
  assert.ok(flat(proposals).includes("`--like` hands it a basis of its own") && !proposals.includes("later caller"));
  assert.ok(!flat(proposals).includes("the tool never proposes"), "line 163 corrected");
  assert.ok(flat(doc("ss-resolve/references/decisions.md")).includes("An entry from `propose-system.mjs --like` reads `system:<id>@<run>#<claim>`"));
  const resolveWorkflow = doc("ss-resolve/WORKFLOW.md");
  const proposing = resolveWorkflow.slice(resolveWorkflow.indexOf("To propose the values a person may record"), resolveWorkflow.indexOf("\n\n", resolveWorkflow.indexOf("To propose the values a person may record")));
  assert.ok(flat(proposing).includes("With `--like <system>` it prints, for one of the design systems on the page of measured systems, what taking it would change"), proposing);
  assert.ok(!resolveWorkflow.includes("--entry"), "the workflow names no --entry");
  const setup = doc("ss-setup/WORKFLOW.md");
  for (const [name, text] of [["ss-setup 9a", section(setup, "### 9a. Propose the system values and record what the person decides")], ["ss-tokens propose", section(doc("ss-tokens/WORKFLOW.md"), "### `propose` — sizes, radii, and spacing with their basis")]]) assert.ok(!text.includes("--like") && !text.includes("measured-systems"), `${name}: setup does not offer a pick until Part D`);
});
