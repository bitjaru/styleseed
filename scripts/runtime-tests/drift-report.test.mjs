import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { compareScreens, baselineFromRoles, renderDriftMarkdown, colorDistance, screenValues } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { parseArgs, labelFor, withState, planScreens, gateFailure } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";
import { normalizeDecisions } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";

const observation = (over = {}) => ({
  viewport: { width: 1440, height: 900 }, elements: 400, truncated: false,
  actions: { "bg:rgb(15, 118, 110)": 6, "text:rgb(15, 118, 110)": 2, "bg:rgb(255, 255, 255)": 3 },
  actionText: {}, links: { "rgb(15, 118, 110)": 14, "rgb(9, 12, 11)": 20 },
  text: { "rgb(9, 12, 11)": 120, "rgb(77, 81, 80)": 40 }, headings: { "rgb(9, 12, 11)": 9 },
  surfaces: { "rgb(37, 99, 235)": 4, "rgb(250, 253, 253)": 30, "rgb(239, 245, 244)": 12 },
  spacing: { 8: 60, 16: 80, 24: 40, 32: 20, 12: 3, 48: 10 },
  type: { "14|400|20": 90, "16|400|24": 60, "24|700|32": 12, "36|700|44": 4, "11|400|16": 1 },
  radii: { 4: 30, 12: 10, 999: 2 }, controlHeights: { 40: 9 }, fonts: { Pretendard: 170 }, shadows: {}, borders: {},
  body: { color: "rgb(9, 12, 11)", background: "rgb(239, 245, 244)", fontFamily: "Pretendard", fontSize: 16 },
  ...over,
});
const screen = (label, over) => ({ label, url: `https://example.test/${label}`, summary: summarize(observation(over)) });

test("majority baseline: the odd screen out is the one reported, with the values that differ", () => {
  const report = compareScreens([
    screen("home"),
    screen("settings"),
    screen("billing", {
      actions: { "bg:rgb(37, 99, 235)": 6 }, links: { "rgb(37, 99, 235)": 3 },
      type: { "14|400|20": 90, "16|400|24": 60, "24|700|32": 12, "15|400|22": 30 },
      radii: { 4: 30, 10: 20 }, controlHeights: { 40: 6, 48: 4 },
      spacing: { 8: 60, 16: 80, 24: 40, 32: 20, 12: 20, 48: 10 },
    }),
  ]);
  assert.equal(report.baseline.source, "majority across screens");
  assert.equal(report.baseline.values.accent, "#0f766e");
  assert.equal(report.baseline.values.spacingBase, 8);
  assert.deepEqual(report.axes.accent.deviating, ["billing"]);
  assert.deepEqual(report.axes.ink.deviating, []);
  assert.deepEqual(report.axes.typeSizes.deviating, ["billing"]);
  assert.deepEqual(report.axes.typeSizes.screens[2].extra, [15]);
  assert.deepEqual(report.axes.radii.screens[2].extra, [10]);
  assert.deepEqual(report.axes.controlHeights.screens[2].extra, [48]);
  assert.deepEqual(report.screensWithDrift, ["billing"]);
  assert.match(report.verdict, /^1 of 3 screens drift from the baseline on accent \(billing\)\./u);
  assert.match(report.verdict, /type sizes \(billing\); radii \(billing\)/u);
  const md = renderDriftMarkdown(report, { observedAt: "2026-11-05", browser: "test-browser", baselineSource: "majority across screens", states: [] });
  assert.ok(md.includes("| accent | #0f766e | #0f766e | #0f766e | #2563eb (different) |"), md);
  assert.ok(md.includes("| radii | 4, 12, 999 | 4, 12, 999 | 4, 12, 999 | 4, 10 (+10) |"), md);
  assert.ok(md.includes("- billing: 12"), `off-scale spacing is listed per screen\n${md}`);
});

test("registry baseline: near shades pass, a missing accent is called out instead of counted as drift", () => {
  const baseline = baselineFromRoles({ primary: "#0F766E", foreground: "#090C0B", background: "#EFF5F4", primaryForeground: "#FAFCFC" });
  assert.deepEqual(baseline, { accent: "#0f766e", ink: "#090c0b", canvas: "#eff5f4" });
  const report = compareScreens([
    screen("home"),
    screen("hover", { actions: { "bg:rgb(20, 122, 114)": 6 } }),
    screen("settings-rest", { actions: {}, links: { "rgb(9, 12, 11)": 20 } }),
  ], { baseline });
  assert.equal(report.baseline.source, "registry roles for colours, majority across screens for the rest");
  assert.equal(report.axes.accent.screens[1].status, "near");
  assert.equal(report.axes.accent.screens[2].status, "none");
  assert.deepEqual(report.axes.accent.missing, ["settings-rest"]);
  assert.deepEqual(report.screensWithDrift, []);
  assert.match(report.verdict, /^All 3 screens agree with the baseline/u);
  assert.match(report.verdict, /No accent was derived on settings-rest; .*--states/u);
  assert.ok(colorDistance("#0f766e", "rgb(20, 122, 114)") < 24);
  assert.equal(screenValues(summarize(observation())).typeSizes.join(","), "14,16,24,36");
});

test("state variants count on the accent only; their text and spacing describe the state", () => {
  const report = compareScreens([
    screen("settings", { actions: {}, links: { "rgb(9, 12, 11)": 20 } }),
    { label: "settings?state=error", url: "https://example.test/settings?state=error", state: "error",
      summary: summarize(observation({ text: { "rgb(77, 81, 80)": 40, "rgb(9, 12, 11)": 10 }, spacing: { 4: 50, 12: 30, 8: 10 } })) },
    { label: "settings?state=empty", url: "https://example.test/settings?state=empty", state: "empty",
      summary: summarize(observation({ actions: { "bg:rgb(37, 99, 235)": 4 } })) },
  ], { baseline: baselineFromRoles({ primary: "#0F766E", foreground: "#090C0B", background: "#EFF5F4" }) });
  assert.equal(report.axes.ink.screens[1].status, "different", "the state row still shows its measured status");
  assert.deepEqual(report.axes.ink.deviating, [], "but it does not count as ink drift");
  assert.deepEqual(report.axes.spacingBase.deviating, []);
  assert.deepEqual(report.axes.accent.deviating, ["settings?state=empty"], "a wrong accent inside a state is real drift");
  assert.deepEqual(report.screensWithDrift, ["settings?state=empty"]);
  assert.ok(renderDriftMarkdown(report).includes("| accent | #0f766e | none | #0f766e | #2563eb (different) |"), renderDriftMarkdown(report));
  assert.deepEqual(report.accentOnlyInState, ["settings"]);
  assert.match(report.verdict, /On settings the primary action appears only in a state/u);
  assert.doesNotMatch(report.verdict, /re-measure with --states/u);
});

test("drift CLI: argument parsing, default labels, and state variants", () => {
  const args = parseArgs(["https://a.test/", "file:///tmp/site/settings.html", "--out", "out", "--states", "error, empty", "--project-root", "."]);
  assert.deepEqual(args.states, ["error", "empty"]);
  assert.deepEqual(planScreens(args).map(p => p.label), [
    "a.test", "a.test?state=error", "a.test?state=empty",
    "settings", "settings?state=error", "settings?state=empty",
  ]);
  assert.equal(planScreens(args)[1].url, "https://a.test/?state=error");
  assert.equal(withState("https://a.test/x?tab=1", "error"), "https://a.test/x?tab=1&state=error");
  assert.equal(labelFor("https://a.test/billing/history/"), "billing-history");
  assert.equal(labelFor("file:///tmp/site/index.html"), "index");
  assert.deepEqual(planScreens(parseArgs(["https://a.test/x", "--out", "o", "--labels", "home"])).map(p => p.label), ["home"]);
  assert.throws(() => parseArgs(["ftp://x.test/", "--out", "o"]), /http\(s\) or file/u);
  assert.throws(() => parseArgs(["https://a.test/", "--out", "o", "--labels", "a,b"]), /labels/u);
  assert.throws(() => parseArgs(["https://a.test/"]), /--out/u);
  assert.equal(parseArgs(["https://a.test/", "--out", "o", "--gate"]).gate, true);
  assert.equal(parseArgs(["https://a.test/", "--out", "o"]).gate, false);
  assert.equal(parseArgs(["https://a.test/", "--out", "o", "--structure"]).structure, true);
  assert.equal(parseArgs(["https://a.test/", "--out", "o"]).structure, false);
});

test("drift --scroll: parses, default off; the markdown says so only when meta.scroll is set", () => {
  assert.equal(parseArgs(["https://a.test/", "--out", "o"]).scroll, false);
  assert.equal(parseArgs(["https://a.test/", "--out", "o", "--scroll"]).scroll, true);
  const report = compareScreens([screen("home"), screen("settings")]);
  const meta = { observedAt: "2026-11-11", browser: "test-browser", baselineSource: "majority across screens", states: [] };
  const sentence = "Each page was scrolled to the bottom and back inside its one load before it was measured.";
  const plain = renderDriftMarkdown(report, meta);
  assert.ok(!plain.includes(sentence), plain);
  assert.match(plain, /at 1440×900 and 390×844\.\nBaseline:/u);
  const scrolled = renderDriftMarkdown(report, { ...meta, scroll: true });
  assert.ok(scrolled.includes(`at 1440×900 and 390×844. ${sentence}\nBaseline:`), scrolled);
  assert.equal(scrolled.replace(` ${sentence}`, ""), plain, "the sentence is the only difference");
});

test("drift: a backdrop led by the body colour leaves the comparison unchanged", () => {
  const led = { "rgb(239, 245, 244)": 0.9, "rgb(250, 253, 253)": 0.1 };
  const screens = (backdrop) => [
    screen("home", backdrop ? { backdrop } : {}),
    screen("settings", backdrop ? { backdrop } : {}),
    screen("billing", { actions: { "bg:rgb(37, 99, 235)": 6 }, ...(backdrop ? { backdrop } : {}) }),
  ];
  const withKey = compareScreens(screens(led));
  const without = compareScreens(screens(null));
  assert.equal(JSON.stringify(withKey), JSON.stringify(without));
  assert.equal(withKey.axes.canvas.baseline, "#eff5f4");
});

// Structure-axis decisions (the ledger's six structure axes). A minimal structure probe output per
// screen: one table with the given row height and one section with the given number of primaries.
const TEAL = "rgb(15, 118, 110)";
const structured = (label, rowHeight, primaries = 1) => ({
  label, url: `https://example.test/${label}`,
  summary: summarize(observation({ structure: {
    viewport: { width: 1440, height: 900 }, regions: [], gaps: { section: { "32": 2 } }, headings: { main: { "1|24|600|32": 1 }, skips: 0 },
    sections: [{ kind: "form-group", y: 100, h: 200, gapBefore: 0, cols: [1], filled: { [TEAL]: primaries } }],
    controls: { buttons: { [`filled|${TEAL}|36|main`]: primaries }, inputs: {}, labels: {}, leftEdges: 0 },
    tables: [{ rows: 6, cols: 3, headerH: 36, rowH: { [rowHeight]: 6 }, padX: 16 }], lists: [], tabs: [], css: {},
  } })),
});
const D020 = { id: "D-020", kind: "decision", axis: "tableRowHeights", values: [40], statement: "Table rows are 40px.", approvedBy: "reviewer-a", date: "2026-11-11", source: "reference:ops-console#density.table.rowHeight" };
const D021 = { id: "D-021", kind: "exception", to: "D-020", axis: "tableRowHeights", values: [52], scope: { screens: ["orders"] }, statement: "The orders table keeps 52px rows for two-line cells.", approvedBy: "reviewer-a", date: "2026-11-11" };
const D022 = { id: "D-022", kind: "decision", axis: "primariesPerSection", values: [1], statement: "At most one primary action per section.", approvedBy: "reviewer-a", date: "2026-11-11" };
const catalogForLedger = JSON.parse(readFileSync(new URL("../../engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json", import.meta.url), "utf8"));
const ledgerOf = (...entries) => normalizeDecisions(entries.map((entry) => JSON.parse(JSON.stringify(entry))), catalogForLedger);
const structureScreens = () => [structured("home", 40), structured("settings", 40, 2), structured("orders", 52)];

test("drift: a structure-axis decision violates, an exception approves, and both reach the gate", () => {
  const violated = compareScreens(structureScreens(), { structure: true, decisions: ledgerOf(D020, D022) });
  const rows = violated.structure.axes.tableRowHeights;
  assert.deepEqual([rows.baseline, rows.decision], [[40], "D-020"]);
  assert.deepEqual(rows.screens[2], { label: "orders", value: [52], extra: [52], status: "violates", decision: "D-020" });
  assert.deepEqual(rows.deviating, [], "a violation is not ordinary drift");
  const primaries = violated.structure.axes.primariesPerSection;
  assert.deepEqual(primaries.screens.map((p) => [p.label, p.value, p.status]), [["home", 1, "same"], ["settings", 2, "violates"], ["orders", 1, "same"]], "primariesPerSection means at most");
  assert.deepEqual(violated.decisions.violations, [
    { id: "D-020", screen: "orders", axis: "tableRowHeights", values: [52] },
    { id: "D-022", screen: "settings", axis: "primariesPerSection", values: [2] },
  ]);
  assert.deepEqual(violated.decisions.applied, ["D-020", "D-022"]);
  assert.equal(gateFailure(violated), "drift gate: FAIL — decision violations: D-020 on orders (tableRowHeights 52); D-022 on settings (primariesPerSection 2)");
  const md = renderDriftMarkdown(violated);
  assert.ok(md.includes("| table row height | 40 (decided D-020) | 40 | 40 | 52 (violates D-020: 52) |"), md);
  assert.ok(md.includes("| primaries per section (max) | 1 (decided D-022) | 1 | 2 (violates D-022) | 1 |"), md);
  assert.ok(md.includes("a structure value outside the shared set does not fail `--gate`, one outside a recorded decision does."), md);
  assert.equal(violated.baseline.source, "majority across screens; recorded project decisions for table row height, primaries per section (max)");

  const approved = compareScreens(structureScreens(), { structure: true, decisions: ledgerOf(D020, D021) });
  assert.deepEqual(approved.structure.axes.tableRowHeights.screens[2], { label: "orders", value: [52], extra: [], status: "excepted", decision: "D-020", exception: "D-021", excepted: [52] });
  assert.deepEqual(approved.decisions.violations, []);
  assert.deepEqual(approved.decisions.excepted, [{ id: "D-021", screen: "orders", axis: "tableRowHeights", values: [52] }]);
  assert.equal(gateFailure(approved), null);
  assert.ok(renderDriftMarkdown(approved).includes("| 52 (approved D-021: 52) |"));
});

test("drift: without --structure a structure-axis decision is reported once as not measured and does not fail", () => {
  const report = compareScreens(structureScreens(), { decisions: ledgerOf(D020, D021) });
  assert.equal(Object.hasOwn(report, "structure"), false);
  assert.deepEqual(report.decisions.applied, []);
  assert.deepEqual(report.decisions.notMeasured, [{ id: "D-020", axis: "tableRowHeights" }, { id: "D-021", axis: "tableRowHeights" }]);
  assert.deepEqual(report.decisions.violations, []);
  assert.equal(gateFailure(report), null);
  assert.match(report.verdict, /Not measured \(pass --structure\): D-020 \(table row height\), D-021 \(table row height\)\./u);
  assert.equal(renderDriftMarkdown(report).split("Not measured (pass --structure)").length - 1, 1, "reported once");
  assert.equal(report.baseline.source, "majority across screens", "a structure decision does not reach the role baseline without --structure");
  // Token-axis decisions and reports without structure decisions are unchanged: no notMeasured key.
  const plain = compareScreens(structureScreens(), { decisions: ledgerOf(D022) });
  assert.deepEqual(Object.keys(plain.decisions), ["applied", "violations", "excepted", "entries", "notMeasured"]);
  const none = compareScreens([screen("home"), screen("settings")], { decisions: ledgerOf({ ...D020, axis: "radii", values: [4, 12, 999] }) });
  assert.equal(Object.hasOwn(none.decisions, "notMeasured"), false);
});
