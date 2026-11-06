import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const scripts = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/scripts");
const resolver = resolve(scripts, "resolve-context.mjs");
const preview = resolve(scripts, "import-tokens.mjs");
const doctor = resolve(scripts, "styleseed-doctor.mjs");

const run = (script, root, args = []) => spawnSync(process.execPath, [script, "--project-root", root, ...args], { encoding: "utf8" });
const json = (root, path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const hexes = (text) => [...text.matchAll(/#[0-9A-Fa-f]{6}\b/gu)].map((match) => match[0].toUpperCase());

function writeProject(root, { tokens, format = "dtcg", source = "design/tokens.json" } = {}) {
  mkdirSync(join(root, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(join(root, "design"), { recursive: true });
  mkdirSync(join(root, "src/settings"), { recursive: true });
  writeFileSync(join(root, ".styleseed/project.json"), `${JSON.stringify({
    schemaVersion: 1,
    projectId: "byo-tokens",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: {
      keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool",
      fontFamilies: ["Pretendard"], radius: "soft", elevation: "restrained-shadow", density: "comfortable",
      motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first",
    },
    ...(tokens === undefined ? {} : { tokens: { source, format, ...tokens } }),
  }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/index.json"), `${JSON.stringify({ schemaVersion: 1, artifacts: [{ id: "settings", config: "settings.json" }] }, null, 2)}\n`);
  writeFileSync(join(root, ".styleseed/artifacts/settings.json"), `${JSON.stringify({
    schemaVersion: 1, id: "settings", target: { kind: "route", locator: "/settings" },
    selection: { grammar: "operations-console", adapter: null, domain: null, page: "form", recipe: null, palette: null, profile: null, fallback: null },
    decisions: { primaryDecision: "Which setting changes?", primaryAction: "Save", signatureMove: "Keep the form stable." },
    implementation: { sourceRoots: ["src/settings"], tokenFiles: [source] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  }, null, 2)}\n`);
}

test("an imported DTCG canon replaces palette generation and the bundle names only imported colours", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-byo-dtcg-"));
  writeProject(root, { tokens: { roles: { accent: "semantic.bg.brand.emphasis", accentForeground: "semantic.fg.inverse" } } });
  copyFileSync(resolve(repoRoot, "research/tokens/naming-sample.tokens.json"), join(root, "design/tokens.json"));
  const imported = new Set([...readFileSync(join(root, "design/tokens.json"), "utf8").matchAll(/"hex":\s*"(#[0-9A-Fa-f]{6})"/gu)].map((match) => match[1].toUpperCase()));

  const compiled = run(resolver, root, ["--artifact", "settings"]);
  assert.equal(compiled.status, 0, compiled.stderr);
  const bundle = readFileSync(join(root, ".styleseed/bundles/settings.md"), "utf8");
  assert.match(bundle, /- Imported token canon: design\/tokens\.json · dtcg · sha256:[0-9a-f]{64}/u);
  assert.match(bundle, /## Imported token canon/u);
  assert.match(bundle, /Recipe hex values are withheld/u);
  assert.doesNotMatch(bundle, /Generated semantic palette override/u);
  const bundleHexes = hexes(bundle);
  assert.ok(bundleHexes.length >= 18);
  for (const hex of bundleHexes) assert.ok(imported.has(hex), `${hex} appears in the bundle but not in the imported file`);

  const palette = json(root, ".styleseed/palettes/settings.json");
  assert.equal(palette.generator.name, "StyleSeed Token Import");
  assert.equal(palette.valid, true);
  assert.deepEqual(Object.keys(palette.roles).length, 18);
  for (const [role, hex] of Object.entries(palette.roles)) assert.ok(imported.has(hex), `${role} = ${hex} is not imported`);
  assert.equal(palette.ramps, undefined, "no ramps are generated for an imported canon");
  const css = readFileSync(join(root, ".styleseed/palettes/settings.css"), "utf8");
  for (const hex of hexes(css)) assert.ok(imported.has(hex));
  assert.match(css, /--ss-primary: #[0-9A-F]{6}; \/\* semantic\.bg\.brand\.base \*\//u);

  const manifest = json(root, ".styleseed/manifests/settings.json");
  assert.deepEqual(manifest.inputs.map((entry) => entry.id), ["project", "artifact", "tokens"]);
  assert.equal(manifest.inputs[2].path, "design/tokens.json");
  assert.equal(manifest.selection.tokenCanon.format, "dtcg");
  assert.equal(manifest.selection.paletteGeneration, null);
  assert.ok(manifest.outputs.some((entry) => entry.kind === "palette-json"));

  assert.equal(run(resolver, root, ["--artifact", "settings", "--check"]).status, 0);
  const health = run(doctor, root, ["--json"]);
  assert.equal(JSON.parse(health.stdout).artifacts[0].compilation.status, "current");

  // Editing the token file is method drift, like editing project.json.
  appendFileSync(join(root, "design/tokens.json"), "\n");
  const drifted = run(resolver, root, ["--artifact", "settings", "--check"]);
  assert.equal(drifted.status, 2);
  assert.match(drifted.stderr, /methodHash mismatch/u);

  const previewed = run(preview, root);
  assert.equal(previewed.status, 0, previewed.stderr);
  assert.match(previewed.stdout, /design\/tokens\.json · dtcg · 88 tokens/u);
  assert.match(previewed.stdout, /status: valid \(read-only preview\)/u);
  assert.equal(existsSync(join(root, ".styleseed/palette.json")), false);
});

test("a role without an imported token fails the resolve with the mapping to add; nothing is written", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-byo-missing-"));
  writeProject(root, { tokens: {} });
  copyFileSync(resolve(repoRoot, "research/tokens/naming-sample.tokens.json"), join(root, "design/tokens.json"));
  const compiled = run(resolver, root, ["--artifact", "settings"]);
  assert.equal(compiled.status, 1);
  assert.match(compiled.stderr, /Token import failed for design\/tokens\.json/u);
  assert.match(compiled.stderr, /role accent: no imported token\. Add tokens\.roles\.accent/u);
  assert.equal(existsSync(join(root, ".styleseed/bundles/settings.md")), false);
  assert.equal(existsSync(join(root, ".styleseed/palettes/settings.json")), false);
  const previewed = run(preview, root);
  assert.equal(previewed.status, 1);
  assert.match(previewed.stdout, /problem: role accent/u);
  assert.match(previewed.stdout, /status: invalid/u);
});

test("the project contract bounds the tokens block: format, modes, roles and the source path", () => {
  const cases = [
    [{ tokens: { roles: { accent: "x", accentForeground: "y" } }, format: "svg" }, /project\.tokens\.format is invalid/u],
    [{ tokens: { modes: { light: "Light" } } }, /tokens\.modes does not apply to dtcg/u],
    [{ tokens: { roles: { brandy: "semantic.bg.base" } } }, /project\.tokens\.roles contains unknown keys: brandy/u],
    [{ tokens: {}, source: "../outside/tokens.json" }, /project\.tokens\.source contains an unsafe segment/u],
    [{ tokens: {}, source: "design/tokens.yaml" }, /project\.tokens\.source must be a \.json token file/u],
  ];
  for (const [options, expected] of cases) {
    const root = mkdtempSync(join(tmpdir(), "ss-byo-contract-"));
    writeProject(root, options);
    copyFileSync(resolve(repoRoot, "research/tokens/naming-sample.tokens.json"), join(root, "design/tokens.json"));
    const compiled = run(resolver, root, ["--artifact", "settings"]);
    assert.equal(compiled.status, 1, JSON.stringify(options));
    assert.match(compiled.stderr, expected);
  }
  const missing = mkdtempSync(join(tmpdir(), "ss-byo-nofile-"));
  writeProject(missing, { tokens: { roles: { accent: "semantic.bg.brand.emphasis", accentForeground: "semantic.fg.inverse" } } });
  const compiled = run(resolver, missing, ["--artifact", "settings"]);
  assert.equal(compiled.status, 1);
  assert.match(compiled.stderr, /Token canon file is missing: design\/tokens\.json/u);
});

test("Figma Variables and Tokens Studio exports compile through the same path, reading the configured mode", () => {
  const figmaRoot = mkdtempSync(join(tmpdir(), "ss-byo-figma-"));
  writeProject(figmaRoot, { format: "figma-variables", source: "design/variables.json", tokens: { modes: { light: "Light", dark: "Dark" }, roles: { accent: "semantic.bg.accent.base", accentForeground: "semantic.fg.inverse" } } });
  copyFileSync(resolve(repoRoot, "scripts/fixtures/tokens/figma-variables.sample.json"), join(figmaRoot, "design/variables.json"));
  const figma = run(resolver, figmaRoot, ["--artifact", "settings"]);
  assert.equal(figma.status, 0, figma.stderr);
  const figmaBundle = readFileSync(join(figmaRoot, ".styleseed/bundles/settings.md"), "utf8");
  assert.match(figmaBundle, /figma-variables · sha256:[0-9a-f]{64} · light mode reads "Light"/u);
  assert.equal(json(figmaRoot, ".styleseed/palettes/settings.json").roles.primary, "#00736B");

  const studioRoot = mkdtempSync(join(tmpdir(), "ss-byo-studio-"));
  writeProject(studioRoot, { format: "tokens-studio", tokens: { modes: { light: "Light" }, roles: { accent: "semantic.bg.accent.base", accentForeground: "semantic.fg.inverse" } } });
  copyFileSync(resolve(repoRoot, "scripts/fixtures/tokens/tokens-studio.sample.json"), join(studioRoot, "design/tokens.json"));
  const studio = run(resolver, studioRoot, ["--artifact", "settings"]);
  assert.equal(studio.status, 0, studio.stderr);
  const studioBundle = readFileSync(join(studioRoot, ".styleseed/bundles/settings.md"), "utf8");
  assert.match(studioBundle, /Type roles: body Pretendard\/16\/400\/150%/u);
  assert.match(studioBundle, /6 dimension · 1 fontFamily/u);
});

test("a project without a tokens block still generates its palette from the key colour", () => {
  const root = mkdtempSync(join(tmpdir(), "ss-byo-none-"));
  writeProject(root);
  const compiled = run(resolver, root, ["--artifact", "settings"]);
  assert.equal(compiled.status, 0, compiled.stderr);
  const bundle = readFileSync(join(root, ".styleseed/bundles/settings.md"), "utf8");
  assert.match(bundle, /Generated semantic palette override/u);
  assert.doesNotMatch(bundle, /Imported token canon/u);
  assert.equal(json(root, ".styleseed/palettes/settings.json").generator.name, "StyleSeed Palette Engine");
  assert.equal(json(root, ".styleseed/manifests/settings.json").selection.tokenCanon, null);
});
