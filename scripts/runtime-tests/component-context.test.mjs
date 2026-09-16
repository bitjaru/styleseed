import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const canonicalSkills = resolve(repo, "engine/.claude/skills");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
function write(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}
function snapshot(root, prefix = "") {
  const files = {};
  for (const entry of readdirSync(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, snapshot(root, path));
    else files[path] = readFileSync(resolve(root, path), "utf8");
  }
  return files;
}

// Execute the skill's documented resolver commands, not a separately hardcoded invocation.
// This tests command wiring and runtime invariants, not autonomous agent instruction-following.
function setup(t) {
  const sandbox = mkdtempSync(join(tmpdir(), "styleseed-component-"));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const skills = resolve(sandbox, "installed package with spaces/skills");
  cpSync(canonicalSkills, skills, { recursive: true });
  const root = resolve(sandbox, "external app with spaces");
  mkdirSync(root);
  const text = readFileSync(resolve(skills, "ss-component/SKILL.md"), "utf8");
  const commands = [...text.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/gu)]
    .map((match) => match[1].replace(/\\\r?\n\s*/gu, " ").trim())
    .filter((command) => command.startsWith("node ") && command.includes("resolve-context.mjs"));
  const registryCommand = commands.find((command) => command.includes("--artifact"));
  const legacyCommand = commands.find((command) => command.includes("--from-lock"));
  assert.ok(registryCommand, "ss-component must provide an executable artifact context check");
  assert.ok(legacyCommand, "ss-component must provide a separate executable legacy context check");

  function run(mode, { artifact = "resource-list", compile = false } = {}) {
    const command = mode === "registry" ? registryCommand : legacyCommand;
    const tokens = [...command.matchAll(/"([^"\n]*)"|(\S+)/gu)].map((match) => match[1] ?? match[2]);
    assert.equal(tokens.shift(), "node");
    const args = tokens.map((token) => token
      .replaceAll("<ss-resolve>", resolve(skills, "ss-resolve"))
      .replaceAll("<artifact-id>", artifact)
      .replaceAll("<agent>", "codex"));
    assert.ok(args.includes("--check"), "documented preflight must be read-only");
    const result = spawnSync(process.execPath, compile ? args.filter((arg) => arg !== "--check") : args, {
      cwd: root, encoding: "utf8", timeout: 30000,
    });
    assert.equal(result.error, undefined);
    return result;
  }
  return { root, skills, run };
}
function expectExit(result, status) {
  assert.equal(result.status, status, `${result.stdout}\n${result.stderr}`);
}
function legacy(root) {
  write(resolve(root, "STYLESEED.md"), `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: consumer-service
- Brand recipe: calm-consumer
- Palette recipe: quiet-mineral
- Aesthetic profile: none
- Primary action: #0F766E
`);
}
function registry(root) {
  write(resolve(root, ".styleseed/project.json"), {
    schemaVersion: 1, projectId: "component-context",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first" },
  });
  write(resolve(root, ".styleseed/artifacts/index.json"), { schemaVersion: 1, artifacts: ["resource-list", "resource-detail"].map((id) => ({ id, config: `${id}.json` })) });
  write(resolve(root, "packages/design/tokens.css"), ":root { --control-height: 48px; }\n");
  write(resolve(root, "packages/design/action.tsx"), "export function Action(){ return <button>Open resource</button>; }\n");
  for (const id of ["resource-list", "resource-detail"]) {
    write(resolve(root, `app/${id}/page.tsx`), "export { Action } from '../../packages/design/action';\n");
    write(resolve(root, `.styleseed/artifacts/${id}.json`), {
      schemaVersion: 1, id, target: { kind: "route", locator: `/${id}` },
      selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: `Inspect ${id}`, primaryAction: "Open resource", signatureMove: `Keep ${id} context visible.` },
      implementation: { sourceRoots: [`app/${id}`, "packages/design"], tokenFiles: ["packages/design/tokens.css"] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 900 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    });
  }
}

test("installed component commands isolate the selected artifact from valid legacy and sibling bundles", (t) => {
  const { root, skills, run } = setup(t);
  assert.equal(existsSync(resolve(skills, "../../engine")), false);
  legacy(root);
  expectExit(run("legacy", { compile: true }), 0);
  const legacyBefore = snapshot(root);
  registry(root);
  expectExit(run("registry", { artifact: "resource-detail", compile: true }), 0);
  const before = snapshot(root);
  expectExit(run("registry"), 2); // A valid global bundle cannot satisfy a missing selected bundle.
  assert.deepEqual(snapshot(root), before);
  expectExit(run("registry", { compile: true }), 0);
  expectExit(run("registry"), 0);
  const compiled = snapshot(root);
  for (const [path, bytes] of Object.entries(before)) assert.equal(compiled[path], bytes, path);
  for (const [path, bytes] of Object.entries(legacyBefore)) assert.equal(compiled[path], bytes, path);
  const manifest = readJson(resolve(root, ".styleseed/manifests/resource-list.json"));
  assert.equal(manifest.artifactId, "resource-list");
  assert.equal(manifest.selection.grammar, "operations-console");
  assert.equal(manifest.bundle.path, ".styleseed/bundles/resource-list.md");
  assert.deepEqual(readJson(resolve(root, ".styleseed/artifacts/resource-list.json")).implementation.tokenFiles, ["packages/design/tokens.css"]);
  expectExit(run("registry"), 0); // A fresh process preserves the same contract.
  assert.deepEqual(snapshot(root), compiled);
});

for (const broken of ["project-only", "index-only", "invalid-project", "unknown-artifact"]) {
  test(`component preflight and compile reject ${broken} without legacy fallback or writes`, (t) => {
    const { root, run } = setup(t);
    legacy(root);
    expectExit(run("legacy", { compile: true }), 0);
    registry(root);
    if (broken === "project-only") unlinkSync(resolve(root, ".styleseed/artifacts/index.json"));
    if (broken === "index-only") unlinkSync(resolve(root, ".styleseed/project.json"));
    if (broken === "invalid-project") write(resolve(root, ".styleseed/project.json"), '{"schemaVersion":1,"schemaVersion":1}\n');
    const before = snapshot(root);
    for (const compile of [false, true]) {
      const result = run("registry", { compile, artifact: broken === "unknown-artifact" ? "not-registered" : "resource-list" });
      assert.notEqual(result.status, 0, result.stdout);
      assert.match(result.stderr, /Incomplete|Duplicate JSON key|Unknown artifact/u);
      assert.deepEqual(snapshot(root), before);
    }
  });
}

test("component context checks detect tampering and decision drift without touching sibling outputs", (t) => {
  const { root, run } = setup(t);
  registry(root);
  for (const artifact of ["resource-list", "resource-detail"]) expectExit(run("registry", { artifact, compile: true }), 0);
  const baseline = snapshot(root);
  write(resolve(root, ".styleseed/bundles/resource-list.md"), "# Tampered component rules\n");
  const tampered = snapshot(root);
  expectExit(run("registry"), 2);
  assert.deepEqual(snapshot(root), tampered);
  expectExit(run("registry", { compile: true }), 0);
  expectExit(run("registry"), 0);
  const path = resolve(root, ".styleseed/artifacts/resource-list.json");
  const config = readJson(path);
  config.decisions.primaryAction = "Review selected resources";
  write(path, config);
  const changed = snapshot(root);
  expectExit(run("registry"), 2);
  expectExit(run("registry", { artifact: "resource-detail" }), 0);
  assert.deepEqual(snapshot(root), changed);
  expectExit(run("registry", { compile: true }), 0);
  expectExit(run("registry"), 0);
  assert.equal(readJson(path).decisions.primaryAction, "Review selected resources");
  for (const path of [".styleseed/project.json", ".styleseed/bundles/resource-detail.md", ".styleseed/manifests/resource-detail.json", "packages/design/tokens.css", "packages/design/action.tsx"]) {
    assert.equal(readFileSync(resolve(root, path), "utf8"), baseline[path], path);
  }
});

test("registry-free component workflow keeps the legacy pair and project-owned files", (t) => {
  const { root, run } = setup(t);
  legacy(root);
  const before = snapshot(root);
  expectExit(run("legacy"), 2);
  assert.deepEqual(snapshot(root), before);
  expectExit(run("legacy", { compile: true }), 0);
  const compiled = snapshot(root);
  expectExit(run("legacy"), 0);
  assert.deepEqual(snapshot(root), compiled);
  assert.equal(readFileSync(resolve(root, "STYLESEED.md"), "utf8"), before["STYLESEED.md"]);
  assert.equal(readJson(resolve(root, ".styleseed/manifest.json")).schemaVersion, 1);
  assert.equal(existsSync(resolve(root, ".styleseed/project.json")), false);
  assert.equal(existsSync(resolve(root, ".styleseed/bundles")), false);
});
