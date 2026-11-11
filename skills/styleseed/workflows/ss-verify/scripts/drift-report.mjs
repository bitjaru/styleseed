#!/usr/bin/env node
// Measure several screens of one project and report where they disagree with each other, with
// the project's registry palette, or with the project's recorded decisions.
//
//   node drift-report.mjs <url>… --out <dir> [--browser <playwright module>] [--project-root <dir>]
//                         [--palette <id>] [--decisions <file.json>] [--states error,empty]
//                         [--labels home,settings] [--gate] [--structure] [--scroll] [--max-elements 5000] [--timeout 45000]
//
// URLs may be http(s) or file:. The probe is the read-only observe-design probe from ss-reference;
// nothing is installed, and no page text, screenshots, or form values are written. The result is a
// measurement table and a one-line verdict, not a score. --structure also runs the structure probe
// on the same page load and adds rows for table row height, list item height, heading sizes in the
// main region, section gap, primaries per section, and transition durations; without it the
// output is unchanged. --scroll scrolls each page's window to the bottom and back inside its one
// load before the probes run (ss-reference measure-reference.mjs, revealByScroll), so content that
// reveals on scroll is measured revealed; drift.json records `scroll: true` and DRIFT.md says so.
// Without it no scroll call is made.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../../ss-reference/scripts/measure-reference.mjs';
import { compareScreens, baselineFromRoles, renderDriftMarkdown } from '../../ss-reference/scripts/compare-screens.mjs';
import { loadProjectRegistry } from '../../ss-resolve/scripts/project-registry.mjs';
import { normalizeDecisions, parseStrictJson } from '../../ss-resolve/scripts/runtime-contract.mjs';

const USAGE = 'usage: drift-report.mjs <url>… --out <dir> [--browser <module>] [--project-root <dir>] [--palette <id>] [--decisions <file.json>] [--states a,b] [--labels a,b] [--gate] [--structure] [--scroll]';
const contextCatalog = () => JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../ss-resolve/references/catalog.json'), 'utf8'));

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, projectRoot: null, palette: null, decisions: null, states: [], labels: [], maxElements: 5000, timeout: 45000, gate: false, structure: false, scroll: false };
  const list = value => String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--project-root') args.projectRoot = argv[++i];
    else if (a === '--decisions') args.decisions = argv[++i];
    else if (a === '--palette') args.palette = argv[++i];
    else if (a === '--states') args.states = list(argv[++i]);
    else if (a === '--labels') args.labels = list(argv[++i]);
    else if (a === '--gate') args.gate = true;
    else if (a === '--structure') args.structure = true;
    else if (a === '--scroll') args.scroll = true;
    else if (a === '--max-elements') args.maxElements = Number(argv[++i]);
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}\n${USAGE}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error(USAGE);
  if (!args.out) throw new Error('--out <dir> is required');
  if (args.decisions !== null && (typeof args.decisions !== 'string' || !args.decisions || args.decisions.startsWith('--'))) throw new Error('--decisions needs a JSON file path (an array of decision entries)');
  for (const u of args.urls) if (!/^(?:https?|file):\/\//.test(u)) throw new Error(`URLs must be http(s) or file: — got ${u}`);
  if (args.labels.length && args.labels.length !== args.urls.length) throw new Error(`--labels needs one label per URL (${args.labels.length} labels for ${args.urls.length} URLs)`);
  return args;
}

export function labelFor(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return basename(u.pathname).replace(/\.[a-z0-9]+$/iu, '') || 'index';
    const path = u.pathname.replace(/\/+$/u, '').replace(/^\//u, '');
    return path ? path.replace(/\//gu, '-') : u.hostname;
  } catch { return url; }
}

export function withState(url, state) {
  const u = new URL(url);
  u.searchParams.set('state', state);
  return u.toString();
}

// One row per URL, plus one per requested state (`?state=<name>`, the convention StyleSeed demo
// projects use to render loading / empty / error variants).
export function planScreens(args) {
  const plan = [];
  args.urls.forEach((url, i) => {
    const label = args.labels[i] || labelFor(url);
    plan.push({ url, label, state: null });
    for (const state of args.states) plan.push({ url: withState(url, state), label: `${label}?state=${state}`, state });
  });
  return plan;
}

// Colour baseline from the project's registry: `.styleseed/palettes/<id>.json`.roles.
export function registryBaseline(projectRoot, paletteId = null) {
  const dir = join(projectRoot, '.styleseed', 'palettes');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const pick = paletteId ? `${paletteId}.json` : files[0];
  if (!pick || !files.includes(pick)) {
    if (paletteId) throw new Error(`no palette ${paletteId} under ${dir}`);
    return null;
  }
  const roles = JSON.parse(readFileSync(join(dir, pick), 'utf8')).roles || {};
  return { roles, file: join('.styleseed', 'palettes', pick) };
}

// The project's decisions ledger: `.styleseed/project.json` `decisions` when --project-root holds a
// registry (a registry that fails to load is an error, never a silent fallback), then the entries of
// --decisions <file.json> appended. The combined ledger is validated as one, so a file entry may be
// an exception `to` a registry decision, and ids and axes cannot clash.
export function loadDecisions({ projectRoot = null, decisions = null } = {}, catalog = contextCatalog()) {
  let fromProject = [];
  if (projectRoot) {
    let registry;
    try { registry = loadProjectRegistry(resolve(projectRoot), { catalog }); }
    catch (e) { throw new Error(`${e.message} (while reading the .styleseed registry under ${resolve(projectRoot)} for its decisions; fix the registry or drop --project-root)`); }
    fromProject = registry?.project.decisions ?? [];
  }
  if (!decisions) return fromProject;
  let raw;
  try { raw = parseStrictJson(readFileSync(resolve(decisions), 'utf8')); }
  catch (e) { throw new Error(`--decisions ${decisions}: ${e.message}`); }
  if (!Array.isArray(raw)) throw new Error(`--decisions ${decisions}: expected a JSON array of decision entries, as in .styleseed/project.json "decisions"`);
  return fromProject.length
    ? normalizeDecisions([...fromProject, ...raw], catalog, `.styleseed/project.json decisions + ${decisions}`)
    : normalizeDecisions(raw, catalog, decisions);
}

// --gate: at-rest drift on accent, ink, canvas, or spacing base is INV-05 territory, and a value
// outside a recorded decision breaks an approval; either exits 3 so CI can block on it. An approved
// exception is neither. Returns null when the gate passes.
export function gateFailure(result) {
  const parts = [];
  if (result.screensWithDrift.length) parts.push(`drift on ${result.screensWithDrift.join(', ')}`);
  const violations = result.decisions?.violations ?? [];
  if (violations.length) parts.push(`decision violations: ${violations.map(v => `${v.id} on ${v.screen} (${v.axis} ${v.values.join(', ')})`).join('; ')}`);
  return parts.length ? `drift gate: FAIL — ${parts.join('; ')}` : null;
}

export async function report(args, log = console.log) {
  const decisions = loadDecisions(args);
  const { chromium, from } = await loadBrowser(args.browser);
  const plan = planScreens(args);
  const measured = await observeUrls(plan.map(p => p.url), { chromium, timeout: args.timeout, maxElements: args.maxElements, structure: args.structure, scroll: args.scroll });
  const screens = plan.map((p, i) => ({ ...p, summary: measured[i].summary }));
  const registry = args.projectRoot ? registryBaseline(resolve(args.projectRoot), args.palette) : null;
  const result = compareScreens(screens, { baseline: registry ? baselineFromRoles(registry.roles) : null, decisions, structure: args.structure });
  const decided = result.baseline.source.match(/; recorded project decisions for .*$/u)?.[0] ?? '';
  const meta = {
    observedAt: new Date().toISOString().slice(0, 10), browser: String(from).replace(/^.*node_modules\//u, ''), states: args.states, ...(args.scroll ? { scroll: true } : {}),
    baselineSource: `${registry ? `registry roles from ${registry.file} for colours, majority across screens for the rest` : 'majority across screens'}${decided}`,
  };
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'drift.json'), `${JSON.stringify({ tool: 'styleseed drift-report', version: '1', ...meta, ...result }, null, 2)}\n`);
  writeFileSync(join(args.out, 'DRIFT.md'), renderDriftMarkdown(result, meta));
  log(`${result.verdict}\n  → ${join(args.out, 'DRIFT.md')}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await report(args);
    const failure = args.gate ? gateFailure(result) : null;
    if (failure) { console.error(failure); process.exit(3); }
  }
  catch (e) { console.error(e.message); process.exit(1); }
}
