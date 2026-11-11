#!/usr/bin/env node
// Browser fixture for the reference probe fixes found in the first real run. Two local servers on
// 127.0.0.1: server A serves the pages and counts requests per path; server B serves a stylesheet
// from a second port (a different origin). Everything is measured through observeUrls at 1440×900
// and 390×844, one page load per viewport.
//
// - Reveal: sections after the first screenful start hidden (opacity, visibility, a 24px offset)
//   and an IntersectionObserver reveals each once. Without the scroll pass they are not measured;
//   with it all eight are, at their layout positions, and each bound of the pass stops it.
// - No interaction: the page beacons click, pointerdown, focusin, keydown, and input to server A
//   and links to another path. Server A sees the page once per viewport, no beacon, no link request.
// - Several mains: three sibling `main` landmarks (and an empty one) form one main region of three parts.
// - Display text: a 48px KPI value that is not a heading over a 14px body is the largest text.
// - Unreadable stylesheet: a cross-origin sheet without CORS is applied but cannot be read, so the
//   stylesheet counts become lower bounds; the same sheet with CORS is read and counted.
//
// No page text, class names, links, or asset URLs may leave the page. This is a measurement
// regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { buildFacts } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const { chromium } = await loadBrowser(browserModule);

const BASE = `*{box-sizing:border-box}body{margin:0;background:#f6f8f8;color:#090c0b;font:16px/24px system-ui}
.fx-top{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#ffffff;border-bottom:1px solid #e3e8e7}
h1{font-size:24px;line-height:32px;margin:0 0 16px}h2{font-size:20px;line-height:28px;margin:0 0 16px}p{margin:0 0 8px}
table{width:100%;border-collapse:collapse}tbody tr{height:40px}td{padding:0 16px;border-bottom:1px solid #e3e8e7}`;
const BEACON = `<script>for (const type of ['click', 'pointerdown', 'focusin', 'keydown', 'input']) addEventListener(type, () => navigator.sendBeacon('/beacon?type=' + type), true);</script>`;

// Eight 640px sections 32px apart under a 64px top bar: section i starts at 64 + 672 i.
const SECTION_Y = Array.from({ length: 8 }, (_, i) => 64 + 672 * i);
const rows = Array.from({ length: 6 }, (_, i) => `<tr><td>Entry ${i + 1} of the ledger</td><td>${(i + 1) * 1240}</td></tr>`).join('');
const revealPage = `<!doctype html><html lang="en"><meta charset="utf-8"><title>reveal fixture</title><style>${BASE}
main{display:flex;flex-direction:column;gap:32px}
section{height:640px;padding:32px 24px;background:#ffffff;overflow:hidden}
.fx-later{opacity:0;visibility:hidden;transform:translateY(24px);transition:opacity 300ms ease-out,transform 300ms ease-out,visibility 300ms}
.fx-later.fx-in{opacity:1;visibility:visible;transform:none}
</style><body><header class="fx-top"><span>Ledger North</span><nav><a href="/elsewhere">Elsewhere</a></nav></header>
<main>${SECTION_Y.map((_, i) => `<section${i ? ' class="fx-later"' : ''}><h2>Chapter ${i + 1} of the ledger</h2><p>Opening figures for chapter ${i + 1}.</p>${i === 6 ? `<table><tbody>${rows}</tbody></table>` : ''}</section>`).join('')}</main>
<script>const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } }); document.querySelectorAll('.fx-later').forEach(el => io.observe(el));</script>
${BEACON}</body></html>`;

// Three sibling mains of 600px (two 280px sections, 40px apart) and one empty main between the first two.
const mainPart = name => `<main class="fx-part"><section><h2>${name} overview</h2><p>Figures for ${name}.</p></section><section><h2>${name} detail</h2><p>More about ${name}.</p></section></main>`;
const mainsPage = `<!doctype html><html lang="en"><meta charset="utf-8"><title>mains fixture</title><style>${BASE}
main{display:flex;flex-direction:column;gap:40px;padding:0 24px}section{height:280px;padding:24px;background:#ffffff}
</style><body><header class="fx-top"><span>Island Works</span></header>${mainPart('Harbor')}<main class="fx-empty"></main>${mainPart('Orchard')}${mainPart('Quarry')}${BEACON}</body></html>`;

// A product page whose largest text is a 48px KPI value in a div; the only heading is a 20px h2.
const displayPage = `<!doctype html><html lang="en"><meta charset="utf-8"><title>display fixture</title><style>${BASE}
body{font:14px/20px system-ui}main{padding:24px}.fx-kpis{display:flex;gap:16px;margin-bottom:24px}
.fx-kpi{flex:1;background:#ffffff;border:1px solid #e3e8e7;border-radius:8px;padding:16px}.fx-value{font-size:48px;line-height:56px;font-weight:700}
</style><body><header class="fx-top"><span>Ops Console</span></header><main><h2>Orders today</h2>
<div class="fx-kpis"><div class="fx-kpi"><div>Shipped</div><div class="fx-value">1,284</div></div><div class="fx-kpi"><div>Returned</div><div class="fx-value">37</div></div></div>
<table><tbody>${rows}</tbody></table></main>${BEACON}</body></html>`;

// The only :focus-visible and reduced-motion rules, and the main inset, live in the cross-origin sheet.
const STATES_CSS = 'main{padding-left:48px}.fx-save:focus-visible{outline:2px solid #0f766e;outline-offset:2px}@media (prefers-reduced-motion: reduce){.fx-save{transition:none}}';
const sheetPage = (href, cors) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>stylesheet fixture</title>
<link rel="stylesheet" href="${href}"${cors ? ' crossorigin="anonymous"' : ''}><style>${BASE}
.fx-save{height:40px;padding:0 16px;border:0;border-radius:4px;background:#0f766e;color:#fafcfc;font:inherit;transition:background-color 150ms ease-out}
</style><body><main><h1>Billing profile</h1><section><h2>Card on file</h2><p>Ends in 4242.</p><button class="fx-save">Save card</button></section></main>${BEACON}</body></html>`;

const hits = { A: {}, B: {} };
const count = (side, req) => { const path = new URL(req.url, 'http://127.0.0.1').pathname; hits[side][path] = (hits[side][path] || 0) + 1; return path; };
let sheetOrigin = '';
const pages = { '/reveal': () => revealPage, '/mains': () => mainsPage, '/display': () => displayPage, '/sheet': () => sheetPage(`${sheetOrigin}/states.css`, false), '/sheet-cors': () => sheetPage(`${sheetOrigin}/states-cors.css`, true) };
const serverA = createServer((req, res) => {
  const path = count('A', req);
  if (pages[path]) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(pages[path]()); return; }
  res.writeHead(path === '/beacon' ? 204 : 404); res.end();
});
// Server B: /states.css without Access-Control-Allow-Origin, /states-cors.css with it.
const serverB = createServer((req, res) => {
  const path = count('B', req);
  if (path === '/states.css' || path === '/states-cors.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store', ...(path === '/states-cors.css' ? { 'access-control-allow-origin': '*' } : {}) });
    res.end(STATES_CSS); return;
  }
  res.writeHead(404); res.end();
});
await new Promise(done => serverA.listen(0, '127.0.0.1', done));
await new Promise(done => serverB.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${serverA.address().port}`;
sheetOrigin = `http://127.0.0.1:${serverB.address().port}`;
assert.notEqual(origin, sheetOrigin, 'the stylesheet comes from a different origin');

const LEAKS = ['Ledger', 'ledger', 'Chapter', 'Elsewhere', 'elsewhere', 'Opening figures', 'Entry', 'Island', 'Harbor', 'Orchard', 'Quarry', 'Ops Console', 'Orders today', 'Shipped', 'Returned', '1,284', 'Billing', 'Card on file', '4242', 'Save card', 'fx-', 'href', '/states.css', 'states-cors', '/beacon', '127.0.0.1'];
const noText = (value, what, allowedUrl = null) => {
  const dump = JSON.stringify(value).split(allowedUrl ?? '\u0000').join('');
  for (const leak of LEAKS) assert.ok(!dump.includes(leak), `${what} must not carry page text, classes, links, or asset URLs (found ${leak})`);
};
// The structure output, summary.structure, and facts also pass the allow-list (the design probe's
// counts carry CSS values and font names, so they get the text check only).
const noLeaks = (value, what, allowedUrl = null) => {
  noText(value, what, allowedUrl);
  assert.deepEqual(disallowedStrings(value, { url: allowedUrl }), [], `${what}: every string must pass the allow-list`);
};

// One observeUrls call: the page is requested exactly once per viewport, and every output passes.
async function measure(path, options = {}) {
  const url = `${origin}${path}`;
  const before = hits.A[path] || 0;
  const [result] = await observeUrls([url], { chromium, structure: true, ...options });
  assert.equal((hits.A[path] || 0) - before, 2, `${path} must be loaded once per viewport, got ${(hits.A[path] || 0) - before} loads`);
  const facts = buildFacts(result.summary, result.summary.structure, url, '2026-11-11');
  for (const o of result.observations) {
    noLeaks(o.structure, `${path} structure output (${o.viewport.width})`);
    const { structure, fonts, ...design } = o;
    noText(design, `${path} design output (${o.viewport.width})`);
  }
  noLeaks(result.summary.structure, `${path} summary.structure`);
  noLeaks(facts, `${path} facts`, url);
  return { ...result, facts: facts.facts, doc: facts, url };
}
const factOf = (facts, id, viewport) => facts.find(f => f.id === id && (viewport === undefined || f.viewport === viewport));
const mainOf = s => s.regions.find(r => r.kind === 'main');

try {
  // 1. Reveal on scroll.
  const atLoad = await measure('/reveal');
  for (const o of atLoad.observations) {
    const s = o.structure;
    assert.equal(Object.hasOwn(o, 'scroll'), false, 'without scroll there is no scroll record');
    assert.ok(s.sections.length < 8, `at load fewer than eight sections are visible at ${s.viewport.width}: ${s.sections.length}`);
    assert.ok(s.sections.every(x => x.y < 1000), `at load no section starts below 1000px at ${s.viewport.width}: ${s.sections.map(x => x.y)}`);
    assert.equal(s.tables.length, 0, 'the table in a hidden section is not measured at load');
  }
  const revealed = await measure('/reveal', { scroll: true });
  for (const o of revealed.observations) {
    const s = o.structure, w = s.viewport.width;
    assert.equal(s.sections.length, 8, `after the scroll pass all eight sections are measured at ${w}: ${JSON.stringify(s.sections.map(x => [x.kind, x.y]))}`);
    assert.ok(s.sections.filter(x => x.y >= 900).length >= 6, `at least six sections start below 900px at ${w}`);
    assert.deepEqual(s.sections.map(x => x.y), SECTION_Y, `each section sits at its layout position (the reveal transform has finished) at ${w}`);
    assert.deepEqual(s.tables.map(t => t.rowH), [{ 40: 6 }], `the revealed table with 40px rows at ${w}`);
    assert.deepEqual([o.scroll.cap, o.scroll.atTop, o.scroll.steps > 0, o.scroll.finalHeight], ['none', true, true, s.shell.documentHeight], `scroll record at ${w}: ${JSON.stringify(o.scroll)}`);
    assert.equal(Object.hasOwn(mainOf(s), 'parts'), false, 'one main landmark: no parts');
  }
  assert.deepEqual(Object.keys(revealed.doc.scroll).sort(), ['1440', '390']);
  const fewSteps = await measure('/reveal', { scroll: { maxSteps: 2 } });
  for (const o of fewSteps.observations) {
    assert.equal(o.scroll.cap, 'steps', JSON.stringify(o.scroll));
    assert.ok(o.structure.sections.length < 8, `two steps reveal only part of the page at ${o.viewport.width}: ${o.structure.sections.length}`);
  }
  const shallow = await measure('/reveal', { scroll: { maxHeight: 1500 } });
  for (const o of shallow.observations) assert.equal(o.scroll.cap, 'height', JSON.stringify(o.scroll));
  console.log(`reveal fixture passed: ${atLoad.observations[0].structure.sections.length} section(s) at load, 8 after the scroll pass (${revealed.observations.map(o => `${o.viewport.width}: ${o.scroll.steps} steps`).join(', ')}); caps steps and height`);

  // 2. Several mains.
  const mains = await measure('/mains');
  for (const o of mains.observations) {
    const s = o.structure, w = s.viewport.width, main = mainOf(s);
    assert.deepEqual([main.by, main.parts, main.y, main.h, main.w], ['landmark', 3, 64, 1800, w], `one main region of three parts, the union box, at ${w}: ${JSON.stringify(main)}`);
    assert.equal(s.regions.filter(r => r.kind === 'main').length, 1);
    for (const [top, bottom] of [[64, 664], [664, 1264], [1264, 1864]]) assert.ok(s.sections.some(x => x.y >= top && x.y < bottom), `the part at ${top}-${bottom} contributes a section at ${w}: ${s.sections.map(x => x.y)}`);
    assert.equal(s.sections.length, 6, JSON.stringify(s.sections.map(x => x.y)));
    assert.equal(factOf(mains.facts, 'composition.region.main.parts', w).value, 3);
    assert.equal(factOf(mains.facts, 'composition.region.main.height', w).value, 1800);
  }
  console.log(`several-mains fixture passed: main region by landmark, 3 parts, ${mains.observations[0].structure.sections.length} sections`);

  // 3. Display text that is not a heading.
  const display = await measure('/display');
  for (const w of [1440, 390]) {
    assert.deepEqual([factOf(display.facts, 'attention.text.largest', w).value, factOf(display.facts, 'attention.text.largest', w).from], [48, 'observations.type (largest)']);
    assert.equal(factOf(display.facts, 'attention.text.largestOverBody', w).value, 3.43);
    assert.deepEqual(factOf(display.facts, 'typography.heading.sizes', w).value, [20], 'headings in main are still only the 20px h2');
  }
  console.log('display-text fixture passed: largest text 48px over a 14px body (3.43); heading sizes [20]');

  // 4. A cross-origin stylesheet without CORS is applied but unreadable; with CORS it is read.
  const blind = await measure('/sheet');
  for (const o of blind.observations) {
    const s = o.structure;
    assert.equal(mainOf(s).insetLeft, 48, `the cross-origin sheet was applied (main inset) at ${s.viewport.width}`);
    assert.equal(s.css.unreadableSheets, 1, `Chromium read the cross-origin sheet without CORS: stop and report this (css ${JSON.stringify(s.css)})`);
    assert.deepEqual([s.css.focusVisible, s.css.reducedMotion, s.css.truncated], [0, 0, false]);
  }
  assert.ok(hits.B['/states.css'] >= 2, 'server B served the sheet');
  assert.deepEqual(factOf(blind.facts, 'states.css.focusVisible'), { id: 'states.css.focusVisible', axis: 'states-motion', level: 'observed', bound: 'lower', value: 0, viewport: 'both', from: 'structure.css (readable stylesheets, lower bound)' });
  assert.equal(factOf(blind.facts, 'states.css.reducedMotion').bound, 'lower');
  assert.equal(Object.hasOwn(factOf(blind.facts, 'states.css.unreadableSheets'), 'bound'), false);
  const read = await measure('/sheet-cors');
  for (const o of read.observations) {
    const s = o.structure;
    assert.equal(mainOf(s).insetLeft, 48);
    assert.deepEqual([s.css.unreadableSheets, s.css.focusVisible, s.css.reducedMotion], [0, 1, 1], JSON.stringify(s.css));
  }
  assert.equal(read.facts.some(f => Object.hasOwn(f, 'bound')), false, 'every sheet was read: no lower bound anywhere');
  assert.equal(factOf(read.facts, 'states.css.focusVisible').value, 1);
  console.log('stylesheet fixture passed: unreadable cross-origin sheet -> focusVisible 0 (lower bound); with CORS -> 1, no bound');

  // 5. One load per viewport and no interaction: no beacon, and the link was never followed.
  assert.equal(hits.A['/beacon'] ?? 0, 0, `the page reported an interaction: ${JSON.stringify(hits.A)}`);
  assert.equal(hits.A['/elsewhere'] ?? 0, 0, 'the linked path was requested');
  for (const [path, loads] of [['/reveal', 8], ['/mains', 2], ['/display', 2], ['/sheet', 2], ['/sheet-cors', 2]]) assert.equal(hits.A[path], loads, `${path}: ${hits.A[path]} loads for ${loads / 2} measurement(s) at two viewports`);
  console.log(`no-interaction fixture passed: server A saw ${JSON.stringify(hits.A)}`);
} finally {
  serverA.close();
  serverB.close();
}
