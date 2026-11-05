#!/usr/bin/env node
// Measure several screens of one project and report where they disagree with each other or with
// the project's registry palette.
//
//   node drift-report.mjs <url>… --out <dir> [--browser <playwright module>] [--project-root <dir>]
//                         [--palette <id>] [--states error,empty] [--labels home,settings]
//                         [--max-elements 5000] [--timeout 45000]
//
// URLs may be http(s) or file:. The probe is the read-only observe-design probe from ss-reference;
// nothing is installed, and no page text, screenshots, or form values are written. The result is a
// measurement table and a one-line verdict, not a score.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../../ss-reference/scripts/measure-reference.mjs';
import { compareScreens, baselineFromRoles, renderDriftMarkdown } from '../../ss-reference/scripts/compare-screens.mjs';

const USAGE = 'usage: drift-report.mjs <url>… --out <dir> [--browser <module>] [--project-root <dir>] [--palette <id>] [--states a,b] [--labels a,b]';

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, projectRoot: null, palette: null, states: [], labels: [], maxElements: 5000, timeout: 45000 };
  const list = value => String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--project-root') args.projectRoot = argv[++i];
    else if (a === '--palette') args.palette = argv[++i];
    else if (a === '--states') args.states = list(argv[++i]);
    else if (a === '--labels') args.labels = list(argv[++i]);
    else if (a === '--max-elements') args.maxElements = Number(argv[++i]);
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}\n${USAGE}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error(USAGE);
  if (!args.out) throw new Error('--out <dir> is required');
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

export async function report(args, log = console.log) {
  const { chromium, from } = await loadBrowser(args.browser);
  const plan = planScreens(args);
  const measured = await observeUrls(plan.map(p => p.url), { chromium, timeout: args.timeout, maxElements: args.maxElements });
  const screens = plan.map((p, i) => ({ ...p, summary: measured[i].summary }));
  const registry = args.projectRoot ? registryBaseline(resolve(args.projectRoot), args.palette) : null;
  const result = compareScreens(screens, { baseline: registry ? baselineFromRoles(registry.roles) : null });
  const meta = {
    observedAt: new Date().toISOString().slice(0, 10), browser: String(from).replace(/^.*node_modules\//u, ''), states: args.states,
    baselineSource: registry ? `registry roles from ${registry.file} for colours, majority across screens for the rest` : 'majority across screens',
  };
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'drift.json'), `${JSON.stringify({ tool: 'styleseed drift-report', version: '1', ...meta, ...result }, null, 2)}\n`);
  writeFileSync(join(args.out, 'DRIFT.md'), renderDriftMarkdown(result, meta));
  log(`${result.verdict}\n  → ${join(args.out, 'DRIFT.md')}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await report(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
