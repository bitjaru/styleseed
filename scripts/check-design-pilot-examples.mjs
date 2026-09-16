#!/usr/bin/env node
// Typecheck the prepared examples and the operator probe against actual copied APIs. Never install
// packages or run agents. Driven through the tsc CLI rather than the compiler's JS API: TypeScript 7
// is a native port whose package entry exports only `version`, so `createProgram` and friends are
// gone and their replacement is published under an `unstable/` subpath. The CLI is the contract that
// survived the major version, and it produces identical diagnostics on 5.9.3 and 7.0.2.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPilotPlan } from './prepare-design-pilot.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const fromDemo = createRequire(resolve(repo, 'demo-pricing/package.json'));
// npm ci --prefix demo-pricing is an explicit prerequisite.
const tsc = join(dirname(fromDemo.resolve('typescript/package.json')), 'bin/tsc');
const { version } = fromDemo('typescript/package.json');
const modules = resolve(repo, 'demo-pricing/node_modules');
const temporary = mkdtempSync(join(tmpdir(), 'styleseed-pilot-api-'));
// The probe only ever compiles at this fixture path; test-design-pilot-library.mjs copies it there.
const probeSource = resolve(repo, 'research/design-judgment/operator/library-probe.tsx');
const probePath = 'operator/probe.tsx';
const invalidProbePath = 'operator/probe-invalid.tsx';
const invalidExamplePath = 'context/invalid.tsx';
try {
  const stage = (path, content) => {
    const target = join(temporary, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };
  const plan = buildPilotPlan();
  for (const [path, content] of Object.entries(plan.arms.C)) {
    if (!path.startsWith('src/ui/') && path !== 'context/examples.tsx') continue;
    stage(path, content);
  }
  const probeText = readFileSync(probeSource, 'utf8');
  stage(probePath, probeText);
  stage(invalidExamplePath, 'import { Button } from "../src/ui/button";\nimport { Input } from "../src/ui/input";\nexport const wrongSize = <Button size="default" />;\nexport const wrongProp = <Input error="invalid" />;\n');
  // Prove the probe gate is live rather than trusting it: the real probe source with one example
  // prop renamed must be rejected, and the rename itself must still apply.
  const mutated = probeText.replace('<SaveAction saving={saving}', '<SaveAction pending={saving}');
  if (mutated === probeText) throw new Error(`Probe gate self-test is stale: ${probePath} no longer passes "saving" to SaveAction`);
  stage(invalidProbePath, mutated);

  // `baseUrl` was removed in TypeScript 7; the wildcard path mapping it recommends works in both.
  const compilerOptions = {
    noEmit: true, strict: true, skipLibCheck: true, jsx: 'react-jsx',
    target: 'es2022', module: 'esnext', moduleResolution: 'bundler',
    types: ['react'], typeRoots: [join(modules, '@types')],
    paths: {
      '*': [join(modules, '*')],
      react: [join(modules, '@types/react/index.d.ts')],
      'react/jsx-runtime': [join(modules, '@types/react/jsx-runtime.d.ts')],
      'react-dom/client': [join(modules, '@types/react-dom/client.d.ts')],
    },
  };
  const typecheck = (name, include) => {
    stage(name, `${JSON.stringify({ compilerOptions, include }, null, 2)}\n`);
    // 5.9 exits 2 and 7 exits 1 on diagnostics, so only zero/non-zero is portable.
    // Run from the fixture so diagnostics name files by the relative path used below.
    const result = spawnSync(process.execPath, [tsc, '--project', name, '--pretty', 'false'], { cwd: temporary, encoding: 'utf8' });
    if (result.error) throw result.error;
    return { failed: result.status !== 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  };

  const valid = typecheck('tsconfig.json', ['src/**/*', 'context/examples.tsx', probePath]);
  if (valid.failed) throw new Error(valid.output);
  const invalid = typecheck('tsconfig.invalid.json', ['src/**/*', 'context/examples.tsx', invalidExamplePath, invalidProbePath]);
  if (!invalid.failed) throw new Error('API typecheck accepted the nonexistent props/variants');
  const rejected = path => invalid.output.split('\n')
    .filter(line => line.replaceAll('\\', '/').startsWith(`${path}(`) && line.includes('error TS2322')).length;
  if (rejected(invalidExamplePath) !== 2) throw new Error(`API typecheck did not reject both nonexistent props/variants:\n${invalid.output}`);
  if (rejected(invalidProbePath) !== 1) throw new Error(`Probe typecheck did not reject a renamed example prop:\n${invalid.output}`);
  console.log(`Pilot API examples and the operator probe verified with TypeScript ${version}; three invalid API uses rejected. UI rendering/agent execution: NOT PERFORMED.`);
} finally {
  rmSync(temporary, { recursive: true, force: true }); // Only this invocation's mkdtemp directory.
}
