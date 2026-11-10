// S1 fifth-screen drift: metric, decision and top-up rules, pre-registered inputs, runner guards,
// isolated home, preflight and replacement. No network, no browser, no model: the Codex binary is
// a local stub, and only --plan, --prepare for the no-skill arm, --preflight against the stub,
// refusals, --replace and --report on synthetic data are exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyFailures, driftMetric, loadRun, separates, summarizeArm } from '../s1-drift-metric.mjs';
import {
  AGENT_GIT_IDENTITY, AUTH_MARKER, FROZEN_FILES, ISOLATED_CONFIG_KEYS, MAX_REMEASURES, MAX_REPLACEMENTS, NEUTRAL_AGENTS, PREFLIGHT_PROMPT,
  buildPlan, checkIsolatedHome, findGlobalSkills, floorEnvironment, floorReasons, guardGlobalSkills, loadProtocol, nodeModulesMismatches,
  parseArgs, parseCodexHeader, playwrightCacheDefault, preflightCommand, releaseAuthLink, remeasureEligibility, renderPrompt,
  resolveSessionEnv, sessionEnvironment, sessionFailure, treeInventory,
} from '../run-s1-drift.mjs';

const repo = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const runner = join(repo, 'scripts/run-s1-drift.mjs');
const metricCli = join(repo, 'scripts/s1-drift-metric.mjs');
const driftDir = join(repo, 'research/design-judgment/drift');
const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const windows = process.platform === 'win32';

function temporary(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 's1-drift-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(script, args, env = {}, cwd = repo) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 120000, env: { ...process.env, ...env } });
  assert.equal(result.error, undefined);
  return result;
}
// A Codex stand-in: --version, and `exec` printing a log header from its own arguments (or
// STUB_MODEL), the session variables it received, and a one-word last message. With
// STUB_REPLACE_AUTH=<session number> or =preflight it replaces the auth link with a regular file,
// as a token refresh that rewrites the file would.
const STUB = `import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
if (args[0] === '--version') console.log('codex-cli 0.0.0-test');
else if (args[0] === 'exec') {
  const effort = (args.find(arg => arg.startsWith('model_reasoning_effort=')) || '=').split('=')[1].replace(/"/g, '');
  console.log('OpenAI Codex v0.0.0-test (stub)\\n--------');
  console.log('model: ' + (process.env.STUB_MODEL || value('--model')));
  console.log('reasoning effort: ' + effort + '\\n--------');
  for (const key of ['HOME', 'CODEX_HOME', 'PLAYWRIGHT_BROWSERS_PATH', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) {
    console.log(key + '=' + (process.env[key] ?? '<unset>'));
  }
  const session = (value('-o').match(/sessions.(\\d+).last-message/) || [])[1] || 'preflight';
  if (process.env.STUB_REPLACE_AUTH === session) {
    const auth = join(process.env.CODEX_HOME, 'auth.json');
    unlinkSync(auth);
    writeFileSync(auth, 'refreshed-token');
  }
  writeFileSync(value('-o'), 'ready\\n');
}
`;
// A stand-in for node_modules/next/dist/bin/next (CommonJS): records its HOME, serves 200.
const FAKE_NEXT = `const http = require('http');
require('fs').appendFileSync(process.env.S1_TEST_FLOOR_HOME_FILE, 'serve ' + process.env.HOME + '\\n');
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end('<!doctype html><title>stub</title><h1>stub</h1>');
}).listen(port, '127.0.0.1');
`;
// The agent's build script in the stub runs: records the HOME it was given.
const RECORD_HOME = "require('fs').appendFileSync(process.env.S1_TEST_FLOOR_HOME_FILE, process.argv[2] + ' ' + process.env.HOME + '\\n');\n";
// Isolated environment for runner subprocesses: no real skill folders, no real Codex, a dummy
// auth file in a fake Codex home.
function stubEnv(root, skillDirs = join(root, 'no-skills')) {
  const stub = join(root, 'fake-codex.mjs');
  if (!existsSync(stub)) writeFileSync(stub, STUB);
  mkdirSync(join(root, 'codex-home'), { recursive: true });
  if (!existsSync(join(root, 'codex-home', 'auth.json'))) writeFileSync(join(root, 'codex-home', 'auth.json'), 'dummy');
  return { S1_DRIFT_GLOBAL_SKILL_DIRS: skillDirs, S1_DRIFT_CODEX_BIN: stub, CODEX_HOME: join(root, 'codex-home') };
}
// Every symlink under a folder, without following any.
function symlinksUnder(dir) {
  const found = [];
  const visit = path => {
    let entries;
    try { entries = readdirSync(path, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) found.push(child);
      else if (entry.isDirectory()) visit(child);
    }
  };
  visit(dir);
  return found;
}
const tomlKeys = text => {
  const keys = [];
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const header = line.match(/^\[(.+)\]$/u);
    if (header) { section = header[1]; continue; }
    const key = line.match(/^([A-Za-z0-9_]+)\s*=/u);
    assert.ok(key, `unexpected config line: ${line}`);
    keys.push(section ? `${section}.${key[1]}` : key[1]);
  }
  return keys.sort();
};

const summary = ({ accent = '#533afd', ink = '#1a1a1a', canvas = '#ffffff', base = 8, radii = [4], fonts = ['system-ui'], sizes = [14, 20], heights = [40] } = {}) => ({
  accentDerived: accent, ink, canvas, spacingBase: base, spacingScale: [8, 16], offScale: [],
  typeStepDetail: sizes.map(px => ({ px, share: 0.5, weight: '400', lineHeight: '20' })),
  radii, fonts: fonts.map(family => ({ family, count: 10 })), controlHeights: heights,
});
const five = overrides => overrides.map((override, i) => ({ id: `s${i + 1}`, summary: summary(override) }));

test('metric: accent changes on screens 3 and 5 and a new radius on screen 4 give exact counts against screen 1', () => {
  const m = driftMetric(five([{}, {}, { accent: '#e11d48' }, { radii: [4, 12] }, { accent: '#0f766e' }]));
  assert.equal(m.accentChanges, 2);
  assert.equal(m.inkChanges, 0);
  assert.equal(m.canvasChanges, 0);
  assert.equal(m.spacingBaseChanges, 0);
  assert.equal(m.newRadii, 1);
  assert.equal(m.newFonts, 0);
  assert.equal(m.primary, 3);
  assert.deepEqual(m.secondary, { newTypeSizes: 0, newControlHeights: 0 });
  assert.deepEqual(m.detail.accent.filter(entry => entry.changed).map(entry => entry.screen), ['s3', 's5']);
  assert.deepEqual(m.detail.newRadii, [12]);
  assert.deepEqual(m.distinct, { accent: 3, typeSizes: 2, radii: 2, controlHeights: 1, fonts: 1 });
  assert.deepEqual(m.baselineIncomplete, []);
  assert.equal(m.baseline.screen, 's1');
});

test('metric: the baseline is screen 1, not the majority', () => {
  const m = driftMetric(five([{ accent: '#e11d48' }, {}, {}, {}, {}]));
  assert.equal(m.baseline.accent, '#e11d48');
  assert.equal(m.accentChanges, 4);
});

test('metric: colours within 24 do not count, exactly 24 does not count, 25 does', () => {
  // #533afd = rgb(83, 58, 253); #6b3afd is 24 away, #6c3afd is 25 away.
  const near = driftMetric(five([{}, { accent: '#5a40ff' }, { ink: '#202020' }, { canvas: '#f4f4f4' }, { accent: '#6b3afd' }]));
  assert.equal(near.accentChanges, 0);
  assert.equal(near.inkChanges, 0);
  assert.equal(near.canvasChanges, 0);
  assert.equal(near.detail.accent.find(entry => entry.screen === 's5').distance, 24);
  assert.equal(near.primary, 0);
  const far = driftMetric(five([{}, {}, {}, {}, { accent: '#6c3afd' }]));
  assert.equal(far.accentChanges, 1);
});

test('metric: a missing accent on screen 1 uses the first screen that has one and is flagged', () => {
  const m = driftMetric(five([{ accent: null }, { accent: null }, {}, {}, { accent: '#e11d48' }]));
  assert.deepEqual(m.baselineIncomplete, ['accent']);
  assert.equal(m.baseline.accent, '#533afd');
  assert.equal(m.baseline.accentFrom, 's3');
  assert.equal(m.accentChanges, 2, 'screen 2 has no accent and screen 5 differs');
  assert.match(m.notes.join(' '), /Screen 1 \(s1\) has no accent; the accent baseline is taken from s3/u);
  const none = driftMetric(five([{ accent: null }, { accent: null }, { accent: null }, { accent: null }, { accent: null }]));
  assert.equal(none.accentChanges, 0);
  assert.equal(none.baseline.accentFrom, null);
  assert.match(none.notes.join(' '), /No screen has an accent/u);
});

test('metric: type sizes and control heights land in secondary only; spacing base and fonts count', () => {
  const m = driftMetric(five([{}, { sizes: [14, 20, 32] }, { heights: [40, 28] }, {}, {}]));
  assert.equal(m.primary, 0);
  assert.deepEqual(m.secondary, { newTypeSizes: 1, newControlHeights: 1 });
  assert.equal('newTypeSizes' in m, false);
  assert.equal('newControlHeights' in m, false);
  const p = driftMetric(five([{}, { base: 4 }, { fonts: ['system-ui', 'Inter'] }, {}, { base: null }]));
  assert.equal(p.spacingBaseChanges, 2);
  assert.equal(p.newFonts, 1);
  assert.equal(p.primary, 3);
  assert.equal(driftMetric(five([{ base: null }, { base: null }, {}, { base: null }, { base: null }])).spacingBaseChanges, 1);
});

test('summarizeArm: median and range over valid runs; invalid runs are listed with their kind, not dropped', () => {
  const s = summarizeArm([
    { run: 'a/run-1', valid: true, primary: 2 },
    { run: 'a/run-2', valid: true, primary: 5 },
    { run: 'a/run-3', valid: false, invalidKind: 'agent', primary: 0, reasons: ['npm run build failed'] },
    { run: 'a/run-4', valid: true, primary: 3 },
    { run: 'a/run-5', valid: false, invalidKind: 'infrastructure', primary: null, reasons: ['runner error: browser launch failed'] },
  ]);
  assert.equal(s.validRuns, 3);
  assert.equal(s.sufficient, true);
  assert.equal(s.median, 3);
  assert.equal(s.min, 2);
  assert.equal(s.max, 5);
  assert.equal(s.range, 3);
  assert.deepEqual(s.invalid, [
    { run: 'a/run-3', kind: 'agent', reasons: ['npm run build failed'] },
    { run: 'a/run-5', kind: 'infrastructure', reasons: ['runner error: browser launch failed'] },
  ]);
  assert.equal(s.invalidAgent, 1);
  assert.equal(s.invalidInfrastructure, 1);
  assert.equal(summarizeArm([{ valid: true, primary: 1 }, { valid: true, primary: 4 }]).median, 2.5);
  assert.equal(summarizeArm([{ valid: true, primary: 1 }, { valid: true, primary: 4 }]).sufficient, false);
});

test('separates: true only when the gap exceeds the larger range; equal medians and thin arms never separate', () => {
  assert.equal(separates({ median: 1, range: 1 }, { median: 4, range: 2 }), true);
  assert.equal(separates({ median: 1, range: 3 }, { median: 4, range: 2 }), false, 'a gap equal to the larger range is not enough');
  assert.equal(separates({ median: 1, range: 1 }, { median: 4, range: 4 }), false);
  assert.equal(separates({ median: 4, range: 0 }, { median: 1, range: 0 }), false, 'direction matters');
  assert.equal(separates({ median: 2, range: 0 }, { median: 2, range: 0 }), false);
  assert.equal(separates({ median: 0, range: 0, sufficient: false }, { median: 9, range: 0 }), false);
});

test('invalid-run classification: agent outcomes versus infrastructure', () => {
  assert.equal(classifyFailures([]), null);
  assert.equal(classifyFailures([{ kind: 'infrastructure', reason: 'runner error' }]), 'infrastructure');
  assert.equal(classifyFailures([{ kind: 'infrastructure', reason: 'model mismatch' }, { kind: 'agent', reason: 'build failed' }]), 'agent');
  const failure = (override = {}) => sessionFailure({ order: 1, result: { exitCode: 1, signal: null, error: null, timedOut: false }, lastMessage: '', changedFiles: 0, aborted: null, timeoutMinutes: 40, ...override });
  assert.equal(failure().kind, 'infrastructure', 'session 1 ending before any output is an outage');
  assert.match(failure().reason, /before producing any output/u);
  assert.equal(failure({ lastMessage: 'partial answer' }).kind, 'agent');
  assert.equal(failure({ changedFiles: 3 }).kind, 'agent');
  assert.equal(failure({ order: 2 }).kind, 'agent');
  assert.equal(failure({ changedFiles: null }).kind, 'agent', 'an unknown change count is not evidence of an outage');
  const timeout = failure({ order: 3, result: { exitCode: null, signal: 'SIGTERM', error: null, timedOut: true } });
  assert.equal(timeout.kind, 'agent');
  assert.match(timeout.reason, /timed out after 40 minutes/u);
  assert.equal(failure({ result: { exitCode: null, signal: null, error: 'spawn codex ENOENT', timedOut: false } }).kind, 'infrastructure');
  assert.equal(failure({ order: 4, aborted: 'SIGINT', changedFiles: 9 }).kind, 'infrastructure');
  assert.equal(failure({ result: { exitCode: 0, signal: null, error: null, timedOut: false } }), null);
});

test('screens.json: five screens in order, unique routes, pressure only on 4 and 5, task text of 1-3 from TASK.md', () => {
  const { screens } = readJson(join(driftDir, 'screens.json'));
  assert.equal(screens.length, 5);
  assert.deepEqual(screens.map(screen => screen.order), [1, 2, 3, 4, 5]);
  assert.equal(new Set(screens.map(screen => screen.route)).size, 5);
  assert.equal(new Set(screens.map(screen => screen.id)).size, 5);
  assert.deepEqual(screens.filter(screen => screen.pressure).map(screen => screen.order), [4, 5]);
  assert.equal(screens[3].pressure, 'Make this one feel more modern than the rest of the app.');
  assert.equal(screens[4].pressure, 'This page is for power users; make it as compact as you can.');
  for (const screen of screens) {
    assert.ok(screen.title && screen.task && screen.states.length, screen.id);
    assert.match(screen.route, /^\/[a-z0-9/-]+$/u, `${screen.id} has a fixed route`);
  }
  const task = readFileSync(join(repo, 'research/design-judgment/common/TASK.md'), 'utf8').replace(/\s+/gu, ' ');
  for (const screen of screens.slice(0, 3)) assert.ok(task.includes(screen.task.replace(/\s+/gu, ' ')), `${screen.id} task text is copied from TASK.md`);
});

test('arms.json: the baseline round has exactly three arms and every skill arm has a pin field', () => {
  const { arms } = readJson(join(driftDir, 'arms.json'));
  assert.deepEqual(arms.filter(arm => arm.round === 'baseline').map(arm => arm.id), ['bare', 'hallmark-lock', 'styleseed']);
  assert.deepEqual(arms.filter(arm => arm.round === 're-measure').map(arm => arm.id), ['frontend-design', 'taste']);
  for (const arm of arms) {
    assert.ok(arm.label && arm.methodLine && arm.setup.length, arm.id);
    assert.ok(['A', 'B'].includes(arm.kit), arm.id);
    if (arm.skill !== null) assert.ok(Object.hasOwn(arm.skill, 'pin'), `${arm.id} has a pin field`);
  }
  for (const arm of arms.filter(item => item.round === 'baseline' && item.skill)) assert.ok(arm.skill.pin, `${arm.id} is pinned before the baseline`);
  for (const arm of arms.filter(item => item.round === 're-measure')) assert.equal(arm.skill.pin, null, `${arm.id} stays unpinned and unverified until its amendment`);
  const hallmark = arms.find(arm => arm.id === 'hallmark-lock');
  assert.match(hallmark.skill.pin.treeHash, /^sha256:[0-9a-f]{64}$/u);
  const styleseed = arms.find(arm => arm.id === 'styleseed').skill.pin;
  assert.match(styleseed.engineRevision, /^sha256:[0-9a-f]{64}$/u);
  assert.match(styleseed.repositoryCommit, /^[0-9a-f]{40}$/u);
  const protocol = loadProtocol();
  assert.deepEqual(protocol.arms.map(arm => arm.id), arms.map(arm => arm.id));
  assert.ok(readFileSync(join(driftDir, 'PROTOCOL.md'), 'utf8').includes(styleseed.engineRevision), 'the protocol names the same engine pin');
});

test('prompts: identical across arms except the method line; no visual values restated; only session 1 gets the brand inputs', () => {
  const protocol = loadProtocol();
  for (const screen of protocol.screens) {
    const texts = protocol.arms.map(arm => renderPrompt(protocol, arm, screen).replace(arm.methodLine, '<method>'));
    assert.equal(new Set(texts).size, 1, `session ${screen.order}`);
    const text = texts[0];
    assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b|\b(?:font|fonts|radius|radii|spacing|rem|oklch|rgb)\b/iu, `session ${screen.order} restates a visual value`);
    assert.equal(text.includes('DESIGN-INPUTS.json'), screen.order === 1);
    assert.equal(text.includes('This repository already has screens. Add the next one.'), screen.order > 1);
    assert.equal(text.includes(screen.route), true);
    assert.equal(Boolean(screen.pressure) && text.includes(screen.pressure), screen.order >= 4);
  }
});

test('protocol file pins the status line, the decision, top-up and kill rules, the endpoint and every method line', () => {
  const text = readFileSync(join(driftDir, 'PROTOCOL.md'), 'utf8');
  for (const sentence of [
    'Pre-registered 2026-11-10. No run has been performed. No expert review.',
    'Per arm, the summary is the **median primary endpoint over at least three valid runs**, with the range.',
    '"Arm X separates from arm Y" iff `median(X) < median(Y)` and `median(Y) − median(X) > max(range(X), range(Y))`.',
    'Top-up rule: a run that is invalid for an infrastructure reason (dependency install failure, harness crash, network outage before session 1 produced output, operator abort) may be replaced, at most two replacements per arm per round, each recorded with its reason. A run that is invalid because a session failed, timed out, or broke the functional floor is an agent outcome: it is reported as invalid and is NOT replaced. An arm with fewer than three valid runs after replacements gets no summary.',
    'Kill rule: if, at re-measure, `styleseed` does not separate from `bare`, the README sentence that claims strength on many screens is removed or reworded to what was measured, and the north-star metric is re-opened. If it does not separate from `hallmark-lock`, the comparison table says so.',
    '**`primary` = accentChanges + inkChanges + canvasChanges + spacingBaseChanges + newRadii + newFonts.**',
    '**The baseline is screen 1**, not the majority.',
    'the baseline round runs from a checkout at the pinned revision; the re-measure round re-pins and records it as an amendment',
    'An arm with fewer than three valid runs after replacements gets no summary. Replacement is not discretionary: every infrastructure-invalid run is replaced, in run-index order, until the arm\'s two replacements are used.',
  ]) assert.ok(text.includes(sentence), sentence);
  // Wrapped prose: compare with whitespace collapsed.
  const flat = text.replace(/\s+/gu, ' ');
  for (const sentence of [
    'A completed outcome is measured again, not regenerated',
    'every failure is `infrastructure` in phase `floor`',
    'runs at most three times per run. `--replace` refuses a run that qualifies for `--remeasure`.',
    'Every failure also records its phase: `sessions` (the session loop) or `floor`',
    'Codex replaced the auth link in the isolated home (the run stops at once, section 10)',
    'the runner records an infrastructure failure, stops the run (no later session, no floor), and writes `<out>/AUTH-REPLACED.txt`',
    'The runner never reads, copies, moves or deletes either file. `--run`, `--replace` and `--preflight` refuse to start while the marker exists',
    'For every `codex` child process the runner changes `HOME`, `CODEX_HOME` and the frozen `sessionEnv` below.',
    '`GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` = `s1-drift-agent`, `GIT_AUTHOR_EMAIL` and `GIT_COMMITTER_EMAIL` = `s1-drift-agent@localhost`',
    'They run with `HOME` (and `USERPROFILE` on Windows) set to a fresh empty folder `<out>/home/floor/<arm>-run-<n>-<id>/`',
    'The home directory is shielded',
    'The rest of the file system and the network are not shielded, so use a disposable machine account.',
    'is `pending`: it gets no summary and no separation verdict, and the report names the command that resolves it.',
  ]) assert.ok(flat.includes(sentence), sentence);
  assert.equal(flat.includes('nothing else in the runner\'s environment changes'), false, 'the old sentence is gone');
  for (const arm of readJson(join(driftDir, 'arms.json')).arms) assert.ok(text.includes(arm.methodLine), `${arm.id} method line`);
  assert.deepEqual([...text.matchAll(/^## (\d+)\. /gmu)].map(match => Number(match[1])).slice(0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(MAX_REPLACEMENTS, 2);
  assert.equal(MAX_REMEASURES, 3);
});

test('runner arguments: one mode per call, required options, mode-specific options', () => {
  assert.equal(parseArgs([]).mode, 'plan');
  assert.equal(parseArgs(['--plan']).runs, 3);
  assert.equal(parseArgs(['--plan']).effort, 'high');
  assert.throws(() => parseArgs(['--plan', '--prepare']), /one mode/u);
  assert.throws(() => parseArgs(['--prepare']), /--out/u);
  assert.throws(() => parseArgs(['--preflight']), /--out/u);
  assert.throws(() => parseArgs(['--run', '--out', 'x', '--arm', 'bare']), /--run-index/u);
  assert.throws(() => parseArgs(['--replace', '--out', 'x', '--run-index', '1']), /--arm/u);
  assert.throws(() => parseArgs(['--remeasure', '--out', 'x', '--arm', 'bare']), /--run-index/u);
  assert.throws(() => parseArgs(['--remeasure', '--out', 'x', '--arm', 'bare', '--run-index', '1', '--node-modules', 'nm']), /does not apply/u);
  assert.equal(parseArgs(['--remeasure', '--out', 'x', '--arm', 'bare', '--run-index', '2', '--browser', 'pw.mjs']).runIndex, 2);
  assert.throws(() => parseArgs(['--plan', '--out', 'x']), /does not apply/u);
  assert.throws(() => parseArgs(['--run', '--out', 'x', '--arm', 'bare', '--run-index', '1', '--model', 'm']), /does not apply/u);
  assert.throws(() => parseArgs(['--preflight', '--out', 'x', '--arm', 'bare']), /does not apply/u);
  assert.throws(() => parseArgs(['--plan', '--effort', 'extreme']), /--effort/u);
  assert.throws(() => parseArgs(['--plan', '--runs', '0']), /--runs/u);
  assert.throws(() => parseArgs(['--plan', '--bogus']), /Unknown argument/u);
  assert.throws(() => parseArgs(['--run', '--out', 'x', '--arm', 'bare', '--run-index', '1', '--no-isolated-home']), /only together with --allow-global-skills/u);
  assert.throws(() => parseArgs(['--prepare', '--out', 'x', '--no-isolated-home']), /only together with --allow-global-skills/u);
  assert.equal(parseArgs(['--run', '--out', 'x', '--arm', 'bare', '--run-index', '1', '--no-isolated-home', '--allow-global-skills']).noIsolatedHome, true);
  assert.deepEqual(parseArgs(['--prepare', '--out', 'x', '--skill-dir', 'hallmark-lock=/a=b']).skillDirs, { 'hallmark-lock': '/a=b' });
});

test('--plan is deterministic, lists 3 arms x 3 runs x 5 sessions, writes nothing, and names no path inside the checkout', t => {
  const cwd = temporary(t);
  const first = run(runner, ['--plan'], {}, cwd);
  const second = run(runner, [], {}, repo);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.equal(first.stdout, buildPlan());
  assert.deepEqual(readdirSync(cwd), []);
  const sessions = first.stdout.split('\n').filter(line => /^\s+session [1-5] /u.test(line));
  assert.equal(sessions.length, 45);
  for (const line of sessions) assert.match(line, /HOME=<out>\/home\/sessions\/\S+ CODEX_HOME=<out>\/home\/sessions\/\S+\/\.codex <sessionEnv> codex exec /u);
  for (const [key, value] of Object.entries(AGENT_GIT_IDENTITY)) assert.ok(first.stdout.includes(`${key}=${value}`), key);
  assert.match(first.stdout, /PLAYWRIGHT_BROWSERS_PATH = your value when set; else the platform default cache/u);
  assert.match(first.stdout, /--remeasure --out <out> --arm <id> --run-index <n>/u);
  assert.match(first.stdout, /HOME=<out>\/home\/floor\/bare-run-1-<id>/u);
  for (const arm of ['bare', 'hallmark-lock', 'styleseed']) {
    for (const n of [1, 2, 3]) {
      assert.ok(first.stdout.includes(`--arm ${arm} --run-index ${n}`), `${arm} run ${n}`);
      for (const order of [1, 2, 3, 4, 5]) assert.ok(first.stdout.includes(`<out>/${arm}/run-${n}/prompts/session-${order}.md`));
    }
  }
  assert.match(first.stdout, /--preflight --out <out>/u);
  assert.match(first.stdout, /codex exec --skip-git-repo-check -C <out>\/home\/preflight\/<id>\/work/u);
  assert.match(first.stdout, /--replace --out <out> --arm <id> --run-index <n>/u);
  for (const form of new Set([repo, repo.split('\\').join('/'), realpathSync(repo)])) assert.equal(first.stdout.includes(form), false, form);
  assert.match(first.stdout, /Codex sessions in total: 45\./u);
  const remeasure = buildPlan({ round: 're-measure' });
  assert.equal(remeasure.split('\n').filter(line => /^\s+session [1-5] /u.test(line)).length, 75);
  assert.match(remeasure, /taste: kit arm A; .*NOT PINNED/u);
});

test('codex log header and functional floor helpers', () => {
  assert.deepEqual(parseCodexHeader('OpenAI Codex v0.166.0\n--------\nworkdir: /w\nmodel: gpt-x\nprovider: openai\nreasoning effort: high\n--------\nuser\n'), { model: 'gpt-x', effort: 'high' });
  assert.deepEqual(parseCodexHeader('nothing here'), { model: null, effort: null });
  const ok = { route: '/a', viewport: '1440', status: 200, pageErrors: [], overflow: true };
  assert.deepEqual(floorReasons([ok, { ...ok, viewport: '390', overflow: false }]), []);
  assert.equal(floorReasons([{ ...ok, viewport: '390', overflow: true }]).length, 1);
  assert.equal(floorReasons([{ ...ok, viewport: '390', overflow: null }]).length, 1, 'an unchecked overflow fails closed');
  assert.equal(floorReasons([{ ...ok, status: 404 }, { ...ok, pageErrors: ['boom'] }]).length, 2);
});

test('preflight command: one trivial codex exec in an empty folder under the isolated home, with HOME, CODEX_HOME and the frozen sessionEnv changed', () => {
  const destination = resolve('/round');
  const env = { PATH: '/usr/bin', HOME: '/Users/operator', CODEX_HOME: '/Users/operator/.codex', OTHER: 'kept', S1_DRIFT_CODEX_BIN: '/stub/fake-codex.mjs' };
  const frozen = preflightCommand({ freeze: { codex: { model: 'test-model', effort: 'high' }, isolation: { sessionEnv: { ...AGENT_GIT_IDENTITY } } }, destination, id: 'p1', env: { ...env, PLAYWRIGHT_BROWSERS_PATH: '/stale', GIT_AUTHOR_NAME: 'operator' } });
  assert.deepEqual(frozen.env, { ...env, ...AGENT_GIT_IDENTITY, HOME: join(destination, 'home', 'preflight', 'p1'), CODEX_HOME: join(destination, 'home', 'preflight', 'p1', '.codex') },
    'the frozen set replaces the operator values, and a sessionEnv variable missing from it is removed');
  const command = preflightCommand({ freeze: { codex: { model: 'test-model', effort: 'high' } }, destination, id: 'p1', env });
  const home = join(destination, 'home', 'preflight', 'p1');
  assert.equal(command.home, home);
  assert.equal(command.work, join(home, 'work'));
  assert.deepEqual(command.codexArgs, ['exec', '--skip-git-repo-check', '-C', join(home, 'work'), '--sandbox', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true',
    '-c', 'model_reasoning_effort="high"', '--model', 'test-model', '--color', 'never', '-o', join(home, 'last-message.md'), '-']);
  assert.equal(command.bin, process.execPath);
  assert.deepEqual(command.args, [resolve('/stub/fake-codex.mjs'), ...command.codexArgs]);
  assert.deepEqual(command.env, { ...env, HOME: home, CODEX_HOME: join(home, '.codex') });
  assert.equal(command.prompt, PREFLIGHT_PROMPT);
  assert.match(command.prompt, /exactly one word/u);
  assert.deepEqual(sessionEnvironment({ PATH: 'p', HOME: 'h', X: 'y' }, '/iso'), { PATH: 'p', HOME: '/iso', CODEX_HOME: join('/iso', '.codex'), X: 'y' });
});

test('sessionEnv resolution: operator value, platform default caches for macOS, Linux and Windows, or absent', () => {
  const present = () => true;
  const absent = () => false;
  const mac = resolveSessionEnv({ platform: 'darwin', env: { HOME: '/Users/o' }, exists: present });
  assert.deepEqual(mac.browserCache, { source: 'platform-default', path: '/Users/o/Library/Caches/ms-playwright' });
  assert.deepEqual(mac.sessionEnv, { ...AGENT_GIT_IDENTITY, PLAYWRIGHT_BROWSERS_PATH: '/Users/o/Library/Caches/ms-playwright' });
  assert.equal(resolveSessionEnv({ platform: 'linux', env: { HOME: '/home/o' }, exists: present }).sessionEnv.PLAYWRIGHT_BROWSERS_PATH, '/home/o/.cache/ms-playwright');
  const windowsEnv = { USERPROFILE: 'C:\\Users\\o', LOCALAPPDATA: 'C:\\Users\\o\\AppData\\Local' };
  assert.equal(resolveSessionEnv({ platform: 'win32', env: windowsEnv, exists: present }).sessionEnv.PLAYWRIGHT_BROWSERS_PATH, 'C:\\Users\\o\\AppData\\Local\\ms-playwright');
  assert.equal(playwrightCacheDefault('win32', { USERPROFILE: 'C:\\Users\\o' }), 'C:\\Users\\o\\AppData\\Local\\ms-playwright');
  const checked = [];
  const operator = resolveSessionEnv({ platform: 'darwin', env: { HOME: '/Users/o', PLAYWRIGHT_BROWSERS_PATH: '/opt/browsers' }, exists: path => { checked.push(path); return false; } });
  assert.deepEqual(operator.browserCache, { source: 'operator', path: '/opt/browsers' });
  assert.equal(operator.sessionEnv.PLAYWRIGHT_BROWSERS_PATH, '/opt/browsers');
  assert.deepEqual(checked, [], "the operator's value is used as given");
  const none = resolveSessionEnv({ platform: 'linux', env: { HOME: '/home/o' }, exists: absent });
  assert.equal(none.browserCache.source, 'none');
  assert.match(none.browserCache.note, /No Playwright browser cache was available to the sessions/u);
  assert.equal('PLAYWRIGHT_BROWSERS_PATH' in none.sessionEnv, false);
  assert.deepEqual(none.sessionEnv, { ...AGENT_GIT_IDENTITY });
});

test('floor environment: agent-written code gets a throwaway HOME (and USERPROFILE on Windows), everything else unchanged', () => {
  const env = { PATH: '/usr/bin', HOME: '/Users/operator', USERPROFILE: 'kept-on-posix', npm_config_cache: '/old' };
  assert.deepEqual(floorEnvironment(env, '/out/home/floor/x', { platform: 'darwin', extra: { npm_config_cache: '/out/.npm-cache', NEXT_TELEMETRY_DISABLED: '1' } }),
    { PATH: '/usr/bin', HOME: '/out/home/floor/x', USERPROFILE: 'kept-on-posix', npm_config_cache: '/out/.npm-cache', NEXT_TELEMETRY_DISABLED: '1' });
  assert.deepEqual(floorEnvironment({ PATH: 'p', USERPROFILE: 'C:\\Users\\o' }, 'C:\\out\\home\\floor\\x', { platform: 'win32' }),
    { PATH: 'p', HOME: 'C:\\out\\home\\floor\\x', USERPROFILE: 'C:\\out\\home\\floor\\x' });
});

test('remeasure eligibility: five sessions, only infrastructure failures in the floor phase, at most three times', () => {
  const sessions = Array.from({ length: 5 }, (_, i) => ({ order: i + 1, exitCode: 0, commit: `c${i + 1}` }));
  const floorInfra = { kind: 'infrastructure', phase: 'floor', reason: 'runner error: browser launch failed' };
  const base = { valid: false, invalidKind: 'infrastructure', sessions, failures: [floorInfra], remeasured: 0 };
  assert.deepEqual(remeasureEligibility(base), { eligible: true, reason: null });
  assert.match(remeasureEligibility({ ...base, failures: [{ kind: 'infrastructure', phase: 'sessions', reason: 'model mismatch' }] }).reason, /sessions phase/u);
  assert.match(remeasureEligibility({ ...base, failures: [floorInfra, { kind: 'agent', phase: 'floor', reason: 'npm run build failed' }] }).reason, /agent failure/u);
  assert.match(remeasureEligibility({ ...base, sessions: sessions.slice(0, 2) }).reason, /2 of 5 sessions/u);
  assert.equal(remeasureEligibility({ ...base, remeasured: 2 }).eligible, true);
  assert.match(remeasureEligibility({ ...base, remeasured: 3 }).reason, /already remeasured 3 times/u);
  assert.equal(remeasureEligibility({ ...base, valid: true }).eligible, false);
  assert.equal(remeasureEligibility(null).eligible, false);
  assert.equal(remeasureEligibility({ ...base, failures: [] }).eligible, false);
});

test('node_modules clone check compares installed versions with the workspace lock', t => {
  const root = temporary(t);
  const lock = { packages: { '': { dependencies: { next: '^16' }, devDependencies: { '@scope/tool': '1' } }, 'node_modules/next': { version: '16.0.0' }, 'node_modules/@scope/tool': { version: '1.2.3' } } };
  mkdirSync(join(root, 'next'), { recursive: true });
  writeFileSync(join(root, 'next/package.json'), JSON.stringify({ version: '16.0.0' }));
  assert.deepEqual(nodeModulesMismatches(root, lock), [{ name: '@scope/tool', expected: '1.2.3', actual: null }]);
  mkdirSync(join(root, '@scope/tool'), { recursive: true });
  writeFileSync(join(root, '@scope/tool/package.json'), JSON.stringify({ version: '1.2.3' }));
  assert.deepEqual(nodeModulesMismatches(root, lock), []);
});

test('skill trees hash deterministically and refuse symlinks', t => {
  const root = temporary(t);
  mkdirSync(join(root, 'tree/references'), { recursive: true });
  writeFileSync(join(root, 'tree/SKILL.md'), '# skill\n');
  writeFileSync(join(root, 'tree/references/a.md'), 'a\n');
  const first = treeInventory(join(root, 'tree'));
  assert.equal(first.files, 2);
  assert.deepEqual(first.inventory.map(entry => entry.path), ['SKILL.md', 'references/a.md']);
  assert.equal(treeInventory(join(root, 'tree')).treeHash, first.treeHash);
  writeFileSync(join(root, 'tree/references/a.md'), 'b\n');
  assert.notEqual(treeInventory(join(root, 'tree')).treeHash, first.treeHash);
  if (!windows) {
    symlinkSync(join(root, 'tree/SKILL.md'), join(root, 'tree/link.md'));
    assert.throws(() => treeInventory(join(root, 'tree')), /symlink/u);
  }
});

test('global-skill guard for runs without isolation: a skills folder containing styleseed is refused unless allowed', t => {
  const root = temporary(t);
  const skills = join(root, 'skills');
  for (const name of ['styleseed', 'ss-build', 'design-taste-frontend', 'unrelated']) mkdirSync(join(skills, name), { recursive: true });
  const found = findGlobalSkills([skills, join(root, 'missing')]);
  assert.deepEqual(found.matched.map(item => item.name), ['design-taste-frontend', 'ss-build', 'styleseed']);
  assert.equal(found.dirs[1].exists, false);
  const env = { S1_DRIFT_GLOBAL_SKILL_DIRS: skills };
  assert.throws(() => guardGlobalSkills({ env }), /styleseed[\s\S]*--allow-global-skills/u);
  const allowed = guardGlobalSkills({ env, allow: true });
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.matched.length, 3);
  assert.deepEqual(guardGlobalSkills({ env: { S1_DRIFT_GLOBAL_SKILL_DIRS: join(root, 'missing') } }).matched, []);
});

test('--prepare refuses an existing folder, a folder inside the checkout, a missing auth file, and isolation off without the allow flag', t => {
  const root = temporary(t);
  const env = stubEnv(root);
  const existing = join(root, 'exists');
  mkdirSync(existing);
  let result = run(runner, ['--prepare', '--out', existing, '--arms', 'bare', '--model', 'm', '--allow-dirty'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists/u);
  assert.deepEqual(readdirSync(existing), []);
  const inside = join(repo, 'must-not-create-s1-drift');
  result = run(runner, ['--prepare', '--out', inside, '--arms', 'bare', '--model', 'm', '--allow-dirty'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /inside this checkout/u);
  assert.equal(existsSync(inside), false);
  result = run(runner, ['--prepare', '--out', join(root, 'no-parent', 'x'), '--arms', 'bare', '--model', 'm', '--allow-dirty'], env);
  assert.match(result.stderr, /does not exist/u);
  result = run(runner, ['--prepare', '--out', join(root, 'no-auth'), '--arms', 'bare', '--model', 'm', '--allow-dirty', '--codex-auth', join(root, 'missing-auth.json')], env);
  assert.match(result.stderr, /No Codex auth file/u);
  assert.equal(existsSync(join(root, 'no-auth')), false);
  result = run(runner, ['--prepare', '--out', join(root, 'open'), '--arms', 'bare', '--model', 'm', '--allow-dirty', '--no-isolated-home'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only together with --allow-global-skills/u);
  assert.equal(existsSync(join(root, 'open')), false);
  result = run(runner, ['--prepare', '--out', join(root, 'hash'), '--arms', 'hallmark-lock', '--runs', '1', '--model', 'm', '--allow-dirty', '--skill-dir', `hallmark-lock=${join(root, 'codex-home')}`], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /hashes to sha256:.*arms\.json pins/u);
  assert.equal(existsSync(join(root, 'hash')), false);
  result = run(runner, ['--prepare', '--out', join(root, 'unpinned'), '--round', 're-measure', '--arms', 'taste', '--model', 'm', '--allow-dirty'], env);
  assert.match(result.stderr, /taste has no pin/u);
  assert.equal(existsSync(join(root, 'unpinned')), false);
});

test('--prepare without isolation (allow flag) writes a frozen no-skill round without network or a model', t => {
  const root = temporary(t);
  const skills = join(root, 'skills');
  mkdirSync(join(skills, 'styleseed'), { recursive: true });
  const env = stubEnv(root, skills);
  const out = join(root, 'round');
  const result = run(runner, ['--prepare', '--out', out, '--arms', 'bare', '--runs', '1', '--model', 'test-model', '--allow-dirty', '--no-isolated-home', '--allow-global-skills'], env);
  assert.equal(result.status, 0, result.stderr);
  const freeze = readJson(join(out, 'freeze.json'));
  assert.equal(freeze.round, 'baseline');
  assert.equal(freeze.runs, 1);
  assert.deepEqual(Object.keys(freeze.arms), ['bare']);
  assert.equal(freeze.codex.model, 'test-model');
  assert.equal(freeze.codex.effort, 'high');
  assert.equal(freeze.codex.version, 'codex-cli 0.0.0-test');
  assert.equal(freeze.codex.sessionTimeoutMinutes, 40);
  assert.equal(freeze.repository.allowDirty, true);
  assert.match(freeze.repository.commit, /^[0-9a-f]{40}$/u);
  assert.equal(freeze.isolation.mode, 'none');
  assert.deepEqual(freeze.isolation.globalSkills.matched.map(item => item.name), ['styleseed']);
  assert.equal(freeze.isolation.globalSkills.allowed, true);
  assert.equal(existsSync(join(out, 'home')), false);
  assert.deepEqual(freeze.replacements, { maxPerArm: 2, appliesTo: 'infrastructure', order: 'run index', discretionary: false });
  assert.equal(freeze.remeasures.maxPerRun, 3);
  assert.equal(freeze.isolation.sessionEnv, null);
  assert.equal(freeze.isolation.sessionEnvApplied, false);
  for (const path of FROZEN_FILES) assert.equal(freeze.protocol[path], sha256(readFileSync(join(repo, path))), path);
  assert.deepEqual(freeze.screens.map(screen => screen.route), ['/resources', '/resources/res-102', '/settings', '/activity', '/review']);
  const base = join(out, 'bare', 'run-1');
  const workspace = join(base, 'workspace');
  assert.equal(readFileSync(join(workspace, 'AGENTS.md'), 'utf8'), NEUTRAL_AGENTS);
  for (const absent of ['TASK.md', 'PROMPT.md', '.agents', '.styleseed']) assert.equal(existsSync(join(workspace, absent)), false, absent);
  for (const present of ['DESIGN-INPUTS.json', 'BROWSER-CONTRACT.md', 'fixture/model.mjs', 'src/ui/button.tsx', 'package-lock.json', '.gitignore', '.git']) assert.ok(existsSync(join(workspace, present)), present);
  for (const order of [1, 2, 3, 4, 5]) {
    const prompt = join(base, 'prompts', `session-${order}.md`);
    assert.equal(sha256(readFileSync(prompt)), freeze.prompts.bare[`session-${order}`]);
  }
  assert.equal(existsSync(join(workspace, 'prompts')), false, 'prompts stay outside the workspace');
  assert.equal(treeInventory(join(out, 'bare', 'starter')).treeHash, freeze.starters.bare);
  assert.equal(spawnSync('git', ['log', '--format=%s'], { cwd: workspace, encoding: 'utf8' }).stdout.trim(), 'Starter');
  assert.equal(spawnSync('git', ['remote'], { cwd: workspace, encoding: 'utf8' }).stdout.trim(), '');

  // --run refuses what was not prepared, and an isolated run of a round prepared without isolation.
  let refused = run(runner, ['--run', '--out', out, '--arm', 'bare', '--run-index', '2'], env);
  assert.match(refused.stderr, /beyond the 1 run/u);
  refused = run(runner, ['--run', '--out', out, '--arm', 'styleseed', '--run-index', '1'], env);
  assert.match(refused.stderr, /was not prepared/u);
  refused = run(runner, ['--run', '--out', join(root, 'missing'), '--arm', 'bare', '--run-index', '1'], env);
  assert.match(refused.stderr, /does not exist/u);
  refused = run(runner, ['--run', '--out', out, '--arm', 'bare', '--run-index', '1'], env);
  assert.match(refused.stderr, /prepared without an isolated home/u);
  refused = run(runner, ['--preflight', '--out', out], env);
  assert.match(refused.stderr, /prepared without an isolated home/u);
  assert.equal(existsSync(join(base, 'sessions')), false);
  const again = run(runner, ['--prepare', '--out', out, '--arms', 'bare', '--model', 'm', '--allow-dirty', '--no-isolated-home', '--allow-global-skills'], env);
  assert.match(again.stderr, /already exists/u);
});

test('isolated home: template layout, auth link, minimal config, not-carried-over listing, guard and preflight', { skip: windows && 'symlinks need extra privileges on Windows' }, t => {
  const root = temporary(t);
  const real = join(root, 'real-codex');
  mkdirSync(join(real, 'memories'), { recursive: true });
  writeFileSync(join(real, 'AGENTS.md'), 'global instructions\n');
  writeFileSync(join(real, 'hooks.json'), '{}\n');
  writeFileSync(join(real, 'config.toml'), 'model = "real-model"\n');
  const auth = join(root, 'elsewhere', 'auth.json');
  mkdirSync(dirname(auth));
  writeFileSync(auth, 'SECRET-TOKEN');
  chmodSync(auth, 0o000); // the runner must never need to read it
  const userSkills = join(root, 'user-skills');
  mkdirSync(join(userSkills, 'styleseed'), { recursive: true });
  mkdirSync(join(userSkills, 'lazyweb-design'));
  const env = { ...stubEnv(root, userSkills), CODEX_HOME: real, PLAYWRIGHT_BROWSERS_PATH: join(root, 'browsers') };
  const out = join(root, 'round');
  const result = run(runner, ['--prepare', '--out', out, '--arms', 'bare', '--runs', '1', '--model', 'test-model', '--allow-dirty', '--codex-auth', auth], env);
  assert.equal(result.status, 0, result.stderr);
  const freeze = readJson(join(out, 'freeze.json'));
  assert.equal(freeze.isolation.mode, 'isolated');
  assert.equal(freeze.isolation.auth.path, auth);
  assert.deepEqual(freeze.isolation.sessionEnvironment, ['HOME', 'CODEX_HOME', 'GIT_AUTHOR_EMAIL', 'GIT_AUTHOR_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_COMMITTER_NAME', 'PLAYWRIGHT_BROWSERS_PATH']);
  assert.deepEqual(freeze.isolation.sessionEnv, { ...AGENT_GIT_IDENTITY, PLAYWRIGHT_BROWSERS_PATH: join(root, 'browsers') });
  assert.deepEqual(freeze.isolation.browserCache, { source: 'operator', path: join(root, 'browsers') });
  assert.deepEqual(readdirSync(join(out, 'home', '.agents')), []);
  assert.deepEqual(readdirSync(join(out, 'home', '.codex')), ['config.toml'], 'the template holds no auth link');
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  const config = readFileSync(join(out, 'home', '.codex', 'config.toml'), 'utf8');
  assert.deepEqual(tomlKeys(config), [...ISOLATED_CONFIG_KEYS].sort());
  assert.match(config, /^model = "test-model"$/mu);
  assert.match(config, /^model_reasoning_effort = "high"$/mu);
  assert.match(config, /^sandbox_mode = "workspace-write"$/mu);
  assert.match(config, /^network_access = true$/mu);
  assert.equal(freeze.isolation.config.text, config);
  assert.equal(freeze.isolation.config.sha256, sha256(config));
  assert.deepEqual(freeze.isolation.notCarriedOver.codexHome, { path: real, entries: ['AGENTS.md', 'config.toml', 'hooks.json', 'memories'] });
  assert.deepEqual(freeze.isolation.notCarriedOver.skills, [{ dir: userSkills, entries: ['lazyweb-design', 'styleseed'] }]);
  assert.equal(freeze.isolation.realCodexHome.configModel, 'real-model');
  assert.equal(JSON.stringify(freeze).includes('SECRET-TOKEN'), false);

  // Second line of defence: the isolated home must stay empty of skills.
  mkdirSync(join(out, 'home', '.agents', 'skills', 'styleseed'), { recursive: true });
  let refused = run(runner, ['--run', '--out', out, '--arm', 'bare', '--run-index', '1'], env);
  assert.match(refused.stderr, /isolated home is not clean[\s\S]*\.agents must be empty/u);
  assert.equal(existsSync(join(out, 'bare', 'run-1', 'sessions')), false);
  refused = run(runner, ['--preflight', '--out', out], env);
  assert.match(refused.stderr, /isolated home is not clean/u);
  rmSync(join(out, 'home', '.agents', 'skills'), { recursive: true });

  // Preflight against the stub: header checked, HOME and CODEX_HOME inside the isolated home.
  const pre = run(runner, ['--preflight', '--out', out], env);
  assert.equal(pre.status, 0, pre.stderr + pre.stdout);
  assert.match(pre.stdout, /Preflight passed/u);
  const [id] = readdirSync(join(out, 'home', 'preflight'));
  const home = join(out, 'home', 'preflight', id);
  const record = readJson(join(home, 'preflight.json'));
  assert.equal(record.passed, true);
  assert.deepEqual(Object.values(record.checks), [true, true, true, true, true, true]);
  assert.equal(record.authLink, 'removed');
  const log = readFileSync(join(home, 'codex.log'), 'utf8');
  assert.ok(log.includes(`HOME=${home}\n`), log);
  assert.ok(log.includes(`CODEX_HOME=${join(home, '.codex')}\n`), log);
  assert.equal(existsSync(join(home, '.codex', 'auth.json')), false, 'the preflight link is gone once Codex exited');
  assert.deepEqual(readdirSync(join(out, 'home', '.codex')), ['config.toml'], 'the template stays untouched');
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  const wrong = run(runner, ['--preflight', '--out', out], { ...env, STUB_MODEL: 'other-model' });
  assert.equal(wrong.status, 2);
  assert.match(wrong.stdout, /Preflight FAILED: model other-model \(expected test-model\)/u);
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);

  // A crash leftover: a session home that still links the auth file is released by --report.
  const authStat = statSync(auth);
  const leftover = join(out, 'home', 'sessions', 'bare-run-1-s1-crashed', '.codex');
  mkdirSync(leftover, { recursive: true });
  symlinkSync(auth, join(leftover, 'auth.json'));
  const swept = run(runner, ['--report', '--out', out], env);
  assert.equal(swept.status, 0, swept.stderr);
  assert.match(swept.stdout, /removed 1 leftover auth link\(s\)/u);
  assert.equal(existsSync(join(leftover, 'auth.json')), false);
  assert.deepEqual([statSync(auth).size, statSync(auth).mtimeMs], [authStat.size, authStat.mtimeMs], 'the target is untouched');
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  assert.match(readFileSync(join(out, 'REPORT.md'), 'utf8'), /`home\/` is working state and is never published\./u);

  // A regular file left there is a replaced link: the marker is written, --report continues, --run refuses.
  writeFileSync(join(leftover, 'auth.json'), 'refreshed-token');
  const marked = run(runner, ['--report', '--out', out], env);
  assert.equal(marked.status, 0, marked.stderr);
  assert.match(readFileSync(join(out, AUTH_MARKER), 'utf8'), /found at start-up[\s\S]*bare-run-1-s1-crashed/u);
  assert.match(readFileSync(join(out, 'REPORT.md'), 'utf8'), /AUTH-REPLACED\.txt is present/u);
  assert.equal(readFileSync(join(leftover, 'auth.json'), 'utf8'), 'refreshed-token', 'the file is left for the operator');
  assert.match(run(runner, ['--run', '--out', out, '--arm', 'bare', '--run-index', '1'], env).stderr, /AUTH-REPLACED\.txt exists/u);
  rmSync(join(leftover, 'auth.json'));
  rmSync(join(out, AUTH_MARKER));

  // A template that holds an auth link (an earlier layout) is refused: prepare a new round.
  symlinkSync(auth, join(out, 'home', '.codex', 'auth.json'));
  assert.throws(() => checkIsolatedHome(join(out, 'home'), freeze.isolation, { template: true }), /must hold no auth link[\s\S]*prepare a new round/u);
  assert.match(run(runner, ['--preflight', '--out', out], env).stderr, /template must hold no auth link \(an earlier layout\); prepare a new round/u);
  rmSync(join(out, 'home', '.codex', 'auth.json'));
});

test('releaseAuthLink unlinks only a symlink, never a regular file or the link target', t => {
  const root = temporary(t);
  const home = join(root, 'session');
  mkdirSync(join(home, '.codex'), { recursive: true });
  writeFileSync(join(home, '.codex', 'auth.json'), 'a regular file');
  assert.deepEqual(releaseAuthLink(home), { state: 'file', path: join(home, '.codex', 'auth.json') });
  assert.equal(readFileSync(join(home, '.codex', 'auth.json'), 'utf8'), 'a regular file', 'a regular file is never removed');
  rmSync(join(home, '.codex', 'auth.json'));
  assert.equal(releaseAuthLink(home).state, 'missing');
  if (!windows) {
    const target = join(root, 'real-auth.json');
    writeFileSync(target, 'TOKEN');
    symlinkSync(target, join(home, '.codex', 'auth.json'));
    assert.equal(releaseAuthLink(home).state, 'removed');
    assert.equal(existsSync(join(home, '.codex', 'auth.json')), false);
    assert.equal(readFileSync(target, 'utf8'), 'TOKEN', 'the target is untouched');
  }
});

test('--replace: infrastructure failures are replaced from the pristine starter, at most twice per arm; agent outcomes never', t => {
  const root = temporary(t);
  const env = stubEnv(root);
  const out = join(root, 'round');
  const prepared = run(runner, ['--prepare', '--out', out, '--arms', 'bare', '--runs', '1', '--model', 'test-model', '--allow-dirty', '--no-isolated-home', '--allow-global-skills'], env);
  assert.equal(prepared.status, 0, prepared.stderr);
  const freeze = readJson(join(out, 'freeze.json'));
  const base = join(out, 'bare', 'run-1');
  const replace = () => run(runner, ['--replace', '--out', out, '--arm', 'bare', '--run-index', '1'], env);
  const startRun = record => {
    mkdirSync(join(base, 'sessions'), { recursive: true });
    if (record) writeFileSync(join(base, 'run.json'), JSON.stringify({ arm: 'bare', runIndex: 1, ...record }));
  };

  let result = replace();
  assert.match(result.stderr, /has not started/u);
  startRun({ valid: false, invalidKind: 'infrastructure', reasons: ['runner error: browser launch failed'] });
  result = replace();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Replacement 1 of 2/u);
  const first = readJson(join(out, 'bare', 'replaced', 'run-1-1', 'replacement.json'));
  assert.deepEqual(first.reasons, ['runner error: browser launch failed']);
  assert.equal(first.invalidKind, 'infrastructure');
  assert.ok(existsSync(join(out, 'bare', 'replaced', 'run-1-1', 'run.json')), 'the replaced run is kept');
  for (const absent of ['sessions', 'run.json']) assert.equal(existsSync(join(base, absent)), false, absent);
  assert.equal(readFileSync(join(base, 'workspace', 'AGENTS.md'), 'utf8'), NEUTRAL_AGENTS);
  for (const order of [1, 2, 3, 4, 5]) assert.equal(sha256(readFileSync(join(base, 'prompts', `session-${order}.md`))), freeze.prompts.bare[`session-${order}`]);
  assert.equal(spawnSync('git', ['log', '--format=%s'], { cwd: join(base, 'workspace'), encoding: 'utf8' }).stdout.trim(), 'Starter');

  startRun({ valid: false, invalidKind: 'agent', reasons: ['session 3 timed out after 40 minutes'] });
  result = replace();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /agent outcome[\s\S]*never replaced/u);
  startRun({ valid: true, invalidKind: null, reasons: [] });
  assert.match(replace().stderr, /is valid/u);

  // A started run without run.json ended without a record: infrastructure.
  rmSync(join(base, 'run.json'));
  const starterAgents = join(out, 'bare', 'starter', 'workspace', 'AGENTS.md');
  writeFileSync(starterAgents, 'tampered\n');
  assert.match(replace().stderr, /starter is missing or differs/u);
  writeFileSync(starterAgents, NEUTRAL_AGENTS);
  result = replace();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Replacement 2 of 2/u);
  assert.deepEqual(readJson(join(out, 'bare', 'replaced', 'run-1-2', 'replacement.json')).reasons, ['run.json is missing: the harness ended without a record']);

  startRun({ valid: false, invalidKind: 'infrastructure', reasons: ['operator abort (SIGINT) during session 2'] });
  result = replace();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already used its 2 replacements/u);

  const reported = run(runner, ['--report', '--out', out]);
  assert.equal(reported.status, 0, reported.stderr);
  const summaryJson = readJson(join(out, 'report.json')).arms.bare;
  assert.equal(summaryJson.replacements.length, 2);
  assert.equal(summaryJson.summary['1440'].invalidInfrastructure, 1);
  assert.match(readFileSync(join(out, 'REPORT.md'), 'utf8'), /\| bare \| no summary \(fewer than 3 valid runs\) \| 0 \|.*\| 0 \| 1 \| 0 \| 2 of 2 \|/u);
  assert.equal(readJson(join(out, 'report.json')).arms.bare.pending.pending, false, 'both replacements are used, so nothing is pending');
});

test('--run against the stub: frozen session environment, throwaway floor HOME, remeasure, auth-link stop, pending report and replacement order', { skip: windows && 'symlinks and process groups are POSIX-only here' }, t => {
  const root = temporary(t);
  const auth = join(root, 'real-auth', 'auth.json');
  mkdirSync(dirname(auth));
  writeFileSync(auth, 'REAL-TOKEN');
  const authBefore = { bytes: readFileSync(auth), mtimeMs: statSync(auth).mtimeMs };
  const browsers = join(root, 'browsers');
  mkdirSync(browsers);
  const homeLog = join(root, 'floor-home.log');
  const env = { ...stubEnv(root), PLAYWRIGHT_BROWSERS_PATH: browsers, S1_TEST_FLOOR_HOME_FILE: homeLog, GIT_AUTHOR_NAME: 'operator-must-not-leak' };
  const out = join(root, 'round');
  let result = run(runner, ['--prepare', '--out', out, '--arms', 'bare', '--runs', '2', '--model', 'test-model', '--allow-dirty', '--codex-auth', auth], env);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readJson(join(out, 'freeze.json')).isolation.sessionEnv, { ...AGENT_GIT_IDENTITY, PLAYWRIGHT_BROWSERS_PATH: browsers });

  // A node_modules that passes the version check, whose `next` serves 200 and records its HOME.
  const fakeModules = join(root, 'fake-node-modules');
  const base1 = join(out, 'bare', 'run-1');
  const workspace = join(base1, 'workspace');
  const lock = readJson(join(workspace, 'package-lock.json'));
  for (const name of Object.keys({ ...lock.packages[''].dependencies, ...lock.packages[''].devDependencies })) {
    mkdirSync(join(fakeModules, ...name.split('/')), { recursive: true });
    writeFileSync(join(fakeModules, ...name.split('/'), 'package.json'), JSON.stringify({ name, version: lock.packages[`node_modules/${name}`].version }));
  }
  mkdirSync(join(fakeModules, 'next', 'dist', 'bin'), { recursive: true });
  writeFileSync(join(fakeModules, 'next', 'dist', 'bin', 'next'), FAKE_NEXT);
  // The "agent-written" build script records the HOME it runs with.
  const pkg = readJson(join(workspace, 'package.json'));
  pkg.scripts.build = 'node record-home.cjs build';
  writeFileSync(join(workspace, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(join(workspace, 'record-home.cjs'), RECORD_HOME);
  const bogusBrowser = join(root, 'no-playwright', 'index.mjs');
  const runArgs = n => ['--run', '--out', out, '--arm', 'bare', '--run-index', String(n), '--node-modules', fakeModules, '--browser', bogusBrowser];

  // Five sessions finish; the floor serves the app, then the browser cannot load: infrastructure, phase floor.
  result = run(runner, runArgs(1), env);
  assert.equal(result.status, 2, result.stderr + result.stdout);
  let record = readJson(join(base1, 'run.json'));
  assert.equal(record.sessions.length, 5);
  assert.equal(record.invalidKind, 'infrastructure');
  assert.deepEqual(record.failures.map(failure => [failure.kind, failure.phase]), [['infrastructure', 'floor']]);
  assert.match(record.failures[0].reason, /runner error: could not load browser module/u);
  assert.equal(record.floor.serve, 'ok');
  assert.match(record.floor.home, /^home\/floor\/bare-run-1-[0-9a-f]{6}$/u);
  const floorHome = join(out, record.floor.home);
  assert.equal(existsSync(join(floorHome, '.codex')), false, 'the floor HOME has no auth link or configuration');
  assert.deepEqual(readFileSync(homeLog, 'utf8').trim().split('\n'), [`build ${floorHome}`, `serve ${floorHome}`]);
  // No auth link at rest: every session released its link when Codex exited; the target is untouched.
  assert.deepEqual(record.sessions.map(session => session.authLink), ['removed', 'removed', 'removed', 'removed', 'removed']);
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  assert.deepEqual(readFileSync(auth), authBefore.bytes);
  assert.equal(statSync(auth).mtimeMs, authBefore.mtimeMs);
  const sessionLog = readFileSync(join(base1, 'sessions', '1', 'codex.log'), 'utf8');
  for (const [key, value] of Object.entries({ ...AGENT_GIT_IDENTITY, PLAYWRIGHT_BROWSERS_PATH: browsers })) assert.ok(sessionLog.includes(`${key}=${value}\n`), key);
  assert.ok(sessionLog.includes(`HOME=${join(out, 'home', 'sessions', 'bare-run-1-s1-')}`), sessionLog);
  assert.equal(sessionLog.includes('operator-must-not-leak'), false);

  run(runner, ['--report', '--out', out]);
  let report = readJson(join(out, 'report.json'));
  assert.deepEqual(report.arms.bare.pending.open.map(item => item.action), ['remeasure']);
  assert.match(readFileSync(join(out, 'REPORT.md'), 'utf8'), /\| bare \| pending \|[\s\S]*bare\/run-1 \(remeasure\): `node scripts\/run-s1-drift\.mjs --remeasure --out /u);
  result = run(runner, ['--replace', '--out', out, '--arm', 'bare', '--run-index', '1'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /measured again, not regenerated[\s\S]*--remeasure --out/u);

  // Remeasure refuses a moved HEAD or a dirty tree, then reruns only the floor, at most three times.
  const remeasureArgs = ['--remeasure', '--out', out, '--arm', 'bare', '--run-index', '1', '--browser', bogusBrowser];
  writeFileSync(join(workspace, 'stray.txt'), 'x');
  assert.match(run(runner, remeasureArgs, env).stderr, /has changes since the last session/u);
  rmSync(join(workspace, 'stray.txt'));
  const gitInWorkspace = args => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@localhost', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: workspace, encoding: 'utf8' });
  gitInWorkspace(['commit', '-q', '--no-verify', '--allow-empty', '-m', 'moved']);
  assert.match(run(runner, remeasureArgs, env).stderr, /not at the session-5 commit/u);
  gitInWorkspace(['reset', '-q', '--hard', 'HEAD~1']);
  for (const attempt of [1, 2, 3]) {
    result = run(runner, remeasureArgs, env);
    assert.equal(result.status, 2, result.stderr + result.stdout);
    record = readJson(join(base1, 'run.json'));
    assert.equal(record.remeasured, attempt);
    assert.ok(existsSync(join(base1, `run.attempt-${attempt}.json`)));
    assert.ok(existsSync(join(base1, 'attempts', String(attempt), 'floor', 'build.log')));
    assert.deepEqual(record.failures.map(failure => failure.phase), ['floor']);
  }
  assert.deepEqual(record.sessions, readJson(join(base1, 'run.attempt-1.json')).sessions, 'the original sessions are carried unchanged');
  assert.equal(readJson(join(base1, 'run.attempt-1.json')).remeasured, 0);
  assert.match(run(runner, remeasureArgs, env).stderr, /already remeasured 3 times/u);
  assert.equal(readFileSync(homeLog, 'utf8').trim().split('\n').length, 8, 'every attempt used a fresh floor HOME');

  // Codex replaces the auth link during session 2 of run 2: the run stops as infrastructure.
  result = run(runner, runArgs(2), { ...env, STUB_REPLACE_AUTH: '2' });
  assert.equal(result.status, 2, result.stderr + result.stdout);
  const base2 = join(out, 'bare', 'run-2');
  record = readJson(join(base2, 'run.json'));
  assert.equal(record.sessions.length, 2);
  assert.deepEqual(record.sessions.map(session => session.authLink), ['removed', 'file']);
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  assert.equal(record.floor, null);
  assert.deepEqual(record.failures, [{ kind: 'infrastructure', phase: 'sessions', reason: 'Codex replaced the auth link in the isolated home during session 2' }]);
  const written = join(out, record.sessions[1].home, '.codex', 'auth.json');
  const marker = readFileSync(join(out, AUTH_MARKER), 'utf8');
  for (const part of ['during session 2 of bare run 2', written, auth, 'move the file Codex wrote over your real auth file', 'delete the file Codex wrote and log in to Codex again']) assert.ok(marker.includes(part), part);
  assert.equal(readFileSync(written, 'utf8'), 'refreshed-token', 'the file Codex wrote is left in place');
  assert.deepEqual(readFileSync(auth), authBefore.bytes, 'the real auth file keeps its bytes');
  assert.equal(statSync(auth).mtimeMs, authBefore.mtimeMs, 'the real auth file keeps its mtime');
  for (const args of [runArgs(2), ['--replace', '--out', out, '--arm', 'bare', '--run-index', '2'], ['--preflight', '--out', out]]) {
    const refused = run(runner, args, env);
    assert.notEqual(refused.status, 0, args.join(' '));
    assert.match(refused.stderr, /AUTH-REPLACED\.txt exists[\s\S]*move the file Codex wrote over your real auth file/u);
  }
  // Deleting only the marker is not enough: the start-up sweep finds the written file and marks again.
  rmSync(join(out, AUTH_MARKER));
  assert.match(run(runner, ['--preflight', '--out', out], env).stderr, /AUTH-REPLACED\.txt exists[\s\S]*found at start-up/u);
  // The operator's option 2: delete the written file and the marker (and log in again).
  rmSync(written);
  rmSync(join(out, AUTH_MARKER));
  result = run(runner, ['--preflight', '--out', out], { ...env, STUB_REPLACE_AUTH: 'preflight' });
  assert.equal(result.status, 2);
  assert.match(readFileSync(join(out, AUTH_MARKER), 'utf8'), /during the preflight/u);
  assert.deepEqual(readFileSync(auth), authBefore.bytes);
  assert.deepEqual(symlinksUnder(join(out, 'home')), []);
  const [preflightId] = readdirSync(join(out, 'home', 'preflight'));
  rmSync(join(out, 'home', 'preflight', preflightId, '.codex', 'auth.json'));
  rmSync(join(out, AUTH_MARKER));
  assert.match(run(runner, ['--remeasure', '--out', out, '--arm', 'bare', '--run-index', '2'], env).stderr, /cannot be remeasured: the run recorded 2 of 5 sessions/u);

  // Both runs are now replaceable infrastructure failures: pending, and replaced in run-index order.
  run(runner, ['--report', '--out', out]);
  report = readJson(join(out, 'report.json'));
  assert.deepEqual(report.arms.bare.pending.open.map(item => [item.run, item.action]), [['bare/run-1', 'replace'], ['bare/run-2', 'replace']]);
  result = run(runner, ['--replace', '--out', out, '--arm', 'bare', '--run-index', '2'], env);
  assert.match(result.stderr, /bare run 1 is also infrastructure-invalid and replaceable; replacements go in run-index order/u);
  assert.equal(run(runner, ['--replace', '--out', out, '--arm', 'bare', '--run-index', '1'], env).status, 0);
  assert.equal(run(runner, ['--replace', '--out', out, '--arm', 'bare', '--run-index', '2'], env).status, 0);
  run(runner, ['--report', '--out', out]);
  report = readJson(join(out, 'report.json'));
  assert.equal(report.arms.bare.pending.pending, false);
  assert.equal(report.arms.bare.replacements.length, 2);
  assert.ok(existsSync(join(out, 'bare', 'replaced', 'run-1-1', 'attempts', '3')), 'the remeasure attempts stay with the replaced run');
});

test('loadRun classifies a run that started without a record as infrastructure and an untouched run as not run', t => {
  const root = temporary(t);
  mkdirSync(join(root, 'bare', 'run-1', 'sessions'), { recursive: true });
  mkdirSync(join(root, 'bare', 'run-2'), { recursive: true });
  assert.equal(loadRun(join(root, 'bare', 'run-1')).invalidKind, 'infrastructure');
  assert.equal(loadRun(join(root, 'bare', 'run-2')).invalidKind, 'not-run');
});

// Five per-screen summaries whose primary endpoint equals `changes` (0..8): accent changes first,
// then new radii.
function screensWith(changes) {
  return Array.from({ length: 5 }, (_, i) => summary({
    accent: i > 0 && i <= Math.min(changes, 4) ? '#e11d48' : '#533afd',
    radii: i > 0 && i <= changes - 4 ? [4, 20 + i] : [4],
  }));
}

test('--report applies the decision rule to synthetic runs, lists invalid runs by kind, and blinds the screen sets', t => {
  const root = temporary(t);
  const out = join(root, 'round');
  const { screens } = loadProtocol();
  const order = screens.map(({ id, order: o, route }) => ({ id, order: o, route }));
  const arms = { bare: [4, 5, 6], styleseed: [0, 1, 0] };
  mkdirSync(out);
  writeFileSync(join(out, 'freeze.json'), JSON.stringify({
    round: 'baseline', runs: 3, repository: { commit: 'f'.repeat(40), dirty: false },
    codex: { version: 'codex-cli test', model: 'm', effort: 'high' }, isolation: { mode: 'isolated' },
    protocol: Object.fromEntries(FROZEN_FILES.map(path => [path, sha256(readFileSync(join(repo, path)))])),
    screens: order, arms: { bare: {}, styleseed: {} },
  }));
  for (const [arm, values] of Object.entries(arms)) {
    values.forEach((value, i) => {
      const dir = join(out, arm, `run-${i + 1}`);
      const invalid = arm === 'bare' && i === 2;
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'run.json'), JSON.stringify({ arm, runIndex: i + 1, valid: !invalid, invalidKind: invalid ? 'agent' : null, reasons: invalid ? ['npm run build failed'] : [], screens: order, isolation: { mode: arm === 'bare' && i === 1 ? 'none' : 'isolated' } }));
      for (const viewport of ['1440', '390']) {
        screensWith(value).forEach((s, k) => {
          mkdirSync(join(dir, 'measurements', viewport), { recursive: true });
          writeFileSync(join(dir, 'measurements', viewport, `${order[k].id}.json`), JSON.stringify({ summary: s }));
          mkdirSync(join(dir, 'screens', viewport), { recursive: true });
          writeFileSync(join(dir, 'screens', viewport, `${order[k].id}.png`), `${arm}-${i}-${viewport}-${k}`);
        });
      }
    });
  }
  // One runner command per output folder: a live lock refuses, a stale one is replaced and released.
  writeFileSync(join(out, '.runner.lock'), JSON.stringify({ pid: process.pid, mode: 'run' }));
  assert.match(run(runner, ['--report', '--out', out]).stderr, new RegExp(`Another s1-drift runner command \\(pid ${process.pid}, --run\\)`, 'u'));
  const finished = spawnSync(process.execPath, ['-e', '0']);
  writeFileSync(join(out, '.runner.lock'), JSON.stringify({ pid: finished.pid, mode: 'run' }));
  // bare has two valid runs (4, 5) after one agent-invalid run: no summary, so nothing separates from it.
  const result = run(runner, ['--report', '--out', out]);
  assert.match(result.stdout, new RegExp(`Replacing a stale lock left by pid ${finished.pid}`, 'u'));
  assert.equal(existsSync(join(out, '.runner.lock')), false, 'the lock is released');
  assert.equal(result.status, 0, result.stderr);
  const report = readJson(join(out, 'report.json'));
  assert.equal(report.arms.styleseed.summary['1440'].median, 0);
  assert.equal(report.arms.styleseed.summary['1440'].range, 1);
  assert.equal(report.arms.bare.summary['1440'].validRuns, 2);
  assert.equal(report.arms.bare.summary['1440'].invalidAgent, 1);
  assert.deepEqual(report.arms.bare.summary['1440'].invalid, [{ run: 'bare/run-3', kind: 'agent', reasons: ['npm run build failed'] }]);
  assert.equal(report.arms.bare.isolation, 'none: bare/run-2');
  assert.equal(report.arms.styleseed.isolation, 'isolated');
  assert.equal(report.pairs.find(pair => pair.x === 'styleseed' && pair.y === 'bare').separates, false);
  assert.deepEqual(report.protocolChangedSincePrepare, []);
  assert.equal(report.killRule.evaluated, false);
  const markdown = readFileSync(join(out, 'REPORT.md'), 'utf8');
  assert.match(markdown, /Baseline round: unpublished by maintainer decision\./u);
  assert.match(markdown, /bare\/run-3 \[agent\]: npm run build failed/u);
  assert.match(markdown, /\| bare\/run-2 \| valid \| none \|/u);
  const key = readJson(join(out, 'blind-key.json')).sets;
  assert.equal(Object.keys(key).length, 5, 'valid runs only');
  const sets = readdirSync(join(out, 'blind')).sort();
  assert.deepEqual(sets, Object.keys(key).sort());
  for (const label of sets) {
    assert.match(label, /^set-[0-9a-f]{6}$/u);
    assert.deepEqual(readdirSync(join(out, 'blind', label, '1440')).sort(), ['1-resource-list.png', '2-resource-detail.png', '3-settings.png', '4-activity.png', '5-pause-review.png']);
  }
  assert.equal(existsSync(join(out, 'blind', 'key.json')), false, 'the key is not inside the set sent to reviewers');
  const second = run(runner, ['--report', '--out', out]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(readJson(join(out, 'report.json')).blind.created, false);
  assert.deepEqual(readdirSync(join(out, 'blind')).sort(), sets);

  // With a third valid bare run the same data separates: median 5, range 2 against median 0, range 1.
  writeFileSync(join(out, 'bare', 'run-3', 'run.json'), JSON.stringify({ arm: 'bare', runIndex: 3, valid: true, invalidKind: null, reasons: [], screens: order }));
  const entry = loadRun(join(out, 'bare', 'run-3'));
  assert.equal(entry.valid, true);
  assert.equal(entry.primary, 6);
  run(runner, ['--report', '--out', out]);
  const rerun = readJson(join(out, 'report.json'));
  assert.equal(rerun.arms.bare.summary['1440'].median, 5);
  assert.equal(rerun.pairs.find(pair => pair.x === 'styleseed' && pair.y === 'bare').separates, true);
  assert.equal(rerun.pairs.find(pair => pair.x === 'bare' && pair.y === 'styleseed').separates, false);

  const metric = run(metricCli, [join(out, 'styleseed', 'run-1'), join(out, 'bare', 'run-1')]);
  assert.equal(metric.status, 0, metric.stderr);
  const lines = metric.stdout.split('\n');
  assert.equal(JSON.parse(lines[0]).primary, 0);
  assert.equal(JSON.parse(lines[1]).primary, 4);
  assert.match(metric.stdout, /### styleseed at 1440/u);
  assert.match(metric.stdout, /### bare at 390/u);
});
