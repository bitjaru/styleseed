import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SAFE_ID,
  normalizeArtifact,
  normalizeIndex,
  normalizeProject,
  parseStrictJson,
  safeProjectPath,
} from "./runtime-contract.mjs";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultCatalog = JSON.parse(
  readFileSync(resolve(skillDir, "references/catalog.json"), "utf8"),
);

export function getRegistryPaths(projectRoot) {
  const root = resolve(projectRoot);
  const styleseedDir = resolve(root, ".styleseed");
  const artifactsDir = resolve(styleseedDir, "artifacts");
  return {
    projectRoot: root,
    styleseedDir,
    artifactsDir,
    projectFile: resolve(styleseedDir, "project.json"),
    indexFile: resolve(artifactsDir, "index.json"),
  };
}

function readStrictJson(path, maxBytes) {
  return parseStrictJson(readFileSync(path, "utf8"), { maxBytes });
}

function normalizeRegistryArtifact(input, project, catalog) {
  const cloned = JSON.parse(JSON.stringify(input));
  const grammar = cloned?.selection?.grammar;
  if (typeof grammar === "string" && /^reference:[a-z0-9][a-z0-9-]{0,63}$/u.test(grammar)) {
    const fallback = cloned.selection.fallback ?? project.defaults.fallback;
    const normalizedFallback = typeof fallback === "string" ? fallback : null;
    if (!normalizedFallback) throw new Error(`Reference grammar ${grammar} requires a built-in fallback`);
    cloned.selection.grammar = normalizedFallback;
    const normalized = normalizeArtifact(cloned, project, catalog);
    normalized.selection.grammar = grammar;
    normalized.selection.fallback = normalizedFallback;
    return normalized;
  }
  return normalizeArtifact(cloned, project, catalog);
}

export function loadProjectRegistry(projectRoot, { catalog = defaultCatalog, maxBytes = 1024 * 1024 } = {}) {
  const paths = getRegistryPaths(projectRoot);
  const hasProject = existsSync(paths.projectFile);
  const hasIndex = existsSync(paths.indexFile);
  if (!hasProject && !hasIndex) return null;
  if (!hasProject || !hasIndex) {
    throw new Error("Incomplete .styleseed registry: project.json and artifacts/index.json must both exist");
  }

  const project = normalizeProject(readStrictJson(paths.projectFile, maxBytes), catalog);
  const index = normalizeIndex(readStrictJson(paths.indexFile, maxBytes));
  const artifacts = index.artifacts.map((entry) => {
    const configRelative = `artifacts/${entry.config}`;
    const configPath = safeProjectPath(paths.styleseedDir, configRelative);
    if (!existsSync(configPath)) throw new Error(`Missing artifact config: ${configRelative}`);
    const artifact = normalizeRegistryArtifact(readStrictJson(configPath, maxBytes), project, catalog);
    if (artifact.id !== entry.id) {
      throw new Error(`Artifact ID mismatch: index=${entry.id}, config=${artifact.id}`);
    }
    return {
      id: artifact.id,
      config: entry.config,
      path: configPath,
      relativePath: `.styleseed/${configRelative}`,
      artifact,
    };
  });

  return {
    paths,
    project,
    index,
    artifacts,
    artifactMap: new Map(artifacts.map((entry) => [entry.id, entry])),
  };
}

export function loadArtifactConfig(projectRoot, artifactId, options) {
  const registry = loadProjectRegistry(projectRoot, options);
  if (!registry) return null;
  return registry.artifactMap.get(artifactId) ?? null;
}
