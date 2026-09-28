import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const names = ["page.tsx", "flows.test.mjs", "model.mjs"].filter((name) => existsSync(resolve(projectRoot, "src/app/dashboard", name))).sort();
  return digest(names.map((name) => {
    const path = `src/app/dashboard/${name}`;
    const content = readFileSync(resolve(projectRoot, path));
    return `${path}\0${digest(content)}\0${content.byteLength}\n`;
  }).join(""));
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
  functionalTest,
  functionalScenarios = ["save-retains-draft"],
  mutateModel = false,
} = {}) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/manifests"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/bundles"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/evidence", artifactId, runId, "renders"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/app/dashboard"), { recursive: true });

  writeFileSync(resolve(projectRoot, ".styleseed/bundles/app-dashboard.md"), "# bundle\n");
  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){return null}\n");
  if (functionalTest !== undefined) {
    writeFileSync(resolve(projectRoot, "src/app/dashboard/flows.test.mjs"), functionalTest);
    const model = readFileSync(resolve(repoRoot, "research/design-judgment/common/model.mjs"), "utf8");
    writeFileSync(resolve(projectRoot, "src/app/dashboard/model.mjs"), mutateModel ? model.replace("reason: 'save-failed', saved: current, draft", "reason: 'save-failed', saved: current, draft: current") : model);
  }
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
      ...(functionalTest !== undefined ? { functional: { scenarios: functionalScenarios } } : {}),
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
      human: { attached: humanAcceptance, reportPath: humanAcceptance ? ".styleseed/evidence/app-dashboard/run-001/human.json" : null },
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

const functionalRunner = resolve(repoRoot, "engine/.claude/skills/ss-score/scripts/run-functional-tests.mjs");
const draftTest = `import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSettings, hasUnsavedChanges } from './model.mjs';
test('save-retains-draft', () => {
  const saved = { workspaceName: 'Original', digest: 'daily', retentionDays: 30 };
  const draft = { ...saved, workspaceName: 'New workspace' };
  const result = saveSettings(saved, draft, { role: 'editor', fail: true });
  assert.equal(result.ok, false);
  assert.deepEqual(result.draft, draft);
  assert.equal(hasUnsavedChanges(result.saved, result.draft), true);
});`;

function runFunctional(root, extra = []) {
  return spawnSync(process.execPath, [functionalRunner, "--project-root", root, "--artifact", "app-dashboard", "--run", "run-001", "--test", "src/app/dashboard/flows.test.mjs", ...extra], { encoding: "utf8" });
}
function attachFunctional(root) {
  return runGate(["attach", "--project-root", root, "--artifact", "app-dashboard", "--run", "run-001", "--gate", "functional", "--report", ".styleseed/evidence/app-dashboard/run-001/functional/report.json", "--json"], root);
}
function verifyFunctional(root) {
  const result = runGate(["verify", "--project-root", root, "--artifact", "app-dashboard", "--run", "run-001", "--json"], root);
  return { ...JSON.parse(result.stdout), exit: result.status };
}

test("a perfect code/visual fixture cannot pass until required functional scenarios run", () => {
  const root = makeProjectRoot("styleseed-functional-");
  try {
    writeFixtureProject(root, { score: 100, functionalTest: draftTest });
    assert.equal(verifyFunctional(root).gates.functional, "fail");
    const run = runFunctional(root); assert.equal(run.status, 0, run.stderr);
    assert.equal(attachFunctional(root).status, 0);
    assert.equal(verifyFunctional(root).ok, true);
    assert.notEqual(runFunctional(root).status, 0, "must not overwrite an existing run");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("losing a draft on failed save blocks completion despite a perfect aesthetic score", () => {
  const root = makeProjectRoot("styleseed-functional-defect-");
  try {
    writeFixtureProject(root, { score: 100, functionalTest: draftTest, mutateModel: true });
    const run = runFunctional(root); assert.notEqual(run.status, 0);
    assert.equal(attachFunctional(root).status, 0, run.stderr);
    const result = verifyFunctional(root);
    assert.equal(result.ok, false); assert.equal(result.gates.functional, "fail");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("skipped tests, missing scenarios, and empty successful programs cannot establish functional completion", () => {
  for (const options of [
    { functionalTest: draftTest.replace("test('save-retains-draft',", "test.skip('save-retains-draft',") },
    { functionalTest: draftTest, functionalScenarios: ["save-retains-draft", "permission-denied"] },
    { functionalTest: "// Exit zero without any tests.\n" },
  ]) {
    const root = makeProjectRoot("styleseed-functional-incomplete-");
    try {
      writeFixtureProject(root, options);
      assert.notEqual(runFunctional(root).status, 0);
      attachFunctional(root);
      assert.equal(verifyFunctional(root).ok, false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("functional evidence binds source, runner output, and attachment bytes", () => {
  for (const mutation of ["source", "output", "report"]) {
    const root = makeProjectRoot("styleseed-functional-binding-");
    try {
      writeFixtureProject(root, { functionalTest: draftTest });
      const run = runFunctional(root); assert.equal(run.status, 0, run.stderr);
      assert.equal(attachFunctional(root).status, 0);
      const path = mutation === "source" ? "src/app/dashboard/model.mjs" : `.styleseed/evidence/app-dashboard/run-001/functional/${mutation === "output" ? "events.jsonl" : "report.json"}`;
      writeFileSync(resolve(root, path), readFileSync(resolve(root, path), "utf8") + "\n");
      assert.equal(verifyFunctional(root).ok, false, mutation);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("rewriting normalized check results cannot hide a skipped raw test", () => {
  const root = makeProjectRoot("styleseed-functional-forged-");
  try {
    writeFixtureProject(root, { functionalTest: draftTest.replace("test('save-retains-draft',", "test.skip('save-retains-draft',") });
    runFunctional(root);
    const path = resolve(root, ".styleseed/evidence/app-dashboard/run-001/functional/report.json");
    const report = JSON.parse(readFileSync(path, "utf8")); report.checks[0].status = "pass";
    writeJson(path, report);
    assert.notEqual(attachFunctional(root).status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("legacy artifacts remain compatible without claiming functional verification", () => {
  const root = makeProjectRoot("styleseed-functional-legacy-");
  try {
    writeFixtureProject(root);
    const result = verifyFunctional(root);
    assert.equal(result.ok, true); assert.equal(result.gates.functional, "not-required");
    assert.match(result.warnings.join(" "), /no functional verification/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("planned evidence gate module exists and can be imported", async () => {
  await import(pathToFileURL(gateScript).href);
});

test("read-only verification rechecks evidence without creating or replacing its summary", async () => {
  const root = makeProjectRoot("styleseed-gate-readonly-");
  try {
    writeFixtureProject(root);
    const { verifyEvidenceRun } = await import(pathToFileURL(gateScript).href);
    const args = { projectRoot: root, artifactId: "app-dashboard", runId: "run-001", writeSummary: false };
    const summary = resolve(root, ".styleseed/evidence/app-dashboard/run-001/verification.json");
    const first = verifyEvidenceRun(args);
    assert.equal(first.ok, true, JSON.stringify(first.errors));
    assert.equal(existsSync(summary), false);
    writeFileSync(summary, '{"status":"pass","cached":true}\n');
    const before = readFileSync(summary, "utf8");
    writeFileSync(resolve(root, ".styleseed/evidence/app-dashboard/run-001/code.json"), '{"score":100}\n');
    const second = verifyEvidenceRun(args);
    assert.equal(second.ok, false);
    assert.equal(readFileSync(summary, "utf8"), before);
    verifyEvidenceRun({ ...args, writeSummary: true });
    assert.equal(JSON.parse(readFileSync(summary, "utf8")).status, "fail");
  } finally { rmSync(root, { recursive: true, force: true }); }
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


test("functional runner refuses untracked test scope before execution", () => {
  const root = makeProjectRoot("styleseed-functional-scope-");
  try {
    writeFixtureProject(root, { functionalTest: draftTest });
    writeFileSync(resolve(root, "outside.test.mjs"), "throw new Error('should-never-execute');");
    const result = runFunctional(root, ["--test", "outside.test.mjs"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /covered by implementation.sourceRoots/u);
    assert.equal(existsSync(resolve(root, ".styleseed/evidence/app-dashboard/run-001/functional")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("source mutation, timeout, duplicate IDs and nested tests cannot issue a functional report", () => {
  for (const [source, extra, message] of [
    [draftTest + "\nimport { appendFileSync } from 'node:fs'; appendFileSync(new URL('./model.mjs', import.meta.url), '\\n');", [], /changed during execution/u],
    ["import test from 'node:test'; test('save-retains-draft', async () => { await new Promise(resolve => setTimeout(resolve, 10000)); });", ["--timeout-ms", "1000"], /interrupted/u],
    [draftTest + "\ntest('save-retains-draft', () => {});", [], /unique scenario IDs/u],
    ["import test from 'node:test'; test('save-retains-draft', async (t) => { await t.test('nested', () => {}); });", [], /flat Node tests/u],
  ]) {
    const root = makeProjectRoot("styleseed-functional-runner-");
    try {
      writeFixtureProject(root, { functionalTest: source });
      const result = runFunctional(root, extra);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.equal(existsSync(resolve(root, ".styleseed/evidence/app-dashboard/run-001/functional/report.json")), false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test("human acceptance binds the executed functional report", () => {
  const root = makeProjectRoot("styleseed-functional-human-");
  try {
    writeFixtureProject(root, { functionalTest: draftTest, humanAcceptance: true });
    assert.equal(runFunctional(root).status, 0);
    assert.equal(attachFunctional(root).status, 0);
    const prefix = ".styleseed/evidence/app-dashboard/run-001/";
    const gateRun = JSON.parse(readFileSync(resolve(root, prefix, "gate-run.json"), "utf8"));
    const acceptancePath = resolve(root, prefix, "human.json");
    const human = JSON.parse(readFileSync(acceptancePath, "utf8"));
    const acceptanceHash = (includeFunctional) => digest(JSON.stringify({
      methodHash: gateRun.methodHash, validationHash: gateRun.validationHash, bundleHash: gateRun.bundleHash,
      implementationHash: gateRun.implementation.inventoryHash,
      reports: Object.fromEntries(["deterministic", "code", "visual", "temporal", ...(includeFunctional ? ["functional"] : [])].map((gate) => [gate, gateRun.gates[gate].reportSha256])),
    }) + "\n");
    for (const [includeFunctional, expected] of [[false, false], [true, true]]) {
      human.evidenceHash = acceptanceHash(includeFunctional); writeJson(acceptancePath, human);
      assert.equal(runGate(["attach", "--project-root", root, "--artifact", "app-dashboard", "--run", "run-001", "--gate", "human", "--report", prefix + "human.json", "--json"], root).status, 0);
      assert.equal(verifyFunctional(root).ok, expected);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
