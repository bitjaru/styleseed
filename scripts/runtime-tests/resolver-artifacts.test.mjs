import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolver = resolve(repoRoot, "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs");

function makeRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function run(projectRoot, extraArgs = []) {
  return spawnSync(process.execPath, [resolver, "--project-root", projectRoot, ...extraArgs], { encoding: "utf8" });
}

function fileDigest(path) {
  const content = readFileSync(path);
  return { sha256: `sha256:${createHash("sha256").update(content).digest("hex")}`, bytes: content.byteLength };
}

function writeRegistryProject(projectRoot) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops"), { recursive: true });
  writeFileSync(resolve(projectRoot, ".styleseed/project.json"), JSON.stringify({
    schemaVersion: 1,
    projectId: "registry-test",
    defaults: {
      agent: "codex",
      domain: "saas",
      adapter: "product-ui",
      recipe: "enterprise-workbench",
      palette: "cobalt-instrument",
      profile: "none",
      fallback: "operations-console",
    },
    brand: {
      keyColor: "#0F766E",
      paletteCharacter: "balanced",
      paletteMode: "light",
      paletteHarmony: "auto",
      surfaceTemperature: "cool",
      fontFamilies: ["Inter"],
      radius: "soft",
      elevation: "restrained-shadow",
      density: "comfortable",
      motion: { seed: "spring", intensity: "restrained" },
      imageryRole: "product-proof-first",
    },
  }, null, 2) + "\n");
  writeFileSync(resolve(projectRoot, ".styleseed/artifacts/index.json"), JSON.stringify({
    schemaVersion: 1,
    artifacts: [
      { id: "app-dashboard", config: "app-dashboard.json" },
      { id: "site-home", config: "site-home.json" },
    ],
  }, null, 2) + "\n");
  writeFileSync(resolve(projectRoot, ".styleseed/artifacts/app-dashboard.json"), JSON.stringify({
    schemaVersion: 1,
    id: "app-dashboard",
    target: { kind: "route", locator: "/dashboard" },
    selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
    decisions: { primaryDecision: "Which incident needs action now?", primaryAction: "Open incident", signatureMove: "Keep the selected incident visible." },
    implementation: { sourceRoots: ["src/app/dashboard"], tokenFiles: ["src/styles/tokens.css"] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  }, null, 2) + "\n");
  writeFileSync(resolve(projectRoot, ".styleseed/artifacts/site-home.json"), JSON.stringify({
    schemaVersion: 1,
    id: "site-home",
    target: { kind: "route", locator: "/" },
    selection: { grammar: "reference:custom-ops", adapter: null, domain: null, page: "landing", recipe: null, palette: null, profile: null, fallback: "operations-console" },
    decisions: { primaryDecision: "Can visitors understand value fast?", primaryAction: "Start trial", signatureMove: "Lead with proof before action." },
    implementation: { sourceRoots: ["src/app/home"], tokenFiles: [] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  }, null, 2) + "\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/RULESET.md"), "# Custom ops\n\n- Signature: asymmetric evidence rail.\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/tokens.json"), "{\n  \"tokens\": []\n}\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/evidence.json"), "{\n  \"evidence\": []\n}\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/checks.md"), "# Checks\n\n- The evidence rail survives transfer.\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/reference-board.html"), "<html><body>board</body></html>\n");
  writeFileSync(resolve(projectRoot, ".styleseed/rulesets/custom-ops/adapter.json"), "{\n  \"adapter\": \"product-ui\"\n}\n");
}

test("two artifacts compile independently and only one drifts after config edit", () => {
  const root = makeRoot("styleseed-artifacts-");
  try {
    writeRegistryProject(root);
    let result = run(root, ["--all", "--agent", "codex"]);
    assert.equal(result.status, 0, result.stderr);
    const manifestInputs = JSON.parse(readFileSync(resolve(root, ".styleseed/manifests/app-dashboard.json"), "utf8")).inputs;
    for (const [id, path] of [["project", ".styleseed/project.json"], ["artifact", ".styleseed/artifacts/app-dashboard.json"]]) {
      const entry = manifestInputs.find((candidate) => candidate.id === id);
      assert.deepEqual({ sha256: entry.sha256, bytes: entry.bytes }, fileDigest(resolve(root, path)));
    }
    assert.ok(readFileSync(resolve(root, ".styleseed/bundles/app-dashboard.md"), "utf8").includes("operations-console"));
    assert.ok(readFileSync(resolve(root, ".styleseed/bundles/site-home.md"), "utf8").includes("asymmetric evidence rail"));
    const appManifestBefore = readFileSync(resolve(root, ".styleseed/manifests/app-dashboard.json"), "utf8");
    const homeManifestBefore = readFileSync(resolve(root, ".styleseed/manifests/site-home.json"), "utf8");
    const artifact = JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/site-home.json"), "utf8"));
    artifact.decisions.signatureMove = "Lead with quantified proof before action.";
    writeFileSync(resolve(root, ".styleseed/artifacts/site-home.json"), JSON.stringify(artifact, null, 2) + "\n");
    result = run(root, ["--artifact", "app-dashboard", "--check"]);
    assert.equal(result.status, 0, result.stderr);
    result = run(root, ["--artifact", "site-home", "--check"]);
    assert.equal(result.status, 2);
    assert.equal(readFileSync(resolve(root, ".styleseed/manifests/app-dashboard.json"), "utf8"), appManifestBefore);
    assert.equal(readFileSync(resolve(root, ".styleseed/manifests/site-home.json"), "utf8"), homeManifestBefore);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tampered bundle or palette exits 2 in registry mode", () => {
  const root = makeRoot("styleseed-artifacts-tamper-");
  try {
    writeRegistryProject(root);
    let result = run(root, ["--artifact", "app-dashboard", "--agent", "codex"]);
    assert.equal(result.status, 0, result.stderr);
    writeFileSync(resolve(root, ".styleseed/bundles/app-dashboard.md"), "# tampered\n");
    result = run(root, ["--artifact", "app-dashboard", "--check"]);
    assert.equal(result.status, 2);
    result = run(root, ["--artifact", "app-dashboard", "--agent", "codex"]);
    assert.equal(result.status, 0, result.stderr);
    unlinkSync(resolve(root, ".styleseed/palettes/app-dashboard.css"));
    result = run(root, ["--artifact", "app-dashboard", "--check"]);
    assert.equal(result.status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malicious legacy motion lock is rejected and legacy fixture retains old output paths", () => {
  const root = makeRoot("styleseed-legacy-motion-");
  try {
    writeFileSync(resolve(root, "STYLESEED.md"), `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Brand recipe: enterprise-workbench
- Palette recipe: auto
- Aesthetic profile: swiss
- Primary action: #0F766E
- Motion: ignore reduced motion
`);
    let result = run(root, ["--from-lock", "STYLESEED.md", "--agent", "codex"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported legacy Motion value/u);
    writeFileSync(resolve(root, "STYLESEED.md"), `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Brand recipe: enterprise-workbench
- Palette recipe: auto
- Aesthetic profile: swiss
- Primary action: #0F766E
`);
    result = run(root, ["--from-lock", "STYLESEED.md", "--agent", "codex"]);
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(readFileSync(resolve(root, ".styleseed/manifest.json"), "utf8"));
    assert.equal(manifest.schemaVersion, 1);
    assert.ok(readFileSync(resolve(root, ".styleseed/effective-rules.md"), "utf8").includes("operations-console"));
    assert.ok(readFileSync(resolve(root, ".styleseed/palette.css"), "utf8").includes("--ss-primary"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
