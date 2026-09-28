#!/usr/bin/env node

import { createHash } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, isSha256, normalizeArtifact, normalizeIndex, normalizeProject, parseStrictJson, safeProjectPath } from "./runtime-contract.mjs";
import { getRegistryPaths } from "./project-registry.mjs";
import { analyzeLegacyLock } from "./legacy-lock-analysis.mjs";

const AUTO_RECIPE_BY_GRAMMAR = {
  "consumer-service": "calm-consumer",
  "operations-console": "enterprise-workbench",
  "technical-instrument": "developer-platform",
  "editorial-reading": "editorial-authority",
  "commerce-conversion": "commerce-operator",
  "institutional-service": "public-service",
  "expressive-marketing": "expressive-brand",
  "sequential-story": "creative-professional",
};

const AUTO_PALETTE_BY_RECIPE = {
  "calm-consumer": "quiet-mineral",
  "native-mobile": "quiet-mineral",
  "enterprise-workbench": "cobalt-instrument",
  "developer-platform": "cobalt-instrument",
  "commerce-operator": "warm-clay-commerce",
  "public-service": "civic-blue",
  "creative-professional": "deep-lime-studio",
  "editorial-authority": "editorial-ink",
  "expressive-brand": "signal-coral",
};

const PROJECT_DEFAULTS = Object.freeze({
  agent: "codex",
  domain: "developer-tools",
  adapter: "product-ui",
  recipe: "expressive-brand",
  palette: "signal-coral",
  profile: "none",
  fallback: null,
});

const BRAND_DEFAULTS = Object.freeze({
  keyColor: "#6C5CE7",
  paletteCharacter: "vivid",
  paletteMode: "light",
  paletteHarmony: "auto",
  surfaceTemperature: "neutral",
  fontFamilies: ["Inter"],
  radius: "soft",
  elevation: "restrained-shadow",
  density: "comfortable",
  motion: { seed: "spring", intensity: "restrained" },
  imageryRole: "product-proof-first",
});

const LEGACY_FIELDS = Object.freeze({
  "App domain": { kind: "selection", target: "domain" },
  "Surface adapter": { kind: "selection", target: "adapter" },
  "Page type": { kind: "selection", target: "page" },
  "Output grammar": { kind: "selection", target: "grammar" },
  "Grammar fallback": { kind: "selection", target: "fallback" },
  "Brand recipe": { kind: "selection", target: "recipe" },
  "Palette recipe": { kind: "selection", target: "palette" },
  "Aesthetic profile": { kind: "brand", target: "profile" },
  "Key color": { kind: "brand", target: "keyColor" },
  "Primary action": { kind: "brand", target: "keyColor", source: "primary-action-color" },
  "Palette character": { kind: "brand", target: "paletteCharacter" },
  "Palette mode": { kind: "brand", target: "paletteMode" },
  "Palette harmony": { kind: "brand", target: "paletteHarmony" },
  "Surface temperature": { kind: "brand", target: "surfaceTemperature" },
  Font: { kind: "brand", target: "fontFamilies" },
  Radius: { kind: "brand", target: "radius" },
  Elevation: { kind: "brand", target: "elevation" },
  Density: { kind: "brand", target: "density" },
  Motion: { kind: "brand", target: "motion" },
  "Imagery/data role": { kind: "brand", target: "imageryRole" },
});

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(resolve(skillDir, "references/catalog.json"), "utf8"),
);

function parseArgs(argv) {
  const out = { dryRun: true, fromLock: "STYLESEED.md", artifact: "default" };
  const seen = new Set();
  const valueOptions = new Set(["project-root", "from-lock", "artifact", "reviewed-plan", "confirm-plan"]);
  const flagOptions = new Set(["dry-run", "write", "help"]);
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (!valueOptions.has(key) && !flagOptions.has(key)) throw new Error(`Unknown option: --${key}`);
    if (seen.has(key)) throw new Error(`Duplicate option: --${key}`);
    seen.add(key);
    if (key === "dry-run") {
      out.dryRun = true;
      continue;
    }
    if (key === "write") {
      out.dryRun = false;
      continue;
    }
    if (key === "help") {
      out.help = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  if (seen.has("write") && seen.has("dry-run")) throw new Error("--write and --dry-run cannot be combined");
  if (seen.has("help") && seen.size !== 1) throw new Error("--help cannot be combined with other options");
  if (seen.has("confirm-plan") && (!seen.has("reviewed-plan") || !seen.has("write"))) throw new Error("--confirm-plan requires --reviewed-plan and --write");
  if (seen.has("reviewed-plan") && seen.has("artifact")) throw new Error("--artifact cannot be combined with --reviewed-plan; the plan names all artifacts");
  return out;
}

function help() {
  return `StyleSeed project migration

Usage:
  node migrate-project.mjs --project-root . --from-lock STYLESEED.md --artifact default --dry-run
  node migrate-project.mjs --project-root . --from-lock STYLESEED.md --reviewed-plan migration-plan.json --dry-run
  node migrate-project.mjs --project-root . --from-lock STYLESEED.md --reviewed-plan migration-plan.json --confirm-plan sha256:<planHash> --write

Bare --write is intentionally blocked; a reviewed plan and matching confirmation hash are required.
The dry-run output is a draft, not an approved project contract.
`;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function toJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeProjectId(projectRoot) {
  const slug = basename(projectRoot).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return "styleseed-project";
  return slug;
}

function parseLegacyLines(text) {
  const analysis = analyzeLegacyLock(text);
  const recognized = new Map();
  const unmigratedFields = [];
  for (const field of analysis.fields) {
    const label = field.normalizedLabel;
    const value = field.normalizedValue;
    const metadata = LEGACY_FIELDS[label];
    if (!metadata || !field.supported) {
      unmigratedFields.push({ field: field.label, values: [field.rawValue], reason: field.supported ? "unknown" : "unsupported", sourceLines: [field.line] });
      continue;
    }
    const entry = recognized.get(label) ?? { ...metadata, field: label, values: [], sourceLines: [], originalLabels: [] };
    entry.values.push(value);
    entry.sourceLines.push(field.line);
    entry.originalLabels.push(field.label);
    recognized.set(label, entry);
  }
  return { recognized, unmigratedFields, analysis };
}

function unresolvedCriticalFields(recognized, unmigratedFields, artifactId) {
  const unresolved = [];
  const add = (field, reason, labels = []) => {
    const sourceLines = labels.flatMap((label) => recognized.get(label)?.sourceLines ?? []).sort((a, b) => a - b);
    if (!unresolved.some((item) => item.field === field && item.reason === reason)) {
      unresolved.push({ field, reason, sourceLines });
    }
  };
  const critical = [
    ["App domain", "project.defaults.domain"],
    ["Surface adapter", "project.defaults.adapter"],
    ["Output grammar", `artifacts.${artifactId}.selection.grammar`],
    ["Page type", `artifacts.${artifactId}.selection.page`],
    ["Font", "project.brand.fontFamilies"],
  ];
  for (const [label, field] of critical) {
    const entry = recognized.get(label);
    const problem = unmigratedFields.find((item) => item.field === label);
    if (!entry) add(field, "missing");
    else if (entry.values.length !== 1) add(field, new Set(entry.originalLabels).size > 1 ? "alias-conflict" : "duplicate", [label]);
    else if (problem) add(field, problem.reason, [label]);
  }
  const colorLabels = ["Key color", "Primary action"].filter((label) => recognized.has(label));
  const colorProblem = unmigratedFields.find((item) => ["Key color", "Primary action", "brand.keyColor"].includes(item.field));
  if (colorLabels.length === 0) add("project.brand.keyColor", "missing");
  else if (colorProblem) add("project.brand.keyColor", colorProblem.reason, colorLabels);
  const companion = recognized.get("Companion color");
  if (companion) {
    const problem = unmigratedFields.find((item) => item.field === "Companion color");
    if (companion.values.length !== 1) add("project.brand.companionColor", "duplicate", ["Companion color"]);
    else if (problem) add("project.brand.companionColor", problem.reason, ["Companion color"]);
  }
  for (const field of [
    `artifacts.${artifactId}.target.locator`,
    `artifacts.${artifactId}.implementation.sourceRoots`,
    `artifacts.${artifactId}.implementation.tokenFiles`,
    `artifacts.${artifactId}.validation.requiredRenders`,
    `artifacts.${artifactId}.decisions.primaryDecision`,
    `artifacts.${artifactId}.decisions.primaryAction`,
    `artifacts.${artifactId}.decisions.signatureMove`,
  ]) add(field, "defaulted");
  return unresolved;
}

function addUnmigrated(unmigratedFields, field, values, reason) {
  unmigratedFields.push({ field, values: [...values], reason });
}

function chooseCatalogId(group, value, fallback, unmigratedFields, field) {
  if (!value) return fallback;
  if (value === "none" && group === "profiles") return "none";
  if (value === "none" && group === "domains") return "none";
  if (value === "none" && group === "pages") return "none";
  if (value === "none" && group === "grammars") return null;
  if (Object.hasOwn(catalog[group], value)) return value;
  addUnmigrated(unmigratedFields, field, [value], "unsupported");
  return fallback;
}

function chooseSingle(recognized, label, unmigratedFields) {
  const entry = recognized.get(label);
  if (!entry) return null;
  if (entry.values.length !== 1) {
    addUnmigrated(unmigratedFields, label, entry.values, new Set(entry.originalLabels).size > 1 ? "alias-conflict" : "duplicate");
    return null;
  }
  return entry.values[0];
}

function chooseColor(recognized, unmigratedFields) {
  const candidates = [];
  for (const label of ["Key color", "Primary action"]) {
    const entry = recognized.get(label);
    if (!entry) continue;
    if (entry.values.length !== 1) {
      addUnmigrated(unmigratedFields, label, entry.values, "duplicate");
      continue;
    }
    candidates.push({ field: label, value: entry.values[0] });
  }
  if (!candidates.length) return BRAND_DEFAULTS.keyColor;
  const unique = [...new Set(candidates.map((item) => item.value.toUpperCase()))];
  if (unique.length !== 1) {
    addUnmigrated(
      unmigratedFields,
      "brand.keyColor",
      candidates.map((item) => `${item.field}=${item.value}`),
      "conflict",
    );
    return BRAND_DEFAULTS.keyColor;
  }
  if (!/^#[0-9A-Fa-f]{6}$/u.test(unique[0])) {
    addUnmigrated(unmigratedFields, "brand.keyColor", [unique[0]], "unsupported");
    return BRAND_DEFAULTS.keyColor;
  }
  return unique[0];
}

function chooseFontFamilies(recognized, unmigratedFields) {
  const value = chooseSingle(recognized, "Font", unmigratedFields);
  if (!value) return BRAND_DEFAULTS.fontFamilies;
  if (value.length > 80 || !/^[\p{L}\p{N} .,'-]+$/u.test(value)) {
    addUnmigrated(unmigratedFields, "Font", [value], "unsupported");
    return BRAND_DEFAULTS.fontFamilies;
  }
  return [value];
}

function chooseMotion(recognized, unmigratedFields) {
  const value = chooseSingle(recognized, "Motion", unmigratedFields);
  if (!value) return BRAND_DEFAULTS.motion;
  const match = value.trim().match(/^(spring|silk|snap|float|pulse)\s+(restrained|standard|lively)$/iu);
  if (!match) {
    addUnmigrated(unmigratedFields, "Motion", [value], "unsupported");
    return BRAND_DEFAULTS.motion;
  }
  return { seed: match[1].toLowerCase(), intensity: match[2].toLowerCase() };
}

function chooseRecipe(grammar, recognized, unmigratedFields) {
  const requested = chooseSingle(recognized, "Brand recipe", unmigratedFields);
  if (!requested) return PROJECT_DEFAULTS.recipe;
  if (requested === "auto") {
    const recipe = AUTO_RECIPE_BY_GRAMMAR[grammar];
    if (!recipe) {
      addUnmigrated(unmigratedFields, "Brand recipe", [requested], "unsupported");
      return PROJECT_DEFAULTS.recipe;
    }
    return recipe;
  }
  return chooseCatalogId("recipes", requested, PROJECT_DEFAULTS.recipe, unmigratedFields, "Brand recipe");
}

function choosePalette(recipe, recognized, unmigratedFields) {
  const requested = chooseSingle(recognized, "Palette recipe", unmigratedFields);
  if (!requested) return PROJECT_DEFAULTS.palette;
  if (requested === "auto") {
    const palette = AUTO_PALETTE_BY_RECIPE[recipe];
    if (!palette) {
      addUnmigrated(unmigratedFields, "Palette recipe", [requested], "unsupported");
      return PROJECT_DEFAULTS.palette;
    }
    return palette;
  }
  return chooseCatalogId("palettes", requested, PROJECT_DEFAULTS.palette, unmigratedFields, "Palette recipe");
}

function chooseImageryRole(recognized, unmigratedFields) {
  const value = chooseSingle(recognized, "Imagery/data role", unmigratedFields);
  if (!value) return BRAND_DEFAULTS.imageryRole;
  if (!BRAND_DEFAULTS.imageryRole || !["data-first", "product-proof-first", "editorial-media", "people-context", "generated-atmosphere", "none"].includes(value)) {
    addUnmigrated(unmigratedFields, "Imagery/data role", [value], "unsupported");
    return BRAND_DEFAULTS.imageryRole;
  }
  return value;
}

function buildMigration(projectRoot, lockText, artifactId) {
  const { recognized, unmigratedFields, analysis } = parseLegacyLines(lockText);
  const grammar = chooseCatalogId(
    "grammars",
    chooseSingle(recognized, "Output grammar", unmigratedFields),
    "consumer-service",
    unmigratedFields,
    "Output grammar",
  );
  const recipe = chooseRecipe(grammar, recognized, unmigratedFields);
  const palette = choosePalette(recipe, recognized, unmigratedFields);

  const project = normalizeProject({
    schemaVersion: 1,
    projectId: safeProjectId(projectRoot),
    defaults: {
      agent: PROJECT_DEFAULTS.agent,
      domain: chooseCatalogId("domains", chooseSingle(recognized, "App domain", unmigratedFields), PROJECT_DEFAULTS.domain, unmigratedFields, "App domain"),
      adapter: chooseCatalogId("adapters", chooseSingle(recognized, "Surface adapter", unmigratedFields), PROJECT_DEFAULTS.adapter, unmigratedFields, "Surface adapter"),
      recipe,
      palette,
      profile: chooseCatalogId("profiles", chooseSingle(recognized, "Aesthetic profile", unmigratedFields), PROJECT_DEFAULTS.profile, unmigratedFields, "Aesthetic profile"),
      fallback: chooseCatalogId("grammars", chooseSingle(recognized, "Grammar fallback", unmigratedFields), PROJECT_DEFAULTS.fallback, unmigratedFields, "Grammar fallback"),
    },
    brand: {
      keyColor: chooseColor(recognized, unmigratedFields),
      paletteCharacter: chooseCatalogEnum("paletteCharacter", chooseSingle(recognized, "Palette character", unmigratedFields), BRAND_DEFAULTS.paletteCharacter, unmigratedFields, "Palette character"),
      paletteMode: chooseCatalogEnum("paletteMode", chooseSingle(recognized, "Palette mode", unmigratedFields), BRAND_DEFAULTS.paletteMode, unmigratedFields, "Palette mode"),
      paletteHarmony: chooseCatalogEnum("paletteHarmony", chooseSingle(recognized, "Palette harmony", unmigratedFields), BRAND_DEFAULTS.paletteHarmony, unmigratedFields, "Palette harmony"),
      surfaceTemperature: chooseCatalogEnum("surfaceTemperature", chooseSingle(recognized, "Surface temperature", unmigratedFields), BRAND_DEFAULTS.surfaceTemperature, unmigratedFields, "Surface temperature"),
      fontFamilies: chooseFontFamilies(recognized, unmigratedFields),
      radius: chooseCatalogEnum("radius", chooseSingle(recognized, "Radius", unmigratedFields), BRAND_DEFAULTS.radius, unmigratedFields, "Radius"),
      elevation: chooseCatalogEnum("elevation", chooseSingle(recognized, "Elevation", unmigratedFields), BRAND_DEFAULTS.elevation, unmigratedFields, "Elevation"),
      density: chooseCatalogEnum("density", chooseSingle(recognized, "Density", unmigratedFields), BRAND_DEFAULTS.density, unmigratedFields, "Density"),
      motion: chooseMotion(recognized, unmigratedFields),
      imageryRole: chooseImageryRole(recognized, unmigratedFields),
    },
  }, catalog);

  const artifact = normalizeArtifact({
    schemaVersion: 1,
    id: artifactId,
    target: { kind: "route", locator: "/" },
    selection: {
      grammar,
      adapter: null,
      domain: null,
      page: chooseCatalogId("pages", chooseSingle(recognized, "Page type", unmigratedFields), "none", unmigratedFields, "Page type"),
      recipe: null,
      palette: null,
      profile: null,
      fallback: null,
    },
    decisions: {
      primaryDecision: "Primary decision pending artifact-specific migration.",
      primaryAction: "Primary action pending artifact-specific migration.",
      signatureMove: "Signature move pending artifact-specific migration.",
    },
    implementation: {
      sourceRoots: ["src"],
      tokenFiles: [],
    },
    validation: {
      scoreFloor: 80,
      requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }],
      temporal: { required: false, scenarios: [] },
      humanAcceptance: false,
    },
  }, project, catalog);

  const index = normalizeIndex({
    schemaVersion: 1,
    artifacts: [{ id: artifactId, config: `${artifactId}.json` }],
  });

  return {
    project,
    index,
    artifact,
    unmigratedFields: unmigratedFields.sort((left, right) => left.field.localeCompare(right.field) || left.reason.localeCompare(right.reason)),
    unresolvedCriticalFields: unresolvedCriticalFields(recognized, unmigratedFields, artifactId),
    legacyAnalysis: analysis,
  };
}

function chooseCatalogEnum(group, value, fallback, unmigratedFields, field) {
  if (!value) return fallback;
  const allowed = {
    paletteCharacter: ["calm", "balanced", "vivid", "deep"],
    paletteMode: ["light", "dark"],
    paletteHarmony: ["auto", "tonal", "adjacent", "contrast"],
    surfaceTemperature: ["neutral", "warm", "cool"],
    radius: ["sharp", "restrained", "balanced", "soft", "pill"],
    elevation: ["flat", "tonal", "restrained-shadow", "layered"],
    density: ["compact", "comfortable", "spacious"],
  }[group];
  if (allowed.includes(value)) return value;
  addUnmigrated(unmigratedFields, field, [value], "unsupported");
  return fallback;
}

function hasPath(path) {
  try { lstatSync(path); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function assertSafeLocalPath(root, path, { mustExist = false, kind } = {}) {
  const target = safeProjectPath(root, path);
  const realRoot = realpathSync(root);
  const parts = relative(realRoot, target).split(sep);
  let current = realRoot;
  for (const part of parts) {
    current = resolve(current, part);
    if (!hasPath(current)) continue;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink path: ${path}`);
    if (stat.isFile() && stat.nlink !== 1) throw new Error(`Refusing hardlinked path: ${path}`);
    if (!stat.isFile() && !stat.isDirectory()) throw new Error(`Refusing special path: ${path}`);
  }
  if (mustExist && !hasPath(target)) throw new Error(`Required project path is missing: ${path}`);
  if (kind === "file" && hasPath(target) && !lstatSync(target).isFile()) throw new Error(`Expected file: ${path}`);
  if (kind === "directory" && hasPath(target) && !lstatSync(target).isDirectory()) throw new Error(`Expected directory: ${path}`);
  return target;
}

function requireKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value);
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  const extra = actual.filter((key) => !keys.includes(key));
  if (missing.length || extra.length) throw new Error(`${label} keys invalid: missing=${missing.join(",")}; unknown=${extra.join(",")}`);
}

function reviewItems(analysis, unmigratedFields) {
  const output = [];
  for (const field of analysis.fields) {
    let reason = null;
    if (!field.supported) reason = "unsupported";
    else if (!LEGACY_FIELDS[field.normalizedLabel]) reason = "unknown";
    else if (["Key color", "Primary action", "Companion color"].includes(field.normalizedLabel) && !/^#[0-9a-fA-F]{6}$/u.test(field.normalizedValue)) reason = "unsupported";
    else if (unmigratedFields.some((item) => [field.label, field.normalizedLabel, "brand.keyColor"].includes(item.field) && item.reason === "unsupported")) reason = "unsupported";
    if (reason) output.push({ line: field.line, label: field.label, reason });
  }
  return output;
}

function sameReviewItems(expected, actual) {
  const sort = (items) => [...items].sort((a, b) => a.line - b.line || a.label.localeCompare(b.label) || a.reason.localeCompare(b.reason));
  return canonicalJson(sort(expected)) === canonicalJson(sort(actual));
}

function uniqueExplicit(analysis, labels) {
  return [...new Set(analysis.fields.filter((field) => labels.includes(field.normalizedLabel) && field.supported).map((field) => field.normalizedValue))];
}

function reviewedMigration(root, lockText, lockBytes, planPath, confirmPlan, dryRun) {
  const analysis = analyzeLegacyLock(lockText);
  const plan = parseStrictJson(readFileSync(assertSafeLocalPath(root, planPath, { mustExist: true, kind: "file" }), "utf8"));
  requireKeys(plan, ["schemaVersion", "legacyLockSha256", "sectionMapping", "project", "artifacts", "acknowledgedUnmigratedFields"], "reviewed plan");
  if (plan.schemaVersion !== 1) throw new Error("reviewed plan schemaVersion must be 1");
  if (!isSha256(plan.legacyLockSha256) || plan.legacyLockSha256 !== sha256(lockBytes)) throw new Error("reviewed plan legacyLockSha256 does not match current lock bytes");
  if (!Array.isArray(plan.artifacts) || !plan.artifacts.length) throw new Error("reviewed plan requires artifacts");
  if (!Array.isArray(plan.sectionMapping) || !Array.isArray(plan.acknowledgedUnmigratedFields)) throw new Error("reviewed plan mappings and acknowledgements must be arrays");
  const project = normalizeProject(plan.project, catalog);
  requireKeys(plan.project.defaults, ["agent", "domain", "adapter", "recipe", "palette", "profile", "fallback"], "reviewed project defaults");
  requireKeys(plan.project.brand, ["keyColor", "paletteCharacter", "paletteMode", "paletteHarmony", "surfaceTemperature", "fontFamilies", "radius", "elevation", "density", "motion", "imageryRole", ...(Object.hasOwn(plan.project.brand, "companionColor") ? ["companionColor"] : [])], "reviewed project brand");
  const artifacts = plan.artifacts.map((input) => {
    requireKeys(input, ["schemaVersion", "id", "target", "selection", "decisions", "implementation", "validation"], "reviewed artifact");
    requireKeys(input.selection, ["grammar", "adapter", "domain", "page", "recipe", "palette", "profile", "fallback"], "reviewed artifact selection");
    const artifact = normalizeArtifact(input, project, catalog);
    for (const sourceRoot of artifact.implementation.sourceRoots) assertSafeLocalPath(root, sourceRoot, { mustExist: true, kind: "directory" });
    for (const tokenFile of artifact.implementation.tokenFiles) assertSafeLocalPath(root, tokenFile, { mustExist: true, kind: "file" });
    if (artifact.target.kind !== "route") assertSafeLocalPath(root, artifact.target.locator, { mustExist: true });
    return artifact;
  });
  const ids = artifacts.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("reviewed plan contains duplicate artifact IDs");
  const index = normalizeIndex({ schemaVersion: 1, artifacts: ids.map((id) => ({ id, config: `${id}.json` })) });
  const expectedSections = analysis.surfaceCandidates.length ? analysis.surfaceCandidates : ["root"];
  const mappingIds = [];
  const mappedArtifacts = [];
  for (const entry of plan.sectionMapping) {
    requireKeys(entry, ["sectionId", "artifactId"], "sectionMapping entry");
    mappingIds.push(entry.sectionId);
    mappedArtifacts.push(entry.artifactId);
    if (!expectedSections.includes(entry.sectionId) || !ids.includes(entry.artifactId)) throw new Error(`Unknown section or artifact mapping: ${entry.sectionId} -> ${entry.artifactId}`);
  }
  if (new Set(mappingIds).size !== mappingIds.length || new Set(mappedArtifacts).size !== mappedArtifacts.length || canonicalJson([...mappingIds].sort()) !== canonicalJson([...expectedSections].sort()) || canonicalJson([...mappedArtifacts].sort()) !== canonicalJson([...ids].sort())) {
    throw new Error("sectionMapping must map every surface candidate one-to-one to every artifact");
  }
  for (const entry of plan.sectionMapping) {
    const artifact = artifacts.find((item) => item.id === entry.artifactId);
    const fields = analysis.fields.filter((item) => ["root", entry.sectionId].includes(item.sectionId));
    for (const [label, group, selected] of [
      ["Output grammar", "grammars", artifact.selection.grammar],
      ["Surface adapter", "adapters", artifact.selection.adapter ?? project.defaults.adapter],
      ["App domain", "domains", artifact.selection.domain ?? project.defaults.domain],
      ["Page type", "pages", artifact.selection.page],
    ]) {
      const known = [...new Set(fields.filter((item) => item.normalizedLabel === label && item.supported && Object.hasOwn(catalog[group], item.normalizedValue)).map((item) => item.normalizedValue))];
      if (known.length > 1 || (known.length === 1 && known[0] !== selected)) throw new Error(`${entry.sectionId} ${label} does not match reviewed artifact ${entry.artifactId}`);
    }
  }
  const explicitColors = uniqueExplicit(analysis, ["Key color", "Primary action"]).filter((value) => /^#[0-9a-fA-F]{6}$/u.test(value)).map((value) => value.toUpperCase());
  const explicitFonts = uniqueExplicit(analysis, ["Font"]);
  const explicitCompanions = uniqueExplicit(analysis, ["Companion color"]).filter((value) => /^#[0-9a-fA-F]{6}$/u.test(value)).map((value) => value.toUpperCase());
  if (new Set(explicitColors).size > 1 || (explicitColors.length && explicitColors[0] !== project.brand.keyColor)) throw new Error("Distinct legacy colors cannot be silently merged into one project brand");
  if (new Set(explicitCompanions).size > 1 || (explicitCompanions.length && explicitCompanions[0] !== project.brand.companionColor)) throw new Error("Legacy companion colors are not supported by this project contract; preserve the lock and resolve this before migration");
  if (new Set(explicitFonts).size > 1 || (explicitFonts.length && canonicalJson(explicitFonts[0].split(",").map((font) => font.trim())) !== canonicalJson(project.brand.fontFamilies))) throw new Error("Distinct legacy fonts cannot be silently merged into one project brand");
  const oldDraft = buildMigration(root, lockText, "default");
  const expectedReview = reviewItems(analysis, oldDraft.unmigratedFields);
  for (const item of plan.acknowledgedUnmigratedFields) requireKeys(item, ["line", "label", "reason"], "acknowledgedUnmigratedFields entry");
  if (!sameReviewItems(expectedReview, plan.acknowledgedUnmigratedFields)) throw new Error("acknowledgedUnmigratedFields must match every unresolved legacy line exactly");
  const payload = { legacyLockSha256: plan.legacyLockSha256, sectionMapping: plan.sectionMapping, project: plan.project, artifacts: plan.artifacts, acknowledgedUnmigratedFields: plan.acknowledgedUnmigratedFields };
  const planHash = sha256(canonicalJson(payload));
  if (!dryRun && confirmPlan !== planHash) throw new Error("--confirm-plan must match the current planHash exactly");
  const paths = getRegistryPaths(root);
  const targets = [
    { relativePath: ".styleseed/project.json", absolutePath: paths.projectFile, text: toJsonText(project) },
    { relativePath: ".styleseed/artifacts/index.json", absolutePath: paths.indexFile, text: toJsonText(index) },
    ...artifacts.map((artifact) => ({ relativePath: `.styleseed/artifacts/${artifact.id}.json`, absolutePath: resolve(paths.artifactsDir, `${artifact.id}.json`), text: toJsonText(artifact) })),
  ];
  for (const target of targets) assertSafeLocalPath(root, target.relativePath);
  assertNoOverwrite(targets);
  const compare = (artifact, sectionId, label, after, aliases = [label]) => {
    const values = [...new Set(analysis.fields.filter((item) => ["root", sectionId].includes(item.sectionId) && aliases.includes(item.normalizedLabel) && item.supported).map((item) => item.normalizedValue))];
    return { artifactId: artifact.id, field: label, before: values.length === 1 ? values[0] : null, after };
  };
  const diff = plan.sectionMapping.flatMap((entry) => {
    const artifact = artifacts.find((item) => item.id === entry.artifactId);
    return [
      compare(artifact, entry.sectionId, "Key color", project.brand.keyColor, ["Key color", "Primary action"]),
      compare(artifact, entry.sectionId, "Companion color", project.brand.companionColor ?? null),
      compare(artifact, entry.sectionId, "Font", project.brand.fontFamilies),
      compare(artifact, entry.sectionId, "App domain", artifact.selection.domain ?? project.defaults.domain),
      compare(artifact, entry.sectionId, "Output grammar", artifact.selection.grammar),
      compare(artifact, entry.sectionId, "Viewport gate", artifact.validation.requiredRenders.map((item) => item.viewport)),
      compare(artifact, entry.sectionId, "Target locator", artifact.target.locator),
      compare(artifact, entry.sectionId, "Source roots", artifact.implementation.sourceRoots),
      compare(artifact, entry.sectionId, "Token files", artifact.implementation.tokenFiles),
    ];
  });
  if (!dryRun) writeTargets(root, targets);
  return {
    schemaVersion: 2, status: dryRun ? "ready-for-confirmation" : "applied", requiresReview: false, canApply: true,
    dryRun, planHash, legacyLockSha256: plan.legacyLockSha256, sectionMapping: plan.sectionMapping,
    targets: targets.map((target) => ({ path: target.relativePath, bytes: Buffer.byteLength(target.text), sha256: sha256(target.text), content: JSON.parse(target.text) })),
    unmigratedFields: oldDraft.unmigratedFields, unresolvedCriticalFields: [], legacyAnalysis: analysis, diff,
  };
}

function assertNoOverwrite(targets) {
  const existing = targets.filter((target) => hasPath(target.absolutePath));
  if (existing.length) {
    throw new Error(`Refusing to overwrite existing migration targets: ${existing.map((item) => item.relativePath).join(", ")}`);
  }
}

function writeTargets(root, targets) {
  const createdFiles = [];
  const createdDirs = [];
  try {
    for (const target of targets) {
      const dir = dirname(target.absolutePath);
      const missingDirs = [];
      let current = dir;
      while (current !== root && !hasPath(current)) {
        missingDirs.unshift(current);
        current = dirname(current);
      }
      for (const missing of missingDirs) {
        mkdirSync(missing);
        createdDirs.push(missing);
      }
      const fd = openSync(target.absolutePath, "wx");
      const stat = fstatSync(fd);
      createdFiles.push({ ...target, dev: stat.dev, ino: stat.ino });
      try { writeFileSync(fd, target.text); } finally { closeSync(fd); }
    }
  } catch (error) {
    const retained = [];
    for (const target of createdFiles.reverse()) {
      try {
        if (hasPath(target.absolutePath) && lstatSync(target.absolutePath).isFile() && lstatSync(target.absolutePath).nlink === 1 && lstatSync(target.absolutePath).dev === target.dev && lstatSync(target.absolutePath).ino === target.ino && readFileSync(target.absolutePath, "utf8") === target.text) rmSync(target.absolutePath);
        else retained.push(target.relativePath);
      } catch { retained.push(target.relativePath); }
    }
    for (const dir of createdDirs.reverse()) {
      try { if (readdirSync(dir).length === 0) rmdirSync(dir); } catch { /* Another writer may now own this directory. */ }
    }
    throw new Error(`Migration write failed: ${error.message}${retained.length ? `; retained partial targets: ${retained.join(", ")}` : "; newly created targets were removed"}`);
  }
}

export function migrateProject({ projectRoot, fromLock = "STYLESEED.md", artifact = "default", reviewedPlan, confirmPlan, dryRun = true }) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(artifact)) throw new Error(`Artifact ID must be a safe ID: ${artifact}`);
  const root = realpathSync(resolve(projectRoot));
  const lockPath = assertSafeLocalPath(root, fromLock, { mustExist: true, kind: "file" });
  const lockBytes = readFileSync(lockPath);
  const lockText = lockBytes.toString("utf8");
  if (reviewedPlan) return reviewedMigration(root, lockText, lockBytes, reviewedPlan, confirmPlan, dryRun);
  const migration = buildMigration(root, lockText, artifact);
  const paths = getRegistryPaths(root);
  const targets = [
    { relativePath: ".styleseed/project.json", absolutePath: paths.projectFile, text: toJsonText(migration.project) },
    { relativePath: ".styleseed/artifacts/index.json", absolutePath: paths.indexFile, text: toJsonText(migration.index) },
    { relativePath: `.styleseed/artifacts/${artifact}.json`, absolutePath: resolve(paths.artifactsDir, `${artifact}.json`), text: toJsonText(migration.artifact) },
  ];

  assertNoOverwrite(targets);
  return {
    schemaVersion: 2,
    status: "review-required",
    requiresReview: true,
    canApply: false,
    dryRun,
    artifact,
    targets: targets.map((target) => ({
      path: target.relativePath,
      bytes: Buffer.byteLength(target.text),
      sha256: sha256(target.text),
      content: JSON.parse(target.text),
    })),
    unmigratedFields: migration.unmigratedFields,
    unresolvedCriticalFields: migration.unresolvedCriticalFields,
    legacyAnalysis: migration.legacyAnalysis,
    legacyLockSha256: sha256(lockBytes),
  };
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help());
    process.exit(0);
  }
  const result = migrateProject({
    projectRoot: args["project-root"] ?? process.cwd(),
    fromLock: args["from-lock"],
    artifact: args.artifact,
    reviewedPlan: args["reviewed-plan"],
    confirmPlan: args["confirm-plan"],
    dryRun: args.dryRun,
  });
  process.stdout.write(toJsonText(result));
  if (!args.dryRun && !result.canApply) process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
