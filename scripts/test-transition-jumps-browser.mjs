#!/usr/bin/env node
// Browser fixture for ss-verify/scripts/transition-jumps.mjs. Part 1, plain pages through the CLI (file
// URLs, no server): the frame-jump pair of scripts/lib/fault-pairs.mjs (the good page glides; the bad
// page jumps 20px on x at time 0 in both directions, and with --compare-all that jump is absent when every
// property is transitioned: withAll false); a keyframe animation that grows a panel (no finding, and the
// text below it moves over several frames); a steps(2) transition (a mid jump); a change with no
// transition (instant); a state applied two frames after the click (still sampled); a transition
// declared only in the changed state that leaves transform out (withAll false: --compare-all forces every
// element); a reversed Web Animation (a glide); eight elements that jump but are not painted (inside a
// closed <details>, inside a collapsed overflow:hidden box, on a drawer translated off the left edge,
// past the right edge of a body that hides overflow-x, under opacity 0, a visually hidden 1×1 label,
// clip-path: inset(50%), clip: rect(0 0 0 0)) give no finding, while the same page with all eight painted
// gives eight; an endless animation (the case's remaining runs skipped), more than 400 elements, a paused
// CSS animation the click sets running, a reused Web Animation, a chained transition, and script-driven
// motion are inconclusive (exit 2); a page with no case, a duplicate id, or two triggers is a page error
// (exit 1). Two runs give equal transitions.json bytes (observedAt aside) and no fixture text leaves the
// page.
//
// Part 2, the nine components of #123 (ten cases): the built demo (scripts/lib/demo-server.mjs), the CLI
// on /gallery/transitions with --compare-all. Every run must be sampled and the findings caused by the
// named property lists must equal KNOWN_NAMED_LIST_JUMPS. Findings with withAll true are printed and do
// not fail the test (the accordion's missing keyframes are older than #123). This is a measurement
// regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { TRANSITION_PAIRS } from './lib/fault-pairs.mjs';
import { startDemoServer } from './lib/demo-server.mjs';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { sampleTransition } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-transition.mjs';

// The findings of the ten component cases that are absent when every property is transitioned: a
// property the named list of #123 left out. Each entry: case id, direction, phase, axis, delta.
export const KNOWN_NAMED_LIST_JUMPS = Object.freeze([]);
export const COMPONENT_CASES = Object.freeze(['switch', 'progress', 'accordion', 'segmented-control', 'chart-card', 'donut-chart-card', 'progress-bar', 'progress-bar-with-label', 'ranked-list', 'top-bar-action']);

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const cli = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/transition-jumps.mjs');
const browser = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');

const page = (title, css, body, script) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f4f2;color:#1b1d1c;font:16px/24px system-ui,sans-serif}
p{margin:0}button{font:inherit}.dot{width:24px;height:24px;background:#1f7a5c}
${css}
</style><body>${body}${script ? `<script>const root=document.querySelector('[data-styleseed-transition]'),trigger=root.querySelector('[data-styleseed-trigger]');${script}</script>` : ''}</body></html>`;
const TOGGLE = "trigger.addEventListener('click',()=>root.classList.toggle('on'));";

// Eight movers that shift 40px with no transition, beside a dot that glides so the run is sampled.
// Unpainted: each sits where nothing is drawn (a closed <details>, a collapsed overflow:hidden box,
// opacity 0, a drawer off the left edge, past the right edge of a body that hides overflow-x, a visually
// hidden 1×1 label, clip-path: inset(50%), clip: rect(0 0 0 0)). Painted: the same layout, all on screen.
const guardPage = painted => page(`guard ${painted ? 'painted' : 'hidden'}`, `body{overflow-x:hidden}
.dot{transition:transform 200ms ease}.on .dot{transform:translateX(40px)}
.mover{width:100px;height:24px;background:#c9d0cd}.on .mover{margin-left:40px}
.fold{height:${painted ? 'auto' : '0'};overflow:hidden}.ghost{opacity:${painted ? '1' : '0'}}
.drawer{position:fixed;top:0;left:${painted ? '50%' : '0'};width:280px;height:100%;padding:8px;background:#ffffff;transform:${painted ? 'none' : 'translateX(-100%)'}}
.parked{position:absolute;top:240px;left:${painted ? '20%' : '100%'};width:200px}
.lab{position:relative;height:24px}.cut{position:absolute;top:0;left:0;width:100px;height:24px;background:#c9d0cd}.on .cut{left:40px}
${painted ? '' : '.sr{width:1px;height:1px;margin:-1px;overflow:hidden;white-space:nowrap;clip-path:inset(50%)}.inset{clip-path:inset(50%)}.rect{clip:rect(0 0 0 0)}'}`,
`<div data-styleseed-transition="guard"><div class="dot"></div><button type="button" data-styleseed-trigger>Shift the markers</button>
<details${painted ? ' open' : ''}><summary>Earlier markers</summary><div class="mover"></div></details>
<div class="fold"><div class="mover"></div></div><div class="ghost"><div class="mover"></div></div>
<aside class="drawer"><div class="mover"></div></aside><div class="parked"><div class="mover"></div></div>
<div class="lab"><span class="cut sr">Hidden label</span></div><div class="lab"><div class="cut inset"></div></div><div class="lab"><div class="cut rect"></div></div></div>`, TOGGLE);

const PAGES = {
  'grow': page('grow', '.panel{height:0;overflow:hidden;background:#e6ecea}.open .panel{height:120px;animation:grow 300ms ease-out}.shut .panel{animation:shrink 300ms ease-in}@keyframes grow{from{height:0}to{height:120px}}@keyframes shrink{from{height:120px}to{height:0}}',
    '<div data-styleseed-transition="grow"><button type="button" data-styleseed-trigger>Show the shipping notes</button><div class="panel"></div><p>Delivery estimates follow below</p></div>',
    "trigger.addEventListener('click',()=>{const open=root.classList.contains('open');root.classList.toggle('open',!open);root.classList.toggle('shut',open);});"),
  'steps': page('steps', '.dot{transition:transform 200ms steps(2)}.on .dot{transform:translateX(40px)}', '<div data-styleseed-transition="steps"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>', TOGGLE),
  'instant': page('instant', '.on .dot{transform:translateX(40px)}', '<div data-styleseed-transition="instant"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>', TOGGLE),
  'late': page('late', '.dot{transition:transform 200ms ease}.on .dot{transform:translateX(40px)}', '<div data-styleseed-transition="late"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>',
    "trigger.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.toggle('on'))));"),
  'guard-hidden': guardPage(false),
  'guard-painted': guardPage(true),
  // The transition is declared only in the changed state and leaves transform out: forward jumps 20px,
  // and --compare-all must still force the element (its duration at rest is 0). Back has no duration.
  'state-duration': page('state duration', '.on .dot{transition:background-color 200ms ease;transform:translateX(20px);background:#c0392b}', '<div data-styleseed-transition="state-duration"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>', TOGGLE),
  // A new Web Animation played in reverse on each click: a glide in both directions.
  'reverse': page('reverse', '', '<div data-styleseed-transition="reverse"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>',
    "const dot=root.querySelector('.dot');let on=false;trigger.addEventListener('click',()=>{on=!on;const a=dot.animate(on?[{transform:'translateX(40px)'},{transform:'none'}]:[{transform:'none'},{transform:'translateX(40px)'}],{duration:300,fill:'both'});a.reverse();});"),
};
const INCONCLUSIVE = {
  'endless': page('endless', '.on .dot{animation:turn 1s linear infinite}@keyframes turn{to{transform:rotate(360deg)}}', '<div data-styleseed-transition="endless"><div class="dot"></div><button type="button" data-styleseed-trigger>Start syncing</button></div>', TOGGLE),
  'crowded': page('crowded', '.dot{transition:transform 200ms ease}.on .dot{transform:translateX(40px)}.cell{width:4px;height:4px}', `<div data-styleseed-transition="crowded"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button>${'<div class="cell"></div>'.repeat(400)}</div>`, TOGGLE),
  // A paused CSS animation that the click sets running, and one Web Animation reused by every click:
  // both existed before the click, so they run on the page's clock.
  'play-state': page('play state', '.dot{animation:slide 300ms linear both paused}.on .dot{animation-play-state:running}@keyframes slide{to{transform:translateX(40px)}}', '<div data-styleseed-transition="play-state"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>', TOGGLE),
  'reuse': page('reuse', '', '<div data-styleseed-transition="reuse"><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>',
    "const dot=root.querySelector('.dot');const anim=dot.animate([{transform:'none'},{transform:'translateX(40px)'}],{duration:300,fill:'both'});anim.pause();let on=false;trigger.addEventListener('click',()=>{on=!on;anim.playbackRate=on?1:-1;anim.play();});"),
  // The second transition starts on the first one's transitionend and lasts 600ms, so it is still
  // running when the settle check looks, however slow the frames are.
  'chained': page('chained', '.dot{transition:transform 100ms linear}.second{transition-duration:600ms}.on .first{transform:translateX(40px)}.second.moved{transform:translateX(40px)}', '<div data-styleseed-transition="chained"><div class="dot first"></div><div class="dot second"></div><button type="button" data-styleseed-trigger>Move both markers</button></div>',
    "const first=root.querySelector('.first'),second=root.querySelector('.second');trigger.addEventListener('click',()=>root.classList.toggle('on'));first.addEventListener('transitionend',()=>second.classList.toggle('moved'));"),
  'scripted': page('scripted', '.flag{width:24px;height:24px;background:#c9d0cd;transition:background-color 200ms ease}.on .flag{background:#1f7a5c}', '<div data-styleseed-transition="scripted"><div class="flag"></div><div class="dot runner"></div><button type="button" data-styleseed-trigger>Start the runner</button></div>',
    "const runner=root.querySelector('.runner');let raf=0;trigger.addEventListener('click',()=>{root.classList.toggle('on');cancelAnimationFrame(raf);let n=0;const tick=()=>{n++;runner.style.marginLeft=n+'px';if(n<600)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);});"),
};
const ERRORS = {
  'no-case': [page('no case', '', '<div><div class="dot"></div><button type="button" data-styleseed-trigger>Move the marker</button></div>', ''), /no-case: no declared transition case; add data-styleseed-transition="<id>"/u],
  'duplicate': [page('duplicate', '', '<div data-styleseed-transition="marker"><button type="button" data-styleseed-trigger>One</button></div><div data-styleseed-transition="marker"><button type="button" data-styleseed-trigger>Two</button></div>', ''), /duplicate: case marker is declared more than once; give each data-styleseed-transition a unique id/u],
  'two-triggers': [page('two triggers', '', '<div data-styleseed-transition="marker"><button type="button" data-styleseed-trigger>One</button><button type="button" data-styleseed-trigger>Two</button></div>', ''), /two-triggers: case marker holds 2 elements with data-styleseed-trigger; mark exactly one/u],
};

// The copy of every fixture: text between tags, five characters or longer (scripts and styles removed).
const allFixtures = [...TRANSITION_PAIRS.flatMap(p => [p.good, p.bad]), ...Object.values(PAGES), ...Object.values(INCONCLUSIVE)];
const fixtureText = [...new Set(allFixtures.flatMap(html => [...html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>|<title>[\s\S]*?<\/title>/gu, '').matchAll(/>([^<>]+)</gu)].map(m => m[1].trim())).filter(t => t.length >= 5))];
const noFixtureText = (text, what) => { for (const t of fixtureText) assert.ok(!text.includes(t), `${what} must not carry fixture text (found ${JSON.stringify(t)})`); };

const dir = mkdtempSync(join(tmpdir(), 'styleseed-transitions-'));
const cliRun = (urls, out, extra = []) => spawnSync(process.execPath, [cli, ...urls, '--out', out, '--browser', browser, ...extra], { encoding: 'utf8' });
const write = (name, html) => { const path = join(dir, `${name}.html`); writeFileSync(path, html); return pathToFileURL(path).href; };
const brief = f => `${f.phase} ${f.size} ${f.axis} ${f.delta > 0 ? '+' : ''}${f.delta}px at ${f.at}ms box [${f.box.join(', ')}]${f.withAll === undefined ? '' : ` withAll ${f.withAll}`}`;
try {
  // 1. The pair and the local pages, with --compare-all, twice.
  const urls = {};
  for (const pair of TRANSITION_PAIRS) for (const kind of ['good', 'bad']) urls[`${pair.id}-${kind}`] = write(`${pair.id}-${kind}`, pair[kind]);
  for (const [name, html] of Object.entries(PAGES)) urls[name] = write(name, html);
  const first = join(dir, 'pages'), again = join(dir, 'pages-again');
  const run = cliRun(Object.values(urls), first, ['--compare-all']);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(cliRun(Object.values(urls), again, ['--compare-all']).status, 0);
  // Equal bytes apart from the date, which a run across UTC midnight would change.
  const undated = file => readFileSync(file, 'utf8').replace(/"observedAt": "[^"]*"/u, '"observedAt": ""').replace(/^(# Transition frame jumps — [^\n]*?), \d{4}-\d{2}-\d{2}$/mu, '$1');
  for (const name of ['transitions.json', 'TRANSITIONS.md']) assert.equal(undated(join(first, name)), undated(join(again, name)), `two runs give equal ${name} bytes (observedAt aside)`);
  const text = readFileSync(join(first, 'transitions.json'), 'utf8');
  const result = JSON.parse(text);
  assert.deepEqual([result.tool, result.version, result.viewport, result.thresholds], ['styleseed transition-jumps', '1', { width: 1440, height: 900 }, { jumpPx: 2, calmFactor: 3, calmFloor: 0.4, shiftPx: 0.5 }]);
  noFixtureText(text, 'transitions.json');
  noFixtureText(readFileSync(join(first, 'TRANSITIONS.md'), 'utf8'), 'TRANSITIONS.md');
  const runsOf = label => { const p = result.pages.find(x => x.label === label); assert.equal(p.cases.length, 1, `${label}: one case`); return p.cases[0].runs; };
  const built = label => runsOf(label).filter(r => r.mode === 'built');
  const findings = label => built(label).flatMap(r => r.findings.map(f => ({ ...f, direction: r.direction })));
  for (const label of Object.keys(urls)) assert.deepEqual(runsOf(label).map(r => `${r.mode}:${r.direction}`), ['built:forward', 'built:back', 'all:forward', 'all:back'], label);

  assert.deepEqual(built('frame-jump-good').map(r => [r.status, r.findings.length]), [['sampled', 0], ['sampled', 0]], 'the good pair glides');
  assert.deepEqual(findings('frame-jump-bad').map(f => [f.direction, f.phase, f.size, f.axis, f.delta, f.withAll]), [['forward', 'start', 'jump', 'x', 20, false], ['back', 'start', 'jump', 'x', -20, false]], `the bad pair jumps on x at time 0 and the named list caused it: ${JSON.stringify(findings('frame-jump-bad'))}`);
  assert.deepEqual(built('grow').map(r => [r.status, r.animations, r.findings.length]), [['sampled', 1, 0], ['sampled', 1, 0]], `a keyframe animation that grows a panel: ${JSON.stringify(built('grow'))}`);
  const steps = findings('steps');
  assert.ok(steps.some(f => f.direction === 'forward' && f.phase === 'mid' && f.size === 'jump' && f.axis === 'x'), `steps(2) gives a mid jump on x: ${JSON.stringify(steps)}`);
  assert.ok(steps.every(f => f.phase === 'mid' && f.withAll === true), 'a steps() timing jumps with every property transitioned too');
  assert.deepEqual(built('instant').map(r => [r.status, r.transitions, r.animations, r.findings.length]), [['instant', 0, 0, 0], ['instant', 0, 0, 0]], 'no transition: instant');
  assert.deepEqual(built('late').map(r => [r.status, r.transitions, r.findings.length]), [['sampled', 1, 0], ['sampled', 1, 0]], `a state applied two frames late is still sampled: ${JSON.stringify(built('late'))}`);
  assert.deepEqual(built('guard-hidden').map(r => [r.status, r.findings.length]), [['sampled', 0], ['sampled', 0]], `unpainted movers are not measured: ${JSON.stringify(findings('guard-hidden'))}`);
  assert.deepEqual(built('guard-painted').map(r => [r.status, r.findings.map(f => `${f.phase} ${f.size} ${f.axis} ${f.delta}`)]), [['sampled', Array(8).fill('start jump x 40')], ['sampled', Array(8).fill('start jump x -40')]], `painted movers jump: ${JSON.stringify(findings('guard-painted'))}`);
  assert.deepEqual(built('state-duration').map(r => [r.status, r.findings.map(f => `${f.phase} ${f.size} ${f.axis} ${f.delta} ${f.withAll}`)]), [['sampled', ['start jump x 20 false']], ['instant', []]], `a duration declared only in the changed state is still forced by --compare-all: ${JSON.stringify(built('state-duration'))}`);
  assert.deepEqual(built('reverse').map(r => [r.status, r.animations, r.findings.length]), [['sampled', 1, 0], ['sampled', 1, 0]], `a reversed Web Animation is stepped from its end back to 0: ${JSON.stringify(findings('reverse'))}`);
  assert.equal(result.totals.namedList, 3, 'the bad pair and the state-duration page are the findings the named list caused');
  assert.equal(result.totals.notCompared, 0);
  console.log(`transition jumps pages: ${result.verdict}`);

  // The frames themselves, read with the sampler: the text under the growing panel moves over several
  // frames, and the unpainted movers are null at rest and in every frame.
  const { chromium } = await loadBrowser(browser);
  const instance = await chromium.launch({ headless: true });
  try {
    const context = await instance.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const tab = await context.newPage();
    await tab.goto(urls.grow);
    const tags = await tab.evaluate(() => [...document.querySelectorAll('[data-styleseed-transition], [data-styleseed-transition] *')].map(el => el.tagName));
    const grow = await tab.evaluate(sampleTransition, { id: 'grow', direction: 'forward' });
    const below = tags.indexOf('P');
    const ys = new Set(grow.frames.map(f => f[below]?.[1]));
    assert.ok(ys.size >= 5, `the text below the panel moves over several frames: ${JSON.stringify(grow.frames.map(f => f[below]))}`);
    await tab.goto(urls['guard-hidden']);
    const hidden = await tab.evaluate(sampleTransition, { id: 'guard', direction: 'forward' });
    const movers = await tab.evaluate(() => [...document.querySelectorAll('[data-styleseed-transition] *')].map(el => el.classList.contains('mover') || el.classList.contains('cut')));
    const moverIndex = movers.flatMap((m, i) => (m ? [i + 1] : []));
    assert.equal(moverIndex.length, 8);
    for (const i of moverIndex) assert.deepEqual([hidden.rest[i], ...hidden.frames.map(f => f[i]), hidden.settled[i]].filter(b => b !== null), [], `mover ${i} is not painted, so it has no box in any frame`);
    // Without Element.checkVisibility the sampler falls back to its closed-<details> test.
    await tab.goto(urls['guard-hidden']);
    await tab.evaluate(() => { Element.prototype.checkVisibility = undefined; });
    const fallback = await tab.evaluate(sampleTransition, { id: 'guard', direction: 'forward' });
    assert.deepEqual([fallback.status, [fallback.rest[moverIndex[0]], ...fallback.frames.map(f => f[moverIndex[0]])].filter(b => b !== null)], ['sampled', []], 'the mover inside the closed <details> has no box without checkVisibility either');
    await context.close();
  } finally { await instance.close(); }

  // Inconclusive runs: exit 2, with their reasons, with --compare-all so a back run that cannot click
  // leaves the case's remaining runs skipped.
  const open = {};
  for (const [name, html] of Object.entries(INCONCLUSIVE)) open[name] = write(name, html);
  const stuck = join(dir, 'inconclusive');
  const inconclusive = cliRun(Object.values(open), stuck, ['--compare-all']);
  assert.equal(inconclusive.status, 2, inconclusive.stderr || inconclusive.stdout);
  const stuckResult = JSON.parse(readFileSync(join(stuck, 'transitions.json'), 'utf8'));
  const reasons = Object.fromEntries(stuckResult.pages.map(p => [p.label, p.cases[0].runs.map(r => `${r.mode}:${r.direction} ${r.status} ${r.reason ?? ''}`.trim())]));
  const four = text => ['built:forward', 'built:back', 'all:forward', 'all:back'].map(run => `${run} ${text}`);
  assert.deepEqual(reasons, {
    'endless': ['built:forward inconclusive not-at-rest', 'built:back inconclusive not-at-rest', 'all:forward inconclusive skipped', 'all:back inconclusive skipped'],
    'crowded': four('inconclusive capped'),
    'play-state': ['built:forward inconclusive chained', 'built:back instant', 'all:forward instant', 'all:back instant'],
    'reuse': four('inconclusive chained'),
    'chained': four('inconclusive chained'),
    'scripted': four('inconclusive script-driven'),
  });
  assert.ok(stuckResult.pages.every(p => p.cases[0].runs.every(r => !r.findings.length)), 'inconclusive runs carry no findings');
  console.log(`transition jumps inconclusive: ${stuckResult.verdict}`);

  // Page errors: exit 1 naming the page, the case, and the attribute.
  for (const [name, [html, message]] of Object.entries(ERRORS)) {
    const failed = cliRun([write(name, html)], join(dir, `error-${name}`));
    assert.equal(failed.status, 1, `${name}: ${failed.stderr}${failed.stdout}`);
    assert.match(failed.stderr, message);
  }

  // 2. The nine components of #123, ten cases, from the built demo.
  const server = await startDemoServer();
  let demo;
  try {
    const out = join(dir, 'components');
    const components = cliRun([`${server.baseUrl}/gallery/transitions`], out, ['--compare-all']);
    assert.equal(components.status, 0, components.stderr || components.stdout);
    demo = JSON.parse(readFileSync(join(out, 'transitions.json'), 'utf8'));
  } finally { await server.stop(); }
  const cases = demo.pages[0].cases;
  assert.deepEqual(cases.map(c => c.id), COMPONENT_CASES, 'ten declared cases');
  for (const c of cases) for (const r of c.runs) assert.equal(r.status, 'sampled', `${c.id} ${r.direction} (${r.mode}) is sampled: ${JSON.stringify(r)}`);
  for (const c of cases) for (const r of c.runs.filter(x => x.mode === 'built')) for (const f of r.findings) console.log(`  ${c.id} ${r.direction}: ${brief(f)}`);
  const named = cases.flatMap(c => c.runs.filter(r => r.mode === 'built').flatMap(r => r.findings.filter(f => f.withAll === false).map(f => ({ id: c.id, direction: r.direction, phase: f.phase, axis: f.axis, delta: f.delta }))));
  assert.deepEqual(named, KNOWN_NAMED_LIST_JUMPS, 'findings caused by the named property lists');
  assert.equal(demo.totals.namedList, KNOWN_NAMED_LIST_JUMPS.length);
  const total = demo.totals.jumps + demo.totals.shifts;
  console.log(`transition jumps components: ${demo.verdict}`);
  console.log(`transition jumps fixture passed: pairs ok; ${cases.length} component cases sampled, ${total} finding(s), ${KNOWN_NAMED_LIST_JUMPS.length ? `${KNOWN_NAMED_LIST_JUMPS.length} caused by named properties (${KNOWN_NAMED_LIST_JUMPS.map(k => `${k.id} ${k.direction} ${k.phase} ${k.axis}`).join('; ')})` : '0 caused by named properties'}`);
} finally { rmSync(dir, { recursive: true, force: true }); }
