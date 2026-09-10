#!/usr/bin/env node
// Offline preparation only. No model execution, install, human approval, or quality scoring.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeArtifact, normalizeProject } from '../engine/.claude/skills/ss-resolve/scripts/runtime-contract.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const study = 'research/design-judgment';
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const inventory = files => Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  .map(([path, content]) => ({ path, sha256: hash(content), bytes: Buffer.byteLength(content) }));
const within = (parent, child) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
};

function registryInputs() {
  const project = {
    schemaVersion: 1, projectId: 'resource-pilot-rehearsal',
    defaults: { agent: 'codex', domain: 'saas', adapter: 'product-ui', recipe: 'enterprise-workbench', palette: 'cobalt-instrument', profile: 'none', fallback: 'operations-console' },
    brand: { keyColor: '#533AFD', paletteCharacter: 'balanced', paletteMode: 'light', paletteHarmony: 'auto', surfaceTemperature: 'cool', fontFamilies: ['system-ui'], radius: 'restrained', elevation: 'flat', density: 'comfortable', motion: { seed: 'snap', intensity: 'restrained' }, imageryRole: 'product-proof-first' },
  };
  const definitions = [
    ['resource-list', 'list', '/resources', 'Which resources need attention?', 'Review selected resources'],
    ['resource-detail', 'detail', '/resources/res-102', 'What happened to this resource?', 'Return to resource list'],
    ['settings', 'settings', '/settings', 'Are workspace changes safe to save?', 'Save settings'],
  ];
  const files = {
    '.styleseed/project.json': json(project),
    '.styleseed/artifacts/index.json': json({ schemaVersion: 1, artifacts: definitions.map(([id]) => ({ id, config: `${id}.json` })) }),
  };
  for (const [id, page, locator, primaryDecision, primaryAction] of definitions) {
    files[`.styleseed/artifacts/${id}.json`] = json({
      schemaVersion: 1, id, target: { kind: 'route', locator },
      selection: { grammar: 'operations-console', adapter: null, domain: null, page, recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision, primaryAction, signatureMove: 'Preserve resource context across connected tasks.' },
      implementation: { sourceRoots: ['src/app', 'src/ui', 'src/styles', 'fixture', 'package.json', 'package-lock.json', 'postcss.config.mjs'], tokenFiles: ['src/styles/theme.css', 'src/styles/recipes.css'] },
      validation: {
        scoreFloor: 80,
        requiredRenders: [
          { id: 'desktop-loaded', state: 'loaded', viewport: { width: 1440, height: 900 } },
          { id: 'mobile-loaded', state: 'loaded', viewport: { width: 390, height: 844 } },
          { id: 'mobile-reduced-motion', state: 'reduced-motion', viewport: { width: 390, height: 844 } },
        ],
        temporal: { required: false, scenarios: [] }, humanAcceptance: true,
      },
    });
  }
  return files;
}

export function buildPilotPlan(root = repo) {
  root = realpathSync(root);
  const inputs = {};
  function read(path) {
    const target = resolve(root, path);
    if (!within(root, target)) throw new Error(`Input escapes repository: ${path}`);
    let cursor = root;
    for (const part of relative(root, target).split(sep)) {
      cursor = join(cursor, part);
      if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Input is a symlink: ${path}`);
    }
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Input is not a regular unlinked file: ${path}`);
    const bytes = readFileSync(target);
    inputs[path] = bytes;
    return bytes;
  }
  read('scripts/prepare-design-pilot.mjs');
  const common = { 'TASK.md': read(`${study}/common/TASK.md`), 'LICENSE': read('LICENSE') };
  for (const name of ['fixtures.json', 'model.mjs', 'model.test.mjs']) common[`fixture/${name}`] = read(`${study}/common/${name}`);
  for (const name of ['button.tsx', 'input.tsx', 'label.tsx', 'table.tsx', 'badge.tsx', 'utils.ts']) {
    common[`src/ui/${name}`] = read(`engine/components/ui/${name}`);
  }
  common['src/styles/theme.css'] = read('skins/stripe/theme.css');
  common['src/styles/recipes.css'] = read('engine/css/recipes.css');
  common['src/app/globals.css'] = '@import "tailwindcss";\n@import "../styles/theme.css";\n@import "../styles/recipes.css";\n@source "../ui";\nbody { font-family: system-ui, sans-serif; }\n';
  common['postcss.config.mjs'] = 'export default { plugins: { "@tailwindcss/postcss": {} } };\n';
  const sourcePackage = JSON.parse(read('demo-pricing/package.json'));
  const lock = JSON.parse(read('demo-pricing/package-lock.json'));
  // Preserve the locked graph and root dependency declarations; remove all demo lifecycle scripts.
  const appPackage = {
    name: 'design-judgment-pilot', version: '0.0.0', private: true,
    scripts: { 'test:contract': 'node --test fixture/model.test.mjs', dev: 'next dev --hostname 127.0.0.1', build: 'next build', start: 'next start --hostname 127.0.0.1' },
    dependencies: sourcePackage.dependencies, devDependencies: sourcePackage.devDependencies,
  };
  for (const field of ['dependencies', 'devDependencies']) {
    if (json(sourcePackage[field]) !== json(lock.packages[''][field])) throw new Error(`Dependency lock drift: ${field}`);
  }
  lock.name = appPackage.name;
  lock.version = appPackage.version;
  lock.packages[''] = { ...lock.packages[''], name: appPackage.name, version: appPackage.version };
  common['package.json'] = json(appPackage);
  common['package-lock.json'] = json(lock);

  const skillFiles = {};
  const skillPrefix = 'engine/.claude/skills/';
  skillFiles['.agents/skills/ss-resolve/references/catalog.json'] = read(`${skillPrefix}ss-resolve/references/catalog.json`);
  const catalog = JSON.parse(skillFiles['.agents/skills/ss-resolve/references/catalog.json']);
  for (const entry of catalog.distributions.skills.files) {
    validateOutputPath(entry.path);
    if (!entry.path.startsWith(skillPrefix)) throw new Error(`Non-skill inventory path: ${entry.path}`);
    const bytes = read(entry.path);
    if (!bytes || hash(bytes).slice(7) !== entry.sha256.replace(/^sha256:/u, '') || bytes.length !== entry.bytes) {
      throw new Error(`Stale skill inventory: ${entry.path}; regenerate catalogs first`);
    }
    skillFiles[`.agents/skills/${entry.path.slice(skillPrefix.length)}`] = bytes;
  }
  const contract = read(`${study}/contexts/component-contract.md`);
  const examples = read(`${study}/contexts/examples.tsx`);
  const plan = read(`${study}/contexts/plan.md`);
  const operator = {
    'review.json': read(`${study}/operator/review.json`),
    'followup.md': read(`${study}/operator/followup.md`),
  };
  const registry = registryInputs();
  const project = normalizeProject(JSON.parse(registry['.styleseed/project.json']), catalog);
  const index = JSON.parse(registry['.styleseed/artifacts/index.json']);
  const artifacts = index.artifacts.map(({ config }) => JSON.parse(registry[`.styleseed/artifacts/${config}`]));
  for (const artifact of artifacts) normalizeArtifact(artifact, project, catalog);
  common['DESIGN-INPUTS.json'] = json({ status: 'provisional-not-expert-approved', project, artifacts });
  const arms = {};
  for (const id of ['A', 'B', 'C', 'D']) {
    const files = { ...common };
    let prompt = 'Complete TASK.md using this workspace only. Do not inspect sibling conditions, operator materials, or previous results. Report unsupported requirements and verification limits.\n';
    if (id !== 'A') {
      Object.assign(files, skillFiles, registry);
      prompt += 'Use the installed StyleSeed skills and the artifact registry. Preserve the existing library/theme; provisional resolver settings do not approve replacing them.\n';
    }
    if (id === 'C' || id === 'D') {
      files['context/component-contract.md'] = contract;
      files['context/examples.tsx'] = examples;
      prompt += 'Read context/component-contract.md and context/examples.tsx for task-specific implementation context.\n';
    }
    if (id === 'D') {
      files['context/plan.md'] = plan;
      prompt += 'Follow context/plan.md before implementation; count planning in the same total budget.\n';
    }
    files['PROMPT.md'] = prompt;
    arms[id] = files;
  }
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000 });
    if (result.status !== 0) throw new Error(`Cannot record checkout provenance: ${result.stderr}`);
    return result.stdout.trim();
  };
  const sourceInventory = inventory(inputs);
  const manifest = {
    schemaVersion: 1, preparation: 'prepared-inputs-only', readyForAgentRuns: false,
    track: 'synthetic-existing-library-rehearsal', sourceRevision: git(['rev-parse', 'HEAD']),
    checkoutDirty: git(['status', '--porcelain', '--untracked-files=all']).length > 0,
    engineVersion: catalog.engineVersion, engineRevision: catalog.engineRevision,
    inputHash: hash(json(sourceInventory)), sourceInventory,
    commonHash: hash(json(inventory(common))),
    arms: Object.fromEntries(Object.entries(arms).map(([id, files]) => [id, { hash: hash(json(inventory(files))), files: inventory(files) }])),
    operatorFiles: inventory(operator),
    agentRuns: 'NOT RUN', functionalUiVerification: 'NOT PERFORMED', humanVisualReview: 'NOT PERFORMED', qualityImprovement: 'NOT ESTABLISHED',
    pending: [
      'Named experts must approve task, rubric, library and compatibility exceptions.',
      'Freeze model/version, tool access, isolated runtime, repetitions, retries, token/time/spend limits and explicit execution authorization.',
      'Run API example typechecking and dependency/build checks in the frozen runtime; preparation does not install packages.',
      'Approve full UI-state/browser acceptance checks; model unit tests and provisional artifact render lists are not the UI evaluator.',
      'Isolate each condition from siblings, operator data, global skills, previous sessions and network leakage before model execution.',
      'Randomize and blind actual review outputs separately; A/B/C/D directory labels are not blinded evidence.',
    ],
  };
  return { manifest, common, arms, operator };
}

export function writePilot(plan, { output, repoRoot = repo } = {}) {
  for (const [id, files] of Object.entries(plan.arms)) {
    if (!['A', 'B', 'C', 'D'].includes(id)) throw new Error('Invalid condition ID');
    for (const path of Object.keys(files)) validateOutputPath(path);
  }
  for (const path of Object.keys(plan.operator)) validateOutputPath(path);
  let destination;
  if (output) {
    const proposed = resolve(output);
    destination = join(realpathSync(dirname(proposed)), basename(proposed));
    if (within(realpathSync(repoRoot), destination)) throw new Error('Prepared conditions must be outside the source checkout');
    mkdirSync(destination, { mode: 0o700 }); // exclusive; an existing path, including a symlink, is refused
  } else {
    const temporaryParent = realpathSync(tmpdir());
    if (within(realpathSync(repoRoot), temporaryParent)) throw new Error('Temporary directory must be outside the source checkout');
    destination = mkdtempSync(join(temporaryParent, 'styleseed-design-pilot-'));
  }
  const save = (path, content) => {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
  };
  // Partial failures remain inspectable but cannot be confused with a completed freeze manifest.
  for (const [id, files] of Object.entries(plan.arms)) {
    for (const [path, content] of Object.entries(files)) save(join(destination, 'arms', id, path), content);
  }
  for (const [path, content] of Object.entries(plan.operator)) save(join(destination, 'operator', path), content);
  save(join(destination, 'operator/freeze.json'), json(plan.manifest));
  return destination;
}

function validateOutputPath(path) {
  if (!path || path.includes('\\') || path.includes('\0') || isAbsolute(path) || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe prepared path: ${path}`);
  }
}

function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/prepare-design-pilot.mjs [--check | --prepare [--output <new-directory>]]\nOffline preparation only. No model, dependency install, UI build, or approval is executed.');
    return;
  }
  const check = args.length === 0 || (args.length === 1 && args[0] === '--check');
  const prepare = args[0] === '--prepare' && (args.length === 1 || (args.length === 3 && args[1] === '--output' && args[2] && !args[2].startsWith('--')));
  if (!check && !prepare) throw new Error('Unsupported arguments; use --help. There is no --run or approval flag.');
  const plan = buildPilotPlan();
  const output = prepare ? writePilot(plan, { output: args[2] }) : null;
  console.log(json({ status: prepare ? 'prepared' : 'inputs-checked', readyForAgentRuns: false, inputHash: plan.manifest.inputHash,
    sourceRevision: plan.manifest.sourceRevision, checkoutDirty: plan.manifest.checkoutDirty, output, pending: plan.manifest.pending }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
