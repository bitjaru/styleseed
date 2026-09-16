import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseOptions, summarizeCalibration, evaluatorSources } from '../test-design-pilot-browser.mjs';
import { localOrigin, freshOutput, writeReport, sourceInventory } from '../design-pilot/support.mjs';
import { mutations } from '../design-pilot/calibration-server.mjs';
import { scenarios } from '../design-pilot/scenarios.mjs';
import { viewports } from '../design-pilot/browser.mjs';
import { buildPilotPlan } from '../prepare-design-pilot.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const temporary = t => { const root = mkdtempSync(join(tmpdir(), 'styleseed-browser-contract-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };
const baseline = () => ({ status: 'pass', cases: viewports.flatMap(viewport => scenarios
  .filter(scenario => !scenario.reducedOnly || viewport.reducedMotion === 'reduce')
  .map(scenario => ({ id: scenario.id, viewport: viewport.id, status: 'pass', assertion: null, environment: [], screenshot: { path: 'fixture.png' } }))) });
const killed = () => Object.entries(mutations).map(([label, id]) => ({ label, status: 'fail', cases: [{ id, status: 'fail', assertion: 'Known behavior rejected', environment: [], screenshot: { path: 'fixture.png' } }] }));

test('browser target accepts only explicit numeric loopback origins, never credentials or remote aliases', () => {
  assert.equal(localOrigin('http://127.0.0.1:3210/'), 'http://127.0.0.1:3210');
  for (const target of ['https://example.com', 'http://localhost:3210', 'http://127.1:3210', 'http://2130706433:3210',
    'http://127.0.0.1:3210/settings', 'http://127.0.0.1:3210?x=1', 'http://127.0.0.1:3210/#fragment',
    'http://user:secret@127.0.0.1:3210', 'https://127.0.0.1:3210', 'http://127.0.0.1', 'file:///tmp/app', 'http://127.0.0.1:80']) {
    assert.throws(() => localOrigin(target), /origin|Only/u, target);
  }
});

test('browser CLI refuses conflicting, duplicate, paid-run, approval and incomplete options', () => {
  assert.deepEqual(parseOptions([]), { mode: 'calibration' });
  assert.equal(parseOptions(['--url', 'http://127.0.0.1:3210']).mode, 'candidate');
  for (const args of [['--calibrate', '--url', 'http://127.0.0.1:3210'], ['--calibrate', '--calibrate'],
    ['--output'], ['--run'], ['--approve'], ['--model', 'x'], ['--help', '--calibrate'], ['--url', 'https://example.com']]) assert.throws(() => parseOptions(args));
});

test('browser help and invalid CLI options perform no IO in the invocation directory', t => {
  const root = temporary(t);
  for (const [args, code] of [[['--help'], 0], [['--run'], 1], [['--url', 'https://example.com'], 1]]) {
    const run = spawnSync(process.execPath, [join(repo, 'scripts/test-design-pilot-browser.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, code, run.stderr);
    assert.deepEqual(readdirSync(root), []);
  }
});

test('browser evidence directories and report files are exclusive and cannot overwrite user paths', t => {
  const root = temporary(t);
  const output = freshOutput(repo, join(root, 'evidence with spaces'));
  writeReport(output, { status: 'fail' });
  assert.throws(() => freshOutput(repo, output), /EEXIST/u);
  assert.throws(() => writeReport(output, { status: 'pass' }), /EEXIST/u);
  assert.equal(JSON.parse(readFileSync(join(output, 'report.json'))).status, 'fail');
  assert.throws(() => freshOutput(repo, join(repo, 'must-not-create-browser-evidence')), /outside/u);
  const link = join(root, 'linked-output'); symlinkSync(output, link, 'junction');
  assert.throws(() => freshOutput(repo, link), /EEXIST/u);
  const inside = join(root, 'repository'); mkdirSync(inside);
  const parentLink = join(root, 'linked-parent'); symlinkSync(inside, parentLink, 'junction');
  assert.throws(() => freshOutput(inside, join(parentLink, 'evidence')), /outside/u);
});

test('calibration requires every baseline case and every independently detected mutation', () => {
  const passed = summarizeCalibration(baseline(), killed());
  assert.equal(passed.status, 'pass'); assert.equal(passed.detectedMutations, Object.keys(mutations).length);
  const missingCase = baseline(); missingCase.cases.pop();
  assert.equal(summarizeCalibration(missingCase, killed()).status, 'fail');
  assert.equal(summarizeCalibration(baseline(), killed().slice(1)).status, 'fail');
  const duplicateCase = baseline(); duplicateCase.cases[0] = duplicateCase.cases[1];
  assert.equal(summarizeCalibration(duplicateCase, killed()).status, 'fail');
  assert.equal(summarizeCalibration(baseline(), [...killed(), killed()[0]]).status, 'fail');
});

test('crashes, missing screenshots, unrelated assertions and survived mutants cannot count as detection', () => {
  for (const tamper of [
    run => { run.cases[0].environment.push('Browser crashed'); },
    run => { run.cases[0].screenshot = null; },
    run => { run.cases[0].id = 'unrelated'; },
    run => { run.cases[0].assertion = null; },
    run => { run.status = run.cases[0].status = 'pass'; },
  ]) {
    const runs = killed(); tamper(runs[0]);
    assert.equal(summarizeCalibration(baseline(), runs).status, 'fail');
  }
  const broken = baseline(); broken.cases[0].environment.push('Off-origin request blocked');
  assert.equal(summarizeCalibration(broken, killed()).status, 'fail');
});

test('every deliberate browser defect targets one maintained scenario and IDs are unique', () => {
  const ids = scenarios.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(viewports.map(item => item.id)).size, viewports.length);
  for (const id of Object.values(mutations)) assert.ok(ids.includes(id), id);
});

test('all conditions receive identical protocol but no calibration source or evaluator implementation', () => {
  const plan = buildPilotPlan();
  for (const arm of Object.values(plan.arms)) {
    assert.deepEqual(arm['BROWSER-CONTRACT.md'], plan.common['BROWSER-CONTRACT.md']);
    assert.equal(Object.keys(arm).some(path => /calibration|scenarios\.mjs|test-design-pilot-browser|operator/u.test(path)), false);
  }
  assert.equal(plan.manifest.readyForAgentRuns, false);
  assert.equal(plan.manifest.functionalUiVerification, 'NOT PERFORMED');
});

test('evaluator provenance includes real source bytes and refuses symlinked or escaped source', t => {
  assert.equal(sourceInventory(repo, evaluatorSources).length, evaluatorSources.length);
  const root = temporary(t);
  writeFileSync(join(root, 'source.mjs'), '// test');
  symlinkSync(join(root, 'source.mjs'), join(root, 'linked.mjs'));
  assert.throws(() => sourceInventory(root, ['linked.mjs']), /symlink/u);
  assert.throws(() => sourceInventory(root, ['../escape']), /escape/u);
  assert.equal(sourceInventory(root, ['source.mjs'])[0].bytes, 7);
});
