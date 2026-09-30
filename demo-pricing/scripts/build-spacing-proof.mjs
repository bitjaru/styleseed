import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spacingCss } from '../../engine/.claude/skills/ss-resolve/scripts/spacing-contract.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = 'engine/.claude/skills/ss-resolve/scripts/spacing-contract.mjs';
const parent = { wideMinWidth: 900, roles: { sectionGap: { base: 64 } } };
const child = { wideMinWidth: 900, roles: { componentInset: { base: 16 } } };
const beforeCss = '[data-styleseed-artifact="proof-parent"] { --ss-space-section-gap:64px; } [data-styleseed-artifact="proof-child"] { --ss-space-component-inset:16px; }';
const afterCss = `${spacingCss(child, 'proof-child')}\n${spacingCss(parent, 'proof-parent')}`;
const output = { schemaVersion: 1, kind: 'synthetic-css-regression', source,
  sourceSha256: createHash('sha256').update(readFileSync(resolve(root, source))).digest('hex'),
  nativeGap: 12, parentGap: 64, expected: { before: 64, after: 12 }, beforeCss, afterCss };
const serialized = `${JSON.stringify(output, null, 2)}\n`;
writeFileSync(resolve(root, 'demo-pricing/content/spacing-proof.json'), serialized);
console.log('Spacing proof: generated nested-artifact fixture from canonical CSS generator');
