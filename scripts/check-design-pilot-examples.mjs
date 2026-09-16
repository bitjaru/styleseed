#!/usr/bin/env node
// Typecheck the prepared examples against actual copied APIs. Never install packages or run agents.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPilotPlan } from './prepare-design-pilot.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const fromDemo = createRequire(resolve(repo, 'demo-pricing/package.json'));
const ts = fromDemo('typescript'); // npm ci --prefix demo-pricing is an explicit prerequisite.
const modules = resolve(repo, 'demo-pricing/node_modules');
const temporary = mkdtempSync(join(tmpdir(), 'styleseed-pilot-api-'));
// The probe only ever compiles at this fixture path; test-design-pilot-library.mjs copies it there.
const probeSource = resolve(repo, 'research/design-judgment/operator/library-probe.tsx');
const probePath = 'operator/probe.tsx';
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
  const probe = stage(probePath, probeText);
  const options = {
    noEmit: true, strict: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: modules,
    types: ['react'], typeRoots: [join(modules, '@types')],
    paths: {
      react: [join(modules, '@types/react/index.d.ts')],
      'react/jsx-runtime': [join(modules, '@types/react/jsx-runtime.d.ts')],
      'react-dom/client': [join(modules, '@types/react-dom/client.d.ts')],
    },
  };
  const diagnostics = file => ts.getPreEmitDiagnostics(ts.createProgram([file], options));
  const format = entries => ts.formatDiagnosticsWithColorAndContext(entries, {
    getCanonicalFileName: name => name, getCurrentDirectory: () => temporary, getNewLine: () => '\n',
  });
  const actual = diagnostics(join(temporary, 'context/examples.tsx'));
  if (actual.length) throw new Error(format(actual));
  // The probe is the one pilot TSX the browser test compiles without type checking; gate it here
  // so a renamed Button/Input/example prop fails in this step, not as an opaque browser error.
  const probeDiagnostics = diagnostics(probe);
  if (probeDiagnostics.length) throw new Error(format(probeDiagnostics));
  const invalid = join(temporary, 'context/invalid.tsx');
  writeFileSync(invalid, 'import { Button } from "../src/ui/button";\nimport { Input } from "../src/ui/input";\nexport const wrongSize = <Button size="default" />;\nexport const wrongProp = <Input error="invalid" />;\n');
  const rejected = diagnostics(invalid).filter(entry => entry.code === 2322 && entry.file?.fileName === invalid);
  if (rejected.length !== 2) throw new Error('API typecheck did not reject both nonexistent props/variants');
  // Prove the probe gate is live: a renamed example prop in the real probe source must fail.
  const mutated = probeText.replace('<SaveAction saving={saving}', '<SaveAction pending={saving}');
  if (mutated === probeText) throw new Error(`Probe gate self-test is stale: ${probePath} no longer passes "saving" to SaveAction`);
  const probeInvalid = stage('operator/probe-invalid.tsx', mutated);
  if (!diagnostics(probeInvalid).some(entry => entry.file?.fileName === probeInvalid)) {
    throw new Error('Probe typecheck did not reject a renamed example prop');
  }
  console.log(`Pilot API examples and the operator probe verified with TypeScript ${ts.version}; three invalid API uses rejected. UI rendering/agent execution: NOT PERFORMED.`);
} finally {
  rmSync(temporary, { recursive: true, force: true }); // Only this invocation's mkdtemp directory.
}
