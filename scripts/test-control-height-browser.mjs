#!/usr/bin/env node
// Browser fixture for WO-17: every shipped control height is written relative to one variable,
// --ss-control-height (Part A), controls that sit together share it, and each brand recipe sets it (Part B).
// The shipped class strings are read from the component sources, compiled with the repository's Tailwind
// (@tailwindcss/node, resolved from demo-pricing/node_modules the way scripts/test-design-pilot-library.mjs
// reuses that folder), and rendered as static pages in a temporary folder, opened from file: URLs. Nothing
// is loaded from the network. Every page includes Tailwind's preflight (border-box), so a bordered control
// reads its class height. One element per row of WO-17 A2 as changed by B1, plus the segmented control's
// track (the box that stands beside an input). D is the recipe's control height; each row is D + its offset.
// 1. No attribute: D = 40 (the :root value); the default button, input, select, toggle, tab list, and the
//    segmented control's track are all 40.
// 2. data-styleseed-recipe="enterprise-workbench" on <html>: D = 36. 3. "native-mobile": D = 44.
// 4. <html style="--ss-control-height: 36px">: every control is 4px shorter than on page 1.
// 5. recipes.css not loaded at all: every control is its px at D = 40 (the literal fallback in each class).
// 6. enterprise-workbench on <html>: a button rendered as a direct child of body (where dialogs, sheets,
//    popovers, and select menus land) takes the recipe's control radius and height, not :root's.
// 7. The check the first review asked for (G1): enterprise-workbench on <html>, a skin theme loaded, every
//    component of the table with the roles Radix writes, measured by drift-report.mjs --gate against a
//    ledger whose controlHeights entry is the family the proposer's engine default returns for the recipe.
//    The report must read exactly those heights and exit 0.
// A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { engineDefault, normalizeEngineDefaults } from '../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/system-proposal.mjs';
import { parseSource, themeColors } from './build-component-contracts.mjs';
import { recipeRadii } from './lib/evidence-pack.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const demoRoot = resolve(repoRoot, 'demo-pricing');
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(demoRoot, 'node_modules/playwright/index.mjs');
const fromDemo = createRequire(resolve(demoRoot, 'package.json'));
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const colours = themeColors();
const driftReport = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');

// --- the shipped class strings, read from the sources ------------------------------------------------------

const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
const buttonClass = (size, variant = 'default') => `${button.base} ${button.variants.variant[variant]} ${button.variants.size[size]}`;
const toggle = parseSource(read('engine/components/ui/toggle.tsx'), colours).cvas.toggleVariants;
const toggleClass = size => `${toggle.base} ${toggle.variants.variant.outline} ${toggle.variants.size[size]}`;
const input = parseSource(read('engine/components/ui/input.tsx'), colours).parts.find(part => part.slot === 'input').classes;
const trigger = matches('engine/components/ui/select.tsx', /"([^"]*data-\[size=default\]:[^"]*)"/gu, 1)[0][1];
const [segPadding, segHeight] = matches('engine/components/ui/segmented-control.tsx', /size === "sm"\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 2).map(m => ({ sm: m[1], md: m[2] }));
const segRoot = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex items-center[^"]*)"/gu, 1)[0][1];
const segButton = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex-1[^"]*)"/gu, 1)[0][1];
const [segOn, segOff] = matches('engine/components/ui/segmented-control.tsx', /isActive\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 1)[0].slice(1);
const tabsList = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control bg-muted[^"]*)"/gu, 1)[0][1];
const tabsTrigger = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control data-\[state=active\][^"]*)"/gu, 1)[0][1];
const confirm = matches('engine/components/ui/confirm-modal.tsx', /"(ss-pattern-control flex-1[^"]*)"/gu, 2).map(m => m[1]);
const drawerClose = matches('engine/components/ui/drawer.tsx', /<button\s+onClick=\{onClose\}\s+className="([^"]+)"/gu, 1)[0][1];
const topBarAction = matches('engine/components/patterns/top-bar.tsx', /data-slot="top-bar-action"\s+className=\{cn\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/gu, 1)[0].slice(1).join(' ');
const card = matches('engine/components/ui/card.tsx', /"(ss-component-surface[^"]*)"/gu, 1)[0][1];

const icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>';
const segmented = (c, size, track) => `<div ${track ? `data-row="${c}" ` : ''}data-slot="segmented-control" class="${segRoot} ${segPadding[size]}"><button ${track ? '' : `data-row="${c}" `}class="${segButton} ${segHeight[size]} ${segOn}">Week</button><button ${track ? '' : `data-row="${c}" `}class="${segButton} ${segHeight[size]} ${segOff}">Month</button></div>`;
// id, the offset from D (WO-17 A2 as changed by B1), whether it is one of the controls that share the default
// height, whether it is square (size-[…]) or carries a min-width, and its markup. `today` is its px at D = 40.
const ROWS = [
  { id: 'button-xs', offset: -8, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('xs')}">Export</button>` },
  { id: 'button-sm', offset: -4, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('sm')}">Export list</button>` },
  { id: 'button-md', offset: 0, shared: true, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('md')}">Save changes</button>` },
  { id: 'button-lg', offset: 12, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('lg')}">Place order</button>` },
  { id: 'button-icon', offset: 0, square: true, html: c => `<button data-row="${c}" data-slot="button" aria-label="Close" class="${buttonClass('icon')}">${icon}</button>` },
  { id: 'input', offset: 0, shared: true, html: c => `<input data-row="${c}" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">` },
  ...[['default', 0, true], ['sm', -4, false]].map(([size, offset, shared]) => ({ id: `select-${size}`, offset, shared, html: c => `<button data-row="${c}" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="${size}" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>` })),
  // The segment carries the height; the track adds its padding (p-1 default, p-0.5 sm). The default track is D.
  { id: 'segmented-default-segment', offset: -8, html: c => segmented(c, 'md', false) },
  { id: 'segmented-default-track', offset: 0, shared: true, html: c => segmented(c, 'md', true) },
  { id: 'segmented-sm-segment', offset: -12, html: c => segmented(c, 'sm', false) },
  { id: 'segmented-sm-track', offset: -8, html: c => segmented(c, 'sm', true) },
  ...[['default', 0, true], ['sm', -4, false], ['lg', 4, false]].map(([size, offset, shared]) => ({ id: `toggle-${size}`, offset, shared, minWidth: true, html: c => `<button data-row="${c}" data-slot="toggle" aria-pressed="false" class="${toggleClass(size)}">B</button>` })),
  { id: 'tabs-list', offset: 0, shared: true, html: c => `<div data-row="${c}" role="tablist" data-slot="tabs-list" class="${tabsList}"><button role="tab" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button role="tab" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>` },
  { id: 'confirm-modal', offset: 4, html: c => `<div class="flex w-80 gap-2"><button data-row="${c}" class="${confirm[0]}">Close</button><button data-row="${c}" class="${confirm[1]} bg-brand">Confirm</button></div>` },
  { id: 'drawer-close', offset: -8, square: true, html: c => `<button data-row="${c}" aria-label="Close" class="${drawerClose}">${icon}</button>` },
  { id: 'top-bar-action', offset: 0, square: true, html: c => `<button data-row="${c}" data-slot="top-bar-action" aria-label="Alerts" class="${topBarAction}">${icon}</button>` },
].map(row => ({ ...row, today: 40 + row.offset }));
const classOf = html => [...html.matchAll(/class="([^"]*)"/gu)].map(m => m[1]).join(' ');
for (const row of ROWS) assert.match(classOf(row.html(row.id)), /--ss-control-height/u, `${row.id}: the shipped class string carries no --ss-control-height`);
assert.deepEqual([...new Set(ROWS.filter(row => !row.id.endsWith('-track')).map(row => row.offset))].sort((a, b) => a - b), [-12, -8, -4, 0, 4, 12], 'the rows cover every offset of WO-17 B1');

// --- recipe values ------------------------------------------------------------------------------------------

const recipesCss = read('engine/css/recipes.css');
const recipes = recipeRadii(recipesCss);
const rootRadius = recipes.default?.controlRadius;
const recipeRadius = recipes['enterprise-workbench']?.controlRadius;
assert.ok(Number.isFinite(rootRadius) && Number.isFinite(recipeRadius) && rootRadius !== recipeRadius, `engine/css/recipes.css: the :root (${rootRadius}) and enterprise-workbench (${recipeRadius}) control radii must differ for page 6 to show which one applies`);
const HEIGHT = { root: recipes.default?.controlHeight, 'enterprise-workbench': recipes['enterprise-workbench']?.controlHeight, 'native-mobile': recipes['native-mobile']?.controlHeight };
assert.deepEqual(HEIGHT, { root: 40, 'enterprise-workbench': 36, 'native-mobile': 44 }, 'engine/css/recipes.css: the control heights of WO-17 B2');

// --- pages ------------------------------------------------------------------------------------------------

const controls = ROWS.map(row => `<div class="p-2">${row.html(row.id)}</div>`).join('\n');
const page = ({ html = '<html lang="en">', recipes: withRecipes = true, body }) => `<!doctype html>${html}<head><meta charset="utf-8"><title>control height fixture</title><link rel="stylesheet" href="tailwind.css">${withRecipes ? '<link rel="stylesheet" href="recipes.css">' : ''}</head><body>${body}</body></html>`;
const portalButton = `<button data-row="body-button" data-slot="button" class="${buttonClass('md')}">Confirm change</button>`;
const grid = `<main class="flex flex-wrap items-start p-4">${controls}</main>`;
const PAGES = {
  root: page({ body: `${grid}${portalButton}` }),
  'enterprise-workbench': page({ html: '<html lang="en" data-styleseed-recipe="enterprise-workbench">', body: grid }),
  'native-mobile': page({ html: '<html lang="en" data-styleseed-recipe="native-mobile">', body: grid }),
  'variable-36': page({ html: '<html lang="en" style="--ss-control-height: 36px">', body: grid }),
  'no-recipes': page({ recipes: false, body: grid }),
  'recipe-on-html': page({ html: '<html lang="en" data-styleseed-recipe="enterprise-workbench">', body: `<main class="p-4"><p>Berth ledger</p></main>${portalButton}` }),
};

// Page 7: a product-looking screen for the drift report. A skin theme gives buttons a visible box (the probe
// counts boxed buttons only); the roles Radix writes keep the active tab trigger from reading as a button;
// the toggles are pressed and outlined.
const selectHtml = size => `<button type="button" role="combobox" aria-expanded="false" aria-autocomplete="none" data-slot="select-trigger" data-size="${size}" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>`;
const driftBody = `<div class="p-6 flex flex-col gap-4">
 <div class="flex items-end gap-3"><input type="text" data-slot="input" class="${input}" value="Berth nine" aria-label="Berth">${selectHtml('default')}${selectHtml('sm')}</div>
 <div class="flex gap-2">${['xs', 'sm', 'md', 'lg'].map(size => `<button data-slot="button" class="${buttonClass(size)}">Save ${size}</button>`).join('')}<button data-slot="button" aria-label="Add" class="${buttonClass('icon', 'outline')}">${icon}</button></div>
 ${segmented('drift', 'md', false).replaceAll(' data-row="drift"', '')}
 ${segmented('drift', 'sm', false).replaceAll(' data-row="drift"', '')}
 <div class="flex gap-2">${['default', 'sm', 'lg'].map(size => `<button type="button" aria-pressed="true" data-state="on" data-slot="toggle" class="${toggleClass(size)}">Bold ${size}</button>`).join('')}</div>
 <div role="tablist" data-slot="tabs-list" class="${tabsList}"><button role="tab" aria-selected="true" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button role="tab" aria-selected="false" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>
 <div class="flex gap-2 w-full"><button class="${confirm[0]}">Close</button><button class="${confirm[1]} bg-brand">Delete</button></div>
 <div class="flex gap-2"><button aria-label="Close" class="${drawerClose}">${icon}</button><button data-slot="top-bar-action" aria-label="Alerts" class="${topBarAction}">${icon}</button></div>
</div>`;
const driftPage = `<!doctype html><html lang="en" data-styleseed-recipe="enterprise-workbench"><head><meta charset="utf-8"><title>Billing details</title><link rel="stylesheet" href="app.css"></head><body class="bg-surface-page"><main class="mx-auto max-w-[960px] p-8"><h1 class="text-[24px] font-bold text-text-primary">Billing details</h1><section data-slot="card" class="${card} mt-6">${driftBody}</section></main></body></html>`;
const defaults = normalizeEngineDefaults(JSON.parse(read('engine/.claude/skills/styleseed/workflows/ss-resolve/references/engine-defaults.json')));
const family = engineDefault('controlHeights', defaults, { recipe: 'enterprise-workbench', surface: 'pointer' }).values;
assert.deepEqual(family, [24, 28, 32, 36, 40, 48], "the proposer's engine default for enterprise-workbench");
const ledger = [{ id: 'D-001', kind: 'decision', axis: 'controlHeights', values: family, statement: `Controls use these heights: ${family.join(', ')}px.`, approvedBy: 'reviewer-a', date: '2026-11-18', source: 'engine-default:recipe.enterprise-workbench (not measured)' }];

const dir = mkdtempSync(join(tmpdir(), 'styleseed-control-height-'));
try {
  const tailwind = await import(pathToFileURL(fromDemo.resolve('@tailwindcss/node')).href);
  const compile = async (source, html) => (await tailwind.compile(source, { base: demoRoot, onDependency() {} })).build([...new Set(html.flatMap(text => classOf(text).split(/\s+/u)).filter(Boolean))]);
  const css = await compile("@import 'tailwindcss';", Object.values(PAGES));
  assert.match(css, /box-sizing:\s*border-box/u, "Tailwind's preflight is in the compiled stylesheet");
  writeFileSync(join(dir, 'tailwind.css'), css);
  writeFileSync(join(dir, 'recipes.css'), recipesCss);
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(dir, `${name}.html`), html);
  writeFileSync(join(dir, 'app.css'), await compile(`@import 'tailwindcss';\n${read('skins/toss/theme.css')}\n${read('engine/css/base.css')}\n${recipesCss}`, [driftPage]));
  writeFileSync(join(dir, 'drift.html'), driftPage);
  writeFileSync(join(dir, 'decisions.json'), `${JSON.stringify(ledger, null, 2)}\n`);

  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  const report = {};
  try {
    const measure = async name => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      try {
        const tab = await context.newPage();
        const remote = [];
        tab.on('request', request => { if (!request.url().startsWith('file:')) remote.push(request.url()); });
        await tab.goto(pathToFileURL(join(dir, `${name}.html`)).href, { waitUntil: 'load' });
        const boxes = await tab.evaluate(() => [...document.querySelectorAll('[data-row]')].map(el => {
          const box = el.getBoundingClientRect(); const style = getComputedStyle(el);
          return { row: el.dataset.row, height: box.height, width: box.width, minWidth: style.minWidth, radius: style.borderTopLeftRadius, inBody: el.parentElement === document.body };
        }));
        assert.deepEqual(remote, [], `${name}: the page asked the network`);
        return boxes;
      } finally { await context.close(); }
    };
    // Every row is D + its offset; the controls that sit together all equal D.
    const check = (name, boxes, d) => {
      for (const row of ROWS) {
        const own = boxes.filter(box => box.row === row.id);
        assert.ok(own.length > 0, `${name}: ${row.id} not rendered`);
        const want = d + row.offset;
        for (const box of own) {
          assert.equal(box.height, want, `${name}: ${row.id} height ${box.height}, expected ${want}`);
          if (row.shared) assert.equal(box.height, d, `${name}: ${row.id} shares the default height ${d}`);
          if (row.square) assert.equal(box.width, want, `${name}: ${row.id} width ${box.width}, expected ${want}`);
          if (row.minWidth) assert.equal(box.minWidth, `${want}px`, `${name}: ${row.id} min-width ${box.minWidth}, expected ${want}px`);
        }
        (report[row.id] ??= { offset: row.offset })[name] = { want, got: own.length > 1 ? own.map(box => box.height).join('/') : row.square ? `${own[0].height}×${own[0].width}` : own[0].height };
      }
    };

    const root = await measure('root');
    check('root', root, HEIGHT.root);
    const rootButton = root.find(box => box.row === 'body-button');
    assert.ok(rootButton.inBody, 'page 1: the body button is a direct child of body');
    assert.equal(rootButton.radius, `${rootRadius}px`, `page 1: with no attribute the body button takes :root's control radius (${rootButton.radius})`);
    check('enterprise-workbench', await measure('enterprise-workbench'), HEIGHT['enterprise-workbench']);
    check('native-mobile', await measure('native-mobile'), HEIGHT['native-mobile']);
    check('variable-36', await measure('variable-36'), 36);
    check('no-recipes', await measure('no-recipes'), 40);
    const portal = (await measure('recipe-on-html')).find(box => box.row === 'body-button');
    assert.ok(portal?.inBody, 'page 6: the button is a direct child of body');
    assert.equal(portal.radius, `${recipeRadius}px`, `page 6: data-styleseed-recipe on <html> reaches a direct child of body (radius ${portal.radius}, expected ${recipeRadius}px)`);
    assert.equal(portal.height, HEIGHT['enterprise-workbench'], `page 6: the recipe's control height reaches a direct child of body (height ${portal.height})`);

    const columns = ['root', 'enterprise-workbench', 'native-mobile', 'variable-36', 'no-recipes'];
    console.log(`control height: row, offset, then expected → measured on ${columns.join(', ')}`);
    for (const [id, cells] of Object.entries(report)) console.log(`  ${id.padEnd(26)}${String(cells.offset).padStart(4)}  ${columns.map(name => `${cells[name].want} → ${cells[name].got}`.padStart(13)).join(' ')}`);
    console.log(`control height: body button radius ${rootButton.radius} with no attribute, ${portal.radius} and height ${portal.height} with enterprise-workbench on <html>`);
  } finally { await browser.close(); }

  // Page 7: the drift report reads exactly the family the proposer offers, and its gate passes.
  const out = join(dir, 'drift-report');
  const run = spawnSync(process.execPath, [driftReport, pathToFileURL(join(dir, 'drift.html')).href, '--out', out, '--browser', browserModule, '--decisions', join(dir, 'decisions.json'), '--gate'], { encoding: 'utf8' });
  const drift = JSON.parse(readFileSync(join(out, 'drift.json'), 'utf8'));
  const screen = drift.axes.controlHeights.screens[0];
  const heights = [...(Array.isArray(screen.value) ? screen.value : [screen.value])].sort((x, y) => x - y);
  console.log(`control height: drift report on enterprise-workbench read ${heights.join(', ')}px against the ledger ${family.join(', ')}px; status ${screen.status}; exit ${run.status}`);
  assert.deepEqual(heights, family, `page 7: the heights the drift report read are exactly the family ${family.join(', ')} (read ${heights.join(', ')}; extra ${JSON.stringify(screen.extra)})`);
  assert.equal(run.status, 0, `page 7: drift-report.mjs --gate exits 0 (exit ${run.status})\n${run.stdout}\n${run.stderr}`);
  console.log('control height browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
