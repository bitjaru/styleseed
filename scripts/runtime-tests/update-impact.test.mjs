import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const artifactImpactModule = import("../../engine/.claude/skills/ss-update/scripts/artifact-impact.mjs");
const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolver = resolve(repoRoot, "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs");
const updateChecker = resolve(repoRoot, "engine/.claude/skills/ss-update/scripts/check-update.mjs");

function makeRoot(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runResolver(projectRoot, extraArgs = []) {
  const result = spawnSync(process.execPath, [resolver, "--project-root", projectRoot, ...extraArgs], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function currentInstalledCatalog(projectRoot) {
  const manifest = readJson(resolve(projectRoot, ".styleseed/manifests/app-dashboard.json"));
  return {
    engineVersion: manifest.engineVersion,
    engineRevision: manifest.engineRevision,
  };
}

function freezeSnapshots(projectRoot, artifactIds) {
  mkdirSync(resolve(projectRoot, ".styleseed/snapshots/artifacts"), { recursive: true });
  cpSync(resolve(projectRoot, ".styleseed/project.json"), resolve(projectRoot, ".styleseed/snapshots/project.json"));
  for (const artifactId of artifactIds) {
    cpSync(
      resolve(projectRoot, ".styleseed/artifacts", `${artifactId}.json`),
      resolve(projectRoot, ".styleseed/snapshots/artifacts", `${artifactId}.json`),
    );
    const manifestPath = resolve(projectRoot, ".styleseed/manifests", `${artifactId}.json`);
    const manifest = readJson(manifestPath);
    manifest.inputs = manifest.inputs.map((entry) => {
      if (entry.id === "project") {
        const content = readFileSync(resolve(projectRoot, ".styleseed/snapshots/project.json"));
        return {
          ...entry,
          path: ".styleseed/snapshots/project.json",
          sha256: sha256(content),
          bytes: content.byteLength,
        };
      }
      if (entry.id === "artifact") {
        const snapshotPath = resolve(projectRoot, ".styleseed/snapshots/artifacts", `${artifactId}.json`);
        const content = readFileSync(snapshotPath);
        return {
          ...entry,
          path: `.styleseed/snapshots/artifacts/${artifactId}.json`,
          sha256: sha256(content),
          bytes: content.byteLength,
        };
      }
      return entry;
    });
    writeJson(manifestPath, manifest);
  }
}

function writeRegistryFixture(projectRoot) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/app/dashboard"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/styles"), { recursive: true });
  mkdirSync(resolve(projectRoot, "docs"), { recursive: true });

  writeJson(resolve(projectRoot, ".styleseed/project.json"), {
    schemaVersion: 1,
    projectId: "update-impact-test",
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
  });

  writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), {
    schemaVersion: 1,
    artifacts: [
      { id: "app-dashboard", config: "app-dashboard.json" },
      { id: "legacy-report", config: "legacy-report.json" },
    ],
  });

  writeJson(resolve(projectRoot, ".styleseed/artifacts/app-dashboard.json"), {
    schemaVersion: 1,
    id: "app-dashboard",
    target: { kind: "route", locator: "/dashboard" },
    selection: {
      grammar: "operations-console",
      adapter: null,
      domain: null,
      page: "dashboard",
      recipe: null,
      palette: null,
      profile: null,
      fallback: null,
    },
    decisions: {
      primaryDecision: "Which issue needs action now?",
      primaryAction: "Open issue",
      signatureMove: "Keep the selected issue visible while scanning evidence.",
    },
    implementation: {
      sourceRoots: ["src/app/dashboard"],
      tokenFiles: ["src/styles/tokens.css"],
    },
    validation: {
      scoreFloor: 84,
      requiredRenders: [
        { id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } },
        { id: "desktop-empty", state: "empty", viewport: { width: 1440, height: 1000 } },
      ],
      temporal: { required: true, scenarios: ["open-issue-panel"] },
      humanAcceptance: true,
    },
  });

  writeJson(resolve(projectRoot, ".styleseed/artifacts/legacy-report.json"), {
    schemaVersion: 1,
    id: "legacy-report",
    target: { kind: "document", locator: "docs/report.md" },
    selection: {
      grammar: "editorial-reading",
      adapter: "document-report",
      domain: "content",
      page: "detail",
      recipe: "editorial-authority",
      palette: "editorial-ink",
      profile: "none",
      fallback: null,
    },
    decisions: {
      primaryDecision: "Can a reviewer scan the findings quickly?",
      primaryAction: "Read the report",
      signatureMove: "Lead with an executive summary before evidence sections.",
    },
    implementation: {
      sourceRoots: ["docs"],
      tokenFiles: [],
    },
    validation: {
      scoreFloor: 80,
      requiredRenders: [
        { id: "page-1", state: "loaded", viewport: { width: 1440, height: 1000 } },
      ],
      temporal: { required: false, scenarios: [] },
      humanAcceptance: false,
    },
  });
  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page() { return null; }\n");
  writeFileSync(resolve(projectRoot, "src/styles/tokens.css"), ":root { --token: #0F766E; }\n");
  writeFileSync(resolve(projectRoot, "docs/report.md"), "# Report\n\nEvidence\n");

  runResolver(projectRoot, ["--artifact", "app-dashboard", "--agent", "codex"]);
  freezeSnapshots(projectRoot, ["app-dashboard"]);

  writeJson(resolve(projectRoot, ".styleseed/manifests/legacy-report.json"), {
    schemaVersion: 1,
    engineVersion: "3.9.0",
    engineRevision: null,
    generatedAt: "2026-08-10T00:00:00.000Z",
    selection: {
      grammar: "editorial-reading",
      adapter: "document-report",
      domain: "content",
      page: "detail",
      recipe: "editorial-authority",
      palette: "editorial-ink",
      profile: "none",
    },
    bundle: {
      path: ".styleseed/bundles/legacy-report.md",
      sha256: "1212121212121212121212121212121212121212121212121212121212121212",
      bytes: 19,
    },
    outputs: [
      {
        kind: "bundle",
        path: ".styleseed/bundles/legacy-report.md",
        sha256: "1212121212121212121212121212121212121212121212121212121212121212",
        bytes: 19,
      },
    ],
    palette: null,
    sources: [],
  });
  writeFileSync(resolve(projectRoot, ".styleseed/bundles/legacy-report.md"), "legacy bundle file\n");
}

test("inspectArtifactImpact reports current artifacts with per-gate evidence", async () => {
  const root = makeRoot("styleseed-update-impact-current-");
  try {
    writeRegistryFixture(root);
    const { inspectArtifactImpact } = await artifactImpactModule;
    const installedCatalog = currentInstalledCatalog(root);
    const result = inspectArtifactImpact({
      projectRoot: root,
      installedCatalog,
    });
    assert.equal(result.artifacts.length, 2);
    assert.deepEqual(result.artifacts.find((entry) => entry.id === "app-dashboard"), {
      id: "app-dashboard",
      status: "current",
      changedInputs: [],
      bundleRecompileRequired: false,
      evidence: {
        deterministic: "current",
        code: "current",
        visual: "current",
        temporal: "current",
        human: "current",
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inspectArtifactImpact distinguishes corruption, method drift, validation drift, metadata-only drift, and legacy manifests", async () => {
  const root = makeRoot("styleseed-update-impact-statuses-");
  try {
    writeRegistryFixture(root);
    writeFileSync(resolve(root, ".styleseed/bundles/app-dashboard.md"), "tampered bundle bytes\n");
    const { inspectArtifactImpact } = await artifactImpactModule;
    let installedCatalog = currentInstalledCatalog(root);
    const corrupt = inspectArtifactImpact({
      projectRoot: root,
      installedCatalog,
    });
    assert.equal(corrupt.artifacts.find((entry) => entry.id === "app-dashboard")?.status, "corrupt");

    writeRegistryFixture(root);
    installedCatalog = currentInstalledCatalog(root);
    const artifact = JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/app-dashboard.json"), "utf8"));
    artifact.decisions.signatureMove = "Lead with an exception strip before the issue list.";
    writeJson(resolve(root, ".styleseed/artifacts/app-dashboard.json"), artifact);
    const methodChanged = inspectArtifactImpact({
      projectRoot: root,
      installedCatalog,
    });
    assert.deepEqual(methodChanged.artifacts.find((entry) => entry.id === "app-dashboard"), {
      id: "app-dashboard",
      status: "method-changed",
      changedInputs: ["artifact"],
      bundleRecompileRequired: true,
      evidence: {
        deterministic: "stale",
        code: "stale",
        visual: "stale",
        temporal: "stale",
        human: "stale",
      },
    });

    writeRegistryFixture(root);
    installedCatalog = currentInstalledCatalog(root);
    const validationArtifact = JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/app-dashboard.json"), "utf8"));
    validationArtifact.validation.requiredRenders = [
      { id: "desktop-loaded", state: "loaded", viewport: { width: 1512, height: 982 } },
    ];
    writeJson(resolve(root, ".styleseed/artifacts/app-dashboard.json"), validationArtifact);
    const validationChanged = inspectArtifactImpact({
      projectRoot: root,
      installedCatalog,
    });
    assert.deepEqual(validationChanged.artifacts.find((entry) => entry.id === "app-dashboard"), {
      id: "app-dashboard",
      status: "validation-changed",
      changedInputs: ["artifact"],
      bundleRecompileRequired: false,
      evidence: {
        deterministic: "current",
        code: "current",
        visual: "stale",
        temporal: "current",
        human: "current",
      },
    });

    writeRegistryFixture(root);
    installedCatalog = currentInstalledCatalog(root);
    const metadataChanged = inspectArtifactImpact({
      projectRoot: root,
      installedCatalog: {
        engineVersion: `${installedCatalog.engineVersion}-metadata`,
        engineRevision: installedCatalog.engineRevision.replace(/^sha256:/u, "sha256:22"),
      },
    });
    assert.deepEqual(metadataChanged.artifacts.find((entry) => entry.id === "app-dashboard"), {
      id: "app-dashboard",
      status: "metadata-changed",
      changedInputs: ["core"],
      bundleRecompileRequired: true,
      evidence: {
        deterministic: "stale",
        code: "stale",
        visual: "current",
        temporal: "current",
        human: "current",
      },
    });

    assert.deepEqual(metadataChanged.artifacts.find((entry) => entry.id === "legacy-report"), {
      id: "legacy-report",
      status: "legacy",
      changedInputs: ["legacy-manifest"],
      bundleRecompileRequired: true,
      evidence: {
        deterministic: "stale",
        code: "stale",
        visual: "stale",
        temporal: "stale",
        human: "stale",
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check-update CLI includes sorted computed artifact impact", () => {
  const root = makeRoot("styleseed-update-impact-cli-");
  try {
    writeRegistryFixture(root);
    const catalog = readJson(resolve(repoRoot, "engine/.claude/skills/ss-resolve/references/catalog.json"));
    const remotePath = resolve(root, "remote-version.json");
    writeJson(remotePath, {
      version: catalog.engineVersion,
      revision: catalog.distributions?.core?.revision ?? catalog.engineRevision,
    });
    const run = spawnSync(process.execPath, [
      updateChecker,
      "--project-root", root,
      "--remote", remotePath,
      "--json",
    ], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const output = JSON.parse(run.stdout);
    assert.deepEqual(output.artifacts.map((entry) => entry.id), ["app-dashboard", "legacy-report"]);
    assert.equal(output.artifacts[0].status, "current");
    assert.equal(output.artifacts[1].status, "legacy");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validation slice hashes allow selective staleness without private snapshots", async () => {
  const root = makeRoot("styleseed-update-impact-slices-");
  try {
    writeRegistryFixture(root);
    rmSync(resolve(root, ".styleseed/snapshots"), { recursive: true, force: true });
    const artifactPath = resolve(root, ".styleseed/artifacts/app-dashboard.json");
    const artifact = readJson(artifactPath);
    artifact.validation.humanAcceptance = false;
    writeJson(artifactPath, artifact);
    const { inspectArtifactImpact } = await artifactImpactModule;
    const result = inspectArtifactImpact({ projectRoot: root, installedCatalog: currentInstalledCatalog(root) });
    assert.deepEqual(result.artifacts.find((entry) => entry.id === "app-dashboard")?.evidence, {
      deterministic: "current",
      code: "current",
      visual: "current",
      temporal: "current",
      human: "stale",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("older v2 manifests without validation slices fail closed on validation drift", async () => {
  const root = makeRoot("styleseed-update-impact-old-v2-");
  try {
    writeRegistryFixture(root);
    const manifestPath = resolve(root, ".styleseed/manifests/app-dashboard.json");
    const manifest = readJson(manifestPath);
    delete manifest.validationSlices;
    writeJson(manifestPath, manifest);
    const artifactPath = resolve(root, ".styleseed/artifacts/app-dashboard.json");
    const artifact = readJson(artifactPath);
    artifact.validation.requiredRenders[0].viewport.width = 1512;
    writeJson(artifactPath, artifact);
    const { inspectArtifactImpact } = await artifactImpactModule;
    const entry = inspectArtifactImpact({ projectRoot: root, installedCatalog: currentInstalledCatalog(root) })
      .artifacts.find((item) => item.id === "app-dashboard");
    assert.equal(entry.status, "validation-changed");
    assert.deepEqual(entry.evidence, {
      deterministic: "stale", code: "stale", visual: "stale", temporal: "stale", human: "stale",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
