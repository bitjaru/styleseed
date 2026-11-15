// What a product's own screens render (WO-11 B1), counted from the same observations the drift report
// reads: for control heights, radii, and type sizes, every value in use with its count, its share of
// the counted elements, the screens that render it, and the screens whose drift row lists it; for the
// spacing base, the base of each screen. Pure: no I/O, no browser, no clock. It counts; it does not say
// which values are right.
//
// Two sets per histogram axis, both ascending: `shared` is the drift report's own baseline for an axis
// without a decision (majoritySet over the per-screen summary values, compare-screens.mjs), so a value
// in it is on at least half of the screens as the drift report counts them; `dominant` holds the values
// on at least 10% of the counted elements, and at least the most frequent one. Control heights are
// those of visible control boxes (`controlBoxVersion` 1, WO-10) and are also counted for fields and
// buttons separately; when any observation lacks `controlBoxVersion` they are the older reading, taken
// from the input element, and the inventory says so (`controlBoxVersion: null`). Screens measured in a
// state (`?state=…`) are left out, as they are from the drift baseline.
import { majority, majoritySet, screenValues } from '../../ss-reference/scripts/compare-screens.mjs';

export const INVENTORY_TOOL = 'styleseed system-inventory';
export const INVENTORY_VERSION = '1';
export const DOMINANT_SHARE = 0.1;
export const INVENTORY_AXES = Object.freeze(['controlHeights', 'radii', 'typeSizes', 'spacingBase']);
export const COUNTED = Object.freeze({ controlHeights: 'controls', radii: 'boxes with a visible edge', typeSizes: 'text elements', spacingBase: 'screens', field: 'fields', button: 'buttons' });

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const share = (n, of) => (of ? Math.round((n / of) * 100) / 100 : 0);
const ascending = list => [...list].sort((a, b) => a - b);

// One screen's histogram over its viewports, as a map from numeric value to count.
function screenHistogram(observations, pick) {
  const out = new Map();
  for (const o of observations) for (const [key, n] of Object.entries(pick(o) || {})) {
    const value = Number(key), count = Number(n);
    if (Number.isFinite(value) && Number.isFinite(count) && count > 0) out.set(value, (out.get(value) || 0) + count);
  }
  return out;
}
// The size part of `size|weight|lineHeight` type keys.
const typeSizes = type => {
  const out = {};
  for (const [key, n] of Object.entries(type || {})) out[key.split('|')[0]] = (out[key.split('|')[0]] || 0) + Number(n);
  return out;
};

// One histogram axis. `reportedLists` holds, per screen, the values its drift row lists (null for the
// per-kind control heights, which the drift report does not compare).
function histogramAxis(perScreen, counted, reportedLists = null) {
  const totals = new Map();
  for (const hist of perScreen) for (const [value, count] of hist) totals.set(value, (totals.get(value) || 0) + count);
  const total = [...totals.values()].reduce((sum, n) => sum + n, 0);
  const values = [...totals].map(([value, count]) => ({
    value, count, share: share(count, total), screens: perScreen.filter(hist => hist.has(value)).length,
    ...(reportedLists ? { reported: reportedLists.filter(list => list.includes(value)).length } : {}),
  })).sort((a, b) => b.count - a.count || a.value - b.value);
  const over = values.filter(v => v.share >= DOMINANT_SHARE);
  const dominant = ascending((over.length ? over : values.slice(0, 1)).map(v => v.value));
  return { counted, total, distinct: values.length, values, ...(reportedLists ? { shared: majoritySet(reportedLists) } : {}), dominant };
}

/**
 * The inventory of a product's own screens.
 * @param {{label: string, state?: string|null, observations: object[], summary: object}[]} screens
 *   plan rows with what observeUrls returned for them (observations and summary); rows with a state are
 *   left out
 * @param {{observedAt: string}} options the date of the measurement (YYYY-MM-DD)
 * @returns {{observedAt: string, viewports: number[][], screens: {label: string}[], axes: object}}
 */
export function systemInventory(screens, { observedAt } = {}) {
  if (!Array.isArray(screens)) throw new Error('systemInventory: pass the measured screens (an array of { label, observations, summary })');
  if (typeof observedAt !== 'string' || !DATE.test(observedAt)) throw new Error('systemInventory: observedAt must be the measurement date as YYYY-MM-DD');
  const rows = screens.filter(s => !s?.state);
  if (!rows.length) throw new Error('systemInventory: no screen at rest to count (every screen is a state variant)');
  rows.forEach((s, i) => {
    if (typeof s.label !== 'string' || !s.label) throw new Error(`systemInventory: screen ${i} has no label`);
    if (!Array.isArray(s.observations) || !s.observations.length) throw new Error(`systemInventory: screen ${s.label} has no observations; pass what observeUrls returned`);
    if (!s.summary || typeof s.summary !== 'object') throw new Error(`systemInventory: screen ${s.label} has no summary; pass what observeUrls returned`);
  });
  const observations = rows.flatMap(s => s.observations);
  const perScreen = pick => rows.map(s => screenHistogram(s.observations, pick));
  const read = axis => rows.map(s => screenValues(s.summary)[axis]);

  const controlBoxVersion = observations.every(o => Number.isInteger(o?.controlBoxVersion)) ? Math.min(...observations.map(o => o.controlBoxVersion)) : null;
  const byKind = observations.every(o => o?.controlHeightsByKind && typeof o.controlHeightsByKind === 'object')
    ? { byKind: Object.fromEntries(['field', 'button'].map(kind => [kind, histogramAxis(perScreen(o => o.controlHeightsByKind[kind]), COUNTED[kind])])) } : {};
  const bases = read('spacingBase');
  const baseCounts = new Map();
  for (const base of bases) baseCounts.set(base, (baseCounts.get(base) || 0) + 1);

  const viewports = [];
  for (const o of observations) {
    const w = o?.viewport?.width, h = o?.viewport?.height;
    if (Number.isInteger(w) && Number.isInteger(h) && !viewports.some(([x, y]) => x === w && y === h)) viewports.push([w, h]);
  }
  return {
    observedAt, viewports, screens: rows.map(s => ({ label: s.label })),
    axes: {
      controlHeights: { ...histogramAxis(perScreen(o => o.controlHeights), COUNTED.controlHeights, read('controlHeights')), controlBoxVersion, ...byKind },
      radii: histogramAxis(perScreen(o => o.radii), COUNTED.radii, read('radii')),
      typeSizes: histogramAxis(perScreen(o => typeSizes(o.type)), COUNTED.typeSizes, read('typeSizes')),
      spacingBase: {
        counted: COUNTED.spacingBase,
        values: [...baseCounts].map(([value, n]) => ({ value, screens: n })).sort((a, b) => b.screens - a.screens || (a.value === null) - (b.value === null) || a.value - b.value),
        majority: majority(bases),
      },
    },
  };
}

// --- INVENTORY.md -------------------------------------------------------------------------------------

const TITLES = { controlHeights: 'Control heights', radii: 'Radii', typeSizes: 'Type sizes' };
const percent = s => `${Math.round(s * 100)}%`;
const pxList = list => (list.length ? `${list.join(', ')}px` : 'none');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function histogramSection(axis, a) {
  const noun = a.counted.charAt(0).toUpperCase() + a.counted.slice(1);
  const out = [`## ${TITLES[axis]}`, ''];
  if (!a.total) return [...out, `No ${a.counted} were counted on these screens.`, ''];
  const kinds = a.byKind ? a.byKind : null;
  const kindCount = (kind, value) => kinds[kind].values.find(v => v.value === value)?.count ?? 0;
  out.push(`${a.total} ${a.counted}, ${plural(a.distinct, 'distinct value', 'distinct values')}.`, '');
  out.push(`| Value | ${noun} | Share | Screens | Drift row lists it on |${kinds ? ' Fields | Buttons |' : ''}`);
  out.push(`|---|---|---|---|---|${kinds ? '---|---|' : ''}`);
  for (const v of a.values) out.push(`| ${v.value}px | ${v.count} | ${percent(v.share)} | ${v.screens} | ${v.reported} |${kinds ? ` ${kindCount('field', v.value)} | ${kindCount('button', v.value)} |` : ''}`);
  out.push('');
  out.push(`- On at least half of the screens, as the drift report counts them: ${pxList(a.shared)}.`);
  out.push(`- On at least ${percent(DOMINANT_SHARE)} of the ${a.counted}, and at least the most frequent value: ${pxList(a.dominant)}.`);
  if (kinds) for (const kind of ['field', 'button']) {
    const k = kinds[kind];
    out.push(`- ${k.counted.charAt(0).toUpperCase() + k.counted.slice(1)}: ${k.total}, ${plural(k.distinct, 'distinct value', 'distinct values')}; on at least ${percent(DOMINANT_SHARE)} of the ${k.counted}: ${pxList(k.dominant)}.`);
  }
  if (axis === 'controlHeights' && a.controlBoxVersion === null) out.push('- These control heights are the older reading, taken from the input element: at least one observation has no `controlBoxVersion`. No control-height proposal is made from them; measure the screens again to read the visible control box.');
  out.push('');
  return out;
}

/** The inventory as INVENTORY.md: one table per axis. */
export function renderInventoryMarkdown(inventory) {
  const { axes } = inventory;
  const sizes = inventory.viewports.map(([w, h]) => `${w}×${h}`);
  const base = axes.spacingBase;
  return [
    `# System inventory — ${plural(inventory.screens.length, 'screen', 'screens')}`,
    '',
    `Measured ${inventory.observedAt}${sizes.length ? ` at ${sizes.join(' and ')}` : ''}. Screens at rest: ${inventory.screens.map(s => s.label).join(', ')}; state variants are not counted.`,
    '',
    'A count of what these screens render. It does not say which values are right.',
    '',
    'Screens: how many screens render the value. Drift row lists it on: how many screens the drift report reads it on (a screen lists a control height or radius that holds at least 3% of its controls or boxes, and a type size that holds at least 2% of its text elements).',
    '',
    ...['controlHeights', 'radii', 'typeSizes'].flatMap(axis => histogramSection(axis, axes[axis])),
    '## Spacing base',
    '',
    '| Base | Screens |',
    '|---|---|',
    ...base.values.map(v => `| ${v.value === null ? 'none found' : `${v.value}px`} | ${v.screens} |`),
    '',
    `- On the most screens, as the drift report reads it: ${base.majority === null ? 'none' : `${base.majority}px`}.`,
    '',
  ].join('\n');
}
