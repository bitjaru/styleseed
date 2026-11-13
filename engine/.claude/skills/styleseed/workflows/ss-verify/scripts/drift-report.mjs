#!/usr/bin/env node
// Measure several screens of one project and report where they disagree with each other, with
// the project's registry palette, or with the project's recorded decisions.
//
//   node drift-report.mjs <url>… --out <dir> [--browser <playwright module>] [--project-root <dir>]
//                         [--palette <id>] [--decisions <file.json>] [--states error,empty]
//                         [--labels home,settings] [--gate] [--structure] [--scroll] [--faults] [--max-elements 5000] [--timeout 45000]
//                         [--reference <slug> [--screen <label>]]
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
//
// --reference <slug> also measures the distance from one screen (--screen <label>, default the
// first) to the project's approved generated contract `.styleseed/rulesets/<slug>/evidence.json`
// and writes DISTANCE.md and distance.json beside the drift files. It needs --project-root, turns
// --structure on (and --scroll when the reference was measured with its scroll pass, so both sides
// are measured the same way), and refuses a draft or a contract changed after approval. Distance is
// not drift: the drift files are exactly what the same run without --reference writes (with the
// flags it turns on). With --gate, a kept fact that differs or an avoided value that was copied also
// exits 3.
//
// --faults also runs the render-fault probe (observe-faults.mjs) on the same page loads and writes
// FAULTS.md and faults.json beside the drift files: text over text, text out of its holder, amounts
// on two lines, clipped text, tight insets, near touches and alignments, emoji used as icons, and
// mixed icon construction, each decided from boxes and computed style (analyze-faults.mjs). Faults
// are not drift: drift.json and DRIFT.md are byte for byte what the same run writes without the
// flag. With --gate, a finding whose catalog rule has priority `blocks` exits 3 unless an approved
// exception to that (default) rule covers the screen; the other classes report. Without --faults no
// extra probe runs and no file or key is added.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../../ss-reference/scripts/measure-reference.mjs';
import { compareScreens, baselineFromRoles, renderDriftMarkdown, compareToContract, distanceGateFailure, distanceVerdict, ownedValues, renderDistanceMarkdown } from '../../ss-reference/scripts/compare-screens.mjs';
import { buildFacts } from '../../ss-reference/scripts/analyze-structure.mjs';
import { loadProjectRegistry } from '../../ss-resolve/scripts/project-registry.mjs';
import { CONTRACT_FILES, checkGeneratedContract } from '../../ss-resolve/scripts/reference-contract.mjs';
import { SAFE_ID, normalizeDecisions, parseStrictJson, safeProjectPath } from '../../ss-resolve/scripts/runtime-contract.mjs';
import { observeFaults } from './observe-faults.mjs';
import { THRESHOLDS, faultsReport, faultsGateFailure, renderFaultsMarkdown } from './analyze-faults.mjs';

const USAGE = 'usage: drift-report.mjs <url>… --out <dir> [--browser <module>] [--project-root <dir>] [--palette <id>] [--decisions <file.json>] [--states a,b] [--labels a,b] [--gate] [--structure] [--scroll] [--faults] [--reference <slug> [--screen <label>]]';
const contextCatalog = () => JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../ss-resolve/references/catalog.json'), 'utf8'));

export function parseArgs(argv) {
  const args = { urls: [], out: null, browser: process.env.STYLESEED_BROWSER_MODULE || null, projectRoot: null, palette: null, decisions: null, states: [], labels: [], maxElements: 5000, timeout: 45000, gate: false, structure: false, scroll: false, faults: false, reference: null, screen: null };
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
    else if (a === '--faults') args.faults = true;
    else if (a === '--reference') args.reference = argv[++i] ?? '';
    else if (a === '--screen') args.screen = argv[++i] ?? '';
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
  if (args.reference !== null && !SAFE_ID.test(args.reference)) throw new Error('--reference needs the slug of a generated contract under .styleseed/rulesets/ (for example ops-console)');
  if (args.reference !== null && !args.projectRoot) throw new Error('--reference needs --project-root <dir>: the approved contract is read from <dir>/.styleseed/rulesets/<slug>/evidence.json');
  if (args.screen !== null && args.reference === null) throw new Error('--screen picks the screen measured against --reference <slug>; pass --reference too');
  if (args.screen !== null && !args.screen) throw new Error('--screen needs a screen label (as in --labels, or derived from the URL)');
  return args;
}

// The approved generated contract `reference:<slug>` of the project, validated as the resolver
// validates it (approval record, contract hash, rendered files). A draft, a contract edited after
// approval, or a hand-written contract is refused with the command to run.
export function loadReferenceContract(projectRoot, slug, catalog = contextCatalog()) {
  const root = resolve(projectRoot);
  const dir = `.styleseed/rulesets/${slug}`;
  const evidencePath = safeProjectPath(root, `${dir}/evidence.json`);
  if (!existsSync(evidencePath)) throw new Error(`--reference ${slug}: ${dir}/evidence.json does not exist. Compile it first: ss-reference/scripts/compile-contract.mjs --project-root <dir> --slug ${slug} --measurements <dir> --write, then --approve --reviewer <name>`);
  const files = {};
  for (const name of CONTRACT_FILES) {
    const path = safeProjectPath(root, `${dir}/${name}`);
    if (existsSync(path)) files[name] = readFileSync(path);
  }
  const evidence = checkGeneratedContract({ slug, files, fallback: null, catalog });
  if (!evidence) throw new Error(`--reference ${slug}: ${dir}/evidence.json is a hand-written contract; distance is measured against generated contracts only (compile-contract.mjs)`);
  return evidence;
}

// The plan row --screen names (default: the first screen).
export function pickScreen(plan, label = null) {
  if (label === null) return plan[0];
  const found = plan.find(p => p.label === label);
  if (!found) throw new Error(`--screen ${label} is not one of the measured screens (${plan.map(p => p.label).join(', ')})`);
  return found;
}

// --reference turns on what the comparison needs: the structure probe always, and the scroll pass
// when the contract's source was measured with one. Returns the effective flags and what was turned on.
export function referenceFlags(args, evidence) {
  const scrolled = evidence.sources.some(source => source.scroll === true);
  const turnedOn = [...(args.structure ? [] : ['--structure']), ...(!args.scroll && scrolled ? ['--scroll'] : [])];
  return { structure: true, scroll: args.scroll || scrolled, turnedOn };
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
// an exception `to` a registry decision, and ids and axes cannot clash. A project without a registry
// keeps its ledger in `.styleseed/decisions.json`; with --project-root and no --decisions that file is
// read exactly as if it had been passed with --decisions.
export function loadDecisions({ projectRoot = null, decisions = null } = {}, catalog = contextCatalog()) {
  let fromProject = [];
  if (projectRoot) {
    let registry;
    try { registry = loadProjectRegistry(resolve(projectRoot), { catalog }); }
    catch (e) { throw new Error(`${e.message} (while reading the .styleseed registry under ${resolve(projectRoot)} for its decisions; fix the registry or drop --project-root)`); }
    fromProject = registry?.project.decisions ?? [];
    if (!registry && !decisions && existsSync(join(resolve(projectRoot), '.styleseed', 'decisions.json'))) decisions = safeProjectPath(resolve(projectRoot), '.styleseed/decisions.json');
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
// exception is neither. With --reference, a kept fact that differs or an avoided value that was
// copied also fails (each named). With --faults, a render fault whose catalog rule blocks fails
// too (one line, analyze-faults.mjs faultsGateFailure). Returns null when the gate passes.
export function gateFailure(result) {
  const parts = [];
  if (result.screensWithDrift.length) parts.push(`drift on ${result.screensWithDrift.join(', ')}`);
  const violations = result.decisions?.violations ?? [];
  if (violations.length) parts.push(`decision violations: ${violations.map(v => `${v.id} on ${v.screen} (${v.axis} ${v.values.join(', ')})`).join('; ')}`);
  const lines = [parts.length ? `drift gate: FAIL — ${parts.join('; ')}` : null, result.distance ? distanceGateFailure(result.distance.rows) : null, result.faults ? faultsGateFailure(result.faults) : null].filter(Boolean);
  return lines.length ? lines.join('\n') : null;
}

export async function report(args, log = console.log, { loadBrowserImpl = loadBrowser, catalog = contextCatalog() } = {}) {
  const decisions = loadDecisions(args, catalog);
  const plan = planScreens(args);
  // --reference: refuse a draft before any browser starts, then turn on what the comparison needs.
  let reference = null;
  if (args.reference) {
    const evidence = loadReferenceContract(args.projectRoot, args.reference, catalog);
    const screen = pickScreen(plan, args.screen);
    const flags = referenceFlags(args, evidence);
    for (const flag of flags.turnedOn) log(flag === '--structure'
      ? `--reference ${args.reference}: --structure is on (the structure probe supplies the facts the contract is compared with)`
      : `--reference ${args.reference}: --scroll is on (the reference was measured with its scroll pass, so this screen is measured the same way)`);
    reference = { evidence, screen, flags };
  }
  const structure = reference ? reference.flags.structure : args.structure;
  const scroll = reference ? reference.flags.scroll : args.scroll;
  const { chromium, from } = await loadBrowserImpl(args.browser);
  const measured = await observeUrls(plan.map(p => p.url), { chromium, timeout: args.timeout, maxElements: args.maxElements, structure, scroll, ...(args.faults ? { extraProbes: [{ key: 'faults', probe: observeFaults }] } : {}) });
  const screens = plan.map((p, i) => ({ ...p, summary: measured[i].summary }));
  const registry = args.projectRoot ? registryBaseline(resolve(args.projectRoot), args.palette) : null;
  const result = compareScreens(screens, { baseline: registry ? baselineFromRoles(registry.roles) : null, decisions, structure });
  const decided = result.baseline.source.match(/; recorded project decisions for .*$/u)?.[0] ?? '';
  const meta = {
    observedAt: new Date().toISOString().slice(0, 10), browser: String(from).replace(/^.*node_modules\//u, ''), states: args.states, ...(scroll ? { scroll: true } : {}),
    baselineSource: `${registry ? `registry roles from ${registry.file} for colours, majority across screens for the rest` : 'majority across screens'}${decided}`,
  };
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'drift.json'), `${JSON.stringify({ tool: 'styleseed drift-report', version: '1', ...meta, ...result }, null, 2)}\n`);
  writeFileSync(join(args.out, 'DRIFT.md'), renderDriftMarkdown(result, meta));
  log(`${result.verdict}\n  → ${join(args.out, 'DRIFT.md')}`);

  // Render faults: their own files; the drift files above are not touched again.
  if (args.faults) {
    const faults = faultsReport(plan.map((p, i) => ({ label: p.label, url: p.url, state: p.state, observations: measured[i].observations })), { decisions, rules: catalog.rules ?? [] });
    const faultsMeta = { observedAt: meta.observedAt, browser: meta.browser };
    writeFileSync(join(args.out, 'faults.json'), `${JSON.stringify({ tool: 'styleseed render-faults', version: '1', ...faultsMeta, thresholds: THRESHOLDS, ...faults }, null, 2)}\n`);
    writeFileSync(join(args.out, 'FAULTS.md'), renderFaultsMarkdown(faults, faultsMeta));
    log(`render faults: ${faults.verdict}\n  → ${join(args.out, 'FAULTS.md')}`);
    result.faults = faults;
  }
  if (!reference) return result;

  // Distance: its own files; the drift files above are not touched again.
  const { evidence, screen } = reference;
  const { summary } = measured[plan.indexOf(screen)];
  const facts = buildFacts(summary, summary.structure ?? null, screen.url, meta.observedAt);
  const project = loadProjectRegistry(resolve(args.projectRoot), { catalog });
  const rows = compareToContract({ facts: facts.facts, summary }, evidence, { ownValues: ownedValues({ roles: registry?.roles ?? null, brand: project?.project.brand ?? null, decisions }) });
  const verdict = distanceVerdict(rows);
  const distanceMeta = {
    slug: args.reference, screen: screen.label, url: screen.url, observedAt: meta.observedAt, browser: meta.browser, ...(scroll ? { scroll: true } : {}),
    contractHash: evidence.approval.contractHash, approvedBy: evidence.approval.reviewer, approvedOn: evidence.approval.date,
  };
  writeFileSync(join(args.out, 'distance.json'), `${JSON.stringify({ tool: 'styleseed distance', version: '1', reference: args.reference, contractHash: distanceMeta.contractHash, approvedBy: distanceMeta.approvedBy, approvedOn: distanceMeta.approvedOn, screen: { label: screen.label, url: screen.url }, observedAt: meta.observedAt, browser: meta.browser, ...(scroll ? { scroll: true } : {}), verdict, rows }, null, 2)}\n`);
  writeFileSync(join(args.out, 'DISTANCE.md'), renderDistanceMarkdown(rows, distanceMeta));
  log(`distance to reference:${args.reference} (${screen.label}): ${verdict}\n  → ${join(args.out, 'DISTANCE.md')}`);
  result.distance = { reference: args.reference, screen: screen.label, rows, verdict };
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
