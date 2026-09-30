#!/usr/bin/env node
// Integration fixture: verifies compiled CSS application, not expert design acceptance.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { inspectSpacing } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-spacing.mjs';
import { effectiveSpacing, spacingCss } from '../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/spacing-contract.mjs';
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
      const inspection = await page.evaluate(inspectSpacing, {
        artifactId: 'settings', spacing: effectiveSpacing(project, artifact('settings', override)),
        bindings: [
          { role: 'pageInset', selector: 'article', property: 'paddingLeft' },
          { role: 'sectionGap', selector: 'article', property: 'rowGap' },
          { role: 'groupGap', selector: 'section', property: 'rowGap' },
          { role: 'stackGap', selector: '.field', property: 'rowGap' },
          { role: 'inlineGap', selector: '.actions', property: 'columnGap' },
          { role: 'componentInset', selector: 'section', property: 'paddingLeft' },
        ], noWrapControls: ['button'],
      });
      assert.equal(inspection.status, 'pass', JSON.stringify(inspection));
      assert.equal(inspection.observations.length, 0);
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
  const adversarial = [];
  for (const [name, value, tokenCss, expectedStatus, expectedCode] of [
    ['missing-token', 'var(--missing)', '', 'fail', 'unresolved-token'],
    ['negative-token', 'var(--negative)', ':root{--negative:-8px}', 'fail', 'invalid-token-length'],
    ['cyclic-project-token', 'var(--a)', ':root{--a:var(--b);--b:var(--a)}', 'fail', 'unresolved-token'],
    ['relative-token', 'var(--relative)', ':root{font-size:16px;--relative:1.5rem}', 'pass', null],
    ['unsupported-expression', 'var(--fluid)', ':root{--fluid:clamp(8px,2vw,24px)}', 'unsupported', 'unsupported-token-length'],
  ]) {
    const spacing = { wideMinWidth: 900, roles: { sectionGap: { base: value } } };
    await page.setContent(`<style>${tokenCss}${spacingCss(spacing, 'probe')}.stack{display:flex;flex-direction:column;gap:var(--ss-space-section-gap)}.box{height:20px}</style><div data-styleseed-artifact="probe" class="stack"><div class="box">One group</div><div class="box">Another group</div></div>`);
    const result = await page.evaluate(inspectSpacing, { artifactId: 'probe', spacing, bindings: [{ role: 'sectionGap', selector: '.stack', property: 'rowGap' }] });
    assert.equal(result.status, expectedStatus, name);
    if (expectedCode) assert.ok([...result.failures, ...result.unsupported].some(x => x.code === expectedCode), name);
    adversarial.push({ name, result });
  }
  const outer = { wideMinWidth: 900, roles: { sectionGap: { base: 64 } } };
  for (const ownsGap of [false, true]) {
    const inner = { wideMinWidth: 900, roles: { componentInset: { base: 16 }, ...(ownsGap ? { sectionGap: { base: 24 } } : {}) } };
    // Parent CSS deliberately comes AFTER child CSS; specificity must preserve explicit child values.
    await page.setContent(`<style>:root{--native-gap:12px}${spacingCss(inner, 'inner')}${spacingCss(outer, 'outer')}.stack{display:flex;flex-direction:column;gap:var(--ss-space-section-gap,var(--native-gap));padding:var(--ss-space-component-inset,0px)}.box{height:20px}</style><div data-styleseed-artifact="outer"><div data-styleseed-artifact="inner" class="stack"><div class="box">Child one</div><div class="box">Child two</div></div><div data-styleseed-artifact="unconfigured" class="stack"><div class="box">Native one</div><div class="box">Native two</div></div></div>`);
    assert.equal(await page.locator('[data-styleseed-artifact="inner"]').evaluate(el => parseFloat(getComputedStyle(el).gap)), ownsGap ? 24 : 12);
    assert.equal(await page.locator('[data-styleseed-artifact="unconfigured"]').evaluate(el => parseFloat(getComputedStyle(el).gap)), 12);
    assert.equal(await page.locator('[data-styleseed-artifact="inner"]').evaluate(el => getComputedStyle(el).getPropertyValue('--native-gap').trim()), '12px');
    adversarial.push({ name: ownsGap ? 'nested-explicit' : 'nested-native-fallback', status: 'pass' });
  }
  const simple = { wideMinWidth: 900, roles: { sectionGap: { base: 24 } } };
  const binding = [{ role: 'sectionGap', selector: '.stack', property: 'rowGap' }];
  for (const [name, style, expectedStatus, expectedCode] of [
    ['block-gap', 'display:block', 'fail', 'gap-container-not-supported'],
    ['hidden', 'display:none', 'unsupported', 'hidden-or-transformed-root'],
    ['unapplied', 'gap:0px', 'fail', 'spacing-mismatch'],
  ]) {
    await page.setContent(`<style>${spacingCss(simple, 'probe')}.stack{display:flex;flex-direction:column;gap:var(--ss-space-section-gap);${style}}.box{height:20px}</style><div data-styleseed-artifact="probe" class="stack"><div class="box">One</div><div class="box">Two</div></div>`);
    const result = await page.evaluate(inspectSpacing, { artifactId: 'probe', spacing: simple, bindings: binding });
    assert.equal(result.status, expectedStatus, name);
    assert.ok([...result.failures, ...result.unsupported].some(x => x.code === expectedCode), name);
    adversarial.push({ name, result });
  }
  await page.setContent(`<style>${spacingCss(simple, 'probe')}.stack{display:flex;flex-direction:column;gap:var(--ss-space-section-gap);width:200px}button{width:24px;font:16px/20px sans-serif;word-break:break-all}.wide{width:400px;height:20px}</style><div data-styleseed-artifact="probe" class="stack"><button>검색</button><div class="wide"></div></div>`);
  const wrapped = await page.evaluate(inspectSpacing, { artifactId: 'probe', spacing: simple, bindings: binding, noWrapControls: ['button'] });
  assert.equal(wrapped.status, 'pass');
  assert.ok(wrapped.observations.some(x => x.code === 'control-wrap'));
  assert.ok(wrapped.observations.some(x => x.code === 'horizontal-overflow'));
  adversarial.push({ name: 'content-observations', result: wrapped });
  const uncovered = await page.evaluate(inspectSpacing, { artifactId: 'probe', spacing: { ...simple, roles: { ...simple.roles, groupGap: { base: 16 } } }, bindings: binding });
  assert.equal(uncovered.status, 'fail'); assert.ok(uncovered.failures.some(x => x.code === 'missing-role-binding'));
  adversarial.push({ name: 'missing-role-coverage', result: uncovered });
  const report = { adversarial, status: 'pass', scope: 'compiled-spacing-css-integration-fixture', designAcceptance: 'not-assessed', cases: results, mutationDetected: brokenGap === 1 };
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Spacing browser: ${results.length} cases passed; ${adversarial.length} adversarial checks passed; broken consumer detected. Evidence: ${output}`);
} finally { await browser.close(); }
