#!/usr/bin/env node
// Browser fixture for WO-18 Part A: the page /systems on the built demo (scripts/lib/demo-server.mjs), at 1440×900
// and 390×844. The expected text is written here from the work order (A3) and the generated data
// (demo-pricing/content/systems.json); the page's own code is not reused.
// 1. No horizontal scroll; one card per system, in the data's order, with the lineage id as its id.
// 2. Every table cell is the text A3.3 gives for its data, and no cell's text runs past its box.
// 3. Every drawn input and button has its data's height and top-left corner (a pill reads at least half the
//    height), and its fill or its border has a contrast of at least 3:1 against what is behind it.
// 4. A part whose data is "mixed" or null is absent, and its "not drawn" line is present.
// 5. No control inside a strip or a default row can take focus, by script or by Tab.
// 6. The two self-hosted cards carry the local-build line and the other five do not; each card's label is the one
//    A3.2 gives for its kind; every example link opens in a new tab with rel="noopener noreferrer".
// 7. The two default rows carry their label; their button's height is controlHeight of that recipe in
//    engine-defaults.json.
// 8. The small print holds its four sentences; the page text holds none of the words the order forbids.
// A regression fixture for a generated page, not a design judgment.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDemoServer } from './lib/demo-server.mjs';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const readJson = path => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
const data = readJson('demo-pricing/content/systems.json');
const defaults = readJson('engine/.claude/skills/styleseed/workflows/ss-resolve/references/engine-defaults.json');

const LABELS = [['button.height', 'Button height', false], ['field.height', 'Field height', false], ['button.radius', 'Button corner', true], ['field.radius', 'Field corner', true], ['table.bodyRowHeight', 'Table row', false], ['nav.itemHeight', 'Menu item', false]];
const KIND = { 'product-system': 'Built by an organisation for its own products or services', kit: 'Published for other teams to build with' };
const DEFAULT_ROWS = [['calm-consumer', "StyleSeed's own default. Not measured."], ['native-mobile', "StyleSeed's own values for a phone-first app, when someone picks them. Not measured."]];
const SMALL_PRINT = ['Setup can take the button height and the button and field corners from one of these systems: it draws them first and asks.', 'Table rows and menu items are shown here and not taken.', 'Heights are rounded to the nearest 4px.', 'Not affiliated with or endorsed by any of the projects shown.'];
const FORBIDDEN = ['recipe', 'kit', 'well-made', 'best', 'official'];

const value = (reading, corner) => reading.value === null ? 'not measured' : reading.value === 'mixed' ? 'no single value'
  : !corner ? `about ${reading.value}px` : reading.value === 999 ? 'pill' : reading.value === 0 ? 'square' : `${reading.value}px`;
const count = reading => reading.value === null ? '' : reading.value === 'mixed' ? `${reading.eligible} screens` : `on ${reading.holding} of ${reading.eligible} screens`;
const part = (height, radius) => typeof height.value === 'number' && typeof radius.value === 'number' ? { drawn: true, height: height.value, radius: radius.value }
  : { drawn: false, why: height.value === null || radius.value === null ? 'not measured' : 'no single value' };

assert.equal(data.systems.length, 7, 'demo-pricing/content/systems.json: seven systems');

const server = await startDemoServer();
const { chromium } = await loadBrowser(browserModule);
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const at = `${width}×${height}`;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      const response = await page.goto(`${server.baseUrl}/systems`, { waitUntil: 'load' });
      assert.equal(response.status(), 200, `${at}: /systems answers 200`);
      const read = await page.evaluate(() => {
        const text = el => (el ? el.textContent.replace(/\s+/gu, ' ').trim() : null);
        const rgb = value => { const m = value.match(/rgba?\(([^)]+)\)/u); if (!m) return null; const p = m[1].split(/[,\s/]+/u).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
        const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
        // What is behind an element: every ancestor's background composed over the white canvas.
        const behind = el => { let colour = { r: 255, g: 255, b: 255, a: 1 }; const chain = []; for (let n = el.parentElement; n; n = n.parentElement) chain.unshift(n); for (const n of chain) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0) colour = over(c, colour); } return colour; };
        const control = el => {
          if (!el) return null;
          const style = getComputedStyle(el); const back = behind(el); const bg = rgb(style.backgroundColor); const border = rgb(style.borderTopColor);
          const fill = bg && bg.a > 0 ? over(bg, back) : back;
          return { height: el.getBoundingClientRect().height, radius: parseFloat(style.borderTopLeftRadius), fill: contrast(fill, back), border: parseFloat(style.borderTopWidth) > 0 && border ? contrast(over(border, back), back) : 0, inert: Boolean(el.closest('[inert]')), skin: el.closest('[data-skin]')?.dataset.skin ?? null };
        };
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyText: document.body.innerText,
          h1: text(document.querySelector('h1')),
          head: text(document.querySelector('[data-head]')),
          smallPrint: text(document.querySelector('[data-small-print]')),
          cards: [...document.querySelectorAll('article[data-system]')].map(card => ({
            id: card.id,
            name: text(card.querySelector('h2')),
            kind: text(card.querySelector('[data-kind]')),
            measured: text(card.querySelector('[data-measured]')),
            localBuild: text(card.querySelector('[data-local-build]')),
            shape: text(card.querySelector('[data-shape]')),
            examples: [...card.querySelectorAll('a[data-example]')].map(a => ({ href: a.getAttribute('href'), rel: a.getAttribute('rel'), target: a.getAttribute('target'), text: text(a) })),
            rows: [...card.querySelectorAll('tr[data-claim]')].map(tr => ({ claim: tr.dataset.claim, label: text(tr.querySelector('th')), value: text(tr.querySelector('[data-cell="value"]')), count: text(tr.querySelector('[data-cell="count"]')) })),
            // A cell whose text runs past its own box (the cells do not wrap).
            overflowing: [...card.querySelectorAll('tr[data-claim] > *')].filter(cell => cell.scrollWidth > cell.clientWidth).map(cell => `${cell.parentElement.dataset.claim}: ${text(cell)} (${cell.scrollWidth} > ${cell.clientWidth})`),
            strips: card.querySelectorAll('[data-strip]').length,
            input: control(card.querySelector('[data-strip] input')),
            button: control(card.querySelector('[data-strip] button')),
            controls: card.querySelectorAll('input, button').length,
            notDrawn: { field: text(card.querySelector('[data-not-drawn="field"]')), button: text(card.querySelector('[data-not-drawn="button"]')) },
          })),
          defaults: [...document.querySelectorAll('[data-default]')].map(row => ({ recipe: row.dataset.default, label: text(row.querySelector('[data-default-label]')), button: control(row.querySelector(`[data-styleseed-recipe="${row.dataset.default}"] button`)) })),
          partly: [...document.querySelectorAll('[data-partly]')].map(text),
        };
      });

      // 1
      assert.ok(read.scrollWidth <= read.clientWidth, `${at}: horizontal scroll (${read.scrollWidth} > ${read.clientWidth})`);
      assert.equal(read.h1, 'Design systems we measured', `${at}: h1`);
      assert.equal(read.head, "Seven public design systems with open licences whose example screens could be measured under this project's rules. Only sizes are shown: heights, corners, and row heights.", `${at}: head paragraph`);
      assert.deepEqual(read.cards.map(card => card.id), data.systems.map(system => system.id), `${at}: seven cards in the data's order`);

      for (const [index, system] of data.systems.entries()) {
        const card = read.cards[index];
        const where = `${at} ${system.id}`;
        assert.equal(card.name, system.name, `${where}: name`);
        // 6
        assert.equal(card.kind, KIND[system.kind], `${where}: label for kind ${system.kind}`);
        assert.equal(card.measured, `Measured ${system.screens} screens (${system.pageTypes.join(', ')}), ${data.run}.`, `${where}: measured line`);
        if (system.access === 'self-hosted') assert.equal(card.localBuild, `Measured from a local build of ${system.repository} at ${system.commit}. The link opens the maker's hosted copy, which may be newer.`, `${where}: local-build line`);
        else assert.equal(card.localBuild, null, `${where}: no local-build line on a hosted system`);
        assert.deepEqual(card.examples, [{ href: system.exampleUrl, rel: 'noopener noreferrer', target: '_blank', text: 'Open its own example' }], `${where}: example link`);
        assert.equal(card.shape, system.shape || null, `${where}: shape`);
        // 2
        assert.deepEqual(card.rows, LABELS.map(([claim, label, corner]) => ({ claim, label, value: value(system.values[claim], corner), count: count(system.values[claim]) })), `${where}: table cells`);
        assert.deepEqual(card.overflowing, [], `${where}: table text runs past its cell`);
        // 3 and 4
        const field = part(system.values['field.height'], system.values['field.radius']);
        const button = part(system.values['button.height'], system.values['button.radius']);
        for (const [name, want, got, line] of [['field', field, card.input, card.notDrawn.field], ['button', button, card.button, card.notDrawn.button]]) {
          const Name = `${name[0].toUpperCase()}${name.slice(1)}`;
          if (!want.drawn) {
            assert.equal(got, null, `${where}: the ${name} is not drawn (${want.why})`);
            assert.equal(line, `${Name} not drawn: ${want.why}`, `${where}: the ${name}'s not-drawn line`);
            continue;
          }
          assert.ok(got, `${where}: the ${name} is drawn`);
          assert.equal(line, null, `${where}: a drawn ${name} has no not-drawn line`);
          assert.equal(got.skin, 'vercel', `${where}: the ${name} sits under data-skin="vercel"`);
          assert.equal(got.height, want.height, `${where}: ${name} height ${got.height}, expected ${want.height}`);
          if (want.radius === 999) assert.ok(got.radius >= got.height / 2, `${where}: ${name} is a pill (radius ${got.radius}, height ${got.height})`);
          else assert.equal(got.radius, want.radius, `${where}: ${name} top-left radius ${got.radius}, expected ${want.radius}`);
          assert.ok(Math.max(got.fill, got.border) >= 3, `${where}: ${name} fill ${got.fill.toFixed(2)}:1 and border ${got.border.toFixed(2)}:1 against what is behind it; one must reach 3:1`);
          assert.ok(got.inert, `${where}: the ${name} is inside an inert strip`);
        }
        assert.equal(card.strips, field.drawn || button.drawn ? 1 : 0, `${where}: one strip when something is drawn`);
        assert.equal(card.controls, Number(field.drawn) + Number(button.drawn), `${where}: the card holds only the drawn controls`);
      }

      // 7
      assert.deepEqual(read.defaults.map(row => [row.recipe, row.label]), DEFAULT_ROWS, `${at}: the two default rows and their labels`);
      for (const row of read.defaults) {
        const want = defaults.recipes?.[row.recipe]?.controlHeight;
        assert.ok(Number.isFinite(want), `engine-defaults.json: recipes.${row.recipe}.controlHeight`);
        assert.ok(row.button && row.button.inert, `${at} ${row.recipe}: the button is drawn inside an inert wrapper`);
        assert.equal(row.button.height, want, `${at} ${row.recipe}: button height ${row.button.height}, expected controlHeight ${want}`);
      }

      // 8
      for (const sentence of SMALL_PRINT) assert.ok(read.smallPrint.includes(sentence), `${at}: the small print holds "${sentence}"`);
      assert.deepEqual(read.partly, data.partly.map(entry => `One more system, ${entry.name}, is not shown: ${entry.note}`), `${at}: the partly line`);
      const lower = read.bodyText.toLowerCase();
      for (const word of FORBIDDEN) assert.ok(!lower.includes(word), `${at}: the page text holds "${word}"`);

      // 5: nothing inside an inert wrapper takes focus, by script or by Tab.
      const scripted = await page.evaluate(() => [...document.querySelectorAll('[inert] input, [inert] button')].map(el => { el.focus(); return document.activeElement === el; }));
      const expected = read.cards.reduce((sum, card) => sum + card.controls, 0) + read.defaults.length;
      assert.equal(scripted.length, expected, `${at}: ${scripted.length} controls inside inert wrappers, expected every drawn control (${expected})`);
      assert.deepEqual(scripted.filter(Boolean), [], `${at}: a control inside a strip took focus by script`);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      const reached = [];
      for (let step = 0; step < 40; step += 1) {
        await page.keyboard.press('Tab');
        reached.push(await page.evaluate(() => { const el = document.activeElement; return el && el !== document.body ? { tag: el.tagName, inert: Boolean(el.closest('[inert]')), strip: Boolean(el.closest('[data-strip], [data-styleseed-recipe]')) } : null; }));
      }
      assert.ok(reached.some(item => item && item.tag === 'A'), `${at}: Tab reaches the page's links`);
      assert.deepEqual(reached.filter(item => item && (item.inert || item.strip)), [], `${at}: Tab reached a control inside a strip`);

      const drawn = read.cards.flatMap(card => [card.input && `${card.id} input ${card.input.height}/${card.input.radius}`, card.button && `${card.id} button ${card.button.height}/${card.button.radius}`]).filter(Boolean);
      console.log(`systems page ${at}: 7 cards, ${drawn.length} drawn controls (${drawn.join(', ')}); defaults ${read.defaults.map(row => `${row.recipe} ${row.button.height}`).join(', ')}; ${scripted.length} inert controls, none focusable`);
    } finally { await context.close(); }
  }
  console.log('systems page browser fixture passed');
} finally {
  await browser.close();
  await server.stop();
}
