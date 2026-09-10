#!/usr/bin/env node
// Functional evaluator calibration only; never a benchmark or autonomous design-quality claim.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startCalibrationServer, mutations } from './design-pilot/calibration-server.mjs';
import { runAcceptance, viewports } from './design-pilot/browser.mjs';
import { checkBrowserBoundaries } from './design-pilot/boundary-checks.mjs';
import { scenarios } from './design-pilot/scenarios.mjs';
import { freshOutput, localOrigin, sha256, sourceInventory, writeReport } from './design-pilot/support.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
export const evaluatorSources = Object.freeze([
  'scripts/test-design-pilot-browser.mjs', 'scripts/design-pilot/browser.mjs', 'scripts/design-pilot/scenarios.mjs',
  'scripts/design-pilot/support.mjs', 'scripts/design-pilot/calibration-server.mjs', 'scripts/design-pilot/boundary-checks.mjs',
  'research/design-judgment/operator/calibration/index.html', 'research/design-judgment/operator/calibration/app.mjs',
  'research/design-judgment/common/BROWSER-CONTRACT.md', 'research/design-judgment/common/TASK.md',
  'research/design-judgment/common/model.mjs', 'research/design-judgment/common/fixtures.json', 'demo-pricing/package-lock.json',
]);

export function parseOptions(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const options = { mode: 'calibration' };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error(`Duplicate option: ${arg}`);
    seen.add(arg);
    if (arg === '--calibrate') continue;
    if (!['--url', '--output'].includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Unsupported or missing option: ${arg}`);
    options[arg.slice(2)] = args[++index];
  }
  if (options.url) {
    if (seen.has('--calibrate')) throw new Error('Choose calibration or candidate URL, not both');
    options.url = localOrigin(options.url); options.mode = 'candidate';
  }
  return options;
}

export function summarizeCalibration(baseline, mutationRuns) {
  const expected = viewports.flatMap(viewport => scenarios.filter(scenario => !scenario.reducedOnly || viewport.reducedMotion === 'reduce')
    .map(scenario => `${viewport.id}/${scenario.id}`)).sort();
  const actual = baseline.cases.map(result => `${result.viewport}/${result.id}`).sort();
  const complete = JSON.stringify(expected) === JSON.stringify(actual);
  const baselinePassed = complete && baseline.status === 'pass' && baseline.cases.every(result => result.status === 'pass' && !result.assertion && !result.environment.length && result.screenshot);
  const required = Object.keys(mutations).sort();
  const supplied = mutationRuns.map(run => run.label).sort();
  const detections = required.map(name => {
    const run = mutationRuns.find(item => item.label === name);
    const result = run?.cases[0];
    const detected = run?.status === 'fail' && run.cases.length === 1 && result.id === mutations[name]
      && result.status === 'fail' && Boolean(result.assertion) && !result.environment.length && Boolean(result.screenshot);
    return { mutation: name, scenario: mutations[name], detected: Boolean(detected) };
  });
  return {
    status: baselinePassed && JSON.stringify(required) === JSON.stringify(supplied) && detections.every(item => item.detected) ? 'pass' : 'fail',
    complete, expectedCases: expected.length, passedCases: baseline.cases.filter(item => item.status === 'pass').length,
    requiredMutations: required.length, detectedMutations: detections.filter(item => item.detected).length, detections,
  };
}

async function main(args) {
  const options = parseOptions(args);
  if (options.help) {
    console.log('Usage: node scripts/test-design-pilot-browser.mjs [--calibrate | --url http://127.0.0.1:<port>] [--output <new-directory>]\nRuns real Chromium functional checks, or calibrates them on a DOM test double and intentional defects. Never runs models, installs packages, approves quality, or launches candidate code.');
    return;
  }
  const require = createRequire(new URL('../demo-pricing/package.json', import.meta.url));
  const locked = JSON.parse(readFileSync(new URL('../demo-pricing/package-lock.json', import.meta.url))).packages['node_modules/playwright'].version;
  const installed = require('playwright/package.json').version;
  if (installed !== locked) throw new Error(`Playwright dependency drift (${installed} != ${locked}); run npm ci --prefix demo-pricing first`);
  const { chromium } = require('playwright');
  const sources = sourceInventory(repo, evaluatorSources);
  const git = args => {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 10000 });
    if (result.status !== 0) throw new Error('Cannot record evaluator source provenance');
    return result.stdout.trim();
  };
  const output = freshOutput(repo, options.output);
  const report = {
    schemaVersion: 1, mode: options.mode, status: 'incomplete', sourceRevision: git(['rev-parse', 'HEAD']),
    checkoutDirty: Boolean(git(['status', '--porcelain', '--untracked-files=all'])),
    evaluatorHash: sha256(JSON.stringify(sources)), sourceInventory: sources,
    versions: { node: process.version, playwright: installed, chromium: null },
    runs: [], calibration: null, boundaries: null, errors: [], sourceBinding: options.mode === 'calibration' ? 'operator-test-double-only' : 'NOT BOUND TO CANDIDATE SOURCE',
    agentRuns: 'NOT RUN', humanVisualReview: 'NOT PERFORMED', qualityImprovement: 'NOT ESTABLISHED', readyForAgentRuns: false,
    limits: ['DOM simulator is not a React/library adoption trial.', 'Browser checks are not expert quality scores or a complete accessibility/security audit.',
      'Candidate code is never launched or installed by this runner.', 'No source-bound StyleSeed gate acceptance or human approval is created.'],
  };
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    report.versions.chromium = browser.version();
    if (options.mode === 'candidate') {
      const run = await runAcceptance({ browser, baseUrl: options.url, output, label: 'candidate' });
      report.runs.push(run); report.status = run.status;
    } else {
      const server = await startCalibrationServer();
      try { report.runs.push(await runAcceptance({ browser, baseUrl: server.origin, output, label: 'baseline' })); }
      finally { await server.close(); }
      for (const [mutation, scenarioId] of Object.entries(mutations)) {
        const server = await startCalibrationServer({ mutation });
        try {
          report.runs.push(await runAcceptance({ browser, baseUrl: server.origin, output, label: mutation,
            selectedScenarios: scenarios.filter(item => item.id === scenarioId),
            selectedViewports: [viewports.find(item => item.id === (scenarioId === 'reduced-motion' ? 'mobile-reduced' : 'mobile'))] }));
        } finally { await server.close(); }
      }
      report.calibration = summarizeCalibration(report.runs[0], report.runs.slice(1));
      report.boundaries = await checkBrowserBoundaries(browser, output);
      report.status = report.calibration.status === 'pass' && report.boundaries.status === 'pass' ? 'pass' : 'fail';
    }
  } catch (error) { report.errors.push(error.stack || error.message); report.status = 'fail'; }
  finally {
    if (browser) await browser.close();
    try {
      if (sha256(JSON.stringify(sourceInventory(repo, evaluatorSources))) !== report.evaluatorHash) {
        report.errors.push('Evaluator inputs changed during the browser run; results cannot be frozen.');
        report.status = 'fail';
      }
    } catch (error) { report.errors.push(error.message); report.status = 'fail'; }
    writeReport(output, report);
  }
  console.log(JSON.stringify({ status: report.status, mode: report.mode, output, calibration: report.calibration, boundaries: report.boundaries?.status,
    agentRuns: report.agentRuns, qualityImprovement: report.qualityImprovement }, null, 2));
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
