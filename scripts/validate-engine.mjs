import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("../", import.meta.url).pathname);
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

const version = read("engine/VERSION").trim();
const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
const publicVersion = JSON.parse(read("demo-pricing/public/version.json"));
assert(plugin.version === version, `plugin version ${plugin.version} != ${version}`);
assert(publicVersion.version === version, `public version ${publicVersion.version} != ${version}`);

const skillsDir = resolve(root, "engine/.claude/skills");
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("ss-") && existsSync(resolve(skillsDir, entry.name, "SKILL.md")));
assert(skills.length === 22, `expected 22 canonical skills, found ${skills.length}`);
assert(publicVersion.skills === skills.length, `version.json skills ${publicVersion.skills} != ${skills.length}`);
assert(skills.some((entry) => entry.name === "ss-reference"), "ss-reference is missing");
assert(skills.some((entry) => entry.name === "ss-resolve"), "ss-resolve is missing");
assert(skills.some((entry) => entry.name === "ss-studio"), "ss-studio is missing");

const bridge = resolve(root, ".agents/skills");
assert(existsSync(bridge) && lstatSync(bridge).isSymbolicLink(), ".agents/skills must be the canonical symlink");

for (const file of ["PRODUCT-PRINCIPLES.md", "CRAFT-BASELINE.md", "RULESETS.md", "ADAPTERS.md", "BRAND-RECIPES.md", "PALETTE-RECIPES.md", "STUDIO-PIPELINE.md", "PRESETS.md", "REFERENCE-COMPILER.md", "ARCHITECTURE.md"]) {
  assert(existsSync(resolve(root, "engine", file)), `missing engine/${file}`);
}

const grammarText = read("engine/RULESETS.md");
const grammarIds = [...grammarText.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1]);
assert(grammarIds.length === 8, `expected 8 output grammars, found ${grammarIds.length}: ${grammarIds.join(", ")}`);
assert(publicVersion.grammars === grammarIds.length, `version.json grammars ${publicVersion.grammars} != ${grammarIds.length}`);

const adapterText = read("engine/ADAPTERS.md");
const adapterIds = [...adapterText.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
assert(adapterIds.length === 5, `expected 5 adapters, found ${adapterIds.length}`);
assert(publicVersion.adapters === adapterIds.length, `version.json adapters ${publicVersion.adapters} != ${adapterIds.length}`);

const recipeText = read("engine/BRAND-RECIPES.md");
const recipeIds = [...recipeText.matchAll(/^## `([^`]+)`/gm)].map((match) => match[1]);
assert(recipeIds.length === 9, `expected 9 brand recipes, found ${recipeIds.length}: ${recipeIds.join(", ")}`);
assert(publicVersion.recipes === recipeIds.length, `version.json recipes ${publicVersion.recipes} != ${recipeIds.length}`);

const paletteRecipes = JSON.parse(read("engine/color/palettes.json"));
assert(paletteRecipes.length === 8, `expected 8 palette recipes, found ${paletteRecipes.length}`);
assert(publicVersion.palettes === paletteRecipes.length, `version.json palettes ${publicVersion.palettes} != ${paletteRecipes.length}`);

const build = read("engine/.claude/skills/ss-build/SKILL.md");
assert(build.includes("/ss-score") && build.includes("/ss-verify"), "ss-build must require score and verify");
assert(build.indexOf("/ss-score") < build.lastIndexOf("/ss-verify"), "ss-build must run score before verify");
assert(build.includes(".styleseed/effective-rules.md"), "ss-build must consume compiled context");
assert(!build.includes("Read and combine in authority order"), "ss-build must not hand-compose the full handbook");

const score = read("engine/.claude/skills/ss-score/SKILL.md");
assert(score.includes("eight weighted categories"), "ss-score category count text drifted");
const weights = [...score.matchAll(/^\| \*\*[^|]+\*\* \| (\d+) \|/gm)].map((match) => Number(match[1]));
assert(weights.reduce((sum, value) => sum + value, 0) === 100, `ss-score weights sum to ${weights.reduce((a, b) => a + b, 0)}`);

const coreFiles = [
  "engine/PRODUCT-PRINCIPLES.md", "engine/RULESETS.md", "engine/ADAPTERS.md",
  "engine/CLAUDE.md", "engine/AGENTS.md", "engine/.cursorrules",
  "engine/.claude/skills/ss-setup/SKILL.md", "engine/.claude/skills/ss-build/SKILL.md",
  "engine/.claude/skills/ss-score/SKILL.md", "engine/.claude/skills/ss-verify/SKILL.md",
];
for (const path of coreFiles) {
  const text = read(path);
  for (const forbidden of ["Palette mode", "brand-palette", "lock-relative", "#721FE5"]) {
    assert(!text.includes(forbidden), `${path} contains stale law: ${forbidden}`);
  }
}

const catalog = JSON.parse(read("engine/.claude/skills/ss-resolve/references/catalog.json"));
assert(catalog.engineVersion === version, `context catalog ${catalog.engineVersion} != ${version}`);
assert(Object.keys(catalog.grammars).length === 8, "context catalog grammar count drifted");
assert(Object.keys(catalog.adapters).length === 5, "context catalog adapter count drifted");
assert(Object.keys(catalog.domains).length === 12, "context catalog domain count drifted");
assert(Object.keys(catalog.pages).length === 7, "context catalog page count drifted");
assert(Object.keys(catalog.recipes).length === 9, "context catalog recipe count drifted");
assert(Object.keys(catalog.palettes).length === 8, "context catalog palette count drifted");
assert(Object.keys(catalog.profiles).length === 6, "context catalog profile count drifted");
const publicCatalog = JSON.parse(read("demo-pricing/public/.well-known/styleseed/context-catalog.json"));
assert(JSON.stringify(publicCatalog) === JSON.stringify(catalog), "public context catalog differs from canonical catalog");
const registry = JSON.parse(read("demo-pricing/public/.well-known/styleseed/registry.json"));
assert(registry.version === "5", `expected registry v5, found ${registry.version}`);
assert(registry.counts.skills === skills.length, "registry skill count drifted");
assert(registry.counts.grammars === 8 && registry.counts.adapters === 5 && registry.counts.recipes === 9 && registry.counts.palettes === 8, "registry context counts drifted");
assert(registry.recipes.length === 9, "registry recipe manifest drifted");
assert(registry.palettes.length === 8, "registry palette manifest drifted");
const llms = read("demo-pricing/public/llms.txt");
assert(llms.includes("invoke `/ss-studio` or `$ss-studio`") && llms.includes("`/ss-resolve` or `$ss-resolve` directly"), "llms.txt does not route through Studio and ss-resolve");
assert(llms.includes("archive/debug mirror, not the"), "llms.txt must demote llms-full to archive/debug");

const smokeRoot = mkdtempSync(join(tmpdir(), "styleseed-resolve-"));
try {
  writeFileSync(
    resolve(smokeRoot, "STYLESEED.md"),
    `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Brand recipe: enterprise-workbench
- Palette recipe: auto
- Aesthetic profile: swiss
- Primary action: #0F766E
`,
  );
  const resolver = resolve(root, "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs");
  const run = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex"], { encoding: "utf8" });
  assert(run.status === 0, `ss-resolve smoke failed: ${run.stderr || run.stdout}`);
  if (run.status === 0) {
    const manifest = JSON.parse(readFileSync(resolve(smokeRoot, ".styleseed/manifest.json"), "utf8"));
    assert(manifest.selection.grammar === "operations-console", "resolver selected the wrong grammar");
    assert(manifest.selection.recipe === "enterprise-workbench", "resolver selected the wrong recipe");
    assert(manifest.selection.palette === "cobalt-instrument", "resolver selected the wrong palette");
    assert(manifest.bundle.bytes >= 5000 && manifest.bundle.bytes <= 30000, `resolver bundle is ${manifest.bundle.bytes} bytes`);
    assert(/^[0-9a-f]{64}$/.test(manifest.bundle.sha256), "resolver bundle hash is invalid");
    const check = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--check"], { encoding: "utf8" });
    assert(check.status === 0, `ss-resolve hash check failed: ${check.stderr || check.stdout}`);
    writeFileSync(resolve(smokeRoot, "STYLESEED.md"), readFileSync(resolve(smokeRoot, "STYLESEED.md"), "utf8").replace("#0F766E", "#C14E24"));
    const drift = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--check"], { encoding: "utf8" });
    assert(drift.status === 2, `ss-resolve must exit 2 on drift, got ${drift.status}`);
    const invalid = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--grammar", "unknown-grammar"], { encoding: "utf8" });
    assert(invalid.status !== 0, "ss-resolve must reject an unknown grammar");

    const referenceDir = resolve(smokeRoot, ".styleseed/rulesets/reference-smoke");
    mkdirSync(referenceDir, { recursive: true });
    writeFileSync(resolve(referenceDir, "RULESET.md"), "# Reference smoke grammar\n\n- Signature: asymmetric evidence rail.");
    writeFileSync(resolve(referenceDir, "checks.md"), "# Checks\n\n- The evidence rail survives transfer.");
    writeFileSync(
      resolve(smokeRoot, "STYLESEED.md"),
      `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: reference:reference-smoke
- Grammar fallback: operations-console
- Brand recipe: auto
- Palette recipe: auto
- Aesthetic profile: none
`,
    );
    const referenceRun = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" });
    assert(referenceRun.status === 0, `reference grammar resolve failed: ${referenceRun.stderr || referenceRun.stdout}`);
    if (referenceRun.status === 0) {
      const referenceBundle = readFileSync(resolve(smokeRoot, ".styleseed/effective-rules.md"), "utf8");
      const referenceManifest = JSON.parse(readFileSync(resolve(smokeRoot, ".styleseed/manifest.json"), "utf8"));
      assert(referenceBundle.includes("operations-console"), "reference bundle must include its maintained fallback");
      assert(referenceBundle.includes("asymmetric evidence rail"), "reference bundle omitted the local grammar");
      assert(referenceBundle.includes("evidence rail survives transfer"), "reference bundle omitted local checks");
      assert(referenceManifest.selection.grammarSource === "project:.styleseed/rulesets/reference-smoke/RULESET.md", "reference grammar provenance drifted");
    }
  }
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}

const studioRoot = mkdtempSync(join(tmpdir(), "styleseed-studio-"));
try {
  const studio = resolve(root, "engine/.claude/skills/ss-studio/scripts/studio-run.mjs");
  const init = spawnSync(process.execPath, [studio, "init", "--project-root", studioRoot, "--name", "Focus OS", "--brief", "Create a mobile focus product where selecting a priority task transforms navigation into a reversible session controller with reduced-motion support.", "--surface", "mobile-app", "--platform", "web"], { encoding: "utf8" });
  assert(init.status === 0, `ss-studio init failed: ${init.stderr || init.stdout}`);
  if (init.status === 0) {
    const runId = "focus-os";
    const runDir = resolve(studioRoot, ".styleseed/studio", runId);
    writeFileSync(resolve(runDir, "references.json"), JSON.stringify({ items: [{ id: "r1", role: "navigation", source: "local:verified-sample", observedAt: "2026-08-03", observation: "Navigation separates persistent product chrome from a task canvas.", principle: "Transform one persistent navigation object instead of replacing the whole screen.", confidence: "high", rights: "Structural principle only; no protected assets." }] }, null, 2));
    const baseDirection = { promise: "Preserve task context through a reversible focus transition.", grammar: "consumer-service", recipe: "native-mobile", palette: "quiet-mineral", composition: "Task-first single focal field", navigationChrome: "Chrome contrasts with the content canvas", typeAndMaterial: "Large task headline and quiet supporting type", assetDirection: "Low-detail ambient field with no baked UI", motionDirection: "Shared-object continuity with direct reduced-motion swap", signatureMove: "Task card becomes the focus controller", cost: "medium", risk: "Requires careful back-state continuity", tradeoffs: ["Less simultaneous task visibility"] };
    writeFileSync(resolve(runDir, "directions.json"), JSON.stringify({ directions: [
      { ...baseDirection, id: "quiet-utility", lane: "native", name: "Quiet utility" },
      { ...baseDirection, id: "orbit-dock", lane: "signature", name: "Orbit dock", recipe: "creative-professional", palette: "deep-lime-studio" },
      { ...baseDirection, id: "spatial-signal", lane: "experimental", name: "Spatial signal", recipe: "expressive-brand", palette: "signal-coral" },
    ] }, null, 2));
    const directed = spawnSync(process.execPath, [studio, "advance", "--project-root", studioRoot, "--run", runId, "--stage", "directed"], { encoding: "utf8" });
    assert(directed.status === 0, `ss-studio direction contract failed: ${directed.stderr || directed.stdout}`);
    const selection = spawnSync(process.execPath, [studio, "select", "--project-root", studioRoot, "--run", runId, "--direction", "orbit-dock", "--by", "validator", "--rationale", "Exercises the highest-value signature interaction without hiding the task context."], { encoding: "utf8" });
    assert(selection.status === 0, `ss-studio selection contract failed: ${selection.stderr || selection.stdout}`);
    writeFileSync(resolve(runDir, "scenes.json"), JSON.stringify({ scenes: [{ id: "focus-transform", trigger: "Tap priority task", from: "task list", to: "focus controller", continuity: ["task title", "duration", "dock"], enter: ["timer"], exit: ["secondary tasks"], feedback: "Immediate selected state", interrupt: "Back returns to the same task", reducedMotion: "Direct state swap and focus handoff", rendererTargets: ["mobile web"] }] }, null, 2));
    writeFileSync(resolve(runDir, "assets.json"), JSON.stringify({ jobs: [{ id: "ambient-field", role: "background material", kind: "raster", capability: "raster-generate", provider: "runtime-selected", prompt: "Low-luminance ambient field, no text or interface", inputs: [], status: "planned", provenance: "prompt stored with run", rights: "Generate original material", fallback: "CSS radial field", consumingScene: "focus-transform" }] }, null, 2));
    writeFileSync(resolve(runDir, "video.json"), JSON.stringify({ mode: "prototype-first", shots: [{ id: "working-scene", sourceType: "prototype-recording", duration: 4.2, source: "pending build" }] }, null, 2));
    const planned = spawnSync(process.execPath, [studio, "advance", "--project-root", studioRoot, "--run", runId, "--stage", "planned"], { encoding: "utf8" });
    assert(planned.status === 0, `ss-studio plan contract failed: ${planned.stderr || planned.stdout}`);
    const media = spawnSync(process.execPath, [studio, "media", "--project-root", studioRoot, "--run", runId, "--job", "ambient-field", "--status", "complete", "--provider", "fixture-generator", "--output", "assets/generated/ambient-field.png", "--provenance", "deterministic validator fixture"], { encoding: "utf8" });
    assert(media.status === 0, `ss-studio media update failed: ${media.stderr || media.stdout}`);
    const prototype = spawnSync(process.execPath, [studio, "output", "--project-root", studioRoot, "--run", runId, "--prototype", "http://localhost:4176/studio"], { encoding: "utf8" });
    assert(prototype.status === 0, `ss-studio prototype output failed: ${prototype.stderr || prototype.stdout}`);
    const built = spawnSync(process.execPath, [studio, "advance", "--project-root", studioRoot, "--run", runId, "--stage", "built"], { encoding: "utf8" });
    assert(built.status === 0, `ss-studio built contract failed: ${built.stderr || built.stdout}`);
    const recording = spawnSync(process.execPath, [studio, "output", "--project-root", studioRoot, "--run", runId, "--recording", "evidence/recordings/focus.webm"], { encoding: "utf8" });
    assert(recording.status === 0, `ss-studio recording output failed: ${recording.stderr || recording.stdout}`);
    for (const gate of ["code", "visual", "temporal"]) {
      const result = spawnSync(process.execPath, [studio, "gate", "--project-root", studioRoot, "--run", runId, "--gate", gate, "--status", "pass", "--evidence", `evidence/${gate}.json`, "--note", `${gate} validator fixture`], { encoding: "utf8" });
      assert(result.status === 0, `ss-studio ${gate} gate update failed: ${result.stderr || result.stdout}`);
    }
    const human = spawnSync(process.execPath, [studio, "gate", "--project-root", studioRoot, "--run", runId, "--gate", "human", "--status", "pass", "--reviewer", "validator fixture", "--evidence", "evidence/human.json", "--note", "synthetic acceptance for schema validation only"], { encoding: "utf8" });
    assert(human.status === 0, `ss-studio human gate update failed: ${human.stderr || human.stdout}`);
    const verified = spawnSync(process.execPath, [studio, "advance", "--project-root", studioRoot, "--run", runId, "--stage", "verified"], { encoding: "utf8" });
    assert(verified.status === 0, `ss-studio verified contract failed: ${verified.stderr || verified.stdout}`);
  }
} finally {
  rmSync(studioRoot, { recursive: true, force: true });
}

for (const path of ["README.md", "README-KR.md", "demo-pricing/app/_home/hero.tsx", "demo-pricing/app/page.tsx"]) {
  assert(read(path).includes("22"), `${path} does not expose the 22-skill release`);
}

if (failures.length) {
  console.error(`StyleSeed engine validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`StyleSeed ${version}: 8 grammars · 9 recipes · 8 palettes · 5 adapters · 22 skills · Studio + context compiler verified`);
