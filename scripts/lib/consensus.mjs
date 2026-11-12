// Pattern-consensus study (WO-09 Part A): agreement across design-system lineages on what their
// published demo screens rendered, and the same screens as a negative control for the render-fault
// classes. Pure: no I/O, no clock. Every generated file is a function of the stored records, the
// run's manifest snapshot (runs/<date>/manifest.json), run.json, and the claim list below; nothing
// here reads the rule catalog or the fault class list of the engine, so a later catalog change
// cannot change the bytes of an old run. A row is a count of what published demo screens rendered:
// it is not a review and not design acceptance, and it gates nothing.
import { colorDistance } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";

export const CONSENSUS_VERSION = 1;
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

export const CLAIMS = Object.freeze(CLAIM_LIST.map((c) => Object.freeze({
  scope: "screen", pageTypes: c.scope === "lineage" ? ["all"] : [...ROW_PAGE_TYPES], ...c,
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
    entries.push({ lineage: lineage.id, kind: lineage.kind, value: value ?? null, eligible: raw.length, raw });
  }
  return entries;
}

// The rows: every claim on each page type it applies to (lineage-scope claims on `all` only), in
// claim order, then dashboard, list, form, detail, all. records: an array of screen records.
export function consensusRows(manifest, records) {
  const byId = records instanceof Map ? records : byManifestOrder(manifest, records);
  const rows = [];
  for (const claim of CLAIMS) {
    for (const pageType of ROW_PAGE_TYPES.filter((p) => claim.pageTypes.includes(p))) {
      const lineages = lineageEntries(claim, pageType, manifest, byId, false);
      const t = tally(lineages);
      const adapt = claim.transfer === "adapt";
      const withFragments = claim.fragments ? (({ measured, agree, agreeProductSystems, agreeKits, top, distribution }) => ({ measured, agree, agreeProductSystems, agreeKits, top, distribution }))(tally(lineageEntries(claim, pageType, manifest, byId, true))) : null;
      rows.push({
        claim: claim.id, pageType, viewport: claim.viewport, transfer: claim.transfer, rule: claim.rule, card: [...claim.card],
        measured: t.measured, agree: t.agree, agreeProductSystems: t.agreeProductSystems, agreeKits: t.agreeKits, top: t.top,
        supportsRule: claim.rule && t.top !== null ? t.top === claim.expect : null,
        status: adapt ? null : rowStatus(t),
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

// Known limits of a run, in the order of the work order's risks 1 to 9.
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
];

export function renderConsensusMarkdown(doc, manifest, run) {
  const lines = [];
  const kinds = (kind) => manifest.lineages.filter((l) => l.kind === kind).map((l) => l.id);
  const measuredLineages = new Set(manifest.screens.filter((s) => (run.screens ?? []).some((r) => r.screen === s.id && r.status === "measured")).map((s) => s.lineage));
  lines.push(`# Agreement across design systems — run \`${doc.run}\``, "");
  lines.push(`This run measured ${plural(doc.screens.measured, "published demo screen", "published demo screens")} of ${plural(measuredLineages.size, "design system", "design systems")} (lineages) with the repository's design, structure, and render-fault probes and the study's control probe. One lineage counts once, however many of its screens were measured. A row on one page type is a candidate when at least 3 lineages hold the same value, they are at least two thirds of the lineages measured on that row, and at least 2 of them are product systems (systems a company builds its own products with); kits count but cannot carry a row. Fragments (form compositions without an app shell) are shown beside the numbers and decide nothing. A row is a count of what published demo screens rendered. It is not a review and not design acceptance, and it gates nothing.`, "");
  lines.push("## Run", "");
  lines.push(`- Screens listed ${doc.screens.listed}: measured ${doc.screens.measured}, failed ${doc.screens.failed}, skipped ${doc.screens.skipped}.`);
  for (const status of ["failed", "skipped"]) {
    const list = (run.screens ?? []).filter((r) => r.status === status);
    if (list.length) lines.push(`- ${status === "failed" ? "Failed" : "Skipped"}: ${list.map((r) => `\`${r.screen}\` (${r.reason})`).join(", ")}.`);
  }
  const narrow = (run.screens ?? []).filter((r) => r.status === "measured" && r.narrow);
  if (narrow.length) lines.push(`- Measured at 1440 only (the 390 viewport failed): ${narrow.map((r) => `\`${r.screen}\` (${r.narrow})`).join(", ")}.`);
  lines.push(`- Lineages: ${plural(kinds("product-system").length, "product system", "product systems")} (${kinds("product-system").map((id) => `\`${id}\``).join(", ")}), ${plural(kinds("kit").length, "kit", "kits")} (${kinds("kit").map((id) => `\`${id}\``).join(", ")}); ${measuredLineages.size} with a measured screen.`);
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
  for (const r of doc.rows.filter((x) => !x.rule && x.transfer === "keep")) lines.push(`| \`${r.claim}\` | ${pageTypeText(r, claimOf(r.claim))} | ${viewportText(r.viewport)} | ${r.measured} | ${cell(distributionText(r.distribution))} | ${cell(fragmentsText(r))} | ${r.status} |`);
  lines.push("");
  lines.push("## Dimensions", "");
  lines.push("A dimension stays a project's choice. It is reported as a distribution only, with each lineage's per-screen values.", "");
  lines.push("| Claim | Page type | Viewport | Distribution | Per lineage |", "|---|---|---|---|---|");
  const rawText = (v) => (v && typeof v === "object" ? Object.entries(v).map(([k, x]) => `${k} ${x}`).join(" ") : String(v));
  for (const r of doc.rows.filter((x) => x.transfer === "adapt")) {
    const per = r.lineages.filter((l) => l.raw.length).map((l) => `${l.lineage} ${l.raw.map((x) => rawText(x.value)).join(", ")}`).join(" · ") || "none";
    lines.push(`| \`${r.claim}\` | ${pageTypeText(r, claimOf(r.claim))} | ${viewportText(r.viewport)} | ${cell(distributionText(r.distribution))} | ${cell(per)} |`);
  }
  lines.push("");
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
