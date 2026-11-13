#!/usr/bin/env node
// Browser fixture for the visible control box (WO-10): the block shared by observe-design.mjs,
// observe-structure.mjs, and scripts/lib/consensus-probe.mjs. All pages are local file: fixtures with
// fictional copy in a temporary folder; nothing is loaded from the network.
// 1. Every page of scripts/lib/control-box-fixtures.mjs at 1440×900 and 390×844, one load, the three
//    probes in turn: the design probe's controlHeights is the page's `expect`; field plus button per
//    kind add up to it; the versions are design controlBoxVersion 1, structure 2, study 2; the
//    structure probe's single-line inputs, the study probe's field boxes, and its boxed labelled
//    buttons give the same heights as the design probe (parity); the page's outerHTML is the same
//    after the probes; no fixture text leaves the page.
// 2. Named cases: one control for a date range and for card fields, a floating label inside its box,
//    the radius of a sibling and of a pseudo-element outline, list-box triggers as selects, a text
//    area listed but not a control height, ghost and icon-only buttons, field and button pairs.
// 3. The settings page of the reference fixtures: every field and boxed button is 36px.
// 4. The drift gate through the CLI: a 22px input in a 32px box, a 32px button, a 16px
//    <button role="checkbox">, and a 96px text area pass a recorded `controlHeights` decision of 32;
//    a third page that adds a 40px button violates it.
// A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { observeDesign } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs';
import { observeStructure } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs';
import { observeControls } from './lib/consensus-probe.mjs';
import { CONTROL_BOX_FIXTURES } from './lib/control-box-fixtures.mjs';
import { settingsPage } from './lib/reference-settings-page.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const cli = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');
const SIZES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const FIXTURE_TEXT = ['Harbour', 'invoices', 'Invoices', 'berth', 'Berth', 'Quay', 'quay', 'Vessel', 'vessel', 'Captain', 'First mate', 'Tide', 'tide', 'Unpaid', 'unpaid', 'Arrivals', 'Departures', 'Weekly', 'Month view', 'Docked', 'Urgent', 'Cancel', 'Info', 'manifest', 'Pier', 'Anchor', 'Lighthouse', 'Crane', 'tonnes', 'Mooring', 'Aurora', 'TEST1', 'Subscribe', 'example.test', 'Inbox', 'Save draft', 'Filter', 'Open menu', 'Dock nine', 'route', 'Tug', 'Ferry', 'Barge', 'harbour', '예', '아니요', '스토어', '결제', 'Notes', 'dawn', 'Berth ledger', 'Export ledger', 'fixture'];
const noFixtureText = (value, what) => { const text = JSON.stringify(value); for (const t of FIXTURE_TEXT) assert.ok(!text.includes(t), `${what} must not carry fixture text (found ${JSON.stringify(t)})`); };
const add = (map, key, n) => { map[key] = (map[key] || 0) + n; };
// Heights tallied from `type|height|width` or `kind|height|…` keys whose first part is in `kinds`.
const heights = (keys, kinds) => { const out = {}; for (const [key, n] of Object.entries(keys)) { const [kind, h] = key.split('|'); if (kinds.includes(kind)) add(out, h, n); } return out; };
const sum = (...maps) => { const out = {}; for (const map of maps) for (const [k, n] of Object.entries(map)) add(out, k, n); return out; };

// The gate pages: one template; billing adds a filled 40px button and nothing else.
const gatePage = extra => `<!doctype html><html lang="en"><meta charset="utf-8"><title>gate fixture</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#ffffff;color:#1b1d1c;font:14px/20px system-ui,sans-serif}
main{display:flex;flex-direction:column;gap:16px;max-width:560px}.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.box{display:flex;align-items:center;width:240px;height:32px;padding:0 8px;border:1px solid #b4bdbb;border-radius:6px}.box input{border:0;outline:0;padding:0;background:transparent;font:inherit;height:22px;width:100%}
.btn{height:32px;padding:0 16px;border:0;border-radius:6px;background:#2f5d8a;color:#ffffff;font:inherit;white-space:nowrap}.big{height:40px}
.check{width:16px;height:16px;padding:0;border:1px solid #6b7270;border-radius:4px;background:#ffffff}
textarea{width:320px;height:96px;border:1px solid #b4bdbb;border-radius:6px;padding:8px;font:inherit}
</style><body><main><h1 style="font-size:24px;line-height:32px;margin:0">Berth ledger</h1>
<div class="row"><div class="box"><input type="text" value="Harbour invoices" aria-label="Invoices"></div><button class="btn">Find invoices</button></div>
<div class="row"><button role="checkbox" aria-checked="false" class="check" aria-label="Only unpaid"></button><span>Only unpaid invoices</span></div>
<textarea aria-label="Notes">Loaded at dawn.</textarea>${extra}</main></body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'styleseed-control-box-'));
try {
  const pages = join(dir, 'pages');
  mkdirSync(pages);
  for (const [name, fixture] of Object.entries(CONTROL_BOX_FIXTURES)) writeFileSync(join(pages, `${name}.html`), fixture.html);
  writeFileSync(join(pages, 'settings.html'), settingsPage());
  const url = name => pathToFileURL(join(pages, `${name}.html`)).href;
  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  const measured = {};
  try {
    const measure = async (name, size) => {
      const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        await page.goto(url(name), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const before = await page.evaluate(() => document.documentElement.outerHTML);
        const design = await page.evaluate(observeDesign, {});
        const structure = await page.evaluate(observeStructure, {});
        const study = await page.evaluate(observeControls, {});
        const after = await page.evaluate(() => document.documentElement.outerHTML);
        return { design, structure, study, unchanged: before === after };
      } finally { await context.close(); }
    };

    // 1. Every fixture at both widths: the expected histogram, the versions, three-probe parity.
    for (const [name, fixture] of Object.entries(CONTROL_BOX_FIXTURES)) {
      for (const size of SIZES) {
        const at = `${name} @${size.width}`;
        const { design, structure, study, unchanged } = await measure(name, size);
        if (size.width === 1440) measured[name] = { design, structure, study };
        assert.deepEqual(design.controlHeights, fixture.expect, `${at}: design controlHeights ${JSON.stringify(design.controlHeights)}`);
        assert.deepEqual(sum(design.controlHeightsByKind.field, design.controlHeightsByKind.button), design.controlHeights, `${at}: field plus button per height is controlHeights ${JSON.stringify(design.controlHeightsByKind)}`);
        assert.deepEqual([design.controlBoxVersion, structure.version, study.version], [1, 2, 2], `${at}: versions`);
        assert.deepEqual(heights(structure.controls.inputs, ['text', 'search', 'number', 'date', 'select']), design.controlHeightsByKind.field, `${at}: structure inputs ${JSON.stringify(structure.controls.inputs)} against design fields`);
        assert.deepEqual(heights(study.fields, ['text', 'select']), design.controlHeightsByKind.field, `${at}: study fields ${JSON.stringify(study.fields)} against design fields`);
        assert.deepEqual(heights(study.buttons, ['filled', 'outline']), design.controlHeightsByKind.button, `${at}: study buttons ${JSON.stringify(study.buttons)} against design buttons`);
        assert.ok(unchanged, `${at}: the page's outerHTML changed while the probes ran`);
        noFixtureText({ design, structure, study }, `${at} probe output`);
      }
    }
    const count = Object.keys(CONTROL_BOX_FIXTURES).length;
    console.log(`control box fixtures: ${count} pages at 1440 and 390; design, structure, and study readings agree on every page`);

    // 2. Named cases at 1440.
    const inputs = name => measured[name].structure.controls.inputs;
    const total = (map, prefix) => Object.entries(map).filter(([k]) => k.startsWith(prefix)).reduce((s, [, n]) => s + n, 0);
    assert.equal(Object.keys(inputs('date-range')).length, 1, JSON.stringify(inputs('date-range')));
    assert.equal(total(inputs('date-range'), 'text|32|'), 1, `date range: one structure input of 32 ${JSON.stringify(inputs('date-range'))}`);
    assert.deepEqual(measured['date-range'].study.fields, { 'text|32|22|6|14|none': 1 });
    assert.equal(Object.values(inputs('card-fields')).reduce((s, n) => s + n, 0), 1, `card fields: one input ${JSON.stringify(inputs('card-fields'))}`);
    assert.deepEqual(measured['card-fields'].study.fields, { 'text|44|24|8|14|none': 1 });
    assert.deepEqual([measured['floating-label'].structure.controls.labels.inside, measured['floating-label'].structure.controls.labels.above], [1, 0], JSON.stringify(measured['floating-label'].structure.controls.labels));
    const radius = name => Object.keys(measured[name].study.fields).map(k => Number(k.split('|')[3]));
    assert.deepEqual([radius('sibling-outline'), radius('pseudo-outline')], [[4], [6]], 'the outline drawn by a sibling fieldset and by ::before gives the radius');
    assert.equal(total(inputs('select-custom'), 'select|36|'), 2, JSON.stringify(inputs('select-custom')));
    assert.equal(total(measured['select-custom'].study.fields, 'select|'), 2, JSON.stringify(measured['select-custom'].study.fields));
    assert.equal(total(inputs('textarea'), 'textarea|96|'), 1, JSON.stringify(inputs('textarea')));
    assert.equal(Object.hasOwn(measured.textarea.design.controlHeights, '96'), false, 'a text area is not a control height');
    const ghost = measured.ghost.study.buttons;
    assert.ok(ghost['text|36|0|14'] && ghost['filled|36|6|14'], `ghost: a text button and a filled one ${JSON.stringify(ghost)}`);
    assert.deepEqual(measured['icon-only'].study.buttons, {}, 'icon-only buttons are not listed');
    assert.deepEqual(measured['inline-button'].study.pairs, [], 'the inner button of a field is text emphasis: no pair');
    assert.deepEqual(measured.wrapped.study.pairs.map(p => ({ field: p.field, button: p.button })), [{ field: 32, button: 32 }]);

    // 3. The settings page of the reference fixtures, at both widths.
    for (const size of SIZES) {
      const { design } = await measure('settings', size);
      assert.deepEqual(design.controlHeights, { 36: 12 }, `settings @${size.width}: ${JSON.stringify(design.controlHeights)}`);
      assert.deepEqual(design.controlHeightsByKind, { field: { 36: 6 }, button: { 36: 6 } }, `settings @${size.width}: ${JSON.stringify(design.controlHeightsByKind)}`);
    }
    console.log('control box named cases: date range and card fields are one control; cover radius 4 and 6; settings page 36');
  } finally { await browser.close(); }

  // 4. The gate, through the CLI.
  writeFileSync(join(pages, 'list.html'), gatePage(''));
  writeFileSync(join(pages, 'detail.html'), gatePage(''));
  writeFileSync(join(pages, 'billing.html'), gatePage('<div class="row"><button class="btn big">Export ledger</button></div>'));
  const decisions = join(dir, 'decisions.json');
  writeFileSync(decisions, JSON.stringify([{ id: 'D-001', kind: 'decision', axis: 'controlHeights', values: [32], statement: 'Controls are 32px.', approvedBy: 'fixture-reviewer', date: '2026-11-13' }]));
  const gate = names => {
    const out = join(dir, `gate-${names.length}`);
    const result = spawnSync(process.execPath, [cli, ...names.map(url), '--out', out, '--browser', browserModule, '--decisions', decisions, '--gate'], { encoding: 'utf8' });
    const md = readFileSync(join(out, 'DRIFT.md'), 'utf8');
    noFixtureText(md + readFileSync(join(out, 'drift.json'), 'utf8'), 'the drift report');
    return { result, md };
  };
  const pass = gate(['list', 'detail']);
  assert.equal(pass.result.status, 0, pass.result.stderr || pass.result.stdout);
  assert.ok(pass.md.split('\n').includes('| control heights | 32 (decided D-001) | 32 | 32 |'), pass.md);
  const fail = gate(['list', 'detail', 'billing']);
  assert.equal(fail.result.status, 3, fail.result.stderr || fail.result.stdout);
  assert.equal(fail.result.stderr.trim(), 'drift gate: FAIL — decision violations: D-001 on billing (controlHeights 40)');
  console.log('control box gate: 32px screens pass a 32px decision (exit 0); a 40px button violates it (exit 3)');
  console.log('control box browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
