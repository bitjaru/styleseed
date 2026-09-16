import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function testBrowser({ root, output, repo }) {
  const { chromium } = await import(pathToFileURL(join(repo, 'demo-pricing/node_modules/playwright/index.mjs')));
  const routes = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/incident.html', 'incident.html'], ['/client.js', 'client.js']]);
  const server = createServer((request, response) => {
    const file = routes.get(new URL(request.url, 'http://localhost').pathname);
    if (!file) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8');
    response.end(readFileSync(join(root, 'dist', file)));
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const captures = [];
  const checks = [];
  const errors = [];
  const runtime = { node: process.version, platform: process.platform };
  try {
    browser = await chromium.launch();
    runtime.chromium = browser.version();
    runtime.playwright = JSON.parse(readFileSync(join(repo, 'demo-pricing/node_modules/playwright/package.json'), 'utf8')).version;
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        errors.push(`Unexpected external request: ${route.request().url()}`);
        return route.abort();
      });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      async function capture(name) {
        const filename = `${name}-${width}.png`;
        const bytes = await page.screenshot({ path: join(output, filename), fullPage: true });
        captures.push({ file: filename, sha256: createHash('sha256').update(bytes).digest('hex'), viewport: page.viewportSize(), url: new URL(page.url()).pathname + new URL(page.url()).search, visualReview: 'NOT PERFORMED' });
      }
      async function layout() {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `horizontal overflow: ${page.url()}`);
        const tokens = await page.evaluate(() => {
          const css = getComputedStyle(document.body);
          return { primary: css.getPropertyValue('--primary').trim(), panel: css.getPropertyValue('--radius-panel').trim(), control: css.getPropertyValue('--radius-control').trim(), font: css.fontSize, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
        });
        assert.deepEqual(tokens, { primary: '#00736B', panel: '8px', control: '4px', font: '16px', reduced: true });
      }
      try {
        for (const [artifact, file] of [['incident-list', 'index.html'], ['incident-detail', 'incident.html']]) {
          for (const state of ['loaded', 'loading', 'empty', 'error']) {
            await page.goto(`${origin}/${file}${state === 'loaded' ? '' : `?state=${state}`}`);
            await page.evaluate(() => document.fonts.ready);
            assert.ok(await page.locator(state === 'loaded' ? '[data-loaded]' : `[data-state="${state}"]`).isVisible());
            assert.equal(await page.locator('[data-loaded]').isVisible(), state === 'loaded');
            assert.equal(await page.locator('[data-state]:visible').count(), state === 'loaded' ? 0 : 1);
            await layout();
            await capture(`${artifact}-${state}`);
            if (state === 'error' || state === 'empty') {
              await page.getByRole('link', { name: state === 'error' ? 'Try again' : 'Back to incident queue' }).click();
              assert.equal(new URL(page.url()).pathname, state === 'error' ? `/${file}` : '/index.html');
              assert.ok(await page.locator('[data-loaded]').isVisible());
            }
          }
        }
        await page.goto(`${origin}/index.html`);
        await page.keyboard.press('Tab');
        assert.equal(await page.locator(':focus').textContent(), 'Skip to main content');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(':focus').getAttribute('id'), 'main');
        const search = page.getByRole('searchbox', { name: 'Search incidents' });
        for (const [query, id] of [['  InVeNtOrY  ', 'INC-1041'], ['inc-1038', 'INC-1038'], ['CHECKOUT', 'INC-1042']]) {
          await search.fill(query);
          assert.deepEqual(await page.locator('[data-incident-id]:visible').evaluateAll(elements => elements.map(e => e.dataset.incidentId)), [id]);
          assert.ok(await page.getByRole('link', { name: 'Inspect priority incident' }).isVisible());
        }
        await search.fill('unmatched <script>');
        assert.equal(await page.locator('[data-incident-id]:visible').count(), 0);
        assert.ok(await page.getByText('No incidents match your search').isVisible());
        await layout();
        await capture('search-empty');
        await page.keyboard.press('Tab');
        assert.equal(await page.locator(':focus').textContent(), 'Clear search');
        assert.notEqual(await page.locator(':focus').evaluate(e => getComputedStyle(e).outlineStyle), 'none');
        await capture('search-focus');
        await page.keyboard.press('Enter');
        assert.equal(await search.inputValue(), '');
        assert.equal(await page.locator('[data-incident-id]:visible').count(), 3);
        assert.ok(await search.evaluate(e => e === document.activeElement));
        assert.deepEqual(await page.locator('button:visible,input:visible,a.button:visible').evaluateAll(elements => elements.filter(e => e.getBoundingClientRect().height < 44).map(e => e.outerHTML)), []);
        await page.getByRole('link', { name: 'Inspect priority incident' }).click();
        assert.equal(new URL(page.url()).pathname, '/incident.html');
        await page.getByRole('link', { name: 'Review response checklist' }).click();
        assert.equal(await page.locator(':focus').getAttribute('id'), 'response');
        await page.keyboard.press('Tab');
        assert.equal(await page.locator(':focus').textContent(), 'Review next steps');
        await page.keyboard.press('Enter');
        assert.ok(await page.locator('details').evaluate(e => e.open));
        await layout();
        await capture('detail-expanded');
        assert.deepEqual(errors, []);
        checks.push({ width, states: ['loaded', 'loading', 'empty', 'error'], search: 'title/id/service; trimmed and case-insensitive', keyboard: 'skip, clear/focus, disclosure', overflow: false, tokenPreservation: true, recovery: true });
      } catch (error) {
        await capture('failure').catch(() => {});
        throw error;
      } finally {
        await context.tracing.stop({ path: join(output, `trace-${width}.zip`) });
        await context.close();
      }
    }
    return { checks, captureCount: captures.length, visualApproval: 'NOT PERFORMED' };
  } finally {
    writeFileSync(join(output, 'browser.json'), JSON.stringify({ runtime, checks, captures, errors, visualApproval: 'NOT PERFORMED' }, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
