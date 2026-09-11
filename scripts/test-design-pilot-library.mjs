#!/usr/bin/env node
// Compile the actual shared library/C examples and exercise React in Chromium. No model runs.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPilotPlan } from './prepare-design-pilot.mjs';
import { freshOutput, sha256, sourceInventory, writeReport } from './design-pilot/support.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
export const probeSources = Object.freeze([
  'scripts/test-design-pilot-library.mjs', 'scripts/design-pilot/support.mjs',
  'research/design-judgment/operator/library-probe.tsx',
]);
export const mutations = Object.freeze({ 'missing-height-override': 'target-size', 'missing-recipe': 'recipe-radius', 'missing-theme': 'brand-token' });
export const requiredChecks = Object.freeze(['target-size', 'recipe-radius', 'brand-token', 'responsive-containment',
  'error-relationship', 'controlled-input', 'keyboard-focus', 'busy-state', 'table-semantics']);
export function parseOptions(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (!args.length) return {};
  if (args.length === 2 && args[0] === '--output' && args[1] && !args[1].startsWith('--')) return { output: args[1] };
  throw new Error('Use --help or --output <new-directory>; no model, approval or candidate execution options exist');
}

export function summarize(runs) {
  const expected = ['desktop', 'mobile', ...Object.keys(mutations)].sort();
  const complete = JSON.stringify(runs.map(run => run.id).sort()) === JSON.stringify(expected);
  const valid = run => run.environment.length === 0 && Boolean(run.screenshot)
    && JSON.stringify([...run.executedChecks].sort()) === JSON.stringify([...requiredChecks].sort());
  const baseline = runs.filter(run => ['desktop', 'mobile'].includes(run.id));
  const detections = Object.entries(mutations).map(([id, check]) => {
    const run = runs.find(item => item.id === id);
    return { id, check, detected: Boolean(run && valid(run) && run.failedChecks.length === 1 && run.failedChecks[0] === check) };
  });
  return { status: complete && baseline.every(run => valid(run) && run.failedChecks.length === 0)
    && detections.every(item => item.detected) ? 'pass' : 'fail', complete, detections };
}

async function build(root, plan, fromDemo) {
  const save = (path, bytes) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: 'wx' }); };
  for (const [path, bytes] of Object.entries(plan.common)) if (path.startsWith('src/')) save(path, bytes);
  save('context/examples.tsx', plan.arms.C['context/examples.tsx']);
  save('operator/probe.tsx', readFileSync(join(repo, 'research/design-judgment/operator/library-probe.tsx')));
  // Build-time dependency reuse only, never a claimed isolated agent environment.
  symlinkSync(join(repo, 'demo-pricing/node_modules'), join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const ts = fromDemo('typescript');
  const sources = [...Object.keys(plan.common).filter(path => /^src\/ui\/.*\.tsx?$/u.test(path)), 'context/examples.tsx', 'operator/probe.tsx'];
  for (const path of sources) {
    const result = ts.transpileModule(readFileSync(join(root, path), 'utf8'), { fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
    } });
    save(path.replace(/\.tsx?$/u, '.js'), result.outputText);
  }
  const { webpack } = fromDemo('next/dist/compiled/webpack/webpack');
  await new Promise((done, reject) => {
    const compiler = webpack({ mode: 'production', context: root, entry: './operator/probe.js',
      output: { path: join(root, 'build'), filename: 'probe.js' }, devtool: false,
      resolve: { extensions: ['.js'], modules: [join(repo, 'demo-pricing/node_modules')] },
      optimization: { minimize: false }, cache: false,
    });
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError || stats?.hasErrors()) reject(error || closeError || new Error(stats.toString({ all: false, errors: true })));
      else done();
    }));
  });
  const postcss = fromDemo('postcss');
  const tailwind = fromDemo('@tailwindcss/postcss');
  const cssPath = join(root, 'src/app/globals.css');
  // Scan the actual common library plus C examples; the probe adds no component utility overrides.
  const css = await postcss([tailwind({ base: root })]).process(readFileSync(cssPath, 'utf8'), { from: cssPath });
  save('build/probe.css', css.css);
  return { javascript: readFileSync(join(root, 'build/probe.js')), css: css.css };
}

async function exercise(browser, origin, output, id) {
  const context = await browser.newContext({ viewport: { width: id === 'desktop' ? 1440 : 390, height: id === 'desktop' ? 900 : 844 }, serviceWorkers: 'block' });
  const result = { id, executedChecks: [], failedChecks: [], environment: [], measurements: null, screenshot: null };
  const page = await context.newPage();
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    result.environment.push('Off-origin request blocked'); return route.abort();
  });
  await context.routeWebSocket('**/*', socket => { result.environment.push('WebSocket blocked'); socket.close(); });
  page.on('popup', popup => { result.environment.push('Unexpected popup'); void popup.close(); });
  page.on('pageerror', error => result.environment.push(error.message));
  page.on('console', message => { if (message.type() === 'error') result.environment.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) result.environment.push(`HTTP ${response.status()}`); });
  const check = async (name, fn) => { result.executedChecks.push(name); try { await fn(); } catch (error) { result.failedChecks.push(name); result[name] = error.message; } };
  try {
    const response = await page.goto(`${origin}/?case=${id}`, { waitUntil: 'networkidle', timeout: 15000 });
    assert.equal(response.status(), 200);
    const input = page.getByRole('textbox', { name: 'Workspace name', exact: true });
    const button = page.getByRole('button', { name: 'Save settings', exact: true });
    await input.waitFor({ state: 'visible' });
    result.measurements = await page.evaluate(() => {
      const input = document.querySelector('#workspace-name');
      const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Save settings');
      const metrics = node => { const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height, radius: style.borderTopLeftRadius, background: style.backgroundColor }; };
      const brand = document.createElement('span'); brand.style.background = 'var(--brand)'; document.body.append(brand);
      const brandColor = getComputedStyle(brand).backgroundColor; brand.remove();
      return { input: metrics(input), button: metrics(button), brandColor,
        vendorInput: metrics(document.querySelector('[data-testid="vendor-input"]')),
        vendorButton: metrics(document.querySelector('[data-testid="vendor-button"]')),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    await check('target-size', () => { for (const item of [result.measurements.input, result.measurements.button]) assert.ok(item.height >= 44 && item.width >= 44); });
    await check('recipe-radius', () => { assert.equal(result.measurements.button.radius, '3px'); assert.equal(result.measurements.input.radius, '3px'); });
    await check('brand-token', () => { assert.equal(result.measurements.button.background, result.measurements.brandColor); assert.equal(result.measurements.brandColor, 'rgb(83, 58, 253)'); });
    await check('responsive-containment', () => assert.equal(result.measurements.overflow, false));
    await check('error-relationship', async () => { assert.equal(await input.getAttribute('aria-invalid'), 'true'); assert.equal(await input.getAttribute('aria-describedby'), 'workspace-name-error'); assert.equal(await page.getByRole('alert').innerText(), 'Example validation error'); });
    await check('controlled-input', async () => { await input.fill('Retained workspace'); assert.equal(await input.inputValue(), 'Retained workspace'); assert.equal(await input.getAttribute('aria-invalid'), 'false'); });
    await check('keyboard-focus', async () => { await input.focus(); await page.keyboard.press('Tab'); assert.equal(await button.evaluate(node => node === document.activeElement && node.matches(':focus-visible') && getComputedStyle(node).boxShadow !== 'none'), true); });
    await check('busy-state', async () => {
      await button.click(); const busy = page.getByRole('button', { name: 'Saving…', exact: true });
      assert.equal(await busy.isDisabled(), true); assert.equal(await busy.getAttribute('aria-busy'), 'true');
      await busy.evaluate(node => node.click()); assert.equal(await page.getByRole('status').innerText(), 'Save calls: 1');
      await page.getByRole('button', { name: 'Complete synthetic save' }).click(); await button.waitFor();
      assert.equal(await input.inputValue(), 'Retained workspace'); assert.equal(await button.isEnabled(), true);
    });
    await check('table-semantics', async () => { assert.equal(await page.getByRole('table', { name: 'Resource status' }).count(), 1); assert.equal(await page.getByRole('columnheader').count(), 2); assert.equal(await page.getByText('Paused', { exact: true }).count(), 1); });
    const path = `${id}.png`; await page.screenshot({ path: join(output, path), fullPage: true });
    result.screenshot = { path, sha256: sha256(readFileSync(join(output, path))) };
  } catch (error) { result.environment.push(error.message); }
  finally { await context.close(); }
  return result;
}

async function main(args) {
  const options = parseOptions(args);
  if (options.help) { console.log('Usage: node scripts/test-design-pilot-library.mjs [--output <new-directory>]\nOperator-only React/CSS compatibility probe. Requires installed locked demo dependencies and Chromium. No installs, candidate apps, model runs or approvals.'); return; }
  const fromDemo = createRequire(join(repo, 'demo-pricing/package.json'));
  const lock = JSON.parse(readFileSync(join(repo, 'demo-pricing/package-lock.json')));
  const versions = {};
  for (const name of ['react', 'react-dom', 'next', 'typescript', 'tailwindcss', '@tailwindcss/postcss', 'postcss', 'playwright', '@radix-ui/react-slot', '@radix-ui/react-label', 'class-variance-authority', 'clsx', 'tailwind-merge']) {
    const actual = JSON.parse(readFileSync(join(repo, 'demo-pricing/node_modules', name, 'package.json'))).version;
    assert.equal(actual, lock.packages[`node_modules/${name}`]?.version, `Dependency drift: ${name}`); versions[name] = actual;
  }
  const plan = buildPilotPlan(); const sources = sourceInventory(repo, probeSources);
  const output = freshOutput(repo, options.output); const root = join(output, 'fixture'); mkdirSync(root);
  const report = { schemaVersion: 1, status: 'incomplete', sourceRevision: plan.manifest.sourceRevision,
    checkoutDirty: plan.manifest.checkoutDirty, inputHash: plan.manifest.inputHash, sourceInventory: plan.manifest.sourceInventory,
    probeInventory: sources, versions: { node: process.version, ...versions }, runs: [], calibration: null, errors: [],
    scope: 'operator-only React examples and shared CSS; not the three-screen candidate evaluator',
    compatibilityApproval: 'NOT PERFORMED', agentRuns: 'NOT RUN', humanVisualReview: 'NOT PERFORMED', qualityImprovement: 'NOT ESTABLISHED', readyForAgentRuns: false,
    limits: ['Build-time node_modules are shared from the locked checkout; this is not agent isolation.',
      'Synthetic save controls are not an asynchronous backend or complete task flow.', 'Vendor defaults, contrast, and existing-system exceptions still require human review.'] };
  let server, browser;
  try {
    const built = await build(root, plan, fromDemo);
    report.build = { javascript: sha256(built.javascript), css: sha256(built.css) };
    server = createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname === '/probe.js') { response.writeHead(200, { 'content-type': 'text/javascript' }).end(built.javascript); return; }
      if (url.pathname !== '/') { response.writeHead(404).end(); return; }
      const mutation = url.searchParams.get('case');
      const defect = { 'missing-height-override': '.min-h-11{min-height:0!important}', 'missing-recipe': '[data-styleseed-recipe]{--ss-control-radius:0px}', 'missing-theme': ':root{--brand:initial}' }[mutation] ?? '';
      response.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Component integration probe</title><style>${built.css}\n${defect}</style></head><body><div id="root"></div><script src="/probe.js"></script></body></html>`);
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    browser = await fromDemo('playwright').chromium.launch({ headless: true }); report.versions.chromium = browser.version();
    for (const id of ['desktop', 'mobile', ...Object.keys(mutations)]) report.runs.push(await exercise(browser, `http://127.0.0.1:${server.address().port}`, output, id));
    report.calibration = summarize(report.runs); report.status = report.calibration.status;
  } catch (error) { report.errors.push(error.stack || error.message); report.status = 'fail'; }
  finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(done => server.close(done));
    try { assert.equal(buildPilotPlan().manifest.inputHash, report.inputHash); assert.deepEqual(sourceInventory(repo, probeSources), sources); }
    catch (error) { report.errors.push(`Inputs changed during probe: ${error.message}`); report.status = 'fail'; }
    writeReport(output, report);
  }
  console.log(JSON.stringify({ status: report.status, output, runs: report.runs.map(run => ({ id: run.id, failedChecks: run.failedChecks, environment: run.environment })), calibration: report.calibration, errors: report.errors, agentRuns: report.agentRuns, compatibilityApproval: report.compatibilityApproval }, null, 2));
  if (report.status !== 'pass') process.exitCode = 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
