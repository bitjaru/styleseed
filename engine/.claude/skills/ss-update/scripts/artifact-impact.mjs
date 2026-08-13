import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseStrictJson,
  safeProjectPath,
  sha256,
} from "../../ss-resolve/scripts/runtime-contract.mjs";
import { loadProjectRegistry } from "../../ss-resolve/scripts/project-registry.mjs";
import { compileContext, defaultCatalog } from "../../ss-resolve/scripts/compiler.mjs";

const CURRENT = Object.freeze({
  deterministic: "current",
  code: "current",
  visual: "current",
  temporal: "current",
  human: "current",
});

const STALE = Object.freeze({
  deterministic: "stale",
  code: "stale",
  visual: "stale",
  temporal: "stale",
  human: "stale",
});

function readJson(path) {
  return parseStrictJson(readFileSync(path, "utf8"));
}

function manifestPathFor(projectRoot, artifactId) {
  return resolve(projectRoot, ".styleseed", "manifests", `${artifactId}.json`);
}

function cloneEvidence(seed = CURRENT) {
  return { ...seed };
}

function result(id, status, changedInputs, bundleRecompileRequired, evidence) {
  return { id, status, changedInputs, bundleRecompileRequired, evidence };
}

function findManifestInput(manifest, id) {
  return Array.isArray(manifest?.inputs) ? manifest.inputs.find((entry) => entry.id === id) ?? null : null;
}

function collectChangedInputs(projectRoot, manifest, registry, artifactEntry) {
  const changed = [];
  if (findManifestInput(manifest, "project")?.sha256 !== sha256(readFileSync(registry.paths.projectFile))) changed.push("project");
  if (findManifestInput(manifest, "artifact")?.sha256 !== sha256(readFileSync(artifactEntry.path))) changed.push("artifact");
  return changed;
}

function outputsCorrupt(projectRoot, manifest) {
  const outputs = Array.isArray(manifest?.outputs) ? manifest.outputs : [];
  for (const output of outputs) {
    const path = safeProjectPath(projectRoot, output.path);
    if (!existsSync(path)) return true;
    const content = readFileSync(path);
    if (typeof output.bytes === "number" && statSync(path).size !== output.bytes) return true;
    if (typeof output.sha256 === "string" && sha256(content) !== output.sha256) return true;
  }
  return false;
}

function currentValidationSlices(liveArtifact) {
  return {
    target: sha256(liveArtifact.target),
    implementation: sha256(liveArtifact.implementation),
    scoreFloor: sha256(liveArtifact.validation.scoreFloor),
    requiredRenders: sha256(liveArtifact.validation.requiredRenders),
    temporal: sha256(liveArtifact.validation.temporal),
    humanAcceptance: sha256(liveArtifact.validation.humanAcceptance),
  };
}

function deriveValidationEvidence(liveArtifact, previousSlices) {
  if (!previousSlices) return cloneEvidence(STALE);
  const evidence = cloneEvidence();
  const current = currentValidationSlices(liveArtifact);
  if (current.target !== previousSlices.target) {
    evidence.code = "stale";
    evidence.visual = "stale";
    evidence.temporal = "stale";
  }
  if (current.implementation !== previousSlices.implementation) {
    evidence.deterministic = "stale";
    evidence.code = "stale";
    evidence.visual = "stale";
    evidence.temporal = "stale";
  }
  if (current.scoreFloor !== previousSlices.scoreFloor) {
    evidence.deterministic = "stale";
    evidence.code = "stale";
  }
  if (current.requiredRenders !== previousSlices.requiredRenders) {
    evidence.visual = "stale";
  }
  if (current.temporal !== previousSlices.temporal) {
    evidence.temporal = "stale";
  }
  if (current.humanAcceptance !== previousSlices.humanAcceptance) {
    evidence.human = "stale";
  }
  return evidence;
}

function inspectArtifact(projectRoot, registry, artifactEntry, installedCatalog) {
  const manifestPath = manifestPathFor(projectRoot, artifactEntry.id);
  if (!existsSync(manifestPath)) {
    return result(artifactEntry.id, "legacy", ["legacy-manifest"], true, cloneEvidence(STALE));
  }

  const manifest = readJson(manifestPath);
  if (manifest?.schemaVersion !== 2) {
    return result(artifactEntry.id, "legacy", ["legacy-manifest"], true, cloneEvidence(STALE));
  }

  if (outputsCorrupt(projectRoot, manifest)) {
    return result(artifactEntry.id, "corrupt", [], true, cloneEvidence(STALE));
  }

  const changedInputs = collectChangedInputs(projectRoot, manifest, registry, artifactEntry);

  const compiled = compileContext({
    catalog: defaultCatalog,
    projectRoot,
    agent: registry.project.defaults.agent,
    normalizedProject: registry.project,
    normalizedArtifact: artifactEntry.artifact,
    inputFiles: {
      project: { path: ".styleseed/project.json", content: readFileSync(registry.paths.projectFile, "utf8") },
      artifact: { path: artifactEntry.relativePath, content: readFileSync(artifactEntry.path, "utf8") },
    },
    mode: "registry",
  });

  if (compiled.manifest.methodHash !== manifest.methodHash) {
    return result(
      artifactEntry.id,
      "method-changed",
      changedInputs,
      true,
      cloneEvidence(STALE),
    );
  }

  if (compiled.manifest.validationHash !== manifest.validationHash) {
    return result(
      artifactEntry.id,
      "validation-changed",
      changedInputs,
      false,
      deriveValidationEvidence(artifactEntry.artifact, manifest.validationSlices ?? null),
    );
  }

  if (
    installedCatalog
    && (
      installedCatalog.engineRevision !== manifest.engineRevision
      || installedCatalog.engineVersion !== manifest.engineVersion
    )
  ) {
    return result(
      artifactEntry.id,
      "metadata-changed",
      ["core"],
      true,
      {
        deterministic: "stale",
        code: "stale",
        visual: "current",
        temporal: "current",
        human: "current",
      },
    );
  }

  return result(artifactEntry.id, "current", [], false, cloneEvidence());
}

export function inspectArtifactImpact({ projectRoot, installedCatalog = null } = {}) {
  const registry = loadProjectRegistry(projectRoot, { catalog: defaultCatalog });
  if (!registry) return { artifacts: [] };
  return {
    artifacts: registry.artifacts
      .map((artifactEntry) => inspectArtifact(projectRoot, registry, artifactEntry, installedCatalog))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export default inspectArtifactImpact;
