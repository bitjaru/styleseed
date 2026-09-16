import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localOrigin, sha256 } from './support.mjs';
import { scenarios } from './scenarios.mjs';

export const viewports = Object.freeze([
  { id: 'desktop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' },
  { id: 'mobile-reduced', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' },
]);

export async function runAcceptance({ browser, baseUrl, output, label, selectedScenarios = scenarios, selectedViewports = viewports }) {
  baseUrl = localOrigin(baseUrl);
  if (!/^[a-z0-9-]+$/u.test(label)) throw new Error('Unsafe evidence label');
  if (!selectedScenarios.length || !selectedViewports.length) throw new Error('Cannot accept an empty browser suite');
  const cases = [];
  for (const viewport of selectedViewports) for (const scenario of selectedScenarios) {
    if (scenario.reducedOnly && viewport.reducedMotion !== 'reduce') continue;
    const { id: viewportId, ...options } = viewport;
    const context = await browser.newContext({ ...options, serviceWorkers: 'block', acceptDownloads: false });
    const environment = [];
    const result = { id: scenario.id, viewport: viewportId, viewportSize: viewport.viewport, reducedMotion: viewport.reducedMotion,
      controls: { role: 'editor', fixture: 'loaded', ...Object.fromEntries(new URL(scenario.path, baseUrl).searchParams) },
      observedControls: null, status: 'fail', assertion: null, environment, screenshot: null };
    let page;
    try {
      context.setDefaultTimeout(2000); context.setDefaultNavigationTimeout(10000);
      await context.route('**/*', async route => {
        try {
          if (new URL(route.request().url()).origin !== baseUrl) {
            environment.push('Off-origin request blocked'); await route.abort(); return;
          }
          // route.continue() can follow redirects without re-entering this handler. Inspect
          // the response with redirects disabled; v1 deliberately refuses every redirect.
          const response = await route.fetch({ maxRedirects: 0, timeout: 10000 });
          const location = response.headers().location;
          if (response.status() >= 300 && response.status() < 400 && location) {
            const target = new URL(location, route.request().url());
            environment.push(target.origin === baseUrl ? 'HTTP redirect blocked' : 'Off-origin redirect blocked');
            await route.abort(); return;
          }
          await route.fulfill({ response });
        } catch (error) { environment.push(`Request guard failed: ${error.message}`); await route.abort().catch(() => {}); }
      });
      await context.routeWebSocket('**/*', socket => { environment.push('WebSocket blocked'); socket.close(); });
      page = await context.newPage();
      context.on('page', popup => { environment.push('Unexpected popup'); void popup.close().catch(() => {}); });
      page.on('pageerror', error => environment.push(`pageerror: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error') environment.push(`console.error: ${message.text()}`); });
      page.on('response', response => {
        if (response.status() >= 400 && !(scenario.id === 'detail-unknown' && response.status() === 404 && response.request().isNavigationRequest())) {
          environment.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
        }
      });
      const response = await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'networkidle' });
      if (!response || (!response.ok() && !(scenario.id === 'detail-unknown' && response.status() === 404))) throw new Error('Test document did not load');
      const optIn = page.locator('meta[name="styleseed-pilot-protocol"]');
      if (await optIn.count() !== 1 || await optIn.getAttribute('content') !== '1') throw new Error('Missing explicit disposable-app protocol opt-in');
      await page.locator('main h1').waitFor();
      if (environment.length) throw new Error('Page environment failed before assertions');
      try { await scenario.run(page); } catch (error) { result.assertion = error.message; }
    } catch (error) { environment.push(error.message); }
    finally {
      if (page && !page.isClosed()) {
        try {
          const name = `${label}-${viewportId}-${scenario.id}.png`;
          const path = join(output, name);
          result.observedControls = await page.evaluate(() => ({
            labelledValue: Object.fromEntries(['Save outcome', 'Search resources', 'Status filter'].map(name => {
              const control = [...document.querySelectorAll('input,select')].find(element => element.getAttribute('aria-label') === name
                || [...(element.labels || [])].some(label => label.textContent.trim() === name));
              return [name, control?.value ?? null];
            })),
          }));
          await page.screenshot({ path, fullPage: true, timeout: 10000 });
          const bytes = readFileSync(path);
          result.screenshot = { path: name, sha256: sha256(bytes), bytes: bytes.length, url: page.url() };
        } catch (error) { environment.push(`Screenshot failed: ${error.message}`); }
      }
      await context.close();
    }
    result.status = !result.assertion && !environment.length && result.screenshot ? 'pass' : 'fail';
    cases.push(result);
    console.log(`${result.status.toUpperCase()} ${label}/${viewportId}/${scenario.id}`);
    if (result.status === 'fail') console.log(`  ${result.assertion || environment.join('; ')}`);
  }
  if (!cases.length) throw new Error('No browser cases executed');
  return { label, status: cases.every(result => result.status === 'pass') ? 'pass' : 'fail', cases };
}
