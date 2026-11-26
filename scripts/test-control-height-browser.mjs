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
import { ROWS, buttonClass, productPage, rowsHtml } from './lib/control-rows.mjs';
import { recipeRadii } from './lib/evidence-pack.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const demoRoot = resolve(repoRoot, 'demo-pricing');
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(demoRoot, 'node_modules/playwright/index.mjs');
const fromDemo = createRequire(resolve(demoRoot, 'package.json'));
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const driftReport = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');

// The rows (one per row of WO-17 A2 as changed by B1, plus the segmented control's track) and page 7 are read from
// the component sources by scripts/lib/control-rows.mjs, which scripts/test-system-css-browser.mjs shares.
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

const controls = rowsHtml();
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

// Page 7: a product-looking screen for the drift report (scripts/lib/control-rows.mjs productPage).
const driftPage = productPage({ htmlAttributes: ' data-styleseed-recipe="enterprise-workbench"', stylesheet: 'app.css' });
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
