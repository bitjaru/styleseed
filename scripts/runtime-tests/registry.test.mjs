import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadArtifactConfig, loadProjectRegistry } from "../../engine/.claude/skills/ss-resolve/scripts/project-registry.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const migrateScript = resolve(repoRoot, "engine/.claude/skills/ss-resolve/scripts/migrate-project.mjs");

function fixtureRoot() {
  return mkdtempSync(join(tmpdir(), "styleseed-registry-"));
}

function runMigration(projectRoot, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [migrateScript, "--project-root", projectRoot, "--from-lock", "STYLESEED.md", "--artifact", "default", ...extraArgs],
    { encoding: "utf8" },
  );
  return result;
}

function writeLock(projectRoot, text) {
  writeFileSync(resolve(projectRoot, "STYLESEED.md"), text);
}

const validLock = `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Brand recipe: auto
- Palette recipe: auto
- Aesthetic profile: none
- Primary action: #0F766E
- Palette character: vivid
- Palette mode: light
- Palette harmony: auto
- Surface temperature: neutral
- Font: Inter
- Radius: soft
- Elevation: restrained-shadow
- Density: comfortable
- Motion: Spring restrained
`;

test("valid migration dry-run is deterministic and registry loads after write", () => {
  const root = fixtureRoot();
  try {
    writeLock(root, validLock);
    const dryRun = runMigration(root);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    const preview = JSON.parse(dryRun.stdout);
    assert.equal(preview.dryRun, true);
    assert.equal(preview.targets[0].path, ".styleseed/project.json");
    assert.equal(preview.targets[1].path, ".styleseed/artifacts/index.json");
    assert.equal(preview.targets[2].path, ".styleseed/artifacts/default.json");
    assert.equal(preview.targets[0].content.defaults.recipe, "enterprise-workbench");
    assert.equal(preview.targets[0].content.defaults.palette, "cobalt-instrument");
    assert.equal(preview.targets[0].content.brand.keyColor, "#0F766E");
    assert.equal(preview.targets[2].content.selection.grammar, "operations-console");
    assert.equal(existsSync(resolve(root, ".styleseed")), false);

    const write = runMigration(root, ["--write"]);
    assert.equal(write.status, 0, write.stderr);
    const registry = loadProjectRegistry(root);
    assert.ok(registry);
    assert.equal(registry.project.defaults.recipe, "enterprise-workbench");
    assert.equal(registry.artifactMap.get("default").artifact.selection.grammar, "operations-console");
    assert.equal(loadArtifactConfig(root, "default").artifact.id, "default");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown and duplicate fields are reported without being interpreted", () => {
  const root = fixtureRoot();
  try {
    writeLock(
      root,
      `${validLock}- App domain: fintech
- App domain: saas
- Surface: mobile-app
- Imagery/data role: personal state first; charts only for a decision
`,
    );
    const result = runMigration(root);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(
      payload.unmigratedFields.map((item) => `${item.field}:${item.reason}`),
      [
        "App domain:duplicate",
        "Imagery/data role:unsupported",
        "Surface:unknown",
      ],
    );
    assert.equal(payload.targets[0].content.defaults.domain, "developer-tools");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("existing targets refuse overwrite and dry-run writes zero files", () => {
  const root = fixtureRoot();
  try {
    writeLock(root, validLock);
    const dryRun = runMigration(root);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.equal(existsSync(resolve(root, ".styleseed/project.json")), false);

    mkdirSync(resolve(root, ".styleseed/artifacts"), { recursive: true });
    writeFileSync(resolve(root, ".styleseed/project.json"), "{}\n");
    const refusal = runMigration(root, ["--write"]);
    assert.equal(refusal.status, 1);
    assert.match(refusal.stderr, /Refusing to overwrite existing migration targets/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("traversal is refused for lock path and absent registry preserves legacy null load", () => {
  const root = fixtureRoot();
  const outside = fixtureRoot();
  try {
    writeLock(outside, validLock);
    assert.equal(loadProjectRegistry(root), null);
    const refusal = spawnSync(
      process.execPath,
      [migrateScript, "--project-root", root, "--from-lock", "../escape.md", "--artifact", "default"],
      { encoding: "utf8" },
    );
    assert.equal(refusal.status, 1);
    assert.match(refusal.stderr, /(unsafe segment|escapes project root)/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("legacy fixture output is byte-identical across repeated dry-runs", () => {
  const root = fixtureRoot();
  try {
    writeLock(root, validLock);
    const first = runMigration(root);
    const second = runMigration(root);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
