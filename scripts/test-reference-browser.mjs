#!/usr/bin/env node
// Browser fixture for the reference probe: a page whose largest coloured area is a picture-like
// panel in blue while every primary action is teal. The derived accent must be the action colour.
// This is a measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { observeDesign } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs';
import { summarize } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs';

const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>reference probe fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#eff5f4;color:#090c0b;font:16px/1.5 system-ui}
main{max-width:960px;margin:0 auto;padding:32px}h1{font-size:32px;line-height:40px;margin:0 0 16px}h2{font-size:20px;line-height:28px;margin:0 0 8px}p{margin:0 0 8px}
.hero{height:420px;background:#2563eb;border-radius:12px;margin-bottom:24px}
.card{background:#fafdfd;border:1px solid #b4bdbb;border-radius:4px;padding:24px;margin-bottom:16px}
.btn{display:inline-block;background:#0f766e;color:#fafcfc;border:0;border-radius:4px;padding:8px 16px;height:40px;font:inherit}
.ghost{background:transparent;color:#0f766e;border:1px solid #0f766e}
a{color:#00736b}.muted{color:#4d5150;font-size:14px;line-height:20px}
</style><main>
<h1>결제 대시보드</h1><div class="hero" aria-hidden="true"></div>
<section class="card"><h2>오늘 결제</h2><p>승인 1,240건</p><p class="muted">어제보다 3% 증가</p><button class="btn">내보내기</button> <button class="btn ghost">필터</button></section>
<section class="card"><h2>실패한 결제</h2><p>카드 한도 초과 12건, 네트워크 오류 3건</p><p><a href="#a">실패 목록 보기</a> · <a href="#b">재시도 규칙</a></p><button class="btn">재시도</button></section>
<section class="card"><h2>정산</h2><p class="muted">다음 정산 11월 7일</p><button class="btn">정산 내역</button></section>
</main></html>`;

const browser = await chromium.launch({ headless: true });
try {
  const observations = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    observations.push(await page.evaluate(observeDesign, { maxElements: 500 }));
    await page.close();
  }
  const s = summarize(observations);
  assert.equal(s.accentDerived, '#0f766e', `accent must come from the buttons, got ${s.accentDerived} (${s.accentFrom})`);
  assert.equal(s.accentFrom, 'filled-actions');
  assert.equal(s.accentAgreesAcrossViewports, true);
  assert.equal(s.ink, '#090c0b');
  assert.equal(s.canvas, '#eff5f4');
  assert.equal(s.spacingBase, 8, `spacing base 8 expected, got ${s.spacingBase} ${JSON.stringify(s.spacingScale)}`);
  assert.ok(s.spacingScale.includes(16) && s.spacingScale.includes(24), JSON.stringify(s.spacingScale));
  assert.ok(s.typeStepDetail.some(t => t.px === 32) && s.typeStepDetail.some(t => t.px === 14), JSON.stringify(s.typeStepDetail));
  assert.ok(s.radii.includes(4), JSON.stringify(s.radii));
  assert.ok(s.inkContrast > 15);
  for (const o of observations) {
    const dump = JSON.stringify(o);
    assert.ok(!dump.includes('결제') && !dump.includes('href'), 'the probe must not export page text or links');
  }
  console.log(`reference probe fixture passed: accent ${s.accentDerived} from ${s.accentFrom}, spacing base ${s.spacingBase}, ${s.typeSteps} type steps`);
} finally { await browser.close(); }
