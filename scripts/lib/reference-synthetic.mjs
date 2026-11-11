// Synthetic reference measurements and a temporary registry project for the reference-distance and
// reference-brief tests: the settings page of reference-structure.test.mjs (top bar, 240px side nav,
// 2fr/5fr settings groups with one primary each, a 40px-row table, a 768px breakpoint, one unreadable
// stylesheet), a chromium stub that serves canned probe output without a browser, and helpers that
// write a project selecting reference:<slug>. Numbers and enums only: no page text.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { buildFacts } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { observeDesign } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs";
import { observeStructure } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs";
import { readScroll, scrollWindowTo } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";

export const TEAL = "rgb(15, 118, 110)";

export const structure = (width, over = {}) => {
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
      ...[172, 450, 728].map((y) => ({ kind: "form-group", y, h: 246, gapBefore: 32, surface: false, cols: wide ? [0.29, 0.71] : [1], heading: { level: 2, size: 16, weight: 600 }, filled: { [TEAL]: 1 } })),
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

// observe-design output for the same page; `structureOver` reaches the structure probe output.
export const observation = (width, { structureOver = {}, ...over } = {}) => ({
  viewport: { width, height: width >= 768 ? 900 : 844 }, documentHeight: width >= 768 ? 1347 : 1551, elements: 94, truncated: false,
  actions: { [`bg:${TEAL}`]: 3, "text:rgb(77, 81, 80)": 2 }, actionText: {}, links: {}, text: { "rgb(9, 12, 11)": 30, "rgb(77, 81, 80)": 12 }, headings: { "rgb(9, 12, 11)": 5 },
  surfaces: { "rgb(255, 255, 255)": 5, "rgb(246, 248, 248)": 2 }, spacing: { 8: 40, 16: 30, 24: 6, 32: 8 },
  type: { "14|400|20": 40, "16|600|24": 4, "24|600|32": 1 }, radii: { 4: 20, 8: 3 }, controlHeights: { 36: 12, 32: 2 }, fonts: { Inter: 45 },
  shadows: { "rgba(0, 0, 0, 0.08) 0px 1px 3px 0px": 3 }, borders: { "1|rgb(227, 232, 231)": 12, "1|rgb(180, 189, 187)": 6 },
  body: { color: "rgb(9, 12, 11)", background: "rgb(246, 248, 248)", fontFamily: "Inter", fontSize: 14 },
  actionPairs: { [`${TEAL}|rgb(250, 252, 252)`]: 3 }, motion: { transitions: { "color|150|ease-out": 3 }, animations: { "1000|linear|infinite": 1 } },
  targets: { 36: 12, 32: 8 }, tabular: 7, structure: structure(width, structureOver),
  ...over,
});

export const URL_ = "https://example.test/settings";
export function measurement(over1440 = {}, over390 = {}, { url = URL_, date = "2026-11-10", robots = "allowed" } = {}) {
  const summary = summarize([observation(1440, over1440), observation(390, over390)]);
  return { summary, facts: buildFacts(summary, summary.structure, url, date), robots };
}

// A chromium stub for observeUrls: canned observe-design and observe-structure output per URL and
// viewport width (`pages[url](width)` returns an observation with its `structure`), a page that does
// not scroll, and `screenshot` returning fixed bytes. `probes` optionally maps an extra probe function
// (observeUrls `extraProbes`) to `(url, width) => output`; each call is logged as `probe <name>`.
// Every page call is logged; anything else throws.
export function stubChromium(pages, { png = Buffer.from("stub-png"), probes = new Map() } = {}) {
  const calls = [];
  const chromium = {
    async launch() {
      return {
        async newContext({ viewport }) {
          let url = null;
          const page = new Proxy({
            async goto(target) { url = target; calls.push(`goto ${target} @${viewport.width}`); },
            async waitForLoadState() {},
            async waitForTimeout(ms) { calls.push(`wait ${ms}`); },
            async evaluate(fn, arg) {
              const canned = pages[url]?.(viewport.width);
              if (!canned) throw new Error(`stub page: no canned output for ${url} @${viewport.width}`);
              if (fn === observeDesign) { calls.push("observeDesign"); const { structure: _s, ...design } = structuredClone(canned); return design; }
              if (fn === observeStructure) { calls.push("observeStructure"); return structuredClone(canned.structure); }
              if (fn === readScroll) { calls.push("readScroll"); return { y: 0, height: viewport.height, viewport: viewport.height }; }
              if (fn === scrollWindowTo) { calls.push(`scrollWindowTo ${arg}`); return undefined; }
              if (probes.has(fn)) { calls.push(`probe ${fn.name}`); return structuredClone(probes.get(fn)(url, viewport.width)); }
              return undefined;
            },
            async screenshot(options) { calls.push(`screenshot ${JSON.stringify(options)} @${viewport.width}`); return png; },
          }, { get(target, key) { if (key in target) return target[key]; if (key === "then") return undefined; throw new Error(`page.${String(key)} is not allowed`); } });
          return { async newPage() { return page; }, async close() {} };
        },
        async close() {},
      };
    },
  };
  return { chromium, calls, loadBrowserImpl: async () => ({ chromium, from: "stub/playwright/index.mjs" }) };
}

// A registry project with one artifact (app-ops) that selects reference:<slug>.
export function writeProject(root, { slug = "ops-console", selection = {}, brand = {}, decisions = null } = {}) {
  mkdirSync(join(root, ".styleseed/artifacts"), { recursive: true });
  writeFileSync(join(root, ".styleseed/project.json"), `${JSON.stringify({
    schemaVersion: 1, projectId: "distance-test",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#175CD3", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "snap", intensity: "restrained" }, imageryRole: "data-first", ...brand },
    ...(decisions ? { decisions } : {}),
  }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-ops", config: "app-ops.json" }] }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/app-ops.json"), `${JSON.stringify({
    schemaVersion: 1, id: "app-ops", target: { kind: "route", locator: "/ops" },
    selection: { grammar: `reference:${slug}`, adapter: null, domain: null, page: "settings", recipe: null, palette: null, profile: null, fallback: "operations-console", ...selection },
    decisions: { primaryDecision: "Which setting needs attention?", primaryAction: "Save settings", signatureMove: "Keep groups aligned." },
    implementation: { sourceRoots: ["src"], tokenFiles: [] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  }, null, 2)}\n`);
}

// measurements/ as project mode writes it (source.json carries the robots verdict and the scroll flag).
export function writeMeasurements(dir, m = measurement()) {
  mkdirSync(join(dir, "measurements"), { recursive: true });
  writeFileSync(join(dir, "measurements/summary.json"), JSON.stringify(m.summary, null, 2));
  writeFileSync(join(dir, "measurements/facts.json"), `${JSON.stringify(m.facts, null, 2)}\n`);
  writeFileSync(join(dir, "measurements/source.json"), `${JSON.stringify({ url: m.facts.url, observedAt: m.facts.observedAt, robots: m.robots, viewports: m.facts.viewports, scroll: Boolean(m.summary.scroll) }, null, 2)}\n`);
  return join(dir, "measurements");
}
