#!/usr/bin/env node
// Measure a public reference URL at desktop and narrow viewports and write the measurement
// files a design-decision case starts from (research/cases/README.md).
//
//   node measure-reference.mjs <url> --out <dir> [--browser <playwright module>] [--id <case-id>]
//                              [--robots] [--own-site] [--designlang] [--max-elements 5000] [--timeout 45000]
//
// The browser comes from --browser, STYLESEED_BROWSER_MODULE, or a `playwright` package the
// current project already has. Nothing is installed. One page load per viewport runs the design
// probe (computed-style counts) and the structure probe (geometry as numbers); no screenshots,
// text, selectors, asset URLs, or form values are written. Derived values name the counts behind
// them. --robots checks robots.txt for the path first (built-in fetch); a disallowed path stops
// the run unless --own-site says the site is yours. The user remains responsible for the site's terms.
//
// Not yet: --states (forced :hover / :focus-visible / :disabled pseudo-states) and
// --storage-state (measuring your own authenticated app from a saved session).
import { mkdirSync, writeFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { observeDesign } from './observe-design.mjs';
import { observeStructure } from './observe-structure.mjs';
import { summarize } from './analyze-observations.mjs';
import { buildFacts, factsByAxis } from './analyze-structure.mjs';

const DESIGNLANG_VERSION = '13.4.0';
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, id: null, designlang: false, robots: false, ownSite: false, maxElements: 5000, timeout: 45000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--designlang') args.designlang = true;
    else if (a === '--robots') args.robots = true;
    else if (a === '--own-site') args.ownSite = true;
    else if (a === '--max-elements') args.maxElements = Number(argv[++i]);
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error('usage: measure-reference.mjs <url> --out <dir> [--browser <module>] [--id <case-id>] [--robots] [--own-site] [--designlang]');
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

// What stays a person's call on each axis the probes can only describe.
const STAYS_OPEN = {
  'user-job': 'the job itself', attention: 'the intended focal point', composition: 'the reason', 'imagery-data': 'the role of each medium',
  'navigation-action': 'the hierarchy intent', 'states-motion': 'loading, empty, and error states', tells: 'brand tells',
};

// Facts of one axis as one table cell, grouped by viewport: `@1440: region.sideNav.width 240px, …`.
function factCell(facts) {
  const value = f => `${Array.isArray(f.value) ? JSON.stringify(f.value) : f.value}${f.unit && typeof f.value === 'number' ? f.unit : f.unit && Array.isArray(f.value) ? ` ${f.unit}` : ''}`;
  const groups = new Map();
  for (const f of facts) { const key = f.viewport === 'both' ? 'both' : `@${f.viewport}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(`${f.id.split('.').slice(1).join('.')} ${value(f)}`); }
  return [...groups].map(([key, list]) => `${key}: ${list.join(', ')}`).join('; ').replace(/\|/g, '\\|');
}
const levelsOf = facts => [...new Set(facts.map(f => f.level))].sort().join(' + ');

export function twelveAxesDraft(url, summary) {
  const s = summary;
  const byAxis = factsByAxis(s.facts || []);
  const row = (axis, value, level, decision = STAYS_OPEN[axis] ? `open: ${STAYS_OPEN[axis]}` : '') => `| ${axis} | ${value} | ${level} | ${decision} |`;
  const unknown = axis => row(axis, 'unknown — observe on the live surface and record the source', 'unknown');
  const measured = axis => (byAxis[axis]?.length ? row(axis, factCell(byAxis[axis]), levelsOf(byAxis[axis])) : unknown(axis));
  const grown = (axis, text, level) => (byAxis[axis]?.length ? row(axis, `${text}; ${factCell(byAxis[axis])}`, [...new Set([level, ...byAxis[axis].map(f => f.level)])].sort().join(' + ')) : row(axis, text, level));
  const wide = s.structure?.viewports?.[0];
  const userJob = wide
    ? row('user-job', `page-type hint ${wide.pageTypeHint ?? 'none'} (sections @${wide.viewport}: ${Object.entries(wide.sectionKinds).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'})`, 'derived hint')
    : unknown('user-job');
  const border = s.border ? `; border ${s.border.width}px ${s.border.color} (${s.border.distinct} border style(s))` : '';
  const elevation = s.elevation ? `; elevation ${Object.entries(s.elevation.families).map(([f, n]) => `${f} ${n}`).join(', ') || 'none'} (${s.elevation.levels} level(s), ${s.elevation.distinct} distinct shadow(s))` : '';
  const inks = [s.headingInk && `heading ink ${s.headingInk}`, s.mutedInk && `muted ink ${s.mutedInk} (contrast ${s.mutedInkContrast})`, s.surface && `surface ${s.surface}`, s.onAccent && `on accent ${s.onAccent} (contrast ${s.onAccentContrast})`].filter(Boolean);
  return `# Twelve-axis draft — ${url}

Generated from measurements only. Every row marked \`unknown\` needs a human observation with a
source before it can become a decision. Levels follow research/cases/README.md. Facts come from
measurements/facts.json; a fact is an observation, not a decision. The last column is for the
person who decides: what to keep, vary, or reject, and what the probes cannot see.

| Axis | Measured or derived value | Level | Decision (person) |
|---|---|---|---|
${userJob}
${measured('attention')}
${measured('composition')}
${grown('density', `spacing base ${s.spacingBase ?? 'none'} (coverage ${s.spacingCoverage}); scale ${JSON.stringify(s.spacingScale)}; ${s.offScale.length} off-scale value(s)`, 'observed')}
${grown('typography', `${s.typeSteps} step(s) above 2% use: ${s.typeStepDetail.map(t => `${t.px}px/${t.weight}`).join(', ')}; fonts ${s.fonts.map(f => f.family).join(', ')}`, 'observed')}
${row('color', `accent ${s.accentDerived ?? 'none'} (from ${s.accentFrom}); ink ${s.ink}; canvas ${s.canvas}; ink contrast ${s.inkContrast}; accent contrast ${s.accentContrast}; ${s.colorCount} colours${inks.length ? `; ${inks.join('; ')}` : ''}`, 'derived')}
${row('surfaces', `radii ${JSON.stringify(s.radii)}${border}${elevation}`, 'observed')}
${measured('imagery-data')}
${measured('navigation-action')}
${measured('states-motion')}
${grown('responsive', `accent agrees across viewports: ${s.accentAgreesAcrossViewports}`, 'derived')}
${measured('tells')}

Role evidence: ${JSON.stringify(s.roleEvidence)}
`;
}

// robots.txt (RFC 9309) for one path and the `*` group: the longest matching rule wins and an
// allow wins a tie. Returns { allowed, rules } where rules counts the rules that applied.
export function robotsVerdict(text, path) {
  const groups = [];
  let current = null, inAgents = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !inAgents) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase()); inAgents = true;
    } else if (key === 'allow' || key === 'disallow') {
      if (current) current.rules.push({ allow: key === 'allow', pattern: value });
      inAgents = false;
    } else inAgents = false;
  }
  const rules = groups.filter(g => g.agents.includes('*')).flatMap(g => g.rules).filter(r => r.pattern);
  const matches = rules.filter(r => {
    const exact = r.pattern.endsWith('$');
    const body = (exact ? r.pattern.slice(0, -1) : r.pattern).split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`^${body}${exact ? '$' : ''}`).test(path);
  });
  if (!matches.length) return { allowed: true, rules: 0 };
  matches.sort((a, b) => b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow));
  return { allowed: matches[0].allow, rules: matches.length };
}

// Check the measured path against the site's robots.txt with the built-in fetch. A missing file
// (4xx) allows; a server error or no answer is treated as a full disallow, as RFC 9309 asks.
export async function checkRobots(url, { fetchImpl = globalThis.fetch, timeout = 10000 } = {}) {
  const u = new URL(url);
  const robotsUrl = `${u.origin}/robots.txt`;
  try {
    const res = await fetchImpl(robotsUrl, { redirect: 'follow', signal: AbortSignal.timeout(timeout) });
    if (res.status >= 400 && res.status < 500) return { status: 'allowed', reason: `${robotsUrl} returned ${res.status}, so no rule applies` };
    if (!res.ok) return { status: 'disallowed', reason: `${robotsUrl} returned ${res.status}; an unreachable robots.txt is treated as a full disallow (RFC 9309)` };
    const verdict = robotsVerdict((await res.text()).slice(0, 512000), `${u.pathname}${u.search}`);
    return { status: verdict.allowed ? 'allowed' : 'disallowed', reason: verdict.allowed ? `${robotsUrl} allows ${u.pathname} for user-agent *` : `${robotsUrl} disallows ${u.pathname} for user-agent *` };
  } catch (e) {
    return { status: 'disallowed', reason: `${robotsUrl} could not be read (${e.name}); an unreachable robots.txt is treated as a full disallow (RFC 9309)` };
  }
}

export function caseDraft({ id, url, files, summary, observedAt, robots = { status: 'not-checked' }, ownSite = false }) {
  return {
    id, product: '', task: '', surface: 'web', domain: '', pageType: '', grammarNearest: '', observedAt,
    sources: [{ id: 'S1', kind: 'measurement', url, title: 'measure-reference.mjs run (observe-design and observe-structure probes)', accessedAt: observedAt, evidence: 'observed', robots: robots.status, note: `computed-style counts and structure geometry at 1440 and 390, one page load per viewport; derived roles in measurements/summary.json, facts in measurements/facts.json; robots.txt ${robots.status}${ownSite ? ' (measured with --own-site)' : ''}` }],
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
// With `structure`, the structure probe runs on the same page load and its output rides on each
// observation as `.structure`. One navigation per viewport: a page that never goes network-idle
// is measured once it has loaded, not loaded again.
export async function observeUrls(urls, { chromium, timeout = 45000, maxElements = 5000, viewports = VIEWPORTS, structure = false } = {}) {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const url of urls) {
      const observations = [];
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'load', timeout });
        await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(500);
        const observation = await page.evaluate(observeDesign, { maxElements });
        if (structure) observation.structure = await page.evaluate(observeStructure, { maxElements });
        observations.push(observation);
        await context.close();
      }
      results.push({ url, observations, summary: summarize(observations) });
    }
  } finally { await browser.close(); }
  return results;
}

export async function measure(args, log = console.log, { fetchImpl = globalThis.fetch } = {}) {
  const robots = {};
  for (const url of args.urls) {
    robots[url] = args.robots ? await checkRobots(url, { fetchImpl }) : { status: 'not-checked', reason: 'robots.txt was not checked (pass --robots)' };
    if (robots[url].status === 'disallowed' && !args.ownSite) {
      throw new Error(`${url}: ${robots[url].reason}. Nothing was measured. Measure the vendor's public documentation or a self-hosted instance instead, or pass --own-site if you operate this site.`);
    }
    if (args.robots) log(`robots.txt ${robots[url].status}: ${robots[url].reason}${robots[url].status === 'disallowed' ? ' (continuing: --own-site)' : ''}`);
  }
  const { chromium, from } = await loadBrowser(args.browser);
  const results = await observeUrls(args.urls, { chromium, timeout: args.timeout, maxElements: args.maxElements, structure: true });

  const observedAt = new Date().toISOString().slice(0, 10);
  const written = [];
  for (const { url, observations, summary } of results) {
    const host = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9.-].*$/, '');
    const id = args.id || `${host.replace(/\./g, '-')}-reference-${observedAt}`;
    const dir = results.length > 1 || !args.id ? join(args.out, id) : args.out;
    const measurements = join(dir, 'measurements');
    mkdirSync(measurements, { recursive: true });
    const files = ['measurements/observations.json', 'measurements/summary.json', 'measurements/facts.json'];
    const facts = buildFacts(summary, summary.structure ?? null, url, observedAt);
    writeFileSync(join(measurements, 'observations.json'), JSON.stringify({ url, observedAt, browser: from, observations }, null, 2));
    writeFileSync(join(measurements, 'summary.json'), JSON.stringify(summary, null, 2));
    writeFileSync(join(measurements, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
    if (args.designlang) {
      const dl = runDesignlang(url, measurements);
      if (dl.ok) files.push(...dl.kept); else log(`designlang skipped: ${dl.error}`);
    }
    writeFileSync(join(dir, 'TWELVE-AXES.draft.md'), twelveAxesDraft(url, summary));
    writeFileSync(join(dir, 'case.draft.json'), JSON.stringify(caseDraft({ id, url, files, summary, observedAt, robots: robots[url], ownSite: args.ownSite }), null, 2) + '\n');
    written.push(dir);
    const perAxis = Object.entries(factsByAxis(facts.facts)).map(([axis, list]) => `${axis} ${list.length}`).join(', ');
    log(`${url}\n  accent ${summary.accentDerived ?? 'none'} (${summary.accentFrom}; agrees across viewports: ${summary.accentAgreesAcrossViewports})`
      + `\n  ink ${summary.ink} on ${summary.canvas} (contrast ${summary.inkContrast}) · spacing base ${summary.spacingBase} ${JSON.stringify(summary.spacingScale)}`
      + `\n  type steps ${summary.typeSteps} · radii ${JSON.stringify(summary.radii)} · fonts ${summary.fonts.map(f => f.family).join(', ')}`
      + `\n  facts ${facts.facts.length} (${perAxis || 'none'})\n  → ${dir}`);
  }
  return written;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await measure(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
