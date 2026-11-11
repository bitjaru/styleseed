import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFacts } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { comparatorHolds, compareToContract, distanceGateFailure, distanceVerdict, ownedValues, renderDistanceMarkdown, renderDistanceTable } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { buildEvidence, parseArgs as contractArgs, readMeasurements, run as compileContract } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-contract.mjs";
import { contractHash, normalizeReferenceEvidence } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/reference-contract.mjs";
import { gateFailure, parseArgs, pickScreen, planScreens, referenceFlags, report } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";
import { TEAL, measurement, observation, stubChromium, writeMeasurements, writeProject } from "../lib/reference-synthetic.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const catalog = JSON.parse(readFileSync(resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json"), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const BLUE = "rgb(37, 99, 235)";

// An approved contract from the synthetic settings page, with the default transfers (perSectionMax
// and sectionsOverOne kept as maxima, the row height adapted within 4px, accent and fonts avoided).
function approved(m = measurement(), edit = () => {}) {
  const draft = clone(normalizeReferenceEvidence(buildEvidence({ ...m, slug: "ops-console", fallback: "operations-console", adapter: "product-ui" }), { catalog }));
  edit(draft);
  const evidence = normalizeReferenceEvidence(draft, { catalog });
  return { ...evidence, approval: { status: "approved", reviewer: "reviewer-a", date: "2026-11-11", contractHash: contractHash(evidence) } };
}
// The built screen: the same page with `primaries` filled actions in the first settings group, rows
// of `rowHeight`, and actions painted `accent`. observation overrides for observe-design and
// observe-structure, so the same page can be served by the chromium stub.
const buildOver = ({ rowHeight = 52, primaries = 2, accent = TEAL, fonts = { Inter: 45 }, css = null, tables = true } = {}) => (width) => ({
  structureOver: {
    sections: [
      { kind: "heading-block", y: 88, h: 52, gapBefore: 0, surface: false, cols: [1], heading: { level: 1, size: 24, weight: 600 }, filled: {} },
      ...[172, 450, 728].map((y, i) => ({ kind: "form-group", y, h: 246, gapBefore: 32, surface: false, cols: width >= 768 ? [0.29, 0.71] : [1], heading: { level: 2, size: 16, weight: 600 }, filled: { [accent]: i === 0 ? primaries : 1 } })),
      { kind: "table", y: 1006, h: 309, gapBefore: 32, surface: false, cols: [1], heading: { level: 2, size: 16, weight: 600 }, filled: {} },
    ],
    tables: tables ? [{ rows: 6, cols: 3, headerH: 36, rowH: { [rowHeight]: 6 }, padX: 16, rowBorder: true, stickyHeader: false, endAligned: 1 }] : [],
    controls: { buttons: { "text|rgb(77, 81, 80)|32|topBar": 2, "outline|rgb(180, 189, 187)|36|main": 3, [`filled|${accent}|36|main`]: 2 + primaries }, inputs: { "text|36|full": 4, "select|36|full": 2 }, labels: { above: 6, left: 0, none: 0 }, leftEdges: 1 },
    ...(css ? { css } : {}),
  },
  actions: { [`bg:${accent}`]: 2 + primaries, "text:rgb(77, 81, 80)": 2 }, actionPairs: { [`${accent}|rgb(250, 252, 252)`]: 2 + primaries }, fonts,
  body: { color: "rgb(9, 12, 11)", background: "rgb(246, 248, 248)", fontFamily: Object.keys(fonts)[0], fontSize: 14 },
});
function built(options = {}) {
  const over = buildOver(options);
  const m = measurement(over(1440), over(390), { url: "https://example.test/build" });
  return { facts: m.facts.facts, summary: m.summary };
}
const DIFFER_ALL = ["navigation.primary.perSectionMax @1440", "navigation.primary.sectionsOverOne @1440", "navigation.primary.perSectionMax @390", "navigation.primary.sectionsOverOne @390"];
const row = (rows, id, viewport = 1440) => rows.find((r) => r.id === id && r.viewport === viewport);

test("comparators: eq, max, min, present, within (numbers and lists)", () => {
  assert.equal(comparatorHolds({ op: "eq" }, 40, 40), true);
  assert.equal(comparatorHolds({ op: "eq" }, 40, 41), false);
  assert.equal(comparatorHolds({ op: "eq" }, "0.29/0.71", "0.29/0.71"), true);
  assert.equal(comparatorHolds({ op: "eq" }, [24, 16], [16, 24]), true, "a list compares as a set");
  assert.equal(comparatorHolds({ op: "max" }, 1, 1), true);
  assert.equal(comparatorHolds({ op: "max" }, 1, 2), false);
  assert.equal(comparatorHolds({ op: "min" }, 2, 3), true);
  assert.equal(comparatorHolds({ op: "min" }, 2, 1), false);
  assert.equal(comparatorHolds({ op: "present" }, 2, 1), true);
  assert.equal(comparatorHolds({ op: "present" }, 2, 0), false);
  assert.equal(comparatorHolds({ op: "present" }, 0, 0), true, "present only asks for something when the reference had something");
  assert.equal(comparatorHolds({ op: "within", tolerance: 4 }, 40, 44), true);
  assert.equal(comparatorHolds({ op: "within", tolerance: 4 }, 40, 45), false);
  assert.equal(comparatorHolds({ op: "within", tolerance: 0.1 }, 0.25, 0.35), true, "float tolerance at the edge holds");
  assert.equal(comparatorHolds({ op: "within", tolerance: 2 }, [24, 16], [17, 23, 15]), true, "every build value near some reference value");
  assert.equal(comparatorHolds({ op: "within", tolerance: 2 }, [24, 16], [17, 30]), false);
  assert.equal(comparatorHolds({ op: "within", tolerance: 2 }, 24, "normal"), false, "a value that is not a number cannot be within");
});

test("keep: same, different, and absent; absent never gates", () => {
  const evidence = approved();
  const rows = compareToContract(built(), evidence, { ownValues: ownedValues({ brand: { fontFamilies: ["Inter"] } }) });
  assert.deepEqual([...new Set(rows.map((r) => r.transfer))].sort(), ["adapt", "avoid", "keep"], "rows only for keep, adapt, and avoid");
  for (const fact of evidence.facts.filter((f) => f.transfer === "observe")) assert.equal(rows.some((r) => r.id === fact.id && r.viewport === fact.viewport), false, `${fact.id} is observed: not compared`);
  assert.deepEqual(row(rows, "navigation.primary.perSectionMax"), { id: "navigation.primary.perSectionMax", viewport: 1440, transfer: "keep", compare: { op: "max" }, reference: 1, built: 2, status: "different" });
  assert.equal(row(rows, "navigation.primary.sectionsOverOne").status, "different");
  assert.equal(row(rows, "tells.headings.skips").status, "same");
  assert.equal(row(rows, "tells.table.rowHeightSpread").status, "same", "52px everywhere: no spread");

  const noTable = compareToContract(built({ tables: false, primaries: 1 }), evidence);
  assert.equal(row(noTable, "tells.table.rowHeightSpread").status, "absent", "no table on the screen, so no row-height spread");
  assert.equal(row(noTable, "density.table.rowHeight").status, "absent");
  assert.equal(noTable.filter((r) => r.transfer === "keep" && r.status === "different").length, 0);
  assert.equal(distanceGateFailure(noTable.filter((r) => r.transfer !== "avoid")), null, "absent rows do not gate");
  assert.equal(distanceGateFailure(rows), `distance gate: FAIL — keep facts that differ: ${DIFFER_ALL.join(", ")}; avoid values copied: tokens.accent`);
});

test("adapt: same, near, different; never gates", () => {
  const evidence = approved();
  const at = (rowHeight) => row(compareToContract(built({ rowHeight, primaries: 1 }), evidence), "density.table.rowHeight");
  assert.deepEqual([at(40).status, at(43).status, at(52).status], ["same", "near", "different"]);
  assert.deepEqual(at(52), { id: "density.table.rowHeight", viewport: 1440, transfer: "adapt", compare: { op: "within", tolerance: 4 }, unit: "px", reference: 40, built: 52, status: "different" });
  const rows = compareToContract(built({ rowHeight: 52, primaries: 1, accent: BLUE }), evidence, { ownValues: { fonts: ["Inter"] } });
  assert.equal(distanceGateFailure(rows), null, "an adapted row that differs never gates");
});

test("a lower-bound build value never gates: present or min that does not hold, and eq, max, within, read absent", () => {
  // The reference read every stylesheet, so its counts are exact; the person keeps hover as a maximum.
  const readable = { hover: 3, focusVisible: 2, disabled: 1, reducedMotion: 1, breakpoints: { "768": 3 }, unreadableSheets: 0 };
  const evidence = approved(measurement({ structureOver: { css: readable } }, { structureOver: { css: readable } }), (e) => {
    Object.assign(e.facts.find((f) => f.id === "states.css.hover"), { transfer: "keep", compare: { op: "max" } });
  });
  const lowerZero = compareToContract(built({ primaries: 1, css: { hover: 5, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 2 } }), evidence);
  assert.deepEqual(row(lowerZero, "states.css.focusVisible", "both"), { id: "states.css.focusVisible", viewport: "both", transfer: "keep", compare: { op: "present" }, reference: 2, built: 0, builtBound: "lower", status: "absent" });
  assert.equal(row(lowerZero, "states.css.reducedMotion", "both").status, "absent");
  assert.equal(row(lowerZero, "states.css.hover", "both").status, "absent", "max is not evaluated against a lower bound");
  assert.equal(lowerZero.filter((r) => r.builtBound === "lower" && r.status === "different").length, 0);
  const lowerHolds = compareToContract(built({ primaries: 1, css: { hover: 1, focusVisible: 3, disabled: 0, reducedMotion: 1, breakpoints: {}, unreadableSheets: 1 } }), evidence);
  assert.equal(row(lowerHolds, "states.css.focusVisible", "both").status, "same", "at least 3 rules: present holds whatever the unread sheets hold");
  const exact = compareToContract(built({ primaries: 1, css: { hover: 5, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 0 } }), evidence);
  assert.deepEqual([row(exact, "states.css.focusVisible", "both").status, row(exact, "states.css.hover", "both").status], ["different", "different"], "an exact count decides");
});

test("avoid: copied unless the project owns the value; facts marked avoid get no row", () => {
  const evidence = approved(undefined, (e) => { Object.assign(e.facts.find((f) => f.id === "composition.columns.ratio" && f.viewport === 1440), { transfer: "avoid" }); });
  const teal = compareToContract(built({ primaries: 1, rowHeight: 40 }), evidence);
  assert.deepEqual(row(teal, "tokens.accent", "both"), { id: "tokens.accent", viewport: "both", transfer: "avoid", reference: "#0f766e", built: "#0f766e", status: "copied" });
  assert.equal(row(teal, "tokens.fonts", "both").status, "copied", "same family name");
  assert.equal(teal.some((r) => r.id === "composition.columns.ratio"), false, "a fact marked avoid is not compared");
  assert.match(distanceGateFailure(teal), /avoid values copied: tokens\.accent, tokens\.fonts$/u);

  const owned = compareToContract(built({ primaries: 1, rowHeight: 40 }), evidence, { ownValues: ownedValues({ roles: { primary: "#0F766E" }, brand: { fontFamilies: ["inter"] } }) });
  assert.deepEqual([row(owned, "tokens.accent", "both").status, row(owned, "tokens.accent", "both").owned], ["clear", true], "the project's own primary role");
  assert.deepEqual([row(owned, "tokens.fonts", "both").status, row(owned, "tokens.fonts", "both").owned], ["clear", true], "a project whose own approved font is the reference's font has copied nothing");
  const byDecision = compareToContract(built({ primaries: 1, rowHeight: 40 }), evidence, { ownValues: ownedValues({ decisions: [{ id: "D-001", kind: "decision", axis: "accent", values: ["#0f766e"] }, { id: "D-002", kind: "decision", axis: "fonts", values: ["Inter"] }] }) });
  assert.deepEqual([row(byDecision, "tokens.accent", "both").status, row(byDecision, "tokens.fonts", "both").status], ["clear", "clear"]);
  assert.equal(distanceGateFailure(byDecision), null);

  const other = compareToContract(built({ primaries: 1, rowHeight: 40, accent: BLUE, fonts: { Roboto: 45 } }), evidence);
  assert.deepEqual([row(other, "tokens.accent", "both").status, row(other, "tokens.fonts", "both").status], ["clear", "clear"]);
  assert.equal(row(other, "tokens.accent", "both").built, "#2563eb");
  // A set axis is copied only when the whole set is the reference's.
  const spacing = approved(undefined, (e) => { e.tokens.transfer.spacingScale = "avoid"; });
  assert.equal(row(compareToContract(built({ primaries: 1 }), spacing), "tokens.spacingScale", "both").status, "copied");
  assert.equal(row(compareToContract(built({ primaries: 1 }), spacing, { ownValues: { spacingScale: [8, 16, 24, 32] } }), "tokens.spacingScale", "both").status, "clear");
});

test("ownedValues: palette roles, brand key colour and fonts, and recorded decisions and exceptions", () => {
  const owned = ownedValues({
    roles: { primary: "#175CD3", foreground: "#101828", background: "#FFFFFF" },
    brand: { keyColor: "#175CD3", fontFamilies: ["Inter", "IBM Plex Mono"] },
    decisions: [{ id: "D-001", kind: "decision", axis: "radii", values: [4, 8] }, { id: "D-002", kind: "exception", to: "D-001", axis: "radii", values: [12] }, { id: "D-003", kind: "decision", axis: "tableRowHeights", values: [40] }],
  });
  assert.deepEqual(owned.accent, ["#175cd3"]);
  assert.deepEqual([owned.ink, owned.canvas], [["#101828"], ["#ffffff"]]);
  assert.deepEqual(owned.fonts, ["IBM Plex Mono", "Inter"]);
  assert.deepEqual(owned.radii, [4, 8, 12]);
  assert.equal(Object.hasOwn(owned, "tableRowHeights"), false, "only the nine token axes");
});

test("the verdict is one line with two counts, never a score or a sum", () => {
  const evidence = approved();
  const rows = compareToContract(built({ primaries: 2 }), evidence, { ownValues: { fonts: ["Inter"] } });
  assert.equal(distanceVerdict(rows), "4 keep facts differ, 1 avoid value copied");
  const oneKeep = rows.filter((r) => r.transfer !== "avoid" && (r.status !== "different" || r.transfer === "adapt" || (r.id === "navigation.primary.perSectionMax" && r.viewport === 1440)));
  assert.equal(distanceVerdict(oneKeep), "1 keep fact differs, 0 avoid values copied");
  assert.equal(distanceVerdict(rows.filter((r) => r.status !== "different" && r.status !== "copied")), "no keep fact differs and nothing was copied");
  assert.equal(distanceVerdict(rows.filter((r) => r.transfer === "adapt")), "no keep fact differs and nothing was copied", "a differing adapted row is not counted");
  assert.equal(distanceVerdict([]), "no keep fact differs and nothing was copied");
  const md = renderDistanceMarkdown(rows, { slug: "ops-console", screen: "build", url: "https://example.test/build", observedAt: "2026-11-11", browser: "playwright/index.mjs", contractHash: evidence.approval.contractHash, approvedBy: "reviewer-a", approvedOn: "2026-11-11" });
  const verdicts = md.split("\n").filter((line) => line.startsWith("**Verdict:**"));
  assert.deepEqual(verdicts, ["**Verdict:** 4 keep facts differ, 1 avoid value copied."], "one verdict line");
  assert.doesNotMatch(md, /\d\s*%|score\s*[:=]?\s*\d|\/ ?100\b|\b5 (?:keep|avoid|rows|facts)\b/iu, "no percentage, no score, no sum of the two counts");
  assert.ok(md.includes("Distance is not drift."));
  const table = renderDistanceTable(rows).split("\n").slice(2).map((line) => line.split(" | ")[0].replace("| ", ""));
  assert.deepEqual([...new Set(table)], ["keep", "adapt", "avoid"], "one table grouped by transfer");
  assert.ok(md.includes("| keep | `navigation.primary.perSectionMax` | 1440 | at most | 1 | 2 | different |"), md);
  assert.ok(md.includes("| adapt | `density.table.rowHeight` | 1440 | within 4px | 40px | 52px | different |"), md);
  assert.ok(md.includes("| avoid | `tokens.accent` | both | not copied | #0f766e | #0f766e | copied |"), md);
});

test("compile-contract reads the robots verdict from measurements/source.json and the scroll pass from summary.json", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ss-distance-"));
  try {
    const record = { steps: 3, startHeight: 2400, finalHeight: 2400, cap: "none", atTop: true };
    const dir = writeMeasurements(join(tmp, "ref"), measurement({ scroll: record }, { scroll: record }, { robots: "allowed" }));
    writeFileSync(join(tmp, "ref/case.draft.json"), `${JSON.stringify({ sources: [{ robots: "disallowed" }] })}\n`);
    const read = readMeasurements(dir);
    assert.deepEqual([read.robots, read.scroll], ["allowed", true], "source.json first, then case.draft.json");
    rmSync(join(dir, "source.json"));
    assert.equal(readMeasurements(dir).robots, "disallowed", "case.draft.json when there is no source.json");
    const evidence = buildEvidence({ ...read, slug: "ops-console", fallback: "operations-console", adapter: "product-ui" });
    assert.equal(evidence.sources[0].scroll, true);
    assert.equal(buildEvidence({ ...measurement(), slug: "ops-console", fallback: "operations-console", adapter: "product-ui" }).sources[0].scroll, false, "no scroll record: false");
    // Optional: a contract written before the field stays valid; a non-boolean is refused.
    const old = clone(normalizeReferenceEvidence(evidence, { catalog }));
    delete old.sources[0].scroll;
    assert.equal(Object.hasOwn(normalizeReferenceEvidence(old, { catalog }).sources[0], "scroll"), false);
    assert.notEqual(contractHash(normalizeReferenceEvidence(old)), contractHash(normalizeReferenceEvidence(evidence)), "the flag is part of the hashed contract");
    assert.throws(() => normalizeReferenceEvidence({ ...old, sources: [{ ...old.sources[0], scroll: "yes" }] }), /sources\[0\]\.scroll: must be true or false/u);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("drift-report --reference: arguments, screen choice, and the flags it turns on", () => {
  const base = ["file:///tmp/a.html", "file:///tmp/b.html", "--out", "/tmp/out"];
  assert.throws(() => parseArgs([...base, "--reference", "ops-console"]), /--reference needs --project-root/u);
  assert.throws(() => parseArgs([...base, "--project-root", "/tmp/p", "--reference", "../x"]), /--reference needs the slug/u);
  assert.throws(() => parseArgs([...base, "--screen", "a"]), /--screen picks the screen measured against --reference/u);
  const args = parseArgs([...base, "--project-root", "/tmp/p", "--reference", "ops-console", "--screen", "b"]);
  assert.deepEqual([args.reference, args.screen, args.structure, args.scroll], ["ops-console", "b", false, false]);
  assert.equal(pickScreen(planScreens(args), "b").url, "file:///tmp/b.html");
  assert.equal(pickScreen(planScreens(args)).label, "a", "default: the first screen");
  assert.throws(() => pickScreen(planScreens(args), "c"), /--screen c is not one of the measured screens \(a, b\)/u);
  const scrolled = { sources: [{ scroll: true }] };
  assert.deepEqual(referenceFlags(args, scrolled), { structure: true, scroll: true, turnedOn: ["--structure", "--scroll"] });
  assert.deepEqual(referenceFlags({ ...args, structure: true }, { sources: [{ scroll: false }] }), { structure: true, scroll: false, turnedOn: [] });
  assert.deepEqual(referenceFlags(args, { sources: [{}] }), { structure: true, scroll: false, turnedOn: ["--structure"] }, "a contract without the flag: no scroll");
});

test("drift-report --reference refuses a draft before measuring, writes DISTANCE.md, and leaves DRIFT.md and drift.json byte-identical", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "ss-distance-report-"));
  try {
    const root = join(tmp, "project");
    writeProject(root);
    const record = { steps: 0, startHeight: 900, finalHeight: 900, cap: "none", atTop: true };
    const measurements = writeMeasurements(join(tmp, "ref"), measurement({ scroll: record }, { scroll: { ...record, startHeight: 844, finalHeight: 844 } }));
    const quiet = { log: () => {}, warn: () => {}, out: () => {}, date: "2026-11-11" };
    const contract = (argv) => compileContract(contractArgs(["--project-root", root, "--slug", "ops-console", ...argv]), quiet);
    contract(["--measurements", measurements, "--write"]);

    // Two screens served by the stub: the build (two primaries in one section, 52px rows, blue
    // actions, the project's Inter) and the reference page itself.
    const buildUrl = "https://example.test/build";
    const otherUrl = "https://example.test/other";
    const buildPage = buildOver({ primaries: 2, rowHeight: 52, accent: BLUE });
    const pages = { [buildUrl]: (width) => observation(width, buildPage(width)), [otherUrl]: (width) => observation(width) };

    const drafted = stubChromium(pages);
    let launched = false;
    const args = (out, extra) => parseArgs([buildUrl, otherUrl, "--out", out, "--project-root", root, ...extra]);
    await assert.rejects(report(args(join(tmp, "draft"), ["--reference", "ops-console"]), () => {}, { loadBrowserImpl: async () => { launched = true; return drafted.loadBrowserImpl(); } }), /evidence\.json is a draft: an artifact can select reference:ops-console only after a person approves it/u);
    assert.equal(launched, false, "a draft is refused before any browser starts");

    const e = JSON.parse(readFileSync(join(root, ".styleseed/rulesets/ops-console/evidence.json"), "utf8"));
    for (const f of e.facts) if (f.transfer === "keep" && f.level === "derived") f.note = "Holds across this product's screens.";
    writeFileSync(join(root, ".styleseed/rulesets/ops-console/evidence.json"), `${JSON.stringify(e, null, 2)}\n`);
    contract(["--measurements", measurements, "--write"]);
    contract(["--approve", "--reviewer", "reviewer-a"]);
    assert.equal(JSON.parse(readFileSync(join(root, ".styleseed/rulesets/ops-console/evidence.json"), "utf8")).sources[0].scroll, true);

    const plain = join(tmp, "plain");
    const withReference = join(tmp, "reference");
    const plainStub = stubChromium(pages);
    const plainResult = await report(args(plain, ["--structure", "--scroll"]), () => {}, { loadBrowserImpl: plainStub.loadBrowserImpl });
    const logs = [];
    const referenceStub = stubChromium(pages);
    const result = await report(args(withReference, ["--reference", "ops-console"]), (line) => logs.push(line), { loadBrowserImpl: referenceStub.loadBrowserImpl });
    for (const name of ["drift.json", "DRIFT.md"]) assert.ok(readFileSync(join(plain, name)).equals(readFileSync(join(withReference, name))), `${name} is byte-identical with and without --reference`);
    assert.deepEqual(referenceStub.calls.filter((c) => !c.startsWith("wait")), plainStub.calls.filter((c) => !c.startsWith("wait")), "the same page calls: --reference measured with --structure --scroll");
    assert.equal(existsSync(join(plain, "DISTANCE.md")) || existsSync(join(plain, "distance.json")), false);
    assert.match(logs.join("\n"), /--reference ops-console: --structure is on .*\n--reference ops-console: --scroll is on \(the reference was measured with its scroll pass/u);
    assert.match(logs.join("\n"), /distance to reference:ops-console \(build\): 4 keep facts differ, 0 avoid values copied/u);

    const distance = JSON.parse(readFileSync(join(withReference, "distance.json"), "utf8"));
    assert.deepEqual([distance.tool, distance.reference, distance.screen, distance.approvedBy, distance.scroll], ["styleseed distance", "ops-console", { label: "build", url: buildUrl }, "reviewer-a", true]);
    assert.equal(distance.contractHash, contractHash(normalizeReferenceEvidence(JSON.parse(readFileSync(join(root, ".styleseed/rulesets/ops-console/evidence.json"), "utf8")))));
    assert.deepEqual(distance.rows.filter((r) => r.transfer === "keep" && r.status === "different").map((r) => `${r.id} @${r.viewport}`), DIFFER_ALL);
    assert.equal(row(distance.rows, "density.table.rowHeight").status, "different", "52px rows against 40px within 4px: an adapted row");
    assert.equal(row(distance.rows, "tokens.fonts", "both").status, "clear", "Inter is the project's brand font: owned, not copied");
    assert.equal(row(distance.rows, "tokens.accent", "both").status, "clear", "the build paints its actions blue");
    const md = readFileSync(join(withReference, "DISTANCE.md"), "utf8");
    assert.ok(md.startsWith("# Distance to reference:ops-console — build\n"));
    assert.ok(md.includes("**Verdict:** 4 keep facts differ, 0 avoid values copied."));
    assert.ok(!readFileSync(join(withReference, "DRIFT.md"), "utf8").includes("Distance"), "nothing of the distance enters DRIFT.md");

    assert.equal(gateFailure(plainResult), "drift gate: FAIL — drift on other", "no --reference: the gate is today's (the two screens disagree on the accent)");
    assert.equal(gateFailure(result), `drift gate: FAIL — drift on other\ndistance gate: FAIL — keep facts that differ: ${DIFFER_ALL.join(", ")}`, "with --reference the distance gate is added and names each fact");

    // The reference page itself, measured against its own contract: nothing differs, and its accent
    // is the reference's, which this project does not own.
    const second = await report(args(join(tmp, "second"), ["--reference", "ops-console", "--screen", "other"]), () => {}, { loadBrowserImpl: stubChromium(pages).loadBrowserImpl });
    assert.equal(second.distance.screen, "other");
    assert.equal(second.distance.verdict, "0 keep facts differ, 1 avoid value copied");
    assert.equal(gateFailure(second).split("\n").at(-1), "distance gate: FAIL — avoid values copied: tokens.accent");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("facts from buildFacts carry what compareToContract matches on: id and viewport", () => {
  const { summary } = built();
  const doc = buildFacts(summary, summary.structure, "https://example.test/build", "2026-11-11");
  assert.ok(doc.facts.every((f) => typeof f.id === "string" && (Number.isInteger(f.viewport) || f.viewport === "both")));
  assert.deepEqual(compareToContract({ facts: doc, summary }, approved()), compareToContract({ facts: doc.facts, summary }, approved()), "a facts.json document or its facts array");
});
