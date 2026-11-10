#!/usr/bin/env node
// S1 fifth-screen drift metric, as pre-registered in research/design-judgment/drift/PROTOCOL.md.
// The functions are pure. The CLI only reads files:
//
//   node scripts/s1-drift-metric.mjs <run-dir>…
//
// A run folder is <out>/<arm>/run-<n> written by scripts/run-s1-drift.mjs. The CLI recomputes the
// metric from measurements/<viewport>/<screen>.json, prints one JSON object per run, then one table
// per arm. Counts are measurements against screen 1, not a design judgment: fewer distinct values
// is not better design.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { colorDistance, screenValues } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
export const NEAR_DISTANCE = 24; // same constant as the drift report (compare-screens.mjs)
export const MIN_VALID_RUNS = 3;
export const VIEWPORTS = Object.freeze([
  Object.freeze({ id: '1440', width: 1440, height: 900, primary: true }),
  Object.freeze({ id: '390', width: 390, height: 844, primary: false }),
]);
const COLOR_AXES = ['accent', 'ink', 'canvas'];
const SET_AXES = ['radii', 'fonts', 'typeSizes', 'controlHeights'];
const round2 = n => (n === null || n === undefined ? null : Math.round(n * 100) / 100);
const sortValues = list => [...list].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

// screens: the ordered per-screen probe summaries of ONE viewport (analyze-observations.summarize
// output), either bare or as { id, summary }. Screen 1 is the baseline, not the majority.
export function driftMetric(screens, { nearDistance = NEAR_DISTANCE, viewport = null } = {}) {
  if (!Array.isArray(screens) || screens.length < 2) throw new Error('driftMetric: pass the ordered per-screen summaries of one viewport (the protocol uses five screens)');
  const rows = screens.map((entry, index) => {
    const wrapped = Boolean(entry && typeof entry === 'object' && 'summary' in entry);
    return { id: wrapped && entry.id ? String(entry.id) : `screen-${index + 1}`, values: screenValues((wrapped ? entry.summary : entry) || {}) };
  });
  const [first, ...rest] = rows;
  const baselineIncomplete = [];
  const notes = [];
  const baseline = { screen: first.id };
  const detail = {};
  const changes = {};

  // Colour roles: screens 2..n whose value is missing or farther than nearDistance from screen 1's.
  // If screen 1 has no value for a role, the first screen that has one becomes that role's baseline.
  for (const axis of COLOR_AXES) {
    let from = first;
    if (!first.values[axis]) {
      baselineIncomplete.push(axis);
      from = rows.find(row => row.values[axis]) || null;
      notes.push(from
        ? `Screen 1 (${first.id}) has no ${axis}; the ${axis} baseline is taken from ${from.id}, the first screen that has one.`
        : `No screen has an ${axis}; ${axis}Changes is 0.`);
    }
    const base = from ? from.values[axis] : null;
    baseline[axis] = base;
    baseline[`${axis}From`] = from ? from.id : null;
    detail[axis] = rest.map(row => {
      const value = row.values[axis];
      if (!base) return { screen: row.id, value, distance: null, status: 'no-baseline', changed: false };
      if (!value) return { screen: row.id, value: null, distance: null, status: 'missing', changed: true };
      const distance = colorDistance(value, base);
      const changed = distance === null || distance > nearDistance;
      return { screen: row.id, value, distance: round2(distance), status: value === base ? 'same' : changed ? 'different' : 'near', changed };
    });
    changes[axis] = detail[axis].filter(entry => entry.changed).length;
  }

  // Spacing base: screens 2..n whose base differs from screen 1's (null on both sides is no change).
  baseline.spacingBase = first.values.spacingBase;
  detail.spacingBase = rest.map(row => ({ screen: row.id, value: row.values.spacingBase, changed: row.values.spacingBase !== first.values.spacingBase }));
  const spacingBaseChanges = detail.spacingBase.filter(entry => entry.changed).length;

  // Sets: distinct values on screens 2..n that are absent from screen 1.
  const added = {};
  for (const axis of SET_AXES) {
    baseline[axis] = sortValues(new Set(first.values[axis]));
    const known = new Set(first.values[axis]);
    const fresh = new Set();
    for (const row of rest) for (const value of row.values[axis]) if (!known.has(value)) fresh.add(value);
    added[axis] = sortValues(fresh);
  }
  detail.newRadii = added.radii;
  detail.newFonts = added.fonts;
  detail.newTypeSizes = added.typeSizes;
  detail.newControlHeights = added.controlHeights;

  const distinctOf = axis => new Set(rows.flatMap(row => (axis === 'accent' ? (row.values.accent ? [row.values.accent] : []) : row.values[axis]))).size;
  const result = {
    viewport, nearDistance, screens: rows.map(row => row.id), baseline, baselineIncomplete, notes,
    accentChanges: changes.accent, inkChanges: changes.ink, canvasChanges: changes.canvas, spacingBaseChanges,
    newRadii: added.radii.length, newFonts: added.fonts.length,
    primary: 0,
    secondary: { newTypeSizes: added.typeSizes.length, newControlHeights: added.controlHeights.length },
    distinct: { accent: distinctOf('accent'), typeSizes: distinctOf('typeSizes'), radii: distinctOf('radii'), controlHeights: distinctOf('controlHeights'), fonts: distinctOf('fonts') },
    detail,
  };
  // Roles that should not change between screens of one product.
  result.primary = result.accentChanges + result.inkChanges + result.canvasChanges + result.spacingBaseChanges + result.newRadii + result.newFonts;
  return result;
}

const median = sorted => (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);

// runs: [{ run, valid, primary, reasons?, invalidKind? }]. Median, min, max and range of `primary`
// over valid runs. Invalid runs are listed with their kind: `agent` (a session failed, timed out or
// broke the functional floor; never replaced), `infrastructure` (replaceable under the top-up rule),
// or `not-run`.
export function summarizeArm(runs = []) {
  const valid = runs.filter(run => run && run.valid === true && Number.isFinite(run.primary));
  const invalid = runs.filter(run => !valid.includes(run)).map(run => ({
    run: run?.run ?? null,
    kind: run?.invalidKind ?? null,
    reasons: run?.reasons?.length ? [...run.reasons] : [run?.valid === true ? 'no primary endpoint' : 'invalid'],
  }));
  const values = valid.map(run => run.primary).sort((a, b) => a - b);
  const min = values.length ? values[0] : null;
  const max = values.length ? values[values.length - 1] : null;
  const count = kind => invalid.filter(item => item.kind === kind).length;
  return {
    validRuns: values.length, sufficient: values.length >= MIN_VALID_RUNS,
    median: values.length ? median(values) : null, min, max, range: values.length ? max - min : null,
    runs: valid.map(run => ({ run: run.run ?? null, primary: run.primary })), invalid,
    invalidAgent: count('agent'), invalidInfrastructure: count('infrastructure'), notRun: count('not-run'),
  };
}

// A run's failures are { kind: 'agent' | 'infrastructure', reason }. Any agent failure makes the
// run an agent outcome, which the top-up rule never replaces.
export function classifyFailures(failures = []) {
  if (!failures.length) return null;
  return failures.some(failure => failure.kind === 'agent') ? 'agent' : 'infrastructure';
}

// The pre-registered decision rule: X separates from Y iff median(X) < median(Y) and
// median(Y) − median(X) > max(range(X), range(Y)). A summary with fewer than three valid runs
// (sufficient === false) separates from nothing.
export function separates(x, y) {
  if (!x || !y || x.sufficient === false || y.sufficient === false) return false;
  if (![x.median, y.median, x.range, y.range].every(Number.isFinite)) return false;
  return x.median < y.median && y.median - x.median > Math.max(x.range, y.range);
}

export function defaultScreenOrder(root = repo) {
  const { screens } = readJson(join(root, 'research/design-judgment/drift/screens.json'));
  return [...screens].sort((a, b) => a.order - b.order).map(screen => screen.id);
}

// Read one run folder: run.json (validity, reasons, screen order) and the per-viewport measurements.
export function loadRun(runDir, { screenOrder = null } = {}) {
  const dir = resolve(runDir);
  const runFile = join(dir, 'run.json');
  const run = existsSync(runFile) ? readJson(runFile) : null;
  const order = run?.screens?.map(screen => (typeof screen === 'string' ? screen : screen.id)) ?? screenOrder ?? defaultScreenOrder();
  const reasons = run ? [...(run.reasons ?? [])] : ['run.json is missing: the run was not performed or did not finish'];
  const viewports = {};
  for (const viewport of VIEWPORTS) {
    const files = order.map(id => join(dir, 'measurements', viewport.id, `${id}.json`));
    const missing = order.filter((id, i) => !existsSync(files[i]));
    if (missing.length) {
      viewports[viewport.id] = null;
      if (run && viewport.primary) reasons.push(`measurements/${viewport.id} is missing ${missing.join(', ')}`);
      continue;
    }
    viewports[viewport.id] = driftMetric(order.map((id, i) => ({ id, summary: readJson(files[i]).summary })), { viewport: viewport.id });
  }
  const arm = run?.arm ?? basename(dirname(dir));
  const runIndex = run?.runIndex ?? (Number(basename(dir).replace(/^run-/u, '')) || null);
  const primaryViewport = VIEWPORTS.find(viewport => viewport.primary).id;
  const primary = viewports[primaryViewport]?.primary ?? null;
  const valid = Boolean(run && run.valid === true && primary !== null && reasons.length === 0);
  // A started run without run.json means the harness ended without a record: infrastructure.
  const invalidKind = valid ? null
    : run ? (run.invalidKind ?? (run.valid === true ? 'infrastructure' : 'agent'))
      : existsSync(join(dir, 'sessions')) ? 'infrastructure' : 'not-run';
  const isolation = run?.isolation?.mode ?? null;
  const remeasured = run?.remeasured ?? 0;
  return { run: `${arm}/run-${runIndex}`, arm, runIndex, valid, invalidKind, isolation, remeasured, reasons, primaryViewport, primary, viewports };
}

const cell = value => (value === null || value === undefined ? '–' : String(value));

export function renderArmTable(arm, entries, { viewport = '1440' } = {}) {
  const summary = summarizeArm(entries.map(entry => ({ ...entry, primary: entry.viewports?.[viewport]?.primary ?? null })));
  const rows = entries.map(entry => {
    const m = entry.viewports?.[viewport];
    return `| ${entry.run} | ${entry.valid ? 'valid' : `invalid (${entry.invalidKind ?? 'unclassified'})`} | ${cell(entry.isolation)} | ${entry.remeasured ?? 0} | ${cell(m?.primary)} | ${cell(m?.accentChanges)} | ${cell(m?.inkChanges)} | ${cell(m?.canvasChanges)} | ${cell(m?.spacingBaseChanges)} | ${cell(m?.newRadii)} | ${cell(m?.newFonts)} | ${cell(m?.secondary.newTypeSizes)} | ${cell(m?.secondary.newControlHeights)} |`;
  });
  const invalid = summary.invalid.map(item => `${item.run} [${item.kind ?? 'unclassified'}] (${item.reasons.join('; ')})`).join(', ') || 'none';
  return [
    `### ${arm} at ${viewport}`,
    '',
    '| run | status | isolation | remeasured | primary | accent | ink | canvas | spacing base | new radii | new fonts | new type sizes (secondary) | new control heights (secondary) |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `Median ${cell(summary.median)}, range ${cell(summary.range)} (${cell(summary.min)}–${cell(summary.max)}) over ${summary.validRuns} valid run(s)${summary.sufficient ? '' : `; fewer than ${MIN_VALID_RUNS} valid runs, so the arm has no summary under the decision rule`}. Invalid: ${summary.invalidAgent} agent, ${summary.invalidInfrastructure} infrastructure, ${summary.notRun} not run: ${invalid}.`,
  ].join('\n');
}

function main(args) {
  if (!args.length || args.includes('--help')) {
    console.log('Usage: node scripts/s1-drift-metric.mjs <run-dir>…\nReads <run-dir>/run.json and <run-dir>/measurements/<viewport>/<screen>.json; prints one JSON object per run and a table per arm. Writes nothing.');
    if (!args.length) process.exitCode = 1;
    return;
  }
  const entries = args.map(dir => {
    if (!existsSync(dir)) throw new Error(`${dir}: no such run folder. Pass <out>/<arm>/run-<n> folders written by scripts/run-s1-drift.mjs.`);
    return loadRun(dir);
  });
  for (const entry of entries) console.log(JSON.stringify(entry));
  const arms = [...new Set(entries.map(entry => entry.arm))];
  for (const arm of arms) {
    const list = entries.filter(entry => entry.arm === arm);
    console.log(`\n${renderArmTable(arm, list)}\n\n${renderArmTable(arm, list, { viewport: '390' })}`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
