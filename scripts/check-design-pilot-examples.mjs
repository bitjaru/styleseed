#!/usr/bin/env node
// Typecheck the prepared examples against actual copied APIs. Never install packages or run agents.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPilotPlan } from './prepare-design-pilot.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const fromDemo = createRequire(resolve(repo, 'demo-pricing/package.json'));
const ts = fromDemo('typescript'); // npm ci --prefix demo-pricing is an explicit prerequisite.
const modules = resolve(repo, 'demo-pricing/node_modules');
const temporary = mkdtempSync(join(tmpdir(), 'styleseed-pilot-api-'));
try {
  const plan = buildPilotPlan();
  for (const [path, content] of Object.entries(plan.arms.C)) {
    if (!path.startsWith('src/ui/') && path !== 'context/examples.tsx') continue;
    const target = join(temporary, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const options = {
    noEmit: true, strict: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: modules,
    types: ['react'], typeRoots: [join(modules, '@types')],
    paths: {
      react: [join(modules, '@types/react/index.d.ts')],
      'react/jsx-runtime': [join(modules, '@types/react/jsx-runtime.d.ts')],
    },
  };
  const diagnostics = file => ts.getPreEmitDiagnostics(ts.createProgram([file], options));
  const actual = diagnostics(join(temporary, 'context/examples.tsx'));
  if (actual.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(actual, {
    getCanonicalFileName: name => name, getCurrentDirectory: () => temporary, getNewLine: () => '\n',
  }));
  const invalid = join(temporary, 'context/invalid.tsx');
  writeFileSync(invalid, 'import { Button } from "../src/ui/button";\nimport { Input } from "../src/ui/input";\nexport const wrongSize = <Button size="default" />;\nexport const wrongProp = <Input error="invalid" />;\n');
  const rejected = diagnostics(invalid).filter(entry => entry.code === 2322 && entry.file?.fileName === invalid);
  if (rejected.length !== 2) throw new Error('API typecheck did not reject both nonexistent props/variants');
  console.log(`Pilot API examples verified with TypeScript ${ts.version}; two invalid API uses rejected. UI rendering/agent execution: NOT PERFORMED.`);
} finally {
  rmSync(temporary, { recursive: true, force: true }); // Only this invocation's mkdtemp directory.
}
