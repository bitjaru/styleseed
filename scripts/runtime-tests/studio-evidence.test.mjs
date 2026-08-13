import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceInventory } from "../../engine/.claude/skills/ss-score/scripts/evidence-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const studioRun = resolve(repoRoot, "engine/.claude/skills/ss-studio/scripts/studio-run.mjs");

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function writeJson(path, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path, text);
  return { bytes: Buffer.byteLength(text), sha256: sha256(text) };
}

function runCli(projectRoot, args) {
  return spawnSync(process.execPath, [studioRun, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

function expectStatus(run, status, label) {
  assert.equal(
    run.status,
    status,
    `${label} exited ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  );
}

function makeProjectRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function createStudioFixture(projectRoot, {
  artifactId = "app-dashboard",
  temporalRequired = true,
  includeRecordingOutput = true,
  includeTemporalScenario = true,
  humanAcceptance = true,
} = {}) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/manifests"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/bundles"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/studio"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/app/dashboard"), { recursive: true });
  mkdirSync(resolve(projectRoot, ".styleseed/evidence", artifactId, "gate-001", "renders"), { recursive: true });
  if (includeTemporalScenario) mkdirSync(resolve(projectRoot, ".styleseed/evidence", artifactId, "gate-001", "recordings"), { recursive: true });

  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Dashboard(){return null}\n");
  writeFileSync(resolve(projectRoot, ".styleseed/bundles", `${artifactId}.md`), "# bundle\n");
  writeFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, "gate-001", "renders", "desktop-loaded.png"), "png-bytes");
  if (includeTemporalScenario) {
    writeFileSync(resolve(projectRoot, ".styleseed/evidence", artifactId, "gate-001", "recordings", "motion.webm"), "recording-bytes");
  }

  const project = {
    schemaVersion: 1,
    projectId: "studio-test",
    defaults: {
      agent: "codex",
      domain: "developer-tools",
      adapter: "product-ui",
      recipe: "enterprise-workbench",
      palette: "cobalt-instrument",
      profile: "none",
      fallback: null,
    },
    brand: {
      keyColor: "#0F766E",
      paletteCharacter: "balanced",
      paletteMode: "light",
      paletteHarmony: "auto",
      surfaceTemperature: "neutral",
      fontFamilies: ["Inter"],
      radius: "soft",
      elevation: "restrained-shadow",
      density: "comfortable",
      motion: { seed: "spring", intensity: "restrained" },
      imageryRole: "product-proof-first",
    },
  };
  const artifact = {
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
    implementation: { sourceRoots: ["src/app/dashboard"], tokenFiles: [] },
    validation: {
      scoreFloor: 80,
      requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }],
      temporal: temporalRequired ? { required: true, scenarios: ["motion-review"] } : { required: false, scenarios: [] },
      humanAcceptance,
    },
  };

  const projectDigest = writeJson(resolve(projectRoot, ".styleseed/project.json"), project);
  const artifactDigest = writeJson(resolve(projectRoot, ".styleseed/artifacts", `${artifactId}.json`), artifact);
  writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), {
    schemaVersion: 1,
    artifacts: [{ id: artifactId, config: `${artifactId}.json` }],
  });

  const bundlePath = `.styleseed/bundles/${artifactId}.md`;
  const bundleText = readFileSync(resolve(projectRoot, bundlePath), "utf8");
  const bundleDigest = { bytes: Buffer.byteLength(bundleText), sha256: sha256(bundleText) };
  const inventory = sourceInventory(projectRoot, artifact.implementation.sourceRoots);
  const methodHash = sha256("method-hash");
  const validationHash = sha256("validation-hash");
  writeJson(resolve(projectRoot, ".styleseed/manifests", `${artifactId}.json`), {
    schemaVersion: 2,
    artifactId,
    engineVersion: "test",
    engineRevision: sha256("engine-revision"),
    distributionIntegrity: "verified",
    selection: {
      agent: "codex",
      grammar: artifact.selection.grammar,
      grammarSource: "catalog:grammars/operations-console",
      referenceContract: null,
      fallback: null,
      adapter: artifact.selection.adapter,
      domain: artifact.selection.domain,
      page: artifact.selection.page,
      recipe: artifact.selection.recipe,
      recipeSelection: artifact.selection.recipe,
      palette: artifact.selection.palette,
      paletteSelection: artifact.selection.palette,
      paletteGeneration: null,
      profile: artifact.selection.profile,
    },
    inputs: [
      { id: "project", path: ".styleseed/project.json", sha256: projectDigest.sha256, bytes: projectDigest.bytes },
      { id: "artifact", path: `.styleseed/artifacts/${artifactId}.json`, sha256: artifactDigest.sha256, bytes: artifactDigest.bytes },
    ],
    sources: [],
    methodHash,
    validationHash,
    bundle: { kind: "bundle", path: bundlePath, sha256: bundleDigest.sha256, bytes: bundleDigest.bytes },
    outputs: [{ kind: "bundle", path: bundlePath, sha256: bundleDigest.sha256, bytes: bundleDigest.bytes }],
  });

  const renderRelative = `.styleseed/evidence/${artifactId}/gate-001/renders/desktop-loaded.png`;
  const renderText = readFileSync(resolve(projectRoot, renderRelative), "utf8");
  const renderDigest = { bytes: Buffer.byteLength(renderText), sha256: sha256(renderText) };
  const recordingRelative = `.styleseed/evidence/${artifactId}/gate-001/recordings/motion.webm`;
  const deterministicReport = {
    detectorRevision: "detector-v1",
    inventoryHash: inventory.hash,
    findings: [],
  };
  const codeReport = {
    score: 80,
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
  };
  const visualReport = {
    inspectionMethod: "manual",
    renders: [{
      id: "desktop-loaded",
      state: "loaded",
      viewport: { width: 1440, height: 1000 },
      path: renderRelative,
      sha256: renderDigest.sha256,
      bytes: renderDigest.bytes,
    }],
    findings: [],
  };
  const temporalReport = temporalRequired
    ? {
        applicability: "required",
        scenarios: includeTemporalScenario ? [{
          id: "motion-review",
          recordingPath: recordingRelative,
          recordingSha256: sha256(readFileSync(resolve(projectRoot, recordingRelative), "utf8")),
          recordingBytes: Buffer.byteLength(readFileSync(resolve(projectRoot, recordingRelative), "utf8")),
          reducedMotion: "pass",
        }] : [],
      }
    : {
        applicability: "not-applicable",
        scenarios: [],
      };
  const evidenceDir = resolve(projectRoot, ".styleseed/evidence", artifactId, "gate-001");
  const reportDigests = {
    deterministic: writeJson(resolve(evidenceDir, "deterministic.json"), deterministicReport),
    code: writeJson(resolve(evidenceDir, "code.json"), codeReport),
    visual: writeJson(resolve(evidenceDir, "visual.json"), visualReport),
    temporal: writeJson(resolve(evidenceDir, "temporal.json"), temporalReport),
  };
  const acceptanceReport = humanAcceptance
    ? {
        decision: "accepted",
        reviewerAlias: "reviewer-a",
        reviewedAt: "2026-08-13T00:00:00.000Z",
        evidenceHash: sha256(`${JSON.stringify({
          methodHash,
          validationHash,
          bundleHash: bundleDigest.sha256,
          implementationHash: inventory.hash,
          reports: {
            deterministic: reportDigests.deterministic.sha256,
            code: reportDigests.code.sha256,
            visual: reportDigests.visual.sha256,
            temporal: reportDigests.temporal.sha256,
          },
        })}\n`),
        note: "Alias is not authenticated unless a SEC-050 proof is present.",
      }
    : null;
  if (acceptanceReport) reportDigests.human = writeJson(resolve(evidenceDir, "human.json"), acceptanceReport);

  writeJson(resolve(evidenceDir, "gate-run.json"), {
    schemaVersion: 1,
    artifactId,
    runId: "gate-001",
    manifestPath: `.styleseed/manifests/${artifactId}.json`,
    bundlePath,
    methodHash,
    validationHash,
    bundleHash: bundleDigest.sha256,
    bundleBytes: bundleDigest.bytes,
    implementation: { sourceRoots: artifact.implementation.sourceRoots, inventoryHash: inventory.hash },
    gates: {
      deterministic: {
        attached: true,
        reportPath: `.styleseed/evidence/${artifactId}/gate-001/deterministic.json`,
        reportSha256: reportDigests.deterministic.sha256,
        reportBytes: reportDigests.deterministic.bytes,
      },
      code: {
        attached: true,
        reportPath: `.styleseed/evidence/${artifactId}/gate-001/code.json`,
        reportSha256: reportDigests.code.sha256,
        reportBytes: reportDigests.code.bytes,
      },
      visual: {
        attached: true,
        reportPath: `.styleseed/evidence/${artifactId}/gate-001/visual.json`,
        reportSha256: reportDigests.visual.sha256,
        reportBytes: reportDigests.visual.bytes,
      },
      temporal: {
        attached: true,
        reportPath: `.styleseed/evidence/${artifactId}/gate-001/temporal.json`,
        reportSha256: reportDigests.temporal.sha256,
        reportBytes: reportDigests.temporal.bytes,
      },
      human: humanAcceptance
        ? {
            attached: true,
            reportPath: `.styleseed/evidence/${artifactId}/gate-001/human.json`,
            reportSha256: reportDigests.human.sha256,
            reportBytes: reportDigests.human.bytes,
          }
        : {
            attached: false,
            reportPath: null,
            reportSha256: null,
            reportBytes: null,
          },
    },
  });

  const init = runCli(projectRoot, [
    "init",
    "--project-root", ".",
    "--artifact", artifactId,
    "--name", "Studio Test",
    "--brief", "Build a verified interactive prototype with evidence-derived Studio verification.",
    "--surface", "mobile-app",
    "--platform", "web",
  ]);
  expectStatus(init, 0, "studio init");
  const runDir = init.stdout.trim();
  const runJsonPath = resolve(runDir, "run.json");
  const runJson = JSON.parse(readFileSync(runJsonPath, "utf8"));
  runJson.stage = "built";
  runJson.outputs.prototype = "/dashboard";
  runJson.outputs.recording = includeRecordingOutput ? recordingRelative : null;
  writeJson(runJsonPath, runJson);
  writeFileSync(resolve(runDir, "brief.md"), "# Studio Test\n\nBuild a verified interactive prototype with evidence-derived Studio verification.\n");
  writeJson(resolve(runDir, "references.json"), {
    items: [{
      id: "R1",
      role: "structure",
      source: "https://example.com/app",
      observedAt: "2026-08-13T00:00:00.000Z",
      observation: "The selected incident stays visible while detail expands.",
      principle: "Preserve source context during drill-down.",
      confidence: "high",
      rights: "reference only",
    }],
  });
  writeJson(resolve(runDir, "directions.json"), {
    directions: [
      {
        id: "native",
        lane: "native",
        name: "Native",
        promise: "Ship the clearest operator path.",
        grammar: "operations-console",
        recipe: "enterprise-workbench",
        palette: "cobalt-instrument",
        composition: "Primary worklist with anchored detail rail.",
        navigationChrome: "Light chrome with selected incident retained.",
        typeAndMaterial: "Dense instrument typography and restrained surfaces.",
        assetDirection: "No generated assets required.",
        motionDirection: "Minimal motion with fast state continuity.",
        signatureMove: "Selected incident remains pinned during expansion.",
        tradeoffs: ["Lower novelty, higher clarity"],
        cost: "medium",
        risk: "low",
      },
      {
        id: "signature",
        lane: "signature",
        name: "Signature",
        promise: "Add one memorable transition without losing operator trust.",
        grammar: "operations-console",
        recipe: "enterprise-workbench",
        palette: "cobalt-instrument",
        composition: "Detail plane expands from selected row.",
        navigationChrome: "Contextual controls attached to selection.",
        typeAndMaterial: "Instrument chrome with one stronger focal surface.",
        assetDirection: "No generated assets required.",
        motionDirection: "Selection morphs into detail plane.",
        signatureMove: "Pinned card expands into live detail.",
        tradeoffs: ["Higher implementation cost"],
        cost: "medium",
        risk: "medium",
      },
      {
        id: "experimental",
        lane: "experimental",
        name: "Experimental",
        promise: "Test a stronger cinematic incident transition.",
        grammar: "operations-console",
        recipe: "enterprise-workbench",
        palette: "cobalt-instrument",
        composition: "Selected incident temporarily owns the canvas.",
        navigationChrome: "Controls collapse until transition completes.",
        typeAndMaterial: "Higher contrast focal emphasis.",
        assetDirection: "No generated assets required.",
        motionDirection: "Bolder interpolation between states.",
        signatureMove: "Incident card sweeps into focus state.",
        tradeoffs: ["Higher risk of distraction"],
        cost: "high",
        risk: "high",
      },
    ],
  });
  writeJson(resolve(runDir, "selection.json"), {
    selectedDirectionId: "signature",
    decisionBy: "reviewer-a",
    decidedAt: "2026-08-13T00:00:00.000Z",
    rationale: "Best fit for focused operator continuity.",
  });
  writeJson(resolve(runDir, "scenes.json"), {
    scenes: [{
      id: "open-focus",
      trigger: "tap focus card",
      from: "home-rest",
      to: "focus-detail",
      continuity: ["selected card", "title"],
      enter: ["detail controls"],
      exit: ["secondary feed"],
      feedback: "Selected card lifts into the content plane.",
      interrupt: "Back restores the source card.",
      reducedMotion: "Instant state swap plus focus movement.",
      rendererTargets: ["web"],
    }],
  });
  writeJson(resolve(runDir, "assets.json"), { jobs: [] });
  writeJson(resolve(runDir, "video.json"), {
    mode: "prototype-first",
    shots: [{
      id: "V1",
      sourceType: "prototype-recording",
      scene: "open-focus",
      durationMs: 2400,
      source: includeRecordingOutput ? recordingRelative : null,
      status: includeRecordingOutput ? "complete" : "blocked",
      notes: "Prototype capture.",
    }],
  });
  writeJson(resolve(runDir, "verification.json"), {
    schemaVersion: 2,
    evidenceRunId: null,
    evidenceSummary: null,
    risks: [],
    updatedAt: "2026-08-13T00:00:00.000Z",
  });
  return { runDir, runId: runJson.id, renderRelative };
}

test("registry init requires --artifact", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-registry-");
  try {
    mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
    writeJson(resolve(projectRoot, ".styleseed/project.json"), {
      schemaVersion: 1,
      projectId: "studio-test",
      defaults: {
        agent: "codex",
        domain: "developer-tools",
        adapter: "product-ui",
        recipe: "enterprise-workbench",
        palette: "cobalt-instrument",
        profile: "none",
        fallback: null,
      },
      brand: {
        keyColor: "#0F766E",
        paletteCharacter: "balanced",
        paletteMode: "light",
        paletteHarmony: "auto",
        surfaceTemperature: "neutral",
        fontFamilies: ["Inter"],
        radius: "soft",
        elevation: "restrained-shadow",
        density: "comfortable",
        motion: { seed: "spring", intensity: "restrained" },
        imageryRole: "product-proof-first",
      },
    });
    writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), {
      schemaVersion: 1,
      artifacts: [{ id: "app-dashboard", config: "app-dashboard.json" }],
    });
    writeJson(resolve(projectRoot, ".styleseed/artifacts/app-dashboard.json"), {
      schemaVersion: 1,
      id: "app-dashboard",
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
      implementation: { sourceRoots: ["src/app/dashboard"], tokenFiles: [] },
      validation: {
        scoreFloor: 80,
        requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }],
        temporal: { required: false, scenarios: [] },
        humanAcceptance: false,
      },
    });
    const run = runCli(projectRoot, [
      "init",
      "--project-root", ".",
      "--name", "Studio Test",
      "--brief", "Build a verified interactive prototype with evidence-derived Studio verification.",
      "--surface", "mobile-app",
      "--platform", "web",
    ]);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
    assert.match(run.stderr, /require --artifact/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("gate command rejects manual pass strings", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-gate-pass-");
  try {
    const { runId } = createStudioFixture(projectRoot);
    const run = runCli(projectRoot, [
      "gate",
      "--project-root", ".",
      "--run", runId,
      "--gate", "temporal",
      "--status", "pass",
      "--note", "arbitrary string",
    ]);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("required recording omission fails evidence", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-missing-recording-");
  try {
    const { runId } = createStudioFixture(projectRoot, { temporalRequired: true, includeRecordingOutput: false });
    const run = runCli(projectRoot, [
      "evidence",
      "--project-root", ".",
      "--run", runId,
      "--evidence-run", "gate-001",
    ]);
    assert.notEqual(run.status, 0, run.stdout || run.stderr);
    assert.match(run.stderr, /local recording output/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("static temporal not-applicable can still verify", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-static-");
  try {
    const { runId, runDir } = createStudioFixture(projectRoot, {
      temporalRequired: false,
      includeRecordingOutput: false,
      includeTemporalScenario: false,
      humanAcceptance: false,
    });
    expectStatus(runCli(projectRoot, [
      "evidence",
      "--project-root", ".",
      "--run", runId,
      "--evidence-run", "gate-001",
    ]), 0, "static evidence");
    const verification = JSON.parse(readFileSync(resolve(runDir, "verification.json"), "utf8"));
    assert.equal(verification.evidenceSummary.status, "pass");
    expectStatus(runCli(projectRoot, [
      "advance",
      "--project-root", ".",
      "--run", runId,
      "--stage", "verified",
    ]), 0, "static verified");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("tampered evidence after attach fails and verified reruns do not trust stored pass", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-tamper-");
  try {
    const { runId, runDir, renderRelative } = createStudioFixture(projectRoot);
    expectStatus(runCli(projectRoot, [
      "evidence",
      "--project-root", ".",
      "--run", runId,
      "--evidence-run", "gate-001",
    ]), 0, "initial evidence");
    const verificationBefore = JSON.parse(readFileSync(resolve(runDir, "verification.json"), "utf8"));
    assert.equal(verificationBefore.evidenceSummary.status, "pass");
    writeFileSync(resolve(projectRoot, renderRelative), "tampered-png");
    const advance = runCli(projectRoot, [
      "advance",
      "--project-root", ".",
      "--run", runId,
      "--stage", "verified",
    ]);
    assert.notEqual(advance.status, 0, advance.stdout || advance.stderr);
    const verificationAfter = JSON.parse(readFileSync(resolve(runDir, "verification.json"), "utf8"));
    assert.equal(verificationAfter.evidenceSummary.status, "fail");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("only the complete fixture reaches verified", () => {
  const projectRoot = makeProjectRoot("styleseed-studio-complete-");
  try {
    const { runId, runDir } = createStudioFixture(projectRoot);
    expectStatus(runCli(projectRoot, [
      "evidence",
      "--project-root", ".",
      "--run", runId,
      "--evidence-run", "gate-001",
    ]), 0, "complete evidence");
    expectStatus(runCli(projectRoot, [
      "advance",
      "--project-root", ".",
      "--run", runId,
      "--stage", "verified",
    ]), 0, "complete verified");
    const runJson = JSON.parse(readFileSync(resolve(runDir, "run.json"), "utf8"));
    assert.equal(runJson.stage, "verified");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
