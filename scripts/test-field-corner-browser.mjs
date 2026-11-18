#!/usr/bin/env node
// Browser fixture for WO-17 C1: fields take the brand recipe's corner. The input, the select trigger, and a
// lone toggle carry `ss-pattern-control` (the button's class), the textarea `ss-pattern-inset`; a toggle group
// builds its items from `toggleVariants` and keeps the corners it had (only the two ends rounded).
// Built the way scripts/test-control-height-browser.mjs builds its pages: the shipped class strings are read
// from the component sources, compiled with the repository's Tailwind (@tailwindcss/node, resolved from
// demo-pricing/node_modules), and rendered as static pages opened from file: URLs; nothing is loaded from the
// network. Each string is merged with tailwind-merge, as the component's cn() does (a group item's
// `rounded-none` replaces the variants' `rounded-md` there). One difference from that fixture: the stylesheet
// is compiled with skins/stripe/theme.css, whose `rounded-md` (4px) equals no recipe's control radius. With
// Tailwind alone `rounded-md` is 6px, the :root control radius, and with the toss skin 8px,
// commerce-operator's, so a page there could not tell a field that kept `rounded-md` from one that took the
// recipe's corner.
// Pages: no attribute, and each of the nine recipes as data-styleseed-recipe on <html>. On each:
// - the default button, input, select trigger, and lone toggle (outline, and default pressed) have one
//   computed corner radius on all four corners, the recipe's control radius;
// - the textarea has the recipe's inset radius;
// - the three items of a toggle group have the radii they have on main: the first rounded on its left, the
//   middle square, the last rounded on its right, each rounding the stylesheet's `rounded-md`.
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
const { twMerge } = fromDemo('tailwind-merge');
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const colours = themeColors();
const cn = (...parts) => twMerge(parts.join(' '));

// --- the shipped class strings, read from the sources ------------------------------------------------------

const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
const buttonClass = cn(button.base, button.variants.variant.default, button.variants.size.md);
const input = parseSource(read('engine/components/ui/input.tsx'), colours).parts.find(part => part.slot === 'input').classes;
const textarea = parseSource(read('engine/components/ui/textarea.tsx'), colours).parts.find(part => part.slot === 'textarea').classes;
const trigger = matches('engine/components/ui/select.tsx', /"([^"]*data-\[size=default\]:[^"]*)"/gu, 1)[0][1];
const toggle = parseSource(read('engine/components/ui/toggle.tsx'), colours).cvas.toggleVariants;
// The literal in Toggle's own cn(…), before the variants.
const toggleLiteral = matches('engine/components/ui/toggle.tsx', /className=\{cn\(\s*"([^"]+)",\s*toggleVariants\(\{\s*variant,\s*size,\s*className\s*\}\)\s*\)\}/gu, 1)[0][1];
const loneToggle = variant => cn(toggleLiteral, toggle.base, toggle.variants.variant[variant], toggle.variants.size.default);
// A group item: the variants, then the literal ToggleGroupItem adds after them.
const groupRoot = matches('engine/components/ui/toggle-group.tsx', /"(group\/toggle-group[^"]*)"/gu, 1)[0][1];
const groupLiteral = matches('engine/components/ui/toggle-group.tsx', /"(min-w-0 flex-1[^"]*)"/gu, 1)[0][1];
const groupItem = cn(toggle.base, toggle.variants.variant.outline, toggle.variants.size.default, groupLiteral);

// The class sits in Toggle's own cn(…), never in the variants: toggle-group.tsx builds every item from the
// variants and rounds only the two ends, so a variant that carried it would make each item a pill of its own.
const words = text => text.split(/\s+/u).filter(Boolean);
assert.ok(!words(toggle.base).includes('ss-pattern-control'), 'engine/components/ui/toggle.tsx: the base of toggleVariants must not hold ss-pattern-control (toggle-group.tsx builds its items from it); put it in Toggle\'s own cn(…)');
for (const [axis, values] of Object.entries(toggle.variants)) for (const [key, value] of Object.entries(values)) assert.ok(!words(value).includes('ss-pattern-control'), `engine/components/ui/toggle.tsx: toggleVariants ${axis}.${key} must not hold ss-pattern-control; put it in Toggle's own cn(…)`);
assert.ok(words(toggleLiteral).includes('ss-pattern-control'), 'engine/components/ui/toggle.tsx: Toggle\'s own cn(…) carries ss-pattern-control');
const groupImports = [...read('engine/components/ui/toggle-group.tsx').matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\/toggle["']/gu)].flatMap(m => m[1].split(',').map(name => name.trim().replace(/^type\s+/u, '')));
assert.ok(!groupImports.includes('Toggle'), `engine/components/ui/toggle-group.tsx imports Toggle (${groupImports.join(', ')}); its items would then take Toggle's corner, and this fixture builds them from the variants`);
for (const [id, classes, carrier] of [['input', input, 'ss-pattern-control'], ['select trigger', trigger, 'ss-pattern-control'], ['textarea', textarea, 'ss-pattern-inset'], ['button', buttonClass, 'ss-pattern-control']]) {
  assert.ok(words(classes).includes(carrier), `${id}: the shipped class string carries no ${carrier}`);
}

// --- recipe values ------------------------------------------------------------------------------------------

const recipes = recipeRadii(read('engine/css/recipes.css'));
const RECIPES = Object.keys(recipes).filter(id => id !== 'default');
assert.equal(RECIPES.length, 9, `engine/css/recipes.css: expected nine brand recipe blocks, read ${RECIPES.join(', ')}`);
for (const [id, values] of Object.entries(recipes)) assert.ok(Number.isFinite(values.controlRadius) && Number.isFinite(values.insetRadius), `engine/css/recipes.css: ${id} must declare --ss-control-radius and --ss-inset-radius in px`);

// --- pages ------------------------------------------------------------------------------------------------

const icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>';
const controls = [
  `<button data-row="button" data-slot="button" class="${buttonClass}">Save changes</button>`,
  `<input data-row="input" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">`,
  `<button data-row="select" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="default" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>`,
  `<button data-row="toggle-outline" type="button" aria-pressed="false" data-state="off" data-slot="toggle" aria-label="Bold" class="${loneToggle('outline')}">${icon}</button>`,
  `<button data-row="toggle-default" type="button" aria-pressed="true" data-state="on" data-slot="toggle" aria-label="Italic" class="${loneToggle('default')}">${icon}</button>`,
].map(html => `<div class="p-2">${html}</div>`).join('');
const group = `<div class="p-2"><div role="group" data-slot="toggle-group" data-variant="outline" data-size="default" class="${groupRoot}">${['first', 'middle', 'last'].map(position => `<button data-row="group-${position}" type="button" role="radio" aria-checked="${position === 'first'}" data-state="${position === 'first' ? 'on' : 'off'}" data-slot="toggle-group-item" data-variant="outline" data-size="default" aria-label="${position}" class="${groupItem}">${icon}</button>`).join('')}</div></div>`;
const body = `<main class="flex flex-wrap items-start p-4">${controls}<div class="p-2"><textarea data-row="textarea" data-slot="textarea" rows="3" aria-label="Note" class="${textarea}">Two lines of a note.</textarea></div>${group}<div data-row="rounded-md" class="rounded-md size-8 border"></div></main>`;
const page = recipe => `<!doctype html><html lang="en"${recipe ? ` data-styleseed-recipe="${recipe}"` : ''}><head><meta charset="utf-8"><title>field corner fixture</title><link rel="stylesheet" href="tailwind.css"><link rel="stylesheet" href="recipes.css"></head><body>${body}</body></html>`;
const PAGES = Object.fromEntries([['root', page(null)], ...RECIPES.map(id => [id, page(id)])]);
const classOf = html => [...html.matchAll(/class="([^"]*)"/gu)].map(m => m[1]).join(' ');

const dir = mkdtempSync(join(tmpdir(), 'styleseed-field-corner-'));
try {
  const tailwind = await import(pathToFileURL(fromDemo.resolve('@tailwindcss/node')).href);
  const css = await (await tailwind.compile(`@import 'tailwindcss';\n${read('skins/stripe/theme.css')}`, { base: demoRoot, onDependency() {} })).build([...new Set(words(classOf(body)))]);
  assert.match(css, /box-sizing:\s*border-box/u, "Tailwind's preflight is in the compiled stylesheet");
  writeFileSync(join(dir, 'tailwind.css'), css);
  writeFileSync(join(dir, 'recipes.css'), read('engine/css/recipes.css'));
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(dir, `${name}.html`), html);

  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const [name, recipeId] of [['root', 'default'], ...RECIPES.map(id => [id, id])]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      let boxes;
      try {
        const tab = await context.newPage();
        const remote = [];
        tab.on('request', request => { if (!request.url().startsWith('file:')) remote.push(request.url()); });
        await tab.goto(pathToFileURL(join(dir, `${name}.html`)).href, { waitUntil: 'load' });
        boxes = Object.fromEntries(await tab.evaluate(() => [...document.querySelectorAll('[data-row]')].map(el => {
          const style = getComputedStyle(el);
          return [el.dataset.row, [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]];
        })));
        assert.deepEqual(remote, [], `${name}: the page asked the network`);
      } finally { await context.close(); }
      const { controlRadius, insetRadius } = recipes[recipeId];
      const md = boxes['rounded-md'][0];
      // The premise of the stylesheet: rounded-md is the stripe skin's 4px and no recipe's control radius.
      assert.equal(md, '4px', `${name}: rounded-md with skins/stripe/theme.css is ${md}, expected 4px`);
      assert.ok(Object.values(recipes).every(values => `${values.controlRadius}px` !== md), `${name}: rounded-md (${md}) equals a recipe's control radius, so the page cannot tell the two apart`);
      const control = `${controlRadius}px`, inset = `${insetRadius}px`;
      for (const row of ['button', 'input', 'select', 'toggle-outline', 'toggle-default']) {
        assert.deepEqual(boxes[row], [control, control, control, control], `${name}: ${row} corners ${boxes[row].join(' ')}, expected the recipe's control radius ${control} on all four`);
      }
      assert.deepEqual(boxes.textarea, [inset, inset, inset, inset], `${name}: textarea corners ${boxes.textarea.join(' ')}, expected the recipe's inset radius ${inset} on all four`);
      // The group as on main: rounded-md on the outer corners of the two ends, square elsewhere.
      const GROUP = { 'group-first': [md, '0px', '0px', md], 'group-middle': ['0px', '0px', '0px', '0px'], 'group-last': ['0px', md, md, '0px'] };
      for (const [row, want] of Object.entries(GROUP)) assert.deepEqual(boxes[row], want, `${name}: ${row} corners ${boxes[row].join(' ')}, expected ${want.join(' ')} (as on main: the group rounds only its two ends)`);
      report.push({ name, control, inset, fields: boxes.input[0], textarea: boxes.textarea[0], group: ['group-first', 'group-middle', 'group-last'].map(row => `${boxes[row][0]}/${boxes[row][1]}`).join(' ') });
    }
  } finally { await browser.close(); }
  console.log('field corner: page, recipe control radius → button, input, select, lone toggles; inset radius → textarea; toggle group top-left/top-right of first, middle, last');
  for (const row of report) console.log(`  ${row.name.padEnd(22)} control ${row.control.padStart(5)} → ${row.fields.padStart(5)}   inset ${row.inset.padStart(4)} → ${row.textarea.padStart(4)}   group ${row.group}`);
  console.log('field corner browser fixture passed');
} finally { rmSync(dir, { recursive: true, force: true }); }
