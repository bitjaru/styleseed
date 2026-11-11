import test from "node:test";
import assert from "node:assert/strict";
import { summarize, shadowFamily } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { summarizeStructure, responsiveDeltas, buildFacts, primaryStats, structureSummary, FACT_FAMILIES } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { compareScreens, renderDriftMarkdown, structureValues, STRUCTURE_AXES } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { twelveAxesDraft, robotsVerdict, checkRobots, measure, parseArgs, revealByScroll, readScroll, scrollWindowTo, observeUrls, SCROLL_DEFAULTS } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { observeDesign } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs";
import { observeStructure } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs";
import { disallowedStrings, unknownTokens } from "../lib/reference-allow-list.mjs";

const TEAL = "rgb(15, 118, 110)";
// observe-structure output for a settings page: top bar, 240px side nav, 2fr/5fr settings groups,
// a table with 40px rows, a 768px breakpoint. The narrow viewport drops the side nav and the columns.
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
      ...[172, 450, 728].map(y => ({ kind: "form-group", y, h: 246, gapBefore: 32, surface: false, cols: wide ? [0.29, 0.71] : [1], heading: { level: 2, size: 16, weight: 600 }, filled: { [TEAL]: 1 } })),
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
const observation = (width, over = {}) => ({
  viewport: { width, height: width >= 768 ? 900 : 844 }, documentHeight: width >= 768 ? 1347 : 1551, elements: 94, truncated: false,
  actions: { [`bg:${TEAL}`]: 3, "text:rgb(77, 81, 80)": 2 }, actionText: {}, links: {}, text: { "rgb(9, 12, 11)": 30, "rgb(77, 81, 80)": 12 }, headings: { "rgb(9, 12, 11)": 5 },
  surfaces: { "rgb(255, 255, 255)": 5, "rgb(246, 248, 248)": 2 }, spacing: { 8: 40, 16: 30, 24: 6, 32: 8 },
  type: { "14|400|20": 40, "16|600|24": 4, "24|600|32": 1 }, radii: { 4: 20, 8: 3 }, controlHeights: { 36: 12, 32: 2 }, fonts: { Inter: 45 },
  shadows: { "rgba(0, 0, 0, 0.08) 0px 1px 3px 0px": 3 }, borders: { "1|rgb(227, 232, 231)": 12, "1|rgb(180, 189, 187)": 6 },
  body: { color: "rgb(9, 12, 11)", background: "rgb(246, 248, 248)", fontFamily: "Inter", fontSize: 14 },
  actionPairs: { [`${TEAL}|rgb(250, 252, 252)`]: 3 }, motion: { transitions: { "color|150|ease-out": 3 }, animations: { "1000|linear|infinite": 1 } },
  targets: { 36: 12, 32: 8 }, tabular: 7, structure: structure(width),
  ...over,
});
const measured = (over1440 = {}, over390 = {}) => summarize([observation(1440, over1440), observation(390, over390)]);
const fact = (facts, id, viewport) => facts.find(f => f.id === id && (viewport === undefined || f.viewport === viewport));

test("synthetic structure becomes facts with stable ids, levels, and sources", () => {
  const summary = measured();
  const { facts } = buildFacts(summary, summary.structure, "https://example.test/settings", "2026-11-10");
  assert.deepEqual(summary.facts, facts, "summarize attaches the same facts");
  assert.deepEqual(fact(facts, "composition.region.topBar.height", 1440), { id: "composition.region.topBar.height", axis: "composition", level: "observed", value: 56, unit: "px", viewport: 1440, from: "structure.regions[topBar] (landmark)" });
  assert.equal(fact(facts, "composition.region.sideNav.width", 1440).level, "derived", "a region found by geometry is derived");
  assert.equal(fact(facts, "composition.region.sideNav.width", 390), undefined);
  assert.equal(fact(facts, "composition.columns.ratio", 1440).value, "0.29/0.71");
  assert.equal(fact(facts, "composition.rhythm.section", 1440).value, 32);
  assert.equal(fact(facts, "density.table.rowHeight", 1440).value, 40);
  assert.equal(fact(facts, "navigation.primary.perSectionMax", 1440).value, 1);
  assert.deepEqual(fact(facts, "navigation.primary.sectionsOverOne", 1440), { id: "navigation.primary.sectionsOverOne", axis: "navigation-action", level: "derived", value: 0, viewport: 1440, from: "structure.sections[].filled x accent" });
  assert.equal(fact(facts, "attention.firstViewport.sections", 1440).value, "heading-block > form-group > form-group > form-group");
  assert.equal(fact(facts, "attention.text.largestOverBody", 1440).value, 1.71);
  assert.equal(fact(facts, "attention.emphasis.ratio", 1440).value, "3:3:2");
  assert.equal(fact(facts, "states.motion.duration").value, 150);
  assert.equal(fact(facts, "states.motion.infinite").value, 2);
  assert.equal(fact(facts, "states.css.focusVisible").viewport, "both");
  assert.equal(fact(facts, "imagery.media.chartLike", 390).level, "derived");
  assert.equal(fact(facts, "imagery.tabular.share", 1440).value, 0.16);
  assert.deepEqual(fact(facts, "responsive.columns"), { id: "responsive.columns", axis: "responsive", level: "derived", value: "2 -> 1", viewport: "both", from: "structure.sections[].cols at 1440 and 390" });
  assert.equal(fact(facts, "responsive.region.sideNav").value, "240 -> none");
  assert.deepEqual(fact(facts, "responsive.breakpoints").value, [768]);
  // The synthetic page has one unreadable stylesheet: the stylesheet counts are lower bounds.
  assert.deepEqual(fact(facts, "states.css.focusVisible"), { id: "states.css.focusVisible", axis: "states-motion", level: "observed", bound: "lower", value: 2, viewport: "both", from: "structure.css (readable stylesheets, lower bound)" });
  assert.equal(fact(facts, "responsive.breakpoints").bound, "lower");
  assert.equal(fact(facts, "states.css.unreadableSheets").bound, undefined);
  assert.deepEqual(fact(facts, "attention.text.largest", 1440), { id: "attention.text.largest", axis: "attention", level: "observed", value: 24, unit: "px", viewport: 1440, from: "structure.headings.main" });
  assert.equal(fact(facts, "attention.text.largestOverBody", 1440).from, "structure.headings.main / observations.body.fontSize");
  assert.equal(fact(facts, "composition.region.main.parts", 1440), undefined, "one main landmark: no parts fact");
  for (const axis of ["attention", "composition", "imagery-data", "navigation-action", "states-motion", "tells"]) assert.ok(facts.some(f => f.axis === axis), `at least one ${axis} fact`);
  for (const f of facts) {
    assert.equal(f.axis, FACT_FAMILIES[f.id.split(".")[0]], `${f.id} sits in its family's axis`);
    assert.ok(["observed", "derived"].includes(f.level), f.id);
    assert.match(f.id, /^[a-z]+(\.[A-Za-z0-9]+)+$/u, f.id);
  }
  const keys = facts.map(f => `${f.id}@${f.viewport}`);
  assert.equal(new Set(keys).size, keys.length, "an id appears once per viewport");
  assert.deepEqual(new Set(facts.filter(f => f.viewport === 1440).map(f => f.id)).size > 60, true);
});

test("facts are deterministic: same input, same output, whatever the key order of the counts", () => {
  const a = measured();
  const reorder = map => Object.fromEntries(Object.entries(map).reverse());
  const flipped = width => {
    const s = structure(width);
    return { ...s, columns: reorder(s.columns), gaps: Object.fromEntries(Object.entries(s.gaps).map(([k, v]) => [k, reorder(v)])), headings: { ...s.headings, main: reorder(s.headings.main) }, controls: { ...s.controls, buttons: reorder(s.controls.buttons), labels: reorder(s.controls.labels) }, css: { ...s.css, breakpoints: reorder(s.css.breakpoints) } };
  };
  const b = summarize([observation(1440, { structure: flipped(1440) }), observation(390, { structure: flipped(390) })]);
  assert.equal(JSON.stringify(buildFacts(a, a.structure, "u", "d")), JSON.stringify(buildFacts(b, b.structure, "u", "d")));
  assert.equal(JSON.stringify(buildFacts(a, a.structure, "u", "d")), JSON.stringify(buildFacts(a, a.structure, "u", "d")));
  // Ties resolve to the smaller value, not to the first key seen.
  const tie = summarizeStructure(structure(1440, { gaps: { section: { "48": 2, "24": 2 }, group: {}, stack: {}, inline: {}, inset: {} } }));
  assert.equal(tie.rhythm.section, 24);
});

test("the allow-list walker passes facts and structure output and rejects anything textual", () => {
  const summary = measured();
  const url = "https://example.test/settings?tab=general";
  const doc = buildFacts(summary, summary.structure, url, "2026-11-10");
  assert.deepEqual(disallowedStrings(doc, { url }), []);
  assert.deepEqual(disallowedStrings(structure(1440)), []);
  assert.deepEqual(disallowedStrings(summary.structure), []);
  // The page's own URL is allowed only as the facts file's url.
  assert.equal(disallowedStrings({ ...doc, facts: [{ ...doc.facts[0], from: url }] }, { url }).length, 1);
  assert.equal(disallowedStrings(doc, { url: "https://other.test/" }).length, 1);
  for (const leak of ["Payments", "결제 대시보드", ".btn-primary", "#save-button", "https://cdn.example.test/logo.png", "Save changes"]) {
    assert.equal(disallowedStrings(structure(1440, { sections: [{ kind: leak }] })).length, 1, `value ${leak}`);
    assert.equal(disallowedStrings(structure(1440, { columns: { [leak]: 1 } })).length, 1, `key ${leak}`);
  }
  assert.deepEqual(unknownTokens("filled|rgb(15, 118, 110)|36|main"), []);
  assert.deepEqual(unknownTokens("cubic-bezier(0.4, 0, 0.2, 1)"), []);
});

test("primaries: accent-filled actions per section and region, with every filled action as the fallback", () => {
  const v = summarizeStructure(structure(1440, {
    sections: [
      { kind: "toolbar", y: 80, h: 40, gapBefore: 0, surface: false, cols: [1], heading: null, filled: { [TEAL]: 2, "rgb(30, 30, 30)": 1 } },
      { kind: "form-group", y: 1200, h: 200, gapBefore: 32, surface: true, cols: [1], heading: null, filled: { [TEAL]: 1 } },
    ],
    controls: { buttons: { [`filled|${TEAL}|36|main`]: 3, "filled|rgb(30, 30, 30)|36|topBar": 1 }, inputs: {}, labels: {}, leftEdges: 0 },
  }));
  const byAccent = primaryStats(v, "#0f766e");
  assert.deepEqual([byAccent.basis, byAccent.count, byAccent.perSectionMax, byAccent.sectionsOverOne, byAccent.firstViewport, byAccent.placement], ["accent", 3, 2, 1, 2, "main"]);
  assert.deepEqual(byAccent.perRegion, { topBar: 0, main: 3 });
  const fallback = primaryStats(v, "#2563eb");
  assert.deepEqual([fallback.basis, fallback.count, fallback.perSectionMax], ["filled", 4, 3]);
});

test("responsive deltas pair the widest and the narrowest viewport", () => {
  const d = responsiveDeltas(summarizeStructure(structure(1440)), summarizeStructure(structure(390)));
  assert.deepEqual(d.viewports, [1440, 390]);
  assert.deepEqual(d.columns, [2, 1]);
  assert.deepEqual(d.regions, { topBar: [56, 56], sideNav: [240, null], main: [1200, 390] });
  assert.deepEqual(d.insetLeft, [32, 16]);
  assert.equal(structureSummary([structure(390), structure(1440)]).viewports[0].viewport, 1440, "widest first whatever the input order");
  assert.equal(responsiveDeltas(null, summarizeStructure(structure(390))), null);
});

test("summary extras: border, elevation, inks, on-accent colour, motion, targets, scroll depth", () => {
  const s = measured();
  assert.deepEqual(s.border, { width: 1, color: "#e3e8e7", count: 24, distinct: 2 });
  assert.deepEqual(s.elevation, { families: { tight: 6 }, levels: 1, distinct: 1 });
  assert.equal(s.headingInk, "#090c0b");
  assert.equal(s.mutedInk, "#4d5150");
  assert.equal(s.onAccent, "#fafcfc");
  assert.ok(s.onAccentContrast > 4.5);
  assert.deepEqual([s.motion.transitions, s.motion.duration, s.motion.easing, s.motion.animations, s.motion.infinite], [6, 150, "ease-out", 2, 2]);
  assert.deepEqual(s.targets["390"], { count: 20, mode: 36, under44Share: 1, under24Share: 0 });
  assert.deepEqual(s.scrollDepth, { 1440: 1.5, 390: 1.84 });
  assert.deepEqual(s.distinct, { controlHeights: 2, radii: 2 });
  assert.equal(shadowFamily("rgb(0, 0, 0) 0px 0px 0px 1px"), "ring");
  assert.equal(shadowFamily("rgba(0, 0, 0, 0.2) 0px 12px 40px -8px, rgba(0, 0, 0, 0.1) 0px 1px 2px 0px"), "floating");
  assert.equal(shadowFamily("rgba(0, 0, 0, 0.1) 0px 1px 2px 0px inset"), "inset");
  assert.equal(shadowFamily("none"), null);
  // Utility CSS stacks transparent ring placeholders in front of the real shadow.
  assert.equal(shadowFamily("rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px"), "tight");
  assert.equal(shadowFamily("rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(229, 229, 229) 0px 0px 0px 1px"), "ring");
  assert.equal(shadowFamily("rgba(0, 0, 0, 0) 0px 0px 0px 0px"), null);
  // Older observations without the new keys still summarize, without structure or facts.
  const plain = summarize([{ ...observation(1440), actionPairs: undefined, motion: undefined, targets: undefined, tabular: undefined, structure: undefined }]);
  assert.equal(plain.onAccent, null);
  assert.equal(plain.motion.transitions, 0);
  assert.equal(Object.hasOwn(plain, "structure") || Object.hasOwn(plain, "facts"), false);
});

test("drift --structure: structure rows name the odd screen; without the option the report is unchanged", () => {
  const screen = (label, over = {}) => ({ label, url: `https://example.test/${label}`, summary: measured(over, over) });
  const rows52 = { structure: structure(1440, { tables: [{ rows: 6, cols: 3, headerH: 36, rowH: { "52": 6 }, padX: 16, rowBorder: true, stickyHeader: false, endAligned: 1 }] }) };
  const screens = [screen("home"), screen("settings"), { ...screen("billing", rows52), summary: summarize([observation(1440, rows52), observation(390, { structure: structure(390, { tables: [{ rows: 6, cols: 3, headerH: 36, rowH: { "52": 6 }, padX: 16, rowBorder: true, stickyHeader: false, endAligned: 1 }] }) })]) }];
  const report = compareScreens(screens, { structure: true });
  assert.deepEqual(Object.keys(report.structure.axes), STRUCTURE_AXES);
  const rowHeights = report.structure.axes.tableRowHeights;
  assert.deepEqual(rowHeights.baseline, [40]);
  assert.deepEqual(rowHeights.screens.map(s => [s.label, s.status, s.extra]), [["home", "same", []], ["settings", "same", []], ["billing", "extra", [52]]]);
  assert.deepEqual(report.structure.screensWithDrift, ["billing"]);
  assert.equal(report.structure.axes.primariesPerSection.baseline, 1);
  assert.deepEqual(report.structure.axes.headingSizes.baseline, [16, 24]);
  assert.deepEqual(report.structure.axes.transitionDurations.baseline, [150]);
  assert.deepEqual(report.screensWithDrift, [], "structure rows never count as role drift");
  assert.match(report.verdict, /Structure outside the shared set: table row height \(billing\)\./u);
  const md = renderDriftMarkdown(report);
  assert.ok(md.includes("| table row height | 40 | 40 | 40 | 52 (+52) |"), md);
  assert.ok(md.includes("| primaries per section (max) | 1 | 1 | 1 | 1 |"), md);
  assert.deepEqual(structureValues(screens[2].summary).tableRowHeights, [52]);
  assert.equal(structureValues({}), null);
  // Without the option: byte-for-byte what summaries without structure produce.
  const strip = s => ({ ...s, summary: summarize([observation(1440, { structure: undefined }), observation(390, { structure: undefined })]) });
  const plain = compareScreens(screens.map(strip));
  const off = compareScreens(screens);
  assert.equal(JSON.stringify(off), JSON.stringify(plain));
  assert.equal(renderDriftMarkdown(off), renderDriftMarkdown(plain));
  assert.equal(Object.hasOwn(off, "structure"), false);
});

test("twelve-axis draft: a decision column, and the six fillable axes filled from facts", () => {
  const md = twelveAxesDraft("https://example.test/settings", measured());
  assert.match(md, /\| Axis \| Measured or derived value \| Level \| Decision \(person\) \|\n\|---\|---\|---\|---\|/u);
  assert.equal((md.match(/\| unknown \|/gu) || []).length, 0);
  for (const axis of ["attention", "composition", "imagery-data", "navigation-action", "states-motion", "tells"]) assert.match(md, new RegExp(`\\| ${axis} \\| @?[a-z0-9]+: `, "u"), axis);
  assert.match(md, /\| user-job \| page-type hint settings \(sections @1440: heading-block 1, form-group 3, table 1\) \| derived hint \| open: the job itself \|/u);
  assert.match(md, /\| attention \| .* \| derived \+ observed \| open: the intended focal point \|/u);
  assert.match(md, /\| responsive \| accent agrees across viewports: true; both: columns 2 -> 1/u);
  assert.match(md, /\| surfaces \| radii \[4,8\]; border 1px #e3e8e7 \(2 border style\(s\)\); elevation tight 6/u);
  for (const line of md.split("\n").filter(l => l.startsWith("| ") && !l.startsWith("| Axis"))) assert.equal(line.split(" | ").length, 4, line);
});

test("robots.txt: longest match wins, allow wins a tie, only the * group applies", () => {
  const txt = "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*.json$\n# Disallow: /x\n";
  assert.equal(robotsVerdict(txt, "/settings").allowed, true);
  assert.equal(robotsVerdict(txt, "/private/settings").allowed, false);
  assert.equal(robotsVerdict(txt, "/private/ok/settings").allowed, true);
  assert.equal(robotsVerdict(txt, "/data.json").allowed, false);
  assert.equal(robotsVerdict(txt, "/data.json?x=1").allowed, true);
  assert.equal(robotsVerdict(txt, "/x").allowed, true, "comments are ignored");
  assert.equal(robotsVerdict("User-agent: *\nDisallow:\n", "/x").allowed, true, "an empty Disallow allows");
  assert.equal(robotsVerdict("User-agent: a\nUser-agent: *\nDisallow: /\n", "/x").allowed, false, "a group may name several agents");
  assert.equal(robotsVerdict("User-agent: *\nDisallow: /p\nAllow: /p\n", "/p").allowed, true);
});

test("robots check: missing file allows, server errors and no answer disallow; a disallowed path stops measure", async () => {
  const reply = (status, body = "") => async () => ({ status, ok: status >= 200 && status < 300, text: async () => body });
  assert.equal((await checkRobots("https://a.test/x", { fetchImpl: reply(404) })).status, "allowed");
  assert.equal((await checkRobots("https://a.test/x", { fetchImpl: reply(503) })).status, "disallowed");
  assert.equal((await checkRobots("https://a.test/x", { fetchImpl: async () => { throw new TypeError("fetch failed"); } })).status, "disallowed");
  const blocked = await checkRobots("https://a.test/private/x", { fetchImpl: reply(200, "User-agent: *\nDisallow: /private\n") });
  assert.deepEqual(blocked.status, "disallowed");
  assert.doesNotMatch(blocked.reason, /Disallow: \/private/u, "the rule text is not echoed");
  const args = parseArgs(["https://a.test/private/x", "--out", "/nonexistent-out", "--robots", "--browser", "/nonexistent/playwright.mjs"]);
  assert.deepEqual([args.robots, args.ownSite], [true, false]);
  await assert.rejects(measure(args, () => {}, { fetchImpl: reply(200, "User-agent: *\nDisallow: /private\n") }), /disallows \/private\/x for user-agent \*\. Nothing was measured\..*--own-site/u);
  // --own-site gets past the robots step (and then fails on the missing browser module, by design here).
  await assert.rejects(measure({ ...args, ownSite: true }, () => {}, { fetchImpl: reply(200, "User-agent: *\nDisallow: /private\n") }), /could not load browser module/u);
});

// A page stub for the scroll pass: it answers readScroll and scrollWindowTo by identity, clamps the
// scroll position the way a browser does, advances an injected clock on waitForTimeout, and throws
// on every other method, so a click, hover, key press, or navigation fails the test.
const scrollPage = ({ height, viewport = 900, grow = null }) => {
  const state = { y: 0, height, viewport, clock: 0, calls: [] };
  const allowed = {
    async evaluate(fn, arg) {
      if (fn === readScroll) { state.calls.push("read"); return { y: state.y, height: state.height, viewport: state.viewport }; }
      if (fn === scrollWindowTo) { state.calls.push(`scroll ${arg}`); state.y = Math.max(0, Math.min(arg, state.height - state.viewport)); if (grow) grow(state); return undefined; }
      throw new Error(`unexpected page.evaluate(${fn.name || "anonymous"})`);
    },
    async waitForTimeout(ms) { state.calls.push(`wait ${ms}`); state.clock += ms; },
  };
  const page = new Proxy(allowed, { get(target, key) { if (key in target) return target[key]; if (key === "then") return undefined; throw new Error(`page.${String(key)} is not allowed in the scroll pass`); } });
  return { state, page, now: () => state.clock };
};

test("scroll pass: reaches the bottom in 80% strides, returns to the top, and stops at each bound", async () => {
  assert.equal(Object.isFrozen(SCROLL_DEFAULTS), true);
  assert.deepEqual(SCROLL_DEFAULTS, { maxSteps: 60, maxMs: 15000, maxHeight: 30000, settleMs: 150, restMs: 800 });
  const bottom = scrollPage({ height: 4000 });
  assert.throws(() => bottom.page.click("a"), /page\.click is not allowed/u, "the stub refuses interaction");
  assert.throws(() => bottom.page.goto("https://example.test/"), /page\.goto is not allowed/u, "the stub refuses navigation");
  const record = await revealByScroll(bottom.page, {}, bottom.now);
  assert.deepEqual(record, { steps: 5, startHeight: 4000, finalHeight: 4000, cap: "none", atTop: true });
  assert.deepEqual(bottom.state.calls.filter(c => c.startsWith("scroll")), ["scroll 720", "scroll 1440", "scroll 2160", "scroll 2880", "scroll 3600", "scroll 0"]);
  assert.deepEqual(bottom.state.calls.filter(c => c.startsWith("wait")), ["wait 150", "wait 150", "wait 150", "wait 150", "wait 150", "wait 800"]);
  assert.equal(bottom.state.calls.at(-1), "read", "finalHeight and atTop come from a read after returning to the top");

  const steps = scrollPage({ height: 4000 });
  assert.deepEqual(await revealByScroll(steps.page, { maxSteps: 2 }, steps.now), { steps: 2, startHeight: 4000, finalHeight: 4000, cap: "steps", atTop: true });
  const time = scrollPage({ height: 9000 });
  assert.deepEqual(await revealByScroll(time.page, { maxMs: 400 }, time.now), { steps: 3, startHeight: 9000, finalHeight: 9000, cap: "time", atTop: true });
  const tall = scrollPage({ height: 9000 });
  assert.deepEqual(await revealByScroll(tall.page, { maxHeight: 1500 }, tall.now), { steps: 2, startHeight: 9000, finalHeight: 9000, cap: "height", atTop: true });
  assert.deepEqual(tall.state.calls.filter(c => c.startsWith("scroll")), ["scroll 720", "scroll 1440", "scroll 0"], "the next position (2160) would pass maxHeight");

  // A document no taller than the viewport: one read, no scroll call, no wait.
  const short = scrollPage({ height: 901 });
  assert.deepEqual(await revealByScroll(short.page, {}, short.now), { steps: 0, startHeight: 901, finalHeight: 901, cap: "none", atTop: true });
  assert.deepEqual(short.state.calls, ["read"]);

  // A page that grows while it is scrolled (lazy content) reports the larger final height.
  const growing = scrollPage({ height: 2000, grow: s => { if (s.y >= 1000 && s.height < 3500) s.height = 3500; } });
  assert.deepEqual(await revealByScroll(growing.page, {}, growing.now), { steps: 4, startHeight: 2000, finalHeight: 3500, cap: "none", atTop: true });
});

// A chromium stub for observeUrls: one page per context, canned probe output by identity, and a
// log of every page call in order. Any page method observeUrls does not need throws.
const stubChromium = ({ height = 4000, design, structureOut }) => {
  const calls = [];
  const scroll = scrollPage({ height });
  const page = new Proxy({
    async goto(url) { calls.push(`goto ${url}`); },
    async waitForLoadState() { calls.push("waitForLoadState"); },
    async waitForTimeout(ms) { calls.push(`wait ${ms}`); return scroll.page.waitForTimeout(ms); },
    async evaluate(fn, arg) {
      if (fn === observeDesign) { calls.push("observeDesign"); return structuredClone(design); }
      if (fn === observeStructure) { calls.push("observeStructure"); return structuredClone(structureOut); }
      if (fn === readScroll || fn === scrollWindowTo) { calls.push(fn === readScroll ? "readScroll" : `scrollWindowTo ${arg}`); return scroll.page.evaluate(fn, arg); }
      calls.push("evaluate (fonts)"); return undefined;
    },
  }, { get(target, key) { if (key in target) return target[key]; if (key === "then") return undefined; throw new Error(`page.${String(key)} is not allowed`); } });
  const chromium = { async launch() { return { async newContext() { return { async newPage() { return page; }, async close() { calls.push("context.close"); } }; }, async close() { calls.push("browser.close"); } }; } };
  return { chromium, calls };
};

test("observeUrls: no scroll call without `scroll`; with it the record rides on the observation and the scroll comes first", async () => {
  const design = observation(1440, { structure: undefined });
  delete design.structure;
  const viewports = [{ width: 1440, height: 900 }];
  const plain = stubChromium({ design, structureOut: structure(1440) });
  const [off] = await observeUrls(["https://example.test/"], { chromium: plain.chromium, viewports });
  assert.deepEqual(off.observations, [design], "without scroll the observation is the probe output, with no scroll key");
  assert.equal(plain.calls.some(c => /readScroll|scrollWindowTo/u.test(c)), false, "no scroll call");
  assert.equal(Object.hasOwn(off.summary, "scroll"), false);

  const scrolled = stubChromium({ design, structureOut: structure(1440) });
  const [on] = await observeUrls(["https://example.test/"], { chromium: scrolled.chromium, viewports, structure: true, scroll: true });
  assert.deepEqual(on.observations[0].scroll, { steps: 5, startHeight: 4000, finalHeight: 4000, cap: "none", atTop: true });
  assert.deepEqual(Object.keys(on.observations[0]).slice(-2), ["structure", "scroll"], "the record is attached after both probes ran");
  const lastScroll = scrolled.calls.findLastIndex(c => /readScroll|scrollWindowTo/u.test(c));
  assert.ok(lastScroll >= 0 && lastScroll < scrolled.calls.indexOf("observeDesign") && scrolled.calls.indexOf("observeDesign") < scrolled.calls.indexOf("observeStructure"), scrolled.calls.join(", "));
  assert.ok(scrolled.calls.indexOf("wait 500") < scrolled.calls.indexOf("readScroll"), "the pass starts after the existing settle wait");
  assert.deepEqual(on.summary.scroll, { 1440: { steps: 5, startHeight: 4000, finalHeight: 4000, cap: "none", atTop: true } });

  const capped = stubChromium({ design, structureOut: structure(1440) });
  const [few] = await observeUrls(["https://example.test/"], { chromium: capped.chromium, viewports, scroll: { maxSteps: 1 } });
  assert.equal(few.observations[0].scroll.cap, "steps", "an object of overrides is passed to the scroll pass");
});

test("scroll record plumbing: summary.scroll, the top-level scroll of facts, and the draft line exist only with a pass", () => {
  const plain = measured();
  assert.equal(Object.hasOwn(plain, "scroll"), false);
  assert.equal(Object.hasOwn(buildFacts(plain, plain.structure, "u", "d"), "scroll"), false);
  assert.doesNotMatch(twelveAxesDraft("https://example.test/settings", plain), /Scroll pass/u);
  const record = { steps: 6, startHeight: 4100, finalHeight: 4380, cap: "none", atTop: true };
  const summary = measured({ scroll: record }, { scroll: { ...record, steps: 7 } });
  assert.deepEqual(summary.scroll, { 1440: record, 390: { ...record, steps: 7 } });
  const doc = buildFacts(summary, summary.structure, "https://example.test/settings", "2026-11-11");
  assert.deepEqual(Object.keys(doc), ["factsVersion", "url", "observedAt", "viewports", "scroll", "facts"]);
  assert.deepEqual(doc.scroll, summary.scroll);
  assert.deepEqual(disallowedStrings(doc, { url: "https://example.test/settings" }), []);
  const md = twelveAxesDraft("https://example.test/settings", summary);
  assert.match(md, /\n\nScroll pass @1440: 6 step\(s\), document 4100px at load and 4380px after, cap none\.\nScroll pass @390: 7 step\(s\)/u);
  assert.match(md, /\| states-motion \| both: css\.hover ≥3, css\.focusVisible ≥2, css\.disabled ≥1, css\.reducedMotion ≥1, css\.unreadableSheets 1,/u, "lower bounds read ≥");
});

test("several mains: parts pass through the summary and become one fact, only when there is more than one", () => {
  const main = (parts, over = {}) => structure(1440, { regions: [{ kind: "main", by: "landmark", x: 0, y: 64, w: 1440, h: 3000, position: "static", items: 9, itemHeight: 40, contentWidth: 1200, insetLeft: 120, ...(parts === undefined ? {} : { parts }), ...over }] });
  assert.equal(summarizeStructure(main(3)).regions.main.parts, 3);
  assert.equal(Object.hasOwn(summarizeStructure(main(undefined)).regions.main, "parts"), false);
  const factsOf = s => { const summary = summarize([observation(1440, { structure: s })]); return buildFacts(summary, summary.structure).facts; };
  assert.deepEqual(fact(factsOf(main(3)), "composition.region.main.parts", 1440), { id: "composition.region.main.parts", axis: "composition", level: "observed", value: 3, viewport: 1440, from: "structure.regions[main] (landmark)" });
  assert.equal(fact(factsOf(main(1)), "composition.region.main.parts"), undefined);
  assert.equal(fact(factsOf(main(undefined)), "composition.region.main.parts"), undefined);
});

test("largest text: the largest counted text, not only headings in main; older summaries give today's fact", () => {
  // A 72px display line that is not a heading, over a 16px body; the only heading in main is a 20.6px h6.
  const display = summarize([observation(1440, {
    type: { "16|400|24": 40, "72|400|79.2": 2, "36|400|43.2": 4 },
    body: { color: "rgb(9, 12, 11)", background: "rgb(246, 248, 248)", fontFamily: "Inter", fontSize: 16 },
    structure: structure(1440, { headings: { main: { "6|20.6|400|18.5": 3 }, skips: 0 } }),
  })]);
  assert.deepEqual(display.largestText, { 1440: { size: 72, weight: 400, lineHeight: 79.2, count: 2 } });
  const facts = buildFacts(display, display.structure).facts;
  assert.deepEqual(fact(facts, "attention.text.largest", 1440), { id: "attention.text.largest", axis: "attention", level: "observed", value: 72, unit: "px", viewport: 1440, from: "observations.type (largest)" });
  assert.deepEqual(fact(facts, "attention.text.largestOverBody", 1440), { id: "attention.text.largestOverBody", axis: "attention", level: "derived", value: 4.5, viewport: 1440, from: "observations.type (largest) / observations.body.fontSize" });
  // The shared synthetic page: the largest heading in main is the largest text, as today.
  const shared = measured();
  assert.equal(fact(buildFacts(shared, shared.structure).facts, "attention.text.largestOverBody", 1440).value, 1.71);
  // An older summary.json without largestText produces today's value and source.
  const { largestText, ...older } = display;
  assert.ok(largestText);
  assert.deepEqual(fact(buildFacts(older, older.structure).facts, "attention.text.largestOverBody", 1440), { id: "attention.text.largestOverBody", axis: "attention", level: "derived", value: 1.29, viewport: 1440, from: "structure.headings.main / observations.body.fontSize" });
  // Main without any heading: the fact now exists, from the text histogram.
  const noHeading = summarize([observation(1440, { structure: structure(1440, { headings: { main: {}, skips: 0 } }) })]);
  assert.equal(fact(buildFacts(noHeading, noHeading.structure).facts, "attention.text.largestOverBody", 1440).value, 1.71);
  // Ties: most frequent weight and line height at the largest size, ties to the smaller value; numbers before `normal`.
  const tie = summarize([observation(1440, { type: { "14|400|20": 9, "40|700|normal": 2, "40|500|44": 2 }, structure: undefined })]);
  assert.deepEqual(tie.largestText[1440], { size: 40, weight: 500, lineHeight: 44, count: 4 });
  const none = summarize([observation(1440, { type: { "null|400|normal": 3 }, structure: undefined })]);
  assert.deepEqual(none.largestText, {}, "a viewport without a numeric size is omitted");
});

test("lower bounds: stylesheet counts carry bound lower when a sheet is unreadable or the rule budget ran out", () => {
  const factsWith = css => { const summary = summarize([observation(1440, { structure: structure(1440, { css }) }), observation(390, { structure: structure(390, { css }) })]); return buildFacts(summary, summary.structure).facts; };
  const base = { hover: 5, focusVisible: 0, disabled: 1, reducedMotion: 0, breakpoints: { "768": 2 } };
  for (const css of [{ ...base, unreadableSheets: 23, truncated: false }, { ...base, unreadableSheets: 0, truncated: true }]) {
    const facts = factsWith(css);
    for (const key of ["hover", "focusVisible", "disabled", "reducedMotion"]) {
      const f = fact(facts, `states.css.${key}`);
      assert.ok(f, `states.css.${key} is emitted, zero included`);
      assert.deepEqual(Object.keys(f), ["id", "axis", "level", "bound", "value", "viewport", "from"], "bound sits right after level");
      assert.deepEqual([f.level, f.bound, f.value, f.from], ["observed", "lower", css[key], "structure.css (readable stylesheets, lower bound)"]);
    }
    assert.deepEqual(fact(facts, "responsive.breakpoints"), { id: "responsive.breakpoints", axis: "responsive", level: "observed", bound: "lower", value: [768], unit: "px", viewport: "both", from: "structure.css.breakpoints (readable stylesheets, lower bound)" });
    const unreadable = fact(facts, "states.css.unreadableSheets");
    assert.deepEqual([Object.hasOwn(unreadable, "bound"), unreadable.from], [false, "structure.css (readable stylesheets)"]);
  }
  // Both clear: no fact has a bound, and every source is today's string.
  const clear = factsWith({ ...base, unreadableSheets: 0, truncated: false });
  assert.equal(clear.some(f => Object.hasOwn(f, "bound")), false);
  assert.equal(fact(clear, "states.css.focusVisible").from, "structure.css (readable stylesheets)");
  assert.equal(fact(clear, "responsive.breakpoints").from, "structure.css.breakpoints (readable stylesheets)");
  // Older structure output without `truncated` reads as not truncated.
  const older = factsWith({ ...base, unreadableSheets: 0 });
  assert.equal(older.some(f => Object.hasOwn(f, "bound")), false);
  // A lower bound at only one viewport bounds the merged breakpoints; an empty bounded list is still written.
  const narrowOnly = (() => { const summary = summarize([observation(1440, { structure: structure(1440, { css: { ...base, breakpoints: {}, unreadableSheets: 0 } }) }), observation(390, { structure: structure(390, { css: { ...base, breakpoints: {}, unreadableSheets: 2 } }) })]); return buildFacts(summary, summary.structure).facts; })();
  assert.deepEqual([fact(narrowOnly, "responsive.breakpoints").bound, fact(narrowOnly, "responsive.breakpoints").value], ["lower", []]);
  assert.equal(fact(narrowOnly, "states.css.hover").bound, undefined, "states.css reads the widest viewport, as today");
});

test("allow-list: the new facts, the top-level scroll, and structure with parts and css.truncated pass", () => {
  const record = { steps: 3, startHeight: 2600, finalHeight: 2600, cap: "time", atTop: true };
  const s = structure(1440, {
    regions: [{ kind: "main", by: "landmark", x: 0, y: 0, w: 1440, h: 2600, position: "static", items: 3, itemHeight: 40, contentWidth: 1200, insetLeft: 120, parts: 3 }],
    css: { hover: 1, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 2, truncated: true },
  });
  assert.deepEqual(disallowedStrings(s), []);
  const summary = summarize([observation(1440, { structure: s, scroll: record }), observation(390, { scroll: { ...record, cap: "height" } })]);
  assert.deepEqual(disallowedStrings(summary.structure), []);
  const doc = buildFacts(summary, summary.structure, "https://example.test/", "2026-11-11");
  for (const id of ["attention.text.largest", "composition.region.main.parts", "states.css.focusVisible"]) assert.ok(doc.facts.some(f => f.id === id), id);
  assert.deepEqual(disallowedStrings(doc, { url: "https://example.test/" }), []);
  for (const leak of ["Payments", "결제 대시보드", ".btn-primary", "#save-button", "https://cdn.example.test/logo.png", "Save changes"]) {
    assert.equal(disallowedStrings({ ...doc, scroll: { 1440: { ...record, cap: leak } } }, { url: "https://example.test/" }).length, 1, `scroll value ${leak}`);
    assert.equal(disallowedStrings(structure(1440, { regions: [{ kind: "main", parts: leak }] })).length, 1, `parts value ${leak}`);
  }
});
