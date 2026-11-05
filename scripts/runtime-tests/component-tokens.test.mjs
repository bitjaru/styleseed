import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const componentsRoot = resolve(repoRoot, "engine/components");
const HEX_COLOR = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/giu;
const HEX_NON_COLOR_CONTEXT = /(?:\b(?:href|id|for|name|target|form|list|xlink:href|aria-[a-z-]+|data-[a-z-]+)\s*=\s*["'{]?|url\(\s*["']?)$/iu;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("engine components consume semantic tokens, never hardcoded hex colours", () => {
  const offenders = [];
  for (const file of walk(componentsRoot).filter((path) => /\.(?:ts|tsx)$/u.test(path))) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(HEX_COLOR)) {
      const index = match.index ?? 0;
      if (HEX_NON_COLOR_CONTEXT.test(content.slice(Math.max(0, index - 32), index))) continue;
      offenders.push(`${relative(repoRoot, file)}:${content.slice(0, index).split("\n").length} ${match[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `Hardcoded colours in engine components (use a semantic token or a CSS variable):\n${offenders.join("\n")}`);
});
