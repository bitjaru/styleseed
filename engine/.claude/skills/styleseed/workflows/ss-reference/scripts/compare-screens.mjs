// Compare measurement summaries of several screens of one project. Pure: no I/O, no browser.
// Every status is a measurement against a baseline, not a design judgment: a `different` accent
// may be an approved exception nobody recorded, and a `none` accent usually means the primary
// action only shows in a state. The report keeps the values so a reviewer can decide. When the
// project's decisions ledger is passed in, a recorded decision becomes the baseline for the screens
// it covers (`violates` instead of `different` / `extra`) and an approved exception reads `excepted`.
// With `structure` (summaries measured with the structure probe), six structure rows are compared
// the same way. A structure value outside the shared set never fails the gate; a recorded decision
// on a structure axis applies to these rows like the others (`violates`, `approved`), and without
// `structure` such a decision is reported once as not measured.
//
// Distance (compareToContract, renderDistanceMarkdown) is a different measurement: one built screen
// against one approved reference contract, fact by fact, in its own table. It never enters the
// drift report, has no aggregate, and is not a score.
import { parseColor, toHex } from './analyze-observations.mjs';
import { primaryStats } from './analyze-structure.mjs';

export const COLOR_AXES = ['accent', 'ink', 'canvas'];
export const SET_AXES = ['spacingScale', 'typeSizes', 'radii', 'fonts', 'controlHeights'];
export const STRUCTURE_AXES = ['tableRowHeights', 'listItemHeights', 'headingSizes', 'sectionGaps', 'primariesPerSection', 'transitionDurations'];
const STRUCTURE_SCALAR_AXES = new Set(['primariesPerSection']);
const AXIS_TITLES = {
  accent: 'accent', ink: 'ink', canvas: 'canvas', spacingBase: 'spacing base', spacingScale: 'spacing scale',
  typeSizes: 'type sizes', radii: 'radii', fonts: 'fonts', controlHeights: 'control heights',
  tableRowHeights: 'table row height', listItemHeights: 'list item height', headingSizes: 'heading sizes (main)',
  sectionGaps: 'section gap', primariesPerSection: 'primaries per section (max)', transitionDurations: 'transition durations (ms)',
};

export function colorDistance(a, b) {
  const x = parseColor(a), y = parseColor(b);
  if (!x || !y) return null;
  return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
}

// The per-screen values the comparison reads from a summary (analyze-observations.summarize).
export function screenValues(summary = {}) {
  const hex = v => (v ? toHex(v) : null);
  return {
    accent: hex(summary.accentDerived), ink: hex(summary.ink), canvas: hex(summary.canvas),
    spacingBase: summary.spacingBase ?? null,
    spacingScale: [...(summary.spacingScale || [])],
    offScale: (summary.offScale || []).map(o => (typeof o === 'number' ? o : o.px)),
    typeSizes: [...new Set((summary.typeStepDetail || []).map(t => t.px))].sort((a, b) => a - b),
    radii: [...(summary.radii || [])],
    fonts: (summary.fonts || []).map(f => f.family),
    controlHeights: [...(summary.controlHeights || [])],
  };
}

// The per-screen structure values (summaries measured with the structure probe), merged over the
// measured viewports: every screen is measured at the same widths, so the unions compare.
export function structureValues(summary = {}) {
  const viewports = summary.structure?.viewports;
  if (!viewports) return null;
  const union = pick => [...new Set(viewports.flatMap(pick))].filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
  const primaries = viewports.map(v => primaryStats(v, summary.accentDerived ?? null).perSectionMax).filter(n => n !== null);
  return {
    tableRowHeights: union(v => v.tables.rowHeights),
    listItemHeights: union(v => v.lists.itemHeights),
    headingSizes: union(v => v.headings.sizes),
    sectionGaps: union(v => v.sectionGaps),
    primariesPerSection: primaries.length ? Math.max(...primaries) : null,
    transitionDurations: [...(summary.motion?.durations || [])],
  };
}

// Registry palette roles (`.styleseed/palettes/<id>.json`.roles) as a colour baseline.
export function baselineFromRoles(roles = {}) {
  const hex = v => (typeof v === 'string' ? toHex(v) : null);
  return { accent: hex(roles.primary), ink: hex(roles.foreground), canvas: hex(roles.background) };
}

function majority(values) {
  const counts = new Map();
  for (const v of values) if (v !== null && v !== undefined) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null, bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return best;
}

// Values present on at least half of the screens, in a stable order.
function majoritySet(lists) {
  const need = Math.ceil(lists.length / 2);
  const counts = new Map();
  for (const list of lists) for (const v of new Set(list)) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts].filter(([, c]) => c >= need).map(([v]) => v)
    .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
}

// The decisions ledger as the drift report reads it. Entries come normalized from ss-resolve
// (`normalizeDecisions`). Only entries with an axis are measurable, and only on screens: an entry
// without scope covers every screen, an entry with `scope.screens` covers those labels (state
// variants by their base label), and an entry scoped only to artifacts names no screen, so it
// shapes bundles but is not applied here.
const baseLabel = label => String(label).replace(/\?state=.*$/u, '');
function readLedger(decisions) {
  const measurable = decisions.filter(d => d && d.axis && Array.isArray(d.values) && (!d.scope || Array.isArray(d.scope.screens)));
  const covers = (d, label) => !d.scope || d.scope.screens.includes(baseLabel(label));
  const decisionFor = (axis, label) => {
    const own = measurable.filter(d => d.kind === 'decision' && d.axis === axis && covers(d, label));
    return own.find(d => d.scope) || own.find(d => !d.scope) || null;
  };
  const exceptionsFor = (axis, label) => measurable.filter(d => d.kind === 'exception' && d.axis === axis && covers(d, label));
  const projectDecision = axis => measurable.find(d => d.kind === 'decision' && d.axis === axis && !d.scope) || null;
  return { measurable, covers, decisionFor, exceptionsFor, projectDecision };
}
const byId = (a, b) => a.localeCompare(b, 'en', { numeric: true });

// Structure rows: the majority across at-rest screens is the baseline, as for the other axes. A
// recorded decision replaces it on the screens it covers: set axes compare against the decided set,
// and `primariesPerSection` holds one number that means "at most". Violations and approved
// exceptions on at-rest screens go into the same lists as the other axes, so the gate sees them.
function compareStructure(rows, screens, { ledger = null, violations = [], excepted = [] } = {}) {
  const values = screens.map(s => structureValues(s.summary));
  const atRest = rows.some(r => !r.state) ? rows.map((r, i) => i).filter(i => !rows[i].state) : rows.map((r, i) => i);
  const axes = {};
  for (const axis of STRUCTURE_AXES) {
    const decided = ledger?.projectDecision(axis) ?? null;
    let b, per;
    if (STRUCTURE_SCALAR_AXES.has(axis)) {
      b = decided ? decided.values[0] : majority(atRest.map(i => values[i]?.[axis] ?? null));
      per = rows.map((r, i) => {
        const v = values[i]?.[axis] ?? null;
        const d = ledger?.decisionFor(axis, r.label) ?? null;
        const status = d ? (v === null ? 'none' : v <= d.values[0] ? 'same' : 'violates') : v === null ? 'none' : b === null ? 'unknown' : v === b ? 'same' : 'different';
        const entry = { label: r.label, value: v, status };
        if (d) entry.decision = d.id;
        const e = ledger && (status === 'different' || status === 'violates') ? ledger.exceptionsFor(axis, r.label).find(x => v <= x.values[0]) : null;
        if (e) Object.assign(entry, { status: 'excepted', exception: e.id });
        if (!r.state && entry.status === 'violates') violations.push({ id: d.id, screen: r.label, axis, values: [v] });
        if (!r.state && e) excepted.push({ id: e.id, screen: r.label, axis, values: [v] });
        return entry;
      });
      axes[axis] = { baseline: b, ...(decided ? { decision: decided.id } : {}), screens: per, deviating: per.filter((p, i) => p.status === 'different' && !rows[i].state).map(p => p.label) };
    } else {
      b = decided ? [...decided.values] : majoritySet(atRest.map(i => values[i]?.[axis] ?? []));
      const known = new Set(b);
      per = rows.map((r, i) => {
        if (!values[i]) return { label: r.label, value: null, extra: [], status: 'none' };
        const d = ledger?.decisionFor(axis, r.label) ?? null;
        const allowed = d ? new Set(d.values) : known;
        const exceptions = ledger ? ledger.exceptionsFor(axis, r.label) : [];
        const extra = [];
        const byException = new Map();
        for (const v of values[i][axis].filter(x => !allowed.has(x))) {
          const e = exceptions.find(x => x.values.includes(v));
          if (e) byException.set(e.id, [...(byException.get(e.id) || []), v]); else extra.push(v);
        }
        const entry = { label: r.label, value: values[i][axis], extra, status: extra.length ? (d ? 'violates' : 'extra') : byException.size ? 'excepted' : 'same' };
        if (d) entry.decision = d.id;
        if (byException.size) Object.assign(entry, { exception: [...byException.keys()].join(', '), excepted: [...byException.values()].flat() });
        if (!r.state && entry.status === 'violates') violations.push({ id: d.id, screen: r.label, axis, values: extra });
        if (!r.state) for (const [id, list] of byException) excepted.push({ id, screen: r.label, axis, values: list });
        return entry;
      });
      axes[axis] = { baseline: b, ...(decided ? { decision: decided.id } : {}), screens: per, deviating: per.filter((p, i) => p.status === 'extra' && !rows[i].state).map(p => p.label) };
    }
  }
  const drifted = new Set(STRUCTURE_AXES.flatMap(a => axes[a].deviating));
  return { axes, screensWithDrift: rows.map(r => r.label).filter(l => drifted.has(l)) };
}

export function compareScreens(screens, { baseline = null, nearDistance = 24, decisions = [], structure = false } = {}) {
  const rows = screens.map(s => ({ label: s.label, url: s.url ?? null, state: s.state ?? null, values: screenValues(s.summary) }));
  // State variants (`?state=error` …) exist to catch accents that only appear in a state. Their
  // text and spacing distributions are not representative, so baselines and drift counts for every
  // axis except the accent come from the at-rest screens whenever there are any.
  const atRest = rows.some(r => !r.state) ? rows.filter(r => !r.state) : rows;
  const counted = (axis, i) => axis === 'accent' || !rows[i].state;
  const values = {};
  for (const axis of COLOR_AXES) values[axis] = (baseline && baseline[axis]) ? toHex(baseline[axis]) : majority((axis === 'accent' ? rows : atRest).map(r => r.values[axis]));
  values.spacingBase = (baseline && baseline.spacingBase) || majority(atRest.map(r => r.values.spacingBase));
  for (const axis of SET_AXES) values[axis] = majoritySet(atRest.map(r => r.values[axis]));
  // A project-wide decision replaces the registry or majority baseline for its axis; a decision
  // scoped to screens replaces it on those screens only (resolved per row below).
  const ledger = decisions.length ? readLedger(decisions) : null;
  const decidedAxes = [];
  if (ledger) for (const axis of [...COLOR_AXES, 'spacingBase', ...SET_AXES, ...(structure ? STRUCTURE_AXES : [])]) {
    const d = ledger.projectDecision(axis);
    if (!d) continue;
    if (!STRUCTURE_AXES.includes(axis)) values[axis] = COLOR_AXES.includes(axis) ? toHex(d.values[0]) : axis === 'spacingBase' ? d.values[0] : [...d.values];
    decidedAxes.push(axis);
  }
  const source = baseline ? 'registry roles for colours, majority across screens for the rest' : 'majority across screens';
  const base = { source: decidedAxes.length ? `${source}; recorded project decisions for ${decidedAxes.map(a => AXIS_TITLES[a]).join(', ')}` : source, values };
  const violations = [];
  const excepted = [];
  const decidedOn = axis => (ledger?.projectDecision(axis) ? { decision: ledger.projectDecision(axis).id } : {});

  const axes = {};
  for (const axis of COLOR_AXES) {
    const b = values[axis];
    const per = rows.map((r, i) => {
      const v = r.values[axis];
      const d = ledger?.decisionFor(axis, r.label) ?? null;
      const target = d ? toHex(d.values[0]) : b;
      const status = !target ? 'unknown' : !v ? 'none' : v === target ? 'same' : colorDistance(v, target) <= nearDistance ? 'near' : d ? 'violates' : 'different';
      const entry = { label: r.label, value: v, status };
      if (d) entry.decision = d.id;
      const e = ledger && (status === 'different' || status === 'violates') ? ledger.exceptionsFor(axis, r.label).find(x => colorDistance(v, x.values[0]) <= nearDistance) : null;
      if (e) Object.assign(entry, { status: 'excepted', exception: e.id });
      if (counted(axis, i) && entry.status === 'violates') violations.push({ id: d.id, screen: r.label, axis, values: [v] });
      if (counted(axis, i) && e) excepted.push({ id: e.id, screen: r.label, axis, values: [v] });
      return entry;
    });
    const counts = axis === 'accent' ? per : per.filter((p, i) => !rows[i].state);
    axes[axis] = { baseline: b, ...decidedOn(axis), screens: per, deviating: counts.filter(p => p.status === 'different').map(p => p.label), missing: per.filter(p => p.status === 'none').map(p => p.label) };
  }
  {
    const b = values.spacingBase;
    const per = rows.map((r, i) => {
      const v = r.values.spacingBase;
      const d = ledger?.decisionFor('spacingBase', r.label) ?? null;
      const target = d ? d.values[0] : b;
      const status = !target ? 'unknown' : !v ? 'none' : v === target ? 'same' : d ? 'violates' : 'different';
      const entry = { label: r.label, value: v, status, offScale: r.values.offScale };
      if (d) entry.decision = d.id;
      const e = ledger && (status === 'different' || status === 'violates') ? ledger.exceptionsFor('spacingBase', r.label).find(x => x.values[0] === v) : null;
      if (e) Object.assign(entry, { status: 'excepted', exception: e.id });
      if (counted('spacingBase', i) && entry.status === 'violates') violations.push({ id: d.id, screen: r.label, axis: 'spacingBase', values: [v] });
      if (counted('spacingBase', i) && e) excepted.push({ id: e.id, screen: r.label, axis: 'spacingBase', values: [v] });
      return entry;
    });
    const counts = per.filter((p, i) => !rows[i].state);
    axes.spacingBase = { baseline: b, ...decidedOn('spacingBase'), screens: per, deviating: counts.filter(p => p.status === 'different').map(p => p.label), missing: per.filter(p => p.status === 'none').map(p => p.label) };
  }
  for (const axis of SET_AXES) {
    const b = values[axis];
    const known = new Set(b);
    const per = rows.map((r, i) => {
      const d = ledger?.decisionFor(axis, r.label) ?? null;
      const allowed = d ? new Set(d.values) : known;
      const exceptions = ledger ? ledger.exceptionsFor(axis, r.label) : [];
      const extra = [];
      const byException = new Map();
      for (const v of r.values[axis].filter(x => !allowed.has(x))) {
        const e = exceptions.find(x => x.values.includes(v));
        if (e) byException.set(e.id, [...(byException.get(e.id) || []), v]); else extra.push(v);
      }
      const status = extra.length ? (d ? 'violates' : 'extra') : byException.size ? 'excepted' : 'same';
      const entry = { label: r.label, value: r.values[axis], extra, status };
      if (d) entry.decision = d.id;
      if (byException.size) Object.assign(entry, { exception: [...byException.keys()].join(', '), excepted: [...byException.values()].flat() });
      if (counted(axis, i) && status === 'violates') violations.push({ id: d.id, screen: r.label, axis, values: extra });
      if (counted(axis, i)) for (const [id, list] of byException) excepted.push({ id, screen: r.label, axis, values: list });
      return entry;
    });
    axes[axis] = { baseline: b, ...decidedOn(axis), screens: per, deviating: per.filter((p, i) => p.status === 'extra' && !rows[i].state).map(p => p.label) };
  }

  const drifted = new Set([...COLOR_AXES.map(a => axes[a].deviating), axes.spacingBase.deviating].flat());
  const screensWithDrift = rows.map(r => r.label).filter(l => drifted.has(l));
  // An at-rest screen without an accent whose state variant has one: the primary action lives in a state.
  const accentOnlyInState = axes.accent.missing.filter(l => rows.some(r => r.state && r.label.startsWith(`${l}?state=`) && r.values.accent));
  const accentMissing = axes.accent.missing.filter(l => !accentOnlyInState.includes(l) && !rows.find(r => r.label === l)?.state);
  const structureReport = structure ? compareStructure(rows, screens, { ledger, violations, excepted }) : null;
  let ledgerReport = null;
  if (ledger) {
    // Entries on a structure axis are measured only with `structure`; without it they are listed
    // once as not measured and neither applied nor violated.
    const unmeasured = d => !structure && STRUCTURE_AXES.includes(d.axis);
    const reaches = d => (d.kind === 'decision'
      ? rows.some(r => ledger.decisionFor(d.axis, r.label) === d)
      : rows.some(r => ledger.covers(d, r.label)));
    const applied = ledger.measurable.filter(d => !unmeasured(d) && reaches(d)).map(d => d.id).sort(byId);
    const notMeasured = ledger.measurable.filter(d => unmeasured(d) && reaches(d)).map(d => d.id).sort(byId);
    const entries = decisions.filter(d => applied.includes(d.id)).map(d => ({
      id: d.id, kind: d.kind, ...(d.to ? { to: d.to } : {}), ...(d.rule ? { rule: d.rule } : {}), axis: d.axis, values: [...d.values], ...(d.scope ? { scope: d.scope } : {}),
    })).sort((a, b) => byId(a.id, b.id));
    ledgerReport = { applied, violations, excepted, entries, ...(notMeasured.length ? { notMeasured: notMeasured.map(id => ({ id, axis: decisions.find(d => d.id === id).axis })) } : {}) };
  }
  const verdict = verdictFor(rows.length, screensWithDrift, axes, { accentOnlyInState, accentMissing, ledger: ledgerReport, structure: structureReport });
  return { screens: rows, baseline: base, axes, screensWithDrift, accentOnlyInState, ...(ledgerReport ? { decisions: ledgerReport } : {}), ...(structureReport ? { structure: structureReport } : {}), verdict };
}

function verdictFor(total, drifted, axes, { accentOnlyInState = [], accentMissing = [], ledger = null, structure = null } = {}) {
  const part = (axis, list) => (list.length ? `${AXIS_TITLES[axis]} (${list.join(', ')})` : null);
  const hard = ['accent', 'ink', 'canvas', 'spacingBase'].map(a => part(a, axes[a].deviating)).filter(Boolean);
  const soft = SET_AXES.filter(a => a !== 'spacingScale').map(a => part(a, axes[a].deviating)).filter(Boolean);
  const lines = [drifted.length
    ? `${drifted.length} of ${total} screens drift from the baseline on ${hard.join('; ')}.`
    : ledger?.violations.length
      ? `No unrecorded drift on accent, ink, canvas, or spacing base across ${total} screens.`
      : `All ${total} screens agree with the baseline on accent, ink, canvas, and spacing base.`];
  if (soft.length) lines.push(`Values outside the shared set: ${soft.join('; ')}.`);
  const structural = structure ? STRUCTURE_AXES.map(a => part(a, structure.axes[a].deviating)).filter(Boolean) : [];
  if (structural.length) lines.push(`Structure outside the shared set: ${structural.join('; ')}.`);
  if (ledger?.violations.length) {
    const count = ledger.violations.reduce((sum, v) => sum + v.values.length, 0);
    lines.push(`${count} value(s) violate recorded decisions: ${ledger.violations.map(v => `${v.id} on ${v.screen} (${v.values.join(', ')})`).join('; ')}.`);
  }
  if (ledger?.excepted.length) {
    const used = new Map();
    for (const e of ledger.excepted) used.set(e.id, [...new Set([...(used.get(e.id) || []), e.screen])]);
    lines.push(`Approved exceptions used: ${[...used].sort(([a], [b]) => byId(a, b)).map(([id, list]) => `${id} on ${list.join(', ')}`).join('; ')}.`);
  }
  if (ledger?.notMeasured?.length) lines.push(`Not measured (pass --structure): ${ledger.notMeasured.map(d => `${d.id} (${AXIS_TITLES[d.axis]})`).join(', ')}.`);
  if (accentOnlyInState.length) lines.push(`On ${accentOnlyInState.join(', ')} the primary action appears only in a state; the accent was read from the state variant.`);
  if (accentMissing.length) lines.push(`No accent was derived on ${accentMissing.join(', ')}; if the primary action appears only in a state, re-measure with --states.`);
  return lines.join(' ');
}

// --- distance: one built screen against one approved reference contract ----------------------------

// The nine token axes, in the order of a contract's tokens (screenValues without offScale).
const TOKEN_AXES = [...COLOR_AXES, 'spacingBase', ...SET_AXES];
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const sortedSet = list => [...new Set(list)].sort((a, b) => (isNum(a) && isNum(b) ? a - b : String(a).localeCompare(String(b))));
const comparable = v => (Array.isArray(v) ? sortedSet(v) : v);
const equalValues = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
const familyKey = f => String(f).trim().toLowerCase();

// Whether a built value satisfies a contract comparator (reference-contract.mjs COMPARE_OPS):
// eq equal (a list as a set) · max build <= value · min build >= value · present build > 0 when the
// value is > 0 · within |build - value| <= tolerance, and for a list every build value within
// tolerance of some reference value.
export function comparatorHolds(compare, reference, built) {
  const { op, tolerance } = compare;
  if (op === 'eq') return equalValues(reference, built);
  if (op === 'present') return !(isNum(reference) && reference > 0) || (isNum(built) && built > 0);
  if (op === 'max') return isNum(built) && built <= reference;
  if (op === 'min') return isNum(built) && built >= reference;
  if (op !== 'within') return false;
  const refs = Array.isArray(reference) ? reference : [reference];
  const builds = Array.isArray(built) ? built : [built];
  return builds.length > 0 && builds.every(isNum) && builds.every(b => refs.some(r => isNum(r) && Math.abs(b - r) <= tolerance + 1e-9));
}

// The values a project already owns per token axis: its palette roles (`.styleseed/palettes/*.json`
// roles), its brand key colour and font families (project.json), and the values of its recorded
// decisions and approved exceptions on that axis. A built value the project owns is not a copy.
export function ownedValues({ roles = null, brand = null, decisions = [] } = {}) {
  const owned = Object.fromEntries(TOKEN_AXES.map(axis => [axis, []]));
  if (roles) for (const [axis, hex] of Object.entries(baselineFromRoles(roles))) if (hex) owned[axis].push(hex);
  if (brand?.keyColor) owned.accent.push(toHex(brand.keyColor));
  if (Array.isArray(brand?.fontFamilies)) owned.fonts.push(...brand.fontFamilies);
  for (const d of decisions) {
    if (!d || !TOKEN_AXES.includes(d.axis) || !Array.isArray(d.values)) continue;
    owned[d.axis].push(...(COLOR_AXES.includes(d.axis) ? d.values.map(v => toHex(v)).filter(Boolean) : d.values));
  }
  return Object.fromEntries(Object.entries(owned).map(([axis, list]) => [axis, sortedSet(list)]));
}

// An avoided token axis: does the built value match the reference, and does the project own it?
// Colours match within nearDistance (colorDistance below it); fonts by family name; the spacing base
// by value; a set axis when the built set is the reference set.
function avoidStatus(axis, reference, built, owned, nearDistance) {
  if (COLOR_AXES.includes(axis)) {
    const matched = Boolean(built) && colorDistance(built, reference) < nearDistance;
    return { matched, owned: matched && owned.some(c => colorDistance(built, c) < nearDistance) };
  }
  if (axis === 'fonts') {
    const shared = (built || []).filter(f => reference.some(r => familyKey(r) === familyKey(f)));
    return { matched: shared.length > 0, owned: shared.length > 0 && shared.every(f => owned.some(o => familyKey(o) === familyKey(f))) };
  }
  if (axis === 'spacingBase') {
    const matched = built !== null && built === reference;
    return { matched, owned: matched && owned.includes(built) };
  }
  const matched = Array.isArray(built) && built.length > 0 && equalValues(reference, built);
  return { matched, owned: matched && built.every(v => owned.includes(v)) };
}

/**
 * One built screen against one approved reference contract. Rows for kept and adapted facts and for
 * avoided token axes; observed facts are not compared, and a fact marked avoid gets no row (only token
 * axes are compared for copying). A kept or adapted token axis is not a distance row either: a kept
 * one becomes a ledger decision (compile-contract.mjs --propose-decisions) that the drift report checks.
 *   keep  · same | different | absent   (absent: the screen has no such fact, or the build's value is a
 *           lower bound that cannot decide; it never gates)
 *   adapt · same (equal) | near (the comparator holds) | different | absent; never gates
 *   avoid · copied (matches the reference and the project does not own it) | clear
 * @param {{facts: object[]|{facts: object[]}, summary: object}} build the built screen's facts (buildFacts) and summary
 * @param {object} evidence normalized, approved evidence.json
 * @param {{ownValues?: object, nearDistance?: number}} [options] ownValues: ownedValues(...) by token axis
 */
export function compareToContract({ facts, summary }, evidence, { ownValues = {}, nearDistance = 24 } = {}) {
  const list = Array.isArray(facts) ? facts : facts?.facts || [];
  const built = new Map(list.map(f => [`${f.id}@${f.viewport}`, f]));
  const rows = [];
  for (const fact of evidence.facts) {
    if (fact.transfer !== 'keep' && fact.transfer !== 'adapt') continue;
    const b = built.get(`${fact.id}@${fact.viewport}`) ?? null;
    const holds = b ? comparatorHolds(fact.compare, fact.value, b.value) : false;
    // A lower-bound build value decides only present and min, and only when they hold: the true
    // value is at least the built one. Everything else against it cannot be told.
    const decidable = b && (b.bound !== 'lower' || (['present', 'min'].includes(fact.compare.op) && holds));
    const status = !decidable ? 'absent'
      : fact.transfer === 'keep' ? (holds ? 'same' : 'different')
        : b.bound !== 'lower' && equalValues(fact.value, b.value) ? 'same' : holds ? 'near' : 'different';
    rows.push({
      id: fact.id, viewport: fact.viewport, transfer: fact.transfer, compare: { ...fact.compare }, ...(fact.unit ? { unit: fact.unit } : {}),
      reference: fact.value, ...(fact.bound ? { referenceBound: 'lower' } : {}), built: b ? b.value : null, ...(b?.bound ? { builtBound: 'lower' } : {}), status,
    });
  }
  const values = screenValues(summary);
  for (const axis of TOKEN_AXES) {
    if (evidence.tokens.transfer[axis] !== 'avoid') continue;
    const reference = evidence.tokens.measured[axis];
    if (reference === null || (Array.isArray(reference) && !reference.length)) continue;
    const { matched, owned } = avoidStatus(axis, reference, values[axis], ownValues[axis] || [], nearDistance);
    rows.push({ id: `tokens.${axis}`, viewport: 'both', transfer: 'avoid', reference, built: values[axis], status: matched && !owned ? 'copied' : 'clear', ...(owned ? { owned: true } : {}) });
  }
  return rows;
}

// One line, two counts that are never added together.
export function distanceVerdict(rows) {
  const differ = rows.filter(r => r.transfer === 'keep' && r.status === 'different').length;
  const copied = rows.filter(r => r.transfer === 'avoid' && r.status === 'copied').length;
  if (!differ && !copied) return 'no keep fact differs and nothing was copied';
  return `${differ} keep ${differ === 1 ? 'fact differs' : 'facts differ'}, ${copied} avoid ${copied === 1 ? 'value' : 'values'} copied`;
}

// --gate: a kept fact that differs or an avoided value that was copied. Null when neither.
export function distanceGateFailure(rows) {
  const differ = rows.filter(r => r.transfer === 'keep' && r.status === 'different').map(r => `${r.id} @${r.viewport}`);
  const copied = rows.filter(r => r.transfer === 'avoid' && r.status === 'copied').map(r => r.id);
  const parts = [differ.length && `keep facts that differ: ${differ.join(', ')}`, copied.length && `avoid values copied: ${copied.join(', ')}`].filter(Boolean);
  return parts.length ? `distance gate: FAIL — ${parts.join('; ')}` : null;
}

const TRANSFER_ORDER = ['keep', 'adapt', 'avoid'];
const COMPARATOR_WORDS = { eq: 'equal', max: 'at most', min: 'at least', present: 'present', within: 'within' };
function distanceCell(value, unit, bound) {
  if (value === null || value === undefined) return 'none';
  const withUnit = v => (isNum(v) && unit ? `${v}${unit}` : String(v));
  const text = Array.isArray(value) ? (value.length ? value.map(withUnit).join(', ') : 'none') : withUnit(value);
  return `${bound ? '≥' : ''}${text}`.replace(/\|/g, '\\|');
}

// The distance rows as one Markdown table, grouped by transfer (keep, adapt, avoid).
export function renderDistanceTable(rows) {
  const sorted = TRANSFER_ORDER.flatMap(t => rows.filter(r => r.transfer === t));
  const comparator = r => (r.compare ? `${COMPARATOR_WORDS[r.compare.op]}${r.compare.op === 'within' ? ` ${r.compare.tolerance}${r.unit ?? ''}` : ''}` : 'not copied');
  return [
    '| Transfer | Fact | Viewport | Comparator | Reference | Built | Status |',
    '|---|---|---|---|---|---|---|',
    ...(sorted.length ? sorted.map(r => `| ${r.transfer} | \`${r.id}\` | ${r.viewport} | ${comparator(r)} | ${distanceCell(r.reference, r.unit, r.referenceBound)} | ${distanceCell(r.built, r.unit, r.builtBound)} | ${r.status}${r.owned ? ' (the project owns it)' : ''} |`) : ['| — | no kept, adapted, or avoided entry | — | — | — | — | — |']),
  ].join('\n');
}

export function renderDistanceMarkdown(rows, meta = {}) {
  const approval = meta.approvedBy ? ` approved by ${meta.approvedBy} on ${meta.approvedOn}` : '';
  return `# Distance to reference:${meta.slug ?? ''} — ${meta.screen ?? ''}

Measured ${meta.observedAt ?? ''} with ${meta.browser ?? 'a caller-supplied browser'} at 1440×900 and 390×844 with the structure probe.${meta.scroll ? ' Each page was scrolled to the bottom and back inside its one load before it was measured, as the reference was.' : ''}
Contract: \`reference:${meta.slug ?? ''}\`${approval}${meta.contractHash ? ` (${meta.contractHash})` : ''}. Screen: ${meta.screen ?? ''}${meta.url ? ` — ${meta.url}` : ''}.

**Verdict:** ${distanceVerdict(rows)}.

${renderDistanceTable(rows)}

## How to read this

Distance is not drift. \`DRIFT.md\` compares screens with each other and with the project baseline;
this table compares one built screen with one approved reference contract, fact by fact. There is no
total and no score: the two counts in the verdict are never added.

- \`keep\` rows read \`same\`, \`different\`, or \`absent\`. \`absent\` means the screen has no such fact
  (no table, so no row height) or its value is a lower bound (\`≥\`, a stylesheet the probe could not
  read) that cannot decide the comparison; it never gates.
- \`adapt\` rows read \`same\` (equal), \`near\` (within the comparator), \`different\`, or \`absent\`.
  The relationship is what was adapted, so these rows never gate.
- \`avoid\` rows read \`copied\` when the screen's value matches the reference's (a colour within a shade,
  the same font family, the same spacing base or set) and the project does not already own it, else
  \`clear\`.
- Observed facts are not compared. A fact marked \`avoid\` gets no row: only token axes are compared for
  copying. A kept token axis is checked through the decisions ledger in \`DRIFT.md\`.

With \`--gate\`, a \`different\` keep row or a \`copied\` avoid row exits 3. No page text or screenshots
are written.
`;
}

export function renderDriftMarkdown(report, meta = {}) {
  const labels = report.screens.map(s => s.label);
  const fmt = v => (v === null || v === undefined ? 'none' : Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : String(v));
  // Scalar cells: `40 (violates D-001)`, `32 (approved D-002)`. Set cells name the values concerned.
  const cell = p => {
    const set = Array.isArray(p.value);
    const notes = [];
    if (p.status === 'extra') notes.push(`+${p.extra.join(', ')}`);
    else if (p.status === 'violates') notes.push(`violates ${p.decision}${set ? `: ${p.extra.join(', ')}` : ''}`);
    else if (!['same', 'none', 'excepted'].includes(p.status)) notes.push(p.status);
    if (p.exception) notes.push(`approved ${p.exception}${set ? `: ${p.excepted.join(', ')}` : ''}`);
    return notes.length ? `${fmt(p.value)} (${notes.join('; ')})` : fmt(p.value);
  };
  const row = axis => `| ${AXIS_TITLES[axis]} | ${fmt(report.axes[axis].baseline)}${report.axes[axis].decision ? ` (decided ${report.axes[axis].decision})` : ''} | ${report.axes[axis].screens.map(cell).join(' | ')} |`;
  const structureRows = report.structure ? `\n${STRUCTURE_AXES.map(axis => `| ${AXIS_TITLES[axis]} | ${fmt(report.structure.axes[axis].baseline)}${report.structure.axes[axis].decision ? ` (decided ${report.structure.axes[axis].decision})` : ''} | ${report.structure.axes[axis].screens.map(cell).join(' | ')} |`).join('\n')}` : '';
  const offScale = report.axes.spacingBase.screens.filter(p => p.offScale?.length).map(p => `- ${p.label}: ${p.offScale.join(', ')}`);
  const screenList = report.screens.map(s => `- ${s.label}${s.url ? ` — ${s.url}` : ''}`);
  const ledger = report.decisions?.applied.length ? report.decisions : null;
  const scopeText = d => (d.scope ? [d.scope.screens && `screens: ${d.scope.screens.join(', ')}`, d.scope.artifacts && `artifacts: ${d.scope.artifacts.join(', ')}`].filter(Boolean).join(' · ') : 'whole project');
  const recorded = ledger ? `

## Recorded decisions

From the project's decisions ledger. A value outside a decision \`violates\` it; a value an approved exception covers is not drift.

${ledger.entries.map(d => `- ${d.id} · ${d.kind === 'exception' ? `exception to ${[d.to, d.rule].filter(Boolean).join(', ')}` : 'decision'} · ${AXIS_TITLES[d.axis]} ${d.kind === 'exception' ? '+' : '='} ${d.values.join(', ')} · ${scopeText(d)}`).join('\n')}` : '';
  return `# Drift report — ${report.screens.length} screen(s)

Measured ${meta.observedAt ?? ''} with ${meta.browser ?? 'a caller-supplied browser'} at 1440×900 and 390×844.${meta.scroll ? ' Each page was scrolled to the bottom and back inside its one load before it was measured.' : ''}
Baseline: ${meta.baselineSource ?? report.baseline.source}.${meta.states?.length ? ` States re-measured: ${meta.states.join(', ')}.` : ''}

**${report.verdict}**

| Axis | Baseline | ${labels.join(' | ')} |
|---|---|${labels.map(() => '---').join('|')}|
${['accent', 'ink', 'canvas', 'spacingBase', 'spacingScale', 'typeSizes', 'radii', 'fonts', 'controlHeights'].map(row).join('\n')}${structureRows}

Statuses: \`same\`, \`near\` (within a shade of the baseline), \`different\`, \`none\` (not derived on that screen), \`+values\` (present here, absent from the shared set)${ledger ? ', `violates D-…` (outside a recorded project decision), `approved D-…` (covered by an approved exception)' : ''}.${report.structure ? ' Structure rows (table row height through transition durations) come from `--structure`; a structure value outside the shared set does not fail `--gate`, one outside a recorded decision does.' : ''}${recorded}

## Off-scale spacing per screen

${offScale.length ? offScale.join('\n') : '- none'}

## Screens

${screenList.join('\n')}

## How to read this

These are measurements of computed styles, not a score. The accent is what filled primary actions
are painted with, then what links are coloured with; a screen whose primary action only appears in
a state (a save bar, a dialog) reads \`none\` at rest, so re-measure it with \`--states\`. A
\`different\` value is a question for the owner of the design system, who may already have approved
it; an approval recorded in the decisions ledger (\`decisions\` in \`.styleseed/project.json\`) reads
\`approved\` on the next run. State variants (\`?state=…\`) count toward the verdict on the accent only; their text and
spacing distributions describe the state, not the screen. No page text, screenshots, or URLs
beyond the ones passed in are written.
`;
}
