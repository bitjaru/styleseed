#!/usr/bin/env node
// Browser fixture for the drift report: three local pages of one "project". Two share the teal
// accent, the 4px radius and the 8px grid; the third paints its actions blue and rounds to 10px.
// The report must name the third page and nothing else. The same pages then run against a
// decisions ledger (--decisions): recorded decisions turn the third page's values into violations,
// approved exceptions into approvals, and --gate follows. With --structure the third page's 52px
// table rows (the others use 40px) are named in a structure row, and the gate still follows the
// role axes only. This is a measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const cli = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');
const browser = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');

const page = (title, accent, radius, rowHeight = 40) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#eff5f4;color:#090c0b;font:16px/1.5 system-ui}
main{max-width:960px;margin:0 auto;padding:32px}h1{font-size:32px;line-height:40px;margin:0 0 16px}h2{font-size:20px;line-height:28px;margin:0 0 8px}p{margin:0 0 8px}
.card{background:#fafdfd;border:1px solid #b4bdbb;border-radius:${radius}px;padding:24px;margin-bottom:16px}
.btn{display:inline-block;background:${accent};color:#fafcfc;border:0;border-radius:${radius}px;padding:8px 16px;height:40px;font:inherit}
a{color:${accent}}.muted{color:#4d5150;font-size:14px;line-height:20px}
table{width:100%;border-collapse:collapse}tbody tr{height:${rowHeight}px}td{padding:0 16px;border-bottom:1px solid #b4bdbb}
</style><main>
<h1>${title}</h1>
<section class="card"><h2>오늘 결제</h2><p>승인 1,240건</p><p class="muted">어제보다 3% 증가</p><button class="btn">내보내기</button></section>
<section class="card"><h2>실패한 결제</h2><p>카드 한도 초과 12건</p><p><a href="#a">실패 목록 보기</a></p><button class="btn">재시도</button></section>
<section class="card"><h2>정산</h2><p class="muted">다음 정산 11월 7일</p><button class="btn">정산 내역</button></section>
<section class="card"><h2>최근 정산</h2><table><tbody><tr><td>11월 1일</td><td>1,240,000</td></tr><tr><td>11월 2일</td><td>980,500</td></tr><tr><td>11월 3일</td><td>1,102,000</td></tr></tbody></table></section>
</main></html>`;

const dir = mkdtempSync(join(tmpdir(), 'styleseed-drift-'));
try {
  const files = { 'home.html': page('홈', '#0f766e', 4), 'settings.html': page('설정', '#0f766e', 4), 'billing.html': page('청구', '#2563eb', 10, 52) };
  for (const [name, html] of Object.entries(files)) writeFileSync(join(dir, name), html);
  const out = join(dir, 'out');
  const run = spawnSync(process.execPath, [cli, ...Object.keys(files).map(name => pathToFileURL(join(dir, name)).href), '--out', out, '--browser', browser], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(readFileSync(join(out, 'drift.json'), 'utf8'));
  assert.deepEqual(report.screens.map(s => s.label), ['home', 'settings', 'billing']);
  assert.equal(report.baseline.values.accent, '#0f766e');
  assert.deepEqual(report.axes.accent.deviating, ['billing'], JSON.stringify(report.axes.accent));
  assert.deepEqual(report.axes.radii.screens.find(s => s.label === 'billing').extra, [10], JSON.stringify(report.axes.radii));
  assert.deepEqual(report.axes.spacingBase.deviating, [], JSON.stringify(report.axes.spacingBase));
  assert.deepEqual(report.screensWithDrift, ['billing']);
  assert.match(report.verdict, /^1 of 3 screens drift from the baseline on accent \(billing\)/u);
  const dump = readFileSync(join(out, 'drift.json'), 'utf8') + readFileSync(join(out, 'DRIFT.md'), 'utf8');
  assert.ok(!dump.includes('결제') && !dump.includes('청구'), 'the report must not export page text');
  assert.equal(Object.hasOwn(report, 'structure'), false, 'without --structure there are no structure rows');
  assert.ok(!dump.includes('table row height'), 'without --structure the table is unchanged');
  console.log(`drift fixture passed: ${report.verdict}`);

  // --structure: the 52px rows on billing are named; the role verdict and the gate are unchanged.
  const structured = join(dir, 'structured');
  const withStructure = spawnSync(process.execPath, [cli, ...Object.keys(files).map(name => pathToFileURL(join(dir, name)).href), '--out', structured, '--browser', browser, '--structure'], { encoding: 'utf8' });
  assert.equal(withStructure.status, 0, withStructure.stderr || withStructure.stdout);
  const structureReport = JSON.parse(readFileSync(join(structured, 'drift.json'), 'utf8'));
  const rowHeights = structureReport.structure.axes.tableRowHeights;
  assert.deepEqual(rowHeights.baseline, [40], JSON.stringify(rowHeights));
  assert.deepEqual(rowHeights.screens.map(s => [s.label, s.status, s.extra]), [['home', 'same', []], ['settings', 'same', []], ['billing', 'extra', [52]]]);
  assert.deepEqual(structureReport.structure.screensWithDrift, ['billing']);
  assert.equal(structureReport.structure.axes.primariesPerSection.screens.find(s => s.label === 'home').value, 1);
  assert.deepEqual(structureReport.screensWithDrift, report.screensWithDrift, 'structure rows do not change role drift');
  assert.match(structureReport.verdict, /Structure outside the shared set: table row height \(billing\)\./u);
  const structureMd = readFileSync(join(structured, 'DRIFT.md'), 'utf8');
  assert.ok(structureMd.includes('| table row height | 40 | 40 | 40 | 52 (+52) |'), structureMd);
  assert.ok(!structureMd.includes('결제') && !structureMd.includes('청구'), 'the structure rows must not export page text');
  console.log(`drift structure fixture passed: ${structureReport.verdict}`);

  // The decisions ledger: the regression test for "an approved decision was overwritten". The same
  // three pages are measured against recorded decisions passed with --decisions.
  const entry = (id, kind, axis, values, extra = {}) => ({ id, kind, axis, values, statement: `${axis} ${kind} for the fixture.`, approvedBy: 'fixture-reviewer', date: '2026-11-10', ...extra });
  const gated = (name, ledger) => {
    const file = join(dir, `${name}.json`);
    writeFileSync(file, JSON.stringify(ledger));
    const target = join(dir, name);
    const result = spawnSync(process.execPath, [cli, ...Object.keys(files).map(f => pathToFileURL(join(dir, f)).href), '--out', target, '--browser', browser, '--decisions', file, '--gate'], { encoding: 'utf8' });
    return { result, report: JSON.parse(readFileSync(join(target, 'drift.json'), 'utf8')), md: readFileSync(join(target, 'DRIFT.md'), 'utf8') };
  };
  const radius = entry('D-001', 'decision', 'radii', [4]);

  // 1. A decided 4px radius: the 10px page violates D-001 and the gate names the decision and the page.
  const decided = gated('decided', [radius]);
  assert.equal(decided.result.status, 3, decided.result.stderr || decided.result.stdout);
  assert.match(decided.result.stderr, /drift gate: FAIL — .*decision violations: D-001 on billing \(radii 10\)/u, decided.result.stderr);
  assert.equal(decided.report.axes.radii.screens.find(s => s.label === 'billing').status, 'violates');
  assert.deepEqual(decided.report.decisions.violations, [{ id: 'D-001', screen: 'billing', axis: 'radii', values: [10] }]);

  // 2. An approved exception to D-001 for 10px on billing, plus a decided accent billing still breaks:
  //    the radius reads approved, the accent reads as a violation, and the gate still fails.
  const exception = entry('D-002', 'exception', 'radii', [10], { to: 'D-001', scope: { screens: ['billing'] } });
  const accent = entry('D-003', 'decision', 'accent', ['#0F766E']);
  const mixed = gated('mixed', [radius, exception, accent]);
  assert.equal(mixed.result.status, 3, mixed.result.stderr || mixed.result.stdout);
  const billingRadius = mixed.report.axes.radii.screens.find(s => s.label === 'billing');
  assert.equal(billingRadius.status, 'excepted', JSON.stringify(billingRadius));
  assert.equal(billingRadius.exception, 'D-002');
  const billingAccent = mixed.report.axes.accent.screens.find(s => s.label === 'billing');
  assert.deepEqual([billingAccent.status, billingAccent.decision], ['violates', 'D-003'], JSON.stringify(billingAccent));
  assert.deepEqual(mixed.report.screensWithDrift, [], 'a decision violation is reported as a violation, not as drift');
  assert.deepEqual(mixed.report.decisions.violations, [{ id: 'D-003', screen: 'billing', axis: 'accent', values: ['#2563eb'] }]);
  assert.deepEqual(mixed.report.decisions.excepted, [{ id: 'D-002', screen: 'billing', axis: 'radii', values: [10] }]);
  assert.match(mixed.result.stderr, /D-003 on billing \(accent #2563eb\)/u);
  assert.ok(!/D-001 on billing/u.test(mixed.result.stderr), 'the approved radius must not fail the gate');
  assert.ok(mixed.md.includes('(approved D-002: 10)') && mixed.md.includes('#2563eb (violates D-003)'), mixed.md);
  assert.match(mixed.report.verdict, /1 value\(s\) violate recorded decisions: D-003 on billing \(#2563eb\)\. Approved exceptions used: D-002 on billing\./u);

  // 3. When every deviation is an approved exception, the gate passes.
  const approved = gated('approved', [radius, exception, accent, entry('D-004', 'exception', 'accent', ['#2563EB'], { to: 'D-003', scope: { screens: ['billing'] } })]);
  assert.equal(approved.result.status, 0, approved.result.stderr || approved.result.stdout);
  assert.deepEqual(approved.report.decisions.violations, []);
  assert.deepEqual(approved.report.screensWithDrift, []);
  assert.match(approved.report.verdict, /Approved exceptions used: D-002 on billing; D-004 on billing\./u);
  console.log(`drift ledger fixture passed: ${mixed.report.verdict}`);
} finally { rmSync(dir, { recursive: true, force: true }); }
