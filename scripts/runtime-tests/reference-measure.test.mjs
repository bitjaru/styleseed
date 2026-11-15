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
  assert.deepEqual([args.robots, args.ownSite], [false, false]);
  assert.deepEqual((({ robots, ownSite }) => [robots, ownSite])(parseArgs(["https://example.com/", "--out", "/tmp/x", "--robots", "--own-site"])), [true, true]);
  assert.throws(() => parseArgs(["ftp://x", "--out", "/tmp/x"]), /http/);
  assert.throws(() => parseArgs(["https://example.com"]), /--out/);
  assert.throws(() => parseArgs(["https://example.com", "--out", "/tmp/x", "--smart"]), /unknown option/);
  const summary = summarize([observation()]);
  const draft = caseDraft({ id: "example-settings-2026-11-05", url: "https://example.com/settings", files: ["measurements/summary.json"], summary, observedAt: "2026-11-05" });
  assert.equal(draft.sources[0].evidence, "observed");
  assert.equal(draft.sources[0].robots, "not-checked");
  assert.equal(caseDraft({ id: "x-2026-11-05", url: "https://example.com/", files: [], summary, observedAt: "2026-11-05", robots: { status: "allowed" } }).sources[0].robots, "allowed");
  assert.equal(draft.measurements.summary.accentDerived, "#0f766e");
  assert.deepEqual(Object.keys(draft.measurements.summary).sort(), ["accentDerived", "colorCount", "radii", "spacingBase", "spacingScale", "typeSteps"], "the draft summary keeps the schema's keys");
  assert.deepEqual(draft.decisions, []);
  // Without structure observations the seven unmeasured axes stay unknown; the table gains the decision column.
  const md = twelveAxesDraft("https://example.com/settings", summary);
  assert.match(md, /\| color \| accent #0f766e \(from filled-actions\)/);
  assert.match(md, /\| Axis \| Measured or derived value \| Level \| Decision \(person\) \|/);
  assert.equal((md.match(/\| unknown \|/g) || []).length, 7);
  assert.match(md, /\| attention \| unknown — observe on the live surface and record the source \| unknown \| open: the intended focal point \|/);
});

test("canvas: backdrop share first, then the body colour (black included), then the most frequent surface", () => {
  // Pin: the existing observation (body rgb(239, 245, 244), no backdrop) is unchanged.
  const pinned = deriveRoles(observation());
  assert.deepEqual([pinned.canvas, pinned.evidence.find(e => e.role === "canvas").from], ["#eff5f4", "body-or-largest-surface"]);
  // The same observation with a backdrop led by the body colour: same canvas, decided by the backdrop.
  const led = deriveRoles(observation({ backdrop: { "rgb(239, 245, 244)": 0.82, "rgb(9, 12, 11)": 0.18 } }));
  assert.equal(led.canvas, "#eff5f4");
  assert.deepEqual(led.evidence.find(e => e.role === "canvas"), { role: "canvas", from: "backdrop", color: "#eff5f4", share: 0.82, alternatives: [{ color: "#090c0b", share: 0.18 }] });
  assert.equal(led.inkContrast, pinned.inkContrast);

  // An opaque black body with brand-coloured surfaces most frequent: the body is the canvas.
  const brand = { "rgb(232, 67, 46)": 5, "rgb(0, 0, 0)": 2 };
  const black = deriveRoles(observation({ body: { color: "rgb(255, 255, 255)", background: "rgb(0, 0, 0)", fontFamily: "Inter", fontSize: 16 }, surfaces: brand, text: { "rgb(255, 255, 255)": 40 }, actions: { "bg:rgb(232, 67, 46)": 2 } }));
  assert.deepEqual([black.canvas, black.evidence.find(e => e.role === "canvas").from], ["#000000", "body-or-largest-surface"]);
  assert.ok(black.accentContrast > 3, `accent contrast against the black canvas, got ${black.accentContrast}`);

  // A transparent body without a backdrop: the most frequent surface, as before.
  const transparent = deriveRoles(observation({ body: { color: "rgb(9, 12, 11)", background: "rgba(0, 0, 0, 0)", fontFamily: "Inter", fontSize: 16 } }));
  assert.deepEqual([transparent.canvas, transparent.evidence.find(e => e.role === "canvas").from], ["#fafdfd", "body-or-largest-surface"]);
  // A transparent body with an empty backdrop: the same.
  assert.equal(deriveRoles(observation({ body: { ...observation().body, background: "rgba(0, 0, 0, 0)" }, backdrop: {} })).canvas, "#fafdfd");
  // A transparent body whose document <html> or full-bleed bands paint: the colour with the largest share.
  assert.equal(deriveRoles(observation({ body: { ...observation().body, background: "rgba(0, 0, 0, 0)" }, backdrop: { "rgb(17, 24, 39)": 0.7, "rgb(255, 255, 255)": 0.3 } })).canvas, "#111827");

  // Full-bleed sections out-cover the body colour: they are the canvas, and accent contrast follows.
  const dark = { "rgb(17, 24, 39)": 0.74, "rgb(239, 245, 244)": 0.26 };
  const covered = deriveRoles(observation({ backdrop: dark }));
  assert.equal(covered.canvas, "#111827");
  assert.equal(covered.accentContrast, contrastRatio("#0f766e", "#111827"));
  assert.notEqual(covered.accentContrast, pinned.accentContrast);
  // Equal shares: the body colour wins.
  assert.equal(deriveRoles(observation({ backdrop: { "rgb(17, 24, 39)": 0.5, "rgb(239, 245, 244)": 0.5 } })).canvas, "#eff5f4");
  // Equal shares, neither is the body colour: the smaller colour string.
  assert.equal(deriveRoles(observation({ body: { ...observation().body, background: "rgba(0, 0, 0, 0)" }, backdrop: { "rgb(255, 255, 255)": 0.5, "rgb(17, 24, 39)": 0.5 } })).canvas, "#111827");
});

test("canvas over two viewports: backdrop shares are summed before ranking", () => {
  // The body colour leads at 1440 and loses at 390; summed, the dark band covers more.
  const wide = observation({ backdrop: { "rgb(239, 245, 244)": 0.6, "rgb(17, 24, 39)": 0.4 } });
  const narrow = observation({ viewport: { width: 390, height: 844 }, backdrop: { "rgb(17, 24, 39)": 0.8, "rgb(239, 245, 244)": 0.2 } });
  assert.equal(deriveRoles(wide).canvas, "#eff5f4");
  const s = summarize([wide, narrow]);
  assert.equal(s.canvas, "#111827");
  assert.deepEqual(s.roleEvidence.find(e => e.role === "canvas"), { role: "canvas", from: "backdrop", color: "#111827", share: 0.6, alternatives: [{ color: "#eff5f4", share: 0.4 }] });
  assert.equal(s.inkContrast, contrastRatio("#090c0b", "#111827"));
});

test("control heights per kind and the control-box version: only when every observation carries them", () => {
  const boxed = (byKind, over = {}) => observation({ controlHeights: { 32: 6, 36: 2 }, controlHeightsByKind: byKind, controlBoxVersion: 1, ...over });
  const wide = boxed({ field: { 32: 4 }, button: { 32: 2, 36: 2 } });
  const narrow = boxed({ field: { 32: 4, 40: 1 }, button: { 32: 2 } }, { viewport: { width: 390, height: 844 }, controlHeights: { 32: 6, 40: 1 } });
  const s = summarize([wide, narrow]);
  assert.deepEqual(s.controlHeights, [32, 36, 40]);
  assert.deepEqual(s.controlHeightsByKind, { field: [32, 40], button: [32, 36] });
  assert.equal(s.controlBoxVersion, 1);
  assert.equal(s.distinct.controlHeights, 3);
  assert.equal(summarize([wide, boxed(wide.controlHeightsByKind, { controlBoxVersion: 2 })]).controlBoxVersion, 1, "the smallest version");
  // One observation measured before the visible-control-box reading: neither key.
  const { controlHeightsByKind: _k, controlBoxVersion: _v, ...older } = narrow;
  const mixed = summarize([wide, older]);
  assert.equal(Object.hasOwn(mixed, "controlHeightsByKind"), false);
  assert.equal(Object.hasOwn(mixed, "controlBoxVersion"), false);
  // Observations without them (stored ones, the synthetic ones above) gain no key.
  assert.deepEqual(Object.keys(summarize([observation()])).filter((k) => k.startsWith("control")), ["controlHeights"]);
});

test("--no-scroll turns the scroll pass off; it is on by default", () => {
  assert.equal(parseArgs(["https://example.com/", "--out", "/tmp/x"]).scroll, true);
  assert.equal(parseArgs(["https://example.com/", "--out", "/tmp/x", "--no-scroll"]).scroll, false);
  const summary = summarize([observation()]);
  assert.match(caseDraft({ id: "x-2026-11-11", url: "https://example.com/", files: [], summary, observedAt: "2026-11-11", scrolled: true }).sources[0].note, /scroll pass ran/u);
  assert.match(caseDraft({ id: "x-2026-11-11", url: "https://example.com/", files: [], summary, observedAt: "2026-11-11" }).sources[0].note, /no scroll pass/u);
});
