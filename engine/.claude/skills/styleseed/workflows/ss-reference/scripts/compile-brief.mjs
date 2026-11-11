#!/usr/bin/env node
// Write the builder's brief for one artifact that selects an approved generated reference contract.
//
//   node compile-brief.mjs --project-root <dir> --artifact <id> [--distance <distance.json>] [--verdict <text>] [--write]
//
// The brief sits beside the bundle at `.styleseed/briefs/<artifact-id>.md`. It is not a resolver
// output and not a manifest input: the verdict on the current screen belongs to one task, so editing
// or deleting the brief never moves the method hash. Without --write the brief is printed and nothing
// is written.
//
// Sections, in order: the person's verdict on the current screen (--verdict; the tool never writes
// one, and without it the section asks the one question), the bar (local frames when measured with
// --frames, else the source URLs), what was observed (observe facts, as observations, never as
// targets), where the current screen stands (a distance.json from drift-report.mjs --reference), the
// kept facts with their comparators, hard constraints read from the artifact's manifest and bundle
// (adapter, project decisions in scope, blocking invariants), what not to copy, and what is the
// builder's to decide. The same inputs give the same bytes; the only date in it is the contract's.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDistanceTable } from './compare-screens.mjs';
import { PROJECT_REFERENCE_DIR } from './measure-reference.mjs';
import { CONTRACT_AXES, CONTRACT_FILES, TOKEN_AXES, checkGeneratedContract, contractHash, formatFactValue, keptLines, tokenAxisText } from '../../ss-resolve/scripts/reference-contract.mjs';
import { SAFE_ID, parseStrictJson, safeProjectPath, sha256 } from '../../ss-resolve/scripts/runtime-contract.mjs';
import { loadProjectRegistry } from '../../ss-resolve/scripts/project-registry.mjs';

const USAGE = 'usage: compile-brief.mjs --project-root <dir> --artifact <id> [--distance <distance.json>] [--verdict <text>] [--write]';
const CATALOG = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../ss-resolve/references/catalog.json'), 'utf8'));
const CONTROL = /[\u0000-\u001f\u007f]/u;

export const BRIEF_HEADINGS = Object.freeze([
  '## Verdict on the current screen', '## The bar', '## What was observed', '## Where the current screen stands',
  '## Keep', '## Hard constraints', '## Do not copy', '## Yours to decide',
]);
export const NO_VERDICT = '(none yet: ask the user one question — what is wrong with the current screen?)';
export const BAR_LINE = 'This is the level to reach, not the screen to rebuild.';
export const OBSERVED_LEAD = 'Observations, not targets. A build that differs here is not wrong.';
export const YOURS_TO_DECIDE = "Layout, objects, and motion are the builder's decisions.";
const NO_COPY_LINE = '- No logos, illustrations, or copy from the reference.';
const TOKEN_NAMES = { accent: 'accent', ink: 'ink', canvas: 'canvas', spacingBase: 'spacing base', spacingScale: 'spacing scale', typeSizes: 'type sizes', radii: 'corner radii', controlHeights: 'control heights' };
const briefPath = id => `.styleseed/briefs/${id}.md`;

export function parseArgs(argv) {
  const args = { projectRoot: null, artifact: null, distance: null, verdict: null, write: false };
  const value = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-root') args.projectRoot = value(i++, a);
    else if (a === '--artifact') args.artifact = value(i++, a);
    else if (a === '--distance') args.distance = value(i++, a);
    else if (a === '--verdict') args.verdict = value(i++, a);
    else if (a === '--write') args.write = true;
    else throw new Error(`unknown argument ${a}\n${USAGE}`);
  }
  if (!args.projectRoot) throw new Error(`--project-root <dir> is required\n${USAGE}`);
  if (!args.artifact || !SAFE_ID.test(args.artifact)) throw new Error(`--artifact must name a registry artifact id such as app-ops\n${USAGE}`);
  if (args.verdict !== null && (!args.verdict.trim() || args.verdict.length > 500 || CONTROL.test(args.verdict))) throw new Error('--verdict must be the user\'s own sentence about the current screen: one line, 1-500 characters');
  return args;
}

// The project decisions and blocking invariants the bundle compiled for this artifact, read from its
// "Rules in scope" section: decision lines as compiled without their approval record (who and when
// live in the ledger; the brief carries no date but the contract's), and invariant ids whose
// priority is `blocks`.
export function bundleConstraints(bundle) {
  const lines = String(bundle).split('\n');
  const start = lines.indexOf('# Rules in scope');
  if (start < 0) return { decisions: [], invariants: [] };
  const section = heading => {
    const at = lines.indexOf(heading, start);
    if (at < 0) return [];
    const out = [];
    for (let i = at + 1; i < lines.length && !lines[i].startsWith('#') && lines[i] !== '---'; i++) if (lines[i].startsWith('- **')) out.push(lines[i]);
    return out;
  };
  return {
    decisions: section('## Project decisions').map(line => line.replace(/ · approved by .*?, \d{4}-\d{2}-\d{2}\): /u, '): ')),
    invariants: section('## Invariants').map(line => /^- \*\*([^*]+)\*\* \(blocks\b/u.exec(line)?.[1]).filter(Boolean),
  };
}

const where = fact => (fact.viewport === 'both' ? 'at both viewports' : `at ${fact.viewport}`);
const factValue = fact => `${fact.bound === 'lower' ? 'at least ' : ''}${formatFactValue(fact)}`;

/**
 * The brief as text. Pure: the same inputs give the same bytes.
 * @param {{artifactId: string, evidence: object, adapter: string, decisions?: string[], invariants?: string[],
 *   frames?: {path: string, viewport: number}[], distanceRows?: object[]|null, verdict?: string|null}} input
 */
export function renderBrief({ artifactId, evidence, adapter, decisions = [], invariants = [], frames = [], distanceRows = null, verdict = null }) {
  const slug = evidence.slug;
  const { reviewer, date } = evidence.approval;
  const observed = evidence.facts.filter(fact => fact.transfer === 'observe');
  const observedByAxis = CONTRACT_AXES.map(([axis, title]) => [title, observed.filter(fact => fact.axis === axis)]).filter(([, list]) => list.length);
  const keep = keptLines(evidence);
  const avoidTokens = TOKEN_AXES.filter(axis => evidence.tokens.transfer[axis] === 'avoid').map(axis => {
    const { value } = tokenAxisText(evidence, axis);
    if (value === null) return null;
    const name = axis === 'fonts' ? (evidence.tokens.measured.fonts.length > 1 ? 'font families' : 'font family') : TOKEN_NAMES[axis];
    return `- The reference's ${name}: ${value}.`;
  }).filter(Boolean);
  const avoidFacts = evidence.facts.filter(fact => fact.transfer === 'avoid').map(fact => `- The reference's \`${fact.id}\` ${where(fact)}: ${factValue(fact)}.`);
  const bar = frames.length
    ? frames.map(frame => `- \`${frame.path}\` (viewport ${frame.viewport})`)
    : evidence.sources.map(source => `- ${source.id}: ${source.url}`);
  return `${[
    `# Brief: ${artifactId}`,
    '',
    `<!-- Generated by compile-brief.mjs from the approved contract reference:${slug}, the artifact's manifest and bundle, and the inputs given. Not a resolver output and not a manifest input: the verdict belongs to one task. Re-run to update. -->`,
    '',
    `Artifact \`${artifactId}\` builds with \`reference:${slug}\` (contract approved by ${reviewer} on ${date}). Read this after \`.styleseed/bundles/${artifactId}.md\`; the bundle wins any conflict.`,
    '',
    BRIEF_HEADINGS[0], '', verdict ?? NO_VERDICT,
    '',
    BRIEF_HEADINGS[1], '', ...bar, '', BAR_LINE,
    '',
    BRIEF_HEADINGS[2], '', OBSERVED_LEAD,
    ...(observedByAxis.length ? observedByAxis.flatMap(([title, list]) => ['', `### ${title}`, '', ...list.map(fact => `- \`${fact.id}\` ${where(fact)}: ${factValue(fact)} (${fact.level})`)]) : ['', '- none']),
    '',
    BRIEF_HEADINGS[3], '', distanceRows ? renderDistanceTable(distanceRows) : `(not measured yet: run drift-report.mjs --reference ${slug})`,
    '',
    BRIEF_HEADINGS[4], '', ...(keep.length ? keep : ['- none']),
    '',
    BRIEF_HEADINGS[5], '',
    `- Adapter: \`${adapter}\` (the artifact's manifest).`,
    ...(decisions.length ? ['- Project decisions in scope (the bundle):', ...decisions.map(line => `  ${line}`)] : ['- Project decisions in scope: none recorded for this artifact.']),
    `- Blocking invariants (the bundle; statements under "Rules in scope"): ${invariants.length ? invariants.map(id => `\`${id}\``).join(', ') : 'none'}.`,
    '',
    BRIEF_HEADINGS[6], '', ...avoidTokens, ...avoidFacts, NO_COPY_LINE,
    '',
    BRIEF_HEADINGS[7], '', YOURS_TO_DECIDE,
  ].join('\n')}\n`;
}

// The frames measure-reference.mjs --frames saved for this slug, widest first, as project paths.
export function listFrames(root, slug) {
  const rel = `${PROJECT_REFERENCE_DIR}/${slug}/frames`;
  const dir = safeProjectPath(root, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => /^\d+\.png$/u.test(name)).map(name => ({ path: `${rel}/${name}`, viewport: Number(name.slice(0, -4)) })).sort((a, b) => b.viewport - a.viewport);
}

// A distance.json from drift-report.mjs --reference, measured against this very contract.
export function readDistance(path, evidence) {
  let doc;
  try { doc = parseStrictJson(readFileSync(resolve(path), 'utf8'), { maxBytes: 4 * 1024 * 1024 }); }
  catch (e) { throw new Error(`--distance ${path}: ${e.message}`); }
  if (doc?.tool !== 'styleseed distance' || !Array.isArray(doc.rows)) throw new Error(`--distance ${path}: not a distance.json (drift-report.mjs --reference <slug> writes one beside DRIFT.md)`);
  if (doc.reference !== evidence.slug) throw new Error(`--distance ${path}: measured against reference:${doc.reference}, but the artifact selects reference:${evidence.slug}`);
  if (doc.contractHash !== contractHash(evidence)) throw new Error(`--distance ${path}: measured against another version of the reference:${evidence.slug} contract; run drift-report.mjs --reference ${evidence.slug} again`);
  for (const [index, row] of doc.rows.entries()) {
    if (!row || typeof row.id !== 'string' || !['keep', 'adapt', 'avoid'].includes(row.transfer) || typeof row.status !== 'string') throw new Error(`--distance ${path}: rows[${index}] is not a distance row; run drift-report.mjs --reference ${evidence.slug} again`);
  }
  return doc.rows;
}

// Everything the brief reads, validated: the artifact selects an approved generated reference
// contract, its manifest and bundle are current, and the distance (when given) is against this contract.
export function loadBriefInputs(args) {
  const root = resolve(args.projectRoot);
  if (!existsSync(root)) throw new Error(`--project-root ${args.projectRoot} does not exist`);
  const registry = loadProjectRegistry(root, { catalog: CATALOG });
  if (!registry) throw new Error(`${args.projectRoot} has no .styleseed registry (project.json and artifacts/index.json); the brief is written for a registry artifact`);
  const entry = registry.artifactMap.get(args.artifact);
  if (!entry) throw new Error(`--artifact ${args.artifact} is not in .styleseed/artifacts/index.json (${[...registry.artifactMap.keys()].join(', ') || 'no artifacts'})`);
  const grammar = entry.artifact.selection.grammar;
  if (!grammar.startsWith('reference:')) throw new Error(`artifact ${args.artifact} selects ${grammar}; a brief is written for an artifact that selects an approved reference:<slug> grammar`);
  const slug = grammar.slice('reference:'.length);
  const dir = `.styleseed/rulesets/${slug}`;
  const files = {};
  for (const name of CONTRACT_FILES) {
    const path = safeProjectPath(root, `${dir}/${name}`);
    if (!existsSync(path)) throw new Error(`Missing reference grammar contract file: ${dir}/${name} (run compile-contract.mjs --project-root <dir> --slug ${slug} --write, then approve)`);
    files[name] = readFileSync(path);
  }
  let named = null;
  try { const raw = JSON.parse(readFileSync(entry.path, 'utf8'))?.selection?.adapter; named = typeof raw === 'string' ? raw : null; } catch {}
  const evidence = checkGeneratedContract({ slug, files, fallback: entry.artifact.selection.fallback, artifactAdapter: named, catalog: CATALOG });
  if (!evidence) throw new Error(`${dir}/evidence.json is a hand-written contract; the brief is compiled from a generated contract (compile-contract.mjs)`);
  const resolveHint = `run resolve-context.mjs --project-root <dir> --artifact ${args.artifact}`;
  const manifestRel = `.styleseed/manifests/${args.artifact}.json`;
  const bundleRel = `.styleseed/bundles/${args.artifact}.md`;
  const manifestPath = safeProjectPath(root, manifestRel);
  const bundlePath = safeProjectPath(root, bundleRel);
  if (!existsSync(manifestPath) || !existsSync(bundlePath)) throw new Error(`${existsSync(manifestPath) ? bundleRel : manifestRel} is missing: ${resolveHint} first`);
  let manifest;
  try { manifest = parseStrictJson(readFileSync(manifestPath, 'utf8'), { maxBytes: 4 * 1024 * 1024 }); }
  catch (e) { throw new Error(`${manifestRel}: ${e.message} (${resolveHint})`); }
  const bundle = readFileSync(bundlePath, 'utf8');
  if (manifest?.selection?.grammar !== grammar) throw new Error(`${manifestRel} was compiled for ${manifest?.selection?.grammar ?? 'another grammar'}, not ${grammar}: ${resolveHint}`);
  if (manifest?.bundle?.sha256 !== sha256(bundle)) throw new Error(`${bundleRel} does not match ${manifestRel}: ${resolveHint}`);
  const compiledFrom = (manifest.sources || []).find(source => source.id === 'reference:evidence.json')?.sha256;
  if (compiledFrom !== sha256(files['evidence.json'].toString('utf8').trim())) throw new Error(`${bundleRel} was compiled from another version of ${dir}/evidence.json: ${resolveHint}`);
  const { decisions, invariants } = bundleConstraints(bundle);
  return {
    root, slug, evidence, adapter: manifest.selection.adapter, decisions, invariants,
    frames: listFrames(root, slug),
    distanceRows: args.distance ? readDistance(args.distance, evidence) : null,
  };
}

export function run(args, { log = console.error, out = text => process.stdout.write(text) } = {}) {
  const inputs = loadBriefInputs(args);
  const text = renderBrief({ artifactId: args.artifact, ...inputs, verdict: args.verdict });
  if (!args.write) {
    out(text);
    log(`dry run: nothing written; --write saves ${briefPath(args.artifact)}`);
    return { text, written: null };
  }
  mkdirSync(safeProjectPath(inputs.root, '.styleseed/briefs'), { recursive: true });
  writeFileSync(safeProjectPath(inputs.root, briefPath(args.artifact)), text);
  log(`brief for ${args.artifact} (reference:${inputs.slug}) → ${briefPath(args.artifact)}${args.verdict === null ? '; no verdict yet: ask the user what is wrong with the current screen, then run again with --verdict' : ''}`);
  return { text, written: briefPath(args.artifact) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
