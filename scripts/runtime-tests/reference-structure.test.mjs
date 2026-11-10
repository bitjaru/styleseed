import test from "node:test";
import assert from "node:assert/strict";
import { summarize, shadowFamily } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { summarizeStructure, responsiveDeltas, buildFacts, primaryStats, structureSummary, FACT_FAMILIES } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { compareScreens, renderDriftMarkdown, structureValues, STRUCTURE_AXES } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { twelveAxesDraft, robotsVerdict, checkRobots, measure, parseArgs } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
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
