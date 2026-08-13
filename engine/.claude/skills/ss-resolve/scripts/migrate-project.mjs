#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, normalizeArtifact, normalizeIndex, normalizeProject, safeProjectPath } from "./runtime-contract.mjs";
import { getRegistryPaths } from "./project-registry.mjs";

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
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
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
  return out;
}

function help() {
  return `StyleSeed project migration

Usage:
  node migrate-project.mjs --project-root . --from-lock STYLESEED.md --artifact default --dry-run
  node migrate-project.mjs --project-root . --from-lock STYLESEED.md --artifact default --write
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
  const recognized = new Map();
  const unmigratedFields = [];
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*-\s+([^:]+):\s*(.+?)\s*$/u);
    if (!match) continue;
    const label = match[1].trim();
    const value = match[2].replace(/\s+#.*$/u, "").trim();
    const metadata = LEGACY_FIELDS[label];
    if (!metadata) {
      unmigratedFields.push({ field: label, values: [value], reason: "unknown" });
      continue;
    }
    const entry = recognized.get(label) ?? { ...metadata, field: label, values: [] };
    entry.values.push(value);
    recognized.set(label, entry);
  }
  return { recognized, unmigratedFields };
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
    addUnmigrated(unmigratedFields, label, entry.values, "duplicate");
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
  const { recognized, unmigratedFields } = parseLegacyLines(lockText);
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

function assertNoOverwrite(targets) {
  const existing = targets.filter((target) => existsSync(target.absolutePath));
  if (existing.length) {
    throw new Error(`Refusing to overwrite existing migration targets: ${existing.map((item) => item.relativePath).join(", ")}`);
  }
}

function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = resolve(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  try {
    writeFileSync(tempPath, text, { flag: "wx" });
    renameSync(tempPath, path);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
}

export function migrateProject({ projectRoot, fromLock = "STYLESEED.md", artifact = "default", dryRun = true }) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(artifact)) throw new Error(`Artifact ID must be a safe ID: ${artifact}`);
  const root = resolve(projectRoot);
  const lockPath = safeProjectPath(root, fromLock);
  const lockText = readFileSync(lockPath, "utf8");
  const migration = buildMigration(root, lockText, artifact);
  const paths = getRegistryPaths(root);
  const targets = [
    { relativePath: ".styleseed/project.json", absolutePath: paths.projectFile, text: toJsonText(migration.project) },
    { relativePath: ".styleseed/artifacts/index.json", absolutePath: paths.indexFile, text: toJsonText(migration.index) },
    { relativePath: `.styleseed/artifacts/${artifact}.json`, absolutePath: resolve(paths.artifactsDir, `${artifact}.json`), text: toJsonText(migration.artifact) },
  ];

  assertNoOverwrite(targets);
  if (!dryRun) {
    for (const target of targets) atomicWrite(target.absolutePath, target.text);
  }

  return {
    dryRun,
    artifact,
    targets: targets.map((target) => ({
      path: target.relativePath,
      bytes: Buffer.byteLength(target.text),
      sha256: sha256(target.text),
      content: JSON.parse(target.text),
    })),
    unmigratedFields: migration.unmigratedFields,
    legacyLockSha256: sha256(lockText),
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(help());
  process.exit(0);
}

try {
  const result = migrateProject({
    projectRoot: args["project-root"] ?? process.cwd(),
    fromLock: args["from-lock"],
    artifact: args.artifact,
    dryRun: args.dryRun,
  });
  process.stdout.write(toJsonText(result));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
