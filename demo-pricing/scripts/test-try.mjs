import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.env.STYLESEED_TRY_EVIDENCE || '/private/tmp/styleseed-try-evidence');
await mkdir(output, { recursive: true });
const data = JSON.parse(await readFile(resolve(root, 'content/try-bundles.json'), 'utf8'));
const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolvePromise => probe.close(resolvePromise));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const logs = [];
server.stdout.on('data', chunk => logs.push(String(chunk)));
server.stderr.on('data', chunk => logs.push(String(chunk)));
let browser;
const checks = [];
const shots = [];
const pause = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(logs.join(''));
    try { if ((await fetch(`${base}/try`)).ok) { ready = true; break; } } catch {}
    await pause(250);
  }
  assert(ready, 'Production server should be ready');
  browser = await chromium.launch({ headless: true });
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/try`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const capture = async state => {
      const path = resolve(output, `${label}-${state}.png`);
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
    };
    await capture('work');
    const firstRadius = await page.getByTestId('example').locator('[data-slot="section-card"]').evaluate(el => getComputedStyle(el).borderRadius);
    await page.getByLabel('알림 시간').fill('10:30');
    await page.getByRole('radio', { name: /개인 생산성 앱/ }).check();
    assert.equal(await page.getByLabel('알림 시간').inputValue(), '10:30', 'Context change must preserve form values');
    const secondRadius = await page.getByTestId('example').locator('[data-slot="section-card"]').evaluate(el => getComputedStyle(el).borderRadius);
    assert.notEqual(firstRadius, secondRadius, 'Canonical recipe CSS must affect the real SectionCard');
    checks.push(`${label}: canonical recipe applied (${firstRadius} → ${secondRadius}); input preserved`);
    await capture('personal');
    await page.getByLabel('오늘의 할 일 받기').uncheck();
    assert(await page.getByLabel('알림 시간').isDisabled(), 'Disabled notification must disable time');
    await page.getByLabel('오늘의 할 일 받기').check();
    await page.getByLabel('알림 시간').fill('');
    await page.getByRole('button', { name: '설정 적용', exact: true }).click();
    assert.match(await page.getByTestId('example').getByRole('alert').textContent(), /시간을 선택/);
    assert.equal(await page.getByLabel('알림 시간').getAttribute('aria-invalid'), 'true');
    await capture('validation');
    await page.getByLabel('알림 시간').fill('11:45');
    await page.getByRole('button', { name: '설정 적용', exact: true }).click();
    assert.equal(await page.getByTestId('example').getByRole('alert').count(), 0);
    assert(await page.getByText('체험 화면에 적용됐어요.', { exact: false }).isVisible());
    await capture('success');
    checks.push(`${label}: disabled, validation, recovery and success states`);
    for (const [index, example] of data.examples.entries()) {
      await page.getByRole('radio', { name: new RegExp(example.label) }).check();
      for (const agent of ['codex', 'claude']) {
        await page.getByLabel('사용하는 AI 도구').selectOption(agent);
        const pending = page.waitForEvent('download');
        await page.getByRole('button', { name: '규칙 내려받기' }).click();
        const download = await pending;
        assert.equal(download.suggestedFilename(), `styleseed-${example.id}-${agent}.md`);
        const bytes = await readFile(await download.path());
        assert.equal(createHash('sha256').update(bytes).digest('hex'), example.agents[agent].sha256);
        assert.match(bytes.toString(), new RegExp(`Output grammar: ${example.grammar}`));
        assert.match(bytes.toString(), new RegExp(`Agent: ${agent}`));
        checks.push(`${label}: ${index}/${agent} download matches canonical compiler bytes`);
      }
    }
    await page.getByRole('button', { name: '예제 입력 초기화' }).click();
    assert.equal(await page.getByLabel('알림 시간').inputValue(), '09:00');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${label}: no horizontal page overflow`);
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: '규칙 내려받기' }).focus();
    const focus = await page.getByRole('button', { name: '규칙 내려받기' }).evaluate(el => getComputedStyle(el).outlineStyle);
    assert.notEqual(focus, 'none');
    assert.deepEqual(errors, [], `${label}: no browser runtime errors`);
    checks.push(`${label}: reset, visible focus, no overflow or runtime errors`);
    await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
    await page.getByRole('button', { name: '규칙 내려받기' }).click();
    assert(await page.getByText('다운로드하지 못했습니다.', { exact: false }).isVisible());
    checks.push(`${label}: download failure offers rule-text fallback`);
    await context.close();
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ status: 'passed', checks, screenshots: shots, visualInspection: 'pending', engineRevision: data.engineRevision }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, screenshots: shots.length, output }, null, 2));
} catch (error) {
  console.error(error);
  console.error(logs.slice(-10).join(''));
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), pause(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
