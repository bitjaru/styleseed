import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_ENUMS,
  canonicalJson,
  normalizeArtifact,
  normalizeIndex,
  normalizeProject,
  parseStrictJson,
  safeProjectPath,
  sha256,
} from "../../engine/.claude/skills/ss-resolve/scripts/runtime-contract.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const references = resolve(repoRoot, "engine/.claude/skills/ss-resolve/references");
const catalog = JSON.parse(readFileSync(resolve(references, "catalog.json"), "utf8"));
const projectSchema = JSON.parse(readFileSync(resolve(references, "project.schema.json"), "utf8"));
const artifactSchema = JSON.parse(readFileSync(resolve(references, "artifact.schema.json"), "utf8"));

const projectInput = {
  schemaVersion: 1,
  projectId: "test-project",
  defaults: { agent: "codex", domain: "developer-tools", adapter: "product-ui", recipe: "expressive-brand", palette: "signal-coral", profile: "none", fallback: null },
  brand: { keyColor: "#6c5ce7", paletteCharacter: "vivid", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "neutral", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first" },
};
const artifactInput = {
  schemaVersion: 1,
  id: "app-dashboard",
  target: { kind: "route", locator: "/dashboard" },
  selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
  decisions: { primaryDecision: "Which incident needs action now?", primaryAction: "Open incident", signatureMove: "Keep the selected incident visible." },
  implementation: { sourceRoots: ["src/app/dashboard"], tokenFiles: ["src/styles/tokens.css"] },
  validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
};
const reverseKeys = (value) => Array.isArray(value)
  ? value.map(reverseKeys)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]))
    : value;

test("strict JSON rejects direct, nested, and escaped-equivalent duplicate keys", () => {
  for (const fixture of [
    '{"id":1,"id":2}',
    '{"outer":{"id":1,"id":2}}',
    '{"id":1,"\\u0069d":2}',
  ]) assert.throws(() => parseStrictJson(fixture), /Duplicate JSON key/u);
  assert.throws(() => parseStrictJson('{"x":"123456"}', { maxBytes: 4 }), /exceeds/u);
  assert.throws(() => parseStrictJson(`${"[".repeat(129)}0${"]".repeat(129)}`), /nesting exceeds/u);
  assert.deepEqual(Object.keys(parseStrictJson('{"b":1,"a":2}')), ["a", "b"]);
});

test("project and artifact normalization are key-order independent and catalog bounded", () => {
  const project = normalizeProject(projectInput, catalog);
  const shuffledProject = normalizeProject(reverseKeys(projectInput), catalog);
  assert.equal(canonicalJson(project), canonicalJson(shuffledProject));
  const artifact = normalizeArtifact(artifactInput, project, catalog);
  const reordered = normalizeArtifact(parseStrictJson(canonicalJson(artifactInput)), project, catalog);
  assert.equal(canonicalJson(artifact), canonicalJson(reordered));
  assert.equal(artifact.selection.adapter, project.defaults.adapter);
  assert.match(sha256(artifact), /^sha256:[0-9a-f]{64}$/u);
  assert.throws(() => normalizeArtifact({ ...artifactInput, selection: { ...artifactInput.selection, grammar: "invented-grammar" } }, project, catalog), /current catalog/u);
  assert.throws(() => normalizeProject({ ...projectInput, brand: { ...projectInput.brand, radius: "banana" } }, catalog), /invalid/u);
});

test("index rejects duplicate IDs and unsafe config paths, then sorts deterministically", () => {
  assert.deepEqual(normalizeIndex({ schemaVersion: 1, artifacts: [{ id: "z-page", config: "z-page.json" }, { id: "a-page", config: "a-page.json" }] }).artifacts.map((item) => item.id), ["a-page", "z-page"]);
  assert.throws(() => normalizeIndex({ schemaVersion: 1, artifacts: [{ id: "a-page", config: "a-page.json" }, { id: "a-page", config: "a-page.json" }] }), /duplicate artifact/u);
  assert.throws(() => normalizeIndex({ schemaVersion: 1, artifacts: [{ id: "a-page", config: "..\/escape.json" }] }), /artifact config/u);
});

test("project paths reject absolute, traversal, NUL, and symlink escapes", () => {
  const root = mkdtempSync(join(tmpdir(), "styleseed-contract-"));
  const outside = mkdtempSync(join(tmpdir(), "styleseed-outside-"));
  try {
    mkdirSync(resolve(root, "src"));
    writeFileSync(resolve(root, "src/file.txt"), "ok");
    assert.equal(safeProjectPath(root, "src/file.txt"), realpathSync(resolve(root, "src/file.txt")));
    for (const unsafe of ["/tmp/file", "../file", "src/../file", "src/\0file"]) assert.throws(() => safeProjectPath(root, unsafe));
    symlinkSync(outside, resolve(root, "linked"));
    assert.throws(() => safeProjectPath(root, "linked/file.txt"), /symlink/u);
    const fifoPath = resolve(root, "fixture.fifo");
    const fifo = spawnSync("mkfifo", [fifoPath], { encoding: "utf8" });
    if (fifo.status === 0) assert.throws(() => safeProjectPath(root, "fixture.fifo"), /regular file or directory/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("runtime enums stay in parity with JSON Schema enums", () => {
  assert.deepEqual(projectSchema.properties.defaults.properties.agent.enum, CONTRACT_ENUMS.agents);
  assert.deepEqual(projectSchema.properties.brand.properties.paletteCharacter.enum, CONTRACT_ENUMS.paletteCharacter);
  assert.deepEqual(projectSchema.properties.brand.properties.paletteMode.enum, CONTRACT_ENUMS.paletteMode);
  assert.deepEqual(projectSchema.properties.brand.properties.paletteHarmony.enum, CONTRACT_ENUMS.paletteHarmony);
  assert.deepEqual(projectSchema.properties.brand.properties.surfaceTemperature.enum, CONTRACT_ENUMS.surfaceTemperature);
  assert.deepEqual(projectSchema.properties.brand.properties.radius.enum, CONTRACT_ENUMS.radius);
  assert.deepEqual(projectSchema.properties.brand.properties.elevation.enum, CONTRACT_ENUMS.elevation);
  assert.deepEqual(projectSchema.properties.brand.properties.density.enum, CONTRACT_ENUMS.density);
  assert.deepEqual(projectSchema.properties.brand.properties.motion.properties.seed.enum, CONTRACT_ENUMS.motionSeed);
  assert.deepEqual(projectSchema.properties.brand.properties.motion.properties.intensity.enum, CONTRACT_ENUMS.motionIntensity);
  assert.deepEqual(projectSchema.properties.brand.properties.imageryRole.enum, CONTRACT_ENUMS.imageryRole);
  assert.deepEqual(artifactSchema.properties.target.properties.kind.enum, CONTRACT_ENUMS.targetKind);
  assert.deepEqual(artifactSchema.properties.validation.properties.requiredRenders.items.properties.state.enum, CONTRACT_ENUMS.renderState);
  assert.deepEqual(projectSchema.properties.defaults.properties.adapter.enum, Object.keys(catalog.adapters).sort());
  assert.deepEqual(projectSchema.properties.defaults.properties.recipe.enum, Object.keys(catalog.recipes).sort());
  assert.deepEqual(projectSchema.properties.defaults.properties.palette.enum, Object.keys(catalog.palettes).sort());
  assert.deepEqual(artifactSchema.properties.selection.properties.grammar.enum, Object.keys(catalog.grammars).sort());
  assert.deepEqual(artifactSchema.properties.selection.properties.page.enum.filter((value) => value !== "none"), Object.keys(catalog.pages).sort());
  assert.match(projectSchema.properties.brand.properties.fontFamilies.items.pattern, /\\p\{L\}/u);
  assert.match(artifactSchema.properties.target.properties.locator.pattern, /\?#/u);
  for (const schemaName of ["artifact-index.schema.json", "manifest.schema.json"]) {
    const schema = JSON.parse(readFileSync(resolve(references, schemaName), "utf8"));
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
  }
});
