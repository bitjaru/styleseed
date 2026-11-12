#!/usr/bin/env node
// Sample declared state changes frame by frame on a held clock and report boxes that move in one
// frame while the rest of the change is animated, or before it starts or after it ends: the mark of a
// property left out of a named `transition-property` list.
//
//   node transition-jumps.mjs <url>… --out <dir> [--browser <playwright module>] [--compare-all]
//                             [--viewport 1440x900] [--timeout 45000]
//
// A page declares its cases: a root [data-styleseed-transition="<id>"] (a safe id, unique on the page)
// holding exactly one [data-styleseed-trigger]. For each case the script clicks the trigger with
// element.click() to go forward and clicks it again to come back; clicking declared triggers is the only
// thing it does to a page, so it is for your own pages and fixtures and never for a reference site.
// The CSS transitions, CSS animations, and Web Animations the change starts are paused and stepped every
// 1000/60 ms (observe-transition.mjs), so the frames are the same on every machine. --compare-all
// samples both directions again with `transition-property: all !important` set inline on every element
// under the root whose transition duration is not zero, and restores it afterwards: a finding of the
// change as built that is absent there was caused by the named property list (`withAll: false`).
//
// One browser context per URL with reducedMotion 'no-preference', and the waits of observeUrls after
// the page loads. Writes transitions.json and TRANSITIONS.md: counts, boxes, deltas, and enums, no page
// text, selectors, property or animation names, or screenshots. It reports and has no --gate. Exit 0;
// 1 on a usage or page error (no declared case, a case without exactly one trigger, an unsafe or
// duplicate id); 2 when any run is inconclusive. Definitions and limits:
// ss-verify/references/render-faults.md, "Transition frame jumps".
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowser } from '../../ss-reference/scripts/measure-reference.mjs';
import { SAFE_ID } from '../../ss-resolve/scripts/runtime-contract.mjs';
import { labelFor } from './drift-report.mjs';
import { declaredCases, sampleTransition } from './observe-transition.mjs';

// Thresholds marked (S) come from Stageshow 1.1.1 (MIT licence), rewritten for a held clock; shiftPx is
// ours. Sources and the reasons: ss-verify/references/render-faults.md, section "Sources".
//
//   jumpPx 2 ......... (S) a step of more than 2px can be a jump
//   calmFactor 3 ..... (S) when it is more than three times the steps beside it
//   calmFloor 0.4 .... (S) a step beside it counts as at least 0.4px
//   shiftPx 0.5 ...... ours: at time 0 and after the end nothing glides, so more than 0.5px was not animated
export const THRESHOLDS = Object.freeze({ jumpPx: 2, calmFactor: 3, calmFloor: 0.4, shiftPx: 0.5 });
export const STEP_MS = 1000 / 60;
export const MAX_ELEMENTS = 400;
export const DIRECTIONS = Object.freeze(['forward', 'back']);
const AXES = ['x', 'y', 'w', 'h'];
const PHASES = ['start', 'mid', 'end'];
const DEDUPE_PX = 0.6;
const USAGE = 'usage: transition-jumps.mjs <url>… --out <dir> [--browser <module>] [--compare-all] [--viewport 1440x900] [--timeout 45000]';
const ATTRIBUTES = 'data-styleseed-transition="<id>" on the root of the state change and data-styleseed-trigger on the one element inside it that the sampler clicks';
const r1 = n => Math.round(n * 10) / 10;

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, compareAll: false, viewport: { width: 1440, height: 900 }, timeout: 45000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--compare-all') args.compareAll = true;
    else if (a === '--viewport') {
      const m = /^(\d{2,5})x(\d{2,5})$/u.exec(String(argv[++i] ?? ''));
      if (!m) throw new Error(`--viewport needs <width>x<height> in CSS pixels, for example 1440x900 or 390x844\n${USAGE}`);
      args.viewport = { width: Number(m[1]), height: Number(m[2]) };
    }
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}\n${USAGE}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error(USAGE);
  if (!args.out || String(args.out).startsWith('--')) throw new Error('--out <dir> is required');
  if (!(args.timeout > 0)) throw new Error('--timeout needs a positive number of milliseconds');
  for (const u of args.urls) if (!/^(?:https?|file):\/\//u.test(u)) throw new Error(`URLs must be http(s) or file: — got ${u}`);
  return args;
}

// The page errors that stop a run (exit 1), from declaredCases() output: each names the page, the
// case, and the attribute to add or fix. Returns [] when every case can be sampled.
export function caseProblems(label, declared) {
  if (!declared.length) return [`${label}: no declared transition case; add ${ATTRIBUTES}`];
  const problems = [];
  const seen = new Set();
  declared.forEach((c, i) => {
    const name = SAFE_ID.test(c.id ?? '') ? `case ${c.id}` : `case #${i + 1}`;
    if (!SAFE_ID.test(c.id ?? '')) problems.push(`${label}: ${name}: data-styleseed-transition must be a safe id (lowercase letters, digits, and hyphens, starting with a letter or digit, at most 64 characters)`);
    else if (seen.has(c.id)) problems.push(`${label}: ${name} is declared more than once; give each data-styleseed-transition a unique id`);
    seen.add(c.id);
    if (c.triggers !== 1) problems.push(`${label}: ${name} holds ${c.triggers} elements with data-styleseed-trigger; mark exactly one element inside the case root (the root itself may be it)`);
  });
  return problems;
}

const compareFindings = (a, b) => (PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase)) || (a.at - b.at) || (a.element - b.element) || (AXES.indexOf(a.axis) - AXES.indexOf(b.axis));

// One run's recorded frames → findings, per element and per axis (x, y, w, h). Pure.
//   start: rest → time 0; a displacement over shiftPx is a `shift`, over jumpPx a `jump`.
//   mid:   consecutive stepped frames; a step d with |d| > jumpPx and |d| > calmFactor × the largest of
//          the steps before and after it and calmFloor is a `jump`. A neighbouring step outside the run
//          counts as 0; when the element is not shown in a neighbouring frame, calm cannot be judged and
//          no finding is made.
//   end:   last stepped frame → settled, as start.
// An element not shown in one of two compared frames is skipped for that comparison; an element whose
// own text changed between rest and settled is skipped; an x or y finding is dropped when an ancestor
// inside the root has one with the same phase, axis, and time and a delta within 0.6px (the outermost
// is reported). `box` is where the element was before the step; `at` is the time of the later frame in
// ms (start: 0; end: the last stepped frame). Instant and inconclusive runs have no findings.
export function analyzeFrames(sample, thresholds = THRESHOLDS) {
  const t = { ...THRESHOLDS, ...thresholds };
  if (!sample || sample.status !== 'sampled' || !sample.frames?.length) return [];
  const { rest = [], frames, settled = [], times = [], parents = [] } = sample;
  const skip = new Set(sample.textChanged ?? []);
  const last = frames.length - 1;
  const diff = (a, b, i, k) => (a?.[i] && b?.[i] ? r1(b[i][k] - a[i][k]) : null);
  const raw = [];
  for (let i = 0; i < parents.length; i++) {
    if (skip.has(i)) continue;
    for (let k = 0; k < AXES.length; k++) {
      const axis = AXES[k];
      const outer = (phase, d, at, box) => { if (d !== null && Math.abs(d) > t.shiftPx) raw.push({ element: i, phase, axis, delta: d, at, size: Math.abs(d) > t.jumpPx ? 'jump' : 'shift', box }); };
      outer('start', diff(rest, frames[0], i, k), times[0] ?? 0, rest[i]);
      const steps = frames.map((f, j) => (j === 0 ? 0 : diff(frames[j - 1], f, i, k)));
      for (let j = 1; j <= last; j++) {
        const d = steps[j];
        if (d === null || !(Math.abs(d) > t.jumpPx)) continue;
        const prev = j > 1 ? steps[j - 1] : 0, next = j < last ? steps[j + 1] : 0;
        if (prev === null || next === null) continue;
        if (Math.abs(d) > t.calmFactor * Math.max(Math.abs(prev), Math.abs(next), t.calmFloor)) raw.push({ element: i, phase: 'mid', axis, delta: d, at: times[j], size: 'jump', box: frames[j - 1][i] });
      }
      outer('end', diff(frames[last], settled, i, k), times[last] ?? 0, frames[last][i]);
    }
  }
  const key = f => `${f.phase}|${f.axis}|${f.at}`;
  const byKey = new Map();
  for (const f of raw) { if (!byKey.has(key(f))) byKey.set(key(f), new Map()); byKey.get(key(f)).set(f.element, f); }
  const kept = raw.filter(f => {
    if (f.axis !== 'x' && f.axis !== 'y') return true;
    const peers = byKey.get(key(f));
    for (let p = parents[f.element]; typeof p === 'number' && p >= 0; p = parents[p]) {
      const a = peers.get(p);
      if (a && r1(Math.abs(a.delta - f.delta)) <= DEDUPE_PX) return false;
    }
    return true;
  });
  return kept.sort(compareFindings);
}

// --compare-all: a finding of the change as built gets withAll true when the same element, phase, and
// axis also has a finding with every property transitioned, else false (the named list caused it).
// `normal` and `forced` are runs with their findings: { status, parents, findings }. When the forced run
// was not sampled, or its elements differ from the built run's, nothing can be matched: withAll is null.
export function compareWithAll(normal, forced) {
  const comparable = normal?.status === 'sampled' && forced?.status === 'sampled' && JSON.stringify(normal.parents ?? []) === JSON.stringify(forced.parents ?? []);
  const keys = new Set(comparable ? (forced.findings ?? []).map(f => `${f.element}|${f.phase}|${f.axis}`) : []);
  return (normal?.findings ?? []).map(f => ({ ...f, withAll: comparable ? keys.has(`${f.element}|${f.phase}|${f.axis}`) : null }));
}

// A sampled run as written: counts and findings, never the frames themselves.
export function runRecord(direction, mode, sample, findings) {
  return {
    direction, mode, status: sample.status, ...(sample.reason ? { reason: sample.reason } : {}),
    transitions: sample.transitions ?? 0, animations: sample.animations ?? 0, duration: sample.duration ?? null,
    frames: sample.times?.length ?? 0, elements: sample.parents?.length ?? 0,
    findings: findings.map(({ element: _element, ...f }) => f),
  };
}

// The four samples of one case (built forward and back; with --compare-all, all forward and back) →
// its runs. `samples` maps `${mode}:${direction}` to a sampleTransition result.
export function caseRuns(samples, { compareAll = false, thresholds = THRESHOLDS } = {}) {
  const runs = [];
  const analyzed = new Map();
  for (const mode of compareAll ? ['built', 'all'] : ['built']) {
    for (const direction of DIRECTIONS) {
      const sample = samples[`${mode}:${direction}`];
      analyzed.set(`${mode}:${direction}`, { ...sample, findings: analyzeFrames(sample, thresholds) });
    }
  }
  for (const mode of compareAll ? ['built', 'all'] : ['built']) {
    for (const direction of DIRECTIONS) {
      const run = analyzed.get(`${mode}:${direction}`);
      const findings = mode === 'built' && compareAll ? compareWithAll(run, analyzed.get(`all:${direction}`)) : run.findings;
      runs.push(runRecord(direction, mode, run, findings));
    }
  }
  return runs;
}

export function transitionsTotals(pages, { compareAll = false } = {}) {
  const runs = pages.flatMap(p => p.cases.flatMap(c => c.runs));
  const built = runs.filter(r => r.mode === 'built').flatMap(r => r.findings);
  return {
    cases: pages.reduce((n, p) => n + p.cases.length, 0),
    sampled: runs.filter(r => r.status === 'sampled').length,
    instant: runs.filter(r => r.status === 'instant').length,
    inconclusive: runs.filter(r => r.status === 'inconclusive').length,
    jumps: built.filter(f => f.size === 'jump').length,
    shifts: built.filter(f => f.size === 'shift').length,
    namedList: compareAll ? built.filter(f => f.withAll === false).length : null,
  };
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export function transitionsVerdict(pages, totals) {
  const runs = totals.sampled + totals.instant + totals.inconclusive;
  const where = `${plural(totals.cases, 'case')} on ${plural(pages.length, 'page')}`;
  const statuses = `${totals.sampled} of ${plural(runs, 'run')} sampled, ${totals.instant} instant, ${totals.inconclusive} inconclusive`;
  const open = pages.flatMap(p => p.cases.flatMap(c => c.runs.filter(r => r.status === 'inconclusive').map(r => `${c.id} ${r.direction}${r.mode === 'all' ? ' (all)' : ''}: ${r.reason}`)));
  const openText = open.length ? ` Inconclusive: ${open.join('; ')}.` : '';
  const found = totals.jumps + totals.shifts;
  const named = totals.namedList === null ? 'not compared with every property transitioned (--compare-all)' : `${totals.namedList} caused by the named property list`;
  if (!found) return `No frame jump in ${where}: ${statuses}.${openText}`;
  return `${plural(found, 'finding')} in ${where} as built (${plural(totals.jumps, 'jump')}, ${plural(totals.shifts, 'shift')}), ${named}; ${statuses}.${openText}`;
}

const cell = value => String(value).replace(/\|/gu, '\\|');
const boxText = b => `[${(b ?? []).join(', ')}]`;
const signed = n => `${n > 0 ? '+' : ''}${n}`;
const withAllText = v => (v === true ? 'also with every property transitioned' : v === false ? 'absent with every property transitioned: the named list caused it' : v === null ? 'not compared' : '');

export function renderTransitionsMarkdown(report, meta = {}) {
  const pages = report.pages ?? [];
  const compareAll = report.totals?.namedList !== null && report.totals?.namedList !== undefined;
  const lines = [];
  lines.push(`# Transition frame jumps — ${plural(report.totals?.cases ?? 0, 'case')}${meta.observedAt ? `, ${meta.observedAt}` : ''}`, '');
  lines.push(`Measured by \`transition-jumps.mjs\`${meta.browser ? ` with ${meta.browser}` : ''} at ${meta.viewport ? `${meta.viewport.width}×${meta.viewport.height}` : 'the default viewport'}: each declared trigger is clicked, the transitions and animations the change starts are held and stepped every 1000/60 ms, and every box under the case root is recorded per frame. A finding is a box that moves in one frame while the rest of the change is animated (mid), or before it starts (start) or after it ends (end); it is a measurement, not a design judgment, and it does not gate. Boxes are \`[x, y, w, h]\` in document pixels where the element was before the step. See \`ss-verify/references/render-faults.md\`, "Transition frame jumps".`, '');
  lines.push(`**Verdict:** ${report.verdict}`, '');
  lines.push('## Runs', '');
  lines.push(`One row per case and direction, as built.${compareAll ? ' The last column counts the findings that are absent when every property is transitioned (the named list caused them); the status of that second run follows when it was not sampled.' : ''}`, '');
  lines.push(`| Page | Case | Direction | Status | Transitions | Animations | Duration ms | Frames | Elements | Findings |${compareAll ? ' Named list |' : ''}`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|${compareAll ? '---|' : ''}`);
  for (const p of pages) for (const c of p.cases) for (const r of c.runs.filter(x => x.mode === 'built')) {
    const jumps = r.findings.filter(f => f.size === 'jump').length, shifts = r.findings.filter(f => f.size === 'shift').length;
    const found = r.findings.length ? [jumps ? plural(jumps, 'jump') : null, shifts ? plural(shifts, 'shift') : null].filter(Boolean).join(', ') : 'none';
    const all = c.runs.find(x => x.mode === 'all' && x.direction === r.direction);
    const namedCell = all ? `${r.findings.filter(f => f.withAll === false).length}${all.status === 'sampled' ? '' : ` (all: ${all.status}${all.reason ? ` ${all.reason}` : ''})`}` : '';
    lines.push(`| ${cell(p.label)} | ${c.id} | ${r.direction} | ${r.status}${r.reason ? ` (${r.reason})` : ''} | ${r.transitions} | ${r.animations} | ${r.duration ?? '—'} | ${r.frames} | ${r.elements} | ${found} |${compareAll ? ` ${namedCell} |` : ''}`);
  }
  lines.push('', '## Findings', '');
  let any = false;
  for (const p of pages) for (const c of p.cases) for (const r of c.runs.filter(x => x.mode === 'built')) {
    if (!r.findings.length) continue;
    any = true;
    lines.push(`### ${p.label} · ${c.id} · ${r.direction}`, '');
    for (const f of r.findings) {
      const note = withAllText(f.withAll);
      lines.push(`- ${f.phase} ${f.size} on ${f.axis}: ${signed(f.delta)}px at ${f.at}ms, box ${boxText(f.box)}${note ? ` (${note})` : ''}`);
    }
    lines.push('');
  }
  if (!any) lines.push('None.', '');
  return `${lines.join('\n').replace(/\n{3,}/gu, '\n\n').trimEnd()}\n`;
}

export async function report(args, log = console.log, { loadBrowserImpl = loadBrowser } = {}) {
  const { chromium, from } = await loadBrowserImpl(args.browser);
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    for (const url of args.urls) {
      const label = labelFor(url);
      const context = await browser.newContext({ viewport: args.viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'load', timeout: args.timeout });
        await page.waitForLoadState('networkidle', { timeout: args.timeout }).catch(() => {});
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(500);
        const declared = await page.evaluate(declaredCases);
        const problems = caseProblems(label, declared);
        if (problems.length) throw new Error(problems.join('\n'));
        const cases = [];
        for (const { id } of declared) {
          const samples = {};
          for (const mode of args.compareAll ? ['built', 'all'] : ['built']) {
            for (const direction of DIRECTIONS) {
              const prior = direction === 'back' ? samples[`${mode}:forward`] : null;
              // A forward run that stopped before clicking (not at rest, capped) left the state as it
              // was: clicking now would go forward, so the back run is not sampled and reads the same.
              samples[`${mode}:${direction}`] = prior && prior.status === 'inconclusive' && !prior.clicked
                ? prior
                : await page.evaluate(sampleTransition, { id, direction, stepMs: STEP_MS, forceAll: mode === 'all', maxElements: MAX_ELEMENTS });
            }
          }
          cases.push({ id, runs: caseRuns(samples, { compareAll: args.compareAll }) });
        }
        pages.push({ url, label, cases });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  const totals = transitionsTotals(pages, { compareAll: args.compareAll });
  const verdict = transitionsVerdict(pages, totals);
  const meta = { observedAt: new Date().toISOString().slice(0, 10), browser: String(from).replace(/^.*node_modules\//u, ''), viewport: args.viewport };
  const result = { pages, totals, verdict };
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'transitions.json'), `${JSON.stringify({ tool: 'styleseed transition-jumps', version: '1', ...meta, stepMs: STEP_MS, thresholds: THRESHOLDS, ...result }, null, 2)}\n`);
  writeFileSync(join(args.out, 'TRANSITIONS.md'), renderTransitionsMarkdown(result, meta));
  log(`${verdict}\n  → ${join(args.out, 'TRANSITIONS.md')}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await report(parseArgs(process.argv.slice(2)));
    if (result.totals.inconclusive) process.exit(2);
  }
  catch (e) { console.error(e.message); process.exit(1); }
}
