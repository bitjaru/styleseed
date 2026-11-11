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

const designLanguage = () => readFileSync(resolve(engineRoot, "DESIGN-LANGUAGE.md"), "utf8");
const paragraphs = (text) => text.split(/\n\s*\n/u);

test("no handbook recommends transition-all and no engine component uses it (detector SS003)", () => {
  const hits = [];
  for (const file of walk(engineRoot)) {
    for (const block of paragraphs(readFileSync(file, "utf8"))) {
      if (!block.includes("transition-all")) continue;
      if (!block.includes("SS003")) hits.push(`${relative(repoRoot, file)}: mentions transition-all without naming detector SS003: ${JSON.stringify(block.slice(0, 120))}`);
      for (const line of block.split("\n")) if (/className=.*\btransition-all\b/u.test(line)) hits.push(`${relative(repoRoot, file)}: example uses transition-all: ${line.trim()}`);
    }
  }
  const components = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return components(path);
    return /\.(tsx|ts|css)$/u.test(path) ? [path] : [];
  });
  for (const file of components(resolve(engineRoot, "components"))) {
    readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      if (/\btransition-all\b/u.test(line)) hits.push(`${relative(repoRoot, file)}:${index + 1} uses transition-all; name the transitioned properties`);
    });
  }
  assert.deepEqual(hits, [], hits.join("\n"));
});

test("the table of contents agrees with §10 and §12", () => {
  const text = designLanguage();
  const row = (number) => text.split("\n").find((line) => line.startsWith(`| ${number} | [`));
  assert.match(row(10), /consumer-service/u, "the §10 contents line names the consumer-service scope its section states");
  assert.doesNotMatch(row(10), /Pill toggle only|no dropdowns/u, "§10 scopes the pill toggle to consumer-service cards; the contents line may not make it universal");
  const range = text.match(/\*\*Opacity is very low\*\* \((\d+-\d+)%\)/u)?.[1];
  assert.ok(range, "§12 states its opacity range as **Opacity is very low** (N-M%)");
  assert.match(row(12), new RegExp(`Opacity ${range}%`, "u"), `the §12 contents line states the section's range ${range}%`);
});

test("workflows do not describe the deterministic detectors as warning-only (SS005 and SS006 block)", () => {
  const hits = [];
  for (const file of walk(resolve(engineRoot, ".claude/skills"))) {
    readFileSync(file, "utf8").split("\n").forEach((line, index) => {
      if (/warning-only|remains? warnings/iu.test(line)) hits.push(`${relative(repoRoot, file)}:${index + 1} ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, [], `Detectors take their catalog rule's priority; SS005 and SS006 block:\n${hits.join("\n")}`);
});
