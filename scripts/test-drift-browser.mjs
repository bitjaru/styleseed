#!/usr/bin/env node
// Browser fixture for the drift report: three local pages of one "project". Two share the teal
// accent, the 4px radius and the 8px grid; the third paints its actions blue and rounds to 10px.
// The report must name the third page and nothing else. This is a measurement regression
// fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const cli = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');
const browser = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');

const page = (title, accent, radius) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#eff5f4;color:#090c0b;font:16px/1.5 system-ui}
main{max-width:960px;margin:0 auto;padding:32px}h1{font-size:32px;line-height:40px;margin:0 0 16px}h2{font-size:20px;line-height:28px;margin:0 0 8px}p{margin:0 0 8px}
.card{background:#fafdfd;border:1px solid #b4bdbb;border-radius:${radius}px;padding:24px;margin-bottom:16px}
.btn{display:inline-block;background:${accent};color:#fafcfc;border:0;border-radius:${radius}px;padding:8px 16px;height:40px;font:inherit}
a{color:${accent}}.muted{color:#4d5150;font-size:14px;line-height:20px}
</style><main>
<h1>${title}</h1>
<section class="card"><h2>오늘 결제</h2><p>승인 1,240건</p><p class="muted">어제보다 3% 증가</p><button class="btn">내보내기</button></section>
<section class="card"><h2>실패한 결제</h2><p>카드 한도 초과 12건</p><p><a href="#a">실패 목록 보기</a></p><button class="btn">재시도</button></section>
<section class="card"><h2>정산</h2><p class="muted">다음 정산 11월 7일</p><button class="btn">정산 내역</button></section>
</main></html>`;

const dir = mkdtempSync(join(tmpdir(), 'styleseed-drift-'));
try {
  const files = { 'home.html': page('홈', '#0f766e', 4), 'settings.html': page('설정', '#0f766e', 4), 'billing.html': page('청구', '#2563eb', 10) };
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
  console.log(`drift fixture passed: ${report.verdict}`);
} finally { rmSync(dir, { recursive: true, force: true }); }
