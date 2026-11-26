#!/usr/bin/env node
// Browser fixture for WO-20 Part B: a corner the decisions ledger records is drawn through .styleseed/system.css.
// It runs resolve-context.mjs on a scratch project without a registry (STYLESEED.md, and .styleseed/decisions.json
// recording a control corner of 5px and a field corner of 9px) and loads the file the resolver wrote, nothing of its
// own. The project's global stylesheet is assembled the way a project's is: Tailwind (@tailwindcss/node, resolved
// from demo-pricing/node_modules), and a skin's theme.css, base.css, and recipes.css copied into src/styles/, joined
// by `@import` lines that Tailwind inlines. The shipped class strings are read from the component sources as
// scripts/test-control-height-browser.mjs reads them. The pages open from file: URLs; nothing is loaded from the network.
// Stylesheets: `none` (no import), `before` (the import above recipes.css, from app/: ../.styleseed/system.css),
// `after` (below it, from src/styles/: ../../.styleseed/system.css), and the same two through `layer(project)`.
// Pages: enterprise-workbench and calm-consumer with the attribute on <html>, on <body>, and on a nested root; a page
// with no attribute; and a button and an input that are direct children of <body> beside a nested root.
// 1. `none`: every probe reads a value other than 5px and 9px (the recipe's control corner, the skin's rounded-md), so
//    each check below can fail.
// 2. `before` and `after`: buttons, tabs, and the segmented control read 5px on all four corners; the input, the select
//    trigger, and the textarea 9px; a card keeps the recipe's surface radius.
// 3. Layered: the control corner is the recipe's, because the unlayered recipe block outranks every layered
//    declaration, and the field corner is 9px, because no recipe sets --ss-field-radius (WO-20 finding 3).
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
import { recipeRadii } from './lib/evidence-pack.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const demoRoot = resolve(repoRoot, 'demo-pricing');
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(demoRoot, 'node_modules/playwright/index.mjs');
const fromDemo = createRequire(resolve(demoRoot, 'package.json'));
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const colours = themeColors();
const resolver = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs');
const SKIN = 'toss';
const CONTROL = 5;
const FIELD = 9;
const RECIPES = ['enterprise-workbench', 'calm-consumer'];

// --- the shipped class strings, read from the sources ------------------------------------------------------------

const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
const buttonClass = `${button.base} ${button.variants.variant.default} ${button.variants.size.md}`;
const input = parseSource(read('engine/components/ui/input.tsx'), colours).parts.find(part => part.slot === 'input').classes;
const textarea = parseSource(read('engine/components/ui/textarea.tsx'), colours).parts.find(part => part.slot === 'textarea').classes;
const trigger = matches('engine/components/ui/select.tsx', /"([^"]*data-\[size=default\]:[^"]*)"/gu, 1)[0][1];
// The default (md) size: the track's padding, then the segment's height.
const [segTrackMd, segHeightMd] = matches('engine/components/ui/segmented-control.tsx', /size === "sm"\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 2).map(m => m[2]);
const segRoot = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex items-center[^"]*)"/gu, 1)[0][1];
const segButton = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex-1[^"]*)"/gu, 1)[0][1];
const [segOn, segOff] = matches('engine/components/ui/segmented-control.tsx', /isActive\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 1)[0].slice(1);
const tabsList = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control bg-muted[^"]*)"/gu, 1)[0][1];
const tabsTrigger = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control data-\[state=active\][^"]*)"/gu, 1)[0][1];
const card = matches('engine/components/ui/card.tsx', /"(ss-component-surface[^"]*)"/gu, 1)[0][1];
for (const [name, classes] of Object.entries({ buttonClass, segRoot, segButton, tabsList, tabsTrigger })) assert.ok(classes.split(/\s+/u).includes('ss-pattern-control'), `${name}: the shipped class string carries ss-pattern-control`);
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
 <button data-probe="button" data-slot="button" class="${buttonClass}">Save changes</button>
 <div data-probe="tabs-list" role="tablist" data-slot="tabs-list" class="${tabsList}"><button data-probe="tab-active" role="tab" aria-selected="true" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button data-probe="tab-inactive" role="tab" aria-selected="false" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>
 <div data-probe="segmented" data-slot="segmented-control" class="${segRoot} ${segTrackMd}"><button data-probe="segment-on" class="${segButton} ${segHeightMd} ${segOn}">Week</button><button data-probe="segment-off" class="${segButton} ${segHeightMd} ${segOff}">Month</button></div>
 <input data-probe="input" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">
 <button data-probe="select" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="default" class="${trigger}"><span data-slot="select-value">Harbour east</span>${chevron}</button>
 <textarea data-probe="textarea" data-slot="textarea" aria-label="Notes" class="${textarea}">Quay notes</textarea>
 <div data-probe="card" data-slot="card" class="${card} w-48 p-4">Berth ledger</div>
</div>`;
// Beside a nested root, as scripts/test-control-height-browser.mjs builds its body button: rendered into body, where
// dialogs, sheets, popovers, and select menus land.
const bodyChildren = `<button data-probe="body-button" data-slot="button" class="${buttonClass}">Confirm change</button><input data-probe="body-input" data-slot="input" type="text" value="Quay four" aria-label="Quay" class="${input}">`;
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
const classOf = html => [...new Set([...html.matchAll(/class="([^"]*)"/gu)].flatMap(m => m[1].split(/\s+/u)).filter(Boolean))];

// --- recipe values ------------------------------------------------------------------------------------------------

const recipesCss = read('engine/css/recipes.css');
const recipes = recipeRadii(recipesCss);
for (const id of ['default', ...RECIPES]) assert.ok(Number.isFinite(recipes[id]?.controlRadius) && Number.isFinite(recipes[id]?.surfaceRadius), `engine/css/recipes.css: ${id} states a px control and surface radius`);
for (const id of ['default', ...RECIPES]) assert.notEqual(recipes[id].controlRadius, CONTROL, `engine/css/recipes.css: ${id}'s control corner is ${CONTROL}px, so the fixture could not tell the recorded one from it`);
assert.doesNotMatch(recipesCss.replace(/\/\*[\s\S]*?\*\//gu, ''), /--ss-field-radius\s*:/u, 'engine/css/recipes.css: no block sets --ss-field-radius (the layered cells rely on it)');

// --- the scratch project -------------------------------------------------------------------------------------------

const LOCK = `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: settings
- Output grammar: operations-console
- Brand recipe: enterprise-workbench
`;
const LEDGER = [
  { id: 'D-001', kind: 'decision', axis: 'controlRadius', values: [CONTROL], statement: `Buttons and the other controls that share their corner use a ${CONTROL}px corner.`, approvedBy: 'reviewer-a', date: '2026-11-26' },
  { id: 'D-002', kind: 'decision', axis: 'fieldRadius', values: [FIELD], statement: `Inputs, selects, and textareas use a ${FIELD}px corner.`, approvedBy: 'reviewer-a', date: '2026-11-26' },
];

const root = realpathSync(mkdtempSync(join(tmpdir(), 'styleseed-system-css-'))); // the real path: Tailwind reports its dependencies by it
try {
  for (const dir of ['.styleseed', 'app', 'src/styles', 'out']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'STYLESEED.md'), LOCK);
  writeFileSync(join(root, '.styleseed/decisions.json'), `${JSON.stringify(LEDGER, null, 2)}\n`);
  const resolved = spawnSync(process.execPath, [resolver, '--project-root', root, '--from-lock', 'STYLESEED.md', '--agent', 'claude'], { encoding: 'utf8' });
  assert.equal(resolved.status, 0, `resolve-context.mjs on the scratch project\n${resolved.stdout}\n${resolved.stderr}`);
  const manifest = JSON.parse(readFileSync(join(root, '.styleseed/manifest.json'), 'utf8'));
  const output = manifest.outputs.find(entry => entry.kind === 'system-css');
  assert.equal(output?.path, '.styleseed/system.css', 'the manifest lists the file the resolver wrote');
  const systemCss = join(root, output.path);
  const check = spawnSync(process.execPath, [resolver, '--project-root', root, '--from-lock', 'STYLESEED.md', '--agent', 'claude', '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, `resolve-context.mjs --check after the resolve\n${check.stderr}`);
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
  const candidates = classOf(Object.values(PAGES).map(page => doc('x', page.parts)).join('\n'));
  for (const [name, { base, imports }] of Object.entries(SHEETS)) {
    const deps = [];
    const css = (await tailwind.compile(imports.map(line => `@import ${line};`).join('\n'), { base, onDependency: path => deps.push(resolve(path)) })).build(candidates);
    assert.equal(deps.includes(resolve(systemCss)), name !== 'none', `${name}: the stylesheet ${name === 'none' ? 'does not import' : 'imports'} the file the resolver wrote (${deps.join(', ')})`);
    assert.match(css, /box-sizing:\s*border-box/u, `${name}: Tailwind's preflight is in the compiled stylesheet`);
    writeFileSync(join(root, `out/${name}.css`), css);
    for (const [page, { parts }] of Object.entries(PAGES)) writeFileSync(join(root, `out/${name}--${page.replaceAll(/[^a-z-]+/gu, '-')}.html`), doc(name, parts));
  }

  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  try {
    const engine = `${browser.browserType().name()} ${browser.version()}`;
    const measure = async (sheet, page) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      try {
        const tab = await context.newPage();
        const remote = [];
        tab.on('request', request => { if (!request.url().startsWith('file:')) remote.push(request.url()); });
        await tab.goto(pathToFileURL(join(root, `out/${sheet}--${page.replaceAll(/[^a-z-]+/gu, '-')}.html`)).href, { waitUntil: 'load' });
        const got = await tab.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-probe]')].map(el => {
          const style = getComputedStyle(el);
          return [el.dataset.probe, { corners: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius], inBody: el.parentElement === document.body }];
        })));
        assert.deepEqual(remote, [], `${sheet} / ${page}: the page asked the network`);
        return got;
      } finally { await context.close(); }
    };

    console.log(`system css: ${engine}; skin ${SKIN}; recorded control corner ${CONTROL}px (D-001), field corner ${FIELD}px (D-002), read from ${output.path} as the resolver wrote it`);
    const lines = [];
    for (const sheet of Object.keys(SHEETS)) {
      for (const [page, { recipe, body }] of Object.entries(PAGES)) {
        const got = await measure(sheet, page);
        const at = id => { assert.ok(got[id], `${sheet} / ${page}: ${id} not rendered`); return got[id].corners; };
        const [md] = at('rounded-md');
        assert.notEqual(md, `${FIELD}px`, `${sheet} / ${page}: the skin's rounded-md is ${FIELD}px, so a field check could not tell the recorded corner from it`);
        // What each probe should read: the recorded corner where the sheet draws it, else the recipe's or the skin's.
        const control = r => (sheet === 'before' || sheet === 'after') ? `${CONTROL}px` : `${recipes[r].controlRadius}px`;
        const field = sheet === 'none' ? md : `${FIELD}px`;
        const four = (id, want, why) => assert.deepEqual(at(id), [want, want, want, want], `${sheet} / ${page}: ${id} reads ${at(id).join(' ')}; expected ${want} on all four corners (${why})`);
        const why = sheet === 'none' ? 'no import' : sheet.startsWith('layer') ? 'a layered import' : `the import ${sheet} recipes.css`;
        if (sheet === 'none') {
          // The first assertion: without the file nothing reads a recorded value.
          for (const id of CONTROLS) assert.notEqual(at(id)[0], `${CONTROL}px`, `${sheet} / ${page}: ${id} already reads ${CONTROL}px without the file`);
          for (const id of FIELDS) assert.notEqual(at(id)[0], `${FIELD}px`, `${sheet} / ${page}: ${id} already reads ${FIELD}px without the file`);
        }
        for (const id of CONTROLS) four(id, control(recipe), why);
        for (const id of FIELDS) four(id, field, why);
        four('card', `${recipes[recipe].surfaceRadius}px`, "a card keeps the recipe's surface radius");
        let extra = '';
        if (body) {
          assert.ok(got['body-button'].inBody && got['body-input'].inBody, `${sheet} / ${page}: the body button and input are direct children of body`);
          if (sheet === 'none') assert.notEqual(at('body-button')[0], `${CONTROL}px`, `${sheet} / ${page}: the body button already reads ${CONTROL}px without the file`);
          four('body-button', control(body), `${why}; a direct child of body takes :root's control corner`);
          four('body-input', field, `${why}; a direct child of body`);
          extra = ` · body button ${at('body-button')[0]}, body input ${at('body-input')[0]}`;
        }
        lines.push(`  ${sheet.padEnd(13)}${page.padEnd(42)}controls ${at('button')[0].padEnd(6)}fields ${at('input')[0].padEnd(5)}card ${at('card')[0]}${extra}`);
      }
    }
    console.log(`system css: stylesheet, page, then what buttons/tabs/segmented controls, fields, and the card read (${lines.length} cells; every probe on all four corners)`);
    for (const line of lines) console.log(line);
    console.log(`system css: imported before or after recipes.css the recorded corners win wherever the attribute sits; inside a layer the control corner stays the recipe's and the field corner is ${FIELD}px, because no recipe sets --ss-field-radius`);
    console.log(`system css browser fixture passed (${engine})`);
  } finally { await browser.close(); }
} finally { rmSync(root, { recursive: true, force: true }); }
