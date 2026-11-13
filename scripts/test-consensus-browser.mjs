#!/usr/bin/env node
// Browser fixture for the pattern-consensus study (scripts/consensus-study.mjs). All pages are local
// file: fixtures with fictional copy; nothing is loaded from the network.
// 1. Loop parity: on the settings page of the reference fixtures, the study's per-viewport loop gives
//    design, structure, and fault output deep-equal to observeUrls with the structure probe and the
//    fault probe as an extra probe, at 1440 and 390 (the same load sequence).
// 2. Control probe: a borderless 22px input inside a bordered 32px box beside a 32px button, a 16px
//    <button role="checkbox"> with a visually hidden label, an icon-only button, and a white rounded
//    card on a white page give one field `text|32|22|…` in a panel, one labelled button of 32, no 16px
//    button, and one pair { field: 32, button: 32 }; the engine design probe on the same page agrees
//    (the visible-control-box block is shared): control heights 32 twice. The settings page gives
//    fields and buttons of 36.
// 3. Guards: a page that replaces its location with another file → redirected-path; a page under its
//    expect floor → unexpected-content; a dialog over 64% of the viewport → overlay; no record for any.
//    A self-hosted lineage is measured from its --base prefix and keeps the listed URL.
// 4. No fixture text in any output, every record passes the allow-list walk, and two runs with the
//    same injected date give the same record bytes. A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { observeFaults } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-faults.mjs';
import { measureScreens, measureViewport } from './consensus-study.mjs';
import { stripIds } from './lib/consensus.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';
import { settingsPage } from './lib/reference-settings-page.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const SIZES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

const controlsPage = () => `<!doctype html><html lang="en"><meta charset="utf-8"><title>controls fixture</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#ffffff;color:#1b1d1c;font:14px/20px system-ui,sans-serif}
.card{max-width:560px;background:#ffffff;border-radius:8px;padding:24px;display:flex;flex-direction:column;gap:16px}
.row{display:flex;gap:8px;align-items:center}
.box{display:flex;align-items:center;width:240px;height:32px;padding:0 8px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff}
.box input{border:0;outline:0;height:22px;padding:0;width:100%;font:inherit;background:transparent}
.primary{height:32px;padding:0 16px;border:0;border-radius:6px;background:#2f5d8a;color:#ffffff;font:inherit}
.check{position:relative;width:16px;height:16px;padding:0;border:1px solid #6b7270;border-radius:4px;background:#ffffff}
.hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.icon{width:32px;height:32px;padding:0;border:0;background:transparent}
</style><body><div class="card">
<div class="row"><div class="box"><input type="text" value="Harbour invoices" aria-label="Harbour invoices"></div><button class="primary">Find invoices</button></div>
<div class="row"><button role="checkbox" aria-checked="false" class="check"><span class="hidden">Only unpaid invoices</span></button><span>Only unpaid invoices</span><button class="icon" aria-label="Filter"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 3h12l-5 6v4l-2 1V9z" fill="#6b7270"/></svg></button></div>
</div></body></html>`;
const redirectPage = () => '<!doctype html><html lang="en"><meta charset="utf-8"><title>moving</title><body><p>Moving to the ledger page</p><script>location.replace("controls.html")</script></body></html>';
const sparsePage = () => '<!doctype html><html lang="en"><meta charset="utf-8"><title>sparse</title><body><p>Nearly empty ledger</p></body></html>';
const dialogPage = () => `<!doctype html><html lang="en"><meta charset="utf-8"><title>dialog</title><style>body{margin:0;font:14px/20px system-ui}
.d{position:fixed;left:0;top:0;width:80vw;height:80vh;background:#ffffff;border:1px solid #b4bdbb}</style><body><main><p>Quarterly ledger summary</p></main><div class="d" role="dialog" aria-modal="true"><p>Welcome aboard the ledger</p></div></body></html>`;
const PAGES = { 'controls.html': controlsPage(), 'settings.html': settingsPage(), 'redirect.html': redirectPage(), 'sparse.html': sparsePage(), 'dialog.html': dialogPage() };
const FIXTURE_TEXT = ['Harbour', 'Find invoices', 'unpaid', 'Moving to', 'Nearly empty', 'Quarterly', 'Welcome aboard', 'Filter', '스토어', '결제', 'owner@', '110-123', 'fx-', 'fixture'];
const noFixtureText = (text, what) => { for (const t of FIXTURE_TEXT) assert.ok(!text.includes(t), `${what} must not carry fixture text (found ${JSON.stringify(t)})`); };

const dir = mkdtempSync(join(tmpdir(), 'styleseed-consensus-'));
try {
  const pages = join(dir, 'pages');
  mkdirSync(pages);
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(pages, name), html);
  const url = name => pathToFileURL(join(pages, name)).href;
  const { chromium } = await loadBrowser(browserModule);

  // 1. Loop parity with observeUrls.
  const [reference] = await observeUrls([url('settings.html')], { chromium, structure: true, extraProbes: [{ key: 'faults', probe: observeFaults }] });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [i, size] of SIZES.entries()) {
      const m = await measureViewport(browser, url('settings.html'), size, { allowFile: true });
      assert.equal(m.status, 'measured', JSON.stringify(m));
      const { structure, faults, ...design } = reference.observations[i];
      assert.deepEqual(m.outputs.design, design, `@${size.width}: design output equals observeUrls`);
      assert.deepEqual(m.outputs.structure, structure, `@${size.width}: structure output equals observeUrls`);
      assert.deepEqual(m.outputs.faults, faults, `@${size.width}: fault output equals observeUrls`);
      // The settings page: every field and labelled button is 36px.
      const fields = Object.keys(m.outputs.controls.fields), buttons = Object.keys(m.outputs.controls.buttons);
      assert.ok(fields.length && buttons.length, JSON.stringify(m.outputs.controls));
      assert.ok(fields.every(k => k.split('|')[1] === '36'), `@${size.width}: fields of 36 ${JSON.stringify(fields)}`);
      assert.ok(buttons.every(k => k.split('|')[1] === '36'), `@${size.width}: buttons of 36 ${JSON.stringify(buttons)}`);
    }
    console.log('consensus loop parity: design, structure, and fault output equal observeUrls at 1440 and 390');

    // 2. The control probe on the wrapped input.
    const c = await measureViewport(browser, url('controls.html'), SIZES[0], { allowFile: true });
    assert.equal(c.status, 'measured', JSON.stringify(c));
    const fieldKeys = Object.keys(c.outputs.controls.fields);
    assert.equal(fieldKeys.length, 1, JSON.stringify(c.outputs.controls));
    const [kind, box, self, , , panel] = fieldKeys[0].split('|');
    assert.deepEqual([kind, box, self], ['text', '32', '22'], `the visible box and the input element: ${fieldKeys[0]}`);
    assert.notEqual(panel, 'none', 'a white rounded card on a white page is a panel');
    assert.deepEqual(Object.keys(c.outputs.controls.buttons).map(k => k.split('|').slice(0, 2).join('|')), ['filled|32'], `one labelled button of 32 and no 16px button: ${JSON.stringify(c.outputs.controls.buttons)}`);
    assert.deepEqual(c.outputs.controls.pairs.map(p => [p.field, p.button]), [[32, 32]]);
    assert.deepEqual(c.outputs.design.controlHeights, { 32: 2 }, `the engine design probe and the study probe read the same boxes (the 32px field box and the 32px button; no 22, no 16): ${JSON.stringify(c.outputs.design.controlHeights)}`);
    noFixtureText(JSON.stringify(c.outputs.controls), 'control probe output');
    console.log(`consensus control probe: field ${fieldKeys[0]}, buttons ${JSON.stringify(c.outputs.controls.buttons)}; design probe control heights ${JSON.stringify(c.outputs.design.controlHeights)}`);
  } finally { await browser.close(); }

  // 3 and 4. Guards and records through measureScreens.
  const listed = name => `https://kit-one.example.test/fixtures/${name}`;
  const manifest = {
    manifestVersion: 1, checkedAt: '2026-11-12', viewports: [[1440, 900], [390, 844]],
    lineages: [
      { id: 'alpha', name: 'alpha system', kind: 'product-system', host: 'alpha.example.test', access: 'hosted', repository: 'example/alpha', licence: 'MIT', robots: { checkedAt: '2026-11-12', verdict: 'allowed' }, terms: { url: null, checkedAt: '2026-11-12', automatedAccess: 'not-mentioned', note: '' } },
      { id: 'kit-one', name: 'kit one', kind: 'kit', host: 'kit-one.example.test', access: 'self-hosted', basePath: '/fixtures/', repository: 'example/kit-one', licence: 'MIT', robots: { checkedAt: '2026-11-12', verdict: 'allowed' }, terms: { url: null, checkedAt: null, automatedAccess: 'unchecked', note: '' } },
    ],
    screens: [
      { id: 'alpha-controls', lineage: 'alpha', pageType: 'form', tier: 'screen', url: url('controls.html'), expect: { elements: 5, fields: 1, buttons: 1 } },
      { id: 'alpha-moved', lineage: 'alpha', pageType: 'form', tier: 'screen', url: url('redirect.html'), expect: { elements: 1 } },
      { id: 'alpha-sparse', lineage: 'alpha', pageType: 'list', tier: 'screen', url: url('sparse.html'), expect: { elements: 1000 } },
      { id: 'alpha-dialog', lineage: 'alpha', pageType: 'detail', tier: 'screen', url: url('dialog.html'), expect: { elements: 1 } },
      { id: 'kit-settings', lineage: 'kit-one', pageType: 'form', tier: 'screen', url: listed('settings.html'), expect: { elements: 20, fields: 2 } },
    ],
  };
  const options = { chromium, allowFile: true, delay: 0, today: '2026-11-13', bases: { 'kit-one': `${pathToFileURL(pages).href}/` }, fetchImpl: async () => { throw new Error('no robots.txt is fetched for file: URLs'); } };
  const first = await measureScreens(manifest, options);
  assert.deepEqual(first.rows, [
    { screen: 'alpha-controls', status: 'measured' },
    { screen: 'alpha-moved', status: 'failed', reason: 'redirected-path' },
    { screen: 'alpha-sparse', status: 'failed', reason: 'unexpected-content' },
    { screen: 'alpha-dialog', status: 'failed', reason: 'overlay' },
    { screen: 'kit-settings', status: 'measured' },
  ]);
  assert.deepEqual(first.records.map(r => r.screen), ['alpha-controls', 'kit-settings'], 'no record for a failed screen');
  assert.match(first.chromium, /^\d+(\.\d+)+$/u);
  assert.deepEqual(first.probes, { structure: 2, faults: 1, controls: 2 });
  const kit = first.records.find(r => r.screen === 'kit-settings');
  assert.deepEqual([kit.url, kit.access, kit.robots, kit.scroll], [listed('settings.html'), 'self-hosted', 'not-checked', false], 'a self-hosted screen keeps its listed URL');
  assert.deepEqual(kit.viewports.map(v => [v.viewport, v.status]), [[1440, 'measured'], [390, 'measured']]);
  assert.ok(kit.facts.some(f => f.id === 'density.table.rowHeight' && f.value === 40), 'facts come from the summary of both viewports');
  for (const record of first.records) {
    // The listed URL is the record's own `url`; everything else is numbers and enums.
    const text = JSON.stringify(stripIds(record, manifest), null, 1);
    noFixtureText(text, `${record.screen} record`);
    assert.ok(!text.includes('system-ui') && !text.includes('file:'), `${record.screen}: no font family and no measured URL`);
    assert.deepEqual(disallowedStrings(stripIds(record, manifest)), [], `${record.screen}: the record passes the allow-list walk`);
  }
  const second = await measureScreens(manifest, { ...options, only: ['alpha-controls', 'kit-settings'] });
  for (const [i, record] of second.records.entries()) assert.equal(JSON.stringify(record, null, 1), JSON.stringify(first.records[i], null, 1), `${record.screen}: two runs give the same record bytes`);
  console.log(`consensus guards: ${first.rows.filter(r => r.status === 'failed').map(r => `${r.screen} ${r.reason}`).join(', ')}; records pass the allow-list and repeat byte for byte`);
  console.log('consensus browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
