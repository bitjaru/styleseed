import test from "node:test";
import assert from "node:assert/strict";
import { FAULT_CLASSES, THRESHOLDS, analyzeFaults, faultsGateFailure, faultsReport, renderFaultsMarkdown } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";
import { gateFailure, parseArgs } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";
import { observeUrls } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { observeFaults } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-faults.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { observation, stubChromium } from "../lib/reference-synthetic.mjs";

// Synthetic fault-probe output for one viewport: empty lists unless overridden. Records only.
const probe = (width = 1440, over = {}) => ({
  version: 1, viewport: { width, height: width >= 768 ? 900 : 844 }, elements: 40, truncated: false, textRuns: 12,
  amounts: [], overlaps: [], spills: [], clips: [], insets: [], touches: [], gaps: [], aligns: [], emoji: [],
  icons: { sets: {}, groups: [], unknown: 0 }, capped: {}, ...over,
});
const B = [10, 20, 30, 40];
const A = [50, 20, 30, 40];
const classes = (o) => analyzeFaults(o).findings.map((f) => f.class);
const one = (list, record) => probe(1440, { [list]: [{ box: B, ...record }] });
const faultOf = (list, record) => classes(one(list, record)).length === 1;

test("every class at its edges: the fault value and the nearest value that is not", () => {
  // amount-wrap: two lines, not forced
  assert.equal(faultOf("amounts", { lines: 1, size: 32, forced: false }), false);
  assert.equal(faultOf("amounts", { lines: 2, size: 32, forced: false }), true);
  assert.equal(faultOf("amounts", { lines: 2, size: 32, forced: true }), false, "a <br> is a forced break");
  // text-overlap: 2px wide and half the font size tall
  assert.equal(faultOf("overlaps", { against: A, w: 1.9, h: 8, size: 16 }), false);
  assert.equal(faultOf("overlaps", { against: A, w: 2, h: 8, size: 16 }), true);
  assert.equal(faultOf("overlaps", { against: A, w: 20, h: 4.9, size: 10 }), false, "0.49 of the font size");
  assert.equal(faultOf("overlaps", { against: A, w: 20, h: 5, size: 10 }), true, "0.5 of the font size");
  // text-spill
  assert.equal(faultOf("spills", { against: A, side: "right", by: 1.9 }), false);
  assert.equal(faultOf("spills", { against: A, side: "right", by: 2 }), true);
  // text-clip: every record
  assert.equal(faultOf("clips", { axis: "x", by: 1.5 }), true);
  // tight-inset: panel 8, chip 4 (left and right only)
  const inset = (kind, value, side = "left") => ({ against: A, kind, left: 20, right: 20, top: kind === "panel" ? 20 : null, bottom: kind === "panel" ? 20 : null, [side]: value });
  assert.equal(faultOf("insets", inset("panel", 7.9)), true);
  assert.equal(faultOf("insets", inset("panel", 8)), false);
  assert.equal(faultOf("insets", inset("panel", 7.9, "bottom")), true, "a panel is judged on all four sides");
  assert.equal(faultOf("insets", inset("chip", 3.9)), true);
  assert.equal(faultOf("insets", inset("chip", 4)), false);
  assert.equal(faultOf("insets", { against: A, kind: "chip", left: 6, right: 6, top: 1, bottom: 1 }), false, "a chip is judged on left and right only");
  assert.equal(faultOf("insets", { against: A, kind: "panel", left: 20, right: 20, top: null, bottom: null }), false, "unjudged sides are null");
  // text-touch: under 4, unauthored
  assert.equal(faultOf("touches", { against: A, gap: 3.9, authored: false }), true);
  assert.equal(faultOf("touches", { against: A, gap: 4, authored: false }), false);
  // near-touch and near-align: 1 to 3 inclusive
  for (const [gap, fault] of [[0.9, false], [1, true], [3, true], [3.1, false]]) {
    assert.equal(faultOf("gaps", { against: A, axis: "x", gap, authored: false }), fault, `near-touch gap ${gap}`);
    assert.equal(faultOf("aligns", { against: A, delta: gap }), fault, `near-align delta ${gap}`);
  }
  // emoji-icon and icon-mix: every record
  assert.equal(faultOf("emoji", { context: "control", size: 16 }), true);
  assert.deepEqual(classes(probe(1440, { icons: { sets: { "24|stroke": 3, "20|fill": 1 }, groups: [{ box: B, sets: { "24|stroke": 1, "20|fill": 1 }, n: 2 }], unknown: 0 } })), ["icon-mix"]);
});

test("authored spacing is never a finding for text-touch or near-touch", () => {
  assert.deepEqual(classes(probe(1440, { touches: [{ box: B, against: A, gap: 0, authored: true }], gaps: [{ box: B, against: A, axis: "y", gap: 2, authored: true }] })), []);
});

test("findings carry the measure that decided them, in class order, widest viewport first", () => {
  const o = probe(390, {
    aligns: [{ box: [0, 90, 10, 10], against: A, delta: 2 }],
    amounts: [{ box: [0, 50, 10, 10], lines: 3, size: 20, forced: false }, { box: [0, 10, 10, 10], lines: 2, size: 32, forced: false }],
    emoji: [{ box: B, context: "tile", size: 24 }],
  });
  const result = analyzeFaults(o);
  assert.deepEqual(result.findings.map((f) => [f.class, f.viewport, f.box[1]]), [["amount-wrap", 390, 10], ["amount-wrap", 390, 50], ["near-align", 390, 90], ["emoji-icon", 390, 20]]);
  assert.deepEqual(result.findings[0].measure, { lines: 2, size: 32 });
  assert.deepEqual(result.findings[3].measure, { context: "tile", size: 24 });
  assert.equal(Object.hasOwn(result.findings[0], "against"), false, "amount-wrap has no against box");
});

test("an exception waives a finding only when the rule's kind is default", () => {
  const wrappedScreen = [{ label: "orders", url: "https://a.test/orders", state: null, observations: [{ faults: probe(1440, { amounts: [{ box: B, lines: 2, size: 20, forced: false }] }) }] }];
  const ledger = [{ id: "D-001", kind: "exception", rule: "DL-23-amounts-never-wrap", statement: "Fixture exception.", approvedBy: "reviewer-a", date: "2026-11-11" }];
  const statusFor = (kind) => faultsReport(wrappedScreen, { rules: [{ id: "DL-23-amounts-never-wrap", kind, priority: "blocks" }], decisions: ledger }).screens[0].findings.map((f) => f.status);
  assert.deepEqual(statusFor("default"), ["approved"]);
  for (const kind of ["invariant", "project-decision", undefined]) assert.deepEqual(statusFor(kind), ["fault"], `kind ${kind} is not waived`);
});

test("a custom thresholds argument moves the result; distribution counts match the records", () => {
  const o = probe(1440, {
    insets: [{ box: B, against: A, kind: "panel", left: 1, right: 30, top: 30, bottom: 30 }, { box: B, against: A, kind: "panel", left: 9, right: 30, top: 30, bottom: 30 }, { box: B, against: A, kind: "chip", left: 5, right: 7, top: null, bottom: null }],
    touches: [{ box: B, against: A, gap: 0.5, authored: false }, { box: B, against: A, gap: 4.5, authored: false }, { box: B, against: A, gap: 1, authored: true }],
    gaps: [{ box: B, against: A, axis: "x", gap: 2, authored: false }, { box: B, against: A, axis: "x", gap: 5.5, authored: false }],
    aligns: [{ box: B, against: A, delta: 0.5 }, { box: B, against: A, delta: 3 }],
  });
  const plain = analyzeFaults(o);
  assert.deepEqual(plain.findings.map((f) => f.class), ["tight-inset", "text-touch", "near-touch", "near-align"]);
  const moved = analyzeFaults(o, { thresholds: { ...THRESHOLDS, insetPanel: 10, insetChip: 6, touchMax: 5, nearMin: 0.5, nearMax: 6 } });
  assert.deepEqual(moved.findings.map((f) => f.class), ["tight-inset", "tight-inset", "tight-inset", "text-touch", "text-touch", "near-touch", "near-touch", "near-align", "near-align"]);
  assert.deepEqual(plain.distribution["tight-inset"], { panel: { 2: 1, 4: 1, 6: 1, 8: 1, 10: 2, 12: 2 }, chip: { 2: 0, 4: 0, 6: 1, 8: 1, 10: 1, 12: 1 } });
  assert.deepEqual(plain.distribution["text-touch"], { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2 }, "authored touches are not counted");
  assert.deepEqual(plain.distribution["near-touch"], { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 2 });
  assert.deepEqual(plain.distribution["near-align"], { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2 });
  assert.equal(Object.isFrozen(THRESHOLDS) && Object.isFrozen(FAULT_CLASSES) && FAULT_CLASSES.every(Object.isFrozen), true);
  assert.deepEqual(FAULT_CLASSES.map((c) => Object.keys(c)), FAULT_CLASSES.map(() => ["id", "rule", "summary"]));
});

// Two screens of synthetic observations; `billing` also has an error-state variant.
const rules = (over = {}) => [
  { id: "DL-23-amounts-never-wrap", kind: "default", priority: "strong" },
  { id: "INV-06-text-stays-whole", kind: "invariant", priority: "blocks" },
  { id: "CRAFT-functional-icons", kind: "default", priority: "strong" },
  ...Object.entries(over).map(([id, priority]) => ({ id, kind: "default", priority })),
].map((r) => ({ ...r, priority: over[r.id] ?? r.priority }));
const wrapped = (width) => probe(width, { amounts: [{ box: [8, 8, 20, 80], lines: 2, size: 32, forced: false }] });
const screens = () => [
  { label: "home", url: "https://a.test/", state: null, observations: [{ faults: probe(1440, { overlaps: [{ box: B, against: A, w: 30, h: 10, size: 16 }] }) }, { faults: probe(390) }] },
  { label: "billing", url: "https://a.test/billing", state: null, observations: [{ faults: wrapped(1440) }, { faults: wrapped(390) }] },
  { label: "billing?state=error", url: "https://a.test/billing?state=error", state: "error", observations: [{ faults: wrapped(1440) }, { faults: probe(390, { emoji: [{ box: B, context: "control", size: 16 }] }) }] },
];
const entry = (id, extra = {}) => ({ id, kind: "exception", rule: "DL-23-amounts-never-wrap", statement: "Fixture exception.", approvedBy: "reviewer-a", date: "2026-11-11", ...extra });

test("faultsReport: gates follows the priority of the mapped rule, and a missing id maps to no rule", () => {
  const strong = faultsReport(screens(), { rules: rules() });
  const billing = strong.screens.find((s) => s.label === "billing");
  assert.deepEqual(billing.findings.map((f) => [f.class, f.viewport, f.rule, f.gates, f.status]), [["amount-wrap", 1440, "DL-23-amounts-never-wrap", false, "fault"], ["amount-wrap", 390, "DL-23-amounts-never-wrap", false, "fault"]]);
  assert.deepEqual(strong.screens[0].findings.map((f) => [f.class, f.rule, f.gates]), [["text-overlap", "INV-06-text-stays-whole", true]]);
  const blocking = faultsReport(screens(), { rules: rules({ "DL-23-amounts-never-wrap": "blocks" }) });
  assert.equal(blocking.screens.find((s) => s.label === "billing").findings.every((f) => f.gates), true);
  const missing = faultsReport(screens(), { rules: [] });
  assert.equal(missing.screens.flatMap((s) => s.findings).every((f) => f.rule === null && f.gates === false), true);
  assert.deepEqual(missing.classes.map((c) => c.rule), FAULT_CLASSES.map(() => null));
  assert.deepEqual(blocking.classes.find((c) => c.id === "text-spill"), { id: "text-spill", rule: "INV-06-text-stays-whole", gates: true, summary: FAULT_CLASSES[2].summary });
});

test("faultsReport: an exception to the rule without an axis approves findings on the screens it covers", () => {
  const ruleSet = rules({ "DL-23-amounts-never-wrap": "blocks" });
  const scoped = faultsReport(screens(), { rules: ruleSet, decisions: [entry("D-001", { scope: { screens: ["billing"] } })] });
  const status = (report, label) => report.screens.find((s) => s.label === label).findings.filter((f) => f.class === "amount-wrap").map((f) => [f.status, f.exception ?? null]);
  assert.deepEqual(status(scoped, "billing"), [["approved", "D-001"], ["approved", "D-001"]]);
  assert.deepEqual(status(scoped, "billing?state=error"), [["approved", "D-001"]], "a state variant is covered by its base label");
  assert.equal(faultsGateFailure(scoped), "render faults gate: FAIL — INV-06-text-stays-whole: text-overlap on home @1440 (1)", "the invariant still gates");
  assert.match(scoped.verdict, /Approved exceptions used: D-001 on billing; D-001 on billing\?state=error\.$/u);

  const projectWide = faultsReport([screens()[1]], { rules: ruleSet, decisions: [entry("D-002")] });
  assert.equal(faultsGateFailure(projectWide), null, "every gating finding approved: the gate passes");
  const otherScreen = faultsReport(screens(), { rules: ruleSet, decisions: [entry("D-003", { scope: { screens: ["settings"] } })] });
  assert.deepEqual(status(otherScreen, "billing"), [["fault", null], ["fault", null]]);
  const withAxis = faultsReport(screens(), { rules: ruleSet, decisions: [entry("D-004", { axis: "radii", values: [10] })] });
  assert.deepEqual(status(withAxis, "billing"), [["fault", null], ["fault", null]], "an exception with an axis is a drift exception");
  const artifactsOnly = faultsReport(screens(), { rules: ruleSet, decisions: [entry("D-005", { scope: { artifacts: ["app-billing"] } })] });
  assert.deepEqual(status(artifactsOnly, "billing"), [["fault", null], ["fault", null]], "an entry scoped only to artifacts names no screen");
  const invariant = faultsReport(screens(), { rules: ruleSet, decisions: [entry("D-006", { rule: "INV-06-text-stays-whole" })] });
  assert.equal(invariant.screens[0].findings[0].status, "fault", "an invariant is never waived");
});

test("faultsReport: state variants are reported under their own label; the gate names rule, class, screen, viewport, and count", () => {
  const report = faultsReport(screens(), { rules: rules({ "DL-23-amounts-never-wrap": "blocks", "CRAFT-functional-icons": "strong" }) });
  assert.deepEqual(report.screens.map((s) => s.label), ["home", "billing", "billing?state=error"]);
  assert.deepEqual(report.screens[2].findings.map((f) => [f.class, f.viewport]), [["amount-wrap", 1440], ["emoji-icon", 390]]);
  assert.equal(faultsGateFailure(report), "render faults gate: FAIL — INV-06-text-stays-whole: text-overlap on home @1440 (1); DL-23-amounts-never-wrap: amount-wrap on billing @1440 (1); DL-23-amounts-never-wrap: amount-wrap on billing @390 (1); DL-23-amounts-never-wrap: amount-wrap on billing?state=error @1440 (1)");
  assert.equal(report.verdict, "4 gating fault(s) on 3 of 3 screens: amount-wrap (billing, billing?state=error), text-overlap (home); 1 reported finding(s).");
  assert.deepEqual(report.screens[1].counts, Object.fromEntries(FAULT_CLASSES.map((c) => [c.id, c.id === "amount-wrap" ? 2 : 0])));
  assert.deepEqual(report.totals.classes["amount-wrap"], { findings: 3, gating: 3, approved: 0, screens: 2 });
  assert.deepEqual(report.screens[1].distribution.map((d) => d.viewport), [1440, 390]);
  assert.equal(faultsGateFailure(null), null);
  const clean = faultsReport([{ label: "home", url: "https://a.test/", state: null, observations: [{ faults: probe(1440) }, { faults: probe(390) }] }], { rules: rules() });
  assert.equal(clean.verdict, "No render fault found on 1 screen.");
  assert.equal(faultsGateFailure(clean), null);
  const reportedOnly = faultsReport([screens()[1]], { rules: rules() });
  assert.equal(reportedOnly.verdict, "No gating fault on 1 screen; 2 reported finding(s): amount-wrap (billing).");
  assert.throws(() => faultsReport([{ label: "x", observations: [{ viewport: { width: 1440 } }] }]), /x @1440 has no fault-probe output .* drift-report\.mjs --faults/u);
});

test("renderFaultsMarkdown: no score, no percentage; same input gives the same bytes; shuffled input gives the same order", () => {
  const report = faultsReport(screens(), { rules: rules() });
  const md = renderFaultsMarkdown(report, { observedAt: "2026-11-11", browser: "playwright/index.mjs" });
  assert.equal(/score/iu.test(md) || md.includes("%"), false, md);
  assert.ok(md.includes("| amount-wrap | DL-23-amounts-never-wrap | reports | 0 | 2 | 1 |"), md);
  assert.ok(md.includes("| text-overlap | INV-06-text-stays-whole | fails | 1 | 0 | 0 |"), md);
  assert.ok(md.includes("- amount-wrap @1440 [8, 8, 20, 80]: 2 lines, font 32px (fault, reported)"), md);
  assert.ok(md.includes(`**Verdict:** ${report.verdict}`));
  assert.equal(renderFaultsMarkdown(faultsReport(screens(), { rules: rules() }), { observedAt: "2026-11-11", browser: "playwright/index.mjs" }), md, "same input, same bytes");
  const many = probe(1440, { aligns: Array.from({ length: 25 }, (_, i) => ({ box: [0, i * 10, 10, 10], against: A, delta: 2 })) });
  const long = renderFaultsMarkdown(faultsReport([{ label: "long", url: "u", state: null, observations: [{ faults: many }] }], { rules: [] }), {});
  assert.equal(long.split("\n").filter((l) => l.startsWith("- near-align @")).length, 20);
  assert.ok(long.includes("- near-align: and 5 more in faults.json"), long);
  const shuffled = (o) => ({ ...o, aligns: [...o.aligns].reverse() });
  assert.deepEqual(analyzeFaults(shuffled(many)).findings, analyzeFaults(many).findings, "shuffled records give the same order");
  const mixed = probe(1440, { aligns: [{ box: [5, 30, 10, 10], against: A, delta: 2 }, { box: [1, 30, 10, 10], against: A, delta: 3 }], amounts: [{ box: [0, 99, 1, 1], lines: 2, size: 9, forced: false }] });
  assert.deepEqual(analyzeFaults(shuffled(mixed)).findings.map((f) => [f.class, f.box[0]]), [["amount-wrap", 0], ["near-align", 1], ["near-align", 5]]);
});

test("the allow-list passes probe output and per-screen report data, and fails a stray word", () => {
  const full = probe(1440, {
    amounts: [{ box: B, lines: 2, size: 32, forced: false }], overlaps: [{ box: B, against: A, w: 3, h: 9, size: 16 }],
    spills: [{ box: B, against: A, side: "right", by: 4.5 }], clips: [{ box: B, axis: "y", by: 12 }],
    insets: [{ box: B, against: A, kind: "chip", left: 2, right: 3, top: null, bottom: null }], touches: [{ box: B, against: A, gap: 1, authored: false }],
    gaps: [{ box: B, against: A, axis: "x", gap: 2, authored: true }], aligns: [{ box: B, against: A, delta: 2 }], emoji: [{ box: B, context: "lead", size: 20 }],
    icons: { sets: { "24|stroke": 4, "none|fill": 1, "20|both": 1 }, groups: [{ box: B, sets: { "24|stroke": 1, "none|fill": 1 }, n: 2 }], unknown: 2 }, capped: { textRuns: 12, aligns: 3, elements: 40 }, truncated: true,
  });
  assert.deepEqual(disallowedStrings(full), []);
  const report = faultsReport([{ label: "home", url: "https://a.test/", state: null, observations: [{ faults: full }, { faults: probe(390) }] }], { rules: rules({ "CRAFT-icon-family": "strong" }), decisions: [entry("D-001", { rule: "CRAFT-functional-icons" })] });
  const screen = report.screens[0];
  const findings = screen.findings.map(({ exception: _exception, ...f }) => f);
  assert.ok(screen.findings.some((f) => f.exception === "D-001"), "the emoji finding is approved");
  assert.deepEqual(disallowedStrings({ findings, counts: screen.counts, distribution: screen.distribution, icons: screen.icons, capped: screen.capped }), []);
  assert.notDeepEqual(disallowedStrings({ ...full, emoji: [{ box: B, context: "Settings", size: 20 }] }), []);
  assert.notDeepEqual(disallowedStrings({ ...full, icons: { ...full.icons, sets: { "24|lucide": 1 } } }), []);
});

test("parseArgs takes --faults (default false); gateFailure without faults is today's", () => {
  assert.equal(parseArgs(["https://a.test/", "--out", "o"]).faults, false);
  assert.equal(parseArgs(["https://a.test/", "--out", "o", "--faults"]).faults, true);
  const drift = { screensWithDrift: ["billing"], decisions: { violations: [] } };
  assert.equal(gateFailure(drift), "drift gate: FAIL — drift on billing");
  assert.equal(gateFailure({ screensWithDrift: [] }), null);
  const faults = faultsReport(screens(), { rules: rules() });
  assert.equal(gateFailure({ screensWithDrift: [], faults }), "render faults gate: FAIL — INV-06-text-stays-whole: text-overlap on home @1440 (1)");
  assert.equal(gateFailure({ screensWithDrift: ["billing"], faults }), "drift gate: FAIL — drift on billing\nrender faults gate: FAIL — INV-06-text-stays-whole: text-overlap on home @1440 (1)");
  assert.equal(gateFailure({ screensWithDrift: [], faults: faultsReport([screens()[1]], { rules: rules() }) }), null, "reported faults do not fail the gate");
});

test("observeUrls: extra probes run after the structure probe on the same load; the default makes no call", async () => {
  const url = "https://a.test/settings";
  const pages = { [url]: (width) => observation(width) };
  const plain = stubChromium(pages);
  await observeUrls([url], { chromium: plain.chromium, structure: true });
  assert.deepEqual(plain.calls, [`goto ${url} @1440`, "wait 500", "observeDesign", "observeStructure", `goto ${url} @390`, "wait 500", "observeDesign", "observeStructure"]);
  const withEmpty = stubChromium(pages);
  await observeUrls([url], { chromium: withEmpty.chromium, structure: true, extraProbes: [] });
  assert.deepEqual(withEmpty.calls, plain.calls, "an empty list is the default");

  const probes = new Map([[observeFaults, (u, width) => probe(width)]]);
  const extra = stubChromium(pages, { probes });
  const [result] = await observeUrls([url], { chromium: extra.chromium, structure: true, extraProbes: [{ key: "faults", probe: observeFaults }] });
  assert.deepEqual(extra.calls, [`goto ${url} @1440`, "wait 500", "observeDesign", "observeStructure", "probe observeFaults", `goto ${url} @390`, "wait 500", "observeDesign", "observeStructure", "probe observeFaults"]);
  assert.deepEqual(result.observations.map((o) => o.faults.viewport.width), [1440, 390]);
  assert.equal(Object.hasOwn(result.summary, "faults"), false, "summarize does not read the new key");
  const plainResult = await observeUrls([url], { chromium: stubChromium(pages).chromium, structure: true });
  assert.deepEqual(result.summary, plainResult[0].summary);

  await assert.rejects(observeUrls([url], { chromium: stubChromium(pages, { probes }).chromium, structure: true, extraProbes: [{ key: "structure", probe: observeFaults }] }), /extra probe key "structure" is already a key of the observation/u);
  await assert.rejects(observeUrls([url], { chromium: stubChromium(pages, { probes }).chromium, extraProbes: [{ key: "accent", probe: observeFaults }, { key: "accent", probe: observeFaults }] }), /extra probe key "accent" is already a key/u);
});
