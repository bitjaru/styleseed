#!/usr/bin/env node
// Browser fixture for WO-18 C1: a field can take its own corner, and no pixel changes until a project asks.
// The input, the select trigger, and the textarea carry `ss-pattern-field` beside their `rounded-md`, and
// engine/css/recipes.css gives the class `:where(.ss-pattern-field) { border-radius: var(--ss-field-radius,
// revert-layer); }`. No recipe sets the variable. The shipped class strings are read from the component sources,
// merged the way `cn` merges them (tailwind-merge over clsx, from demo-pricing/node_modules), compiled with the
// repository's Tailwind the way scripts/test-control-height-browser.mjs compiles, and opened from file: URLs.
// Nothing is loaded from the network. Two stylesheet orders, each closed by a project's own rule
// `section input { border-radius: 5px; }`:
//   - the engine's: one page per skin, tailwindcss + the skin's theme.css + base.css + recipes.css;
//   - the demo's: one page, every skin under a [data-skin] wrapper, tailwindcss + the generated skins.css +
//     recipes.css + the rest of demo-pricing/app/globals.css (the order app/globals.css imports them in).
// In each skin of each order:
// 1. Unset: every field has, on all four corners, the radius of a probe in the same page that carries only
//    `rounded-md` (no pinned number), and the same whole computed style as the same element without
//    `ss-pattern-field`: at rest, invalid, disabled, with a placeholder, focused, and in both trigger sizes.
// 2. Set on a wrapper under data-styleseed-recipe="calm-consumer": 5px (a value no skin gives) reaches the three
//    fields while the button stays a pill; 0px gives 0; an inner `initial` gives the probe's value back. The
//    contracts' sentences too: a caller's rounded-lg no longer moves the corner, `[--ss-field-radius:…]` on the
//    element does, and a value that is not a length gives a square field.
// 3. Unset: an Input with a caller's `ss-pattern-control` reads the recipe's control radius (enterprise-workbench,
//    as scripts/test-design-pilot-library.mjs asserts); an input under the project rule reads 5px; an Input given
//    `rounded-lg` reads that utility's value.
// STYLESEED_BROWSER_MODULE picks the browser module (default: the demo's Playwright, Chromium).
// A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
const FIELD = 'ss-pattern-field';

// --- the rule and the recipes --------------------------------------------------------------------------------

const recipesCss = read('engine/css/recipes.css');
const uncommented = recipesCss.replace(/\/\*[\s\S]*?\*\//gu, '');
assert.match(uncommented, /:where\(\.ss-pattern-field\)\s*\{\s*border-radius:\s*var\(--ss-field-radius,\s*revert-layer\);\s*\}/u, 'engine/css/recipes.css: the rule :where(.ss-pattern-field) { border-radius: var(--ss-field-radius, revert-layer); }');
assert.doesNotMatch(uncommented, /--ss-field-radius\s*:/u, 'engine/css/recipes.css: no block sets --ss-field-radius; a project sets it');
const recipes = recipeRadii(recipesCss);
const pill = recipes['calm-consumer']?.controlRadius;
const control = recipes['enterprise-workbench']?.controlRadius;
assert.ok(Number.isFinite(pill) && Number.isFinite(control), 'engine/css/recipes.css: calm-consumer and enterprise-workbench state a px control radius');

// --- the shipped class strings, read from the sources ----------------------------------------------------------

const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const input = parseSource(read('engine/components/ui/input.tsx'), colours).parts.find(part => part.slot === 'input').classes;
const textarea = parseSource(read('engine/components/ui/textarea.tsx'), colours).parts.find(part => part.slot === 'textarea').classes;
const trigger = matches('engine/components/ui/select.tsx', /"([^"]*data-\[size=default\]:[^"]*)"/gu, 1)[0][1];
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
const buttonClass = `${button.base} ${button.variants.variant.default} ${button.variants.size.md}`;
for (const [name, classes] of Object.entries({ input, trigger, textarea })) {
  const list = classes.split(/\s+/u);
  assert.ok(list.includes('rounded-md') && list.includes(FIELD), `${name}: the shipped class string carries rounded-md and ${FIELD}`);
}
const { twMerge } = fromDemo('tailwind-merge');
const { clsx } = fromDemo('clsx');
const cn = (...inputs) => twMerge(clsx(inputs)); // engine/components/ui/utils.ts
const without = classes => classes.split(/\s+/u).filter(name => name !== FIELD).join(' ');
for (const [extra, kept, gone] of [['', ['rounded-md', FIELD], []], ['rounded-lg', ['rounded-lg', FIELD], ['rounded-md']], ['[--ss-field-radius:9px]', ['rounded-md', FIELD, '[--ss-field-radius:9px]'], []]]) {
  const list = cn(input, extra).split(' ');
  for (const name of kept) assert.ok(list.includes(name), `tailwind-merge over the input's classes${extra ? ` and ${extra}` : ''} keeps ${name}`);
  for (const name of gone) assert.ok(!list.includes(name), `tailwind-merge over the input's classes and ${extra} drops ${name}`);
}

// --- markup ------------------------------------------------------------------------------------------------------

const chevron = '<svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg>';
const inputHtml = (probe, classes, attrs = '') => `<input data-probe="${probe}" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${classes}"${attrs}>`;
const triggerHtml = size => (probe, classes, attrs = '') => `<button data-probe="${probe}" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="${size}" class="${classes}"${attrs}><span data-slot="select-value">Harbour east</span>${chevron}</button>`;
const textareaHtml = (probe, classes, attrs = '') => `<textarea data-probe="${probe}" data-slot="textarea" aria-label="Notes" class="${classes}"${attrs}>Quay notes</textarea>`;
const KINDS = [['input', inputHtml, input], ['trigger', triggerHtml('default'), trigger], ['trigger-sm', triggerHtml('sm'), trigger], ['textarea', textareaHtml, textarea]];
const STATES = [['rest', ''], ['invalid', ' aria-invalid="true"'], ['disabled', ' disabled'], ['placeholder', ' data-placeholder=""']];
const TEXT_FIELDS = new Set(['input', 'textarea']); // a focused text field matches :focus-visible however it was focused
const cell = html => `<div class="w-80 p-2">${html}</div>`;
const fields = (prefix, extra = '') => KINDS.map(([kind, make, classes]) => cell(make(`${prefix}|${kind}`, cn(classes, extra)))).join('');
const section = p => `
<div class="flex gap-2 p-2"><div data-probe="${p}|probe|rounded-md" class="size-10 rounded-md border"></div><div data-probe="${p}|probe|rounded-lg" class="size-10 rounded-lg border"></div></div>
${KINDS.flatMap(([kind, make, classes]) => STATES.map(([state, attrs]) => `<div class="flex">${cell(make(`${p}|pair|${kind}|${state}|plain`, cn(without(classes)), attrs))}${cell(make(`${p}|pair|${kind}|${state}|shipped`, cn(classes), attrs))}</div>`)).join('\n')}
<div data-styleseed-recipe="calm-consumer">
 <div class="flex flex-wrap" style="--ss-field-radius: 5px">${fields(`${p}|set-5px`)}${cell(`<button data-probe="${p}|set-5px|button" data-slot="button" class="${buttonClass}">Save</button>`)}${cell(inputHtml(`${p}|set-5px-caller-rounded-lg|input`, cn(input, 'rounded-lg')))}${cell(inputHtml(`${p}|set-5px-own-9px|input`, cn(input, '[--ss-field-radius:9px]')))}
  <div class="flex flex-wrap" style="--ss-field-radius: initial">${fields(`${p}|initial`)}</div>
 </div>
 <div class="flex flex-wrap" style="--ss-field-radius: 0px">${fields(`${p}|set-0px`)}</div>
 <div class="flex flex-wrap" style="--ss-field-radius: berth">${cell(inputHtml(`${p}|not-a-length|input`, cn(input)))}</div>
</div>
<div data-styleseed-recipe="enterprise-workbench">${cell(inputHtml(`${p}|caller-control|input`, cn(input, 'ss-pattern-control')))}</div>
<section>${cell(inputHtml(`${p}|project-rule|input`, cn(input)))}</section>
${cell(inputHtml(`${p}|caller-rounded-lg|input`, cn(input, 'rounded-lg')))}`;

// --- stylesheets ---------------------------------------------------------------------------------------------------

const PROJECT_RULE = 'section input { border-radius: 5px; }';
const skins = readdirSync(resolve(repoRoot, 'skins'), { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith('_')).map(entry => entry.name).sort();
assert.ok(skins.length > 0, 'skins/: no skin found');
const base = read('engine/css/base.css');
const globals = read('demo-pricing/app/globals.css');
assert.deepEqual(globals.split('\n').filter(line => line.startsWith('@import')), ['@import "tailwindcss";', '@import "./skins.css";', '@import "../.engine/css/recipes.css";'], 'demo-pricing/app/globals.css: the demo order this fixture rebuilds (tailwindcss, skins.css, recipes.css, then its own rules)');
const globalsRest = globals.split('\n').filter(line => !/^@(?:import|source)\b/u.test(line)).join('\n');
const classOf = html => [...new Set([...html.matchAll(/class="([^"]*)"/gu)].flatMap(m => m[1].split(/\s+/u)).filter(Boolean))];
const doc = (name, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>field radius fixture</title><link rel="stylesheet" href="${name}.css"></head><body><main class="p-4">${body}</main></body></html>`;
const PAGES = [
  ...skins.map(skin => ({ name: `engine-${skin}`, sections: [skin], css: `@import 'tailwindcss';\n${read(`skins/${skin}/theme.css`)}\n${base}\n${recipesCss}\n${PROJECT_RULE}\n`, body: section(skin) })),
  { name: 'demo', sections: skins, css: `@import 'tailwindcss';\n${read('demo-pricing/app/skins.css')}\n${recipesCss}\n${globalsRest}\n${PROJECT_RULE}\n`, body: skins.map(skin => `<div data-skin="${skin}">${section(skin)}</div>`).join('\n') },
];

// --- checks ------------------------------------------------------------------------------------------------------

const check = (page, prefix, got) => {
  const at = id => { const entry = got.boxes[`${prefix}|${id}`]; assert.ok(entry, `${page}: ${prefix}|${id} not rendered`); return entry; };
  const four = (id, want, why) => { const { corners } = at(id); assert.deepEqual(corners, [want, want, want, want], `${page}: ${prefix}|${id} reads ${corners.join(' ')}; expected ${want} on all four corners (${why})`); };
  const [md, lg] = ['rounded-md', 'rounded-lg'].map(name => { const { corners } = at(`probe|${name}`); assert.equal(new Set(corners).size, 1, `${page}: ${prefix} probe ${name} has one radius`); return corners[0]; });
  // Each check below can fail: the value it expects is not the skin's rounded-md.
  for (const value of ['5px', '0px', '9px', `${control}px`, lg]) assert.notEqual(value, md, `${page}: ${prefix}: the skin's rounded-md is ${md}, so a check expecting ${value} could not tell the two apart`);
  for (const [kind] of KINDS) {
    for (const [state] of STATES) four(`pair|${kind}|${state}|shipped`, md, "unset: the skin's rounded-md");
    four(`set-5px|${kind}`, '5px', 'a wrapper sets --ss-field-radius: 5px');
    four(`set-0px|${kind}`, '0px', 'a wrapper sets --ss-field-radius: 0px');
    four(`initial|${kind}`, md, "an inner --ss-field-radius: initial gives the skin's rounded-md back");
  }
  const save = at('set-5px|button');
  four('set-5px|button', `${pill}px`, "the button keeps calm-consumer's control radius");
  assert.ok(pill >= save.height / 2, `${page}: ${prefix}: the button is a pill (radius ${pill}px, height ${save.height}px)`);
  four('set-5px-caller-rounded-lg|input', '5px', "once the variable is set, a caller's rounded-lg no longer moves the corner");
  four('set-5px-own-9px|input', '9px', '[--ss-field-radius:9px] on the element moves it');
  four('not-a-length|input', '0px', 'a value that is not a length gives a square field');
  four('caller-control|input', `${control}px`, "a caller's ss-pattern-control keeps enterprise-workbench's control radius");
  four('project-rule|input', '5px', "a project's own rule section input { border-radius: 5px } keeps its 5px");
  four('caller-rounded-lg|input', lg, "an Input given rounded-lg reads that utility's value");
  const pairs = got.pairs.filter(pair => pair.id.startsWith(`${prefix}|`));
  assert.equal(pairs.length, KINDS.length * (STATES.length + 1), `${page}: ${prefix}: every pair was compared`);
  for (const pair of pairs) {
    assert.deepEqual(pair.diff, [], `${page}: ${pair.id}: the field with ${FIELD} differs from the same field without it`);
    if (pair.focused !== undefined) {
      assert.ok(pair.focused, `${page}: ${pair.id}: both fields of the pair took focus`);
      if (TEXT_FIELDS.has(pair.id.split('|')[2])) assert.ok(pair.visible, `${page}: ${pair.id}: the focused text field matches :focus-visible, so its focus ring is in the compared style`);
    }
  }
  return { pairs: pairs.length, md, lg, button: save.corners[0] };
};

const dir = mkdtempSync(join(tmpdir(), 'styleseed-field-radius-'));
try {
  const tailwind = await import(pathToFileURL(fromDemo.resolve('@tailwindcss/node')).href);
  for (const page of PAGES) {
    const html = doc(page.name, page.body);
    const css = (await tailwind.compile(page.css, { base: demoRoot, onDependency() {} })).build(classOf(html));
    assert.match(css, /:where\(\.ss-pattern-field\)/u, `${page.name}: the compiled stylesheet keeps the rule`);
    writeFileSync(join(dir, `${page.name}.css`), css);
    writeFileSync(join(dir, `${page.name}.html`), html);
  }

  const { chromium } = await loadBrowser(browserModule);
  const browser = await chromium.launch({ headless: true });
  try {
    const engine = `${browser.browserType().name()} ${browser.version()}`;
    console.log(`field radius: ${engine}; ${skins.length} skins (${skins.join(', ')}) in the engine's stylesheet order and the demo's`);
    for (const page of PAGES) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      try {
        const tab = await context.newPage();
        const remote = [];
        tab.on('request', request => { if (!request.url().startsWith('file:')) remote.push(request.url()); });
        await tab.goto(pathToFileURL(join(dir, `${page.name}.html`)).href, { waitUntil: 'load' });
        const got = await tab.evaluate(() => {
          const whole = el => { const style = getComputedStyle(el); const out = {}; for (let i = 0; i < style.length; i += 1) out[style[i]] = style.getPropertyValue(style[i]); return out; };
          const differ = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => a[key] !== b[key]).map(key => `${key}: ${a[key]} → ${b[key]}`);
          const settle = () => { for (const animation of document.getAnimations()) animation.finish(); };
          const byId = Object.fromEntries([...document.querySelectorAll('[data-probe]')].map(el => [el.dataset.probe, el]));
          const boxes = Object.fromEntries(Object.entries(byId).map(([id, el]) => { const style = getComputedStyle(el); return [id, { corners: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius], height: el.getBoundingClientRect().height }]; }));
          const plainIds = Object.keys(byId).filter(id => id.includes('|pair|') && id.endsWith('|plain'));
          const pairs = plainIds.map(id => ({ id: id.replace(/\|plain$/u, ''), diff: differ(whole(byId[id]), whole(byId[id.replace(/\|plain$/u, '|shipped')])) }));
          // The rest pairs again, focused one after the other, with their transitions finished.
          for (const id of plainIds.filter(key => key.endsWith('|rest|plain'))) {
            const plain = byId[id]; const shipped = byId[id.replace(/\|plain$/u, '|shipped')];
            plain.focus(); settle(); const a = whole(plain); const plainFocused = document.activeElement === plain; const visible = plain.matches(':focus-visible');
            shipped.focus(); settle(); const b = whole(shipped); const shippedFocused = document.activeElement === shipped && shipped.matches(':focus-visible') === visible;
            shipped.blur(); settle();
            pairs.push({ id: id.replace(/\|rest\|plain$/u, '|focused'), focused: plainFocused && shippedFocused, visible, diff: differ(a, b) });
          }
          return { boxes, pairs };
        });
        assert.deepEqual(remote, [], `${page.name}: the page asked the network`);
        const rows = page.sections.map(skin => ({ skin, ...check(page.name, skin, got) }));
        const compared = rows.reduce((sum, row) => sum + row.pairs, 0);
        console.log(`  ${page.name.padEnd(14)} ${String(compared).padStart(3)} pairs, none differ; rounded-md by skin ${rows.map(row => `${row.skin} ${row.md}`).join(', ')}`);
      } finally { await context.close(); }
    }
    console.log(`field radius: set on a wrapper under calm-consumer, 5px and 0px reach the fields and the button stays ${pill}px; initial gives rounded-md back; a caller's ss-pattern-control reads ${control}px; a project rule keeps 5px; rounded-lg reads rounded-lg`);
    console.log(`field radius browser fixture passed (${engine})`);
  } finally { await browser.close(); }
} finally { rmSync(dir, { recursive: true, force: true }); }
