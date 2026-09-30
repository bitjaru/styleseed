import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consolidateSkills } from '../../engine/.claude/skills/styleseed/workflows/ss-update/scripts/consolidate-skills.mjs';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hash = value => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'styleseed-single-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const skills = resolve(root, '.agents/skills');
  mkdirSync(skills, { recursive: true });
  // Copy ONLY the public skill, not the repository or a sibling runtime.
  cpSync(resolve(repo, 'skills/styleseed'), resolve(skills, 'styleseed'), { recursive: true });
  const inventory = [];
  for (const name of ['ss-build', 'ss-review', 'ss-resolve']) {
    const directory = resolve(skills, name);
    mkdirSync(directory, { recursive: true });
    const body = `---\nname: ${name}\ndescription: Legacy fixture.\n---\nLegacy workflow\n`;
    writeFileSync(resolve(directory, 'SKILL.md'), body);
    inventory.push({ path: `engine/.claude/skills/${name}/SKILL.md`, sha256: hash(body), bytes: Buffer.byteLength(body) });
  }
  mkdirSync(resolve(skills, 'ss-resolve/references'), { recursive: true });
  writeFileSync(resolve(skills, 'ss-resolve/references/catalog.json'), JSON.stringify({ distributions: { skills: { files: inventory } } }));
  writeFileSync(resolve(root, 'STYLESEED.md'), 'Approved project decisions');
  return { root, skills };
}
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? discover(resolve(directory, entry.name)) : entry.name === 'SKILL.md' ? [resolve(directory, entry.name)] : []);
}
test('one discoverable skill retains all 22 linked workflows without nested registrations', () => {
  const root = resolve(repo, 'skills');
  assert.deepEqual(discover(root), [resolve(root, 'styleseed/SKILL.md')]);
  const body = readFileSync(resolve(root, 'styleseed/SKILL.md'), 'utf8');
  const targets = [...body.matchAll(/\]\((workflows\/ss-[a-z0-9-]+\/WORKFLOW\.md)\)/g)].map(match => match[1]);
  assert.equal(new Set(targets).size, 22);
  for (const target of targets) assert.ok(existsSync(resolve(root, 'styleseed', target)), target);
});
test('consolidation dry-run preserves all files; apply archives exact old payloads and is idempotent', t => {
  const { root, skills } = fixture(t);
  const dry = consolidateSkills(skills);
  assert.equal(dry.mode, 'dry-run');
  assert.equal(dry.backupRoot, null);
  assert.equal(dry.entries.filter(entry => entry.eligible).length, 3);
  assert.equal(discover(skills).length, 4);
  const result = consolidateSkills(skills, { apply: true });
  assert.equal(result.archived.length, 3);
  assert.deepEqual(result.remaining, []);
  assert.equal(discover(skills).length, 1);
  assert.equal(discover(result.backupRoot).length, 3);
  assert.equal(readFileSync(resolve(root, 'STYLESEED.md'), 'utf8'), 'Approved project decisions');
  assert.deepEqual(consolidateSkills(skills, { apply: true }).archived, []);
});
test('modified, extra, and symlinked legacy entries remain untouched', t => {
  const { root, skills } = fixture(t);
  writeFileSync(resolve(skills, 'ss-build/SKILL.md'), 'User customized');
  writeFileSync(resolve(skills, 'ss-review/custom.md'), 'User note');
  symlinkSync(resolve(root, 'STYLESEED.md'), resolve(skills, 'ss-tokens'));
  const result = consolidateSkills(skills, { apply: true });
  assert.deepEqual(result.archived, ['ss-resolve']);
  assert.deepEqual(result.remaining, ['ss-build', 'ss-review', 'ss-tokens']);
  assert.equal(readFileSync(resolve(skills, 'ss-build/SKILL.md'), 'utf8'), 'User customized');
  assert.equal(readFileSync(resolve(skills, 'ss-review/custom.md'), 'utf8'), 'User note');
});
test('incomplete unified installation refuses to archive any legacy workflows', t => {
  const { skills } = fixture(t);
  rmSync(resolve(skills, 'styleseed/workflows/ss-build/WORKFLOW.md'));
  assert.throws(() => consolidateSkills(skills, { apply: true }), /complete unified StyleSeed skill/);
  assert.ok(existsSync(resolve(skills, 'ss-build/SKILL.md')));
});

test('checker reports legacy entries in the invoked provider when another provider is already consolidated', t => {
  const { root, skills } = fixture(t);
  cpSync(resolve(skills, 'styleseed'), resolve(root, '.claude/skills/styleseed'), { recursive: true });
  const catalog = JSON.parse(readFileSync(resolve(skills, 'styleseed/workflows/ss-resolve/references/catalog.json'), 'utf8'));
  const remote = resolve(root, 'remote.json');
  writeFileSync(remote, JSON.stringify({ version: catalog.engineVersion, revision: catalog.engineRevision, skillsRevision: catalog.distributions.skills.revision }));
  const check = () => {
    const run = spawnSync(process.execPath, [resolve(skills, 'styleseed/workflows/ss-update/scripts/check-update.mjs'), '--project-root', root, '--remote', remote, '--json'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };
  const before = check();
  assert.equal(before.status, 'legacy-skill-conflict');
  assert.equal(before.legacyRegistrations.length, 3);
  assert.equal(before.upgradeGuidance.next, 'consolidate-verified-legacy-entries');
  assert.equal(before.upgradeGuidance.archiveEligible, 3);
  assert.equal(realpathSync(before.installed.catalogPath), realpathSync(resolve(skills, 'styleseed/workflows/ss-resolve/references/catalog.json')));
  consolidateSkills(skills, { apply: true });
  assert.equal(check().status, 'current');
});

test('update guidance leads to same-scope consolidation without trusting remote instructions', t => {
  const { root, skills } = fixture(t);
  consolidateSkills(skills, { apply: true });
  const catalog = JSON.parse(readFileSync(resolve(skills, 'styleseed/workflows/ss-resolve/references/catalog.json'), 'utf8'));
  const remote = resolve(root, 'remote.json');
  const check = source => {
    const run = spawnSync(process.execPath, [resolve(skills, 'styleseed/workflows/ss-update/scripts/check-update.mjs'), '--project-root', root, '--remote', source, '--json'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };
  writeFileSync(remote, JSON.stringify({ version: catalog.engineVersion, revision: `sha256:${'a'.repeat(64)}`, skillsRevision: `sha256:${'b'.repeat(64)}`, upgrade: { guideUrl: 'https://untrusted.example/run', command: 'delete everything' } }));
  const update = check(remote);
  assert.equal(update.status, 'update-available');
  assert.equal(update.upgradeGuidance.next, 'refresh-then-consolidate');
  assert.equal(update.upgradeGuidance.guideUrl, 'https://styleseed-demo.vercel.app/upgrade');
  assert.equal(update.upgradeGuidance.command, undefined);
  assert.equal(update.upgradeGuidance.channel, 'edge');
  assert.match(update.upgradeGuidance.request.en, /current channel, agents, and project\/global scope/);
  writeFileSync(remote, JSON.stringify({ version: catalog.engineVersion, revision: catalog.engineRevision, skillsRevision: catalog.distributions.skills.revision }));
  assert.equal(check(remote).upgradeGuidance, null, 'a current install should not be nagged');
  assert.equal(check(resolve(root, 'unavailable.json')).upgradeGuidance, null, 'unavailable does not prove an update');
  mkdirSync(resolve(skills, 'styleseed-design-review'));
  writeFileSync(resolve(skills, 'styleseed-design-review/SKILL.md'), 'custom retired reviewer');
  assert.equal(check(remote).status, 'legacy-skill-conflict');
  assert.equal(check(remote).upgradeGuidance, null, 'retired custom reviewer is not a verified sibling consolidation');
});
