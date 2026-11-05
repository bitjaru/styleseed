import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const engineRoot = resolve(repoRoot, "engine");
// Rule documents may scope a recipe ("Scope: consumer-service"); they may not declare a recipe
// universal. DESIGN-LANGUAGE.md:6 says the consumer-service recipes are defaults for that context,
// and §18 names the binding prohibitions. Absolute wording elsewhere contradicts both.
const ABSOLUTE = /absolute rule|\bno exceptions?\b|without exceptions?\b|universal law/giu;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "components" ? [] : walk(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

test("rule documents scope their recipes instead of declaring them universal", () => {
  const hits = [];
  for (const file of walk(engineRoot)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (/not universal laws/u.test(line)) return; // the caveat that states the policy
      for (const match of line.matchAll(ABSOLUTE)) hits.push(`${relative(repoRoot, file)}:${index + 1} "${match[0]}"`);
    });
  }
  assert.deepEqual(hits, [], `Absolute wording in rule documents; scope the recipe instead:\n${hits.join("\n")}`);
});

test("the consumer-service card and selection recipes carry an explicit scope", () => {
  const text = readFileSync(resolve(engineRoot, "DESIGN-LANGUAGE.md"), "utf8");
  const section = (heading) => {
    const start = text.indexOf(heading);
    assert.notEqual(start, -1, `missing heading ${heading}`);
    const next = text.indexOf("\n## ", start + 1);
    return text.slice(start, next === -1 ? undefined : next);
  };
  assert.match(section("## 10. Selection UI Rules"), /Scope: the `consumer-service` mobile card recipe/u);
  assert.match(section("## 14. Four Section Types"), /Scope: `consumer-service` dashboards/u);
  const methodology = readFileSync(resolve(engineRoot, "METHODOLOGY.md"), "utf8");
  assert.match(methodology, /## Application priority — example: a consumer-service dashboard\n\nOne worked schedule[\s\S]*not the default for every\nsurface/u);
});
