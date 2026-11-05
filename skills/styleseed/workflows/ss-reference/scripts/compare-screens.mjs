// Compare measurement summaries of several screens of one project. Pure: no I/O, no browser.
// Every status is a measurement against a baseline, not a design judgment: a `different` accent
// may be an approved exception, and a `none` accent usually means the primary action only shows
// in a state. The report keeps the values so a reviewer can decide.
import { parseColor, toHex } from './analyze-observations.mjs';

export const COLOR_AXES = ['accent', 'ink', 'canvas'];
export const SET_AXES = ['spacingScale', 'typeSizes', 'radii', 'fonts', 'controlHeights'];
const AXIS_TITLES = {
  accent: 'accent', ink: 'ink', canvas: 'canvas', spacingBase: 'spacing base', spacingScale: 'spacing scale',
  typeSizes: 'type sizes', radii: 'radii', fonts: 'fonts', controlHeights: 'control heights',
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

export function compareScreens(screens, { baseline = null, nearDistance = 24 } = {}) {
  const rows = screens.map(s => ({ label: s.label, url: s.url ?? null, state: s.state ?? null, values: screenValues(s.summary) }));
  // State variants (`?state=error` …) exist to catch accents that only appear in a state. Their
  // text and spacing distributions are not representative, so baselines and drift counts for every
  // axis except the accent come from the at-rest screens whenever there are any.
  const atRest = rows.some(r => !r.state) ? rows.filter(r => !r.state) : rows;
  const values = {};
  for (const axis of COLOR_AXES) values[axis] = (baseline && baseline[axis]) ? toHex(baseline[axis]) : majority((axis === 'accent' ? rows : atRest).map(r => r.values[axis]));
  values.spacingBase = (baseline && baseline.spacingBase) || majority(atRest.map(r => r.values.spacingBase));
  for (const axis of SET_AXES) values[axis] = majoritySet(atRest.map(r => r.values[axis]));
  const base = { source: baseline ? 'registry roles for colours, majority across screens for the rest' : 'majority across screens', values };

  const axes = {};
  for (const axis of COLOR_AXES) {
    const b = values[axis];
    const per = rows.map(r => {
      const v = r.values[axis];
      const status = !b ? 'unknown' : !v ? 'none' : v === b ? 'same' : colorDistance(v, b) <= nearDistance ? 'near' : 'different';
      return { label: r.label, value: v, status };
    });
    const counts = axis === 'accent' ? per : per.filter((p, i) => !rows[i].state);
    axes[axis] = { baseline: b, screens: per, deviating: counts.filter(p => p.status === 'different').map(p => p.label), missing: per.filter(p => p.status === 'none').map(p => p.label) };
  }
  {
    const b = values.spacingBase;
    const per = rows.map(r => {
      const v = r.values.spacingBase;
      const status = !b ? 'unknown' : !v ? 'none' : v === b ? 'same' : 'different';
      return { label: r.label, value: v, status, offScale: r.values.offScale };
    });
    const counts = per.filter((p, i) => !rows[i].state);
    axes.spacingBase = { baseline: b, screens: per, deviating: counts.filter(p => p.status === 'different').map(p => p.label), missing: per.filter(p => p.status === 'none').map(p => p.label) };
  }
  for (const axis of SET_AXES) {
    const b = values[axis];
    const known = new Set(b);
    const per = rows.map(r => { const extra = r.values[axis].filter(v => !known.has(v)); return { label: r.label, value: r.values[axis], extra, status: extra.length ? 'extra' : 'same' }; });
    axes[axis] = { baseline: b, screens: per, deviating: per.filter((p, i) => p.extra.length && !rows[i].state).map(p => p.label) };
  }

  const drifted = new Set([...COLOR_AXES.map(a => axes[a].deviating), axes.spacingBase.deviating].flat());
  const screensWithDrift = rows.map(r => r.label).filter(l => drifted.has(l));
  // An at-rest screen without an accent whose state variant has one: the primary action lives in a state.
  const accentOnlyInState = axes.accent.missing.filter(l => rows.some(r => r.state && r.label.startsWith(`${l}?state=`) && r.values.accent));
  const accentMissing = axes.accent.missing.filter(l => !accentOnlyInState.includes(l) && !rows.find(r => r.label === l)?.state);
  const verdict = verdictFor(rows.length, screensWithDrift, axes, { accentOnlyInState, accentMissing });
  return { screens: rows, baseline: base, axes, screensWithDrift, accentOnlyInState, verdict };
}

function verdictFor(total, drifted, axes, { accentOnlyInState = [], accentMissing = [] } = {}) {
  const part = (axis, list) => (list.length ? `${AXIS_TITLES[axis]} (${list.join(', ')})` : null);
  const hard = ['accent', 'ink', 'canvas', 'spacingBase'].map(a => part(a, axes[a].deviating)).filter(Boolean);
  const soft = SET_AXES.filter(a => a !== 'spacingScale').map(a => part(a, axes[a].deviating)).filter(Boolean);
  const lines = [drifted.length
    ? `${drifted.length} of ${total} screens drift from the baseline on ${hard.join('; ')}.`
    : `All ${total} screens agree with the baseline on accent, ink, canvas, and spacing base.`];
  if (soft.length) lines.push(`Values outside the shared set: ${soft.join('; ')}.`);
  if (accentOnlyInState.length) lines.push(`On ${accentOnlyInState.join(', ')} the primary action appears only in a state; the accent was read from the state variant.`);
  if (accentMissing.length) lines.push(`No accent was derived on ${accentMissing.join(', ')}; if the primary action appears only in a state, re-measure with --states.`);
  return lines.join(' ');
}

export function renderDriftMarkdown(report, meta = {}) {
  const labels = report.screens.map(s => s.label);
  const fmt = v => (v === null || v === undefined ? 'none' : Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : String(v));
  const cell = p => (p.status === 'same' || p.status === 'none' ? fmt(p.value) : p.status === 'extra' ? `${fmt(p.value)} (+${p.extra.join(', ')})` : `${fmt(p.value)} (${p.status})`);
  const row = axis => `| ${AXIS_TITLES[axis]} | ${fmt(report.axes[axis].baseline)} | ${report.axes[axis].screens.map(cell).join(' | ')} |`;
  const offScale = report.axes.spacingBase.screens.filter(p => p.offScale?.length).map(p => `- ${p.label}: ${p.offScale.join(', ')}`);
  const screenList = report.screens.map(s => `- ${s.label}${s.url ? ` — ${s.url}` : ''}`);
  return `# Drift report — ${report.screens.length} screen(s)

Measured ${meta.observedAt ?? ''} with ${meta.browser ?? 'a caller-supplied browser'} at 1440×900 and 390×844.
Baseline: ${meta.baselineSource ?? report.baseline.source}.${meta.states?.length ? ` States re-measured: ${meta.states.join(', ')}.` : ''}

**${report.verdict}**

| Axis | Baseline | ${labels.join(' | ')} |
|---|---|${labels.map(() => '---').join('|')}|
${['accent', 'ink', 'canvas', 'spacingBase', 'spacingScale', 'typeSizes', 'radii', 'fonts', 'controlHeights'].map(row).join('\n')}

Statuses: \`same\`, \`near\` (within a shade of the baseline), \`different\`, \`none\` (not derived on that screen), \`+values\` (present here, absent from the shared set).

## Off-scale spacing per screen

${offScale.length ? offScale.join('\n') : '- none'}

## Screens

${screenList.join('\n')}

## How to read this

These are measurements of computed styles, not a score. The accent is what filled primary actions
are painted with, then what links are coloured with; a screen whose primary action only appears in
a state (a save bar, a dialog) reads \`none\` at rest, so re-measure it with \`--states\`. A
\`different\` value is a question for the owner of the design system, who may already have approved
it. State variants (\`?state=…\`) count toward the verdict on the accent only; their text and
spacing distributions describe the state, not the screen. No page text, screenshots, or URLs
beyond the ones passed in are written.
`;
}
