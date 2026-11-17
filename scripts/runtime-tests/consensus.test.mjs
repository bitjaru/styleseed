import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLAIMS, CONSENSUS_VERSION, GATE_CANDIDATES, anatomyAt, consensusDocument, consensusRows, generateReports, lineageValue, mode, negativeControl, px4,
  renderConsensusMarkdown, rowStatus, screenClaim, spacingSample, stripIds, validateManifest,
} from "../lib/consensus.mjs";
import { RECORD_VERSION, STUDY_VERSION, buildRecord, cachedRobots, checkRunFolder, measureScreens, parseArgs, runFolders, samePage, selfHostedUrl } from "../consensus-study.mjs";
import { checkRobots } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { FAULT_CLASSES } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";
import { observation, structure } from "../lib/reference-synthetic.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const studyRoot = resolve(repoRoot, "research/consensus");
const CLASS_IDS = FAULT_CLASSES.map((c) => c.id);
const SEVEN = ["expert", "approved", "endorsed", "validated", "best practice", "industry standard", "proven"];
const claim = (id) => CLAIMS.find((c) => c.id === id);
const isDateString = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(v);

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
// Anatomy-probe output (WO-12) as the probe keys it: every list empty unless given.
const ANATOMY_LISTS = ["buttons", "fields", "labels", "fieldGaps", "panels", "panelGaps", "cells", "headings", "textLines", "icons"];
const anatomyBlock = (lists = {}) => ({ ...Object.fromEntries(ANATOMY_LISTS.map((k) => [k, {}])), ...lists, capped: {}, truncated: false });
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
    ...(o.anatomy ? { anatomy: anatomyBlock(o.anatomy) } : {}),
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
  assert.equal(real.screens.length, 46);
  assert.equal(real.screens.filter((s) => s.tier === "fragment").length, 2);
  assert.deepEqual(real.lineages.map((l) => [l.id, l.kind]), [["cloudscape", "product-system"], ["patternfly", "product-system"], ["antpro", "kit"], ["shadcn", "kit"], ["primer", "product-system"], ["carbon", "product-system"], ["mui", "kit"], ["govuk", "product-system"]]);
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

// --- WO-12: component anatomy ------------------------------------------------------------------------

const NEW_CLAIMS = CLAIMS.filter((c) => c.group !== null);
const OLD_IDS = ["controls.shareHeight", "controls.rowShareHeight", "controls.shareRadius", "controls.pointerUnder44", "controls.narrowAtLeast44", "button.height", "field.height", "field.textSize", "fields.inPanel", "text.bodySize", "table.rowHeight", "list.overFourRows", "primary.onePerSection", "amounts.oneLine", "icons.noEmoji", "icons.oneFamily", "lineage.rolesConstant", "lineage.spacingBase", "lineage.buttonHeight", "motion.reducedMotionRules", "motion.transitionAll"];
// Keys of the anatomy probe, built from parts in the probe's order.
const btn = ({ emphasis = "filled", height = 32, pad = 16, font = 14, weight = 400, radius = 6, border = 0, icon = "none", iconSize = 0, iconGap = 0 } = {}) => [emphasis, height, pad, font, weight, radius, border, icon, iconSize, iconGap].join("|");
const fld = ({ kind = "text", height = 32, pad = 12, font = 14, radius = 6, style = "box", border = 1, adorned = "none" } = {}) => [kind, height, pad, font, radius, style, border, adorned].join("|");
const lab = ({ position = "above", gap = 8, font = 14, weight = 500 } = {}) => [position, gap, font, weight].join("|");
const pnl = ({ size = "narrow", inset = 24, radius = 8, separation = "border", border = 1 } = {}) => [size, inset, radius, separation, border].join("|");
const cel = ({ part = "body", height = 40, pad = 16, font = 14, weight = 400 } = {}) => [part, height, pad, font, weight].join("|");
const hed = ({ level = 2, size = 18, weight = 600, line = 24 } = {}) => [level, size, weight, line].join("|");
const oneForm = () => manifest([["a1", "alpha", "form"]]);
// A record whose 1440 viewport carries the given anatomy lists (and the same at 390).
const anatomyRecord = (lists, extra = {}) => { const m = oneForm(); return rec(m, "a1", { at1440: { anatomy: lists, ...(extra.at1440 ?? {}) }, values: extra.values ?? {}, facts: extra.facts ?? [] }); };
const at = (id, lists, extra) => screenClaim(claim(id), anatomyRecord(lists, extra));

test("WO-12: 48 new claims beside the 21 of the first run, which keep their ids and order", () => {
  assert.equal(CONSENSUS_VERSION, 3, "3 since the anatomy probe's version 2 (after run 2026-11-15)");
  assert.deepEqual([RECORD_VERSION, STUDY_VERSION], [2, 2]);
  assert.equal(CLAIMS.length, 69);
  assert.deepEqual(CLAIMS.slice(0, 21).map((c) => c.id), OLD_IDS);
  assert.equal(NEW_CLAIMS.length, 48);
  assert.equal(NEW_CLAIMS.filter((c) => c.scope === "screen").length, 36, "36 per-screen claims");
  assert.deepEqual(NEW_CLAIMS.filter((c) => c.valueKind === "set").map((c) => c.id), ["spacing.steps", "type.sizes", "heading.sizes", "radius.values", "motion.durations"]);
  for (const c of NEW_CLAIMS) {
    assert.deepEqual([c.rule, c.clause, c.expect, c.card], [null, null, null, []], `${c.id}: no new claim maps to a rule`);
    assert.ok(["buttons", "fields", "panels", "tables", "navigation", "type", "spacing", "motion"].includes(c.group), c.id);
    assert.ok([null, "px", "ms"].includes(c.unit), c.id);
    assert.equal(c.viewport, c.group === "motion" ? "both" : 1440, `${c.id}: the 1440 viewport, the motion claims both`);
    assert.equal(c.fragments, c.scope === "screen" && (c.group === "buttons" || c.group === "fields"), `${c.id}: fragments for per-screen buttons and fields`);
  }
  for (const c of CLAIMS.slice(0, 21)) assert.deepEqual([c.group, c.unit, c.valueKind], [null, null, "single"], c.id);
  assert.deepEqual(CLAIMS.filter((c) => c.transfer === "keep" && c.group !== null).map((c) => c.id), ["button.shape", "button.textMatchesField", "field.style", "label.position", "panel.separation", "radius.panelNotSmaller", "table.headerHeavier", "spacing.onGrid4"]);
});

test("anatomyAt: keys parsed by part, none and normal kept as strings, text buttons dropped, null without an anatomy block", () => {
  const r = anatomyRecord({
    buttons: { [btn({ emphasis: "text", pad: 8 })]: 3, [btn({ emphasis: "outline", pad: 17, border: 1, icon: "trail", iconSize: 12, iconGap: 6 })]: 2 },
    fields: { [fld({ style: "none", border: 0 })]: 1 },
    headings: { [hed({ line: "normal" })]: 1 },
    cells: { [cel({ pad: "none" })]: 4 },
  });
  const a = anatomyAt(r, 1440);
  assert.deepEqual(a.buttons, [{ emphasis: "outline", height: 32, pad: 17, font: 14, weight: 400, radius: 6, border: 1, icon: "trail", iconSize: 12, iconGap: 6, n: 2 }], "the text button is dropped");
  assert.deepEqual(a.fields, [{ kind: "text", height: 32, pad: 12, font: 14, radius: 6, style: "none", border: 0, adorned: "none", n: 1 }]);
  assert.deepEqual(a.headings, [{ level: 2, size: 18, weight: 600, line: "normal", n: 1 }]);
  assert.deepEqual(a.cells, [{ part: "body", height: 40, pad: "none", font: 14, weight: 400, n: 4 }]);
  assert.deepEqual([a.labels, a.fieldGaps, a.panels, a.panelGaps, a.textLines, a.icons], [[], [], [], [], [], []]);
  assert.equal(anatomyAt(rec(oneForm(), "a1"), 1440), null, "a record without anatomy (version 1)");
  assert.equal(anatomyAt(rec(oneForm(), "a1", { at1440: { anatomy: {} }, failed390: "timeout" }), 390), null, "a failed viewport");
  for (const c of NEW_CLAIMS) assert.deepEqual(screenClaim(c, rec(oneForm(), "a1", { values: { motion: { transitions: 50, durations: [100], properties: {} } } })), { eligible: false, value: null }, `${c.id}: no value without an anatomy block`);
});

test("each per-screen anatomy claim: eligibility and value (36 claims)", () => {
  const yes = (value) => ({ eligible: true, value });
  const NO = { eligible: false, value: null };
  const lead = btn({ emphasis: "outline", pad: 8, icon: "lead", iconSize: 16, iconGap: 8 }), trail = btn({ emphasis: "outline", pad: 12, icon: "trail", iconSize: 12, iconGap: 6 });
  const cases = {
    "button.padX": [
      [{ buttons: { [btn({ pad: 16 })]: 2, [btn({ emphasis: "outline", pad: 12 })]: 2, [lead]: 5 } }, yes(12), "a tie goes to the smaller pad; a button with a leading icon is left out"],
      [{ buttons: { [lead]: 2, [btn({ emphasis: "text" })]: 3 } }, NO, "only a leading-icon button and a text button"],
    ],
    "button.padRatio": [[{ buttons: { [btn({ pad: 12, height: 32 })]: 1 } }, yes(0.375)], [{ buttons: { [lead]: 1 } }, NO]],
    "button.textSize": [[{ buttons: { [btn({ font: 13.5 })]: 1 } }, yes(14)], [{}, NO]],
    "button.textWeight": [[{ buttons: { [btn({ weight: 500 })]: 1, [btn({ weight: 400, pad: 12 })]: 1 } }, yes(400), "a tie goes to the smaller"], [{}, NO]],
    "button.radius": [[{ buttons: { [btn({ radius: 999 })]: 1 } }, yes(999)], [{ buttons: { [btn({ radius: 6.5 })]: 1 } }, yes(7)], [{}, NO]],
    "button.shape": [[{ buttons: { [btn({ radius: 0 })]: 1 } }, yes("square")], [{ buttons: { [btn({ radius: 6 })]: 1 } }, yes("rounded")], [{ buttons: { [btn({ radius: 999 })]: 1 } }, yes("pill")], [{ buttons: { [btn({ radius: 1 })]: 1 } }, yes("square")], [{}, NO]],
    "button.iconSize": [[{ buttons: { [lead]: 1, [trail]: 1 } }, yes(12), "a tie goes to the smaller"], [{ buttons: { [btn()]: 1 } }, NO]],
    "button.iconGap": [[{ buttons: { [lead]: 1, [trail]: 1 } }, yes(6)], [{ buttons: { [btn()]: 1 } }, NO]],
    "button.textMatchesField": [
      [{ buttons: { [btn({ font: 14 })]: 1 }, fields: { [fld({ font: 13.5 })]: 1 } }, yes(true)],
      [{ buttons: { [btn({ font: 14 })]: 1 }, fields: { [fld({ font: 13 })]: 1 } }, yes(false)],
      [{ buttons: { [btn()]: 1 } }, NO, "no field"],
    ],
    "field.padX": [[{ fields: { [fld({ pad: 12 })]: 1, [fld({ pad: 33, adorned: "lead" })]: 3 } }, yes(12), "an adorned field is left out"], [{ fields: { [fld({ adorned: "lead" })]: 1 } }, NO]],
    "field.radius": [[{ fields: { [fld({ radius: 4 })]: 1 } }, yes(4)], [{}, NO]],
    "field.style": [[{ fields: { [fld({ style: "under" })]: 2, [fld({ style: "box" })]: 2 } }, yes("box"), "a tie goes to the one that sorts first"], [{ fields: { [fld({ style: "fill", border: 0 })]: 3, [fld()]: 1 } }, yes("fill")], [{}, NO]],
    "field.borderWidth": [[{ fields: { [fld({ border: 1 })]: 1, [fld({ style: "fill", border: 0 })]: 5 } }, yes(1)], [{ fields: { [fld({ style: "ring", border: 0 })]: 1 } }, NO, "no box or underline field"]],
    "label.position": [[{ labels: { [lab()]: 1, [lab({ position: "left", gap: 12 })]: 2, [lab({ position: "none", gap: 0, font: 0, weight: 0 })]: 4 } }, yes("left")], [{ labels: { [lab()]: 1, [lab({ position: "none", gap: 0, font: 0, weight: 0 })]: 4 } }, NO, "one label that is not none"]],
    "label.gap": [[{ labels: { [lab({ gap: 8 })]: 1, [lab({ position: "left", gap: 12 })]: 3 } }, yes(8)], [{ labels: { [lab({ position: "left" })]: 2 } }, NO]],
    "label.textWeight": [[{ labels: { [lab({ weight: 500 })]: 2, [lab({ position: "left", weight: 400 })]: 1 } }, yes(500)], [{ labels: { [lab()]: 1 } }, NO]],
    "form.fieldGap": [[{ fieldGaps: { "plain|16": 3, "helper|36": 1 } }, yes(16)], [{ fieldGaps: { "helper|36": 2 } }, NO]],
    "panel.inset": [[{ panels: { [pnl({ inset: 25 })]: 1, [pnl({ size: "wide", inset: 32 })]: 4 } }, yes(25), "wide panels are left out"], [{ panels: { [pnl({ size: "wide" })]: 1 } }, NO]],
    "panel.radius": [[{ panels: { [pnl({ radius: 8 })]: 1 } }, yes(8)], [{}, NO]],
    "panel.separation": [[{ panels: { [pnl({ separation: "border-tone" })]: 2, [pnl({ separation: "shadow", border: 0 })]: 1 } }, yes("border-tone")], [{}, NO]],
    "panel.gap": [[{ panelGaps: { "stack|24": 2, "inline|16": 2 } }, yes(16), "both axes; a tie goes to the smaller"], [{}, NO]],
    "radius.panelNotSmaller": [
      [{ panels: { [pnl({ radius: 8 })]: 1 }, fields: { [fld({ radius: 6 })]: 1 } }, yes(true)],
      [{ panels: { [pnl({ radius: 4 })]: 1 }, fields: { [fld({ radius: 6 })]: 1 }, buttons: { [btn({ radius: 2 })]: 1 } }, yes(false), "the field radius when there is a field"],
      [{ panels: { [pnl({ radius: 8 })]: 1 }, buttons: { [btn({ radius: 6 })]: 1 } }, yes(true), "else the button radius"],
      [{ panels: { [pnl({ radius: 8 })]: 1 }, buttons: { [btn({ radius: 999 })]: 1 } }, NO, "a pill button"],
      [{ fields: { [fld()]: 1 } }, NO, "no panel"],
    ],
    "table.headerHeight": [[{ cells: { [cel({ part: "head", height: 37 })]: 3 } }, yes(36)], [{ cells: { [cel()]: 1 } }, NO]],
    "table.bodyRowHeight": [[{ cells: { [cel({ height: 41 })]: 3 } }, yes(40)], [{ cells: { [cel({ part: "head" })]: 1 } }, NO]],
    "table.cellPadX": [[{ cells: { [cel({ pad: "none" })]: 5, [cel({ pad: 16 })]: 2, [cel({ part: "head", pad: 12 })]: 9 } }, yes(16), "body cells only, none ignored"], [{ cells: { [cel({ pad: "none" })]: 5 } }, NO]],
    "table.headerHeavier": [[{ cells: { [cel({ part: "head", weight: 600 })]: 1, [cel()]: 2 } }, yes(true)], [{ cells: { [cel({ part: "head" })]: 1, [cel()]: 2 } }, yes(false)], [{ cells: { [cel()]: 2 } }, NO]],
    "list.itemHeight": [
      [{ anatomy: {}, lists: [{ items: 6, itemH: { 48: 5, 52: 1 } }, { items: 6, itemH: { 40: 6 } }] }, yes(48), "the first of two lists with the most items"],
      [{ anatomy: {}, lists: [{ items: 4, itemH: { 48: 4 } }] }, NO, "a four-item list"],
    ],
    "nav.sideWidth": [[{ anatomy: {}, regions: [{ kind: "sideNav", w: 238, h: 800, items: 2, itemHeight: 28 }] }, yes(240)], [{ anatomy: {}, regions: [{ kind: "topBar", w: 1440, h: 56 }] }, NO]],
    "nav.itemHeight": [[{ anatomy: {}, regions: [{ kind: "sideNav", w: 240, items: 13, itemHeight: 29 }] }, yes(28)], [{ anatomy: {}, regions: [{ kind: "sideNav", w: 240, items: 2, itemHeight: 28 }] }, NO, "under 3 items"]],
    "nav.topBarHeight": [[{ anatomy: {}, regions: [{ kind: "topBar", w: 1440, h: 57 }] }, yes(56)], [{ anatomy: {}, regions: [] }, NO]],
    "text.lineRatio": [[{ textLines: { "14|20": 300, "12|16": 50 } }, yes(1.45), "20 over 14"], [{ textLines: { "14|20": 150 } }, NO, "under 200 characters"], [{ textLines: { "14|normal": 300 } }, NO, "no numeric line height at the main size"]],
    "heading.pageTitle": [[{ headings: { [hed({ level: 1, size: 23.5 })]: 1, [hed()]: 3 } }, yes(24)], [{}, NO]],
    "heading.sectionTitle": [[{ headings: { [hed({ level: 1, size: 24 })]: 1, [hed({ size: 18 })]: 2, [hed({ size: 16 })]: 2 } }, yes(16), "a tie goes to the smaller"], [{ headings: { [hed()]: 3 } }, NO, "one size"]],
    "heading.weight": [[{ headings: { [hed({ weight: 600 })]: 2, [hed({ size: 24, weight: 700 })]: 1 } }, yes(600)], [{}, NO]],
    "icon.size": [[{ icons: { 16: 2, 20: 1 } }, yes(16)], [{ icons: { 16: 2 } }, NO, "under 3 icons"]],
    "motion.duration": [
      [{ anatomy: {}, transitions: 25, duration: 90 }, yes(100)],
      [{ anatomy: {}, transitions: 25, duration: 165 }, yes(200)],
      [{ anatomy: {}, transitions: 19, duration: 90 }, NO, "under 20 transitions"],
    ],
  };
  assert.deepEqual(Object.keys(cases).sort(), NEW_CLAIMS.filter((c) => c.scope === "screen").map((c) => c.id).sort(), "one case per per-screen claim");
  for (const [id, list] of Object.entries(cases)) for (const [input, expected, note = ""] of list) {
    let record;
    if (Object.hasOwn(input, "anatomy")) {
      // Claims that read the structure probe or the motion summary need only an anatomy block.
      const s = { regions: input.regions ?? [], lists: input.lists ?? [] };
      const m = oneForm();
      record = rec(m, "a1", { at1440: { anatomy: {}, lists: s.lists }, values: { motion: { transitions: input.transitions ?? 0, durations: [], properties: {} } }, facts: input.duration ? [{ id: "states.motion.duration", axis: "states-motion", level: "observed", value: input.duration, unit: "ms", viewport: "both", from: "observations.motion.transitions" }] : [] });
      record.viewports[0].structure.regions = s.regions;
    } else record = anatomyRecord(input);
    assert.deepEqual(screenClaim(claim(id), record), expected, `${id}: ${note || JSON.stringify(input)}`);
  }
});

test("spacingSample: the 10% floor, the border resolved toward the grid, a pair per kind", () => {
  const sample = (lists) => spacingSample(anatomyRecord(lists)).map((p) => `${p.kind} ${p.value}`);
  assert.deepEqual(sample({ buttons: { [btn({ pad: 16 })]: 9, [btn({ pad: 12 })]: 1 } }), ["buttonPad 12", "buttonPad 16"], "10% stays");
  assert.deepEqual(sample({ buttons: { [btn({ pad: 16 })]: 10, [btn({ pad: 12 })]: 1 } }), ["buttonPad 16"], "under 10% goes");
  assert.deepEqual(sample({ buttons: { [btn({ pad: 16, border: 1 })]: 1 } }), ["buttonPad 16"], "a 15px padding inside a 1px border: the declared inset is 16");
  assert.deepEqual(sample({ buttons: { [btn({ emphasis: "outline", pad: 17, border: 1 })]: 1 } }), ["buttonPad 16"], "17 with a 1px border");
  assert.deepEqual(sample({ buttons: { [btn({ pad: 22, border: 2 })]: 1 } }), ["buttonPad 20"], "22 with a 2px border");
  assert.deepEqual(sample({ panels: { [pnl({ inset: 9, border: 0 })]: 1 } }), ["panelInset 9"], "9 with no border stays off the grid");
  assert.deepEqual(sample({ panels: { [pnl({ inset: 25, border: 1 })]: 1 } }), ["panelInset 24"]);
  assert.deepEqual(sample({ fields: { [fld({ pad: 17, style: "under", border: 1 })]: 1, [fld({ pad: 13, style: "box", border: 1 })]: 1 } }), ["fieldPad 12", "fieldPad 17"], "a field's border counts only for a box");
  assert.deepEqual(sample({ buttons: { [btn({ pad: 16 })]: 1, [btn({ pad: 17, border: 1, emphasis: "outline" })]: 1 }, cells: { [cel({ pad: 16 })]: 1, [cel({ part: "head", pad: 16 })]: 1, [cel({ pad: "none" })]: 3 } }), ["buttonPad 16", "cellPad 16"], "one pair per kind and value; head and body cells; none ignored");
  assert.deepEqual(sample({
    buttons: { [btn({ pad: 0 })]: 5, [btn({ emphasis: "outline", pad: 8, icon: "lead", iconSize: 16, iconGap: 8 })]: 1 },
    labels: { [lab({ gap: 4 })]: 1, [lab({ position: "left", gap: 12 })]: 1 }, fieldGaps: { "plain|16": 1, "helper|36": 1 }, panelGaps: { "inline|24": 1, "stack|20": 1 },
  }), ["labelGap 4", "fieldGap 16", "panelGap 20", "panelGap 24", "iconGap 8"], "values of 0 are dropped; a leading-icon button gives its icon gap, not its padding; left labels and helper gaps are not sampled");
  assert.equal(spacingSample(rec(oneForm(), "a1")), null);
});

// Screens of one lineage whose spacing samples hold the given values, ten per kind and screen (each
// value one instance, so each holds exactly the 10% floor), spread over `screens` screens.
function spacingScreens(m, lineage, values, screens = 3) {
  const KINDS = [
    (v) => ({ cells: { [cel({ pad: v })]: 1 } }), (v) => ({ panelGaps: { [`stack|${v}`]: 1 } }), (v) => ({ fieldGaps: { [`plain|${v}`]: 1 } }), (v) => ({ labels: { [lab({ gap: v })]: 1 } }),
    (v) => ({ buttons: { [btn({ pad: v })]: 1 } }), (v) => ({ panels: { [pnl({ inset: v, border: 0 })]: 1 } }), (v) => ({ fields: { [fld({ pad: v, style: "fill", border: 0 })]: 1 } }),
    (v) => ({ buttons: { [btn({ emphasis: "outline", pad: 8, icon: "lead", iconSize: 16, iconGap: v })]: 1 } }),
  ];
  const lists = Array.from({ length: screens }, () => ({}));
  for (let chunk = 0; chunk * 10 < values.length; chunk++) {
    const target = lists[chunk % screens], make = KINDS[Math.floor(chunk / screens)];
    for (const v of values.slice(chunk * 10, chunk * 10 + 10)) for (const [list, entries] of Object.entries(make(v))) Object.assign((target[list] ??= {}), entries);
  }
  return lists.map((l, i) => rec(m, `${lineage}${i + 1}`, { at1440: { anatomy: l } }));
}
// `on` values that are multiples of 4 and `off` values that are not, all distinct.
const gridValues = (on, off) => [...Array.from({ length: on }, (_, i) => 4 * (i + 1)), ...Array.from({ length: 4 * off }, (_, i) => i + 1).filter((v) => v % 4 !== 0).slice(0, off)];

test("lineage-scope anatomy claims: minimums, grid bands, sets, and the five counts", () => {
  const m = manifest([["a1", "alpha", "dashboard"], ["a2", "alpha", "list"], ["a3", "alpha", "form"], ["b1", "beta", "dashboard"], ["b2", "beta", "list"]]);
  const lineage = (records, id, l = "alpha") => row(consensusRows(m, records), id, "all").lineages.find((x) => x.lineage === l)?.value ?? null;
  const grid = (on, off, screens = 3) => spacingScreens(m, "a", gridValues(on, off), screens);
  assert.equal(lineage(grid(49, 51), "spacing.grid4Share"), 0.5, "0.49 is under 0.5");
  assert.equal(lineage(grid(6, 2), "spacing.grid4Share"), 0.9, "0.75 is in the band under 0.9");
  assert.equal(lineage(grid(9, 1), "spacing.grid4Share"), 1, "0.9 is in the top band");
  assert.equal(lineage(grid(74, 26), "spacing.onGrid4"), false, "0.74");
  assert.equal(lineage(grid(6, 2), "spacing.onGrid4"), true, "0.75");
  const two = spacingScreens(m, "a", gridValues(9, 1), 2);
  assert.equal(lineage(two, "spacing.grid4Share"), null, "two screens are under the minimum of three");
  assert.equal(lineage(grid(5, 2), "spacing.grid4Share"), null, "seven pairs are under the minimum of eight");
  assert.deepEqual(lineage(two, "spacing.steps"), gridValues(9, 1).sort((x, y) => x - y), "steps need two screens and four pairs");
  assert.equal(lineage(two, "spacing.stepCount"), 10);
  assert.equal(lineage(spacingScreens(m, "a", [4, 8, 12], 2), "spacing.steps"), null, "three pairs");
  // type.sizes: a size at 1.9% of the pooled characters is left out.
  const text = (a, b) => [rec(m, "a1", { at1440: { anatomy: { textLines: a } } }), rec(m, "a2", { at1440: { anatomy: { textLines: b } } })];
  const typed = text({ "14|20": 600, "16|24": 81 }, { "14|20": 300, "12|16": 19 });
  assert.deepEqual(lineage(typed, "type.sizes"), [14, 16]);
  assert.equal(lineage(typed, "type.sizeCount"), 2);
  assert.deepEqual(lineage(text({ "14|20": 600, "16|24": 80 }, { "14|20": 300, "12|16": 20 }), "type.sizes"), [12, 14, 16], "2.0% stays");
  assert.equal(lineage(text({ "14|20": 400 }, { "14|20": 500 }), "type.sizes"), null, "under 1,000 characters pooled");
  assert.equal(lineage([typed[0]], "type.sizes"), null, "one screen");
  // heading.sizes: sizes (whole px) that 5% or more of the pooled headings have. 21 headings: 24 on 1
  // (4.8%, left out), 18 on 18 (17.5 rounds to 18), 15 on 2 (9.5%).
  const heads = [rec(m, "a1", { at1440: { anatomy: { headings: { [hed({ level: 1, size: 24 })]: 1, [hed({ size: 18 })]: 10 } } } }), rec(m, "a2", { at1440: { anatomy: { headings: { [hed({ size: 17.5 })]: 8, [hed({ level: 3, size: 15 })]: 2 } } } })];
  assert.deepEqual(lineage(heads, "heading.sizes"), [15, 18]);
  assert.equal(lineage(heads, "heading.sizeCount"), 2);
  const few = [rec(m, "a1", { at1440: { anatomy: { headings: { [hed({ level: 1, size: 24 })]: 1 } } } }), rec(m, "a2", { at1440: { anatomy: { headings: { [hed()]: 3 } } } })];
  assert.equal(lineage(few, "heading.sizes"), null, "four headings pooled are under the minimum of five");
  assert.equal(lineage(few, "heading.sizeCount"), null);
  // radius.values: the union of the screens' button, field, and panel radius modes.
  const radii = [rec(m, "a1", { at1440: { anatomy: { buttons: { [btn({ radius: 6 })]: 1 }, panels: { [pnl({ radius: 8 })]: 1 } } } }), rec(m, "a2", { at1440: { anatomy: { fields: { [fld({ radius: 4 })]: 1 }, buttons: { [btn({ radius: 999 })]: 1 } } } })];
  assert.deepEqual(lineage(radii, "radius.values"), [4, 6, 8, 999]);
  assert.equal(lineage(radii, "radius.valueCount"), 4);
  assert.equal(lineage([radii[0]], "radius.values"), null, "one screen");
  // motion.durations: the union of the duration bands of the screens with 20 transitions or more.
  const motion = (transitions, durations) => ({ values: { motion: { transitions, durations, properties: {} } }, at1440: { anatomy: {} } });
  const moving = [rec(m, "a1", motion(25, [90, 165])), rec(m, "a2", motion(40, [250, 600])), rec(m, "a3", motion(10, [450]))];
  assert.deepEqual(lineage(moving, "motion.durations"), [100, 200, 300, 1000]);
  assert.equal(lineage(moving.slice(0, 1).concat(moving.slice(2)), "motion.durations"), null, "one screen with 20 transitions");
  // control.heightCount: 32 on 90% and 36 on 6% of the controls, 40 on 4% left out.
  const controls = [rec(m, "a1", { at1440: { anatomy: { buttons: { [btn({ height: 32 })]: 40 }, fields: { [fld({ height: 32 })]: 5 } } } }), rec(m, "a2", { at1440: { anatomy: { fields: { [fld({ height: 36 })]: 3, [fld({ height: 40, pad: 8 })]: 2 } } } })];
  assert.equal(lineage(controls, "control.heightCount"), 2);
  assert.equal(lineage([controls[0], rec(m, "a2", { at1440: { anatomy: {} } })], "control.heightCount"), null, "one screen with a button or a field");
  // Rows: lineage-scope claims exist on `all` only and carry the screens read.
  const rows = consensusRows(m, controls);
  assert.deepEqual(rows.filter((r) => r.claim === "control.heightCount").map((r) => [r.pageType, r.viewport, r.valueKind, r.group, r.transfer, r.status, r.withFragments]), [["all", 1440, "single", "buttons", "adapt", null, null]]);
  assert.deepEqual(row(rows, "control.heightCount", "all").lineages.find((l) => l.lineage === "alpha").raw.map((x) => x.value), [{ 32: 45 }, { 36: 3, 40: 2 }]);
});

test("set rows: one entry per value, counts that exceed the lineages measured, no status; fragments move only withFragments", () => {
  const m = manifest([["a1", "alpha", "form"], ["a2", "alpha", "list"], ["b1", "beta", "form"], ["b2", "beta", "list"], ["k1", "kit-one", "form"], ["k2", "kit-one", "list"]]);
  const radii = (b, f) => ({ at1440: { anatomy: { buttons: { [btn({ radius: b })]: 1 }, ...(f === undefined ? {} : { fields: { [fld({ radius: f })]: 1 } }) } } });
  // alpha holds [8, 16], beta [8, 12, 16], kit-one [4, 8].
  const records = [rec(m, "a1", radii(8)), rec(m, "a2", radii(16, 16)), rec(m, "b1", radii(8, 12)), rec(m, "b2", radii(16)), rec(m, "k1", radii(4)), rec(m, "k2", radii(8, 8))];
  const r = row(consensusRows(m, records), "radius.values", "all");
  assert.deepEqual([r.valueKind, r.group, r.unit, r.transfer, r.viewport], ["set", "panels", "px", "adapt", 1440]);
  assert.deepEqual([r.measured, r.top, r.agree, r.agreeProductSystems, r.agreeKits], [3, 8, 3, 2, 1]);
  assert.deepEqual([r.status, r.supportsRule, r.withFragments], [null, null, null]);
  assert.deepEqual(r.distribution, [
    { bucket: 8, lineages: 3, productSystems: 2, kits: 1 }, { bucket: 16, lineages: 2, productSystems: 2, kits: 0 },
    { bucket: 4, lineages: 1, productSystems: 0, kits: 1 }, { bucket: 12, lineages: 1, productSystems: 1, kits: 0 },
  ]);
  assert.ok(r.distribution.reduce((n, d) => n + d.lineages, 0) > r.measured, "a set row's counts do not add up to measured");
  assert.deepEqual(r.lineages.map((l) => [l.lineage, l.kind, l.context, l.value, l.eligible]), [["alpha", "product-system", "console", [8, 16], 2], ["beta", "product-system", "console", [8, 12, 16], 2], ["kit-one", "kit", "console", [4, 8], 2]]);
  assert.deepEqual(r.lineages[0].raw, [{ screen: "a1", value: { button: 8 } }, { screen: "a2", value: { button: 16, field: 16 } }]);
  // A fragment changes withFragments of a button claim, never its measured, agree, or status.
  const fm = manifest([["a-form", "alpha", "form"], ["b-form", "beta", "form"], ["k-form", "kit-one", "form"], ["g-frag", "gamma", "form", "fragment"], ["d-frag", "delta", "form", "fragment"]]);
  const shape = (radius) => ({ at1440: { anatomy: { buttons: { [btn({ radius })]: 1 } } } });
  const all = [rec(fm, "a-form", shape(6)), rec(fm, "b-form", shape(6)), rec(fm, "k-form", shape(999)), rec(fm, "g-frag", shape(999)), rec(fm, "d-frag", shape(999))];
  const withFrag = row(consensusRows(fm, all), "button.shape", "form"), without = row(consensusRows(fm, all.slice(0, 3)), "button.shape", "form");
  for (const key of ["measured", "agree", "agreeProductSystems", "status", "top", "distribution", "lineages"]) assert.deepEqual(withFrag[key], without[key], key);
  assert.deepEqual([withFrag.measured, withFrag.agree, withFrag.top, withFrag.status], [3, 2, "rounded", "split"]);
  assert.deepEqual([withFrag.withFragments.measured, withFrag.withFragments.top, withFrag.withFragments.agree], [5, "pill", 3]);
  assert.equal(row(consensusRows(fm, all), "panel.inset", "form").withFragments, null, "panels carry no withFragments");
});

test("the 21 claims of the first run give the same rows with and without an anatomy block, and the same rows as the stored run", () => {
  const { m, records } = negativeFixture();
  const withAnatomy = records.map((r) => { const copy = structuredClone(r); for (const v of copy.viewports) if (v.status === "measured") v.anatomy = anatomyBlock({ buttons: { [btn()]: 2 }, fields: { [fld()]: 1 }, panels: { [pnl()]: 1 } }); return copy; });
  const old = (rows) => rows.filter((r) => OLD_IDS.includes(r.claim));
  assert.deepEqual(old(consensusRows(m, withAnatomy)), old(consensusRows(m, records)));
  // The stored 2026-11-12 run: regenerated with this code, every row of the 21 claims equals the
  // committed row plus valueKind, group, and unit, and its lineage entries gain context.
  const dir = resolve(studyRoot, "runs/2026-11-12");
  const stored = JSON.parse(readFileSync(join(dir, "consensus.json"), "utf8"));
  const storedManifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const storedRecords = readdirSync(join(dir, "screens")).sort().map((n) => JSON.parse(readFileSync(join(dir, "screens", n), "utf8")));
  const fresh = consensusRows(storedManifest, storedRecords);
  const freshOld = old(fresh);
  assert.equal(freshOld.length, stored.rows.length);
  for (const [i, r] of freshOld.entries()) {
    const { valueKind, group, unit, ...rest } = r;
    assert.deepEqual([valueKind, group, unit], ["single", null, null], r.claim);
    assert.deepEqual(Object.keys(r).filter((k) => !["valueKind", "group", "unit"].includes(k)), Object.keys(stored.rows[i]), `${r.claim} ${r.pageType}: the keys of the first run plus three`);
    assert.deepEqual({ ...rest, lineages: rest.lineages.map(({ context, ...l }) => { assert.equal(context, "console"); return l; }) }, stored.rows[i], `${r.claim} ${r.pageType}`);
  }
  for (const r of fresh.filter((x) => !OLD_IDS.includes(x.claim))) assert.equal(r.measured, 0, `${r.claim}: a record without anatomy gives no value`);
  assert.deepEqual([...new Set(fresh.map((r) => r.claim))], CLAIMS.map((c) => c.id), "rows for all 69 claim ids");
});

test("determinism, plain wording, and the allow-list walk with records that carry anatomy", () => {
  const m = manifest([["a1", "alpha", "dashboard"], ["a2", "alpha", "form"], ["b1", "beta", "list"], ["k1", "kit-one", "form"], ["g-frag", "gamma", "form", "fragment"]]);
  const lists = (pad, radius) => ({
    buttons: { [btn({ pad, radius })]: 2, [btn({ emphasis: "outline", pad: 12, icon: "lead", iconSize: 16, iconGap: 8, border: 1 })]: 1, [btn({ emphasis: "text" })]: 4 },
    fields: { [fld({ radius })]: 3, [fld({ style: "under", adorned: "lead" })]: 1 }, labels: { [lab()]: 3, [lab({ position: "none", gap: 0, font: 0, weight: 0 })]: 1 },
    fieldGaps: { "plain|16": 2, "helper|36": 1 }, panels: { [pnl({ separation: "border-shadow-tone" })]: 2, [pnl({ size: "wide", separation: "none", border: 0 })]: 1 }, panelGaps: { "stack|24": 1 },
    cells: { [cel({ part: "head", weight: 600 })]: 3, [cel({ pad: "none" })]: 2, [cel()]: 4 }, headings: { [hed({ level: 1, size: 24, line: "normal" })]: 1, [hed()]: 2 },
    textLines: { "14|20": 400, "12|normal": 40 }, icons: { 16: 4 },
  });
  const records = [
    rec(m, "a1", { at1440: { anatomy: lists(16, 6) } }), rec(m, "a2", { at1440: { anatomy: lists(16, 6) } }), rec(m, "b1", { at1440: { anatomy: lists(20, 999) } }),
    rec(m, "k1", { at1440: { anatomy: lists(12, 4) } }), rec(m, "g-frag", { at1440: { anatomy: lists(24, 0) } }),
  ];
  const run = runOf(m);
  const first = generateReports(m, run, records), second = generateReports(m, run, [...records].reverse());
  for (const name of Object.keys(first)) assert.equal(second[name], first[name], `${name}: records in another order give the same bytes`);
  for (const name of ["CONSENSUS.md", "NEGATIVE-CONTROL.md"]) for (const word of SEVEN) assert.ok(!first[name].toLowerCase().includes(word), `${name} must not say "${word}"`);
  for (const name of ["consensus.json", "negative-control.json"]) assert.deepEqual(disallowedStrings(stripIds(JSON.parse(first[name]), m)), [], `${name} passes the walk`);
  for (const r of records) assert.deepEqual(disallowedStrings(stripIds(r, m)), [], `${r.screen}: a record with anatomy passes the walk`);
  const consensus = JSON.parse(first["consensus.json"]);
  assert.equal(consensus.consensusVersion, CONSENSUS_VERSION);
  assert.equal(new Set(consensus.rows.map((r) => r.claim)).size, 69);
  for (const r of consensus.rows) assert.deepEqual(Object.keys(r), ["claim", "pageType", "viewport", "transfer", "valueKind", "group", "unit", "rule", "card", "measured", "agree", "agreeProductSystems", "agreeKits", "top", "supportsRule", "status", "distribution", "lineages", "withFragments"], r.claim);
  // A label string in an anatomy key fails the walk.
  const labelled = structuredClone(records[0]);
  labelled.viewports[0].anatomy.labels = { "above|8|14|500": 2, "Billing address|8|14|500": 1 };
  assert.equal(disallowedStrings(stripIds(labelled, m)).length, 1);
  const named = structuredClone(records[0]);
  named.viewports[0].anatomy.icons = { "chevron-down": 1 };
  assert.equal(disallowedStrings(stripIds(named, m)).length, 1, "an icon name fails");
});

test("validateManifest: the context of a lineage, a .invalid host, the real screens.json", () => {
  const real = JSON.parse(readFileSync(resolve(studyRoot, "screens.json"), "utf8"));
  assert.deepEqual(validateManifest(real), []);
  for (const l of real.lineages) assert.ok(l.context === undefined || ["console", "service"].includes(l.context), l.id);
  const m = manifest([["a1", "alpha", "form"]]);
  m.lineages[0].context = "service";
  m.lineages[1].context = "console";
  assert.deepEqual(validateManifest(m), []);
  m.lineages[2].context = "consumer";
  assert.ok(validateManifest(m).some((e) => /lineages\[2\] \(gamma\)\.context must be one of console, service/u.test(e)), JSON.stringify(validateManifest(m)));
  delete m.lineages[2].context;
  // A lineage with no hosted pages lists its screens under the reserved top-level domain .invalid.
  m.lineages.push({ id: "paste", name: "Twilio Paste", kind: "product-system", context: "console", host: "paste.invalid", access: "self-hosted", basePath: "/", repository: "twilio-labs/paste", licence: "MIT", robots: { checkedAt: null, verdict: "not-checked" }, terms: { url: null, checkedAt: null, automatedAccess: "unchecked", note: "No hosted pages exist; the Storybook is built from the repository." } });
  m.screens.push({ id: "paste-settings", lineage: "paste", pageType: "form", tier: "screen", url: "https://paste.invalid/iframe.html?viewMode=story&id=website-pagetemplateexamples--settings-example", expect: { elements: 1 } });
  assert.deepEqual(validateManifest(m), []);
  // The lineages WO-12 adds, as they stand before the terms check and the builds of the run.
  const byId = new Map(real.lineages.map((l) => [l.id, l]));
  assert.deepEqual(real.lineages.map((l) => l.context ?? "console"), ["console", "console", "console", "console", "console", "console", "console", "service"]);
  assert.deepEqual([byId.get("patternfly").access, byId.get("patternfly").basePath, byId.get("patternfly").terms.automatedAccess], ["self-hosted", "/", "restricted"]);
  for (const id of ["mui", "govuk"]) assert.deepEqual([byId.get(id).access, byId.get(id).terms.automatedAccess, isDateString(byId.get(id).terms.checkedAt)], ["hosted", "not-mentioned", true], `${id}: hosted after its terms check`);
  assert.deepEqual(Object.fromEntries(["mui", "govuk"].map((id) => [id, real.screens.filter((s) => s.lineage === id).map((s) => s.pageType)])), {
    mui: ["dashboard", "list", "form", "form", "form"], govuk: ["list", "list", "list", "form", "form", "form", "form", "detail", "detail"],
  });
});

test("the real screens.json loads nothing when no self-hosted build is passed and every robots.txt disallows (a fake fetch)", async () => {
  const real = JSON.parse(readFileSync(resolve(studyRoot, "screens.json"), "utf8"));
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(new URL(url).host); return { status: 200, ok: true, url, text: async () => "User-agent: *\nDisallow: /" }; };
  const chromium = { async launch() { throw new Error("nothing may be loaded"); } };
  const result = await measureScreens(real, { chromium, today: "2026-11-13", delay: 0, fetchImpl });
  const reasons = {};
  for (const r of result.rows) { const lineage = real.screens.find((s) => s.id === r.screen).lineage; reasons[lineage] = [...new Set([...(reasons[lineage] ?? []), `${r.status} ${r.reason}`])]; }
  assert.deepEqual(reasons, { cloudscape: ["skipped no-base"], patternfly: ["skipped no-base"], antpro: ["skipped robots"], shadcn: ["skipped robots"], primer: ["skipped robots"], carbon: ["skipped robots"], mui: ["skipped robots"], govuk: ["skipped robots"] });
  assert.deepEqual([...new Set(fetched)].sort(), ["govuk-frontend-review.herokuapp.com", "mui.com", "preview.pro.ant.design", "primer.style", "react.carbondesignsystem.com", "ui.shadcn.com"], "one robots.txt per hosted origin, none for a self-hosted lineage (the fetch here is a fake)");
});

test("stored runs: the 2026-11-12 run passes the walk and is not regenerated (an older consensusVersion)", () => {
  const dir = resolve(studyRoot, "runs/2026-11-12");
  const result = checkRunFolder(dir);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.counts, { listed: 32, measured: 24, failed: 0, skipped: 8 });
  assert.equal(result.regenerated, false);
  assert.equal(JSON.parse(readFileSync(join(dir, "consensus.json"), "utf8")).consensusVersion, 1);
  // The run measured with anatomy probe version 1 is kept as committed and is not regenerated under
  // version 3, whose records carry the corrected reading.
  const later = checkRunFolder(resolve(studyRoot, "runs/2026-11-15"));
  assert.deepEqual([later.errors, later.counts, later.regenerated], [[], { listed: 46, measured: 45, failed: 1, skipped: 0 }, false]);
  assert.deepEqual(JSON.parse(readFileSync(resolve(studyRoot, "runs/2026-11-15/run.json"), "utf8")).probes, { structure: 2, faults: 1, controls: 2, anatomy: 1 });
});

test("renderConsensusMarkdown: the anatomy section, set rows, pills, and the sections of the first run unchanged", () => {
  const m = manifest([["a1", "alpha", "form"], ["a2", "alpha", "list"], ["b1", "beta", "form"], ["b2", "beta", "list"], ["k1", "kit-one", "form"], ["k2", "kit-one", "list"]]);
  const lists = (radius, fieldRadius) => ({ buttons: { [btn({ radius })]: 1 }, fields: { [fld({ radius: fieldRadius })]: 1 } });
  const records = [rec(m, "a1", { at1440: { anatomy: lists(999, 8) } }), rec(m, "a2", { at1440: { anatomy: lists(999, 16) } }), rec(m, "b1", { at1440: { anatomy: lists(999, 12) } }), rec(m, "b2", { at1440: { anatomy: lists(8, 16) } }), rec(m, "k1", { at1440: { anatomy: lists(4, 4) } }), rec(m, "k2", { at1440: { anatomy: lists(8, 8) } })];
  const md = generateReports(m, runOf(m), records)["CONSENSUS.md"];
  assert.match(md, /the study's control and anatomy probes\./u);
  const sections = md.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
  assert.deepEqual(sections, ["Run", "Claims that map to a catalog rule", "Consistency claims without a rule", "Dimensions", "Component anatomy", "What this says about the open cards of `research/reviews/batch-01.md`", "Limits"]);
  assert.deepEqual(md.split("\n").filter((l) => l.startsWith("### ")), ["### Buttons", "### Fields", "### Panels", "### Tables", "### Navigation", "### Type", "### Spacing", "### Motion"], "every group prints, because its all rows always print");
  assert.match(md, /\| `button\.radius` \| form \| 3 \| pill on 2 of 3 \(2 product systems\) · 4px on 1 of 3 \(1 kit\) \| pill on 2 of 3 \(2 product systems\) · 4px on 1 of 3 \(1 kit\) \| alpha pill · beta pill · kit-one 4px \| — \|/u, "999 prints as pill");
  assert.match(md, /\| `radius\.values` \(set\) \| all \| 3 \| 8px on 3 of 3 \(2 product systems, 1 kit\) · 16px on 2 of 3 \(2 product systems\) · pill on 2 of 3 \(2 product systems\) · 4px on 1 of 3 \(1 kit\) · 12px on 1 of 3 \(1 product system\) \| — \| alpha 8px, 16px, pill · beta 8px, 12px, 16px, pill · kit-one 4px, 8px \| — \|/u, "a set row prints on N of M with each lineage's list");
  assert.match(md, /\| `button\.shape` \| form \| 3 \| pill on 2 of 3 \(2 product systems\) · rounded on 1 of 3 \(1 kit\) \|/u);
  assert.match(md, /\| `button\.shape` \| all \(context\) \| 3 \| pill on 1 of 3 \(1 product system\) · rounded on 1 of 3 \(1 kit\) · mixed on 1 of 3 \(1 product system\) \|/u);
  assert.ok(!/\| `button\.padX` \| dashboard \|/u.test(md), "a page-type row with no lineage measured is left out");
  assert.match(md, /\| `button\.padX` \| all \(context\) \|/u, "the all row is printed");
  assert.match(md, /\| `nav\.sideWidth` \| all \(context\) \| 0 \| none \| — \| none \| — \|/u, "an all row with nothing measured still prints");
  assert.match(md, /^12\. The spacing sample resolves a border in favour of the 4px grid/mu, "three limits appended");
  assert.ok(!md.includes("Context:"), "no contexts when every lineage is a console");
  const service = structuredClone(m);
  service.lineages[1].context = "service";
  assert.match(generateReports(service, runOf(service), records)["CONSENSUS.md"], /; 3 with a measured screen\. Context: 5 console lineages, 1 public-service lineage \(`beta`\)\.\n/u);
  // The stored 2026-11-12 run, rendered with this code: every section of the first run's claims is
  // byte for byte what that run committed; the first paragraph names the anatomy probe, the anatomy
  // section is added, and three limits are appended.
  const dir = resolve(studyRoot, "runs/2026-11-12");
  const committed = readFileSync(join(dir, "CONSENSUS.md"), "utf8");
  const storedManifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const storedRun = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
  const storedRecords = readdirSync(join(dir, "screens")).sort().map((n) => JSON.parse(readFileSync(join(dir, "screens", n), "utf8")));
  const fresh = renderConsensusMarkdown(consensusDocument(storedManifest, storedRun, storedRecords), storedManifest, storedRun);
  const section = (text, title) => { const start = text.indexOf(`## ${title}\n`); assert.ok(start >= 0, title); const next = text.indexOf("\n## ", start + 1); return text.slice(start, next < 0 ? undefined : next); };
  for (const title of ["Run", "Claims that map to a catalog rule", "Consistency claims without a rule", "Dimensions", "What this says about the open cards of `research/reviews/batch-01.md`"]) assert.equal(section(fresh, title), section(committed, title), title);
  assert.equal(fresh.replace("control and anatomy probes", "control probe").replace("systems an organisation builds its own products or services with", "systems a company builds its own products with").split("\n")[2], committed.split("\n")[2], "the first paragraph changes in two places");
  assert.ok(section(committed, "Limits").trimEnd().split("\n").every((l) => section(fresh, "Limits").includes(l)), "the nine limits stay");
  assert.equal(section(fresh, "Limits").trimEnd().split("\n").filter((l) => /^\d+\. /u.test(l)).length, 12);
});
