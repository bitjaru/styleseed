import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOptions, summarize, mutations, requiredChecks, probeSources } from '../test-design-pilot-library.mjs';
import { buildPilotPlan } from '../prepare-design-pilot.mjs';
import { sourceInventory } from '../design-pilot/support.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
function runs() {
  return ['desktop', 'mobile', ...Object.keys(mutations)].map(id => ({ id, executedChecks: [...requiredChecks],
    failedChecks: mutations[id] ? [mutations[id]] : [], environment: [], screenshot: { path: `${id}.png` } }));
}

test('library probe accepts only a new output path; CLI help/refusals load no build dependencies or run code', t => {
  assert.deepEqual(parseOptions([]), {});
  assert.deepEqual(parseOptions(['--output', 'new folder']), { output: 'new folder' });
  const root = mkdtempSync(join(tmpdir(), 'styleseed-library-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [args, exit] of [[['--help'], 0], [['--run'], 1], [['--approve'], 1], [['--url', 'http://127.0.0.1:3000'], 1], [['--output'], 1]]) {
    const result = spawnSync(process.execPath, [join(repo, 'scripts/test-design-pilot-library.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, exit, result.stderr);
    assert.deepEqual(readdirSync(root), []);
  }
});

test('library probe requires both real baselines and every designated defect, without environmental false positives', () => {
  assert.equal(summarize(runs()).status, 'pass');
  for (const tamper of [
    result => result.pop(),
    result => result.push(result[0]),
    result => { result[0].failedChecks.push('recipe-radius'); },
    result => { result[0].executedChecks.pop(); },
    result => { result[2].failedChecks = []; },
    result => { result[2].failedChecks = ['unrelated']; },
    result => { result[2].failedChecks.push('unrelated'); },
    result => { result[2].environment.push('browser crashed'); },
    result => { result[2].screenshot = null; },
  ]) { const result = runs(); tamper(result); assert.equal(summarize(result).status, 'fail'); }
});

test('probe remains operator-only; library bytes and experimental approval are not rewritten', () => {
  const plan = buildPilotPlan();
  for (const files of Object.values(plan.arms)) {
    assert.equal(Object.keys(files).some(path => /library-probe|test-design-pilot-library|operator/u.test(path)), false);
    assert.deepEqual(files['src/ui/input.tsx'], readFileSync(join(repo, 'engine/components/ui/input.tsx')));
    assert.deepEqual(files['src/styles/theme.css'], readFileSync(join(repo, 'skins/stripe/theme.css')));
  }
  assert.equal(plan.manifest.readyForAgentRuns, false);
  assert.equal(plan.manifest.humanVisualReview, 'NOT PERFORMED');
  assert.match(plan.arms.C['context/examples.tsx'].toString(), /className="ss-pattern-control min-h-11"/u);
  assert.equal(sourceInventory(repo, probeSources).length, probeSources.length);
});
