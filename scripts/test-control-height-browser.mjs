#!/usr/bin/env node
// Browser fixture for WO-17 Part A: every shipped control height is written relative to one variable,
// --ss-control-height (40px in the :root block of engine/css/recipes.css), with no pixel changed.
// The shipped class strings are read from the component sources, compiled with the repository's Tailwind
// (@tailwindcss/node, resolved from demo-pricing/node_modules the way scripts/test-design-pilot-library.mjs
// reuses that folder), and rendered as static pages in a temporary folder, opened from file: URLs. Nothing
// is loaded from the network. Every page includes Tailwind's preflight (border-box), so a bordered control
// reads its class height. One element per row of WO-17 A2:
// 1. No attribute: every control is the px it draws today.
// 2. <html style="--ss-control-height: 36px">: every control is 4px shorter; the icon button is 36 × 36.
// 3. recipes.css not loaded at all: every control is today's px (the literal fallback in each class).
// 4. data-styleseed-recipe="enterprise-workbench" on <html>: a button rendered as a direct child of body
//    (where dialogs, sheets, popovers, and select menus land) takes the recipe's control radius, not :root's.
// A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// --- the shipped class strings, read from the sources ------------------------------------------------------

const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
const buttonClass = size => `${button.base} ${button.variants.variant.default} ${button.variants.size[size]}`;
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

const icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>';
// id, the px it draws today (WO-17 A2), whether it is square (size-[…]) or carries a min-width, and its markup.
const ROWS = [
  { id: 'button-xs', today: 32, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('xs')}">Export</button>` },
  { id: 'button-sm', today: 36, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('sm')}">Export list</button>` },
  { id: 'button-md', today: 40, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('md')}">Save changes</button>` },
  { id: 'button-lg', today: 52, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('lg')}">Place order</button>` },
  { id: 'button-icon', today: 40, square: true, html: c => `<button data-row="${c}" data-slot="button" aria-label="Close" class="${buttonClass('icon')}">${icon}</button>` },
  { id: 'input', today: 36, html: c => `<input data-row="${c}" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">` },
  ...['default', 'sm'].map((size, i) => ({ id: `select-${size}`, today: [36, 32][i], html: c => `<button data-row="${c}" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="${size}" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>` })),
  ...[['default', 'md', 36], ['sm', 'sm', 28]].map(([name, size, today]) => ({ id: `segmented-${name}`, today, html: c => `<div data-slot="segmented-control" class="${segRoot} ${segPadding[size]}"><button data-row="${c}" class="${segButton} ${segHeight[size]} ${segOn}">Week</button><button data-row="${c}" class="${segButton} ${segHeight[size]} ${segOff}">Month</button></div>` })),
  ...[['default', 36], ['sm', 32], ['lg', 40]].map(([size, today]) => ({ id: `toggle-${size}`, today, minWidth: true, html: c => `<button data-row="${c}" data-slot="toggle" aria-pressed="false" class="${toggleClass(size)}">B</button>` })),
  { id: 'tabs-list', today: 36, html: c => `<div data-row="${c}" role="tablist" data-slot="tabs-list" class="${tabsList}"><button role="tab" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button role="tab" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>` },
  { id: 'confirm-modal', today: 44, html: c => `<div class="flex w-80 gap-2"><button data-row="${c}" class="${confirm[0]}">Close</button><button data-row="${c}" class="${confirm[1]} bg-brand">Confirm</button></div>` },
  { id: 'drawer-close', today: 32, square: true, html: c => `<button data-row="${c}" aria-label="Close" class="${drawerClose}">${icon}</button>` },
  { id: 'top-bar-action', today: 40, square: true, html: c => `<button data-row="${c}" data-slot="top-bar-action" aria-label="Alerts" class="${topBarAction}">${icon}</button>` },
];
const classOf = html => [...html.matchAll(/class="([^"]*)"/gu)].map(m => m[1]).join(' ');
for (const row of ROWS) assert.match(classOf(row.html(row.id)), /--ss-control-height/u, `${row.id}: the shipped class string carries no --ss-control-height`);

// --- pages ------------------------------------------------------------------------------------------------

const controls = ROWS.map(row => `<div class="p-2">${row.html(row.id)}</div>`).join('\n');
const page = ({ html = '<html lang="en">', recipes = true, body }) => `<!doctype html>${html}<head><meta charset="utf-8"><title>control height fixture</title><link rel="stylesheet" href="tailwind.css">${recipes ? '<link rel="stylesheet" href="recipes.css">' : ''}</head><body>${body}</body></html>`;
const portalButton = `<button data-row="body-button" data-slot="button" class="${buttonClass('md')}">Confirm change</button>`;
const PAGES = {
  root: page({ body: `<main class="flex flex-wrap items-start p-4">${controls}</main>${portalButton}` }),
  'variable-36': page({ html: '<html lang="en" style="--ss-control-height: 36px">', body: `<main class="flex flex-wrap items-start p-4">${controls}</main>` }),
  'no-recipes': page({ recipes: false, body: `<main class="flex flex-wrap items-start p-4">${controls}</main>` }),
  'recipe-on-html': page({ html: '<html lang="en" data-styleseed-recipe="enterprise-workbench">', body: `<main class="p-4"><p>Berth ledger</p></main>${portalButton}` }),
};

const recipesCss = read('engine/css/recipes.css');
const radii = recipeRadii(recipesCss);
const rootRadius = radii.default?.controlRadius;
const recipeRadius = radii['enterprise-workbench']?.controlRadius;
assert.ok(Number.isFinite(rootRadius) && Number.isFinite(recipeRadius) && rootRadius !== recipeRadius, `engine/css/recipes.css: the :root (${rootRadius}) and enterprise-workbench (${recipeRadius}) control radii must differ for page 4 to show which one applies`);

const dir = mkdtempSync(join(tmpdir(), 'styleseed-control-height-'));
try {
  const tailwind = await import(pathToFileURL(fromDemo.resolve('@tailwindcss/node')).href);
  const compiler = await tailwind.compile("@import 'tailwindcss';", { base: demoRoot, onDependency() {} });
  const candidates = [...new Set(Object.values(PAGES).flatMap(html => classOf(html).split(/\s+/u)).filter(Boolean))];
  const css = compiler.build(candidates);
  assert.match(css, /box-sizing:\s*border-box/u, "Tailwind's preflight is in the compiled stylesheet");
  writeFileSync(join(dir, 'tailwind.css'), css);
  writeFileSync(join(dir, 'recipes.css'), recipesCss);
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(dir, `${name}.html`), html);

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
    const check = (name, boxes, delta) => {
      for (const row of ROWS) {
        const own = boxes.filter(box => box.row === row.id);
        assert.ok(own.length > 0, `${name}: ${row.id} not rendered`);
        const want = row.today + delta;
        for (const box of own) {
          assert.equal(box.height, want, `${name}: ${row.id} height ${box.height}, expected ${want}`);
          if (row.square) assert.equal(box.width, want, `${name}: ${row.id} width ${box.width}, expected ${want}`);
          if (row.minWidth) assert.equal(box.minWidth, `${want}px`, `${name}: ${row.id} min-width ${box.minWidth}, expected ${want}px`);
        }
        (report[row.id] ??= { today: row.today })[name] = own.length > 1 ? own.map(box => box.height).join('/') : row.square ? `${own[0].height}×${own[0].width}` : own[0].height;
      }
    };

    const root = await measure('root');
    check('root', root, 0);
    const rootButton = root.find(box => box.row === 'body-button');
    assert.ok(rootButton.inBody, 'page 1: the body button is a direct child of body');
    assert.equal(rootButton.radius, `${rootRadius}px`, `page 1: with no attribute the body button takes :root's control radius (${rootButton.radius})`);
    check('variable-36', await measure('variable-36'), -4);
    check('no-recipes', await measure('no-recipes'), 0);
    const portal = (await measure('recipe-on-html')).find(box => box.row === 'body-button');
    assert.ok(portal?.inBody, 'page 4: the button is a direct child of body');
    assert.equal(portal.radius, `${recipeRadius}px`, `page 4: data-styleseed-recipe on <html> reaches a direct child of body (radius ${portal.radius}, expected ${recipeRadius}px)`);
    assert.equal(portal.height, 40, `page 4: the recipe sets no control height in Part A (height ${portal.height})`);

    console.log('control height: row, today, no attribute, --ss-control-height: 36px, recipes.css not loaded');
    for (const [id, cells] of Object.entries(report)) console.log(`  ${id.padEnd(18)}${String(cells.today).padStart(3)}  ${String(cells.root).padStart(7)}  ${String(cells['variable-36']).padStart(7)}  ${String(cells['no-recipes']).padStart(7)}`);
    console.log(`control height: body button radius ${rootButton.radius} with no attribute, ${portal.radius} with enterprise-workbench on <html>, height ${portal.height}`);
  } finally { await browser.close(); }
  console.log('control height browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
