import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const resolver = resolve(
  repoRoot,
  "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs",
);

function makeProjectRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeLock(projectRoot) {
  writeFileSync(
    resolve(projectRoot, "STYLESEED.md"),
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
}

function runResolver(projectRoot, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [resolver, "--project-root", projectRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", ...extraArgs],
    { encoding: "utf8" },
  );
}

function expectStatus(run, status, label) {
  assert.equal(
    run.status,
    status,
    `${label} exited ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );
}

test("resolver --check passes when expected outputs, manifest declarations, and actual bytes match", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-pass-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, ".styleseed/manifest.json"), "utf8"));
    assert.deepEqual(
      manifest.outputs.map((entry) => entry.kind),
      ["bundle", "palette-json", "palette-css"],
    );
    expectStatus(runResolver(projectRoot, ["--check"]), 0, "resolver check");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolver --check exits 2 when actual bundle bytes drift without manifest changes", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-bundle-drift-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    writeFileSync(resolve(projectRoot, ".styleseed/effective-rules.md"), "# tampered bundle\n");
    const check = runResolver(projectRoot, ["--check"]);
    expectStatus(check, 2, "bundle drift check");
    assert.match(check.stderr, /output mismatch.*effective-rules\.md/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolver --check exits 2 when actual palette bytes drift without manifest changes", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-palette-drift-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    writeFileSync(resolve(projectRoot, ".styleseed/palette.css"), ":root{}\n");
    const check = runResolver(projectRoot, ["--check"]);
    expectStatus(check, 2, "palette drift check");
    assert.match(check.stderr, /output mismatch.*palette\.css/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolver --check exits 2 when a declared output file is missing", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-missing-output-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    unlinkSync(resolve(projectRoot, ".styleseed/palette.json"));
    const check = runResolver(projectRoot, ["--check"]);
    expectStatus(check, 2, "missing output check");
    assert.match(check.stderr, /missing output file .*palette\.json/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolver --check exits 2 when the manifest declares extra outputs", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-extra-output-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    const manifestPath = resolve(projectRoot, ".styleseed/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.outputs.push({
      kind: "bundle",
      path: ".styleseed/extra.md",
      sha256: "0".repeat(64),
      bytes: 1,
    });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const check = runResolver(projectRoot, ["--check"]);
    expectStatus(check, 2, "extra output check");
    assert.match(check.stderr, /manifest outputs count mismatch/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolver --check exits 2 when manifest sources no longer match the freshly compiled sources", () => {
  const projectRoot = makeProjectRoot("styleseed-resolver-source-drift-");
  try {
    writeLock(projectRoot);
    expectStatus(runResolver(projectRoot), 0, "initial resolve");
    const manifestPath = resolve(projectRoot, ".styleseed/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.sources[0].sha256 = "f".repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const check = runResolver(projectRoot, ["--check"]);
    expectStatus(check, 2, "source drift check");
    assert.match(check.stderr, /manifest sources mismatch/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
