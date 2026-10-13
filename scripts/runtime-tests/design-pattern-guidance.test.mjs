// Instruction regressions and real resolver output, not an LLM or visual-quality benchmark.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const resolver = resolve(root, "engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs");
const catalog = JSON.parse(read("engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json"));

test("historical shape quotas and unsupported claims do not return through handbook or score examples", () => {
  const sources = [
    "engine/DESIGN-LANGUAGE.md", "engine/VISUAL-CRAFT.md", "engine/CLAUDE.md",
    "engine/CRAFT-BASELINE.md", "engine/BRAND-RECIPES.md", "engine/PAGE-TYPES.md",
    "engine/APP-PLAYBOOKS.md", "engine/METHODOLOGY.md", "engine/PRODUCT-PRINCIPLES.md",
    "engine/AGENTS.md", "engine/.cursorrules",
    ...["ss-build", "ss-score", "ss-review", "ss-page", "ss-dial", "ss-copy", "ss-verify"].map((id) => `engine/.claude/skills/styleseed/workflows/${id}/WORKFLOW.md`),
  ];
  // Deliberately narrow historical directives; this is not a general natural-language linter.
  const regressions = [
    /never repeat (?:the )?same section type twice in a row/iu,
    /never make all 4 KPI cards identical/iu,
    /still vary: 2 with trend %, 1 with progress/iu,
    /Reject:\*\* identical KPI cards/iu,
    /Always Hero \+ KPI Grid/u,
    /at least 4 sections|Minimum 4 sections per dashboard/u,
    /Border XOR shadow|3–6 `box-shadow`s/u,
    /wider copy gets skipped ~41%/u,
    /stack everything/u,
    /two identical KPI rows|default fade, not a named seed/u,
    /Section types alternate \(no two identical types in a row\)/u,
    /page background white or near-white/u,
    /NEVER pick a font size that's not in this table/u,
    /Establish one focal point; avoid equal-weight template grids/u,
    /does ONE element actually dominate|count the hues you actually SEE/u,
    /One focal point per screen and a clear information hierarchy/u,
  ];
  for (const path of sources) for (const obsolete of regressions) {
    assert.doesNotMatch(read(path), obsolete, `${path}: historical directive ${obsolete}`);
  }
});

test("all individually extracted domain playbooks retain their applicability condition", () => {
  assert.equal(Object.keys(catalog.domains).length, 12);
  for (const [domain, text] of Object.entries(catalog.domains)) {
    assert.match(text, /\*\*Apply to:\*\*/u, domain);
    assert.match(text, /contextual starting points; preserve approved project roles/u, domain);
  }
});

const cases = [
  ["comparable operations", "operations-console", "enterprise-workbench", "saas", "dashboard", /comparable monitoring regions remain coordinated/u],
  ["same finance brand, public proposition", "expressive-marketing", "expressive-brand", "fintech", "landing", /Image-led, type-led, editorial, and demonstration-led/u],
  ["same finance domain, working queue", "operations-console", "enterprise-workbench", "fintech", "list", /finance operations queue needs operational density/u],
  ["personal finance summary", "consumer-service", "calm-consumer", "fintech", "dashboard", /personal summary may lead with a metric/u],
  ["editorial reading", "editorial-reading", "editorial-authority", "content", "detail", /Serif body and warm paper can fit/u],
  ["consequential form", "institutional-service", "public-service", "health", "form", /public-service forms use flat sections/u],
];

for (const [label, grammar, recipe, domain, page, taskClause] of cases) {
  test(`resolved ${label} preserves variation, task requirements, and core floors`, (t) => {
    const project = mkdtempSync(join(tmpdir(), "styleseed-pattern-guidance-"));
    t.after(() => rmSync(project, { recursive: true, force: true }));
    const run = spawnSync(process.execPath, [resolver, "--project-root", project,
      "--agent", "codex", "--grammar", grammar, "--recipe", recipe,
      "--domain", domain, "--page", page, "--adapter", "product-ui", "--stdout"],
    { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, taskClause);
    assert.match(run.stdout, /Equivalent information keeps equivalent\s+presentation/u);
    assert.match(run.stdout, /deltas need real baselines and sparklines need actual series/u);
    assert.match(run.stdout, /within each decision region/u);
    assert.match(run.stdout, /no universal hero, brightest CTA, section count, or chart quota/u);
    assert.match(run.stdout, /Focus is visible, controls have names, and keyboard order/u);
    assert.match(run.stdout, /complete reduced-motion result/u);
    assert.match(run.stdout, /Errors name the problem and recovery and never rely on color alone/u);
    assert.doesNotMatch(run.stdout, /Reject:\*\* identical KPI cards|CTA is the single brightest element|6 accent colors in a chart legend/u);
  });
}

test("key-color overrides preserve semantic color gates without reintroducing area quotas", (t) => {
  const project = mkdtempSync(join(tmpdir(), "styleseed-color-guidance-"));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  for (const agent of ["codex", "claude"]) {
    const run = spawnSync(process.execPath, [resolver, "--project-root", project,
      "--agent", agent, "--grammar", "consumer-service", "--recipe", "calm-consumer",
      "--domain", "fintech", "--page", "dashboard", "--adapter", "product-ui",
      "--palette", "quiet-mineral", "--key-color", "#0F766E"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const bundle = readFileSync(join(project, ".styleseed/effective-rules.md"), "utf8");
    const palette = JSON.parse(readFileSync(join(project, ".styleseed/palette.json"), "utf8"));
    assert.match(bundle, /Allocation follows the task and approved color roles/u);
    assert.doesNotMatch(bundle, /60% canvas|at most 10%|below ten percent/u);
    assert.doesNotMatch(JSON.stringify(palette.decisions.allocation), /\d+%/u);
    assert.equal(palette.input.keyColor, "#0F766E");
    assert.equal(palette.valid, true);
    assert.ok(palette.contrast.length > 0 && palette.contrast.every((pair) => pair.pass));
    const check = spawnSync(process.execPath, [resolver, "--project-root", project,
      "--agent", agent, "--grammar", "consumer-service", "--recipe", "calm-consumer",
      "--domain", "fintech", "--page", "dashboard", "--adapter", "product-ui",
      "--palette", "quiet-mineral", "--key-color", "#0F766E", "--check"], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stderr || check.stdout);
  }
});

test("reference compilation keeps observation limits and alternatives rather than promoting preview aesthetics", () => {
  const compiler = read("engine/REFERENCE-COMPILER.md");
  assert.match(compiler, /Deduplicate the\s+same project across galleries/u);
  assert.match(compiler, /measured, estimated, or unknown/u);
  assert.match(compiler, /applicability\/task/u);
  assert.match(compiler, /at least two valid variants of a decision plus a failure case/u);
  assert.match(compiler, /text-safe area[\s\S]*fallback/u);
  assert.match(compiler, /explicit human approval\s+before activating the grammar/u);
  const score = read("engine/.claude/skills/styleseed/workflows/ss-score/WORKFLOW.md");
  assert.match(score, /approved project fade or instant state change can be valid/u);
  assert.match(score, /temporal claims require observed interaction/u);
  assert.match(score, /a default example is not a floor/u);
});
