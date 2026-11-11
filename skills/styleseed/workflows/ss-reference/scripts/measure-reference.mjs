#!/usr/bin/env node
// Measure a public reference URL at desktop and narrow viewports and write the measurement
// files a design-decision case starts from (research/cases/README.md), or, in project mode, the
// measurements a project compiles its reference contract from.
//
//   node measure-reference.mjs <url> --out <dir> [--browser <playwright module>] [--id <case-id>]
//                              [--robots] [--own-site] [--no-scroll] [--designlang] [--max-elements 5000] [--timeout 45000]
//   node measure-reference.mjs <url> --project-root <dir> --slug <slug> [--frames] [--robots] [--own-site] [...]
//
// Case mode (--out) writes measurements/, TWELVE-AXES.draft.md, and case.draft.json. Project mode
// (--project-root and --slug, one URL) writes the same measurements/ layout under
// <project-root>/.styleseed/evidence/_reference/<slug>/, plus measurements/source.json (the URL, the
// date, the robots.txt verdict, the viewports, and whether the scroll pass ran) for
// compile-contract.mjs; no case draft is written into a project. --frames (project mode only, and
// only with --robots allowing the path or --own-site) also saves one viewport screenshot per
// measured viewport to …/<slug>/frames/<width>.png, taken inside the same load: no full-page
// capture, no element crops, no asset downloads. Frames are the only picture of a page this engine
// saves; they stay in the user's project, ignored by git by default (…/_reference/.gitignore), and
// are refused in the StyleSeed repository. Case mode never writes frames.
//
// The browser comes from --browser, STYLESEED_BROWSER_MODULE, or a `playwright` package the
// current project already has. Nothing is installed. One page load per viewport runs the design
// probe (computed-style counts) and the structure probe (geometry as numbers); no screenshots
// (other than project mode's --frames above), text, selectors, asset URLs, or form values are
// written. Derived values name the counts behind
// them. --robots checks robots.txt for the path first (built-in fetch); a disallowed path stops
// the run unless --own-site says the site is yours. The user remains responsible for the site's terms.
//
// Scroll pass (on by default; --no-scroll turns it off): inside the one load, before the probes,
// the window is scrolled to the bottom in steps of 80% of the viewport and back to the top, so
// content that reveals on scroll is measured as a reader who scrolls would see it. Nothing is
// clicked, hovered, typed, or followed. Bounds: SCROLL_DEFAULTS (steps, time, document height);
// the record (steps, start and final height, which bound stopped it) rides on each observation.
// Limits, stated rather than solved: only the window is scrolled (inner scroll containers are
// counted in shell.scrollContainers, not scrolled); content that hides again when scrolled away is
// measured as hidden; a reveal transition longer than about 900ms on the last screenful may be
// measured mid-flight. The page may fetch its own lazy resources as it would for a reader who
// scrolls; the probe requests nothing.
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
import { SAFE_ID, safeProjectPath } from '../../ss-resolve/scripts/runtime-contract.mjs';

const DESIGNLANG_VERSION = '13.4.0';
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const USAGE = 'usage: measure-reference.mjs <url> --out <dir> [--browser <module>] [--id <case-id>] [--robots] [--own-site] [--no-scroll] [--designlang]\n       measure-reference.mjs <url> --project-root <dir> --slug <slug> [--frames] [--browser <module>] [--robots] [--own-site] [--no-scroll]';
// Project mode writes under this folder of the project root, one subfolder per slug.
export const PROJECT_REFERENCE_DIR = '.styleseed/evidence/_reference';
export const FRAMES_IGNORE = '*/frames/\n';
const FRAMES_IN_REPOSITORY = 'frames are project-local; the StyleSeed repository stores no third-party screenshots';

export function parseArgs(argv) {
  const args = { urls: [], out: null, projectRoot: null, slug: null, frames: false, browser: process.env.STYLESEED_BROWSER_MODULE || null, id: null, designlang: false, robots: false, ownSite: false, scroll: true, maxElements: 5000, timeout: 45000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--project-root') args.projectRoot = argv[++i];
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--frames') args.frames = true;
    else if (a === '--browser') args.browser = argv[++i];
    else if (a === '--id') args.id = argv[++i];
    else if (a === '--designlang') args.designlang = true;
    else if (a === '--robots') args.robots = true;
    else if (a === '--own-site') args.ownSite = true;
    else if (a === '--no-scroll') args.scroll = false;
    else if (a === '--max-elements') args.maxElements = Number(argv[++i]);
    else if (a === '--timeout') args.timeout = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else args.urls.push(a);
  }
  if (!args.urls.length) throw new Error(USAGE);
  const project = args.projectRoot !== null || args.slug !== null;
  if (project && (!args.projectRoot || !args.slug)) throw new Error('--project-root <dir> and --slug <slug> go together: project mode writes .styleseed/evidence/_reference/<slug>/ under the project root');
  if (project && args.out) throw new Error('--out and --project-root/--slug cannot run together: --out writes a case folder, --project-root with --slug writes into the project; pick one');
  if (!project && !args.out) throw new Error(`--out <dir> is required (or --project-root <dir> --slug <slug> for project mode)\n${USAGE}`);
  if (project && !SAFE_ID.test(args.slug)) throw new Error('--slug must be a safe id such as ops-console (lowercase letters, digits, and hyphens)');
  if (project && args.urls.length > 1) throw new Error(`project mode measures one URL per slug (got ${args.urls.length}); run once per reference with its own --slug`);
  if (project && args.id) throw new Error('--id names a case folder; project mode names the measurement by --slug');
  if (args.frames && !project) throw new Error('--frames needs project mode (--project-root <dir> --slug <slug>): frames are project-local, and case mode (--out) never writes frames');
  if (args.frames && !args.robots && !args.ownSite) throw new Error('--frames needs --robots (robots.txt must allow the path) or --own-site (a site you operate)');
  for (const u of args.urls) if (!/^https?:\/\//.test(u)) throw new Error(`not an http(s) URL: ${u}`);
  return args;
}

// The StyleSeed repository itself: engine/VERSION next to a research/cases folder.
export function isStyleSeedRepository(root) {
  return existsSync(join(root, 'engine', 'VERSION')) && existsSync(join(root, 'research', 'cases'));
}

// Project mode: the resolved project root and the folder this slug's measurement lives in. Frames
// are refused in the StyleSeed repository before anything is measured.
export function projectTarget(args) {
  const root = resolve(args.projectRoot);
  if (!existsSync(root)) throw new Error(`--project-root ${args.projectRoot} does not exist`);
  if (args.frames && isStyleSeedRepository(root)) throw new Error(FRAMES_IN_REPOSITORY);
  return { root, rel: `${PROJECT_REFERENCE_DIR}/${args.slug}` };
}

// The one viewport screenshot --frames saves, taken on the page the probes just read: the first
// viewport only (fullPage false), no element crops, no asset downloads.
export function captureFrame(page) {
  return page.screenshot({ type: 'png', fullPage: false });
}

// Write frames/<width>.png for one slug and make sure git ignores frames by default: the first
// write creates .styleseed/evidence/_reference/.gitignore with `*/frames/` when it does not exist.
export function writeFrames(root, slug, frames, log = console.log) {
  const ignoreRel = `${PROJECT_REFERENCE_DIR}/.gitignore`;
  mkdirSync(safeProjectPath(root, `${PROJECT_REFERENCE_DIR}/${slug}/frames`), { recursive: true });
  const ignore = safeProjectPath(root, ignoreRel);
  const created = !existsSync(ignore);
  if (created) writeFileSync(ignore, FRAMES_IGNORE);
  const written = [];
  for (const [width, png] of Object.entries(frames).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    const rel = `${PROJECT_REFERENCE_DIR}/${slug}/frames/${width}.png`;
    writeFileSync(safeProjectPath(root, rel), png);
    written.push(rel);
  }
  log(`frames: ${written.join(', ')} (one viewport screenshot per viewport). Frames are ignored by git by default (${ignoreRel}${created ? ', created now,' : ''} lists */frames/) and are yours to keep private.`);
  return { written, ignoreCreated: created };
}

// Project mode's record of the run, read by compile-contract.mjs: numbers and enums plus the
// measured page's own URL.
export function sourceRecord({ url, observedAt, robots, viewports, scrolled }) {
  return { url, observedAt, robots: robots.status, viewports: [...viewports], scroll: Boolean(scrolled) };
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

// What stays a person's call on each axis the probes can only describe. compile-contract.mjs writes
// the same lines into a generated contract's open[].
export const STAYS_OPEN = Object.freeze({
  'user-job': 'the job itself', attention: 'the intended focal point', composition: 'the reason', 'imagery-data': 'the role of each medium',
  'navigation-action': 'the hierarchy intent', 'states-motion': 'loading, empty, and error states', tells: 'brand tells',
});

// Facts of one axis as one table cell, grouped by viewport: `@1440: region.sideNav.width 240px, …`.
// A lower-bound fact (`bound: "lower"`) reads `≥value`: the true value is at least this.
function factCell(facts) {
  const value = f => `${f.bound === 'lower' ? '≥' : ''}${Array.isArray(f.value) ? JSON.stringify(f.value) : f.value}${f.unit && typeof f.value === 'number' ? f.unit : f.unit && Array.isArray(f.value) ? ` ${f.unit}` : ''}`;
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
  const scrolled = s.scroll ? `\n${Object.entries(s.scroll).sort((a, b) => Number(b[0]) - Number(a[0])).map(([width, r]) => `Scroll pass @${width}: ${scrollText(r)}.`).join('\n')}\n` : '';
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
${scrolled}
Role evidence: ${JSON.stringify(s.roleEvidence)}
`;
}

// One scroll record as words: `7 step(s), document 5200px at load and 5200px after, cap none`.
function scrollText(r) {
  return `${r.steps} step(s), document ${r.startHeight}px at load and ${r.finalHeight}px after, cap ${r.cap}${r.atTop ? '' : ', not back at the top'}`;
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

export function caseDraft({ id, url, files, summary, observedAt, robots = { status: 'not-checked' }, ownSite = false, scrolled = false }) {
  return {
    id, product: '', task: '', surface: 'web', domain: '', pageType: '', grammarNearest: '', observedAt,
    sources: [{ id: 'S1', kind: 'measurement', url, title: 'measure-reference.mjs run (observe-design and observe-structure probes)', accessedAt: observedAt, evidence: 'observed', robots: robots.status, note: `computed-style counts and structure geometry at 1440 and 390, one page load per viewport; ${scrolled ? 'scroll pass ran (the window was scrolled to the bottom and back within each load)' : 'no scroll pass (content that reveals on scroll was measured as it was at load)'}; derived roles in measurements/summary.json, facts in measurements/facts.json; robots.txt ${robots.status}${ownSite ? ' (measured with --own-site)' : ''}` }],
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

// Bounds of the scroll pass, per page load: steps, wall time (ms), the deepest scroll position
// (px), the wait after each step, and the wait after returning to the top.
export const SCROLL_DEFAULTS = Object.freeze({ maxSteps: 60, maxMs: 15000, maxHeight: 30000, settleMs: 150, restMs: 800 });

// In-page (self-contained, passed to page.evaluate): the scroll position, the document height as
// observe-structure computes it, and the viewport height.
export function readScroll() {
  const scroller = document.scrollingElement || document.documentElement;
  return { y: Math.round(window.scrollY), height: Math.max(scroller.scrollHeight, document.body ? document.body.scrollHeight : 0), viewport: window.innerHeight };
}

// In-page (self-contained): move the window, nothing else.
export function scrollWindowTo(top) {
  window.scrollTo({ top, left: 0, behavior: 'instant' });
}

// Scroll the window to the bottom in strides of 80% of the viewport, then back to the top, so
// content revealed on scroll is in its revealed state when the probes run. Talks to the page only
// through page.evaluate(readScroll), page.evaluate(scrollWindowTo, top), and page.waitForTimeout.
// Returns { steps, startHeight, finalHeight, cap, atTop }; cap is none | steps | time | height.
export async function revealByScroll(page, options = {}, now = Date.now) {
  const o = { ...SCROLL_DEFAULTS, ...options };
  const started = now();
  let at = await page.evaluate(readScroll);
  const startHeight = at.height;
  if (at.height <= at.viewport + 1) return { steps: 0, startHeight, finalHeight: startHeight, cap: 'none', atTop: at.y === 0 };
  const stride = Math.round(at.viewport * 0.8);
  let steps = 0, cap = 'none', top = at.y;
  for (;;) {
    if (steps >= o.maxSteps) { cap = 'steps'; break; }
    if (now() - started >= o.maxMs) { cap = 'time'; break; }
    if (top + stride > o.maxHeight) { cap = 'height'; break; }
    top += stride;
    await page.evaluate(scrollWindowTo, top);
    steps++;
    await page.waitForTimeout(o.settleMs);
    at = await page.evaluate(readScroll);
    if (at.y + at.viewport >= at.height - 1) break;
  }
  await page.evaluate(scrollWindowTo, 0);
  await page.waitForTimeout(o.restMs);
  const end = await page.evaluate(readScroll);
  return { steps, startHeight, finalHeight: end.height, cap, atTop: end.y === 0 };
}

// Observe each URL at every viewport with a caller-supplied chromium; returns the raw counts and
// the summary per URL, in input order. Shared by measure-reference and ss-verify's drift report.
// With `structure`, the structure probe runs on the same page load and its output rides on each
// observation as `.structure`. With `scroll` (true, or overrides for SCROLL_DEFAULTS) the window is
// scrolled to the bottom and back before the probes run, and the record rides on each observation
// as `.scroll`; without it no scroll call is made. With `frames` (measure-reference project mode
// only) one viewport screenshot per viewport is taken after the probes, on the same load, and
// returned as `frames` ({ width: png bytes }) beside the observations, never inside them. One
// navigation per viewport: a page that never goes network-idle is measured once it has loaded, not
// loaded again. Each `extraProbes` entry `{ key, probe }` runs after the structure probe on the same
// load and rides on the observation as `[key]` (ss-verify drift-report.mjs --faults); the default
// makes no extra call and adds no key.
export async function observeUrls(urls, { chromium, timeout = 45000, maxElements = 5000, viewports = VIEWPORTS, structure = false, scroll = false, frames = false, extraProbes = [] } = {}) {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const url of urls) {
      const observations = [];
      const shots = {};
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'load', timeout });
        await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(500);
        const scrolled = scroll ? await revealByScroll(page, scroll === true ? {} : scroll) : null;
        const observation = await page.evaluate(observeDesign, { maxElements });
        if (structure) observation.structure = await page.evaluate(observeStructure, { maxElements });
        for (const { key, probe } of extraProbes) {
          if (Object.hasOwn(observation, key) || (scrolled && key === 'scroll')) throw new Error(`observeUrls: extra probe key "${key}" is already a key of the observation; give the probe another key`);
          observation[key] = await page.evaluate(probe, { maxElements });
        }
        if (scrolled) observation.scroll = scrolled;
        if (frames) shots[viewport.width] = await captureFrame(page);
        observations.push(observation);
        await context.close();
      }
      results.push({ url, observations, summary: summarize(observations), ...(frames ? { frames: shots } : {}) });
    }
  } finally { await browser.close(); }
  return results;
}

export async function measure(args, log = console.log, { fetchImpl = globalThis.fetch, loadBrowserImpl = loadBrowser } = {}) {
  const project = args.projectRoot ? projectTarget(args) : null;
  const robots = {};
  for (const url of args.urls) {
    robots[url] = args.robots ? await checkRobots(url, { fetchImpl }) : { status: 'not-checked', reason: 'robots.txt was not checked (pass --robots)' };
    if (robots[url].status === 'disallowed' && !args.ownSite) {
      throw new Error(`${url}: ${robots[url].reason}. Nothing was measured. Measure the vendor's public documentation or a self-hosted instance instead, or pass --own-site if you operate this site.`);
    }
    if (args.robots) log(`robots.txt ${robots[url].status}: ${robots[url].reason}${robots[url].status === 'disallowed' ? ' (continuing: --own-site)' : ''}`);
    if (args.frames && !args.ownSite && robots[url].status !== 'allowed') throw new Error(`--frames needs robots.txt to allow ${url} (it is ${robots[url].status}). Nothing was measured. Drop --frames, or pass --own-site if you operate this site.`);
  }
  const { chromium, from } = await loadBrowserImpl(args.browser);
  const results = await observeUrls(args.urls, { chromium, timeout: args.timeout, maxElements: args.maxElements, structure: true, scroll: args.scroll, frames: Boolean(project && args.frames) });

  const observedAt = new Date().toISOString().slice(0, 10);
  const written = [];
  for (const { url, observations, summary, frames } of results) {
    const host = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9.-].*$/, '');
    const id = args.id || `${host.replace(/\./g, '-')}-reference-${observedAt}`;
    if (project) mkdirSync(safeProjectPath(project.root, `${project.rel}/measurements`), { recursive: true });
    const dir = project ? safeProjectPath(project.root, project.rel) : results.length > 1 || !args.id ? join(args.out, id) : args.out;
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
    const scrolled = observations.some(o => o.scroll);
    if (project) {
      writeFileSync(join(measurements, 'source.json'), `${JSON.stringify(sourceRecord({ url, observedAt, robots: robots[url], viewports: facts.viewports, scrolled }), null, 2)}\n`);
      if (frames) writeFrames(project.root, args.slug, frames, log);
    } else writeFileSync(join(dir, 'case.draft.json'), JSON.stringify(caseDraft({ id, url, files, summary, observedAt, robots: robots[url], ownSite: args.ownSite, scrolled }), null, 2) + '\n');
    written.push(dir);
    const perAxis = Object.entries(factsByAxis(facts.facts)).map(([axis, list]) => `${axis} ${list.length}`).join(', ');
    const scrollLog = scrolled ? observations.filter(o => o.scroll).map(o => `\n  scroll @${o.viewport?.width}: ${scrollText(o.scroll)}`).join('') : '\n  scroll pass not run (--no-scroll)';
    log(`${url}\n  accent ${summary.accentDerived ?? 'none'} (${summary.accentFrom}; agrees across viewports: ${summary.accentAgreesAcrossViewports})`
      + `\n  ink ${summary.ink} on ${summary.canvas} (contrast ${summary.inkContrast}) · spacing base ${summary.spacingBase} ${JSON.stringify(summary.spacingScale)}`
      + `\n  type steps ${summary.typeSteps} · radii ${JSON.stringify(summary.radii)} · fonts ${summary.fonts.map(f => f.family).join(', ')}`
      + `${scrollLog}\n  facts ${facts.facts.length} (${perAxis || 'none'})\n  → ${dir}`);
  }
  return written;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await measure(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
