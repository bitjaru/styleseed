#!/usr/bin/env node
// Browser fixture for the reference loop end to end, in a temporary project outside the repository:
// the WO-04 settings page is the reference, measured in project mode over a local http server with
// --robots and --frames; its contract is compiled, edited (the person sets sectionsOverOne to observe
// and writes a note on each kept derived fact), approved, selected, and resolved; the brief is
// written. The "build" (a local file) is the same page with a second primary action in the first
// settings group at 768px and wider, 52px table rows, and blue actions, in a project whose brand font
// is the reference's.
// drift-report.mjs --reference must find exactly one kept fact that differs (primaries per section at
// 1440), the row height as an adapted row that differs, nothing copied, and exit 3 with --gate; the
// drift files must be byte-identical to a run without --reference. Measurement regression fixture,
// not a design judgment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measure, parseArgs } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { parseArgs as contractArgs, run as compileContract } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-contract.mjs';
import { parseArgs as briefArgs, run as compileBrief } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-brief.mjs';
import { settingsPage } from './lib/reference-settings-page.mjs';
import { writeProject } from './lib/reference-synthetic.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const workflows = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows');
const drift = resolve(workflows, 'ss-verify/scripts/drift-report.mjs');
const resolver = resolve(workflows, 'ss-resolve/scripts/resolve-context.mjs');
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const reference = settingsPage();
const build = settingsPage({ rowHeight: 52, extraPrimary: true, accent: '#2563eb' });
const pngSize = png => [png.readUInt32BE(16), png.readUInt32BE(20)];

const server = createServer((req, res) => {
  if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('User-agent: *\nAllow: /\n'); return; }
  if (req.url === '/settings') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(reference); return; }
  res.writeHead(404); res.end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const tmp = mkdtempSync(join(tmpdir(), 'styleseed-distance-'));
try {
  const root = join(tmp, 'project');
  mkdirSync(root);
  writeProject(root, { slug: 'settings-ref', brand: { fontFamilies: ['system-ui'] } });
  // The build is a local file: drift-report runs as a child process, which a server in this process
  // could not answer while spawnSync waits.
  writeFileSync(join(tmp, 'build.html'), build);
  const buildUrl = pathToFileURL(join(tmp, 'build.html')).href;

  // 1. The reference, measured in project mode with frames.
  const logs = [];
  await measure(parseArgs([`${origin}/settings`, '--project-root', root, '--slug', 'settings-ref', '--robots', '--frames', '--browser', browserModule]), line => logs.push(line));
  const base = join(root, '.styleseed/evidence/_reference');
  assert.equal(readFileSync(join(base, '.gitignore'), 'utf8'), '*/frames/\n');
  assert.deepEqual(pngSize(readFileSync(join(base, 'settings-ref/frames/1440.png'))), [1440, 900], 'the first viewport only, not the full page');
  assert.deepEqual(pngSize(readFileSync(join(base, 'settings-ref/frames/390.png'))), [390, 844]);
  assert.match(logs.join('\n'), /Frames are ignored by git by default .* and are yours to keep private\./u);
  assert.equal(existsSync(join(base, 'settings-ref/case.draft.json')), false, 'no case draft in a project');
  const source = JSON.parse(readFileSync(join(base, 'settings-ref/measurements/source.json'), 'utf8'));
  assert.deepEqual([source.robots, source.scroll, source.viewports], ['allowed', true, [1440, 390]]);
  assert.deepEqual(disallowedStrings(JSON.parse(readFileSync(join(base, 'settings-ref/measurements/facts.json'), 'utf8')), { url: `${origin}/settings` }), []);

  // 2. Compile, edit, approve, resolve, brief.
  const quiet = { log: () => {}, warn: () => {}, out: () => {} };
  const measurements = join(base, 'settings-ref/measurements');
  const contract = argv => compileContract(contractArgs(['--project-root', root, '--slug', 'settings-ref', ...argv]), quiet);
  contract(['--measurements', measurements, '--write']);
  const evidencePath = join(root, '.styleseed/rulesets/settings-ref/evidence.json');
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  assert.deepEqual([evidence.sources[0].robots, evidence.sources[0].scroll], ['allowed', true]);
  for (const fact of evidence.facts) {
    if (fact.id === 'navigation.primary.sectionsOverOne') { fact.transfer = 'observe'; delete fact.compare; delete fact.note; }
    else if (fact.transfer === 'keep' && fact.level === 'derived') fact.note = 'Holds on every settings screen of this product.';
  }
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  contract(['--measurements', measurements, '--write']);
  contract(['--approve', '--reviewer', 'reviewer-a']);
  const resolved = spawnSync(process.execPath, [resolver, '--project-root', root, '--artifact', 'app-ops', '--agent', 'codex'], { encoding: 'utf8' });
  assert.equal(resolved.status, 0, resolved.stderr);
  compileBrief(briefArgs(['--project-root', root, '--artifact', 'app-ops', '--write']), { log: () => {}, out: () => {} });
  const brief = readFileSync(join(root, '.styleseed/briefs/app-ops.md'), 'utf8');
  assert.ok(brief.includes('- `.styleseed/evidence/_reference/settings-ref/frames/1440.png` (viewport 1440)'), brief);
  assert.ok(brief.includes('(none yet: ask the user one question — what is wrong with the current screen?)'));

  // 3. Distance of the build, with --gate: exit 3, naming the one kept fact that differs.
  const out = join(tmp, 'with-reference');
  const run = spawnSync(process.execPath, [drift, buildUrl, '--out', out, '--project-root', root, '--reference', 'settings-ref', '--gate', '--browser', browserModule], { encoding: 'utf8' });
  assert.equal(run.status, 3, run.stderr || run.stdout);
  assert.match(run.stdout, /--reference settings-ref: --structure is on/u);
  assert.match(run.stdout, /--reference settings-ref: --scroll is on \(the reference was measured with its scroll pass/u);
  assert.match(run.stderr, /distance gate: FAIL — keep facts that differ: navigation\.primary\.perSectionMax @1440$/mu, run.stderr);
  assert.doesNotMatch(run.stderr, /avoid values copied/u, 'blue actions and the project\'s own font: nothing copied');
  const distance = JSON.parse(readFileSync(join(out, 'distance.json'), 'utf8'));
  const differ = distance.rows.filter(r => r.transfer === 'keep' && r.status === 'different');
  assert.deepEqual(differ.map(r => [r.id, r.viewport, r.reference, r.built]), [['navigation.primary.perSectionMax', 1440, 1, 2]], JSON.stringify(differ));
  const rowHeight = distance.rows.find(r => r.id === 'density.table.rowHeight' && r.viewport === 1440);
  assert.deepEqual([rowHeight.transfer, rowHeight.reference, rowHeight.built, rowHeight.status], ['adapt', 40, 52, 'different']);
  assert.equal(distance.rows.find(r => r.id === 'navigation.primary.perSectionMax' && r.viewport === 390).status, 'same', 'the second primary is hidden below 768px');
  assert.deepEqual(distance.rows.filter(r => r.transfer === 'avoid').map(r => [r.id, r.status]), [['tokens.accent', 'clear']], 'the reference was measured in system-ui only, so the fonts axis is proposed as observe and gets no avoid row');
  assert.equal(distance.rows.find(r => r.id === 'tokens.fonts'), undefined);
  assert.equal(distance.verdict, '1 keep fact differs, 0 avoid values copied');
  const md = readFileSync(join(out, 'DISTANCE.md'), 'utf8');
  assert.ok(md.includes('**Verdict:** 1 keep fact differs, 0 avoid values copied.'));
  assert.ok(md.includes('| keep | `navigation.primary.perSectionMax` | 1440 | at most | 1 | 2 | different |'), md);
  for (const leak of ['스토어', '결제', '게시', 'owner@', 'fx-']) assert.ok(!md.includes(leak) && !JSON.stringify(distance).includes(leak), `no page text in the distance (${leak})`);

  // 4. Distance is not drift: the same run without --reference (with the flags it turned on) writes
  //    the same drift files byte for byte.
  const plain = join(tmp, 'plain');
  const without = spawnSync(process.execPath, [drift, buildUrl, '--out', plain, '--project-root', root, '--structure', '--scroll', '--browser', browserModule], { encoding: 'utf8' });
  assert.equal(without.status, 0, without.stderr || without.stdout);
  for (const name of ['drift.json', 'DRIFT.md']) assert.ok(readFileSync(join(plain, name)).equals(readFileSync(join(out, name))), `${name} is byte-identical with and without --reference`);
  assert.equal(existsSync(join(plain, 'DISTANCE.md')), false);
  const noGate = spawnSync(process.execPath, [drift, buildUrl, '--out', join(tmp, 'no-gate'), '--project-root', root, '--reference', 'settings-ref', '--browser', browserModule], { encoding: 'utf8' });
  assert.equal(noGate.status, 0, 'without --gate the distance is reported, not enforced');
  console.log(`reference distance fixture passed: ${distance.verdict}; row height ${rowHeight.reference} -> ${rowHeight.built} (${rowHeight.status}); drift files identical with and without --reference`);
} finally {
  server.close();
  rmSync(tmp, { recursive: true, force: true });
}
