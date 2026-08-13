import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyDistribution } from "../../engine/.claude/skills/ss-resolve/scripts/distribution-integrity.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const catalog = JSON.parse(
  readFileSync(resolve(repoRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"), "utf8"),
);
const stagedScriptPath = "engine/.claude/skills/ss-update/scripts/check-update.mjs";

function makeSandbox(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function stageCoreDistribution(destinationRoot) {
  for (const file of catalog.distributions.core.files) {
    const source = resolve(repoRoot, file.path);
    const destination = resolve(destinationRoot, file.path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: false });
  }
  const catalogPath = "engine/.claude/skills/ss-resolve/references/catalog.json";
  const destinationCatalog = resolve(destinationRoot, catalogPath);
  mkdirSync(dirname(destinationCatalog), { recursive: true });
  writeFileSync(destinationCatalog, `${JSON.stringify(catalog, null, 2)}\n`);
}

function stagedScript(destinationRoot) {
  return resolve(destinationRoot, stagedScriptPath);
}

function runUpdateChecker(projectRoot, remoteRevision = catalog.engineRevision) {
  const remotePath = resolve(projectRoot, "remote-version.json");
  writeFileSync(
    remotePath,
    `${JSON.stringify({ version: catalog.engineVersion, revision: remoteRevision }, null, 2)}\n`,
  );
  return spawnSync(
    process.execPath,
    [resolve(projectRoot, stagedScriptPath), "--project-root", projectRoot, "--remote", remotePath, "--json"],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

function expectStatus(run, expected, label) {
  assert.equal(
    run.status,
    expected,
    `${label} exited ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );
}

test("verifyDistribution accepts a clean staged core layout and recomputes the core revision", () => {
  const sandbox = makeSandbox("styleseed-distribution-clean-");
  try {
    stageCoreDistribution(sandbox);
    const result = verifyDistribution({ catalog, scriptPath: stagedScript(sandbox) });
    assert.equal(result.status, "verified");
    assert.equal(result.computedRevision, catalog.engineRevision);
    assert.deepEqual(result.mismatches, []);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("verifyDistribution rejects unsorted, duplicate, traversal, and symlink inventory paths as invalid", () => {
  const sandbox = makeSandbox("styleseed-distribution-invalid-");
  try {
    stageCoreDistribution(sandbox);
    const validFiles = catalog.distributions.core.files;

    assert.throws(
      () => verifyDistribution({
        catalog: {
          ...catalog,
          distributions: {
            core: {
              revision: catalog.engineRevision,
              files: [validFiles[1], validFiles[0], ...validFiles.slice(2)],
            },
          },
        },
        scriptPath: stagedScript(sandbox),
      }),
      /not sorted by path/,
    );

    assert.throws(
      () => verifyDistribution({
        catalog: {
          ...catalog,
          distributions: {
            core: {
              revision: catalog.engineRevision,
              files: [validFiles[0], validFiles[0], ...validFiles.slice(1)],
            },
          },
        },
        scriptPath: stagedScript(sandbox),
      }),
      /duplicate path/,
    );

    assert.throws(
      () => verifyDistribution({
        catalog: {
          ...catalog,
          distributions: {
            core: {
              revision: catalog.engineRevision,
              files: [{ ...validFiles[0], path: "../escape.md" }, ...validFiles.slice(1)],
            },
          },
        },
        scriptPath: stagedScript(sandbox),
      }),
      /Invalid distribution path|escapes root/,
    );

    const symlinkTarget = resolve(sandbox, "engine/symlink-target.md");
    writeFileSync(symlinkTarget, "linked\n");
    const symlinkPath = resolve(sandbox, "engine/symlink-file.md");
    symlinkSync("symlink-target.md", symlinkPath);
    assert.throws(
      () => verifyDistribution({
        catalog: {
          ...catalog,
          distributions: {
            core: {
              revision: catalog.engineRevision,
              files: [{ path: "engine/symlink-file.md", sha256: "0".repeat(64), bytes: 7 }],
            },
          },
        },
        scriptPath: stagedScript(sandbox),
      }),
      /traverses a symlink/,
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("verifyDistribution reports tampered, unsafe-file, and incomplete staged payloads", () => {
  const tamperedSandbox = makeSandbox("styleseed-distribution-tampered-");
  try {
    stageCoreDistribution(tamperedSandbox);
    writeFileSync(
      resolve(tamperedSandbox, "engine/.claude/skills/ss-build/SKILL.md"),
      "# tampered skill\n",
    );
    const tampered = verifyDistribution({ catalog, scriptPath: stagedScript(tamperedSandbox) });
    assert.equal(tampered.status, "tampered");
    assert.equal(tampered.computedRevision.startsWith("sha256:"), true);
    assert(tampered.mismatches.some((entry) => entry.path === "engine/.claude/skills/ss-build/SKILL.md"));
  } finally {
    rmSync(tamperedSandbox, { recursive: true, force: true });
  }

  const hardlinkSandbox = makeSandbox("styleseed-distribution-hardlink-");
  try {
    stageCoreDistribution(hardlinkSandbox);
    const targetPath = resolve(hardlinkSandbox, "engine/AGENTS.md");
    unlinkSync(targetPath);
    linkSync(resolve(hardlinkSandbox, "engine/README.md"), targetPath);
    const hardlinked = verifyDistribution({ catalog, scriptPath: stagedScript(hardlinkSandbox) });
    assert.equal(hardlinked.status, "tampered");
    assert(hardlinked.mismatches.some((entry) => entry.path === "engine/AGENTS.md" && entry.reason === "link-count-mismatch"));
  } finally {
    rmSync(hardlinkSandbox, { recursive: true, force: true });
  }

  const specialFileSandbox = makeSandbox("styleseed-distribution-special-");
  try {
    stageCoreDistribution(specialFileSandbox);
    unlinkSync(resolve(specialFileSandbox, "engine/ADAPTERS.md"));
    mkdirSync(resolve(specialFileSandbox, "engine/ADAPTERS.md"));
    const special = verifyDistribution({ catalog, scriptPath: stagedScript(specialFileSandbox) });
    assert.equal(special.status, "tampered");
    assert(special.mismatches.some((entry) => entry.path === "engine/ADAPTERS.md" && entry.reason === "not-a-regular-file"));
  } finally {
    rmSync(specialFileSandbox, { recursive: true, force: true });
  }

  const incompleteSandbox = makeSandbox("styleseed-distribution-incomplete-");
  try {
    stageCoreDistribution(incompleteSandbox);
    unlinkSync(resolve(incompleteSandbox, "engine/.claude/skills/ss-update/SKILL.md"));
    const incomplete = verifyDistribution({ catalog, scriptPath: stagedScript(incompleteSandbox) });
    assert.equal(incomplete.status, "incomplete");
    assert(incomplete.mismatches.some((entry) => entry.path === "engine/.claude/skills/ss-update/SKILL.md" && entry.reason === "missing"));
  } finally {
    rmSync(incompleteSandbox, { recursive: true, force: true });
  }
});

test("check-update never reports tampered or incomplete installs as current", () => {
  const currentSandbox = makeSandbox("styleseed-update-current-");
  try {
    stageCoreDistribution(currentSandbox);
    const current = runUpdateChecker(currentSandbox);
    expectStatus(current, 0, "current update check");
    const parsed = JSON.parse(current.stdout);
    assert.equal(parsed.status, "current");
    assert.equal(parsed.installed.verificationStatus, "verified");
    assert.equal(parsed.installed.computedRevision, catalog.engineRevision);
  } finally {
    rmSync(currentSandbox, { recursive: true, force: true });
  }

  const tamperedSandbox = makeSandbox("styleseed-update-tampered-");
  try {
    stageCoreDistribution(tamperedSandbox);
    writeFileSync(
      resolve(tamperedSandbox, "engine/.claude/skills/ss-score/SKILL.md"),
      "# tampered score skill\n",
    );
    const tampered = runUpdateChecker(tamperedSandbox);
    expectStatus(tampered, 0, "tampered update check");
    const parsed = JSON.parse(tampered.stdout);
    assert.equal(parsed.status, "installed-revision-tampered");
    assert.equal(parsed.installed.verificationStatus, "tampered");
  } finally {
    rmSync(tamperedSandbox, { recursive: true, force: true });
  }

  const incompleteSandbox = makeSandbox("styleseed-update-incomplete-");
  try {
    stageCoreDistribution(incompleteSandbox);
    unlinkSync(resolve(incompleteSandbox, "engine/ADAPTERS.md"));
    const incomplete = runUpdateChecker(incompleteSandbox);
    expectStatus(incomplete, 0, "incomplete update check");
    const parsed = JSON.parse(incomplete.stdout);
    assert.equal(parsed.status, "installed-revision-unverified");
    assert.equal(parsed.installed.verificationStatus, "incomplete");
  } finally {
    rmSync(incompleteSandbox, { recursive: true, force: true });
  }
});
