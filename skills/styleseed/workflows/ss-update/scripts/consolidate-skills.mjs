#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDistribution } from '../../ss-resolve/scripts/distribution-integrity.mjs';

const names = ['a11y', 'audit', 'build', 'component', 'copy', 'dial', 'feedback', 'flow', 'lint', 'motion', 'page', 'pattern', 'reference', 'resolve', 'restyle', 'review', 'score', 'setup', 'studio', 'tokens', 'update', 'verify'].map(name => `ss-${name}`);
const hash = data => createHash('sha256').update(data).digest('hex');
function regularFiles(root, prefix = '') {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = resolve(root, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) throw new Error(`Linked or special file: ${relative}`);
    return stat.isDirectory() ? regularFiles(path, relative) : [relative];
  }).sort();
}

// Read-only inventory. Never infer ownership from the ss-* name alone.
export function inspectLegacySkills(skillsRoot) {
  const root = resolve(skillsRoot);
  if (lstatSync(root).isSymbolicLink()) throw new Error('Choose a physical skills directory, not a symlink');
  const catalogPath = resolve(root, 'ss-resolve/references/catalog.json');
  let catalog = null;
  if (existsSync(catalogPath) && !lstatSync(resolve(root, 'ss-resolve')).isSymbolicLink()) {
    try { catalog = JSON.parse(readFileSync(catalogPath, 'utf8')); } catch { /* unproven payload stays untouched */ }
  }
  const inventory = catalog?.distributions?.skills?.files;
  return names.filter(name => existsSync(resolve(root, name))).map(name => {
    const path = resolve(root, name);
    const result = { name, path, eligible: false, reason: null };
    try {
      if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory()) throw new Error('Linked or non-directory entry; preserve for manual review');
      if (!Array.isArray(inventory)) throw new Error('No legacy revision inventory; preserve for manual review');
      const prefix = `engine/.claude/skills/${name}/`;
      const expected = inventory.filter(file => typeof file.path === 'string' && file.path.startsWith(prefix));
      if (!expected.some(file => file.path === `${prefix}SKILL.md`)) throw new Error('No canonical workflow inventory');
      const expectedPaths = expected.map(file => file.path.slice(prefix.length)).sort();
      if (new Set(expectedPaths).size !== expectedPaths.length) throw new Error('Duplicate inventory paths');
      // The catalog omits itself to avoid a recursive hash. It is retained intact in the backup.
      const actual = regularFiles(path).filter(file => !(name === 'ss-resolve' && file === 'references/catalog.json'));
      if (JSON.stringify(actual) !== JSON.stringify(expectedPaths)) throw new Error('Added or missing files; preserve customized payload');
      for (const file of expected) {
        const relative = file.path.slice(prefix.length);
        if (relative.split('/').some(part => !part || part === '.' || part === '..') || relative.includes('\\')) throw new Error('Invalid inventory path');
        const bytes = readFileSync(resolve(path, relative));
        if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error(`Modified file: ${relative}`);
      }
      result.eligible = true;
      result.reason = 'Exact legacy inventory match; can archive outside skill discovery';
    } catch (error) { result.reason = error.message; }
    return result;
  });
}

export function consolidateSkills(skillsRoot, { apply = false } = {}) {
  const root = resolve(skillsRoot);
  const installedCatalog = resolve(root, 'styleseed/workflows/ss-resolve/references/catalog.json');
  const catalog = JSON.parse(readFileSync(installedCatalog, 'utf8'));
  const verification = verifyDistribution({ catalog, scriptPath: resolve(root, 'styleseed/workflows/ss-update/scripts/check-update.mjs') });
  if (verification.status !== 'verified') throw new Error(`Install the complete unified StyleSeed skill first (${verification.status})`);
  const entries = inspectLegacySkills(root);
  const candidates = entries.filter(entry => entry.eligible);
  let backupRoot = null;
  if (apply && candidates.length) {
    backupRoot = resolve(dirname(root), 'styleseed-backups', randomUUID());
    // Refuse redirected backup directories; never place discoverable SKILL.md archives in skills/.
    const parent = dirname(backupRoot);
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Backup directory must not be a symlink');
    mkdirSync(backupRoot, { recursive: true });
    for (const entry of candidates) renameSync(entry.path, resolve(backupRoot, entry.name));
  }
  return { mode: apply ? 'apply' : 'dry-run', skillsRoot: root, backupRoot, entries, archived: apply ? candidates.map(entry => entry.name) : [], remaining: inspectLegacySkills(root).map(entry => entry.name) };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const argv = process.argv.slice(2);
    if (argv.includes('--help')) {
      console.log('Usage: consolidate-skills.mjs --skills-root <physical skills directory> [--apply]\nDefault is read-only. Install the unified skill first. Exact legacy payloads are moved to a sibling styleseed-backups directory; modified/unknown skills stay in place.');
    } else {
      let root; let apply = false;
      for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--apply') apply = true;
        else if (argv[i] === '--skills-root' && argv[i + 1] && !argv[i + 1].startsWith('--')) root = argv[++i];
        else throw new Error(`Unknown or incomplete option: ${argv[i]}`);
      }
      if (!root) throw new Error('--skills-root is required');
      const result = consolidateSkills(root, { apply });
      console.log(JSON.stringify(result, null, 2));
      if (apply && result.remaining.length) process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
