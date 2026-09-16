import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resolver = resolve(root, '../engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs');
const output = resolve(root, 'content/try-bundles.json');
const { input: paletteInput } = JSON.parse(readFileSync(resolve(root, 'content/site-docs-palette.json'), 'utf8'));

// A CLI deployment may contain only demo-pricing/. Ship the generated payload with it.
if (!existsSync(resolver)) {
  if (!existsSync(output)) throw new Error('Missing generated StyleSeed try bundles. Build from the repository first.');
  const data = JSON.parse(readFileSync(output, 'utf8'));
  for (const example of data.examples) for (const entry of Object.values(example.agents)) {
    const hash = createHash('sha256').update(entry.bundle).digest('hex');
    if (hash !== entry.sha256) throw new Error('StyleSeed try bundle integrity mismatch');
  }
  console.log('StyleSeed try: using integrity-checked generated bundles');
} else {
  const choices = [
    { id: 'work', label: '팀 운영 도구', caption: '빠르게 훑고, 필요한 설정을 바꾸는 화면', grammar: 'operations-console', domain: 'saas', recipe: 'enterprise-workbench', palette: 'cobalt-instrument' },
    { id: 'personal', label: '개인 생산성 앱', caption: '오늘 필요한 일에 편안하게 집중하는 화면', grammar: 'consumer-service', domain: 'productivity', recipe: 'calm-consumer', palette: 'quiet-mineral' },
  ];
  const temp = mkdtempSync(resolve(tmpdir(), 'styleseed-try-'));
  try {
    const examples = choices.map(choice => {
      const agents = {};
      for (const agent of ['codex', 'claude']) {
        const result = spawnSync(process.execPath, [resolver, '--project-root', temp,
          '--grammar', choice.grammar, '--adapter', 'product-ui', '--domain', choice.domain,
          '--page', 'settings', '--recipe', choice.recipe, '--palette', choice.palette,
          '--key-color', paletteInput.keyColor, '--palette-character', 'balanced', '--palette-mode', 'light',
          '--surface-temperature', 'neutral', '--profile', 'none', '--agent', agent], { encoding: 'utf8' });
        if (result.status !== 0) throw new Error(result.stderr || result.stdout);
        const bundle = readFileSync(resolve(temp, '.styleseed/effective-rules.md'), 'utf8');
        const manifest = JSON.parse(readFileSync(resolve(temp, '.styleseed/manifest.json'), 'utf8'));
        // Content provenance is hash-bound; a wall-clock field would make builds drift.
        delete manifest.generatedAt;
        agents[agent] = { bundle, sha256: createHash('sha256').update(bundle).digest('hex'), manifest };
      }
      return { ...choice, agents };
    });
    const first = examples[0].agents.codex.manifest;
    writeFileSync(output, JSON.stringify({ schemaVersion: 1, keyColor: paletteInput.keyColor, engineVersion: first.engineVersion,
      engineRevision: first.engineRevision, examples }, null, 2) + '\n');
    console.log('StyleSeed try: compiled 2 contexts × 2 agents from the canonical resolver');
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
