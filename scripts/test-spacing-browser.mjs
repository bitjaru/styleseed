#!/usr/bin/env node
// Integration fixture: verifies compiled CSS application, not expert design acceptance.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { effectiveSpacing, spacingCss } from '../engine/.claude/skills/ss-resolve/scripts/spacing-contract.mjs';
const output = mkdtempSync(join(tmpdir(), 'styleseed-spacing-browser-'));
const project = { spacing: { wideMinWidth: 900, roles: {
  pageInset: { base: 16, wide: 32 }, sectionGap: { base: 24, wide: 40 }, groupGap: { base: 24 },
  stackGap: { base: 8 }, inlineGap: { base: 8 }, componentInset: { base: 'var(--space-card)' },
} } };
const artifact = (id, override = false) => ({ id, selection: { adapter: 'product-ui' }, ...(override ? { spacing: { roles: { sectionGap: { base: 40, wide: 56 } } } } : {}) });
const html = (override) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Spatial contract integration fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f5f6;color:#17202b;font:16px/1.5 system-ui}h1,h2,p{margin:0}h1{font-size:24px}h2{font-size:18px}
:root{--space-card:20px}main{max-width:740px;margin:0 auto}article{padding:24px var(--ss-space-page-inset);display:flex;flex-direction:column;gap:var(--ss-space-section-gap)}
section{background:white;border:1px solid #ccd1d6;border-radius:8px;padding:var(--ss-space-component-inset);display:flex;flex-direction:column;gap:var(--ss-space-group-gap)}
.field{display:flex;flex-direction:column;gap:var(--ss-space-stack-gap)}.actions{display:flex;gap:var(--ss-space-inline-gap)}input,button{font:inherit;min-height:44px;border:1px solid #79848e;border-radius:4px;padding:8px;max-width:100%;min-width:0}label{font-weight:600}.note{color:#475360}.secondary{background:#e9edf0}
${spacingCss(effectiveSpacing(project, artifact('settings', override)), 'settings')}
${spacingCss(effectiveSpacing(project, artifact('other')), 'other')}
</style><main><article data-styleseed-artifact="settings"><h1>알림 설정</h1><section><h2>이메일 알림</h2><div class="field"><label for="email">받을 이메일</label><input id="email" value="team@example.com"><p class="note">결제 내역과 중요한 계정 변경 사항을 이 주소로 보내드립니다.</p></div><div class="field"><label for="name">표시 이름</label><input id="name" value="디자인 팀"><p class="note">팀원에게 표시되는 이름입니다.</p></div></section><section><h2>변경 내용 저장</h2><p>알림 설정은 다음 로그인 후에도 유지됩니다.</p><div class="actions"><button>저장</button><button>취소</button></div></section></article><article class="secondary" data-styleseed-artifact="other"><h2>다른 화면의 설정</h2><section><p>이 영역의 간격은 함께 변경되지 않습니다.</p></section></article></main></html>`;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage();
  for (const width of [390, 899, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const override of [false, true]) {
      await page.setContent(html(override));
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const root = document.querySelector('[data-styleseed-artifact="settings"]');
        const sections = root.querySelectorAll('section');
        const a = sections[0].getBoundingClientRect(), b = sections[1].getBoundingClientRect();
        const card = getComputedStyle(sections[0]);
        const inline = getComputedStyle(root.querySelector('.actions'));
        return { actualSectionGap: b.top - a.bottom, pageInset: parseFloat(getComputedStyle(root).paddingLeft), componentInset: parseFloat(card.paddingLeft), groupGap: parseFloat(card.rowGap), stackGap: parseFloat(getComputedStyle(root.querySelector('.field')).rowGap), inlineGap: parseFloat(inline.columnGap), otherGap: parseFloat(getComputedStyle(document.querySelector('[data-styleseed-artifact="other"]')).rowGap), bodySize: getComputedStyle(document.body).fontSize, targetHeight: root.querySelector('button').getBoundingClientRect().height, overflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      const wide = width >= 900;
      assert.equal(metrics.actualSectionGap, override ? (wide ? 56 : 40) : (wide ? 40 : 24));
      assert.equal(metrics.pageInset, wide ? 32 : 16);
      assert.equal(metrics.componentInset, 20);
      assert.equal(metrics.groupGap, 24); assert.equal(metrics.stackGap, 8); assert.equal(metrics.inlineGap, 8);
      assert.equal(metrics.otherGap, wide ? 40 : 24);
      assert.equal(metrics.bodySize, '16px'); assert.ok(metrics.targetHeight >= 44); assert.equal(metrics.overflow, false);
      let screenshot = null;
      if ([390, 1440].includes(width)) { screenshot = join(output, `${width}-${override ? 'after' : 'before'}.png`); await page.screenshot({ path: screenshot, fullPage: true }); }
      results.push({ width, override, metrics, screenshot });
    }
  }
  // A broken consumer must be distinguishable from a correctly applied contract.
  await page.addStyleTag({ content: '[data-styleseed-artifact="settings"] { gap: 1px !important; }' });
  const brokenGap = await page.locator('[data-styleseed-artifact="settings"]').evaluate(el => parseFloat(getComputedStyle(el).rowGap));
  assert.notEqual(brokenGap, 56);
  const report = { status: 'pass', scope: 'compiled-spacing-css-integration-fixture', designAcceptance: 'not-assessed', cases: results, mutationDetected: brokenGap === 1 };
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Spacing browser: ${results.length} cases passed; broken consumer detected. Evidence: ${output}`);
} finally { await browser.close(); }
