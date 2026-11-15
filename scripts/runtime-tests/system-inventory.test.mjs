import test from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { compareScreens, majoritySet, screenValues } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { COUNTED, DOMINANT_SHARE, INVENTORY_TOOL, INVENTORY_VERSION, renderInventoryMarkdown, systemInventory } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/system-inventory.mjs";
import { disallowedStrings } from "../lib/reference-allow-list.mjs";

// Synthetic observations in the shape observe-design writes (WO-10: controlHeightsByKind and controlBoxVersion).
const observation = (width, { heights = {}, fields = {}, buttons = {}, radii = {}, type = {}, spacing = { 8: 40, 16: 30 }, box = true } = {}) => ({
  viewport: { width, height: width === 1440 ? 900 : 844 }, elements: 300, truncated: false,
  actions: { "bg:rgb(15, 118, 110)": 4 }, actionText: {}, links: {}, text: { "rgb(9, 12, 11)": 80 }, headings: {}, surfaces: { "rgb(250, 253, 253)": 10 },
  spacing, type, radii, controlHeights: heights, fonts: { "Example Sans": 80 }, shadows: {}, borders: {},
  body: { color: "rgb(9, 12, 11)", background: "rgb(239, 245, 244)", fontFamily: "Example Sans", fontSize: 16 },
  ...(box ? { controlHeightsByKind: { field: fields, button: buttons }, controlBoxVersion: 1 } : {}),
});
const screen = (label, observations, state = null) => ({ label, state, url: `https://example.test/${label}`, observations, summary: summarize(observations) });

// Three screens at rest and one state variant. Home is measured at two widths; the counts sum over both.
const screens = () => [
  screen("home", [
    observation(1440, { heights: { 32: 20, 40: 4 }, fields: { 32: 12 }, buttons: { 32: 8, 40: 4 }, radii: { 4: 30, 8: 4 }, type: { "14|400|20": 60, "24|700|32": 4, "12|400|16": 8 } }),
    observation(390, { heights: { 32: 11, 44: 1 }, fields: { 32: 7 }, buttons: { 32: 4, 44: 1 }, radii: { 4: 20 }, type: { "14|400|20": 40, "24|700|32": 2 } }),
  ]),
  screen("orders", [observation(1440, { heights: { 32: 16, 36: 6, 28: 1 }, fields: { 32: 8, 36: 6 }, buttons: { 32: 8, 28: 1 }, radii: { 4: 24, 10: 6, 2: 1 }, type: { "14|400|20": 50, "13|400|20": 12, "20|600|28": 3 }, spacing: { 8: 40, 12: 20 } })]),
  screen("billing", [observation(1440, { heights: { 32: 12, 40: 3 }, fields: { 32: 8 }, buttons: { 32: 4, 40: 3 }, radii: { 4: 18, 8: 6 }, type: { "14|400|20": 30, "12|400|16": 6, "24|700|32": 2 }, spacing: { 4: 20, 12: 20 } })]),
  screen("home?state=error", [observation(1440, { heights: { 52: 9 }, buttons: { 52: 9 }, radii: { 20: 9 }, type: { "18|400|24": 30 } })], "error"),
];

test("inventory: counts, shares, and screens per value, summed over viewports; state variants left out", () => {
  const inventory = systemInventory(screens(), { observedAt: "2026-11-16" });
  assert.deepEqual(inventory.screens, [{ label: "home" }, { label: "orders" }, { label: "billing" }], "the state variant is not counted");
  assert.deepEqual(inventory.viewports, [[1440, 900], [390, 844]]);
  const heights = inventory.axes.controlHeights;
  assert.equal(heights.counted, "controls");
  assert.equal(heights.total, 74);
  assert.equal(heights.distinct, 5);
  assert.deepEqual(heights.values, [
    { value: 32, count: 59, share: 0.8, screens: 3, reported: 3 },
    { value: 40, count: 7, share: 0.09, screens: 2, reported: 2 },
    { value: 36, count: 6, share: 0.08, screens: 1, reported: 1 },
    { value: 28, count: 1, share: 0.01, screens: 1, reported: 1 },
    { value: 44, count: 1, share: 0.01, screens: 1, reported: 0 },
  ], "count descending, then value ascending; reported = screens whose drift row lists the value (44px is 1 of home's 37 controls, under its 3% cut)");
  assert.deepEqual(heights.dominant, [32]);
  assert.equal(heights.controlBoxVersion, 1);
  assert.deepEqual(heights.byKind.field, { counted: "fields", total: 41, distinct: 2, values: [{ value: 32, count: 35, share: 0.85, screens: 3 }, { value: 36, count: 6, share: 0.15, screens: 1 }], dominant: [32, 36] });
  assert.deepEqual(heights.byKind.button.dominant, [32, 40]);
  for (const v of heights.values) assert.equal(v.count, ["field", "button"].reduce((sum, kind) => sum + (heights.byKind[kind].values.find((k) => k.value === v.value)?.count ?? 0), 0), `fields and buttons add up at ${v.value}px`);

  const radii = inventory.axes.radii;
  assert.equal(radii.counted, "boxes with a visible edge");
  assert.deepEqual(radii.values.map((v) => [v.value, v.count, v.share, v.screens]), [[4, 92, 0.84, 3], [8, 10, 0.09, 2], [10, 6, 0.06, 1], [2, 1, 0.01, 1]]);
  assert.deepEqual(radii.dominant, [4]);
  const sizes = inventory.axes.typeSizes;
  assert.equal(sizes.counted, "text elements");
  assert.deepEqual(sizes.values.map((v) => [v.value, v.count, v.screens]), [[14, 180, 3], [12, 14, 2], [13, 12, 1], [24, 8, 2], [20, 3, 1]], "the size part of size|weight|lineHeight keys");
  assert.deepEqual(inventory.axes.spacingBase, { counted: "screens", values: [{ value: 8, screens: 2 }, { value: 4, screens: 1 }], majority: 8 });
  assert.deepEqual(COUNTED, { controlHeights: "controls", radii: "boxes with a visible edge", typeSizes: "text elements", spacingBase: "screens", field: "fields", button: "buttons" });
});

test("shared equals the drift baseline of the same screens; the spacing majority equals the drift's", () => {
  const list = screens();
  const inventory = systemInventory(list, { observedAt: "2026-11-16" });
  const drift = compareScreens(list);
  for (const axis of ["controlHeights", "radii", "typeSizes"]) {
    assert.deepEqual(inventory.axes[axis].shared, drift.axes[axis].baseline, axis);
    assert.deepEqual(inventory.axes[axis].shared, majoritySet(list.filter((s) => !s.state).map((s) => screenValues(s.summary)[axis])), `${axis}: majoritySet over the drift values`);
  }
  assert.equal(inventory.axes.spacingBase.majority, drift.axes.spacingBase.baseline);
  assert.deepEqual(inventory.axes.typeSizes.shared, [12, 14, 24], "24px is on two of three screens with 8 elements: shared, not dominant");
  assert.deepEqual(inventory.axes.typeSizes.dominant, [14], "12px holds 6% of the text elements, 24px 4%");
  // A value is reported on a screen exactly when the drift row of that screen lists it.
  for (const axis of ["controlHeights", "radii", "typeSizes"]) for (const v of inventory.axes[axis].values) {
    assert.equal(v.reported, drift.axes[axis].screens.filter((s, i) => !list[i].state && s.value.includes(v.value)).length, `${axis} ${v.value}`);
  }
});

test("dominant: values on at least 10% of the counted elements, and the top value when none reaches 10%", () => {
  const flat = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [24 + 2 * i, i === 3 ? 10 : 9]));
  const inventory = systemInventory([screen("flat", [observation(1440, { heights: flat, buttons: flat, radii: { 4: 1 } })])], { observedAt: "2026-11-16" });
  const heights = inventory.axes.controlHeights;
  assert.ok(heights.values.every((v) => v.share < DOMINANT_SHARE), JSON.stringify(heights.values));
  assert.deepEqual(heights.dominant, [30], "the most frequent value, alone");
  const exact = systemInventory([screen("exact", [observation(1440, { heights: { 32: 9, 40: 1 }, radii: { 4: 1 } })])], { observedAt: "2026-11-16" });
  assert.deepEqual(exact.axes.controlHeights.dominant, [32, 40], "a share of exactly 10% counts");
  const empty = systemInventory([screen("empty", [observation(1440, {})])], { observedAt: "2026-11-16" });
  assert.deepEqual([empty.axes.controlHeights.total, empty.axes.controlHeights.values, empty.axes.controlHeights.dominant, empty.axes.controlHeights.shared], [0, [], [], []]);
  assert.match(renderInventoryMarkdown(empty), /No controls were counted on these screens\./u);
});

test("the older reading: without controlBoxVersion the inventory says so and has no per-kind counts", () => {
  const list = [screen("home", [observation(1440, { heights: { 36: 4 }, radii: { 4: 3 }, box: false })]), screen("orders", [observation(1440, { heights: { 36: 2, 40: 2 }, fields: { 36: 2 }, buttons: { 40: 2 }, radii: { 4: 2 } })])];
  const inventory = systemInventory(list, { observedAt: "2026-11-16" });
  assert.equal(inventory.axes.controlHeights.controlBoxVersion, null, "one observation without the key is enough");
  assert.equal(Object.hasOwn(inventory.axes.controlHeights, "byKind"), false);
  assert.ok(renderInventoryMarkdown(inventory).includes("These control heights are the older reading, taken from the input element"), renderInventoryMarkdown(inventory));
});

test("INVENTORY.md: one table per axis and the sentence; determinism; refusals", () => {
  const inventory = systemInventory(screens(), { observedAt: "2026-11-16" });
  const md = renderInventoryMarkdown(inventory);
  assert.ok(md.startsWith("# System inventory — 3 screens\n"), md);
  assert.ok(md.includes("A count of what these screens render. It does not say which values are right."), md);
  for (const heading of ["## Control heights", "## Radii", "## Type sizes", "## Spacing base"]) assert.ok(md.includes(`${heading}\n\n`), heading);
  assert.equal((md.match(/^\|---/gmu) ?? []).length, 4, "one table per axis");
  assert.ok(md.includes("| 32px | 59 | 80% | 3 | 3 | 35 | 24 |"), md);
  assert.ok(md.includes("- On at least half of the screens, as the drift report counts them: 12, 14, 24px."), md);
  assert.ok(md.includes("- Fields: 41, 2 distinct values; on at least 10% of the fields: 32, 36px."), md);
  assert.equal(JSON.stringify(systemInventory(screens(), { observedAt: "2026-11-16" })), JSON.stringify(inventory), "same input, same bytes");
  assert.equal(renderInventoryMarkdown(systemInventory(screens(), { observedAt: "2026-11-16" })), md);
  assert.throws(() => systemInventory(screens(), {}), /observedAt must be the measurement date/u);
  assert.throws(() => systemInventory([screens()[3]], { observedAt: "2026-11-16" }), /no screen at rest/u);
  assert.throws(() => systemInventory([{ label: "home", observations: [], summary: {} }], { observedAt: "2026-11-16" }), /screen home has no observations/u);
  assert.throws(() => systemInventory("home", { observedAt: "2026-11-16" }), /pass the measured screens/u);
});

test("inventory.json: no page text, selector, or URL; only the screen labels need removing", () => {
  const list = screens().map((s, i) => ({ ...s, label: ["결제 홈", "Orders overview", "billing"][i] ?? s.label }));
  const file = { tool: INVENTORY_TOOL, version: INVENTORY_VERSION, ...systemInventory(list, { observedAt: "2026-11-16" }) };
  const stripped = { ...file, screens: file.screens.map(({ label, ...rest }) => rest) };
  assert.deepEqual(disallowedStrings(stripped), []);
  assert.ok(disallowedStrings(file).length >= 1, "a label left in is caught by the walk");
  assert.ok(!JSON.stringify(file).includes("://"), "no URL is copied");
  assert.deepEqual(Object.keys(file), ["tool", "version", "observedAt", "viewports", "screens", "axes"]);
});
