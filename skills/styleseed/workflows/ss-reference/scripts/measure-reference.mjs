#!/usr/bin/env node
// Measure a public reference URL at desktop and narrow viewports and write the measurement
// files a design-decision case starts from (research/cases/README.md).
//
//   node measure-reference.mjs <url> --out <dir> [--browser <playwright module>] [--id <case-id>]
//                              [--designlang] [--max-elements 5000] [--timeout 45000]
//
// The browser comes from --browser, STYLESEED_BROWSER_MODULE, or a `playwright` package the
// current project already has. Nothing is installed. The probe reads computed styles only; no
// screenshots, text, or form values are written. Derived roles name the counts behind them.
import { mkdirSync, writeFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { observeDesign } from './observe-design.mjs';
import { summarize } from './analyze-observations.mjs';

const DESIGNLANG_VERSION = '13.4.0';
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, id: null, designlang: false, maxElements: 5000, timeout: 45000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--designlang') args.designlang = true;
    else if (a === '--max-elements') args.maxElements = Number(argv[++i]);
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error('usage: measure-reference.mjs <url> --out <dir> [--browser <module>] [--id <case-id>] [--designlang]');
  if (!args.out) throw new Error('--out <dir> is required');
  for (const u of args.urls) if (!/^https?:\/\//.test(u)) throw new Error(`not an http(s) URL: ${u}`);
  return args;
}

export async function loadBrowser(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  try { candidates.push(createRequire(join(process.cwd(), 'package.json')).resolve('playwright')); } catch {}
  for (const c of candidates) {
    try {
      const mod = await import(/^file:/.test(c) ? c : pathToFileURL(resolve(c)).href);
      if (mod.chromium) return { chromium: mod.chromium, from: c };
    } catch (e) { if (explicit && c === explicit) throw new Error(`could not load browser module ${c}: ${e.message}`); }
  }
  throw new Error('no browser module: pass --browser <path to playwright/index.mjs> or set STYLESEED_BROWSER_MODULE');
}

export function twelveAxesDraft(url, summary) {
  const s = summary;
  const row = (axis, value, level) => `| ${axis} | ${value} | ${level} |`;
  const unknown = axis => row(axis, 'unknown — observe on the live surface and record the source', 'unknown');
  return `# Twelve-axis draft — ${url}

Generated from measurements only. Every row marked \`unknown\` needs a human observation with a
source before it can become a decision. Levels follow research/cases/README.md.

| Axis | Measured or derived value | Level |
|---|---|---|
${unknown('user-job')}
${unknown('attention')}
${unknown('composition')}
${row('density', `spacing base ${s.spacingBase ?? 'none'} (coverage ${s.spacingCoverage}); scale ${JSON.stringify(s.spacingScale)}; ${s.offScale.length} off-scale value(s)`, 'observed')}
${row('typography', `${s.typeSteps} step(s) above 2% use: ${s.typeStepDetail.map(t => `${t.px}px/${t.weight}`).join(', ')}; fonts ${s.fonts.map(f => f.family).join(', ')}`, 'observed')}
${row('color', `accent ${s.accentDerived ?? 'none'} (from ${s.accentFrom}); ink ${s.ink}; canvas ${s.canvas}; ink contrast ${s.inkContrast}; accent contrast ${s.accentContrast}; ${s.colorCount} colours`, 'derived')}
${row('surfaces', `radii ${JSON.stringify(s.radii)}`, 'observed')}
${unknown('imagery-data')}
${unknown('navigation-action')}
${unknown('states-motion')}
${row('responsive', `accent agrees across viewports: ${s.accentAgreesAcrossViewports}`, 'derived')}
${unknown('tells')}

Role evidence: ${JSON.stringify(s.roleEvidence)}
`;
}

export function caseDraft({ id, url, files, summary, observedAt }) {
  return {
    id, product: '', task: '', surface: 'web', domain: '', pageType: '', grammarNearest: '', observedAt,
    sources: [{ id: 'S1', kind: 'measurement', url, title: 'measure-reference.mjs run (observe-design probe)', accessedAt: observedAt, evidence: 'observed', note: 'computed-style counts at 1440 and 390; derived roles listed in measurements/summary.json' }],
    measurements: { tool: 'styleseed measure-reference', version: '1', files, summary: { spacingBase: summary.spacingBase, spacingScale: summary.spacingScale, typeSteps: summary.typeSteps, colorCount: summary.colorCount, radii: summary.radii, accentDerived: summary.accentDerived } },
    decisions: [], ruleCandidates: [], contributors: [],
    license: 'measurements and prose CC BY 4.0; no third-party assets stored',
  };
}

function runDesignlang(url, outDir) {
  const dir = join(outDir, 'designlang');
  mkdirSync(dir, { recursive: true });
  const r = spawnSync('npx', ['-y', `designlang@${DESIGNLANG_VERSION}`, url, '--out', dir], { encoding: 'utf8', timeout: 300000 });
  if (r.status !== 0) return { ok: false, error: (r.stderr || r.stdout || '').slice(-400) };
  const kept = [];
  for (const name of readdirSync(dir)) {
    if (/-(design-tokens\.json|DESIGN\.md|variables\.css)$/.test(name)) {
      const target = name.replace(/^.*-(design-tokens\.json|DESIGN\.md|variables\.css)$/, '$1');
      copyFileSync(join(dir, name), join(outDir, target)); kept.push(`measurements/${target}`);
    }
  }
  return { ok: true, kept };
}

// Observe each URL at every viewport with a caller-supplied chromium; returns the raw counts and
// the summary per URL, in input order. Shared by measure-reference and ss-verify's drift report.
export async function observeUrls(urls, { chromium, timeout = 45000, maxElements = 5000, viewports = VIEWPORTS } = {}) {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const url of urls) {
      const observations = [];
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout }).catch(async () => page.goto(url, { waitUntil: 'load', timeout }));
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(500);
        observations.push(await page.evaluate(observeDesign, { maxElements }));
        await context.close();
      }
      results.push({ url, observations, summary: summarize(observations) });
    }
  } finally { await browser.close(); }
  return results;
}

export async function measure(args, log = console.log) {
  const { chromium, from } = await loadBrowser(args.browser);
  const results = await observeUrls(args.urls, { chromium, timeout: args.timeout, maxElements: args.maxElements });

  const observedAt = new Date().toISOString().slice(0, 10);
  const written = [];
  for (const { url, observations, summary } of results) {
    const host = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9.-].*$/, '');
    const id = args.id || `${host.replace(/\./g, '-')}-reference-${observedAt}`;
    const dir = results.length > 1 || !args.id ? join(args.out, id) : args.out;
    const measurements = join(dir, 'measurements');
    mkdirSync(measurements, { recursive: true });
    const files = ['measurements/observations.json', 'measurements/summary.json'];
    writeFileSync(join(measurements, 'observations.json'), JSON.stringify({ url, observedAt, browser: from, observations }, null, 2));
    writeFileSync(join(measurements, 'summary.json'), JSON.stringify(summary, null, 2));
    if (args.designlang) {
      const dl = runDesignlang(url, measurements);
      if (dl.ok) files.push(...dl.kept); else log(`designlang skipped: ${dl.error}`);
    }
    writeFileSync(join(dir, 'TWELVE-AXES.draft.md'), twelveAxesDraft(url, summary));
    writeFileSync(join(dir, 'case.draft.json'), JSON.stringify(caseDraft({ id, url, files, summary, observedAt }), null, 2) + '\n');
    written.push(dir);
    log(`${url}\n  accent ${summary.accentDerived ?? 'none'} (${summary.accentFrom}; agrees across viewports: ${summary.accentAgreesAcrossViewports})`
      + `\n  ink ${summary.ink} on ${summary.canvas} (contrast ${summary.inkContrast}) · spacing base ${summary.spacingBase} ${JSON.stringify(summary.spacingScale)}`
      + `\n  type steps ${summary.typeSteps} · radii ${JSON.stringify(summary.radii)} · fonts ${summary.fonts.map(f => f.family).join(', ')}\n  → ${dir}`);
  }
  return written;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await measure(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
