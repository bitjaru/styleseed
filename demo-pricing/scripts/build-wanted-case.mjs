import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const project = resolve(repo, 'examples/wanted-design-case');
execFileSync(process.execPath, [
  resolve(repo, 'engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs'),
  '--project-root', project, '--all', '--agent', 'codex',
], { cwd: repo, stdio: 'inherit' });
execFileSync(process.execPath, [resolve(project, 'build.mjs')], { cwd: repo, stdio: 'inherit' });
const output = resolve(repo, 'demo-pricing/public/case-study/folio');
mkdirSync(output, { recursive: true });
for (const file of readdirSync(resolve(project, 'dist'))) {
  copyFileSync(resolve(project, 'dist', file), resolve(output, file));
}
console.log('Published the reproducible folio example to /case-study/folio/index.html');
