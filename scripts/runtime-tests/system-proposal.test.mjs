import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PAGE_ROWS, PROPOSAL_AXES, PROPOSAL_RULE, TOUCH_FLOOR, defaultHeightEntry, engineDefault, engineDefaultsTable, entryForValues, normalizeEngineDefaults, normalizeEvidencePack, normalizeInventory,
  ownScreens, proposeSystem, referenceValues, renderEngineDefaultsMarkdown, renderProposalMarkdown, rowStatus, selectRow,
} from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs";
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
const NOT_DRAWN_32 = "Recorded, not drawn: this version does not draw a recorded default height. The components keep the brand recipe's 36px, and the drift report reads 40, 48px as `violates` until it is drawn.\n";
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
    assert.equal(result.stderr, `${NOT_DRAWN_32}${APPEND_HEIGHT}`);
    result = run("--default-height", "36");
    assert.equal(JSON.parse(result.stdout).source, "default-height:36; engine-default:recipe.enterprise-workbench (not measured)");
    assert.equal(result.stderr, APPEND_HEIGHT, "the recipe's own height: no sentence about drawing");
    assert.ok(run("--default-height", "40").stderr.startsWith("Recorded, not drawn: this version does not draw a recorded default height. The components keep the brand recipe's 36px, and the drift report reads 24, 48px as `violates` until it is drawn.\n"));
    result = cli(root, ["--project-root", ".", "--surface", "touch", "--default-height", "32"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).source, "default-height:32; chosen: 32", "no corpus basis on touch");
    assert.equal(result.stderr, `Floor: rule \`CRAFT-control-heights\` says "Touch surfaces provide at least 44px targets". This entry's default is 32px; its sizes under the floor are 20, 24, 28, 32, 36px. The entry is printed: a recorded decision outranks a default rule.\n${NOT_DRAWN_32}${APPEND_HEIGHT}`);
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
    assert.equal(result.stderr, `Recorded, not drawn: this version does not draw a recorded default height. The components keep the default 40px, and the drift report reads 40, 52px as \`violates\` until it is drawn.\n${APPEND_HEIGHT}`);
    assert.ok(run("--default-height", "36").stderr.startsWith("Recorded, not drawn: this version does not draw a recorded default height. The components keep the default 40px, and the drift report reads 44, 52px as `violates` until it is drawn.\n"));
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
      NOT_DRAWN_32.trimEnd(),
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
  const parts = {
    "proposals.md": doc("ss-resolve/references/proposals.md"),
    "ss-setup 9a": section(setup, "### 9a. Propose the system values and record what the person decides"),
    "ss-tokens propose": section(doc("ss-tokens/WORKFLOW.md"), "### `propose` — sizes, radii, and spacing with their basis"),
    "decisions: Proposed with a basis": section(doc("ss-resolve/references/decisions.md"), "## Proposed with a basis"),
    "decisions: A project without a registry": section(doc("ss-resolve/references/decisions.md"), "## A project without a registry"),
  };
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
