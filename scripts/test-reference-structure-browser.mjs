#!/usr/bin/env node
// Browser fixture for the structure probe: a settings page with a sticky top bar, a 240px side
// nav, three `2fr 5fr` settings groups with one primary action each, a table with 40px rows, and a
// 768px breakpoint below which the side nav and the columns drop. The probe must find the regions
// (by landmark, and by geometry when the landmarks are removed), the column ratio, the row height,
// one primary per section, and the breakpoint; measure-reference must write facts.json over a local
// http server (with its default scroll pass recorded) and honour robots.txt. No page text may leave the page. This is a measurement
// regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../demo-pricing/node_modules/playwright/index.mjs';
import { observeDesign } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs';
import { observeStructure } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs';
import { summarize } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs';
import { primaryStats, buildFacts } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs';
import { measure, parseArgs } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';
import { settingsPage } from './lib/reference-settings-page.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const html = settingsPage();
// The same page without landmarks: regions must come from geometry.
const plain = html.replace('<header class="fx-top">', '<div class="fx-top">').replace('</nav></header>', '</div></div>').replace('<nav aria-label="계정">', '<div>')
  .replace('<nav class="fx-side" aria-label="주 메뉴">', '<div class="fx-side">').replace('</a></nav>', '</a></div>').replace('<main class="fx-main">', '<div class="fx-main">').replace('</main>', '</div>');
const LEAKS = ['스토어', '결제', '정산', '홈', 'owner@', '110-123', 'fx-', 'href', '#home', 'example.test'];
const noLeaks = (value, what, allowedUrl = null) => {
  const dump = JSON.stringify(value).split(allowedUrl ?? '\u0000').join('');
  for (const leak of LEAKS) assert.ok(!dump.includes(leak), `${what} must not carry page text, ids, classes, or links (found ${leak})`);
  assert.deepEqual(disallowedStrings(value, { url: allowedUrl }), [], `${what}: every string must pass the allow-list`);
};

async function probe(browser, content) {
  const observations = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(content);
    await page.evaluate(() => document.fonts.ready);
    const observation = await page.evaluate(observeDesign, { maxElements: 2000 });
    observation.structure = await page.evaluate(observeStructure, { maxElements: 2000 });
    observations.push(observation);
    await page.close();
  }
  return observations;
}

const browser = await chromium.launch({ headless: true });
try {
  const observations = await probe(browser, html);
  const [wide, narrow] = observations.map(o => o.structure);
  const region = (s, kind) => s.regions.find(r => r.kind === kind);
  assert.deepEqual(wide.regions.map(r => `${r.kind}:${r.by}`), ['topBar:landmark', 'sideNav:landmark', 'main:landmark'], JSON.stringify(wide.regions));
  assert.deepEqual([region(wide, 'topBar').h, region(wide, 'topBar').position], [56, 'sticky']);
  assert.deepEqual([region(wide, 'sideNav').w, region(wide, 'sideNav').items, region(wide, 'sideNav').itemHeight], [240, 6, 32]);
  assert.deepEqual([region(wide, 'main').insetLeft, region(narrow, 'main').insetLeft], [32, 16]);
  assert.deepEqual(narrow.regions.map(r => r.kind), ['topBar', 'main'], 'the side nav is gone below 768px');
  assert.deepEqual(wide.sections.map(s => s.kind), ['heading-block', 'form-group', 'form-group', 'form-group', 'table'], JSON.stringify(wide.sections));
  const groups = wide.sections.filter(s => s.kind === 'form-group');
  for (const g of groups) {
    assert.equal(g.cols.length, 2, JSON.stringify(g));
    assert.ok(Math.abs(g.cols[0] - 2 / 7) <= 0.02 && Math.abs(g.cols[1] - 5 / 7) <= 0.02, `2fr 5fr within 0.02, got ${g.cols}`);
    assert.deepEqual(g.filled, { 'rgb(15, 118, 110)': 1 }, 'one primary per section');
  }
  assert.ok(narrow.sections.every(s => s.cols.length === 1), 'one column below the breakpoint');
  assert.deepEqual(wide.tables.map(t => [t.rowH, t.headerH, t.rows, t.cols, t.endAligned, t.rowBorder]), [[{ 40: 6 }, 36, 6, 3, 1, true]]);
  assert.deepEqual(wide.css.breakpoints, { 768: 3 }, JSON.stringify(wide.css));
  assert.deepEqual([wide.css.hover, wide.css.focusVisible, wide.css.reducedMotion], [1, 1, 1]);
  assert.deepEqual([wide.controls.labels.above, wide.controls.leftEdges], [6, 1]);
  assert.deepEqual(Object.keys(wide.controls.buttons).sort(), ['filled|rgb(15, 118, 110)|36|main', 'outline|rgb(180, 189, 187)|36|main', 'text|rgb(77, 81, 80)|32|topBar']);
  // Control heights are those of visible boxes: the two unboxed 32px text buttons of the top bar stay
  // in the button census above and are not control heights.
  assert.deepEqual(observations[0].controlHeights, { 36: 12 }, JSON.stringify(observations[0].controlHeights));

  const summary = summarize(observations);
  assert.deepEqual([summary.controlHeights, summary.controlHeightsByKind, summary.controlBoxVersion], [[36], { field: [36], button: [36] }, 1]);
  const [wideSummary] = summary.structure.viewports;
  const primaries = primaryStats(wideSummary, summary.accentDerived);
  assert.deepEqual([primaries.basis, primaries.perSectionMax, primaries.sectionsOverOne, primaries.count], ['accent', 1, 0, 3]);
  assert.equal(summary.onAccent, '#fafcfc');
  assert.deepEqual(summary.motion.durations, [150]);
  const url = 'https://fixture.test/settings';
  const facts = buildFacts(summary, summary.structure, url, '2026-11-10');
  const find = (id, viewport) => facts.facts.find(f => f.id === id && f.viewport === viewport)?.value;
  assert.deepEqual([find('composition.region.sideNav.width', 1440), find('composition.columns.ratio', 1440), find('density.table.rowHeight', 1440), find('navigation.primary.perSectionMax', 1440)], [240, '0.29/0.71', 40, 1]);
  assert.deepEqual([find('responsive.columns', 'both'), find('responsive.region.sideNav', 'both'), find('responsive.breakpoints', 'both')], ['2 -> 1', '240 -> none', [768]]);
  assert.equal(find('tells.controlHeights.distinct', 'both'), 1);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.ok(facts.facts.some(f => f.axis === axis), `a ${axis} fact`);
  noLeaks(wide, 'structure output (1440)');
  noLeaks(narrow, 'structure output (390)');
  noLeaks(facts, 'facts', url);
  for (const o of observations) {
    const { structure, fonts, ...design } = o;
    const dump = JSON.stringify(design);
    for (const leak of ['스토어', 'href', 'owner@']) assert.ok(!dump.includes(leak), `the design probe must not export page text or links (found ${leak})`);
  }

  // No landmarks: the same regions by geometry.
  const [plainWide] = (await probe(browser, plain)).map(o => o.structure);
  assert.deepEqual(plainWide.regions.map(r => `${r.kind}:${r.by}:${r.w}x${r.h}`), ['topBar:geometry:1440x56', 'sideNav:geometry:240x844', 'main:geometry:1200x1291'], JSON.stringify(plainWide.regions));
  assert.deepEqual(plainWide.sections.map(s => s.kind), wide.sections.map(s => s.kind));
  console.log(`structure probe fixture passed: ${wide.regions.map(r => `${r.kind} ${r.by}`).join(', ')}; columns ${groups[0].cols.join('/')}; rows ${Object.keys(wide.tables[0].rowH)}px; breakpoints ${Object.keys(wide.css.breakpoints)}; ${facts.facts.length} facts`);
} finally { await browser.close(); }

// measure-reference over http with --robots: allowed path writes facts.json; a disallowed path stops
// before any browser starts; --own-site measures it and records the disallow.
const server = createServer((req, res) => {
  if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('User-agent: *\nDisallow: /private\n'); return; }
  if (req.url === '/settings' || req.url === '/private/settings') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
  res.writeHead(404); res.end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const out = mkdtempSync(join(tmpdir(), 'styleseed-structure-'));
try {
  const quiet = () => {};
  const [dir] = await measure(parseArgs([`${origin}/settings`, '--out', join(out, 'allowed'), '--id', 'fixture-settings-2026-11-10', '--robots', '--browser', browserModule]), quiet);
  const facts = JSON.parse(readFileSync(join(dir, 'measurements/facts.json'), 'utf8'));
  assert.equal(facts.url, `${origin}/settings`);
  assert.deepEqual(facts.viewports, [1440, 390]);
  // The scroll pass is on by default in measure-reference: both viewports reached the bottom and came back.
  assert.deepEqual(Object.keys(facts.scroll ?? {}).sort(), ['1440', '390'], JSON.stringify(facts.scroll));
  for (const [width, record] of Object.entries(facts.scroll)) assert.deepEqual([record.cap, record.atTop], ['none', true], `scroll @${width}: ${JSON.stringify(record)}`);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.ok(facts.facts.some(f => f.axis === axis), `facts.json has a ${axis} fact`);
  noLeaks(facts, 'facts.json', facts.url);
  const recorded = JSON.parse(readFileSync(join(dir, 'measurements/observations.json'), 'utf8'));
  for (const o of recorded.observations) noLeaks(o.structure, 'observations.json structure');
  const draft = JSON.parse(readFileSync(join(dir, 'case.draft.json'), 'utf8'));
  assert.equal(draft.sources[0].robots, 'allowed');
  assert.ok(draft.measurements.files.includes('measurements/facts.json'));
  const md = readFileSync(join(dir, 'TWELVE-AXES.draft.md'), 'utf8');
  assert.match(md, /\| Decision \(person\) \|/u);
  for (const axis of ['attention', 'composition', 'imagery-data', 'navigation-action', 'states-motion', 'tells']) assert.doesNotMatch(md, new RegExp(`\\| ${axis} \\| unknown`, 'u'), axis);

  await assert.rejects(measure(parseArgs([`${origin}/private/settings`, '--out', join(out, 'blocked'), '--robots', '--browser', browserModule]), quiet), /disallows \/private\/settings .*Nothing was measured/u);
  assert.equal(existsSync(join(out, 'blocked')), false, 'nothing is written for a disallowed path');
  const [own] = await measure(parseArgs([`${origin}/private/settings`, '--out', join(out, 'own'), '--id', 'fixture-own-2026-11-10', '--robots', '--own-site', '--browser', browserModule]), quiet);
  assert.equal(JSON.parse(readFileSync(join(own, 'case.draft.json'), 'utf8')).sources[0].robots, 'disallowed');
  console.log(`measure-reference fixture passed: ${facts.facts.length} facts over http; robots allowed / disallowed (stopped) / disallowed with --own-site`);
} finally {
  server.close();
  rmSync(out, { recursive: true, force: true });
}
