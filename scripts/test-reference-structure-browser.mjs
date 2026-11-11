#!/usr/bin/env node
// Browser fixture for the structure probe: a settings page with a sticky top bar, a 240px side
// nav, three `2fr 5fr` settings groups with one primary action each, a table with 40px rows, and a
// 768px breakpoint below which the side nav and the columns drop. The probe must find the regions
// (by landmark, and by geometry when the landmarks are removed), the column ratio, the row height,
// one primary per section, and the breakpoint; measure-reference must write facts.json over a local
// http server and honour robots.txt. No page text may leave the page. This is a measurement
// regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { observeDesign } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs';
import { observeStructure } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs';
import { summarize } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs';
import { primaryStats, buildFacts } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs';
import { measure, parseArgs } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const group = (title, fields) => `<section class="fx-group"><div><h2>${title}</h2><p>고객에게 보이는 설정입니다.</p></div><div class="fx-card">${fields.map(([id, label, value]) => `<div class="fx-field"><label for="${id}">${label}</label><input id="${id}" value="${value}"></div>`).join('')}<div class="fx-actions"><button class="fx-secondary">취소</button><button class="fx-primary">저장</button></div></div></section>`;
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>structure probe fixture</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f8f8;color:#090c0b;font:14px/20px system-ui}
.fx-top{position:sticky;top:0;z-index:2;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#ffffff;border-bottom:1px solid #e3e8e7}
.fx-logo{display:block;width:96px;height:24px;background:#0f766e;border-radius:4px}
.fx-text{background:transparent;border:0;color:#4d5150;height:32px;padding:0 8px;font:inherit}
.fx-shell{display:flex}
.fx-side{display:none;flex:0 0 240px;width:240px;height:calc(100vh - 56px);position:sticky;top:56px;padding:16px 8px;background:#ffffff;border-right:1px solid #e3e8e7}
.fx-side a{display:flex;align-items:center;height:32px;padding:0 8px;color:#4d5150;text-decoration:none;border-radius:4px}
.fx-main{flex:1;min-width:0;padding:32px 16px;display:flex;flex-direction:column;gap:32px}
h1{font-size:24px;line-height:32px;font-weight:600;margin:0}h2{font-size:16px;line-height:24px;font-weight:600;margin:0 0 8px}p{margin:0;color:#4d5150}
.fx-group{display:grid;grid-template-columns:1fr;gap:16px}
.fx-card{background:#ffffff;border:1px solid #e3e8e7;border-radius:8px;padding:24px;display:flex;flex-direction:column;gap:16px}
.fx-field{display:flex;flex-direction:column;gap:8px}label{font-weight:500}
input{height:36px;width:100%;border:1px solid #b4bdbb;border-radius:4px;padding:0 8px;font:inherit}
.fx-actions{display:flex;gap:8px;justify-content:flex-end}
.fx-primary{height:36px;padding:0 16px;border:0;border-radius:4px;background:#0f766e;color:#fafcfc;font:inherit;transition:background-color 150ms ease-out}
.fx-secondary{height:36px;padding:0 16px;border:1px solid #b4bdbb;border-radius:4px;background:transparent;color:#090c0b;font:inherit}
.fx-primary:hover{background:#0b5e58}.fx-primary:focus-visible,.fx-secondary:focus-visible{outline:2px solid #0f766e;outline-offset:2px}
table{width:100%;border-collapse:collapse;background:#ffffff}thead tr{height:36px}tbody tr{height:40px}
th,td{padding:0 16px;text-align:left;border-bottom:1px solid #e3e8e7}.fx-num{text-align:right;font-variant-numeric:tabular-nums}
@media (min-width: 768px){.fx-side{display:block}.fx-main{padding:32px}.fx-group{grid-template-columns:2fr 5fr}}
@media (prefers-reduced-motion: reduce){.fx-primary{transition:none}}
</style><body>
<header class="fx-top"><span class="fx-logo" aria-hidden="true"></span><nav aria-label="계정"><button class="fx-text">도움말</button><button class="fx-text">내 계정</button></nav></header>
<div class="fx-shell">
<nav class="fx-side" aria-label="주 메뉴"><a href="#home">홈</a><a href="#orders">주문</a><a href="#products">상품</a><a href="#customers">고객</a><a href="#payouts">정산</a><a href="#settings">설정</a></nav>
<main class="fx-main">
<div class="fx-head"><h1>스토어 설정</h1><p>결제와 알림을 관리합니다.</p></div>
${group('스토어 정보', [['f1', '스토어 이름', '키위 상점'], ['f2', '연락 이메일', 'owner@example.test']])}
${group('결제', [['f3', '통화', 'KRW'], ['f4', '정산 계좌', '110-123-456789']])}
${group('알림', [['f5', '알림 이메일', 'alerts@example.test'], ['f6', '요약 주기', '매일']])}
<section class="fx-panel"><h2>최근 정산</h2><table><thead><tr><th>날짜</th><th>상태</th><th class="fx-num">금액</th></tr></thead><tbody>
${['1,240,000', '980,500', '1,102,000', '875,000', '1,330,000', '990,000'].map((amount, i) => `<tr><td>11월 ${i + 1}일</td><td>완료</td><td class="fx-num">${amount}</td></tr>`).join('')}
</tbody></table></section>
</main></div></body></html>`;
// The same page without landmarks: regions must come from geometry.
const plain = html.replace('<header class="fx-top">', '<div class="fx-top">').replace('</nav></header>', '</div></div>').replace('<nav aria-label="계정">', '<div>')
  .replace('<nav class="fx-side" aria-label="주 메뉴">', '<div class="fx-side">').replace('</a></nav>', '</a></div>').replace('<main class="fx-main">', '<div class="fx-main">').replace('</main>', '</div>');
const LEAKS = ['스토어', '결제', '정산', '홈', 'owner@', '110-123', 'fx-', 'href', '#home', 'example.test'];
const noLeaks = (value, what, allowedUrl = null) => {
  const dump = JSON.stringify(value).split(allowedUrl ?? '\u0000').join('');
  for (const leak of LEAKS) assert.ok(!dump.includes(leak), `${what} must not carry page text, ids, classes, or links (found ${leak})`);
  assert.deepEqual(disallowedStrings(value, { url: allowedUrl }), [], `${what}: every string must pass the allow-list`);
};

async function probe(browser, content) {
  const observations = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(content);
    await page.evaluate(() => document.fonts.ready);
    const observation = await page.evaluate(observeDesign, { maxElements: 2000 });
    observation.structure = await page.evaluate(observeStructure, { maxElements: 2000 });
    observations.push(observation);
    await page.close();
  }
  return observations;
}

const browser = await chromium.launch({ headless: true });
try {
  const observations = await probe(browser, html);
  const [wide, narrow] = observations.map(o => o.structure);
  const region = (s, kind) => s.regions.find(r => r.kind === kind);
  assert.deepEqual(wide.regions.map(r => `${r.kind}:${r.by}`), ['topBar:landmark', 'sideNav:landmark', 'main:landmark'], JSON.stringify(wide.regions));
  assert.deepEqual([region(wide, 'topBar').h, region(wide, 'topBar').position], [56, 'sticky']);
  assert.deepEqual([region(wide, 'sideNav').w, region(wide, 'sideNav').items, region(wide, 'sideNav').itemHeight], [240, 6, 32]);
  assert.deepEqual([region(wide, 'main').insetLeft, region(narrow, 'main').insetLeft], [32, 16]);
  assert.deepEqual(narrow.regions.map(r => r.kind), ['topBar', 'main'], 'the side nav is gone below 768px');
  assert.deepEqual(wide.sections.map(s => s.kind), ['heading-block', 'form-group', 'form-group', 'form-group', 'table'], JSON.stringify(wide.sections));
  const groups = wide.sections.filter(s => s.kind === 'form-group');
  for (const g of groups) {
    assert.equal(g.cols.length, 2, JSON.stringify(g));
    assert.ok(Math.abs(g.cols[0] - 2 / 7) <= 0.02 && Math.abs(g.cols[1] - 5 / 7) <= 0.02, `2fr 5fr within 0.02, got ${g.cols}`);
    assert.deepEqual(g.filled, { 'rgb(15, 118, 110)': 1 }, 'one primary per section');
  }
  assert.ok(narrow.sections.every(s => s.cols.length === 1), 'one column below the breakpoint');
  assert.deepEqual(wide.tables.map(t => [t.rowH, t.headerH, t.rows, t.cols, t.endAligned, t.rowBorder]), [[{ 40: 6 }, 36, 6, 3, 1, true]]);
  assert.deepEqual(wide.css.breakpoints, { 768: 3 }, JSON.stringify(wide.css));
  assert.deepEqual([wide.css.hover, wide.css.focusVisible, wide.css.reducedMotion], [1, 1, 1]);
  assert.deepEqual([wide.controls.labels.above, wide.controls.leftEdges], [6, 1]);
  assert.deepEqual(Object.keys(wide.controls.buttons).sort(), ['filled|rgb(15, 118, 110)|36|main', 'outline|rgb(180, 189, 187)|36|main', 'text|rgb(77, 81, 80)|32|topBar']);

  const summary = summarize(observations);
  const [wideSummary] = summary.structure.viewports;
  const primaries = primaryStats(wideSummary, summary.accentDerived);
  assert.deepEqual([primaries.basis, primaries.perSectionMax, primaries.sectionsOverOne, primaries.count], ['accent', 1, 0, 3]);
  assert.equal(summary.onAccent, '#fafcfc');
  assert.deepEqual(summary.motion.durations, [150]);
  const url = 'https://fixture.test/settings';
  const facts = buildFacts(summary, summary.structure, url, '2026-11-10');
  const find = (id, viewport) => facts.facts.find(f => f.id === id && f.viewport === viewport)?.value;
  assert.deepEqual([find('composition.region.sideNav.width', 1440), find('composition.columns.ratio', 1440), find('density.table.rowHeight', 1440), find('navigation.primary.perSectionMax', 1440)], [240, '0.29/0.71', 40, 1]);
  assert.deepEqual([find('responsive.columns', 'both'), find('responsive.region.sideNav', 'both'), find('responsive.breakpoints', 'both')], ['2 -> 1', '240 -> none', [768]]);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.ok(facts.facts.some(f => f.axis === axis), `a ${axis} fact`);
  noLeaks(wide, 'structure output (1440)');
  noLeaks(narrow, 'structure output (390)');
  noLeaks(facts, 'facts', url);
  for (const o of observations) {
    const { structure, fonts, ...design } = o;
    const dump = JSON.stringify(design);
    for (const leak of ['스토어', 'href', 'owner@']) assert.ok(!dump.includes(leak), `the design probe must not export page text or links (found ${leak})`);
  }

  // No landmarks: the same regions by geometry.
  const [plainWide] = (await probe(browser, plain)).map(o => o.structure);
  assert.deepEqual(plainWide.regions.map(r => `${r.kind}:${r.by}:${r.w}x${r.h}`), ['topBar:geometry:1440x56', 'sideNav:geometry:240x844', 'main:geometry:1200x1291'], JSON.stringify(plainWide.regions));
  assert.deepEqual(plainWide.sections.map(s => s.kind), wide.sections.map(s => s.kind));
  console.log(`structure probe fixture passed: ${wide.regions.map(r => `${r.kind} ${r.by}`).join(', ')}; columns ${groups[0].cols.join('/')}; rows ${Object.keys(wide.tables[0].rowH)}px; breakpoints ${Object.keys(wide.css.breakpoints)}; ${facts.facts.length} facts`);
} finally { await browser.close(); }

// measure-reference over http with --robots: allowed path writes facts.json; a disallowed path stops
// before any browser starts; --own-site measures it and records the disallow.
const server = createServer((req, res) => {
  if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('User-agent: *\nDisallow: /private\n'); return; }
  if (req.url === '/settings' || req.url === '/private/settings') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
  res.writeHead(404); res.end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const out = mkdtempSync(join(tmpdir(), 'styleseed-structure-'));
try {
  const quiet = () => {};
  const [dir] = await measure(parseArgs([`${origin}/settings`, '--out', join(out, 'allowed'), '--id', 'fixture-settings-2026-11-10', '--robots', '--browser', browserModule]), quiet);
  const facts = JSON.parse(readFileSync(join(dir, 'measurements/facts.json'), 'utf8'));
  assert.equal(facts.url, `${origin}/settings`);
  assert.deepEqual(facts.viewports, [1440, 390]);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.ok(facts.facts.some(f => f.axis === axis), `facts.json has a ${axis} fact`);
  noLeaks(facts, 'facts.json', facts.url);
  const recorded = JSON.parse(readFileSync(join(dir, 'measurements/observations.json'), 'utf8'));
  for (const o of recorded.observations) noLeaks(o.structure, 'observations.json structure');
  const draft = JSON.parse(readFileSync(join(dir, 'case.draft.json'), 'utf8'));
  assert.equal(draft.sources[0].robots, 'allowed');
  assert.ok(draft.measurements.files.includes('measurements/facts.json'));
  const md = readFileSync(join(dir, 'TWELVE-AXES.draft.md'), 'utf8');
  assert.match(md, /\| Decision \(person\) \|/u);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.doesNotMatch(md, new RegExp(`\\| ${axis} \\| unknown`, 'u'), axis);

  await assert.rejects(measure(parseArgs([`${origin}/private/settings`, '--out', join(out, 'blocked'), '--robots', '--browser', browserModule]), quiet), /disallows \/private\/settings .*Nothing was measured/u);
  assert.equal(existsSync(join(out, 'blocked')), false, 'nothing is written for a disallowed path');
  const [own] = await measure(parseArgs([`${origin}/private/settings`, '--out', join(out, 'own'), '--id', 'fixture-own-2026-11-10', '--robots', '--own-site', '--browser', browserModule]), quiet);
  assert.equal(JSON.parse(readFileSync(join(own, 'case.draft.json'), 'utf8')).sources[0].robots, 'disallowed');
  console.log(`measure-reference fixture passed: ${facts.facts.length} facts over http; robots allowed / disallowed (stopped) / disallowed with --own-site`);
} finally {
  server.close();
  rmSync(out, { recursive: true, force: true });
}
