import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// WO-21: a project without a registry resolves the look its lock names. The resolver reads the lock's
// `Brand recipe` and `Palette recipe` lines under the names the lock's map gives them (`recipeSelection`,
// `paletteSelection`), which are also the names the bundle's "## Project design lock" section prints. The
// expected selections and messages below are written from the work order, not produced by the code under test.
const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolveDir = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve");
const resolver = resolve(resolveDir, "scripts/resolve-context.mjs");
const proposer = resolve(resolveDir, "scripts/propose-system.mjs");
const catalog = JSON.parse(readFileSync(resolve(resolveDir, "references/catalog.json"), "utf8"));
const RECIPE_IDS = Object.keys(catalog.recipes).join(", ");
const PALETTE_IDS = Object.keys(catalog.palettes).join(", ");

// A lock without a registry. `recipe` and `palette` are the two lines as written; undefined leaves a line out.
function lockText({ grammar = "consumer-service", recipe, palette } = {}) {
  return [
    "# StyleSeed — Design Lock",
    "- App domain: fintech",
    "- Surface adapter: product-ui",
    "- Page type: dashboard",
    `- Output grammar: ${grammar}`,
    ...(recipe === undefined ? [] : [`- Brand recipe: ${recipe}`]),
    ...(palette === undefined ? [] : [`- Palette recipe: ${palette}`]),
    "- Aesthetic profile: none",
    "",
  ].join("\n");
}

function withLock(lock, body, { lockPath = "STYLESEED.md" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "ss-lock-recipe-"));
  try {
    mkdirSync(resolve(root, lockPath, ".."), { recursive: true });
    writeFileSync(resolve(root, lockPath), lock);
    return body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const resolveIn = (root, extra = [], lockPath = "STYLESEED.md") => spawnSync(process.execPath, [resolver, "--project-root", root, "--from-lock", lockPath, "--agent", "claude", ...extra], { encoding: "utf8" });
const manifestOf = (root) => JSON.parse(readFileSync(resolve(root, ".styleseed/manifest.json"), "utf8"));
const bundleOf = (root) => readFileSync(resolve(root, ".styleseed/effective-rules.md"), "utf8");
const pair = (root) => { const { selection } = manifestOf(root); return `${selection.recipe} × ${selection.palette}`; };

function resolved(lock, extra = []) {
  return withLock(lock, (root) => {
    const result = resolveIn(root, extra);
    assert.equal(result.status, 0, result.stderr);
    return pair(root);
  });
}

// The bundle's header (before the first section) and its "## Project design lock" section, each as its two lines.
function recipeLines(bundle) {
  const header = bundle.slice(0, bundle.indexOf("\n---\n"));
  const lockAt = bundle.indexOf("## Project design lock\n");
  assert.ok(lockAt > 0, "the bundle has a project design lock section");
  const lockSection = bundle.slice(lockAt, bundle.indexOf("\n---\n", lockAt));
  const two = (text) => text.split("\n").filter((line) => /^- (Brand|Palette) recipe: /u.test(line));
  return { header: two(header), lock: two(lockSection) };
}

test("a lock's Brand recipe is the look: enterprise-workbench under consumer-service, and the bundle's lock section keeps both lines", () => {
  withLock(lockText({ recipe: "enterprise-workbench", palette: "quiet-mineral" }), (root) => {
    const result = resolveIn(root);
    assert.equal(result.status, 0, result.stderr);
    const { selection } = manifestOf(root);
    assert.deepEqual([selection.grammar, selection.recipe, selection.recipeSelection, selection.palette, selection.paletteSelection], ["consumer-service", "enterprise-workbench", "enterprise-workbench", "quiet-mineral", "quiet-mineral"]);
    const bundle = bundleOf(root);
    assert.ok(bundle.includes(catalog.recipes["enterprise-workbench"]), "the bundle carries enterprise-workbench's rules");
    assert.ok(!bundle.includes(catalog.recipes["calm-consumer"]), "and not the rules of consumer-service's automatic recipe");
    const lines = recipeLines(bundle);
    assert.deepEqual(lines.lock, ["- Brand recipe: enterprise-workbench", "- Palette recipe: quiet-mineral"], "the lock section prints the two lines as the lock wrote them");
    assert.deepEqual(lines.header, lines.lock, "and they equal the selection lines at the top of the bundle");
  });
});

test("a lock's Palette recipe is the palette, also one the recipe does not get automatically", () => {
  for (const recipe of ["calm-consumer", undefined]) {
    withLock(lockText({ recipe, palette: "signal-coral" }), (root) => {
      const result = resolveIn(root);
      assert.equal(result.status, 0, result.stderr);
      const { selection } = manifestOf(root);
      assert.deepEqual([selection.recipe, selection.palette, selection.paletteSelection], ["calm-consumer", "signal-coral", "signal-coral"], `Brand recipe: ${recipe ?? "(no line)"}`);
      const bundle = bundleOf(root);
      assert.ok(bundle.includes(catalog.palettes["signal-coral"]), "the bundle carries signal-coral's palette section");
      assert.ok(!bundle.includes(catalog.palettes["quiet-mineral"]), "and not calm-consumer's automatic palette");
    });
  }
});

test("a non-automatic recipe with no palette line, or Palette recipe: auto, gets that recipe's automatic palette", () => {
  assert.equal(resolved(lockText({ recipe: "enterprise-workbench" })), "enterprise-workbench × cobalt-instrument");
  assert.equal(resolved(lockText({ recipe: "enterprise-workbench", palette: "auto" })), "enterprise-workbench × cobalt-instrument");
  assert.equal(resolved(lockText({ recipe: "public-service" })), "public-service × civic-blue");
});

test("auto in any letter case, and a missing line, is the automatic look; the same for the palette", () => {
  for (const recipe of ["auto", "Auto", "AUTO", undefined]) {
    assert.equal(resolved(lockText({ recipe, palette: "auto" })), "calm-consumer × quiet-mineral", `Brand recipe: ${recipe ?? "(no line)"}`);
  }
  for (const palette of ["auto", "Auto", "AUTO", undefined]) {
    assert.equal(resolved(lockText({ recipe: "enterprise-workbench", palette })), "enterprise-workbench × cobalt-instrument", `Palette recipe: ${palette ?? "(no line)"}`);
  }
  assert.equal(resolved(lockText({ grammar: "operations-console", recipe: "Auto", palette: "Auto" })), "enterprise-workbench × cobalt-instrument", "auto follows the grammar");
});

test("native-mobile, which no grammar gets automatically, resolves from a lock", () => {
  withLock(lockText({ recipe: "native-mobile" }), (root) => {
    const result = resolveIn(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(pair(root), "native-mobile × quiet-mineral");
    assert.ok(bundleOf(root).includes(catalog.recipes["native-mobile"]));
  });
});

test("each command-line argument outranks its own lock line and nothing else", () => {
  const named = lockText({ grammar: "operations-console", recipe: "enterprise-workbench", palette: "cobalt-instrument" });
  assert.equal(resolved(named, ["--recipe", "public-service"]), "public-service × cobalt-instrument", "--recipe leaves the lock's palette line in force");
  assert.equal(resolved(lockText({ grammar: "operations-console", recipe: "enterprise-workbench", palette: "auto" }), ["--recipe", "public-service"]), "public-service × civic-blue", "with the palette line auto, the resolved recipe's automatic palette");
  assert.equal(resolved(lockText({ grammar: "operations-console", recipe: "enterprise-workbench" }), ["--recipe", "public-service"]), "public-service × civic-blue", "with no palette line, the same");
  assert.equal(resolved(named, ["--palette", "signal-coral"]), "enterprise-workbench × signal-coral", "--palette leaves the lock's recipe line in force");
  assert.equal(resolved(lockText({ recipe: "auto", palette: "cobalt-instrument" }), ["--palette", "signal-coral"]), "calm-consumer × signal-coral", "with the recipe line auto, the grammar's automatic recipe");
  assert.equal(resolved(lockText({ recipe: "native-mobile", palette: "signal-coral" }), ["--recipe", "auto", "--palette", "auto"]), "calm-consumer × quiet-mineral", "auto on the command line outranks both lines");
});

test("a value that is not a recipe or a palette is refused with its exact message and exit 1, before anything is written", () => {
  const cases = [
    [lockText({ recipe: "no-such-look", palette: "auto" }), [], `STYLESEED.md: "Brand recipe: no-such-look" is not a brand recipe. Use auto or one of: ${RECIPE_IDS}.`],
    [lockText({ recipe: "Enterprise-Workbench" }), [], `STYLESEED.md: "Brand recipe: Enterprise-Workbench" is not a brand recipe. Use auto or one of: ${RECIPE_IDS}.`],
    [lockText({ recipe: "enterprise-workbench", palette: "no-such-palette" }), [], `STYLESEED.md: "Palette recipe: no-such-palette" is not a palette recipe. Use auto or one of: ${PALETTE_IDS}.`],
    [lockText({ recipe: "Auto", palette: "Quiet-Mineral" }), [], `STYLESEED.md: "Palette recipe: Quiet-Mineral" is not a palette recipe. Use auto or one of: ${PALETTE_IDS}.`],
    [lockText({ recipe: "enterprise-workbench" }), ["--recipe", "no-such-look"], `--recipe no-such-look is not a brand recipe. Use auto or one of: ${RECIPE_IDS}.`],
    [lockText({ recipe: "no-such-look" }), ["--recipe", "no-such-look-either"], `--recipe no-such-look-either is not a brand recipe. Use auto or one of: ${RECIPE_IDS}.`],
    [lockText({ recipe: "enterprise-workbench" }), ["--palette", "no-such-palette"], `--palette no-such-palette is not a palette recipe. Use auto or one of: ${PALETTE_IDS}.`],
  ];
  for (const [lock, extra, message] of cases) {
    withLock(lock, (root) => {
      const result = resolveIn(root, extra);
      assert.equal(result.status, 1, `${message}\n${result.stderr}`);
      assert.ok(result.stderr.split(/\r?\n/u).includes(`Error: ${message}`), `expected "${message}" in\n${result.stderr}`);
      assert.ok(!existsSync(resolve(root, ".styleseed")), "nothing is written");
    });
  }
  // The lock's path as given.
  withLock(lockText({ recipe: "no-such-look" }), (root) => {
    const result = resolveIn(root, [], "design/STYLESEED.md");
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.split(/\r?\n/u).includes(`Error: design/STYLESEED.md: "Brand recipe: no-such-look" is not a brand recipe. Use auto or one of: ${RECIPE_IDS}.`), result.stderr);
  }, { lockPath: "design/STYLESEED.md" });
});

test("a project resolved before the fix whose lock names another look: --check exits 2 until the next resolve", () => {
  withLock(lockText({ recipe: "enterprise-workbench", palette: "auto" }), (root) => {
    // The resolver before WO-21 ignored the lock's two lines and built consumer-service's automatic look. The
    // same files are written by naming that look on the command line beside the same lock (checked once
    // against the earlier resolver: byte for byte, but for the manifest's `generatedAt`).
    let result = resolveIn(root, ["--recipe", "calm-consumer", "--palette", "quiet-mineral"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(pair(root), "calm-consumer × quiet-mineral");
    result = resolveIn(root, ["--check"]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /^StyleSeed context drift: manifest outputs mismatch for \.styleseed\/effective-rules\.md/mu);
    result = resolveIn(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(pair(root), "enterprise-workbench × cobalt-instrument");
    result = resolveIn(root, ["--check"]);
    assert.equal(result.status, 0, result.stderr);
  });
});

test("a registry project does not read a lock's recipe lines: its outputs are byte for byte the same with and without one", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-lock-recipe-registry-"));
  try {
    mkdirSync(resolve(root, ".styleseed/artifacts"), { recursive: true });
    writeFileSync(resolve(root, ".styleseed/project.json"), `${JSON.stringify({
      schemaVersion: 1,
      projectId: "registry-lock-test",
      defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
      brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first" },
    }, null, 2)}\n`);
    writeFileSync(resolve(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "app-dashboard", config: "app-dashboard.json" }] }, null, 2)}\n`);
    writeFileSync(resolve(root, ".styleseed/artifacts/app-dashboard.json"), `${JSON.stringify({
      schemaVersion: 1,
      id: "app-dashboard",
      target: { kind: "route", locator: "/dashboard" },
      selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: "Which incident needs action now?", primaryAction: "Open incident", signatureMove: "Keep the selected incident visible." },
      implementation: { sourceRoots: ["src"], tokenFiles: [] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    }, null, 2)}\n`);
    const compile = () => {
      const result = spawnSync(process.execPath, [resolver, "--project-root", root, "--all", "--agent", "codex"], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      const out = {};
      const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else out[relative(root, path).split("\\").join("/")] = readFileSync(path, "utf8"); } };
      walk(resolve(root, ".styleseed"));
      return out;
    };
    const without = compile();
    writeFileSync(resolve(root, "STYLESEED.md"), lockText({ grammar: "operations-console", recipe: "native-mobile", palette: "signal-coral" }));
    assert.deepEqual(compile(), without);
    assert.equal(JSON.parse(without[".styleseed/manifests/app-dashboard.json"]).selection.recipe, "enterprise-workbench");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the proposer reads the lock's recipe after a resolve: its engine default for control heights is enterprise-workbench's family", () => {
  withLock(lockText({ recipe: "enterprise-workbench", palette: "quiet-mineral" }), (root) => {
    const result = resolveIn(root);
    assert.equal(result.status, 0, result.stderr);
    const proposal = spawnSync(process.execPath, [proposer, "--project-root", root, "--surface", "pointer", "--json"], { encoding: "utf8" });
    assert.equal(proposal.status, 0, proposal.stderr);
    const heights = JSON.parse(proposal.stdout).axes.find((axis) => axis.axis === "controlHeights");
    const option = heights.options.find((entry) => entry.basis === "engine-default");
    assert.deepEqual([option.values, option.source], [[24, 28, 32, 36, 40, 48], "engine-default:recipe.enterprise-workbench (not measured)"]);
  });
});
