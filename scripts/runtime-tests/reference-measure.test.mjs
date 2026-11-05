import test from "node:test";
import assert from "node:assert/strict";
import { clusterSpacing, typeSteps, radiusFamilies, deriveRoles, summarize, toHex, isNeutral, contrastRatio } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { parseArgs, caseDraft, twelveAxesDraft } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";

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

test("accent comes from filled actions, not from the largest coloured surface", () => {
  const roles = deriveRoles(observation());
  assert.equal(roles.accent, "#0f766e");
  assert.equal(roles.accentFrom, "filled-actions");
  assert.equal(roles.ink, "#090c0b");
  assert.equal(roles.canvas, "#eff5f4");
  assert.ok(roles.inkContrast > 15);
  assert.ok(roles.evidence.find(e => e.role === "accent").count === 6);
});

test("without filled actions the accent falls back to coloured links and never to body text", () => {
  const roles = deriveRoles(observation({ actions: { "bg:rgb(255, 255, 255)": 3, "text:rgb(9, 12, 11)": 2 } }));
  assert.equal(roles.accent, "#0f766e");
  assert.equal(roles.accentFrom, "links");
  const none = deriveRoles(observation({ actions: {}, links: { "rgb(9, 12, 11)": 20 } }));
  assert.equal(none.accent, null);
  assert.equal(none.accentFrom, null);
  assert.equal(none.evidence[0].from, "none");
});

test("spacing clusters to the base that explains most values and lists off-scale values", () => {
  const s = clusterSpacing({ 8: 60, 16: 80, 24: 40, 32: 20, 12: 3, 48: 10 });
  assert.equal(s.base, 8);
  assert.deepEqual(s.scale, [8, 16, 24, 32, 48]);
  assert.ok(s.coverage >= 0.9);
  assert.equal(clusterSpacing({ 4: 10, 12: 10, 20: 10, 8: 10 }).base, 4);
  assert.equal(clusterSpacing({ 5: 10, 7: 10, 13: 10 }).base, null);
  assert.deepEqual(clusterSpacing({}).scale, []);
});

test("type steps drop sizes under two percent and report the dominant weight per size", () => {
  const t = typeSteps({ "14|400|20": 90, "16|400|24": 60, "24|700|32": 12, "36|700|44": 4, "11|400|16": 1 });
  assert.deepEqual(t.steps.map(s => s.px), [36, 24, 16, 14]);
  assert.equal(t.steps[0].weight, "700");
  assert.equal(t.distinctSizes, 5);
});

test("radius families and colour helpers", () => {
  assert.deepEqual(radiusFamilies({ 4: 30, 12: 10, 999: 2 }), [4, 12, 999]);
  assert.deepEqual(radiusFamilies({ 4: 100, 7: 1 }), [4]);
  assert.equal(toHex("rgb(15, 118, 110)"), "#0f766e");
  assert.equal(toHex("#ABC"), "#aabbcc");
  assert.equal(isNeutral("rgb(240, 240, 240)"), true);
  assert.equal(isNeutral("rgb(15, 118, 110)"), false);
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
});

test("summarize merges viewports and flags accent disagreement", () => {
  const narrow = observation({ viewport: { width: 390, height: 844 }, actions: { "bg:rgb(37, 99, 235)": 5 } });
  const s = summarize([observation(), narrow]);
  assert.equal(s.accentDerived, "#0f766e");
  assert.equal(s.accentAgreesAcrossViewports, false);
  assert.equal(s.spacingBase, 8);
  assert.equal(s.typeSteps, 4);
  assert.deepEqual(s.fonts[0], { family: "Pretendard", count: 340 });
  assert.ok(s.colorCount >= 5);
});

test("CLI argument parsing and drafts", () => {
  const args = parseArgs(["https://example.com/settings", "--out", "/tmp/x", "--id", "example-settings-2026-11-05", "--designlang"]);
  assert.deepEqual(args.urls, ["https://example.com/settings"]);
  assert.equal(args.designlang, true);
  assert.throws(() => parseArgs(["ftp://x", "--out", "/tmp/x"]), /http/);
  assert.throws(() => parseArgs(["https://example.com"]), /--out/);
  assert.throws(() => parseArgs(["https://example.com", "--out", "/tmp/x", "--smart"]), /unknown option/);
  const summary = summarize([observation()]);
  const draft = caseDraft({ id: "example-settings-2026-11-05", url: "https://example.com/settings", files: ["measurements/summary.json"], summary, observedAt: "2026-11-05" });
  assert.equal(draft.sources[0].evidence, "observed");
  assert.equal(draft.measurements.summary.accentDerived, "#0f766e");
  assert.deepEqual(draft.decisions, []);
  const md = twelveAxesDraft("https://example.com/settings", summary);
  assert.match(md, /\| color \| accent #0f766e \(from filled-actions\)/);
  assert.equal((md.match(/\| unknown \|/g) || []).length, 7);
});
