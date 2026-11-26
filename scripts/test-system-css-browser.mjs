#!/usr/bin/env node
// Browser fixture for WO-20 Parts B and B2: the default control height and the corners the decisions ledger records
// are drawn through .styleseed/system.css. It runs resolve-context.mjs on a scratch project without a registry
// (STYLESEED.md with enterprise-workbench, and .styleseed/decisions.json recording the entry
// `propose-system.mjs --default-height 32` prints for it, with a name and a date, as D-001, a control corner of 5px as
// D-002, and a field corner of 9px as D-003) and loads the file the resolver wrote, nothing of its own. The project's
// global stylesheet is assembled the way a project's is: Tailwind (@tailwindcss/node, resolved from
// demo-pricing/node_modules), and a skin's theme.css, base.css, and recipes.css copied into src/styles/, joined by
// `@import` lines that Tailwind inlines. The shipped class strings and the rows of controls (each D + its offset) come
// from scripts/lib/control-rows.mjs, which scripts/test-control-height-browser.mjs shares. The pages open from file:
// URLs; nothing is loaded from the network.
// Stylesheets: `none` (no import), `before` (the import above recipes.css, from app/: ../.styleseed/system.css),
// `after` (below it, from src/styles/: ../../.styleseed/system.css), and the same two through `layer(project)`.
// Pages: enterprise-workbench (36) and calm-consumer (40) with the attribute on <html>, on <body>, and on a nested
// root; a page with no attribute (:root, 40); and three controls that are direct children of <body> (a default button,
// an xs button, and an input) beside a nested root.
// 1. `none`: every probe reads a corner other than 5px and 9px (the recipe's control corner, the skin's rounded-md),
//    and no control reads its 32-based size, so each check below can fail.
// 2. `before` and `after`: every control is 32px plus its offset; buttons, tabs, and the segmented control read 5px on
//    all four corners; the input, the select trigger, and the textarea 9px; a card keeps the recipe's surface radius.
// 3. Layered: every control keeps the look's height and the control corner is the recipe's, because the unlayered
//    recipe block outranks every layered declaration; the field corner is 9px, because no recipe sets
//    --ss-field-radius (WO-20 finding 3).
// 4. The product-looking page of the control-height fixture (its page 7) under both recipes: with the import, the
//    drift gate against the scratch ledger exits 0, every height it reads is in the recorded family, and the two
//    corners are listed as recorded and not checked; without it the gate exits 3. The fault checks
//    (drift-report.mjs --faults) run at 32px and at the look's own height; both outputs are printed.
// 5. A ledger whose height entry took enterprise-workbench's own default (`--default-height 36`): the file holds no
//    height, and a page under calm-consumer draws calm-consumer's heights.
// A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { parseSource, themeColors } from './build-component-contracts.mjs';
import { ROWS, buttonClass, card, input, productPage, rowsHtml, segButton, segHeight, segOff, segOn, segPadding, segRoot, tabsList, tabsTrigger, trigger } from './lib/control-rows.mjs';
import { recipeRadii } from './lib/evidence-pack.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const demoRoot = resolve(repoRoot, 'demo-pricing');
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(demoRoot, 'node_modules/playwright/index.mjs');
const fromDemo = createRequire(resolve(demoRoot, 'package.json'));
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const scripts = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows');
const resolver = resolve(scripts, 'ss-resolve/scripts/resolve-context.mjs');
const proposer = resolve(scripts, 'ss-resolve/scripts/propose-system.mjs');
const driftReport = resolve(scripts, 'ss-verify/scripts/drift-report.mjs');
const SKIN = 'toss';
const HEIGHT = 32;
const CONTROL = 5;
const FIELD = 9;
const RECIPES = ['enterprise-workbench', 'calm-consumer'];

// --- the shipped class strings ------------------------------------------------------------------------------------

const mdButton = buttonClass('md');
const textarea = parseSource(read('engine/components/ui/textarea.tsx'), themeColors()).parts.find(part => part.slot === 'textarea').classes;
for (const [name, classes] of Object.entries({ mdButton, segRoot, segButton, tabsList, tabsTrigger })) assert.ok(classes.split(/\s+/u).includes('ss-pattern-control'), `${name}: the shipped class string carries ss-pattern-control`);
for (const [name, classes] of Object.entries({ input, trigger, textarea })) {
  const list = classes.split(/\s+/u);
  assert.ok(list.includes('ss-pattern-field') && !list.includes('ss-pattern-control'), `${name}: the shipped class string carries ss-pattern-field and not ss-pattern-control`);
}

// --- probes and pages ---------------------------------------------------------------------------------------------

const CONTROLS = ['button', 'tabs-list', 'tab-active', 'tab-inactive', 'segmented', 'segment-on', 'segment-off'];
const FIELDS = ['input', 'select', 'textarea'];
const chevron = '<svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg>';
const probes = `<div class="flex flex-wrap items-start gap-3 p-4">
 <div data-probe="rounded-md" class="size-10 rounded-md border"></div>
 <button data-probe="button" data-slot="button" class="${mdButton}">Save changes</button>
 <div data-probe="tabs-list" role="tablist" data-slot="tabs-list" class="${tabsList}"><button data-probe="tab-active" role="tab" aria-selected="true" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button data-probe="tab-inactive" role="tab" aria-selected="false" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>
 <div data-probe="segmented" data-slot="segmented-control" class="${segRoot} ${segPadding.md}"><button data-probe="segment-on" class="${segButton} ${segHeight.md} ${segOn}">Week</button><button data-probe="segment-off" class="${segButton} ${segHeight.md} ${segOff}">Month</button></div>
 <input data-probe="input" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">
 <button data-probe="select" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="default" class="${trigger}"><span data-slot="select-value">Harbour east</span>${chevron}</button>
 <textarea data-probe="textarea" data-slot="textarea" aria-label="Notes" class="${textarea}">Quay notes</textarea>
 <div data-probe="card" data-slot="card" class="${card} w-48 p-4">Berth ledger</div>
</div>
<div class="flex flex-wrap items-start p-4">${rowsHtml()}</div>`;
// Beside a nested root, as scripts/test-control-height-browser.mjs builds its body button: rendered into body, where
// dialogs, sheets, popovers, and select menus land. Each with its offset from D.
const BODY_CHILDREN = { 'body-button': 0, 'body-xs': -8, 'body-input': 0 };
const bodyChildren = `<button data-probe="body-button" data-slot="button" class="${mdButton}">Confirm change</button><button data-probe="body-xs" data-slot="button" class="${buttonClass('xs')}">Undo</button><input data-probe="body-input" data-slot="input" type="text" value="Quay four" aria-label="Quay" class="${input}">`;
const attr = recipe => ` data-styleseed-recipe="${recipe}"`;
const doc = (sheet, { html = '', body = '', main = '', after = '' }) => `<!doctype html><html lang="en"${html}><head><meta charset="utf-8"><title>system css fixture</title><link rel="stylesheet" href="${sheet}.css"></head><body${body}><main${main}>${probes}</main>${after}</body></html>`;
// Each page: its attributes, and the recipe each probe sits under (`default` is the :root block).
const PAGES = {
  ...Object.fromEntries(RECIPES.flatMap(recipe => [
    [`${recipe} on <html>`, { parts: { html: attr(recipe) }, recipe }],
    [`${recipe} on <body>`, { parts: { body: attr(recipe) }, recipe }],
    [`${recipe} on a nested root`, { parts: { main: attr(recipe) }, recipe }],
  ])),
  'no attribute': { parts: {}, recipe: 'default' },
  'body children beside a nested root': { parts: { main: attr('enterprise-workbench'), after: bodyChildren }, recipe: 'enterprise-workbench', body: 'default' },
};
const fileName = (sheet, page) => `${sheet}--${page.replaceAll(/[^a-z-]+/gu, '-')}.html`;
// The product-looking page of the control-height fixture, under each recipe (the attribute on <html>).
const product = (recipe, sheet) => productPage({ htmlAttributes: attr(recipe), stylesheet: `${sheet}.css` });
const classOf = html => [...new Set([...html.matchAll(/class="([^"]*)"/gu)].flatMap(m => m[1].split(/\s+/u)).filter(Boolean))];

// --- recipe values ------------------------------------------------------------------------------------------------

const recipesCss = read('engine/css/recipes.css');
const recipes = recipeRadii(recipesCss);
for (const id of ['default', ...RECIPES]) assert.ok(Number.isFinite(recipes[id]?.controlRadius) && Number.isFinite(recipes[id]?.surfaceRadius) && Number.isFinite(recipes[id]?.controlHeight), `engine/css/recipes.css: ${id} states a px control radius, surface radius, and control height`);
for (const id of ['default', ...RECIPES]) assert.notEqual(recipes[id].controlRadius, CONTROL, `engine/css/recipes.css: ${id}'s control corner is ${CONTROL}px, so the fixture could not tell the recorded one from it`);
for (const id of ['default', ...RECIPES]) assert.notEqual(recipes[id].controlHeight, HEIGHT, `engine/css/recipes.css: ${id}'s control height is ${HEIGHT}px, so the fixture could not tell the recorded one from it`);
assert.deepEqual(RECIPES.map(id => recipes[id].controlHeight), [36, 40], 'engine/css/recipes.css: the two looks of the order, enterprise-workbench 36 and calm-consumer 40');
assert.doesNotMatch(recipesCss.replace(/\/\*[\s\S]*?\*\//gu, ''), /--ss-field-radius\s*:/u, 'engine/css/recipes.css: no block sets --ss-field-radius (the layered cells rely on it)');

// --- the scratch project -------------------------------------------------------------------------------------------

const LOCK = `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: settings
- Output grammar: operations-console
- Brand recipe: enterprise-workbench
`;
const CORNERS = [
  { id: 'D-002', kind: 'decision', axis: 'controlRadius', values: [CONTROL], statement: `Buttons and the other controls that share their corner use a ${CONTROL}px corner.`, approvedBy: 'reviewer-a', date: '2026-11-26' },
  { id: 'D-003', kind: 'decision', axis: 'fieldRadius', values: [FIELD], statement: `Inputs, selects, and textareas use a ${FIELD}px corner.`, approvedBy: 'reviewer-a', date: '2026-11-26' },
];
// The file the order gives for a height with both corners, and for the corners alone.
const HEAD = '/* Generated by ss-resolve from .styleseed/decisions.json and rewritten on every resolve; do not edit. A recorded default height or corner is set on every recipe root of the document, because a project without a registry has one look. */\n';
const RULE = ':root:root, [data-styleseed-recipe][data-styleseed-recipe] {\n';
const FILE_ALL = `${HEAD}${RULE}  --ss-control-height: ${HEIGHT}px; /* D-001 */\n  --ss-control-radius: ${CONTROL}px; /* D-002 */\n  --ss-field-radius: ${FIELD}px; /* D-003 */\n}\n`;
const FILE_CORNERS = `${HEAD}${RULE}  --ss-control-radius: ${CONTROL}px; /* D-002 */\n  --ss-field-radius: ${FIELD}px; /* D-003 */\n}\n`;

const root = realpathSync(mkdtempSync(join(tmpdir(), 'styleseed-system-css-'))); // the real path: Tailwind reports its dependencies by it
try {
  for (const dir of ['.styleseed', 'app', 'src/styles', 'out']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'STYLESEED.md'), LOCK);
  const resolveProject = (args = []) => {
    const run = spawnSync(process.execPath, [resolver, '--project-root', root, '--from-lock', 'STYLESEED.md', '--agent', 'claude', ...args], { encoding: 'utf8' });
    assert.equal(run.status, 0, `resolve-context.mjs ${args.join(' ')} on the scratch project\n${run.stdout}\n${run.stderr}`);
    return run;
  };
  // The entry the command prints, recorded under a name and a date.
  const printed = height => {
    const run = spawnSync(process.execPath, [proposer, '--project-root', '.', '--surface', 'pointer', '--default-height', String(height)], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, `propose-system.mjs --default-height ${height}\n${run.stderr}`);
    return { entry: { id: 'D-001', ...JSON.parse(run.stdout), approvedBy: 'reviewer-a', date: '2026-11-26' }, stderr: run.stderr };
  };
  const writeLedger = entries => writeFileSync(join(root, '.styleseed/decisions.json'), `${JSON.stringify(entries, null, 2)}\n`);
  resolveProject(); // the manifest the proposer reads
  const height32 = printed(HEIGHT);
  assert.equal(height32.entry.source, `default-height:${HEIGHT}; corpus:2026-11-12#button.height@form/1440`, 'the printed entry names a height taken from the corpus');
  writeLedger([height32.entry, ...CORNERS]);
  const resolved = resolveProject();
  const manifest = JSON.parse(readFileSync(join(root, '.styleseed/manifest.json'), 'utf8'));
  const output = manifest.outputs.find(entry => entry.kind === 'system-css');
  assert.equal(output?.path, '.styleseed/system.css', 'the manifest lists the file the resolver wrote');
  const systemCss = join(root, output.path);
  assert.equal(readFileSync(systemCss, 'utf8'), FILE_ALL, 'the file the resolver wrote: the height, then the two corners');
  resolveProject(['--check']);
  copyFileSync(resolve(repoRoot, `skins/${SKIN}/theme.css`), join(root, 'src/styles/theme.css'));
  copyFileSync(resolve(repoRoot, 'engine/css/base.css'), join(root, 'src/styles/base.css'));
  copyFileSync(resolve(repoRoot, 'engine/css/recipes.css'), join(root, 'src/styles/recipes.css'));

  // The project's global stylesheet, five ways. `base` is the folder the stylesheet sits in; the paths are relative to it.
  const tailwindIndex = fromDemo.resolve('tailwindcss/index.css');
  const app = join(root, 'app');
  const styles = join(root, 'src/styles');
  const SHEETS = {
    none: { base: app, imports: [`'${tailwindIndex}'`, "'../src/styles/theme.css'", "'../src/styles/base.css'", "'../src/styles/recipes.css'"] },
    before: { base: app, imports: [`'${tailwindIndex}'`, "'../src/styles/theme.css'", "'../src/styles/base.css'", "'../.styleseed/system.css'", "'../src/styles/recipes.css'"] },
    after: { base: styles, imports: [`'${tailwindIndex}'`, "'./theme.css'", "'./base.css'", "'./recipes.css'", "'../../.styleseed/system.css'"] },
    'layer-before': { base: app, imports: [`'${tailwindIndex}'`, "'../src/styles/theme.css'", "'../src/styles/base.css'", "'../.styleseed/system.css' layer(project)", "'../src/styles/recipes.css'"] },
    'layer-after': { base: styles, imports: [`'${tailwindIndex}'`, "'./theme.css'", "'./base.css'", "'./recipes.css'", "'../../.styleseed/system.css' layer(project)"] },
  };
  const tailwind = await import(pathToFileURL(fromDemo.resolve('@tailwindcss/node')).href);
  const candidates = classOf([...Object.values(PAGES).map(page => doc('x', page.parts)), ...RECIPES.map(recipe => product(recipe, 'x'))].join('\n'));
  const compileSheet = async (name, { base, imports }, imported) => {
    const deps = [];
    const css = (await tailwind.compile(imports.map(line => `@import ${line};`).join('\n'), { base, onDependency: path => deps.push(resolve(path)) })).build(candidates);
    assert.equal(deps.includes(resolve(systemCss)), imported, `${name}: the stylesheet ${imported ? 'imports' : 'does not import'} the file the resolver wrote (${deps.join(', ')})`);
    assert.match(css, /box-sizing:\s*border-box/u, `${name}: Tailwind's preflight is in the compiled stylesheet`);
    writeFileSync(join(root, `out/${name}.css`), css);
  };
  for (const [name, sheet] of Object.entries(SHEETS)) {
    await compileSheet(name, sheet, name !== 'none');
    for (const [page, { parts }] of Object.entries(PAGES)) writeFileSync(join(root, 'out', fileName(name, page)), doc(name, parts));
    for (const recipe of RECIPES) writeFileSync(join(root, 'out', fileName(name, `product ${recipe}`)), product(recipe, name));
  }

  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  const engine = `${browser.browserType().name()} ${browser.version()}`;
  try {
    const measure = async (sheet, page) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      try {
        const tab = await context.newPage();
        const remote = [];
        tab.on('request', request => { if (!request.url().startsWith('file:')) remote.push(request.url()); });
        await tab.goto(pathToFileURL(join(root, 'out', fileName(sheet, page))).href, { waitUntil: 'load' });
        const got = await tab.evaluate(() => ({
          probes: Object.fromEntries([...document.querySelectorAll('[data-probe]')].map(el => {
            const style = getComputedStyle(el);
            return [el.dataset.probe, { corners: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius], height: el.getBoundingClientRect().height, inBody: el.parentElement === document.body }];
          })),
          rows: [...document.querySelectorAll('[data-row]')].map(el => ({ row: el.dataset.row, height: el.getBoundingClientRect().height })),
        }));
        assert.deepEqual(remote, [], `${sheet} / ${page}: the page asked the network`);
        return got;
      } finally { await context.close(); }
    };

    console.log(`system css: ${engine}; skin ${SKIN}; recorded default height ${HEIGHT}px (D-001, the entry \`propose-system.mjs --default-height ${HEIGHT}\` printed), control corner ${CONTROL}px (D-002), field corner ${FIELD}px (D-003), read from ${output.path} as the resolver wrote it`);
    console.log(`system css: the command's stderr for --default-height ${HEIGHT}: ${height32.stderr.trim().split('\n').join(' | ')}`);
    console.log(`system css: the resolver's final line: ${resolved.stdout.trim().split('\n').at(-1).replace(root, '<project>')}`);
    const lines = [];
    // The heights of every row on a page: each D + its offset.
    const checkRows = (where, rows, d, imported) => {
      for (const row of ROWS) {
        const own = rows.filter(box => box.row === row.id);
        assert.ok(own.length > 0, `${where}: ${row.id} not rendered`);
        for (const box of own) {
          if (!imported) assert.notEqual(box.height, HEIGHT + row.offset, `${where}: ${row.id} already reads ${HEIGHT + row.offset}px without the file`);
          assert.equal(box.height, d + row.offset, `${where}: ${row.id} height ${box.height}, expected ${d + row.offset} (${d} + ${row.offset})`);
        }
      }
      return [...new Set(rows.map(box => box.height))].sort((a, b) => a - b);
    };
    for (const sheet of Object.keys(SHEETS)) {
      const imported = sheet === 'before' || sheet === 'after';
      for (const [page, { recipe, body }] of Object.entries(PAGES)) {
        const got = await measure(sheet, page);
        const at = id => { assert.ok(got.probes[id], `${sheet} / ${page}: ${id} not rendered`); return got.probes[id].corners; };
        const [md] = at('rounded-md');
        assert.notEqual(md, `${FIELD}px`, `${sheet} / ${page}: the skin's rounded-md is ${FIELD}px, so a field check could not tell the recorded corner from it`);
        // What each probe should read: the recorded value where the sheet draws it, else the recipe's or the skin's.
        const control = r => imported ? `${CONTROL}px` : `${recipes[r].controlRadius}px`;
        const height = r => imported ? HEIGHT : recipes[r].controlHeight;
        const field = sheet === 'none' ? md : `${FIELD}px`;
        const four = (id, want, why) => assert.deepEqual(at(id), [want, want, want, want], `${sheet} / ${page}: ${id} reads ${at(id).join(' ')}; expected ${want} on all four corners (${why})`);
        const why = sheet === 'none' ? 'no import' : sheet.startsWith('layer') ? 'a layered import' : `the import ${sheet} recipes.css`;
        if (sheet === 'none') {
          // The first assertion: without the file nothing reads a recorded value.
          for (const id of CONTROLS) assert.notEqual(at(id)[0], `${CONTROL}px`, `${sheet} / ${page}: ${id} already reads ${CONTROL}px without the file`);
          for (const id of FIELDS) assert.notEqual(at(id)[0], `${FIELD}px`, `${sheet} / ${page}: ${id} already reads ${FIELD}px without the file`);
        }
        const sizes = checkRows(`${sheet} / ${page}`, got.rows, height(recipe), imported);
        for (const id of CONTROLS) four(id, control(recipe), why);
        for (const id of FIELDS) four(id, field, why);
        four('card', `${recipes[recipe].surfaceRadius}px`, "a card keeps the recipe's surface radius");
        let extra = '';
        if (body) {
          for (const [id, offset] of Object.entries(BODY_CHILDREN)) {
            const probe = got.probes[id];
            assert.ok(probe?.inBody, `${sheet} / ${page}: ${id} is a direct child of body`);
            if (!imported) assert.notEqual(probe.height, HEIGHT + offset, `${sheet} / ${page}: ${id} already reads ${HEIGHT + offset}px without the file`);
            assert.equal(probe.height, height(body) + offset, `${sheet} / ${page}: ${id} height ${probe.height}, expected ${height(body) + offset} (${why}; a direct child of body takes :root's control height)`);
          }
          if (sheet === 'none') assert.notEqual(at('body-button')[0], `${CONTROL}px`, `${sheet} / ${page}: the body button already reads ${CONTROL}px without the file`);
          four('body-button', control(body), `${why}; a direct child of body takes :root's control corner`);
          four('body-xs', control(body), `${why}; a direct child of body takes :root's control corner`);
          four('body-input', field, `${why}; a direct child of body`);
          extra = ` · in body: heights ${Object.keys(BODY_CHILDREN).map(id => got.probes[id].height).join(', ')}, button corner ${at('body-button')[0]}, input corner ${at('body-input')[0]}`;
        }
        lines.push(`  ${sheet.padEnd(13)}${page.padEnd(38)}default ${String(got.rows.find(box => box.row === 'button-md').height).padEnd(4)}sizes ${sizes.join(',').padEnd(19)}corner ${at('button')[0].padEnd(6)}field ${at('input')[0].padEnd(5)}card ${at('card')[0]}${extra}`);
      }
    }
    console.log(`system css: stylesheet, page, then the default button's height, every control height on the page, what buttons/tabs/segmented controls and fields read on all four corners, and the card (${lines.length} cells; every row of controls is checked as D + its offset)`);
    for (const line of lines) console.log(line);
    console.log(`system css: imported before or after recipes.css the recorded height and corners win wherever the attribute sits; inside a layer every control keeps the look's height and control corner and the field corner is ${FIELD}px, because no recipe sets --ss-field-radius`);
  } finally { await browser.close(); }

  // The product-looking page: the drift gate against the scratch ledger, and the fault checks, at 32px (the import
  // before or after recipes.css) and at the look's own height (no import).
  const ledgerPath = join(root, '.styleseed/decisions.json');
  const family = height32.entry.values;
  console.log(`system css: drift report and fault checks on the product-looking page, against D-001 (${family.join(', ')}px), D-002, and D-003`);
  for (const recipe of RECIPES) {
    for (const sheet of ['none', 'before', 'after']) {
      const out = join(root, `out/drift-${recipe}-${sheet}`);
      const url = pathToFileURL(join(root, 'out', fileName(sheet, `product ${recipe}`))).href;
      const run = spawnSync(process.execPath, [driftReport, url, '--out', out, '--browser', browserModule, '--decisions', ledgerPath, '--gate', '--faults'], { encoding: 'utf8' });
      const drift = JSON.parse(readFileSync(join(out, 'drift.json'), 'utf8'));
      const faults = JSON.parse(readFileSync(join(out, 'faults.json'), 'utf8'));
      const screen = drift.axes.controlHeights.screens[0];
      const heights = [...(Array.isArray(screen.value) ? screen.value : [screen.value])].sort((x, y) => x - y);
      const where = `product page, ${recipe}, ${sheet === 'none' ? 'no import' : `import ${sheet} recipes.css`}`;
      const look = sheet === 'none' ? `the look's own ${recipes[recipe].controlHeight}px` : `${HEIGHT}px`;
      console.log(`  ${where.padEnd(56)}heights ${heights.join(', ').padEnd(24)}exit ${run.status}  · render faults at ${look}: ${faults.verdict}`);
      assert.equal(typeof faults.verdict, 'string', `${where}: the fault checks ran`);
      assert.deepEqual(drift.decisions.notChecked, [{ id: 'D-002', axis: 'controlRadius' }, { id: 'D-003', axis: 'fieldRadius' }], `${where}: the two corners are recorded and not checked`);
      if (sheet === 'none') {
        // Without the file the look's heights are read, the family does not hold them, and the gate fails.
        assert.ok(heights.some(value => !family.includes(value)), `${where}: without the file a height outside the recorded family is read (${heights.join(', ')})`);
        assert.ok(drift.decisions.violations.some(v => v.id === 'D-001'), `${where}: D-001 is violated without the file`);
        assert.equal(run.status, 3, `${where}: drift-report.mjs --gate exits 3 without the file (exit ${run.status})`);
      } else {
        // The probe reads no button under 24px (WO-20 M16), so the 20px segment of the family is not among them.
        assert.deepEqual(heights, family.filter(value => value >= 24), `${where}: the heights read are the recorded family from 24px (read ${heights.join(', ')}; extra ${JSON.stringify(screen.extra)})`);
        assert.deepEqual(drift.decisions.applied, ['D-001'], `${where}: D-001 is applied`);
        assert.deepEqual(drift.decisions.violations, [], `${where}: no violation`);
        assert.equal(run.status, 0, `${where}: drift-report.mjs --gate exits 0 (exit ${run.status})\n${run.stdout}\n${run.stderr}`);
      }
    }
  }

  // A height entry that took the look's own default: the file holds no height, and another look draws its own heights.
  const lookDefault = printed(recipes['enterprise-workbench'].controlHeight);
  assert.equal(lookDefault.entry.source, 'default-height:36; engine-default:recipe.enterprise-workbench (not measured)', "the printed entry took the look's own default");
  assert.ok(!lookDefault.stderr.includes('system.css'), 'the command says nothing about drawing it');
  writeLedger([lookDefault.entry, ...CORNERS]);
  resolveProject();
  assert.equal(readFileSync(systemCss, 'utf8'), FILE_CORNERS, "the look's own default: the corners alone");
  await compileSheet('look-before', SHEETS.before, true);
  const lookPages = { 'calm-consumer on <html>': PAGES['calm-consumer on <html>'], 'enterprise-workbench on <html>': PAGES['enterprise-workbench on <html>'] };
  for (const [page, { parts }] of Object.entries(lookPages)) writeFileSync(join(root, 'out', fileName('look-before', page)), doc('look-before', parts));
  const again = await chromium.launch({ headless: true });
  try {
    for (const [page, { recipe }] of Object.entries(lookPages)) {
      const context = await again.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      try {
        const tab = await context.newPage();
        await tab.goto(pathToFileURL(join(root, 'out', fileName('look-before', page))).href, { waitUntil: 'load' });
        const rows = await tab.evaluate(() => [...document.querySelectorAll('[data-row]')].map(el => ({ row: el.dataset.row, height: el.getBoundingClientRect().height })));
        const corner = await tab.evaluate(() => getComputedStyle(document.querySelector('[data-probe="button"]')).borderTopLeftRadius);
        const d = recipes[recipe].controlHeight;
        for (const row of ROWS) for (const box of rows.filter(entry => entry.row === row.id)) assert.equal(box.height, d + row.offset, `look's own default, ${page}: ${row.id} height ${box.height}, expected ${d + row.offset} (the look's ${d} + ${row.offset})`);
        assert.equal(corner, `${CONTROL}px`, `look's own default, ${page}: the recorded control corner is still drawn`);
        console.log(`system css: D-001 took enterprise-workbench's own default (36px); the file sets no height; ${page} draws ${d}px plus each offset, control corner ${corner}`);
      } finally { await context.close(); }
    }
  } finally { await again.close(); }
  console.log(`system css browser fixture passed (${engine})`);
} finally { rmSync(root, { recursive: true, force: true }); }
