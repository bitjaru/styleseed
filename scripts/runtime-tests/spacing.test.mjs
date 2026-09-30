import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalizeSpacing, effectiveSpacing, spacingSection, recommendSpacing, SPACING_ROLES } from '../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/spacing-contract.mjs';
import { normalizeProject, normalizeArtifact } from '../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs';
import { compileContext, defaultCatalog as catalog } from '../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/compiler.mjs';
import { inspectArtifactImpact } from '../../engine/.claude/skills/styleseed/workflows/ss-update/scripts/artifact-impact.mjs';
const repo = fileURLToPath(new URL('../../', import.meta.url));
const script = name => resolve(repo, 'engine/.claude/skills/styleseed/workflows/ss-resolve/scripts', name);
const project = () => ({ schemaVersion: 1, projectId: 'spacing-test', defaults: { agent: 'codex', domain: 'saas', adapter: 'product-ui', recipe: 'enterprise-workbench', palette: 'cobalt-instrument', profile: 'none', fallback: null }, brand: { keyColor: '#0F766E', paletteCharacter: 'balanced', paletteMode: 'light', paletteHarmony: 'auto', surfaceTemperature: 'cool', fontFamilies: ['Inter'], radius: 'soft', elevation: 'flat', density: 'comfortable', motion: { seed: 'spring', intensity: 'restrained' }, imageryRole: 'data-first' } });
const artifact = (id = 'settings') => ({ schemaVersion: 1, id, target: { kind: 'route', locator: `/${id}` }, selection: { grammar: 'operations-console', adapter: null, domain: null, page: 'settings', recipe: null, palette: null, profile: null, fallback: null }, decisions: { primaryDecision: 'Choose notification preferences', primaryAction: 'Save changes', signatureMove: 'Separate notification groups' }, implementation: { sourceRoots: ['src'], tokenFiles: [] }, validation: { scoreFloor: 80, requiredRenders: [{ id: 'mobile', state: 'loaded', viewport: { width: 390, height: 844 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false } });
const shared = () => ({ wideMinWidth: 1024, roles: { sectionGap: { base: 24, wide: 40 }, componentInset: { base: 'var(--space-card)' } } });
function normalized(p = project(), a = artifact()) { const pn = normalizeProject(p, catalog); return [pn, normalizeArtifact(a, pn, catalog)]; }
function compile(p, a) {
  const [pn, an] = normalized(p, a);
  return compileContext({ catalog, projectRoot: repo, agent: 'codex', normalizedProject: pn, normalizedArtifact: an, inputFiles: { project: { path: '.styleseed/project.json', content: JSON.stringify(p) }, artifact: { path: `.styleseed/artifacts/${a.id}.json`, content: JSON.stringify(a) } }, mode: 'registry' });
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'styleseed spacing #'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.styleseed/artifacts'), { recursive: true });
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/app.js'), 'export const app = true;');
  writeFileSync(join(root, '.styleseed/project.json'), JSON.stringify({ ...project(), spacing: shared() }));
  writeFileSync(join(root, '.styleseed/artifacts/index.json'), JSON.stringify({ schemaVersion: 1, artifacts: ['settings', 'other'].map(id => ({ id, config: `${id}.json` })) }));
  for (const id of ['settings', 'other']) writeFileSync(join(root, `.styleseed/artifacts/${id}.json`), JSON.stringify(artifact(id)));
  return root;
}
function run(root, name, args = []) { return spawnSync(process.execPath, [script(name), '--project-root', root, ...args], { encoding: 'utf8' }); }

test('spacing validates finite bounded lengths, safe existing tokens, exact roles and responsive shapes', () => {
  assert.deepEqual(normalizeSpacing({ roles: { inlineGap: { base: 0, wide: 2.5 } } }).roles.inlineGap, { base: 0, wide: 2.5 });
  for (const value of [-1, 257, NaN, Infinity, null, '24px', 'var(--x);color:red', 'var(--x, 8px)', 'calc(2px)', {}]) assert.throws(() => normalizeSpacing({ roles: { sectionGap: { base: value } } }));
  for (const value of [null, {}, { roles: {} }, { roles: { typo: { base: 8 } } }, { roles: { sectionGap: { wide: 32 } } }, { roles: { sectionGap: { base: 8, extra: 1 } } }, { wideMinWidth: 0, roles: { sectionGap: { base: 8 } } }]) assert.throws(() => normalizeSpacing(value));
});
test('artifact section override preserves card padding, replaces wide value, and does not mutate source', () => {
  const p = { ...project(), spacing: shared() };
  const a = { ...artifact(), spacing: { roles: { sectionGap: { base: 48 } } } };
  const before = JSON.stringify([p, a]);
  const merged = effectiveSpacing(...normalized(p, a));
  assert.equal(merged.wideMinWidth, 1024);
  assert.deepEqual(merged.roles.sectionGap, { base: 48 });
  assert.deepEqual(merged.roles.componentInset, { base: 'var(--space-card)' });
  assert.deepEqual(merged.sources, { sectionGap: 'artifact', componentInset: 'project' });
  assert.equal(JSON.stringify([p, a]), before);
  assert.deepEqual(effectiveSpacing(...normalized(p, artifact('other'))).roles.sectionGap, { base: 24, wide: 40 });
});
test('optional spacing preserves old bundles, adapter boundary, and independent typography', () => {
  assert.equal(spacingSection(...normalized()), null);
  assert.doesNotMatch(compile(project(), artifact()).bundle, /Spatial roles/);
  const p = { ...project(), spacing: shared() }; const a = artifact(); a.selection.adapter = 'slide-deck';
  assert.equal(effectiveSpacing(...normalized(p, a)), null);
  assert.throws(() => normalized(p, { ...a, spacing: shared() }), /product-ui/);
  const bundle = compile(p, artifact()).bundle;
  assert.match(bundle, /--ss-space-component-inset: var\(--space-card\)/);
  assert.match(bundle, /data-styleseed-artifact="settings"/);
  const changed = { ...p, brand: { ...p.brand, density: 'compact' } };
  assert.deepEqual(effectiveSpacing(...normalized(p)), effectiveSpacing(...normalized(changed)));
});
test('proposals preserve explicit tokens and separate settings, comparison and narrative starting points', () => {
  const p = { ...project(), spacing: shared() };
  const proposal = recommendSpacing(...normalized(p));
  assert.equal(proposal.status, 'proposal-not-applied');
  assert.equal(proposal.designAcceptance, 'not-assessed');
  assert.deepEqual(proposal.spacing.roles.componentInset, p.spacing.roles.componentInset);
  assert.ok(!proposal.proposedRoles.includes('componentInset'));
  const a = artifact(); a.selection.grammar = 'expressive-marketing'; a.selection.page = 'landing';
  assert.equal(recommendSpacing(...normalized(project(), a)).spacing.roles.sectionGap.wide, 64);
  assert.equal(recommendSpacing(...normalized()).spacing.roles.groupGap.base, 24);
});
test('effective spacing changes method hash but not functional validation, and reversed key order is stable', () => {
  const p = { ...project(), spacing: shared() }; const a = artifact(); const before = compile(p, a);
  const after = compile(p, { ...a, spacing: { roles: { sectionGap: { base: 48 } } } });
  assert.notEqual(before.manifest.methodHash, after.manifest.methodHash);
  assert.equal(before.manifest.validationHash, after.manifest.validationHash);
  const reversed = { ...p, spacing: { roles: Object.fromEntries(Object.entries(p.spacing.roles).reverse()), wideMinWidth: 1024 } };
  assert.equal(compile(reversed, a).manifest.methodHash, before.manifest.methodHash);
});
test('resolver CLI persists spacing; edits stale only the affected artifact evidence; removal restores inherited role', t => {
  const root = fixture(t);
  let result = run(root, 'resolve-context.mjs', ['--all']); assert.equal(result.status, 0, result.stderr);
  const bundlePath = join(root, '.styleseed/bundles/settings.md');
  assert.match(readFileSync(bundlePath, 'utf8'), /--ss-space-section-gap: 24px/);
  const a = { ...artifact(), spacing: { roles: { sectionGap: { base: 48 } } } };
  writeFileSync(join(root, '.styleseed/artifacts/settings.json'), JSON.stringify(a));
  const impact = inspectArtifactImpact({ projectRoot: root }).artifacts;
  assert.equal(impact.find(x => x.id === 'other').status, 'current');
  const changed = impact.find(x => x.id === 'settings');
  assert.equal(changed.status, 'method-changed'); assert.equal(changed.evidence.visual, 'stale'); assert.equal(changed.evidence.human, 'stale');
  result = run(root, 'resolve-context.mjs', ['--artifact', 'settings', '--check']); assert.equal(result.status, 2);
  result = run(root, 'resolve-context.mjs', ['--artifact', 'settings']); assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(bundlePath, 'utf8'), /--ss-space-section-gap: 48px/);
  assert.equal(run(root, 'resolve-context.mjs', ['--artifact', 'settings', '--check']).status, 0);
  delete a.spacing; writeFileSync(join(root, '.styleseed/artifacts/settings.json'), JSON.stringify(a));
  assert.equal(run(root, 'resolve-context.mjs', ['--artifact', 'settings']).status, 0);
  assert.match(readFileSync(bundlePath, 'utf8'), /--ss-space-section-gap: 24px/);
});
test('proposal CLI is read-only, works from a spaced path, refuses malformed options and missing scope', t => {
  const root = fixture(t);
  const files = readdirSync(join(root, '.styleseed'));
  const before = readFileSync(join(root, '.styleseed/project.json'), 'utf8');
  const result = run(root, 'recommend-spacing.mjs', ['--artifact', 'settings']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'proposal-not-applied');
  assert.equal(readFileSync(join(root, '.styleseed/project.json'), 'utf8'), before);
  assert.deepEqual(readdirSync(join(root, '.styleseed')), files);
  for (const args of [[], ['--artifact', 'missing'], ['--artifact', 'settings', '--write'], ['--artifact', 'settings', '--artifact', 'other']]) assert.equal(run(root, 'recommend-spacing.mjs', args).status, 1);
});
test('schema roles and length contracts agree with runtime and both configuration scopes', () => {
  const schemas = ['project', 'artifact'].map(name => JSON.parse(readFileSync(resolve(repo, `engine/.claude/skills/styleseed/workflows/ss-resolve/references/${name}.schema.json`), 'utf8')));
  assert.deepEqual(schemas[0].$defs.spacing, schemas[1].$defs.spacing);
  assert.deepEqual(Object.keys(schemas[0].$defs.spacing.properties.roles.properties), Object.keys(SPACING_ROLES));
  assert.equal(schemas[0].$defs.spacingLength.oneOf[0].maximum, 256);
  assert.ok(new RegExp(schemas[0].$defs.spacingLength.oneOf[1].pattern).test('var(--space-card)'));
});


test('skills-only physical installation runs the proposal CLI without repository engine files', t => {
  const root = fixture(t);
  const installed = join(root, 'installed skills #', 'ss-resolve');
  cpSync(resolve(repo, 'engine/.claude/skills/styleseed/workflows/ss-resolve'), installed, { recursive: true });
  const result = spawnSync(process.execPath, [join(installed, 'scripts/recommend-spacing.mjs'), '--project-root', root, '--artifact', 'settings'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).spacing.roles.componentInset.base, 'var(--space-card)');
});

test('fully overridden project role changes do not alter effective artifact method hash', () => {
  const p = { ...project(), spacing: shared() };
  const a = { ...artifact(), spacing: { roles: { sectionGap: { base: 48, wide: 56 } } } };
  const before = compile(p, a);
  p.spacing.roles.sectionGap = { base: 80, wide: 100 };
  assert.equal(compile(p, a).manifest.methodHash, before.manifest.methodHash);
});

test('engine-owned spacing aliases cannot be used as project references, including cross-role cycles', () => {
  for (const name of ['section-gap', 'component-inset', 'anything']) {
    assert.throws(() => normalizeSpacing({ roles: { sectionGap: { base: `var(--ss-space-${name})` } } }), /reserved/);
  }
  const schema = JSON.parse(readFileSync(resolve(repo, 'engine/.claude/skills/styleseed/workflows/ss-resolve/references/project.schema.json'), 'utf8'));
  assert.equal(new RegExp(schema.$defs.spacingLength.oneOf[1].pattern).test('var(--ss-space-section-gap)'), false);
});

async function measuredFixture(t) {
  const root = fixture(t);
  const p = JSON.parse(readFileSync(join(root, '.styleseed/project.json'), 'utf8'));
  const [pn, an] = normalized(p, artifact());
  const { spacingSnapshot, measurementAdvice } = await import('../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/spacing-measurement.mjs');
  const snapshot = spacingSnapshot(root, pn, an, catalog.engineRevision);
  const effective = effectiveSpacing(pn, an);
  const report = { schemaVersion: 1, artifactId: an.id, provenance: snapshot, viewport: { width: 390, height: 844 }, contract: { wideMinWidth: effective.wideMinWidth, roles: effective.roles }, status: 'pass', measurements: [{ role: 'sectionGap', property: 'rowGap', expected: 24, actual: 24, delta: 0 }, { role: 'componentInset', property: 'paddingLeft', expected: 20, actual: 20, delta: 0 }], failures: [], unsupported: [], observations: [], scope: 'supplied-bindings-at-one-viewport', designAcceptance: 'not-assessed' };
  return { root, pn, an, snapshot, report, spacingSnapshot, measurementAdvice };
}

test('measured advice targets a wrapped control without rewriting unrelated spacing', async t => {
  const f = await measuredFixture(t);
  f.report.observations.push({ code: 'control-wrap', lines: 2 });
  const advice = f.measurementAdvice(f.report, f.snapshot, f.pn, f.an);
  assert.equal(advice.measurementStatus, 'pass');
  assert.equal(advice.nextActions[0].action, 'review-control-width');
  assert.equal(advice.spacing, undefined);
  assert.equal(recommendSpacing(f.pn, f.an).measurementStatus, 'not-supplied');
});

test('token failures, unsupported measurements and missing coverage cannot become a measured pass', async t => {
  const f = await measuredFixture(t);
  f.report.failures.push({ code: 'unresolved-token', role: 'componentInset' });
  assert.throws(() => f.measurementAdvice(f.report, f.snapshot, f.pn, f.an), /disagrees/);
  f.report.status = 'fail';
  assert.equal(f.measurementAdvice(f.report, f.snapshot, f.pn, f.an).nextActions[0].action, 'repair-token-reference');
  f.report.failures = []; f.report.measurements = [];
  f.report.status = 'pass';
  assert.throws(() => f.measurementAdvice(f.report, f.snapshot, f.pn, f.an), /omits role/);
  f.report.unsupported = [{ code: 'hidden-or-transformed-root' }]; f.report.status = 'unsupported';
  assert.equal(f.measurementAdvice(f.report, f.snapshot, f.pn, f.an).measurementStatus, 'unsupported');
});

test('measurement recommendations reject changed implementation, config, engine and foreign artifacts', async t => {
  const f = await measuredFixture(t);
  writeFileSync(join(f.root, 'src/app.js'), 'export const app = false;');
  const after = f.spacingSnapshot(f.root, f.pn, f.an, catalog.engineRevision);
  assert.throws(() => f.measurementAdvice(f.report, after, f.pn, f.an), /stale/);
  assert.throws(() => f.measurementAdvice(f.report, { ...f.snapshot, engineRevision: 'other' }, f.pn, f.an), /stale/);
  assert.throws(() => f.measurementAdvice({ ...f.report, artifactId: 'other' }, f.snapshot, f.pn, f.an), /different artifact/);
  const changed = { ...f.an, decisions: { ...f.an.decisions, primaryDecision: 'A different task' } };
  assert.throws(() => f.measurementAdvice(f.report, f.spacingSnapshot(f.root, f.pn, changed, catalog.engineRevision), f.pn, changed), /stale/);
});

test('measurement CLI preserves proposal values, consumes source-bound diagnostics, and rejects stale reports', async t => {
  const f = await measuredFixture(t);
  f.report.observations = [{ code: 'horizontal-overflow', excessPx: 80 }];
  writeFileSync(join(f.root, '.styleseed/spacing-measurement.json'), JSON.stringify(f.report));
  const result = run(f.root, 'recommend-spacing.mjs', ['--artifact', 'settings', '--measurement', '.styleseed/spacing-measurement.json']);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'proposal-not-applied'); assert.equal(output.designAcceptance, 'not-assessed');
  assert.equal(output.nextActions[0].action, 'review-container-width');
  assert.deepEqual(output.spacing.roles.componentInset, f.pn.spacing.roles.componentInset);
  writeFileSync(join(f.root, 'src/app.js'), 'export const app = 2;');
  const stale = run(f.root, 'recommend-spacing.mjs', ['--artifact', 'settings', '--measurement', '.styleseed/spacing-measurement.json']);
  assert.equal(stale.status, 1); assert.match(stale.stderr, /stale/);
});


test('measurement input cannot relabel a viewport, property, or empty observation as measured evidence', async t => {
  const f = await measuredFixture(t);
  for (const mutate of [
    report => { report.viewport.width = 1440; },
    report => { report.measurements[0].property = 'color'; },
    report => { report.observations = [{ code: 'control-wrap', lines: 1 }]; },
    report => { report.observations = [{ code: 'horizontal-overflow', excessPx: 0 }]; },
    report => { report.scope = 'all-states-verified'; },
  ]) {
    const report = structuredClone(f.report); mutate(report);
    assert.throws(() => f.measurementAdvice(report, f.snapshot, f.pn, f.an), /Invalid|disagrees/);
  }
});
