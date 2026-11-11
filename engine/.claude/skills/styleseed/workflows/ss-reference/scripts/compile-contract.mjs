#!/usr/bin/env node
// Compile a measured reference into a generated contract that a person approves fact by fact.
//
//   node compile-contract.mjs --project-root <dir> --slug <slug> --measurements <dir>
//                             [--fallback <grammar>] [--adapter <id>] [--write [--force]]
//   node compile-contract.mjs --project-root <dir> --slug <slug> --approve --reviewer <name>
//   node compile-contract.mjs --project-root <dir> --slug <slug> --propose-decisions
//
// <measurements> is the measurements/ folder measure-reference.mjs wrote (facts.json, summary.json).
// Without an action flag the run is dry: it prints the counts per transfer and the files it would
// write. --write writes `.styleseed/rulesets/<slug>/evidence.json` (a draft) and renders the other
// five contract files from it (ss-resolve/scripts/reference-contract.mjs). Each fact and token axis
// gets a proposed transfer (keep · adapt · observe · avoid) that the person edits in evidence.json; a
// later --write keeps those edits for every fact that still exists, re-renders, and resets approval to
// draft when the contract changed. An approved contract is never overwritten without --force.
// --approve records the approval with the name the person typed in --reviewer (never read from git
// config or the environment), today's date, and the contract hash; an artifact can select
// reference:<slug> only then. --propose-decisions prints ledger entries for kept facts and kept token
// axes of an approved contract, for the person to paste into .styleseed/project.json; it writes nothing.
//
// The tool never decides what to copy. It writes only under <project-root>/.styleseed/rulesets/<slug>/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenValues } from './compare-screens.mjs';
import { STAYS_OPEN } from './measure-reference.mjs';
import {
  CONTRACT_AXES, CONTRACT_FILES, DEFAULT_TOKEN_TRANSFERS, GENERATOR_TOOL, RENDERED_FILES, TOKEN_AXES, TRANSFERS,
  contractHash, defaultTransfer, isApproved, isGeneratedEvidence, normalizeReferenceEvidence, proposeDecisions,
  renderContractFiles, renderedHashes, serializeEvidence,
} from '../../ss-resolve/scripts/reference-contract.mjs';
import { SAFE_ID, parseStrictJson, safeProjectPath, sha256 } from '../../ss-resolve/scripts/runtime-contract.mjs';
import { loadProjectRegistry } from '../../ss-resolve/scripts/project-registry.mjs';

const USAGE = 'usage: compile-contract.mjs --project-root <dir> --slug <slug> --measurements <dir> [--fallback <grammar>] [--adapter <id>] [--write [--force]]\n       compile-contract.mjs --project-root <dir> --slug <slug> --approve --reviewer <name>\n       compile-contract.mjs --project-root <dir> --slug <slug> --propose-decisions';
const CATALOG = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../ss-resolve/references/catalog.json'), 'utf8'));
const CONTROL = /[\u0000-\u001f\u007f]/u;
const today = () => new Date().toISOString().slice(0, 10);
const dirOf = slug => `.styleseed/rulesets/${slug}`;

export function parseArgs(argv) {
  const args = { projectRoot: null, slug: null, measurements: null, fallback: null, adapter: null, write: false, force: false, approve: false, reviewer: null, proposeDecisions: false };
  const value = (i, flag) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-root') args.projectRoot = value(i++, a);
    else if (a === '--slug') args.slug = value(i++, a);
    else if (a === '--measurements') args.measurements = value(i++, a);
    else if (a === '--fallback') args.fallback = value(i++, a);
    else if (a === '--adapter') args.adapter = value(i++, a);
    else if (a === '--reviewer') args.reviewer = value(i++, a);
    else if (a === '--write') args.write = true;
    else if (a === '--force') args.force = true;
    else if (a === '--approve') args.approve = true;
    else if (a === '--propose-decisions') args.proposeDecisions = true;
    else throw new Error(`unknown argument ${a}\n${USAGE}`);
  }
  if (!args.projectRoot) throw new Error(`--project-root <dir> is required\n${USAGE}`);
  if (!args.slug || !SAFE_ID.test(args.slug)) throw new Error('--slug must be a safe id such as ops-console (lowercase letters, digits, and hyphens)');
  const actions = [args.write && '--write', args.approve && '--approve', args.proposeDecisions && '--propose-decisions'].filter(Boolean);
  if (actions.length > 1) throw new Error(`${actions.join(' and ')} cannot run together: compile with --write, let a person review the transfers in evidence.json, then --approve, then --propose-decisions`);
  if (args.force && !args.write) throw new Error('--force only applies to --write');
  if (args.reviewer !== null && !args.approve) throw new Error('--reviewer only applies to --approve');
  if (args.approve && (args.reviewer === null || !args.reviewer.trim() || args.reviewer.length > 80 || CONTROL.test(args.reviewer))) throw new Error('--approve needs --reviewer <name>: the name of the person approving, as they type it (1-80 characters). The tool never fills it in.');
  if ((args.approve || args.proposeDecisions) && (args.measurements || args.fallback || args.adapter)) throw new Error(`${args.approve ? '--approve' : '--propose-decisions'} reads the existing evidence.json; drop --measurements, --fallback, and --adapter`);
  if (!args.approve && !args.proposeDecisions && !args.measurements) throw new Error(`--measurements <dir> is required: the measurements/ folder measure-reference.mjs wrote\n${USAGE}`);
  return args;
}

// facts.json and summary.json from one measure-reference run, and the robots.txt verdict its
// case.draft.json recorded (one level up), when there is one.
export function readMeasurements(dir) {
  const read = name => {
    const path = join(dir, name);
    if (!existsSync(path)) throw new Error(`${path} is missing: point --measurements at the measurements/ folder measure-reference.mjs wrote`);
    try { return parseStrictJson(readFileSync(path, 'utf8'), { maxBytes: 64 * 1024 * 1024 }); }
    catch (e) { throw new Error(`${path}: ${e.message}`); }
  };
  const facts = read('facts.json');
  const summary = read('summary.json');
  if (facts.factsVersion !== 1 || !Array.isArray(facts.facts)) throw new Error(`${join(dir, 'facts.json')}: expected factsVersion 1 and a facts array; re-measure with measure-reference.mjs`);
  if (typeof facts.url !== 'string' || typeof facts.observedAt !== 'string' || !Array.isArray(facts.viewports)) throw new Error(`${join(dir, 'facts.json')}: url, observedAt, and viewports are required; re-measure with measure-reference.mjs`);
  let robots = 'not-checked';
  const draft = join(dir, '..', 'case.draft.json');
  if (existsSync(draft)) {
    try { const verdict = JSON.parse(readFileSync(draft, 'utf8'))?.sources?.[0]?.robots; if (['allowed', 'disallowed', 'not-checked'].includes(verdict)) robots = verdict; } catch {}
  }
  return { facts, summary, robots };
}

// A fresh draft from one measurement: every fact with its default transfer (DEFAULT_TRANSFERS), the
// nine token axes with theirs, and the seven open questions of the twelve-axis draft. A kept derived
// fact gets an empty note: approval needs one sentence from the person there.
export function buildEvidence({ facts: doc, summary, robots = 'not-checked', slug, fallback, adapter }) {
  const measured = screenValues(summary);
  const facts = doc.facts.map(f => {
    const base = { id: f.id, axis: f.axis, level: f.level, ...(f.bound ? { bound: f.bound } : {}), viewport: f.viewport, value: f.value, ...(f.unit ? { unit: f.unit } : {}), source: 'S1' };
    const proposal = defaultTransfer(base);
    return { ...base, ...proposal, ...(proposal.transfer === 'keep' && base.level === 'derived' ? { note: '' } : {}) };
  });
  return {
    schemaVersion: 1, generator: { tool: GENERATOR_TOOL, factsVersion: doc.factsVersion }, slug, fallback, adapter,
    sources: [{ id: 'S1', url: doc.url, observedAt: doc.observedAt, viewports: [...doc.viewports], robots }],
    facts,
    tokens: { measured: Object.fromEntries(TOKEN_AXES.map(axis => [axis, measured[axis]])), transfer: { ...DEFAULT_TOKEN_TRANSFERS } },
    open: CONTRACT_AXES.map(([axis]) => axis).filter(axis => STAYS_OPEN[axis]).map(axis => ({ axis, question: STAYS_OPEN[axis] })),
    approval: { status: 'draft' },
  };
}

// Keep the person's edits: transfer, compare, and note for every (id, viewport) that still exists,
// the token transfers, and the open questions. New facts keep their defaults; vanished ones are listed.
export function mergeEvidence(fresh, existing) {
  const prior = new Map(existing.facts.map(f => [`${f.id}@${f.viewport}`, f]));
  const kept = [], added = [];
  const facts = fresh.facts.map(f => {
    const key = `${f.id}@${f.viewport}`;
    const old = prior.get(key);
    if (!old) { added.push(key); return f; }
    prior.delete(key);
    kept.push(key);
    const { transfer, compare, note, ...rest } = f;
    return { ...rest, transfer: old.transfer, ...(old.compare ? { compare: { ...old.compare } } : {}), ...(old.note !== undefined ? { note: old.note } : {}) };
  });
  const dropped = [...prior.values()].map(f => ({ key: `${f.id}@${f.viewport}`, transfer: f.transfer }));
  return { evidence: { ...fresh, facts, tokens: { measured: fresh.tokens.measured, transfer: { ...existing.tokens.transfer } }, open: existing.open.map(entry => ({ ...entry })) }, kept, added, dropped };
}

export function transferCounts(evidence) {
  const count = list => Object.fromEntries(TRANSFERS.map(t => [t, list.filter(x => x === t).length]));
  return { facts: count(evidence.facts.map(f => f.transfer)), tokens: count(TOKEN_AXES.map(axis => evidence.tokens.transfer[axis])) };
}
const countsText = counts => TRANSFERS.map(t => `${t} ${counts[t]}`).join(' · ');

function projectRootOf(args) {
  const root = resolve(args.projectRoot);
  if (!existsSync(root)) throw new Error(`--project-root ${args.projectRoot} does not exist`);
  return root;
}

// The existing generated evidence.json, read without the approval check (a stale approval is reset,
// not fatal). A hand-written contract in the same folder is never overwritten.
function readExisting(root, slug) {
  const rel = `${dirOf(slug)}/evidence.json`;
  const path = safeProjectPath(root, rel);
  if (!existsSync(path)) {
    const handWritten = RENDERED_FILES.filter(name => existsSync(safeProjectPath(root, `${dirOf(slug)}/${name}`)));
    if (handWritten.length) throw new Error(`${dirOf(slug)}/ already holds ${handWritten.join(', ')} without a generated evidence.json (a hand-written contract?). compile-contract.mjs does not overwrite it; move it away or pick another --slug`);
    return null;
  }
  const text = readFileSync(path, 'utf8');
  if (!isGeneratedEvidence(text)) throw new Error(`${rel} exists but is not a generated contract (a hand-written contract?). compile-contract.mjs does not overwrite it; move it away or pick another --slug`);
  return { text, evidence: normalizeReferenceEvidence(parseStrictJson(text, { maxBytes: 4 * 1024 * 1024 }), { file: rel, catalog: CATALOG, verifyApproval: false }) };
}

// --fallback: the flag, else the fallback of the one artifact selecting reference:<slug>, else the
// existing contract's. --adapter: the flag, else that artifact's adapter, else the existing
// contract's, else the project default. Both are validated against the catalog.
export function resolveSelection(root, args, existing, loadRegistry = () => loadProjectRegistry(root, { catalog: CATALOG })) {
  let selecting = null;
  const artifacts = () => {
    if (selecting) return selecting;
    let registry;
    try { registry = loadRegistry(); }
    catch (e) { throw new Error(`${e.message} (while looking for the artifact that selects reference:${args.slug}; fix the registry, or pass --fallback and --adapter)`); }
    selecting = { registry, list: registry ? registry.artifacts.filter(entry => entry.artifact.selection.grammar === `reference:${args.slug}`) : [] };
    return selecting;
  };
  const one = () => (artifacts().list.length === 1 ? artifacts().list[0].artifact : null);
  const fallback = args.fallback ?? one()?.selection.fallback ?? existing?.fallback ?? null;
  const grammars = Object.keys(CATALOG.grammars);
  if (!fallback) throw new Error(`--fallback <grammar> is required: ${artifacts().list.length ? `${artifacts().list.length} artifacts select reference:${args.slug}` : `no artifact selects reference:${args.slug} yet`}. Built-in grammars: ${grammars.join(', ')}`);
  if (!grammars.includes(fallback)) throw new Error(`--fallback ${fallback} is not a built-in grammar (${grammars.join(', ')})`);
  const adapter = args.adapter ?? one()?.selection.adapter ?? existing?.adapter ?? artifacts().registry?.project.defaults.adapter ?? null;
  const adapters = Object.keys(CATALOG.adapters);
  if (!adapter) throw new Error(`--adapter <id> is required (${adapters.join(', ')})`);
  if (!adapters.includes(adapter)) throw new Error(`--adapter ${adapter} is not an adapter (${adapters.join(', ')})`);
  return { fallback, adapter };
}

// Everything --write would write, without writing it.
export function planWrite(args) {
  const root = projectRootOf(args);
  const rel = `${dirOf(args.slug)}/evidence.json`;
  const existing = readExisting(root, args.slug);
  const measurements = readMeasurements(resolve(args.measurements));
  const { fallback, adapter } = resolveSelection(root, args, existing?.evidence ?? null);
  const fresh = buildEvidence({ ...measurements, slug: args.slug, fallback, adapter });
  const merged = existing ? mergeEvidence(fresh, existing.evidence) : { evidence: fresh, kept: [], added: fresh.facts.map(f => `${f.id}@${f.viewport}`), dropped: [] };
  const { rendered: _rendered, approval: _approval, ...contract } = normalizeReferenceEvidence(merged.evidence, { file: rel, catalog: CATALOG, verifyApproval: false });
  const hash = contractHash(contract);
  const prior = existing?.evidence ?? null;
  const priorApproved = Boolean(prior && isApproved(prior));
  const staleApproval = Boolean(prior && prior.approval.status === 'approved' && !priorApproved);
  const approval = priorApproved && prior.approval.contractHash === hash ? prior.approval : { status: 'draft' };
  const files = renderContractFiles({ ...contract, approval });
  const evidence = { ...contract, rendered: renderedHashes(files), approval };
  const text = serializeEvidence(evidence);
  const changed = !existing || existing.text !== text || RENDERED_FILES.some(name => {
    const path = safeProjectPath(root, `${dirOf(args.slug)}/${name}`);
    return !existsSync(path) || sha256(readFileSync(path)) !== sha256(files[name]);
  });
  return { root, rel, existing, evidence, text, files, merged, hash, prior, priorApproved, staleApproval, contractChanged: !prior || contractHash(prior) !== hash, changed };
}

function describePlan(plan, args, log, verb) {
  const counts = transferCounts(plan.evidence);
  log(`reference:${args.slug} — ${verb}`);
  log(`  facts: ${plan.evidence.facts.length} · ${countsText(counts.facts)}`);
  log(`  token axes: ${countsText(counts.tokens)}`);
  if (plan.existing) {
    log(`  person's transfers kept for ${plan.merged.kept.length} fact(s); new with defaults: ${plan.merged.added.length}${plan.merged.added.length ? ` (${plan.merged.added.join(', ')})` : ''}`);
    if (plan.merged.dropped.length) log(`  dropped ${plan.merged.dropped.length} fact(s) no longer in facts.json: ${plan.merged.dropped.map(d => `${d.key} (${d.transfer})`).join(', ')}`);
  }
  log(`  ${verb.startsWith('dry') ? 'would write' : 'wrote'}: ${CONTRACT_FILES.map(name => `${dirOf(args.slug)}/${name}`).join(', ')}`);
}

export function run(args, { log = console.log, warn = console.error, out = text => process.stdout.write(text), date = today() } = {}) {
  if (args.approve) return approve(args, { log, date });
  if (args.proposeDecisions) return propose(args, { warn, out });
  const plan = planWrite(args);
  if (!args.write) {
    describePlan(plan, args, log, 'dry run, nothing written');
    if (plan.existing && !plan.changed) log('  evidence.json and the rendered files would not change');
    else if (plan.priorApproved) log(`  evidence.json is approved (${plan.prior.approval.reviewer}, ${plan.prior.approval.date}); --write would need --force${plan.contractChanged ? ' and would reset approval to draft' : ''}`);
    return plan;
  }
  if (plan.existing && !plan.changed) { log(`reference:${args.slug} — evidence.json and the rendered files are unchanged; nothing written`); return plan; }
  if (plan.priorApproved && !args.force) {
    throw new Error(`${plan.rel} is approved (${plan.prior.approval.reviewer}, ${plan.prior.approval.date}); this --write would ${plan.contractChanged ? 'change the approved contract' : 're-render its files'}. Nothing was written. Pass --write --force to replace it${plan.contractChanged ? '; approval then resets to draft' : '; the approval stays because the contract itself is unchanged'}.`);
  }
  const dir = safeProjectPath(plan.root, dirOf(args.slug));
  mkdirSync(dir, { recursive: true });
  // Rendered files first, evidence.json last: an interrupted write leaves hashes that do not match,
  // which the resolver refuses, rather than a half-new contract that looks approved.
  for (const name of RENDERED_FILES) writeFileSync(safeProjectPath(plan.root, `${dirOf(args.slug)}/${name}`), plan.files[name]);
  writeFileSync(safeProjectPath(plan.root, plan.rel), plan.text);
  describePlan(plan, args, log, 'written');
  if (plan.priorApproved && args.force) log(plan.contractChanged ? `  --force: replaced the approved contract (${plan.prior.approval.reviewer}, ${plan.prior.approval.date}); approval reset to draft` : '  --force: re-rendered the files of the approved contract; the contract is unchanged, so the approval stays');
  else if (plan.staleApproval) log('  the recorded approval no longer matched the contract; approval reset to draft');
  if (plan.evidence.approval.status === 'draft') log(`  approval: draft. Review the transfers in ${plan.rel} (keep · adapt · observe · avoid), run --write after editing, then --approve --reviewer <name>`);
  return plan;
}

function approve(args, { log, date }) {
  const root = projectRootOf(args);
  const rel = `${dirOf(args.slug)}/evidence.json`;
  const existing = readExisting(root, args.slug);
  if (!existing) throw new Error(`${rel} does not exist: run compile-contract.mjs --write first`);
  const evidence = existing.evidence;
  if (!evidence.rendered) throw new Error(`${rel} has no rendered hashes: run --write first, then --approve`);
  const fresh = renderedHashes(renderContractFiles(evidence));
  for (const name of RENDERED_FILES) {
    const path = safeProjectPath(root, `${dirOf(args.slug)}/${name}`);
    if (!existsSync(path)) throw new Error(`${dirOf(args.slug)}/${name} is missing: run --write first, then --approve`);
    if (sha256(readFileSync(path)) !== evidence.rendered[name] || evidence.rendered[name] !== fresh[name]) throw new Error(`${dirOf(args.slug)}/${name} does not match evidence.json (edited by hand, or evidence.json was edited after the last --write): run --write first, then --approve`);
  }
  const unexplained = evidence.facts.filter(f => f.transfer === 'keep' && f.level === 'derived' && !(f.note ?? '').trim());
  if (unexplained.length) throw new Error(`Not approved: ${unexplained.length} kept fact(s) are derived and have no note. A derived fact needs one sentence from the person saying why it holds. Add a "note" to each in ${rel} (or change its transfer), run --write, then --approve again:\n${unexplained.map(f => `  - ${f.id} @${f.viewport}`).join('\n')}`);
  const before = isApproved(evidence) ? evidence.approval : null;
  const { approval: _approval, ...rest } = evidence;
  const approved = { ...rest, approval: { status: 'approved', reviewer: args.reviewer, date, contractHash: contractHash(evidence) } };
  writeFileSync(safeProjectPath(root, rel), serializeEvidence(approved));
  log(`reference:${args.slug} approved by ${args.reviewer} on ${date} (contract ${approved.approval.contractHash})${before ? `; replaces the approval by ${before.reviewer} on ${before.date}` : ''}`);
  log(`  an artifact may now select reference:${args.slug} (fallback ${evidence.fallback}, adapter ${evidence.adapter}); compile it with resolve-context.mjs`);
  return approved;
}

function propose(args, { warn, out }) {
  const root = projectRootOf(args);
  const rel = `${dirOf(args.slug)}/evidence.json`;
  const path = safeProjectPath(root, rel);
  if (!existsSync(path)) throw new Error(`${rel} does not exist: run compile-contract.mjs --write and --approve first`);
  const text = readFileSync(path, 'utf8');
  if (!isGeneratedEvidence(text)) throw new Error(`${rel} is not a generated contract; decisions are proposed from generated contracts only`);
  const evidence = normalizeReferenceEvidence(parseStrictJson(text, { maxBytes: 4 * 1024 * 1024 }), { file: rel, catalog: CATALOG });
  if (evidence.approval.status !== 'approved') throw new Error(`${rel} is a draft: decisions are proposed from an approved contract only. Run --approve --reviewer <name> first`);
  const skipped = [];
  const proposals = proposeDecisions(evidence, { onSkip: message => skipped.push(message) });
  out(`${JSON.stringify(proposals, null, 2)}\n`);
  warn(`${proposals.length} proposal(s) printed. Paste them into "decisions" in .styleseed/project.json and give each an id (D-NNN); nothing was written.`);
  for (const message of skipped) warn(`  not proposed: ${message}`);
  return proposals;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(e.message); process.exit(1); }
}
