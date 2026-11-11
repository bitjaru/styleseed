#!/usr/bin/env node
// Browser fixture for drift-report.mjs --faults: the good and bad page of every render-fault class
// (scripts/lib/fault-pairs.mjs), measured through the CLI at 1440 and 390. Each bad page must yield
// its own class at both viewports and no other gate-candidate class; each good page none of its class.
// --gate must follow the real rule catalog (a class fails only when its rule's priority is `blocks`),
// an approved ledger exception must waive a blocking default rule on its screen, and an exception to
// an invariant must be refused. The three pages of test-drift-browser.mjs must give identical drift.json
// and DRIFT.md with and without --faults. Content of a closed <details> is not shown: inside a small
// card it would overlap the summary, run out of the card, and wrap an amount if it were laid out (the
// same page with the details open shows all three), and closed it yields none, with or without
// Element.checkVisibility. No fixture text may leave the page, every string must pass the allow-list,
// and two runs must give the same fault-report bytes. This is a measurement regression fixture, not a
// design judgment.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { FAULT_PAIRS } from './lib/fault-pairs.mjs';
import { disallowedStrings } from './lib/reference-allow-list.mjs';
import { FAULT_CLASSES } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs';
import { observeFaults } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-faults.mjs';
import { gateFailure, parseArgs, report } from '../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs';
import { loadBrowser } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const cli = resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs');
const browser = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, 'demo-pricing/node_modules/playwright/index.mjs');
const catalog = JSON.parse(readFileSync(resolve(repoRoot, 'engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json'), 'utf8'));
const CANDIDATES = ['amount-wrap', 'text-overlap', 'text-spill'];
const VIEWPORTS = [1440, 390];

// The three pages of test-drift-browser.mjs (the builder is copied, not imported).
const driftPage = (title, accent, radius, rowHeight = 40) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;background:#eff5f4;color:#090c0b;font:16px/1.5 system-ui}
main{max-width:960px;margin:0 auto;padding:32px}h1{font-size:32px;line-height:40px;margin:0 0 16px}h2{font-size:20px;line-height:28px;margin:0 0 8px}p{margin:0 0 8px}
.card{background:#fafdfd;border:1px solid #b4bdbb;border-radius:${radius}px;padding:24px;margin-bottom:16px}
.btn{display:inline-block;background:${accent};color:#fafcfc;border:0;border-radius:${radius}px;padding:8px 16px;height:40px;font:inherit}
a{color:${accent}}.muted{color:#4d5150;font-size:14px;line-height:20px}
table{width:100%;border-collapse:collapse}tbody tr{height:${rowHeight}px}td{padding:0 16px;border-bottom:1px solid #b4bdbb}
</style><main>
<h1>${title}</h1>
<section class="card"><h2>오늘 결제</h2><p>승인 1,240건</p><p class="muted">어제보다 3% 증가</p><button class="btn">내보내기</button></section>
<section class="card"><h2>실패한 결제</h2><p>카드 한도 초과 12건</p><p><a href="#a">실패 목록 보기</a></p><button class="btn">재시도</button></section>
<section class="card"><h2>정산</h2><p class="muted">다음 정산 11월 7일</p><button class="btn">정산 내역</button></section>
<section class="card"><h2>최근 정산</h2><table><tbody><tr><td>11월 1일</td><td>1,240,000</td></tr><tr><td>11월 2일</td><td>980,500</td></tr><tr><td>11월 3일</td><td>1,102,000</td></tr></tbody></table></section>
</main></html>`;

// A 200px card holding a <details>: its hidden content is pulled 20px up over the summary, runs a
// no-wrap line past the card, and puts an amount in a 20px box. Font-independent as the pairs are.
const detailsPage = open => `<!doctype html><html lang="en"><meta charset="utf-8"><title>details</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f4f2;color:#1b1d1c;font:16px/24px system-ui,sans-serif}
p{margin:0}.box{width:200px;background:#ffffff;border-radius:8px;padding:16px}
.pull{margin-top:-20px}.long{white-space:nowrap}.value{width:20px;font-size:32px;line-height:40px}
</style><body><div class="box"><details${open ? ' open' : ''}><summary>History</summary><p class="pull">Waiting for approval</p><p class="long">Waiting for payment approval from the finance team</p><p class="value">10 kg</p></details></div></body></html>`;

// The copy of every fixture: text between tags, five characters or longer, and the emoji.
const fixtureText = [...new Set([...FAULT_PAIRS.flatMap(p => [p.good, p.bad]), detailsPage(true)].flatMap(html => [...html.replace(/<style>[\s\S]*?<\/style>|<title>[\s\S]*?<\/title>/gu, '').matchAll(/>([^<>]+)</gu)].map(m => m[1].trim())).filter(t => t.length >= 5 || /\p{Extended_Pictographic}/u.test(t)))];
const noFixtureText = (text, what) => { for (const t of fixtureText) assert.ok(!text.includes(t), `${what} must not carry fixture text (found ${JSON.stringify(t)})`); };
const reportData = screen => ({ findings: screen.findings.map(({ exception: _exception, ...f }) => f), counts: screen.counts, distribution: screen.distribution, icons: screen.icons, capped: screen.capped });

const dir = mkdtempSync(join(tmpdir(), 'styleseed-faults-'));
const cliRun = (urls, out, extra = []) => spawnSync(process.execPath, [cli, ...urls, '--out', out, '--browser', browser, ...extra], { encoding: 'utf8' });
try {
  assert.deepEqual(FAULT_PAIRS.map(p => p.id), FAULT_CLASSES.map(c => c.id), 'one pair per class, in FAULT_CLASSES order');
  const url = {};
  for (const pair of FAULT_PAIRS) for (const kind of ['good', 'bad']) {
    const name = `${pair.id}-${kind}`;
    writeFileSync(join(dir, `${name}.html`), pair[kind]);
    url[name] = pathToFileURL(join(dir, `${name}.html`)).href;
  }
  for (const open of [true, false]) {
    const name = `details-${open ? 'open' : 'closed'}`;
    writeFileSync(join(dir, `${name}.html`), detailsPage(open));
    url[name] = pathToFileURL(join(dir, `${name}.html`)).href;
  }

  // 1. Every pair through the CLI, one run.
  const all = Object.values(url);
  const first = join(dir, 'pairs');
  const run = cliRun(all, first, ['--faults']);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const faultsText = readFileSync(join(first, 'faults.json'), 'utf8');
  const faults = JSON.parse(faultsText);
  assert.deepEqual([faults.tool, faults.version], ['styleseed render-faults', '1']);
  const screen = label => faults.screens.find(s => s.label === label);
  const counted = (label, cls, width) => screen(label).findings.filter(f => f.class === cls && f.viewport === width).length;
  for (const pair of FAULT_PAIRS) {
    for (const width of VIEWPORTS) {
      assert.ok(counted(`${pair.id}-bad`, pair.id, width) >= 1, `${pair.id}-bad @${width} yields ${pair.id}: ${JSON.stringify(screen(`${pair.id}-bad`).findings)}`);
      for (const other of CANDIDATES.filter(c => c !== pair.id)) assert.equal(counted(`${pair.id}-bad`, other, width), 0, `${pair.id}-bad @${width} yields no ${other}: ${JSON.stringify(screen(`${pair.id}-bad`).findings)}`);
      assert.equal(counted(`${pair.id}-good`, pair.id, width), 0, `${pair.id}-good @${width} yields no ${pair.id}: ${JSON.stringify(screen(`${pair.id}-good`).findings)}`);
    }
  }
  for (const width of VIEWPORTS) {
    for (const cls of CANDIDATES) {
      assert.ok(counted('details-open', cls, width) >= 1, `details-open @${width} yields ${cls} (the hidden content would fail if laid out): ${JSON.stringify(screen('details-open').findings)}`);
      assert.equal(counted('details-closed', cls, width), 0, `details-closed @${width}: the content of a closed <details> is not shown (${cls}): ${JSON.stringify(screen('details-closed').findings)}`);
    }
  }
  const md = readFileSync(join(first, 'FAULTS.md'), 'utf8');
  noFixtureText(faultsText, 'faults.json');
  noFixtureText(md, 'FAULTS.md');
  for (const s of faults.screens) assert.deepEqual(disallowedStrings(reportData(s)), [], `${s.label}: every string of the report must pass the allow-list`);
  console.log(`render faults pairs: ${faults.verdict}`);

  // 2. --gate follows the real catalog: each bad page alone (one screen, so the drift gate has
  //    nothing to compare), exit 3 naming the class when its rule blocks, else exit 0.
  const rules = new Map((catalog.rules ?? []).map(r => [r.id, r]));
  const gating = [];
  for (const c of FAULT_CLASSES) {
    const rule = c.rule && rules.has(c.rule) ? rules.get(c.rule) : null;
    const blocks = rule?.priority === 'blocks';
    const gated = cliRun([url[`${c.id}-bad`]], join(dir, `gate-${c.id}`), ['--faults', '--gate']);
    if (blocks) {
      gating.push(c.id);
      assert.equal(gated.status, 3, `${c.id}: ${rule.id} blocks, so --gate exits 3\n${gated.stderr}${gated.stdout}`);
      assert.match(gated.stderr, new RegExp(`render faults gate: FAIL — ${rule.id}: ${c.id} on ${c.id}-bad @1440 \\(\\d+\\); ${rule.id}: ${c.id} on ${c.id}-bad @390`, 'u'), gated.stderr);
    } else assert.equal(gated.status, 0, `${c.id}: ${rule ? `${rule.id} is ${rule.priority}` : 'no catalog rule'}, so --gate reports and exits 0\n${gated.stderr}${gated.stdout}`);
  }
  console.log(`render faults gate: ${gating.length ? `fails on ${gating.join(', ')}` : 'no class blocks in the catalog'}; the other classes report`);

  // 3. In process, with a catalog copy in which DL-23 blocks: the wrapped amount fails; an approved
  //    exception to DL-23 for that screen waives it and the finding reads approved.
  const blocking = structuredClone(catalog);
  blocking.rules.find(r => r.id === 'DL-23-amounts-never-wrap').priority = 'blocks';
  const inProcess = (out, extra = []) => report(parseArgs([url['amount-wrap-bad'], '--out', join(dir, out), '--browser', browser, '--faults', ...extra]), () => {}, { catalog: blocking });
  const failing = await inProcess('dl23-blocks');
  assert.equal(gateFailure(failing), 'render faults gate: FAIL — DL-23-amounts-never-wrap: amount-wrap on amount-wrap-bad @1440 (1); DL-23-amounts-never-wrap: amount-wrap on amount-wrap-bad @390 (1)');
  const ledger = join(dir, 'dl23-exception.json');
  writeFileSync(ledger, JSON.stringify([{ id: 'D-001', kind: 'exception', rule: 'DL-23-amounts-never-wrap', scope: { screens: ['amount-wrap-bad'] }, statement: 'The fixture amount wraps on purpose.', approvedBy: 'reviewer-a', date: '2026-11-11' }]));
  const waived = await inProcess('dl23-approved', ['--decisions', ledger]);
  assert.equal(gateFailure(waived), null);
  assert.deepEqual(waived.faults.screens[0].findings.map(f => [f.class, f.status, f.exception]), [['amount-wrap', 'approved', 'D-001'], ['amount-wrap', 'approved', 'D-001']]);
  assert.match(waived.faults.verdict, /Approved exceptions used: D-001 on amount-wrap-bad\.$/u);
  if (rules.has('INV-06-text-stays-whole')) {
    const invariant = join(dir, 'inv06-exception.json');
    writeFileSync(invariant, JSON.stringify([{ id: 'D-002', kind: 'exception', rule: 'INV-06-text-stays-whole', statement: 'Text may overlap here.', approvedBy: 'reviewer-a', date: '2026-11-11' }]));
    const refused = cliRun([url['text-overlap-bad']], join(dir, 'inv06'), ['--faults', '--gate', '--decisions', invariant]);
    assert.equal(refused.status, 1, refused.stderr || refused.stdout);
    assert.match(refused.stderr, /D-002: exceptions cannot waive an invariant \(INV-06-text-stays-whole\)/u);
  }

  // 4. The byte promise: the drift fixture's pages, plain and with --faults; and determinism: the
  //    run with --faults again gives the same bytes.
  const drift = { 'home.html': driftPage('홈', '#0f766e', 4), 'settings.html': driftPage('설정', '#0f766e', 4), 'billing.html': driftPage('청구', '#2563eb', 10, 52) };
  for (const [name, html] of Object.entries(drift)) writeFileSync(join(dir, name), html);
  const driftUrls = Object.keys(drift).map(name => pathToFileURL(join(dir, name)).href);
  const plain = join(dir, 'drift-plain'), withFaults = join(dir, 'drift-faults'), again = join(dir, 'drift-faults-again');
  assert.equal(cliRun(driftUrls, plain).status, 0);
  assert.equal(cliRun(driftUrls, withFaults, ['--faults']).status, 0);
  assert.equal(cliRun(driftUrls, again, ['--faults']).status, 0);
  for (const name of ['faults.json', 'FAULTS.md']) assert.ok(readFileSync(join(again, name)).equals(readFileSync(join(withFaults, name))), `two runs give equal ${name} bytes`);
  for (const name of ['drift.json', 'DRIFT.md']) assert.ok(readFileSync(join(plain, name)).equals(readFileSync(join(withFaults, name))), `${name} is byte-identical with and without --faults`);
  assert.equal(existsSync(join(plain, 'faults.json')) || existsSync(join(plain, 'FAULTS.md')), false, 'without --faults there is no faults.json and no FAULTS.md');
  assert.equal(existsSync(join(withFaults, 'faults.json')) && existsSync(join(withFaults, 'FAULTS.md')), true);
  const driftFaults = readFileSync(join(withFaults, 'faults.json'), 'utf8') + readFileSync(join(withFaults, 'FAULTS.md'), 'utf8');
  assert.ok(!driftFaults.includes('결제') && !driftFaults.includes('청구'), 'the fault report must not export page text');

  // 5. The real probe output passes the allow-list and carries no fixture text.
  const { chromium } = await loadBrowser(browser);
  const instance = await chromium.launch({ headless: true });
  try {
    for (const pair of FAULT_PAIRS) for (const kind of ['good', 'bad']) for (const width of VIEWPORTS) {
      const page = await instance.newPage({ viewport: { width, height: width >= 768 ? 900 : 844 } });
      await page.setContent(pair[kind]);
      const output = await page.evaluate(observeFaults, { maxElements: 5000 });
      assert.deepEqual(disallowedStrings(output), [], `${pair.id}-${kind} @${width}: the probe output must pass the allow-list`);
      noFixtureText(JSON.stringify(output), `${pair.id}-${kind} probe output`);
      await page.close();
    }
    // Without Element.checkVisibility the probe falls back to its closed-<details> test: only the
    // summary is text, and no gate candidate is recorded.
    for (const width of VIEWPORTS) {
      const page = await instance.newPage({ viewport: { width, height: width >= 768 ? 900 : 844 } });
      await page.setContent(detailsPage(false));
      await page.evaluate(() => { Element.prototype.checkVisibility = undefined; });
      const output = await page.evaluate(observeFaults, { maxElements: 5000 });
      assert.deepEqual([output.textRuns, output.amounts.length, output.overlaps.length, output.spills.length], [1, 0, 0, 0], `details-closed @${width} without checkVisibility: ${JSON.stringify(output)}`);
      await page.close();
    }
  } finally { await instance.close(); }

  console.log(`render faults fixture passed: ${FAULT_CLASSES.length} classes (good 0, bad >= 1 each); gate follows the catalog; drift files identical with and without --faults`);
} finally { rmSync(dir, { recursive: true, force: true }); }
