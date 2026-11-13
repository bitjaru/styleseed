import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLAIMS, CONSENSUS_VERSION, GATE_CANDIDATES, consensusRows, generateReports, lineageValue, mode, negativeControl, px4, rowStatus,
  screenClaim, stripIds, validateManifest,
} from "../lib/consensus.mjs";
import { buildRecord, cachedRobots, checkRunFolder, measureScreens, parseArgs, runFolders, samePage, selfHostedUrl } from "../consensus-study.mjs";
import { checkRobots } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { FAULT_CLASSES } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { observation, structure } from "../lib/reference-synthetic.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const studyRoot = resolve(repoRoot, "research/consensus");
const CLASS_IDS = FAULT_CLASSES.map((c) => c.id);
const SEVEN = ["expert", "approved", "endorsed", "validated", "best practice", "industry standard", "proven"];
const claim = (id) => CLAIMS.find((c) => c.id === id);

// A fictional manifest: four product systems and two kits on fictional hosts.
const LINEAGES = [["alpha", "product-system"], ["beta", "product-system"], ["gamma", "product-system"], ["delta", "product-system"], ["kit-one", "kit"], ["kit-two", "kit"]];
function manifest(screens) {
  return {
    manifestVersion: 1, checkedAt: "2026-11-12", viewports: [[1440, 900], [390, 844]],
    lineages: LINEAGES.map(([id, kind]) => ({
      id, name: `${id} system`, kind, host: `${id}.example.test`, access: "hosted", repository: `example/${id}`, licence: "MIT",
      robots: { checkedAt: "2026-11-12", verdict: "allowed" }, terms: { url: null, checkedAt: "2026-11-12", automatedAccess: "not-mentioned", note: "" },
    })),
    screens: screens.map(([id, lineage, pageType, tier = "screen"]) => ({ id, lineage, pageType, tier, url: `https://${lineage}.example.test/${id}`, expect: { elements: 1 } })),
  };
}

const zeroCounts = () => Object.fromEntries(CLASS_IDS.map((id) => [id, 0]));
const NO_CANDIDATES = { amounts: 0, overlaps: 0, spills: 0, clips: 0, insets: 0, touches: 0, gaps: 0, aligns: 0, emoji: 0 };
const DISTRIBUTION = () => ({ "tight-inset": { panel: { 2: 0, 4: 1 }, chip: { 2: 0, 4: 0 } }, "text-touch": { 1: 0, 2: 1 }, "near-touch": { 1: 0, 2: 0 }, "near-align": { 1: 1, 2: 2 } });
// Control-probe output: one field kind and one labelled button, as the probe keys them.
const ctl = ({ field = null, self = field, fieldR = 6, font = 14, panel = "narrow", button = null, buttonR = 6, emphasis = "filled", n = 1 } = {}) => ({
  fields: field === null ? {} : { [`text|${field}|${self}|${fieldR}|${font}|${panel}`]: n },
  buttons: button === null ? {} : { [`${emphasis}|${button}|${buttonR}|14`]: n },
});
function vp(width, o = {}) {
  return {
    viewport: width, height: width === 1440 ? 900 : 844, status: "measured", httpStatus: 200, elements: 300, truncated: false, documentHeight: 900, overlayShare: 0,
    design: { controlHeights: {}, radii: {}, targets: {}, type: {}, spacing: {}, bodyFontSize: 14 },
    structure: { regions: [], controls: { buttons: {}, inputs: {}, labels: {}, leftEdges: 0 }, tables: o.tables ?? [], lists: o.lists ?? [], tabs: [], css: { hover: 0, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 0, truncated: false }, skipped: { shadowHosts: 0, iframes: 0 } },
    controls: { fields: o.fields ?? {}, buttons: o.buttons ?? {}, pairs: o.pairs ?? [], textSizes: o.textSizes ?? {}, capped: {}, truncated: false },
    faults: { counts: { ...zeroCounts(), ...(o.counts ?? {}) }, candidates: { ...NO_CANDIDATES, ...(o.candidates ?? {}) }, findings: [], distribution: o.distribution ?? DISTRIBUTION(), icons: o.icons ?? { sets: {}, unknown: 0 }, capped: o.capped ?? {} },
  };
}
function rec(m, id, { at1440 = {}, at390 = at1440, failed390 = null, values = {}, facts = [] } = {}) {
  const screen = m.screens.find((s) => s.id === id);
  return {
    recordVersion: 1, screen: id, url: screen.url, access: "hosted", observedAt: "2026-11-13", robots: "allowed", scroll: false,
    viewports: [vp(1440, at1440), failed390 ? { viewport: 390, height: 844, status: "failed", reason: failed390 } : vp(390, at390)],
    values: { accent: "#0066cc", ink: "#151515", canvas: "#f2f2f2", spacingBase: 8, spacingCoverage: 0.8, spacingScale: [8, 16], radii: [4], controlHeights: [32], typeSizes: [14], fontCount: 1, motion: { transitions: 0, durations: [], properties: {} }, ...values },
    facts,
  };
}
const runOf = (m, statuses = {}) => ({
  run: "2026-11-13", version: 1, probes: { structure: 1, faults: 1, controls: 1 }, chromium: "131.0.6778.33", viewports: [[1440, 900], [390, 844]], scroll: false, delay: 4000,
  faultClasses: CLASS_IDS, screens: m.screens.map((s) => statuses[s.id] ?? { screen: s.id, status: "measured" }),
});
const value = (id, record) => screenClaim(claim(id), record);
const row = (rows, id, pageType) => rows.find((r) => r.claim === id && r.pageType === pageType);

test("px4 and mode, with ties to the smaller value", () => {
  assert.deepEqual([px4(30), px4(31), px4(33), px4(37), px4(38)], [32, 32, 32, 36, 40]);
  assert.equal(mode([[32, 2], [36, 1]]), 32);
  assert.equal(mode([[36, 2], [32, 2]]), 32, "a tie goes to the smaller value");
  assert.equal(mode([[40, 1], [36, 1], [36, 1]]), 36, "weights add up per value");
  assert.equal(mode([]), null);
});

test("each claim reads only the screens that can show it", () => {
  const m = manifest([["a1", "alpha", "form"]]);
  const r = (o) => rec(m, "a1", o);
  // A wrapped input: the visible box 32, the input element 22, a 32px button.
  const wrapped = r({ at1440: { ...ctl({ field: 32, self: 22, button: 32 }), pairs: [{ field: 32, button: 32, fieldRadius: 6, buttonRadius: 6 }] } });
  assert.deepEqual(value("controls.shareHeight", wrapped), { eligible: true, value: true });
  assert.deepEqual(value("controls.rowShareHeight", wrapped), { eligible: true, value: true });
  assert.deepEqual(value("controls.shareHeight", r({ at1440: ctl({ field: 32, button: 36 }) })), { eligible: true, value: false });
  assert.deepEqual(value("controls.shareHeight", r({ at1440: ctl({ field: 32 }) })), { eligible: false, value: null }, "no button: not false, no value");
  assert.deepEqual(value("controls.shareHeight", r({ at1440: ctl({ field: 32, button: 32, emphasis: "text" }) })), { eligible: false, value: null }, "a text button is not a filled or outline button");
  assert.deepEqual(value("controls.rowShareHeight", r({ at1440: { pairs: [{ field: 32, button: 32 }, { field: 32, button: 40 }] } })).value, false);
  assert.equal(value("controls.rowShareHeight", r({ at1440: ctl({ field: 32, button: 32 }) })).eligible, false, "no pair");
  // Radius: a pill button beside a 6px field; two pills; 6 and 7.
  assert.deepEqual(value("controls.shareRadius", r({ at1440: ctl({ field: 32, button: 32, fieldR: 6, buttonR: 999 }) })), { eligible: true, value: false });
  assert.equal(value("controls.shareRadius", r({ at1440: ctl({ field: 32, button: 32, fieldR: 999, buttonR: 999 }) })).value, true);
  assert.equal(value("controls.shareRadius", r({ at1440: ctl({ field: 32, button: 32, fieldR: 6, buttonR: 7 }) })).value, true);
  // Sizes.
  assert.equal(value("controls.pointerUnder44", r({ at1440: ctl({ button: 40 }) })).value, true);
  assert.equal(value("controls.pointerUnder44", r({ at1440: ctl({ button: 44 }) })).value, false);
  assert.equal(value("controls.narrowAtLeast44", r({ at1440: ctl({ button: 32 }), at390: ctl({ button: 44 }) })).value, true);
  assert.equal(value("controls.narrowAtLeast44", r({ at1440: ctl({ button: 32 }), failed390: "timeout" })).eligible, false, "a failed 390 viewport has no value");
  assert.equal(value("button.height", r({ at1440: ctl({ button: 37 }) })).value, 36);
  assert.equal(value("field.height", r({ at1440: ctl({ field: 30 }) })).value, 32);
  assert.equal(value("field.textSize", r({ at1440: ctl({ field: 32, font: 13.5 }) })).value, 14);
  assert.equal(value("fields.inPanel", r({ at1440: ctl({ field: 32, n: 2 }) })).value, true);
  assert.equal(value("fields.inPanel", r({ at1440: ctl({ field: 32, n: 2, panel: "none" }) })).value, false);
  assert.equal(value("fields.inPanel", r({ at1440: ctl({ field: 32, n: 1 }) })).eligible, false, "one field cannot say");
  assert.equal(value("text.bodySize", r({ at1440: { textSizes: { 14: 150, 13.5: 160 } } })).value, 14, "the size with the most characters, rounded");
  assert.equal(value("text.bodySize", r({ at1440: { textSizes: { 14: 150 } } })).eligible, false, "under 200 characters");
  // Facts and structure.
  const fact = (id, v, viewport = 1440, extra = {}) => ({ id, axis: "density", level: "observed", value: v, viewport, from: "structure", ...extra });
  assert.equal(value("table.rowHeight", r({ facts: [fact("density.table.rowHeight", 41)] })).value, 40);
  assert.equal(value("table.rowHeight", r({ facts: [fact("density.table.rowHeight", 41, 390)] })).eligible, false, "1440 only");
  assert.equal(value("list.overFourRows", r({ at1440: { tables: [{ rows: 3 }], lists: [{ items: 6 }] } })).value, true);
  assert.equal(value("list.overFourRows", r({ at1440: { tables: [{ rows: 4 }] } })).value, false);
  assert.equal(value("list.overFourRows", r()).eligible, false);
  assert.equal(value("primary.onePerSection", r({ facts: [fact("navigation.primary.perSectionMax", 1)] })).value, true);
  assert.equal(value("primary.onePerSection", r({ facts: [fact("navigation.primary.perSectionMax", 2)] })).value, false);
  // Fault classes: eligibility from the candidate and icon counts, any measured viewport.
  assert.equal(value("amounts.oneLine", r()).eligible, false, "no amount candidate: a zero says nothing");
  assert.equal(value("amounts.oneLine", r({ at1440: { candidates: { amounts: 2 } }, at390: { candidates: { amounts: 2 }, counts: { "amount-wrap": 1 } } })).value, false);
  assert.equal(value("amounts.oneLine", r({ at1440: { candidates: { amounts: 2 } } })).value, true);
  const icons = { sets: { "24|stroke": 3 }, unknown: 0 };
  assert.equal(value("icons.noEmoji", r({ at1440: { icons } })).value, true);
  assert.equal(value("icons.noEmoji", r({ at1440: { icons: { sets: {}, unknown: 1 }, counts: { "emoji-icon": 1 } } })).value, false);
  assert.equal(value("icons.oneFamily", r({ at1440: { icons, counts: { "icon-mix": 2 } } })).value, false);
  assert.equal(value("icons.oneFamily", r()).eligible, false);
});

test("lineage value: majority, mixed, every", () => {
  assert.equal(lineageValue([true, true, false]), true);
  assert.equal(lineageValue([32, 36]), "mixed", "no bucket holds more than half");
  assert.equal(lineageValue([32, 32, 36, 40]), "mixed", "half is not more than half");
  assert.equal(lineageValue([32, 32, 36]), 32);
  assert.equal(lineageValue([true, true], "every"), true);
  assert.equal(lineageValue([true, false, true], "every"), false);
  assert.equal(lineageValue([]), null);
});

// One dashboard screen per lineage with a field of 32 and a button of 32 (true) or 40 (false).
function shareHeightRow(values) {
  const ids = Object.keys(values);
  const m = manifest(ids.map((lineage) => [`${lineage}-home`, lineage, "dashboard"]));
  const records = ids.map((lineage) => rec(m, `${lineage}-home`, { at1440: ctl({ field: 32, button: values[lineage] ? 32 : 40 }) }));
  return row(consensusRows(m, records), "controls.shareHeight", "dashboard");
}

test("status: thin, split, candidate, and agreement on the opposite of the clause", () => {
  assert.equal(rowStatus({ measured: 2, agree: 2, agreeProductSystems: 2 }), "thin");
  assert.equal(shareHeightRow({ alpha: true, beta: true }).status, "thin");
  const twoOfFour = shareHeightRow({ alpha: true, beta: true, gamma: false, delta: false });
  assert.deepEqual([twoOfFour.measured, twoOfFour.agree, twoOfFour.top, twoOfFour.status], [4, 2, false, "split"], "a tie goes to false");
  assert.equal(shareHeightRow({ alpha: true, beta: true, "kit-one": true, gamma: false, delta: false }).status, "split", "3 of 5 is under two thirds");
  const three = shareHeightRow({ alpha: true, beta: true, "kit-one": true });
  assert.deepEqual([three.agree, three.agreeProductSystems, three.agreeKits, three.status, three.supportsRule], [3, 2, 1, "candidate", true]);
  assert.equal(shareHeightRow({ alpha: true, beta: true, gamma: true, "kit-one": true, delta: false }).status, "candidate", "4 of 5");
  assert.equal(shareHeightRow({ alpha: true, "kit-one": true, "kit-two": true }).status, "split", "one product system cannot carry a row");
  const against = shareHeightRow({ alpha: false, beta: false, gamma: false, "kit-one": true });
  assert.deepEqual([against.top, against.status, against.supportsRule], [false, "candidate", false]);
  assert.deepEqual(against.distribution, [{ bucket: false, lineages: 3, productSystems: 3, kits: 0 }, { bucket: true, lineages: 1, productSystems: 0, kits: 1 }]);
  // A dimension is a distribution only; a claim without a rule supports none.
  const m = manifest([["a1", "alpha", "dashboard"]]);
  const rows = consensusRows(m, [rec(m, "a1", { at1440: ctl({ field: 32, button: 32 }) })]);
  assert.deepEqual([row(rows, "button.height", "dashboard").status, row(rows, "button.height", "dashboard").top], [null, 32]);
  assert.equal(row(rows, "controls.shareRadius", "dashboard").supportsRule, null);
  assert.deepEqual([...new Set(rows.map((r) => r.pageType))], ["dashboard", "list", "form", "detail", "all"]);
  assert.deepEqual(rows.filter((r) => r.claim.startsWith("lineage.")).map((r) => r.pageType), ["all", "all", "all"]);
  assert.deepEqual(rows.filter((r) => r.claim === "fields.inPanel").map((r) => r.pageType), ["form"]);
});

test("fragments change withFragments and never measured, agree, or status", () => {
  const screens = [["a-form", "alpha", "form"], ["b-form", "beta", "form"], ["k-form", "kit-one", "form"], ["g-frag", "gamma", "form", "fragment"], ["d-frag", "delta", "form", "fragment"]];
  const m = manifest(screens);
  const records = [
    rec(m, "a-form", { at1440: ctl({ field: 32, button: 32 }) }), rec(m, "b-form", { at1440: ctl({ field: 32, button: 32 }) }), rec(m, "k-form", { at1440: ctl({ field: 32, button: 40 }) }),
    rec(m, "g-frag", { at1440: ctl({ field: 40, button: 48 }) }), rec(m, "d-frag", { at1440: ctl({ field: 40, button: 48 }) }),
  ];
  const withFrag = row(consensusRows(m, records), "controls.shareHeight", "form");
  const without = row(consensusRows(m, records.slice(0, 3)), "controls.shareHeight", "form");
  for (const key of ["measured", "agree", "agreeProductSystems", "status", "top", "distribution", "lineages"]) assert.deepEqual(withFrag[key], without[key], key);
  assert.deepEqual([withFrag.measured, withFrag.agree, withFrag.status], [3, 2, "split"]);
  assert.deepEqual([withFrag.withFragments.measured, withFrag.withFragments.agree, withFrag.withFragments.top], [5, 3, false], "with the two fragments, false leads");
  assert.notDeepEqual(withFrag.withFragments.distribution, without.withFragments.distribution);
  assert.equal(row(consensusRows(m, records), "list.overFourRows", "list").withFragments, null, "claims without the flag carry no withFragments");
});

test("lineage-scope claims: the minimum of screens, colours 20 apart and 60 apart", () => {
  const m = manifest([["a1", "alpha", "dashboard"], ["a2", "alpha", "list"], ["a3", "alpha", "form"], ["b1", "beta", "dashboard"], ["b2", "beta", "list"]]);
  const roles = (accent, base = 8) => ({ values: { accent, spacingBase: base } });
  const lineage = (rows, id, l) => row(rows, id, "all").lineages.find((x) => x.lineage === l);
  let rows = consensusRows(m, [rec(m, "a1", roles("#0066cc")), rec(m, "a2", roles("#0066cc")), rec(m, "a3", roles("#0066e0")), rec(m, "b1"), rec(m, "b2")]);
  assert.equal(lineage(rows, "lineage.rolesConstant", "alpha").value, true, "20 apart is constant");
  assert.equal(lineage(rows, "lineage.rolesConstant", "beta").value, null, "two screens are under the minimum of three");
  assert.equal(lineage(rows, "lineage.spacingBase", "alpha").value, true);
  rows = consensusRows(m, [rec(m, "a1", roles("#0a0a0a")), rec(m, "a2", roles("#0a0a0a")), rec(m, "a3", roles("#0a0a46"))]);
  assert.equal(lineage(rows, "lineage.rolesConstant", "alpha").value, false, "60 apart is not");
  rows = consensusRows(m, [rec(m, "a1", roles("#0066cc", 8)), rec(m, "a2", roles("#0066cc", 4)), rec(m, "a3", roles("#0066cc", null))]);
  assert.deepEqual([lineage(rows, "lineage.rolesConstant", "alpha").value, lineage(rows, "lineage.spacingBase", "alpha").value], [false, false]);
  rows = consensusRows(m, [rec(m, "a1", { at1440: ctl({ button: 32 }) }), rec(m, "a2", { at1440: ctl({ button: 33 }) }), rec(m, "a3", { at1440: ctl({ button: 36 }) })]);
  assert.equal(lineage(rows, "lineage.buttonHeight", "alpha").value, false);
  rows = consensusRows(m, [rec(m, "a1", { at1440: ctl({ button: 32 }) }), rec(m, "a2", { at1440: ctl({ button: 33 }) }), rec(m, "a3")]);
  assert.equal(lineage(rows, "lineage.buttonHeight", "alpha").value, null, "two eligible screens");
  const css = (v, bound) => ({ facts: [{ id: "states.css.reducedMotion", axis: "states-motion", level: "observed", value: v, viewport: "both", from: "structure.css", ...(bound ? { bound } : {}) }] });
  rows = consensusRows(m, [rec(m, "a1", css(0, "lower")), rec(m, "a2", css(0)), rec(m, "b1", css(0, "lower")), rec(m, "b2", css(2, "lower"))]);
  assert.equal(lineage(rows, "motion.reducedMotionRules", "alpha").value, false);
  assert.equal(lineage(rows, "motion.reducedMotionRules", "beta").value, true, "a lower bound above 0 still counts");
  const motion = (transitions, all) => ({ values: { motion: { transitions, durations: [], properties: { all } } } });
  rows = consensusRows(m, [rec(m, "a1", motion(15, 3)), rec(m, "a2", motion(10, 0)), rec(m, "b1", motion(10, 0))]);
  assert.equal(lineage(rows, "motion.transitionAll", "alpha").value, 0.5, "3 of 25 is in the band up to 0.5");
  assert.equal(lineage(rows, "motion.transitionAll", "beta").value, null, "under 20 transitions");
});

function negativeFixture() {
  const m = manifest([["a1", "alpha", "dashboard"], ["a2", "alpha", "list"], ["b1", "beta", "dashboard"], ["k1", "kit-one", "form"], ["g-frag", "gamma", "form", "fragment"]]);
  const records = [
    rec(m, "a1", { at1440: { counts: { "near-align": 2 }, candidates: { aligns: 5 } }, at390: { counts: { "near-align": 1 } } }),
    rec(m, "a2", { at1440: { counts: { "icon-mix": 1 } }, failed390: "timeout" }),
    rec(m, "b1", { at1440: { counts: { "near-align": 4 } }, at390: { capped: { textRuns: 3 } } }),
    rec(m, "k1"),
    rec(m, "g-frag", { at1440: { counts: { "near-align": 9 } } }),
  ];
  return { m, records };
}

test("negative control: rates per viewport, and a failed 390 viewport leaves the 390 denominator", () => {
  const { m, records } = negativeFixture();
  const doc = negativeControl(m, records, CLASS_IDS);
  const cls = (id, width) => doc.classes.find((c) => c.class === id).viewports.find((v) => v.viewport === width);
  assert.deepEqual(cls("near-align", 1440), { viewport: 1440, screensMeasured: 4, screensWithAny: 2, findings: 6, lineagesMeasured: 3, lineagesWithAny: 2, mostOnOneScreen: 4, candidates: 5 });
  assert.deepEqual(cls("near-align", 390), { viewport: 390, screensMeasured: 3, screensWithAny: 1, findings: 1, lineagesMeasured: 3, lineagesWithAny: 1, mostOnOneScreen: 1, candidates: 0 });
  assert.equal(cls("icon-mix", 1440).candidates, null, "icon-mix has no candidate list");
  assert.deepEqual(doc.capped, [{ screen: "b1", viewport: 390 }]);
  assert.deepEqual(doc.distribution.find((d) => d.viewport === 1440)["near-align"], { 1: 4, 2: 8 }, "summed over the four full screens");
  assert.deepEqual(doc.screens.find((s) => s.screen === "a2").viewports[1], { viewport: 390, status: "failed", reason: "timeout" });
  assert.deepEqual(doc.fragments.map((s) => s.screen), ["g-frag"], "fragments are listed apart and are in no rate");
  assert.deepEqual(doc.classes.map((c) => c.class), CLASS_IDS, "class order of run.json");
});

test("determinism, plain wording, and the allow-list over the generated files", () => {
  const { m, records } = negativeFixture();
  const run = runOf(m);
  const first = generateReports(m, run, records), second = generateReports(m, run, [...records].reverse());
  assert.deepEqual(Object.keys(first), ["consensus.json", "CONSENSUS.md", "negative-control.json", "NEGATIVE-CONTROL.md"]);
  for (const name of Object.keys(first)) assert.equal(second[name], first[name], `${name}: records in another order give the same bytes`);
  for (const name of ["CONSENSUS.md", "NEGATIVE-CONTROL.md"]) for (const word of SEVEN) assert.ok(!first[name].toLowerCase().includes(word), `${name} must not say "${word}"`);
  assert.match(first["CONSENSUS.md"], /^# Agreement across design systems — run `2026-11-13`\n/u);
  assert.match(first["CONSENSUS.md"], /It is not a review and not design acceptance, and it gates nothing\./u);
  assert.match(first["NEGATIVE-CONTROL.md"], /Whether a definition or a threshold should change is a later decision; this run changes none\./u);
  for (const id of GATE_CANDIDATES) assert.match(first["NEGATIVE-CONTROL.md"], new RegExp(`^- ${id}: \\d+ finding\\(s\\) at 1440, \\d+ at 390\\.$`, "mu"));
  const consensus = JSON.parse(first["consensus.json"]);
  assert.deepEqual([consensus.consensusVersion, consensus.run, consensus.screens], [CONSENSUS_VERSION, "2026-11-13", { listed: 5, measured: 5, failed: 0, skipped: 0 }]);
  for (const name of ["consensus.json", "negative-control.json"]) assert.deepEqual(disallowedStrings(stripIds(JSON.parse(first[name]), m)), [], `${name} passes the walk`);
  for (const r of records) assert.deepEqual(disallowedStrings(stripIds(r, m)), [], `${r.screen}: a synthetic record passes the walk`);
});

test("the allow-list: a record built from probe output passes; a label string and a foreign id fail", () => {
  const m = manifest([["a1", "alpha", "form"]]);
  const screen = m.screens[0];
  const faults = (width) => ({ version: 1, viewport: { width, height: 900 }, elements: 40, truncated: false, textRuns: 10, amounts: [{ box: [1, 2, 3, 4], lines: 2, size: 32, forced: false }], overlaps: [], spills: [], clips: [], insets: [], touches: [], gaps: [], aligns: [], emoji: [], icons: { sets: { "24|stroke": 2 }, groups: [], unknown: 0 }, capped: {} });
  const outputs = (width) => {
    const { structure: s, ...design } = observation(width);
    return { design, structure: s, faults: faults(width), controls: { version: 1, viewport: { width, height: 900 }, truncated: false, fields: { "text|36|36|4|14|narrow": 6 }, buttons: { "filled|36|4|14": 3, "outline|36|4|14": 3 }, pairs: [{ field: 36, button: 36, fieldRadius: 4, buttonRadius: 4 }], textSizes: { 14: 400 }, capped: {} }, guards: { overlayShare: 0 } };
  };
  const sizes = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
  const record = buildRecord({ screen, access: "hosted", robots: "allowed", observedAt: "2026-11-13", sizes, results: [{ status: "measured", httpStatus: 200, outputs: outputs(1440) }, { status: "failed", reason: "overlay" }] });
  assert.deepEqual(disallowedStrings(stripIds(record, m)), []);
  const text = JSON.stringify(record);
  assert.ok(!text.includes("Inter"), "no font family name is stored");
  for (const key of ["fonts", "actions", "links", "text", "surfaces", "shadows", "borders", "backdrop", "sections"]) assert.ok(!Object.hasOwn(record.viewports[0].design, key) && !Object.hasOwn(record.viewports[0].structure, key), key);
  assert.deepEqual(Object.keys(record), ["recordVersion", "screen", "url", "access", "observedAt", "robots", "scroll", "viewports", "values", "facts"]);
  assert.deepEqual(record.viewports[1], { viewport: 390, height: 844, status: "failed", reason: "overlay" });
  assert.deepEqual([record.viewports[0].faults.counts["amount-wrap"], record.viewports[0].faults.candidates.amounts], [1, 1]);
  assert.equal(record.values.fontCount, 1);
  assert.ok(record.facts.length > 0);
  // A label string, a foreign screen id, and an id used as a key fail.
  const labelled = structuredClone(record);
  labelled.viewports[0].controls.fields = { "Email address|36|36|4|14|narrow": 1 };
  assert.equal(disallowedStrings(stripIds(labelled, m)).length, 1);
  assert.equal(disallowedStrings(stripIds({ ...record, screen: "omega-home" }, m)).length, 1, "a screen that is not in the manifest stays and fails");
  assert.equal(disallowedStrings(stripIds({ ...record, values: { ...record.values, a1: 1 } }, m)).length, 1, "an id as an object key fails");
  assert.equal(disallowedStrings(stripIds({ ...record, url: "https://elsewhere.example.test/page" }, m)).length, 1, "a URL that is not the screen's stays and fails");
  assert.equal(disallowedStrings(stripIds({ ...record, lineage: "a1" }, m)).length, 1, "a screen id under lineage stays and fails");
});

test("validateManifest: the real screens.json, and broken copies", () => {
  const real = JSON.parse(readFileSync(resolve(studyRoot, "screens.json"), "utf8"));
  assert.deepEqual(validateManifest(real), []);
  assert.equal(real.screens.length, 32);
  assert.equal(real.screens.filter((s) => s.tier === "fragment").length, 2);
  assert.deepEqual(real.lineages.map((l) => [l.id, l.kind]), [["cloudscape", "product-system"], ["patternfly", "product-system"], ["antpro", "kit"], ["shadcn", "kit"], ["primer", "product-system"], ["carbon", "product-system"]]);
  const broken = (edit) => { const copy = structuredClone(real); edit(copy); return validateManifest(copy); };
  const fails = (edit, pattern) => { const errors = broken(edit); assert.ok(errors.some((e) => pattern.test(e)), `${pattern}: ${JSON.stringify(errors)}`); };
  fails((c) => { c.screens[1].id = c.screens[0].id; }, /screens\[1\].*\.id is used twice/u);
  fails((c) => { c.screens[0].id = "Cloudscape_Home"; }, /\.id must match/u);
  fails((c) => { c.screens[0].lineage = "nowhere"; }, /\.lineage must be the id of a listed lineage/u);
  fails((c) => { c.screens[0].pageType = "settings"; }, /\.pageType must be one of/u);
  fails((c) => { c.screens[0].tier = "partial"; }, /\.tier must be one of/u);
  fails((c) => { c.screens[9].url = c.screens[9].url.replace("https:", "http:"); }, /\.url must be an https URL/u);
  fails((c) => { c.screens[9].url = "https://elsewhere.example.test/a/"; }, /must be on the lineage's host/u);
  fails((c) => { c.screens[0].url = "https://cloudscape.design/other/dashboard.html"; }, /must start with the lineage's basePath/u);
  fails((c) => { c.screens[0].expect.elements = "500"; }, /expect\.elements must be a whole number/u);
  fails((c) => { c.screens[0].expect = { rows: 3 }; }, /expect\.rows is not a floor/u);
  fails((c) => { c.lineages[1].kind = "vendor"; }, /\.kind must be one of/u);
  fails((c) => { Object.assign(c.lineages[1].terms, { automatedAccess: "conditional", checkedAt: "2026-11-12", note: "" }); }, /terms\.note must say which condition/u);
  fails((c) => { Object.assign(c.lineages[1].terms, { automatedAccess: "not-mentioned", checkedAt: null }); }, /terms\.checkedAt must be the date of the check/u);
  fails((c) => { delete c.lineages[0].basePath; }, /basePath must be the path prefix/u);
  fails((c) => { c.viewports = [[1280, 800]]; }, /viewports must be/u);
});

test("every claim's clause is part of its rule's statement in the catalog", () => {
  const catalog = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8"));
  const statements = new Map(catalog.rules.map((r) => [r.id, r.statement]));
  const withRule = CLAIMS.filter((c) => c.rule);
  assert.deepEqual([...new Set(withRule.map((c) => c.rule))], ["CRAFT-control-heights", "DL-21-density-by-task", "DL-23-amounts-never-wrap", "CRAFT-functional-icons", "CRAFT-icon-family", "INV-05-no-unexplained-role-drift", "CRAFT-spacing-scale"]);
  for (const c of withRule) {
    assert.ok(statements.has(c.rule), `${c.id}: ${c.rule} is in the catalog`);
    assert.ok(statements.get(c.rule).includes(c.clause), `${c.id}: "${c.clause}" is a substring of ${c.rule}`);
    assert.equal(c.transfer, "keep", `${c.id}: only a consistency claim can support a rule`);
    assert.equal(c.expect, true);
  }
  for (const c of CLAIMS.filter((x) => !x.rule)) assert.deepEqual([c.clause, c.expect], [null, null], c.id);
});

function writeRun(dir, m, run, records) {
  mkdirSync(join(dir, "screens"), { recursive: true });
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(m, null, 2)}\n`);
  writeFileSync(join(dir, "run.json"), `${JSON.stringify(run, null, 1)}\n`);
  for (const r of records) writeFileSync(join(dir, "screens", `${r.screen}.json`), `${JSON.stringify(r, null, 1)}\n`);
  for (const [name, text] of Object.entries(generateReports(m, run, records))) writeFileSync(join(dir, name), text);
}

test("stored runs: each run folder passes the walk and regenerates to its bytes; the scan on a fixture run", () => {
  for (const dir of runFolders(studyRoot)) assert.deepEqual(checkRunFolder(dir).errors, [], dir.split("\\").join("/"));
  const root = mkdtempSync(join(tmpdir(), "styleseed-consensus-"));
  try {
    const { m, records } = negativeFixture();
    const run = runOf(m, { k1: { screen: "k1", status: "skipped", reason: "robots" } });
    const kept = records.filter((r) => r.screen !== "k1");
    const dir = join(root, "runs", "2026-11-13");
    writeRun(dir, m, run, kept);
    assert.deepEqual(runFolders(root), [dir]);
    const ok = checkRunFolder(dir);
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.counts, { listed: 5, measured: 4, failed: 0, skipped: 1 });
    // A generated file edited by hand, a picture in the folder, a record that leaks, a missing row.
    writeFileSync(join(dir, "CONSENSUS.md"), `${readFileSync(join(dir, "CONSENSUS.md"), "utf8")}\nedited\n`);
    assert.ok(checkRunFolder(dir).errors.some((e) => /CONSENSUS\.md: differs from what the records give/u.test(e)));
    writeRun(dir, m, run, kept);
    writeFileSync(join(dir, "screen.png"), "not an image");
    assert.ok(checkRunFolder(dir).errors.some((e) => /screen\.png: a run folder holds only/u.test(e)));
    rmSync(join(dir, "screen.png"));
    const leaking = structuredClone(kept[0]);
    leaking.viewports[0].controls.fields = { "Save changes|32|32|6|14|none": 1 };
    writeFileSync(join(dir, "screens", "a1.json"), `${JSON.stringify(leaking, null, 1)}\n`);
    assert.ok(checkRunFolder(dir).errors.some((e) => /screens\/a1\.json: .*Save/u.test(e)));
    writeRun(dir, m, { ...run, screens: run.screens.filter((r) => r.screen !== "b1") }, kept);
    assert.ok(checkRunFolder(dir).errors.some((e) => /b1 needs exactly one status row/u.test(e)));
    writeRun(dir, m, { ...run, screens: run.screens.map((r) => (r.screen === "k1" ? { screen: "k1", status: "skipped" } : r)) }, kept);
    assert.ok(checkRunFolder(dir).errors.some((e) => /k1 is skipped without a known reason/u.test(e)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("parseArgs, samePage, selfHostedUrl", () => {
  const measure = parseArgs(["--measure"]);
  assert.deepEqual([measure.mode, measure.run, measure.only, measure.bases, measure.delay, measure.timeout], ["measure", null, null, {}, 4000, 45000]);
  assert.match(measure.browser.split("\\").join("/"), /playwright\/index\.mjs$/u);
  assert.match(measure.root.split("\\").join("/"), /research\/consensus$/u);
  const full = parseArgs(["--measure", "--run", "2026-11-13", "--only", "alpha-home,beta-home", "--base", "alpha=http://127.0.0.1:8080/demos/", "--delay", "0", "--timeout", "1000"]);
  assert.deepEqual([full.run, full.only, full.bases, full.delay, full.timeout], ["2026-11-13", ["alpha-home", "beta-home"], { alpha: "http://127.0.0.1:8080/demos/" }, 0, 1000]);
  assert.equal(parseArgs(["--report", "--run", "2026-11-13"]).mode, "report");
  assert.equal(parseArgs(["--check"]).mode, "check");
  const throws = (argv, pattern) => assert.throws(() => parseArgs(argv), pattern, argv.join(" "));
  throws([], /exactly one of --measure, --report, --check/u);
  throws(["--measure", "--check"], /exactly one/u);
  throws(["--report"], /--report needs --run/u);
  throws(["--measure", "--run", "13-11-2026"], /--run must be a date/u);
  throws(["--check", "--only", "a"], /belong to --measure/u);
  throws(["--measure", "--base", "alpha"], /<lineage>=<url prefix>/u);
  throws(["--measure", "--base", "alpha=http://127.0.0.1:8080/demos"], /ending with \//u);
  throws(["--measure", "--base", "alpha=file:///tmp/"], /http\(s\) URL/u);
  throws(["--measure", "--base", "alpha=http://a.test/", "--base", "alpha=http://b.test/"], /given twice/u);
  throws(["--measure", "--delay", "fast"], /whole number/u);
  throws(["--measure", "--only", "Bad_Id"], /not a screen id/u);
  throws(["--measure", "--frames"], /unknown option --frames/u);
  assert.equal(samePage("https://a.test/list/table-list/", "https://a.test/list/table-list"), true);
  assert.equal(samePage("https://a.test/examples/form.html", "https://a.test/examples/form.html#top"), true);
  assert.equal(samePage("https://a.test/docs/", "https://a.test/docs/index.html"), true);
  assert.equal(samePage("https://a.test/a?id=one", "https://a.test/a?id=two"), false, "the query counts");
  assert.equal(samePage("https://a.test/dashboard/analysis/", "https://a.test/user/login?redirect=x"), false);
  assert.equal(samePage("not a url", "https://a.test/"), false);
  assert.equal(selfHostedUrl("https://alpha.example.test/demos/react/form.html?x=1", "/demos/react/", "http://127.0.0.1:8080/"), "http://127.0.0.1:8080/form.html?x=1");
  assert.throws(() => selfHostedUrl("https://alpha.example.test/other/form.html", "/demos/react/", "http://127.0.0.1:8080/"), /basePath/u);
});

test("cachedRobots: one fetch per origin; a robots.txt that redirects to another origin reads as disallowed", async () => {
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    if (url.startsWith("https://moved.example.test")) return { status: 200, ok: true, url: "https://login.example.test/sign-in", text: async () => "User-agent: *\nAllow: /" };
    if (url.startsWith("https://closed.example.test")) return { status: 200, ok: true, url, text: async () => "User-agent: *\nDisallow: /admin" };
    if (url.startsWith("https://down.example.test")) throw new TypeError("fetch failed");
    return { status: 404, ok: false, url, text: async () => "" };
  };
  const fetchImpl = cachedRobots(fake);
  assert.equal((await checkRobots("https://open.example.test/a", { fetchImpl })).status, "allowed", "404 allows");
  assert.equal((await checkRobots("https://open.example.test/b", { fetchImpl })).status, "allowed");
  assert.equal((await checkRobots("https://closed.example.test/list", { fetchImpl })).status, "allowed");
  assert.equal((await checkRobots("https://closed.example.test/admin/users", { fetchImpl })).status, "disallowed");
  assert.equal((await checkRobots("https://moved.example.test/page", { fetchImpl })).status, "disallowed", "redirected to another origin");
  assert.equal((await checkRobots("https://down.example.test/page", { fetchImpl })).status, "disallowed");
  assert.equal((await checkRobots("https://down.example.test/other", { fetchImpl })).status, "disallowed");
  assert.deepEqual(calls, ["https://open.example.test/robots.txt", "https://closed.example.test/robots.txt", "https://moved.example.test/robots.txt", "https://down.example.test/robots.txt"]);
});

test("measureScreens skips without loading: terms, no-base, robots", async () => {
  const m = manifest([["a1", "alpha", "dashboard"], ["b1", "beta", "list"], ["g1", "gamma", "form"], ["d1", "delta", "detail"], ["k1", "kit-one", "form"]]);
  m.lineages[0].access = "skipped";
  m.lineages[1].terms = { url: null, checkedAt: null, automatedAccess: "unchecked", note: "" };
  m.lineages[2].terms = { url: null, checkedAt: "2026-11-12", automatedAccess: "restricted", note: "" };
  Object.assign(m.lineages[3], { access: "self-hosted", basePath: "/" });
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { status: 200, ok: true, url, text: async () => "User-agent: *\nDisallow: /" }; };
  const chromium = { async launch() { throw new Error("nothing may be loaded"); } };
  const result = await measureScreens(m, { chromium, today: "2026-11-13", delay: 0, fetchImpl });
  assert.deepEqual(result.rows, [
    { screen: "a1", status: "skipped", reason: "terms" }, { screen: "b1", status: "skipped", reason: "terms" }, { screen: "g1", status: "skipped", reason: "terms" },
    { screen: "d1", status: "skipped", reason: "no-base" }, { screen: "k1", status: "skipped", reason: "robots" },
  ]);
  assert.deepEqual([result.records, result.chromium, fetched], [[], null, ["https://kit-one.example.test/robots.txt"]]);
  const only = await measureScreens(m, { chromium, today: "2026-11-13", delay: 0, fetchImpl, only: ["a1"] });
  assert.deepEqual(only.rows, [{ screen: "a1", status: "skipped", reason: "terms" }]);
  const down = await measureScreens(manifest([["a1", "alpha", "form"]]), { chromium, today: "2026-11-13", delay: 0, fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  assert.deepEqual(down.rows, [{ screen: "a1", status: "skipped", reason: "robots" }], "an unreadable robots.txt reads as disallowed");
  await assert.rejects(measureScreens(manifest([["a1", "alpha", "form"]]), { chromium, delay: 0, fetchImpl }), /pass today as a date/u);
});
