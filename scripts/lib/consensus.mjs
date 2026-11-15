// Pattern-consensus study (WO-09 Part A): agreement across design-system lineages on what their
// published demo screens rendered, and the same screens as a negative control for the render-fault
// classes. Pure: no I/O, no clock. Every generated file is a function of the stored records, the
// run's manifest snapshot (runs/<date>/manifest.json), run.json, and the claim list below; nothing
// here reads the rule catalog or the fault class list of the engine, so a later catalog change
// cannot change the bytes of an old run. A row is a count of what published demo screens rendered:
// it is not a review and not design acceptance, and it gates nothing.
// Version 2 (WO-12) adds the component-anatomy claims, read from the anatomy probe's block of a record
// (scripts/lib/consensus-anatomy.mjs), set-valued rows (`valueKind: "set"`), `group` and `unit` on every
// row, and `context` on every lineage entry. The 21 claims of version 1 keep their ids, readers, and
// buckets; a record without an anatomy block has no value for any new claim.
import { colorDistance } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";

export const CONSENSUS_VERSION = 2;
export const PAGE_TYPES = Object.freeze(["dashboard", "list", "form", "detail"]);
export const ROW_PAGE_TYPES = Object.freeze([...PAGE_TYPES, "all"]);
export const GATE_CANDIDATES = Object.freeze(["amount-wrap", "text-overlap", "text-spill"]);
export const VIEWPORTS = Object.freeze([[1440, 900], [390, 844]]);
export const REASONS = Object.freeze(["terms", "no-base", "robots", "http-error", "redirected-host", "redirected-path", "timeout", "navigation-error", "unexpected-content", "overlay"]);
const SAFE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const KINDS = ["product-system", "kit"];
const ACCESS = ["hosted", "self-hosted", "skipped"];
const TIERS = ["screen", "fragment"];
const AUTOMATED_ACCESS = ["not-mentioned", "robots-txt", "conditional", "restricted", "unchecked"];
const ROBOTS = ["allowed", "disallowed", "not-checked"];
const CONTEXTS = ["console", "service"];
const EXPECT_KEYS = ["elements", "tables", "fields", "buttons"];
// Probe list per fault class, for the eligibility counts of the negative control (icon-mix has none).
const CANDIDATE_LIST = Object.freeze({ "amount-wrap": "amounts", "text-overlap": "overlaps", "text-spill": "spills", "text-clip": "clips", "tight-inset": "insets", "text-touch": "touches", "near-touch": "gaps", "near-align": "aligns", "emoji-icon": "emoji" });

const sum = (list) => list.reduce((a, b) => a + Number(b || 0), 0);

// Heights bucket to the nearest 4px.
export const px4 = (v) => Math.round(v / 4) * 4;

// The value with the largest total weight over [value, weight] pairs; a tie goes to the smaller
// value. Null when there is nothing to count.
export function mode(pairs) {
  const totals = new Map();
  for (const [value, weight] of pairs) if (Number.isFinite(value)) totals.set(value, (totals.get(value) ?? 0) + Number(weight));
  let best = null, most = -Infinity;
  for (const [value, n] of totals) if (n > most || (n === most && value < best)) { best = value; most = n; }
  return best;
}

// The measured entry of one viewport of a record, or null.
export function viewportOf(record, width) {
  return (record?.viewports ?? []).find((v) => v.viewport === width && v.status === "measured") ?? null;
}

// The control probe's fields and labelled filled or outline buttons at one viewport, with the modes
// the claims read: fieldH, fieldR, fieldFont over the fields; buttonH, buttonR over the buttons.
export function controlsAt(record, width) {
  const v = viewportOf(record, width);
  if (!v || !v.controls) return null;
  const fields = Object.entries(v.controls.fields ?? {}).map(([key, n]) => {
    const [kind, box, self, radius, font, panel] = key.split("|");
    return { kind, box: Number(box), self: Number(self), radius: Number(radius), font: Number(font), panel, n: Number(n) };
  });
  const buttons = Object.entries(v.controls.buttons ?? {}).map(([key, n]) => {
    const [emphasis, height, radius, font] = key.split("|");
    return { emphasis, height: Number(height), radius: Number(radius), font: Number(font), n: Number(n) };
  }).filter((b) => b.emphasis === "filled" || b.emphasis === "outline");
  return {
    fields, buttons, fieldCount: sum(fields.map((f) => f.n)), buttonCount: sum(buttons.map((b) => b.n)),
    fieldH: mode(fields.map((f) => [f.box, f.n])), fieldR: mode(fields.map((f) => [f.radius, f.n])), fieldFont: mode(fields.map((f) => [f.font, f.n])),
    buttonH: mode(buttons.map((b) => [b.height, b.n])), buttonR: mode(buttons.map((b) => [b.radius, b.n])),
    pairs: v.controls.pairs ?? [], textSizes: v.controls.textSizes ?? {},
  };
}

const factAt = (record, id, viewport) => (record?.facts ?? []).find((f) => f.id === id && f.viewport === viewport) ?? null;
const measuredViewports = (record) => (record?.viewports ?? []).filter((v) => v.status === "measured");
const yes = (value) => ({ eligible: true, value });
const NO = Object.freeze({ eligible: false, value: null });
const sameRadius = (a, b) => (a === 999 && b === 999) || (a !== 999 && b !== 999 && Math.abs(a - b) <= 1);
const band = (share) => (share === 0 ? 0 : share <= 0.1 ? 0.1 : share <= 0.5 ? 0.5 : 1);

// Most frequent colour (a tie goes to the smaller string), then: is every colour within 24 of it.
function constantColour(list) {
  const present = list.filter((c) => typeof c === "string");
  if (!present.length) return true;
  const counts = new Map();
  for (const c of present) counts.set(c, (counts.get(c) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))[0][0];
  return present.every((c) => { const d = colorDistance(c, top); return d !== null && d <= 24; });
}

// The claims. `transfer`: keep (a consistency fact) or adapt (a dimension that stays a project's
// choice and never supports a rule). `aggregate`: majority or every over a lineage's eligible
// screens; lineage-scope claims combine all of a lineage's full screens themselves. `fragments`: the
// row also carries withFragments. `expect`: the value the clause states. Each clause is an exact
// substring of its rule's statement in engine/rules/catalog.json (consensus.test.mjs asserts it).
const CLAIM_LIST = [
  {
    id: "controls.shareHeight", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: true, card: [1],
    rule: "CRAFT-control-heights", clause: "Buttons, inputs, and selects in one context share a height.", expect: true,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.fieldCount && c.buttonCount ? yes(Math.abs(c.fieldH - c.buttonH) <= 2) : NO; },
  },
  {
    id: "controls.rowShareHeight", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: true, card: [1],
    rule: "CRAFT-control-heights", clause: "Buttons, inputs, and selects in one context share a height.", expect: true,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.pairs.length ? yes(c.pairs.every((p) => Math.abs(p.field - p.button) <= 2)) : NO; },
  },
  {
    id: "controls.shareRadius", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: true, card: [8], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.fieldCount && c.buttonCount ? yes(sameRadius(c.fieldR, c.buttonR)) : NO; },
  },
  {
    id: "controls.pointerUnder44", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: true, card: [3],
    rule: "CRAFT-control-heights", clause: "pointer-first dense desktop controls may be smaller when still operable", expect: true,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.buttonCount ? yes(c.buttonH < 44) : NO; },
  },
  {
    id: "controls.narrowAtLeast44", transfer: "keep", aggregate: "majority", viewport: 390, fragments: true, card: [3], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 390); return c && c.buttonCount ? yes(c.buttonH >= 44) : NO; },
  },
  {
    id: "button.height", transfer: "adapt", aggregate: "majority", viewport: 1440, fragments: true, card: [1, 2], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.buttonCount ? yes(px4(c.buttonH)) : NO; },
  },
  {
    id: "field.height", transfer: "adapt", aggregate: "majority", viewport: 1440, fragments: true, card: [2], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.fieldCount ? yes(px4(c.fieldH)) : NO; },
  },
  {
    id: "field.textSize", transfer: "adapt", aggregate: "majority", viewport: 1440, fragments: true, card: [5], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.fieldCount ? yes(Math.round(c.fieldFont)) : NO; },
  },
  {
    id: "fields.inPanel", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: true, card: [7], rule: null, clause: null, expect: null, pageTypes: ["form"],
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.fieldCount >= 2 ? yes(sum(c.fields.filter((f) => f.panel !== "none").map((f) => f.n)) > c.fieldCount / 2) : NO; },
  },
  {
    id: "text.bodySize", transfer: "adapt", aggregate: "majority", viewport: 1440, fragments: true, card: [5], rule: null, clause: null, expect: null,
    screen: (r) => {
      const c = controlsAt(r, 1440);
      if (!c || sum(Object.values(c.textSizes)) < 200) return NO;
      return yes(Math.round(mode(Object.entries(c.textSizes).map(([size, chars]) => [Number(size), chars]))));
    },
  },
  {
    id: "table.rowHeight", transfer: "adapt", aggregate: "majority", viewport: 1440, fragments: false, card: [], rule: null, clause: null, expect: null, pageTypes: ["list"],
    screen: (r) => { const f = factAt(r, "density.table.rowHeight", 1440); return f && typeof f.value === "number" ? yes(px4(f.value)) : NO; },
  },
  {
    id: "list.overFourRows", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: false, card: [],
    rule: "DL-21-density-by-task", clause: "There is no universal four-item limit", expect: true, pageTypes: ["list"],
    screen: (r) => {
      const s = viewportOf(r, 1440)?.structure;
      const sizes = [...(s?.tables ?? []).map((t) => Number(t.rows) || 0), ...(s?.lists ?? []).map((l) => Number(l.items) || 0)];
      return sizes.length ? yes(Math.max(...sizes) > 4) : NO;
    },
  },
  {
    id: "primary.onePerSection", transfer: "keep", aggregate: "majority", viewport: 1440, fragments: false, card: [], rule: null, clause: null, expect: null,
    screen: (r) => { const f = factAt(r, "navigation.primary.perSectionMax", 1440); return f && typeof f.value === "number" ? yes(f.value <= 1) : NO; },
  },
  {
    id: "amounts.oneLine", transfer: "keep", aggregate: "every", viewport: "both", fragments: false, card: [],
    rule: "DL-23-amounts-never-wrap", clause: "Displayed amounts never wrap mid-value.", expect: true,
    screen: (r) => {
      const vs = measuredViewports(r);
      if (!vs.some((v) => (v.faults?.candidates?.amounts ?? 0) >= 1)) return NO;
      return yes(vs.every((v) => (v.faults?.counts?.["amount-wrap"] ?? 0) === 0));
    },
  },
  {
    id: "icons.noEmoji", transfer: "keep", aggregate: "every", viewport: "both", fragments: false, card: [],
    rule: "CRAFT-functional-icons", clause: "emoji are content, not icons", expect: true,
    screen: (r) => iconClaim(r, "emoji-icon"),
  },
  {
    id: "icons.oneFamily", transfer: "keep", aggregate: "every", viewport: "both", fragments: false, card: [],
    rule: "CRAFT-icon-family", clause: "Icons in one navigation, list, or toolbar come from one family", expect: true,
    screen: (r) => iconClaim(r, "icon-mix"),
  },
  {
    id: "lineage.rolesConstant", transfer: "keep", scope: "lineage", viewport: "both", fragments: false, card: [],
    rule: "INV-05-no-unexplained-role-drift", clause: "Semantic roles (accent, status, canvas, type roles) do not change between screens without a recorded decision.", expect: true,
    screen: (r) => yes({ accent: r.values?.accent ?? null, ink: r.values?.ink ?? null, canvas: r.values?.canvas ?? null, spacingBase: r.values?.spacingBase ?? null }),
    combine: (raws, screens) => {
      if (screens < 3) return null;
      const bases = raws.map((x) => x.spacingBase).filter((b) => b !== null);
      return ["accent", "ink", "canvas"].every((role) => constantColour(raws.map((x) => x[role]))) && new Set(bases).size <= 1;
    },
  },
  {
    id: "lineage.spacingBase", transfer: "keep", scope: "lineage", viewport: "both", fragments: false, card: [],
    rule: "CRAFT-spacing-scale", clause: "Reuse the approved spacing scale.", expect: true,
    screen: (r) => yes(r.values?.spacingBase ?? null),
    combine: (raws, screens) => (screens < 3 ? null : raws.every((b) => b !== null) && new Set(raws).size === 1),
  },
  {
    id: "lineage.buttonHeight", transfer: "keep", scope: "lineage", viewport: 1440, fragments: false, card: [], rule: null, clause: null, expect: null,
    screen: (r) => { const c = controlsAt(r, 1440); return c && c.buttonCount ? yes(c.buttonH) : NO; },
    combine: (raws) => (raws.length < 3 ? null : Math.max(...raws) - Math.min(...raws) <= 2),
  },
  {
    id: "motion.reducedMotionRules", transfer: "keep", scope: "lineage", viewport: "both", fragments: false, card: [6], rule: null, clause: null, expect: null,
    screen: (r) => { const f = factAt(r, "states.css.reducedMotion", "both"); return f && typeof f.value === "number" && !(f.bound === "lower" && f.value === 0) ? yes(f.value) : NO; },
    combine: (raws) => (raws.length < 1 ? null : raws.some((n) => n >= 1)),
  },
  {
    id: "motion.transitionAll", transfer: "adapt", scope: "lineage", viewport: "both", fragments: false, card: [], rule: null, clause: null, expect: null,
    screen: (r) => yes({ transitions: Number(r.values?.motion?.transitions ?? 0), all: Number(r.values?.motion?.properties?.all ?? 0) }),
    combine: (raws, screens) => {
      const transitions = sum(raws.map((x) => x.transitions));
      return screens < 1 || transitions < 20 ? null : band(sum(raws.map((x) => x.all)) / transitions);
    },
  },
];

function iconClaim(r, cls) {
  const vs = measuredViewports(r);
  if (!vs.some((v) => sum(Object.values(v.faults?.icons?.sets ?? {})) + Number(v.faults?.icons?.unknown ?? 0) >= 1)) return NO;
  return yes(vs.every((v) => (v.faults?.counts?.[cls] ?? 0) === 0));
}

// --- Component anatomy (WO-12) ---------------------------------------------------------------------

// The anatomy probe's keys, part by part, as the probe joins them with `|`.
const ANATOMY_FIELDS = Object.freeze({
  buttons: ["emphasis", "height", "pad", "font", "weight", "radius", "border", "icon", "iconSize", "iconGap"],
  fields: ["kind", "height", "pad", "font", "radius", "style", "border", "adorned"],
  labels: ["position", "gap", "font", "weight"],
  fieldGaps: ["kind", "gap"],
  panels: ["size", "inset", "radius", "separation", "border"],
  panelGaps: ["axis", "gap"],
  cells: ["part", "height", "pad", "font", "weight"],
  headings: ["level", "size", "weight", "line"],
  textLines: ["size", "line"],
  icons: ["size"],
});

// The anatomy block of one measured viewport, parsed into lists of objects with a count `n` (a part
// that is a number becomes a number; `none`, `normal`, and the other enums stay strings). Buttons are
// the filled and outline ones only. Null when the viewport was not measured or the record has no
// anatomy block (a record of version 1): every anatomy claim then has no value.
export function anatomyAt(record, width) {
  const v = viewportOf(record, width);
  if (!v || !v.anatomy || typeof v.anatomy !== "object") return null;
  const out = {};
  for (const [list, names] of Object.entries(ANATOMY_FIELDS)) {
    out[list] = Object.entries(v.anatomy[list] ?? {}).map(([key, n]) => {
      const parts = key.split("|"), entry = {};
      names.forEach((name, i) => { const p = parts[i] ?? ""; entry[name] = p !== "" && Number.isFinite(Number(p)) ? Number(p) : p; });
      entry.n = Number(n);
      return entry;
    });
  }
  out.buttons = out.buttons.filter((b) => b.emphasis === "filled" || b.emphasis === "outline");
  return out;
}

// Buckets of the anatomy claims.
const px8 = (v) => Math.round(v / 8) * 8;
const ratio8 = (v) => Math.round(v * 8) / 8;
const ratio20 = (v) => Math.round(v * 20) / 20;
const durationBand = (ms) => (ms <= 100 ? 100 : ms <= 200 ? 200 : ms <= 300 ? 300 : ms <= 500 ? 500 : 1000);
const gridBand = (share) => (share < 0.5 ? 0.5 : share < 0.75 ? 0.75 : share < 0.9 ? 0.9 : 1);

const count = (list) => sum(list.map((x) => x.n));
// `mode` over one numeric field of parsed entries, weighted by `n` (strings are not counted).
const modeOf = (list, field) => mode(list.map((x) => [x[field], x.n]));
// The string with the largest total `n`; a tie goes to the one that sorts first.
function enumMode(list, field) {
  const totals = new Map();
  for (const x of list) if (typeof x[field] === "string") totals.set(x[field], (totals.get(x[field]) ?? 0) + x.n);
  let best = null, most = -Infinity;
  for (const [value, n] of totals) if (n > most || (n === most && value < best)) { best = value; most = n; }
  return best;
}
// The sets the claims read: B buttons, Bn without a leading icon, Bi with a leading or trailing icon,
// F fields, Fn fields without a leading adornment, P narrow panels, head and body cells.
const sets = (a) => ({
  B: a.buttons, Bn: a.buttons.filter((b) => b.icon !== "lead"), Bi: a.buttons.filter((b) => b.icon === "lead" || b.icon === "trail"),
  F: a.fields, Fn: a.fields.filter((f) => f.adorned === "none"), P: a.panels.filter((p) => p.size === "narrow"),
  head: a.cells.filter((c) => c.part === "head"), body: a.cells.filter((c) => c.part === "body"),
});
// A per-screen anatomy reader: the claim reads the 1440 anatomy block, and a record without one has
// no value.
const anat = (read) => (r) => { const a = anatomyAt(r, 1440); return a ? read(sets(a), a, r) : NO; };
const regionOf = (r, kind) => (viewportOf(r, 1440)?.structure?.regions ?? []).find((x) => x?.kind === kind) ?? null;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// The spacing sample of one screen at 1440 (the replacement for the test of lineage.spacingBase):
// instances of eight kinds, each a value with the border it sits inside; per kind a (value, border)
// combination stays when it holds at least 10% of that kind's instances; the border is resolved in
// favour of the 4px grid (the value when it is a multiple of 4, else the value less the border when
// that is one, else the value); a pair is a distinct (kind, resolved value). Null without an anatomy
// block.
const SPACING_KINDS = Object.freeze(["buttonPad", "fieldPad", "labelGap", "fieldGap", "panelInset", "panelGap", "cellPad", "iconGap"]);
export function spacingSample(record) {
  const a = anatomyAt(record, 1440);
  if (!a) return null;
  const s = sets(a);
  const instances = {
    buttonPad: s.Bn.map((b) => [b.pad, b.border, b.n]),
    fieldPad: s.Fn.map((f) => [f.pad, f.style === "box" ? f.border : 0, f.n]),
    labelGap: a.labels.filter((l) => l.position === "above").map((l) => [l.gap, 0, l.n]),
    fieldGap: a.fieldGaps.filter((g) => g.kind === "plain").map((g) => [g.gap, 0, g.n]),
    panelInset: s.P.map((p) => [p.inset, p.border, p.n]),
    panelGap: a.panelGaps.map((g) => [g.gap, 0, g.n]),
    cellPad: a.cells.filter((c) => isNum(c.pad)).map((c) => [c.pad, 0, c.n]),
    iconGap: s.Bi.map((b) => [b.iconGap, 0, b.n]),
  };
  const pairs = new Map();
  for (const kind of SPACING_KINDS) {
    const totals = new Map();
    let all = 0;
    for (const [value, border, n] of instances[kind]) {
      if (!isNum(value) || value <= 0) continue;
      const b = isNum(border) ? border : 0, key = `${value}|${b}`;
      totals.set(key, (totals.get(key) ?? 0) + n);
      all += n;
    }
    for (const [key, n] of totals) {
      if (10 * n < all) continue;
      const [value, border] = key.split("|").map(Number);
      const resolved = value % 4 === 0 ? value : border > 0 && (value - Math.round(border)) % 4 === 0 ? value - Math.round(border) : value;
      pairs.set(`${kind}|${resolved}`, { kind, value: resolved });
    }
  }
  return [...pairs.values()].sort((x, y) => SPACING_KINDS.indexOf(x.kind) - SPACING_KINDS.indexOf(y.kind) || x.value - y.value);
}

// A lineage's spacing pairs: the union of its screens' samples, as distinct (kind, value).
const unionPairs = (samples) => { const m = new Map(); for (const list of samples) for (const p of list ?? []) m.set(`${p.kind}|${p.value}`, p); return [...m.values()]; };
const share4 = (pairs) => pairs.filter((p) => p.value % 4 === 0).length / pairs.length;
// Pooled counts of a list of { value: count } maps.
const pool = (maps) => { const m = new Map(); for (const map of maps) for (const [k, n] of Object.entries(map ?? {})) m.set(Number(k), (m.get(Number(k)) ?? 0) + Number(n)); return m; };
const ascending = (list) => [...new Set(list)].sort((x, y) => x - y);
// Per-screen inputs of the lineage-scope anatomy claims; every screen with an anatomy block gives one.
const sizesOf = (list, weight = (x) => x.n) => { const m = {}; for (const x of list) if (isNum(x.size)) m[Math.round(x.size)] = (m[Math.round(x.size)] ?? 0) + weight(x); return m; };
const SET_INPUT = {
  spacing: (r) => { const s = spacingSample(r); return s ? yes(s) : NO; },
  type: anat((s, a) => yes(sizesOf(a.textLines))),
  heading: anat((s, a) => yes(sizesOf(a.headings))),
  radius: anat((s) => {
    const out = {};
    for (const [key, list] of [["button", s.B], ["field", s.F], ["panel", s.P]]) { const m = modeOf(list, "radius"); if (m !== null) out[key] = Math.round(m); }
    return yes(out);
  }),
  motion: anat((s, a, r) => yes({ transitions: Number(r.values?.motion?.transitions ?? 0), durations: (r.values?.motion?.durations ?? []).filter(isNum) })),
  controls: anat((s) => { const m = {}; for (const x of [...s.B, ...s.F]) if (isNum(x.height)) m[x.height] = (m[x.height] ?? 0) + x.n; return yes(m); }),
};
// The set a lineage-scope set claim gives from its screens' inputs, or null under its minimum.
const SET_OF = {
  spacing: (raws) => { const pairs = unionPairs(raws); return raws.length < 2 || pairs.length < 4 ? null : ascending(pairs.map((p) => p.value)); },
  type: (raws) => {
    const pooled = pool(raws), total = sum([...pooled.values()]);
    return raws.length < 2 || total < 1000 ? null : ascending([...pooled].filter(([, n]) => 100 * n >= 2 * total).map(([size]) => size));
  },
  heading: (raws) => {
    const pooled = pool(raws), total = sum([...pooled.values()]);
    return raws.length < 2 || total < 5 ? null : ascending([...pooled].filter(([, n]) => 100 * n >= 5 * total).map(([size]) => size));
  },
  radius: (raws) => { if (raws.length < 2) return null; const values = ascending(raws.flatMap((x) => Object.values(x))); return values.length ? values : null; },
  motion: (raws) => {
    const busy = raws.filter((x) => x.transitions >= 20);
    if (busy.length < 2) return null;
    const values = ascending(busy.flatMap((x) => x.durations.map(durationBand)));
    return values.length ? values : null;
  },
};
const sizeCount = (set) => (raws) => { const values = SET_OF[set](raws); return values ? values.length : null; };

// The anatomy claims. Per-screen claims read the 1440 viewport (the two motion claims the summary of
// both viewports) and aggregate by majority; lineage-scope claims read all full screens of a lineage
// that have an anatomy block. No claim maps to a catalog rule. `fragments` is true for the groups
// buttons and fields (a form fragment shows complete controls).
const A = (id, group, transfer, unit, screen, extra = {}) => ({
  id, group, transfer, unit, screen, aggregate: "majority", viewport: 1440, fragments: group === "buttons" || group === "fields",
  card: [], rule: null, clause: null, expect: null, ...extra,
});
const L = (id, group, transfer, unit, screen, combine, extra = {}) => ({
  id, group, transfer, unit, screen, combine, scope: "lineage", viewport: 1440, fragments: false, card: [], rule: null, clause: null, expect: null, ...extra,
});
const ANATOMY_CLAIM_LIST = [
  A("button.padX", "buttons", "adapt", "px", anat((s) => (s.Bn.length ? yes(modeOf(s.Bn, "pad")) : NO))),
  A("button.padRatio", "buttons", "adapt", null, anat((s) => (s.Bn.length ? yes(ratio8(modeOf(s.Bn, "pad") / modeOf(s.B, "height"))) : NO))),
  A("button.textSize", "buttons", "adapt", "px", anat((s) => (s.B.length ? yes(Math.round(modeOf(s.B, "font"))) : NO))),
  A("button.textWeight", "buttons", "adapt", null, anat((s) => (s.B.length ? yes(modeOf(s.B, "weight")) : NO))),
  A("button.radius", "buttons", "adapt", "px", anat((s) => (s.B.length ? yes(Math.round(modeOf(s.B, "radius"))) : NO))),
  A("button.shape", "buttons", "keep", null, anat((s) => { if (!s.B.length) return NO; const r = modeOf(s.B, "radius"); return yes(r === 999 ? "pill" : r <= 1 ? "square" : "rounded"); })),
  A("button.iconSize", "buttons", "adapt", "px", anat((s) => (s.Bi.length ? yes(modeOf(s.Bi, "iconSize")) : NO))),
  A("button.iconGap", "buttons", "adapt", "px", anat((s) => (s.Bi.length ? yes(modeOf(s.Bi, "iconGap")) : NO))),
  A("button.textMatchesField", "buttons", "keep", null, anat((s) => (s.B.length && s.F.length ? yes(Math.abs(modeOf(s.B, "font") - modeOf(s.F, "font")) <= 0.5) : NO))),
  A("field.padX", "fields", "adapt", "px", anat((s) => (s.Fn.length ? yes(modeOf(s.Fn, "pad")) : NO))),
  A("field.radius", "fields", "adapt", "px", anat((s) => (s.F.length ? yes(Math.round(modeOf(s.F, "radius"))) : NO))),
  A("field.style", "fields", "keep", null, anat((s) => (s.F.length ? yes(enumMode(s.F, "style")) : NO))),
  A("field.borderWidth", "fields", "adapt", "px", anat((s) => { const lined = s.F.filter((f) => f.style === "box" || f.style === "under"); return lined.length ? yes(modeOf(lined, "border")) : NO; })),
  A("label.position", "fields", "keep", null, anat((s, a) => { const named = a.labels.filter((l) => l.position !== "none"); return count(named) >= 2 ? yes(enumMode(named, "position")) : NO; })),
  A("label.gap", "fields", "adapt", "px", anat((s, a) => { const above = a.labels.filter((l) => l.position === "above"); return above.length ? yes(modeOf(above, "gap")) : NO; })),
  A("label.textWeight", "fields", "adapt", null, anat((s, a) => { const named = a.labels.filter((l) => l.position !== "none"); return count(named) >= 2 ? yes(modeOf(named, "weight")) : NO; })),
  A("form.fieldGap", "fields", "adapt", "px", anat((s, a) => { const plain = a.fieldGaps.filter((g) => g.kind === "plain"); return plain.length ? yes(modeOf(plain, "gap")) : NO; })),
  A("panel.inset", "panels", "adapt", "px", anat((s) => (s.P.length ? yes(modeOf(s.P, "inset")) : NO))),
  A("panel.radius", "panels", "adapt", "px", anat((s) => (s.P.length ? yes(Math.round(modeOf(s.P, "radius"))) : NO))),
  A("panel.separation", "panels", "keep", null, anat((s) => (s.P.length ? yes(enumMode(s.P, "separation")) : NO))),
  A("panel.gap", "panels", "adapt", "px", anat((s, a) => (a.panelGaps.length ? yes(modeOf(a.panelGaps, "gap")) : NO))),
  A("radius.panelNotSmaller", "panels", "keep", null, anat((s) => {
    const controls = s.F.length ? s.F : s.B;
    if (!s.P.length || !controls.length) return NO;
    const panel = modeOf(s.P, "radius"), control = modeOf(controls, "radius");
    return panel === 999 || control === 999 ? NO : yes(panel >= control);
  })),
  A("table.headerHeight", "tables", "adapt", "px", anat((s) => (s.head.length ? yes(px4(modeOf(s.head, "height"))) : NO))),
  A("table.bodyRowHeight", "tables", "adapt", "px", anat((s) => (s.body.length ? yes(px4(modeOf(s.body, "height"))) : NO))),
  A("table.cellPadX", "tables", "adapt", "px", anat((s) => { const padded = s.body.filter((c) => isNum(c.pad)); return padded.length ? yes(modeOf(padded, "pad")) : NO; })),
  A("table.headerHeavier", "tables", "keep", null, anat((s) => (s.head.length && s.body.length ? yes(modeOf(s.head, "weight") > modeOf(s.body, "weight")) : NO))),
  A("list.itemHeight", "tables", "adapt", "px", anat((s, a, r) => {
    let most = null;
    for (const l of viewportOf(r, 1440)?.structure?.lists ?? []) if (!most || Number(l.items) > Number(most.items)) most = l;
    if (!most || !(Number(most.items) >= 5)) return NO;
    const h = mode(Object.entries(most.itemH ?? {}).map(([height, n]) => [Number(height), n]));
    return h === null ? NO : yes(px4(h));
  }), { pageTypes: ["list"] }),
  A("nav.sideWidth", "navigation", "adapt", "px", anat((s, a, r) => { const side = regionOf(r, "sideNav"); return side && isNum(side.w) ? yes(px8(side.w)) : NO; })),
  A("nav.itemHeight", "navigation", "adapt", "px", anat((s, a, r) => { const side = regionOf(r, "sideNav"); return side && Number(side.items) >= 3 && isNum(side.itemHeight) ? yes(px4(side.itemHeight)) : NO; })),
  A("nav.topBarHeight", "navigation", "adapt", "px", anat((s, a, r) => { const top = regionOf(r, "topBar"); return top && isNum(top.h) ? yes(px4(top.h)) : NO; })),
  A("text.lineRatio", "type", "adapt", null, anat((s, a) => {
    if (count(a.textLines) < 200) return NO;
    const size = modeOf(a.textLines, "size"), lines = a.textLines.filter((t) => t.size === size && isNum(t.line));
    return size !== null && size > 0 && lines.length ? yes(ratio20(modeOf(lines, "line") / size)) : NO;
  })),
  A("heading.pageTitle", "type", "adapt", "px", anat((s, a) => (a.headings.length ? yes(Math.round(Math.max(...a.headings.map((h) => h.size)))) : NO))),
  A("heading.sectionTitle", "type", "adapt", "px", anat((s, a) => {
    const largest = Math.max(...a.headings.map((h) => h.size)), under = a.headings.filter((h) => h.size < largest);
    return under.length ? yes(Math.round(modeOf(under, "size"))) : NO;
  })),
  A("heading.weight", "type", "adapt", null, anat((s, a) => (a.headings.length ? yes(modeOf(a.headings, "weight")) : NO))),
  A("icon.size", "type", "adapt", "px", anat((s, a) => (count(a.icons) >= 3 ? yes(modeOf(a.icons, "size")) : NO))),
  A("motion.duration", "motion", "adapt", "ms", anat((s, a, r) => {
    const f = factAt(r, "states.motion.duration", "both");
    return Number(r.values?.motion?.transitions ?? 0) >= 20 && f && isNum(f.value) ? yes(durationBand(f.value)) : NO;
  }), { viewport: "both" }),
  // Lineage scope (row `all` only).
  L("spacing.grid4Share", "spacing", "adapt", null, SET_INPUT.spacing, (raws) => { const pairs = unionPairs(raws); return raws.length < 3 || pairs.length < 8 ? null : gridBand(share4(pairs)); }),
  L("spacing.onGrid4", "spacing", "keep", null, SET_INPUT.spacing, (raws) => { const pairs = unionPairs(raws); return raws.length < 3 || pairs.length < 8 ? null : share4(pairs) >= 0.75; }),
  L("spacing.steps", "spacing", "adapt", "px", SET_INPUT.spacing, SET_OF.spacing, { valueKind: "set" }),
  L("type.sizes", "type", "adapt", "px", SET_INPUT.type, SET_OF.type, { valueKind: "set" }),
  L("heading.sizes", "type", "adapt", "px", SET_INPUT.heading, SET_OF.heading, { valueKind: "set" }),
  L("radius.values", "panels", "adapt", "px", SET_INPUT.radius, SET_OF.radius, { valueKind: "set" }),
  L("motion.durations", "motion", "adapt", "ms", SET_INPUT.motion, SET_OF.motion, { valueKind: "set", viewport: "both" }),
  L("type.sizeCount", "type", "adapt", null, SET_INPUT.type, sizeCount("type")),
  L("heading.sizeCount", "type", "adapt", null, SET_INPUT.heading, sizeCount("heading")),
  L("spacing.stepCount", "spacing", "adapt", null, SET_INPUT.spacing, sizeCount("spacing")),
  L("radius.valueCount", "panels", "adapt", null, SET_INPUT.radius, sizeCount("radius")),
  L("control.heightCount", "buttons", "adapt", null, SET_INPUT.controls, (raws) => {
    const used = raws.filter((m) => sum(Object.values(m)) > 0);
    if (used.length < 2) return null;
    const pooled = pool(used), total = sum([...pooled.values()]);
    return [...pooled.values()].filter((n) => 100 * n >= 5 * total).length;
  }),
];

export const CLAIMS = Object.freeze([...CLAIM_LIST, ...ANATOMY_CLAIM_LIST].map((c) => Object.freeze({
  scope: "screen", pageTypes: c.scope === "lineage" ? ["all"] : [...ROW_PAGE_TYPES], valueKind: "single", group: null, unit: null, ...c,
})));

// One claim on one screen record: { eligible, value }. A screen that cannot show the fact has no
// value for it (never false).
export function screenClaim(claim, record) {
  const out = claim.screen(record);
  return out && out.eligible ? { eligible: true, value: out.value } : { eligible: false, value: null };
}

const bucketKey = (v) => JSON.stringify(v);

// A lineage's value from its eligible screens' values. majority: the bucket that more than half of
// them hold, else `mixed`. every: true when every value is true, else false. Null with no values.
export function lineageValue(values, aggregate = "majority") {
  if (!values.length) return null;
  if (aggregate === "every") return values.every((v) => v === true);
  const counts = new Map();
  for (const v of values) counts.set(bucketKey(v), (counts.get(bucketKey(v)) ?? 0) + 1);
  for (const [key, n] of counts) if (n > values.length / 2) return JSON.parse(key);
  return "mixed";
}

// Bucket order: false before true, smaller numbers first, `mixed` last.
function compareBuckets(a, b) {
  const rank = (v) => (v === "mixed" ? 3 : typeof v === "boolean" ? 0 : typeof v === "number" ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === "boolean" || typeof a === "number") return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

// Counts of one row over its lineage entries. `top` is the bucket the most lineages hold (never
// `mixed`, which is not a shared value); a tie goes to the smaller number, or false before true.
function tally(entries) {
  const valued = entries.filter((e) => e.value !== null);
  const groups = new Map();
  for (const e of valued) {
    const key = bucketKey(e.value);
    if (!groups.has(key)) groups.set(key, { bucket: e.value, lineages: 0, productSystems: 0, kits: 0 });
    const g = groups.get(key);
    g.lineages++;
    if (e.kind === "product-system") g.productSystems++; else g.kits++;
  }
  const distribution = [...groups.values()].sort((a, b) => b.lineages - a.lineages || compareBuckets(a.bucket, b.bucket));
  const top = distribution.find((d) => d.bucket !== "mixed") ?? null;
  return { measured: valued.length, agree: top ? top.lineages : 0, agreeProductSystems: top ? top.productSystems : 0, agreeKits: top ? top.kits : 0, top: top ? top.bucket : null, distribution };
}

// Counts of a set row: each lineage holds a list of values. `measured` is the lineages with a list;
// the distribution has one entry per value with the lineages that hold it, so its counts do not add
// up to `measured`; `top` is the value the most lineages hold (a tie goes to the smaller).
function tallySet(entries) {
  const valued = entries.filter((e) => Array.isArray(e.value));
  const groups = new Map();
  for (const e of valued) for (const v of e.value) {
    const key = bucketKey(v);
    if (!groups.has(key)) groups.set(key, { bucket: v, lineages: 0, productSystems: 0, kits: 0 });
    const g = groups.get(key);
    g.lineages++;
    if (e.kind === "product-system") g.productSystems++; else g.kits++;
  }
  const distribution = [...groups.values()].sort((a, b) => b.lineages - a.lineages || compareBuckets(a.bucket, b.bucket));
  const top = distribution[0] ?? null;
  return { measured: valued.length, agree: top ? top.lineages : 0, agreeProductSystems: top ? top.productSystems : 0, agreeKits: top ? top.kits : 0, top: top ? top.bucket : null, distribution };
}

// thin: under 3 lineages measured; candidate: at least 3 agree, at least 2/3 of those measured, and
// at least 2 of the agreeing ones are product systems; otherwise split.
export function rowStatus({ measured, agree, agreeProductSystems }) {
  if (measured < 3) return "thin";
  return agree >= 3 && 3 * agree >= 2 * measured && agreeProductSystems >= 2 ? "candidate" : "split";
}

const byManifestOrder = (manifest, records) => {
  const map = new Map();
  for (const r of records) {
    if (!manifest.screens.some((s) => s.id === r.screen)) throw new Error(`record ${r.screen}: not a screen of this run's manifest.json; remove it or measure with the manifest that lists it`);
    if (map.has(r.screen)) throw new Error(`record ${r.screen}: two records for one screen`);
    map.set(r.screen, r);
  }
  return map;
};

function lineageEntries(claim, pageType, manifest, records, withFragments) {
  const entries = [];
  for (const lineage of manifest.lineages) {
    const screens = manifest.screens.filter((s) => s.lineage === lineage.id && records.has(s.id) && (s.tier === "screen" || withFragments) && (pageType === "all" || s.pageType === pageType));
    if (!screens.length) continue;
    const raw = [];
    for (const s of screens) { const c = screenClaim(claim, records.get(s.id)); if (c.eligible) raw.push({ screen: s.id, value: c.value }); }
    const value = claim.scope === "lineage" ? claim.combine(raw.map((x) => x.value), screens.length) : lineageValue(raw.map((x) => x.value), claim.aggregate);
    entries.push({ lineage: lineage.id, kind: lineage.kind, context: lineage.context ?? "console", value: value ?? null, eligible: raw.length, raw });
  }
  return entries;
}

// The rows: every claim on each page type it applies to (lineage-scope claims on `all` only), in
// claim order, then dashboard, list, form, detail, all. records: an array of screen records. A set
// row (`valueKind: "set"`) has no status, supportsRule, or withFragments.
export function consensusRows(manifest, records) {
  const byId = records instanceof Map ? records : byManifestOrder(manifest, records);
  const rows = [];
  for (const claim of CLAIMS) {
    for (const pageType of ROW_PAGE_TYPES.filter((p) => claim.pageTypes.includes(p))) {
      const lineages = lineageEntries(claim, pageType, manifest, byId, false);
      const set = claim.valueKind === "set";
      const t = set ? tallySet(lineages) : tally(lineages);
      const adapt = claim.transfer === "adapt";
      const withFragments = claim.fragments && !set ? (({ measured, agree, agreeProductSystems, agreeKits, top, distribution }) => ({ measured, agree, agreeProductSystems, agreeKits, top, distribution }))(tally(lineageEntries(claim, pageType, manifest, byId, true))) : null;
      rows.push({
        claim: claim.id, pageType, viewport: claim.viewport, transfer: claim.transfer, valueKind: claim.valueKind, group: claim.group, unit: claim.unit, rule: claim.rule, card: [...claim.card],
        measured: t.measured, agree: t.agree, agreeProductSystems: t.agreeProductSystems, agreeKits: t.agreeKits, top: t.top,
        supportsRule: !set && claim.rule && t.top !== null ? t.top === claim.expect : null,
        status: adapt || set ? null : rowStatus(t),
        distribution: t.distribution, lineages, withFragments,
      });
    }
  }
  return rows;
}

const statusCounts = (rows) => ({
  listed: rows.length, measured: rows.filter((r) => r.status === "measured").length,
  failed: rows.filter((r) => r.status === "failed").length, skipped: rows.filter((r) => r.status === "skipped").length,
});

export function consensusDocument(manifest, run, records) {
  return { consensusVersion: CONSENSUS_VERSION, run: run.run, screens: statusCounts(run.screens ?? []), rows: consensusRows(manifest, records) };
}

// --- Markdown -------------------------------------------------------------------------------------

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const bucketText = (b) => (typeof b === "number" ? String(b) : String(b));
const kindsText = (d) => [d.productSystems ? plural(d.productSystems, "product system", "product systems") : null, d.kits ? plural(d.kits, "kit", "kits") : null].filter(Boolean).join(", ");
const distributionText = (distribution) => (distribution.length ? distribution.map((d) => `${bucketText(d.bucket)} ${d.lineages} (${kindsText(d)})`).join(" · ") : "none");
const shortDistribution = (distribution) => (distribution.length ? distribution.map((d) => `${bucketText(d.bucket)} ${d.lineages}`).join(" · ") : "none");
const cell = (v) => String(v).replace(/\|/gu, "\\|");
const viewportText = (v) => (v === "both" ? "1440 and 390" : String(v));
const statusText = (row) => (row.status === "candidate" && row.supportsRule === false ? "candidate, against the clause" : row.status);
const pageTypeText = (row, claim) => (row.pageType === "all" && claim.scope !== "lineage" ? "all (context)" : row.pageType);
const claimOf = (id) => CLAIMS.find((c) => c.id === id);

// The review cards of research/reviews/batch-01.md and what a run can say about each. A count is
// context for whoever answers a card; it answers none.
export const CARDS = Object.freeze([
  { card: 1, question: "one height for controls that sit together", fromRun: "yes, as counts on desktop console screens", claims: ["controls.shareHeight", "controls.rowShareHeight"] },
  { card: 2, question: "default text field height on desktop", fromRun: "yes, as a distribution of field and button heights; the card's options do not list every height seen here", claims: ["field.height", "button.height"] },
  { card: 3, question: "44px is a touch rule", fromRun: "half: buttons under 44px at 1440 are counted; whether a system enlarges controls for touch is not, because 390 is a width and no coarse pointer is emulated", claims: ["controls.pointerUnder44", "controls.narrowAtLeast44"] },
  { card: 4, question: "`brand` and `primary`", fromRun: "no: it asks about our own role names", claims: [] },
  { card: 5, question: "body text size", fromRun: "yes for console screens, as distributions of field text size and of the size most characters are set in; nothing about reading or marketing pages", claims: ["field.textSize", "text.bodySize"] },
  { card: 6, question: "colour change under reduced motion", fromRun: "no: that needs reduced-motion emulation, a further load per screen; only whether reduced-motion rules exist is counted", claims: ["motion.reducedMotionRules"] },
  { card: 7, question: "no input fields inside cards", fromRun: "yes, as counts on form screens; a page's one wide content surface also reads as a panel (`wide`)", claims: ["fields.inPanel"] },
  { card: 8, question: "one corner radius for controls that sit together", fromRun: "yes, as counts", claims: ["controls.shareRadius"] },
  { card: 9, question: "button hover on desktop", fromRun: "no: it needs a pointer over the button, and a count of `:hover` rules does not answer it", claims: [] },
  { card: 10, question: "what is wrong with our settings screen", fromRun: "no", claims: [] },
]);

// Known limits of a run: WO-09's risks 1 to 9, then WO-12's risks 4 to 6 (the anatomy probe).
const LIMITS = [
  "Sites change. A run is a dated snapshot; its raw numbers are kept so a later run can be compared, and an old run is never edited.",
  "Demos are not products. They carry demo chrome (switchers, theme widgets, notice banners), placeholder titles, and invented data. The control probe leaves navigation, page-level headers and footers, and fixed widgets out; the design, structure, and fault probes measure everything.",
  "Lineages are only partly independent. Web systems for desktop consoles share conventions and influences; agreement among them says what such systems do, not what suits a consumer or a mobile product. Kits are flagged and cannot carry a row.",
  "The sample is small. With three or four lineages on a page type, two thirds is often all of them, and one changed page can flip a row.",
  "The control probe is new. Its field box and panel tests are heuristics checked on five systems at one width: a date-range field with two inputs reads as two bare inputs, and a page's single wide surface reads as a panel.",
  "390 is a width, not a phone: no touch, no coarse pointer, no mobile user agent. A dialog that opens by itself is measured as it stands, or the viewport is dropped when it covers half of it or more.",
  "Probe limits. Shadow roots, iframes, and inner scroll containers are not entered; text boxes depend on the fonts each site serves and on the measuring machine; the structure probe finds no sections on some pages, so `primary.onePerSection` may be thin.",
  "Page type is the study's own label, and some screens are mixed (a table with an open detail panel).",
  "No scroll pass. Content a page renders only after scrolling is not measured.",
  "The anatomy probe is new and its tests are heuristics. A label is found through `for`, wrapping, or `aria-labelledby` only. A button's inset is the declared one, so a fixed-width button without padding reads 0. A field with two inputs reads as two fields. Icons are `svg`, `img`, and `role=\"img\"` elements, so icon fonts are not seen. Headings are `h1` to `h6` and `role=\"heading\"`, so a system that sets its titles in plain elements has no heading value.",
  "An outline drawn on a pseudo-element or a covering child gives a field's or a button's box, height, and radius, and a panel's border, but not a field's drawing style or a button's border width: those are read from the box's own style, so such a field reads as `none` or `fill`.",
  "The spacing sample resolves a border in favour of the 4px grid: a 15px padding inside a 1px border counts as 16. That is the study's assumption, so a system that really uses 15px shows as 16.",
];

// Component anatomy (WO-12): the groups in table order, and how a value prints.
const ANATOMY_GROUPS = Object.freeze([["buttons", "Buttons"], ["fields", "Fields"], ["panels", "Panels"], ["tables", "Tables"], ["navigation", "Navigation"], ["type", "Type"], ["spacing", "Spacing"], ["motion", "Motion"]]);
const PILL_CLAIMS = new Set(["button.radius", "field.radius", "panel.radius", "radius.values"]);
const anatomyValueText = (claim, v) => (v === "mixed" ? "mixed" : PILL_CLAIMS.has(claim.id) && v === 999 ? "pill" : typeof v === "number" && claim.unit ? `${v}${claim.unit}` : String(v));
// "16px on 3 of 5 (2 product systems, 1 kit) · 22px on 1 of 5 (1 product system)", largest first.
const anatomyDistributionText = (claim, distribution, measured) => (distribution.length ? distribution.map((d) => `${anatomyValueText(claim, d.bucket)} on ${d.lineages} of ${measured} (${kindsText(d)})`).join(" · ") : "none");
const anatomyLineageText = (claim, l) => `${l.lineage} ${Array.isArray(l.value) ? l.value.map((v) => anatomyValueText(claim, v)).join(", ") : anatomyValueText(claim, l.value)}`;

function anatomySection(doc) {
  const lines = ["## Component anatomy", ""];
  lines.push("What the buttons, fields, panels, tables, navigation, type, spacing, and motion of these screens measure, one lineage one vote. A value is what most of a lineage's eligible screens show; `mixed` is a lineage whose screens disagree. A row marked \"set\" lists every value a lineage uses, so its counts can exceed the lineages measured. A dimension stays a project's choice; these rows gate nothing.", "");
  for (const [group, title] of ANATOMY_GROUPS) {
    const rows = doc.rows.filter((r) => r.group === group && (r.pageType === "all" || r.measured > 0));
    if (!rows.length) continue;
    lines.push(`### ${title}`, "");
    lines.push("| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |", "|---|---|---|---|---|---|---|");
    for (const r of rows) {
      const claim = claimOf(r.claim);
      const name = `\`${r.claim}\`${r.valueKind === "set" ? " (set)" : ""}`;
      const fragments = (group === "buttons" || group === "fields") && r.withFragments ? anatomyDistributionText(claim, r.withFragments.distribution, r.withFragments.measured) : "—";
      const per = r.lineages.filter((l) => l.value !== null).map((l) => anatomyLineageText(claim, l)).join(" · ") || "none";
      lines.push(`| ${name} | ${pageTypeText(r, claim)} | ${r.measured} | ${cell(anatomyDistributionText(claim, r.distribution, r.measured))} | ${cell(fragments)} | ${cell(per)} | ${r.transfer === "adapt" ? "—" : r.status} |`);
    }
    lines.push("");
  }
  return lines;
}

export function renderConsensusMarkdown(doc, manifest, run) {
  const lines = [];
  const kinds = (kind) => manifest.lineages.filter((l) => l.kind === kind).map((l) => l.id);
  const measuredLineages = new Set(manifest.screens.filter((s) => (run.screens ?? []).some((r) => r.screen === s.id && r.status === "measured")).map((s) => s.lineage));
  lines.push(`# Agreement across design systems — run \`${doc.run}\``, "");
  lines.push(`This run measured ${plural(doc.screens.measured, "published demo screen", "published demo screens")} of ${plural(measuredLineages.size, "design system", "design systems")} (lineages) with the repository's design, structure, and render-fault probes and the study's control and anatomy probes. One lineage counts once, however many of its screens were measured. A row on one page type is a candidate when at least 3 lineages hold the same value, they are at least two thirds of the lineages measured on that row, and at least 2 of them are product systems (systems a company builds its own products with); kits count but cannot carry a row. Fragments (form compositions without an app shell) are shown beside the numbers and decide nothing. A row is a count of what published demo screens rendered. It is not a review and not design acceptance, and it gates nothing.`, "");
  lines.push("## Run", "");
  lines.push(`- Screens listed ${doc.screens.listed}: measured ${doc.screens.measured}, failed ${doc.screens.failed}, skipped ${doc.screens.skipped}.`);
  for (const status of ["failed", "skipped"]) {
    const list = (run.screens ?? []).filter((r) => r.status === status);
    if (list.length) lines.push(`- ${status === "failed" ? "Failed" : "Skipped"}: ${list.map((r) => `\`${r.screen}\` (${r.reason})`).join(", ")}.`);
  }
  const narrow = (run.screens ?? []).filter((r) => r.status === "measured" && r.narrow);
  if (narrow.length) lines.push(`- Measured at 1440 only (the 390 viewport failed): ${narrow.map((r) => `\`${r.screen}\` (${r.narrow})`).join(", ")}.`);
  // The contexts join the lineage line only when a lineage is not a console.
  const service = manifest.lineages.filter((l) => (l.context ?? "console") === "service").map((l) => l.id);
  const contexts = service.length ? ` Context: ${plural(manifest.lineages.length - service.length, "console lineage", "console lineages")}, ${plural(service.length, "public-service lineage", "public-service lineages")} (${service.map((id) => `\`${id}\``).join(", ")}).` : "";
  lines.push(`- Lineages: ${plural(kinds("product-system").length, "product system", "product systems")} (${kinds("product-system").map((id) => `\`${id}\``).join(", ")}), ${plural(kinds("kit").length, "kit", "kits")} (${kinds("kit").map((id) => `\`${id}\``).join(", ")}); ${measuredLineages.size} with a measured screen.${contexts}`);
  lines.push(`- Viewports ${(run.viewports ?? VIEWPORTS).map(([w, h]) => `${w}×${h}`).join(" and ")}, one page load each, no scroll pass; nothing was clicked, hovered, or typed.`);
  lines.push("");
  const ruleRows = doc.rows.filter((r) => r.rule && r.transfer === "keep");
  const order = (r) => (r.status === "candidate" && r.supportsRule === false ? 0 : 1);
  const sortedRuleRows = ruleRows.map((r, i) => [r, i]).sort((a, b) => order(a[0]) - order(b[0]) || a[1] - b[1]).map(([r]) => r);
  const fragmentsText = (r) => (r.withFragments ? distributionText(r.withFragments.distribution) : "—");
  lines.push("## Claims that map to a catalog rule", "");
  lines.push("Rows whose lineages agree on the opposite of the rule's clause are listed first. An `all` row pools every page type and is context; only page-type rows and the lineage-scope rows can count.", "");
  lines.push("| Claim | Rule | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |", "|---|---|---|---|---|---|---|---|");
  for (const r of sortedRuleRows) lines.push(`| \`${r.claim}\` | \`${r.rule}\` | ${pageTypeText(r, claimOf(r.claim))} | ${viewportText(r.viewport)} | ${r.measured} | ${cell(distributionText(r.distribution))} | ${cell(fragmentsText(r))} | ${statusText(r)} |`);
  lines.push("");
  lines.push("## Consistency claims without a rule", "");
  lines.push("A candidate here is a proposal for the maintainer to read, not a rule.", "");
  lines.push("| Claim | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |", "|---|---|---|---|---|---|---|");
  for (const r of doc.rows.filter((x) => !x.rule && x.transfer === "keep" && x.group === null)) lines.push(`| \`${r.claim}\` | ${pageTypeText(r, claimOf(r.claim))} | ${viewportText(r.viewport)} | ${r.measured} | ${cell(distributionText(r.distribution))} | ${cell(fragmentsText(r))} | ${r.status} |`);
  lines.push("");
  lines.push("## Dimensions", "");
  lines.push("A dimension stays a project's choice. It is reported as a distribution only, with each lineage's per-screen values.", "");
  lines.push("| Claim | Page type | Viewport | Distribution | Per lineage |", "|---|---|---|---|---|");
  const rawText = (v) => (v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k} ${x}`).join(" ") : String(v));
  for (const r of doc.rows.filter((x) => x.transfer === "adapt" && x.group === null)) {
    const per = r.lineages.filter((l) => l.raw.length).map((l) => `${l.lineage} ${l.raw.map((x) => rawText(x.value)).join(", ")}`).join(" · ") || "none";
    lines.push(`| \`${r.claim}\` | ${pageTypeText(r, claimOf(r.claim))} | ${viewportText(r.viewport)} | ${cell(distributionText(r.distribution))} | ${cell(per)} |`);
  }
  lines.push("");
  lines.push(...anatomySection(doc));
  lines.push("## What this says about the open cards of `research/reviews/batch-01.md`", "");
  lines.push("A count is context for whoever answers a card. It answers no card and is not written into the batch file.", "");
  lines.push("| Card | Question | From this run | Counts |", "|---|---|---|---|");
  for (const c of CARDS) {
    const counts = c.claims.map((id) => `\`${id}\`: ${doc.rows.filter((r) => r.claim === id).map((r) => `${r.pageType} ${shortDistribution(r.distribution)}`).join("; ")}`).join("; ") || "—";
    lines.push(`| ${c.card} | ${cell(c.question)} | ${cell(c.fromRun)} | ${cell(counts)} |`);
  }
  lines.push("");
  lines.push("## Limits", "");
  LIMITS.forEach((text, i) => lines.push(`${i + 1}. ${text}`));
  return `${lines.join("\n")}\n`;
}

// --- Negative control ------------------------------------------------------------------------------

function addInto(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (typeof value === "number") target[key] = (target[key] ?? 0) + value;
    else if (value && typeof value === "object") addInto((target[key] ??= {}), value);
  }
  return target;
}

function screenRows(screens, records, faultClasses) {
  return screens.filter((s) => records.has(s.id)).map((s) => {
    const record = records.get(s.id);
    return {
      screen: s.id, lineage: s.lineage,
      viewports: VIEWPORTS.map(([width]) => {
        const entry = (record.viewports ?? []).find((v) => v.viewport === width);
        if (!entry || entry.status !== "measured") return { viewport: width, status: "failed", reason: entry?.reason ?? null };
        return { viewport: width, status: "measured", counts: Object.fromEntries(faultClasses.map((c) => [c, Number(entry.faults?.counts?.[c] ?? 0)])) };
      }),
    };
  });
}

// Per fault class and viewport over full screens: screens measured and with any finding, findings,
// lineages measured and with any, the most on one screen, and the candidate records the probe
// collected for the class (a zero finding count on a class with no candidates says nothing). Then the
// summed distributions, the screens where a probe cap was reached, and one row per screen. Fragments
// are listed apart and are in no rate; a failed 390 viewport is in no 390 denominator.
export function negativeControl(manifest, records, faultClasses) {
  const byId = records instanceof Map ? records : byManifestOrder(manifest, records);
  const full = manifest.screens.filter((s) => s.tier === "screen");
  const fragments = manifest.screens.filter((s) => s.tier === "fragment");
  const at = (width) => full.map((s) => [s, viewportOf(byId.get(s.id), width)]).filter(([, v]) => v);
  const classes = faultClasses.map((cls) => ({
    class: cls,
    viewports: VIEWPORTS.map(([width]) => {
      const list = at(width);
      const n = ([, v]) => Number(v.faults?.counts?.[cls] ?? 0);
      const withAny = list.filter((x) => n(x) > 0);
      return {
        viewport: width, screensMeasured: list.length, screensWithAny: withAny.length, findings: sum(list.map(n)),
        lineagesMeasured: new Set(list.map(([s]) => s.lineage)).size, lineagesWithAny: new Set(withAny.map(([s]) => s.lineage)).size,
        mostOnOneScreen: list.length ? Math.max(0, ...list.map(n)) : 0,
        candidates: CANDIDATE_LIST[cls] ? sum(list.map(([, v]) => v.faults?.candidates?.[CANDIDATE_LIST[cls]] ?? 0)) : null,
      };
    }),
  }));
  const distribution = VIEWPORTS.map(([width]) => {
    const summed = {};
    for (const [, v] of at(width)) addInto(summed, v.faults?.distribution);
    return { viewport: width, ...summed };
  });
  const capped = [];
  for (const s of full) for (const [width] of VIEWPORTS) { const v = viewportOf(byId.get(s.id), width); if (v && Object.keys(v.faults?.capped ?? {}).length) capped.push({ screen: s.id, viewport: width }); }
  return { classes, distribution, capped, screens: screenRows(full, byId, faultClasses), fragments: screenRows(fragments, byId, faultClasses) };
}

export function negativeControlDocument(manifest, run, records) {
  return { consensusVersion: CONSENSUS_VERSION, run: run.run, faultClasses: [...(run.faultClasses ?? [])], ...negativeControl(manifest, records, run.faultClasses ?? []) };
}

export function renderNegativeControlMarkdown(doc) {
  const lines = [];
  const vp = (row, width) => row.viewports.find((v) => v.viewport === width);
  lines.push(`# Render-fault classes on published demo screens — run \`${doc.run}\``, "");
  lines.push("The render-fault probe and its fixed thresholds, run on the full screens of the study at 1440×900 and 390×844 (one load each, no scroll pass). Rates count full screens only; fragments are listed apart, and a screen whose 390 viewport failed is in no 390 denominator. `Candidates` counts the records the probe collected for a class before any threshold: a class with no findings and no candidates was not exercised by these screens.", "");
  lines.push("## Per class", "");
  lines.push("| Class | Screens with any @1440 | Screens with any @390 | Lineages with any @1440 | Lineages with any @390 | Findings @1440 | Findings @390 | Most on one screen @1440 | Most on one screen @390 | Candidates @1440 | Candidates @390 |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const c of doc.classes) {
    const [w, n] = [vp(c, 1440), vp(c, 390)];
    lines.push(`| ${c.class} | ${w.screensWithAny} of ${w.screensMeasured} | ${n.screensWithAny} of ${n.screensMeasured} | ${w.lineagesWithAny} of ${w.lineagesMeasured} | ${n.lineagesWithAny} of ${n.lineagesMeasured} | ${w.findings} | ${n.findings} | ${w.mostOnOneScreen} | ${n.mostOnOneScreen} | ${w.candidates ?? "—"} | ${n.candidates ?? "—"} |`);
  }
  lines.push("", "## Gate candidates", "");
  for (const id of GATE_CANDIDATES) {
    const c = doc.classes.find((x) => x.class === id);
    lines.push(c ? `- ${id}: ${vp(c, 1440).findings} finding(s) at 1440, ${vp(c, 390).findings} at 390.` : `- ${id}: not a class of this run.`);
  }
  lines.push("", "## Candidates under each neighbouring limit", "");
  lines.push("Records under each limit, summed over the full screens (the thresholds themselves are unchanged).", "");
  lines.push("| Row | @1440 | @390 |", "|---|---|---|");
  const paths = [];
  const walk = (node, path) => { for (const [k, v] of Object.entries(node ?? {})) { if (k === "viewport") continue; if (typeof v === "number") paths.push([...path, k]); else walk(v, [...path, k]); } };
  walk(doc.distribution[0], []);
  for (const p of doc.distribution.slice(1)) walk(p, []);
  const seen = new Set();
  for (const p of paths) {
    const key = p.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const value = (width) => p.reduce((v, k) => v?.[k], doc.distribution.find((d) => d.viewport === width)) ?? 0;
    lines.push(`| ${p.slice(0, -1).join(" ")} < ${p[p.length - 1]} | ${value(1440)} | ${value(390)} |`);
  }
  if (!paths.length) lines.push("| none | — | — |");
  lines.push("", "## Probe caps", "");
  lines.push(...(doc.capped.length ? doc.capped.map((c) => `- \`${c.screen}\` @${c.viewport}: a probe cap was reached, so its counts are lower bounds.`) : ["None."]));
  const table = (rows) => {
    const out = [`| Screen | Lineage | ${doc.faultClasses.join(" | ")} |`, `|---|---|${doc.faultClasses.map(() => "---").join("|")}|`];
    for (const r of rows) {
      const cellFor = (c) => VIEWPORTS.map(([width]) => { const v = vp(r, width); return v.status === "measured" ? v.counts[c] : "—"; }).join(" / ");
      out.push(`| \`${r.screen}\` | ${r.lineage} | ${doc.faultClasses.map(cellFor).join(" | ")} |`);
    }
    if (!rows.length) out.push(`| none | — | ${doc.faultClasses.map(() => "—").join(" | ")} |`);
    return out;
  };
  lines.push("", "## Per screen", "", "Findings at 1440 / 390; `—` is a viewport that failed.", "");
  lines.push(...table(doc.screens));
  lines.push("", "## Fragments", "", "Measured and listed; in no rate above.", "");
  lines.push(...table(doc.fragments));
  lines.push("", "These screens were built by the teams that maintain the design systems. A class that fires on many of them measures something those teams accepted. Whether a definition or a threshold should change is a later decision; this run changes none.");
  return `${lines.join("\n")}\n`;
}

// The four generated files of a run, as text: a pure function of the manifest snapshot, run.json,
// and the records (in any order).
export function generateReports(manifest, run, records) {
  const byId = byManifestOrder(manifest, records);
  const consensus = consensusDocument(manifest, run, byId);
  const negative = negativeControlDocument(manifest, run, byId);
  const json = (value) => `${JSON.stringify(value, null, 1)}\n`;
  return {
    "consensus.json": json(consensus),
    "CONSENSUS.md": renderConsensusMarkdown(consensus, manifest, run),
    "negative-control.json": json(negative),
    "NEGATIVE-CONTROL.md": renderNegativeControlMarkdown(negative),
  };
}

// --- Ids and the manifest --------------------------------------------------------------------------

// A copy of `value` without the properties `screen`, `lineage`, and `url` whose value is a screen id,
// a lineage id, or a screen URL of this manifest. Any other value stays, so a wrong one fails the
// allow-list walk.
export function stripIds(value, manifest) {
  const known = {
    screen: new Set((manifest.screens ?? []).map((s) => s.id)),
    lineage: new Set((manifest.lineages ?? []).map((l) => l.id)),
    url: new Set((manifest.screens ?? []).map((s) => s.url)),
  };
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== "object") return v;
    const out = {};
    for (const [k, x] of Object.entries(v)) if (!(Object.hasOwn(known, k) && typeof x === "string" && known[k].has(x))) out[k] = walk(x);
    return out;
  };
  return walk(value);
}

const isDate = (v) => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const isUrl = (v, protocols) => { try { return protocols.includes(new URL(v).protocol); } catch { return false; } };

// Errors in a manifest (research/consensus/screens.json), each naming the field and what to do;
// [] when it is valid.
export function validateManifest(manifest, file = "research/consensus/screens.json") {
  const errors = [];
  const err = (path, text) => errors.push(`${file}: ${path} ${text}`);
  if (!manifest || typeof manifest !== "object") return [`${file}: not a JSON object; restore it from git`];
  if (manifest.manifestVersion !== 1) err("manifestVersion", "must be 1");
  if (!isDate(manifest.checkedAt)) err("checkedAt", "must be a date (YYYY-MM-DD)");
  if (JSON.stringify(manifest.viewports) !== JSON.stringify(VIEWPORTS)) err("viewports", `must be ${JSON.stringify(VIEWPORTS)}: the claims read 1440 and 390`);
  const lineages = new Map();
  if (!Array.isArray(manifest.lineages) || !manifest.lineages.length) err("lineages", "must be a non-empty array");
  for (const [i, l] of (manifest.lineages ?? []).entries()) {
    const at = `lineages[${i}]${l && typeof l.id === "string" ? ` (${l.id})` : ""}`;
    if (!l || typeof l !== "object") { err(at, "must be an object"); continue; }
    if (typeof l.id !== "string" || !SAFE_ID.test(l.id)) err(`${at}.id`, "must match ^[a-z0-9]+(-[a-z0-9]+)*$");
    else if (lineages.has(l.id)) err(`${at}.id`, "is used twice; give each lineage its own id");
    else lineages.set(l.id, l);
    if (typeof l.name !== "string" || !l.name.trim()) err(`${at}.name`, "must be a non-empty string");
    if (!KINDS.includes(l.kind)) err(`${at}.kind`, `must be one of ${KINDS.join(", ")}`);
    if (l.context !== undefined && !CONTEXTS.includes(l.context)) err(`${at}.context`, `must be one of ${CONTEXTS.join(", ")}, or left out for console`);
    if (typeof l.host !== "string" || !/^[a-z0-9.-]+$/u.test(l.host)) err(`${at}.host`, "must be a host name such as www.example.org");
    if (!ACCESS.includes(l.access)) err(`${at}.access`, `must be one of ${ACCESS.join(", ")}`);
    if (typeof l.repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(l.repository)) err(`${at}.repository`, "must be owner/name of the public repository");
    if (typeof l.licence !== "string" || !l.licence) err(`${at}.licence`, "must name the licence");
    if (!l.robots || !ROBOTS.includes(l.robots.verdict) || !(l.robots.checkedAt === null || isDate(l.robots.checkedAt))) err(`${at}.robots`, `must be { checkedAt: date or null, verdict: ${ROBOTS.join(" | ")} }`);
    const t = l.terms;
    if (!t || typeof t !== "object") err(`${at}.terms`, "must be { url, checkedAt, automatedAccess, note }");
    else {
      if (!(t.url === null || isUrl(t.url, ["https:"]))) err(`${at}.terms.url`, "must be an https URL or null");
      if (!AUTOMATED_ACCESS.includes(t.automatedAccess)) err(`${at}.terms.automatedAccess`, `must be one of ${AUTOMATED_ACCESS.join(", ")}`);
      if (!(t.checkedAt === null || isDate(t.checkedAt))) err(`${at}.terms.checkedAt`, "must be a date or null");
      if (t.automatedAccess !== "unchecked" && t.checkedAt === null) err(`${at}.terms.checkedAt`, "must be the date of the check when automatedAccess is not unchecked");
      if (typeof t.note !== "string") err(`${at}.terms.note`, "must be a string (may be empty)");
      if (t.automatedAccess === "conditional" && !t.note?.trim()) err(`${at}.terms.note`, "must say which condition this study meets when automatedAccess is conditional");
    }
    if (l.access === "self-hosted") {
      if (typeof l.basePath !== "string" || !/^\/(?:[^/]+\/)*$/u.test(l.basePath)) err(`${at}.basePath`, "must be the path prefix of the listed URLs, starting and ending with / (for example /examples/react/)");
      if (l.selfHosted !== undefined) {
        const s = l.selfHosted;
        if (!s || typeof s.repository !== "string" || typeof s.commit !== "string" || !/^[0-9a-f]{7,40}$/u.test(s.commit) || typeof s.licence !== "string" || !isDate(s.builtAt)) err(`${at}.selfHosted`, "must be { repository, commit (hex), licence, builtAt (date) }");
      }
    } else if (l.basePath !== undefined || l.selfHosted !== undefined) err(at, "carries basePath or selfHosted, which only a self-hosted lineage has");
  }
  const ids = new Set();
  if (!Array.isArray(manifest.screens) || !manifest.screens.length) err("screens", "must be a non-empty array");
  for (const [i, s] of (manifest.screens ?? []).entries()) {
    const at = `screens[${i}]${s && typeof s.id === "string" ? ` (${s.id})` : ""}`;
    if (!s || typeof s !== "object") { err(at, "must be an object"); continue; }
    if (typeof s.id !== "string" || !SAFE_ID.test(s.id)) err(`${at}.id`, "must match ^[a-z0-9]+(-[a-z0-9]+)*$");
    else if (ids.has(s.id) || lineages.has(s.id)) err(`${at}.id`, "is used twice (screen and lineage ids share one namespace); rename it");
    else ids.add(s.id);
    const lineage = lineages.get(s.lineage);
    if (!lineage) err(`${at}.lineage`, "must be the id of a listed lineage");
    if (!PAGE_TYPES.includes(s.pageType)) err(`${at}.pageType`, `must be one of ${PAGE_TYPES.join(", ")}`);
    if (!TIERS.includes(s.tier)) err(`${at}.tier`, `must be one of ${TIERS.join(", ")}`);
    if (!isUrl(s.url, ["https:"])) err(`${at}.url`, "must be an https URL");
    else if (lineage) {
      const u = new URL(s.url);
      if (u.host !== lineage.host) err(`${at}.url`, `must be on the lineage's host ${lineage.host}`);
      if (lineage.access === "self-hosted" && typeof lineage.basePath === "string" && !u.pathname.startsWith(lineage.basePath)) err(`${at}.url`, `must start with the lineage's basePath ${lineage.basePath}`);
    }
    const e = s.expect;
    if (!e || typeof e !== "object" || !Object.keys(e).length) err(`${at}.expect`, `must be an object of floors (${EXPECT_KEYS.join(", ")})`);
    else for (const [k, v] of Object.entries(e)) {
      if (!EXPECT_KEYS.includes(k)) err(`${at}.expect.${k}`, `is not a floor; use ${EXPECT_KEYS.join(", ")}`);
      else if (!Number.isInteger(v) || v < 0) err(`${at}.expect.${k}`, "must be a whole number of at least 0");
    }
  }
  return errors;
}
