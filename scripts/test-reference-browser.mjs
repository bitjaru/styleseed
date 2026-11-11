#!/usr/bin/env node
// Browser fixture for the reference probe: a page whose largest coloured area is a picture-like
// panel in blue while every primary action is teal. The derived accent must be the action colour.
// Three more pages pin the canvas: an opaque black body with one full-bleed brand band (the body is
// the canvas, not the brand colour), a brand body mostly covered by full-bleed dark sections (the
// sections are the canvas), and a page with no painted background and no full-bleed band (the most
// frequent surface, as before). This is a measurement regression fixture, not a design judgment.
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

// An opaque black body; one full-bleed brand band (300 of 2000px, 15%); several small brand cards
// with side margins, so the brand colour is the most frequent surface. Text and actions are light
// and brand-coloured on black.
const blackBody = `<!doctype html><html lang="en"><meta charset="utf-8"><title>black canvas fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font:16px/1.5 system-ui}
.fx-hero{height:600px;padding:64px 48px}.fx-band{height:300px;background:#f97316}
.fx-cards{height:800px;overflow:hidden;display:flex;flex-wrap:wrap;gap:24px;padding:48px}
.fx-card{width:160px;height:120px;background:#f97316;border-radius:8px}.fx-foot{height:300px}
.fx-btn{background:#f97316;color:#000;border:0;border-radius:8px;height:44px;padding:0 24px;font:inherit}
</style><body><div class="fx-hero"><h1>Night shift</h1><p>Every order, one screen.</p><button class="fx-btn">Start now</button></div>
<div class="fx-band"></div><div class="fx-cards">${'<div class="fx-card"></div>'.repeat(6)}</div><div class="fx-foot"><p>Made somewhere else.</p></div></body></html>`;
// A brand-coloured body under full-bleed dark sections: 1500 of 2000px are dark (75%).
const darkSections = `<!doctype html><html lang="en"><meta charset="utf-8"><title>dark sections fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#f97316;color:#111827;font:16px/1.5 system-ui}
.fx-dark{height:500px;background:#111827;color:#f9fafb;padding:48px}.fx-gap{height:125px;padding:24px}
.fx-btn{background:#f97316;color:#111827;border:0;border-radius:8px;height:44px;padding:0 24px;font:inherit}
</style><body><section class="fx-dark"><h1>Ship faster</h1><button class="fx-btn">Try it</button></section><div class="fx-gap"><p>Trusted by teams.</p></div>
<section class="fx-dark"><h2>Plans</h2></section><div class="fx-gap"><p>Questions?</p></div><section class="fx-dark"><h2>Contact</h2></section></body></html>`;
// No painted background anywhere and no full-bleed band: the canvas falls back to the most frequent surface.
const unpainted = `<!doctype html><html lang="en"><meta charset="utf-8"><title>unpainted fixture</title><style>
*{box-sizing:border-box}body{margin:0;color:#111827;font:16px/1.5 system-ui}main{max-width:640px;margin:0 auto;padding:32px 16px}
.fx-card{background:#f3f4f6;border-radius:8px;padding:24px;margin-bottom:16px}.fx-note{background:#ffffff;border:1px solid #e5e7eb;padding:24px}
.fx-btn{background:#2563eb;color:#fff;border:0;border-radius:8px;height:40px;padding:0 16px;font:inherit}
</style><body><main><div class="fx-card"><h2>Inbox</h2><p>Three new requests.</p><button class="fx-btn">Open</button></div>
<div class="fx-card"><h2>Drafts</h2><p>Two drafts saved.</p></div><div class="fx-card"><h2>Sent</h2><p>Nothing this week.</p></div><div class="fx-note"><p>Synced a minute ago.</p></div></main></body></html>`;

const browser = await chromium.launch({ headless: true });
async function observe(content) {
  const list = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(content);
    await page.evaluate(() => document.fonts.ready);
    list.push(await page.evaluate(observeDesign, { maxElements: 500 }));
    await page.close();
  }
  return list;
}
const canvasEvidence = s => s.roleEvidence.find(e => e.role === 'canvas');
try {
  const observations = await observe(html);
  const s = summarize(observations);
  assert.equal(s.accentDerived, '#0f766e', `accent must come from the buttons, got ${s.accentDerived} (${s.accentFrom})`);
  assert.equal(s.accentFrom, 'filled-actions');
  assert.equal(s.accentAgreesAcrossViewports, true);
  assert.equal(s.ink, '#090c0b');
  assert.equal(s.canvas, '#eff5f4');
  for (const o of observations) assert.deepEqual(o.backdrop, { 'rgb(239, 245, 244)': 1 }, `the body paints the whole document at ${o.viewport.width}: ${JSON.stringify(o.backdrop)}`);
  assert.equal(canvasEvidence(s).from, 'backdrop', JSON.stringify(s.roleEvidence));
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

  // Black body: the brand colour is the most frequent surface, but the body paints 85% of the document.
  const black = await observe(blackBody);
  const sb = summarize(black);
  for (const o of black) {
    assert.equal(o.body.background, 'rgb(0, 0, 0)');
    assert.deepEqual(Object.keys(o.backdrop), ['rgb(0, 0, 0)', 'rgb(249, 115, 22)'], JSON.stringify(o.backdrop));
    assert.ok(Math.abs(o.backdrop['rgb(249, 115, 22)'] - 0.15) <= 0.02, `the band covers about 15% at ${o.viewport.width}: ${JSON.stringify(o.backdrop)}`);
  }
  assert.equal(Object.entries(black[0].surfaces).sort((a, b) => b[1] - a[1])[0][0], 'rgb(249, 115, 22)', `brand is the most frequent surface: ${JSON.stringify(black[0].surfaces)}`);
  assert.equal(sb.canvas, '#000000', JSON.stringify(sb.roleEvidence));
  assert.equal(sb.accentDerived, '#f97316');
  assert.ok(sb.accentContrast > 3, `accent contrast against the black canvas, got ${sb.accentContrast}`);
  assert.deepEqual([canvasEvidence(sb).from, canvasEvidence(sb).alternatives.map(a => a.color)], ['backdrop', ['#f97316']]);

  // Brand body under dark full-bleed sections: the sections are the canvas.
  const dark = await observe(darkSections);
  const sd = summarize(dark);
  for (const o of dark) assert.ok((o.backdrop['rgb(17, 24, 39)'] ?? 0) > 0.7, `dark sections cover more than 70% at ${o.viewport.width}: ${JSON.stringify(o.backdrop)}`);
  assert.equal(sd.canvas, '#111827', JSON.stringify(sd.roleEvidence));
  assert.equal(dark[0].body.background, 'rgb(249, 115, 22)', 'the body itself is brand-coloured');

  // Nothing painted: an empty backdrop and the most frequent surface.
  const bare = await observe(unpainted);
  const su = summarize(bare);
  for (const o of bare) {
    assert.deepEqual(o.backdrop, {}, `no root colour and no full-bleed band at ${o.viewport.width}: ${JSON.stringify(o.backdrop)}`);
    assert.equal(o.body.background, 'rgba(0, 0, 0, 0)');
  }
  assert.equal(su.canvas, '#f3f4f6', JSON.stringify(su.roleEvidence));
  assert.equal(canvasEvidence(su).from, 'body-or-largest-surface');
  for (const o of [...black, ...dark, ...bare]) {
    const dump = JSON.stringify(o);
    assert.ok(!dump.includes('Night shift') && !dump.includes('fx-') && !dump.includes('Inbox'), 'the probe must not export page text or classes');
  }
  console.log(`canvas fixtures passed: black body ${sb.canvas} (accent contrast ${sb.accentContrast}), dark sections ${sd.canvas}, unpainted ${su.canvas} from ${canvasEvidence(su).from}`);
} finally { await browser.close(); }
