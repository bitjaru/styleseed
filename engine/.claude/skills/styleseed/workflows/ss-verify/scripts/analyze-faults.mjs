// Decide render faults from the records of the read-only fault probe (observe-faults.mjs). Pure: no
// I/O, no browser, no clock. A finding is a measurement of boxes and computed style against a fixed
// threshold, not a design judgment; nothing here is scored, weighted, or summed into one number.
//
// Which findings fail `drift-report.mjs --faults --gate` is decided by the rule catalog, the way
// styleseed-check.mjs decides it: a finding gates when its class maps to a catalog rule whose
// priority is `blocks` and no approved exception in the project's decisions ledger covers the screen.
// There is no second list of gating classes here.
//
// Thresholds marked (S) come from Stageshow 1.1.1 (MIT licence), rewritten for rendered product
// screens; the rest are ours. Sources and the reasons for each change: ss-verify/references/render-faults.md,
// section "Sources".
//
//   overlapMinWidth 2px, overlapMinHeightShare 0.5 ............. ours
//   spillMin 2px ................................................ ours
//   insetPanel 8px (S, its tight-inset floor) · insetChip 4px .... ours for chips
//   touchMax 4px ................................................ (S) touching, moved from 5px to this engine's 4px half-step
//   nearMin 1px, nearMax 3px .................................... (S) near-tangent and near-aligned band
//   panel size 160×48 (in the probe) ............................ (S)

// text-overlap and text-spill carry no rule: calibration on our own screens found both, so they
// report (ss-verify/references/render-faults.md, "The gate follows the catalog").
export const FAULT_CLASSES = Object.freeze([
  { id: 'amount-wrap', rule: 'DL-23-amounts-never-wrap', summary: 'An element whose whole text is one amount is laid out on two or more lines.' },
  { id: 'text-overlap', rule: null, summary: 'Text of one block is drawn over the text of another.' },
  { id: 'text-spill', rule: null, summary: 'Text runs out of the button, card, or cell that holds it.' },
  { id: 'text-clip', rule: null, summary: 'Text is cut off by its own box with no ellipsis or line clamp to show that it was cut.' },
  { id: 'tight-inset', rule: null, summary: 'Text sits closer to the inner edge of its panel or chip than the floor.' },
  { id: 'text-touch', rule: null, summary: 'Text stands within 4px of a neighbouring surface on its line, and no authored spacing put it there.' },
  { id: 'near-touch', rule: null, summary: 'Two neighbouring surfaces stand 1 to 3px apart, and no authored spacing put them there.' },
  { id: 'near-align', rule: null, summary: 'Two stacked blocks start 1 to 3px apart instead of on one edge.' },
  { id: 'emoji-icon', rule: 'CRAFT-functional-icons', summary: 'An emoji stands where an icon belongs: inside a control, leading a row, or alone in a small tile.' },
  { id: 'icon-mix', rule: 'CRAFT-icon-family', summary: 'One navigation, list, table, or toolbar mixes icons of different construction (viewBox grid, stroke or fill).' },
].map(entry => Object.freeze(entry)));

export const THRESHOLDS = Object.freeze({ overlapMinWidth: 2, overlapMinHeightShare: 0.5, spillMin: 2, insetPanel: 8, insetChip: 4, touchMax: 4, nearMin: 1, nearMax: 3 });

const ORDER = new Map(FAULT_CLASSES.map((c, i) => [c.id, i]));
const INSET_LIMITS = [2, 4, 6, 8, 10, 12];
const NEAR_LIMITS = [1, 2, 3, 4, 5, 6];
const SIDES = ['left', 'right', 'top', 'bottom'];
const baseLabel = label => String(label).replace(/\?state=.*$/u, '');
const under = (values, limits) => Object.fromEntries(limits.map(limit => [String(limit), values.filter(v => v < limit).length]));

// The judged sides of an inset record: all four for a panel (the probe leaves top and bottom null
// when the holder scrolls on y, and any side whose text lies outside the inner edge), left and right
// for a chip. Returns the smallest, or null.
function smallestSide(record) {
  const sides = record.kind === 'panel' ? SIDES : ['left', 'right'];
  let best = null;
  for (const s of sides) {
    const v = record[s];
    if (typeof v !== 'number') continue;
    if (!best || v < best.inset) best = { inset: v, side: s };
  }
  return best;
}

const compareBoxes = (a = [], b = []) => { for (let i = 0; i < 4; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0); return 0; };
const stable = value => JSON.stringify(value ?? null);
export function compareFindings(a, b) {
  return (ORDER.get(a.class) - ORDER.get(b.class)) || ((b.viewport ?? 0) - (a.viewport ?? 0)) || ((a.box?.[1] ?? 0) - (b.box?.[1] ?? 0)) || ((a.box?.[0] ?? 0) - (b.box?.[0] ?? 0))
    || compareBoxes(a.box, b.box) || compareBoxes(a.against, b.against) || (stable(a.measure) < stable(b.measure) ? -1 : stable(a.measure) > stable(b.measure) ? 1 : 0);
}

// One viewport of fault-probe output → findings, the candidate distribution under neighbouring
// limits, the icon signatures, and what the probe's caps dropped.
export function analyzeFaults(observation, { thresholds = THRESHOLDS } = {}) {
  const o = observation || {};
  const t = { ...THRESHOLDS, ...thresholds };
  const viewport = o.viewport?.width ?? null;
  const findings = [];
  const add = (cls, record, measure) => findings.push({ class: cls, viewport, box: record.box, ...(record.against ? { against: record.against } : {}), measure });
  for (const r of o.amounts ?? []) if (r.lines >= 2 && !r.forced) add('amount-wrap', r, { lines: r.lines, size: r.size });
  for (const r of o.overlaps ?? []) if (r.w >= t.overlapMinWidth && r.h >= t.overlapMinHeightShare * r.size) add('text-overlap', r, { w: r.w, h: r.h, size: r.size });
  for (const r of o.spills ?? []) if (r.by >= t.spillMin) add('text-spill', r, { side: r.side, by: r.by });
  for (const r of o.clips ?? []) add('text-clip', r, { axis: r.axis, by: r.by });
  for (const r of o.insets ?? []) {
    const s = smallestSide(r);
    if (s && s.inset < (r.kind === 'panel' ? t.insetPanel : t.insetChip)) add('tight-inset', r, { inset: s.inset, side: s.side, kind: r.kind });
  }
  for (const r of o.touches ?? []) if (!r.authored && r.gap < t.touchMax) add('text-touch', r, { gap: r.gap });
  for (const r of o.gaps ?? []) if (!r.authored && r.gap >= t.nearMin && r.gap <= t.nearMax) add('near-touch', r, { axis: r.axis, gap: r.gap });
  for (const r of o.aligns ?? []) if (r.delta >= t.nearMin && r.delta <= t.nearMax) add('near-align', r, { delta: r.delta });
  for (const r of o.emoji ?? []) add('emoji-icon', r, { context: r.context, size: r.size });
  for (const g of o.icons?.groups ?? []) add('icon-mix', g, { sets: g.sets, n: g.n });
  findings.sort(compareFindings);
  const insetsOf = kind => (o.insets ?? []).filter(r => r.kind === kind).map(smallestSide).filter(Boolean).map(s => s.inset);
  const distribution = {
    'tight-inset': { panel: under(insetsOf('panel'), INSET_LIMITS), chip: under(insetsOf('chip'), INSET_LIMITS) },
    'text-touch': under((o.touches ?? []).filter(r => !r.authored).map(r => r.gap), NEAR_LIMITS),
    'near-touch': under((o.gaps ?? []).filter(r => !r.authored).map(r => r.gap), NEAR_LIMITS),
    'near-align': under((o.aligns ?? []).map(r => r.delta), NEAR_LIMITS),
  };
  return { findings, distribution, icons: { sets: { ...(o.icons?.sets ?? {}) }, unknown: o.icons?.unknown ?? 0 }, capped: { ...(o.capped ?? {}) } };
}

// The rule each class maps to in this catalog (null when the class has none or the id is not in
// `rules`), and whether it gates (the rule's priority is `blocks`).
export function classRules(rules = []) {
  const byId = new Map(rules.map(r => [r.id, r]));
  return FAULT_CLASSES.map(c => {
    const rule = c.rule && byId.has(c.rule) ? byId.get(c.rule) : null;
    return { id: c.id, rule: rule ? rule.id : null, gates: rule ? rule.priority === 'blocks' : false, kind: rule ? rule.kind : null, summary: c.summary };
  });
}

// screens: [{ label, url, state, observations }], each observation carrying `.faults` (the probe
// output for that viewport). decisions: the normalized ledger. An exception whose `rule` is the
// finding's rule, that has no `axis`, and that covers the screen turns the finding `approved`; an
// entry scoped only to artifacts names no screen and is not applied, as in the drift report. Only a
// rule of kind `default` is waived; an invariant never is (the ledger refuses such an exception
// before this runs).
export function faultsReport(screens, { decisions = [], rules = [] } = {}) {
  const classes = classRules(rules);
  const byClass = new Map(classes.map(c => [c.id, c]));
  const exceptions = decisions.filter(d => d && d.kind === 'exception' && d.rule && !d.axis && (!d.scope || Array.isArray(d.scope.screens)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const covering = (rule, label) => exceptions.find(d => d.rule === rule && (!d.scope || d.scope.screens.includes(baseLabel(label))));
  const out = screens.map(screen => {
    const findings = [], distribution = [], icons = [], capped = [];
    for (const observation of screen.observations ?? []) {
      const probe = observation?.faults;
      if (!probe) throw new Error(`faultsReport: ${screen.label} @${observation?.viewport?.width ?? '?'} has no fault-probe output (observation.faults); measure with drift-report.mjs --faults`);
      const result = analyzeFaults(probe);
      const viewport = probe.viewport?.width ?? null;
      for (const f of result.findings) {
        const c = byClass.get(f.class);
        const exception = c.rule && c.kind === 'default' ? covering(c.rule, screen.label) : null;
        findings.push({ ...f, rule: c.rule, gates: c.gates, status: exception ? 'approved' : 'fault', ...(exception ? { exception: exception.id } : {}) });
      }
      distribution.push({ viewport, ...result.distribution });
      icons.push({ viewport, ...result.icons });
      capped.push({ viewport, ...result.capped, ...(probe.truncated && !result.capped.elements ? { elements: 1 } : {}) });
    }
    findings.sort(compareFindings);
    const byWidth = (a, b) => (b.viewport ?? 0) - (a.viewport ?? 0);
    const counts = Object.fromEntries(FAULT_CLASSES.map(c => [c.id, findings.filter(f => f.class === c.id).length]));
    return { label: screen.label, url: screen.url, state: screen.state ?? null, findings, counts, distribution: distribution.sort(byWidth), icons: icons.sort(byWidth), capped: capped.sort(byWidth) };
  });
  const totals = { screens: out.length, classes: {} };
  for (const c of FAULT_CLASSES) {
    const all = out.flatMap(s => s.findings.filter(f => f.class === c.id));
    totals.classes[c.id] = { findings: all.length, gating: all.filter(f => f.gates && f.status === 'fault').length, approved: all.filter(f => f.status === 'approved').length, screens: out.filter(s => s.counts[c.id] > 0).length };
  }
  const report = { classes: classes.map(({ kind: _kind, ...c }) => c), screens: out, totals };
  report.verdict = faultsVerdict(report);
  return report;
}

const lowerBound = screen => (screen.capped ?? []).some(c => Object.keys(c).some(k => k !== 'viewport'));

export function faultsVerdict(report) {
  const screens = report.screens ?? [];
  const all = screens.flatMap(s => s.findings.map(f => ({ ...f, label: s.label })));
  const k = screens.length;
  const gating = all.filter(f => f.gates && f.status === 'fault');
  const reported = all.filter(f => !f.gates && f.status === 'fault');
  const approved = [];
  for (const f of all.filter(x => x.status === 'approved')) { const text = `${f.exception} on ${f.label}`; if (!approved.includes(text)) approved.push(text); }
  const approvedText = approved.length ? ` Approved exceptions used: ${approved.join('; ')}.` : '';
  const capped = screens.filter(lowerBound).map(s => s.label);
  const cappedText = capped.length ? ` Lower bound on ${capped.join(', ')} (a probe cap was reached).` : '';
  if (!all.length) return `No render fault found on ${k} screen${k === 1 ? '' : 's'}.${cappedText}`;
  const byClassText = list => FAULT_CLASSES.filter(c => list.some(f => f.class === c.id)).map(c => {
    const labels = [...new Set(list.filter(f => f.class === c.id).map(f => f.label))];
    return `${c.id} (${labels.join(', ')})`;
  }).join(', ');
  if (!gating.length) return `No gating fault on ${k} screen${k === 1 ? '' : 's'}; ${reported.length} reported finding(s)${reported.length ? `: ${byClassText(reported)}` : ''}.${approvedText}${cappedText}`;
  const m = new Set(gating.map(f => f.label)).size;
  return `${gating.length} gating fault(s) on ${m} of ${k} screen${k === 1 ? '' : 's'}: ${byClassText(gating)}; ${reported.length} reported finding(s).${approvedText}${cappedText}`;
}

// --gate: one line naming each gating finding group (rule, class, screen, viewport, count), or null.
// State variants count like at-rest screens.
export function faultsGateFailure(report) {
  if (!report) return null;
  const groups = new Map();
  for (const s of report.screens ?? []) {
    for (const f of s.findings) {
      if (!f.gates || f.status !== 'fault') continue;
      const key = `${f.rule}: ${f.class} on ${s.label} @${f.viewport}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }
  return groups.size ? `render faults gate: FAIL — ${[...groups].map(([key, n]) => `${key} (${n})`).join('; ')}` : null;
}

const cell = value => String(value).replace(/\|/gu, '\\|');
const boxText = b => `[${(b ?? []).join(', ')}]`;
function measureText(f) {
  const m = f.measure ?? {};
  switch (f.class) {
    case 'amount-wrap': return `${m.lines} lines, font ${m.size}px`;
    case 'text-overlap': return `intersection ${m.w}×${m.h}px, font ${m.size}px`;
    case 'text-spill': return `${m.by}px past the ${m.side} edge`;
    case 'text-clip': return `${m.by}px cut on ${m.axis}`;
    case 'tight-inset': return `${m.inset}px to the ${m.side} edge of a ${m.kind}`;
    case 'text-touch': return `gap ${m.gap}px`;
    case 'near-touch': return `gap ${m.gap}px on ${m.axis}`;
    case 'near-align': return `starts ${m.delta}px apart`;
    case 'emoji-icon': return `${m.context}, font ${m.size}px`;
    case 'icon-mix': return `${m.n} icons: ${Object.entries(m.sets ?? {}).map(([s, n]) => `${s} ${n}`).join(', ')}`;
    default: return '';
  }
}

export function renderFaultsMarkdown(report, meta = {}) {
  const screens = report.screens ?? [];
  const classes = report.classes ?? classRules([]);
  const lines = [];
  lines.push(`# Render faults — ${screens.length} screen${screens.length === 1 ? '' : 's'}${meta.observedAt ? `, ${meta.observedAt}` : ''}`, '');
  lines.push(`Measured by \`drift-report.mjs --faults\`${meta.browser ? ` with ${meta.browser}` : ''} at 1440×900 and 390×844, on the same page loads as the drift report. A finding is a measurement of rendered boxes and computed style against a fixed threshold, not a design judgment and not design acceptance. Boxes are \`[x, y, w, h]\` in document pixels. A class fails \`--gate\` only when its catalog rule has priority \`blocks\`; the others report. See \`ss-verify/references/render-faults.md\`.`, '');
  lines.push(`**Verdict:** ${report.verdict}`, '');
  lines.push('## Findings per class and screen', '');
  lines.push(`| Class | Rule | Gate | ${screens.map(s => cell(s.label)).join(' | ')} |`);
  lines.push(`|---|---|---|${screens.map(() => '---').join('|')}|`);
  for (const c of classes) lines.push(`| ${c.id} | ${c.rule ?? 'none'} | ${c.gates ? 'fails' : 'reports'} | ${screens.map(s => s.counts?.[c.id] ?? 0).join(' | ')} |`);
  lines.push('');
  lines.push('## Findings', '');
  let any = false;
  for (const s of screens) {
    if (!s.findings.length) continue;
    any = true;
    lines.push(`### ${s.label}`, '');
    for (const c of FAULT_CLASSES) {
      const list = s.findings.filter(f => f.class === c.id);
      for (const f of list.slice(0, 20)) {
        const status = f.status === 'approved' ? `approved ${f.exception}` : f.gates ? 'fault, gates' : 'fault, reported';
        lines.push(`- ${f.class} @${f.viewport} ${boxText(f.box)}${f.against ? ` against ${boxText(f.against)}` : ''}: ${measureText(f)} (${status})`);
      }
      if (list.length > 20) lines.push(`- ${c.id}: and ${list.length - 20} more in faults.json`);
    }
    lines.push('');
  }
  if (!any) lines.push('None.', '');
  lines.push('## Icon signatures', '');
  lines.push('`<viewBox grid>|<stroke, fill, or both>` per screen and viewport; `unknown` counts `img` icons of at most 32px, which are not classified.', '');
  lines.push('| Screen | Viewport | Signatures | unknown |', '|---|---|---|---|');
  for (const s of screens) for (const i of s.icons ?? []) lines.push(`| ${cell(s.label)} | ${i.viewport} | ${cell(Object.entries(i.sets ?? {}).map(([sig, n]) => `${sig} ${n}`).join(', ') || 'none')} | ${i.unknown ?? 0} |`);
  lines.push('');
  const capped = screens.filter(lowerBound);
  if (capped.length) {
    lines.push('## Lower bounds', '');
    for (const s of capped) for (const c of s.capped) { const dropped = Object.entries(c).filter(([k]) => k !== 'viewport'); if (dropped.length) lines.push(`- ${s.label} @${c.viewport}: ${dropped.map(([k, n]) => `${k} ${n}`).join(', ')} dropped by the probe caps`); }
    lines.push('');
  }
  return `${lines.join('\n').replace(/\n{3,}/gu, '\n\n').trimEnd()}\n`;
}
