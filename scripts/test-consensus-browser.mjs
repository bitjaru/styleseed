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
// 5. Anatomy probe (WO-12): the anatomy fixture gives exactly the expected output at 1440 and the
//    same buttons, fields, labels, and cells at 390; on every fixture page and viewport, the pages of
//    control-box-fixtures.mjs included, the anatomy probe selects the same buttons and fields at the
//    same heights as the control probe (both read the shared visible-control-box block); the claim
//    readers give the expected values on the settings page, the control fixture, and the anatomy
//    fixture, read from the records measureScreens stores.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadBrowser, observeUrls } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { observeFaults } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-faults.mjs';
import { measureScreens, measureViewport } from './consensus-study.mjs';
import { CLAIMS, screenClaim, spacingSample, stripIds } from './lib/consensus.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';
import { observeAnatomy } from './lib/consensus-anatomy.mjs';
import { observeControls } from './lib/consensus-probe.mjs';
import { CONTROL_BOX_FIXTURES } from './lib/control-box-fixtures.mjs';
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
// The anatomy fixture (WO-12 appendix B): every expected value depends on CSS boxes, not on a font's
// metrics. Fictional copy.
const icon = (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M8 2v12" stroke="#4d5150" stroke-width="2" fill="none"/></svg>`;

const anatomyPage = () => `<!doctype html><html lang="en"><meta charset="utf-8"><title>anatomy fixture</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#f4f5f7;color:#1b1d1c;font:14px/20px system-ui,sans-serif}
main{display:flex;flex-direction:column;gap:24px;max-width:960px}
h1{font-size:24px;line-height:32px;font-weight:600;margin:0}h2{font-size:18px;line-height:24px;font-weight:600;margin:0 0 12px}
.t3{font-size:16px;line-height:24px;font-weight:700}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.card{background:#ffffff;border:1px solid #d5dbdb;border-radius:8px;padding:24px}
.shadow{background:#f4f5f7;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.tone{background:#e6e9ee;border-radius:0;padding:16px}
.pseudo{position:relative;background:#ffffff;border-radius:16px;padding:20px}.pseudo::before{content:"";position:absolute;inset:0;border:1px solid #c6c6cd;border-radius:16px;pointer-events:none}
.cols{display:flex;gap:24px}.cols>*{flex:1}
.stack{display:flex;flex-direction:column;gap:16px}
/* buttons */
.b-ant{height:32px;padding:4px 15px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff;font:inherit}
.b-ant.primary{background:#1677ff;border-color:#1677ff;color:#ffffff}
.b-cs{height:32px;padding:4px 20px;border:2px solid #006ce0;border-radius:20px;background:#006ce0;color:#ffffff;font:inherit;font-weight:700}
.b-cb{height:40px;padding:0 63px 0 15px;border:1px solid transparent;border-radius:0;background:#0f62fe;color:#ffffff;font:inherit;text-align:left}
.b-ic{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff;font:inherit;font-weight:500}
.b-tr{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff;font:inherit;font-weight:500}
.b-wide{display:block;width:100%;height:36px;padding:0 16px;border:0;border-radius:6px;background:#2f5d8a;color:#ffffff;font:inherit;font-weight:500}
.b-inner{height:32px;padding:0;border:0;border-radius:4px;background:#2f5d8a;color:#ffffff;font-size:12px}.b-inner span{display:inline-block;padding:0 14px;font-size:13px;font-weight:600}
/* fields */
.f-wrap{display:flex;align-items:center;width:280px;height:32px;padding:0 8px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff}
.f-wrap input{border:0;outline:0;height:22px;padding:0;width:100%;font:inherit;background:transparent}
.f-wrap.search{gap:8px}.f-wrap svg{flex:none}
.f-plain{width:280px;height:32px;padding:4px 11px;border:1px solid #b4bdbb;border-radius:6px;font:inherit;background:#ffffff}
.f-under{width:280px;height:40px;padding:0 16px;border:0;border-bottom:1px solid #8d8d8d;border-radius:0;background:#e6e9ee;font:inherit}
.f-fill{width:280px;height:36px;padding:0 12px;border:0;border-radius:8px;background:#e6e9ee;font:inherit}
.lab{margin-bottom:4px}.lab label{font-weight:500}
.fitem{display:flex;flex-direction:column}
.hrow{display:flex;align-items:center;gap:12px}.hrow label{display:inline-flex;align-items:center;height:32px;width:120px;justify-content:flex-end}
.wrap{display:flex;align-items:center;gap:10px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.help{margin:4px 0 0;font-size:12px;line-height:16px;color:#4d5150}
/* tables */
table{width:100%;border-collapse:collapse;background:#ffffff}thead tr{height:36px}tbody tr{height:40px}
th,td{padding:0 16px;text-align:left;border-bottom:1px solid #e3e8e7}th{font-weight:600;font-size:13px}.num{text-align:right}
.t2 td,.t2 th{padding:0}.t2 td>div,.t2 th>div{padding:9px 20px}
.grid{background:#ffffff}.grid [role=row]{display:flex;height:52px;align-items:center;border-bottom:1px solid #e3e8e7}.grid [role=columnheader],.grid [role=gridcell]{flex:1;padding:0 10px}.grid [role=columnheader]{font-weight:500}
</style><body><main>
<div><h1>Harbour ledger</h1><p>Quarterly entries and settings.</p></div>
<section class="card"><h2>Buttons</h2><div class="row">
<button class="b-ant"><span>Cancel entry</span></button><button class="b-ant primary"><span>Save entry</span></button>
<button class="b-cs"><span>Create ledger</span></button><button class="b-cb">Submit form</button>
<button class="b-ic">${icon()}<span>Add row</span></button><button class="b-tr"><span>Export list</span>${icon(12)}</button>
<button class="b-inner"><span>Inner span</span></button>
</div><div style="width:400px;margin-top:12px"><button class="b-wide">Continue to review</button></div></section>
<div class="cols">
<section class="card"><h2>Stacked</h2><div class="stack">
<div class="fitem"><div class="lab"><label for="a1">Ledger name</label></div><div class="f-wrap"><input id="a1" type="text" value="North quay"></div></div>
<div class="fitem"><div class="lab"><label for="a2">Owner email</label></div><input id="a2" class="f-plain" type="email" value="owner@example.test"><p class="help">Used for receipts only.</p></div>
<div class="fitem"><div class="lab"><label for="a3">Search entries</label></div><div class="f-wrap search">${icon()}<input id="a3" type="search" value="pier"></div></div>
<div class="fitem"><div class="lab"><label for="a4">Currency</label></div><select id="a4" class="f-plain"><option>KRW</option></select></div>
</div></section>
<section class="shadow"><div class="t3" role="heading" aria-level="3">Side labels</div><div class="stack">
<div class="hrow"><label for="b1">Berth</label><input id="b1" class="f-under" type="text" value="12"></div>
<div class="hrow"><label for="b2">Vessel</label><input id="b2" class="f-fill" type="text" value="Heron"></div>
<label class="wrap"><span>Wrapped label</span><input class="f-plain" type="text" value="inside"></label>
<div><label class="sr" for="b3">Hidden label</label><input id="b3" class="f-fill" type="text" value="quiet"></div>
</div></section>
</div>
<section class="tone"><h2>Plain table</h2><table><thead><tr><th>Date</th><th>State</th><th class="num">Amount</th></tr></thead><tbody>
${[1, 2, 3].map(i => `<tr><td>Nov ${i}</td><td>Settled</td><td class="num">1,24${i},000</td></tr>`).join('')}</tbody></table></section>
<section class="card"><h2>Wrapped cells</h2><table class="t2"><thead><tr><th><div>Name</div></th><th><div>Kind</div></th></tr></thead><tbody>
${[1, 2].map(i => `<tr><td><div><input type="checkbox" aria-label="pick"> Row ${i}</div></td><td><div>Kind ${i}</div></td></tr>`).join('')}</tbody></table></section>
<section class="pseudo"><h2>Grid</h2><div class="grid" role="grid"><div role="row"><div role="columnheader">Name</div><div role="columnheader">Port</div></div>
${[1, 2].map(i => `<div role="row"><div role="gridcell">Heron ${i}</div><div role="gridcell">Busan</div></div>`).join('')}</div></section>
</main></body></html>`;
const PAGES = { 'controls.html': controlsPage(), 'settings.html': settingsPage(), 'redirect.html': redirectPage(), 'sparse.html': sparsePage(), 'dialog.html': dialogPage(), 'anatomy.html': anatomyPage() };
const FIXTURE_TEXT = ['Harbour', 'Find invoices', 'unpaid', 'Moving to', 'Nearly empty', 'Quarterly', 'Welcome aboard', 'Filter', '스토어', '결제', 'owner@', '110-123', 'fx-', 'fixture',
  'Cancel entry', 'Save entry', 'Create ledger', 'Submit form', 'Add row', 'Export list', 'Inner span', 'Continue to review', 'Ledger name', 'North quay', 'Owner email', 'Search entries',
  'Currency', 'KRW', 'Berth', 'Vessel', 'Heron', 'Wrapped label', 'Hidden label', 'quiet', 'receipts', 'Side labels', 'Plain table', 'Wrapped cells', 'Settled', 'Busan', 'Kind 1', 'Row 1', 'Nov 1'];

// The anatomy probe's output on the anatomy fixture at 1440×900 (WO-12 appendix C), and what changes at 390.
// One key differs from appendix C since the probe reads controls through the shared visible-control-box
// block: the button whose label sits in a 13px span inside a 12px button reads its text size from the
// button element (12), as the block defines it; appendix C had 13.
const ANATOMY_1440 = {
  version: 1, viewport: { width: 1440, height: 900 }, truncated: false,
  buttons: { 'outline|32|16|14|400|6|1|none|0|0': 1, 'filled|32|16|14|400|6|1|none|0|0': 1, 'filled|32|22|14|700|999|2|none|0|0': 1, 'filled|40|16|14|400|0|0|none|0|0': 1, 'outline|32|13|14|500|6|1|lead|16|8': 1, 'outline|32|13|14|500|6|1|trail|12|6': 1, 'filled|32|14|12|600|4|0|none|0|0': 1, 'filled|36|16|14|500|6|0|none|0|0': 1 },
  fields: { 'text|32|9|14|6|box|1|none': 1, 'text|32|12|14|6|box|1|none': 2, 'text|32|33|14|6|box|1|lead': 1, 'select|32|12|14|6|box|1|none': 1, 'text|40|16|14|0|under|1|none': 1, 'text|36|12|14|8|fill|0|none': 2 },
  labels: { 'above|4|14|500': 4, 'left|12|14|400': 2, 'left|10|14|400': 1, 'none|0|0|0': 1 },
  fieldGaps: { 'plain|16': 3, 'helper|36': 1 },
  panels: { 'narrow|25|8|border-tone|1': 3, 'narrow|20|12|shadow|0': 1, 'narrow|16|0|tone|0': 1, 'narrow|20|16|border-tone|1': 1 },
  panelGaps: { 'inline|24': 1, 'stack|24': 2 },
  cells: { 'head|36|16|13|600': 2, 'head|36|none|13|600': 1, 'body|40|16|14|400': 6, 'body|40|none|14|400': 5, 'head|39|20|13|600': 2, 'body|40|20|14|400': 2, 'head|52|10|14|500': 2, 'body|52|10|14|400': 4 },
  headings: { '1|24|600|32': 1, '2|18|600|24': 5, '3|16|700|24': 1 },
  textLines: { '24|32': 14, '14|20': 216, '18|24': 42, '12|16': 23, '16|24': 11, '13|20': 23 },
  icons: { 12: 1, 16: 2 },
  capped: {},
};
const ANATOMY_390 = { panels: { 'wide|25|8|border-tone|1': 3, 'wide|16|0|tone|0': 1, 'wide|20|16|border-tone|1': 1 }, panelGaps: { 'stack|24': 2 } };
// The claim values of WO-12 A6 ("Expected values") on the three fixture pages at 1440.
const EXPECTED = {
  'kit-settings': {
    'button.padX': 16, 'button.padRatio': 0.5, 'button.textSize': 14, 'button.textWeight': 400, 'button.radius': 4, 'button.shape': 'rounded', 'field.padX': 9, 'field.style': 'box',
    'field.borderWidth': 1, 'label.position': 'above', 'label.gap': 8, 'label.textWeight': 500, 'form.fieldGap': 16, 'panel.inset': 25, 'panel.radius': 8, 'panel.separation': 'border-tone',
    'panel.gap': 32, 'radius.panelNotSmaller': true, 'table.headerHeight': 36, 'table.bodyRowHeight': 40, 'table.cellPadX': 16, 'table.headerHeavier': true, 'text.lineRatio': 1.45,
    'heading.pageTitle': 24, 'heading.sectionTitle': 16, 'heading.weight': 600, 'nav.sideWidth': 240, 'nav.itemHeight': 32, 'nav.topBarHeight': 56,
  },
  'alpha-controls': { 'button.padX': 16, 'field.padX': 9, 'panel.inset': 24, 'panel.separation': 'none', 'label.position': null, 'table.headerHeight': null, 'table.bodyRowHeight': null, 'table.cellPadX': null, 'table.headerHeavier': null },
  'alpha-anatomy': {
    'button.padX': 16, 'button.iconSize': 12, 'button.iconGap': 6, 'field.padX': 12, 'label.gap': 4, 'form.fieldGap': 16, 'panel.inset': 25, 'panel.gap': 24, 'table.cellPadX': 16,
    'text.lineRatio': 1.45, 'heading.pageTitle': 24, 'heading.sectionTitle': 18, 'icon.size': 16,
  },
};
const SETTINGS_PAIRS = [['buttonPad', 16], ['fieldPad', 8], ['labelGap', 8], ['fieldGap', 16], ['panelInset', 24], ['panelGap', 32], ['cellPad', 16]];
// The anatomy probe selects the buttons and fields of the control probe at the same heights: sums by
// emphasis|height|radius and by kind|height|radius|font agree.
const sumBy = (map, pick) => { const out = {}; for (const [key, n] of Object.entries(map ?? {})) { const k = pick(key.split('|')); out[k] = (out[k] || 0) + n; } return Object.fromEntries(Object.entries(out).sort()); };
const assertParity = (controls, anatomy, what) => {
  assert.deepEqual(sumBy(anatomy.buttons, p => `${p[0]}|${p[1]}|${p[5]}`), sumBy(controls.buttons, p => `${p[0]}|${p[1]}|${p[2]}`), `${what}: anatomy and control probes select the same buttons`);
  assert.deepEqual(sumBy(anatomy.fields, p => `${p[0]}|${p[1]}|${p[4]}|${p[3]}`), sumBy(controls.fields, p => `${p[0]}|${p[1]}|${p[3]}|${p[4]}`), `${what}: anatomy and control probes select the same fields`);
};
const noFixtureText = (text, what) => { for (const t of FIXTURE_TEXT) assert.ok(!text.includes(t), `${what} must not carry fixture text (found ${JSON.stringify(t)})`); };

const dir = mkdtempSync(join(tmpdir(), 'styleseed-consensus-'));
try {
  const pages = join(dir, 'pages');
  mkdirSync(pages);
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(pages, name), html);
  for (const [name, { html }] of Object.entries(CONTROL_BOX_FIXTURES)) writeFileSync(join(pages, `box-${name}.html`), html);
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
      assertParity(m.outputs.controls, m.outputs.anatomy, `settings @${size.width}`);
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

    // 5. The anatomy probe: appendix C at 1440, the same controls at 390, parity on every fixture page.
    const outputs = {};
    for (const name of ['anatomy.html', 'controls.html']) for (const size of SIZES) {
      const m = await measureViewport(browser, url(name), size, { allowFile: true });
      assert.equal(m.status, 'measured', JSON.stringify(m));
      assertParity(m.outputs.controls, m.outputs.anatomy, `${name} @${size.width}`);
      noFixtureText(JSON.stringify(m.outputs.anatomy), `anatomy output of ${name} @${size.width}`);
      outputs[`${name}@${size.width}`] = m.outputs.anatomy;
    }
    const wide = outputs['anatomy.html@1440'], narrow = outputs['anatomy.html@390'];
    assert.deepEqual(wide, ANATOMY_1440, 'the anatomy fixture at 1440 gives the expected output');
    for (const key of ['buttons', 'fields', 'labels', 'fieldGaps', 'cells', 'headings', 'textLines', 'icons', 'capped', 'truncated']) assert.deepEqual(narrow[key], ANATOMY_1440[key], `@390: ${key} as at 1440`);
    assert.deepEqual([narrow.panels, narrow.panelGaps, narrow.viewport], [ANATOMY_390.panels, ANATOMY_390.panelGaps, { width: 390, height: 844 }], '@390: the shadow panel is wider than the viewport less 32px and is not a panel there');
    // The same parity on every page of the visible-control-box fixtures (WO-10), at both viewports.
    for (const name of Object.keys(CONTROL_BOX_FIXTURES)) for (const size of SIZES) {
      const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        await page.goto(url(`box-${name}.html`), { waitUntil: 'load' });
        const [controls, anatomy] = [await page.evaluate(observeControls, { maxElements: 5000 }), await page.evaluate(observeAnatomy, { maxElements: 5000 })];
        assertParity(controls, anatomy, `control-box fixture ${name} @${size.width}`);
        noFixtureText(JSON.stringify(anatomy), `anatomy output of control-box fixture ${name}`);
      } finally { await context.close(); }
    }
    console.log(`consensus anatomy probe: anatomy fixture equals the expected output at 1440 (${Object.keys(wide.buttons).length} button, ${Object.keys(wide.fields).length} field, ${Object.keys(wide.panels).length} panel, ${Object.keys(wide.cells).length} cell keys) and keeps its controls at 390; the anatomy and control probes select the same buttons and fields on the settings, control, and anatomy fixtures and on the ${Object.keys(CONTROL_BOX_FIXTURES).length} visible-control-box fixtures at 1440 and 390`);
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
      { id: 'alpha-anatomy', lineage: 'alpha', pageType: 'form', tier: 'screen', url: url('anatomy.html'), expect: { elements: 5, fields: 4, buttons: 4 } },
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
    { screen: 'alpha-anatomy', status: 'measured' },
    { screen: 'alpha-moved', status: 'failed', reason: 'redirected-path' },
    { screen: 'alpha-sparse', status: 'failed', reason: 'unexpected-content' },
    { screen: 'alpha-dialog', status: 'failed', reason: 'overlay' },
    { screen: 'kit-settings', status: 'measured' },
  ]);
  assert.deepEqual(first.records.map(r => r.screen), ['alpha-controls', 'alpha-anatomy', 'kit-settings'], 'no record for a failed screen');
  assert.match(first.chromium, /^\d+(\.\d+)+$/u);
  assert.deepEqual(first.probes, { structure: 2, faults: 1, controls: 2, anatomy: 1 });
  const kit = first.records.find(r => r.screen === 'kit-settings');
  assert.deepEqual([kit.url, kit.access, kit.robots, kit.scroll], [listed('settings.html'), 'self-hosted', 'not-checked', false], 'a self-hosted screen keeps its listed URL');
  assert.deepEqual(kit.viewports.map(v => [v.viewport, v.status]), [[1440, 'measured'], [390, 'measured']]);
  assert.ok(kit.facts.some(f => f.id === 'density.table.rowHeight' && f.value === 40), 'facts come from the summary of both viewports');
  // The claim readers on the stored records: the expected values of WO-12 A6, and the record keeps the
  // anatomy block beside the control block at both viewports, with the same parity.
  for (const record of first.records) {
    assert.equal(record.recordVersion, 2);
    for (const v of record.viewports) {
      assert.deepEqual(Object.keys(v).slice(Object.keys(v).indexOf('controls'), Object.keys(v).indexOf('controls') + 3), ['controls', 'anatomy', 'faults'], `${record.screen} @${v.viewport}: anatomy sits beside controls`);
      assertParity(v.controls, v.anatomy, `${record.screen} record @${v.viewport}`);
    }
    for (const [id, expected] of Object.entries(EXPECTED[record.screen])) {
      const claim = CLAIMS.find(c => c.id === id);
      assert.ok(claim, id);
      assert.deepEqual(screenClaim(claim, record).value, expected, `${record.screen}: ${id}`);
    }
  }
  assert.deepEqual(first.records.find(r => r.screen === 'alpha-controls').viewports[0].anatomy.labels, { 'none|0|0|0': 1 }, 'the control fixture: one field, its label given by aria-label only');
  const pairsOf = id => spacingSample(first.records.find(r => r.screen === id));
  assert.deepEqual(pairsOf('kit-settings').map(p => [p.kind, p.value]), SETTINGS_PAIRS, 'the settings page: seven spacing pairs, all on the grid');
  const fixturePairs = pairsOf('alpha-anatomy');
  assert.deepEqual([fixturePairs.length, fixturePairs.filter(p => p.value % 4 === 0).length], [18, 15], `the anatomy fixture: 18 spacing pairs, 15 on the grid ${JSON.stringify(fixturePairs)}`);
  console.log(`consensus anatomy claims: the expected values hold on the settings page (${Object.keys(EXPECTED['kit-settings']).length} claims, 7 spacing pairs), the control fixture, and the anatomy fixture (${Object.keys(EXPECTED['alpha-anatomy']).length} claims, ${fixturePairs.length} spacing pairs)`);
  for (const record of first.records) {
    // The listed URL is the record's own `url`; everything else is numbers and enums.
    const text = JSON.stringify(stripIds(record, manifest), null, 1);
    noFixtureText(text, `${record.screen} record`);
    assert.ok(!text.includes('system-ui') && !text.includes('file:'), `${record.screen}: no font family and no measured URL`);
    assert.deepEqual(disallowedStrings(stripIds(record, manifest)), [], `${record.screen}: the record passes the allow-list walk`);
  }
  const second = await measureScreens(manifest, { ...options, only: ['alpha-controls', 'alpha-anatomy', 'kit-settings'] });
  for (const [i, record] of second.records.entries()) assert.equal(JSON.stringify(record, null, 1), JSON.stringify(first.records[i], null, 1), `${record.screen}: two runs give the same record bytes`);
  console.log(`consensus guards: ${first.rows.filter(r => r.status === 'failed').map(r => `${r.screen} ${r.reason}`).join(', ')}; records pass the allow-list and repeat byte for byte`);
  console.log('consensus browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
