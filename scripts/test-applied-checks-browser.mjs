#!/usr/bin/env node
// Technical regression fixture. No human review or design-quality comparison is implied.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { inspectAppearance } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-appearance.mjs';
import { inspectSpacing } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-spacing.mjs';
import { generatePalette } from '../engine/color/generator.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'styleseed-applied-checks-'));
// Reuse a font already obtained by the demo build. No test-time font download or new asset.
const media = join(root, 'demo-pricing/.next/static/media');
const fontName = readdirSync(media).sort().find(name => name.endsWith('.woff2'));
assert.ok(fontName, 'Build demo-pricing before running the font-delivery regression');
const fontBytes = readFileSync(join(media, fontName));
const fontData = fontBytes.toString('base64');
const helperHash = createHash('sha256').update(readFileSync(join(root, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-appearance.mjs'))).digest('hex');
const context = { theme: 'light', state: 'default', specimen: 'normal-ko-en', fontCondition: 'normal' };
const pair = (id, role, selector, property = 'color', token, background = '.panel') => ({
  id, role, reason: role === 'decorative' ? 'Nonessential section divider' : 'Required for this fixture task',
  foreground: { selector, property, ...(token ? { token } : {}) }, background: { selector: background, token: '--panel-bg' },
});
const bindings = {
  artifactId: 'settings', context,
  colors: [
    pair('help', 'text', '.help', 'color', '--help-text'),
    pair('field-edge', 'required-boundary', '#team-name', 'borderTopColor', '--input-border'),
    pair('divider', 'decorative', 'hr', 'borderTopColor'),
    pair('save', 'text', '#save', 'color', '--button-text', '#save'),
  ],
  typography: [
    { id: 'heading-type', selector: 'h1', role: 'heading', sampleId: 'settings-title' },
    { id: 'help-type', selector: '.help', role: 'input-help', sampleId: 'mixed-ko-en' },
    { id: 'number-type', selector: '.amount', role: 'currency', sampleId: 'krw-and-seats' },
  ],
};
// The action's background has its own token; the same --panel-bg would be a real mismatch.
bindings.colors[3].background.token = '--button-bg';
const spacingInput = {
  artifactId: 'settings', spacing: { wideMinWidth: 900, roles: { stackGap: { base: 8 } } },
  bindings: [{ role: 'stackGap', selector: '.field', property: 'rowGap' }], noWrapControls: ['#save'],
};
function html({ theme = 'light', state = 'default', fontCondition = 'normal', long = false } = {}) {
  const dark = theme === 'dark';
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Applied design checks fixture</title><style>
@font-face{font-family:FixtureFont;src:url(data:font/woff2;base64,${fontCondition === 'fallback' ? 'aW52YWxpZA==' : fontData}) format('woff2');font-weight:${fontCondition === 'missing-weight' ? '400' : '100 900'};font-display:swap}
*{box-sizing:border-box}body{margin:0;background:${dark ? '#111827' : '#eef1f4'};color:${dark ? '#f3f4f6' : '#17202b'};font:16px/1.6 FixtureFont,system-ui,sans-serif}
main{max-width:760px;margin:32px auto;padding:0 20px}h1{font-size:28px;line-height:1.3;margin:0 0 12px;font-weight:700}h2{font-size:19px;margin:0 0 16px}p{margin:0 0 16px}
.panel{--panel-bg:${dark ? '#1f2937' : '#ffffff'};--help-text:${dark ? '#d1d5db' : '#374151'};--input-border:${dark ? '#9ca3af' : '#596673'};--button-bg:${dark ? '#bbf7d0' : '#14532d'};--button-text:${dark ? '#14251b' : '#ffffff'};--focus:${dark ? '#93c5fd' : '#1d4ed8'};background:var(--panel-bg);padding:24px;border-radius:8px}
.field{display:flex;flex-direction:column;gap:8px}label{font-weight:600}input,button{font:inherit;min-height:44px;max-width:100%;border-radius:4px;padding:8px 12px}input{appearance:none;color:inherit;background:var(--panel-bg);border:1px solid var(--input-border)}input:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.help{color:var(--help-text);font-size:16px;margin:0;word-break:keep-all;overflow-wrap:anywhere}hr{border:0;border-top:1px solid #b5bcba;margin:24px 0}.amount{font-variant-numeric:tabular-nums}button{--panel-bg:var(--button-bg);color:var(--button-text);background:var(--button-bg);border:0;cursor:pointer}.error{color:${dark ? '#fca5a5' : '#991b1b'}}.test-note{font-size:13px;margin-top:20px}
</style><main data-styleseed-artifact="settings"><h1>${long ? '국제 공동 연구팀 Workspace의 알림과 결제 내역을 관리하는 설정' : '팀 설정 · Workspace settings'}</h1><p>현재 팀의 정보와 알림을 확인하세요.</p><section class="panel"><h2>팀 정보</h2><div class="field"><label for="team-name">팀 이름 / Team name</label><input id="team-name" value="PRIVATE_FIXTURE_VALUE"><p class="help">${long ? '국제 공동 연구팀 International Research Workspace의 담당자에게 결제 내역과 중요한 계정 변경 사항을 이메일로 알려드립니다.' : '중요한 계정 변경 사항을 팀 담당자에게 알려드립니다.'}</p></div><hr><p class="amount">₩1,234,567 · 12 seats · 2026.10.14</p>${state === 'error' ? '<p class="error" role="alert">저장하지 못했습니다. 다시 시도해 주세요. Your changes have not been saved.</p>' : ''}<button id="save">변경 내용 저장</button></section><p class="test-note">Technical fixture · measurements are not design acceptance.</p></main></html>`;
}
const browser = await chromium.launch({ headless: true });
const runs = [], adversarial = [];
try {
  const page = await browser.newPage();
  let reportData;
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const specimen of ['normal', 'long', 'fallback', 'missing-weight']) {
    const options = { theme, long: specimen === 'long', state: specimen === 'long' ? 'error' : 'default', fontCondition: ['fallback', 'missing-weight'].includes(specimen) ? specimen : 'normal' };
    await page.setViewportSize({ width, height: 1000 });
    const source = html(options);
    await page.setContent(source);
    await page.evaluate(() => document.fonts.ready);
    const before = await page.content();
    reportData = await page.evaluate(inspectAppearance, { ...bindings, context: { ...context, ...options, specimen } });
    assert.equal(await page.content(), before, 'Probe must not mutate the page');
    assert.equal(reportData.status, 'observed', JSON.stringify(reportData));
    assert.equal(reportData.colorChecks.find(item => item.id === 'divider').status, 'not-applicable');
    assert.ok(reportData.colorChecks.filter(item => item.id !== 'divider').every(item => item.status === 'pass'));
    assert.equal(reportData.designAcceptance, 'not-assessed');
    assert.ok(reportData.typography.every(item => item.glyphFontVerification === 'not-performed'));
    assert.equal(reportData.typography[0].declaredFontFaces[0]?.status, options.fontCondition === 'fallback' ? 'error' : 'loaded');
    if (specimen === 'missing-weight') assert.equal(reportData.typography[0].declaredFontFaces[0].weight, '400');
    assert.ok(!JSON.stringify(reportData).includes('PRIVATE_FIXTURE_VALUE'));
    assert.ok(!JSON.stringify(reportData).includes('중요한 계정 변경 사항을'));
    assert.ok(!JSON.stringify(reportData).includes('International Research Workspace의'));
    const spacing = await page.evaluate(inspectSpacing, spacingInput);
    assert.equal(spacing.status, 'pass');
    assert.equal(spacing.observations.length, 0, JSON.stringify(spacing));
    const name = `${width}-${theme}-${specimen}`;
    const screenshot = join(output, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    runs.push({ name, appearance: reportData, spacing, screenshot, screenshotSha256: createHash('sha256').update(readFileSync(screenshot)).digest('hex'), htmlSha256: createHash('sha256').update(source).digest('hex') });
  }
  const probe = async (name, css, overrides, expected, code) => {
    await page.setContent(html()); await page.evaluate(() => document.fonts.ready);
    if (css) await page.addStyleTag({ content: css });
    const result = await page.evaluate(inspectAppearance, { ...bindings, typography: [], ...overrides });
    assert.equal(result.status, expected, `${name}: ${JSON.stringify(result)}`);
    if (code) assert.ok(result.colorChecks.some(check => check.code === code), `${name}: ${code}`);
    adversarial.push({ name, result });
  };
  await probe('required-border-too-faint', '.panel{--input-border:#b5bcba}', {}, 'fail', 'opaque-pair-contrast');
  await probe('token-consumer-drift', '.help{color:#111}', {}, 'fail', 'token-binding-failed');
  await probe('missing-token', '', { colors: [pair('missing', 'text', '.help', 'color', '--absent')] }, 'fail', 'token-binding-failed');
  await probe('photographic-paint', '.panel{background-image:linear-gradient(white,black)}', {}, 'unsupported', 'complex-paint');
  await probe('intervening-paint', '.help{background:#000}', {}, 'unsupported', 'intervening-background');
  await probe('text-fill-override', '.help{-webkit-text-fill-color:transparent}', {}, 'unsupported', 'nonstandard-text-paint');
  await probe('partial-opacity', '.help{opacity:.5}', {}, 'unsupported', 'opacity-transform-or-zoom');
  await probe('pseudo-overlay', '.panel::before{content:"";position:absolute;inset:0;background:#fff}', {}, 'unsupported', 'pseudo-element-paint');
  await probe('transparent-declared-bg', '.panel{background:transparent}', {}, 'unsupported', 'requires-opaque-srgb-pair');
  await probe('hidden-consumer', '.help{display:none}', {}, 'unsupported', 'hidden-element');
  await probe('missing-consumer', '', { colors: [pair('missing', 'text', '.absent')] }, 'fail', 'binding-must-match-once');
  await probe('large-text-misclassified', '', { colors: [pair('small', 'large-text', '.help')] }, 'fail', 'large-text-size-not-met');
  await probe('outline-not-painted', '', { colors: [pair('edge', 'required-boundary', '#team-name', 'outlineColor')] }, 'unsupported', 'boundary-not-painted');
  await probe('focus-not-shown', '', { colors: [pair('focus', 'focus', '#team-name', 'outlineColor')] }, 'unsupported', 'focus-state-not-observed');
  await probe('unobserved-inactive', '', { colors: [pair('disabled', 'inactive', '#save')] }, 'fail', 'inactive-state-not-observed');
  await page.setContent(html()); await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(inspectAppearance, { ...bindings, context: { ...context, state: 'focus' }, colors: [pair('focus', 'focus', '#team-name', 'outlineColor', '--focus')] });
  assert.equal(focus.colorChecks[0].status, 'pass', JSON.stringify(focus)); adversarial.push({ name: 'observed-focus', result: focus });
  await page.locator('#save').evaluate(element => element.disabled = true);
  const inactive = await page.evaluate(inspectAppearance, { ...bindings, colors: [pair('disabled', 'inactive', '#save')] });
  assert.equal(inactive.colorChecks[0].status, 'not-applicable'); adversarial.push({ name: 'observed-inactive', result: inactive });
  await page.locator('#save').evaluate(element => element.disabled = false);
  await page.addStyleTag({ content: '#save{width:36px;word-break:break-all}' });
  const wrapping = await page.evaluate(inspectSpacing, spacingInput);
  assert.ok(wrapping.observations.some(item => item.code === 'control-wrap'));
  adversarial.push({ name: 'reuse-existing-wrapping-observation', result: wrapping });
  await page.locator('.help').evaluate(element => element.innerHTML = '<span>Nested text</span>');
  const rich = await page.evaluate(inspectAppearance, { ...bindings, colors: [bindings.colors[0]] });
  assert.equal(rich.colorChecks[0].status, 'unsupported'); adversarial.push({ name: 'rich-text-leaf-required', result: rich });
  await page.locator('.panel').evaluate(element => element.setAttribute('data-styleseed-artifact', 'nested'));
  const nested = await page.evaluate(inspectAppearance, { ...bindings, colors: [bindings.colors[0]] });
  assert.equal(nested.colorChecks[0].code, 'binding-must-match-once'); adversarial.push({ name: 'nested-artifact-excluded', result: nested });
  for (const invalid of [
    { ...bindings, colors: [{ ...bindings.colors[0], id: undefined }] },
    { ...bindings, context: { theme: 'light' } },
    { ...bindings, colors: [], typography: [] },
  ]) await assert.rejects(page.evaluate(inspectAppearance, invalid));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent(html()); await page.evaluate(() => document.fonts.ready);
  assert.equal((await page.evaluate(inspectAppearance, bindings)).reducedMotion, true);
  // Guard the original research counterexample without treating a decorative token as a bug.
  const palette = generatePalette({ keyColor: '#276B5E', mode: 'light', character: 'balanced' });
  assert.equal(palette.valid, true);
  writeFileSync(join(output, 'report.json'), JSON.stringify({ status: 'pass', helperHash, font: { buildAsset: fontName, sha256: createHash('sha256').update(fontBytes).digest('hex') }, scope: 'technical-applied-checks-fixture', designAcceptance: 'not-assessed', runs, adversarial }, null, 2));
  console.log(`Applied checks: ${runs.length} render/font cases, ${adversarial.length} adversarial cases, invalid inputs and reduced-motion observation passed. Evidence: ${output}`);
} finally { await browser.close(); }
