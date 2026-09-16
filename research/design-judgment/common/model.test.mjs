import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterResources, pauseResources, validateSettings, saveSettings, hasUnsavedChanges } from './model.mjs';
const { resources, settings } = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));

test('search and status filters compose without mutating records', () => {
  const before = JSON.stringify(resources);
  assert.deepEqual(filterResources(resources, { query: ' PLATFORM ', status: 'active' }).map(r => r.id), ['res-101']);
  assert.deepEqual(filterResources(resources, { query: 'RES-102' }).map(r => r.id), ['res-102']);
  assert.deepEqual(filterResources(resources, { query: 'missing' }), []);
  assert.deepEqual(filterResources([], {}), []);
  assert.throws(() => filterResources(resources, { status: 'invented' }));
  assert.equal(JSON.stringify(resources), before);
});
test('bulk pause is atomic and permission/protection aware', () => {
  for (const [ids, role, reason] of [
    [['res-102'], 'viewer', 'permission-denied'], [[], 'editor', 'empty-selection'],
    [['res-102', 'missing'], 'editor', 'unknown-resource'],
    [['res-102', 'res-101'], 'editor', 'protected-resource'],
    [['res-102', 'res-103'], 'editor', 'not-active'],
  ]) {
    const result = pauseResources(resources, ids, role);
    assert.equal(result.reason, reason);
    assert.equal(result.resources, resources);
  }
  const result = pauseResources(resources, ['res-102', 'res-104', 'res-102'], 'editor');
  assert.equal(result.ok, true);
  assert.deepEqual(result.changedIds, ['res-102', 'res-104']);
  assert.equal(result.resources.find(r => r.id === 'res-102').status, 'paused');
  assert.equal(resources.find(r => r.id === 'res-102').status, 'active');
});
test('settings validation rejects coercion and reports field errors', () => {
  for (const retentionDays of ['', ' ', '7.1', 7.1, null, false, 6, 91, '1e1', '0x10']) {
    assert.ok(validateSettings({ ...settings, retentionDays }).errors.retentionDays);
  }
  assert.deepEqual(validateSettings({ ...settings, workspaceName: ' Updated ', retentionDays: ' 90 ' }).value,
    { workspaceName: 'Updated', digest: 'daily', retentionDays: 90 });
  const invalid = validateSettings({ workspaceName: ' ', digest: 'hourly', retentionDays: 1 });
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['digest', 'retentionDays', 'workspaceName']);
});
test('failed save retains the draft and dirty state until a successful retry', () => {
  const draft = { ...settings, workspaceName: 'New workspace' };
  assert.equal(hasUnsavedChanges(settings, settings), false);
  for (const options of [{ role: 'viewer' }, { role: 'editor', fail: true }]) {
    const result = saveSettings(settings, draft, options);
    assert.equal(result.ok, false);
    assert.equal(result.saved, settings);
    assert.equal(result.draft, draft);
    assert.equal(hasUnsavedChanges(result.saved, result.draft), true);
  }
  const invalid = saveSettings(settings, { ...draft, workspaceName: '' }, { role: 'editor' });
  assert.equal(invalid.reason, 'invalid');
  const retry = saveSettings(settings, draft, { role: 'editor' });
  assert.equal(retry.ok, true);
  assert.equal(hasUnsavedChanges(retry.saved, retry.draft), false);
});
