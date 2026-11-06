#!/usr/bin/env node
// Check a DTCG (2025.10) token file for the layering a working designer builds:
//   primitive → semantic (fg / bg / bd × emphasis) → type roles → components
// Only primitives hold literal values. Semantic tokens alias primitives; component tokens alias
// semantic tokens. Every alias must resolve, without cycles, to a token of the same type.
//
// The checker itself lives in the installed resolver (token-canon.mjs) so the same rules run on a
// project's imported token canon; this script keeps the repository entry point and the sample.
//
//   node scripts/check-token-layers.mjs [path/to/tokens.json]   (default: research/tokens/naming-sample.tokens.json)
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTokenLayers, flatten } from "../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/token-canon.mjs";

export { checkTokenLayers, flatten };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(root, "research/tokens/naming-sample.tokens.json");

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  const { problems, counts } = checkTokenLayers(doc);
  if (problems.length) {
    console.error(`token layers: ${problems.length} problem(s) in ${file}`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`token layers: ${counts.total} tokens valid (${counts.primitive} primitive · ${counts.semantic} semantic · ${counts.type} type · ${counts.component} component)`);
}
