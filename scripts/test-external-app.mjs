#!/usr/bin/env node
// This is a deterministic application regression, not an autonomous agent or visual approval.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { testBrowser } from './external-app/browser.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--output' && !args[1].startsWith('--'))) {
  throw new Error('Usage: node scripts/test-external-app.mjs [--output <new-directory>]');
}
// Never reuse or overwrite a user's folder. Failed runs remain available for inspection.
const output = args.length ? resolve(args[1]) : mkdtempSync(join(tmpdir(), 'styleseed-acceptance-report-'));
if (args.length) mkdirSync(output); // exclusive creation; EEXIST is intentional
const root = mkdtempSync(join(tmpdir(), 'styleseed-external-app-'));
const log = [];
const summary = {
  schemaVersion: 1, status: 'running', fixtureRoot: root,
  installationMethod: 'physical copy of current checkout skills; not an installer test',
  visualApproval: 'NOT PERFORMED', humanAcceptance: 'NOT PERFORMED', agentSession: 'NOT RUN',
};
function save(name, data) {
  writeFileSync(join(output, name), JSON.stringify(data, null, 2) + '\n');
}
function run(command, argv, cwd = root, expected = 0) {
  const result = spawnSync(command, argv, {
    cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' },
  });
  log.push({ command, args: argv, exit: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message });
  save('commands.json', log);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result.stdout;
}
function snapshot(directory, prefix = '') {
  const result = {};
  for (const name of readdirSync(join(directory, prefix)).sort()) {
    const path = prefix ? `${prefix}/${name}` : name;
    const entry = join(directory, path);
    const stat = lstatSync(entry);
    assert.equal(stat.isSymbolicLink(), false, `unexpected symlink: ${path}`);
    if (stat.isDirectory()) Object.assign(result, snapshot(directory, path));
    else result[path] = createHash('sha256').update(readFileSync(entry)).digest('hex');
  }
  return result;
}

console.log(`External fixture: ${root}\nReports: ${output}`);
try {
  summary.checkoutRevision = run('git', ['rev-parse', 'HEAD'], repo).trim();
  summary.checkoutDirty = run('git', ['status', '--porcelain', '--untracked-files=all'], repo).trim().length > 0;
  save('fixture-input-hashes.json', snapshot(join(repo, 'examples/incident-workbench')));
  save('harness-hashes.json', {
    'scripts/test-external-app.mjs': createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    ...Object.fromEntries(Object.entries(snapshot(join(repo, 'scripts/external-app'))).map(([path, hash]) => [`scripts/external-app/${path}`, hash])),
  });
  cpSync(join(repo, 'examples/incident-workbench'), root, { recursive: true });
  const installed = join(root, '.agents/skills');
  mkdirSync(dirname(installed), { recursive: true });
  cpSync(join(repo, 'skills'), installed, { recursive: true, dereference: false });
  const payload = snapshot(installed);
  summary.payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  assert.deepEqual(payload, snapshot(join(repo, 'engine/.claude/skills')), 'public skill mirror drifted');
  assert.equal(readdirSync(installed).filter(name => existsSync(join(installed, name, 'SKILL.md'))).length, 23);
  assert.equal(existsSync(join(installed, 'ss-learn')), false);
  // Reuse the repository's locked dependencies; do not fetch or install inside the application.
  const dependencyVersions = {};
  for (const name of ['react', 'react-dom', 'scheduler']) {
    const source = join(repo, 'demo-pricing/node_modules', name);
    assert.ok(existsSync(source), 'Run npm ci --prefix demo-pricing first');
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    cpSync(source, join(root, 'node_modules', name), { recursive: true });
    dependencyVersions[name] = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version;
  }
  const fixturePackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries(fixturePackage.dependencies)) {
    assert.equal(dependencyVersions[name], version, `${name}: update the fixture explicitly when changing demo dependencies`);
  }
  summary.dependencies = dependencyVersions;
  const lock = JSON.parse(readFileSync(join(repo, 'demo-pricing/package-lock.json'), 'utf8'));
  summary.toolchain = { node: process.version, platform: process.platform, packages: {} };
  for (const name of ['react', 'react-dom', 'scheduler', 'playwright', 'playwright-core']) {
    const installedVersion = JSON.parse(readFileSync(join(repo, 'demo-pricing/node_modules', name, 'package.json'), 'utf8')).version;
    summary.toolchain.packages[name] = { installed: installedVersion, locked: lock.packages[`node_modules/${name}`].version };
  }
  summary.toolchain.lockMatches = Object.values(summary.toolchain.packages).every(p => p.installed === p.locked);
  if (process.env.CI) assert.ok(summary.toolchain.lockMatches, 'CI dependencies differ from the lockfile; run npm ci');
  if (!summary.toolchain.lockMatches) console.warn('Local dependency versions differ from the lockfile; see summary.toolchain. CI reproduction is not verified.');
  const resolver = join(installed, 'ss-resolve/scripts/resolve-context.mjs');
  const doctor = join(installed, 'ss-resolve/scripts/styleseed-doctor.mjs');
  const gate = join(installed, 'ss-score/scripts/evidence-gate.mjs');
  const { verifyEvidenceRun } = await import(pathToFileURL(gate));
  const compile = () => run(process.execPath, [resolver, '--project-root', root, '--all', '--agent', 'codex']);
  compile();
  const approved = snapshot(join(root, '.styleseed'));
  const artifacts = ['incident-list', 'incident-detail'];
  run('git', ['init', '--quiet', '--template=']);
  run('git', ['add', '--', 'src', 'build.mjs', 'package.json']);
  mkdirSync(join(root, '.git/no-hooks'));
  run('git', ['-c', 'user.name=StyleSeed Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=.git/no-hooks', 'commit', '--quiet', '-m', 'Synthetic application baseline']);
  summary.fixtureRevision = run('git', ['rev-parse', 'HEAD']).trim();
  run(process.execPath, ['build.mjs']);
  run(process.execPath, ['--test', 'app.test.mjs']);
  for (const id of artifacts) {
    run(process.execPath, [gate, 'init', '--project-root', root, '--artifact', id, '--run', 'baseline', '--json']);
    const report = verifyEvidenceRun({ projectRoot: root, artifactId: id, runId: 'baseline', writeSummary: false });
    assert.equal(report.ok, false, 'init must not manufacture acceptance');
    assert.deepEqual(report.errors.sort(), ['code evidence is required', 'deterministic evidence is required', 'visual evidence is required']);
    save(`${id}-baseline.json`, report);
  }
  const beforeDoctor = snapshot(join(root, '.styleseed'));
  const initialDoctor = JSON.parse(run(process.execPath, [doctor, '--project-root', root, '--json'], root, 1));
  assert.ok(initialDoctor.artifacts.every(a => a.compilation.status === 'current' && a.evidence.currentRunIds.length === 0));
  assert.deepEqual(snapshot(join(root, '.styleseed')), beforeDoctor, 'doctor wrote files');
  save('doctor-baseline.json', initialDoctor);
  summary.browser = await testBrowser({ root, output, repo });

  // Exercise actual Git-bound source invalidation, without attaching invented reviewer reports.
  for (const changed of ['src/incident-list/page.mjs', 'src/shared/app.css', 'build.mjs']) {
    const path = join(root, changed);
    const original = readFileSync(path);
    try {
      writeFileSync(path, Buffer.concat([original, Buffer.from('\n/* acceptance source mutation */\n')]));
      compile(); // A no-op compile must not launder source changes into current evidence.
      const reports = {};
      for (const id of artifacts) {
        const report = verifyEvidenceRun({ projectRoot: root, artifactId: id, runId: 'baseline', writeSummary: false });
        const affected = changed !== 'src/incident-list/page.mjs' || id === 'incident-list';
        assert.equal(report.errors.includes('implementation source inventory is stale'), affected, `${changed}: ${id}`);
        assert.equal(report.errors.includes('implementation source roots differ from the bound repository revision'), affected, `${changed}: Git binding ${id}`);
        assert.equal(report.ok, false);
        reports[id] = report;
      }
      save(`mutation-${changed.replaceAll('/', '-')}.json`, reports);
    } finally {
      writeFileSync(path, original); // restore only this run's disposable file
    }
  }
  run(process.execPath, [resolver, '--project-root', root, '--all', '--agent', 'codex', '--check']);
  const after = snapshot(join(root, '.styleseed'));
  for (const [path, hash] of Object.entries(approved)) assert.equal(after[path], hash, `contract changed: ${path}`);
  assert.deepEqual(snapshot(installed), payload, 'installed skills changed');
  assert.equal(existsSync(join(root, 'STYLESEED.md')), false);
  assert.equal(existsSync(join(root, '.styleseed/effective-rules.md')), false);
  const finalDoctor = JSON.parse(run(process.execPath, [doctor, '--project-root', root, '--json'], root, 1));
  assert.ok(finalDoctor.artifacts.every(a => a.compilation.status === 'current' && a.evidence.currentRunIds.length === 0));
  save('doctor-final.json', finalDoctor);
  save('approved-contract-hashes.json', approved);
  summary.contractPreserved = true;
  summary.sourceInvalidation = ['list-only isolation', 'shared CSS affects both', 'build script affects both'];
  summary.status = 'pass';
} catch (error) {
  summary.status = 'fail';
  summary.error = error.stack || String(error);
  process.exitCode = 1;
  console.error(summary.error);
} finally {
  save('summary.json', summary);
  console.log(`External application regression: ${summary.status}. Visual approval: NOT PERFORMED.\nReports: ${output}`);
}
