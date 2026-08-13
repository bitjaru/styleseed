import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const gateScript = resolve(
  repoRoot,
  "engine/.claude/skills/ss-score/scripts/evidence-gate.mjs",
);

function makeProjectRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sourceInventoryHash(projectRoot) {
  const sourcePath = resolve(projectRoot, "src/app/dashboard/page.tsx");
  const content = readFileSync(sourcePath);
  return digest(`src/app/dashboard/page.tsx\0${digest(content)}\0${content.byteLength}\n`);
}

function writeFixtureProject(projectRoot, {
  artifactId = "app-dashboard",
  runId = "run-001",
  score = 80,
  includeRequiredViewport = true,
  temporalRequired = false,
  temporalApplicability = "not-applicable",
  includeTemporalEvidence = false,
  humanAcceptance = false,
  bindReports = true,
} = {}) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/manifests"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/bundles"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "renders"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/app/dashboard"), { recursive: true });

  writeFileSync(resolve(projectRoot, ".styleseed/bundles/app-dashboard.md"), "# bundle\n");
  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){return null}\n");
  writeJson(resolve(projectRoot, ".styleseed/project.json"), { fixture: true });
  writeFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "renders", "desktop-loaded.png"), "png-bytes");
  if (includeTemporalEvidence) {
    mkdirSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "recordings"), { recursive: true });
    writeFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "recordings", "motion.webm"), "video-bytes");
  }

  writeJson(resolve(projectRoot, ".styleseed/artifacts", `${artifactId}.json`), {
    schemaVersion: 1,
    id: artifactId,
    target: { kind: "route", locator: "/dashboard" },
    selection: {
      grammar: "operations-console",
      adapter: "product-ui",
      domain: "developer-tools",
      page: "dashboard",
      recipe: "enterprise-workbench",
      palette: "cobalt-instrument",
      profile: "none",
      fallback: null,
    },
    decisions: {
      primaryDecision: "Which incident needs action now?",
      primaryAction: "Open incident",
      signatureMove: "Keep the selected incident visible while evidence expands.",
    },
    implementation: {
      sourceRoots: ["src/app/dashboard"],
      tokenFiles: [],
    },
    validation: {
      scoreFloor: 80,
      requiredRenders: includeRequiredViewport
        ? [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }]
        : [{ id: "desktop-loaded", state: "loaded", viewport: { width: 390, height: 844 } }],
      temporal: temporalRequired
        ? { required: true, scenarios: ["motion-review"] }
        : { required: false, scenarios: [] },
      humanAcceptance,
    },
  });

  writeJson(resolve(projectRoot, ".styleseed/manifests", `${artifactId}.json`), {
    schemaVersion: 2,
    artifactId,
    engineVersion: "test",
    engineRevision: "test",
    distributionIntegrity: "verified",
    selection: {
      agent: "codex",
      grammar: "operations-console",
      grammarSource: "catalog:grammars/operations-console",
      referenceContract: null,
      fallback: null,
      adapter: "product-ui",
      domain: "developer-tools",
      page: "dashboard",
      recipe: "enterprise-workbench",
      recipeSelection: "enterprise-workbench",
      palette: "cobalt-instrument",
      paletteSelection: "cobalt-instrument",
      paletteGeneration: null,
      profile: "none",
    },
    inputs: [
      { id: "project", path: ".styleseed/project.json", sha256: digest(readFileSync(resolve(projectRoot, ".styleseed/project.json"))), bytes: readFileSync(resolve(projectRoot, ".styleseed/project.json")).byteLength },
      { id: "artifact", path: `.styleseed/artifacts/${artifactId}.json`, sha256: digest(readFileSync(resolve(projectRoot, ".styleseed/artifacts", `${artifactId}.json`))), bytes: readFileSync(resolve(projectRoot, ".styleseed/artifacts", `${artifactId}.json`)).byteLength },
    ],
    sources: [],
    methodHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    validationHash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    bundle: {
      kind: "bundle",
      path: `.styleseed/bundles/${artifactId}.md`,
      sha256: digest(readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`))),
      bytes: readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`)).byteLength,
    },
    outputs: [
      {
        kind: "bundle",
        path: `.styleseed/bundles/${artifactId}.md`,
        sha256: digest(readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`))),
        bytes: readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`)).byteLength,
      },
    ],
  });

  writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "gate-run.json"), {
    schemaVersion: 1,
    artifactId,
    runId,
    manifestPath: `.styleseed/manifests/${artifactId}.json`,
    bundlePath: `.styleseed/bundles/${artifactId}.md`,
    methodHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    validationHash: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    bundleHash: digest(readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`))),
    bundleBytes: readFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`)).byteLength,
    repositoryRevision: null,
    implementation: {
      sourceRoots: ["src/app/dashboard"],
      inventoryHash: sourceInventoryHash(projectRoot),
    },
    gates: {
      deterministic: { attached: true, reportPath: ".styleseed/evidence/app-dashboard/run-001/deterministic.json" },
      code: { attached: true, reportPath: ".styleseed/evidence/app-dashboard/run-001/code.json" },
      visual: { attached: true, reportPath: ".styleseed/evidence/app-dashboard/run-001/visual.json" },
      temporal: { attached: true, reportPath: ".styleseed/evidence/app-dashboard/run-001/temporal.json" },
      acceptance: { attached: humanAcceptance, reportPath: humanAcceptance ? ".styleseed/evidence/app-dashboard/run-001/human.json" : null },
    },
  });

  writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "deterministic.json"), {
    detectorRevision: "detector-v1",
    inventoryHash: sourceInventoryHash(projectRoot),
    findings: [],
  });

  writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "code.json"), {
    score,
    categories: {
      color: 16,
      hierarchy: 16,
      layout: 12,
      surfaces: 10,
      states: 18,
      motion: 6,
      coherence: 12,
      distinctiveness: 10,
    },
    evidence: [],
    reviewer: null,
  });

  writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "visual.json"), {
    inspectionMethod: "manual",
    renders: [{
      id: "desktop-loaded",
      state: "loaded",
      viewport: { width: 1440, height: 1000 },
      path: `.styleseed/evidence/${artifactId}/${runId}/renders/desktop-loaded.png`,
      sha256: digest(readFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "renders", "desktop-loaded.png"))),
    }],
    findings: [],
  });

  writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "temporal.json"), {
    applicability: temporalApplicability,
    scenarios: includeTemporalEvidence
      ? [{
          id: "motion-review",
          recordingPath: `.styleseed/evidence/${artifactId}/${runId}/recordings/motion.webm`,
          recordingSha256: digest(readFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "recordings", "motion.webm"))),
          reducedMotion: "pass",
        }]
      : [],
  });

  if (humanAcceptance) {
    writeJson(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "human.json"), {
      decision: "accepted",
      reviewerAlias: "reviewer-a",
      reviewedAt: "2026-08-13T00:00:00.000Z",
      evidenceHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      note: "Alias is not authenticated unless a SEC-050 proof is present.",
    });
  }
  if (bindReports) {
    const gateRunPath = resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "gate-run.json");
    const gateRun = JSON.parse(readFileSync(gateRunPath, "utf8"));
    for (const gate of ["deterministic", "code", "visual", "temporal", ...(humanAcceptance ? ["human"] : [])]) {
      const reportPath = resolve(projectRoot, gateRun.gates[gate].reportPath);
      const bytes = readFileSync(reportPath);
      gateRun.gates[gate].reportSha256 = digest(bytes);
      gateRun.gates[gate].reportBytes = bytes.byteLength;
    }
    writeJson(gateRunPath, gateRun);
  }
}

function runGate(args, projectRoot) {
  return spawnSync(process.execPath, [gateScript, ...args], {
    encoding: "utf8",
    cwd: projectRoot,
  });
}

test("planned evidence gate module exists and can be imported", async () => {
  await import(gateScript);
});

test("attach accepts and binds a generated deterministic report", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-attach-deterministic-");
  try {
    writeFixtureProject(projectRoot, { bindReports: false });
    const gateRunPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/gate-run.json");
    const gateRun = JSON.parse(readFileSync(gateRunPath, "utf8"));
    gateRun.gates.deterministic = { attached: false, reportPath: null, reportSha256: null, reportBytes: null };
    writeJson(gateRunPath, gateRun);

    const run = runGate([
      "attach", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001",
      "--gate", "deterministic", "--report", ".styleseed/evidence/app-dashboard/run-001/deterministic.json", "--json",
    ], projectRoot);
    assert.equal(run.status, 0, run.stdout || run.stderr);
    const attached = JSON.parse(readFileSync(gateRunPath, "utf8")).gates.deterministic;
    assert.equal(attached.attached, true);
    assert.match(attached.reportSha256, /^sha256:[0-9a-f]{64}$/u);
    assert.ok(Number.isSafeInteger(attached.reportBytes));
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("init records a Git commit and refuses dirty implementation roots", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-git-revision-");
  try {
    writeFixtureProject(projectRoot);
    rmSync(resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001"), { recursive: true, force: true });
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "fixture@example.test"],
      ["config", "user.name", "StyleSeed Fixture"],
      ["add", "."],
      ["commit", "-qm", "fixture"],
    ]) {
      const result = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projectRoot, encoding: "utf8" }).stdout.trim();
    const clean = runGate(["init", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-clean", "--json"], projectRoot);
    assert.equal(clean.status, 0, clean.stdout || clean.stderr);
    const recorded = JSON.parse(readFileSync(resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-clean/gate-run.json"), "utf8"));
    assert.deepEqual(recorded.repositoryRevision, { vcs: "git", commit: head });

    writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){return 'dirty'}\n");
    const dirty = runGate(["init", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-dirty", "--json"], projectRoot);
    assert.notEqual(dirty.status, 0);
    assert.match(`${dirty.stdout}\n${dirty.stderr}`, /source roots must be clean/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify --all treats --all as a flag and reports missing runs", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-all-");
  try {
    mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
    writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), {
      schemaVersion: 1,
      artifacts: [{ id: "app-dashboard", config: "app-dashboard.json" }],
    });
    const run = runGate(["verify", "--project-root", ".", "--all", "--json"], projectRoot);
    assert.notEqual(run.status, 0);
    assert.doesNotMatch(run.stderr, /missing value for --all/u);
    assert.match(run.stdout, /required evidence run is missing/u);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify --all preserves failed history but accepts one current passing run per artifact", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-all-history-");
  try {
    writeFixtureProject(projectRoot);
    writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), {
      schemaVersion: 1,
      artifacts: [{ id: "app-dashboard", config: "app-dashboard.json" }],
    });
    const staleDir = resolve(projectRoot, ".styleseed/evidence/app-dashboard/stale-run");
    mkdirSync(staleDir, { recursive: true });
    const stale = JSON.parse(readFileSync(resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/gate-run.json"), "utf8"));
    stale.runId = "stale-run";
    stale.bundleHash = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    writeJson(resolve(staleDir, "gate-run.json"), stale);

    const run = runGate(["verify", "--project-root", ".", "--all", "--json"], projectRoot);
    assert.equal(run.status, 0, run.stdout || run.stderr);
    const result = JSON.parse(run.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.results[0].runs.length, 2);
    assert.equal(result.results[0].runs.some((candidate) => !candidate.ok), true);
    assert.equal(result.results[0].runs.some((candidate) => candidate.ok), true);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when an evidence report path is missing", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-missing-");
  try {
    writeFixtureProject(projectRoot);
    const missingPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/visual.json");
    rmSync(missingPath, { force: true });
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when a pre-attach gate-run omits report digests", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-unbound-report-");
  try {
    writeFixtureProject(projectRoot, { bindReports: false });
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
    assert.match(`${run.stdout}\n${run.stderr}`, /attachment digest is missing/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when a visual evidence path escapes by traversal or symlink", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-escape-");
  try {
    writeFixtureProject(projectRoot);
    const visualPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/visual.json");
    const visual = JSON.parse(readFileSync(visualPath, "utf8"));
    visual.renders[0].path = "../outside.png";
    writeJson(visualPath, visual);
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when screenshot bytes are tampered after attach", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-tamper-");
  try {
    writeFixtureProject(projectRoot);
    writeFileSync(resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/renders/desktop-loaded.png"), "tampered-png");
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails code evidence at 79 and allows the 80 floor", () => {
  const failRoot = makeProjectRoot("styleseed-gate-score79-");
  try {
    writeFixtureProject(failRoot, { score: 79 });
    const failRun = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], failRoot);
    assert.notEqual(failRun.status, 0, failRun.stdout || failRun.stderr);
  } finally {
    rmSync(failRoot, { recursive: true, force: true });
  }

  const passFloorRoot = makeProjectRoot("styleseed-gate-score80-");
  try {
    writeFixtureProject(passFloorRoot, { score: 80 });
    const passRun = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], passFloorRoot);
    assert.equal(passRun.status, 0, passRun.stdout || passRun.stderr);
  } finally {
    rmSync(passFloorRoot, { recursive: true, force: true });
  }
});

test("verify fails when a required viewport is missing", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-viewport-");
  try {
    writeFixtureProject(projectRoot, { includeRequiredViewport: false });
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when manifest method evidence is stale", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-method-");
  try {
    writeFixtureProject(projectRoot);
    const manifestPath = resolve(projectRoot, ".styleseed/manifests/app-dashboard.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.methodHash = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    writeJson(manifestPath, manifest);
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when temporal evidence is required but marked not-applicable", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-temporal-required-");
  try {
    writeFixtureProject(projectRoot, {
      temporalRequired: true,
      temporalApplicability: "not-applicable",
      includeTemporalEvidence: false,
    });
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when a required temporal scenario records reduced-motion failure", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-temporal-reduced-fail-");
  try {
    writeFixtureProject(projectRoot, {
      temporalRequired: true,
      temporalApplicability: "required",
      includeTemporalEvidence: true,
    });
    const temporalPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/temporal.json");
    const temporal = JSON.parse(readFileSync(temporalPath, "utf8"));
    temporal.scenarios[0].reducedMotion = "fail";
    writeJson(temporalPath, temporal);
    const gateRunPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/gate-run.json");
    const gateRun = JSON.parse(readFileSync(gateRunPath, "utf8"));
    const bytes = readFileSync(temporalPath);
    gateRun.gates.temporal.reportSha256 = digest(bytes);
    gateRun.gates.temporal.reportBytes = bytes.byteLength;
    writeJson(gateRunPath, gateRun);
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
    assert.match(run.stdout, /failed reduced-motion inspection/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when visual evidence contains a hard finding", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-visual-finding-");
  try {
    writeFixtureProject(projectRoot);
    const visualPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/visual.json");
    const visual = JSON.parse(readFileSync(visualPath, "utf8"));
    visual.findings = [{ severity: "fail", message: "Rendered focal action is missing." }];
    writeJson(visualPath, visual);
    const gateRunPath = resolve(projectRoot, ".styleseed/evidence/app-dashboard/run-001/gate-run.json");
    const gateRun = JSON.parse(readFileSync(gateRunPath, "utf8"));
    const bytes = readFileSync(visualPath);
    gateRun.gates.visual.reportSha256 = digest(bytes);
    gateRun.gates.visual.reportBytes = bytes.byteLength;
    writeJson(gateRunPath, gateRun);
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
    assert.match(run.stdout, /visual evidence contains hard findings/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("verify fails when implementation sources change after evidence capture", () => {
  const projectRoot = makeProjectRoot("styleseed-gate-source-drift-");
  try {
    writeFixtureProject(projectRoot);
    writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){return 'changed'}\n");
    const run = runGate(["verify", "--project-root", ".", "--artifact", "app-dashboard", "--run", "run-001", "--json"], projectRoot);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
