import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPilotPlan, writePilot } from '../prepare-design-pilot.mjs';
import '../../research/design-judgment/common/model.test.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const script = resolve(repo, 'scripts/prepare-design-pilot.mjs');
const plan = buildPilotPlan();
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), 'styleseed-pilot-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(script, args, cwd = repo) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined);
  return result;
}

test('pilot inputs are deterministic and all conditions share exact tasks, library, decisions and dependencies', () => {
  const again = buildPilotPlan();
  assert.deepEqual(again.manifest, plan.manifest);
  for (const files of Object.values(plan.arms)) {
    for (const [path, content] of Object.entries(plan.common)) assert.deepEqual(files[path], content, path);
  }
  const pkg = JSON.parse(plan.common['package.json']);
  const lock = JSON.parse(plan.common['package-lock.json']);
  assert.equal(pkg.name, lock.packages[''].name);
  assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies);
  assert.equal(pkg.scripts.prebuild, undefined);
  assert.equal(pkg.scripts.predev, undefined);
  assert.deepEqual(Object.keys(JSON.parse(plan.common['DESIGN-INPUTS.json'])), ['status', 'project', 'artifacts']);
});

test('condition context is additive without exposing operator or held-out materials', () => {
  const { A, B, C, D } = plan.arms;
  assert.equal(Object.keys(A).some(path => path.startsWith('.agents/') || path.startsWith('.styleseed/') || path.startsWith('context/')), false);
  assert.equal(Object.keys(B).filter(path => path.endsWith('/SKILL.md')).length, 23);
  assert.equal(B['context/component-contract.md'], undefined);
  assert.equal(C['context/plan.md'], undefined);
  assert.ok(C['context/component-contract.md'] && C['context/examples.tsx'] && D['context/plan.md']);
  for (const [path, content] of Object.entries(B)) if (path !== 'PROMPT.md') assert.deepEqual(C[path], content);
  for (const [path, content] of Object.entries(C)) if (path !== 'PROMPT.md') assert.deepEqual(D[path], content);
  for (const files of Object.values(plan.arms)) {
    assert.equal(Object.keys(files).some(path => /operator|followup|review\.json/u.test(path)), false);
    assert.equal(Object.values(files).some(bytes => Buffer.from(bytes).equals(Buffer.from(plan.operator['followup.md']))), false);
  }
});

test('preparation never grants approval or reports model/UI quality results', () => {
  assert.equal(plan.manifest.readyForAgentRuns, false);
  assert.equal(plan.manifest.agentRuns, 'NOT RUN');
  assert.equal(plan.manifest.qualityImprovement, 'NOT ESTABLISHED');
  const review = JSON.parse(plan.operator['review.json']);
  assert.deepEqual(review.reviewers, []);
  assert.equal(review.limits.usdTotal, null);
  assert.equal(review.promotionThresholds, null);
  for (const id of ['resource-list', 'resource-detail', 'settings']) {
    assert.equal(JSON.parse(plan.arms.B[`.styleseed/artifacts/${id}.json`]).validation.humanAcceptance, true);
  }
});

test('written packages are exclusive physical copies and reject unsafe targets before writing', t => {
  const root = temporary(t);
  const output = join(root, 'four conditions with spaces');
  const created = writePilot(plan, { output });
  assert.equal(created, realpathSync(output));
  for (const [id, files] of Object.entries(plan.arms)) {
    for (const [path, content] of Object.entries(files)) assert.deepEqual(readFileSync(join(output, 'arms', id, path)), Buffer.from(content));
  }
  const before = readFileSync(join(output, 'operator/freeze.json'));
  assert.throws(() => writePilot(plan, { output }), /EEXIST/u);
  assert.deepEqual(readFileSync(join(output, 'operator/freeze.json')), before);
  assert.throws(() => writePilot(plan, { output: join(repo, 'must-not-create-pilot') }), /outside/u);
  assert.equal(existsSync(join(repo, 'must-not-create-pilot')), false);
  for (const path of ['../../escape', '/absolute', '..\\escape']) {
    const bad = { ...plan, arms: { A: { [path]: 'no' } } };
    assert.throws(() => writePilot(bad, { output: join(root, 'unsafe') }), /Unsafe/u);
    assert.equal(existsSync(join(root, 'unsafe')), false);
  }
  writeFileSync(join(output, 'arms/A/src/ui/button.tsx'), 'changed one copy');
  assert.deepEqual(readFileSync(join(output, 'arms/B/src/ui/button.tsx')), Buffer.from(plan.common['src/ui/button.tsx']));
});

test('installed B/C/D resolver contracts compile three artifacts without replacing library tokens', t => {
  const root = temporary(t);
  const output = writePilot(plan, { output: join(root, 'prepared') });
  for (const id of ['B', 'C', 'D']) {
    const app = join(output, 'arms', id);
    const resolver = join(app, '.agents/skills/ss-resolve/scripts/resolve-context.mjs');
    const before = readFileSync(join(app, 'src/styles/theme.css'));
    const compile = run(resolver, ['--project-root', '.', '--all', '--agent', 'codex'], app);
    assert.equal(compile.status, 0, compile.stderr);
    const check = run(resolver, ['--project-root', '.', '--all', '--agent', 'codex', '--check'], app);
    assert.equal(check.status, 0, check.stderr);
    assert.equal(readdirSync(join(app, '.styleseed/manifests')).length, 3);
    assert.equal(existsSync(join(app, '.styleseed/effective-rules.md')), false);
    assert.deepEqual(readFileSync(join(app, 'src/styles/theme.css')), before);
  }
});

test('pilot CLI is read-only by default and refuses execution/approval/unknown flags', t => {
  const root = temporary(t);
  const checked = run(script, ['--check'], root);
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).output, null);
  assert.deepEqual(readdirSync(root), []);
  for (const args of [['--run'], ['--approve'], ['--prepare', '--output'], ['--check', '--prepare']]) {
    assert.notEqual(run(script, args, root).status, 0);
    assert.deepEqual(readdirSync(root), []);
  }
});

test('a tampered skill cannot be frozen under the previous catalog revision', t => {
  const root = temporary(t);
  for (const { path } of plan.manifest.sourceInventory) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), readFileSync(join(repo, path)));
  }
  writeFileSync(join(root, 'engine/.claude/skills/ss-component/SKILL.md'), '# Changed without catalog regeneration\n');
  assert.throws(() => buildPilotPlan(root), /Stale skill inventory/u);
});
