#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, normalizeArtifact, normalizeProject, safeProjectPath } from "./runtime-contract.mjs";
import { compileContext, compareEntries, defaultCatalog, materializeManifestOutputs } from "./compiler.mjs";
import { loadProjectRegistry } from "./project-registry.mjs";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = defaultCatalog;
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

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (["list", "stdout", "check", "help", "all"].includes(key)) {
      out[key] = true;
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
  return `StyleSeed Context Compiler

Usage:
  resolve-context.mjs --from-lock STYLESEED.md --agent codex
  resolve-context.mjs --grammar <id> --adapter <id> [options]
  resolve-context.mjs --project-root . --artifact app-dashboard --agent codex
  resolve-context.mjs --project-root . --all --agent codex

Options:
  --agent claude|codex|cursor|factory|gemini|kiro|opencode|windsurf
  --artifact <id>
  --all
  --grammar <built-in id|reference:slug>
  --adapter <id>
  --domain <id|none>
  --page <id|none>
  --recipe <id|auto>
  --palette <id|auto>
  --key-color <hex>
  --palette-character calm|balanced|vivid|deep
  --palette-mode light|dark
  --palette-harmony auto|tonal|adjacent|contrast
  --surface-temperature neutral|warm|cool
  --profile <id|none>
  --fallback <built-in grammar id>
  --from-lock <path>
  --project-root <path>
  --stdout
  --check
  --list
`;
}

function parseLegacyLock(path) {
  if (!path || !existsSync(path)) return { path: "legacy:STYLESEED.md", normalized: {}, duplicates: [], unknown: [], text: "" };
  const text = readFileSync(path, "utf8");
  const normalized = {};
  const seen = new Map();
  const unknown = [];
  const duplicates = [];
  const mapping = {
    "App domain": "domain",
    "Surface adapter": "adapter",
    "Page type": "page",
    "Output grammar": "grammar",
    "Grammar fallback": "fallback",
    "Brand recipe": "recipeSelection",
    "Palette recipe": "paletteSelection",
    "Key color": "keyColor",
    "Primary action": "keyColor",
    "Palette character": "paletteCharacter",
    "Palette mode": "paletteMode",
    "Palette harmony": "paletteHarmony",
    "Surface temperature": "surfaceTemperature",
    "Aesthetic profile": "profile",
  };
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*-\s+([^:]+):\s*(.+?)\s*$/u);
    if (!match) continue;
    const label = match[1].trim();
    const value = match[2].replace(/\s+#.*$/u, "").trim();
    const key = mapping[label];
    if (!key) {
      unknown.push(label);
      continue;
    }
    if (seen.has(label)) {
      duplicates.push(label);
      continue;
    }
    seen.set(label, value);
    normalized[key] = value;
  }
  if (duplicates.length) throw new Error(`Duplicate legacy lock fields are not allowed: ${[...new Set(duplicates)].join(", ")}`);
  const motionLine = text.split(/\r?\n/u).find((line) => /^\s*-\s+Motion:/u.test(line));
  if (motionLine) {
    const motionValue = motionLine.replace(/^\s*-\s+Motion:\s*/u, "").trim();
    if (!/^(spring|silk|snap|float|pulse)\s+(restrained|standard|lively)$/iu.test(motionValue)) {
      throw new Error(`Unsupported legacy Motion value: ${motionValue}`);
    }
  }
  return { path: "legacy:STYLESEED.md", normalized, duplicates, unknown, text };
}

function legacyArgsToNormalized(args, lock) {
  const pick = (name, fallback = null) => args[name] ?? lock.normalized[name] ?? fallback;
  const grammar = pick("grammar");
  const adapter = pick("adapter");
  if (!grammar) throw new Error("Missing output grammar. Pass --grammar or use --from-lock.");
  if (!adapter) throw new Error("Missing surface adapter. Pass --adapter or use --from-lock.");
  const recipeGrammar = typeof grammar === "string" && grammar.startsWith("reference:")
    ? pick("fallback", null)
    : grammar;
  const recipeSelection = pick("recipe", "auto");
  const resolvedRecipe = recipeSelection === "auto" ? AUTO_RECIPE_BY_GRAMMAR[recipeGrammar] : recipeSelection;
  if (!resolvedRecipe) throw new Error(`No automatic brand recipe for grammar "${grammar}".`);
  const paletteSelection = pick("palette", "auto");
  const resolvedPalette = paletteSelection === "auto" ? AUTO_PALETTE_BY_RECIPE[resolvedRecipe] : paletteSelection;
  if (!resolvedPalette) throw new Error(`No automatic palette recipe for brand recipe "${resolvedRecipe}".`);
  const project = normalizeProject({
    schemaVersion: 1,
    projectId: "legacy-project",
    defaults: {
      agent: args.agent ?? "codex",
      domain: pick("domain", "none"),
      adapter,
      recipe: resolvedRecipe,
      palette: resolvedPalette,
      profile: pick("profile", "none"),
      fallback: pick("fallback", null),
    },
    brand: {
      keyColor: args["key-color"] ?? lock.normalized.keyColor ?? "#6C5CE7",
      paletteCharacter: args["palette-character"] ?? lock.normalized.paletteCharacter ?? "vivid",
      paletteMode: args["palette-mode"] ?? lock.normalized.paletteMode ?? "light",
      paletteHarmony: args["palette-harmony"] ?? lock.normalized.paletteHarmony ?? "auto",
      surfaceTemperature: args["surface-temperature"] ?? lock.normalized.surfaceTemperature ?? "neutral",
      fontFamilies: ["Inter"],
      radius: "soft",
      elevation: "restrained-shadow",
      density: "comfortable",
      motion: { seed: "spring", intensity: "restrained" },
      imageryRole: "product-proof-first",
    },
  }, catalog);
  const normalizedGrammar = grammar.startsWith("reference:") ? pick("fallback") : grammar;
  if (!normalizedGrammar) throw new Error("A project reference grammar requires a built-in fallback grammar.");
  const artifact = normalizeArtifact({
    schemaVersion: 1,
    id: "default",
    target: { kind: "route", locator: "/" },
    selection: {
      grammar: normalizedGrammar,
      adapter,
      domain: pick("domain", "none"),
      page: pick("page", "none"),
      recipe: recipeSelection === "auto" ? null : recipeSelection,
      palette: paletteSelection === "auto" ? null : paletteSelection,
      profile: pick("profile", "none"),
      fallback: pick("fallback", null),
    },
    decisions: {
      primaryDecision: "Legacy single-artifact resolver.",
      primaryAction: "Apply the compiled design method.",
      signatureMove: "Preserve the legacy output paths while using normalized inputs only.",
    },
    implementation: { sourceRoots: ["src"], tokenFiles: [] },
    validation: {
      scoreFloor: 80,
      requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }],
      temporal: { required: false, scenarios: [] },
      humanAcceptance: false,
    },
  }, project, catalog);
  artifact.selection.grammar = grammar;
  return { project, artifact };
}

function ensureNoRegistryOverrides(args) {
  const forbidden = ["grammar", "adapter", "domain", "page", "recipe", "palette", "key-color", "palette-character", "palette-mode", "palette-harmony", "surface-temperature", "profile", "fallback", "from-lock"];
  const used = forbidden.filter((key) => Object.hasOwn(args, key));
  if (used.length) throw new Error(`Registry mode forbids selection overrides: ${used.map((key) => `--${key}`).join(", ")}`);
}

function writeOutputs(projectRoot, compiled) {
  const writes = [
    { path: compiled.manifestPath, content: `${JSON.stringify(compiled.manifest, null, 2)}\n` },
    { path: compiled.manifest.bundle.path, content: compiled.bundle },
  ];
  if (compiled.paletteJson) writes.push({ path: compiled.manifest.outputs.find((entry) => entry.kind === "palette-json").path, content: compiled.paletteJson });
  if (compiled.paletteCss) writes.push({ path: compiled.manifest.outputs.find((entry) => entry.kind === "palette-css").path, content: compiled.paletteCss });
  for (const write of writes) {
    const target = resolve(projectRoot, write.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, write.content);
  }
  if (!compiled.paletteJson) rmSync(resolve(projectRoot, compiled.manifest.bundle.path.replace(/bundles\/.*$/u, "palette.json")), { force: true });
}

function checkCompiled(projectRoot, compiled) {
  const manifestPath = resolve(projectRoot, compiled.manifestPath);
  if (!existsSync(manifestPath)) {
    console.error(`StyleSeed context drift: manifest is missing for ${compiled.manifestPath}.`);
    return 2;
  }
  const previous = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (previous.schemaVersion === 2) {
    for (const field of ["artifactId", "engineVersion", "engineRevision", "distributionIntegrity", "methodHash", "validationHash"]) {
      if (previous[field] !== compiled.manifest[field]) {
        console.error(`StyleSeed context drift: manifest ${field} mismatch (expected ${compiled.manifest[field]}, found ${previous[field] ?? "missing"}).`);
        return 2;
      }
    }
    if (canonicalJson(previous.selection) !== canonicalJson(compiled.manifest.selection)) {
      console.error("StyleSeed context drift: manifest selection mismatch.");
      return 2;
    }
    if (canonicalJson(previous.validationSlices) !== canonicalJson(compiled.manifest.validationSlices)) {
      console.error("StyleSeed context drift: manifest validation slice mismatch.");
      return 2;
    }
    const inputsMismatch = compareEntries(compiled.manifest.inputs, previous.inputs, "manifest inputs", ["id", "path", "sha256", "bytes"]);
    if (inputsMismatch) {
      console.error(`StyleSeed context drift: ${inputsMismatch}`);
      return 2;
    }
  }
  const expectedOutputs = previous.schemaVersion === 1
    ? compiled.outputs.map((entry) => ({ ...entry, sha256: entry.sha256.replace(/^sha256:/u, "") }))
    : compiled.outputs;
  const outputsMismatch = compareEntries(expectedOutputs, materializeManifestOutputs(previous), "manifest outputs", ["kind", "path", "sha256", "bytes"]);
  if (outputsMismatch) {
    console.error(`StyleSeed context drift: ${outputsMismatch}`);
    return 2;
  }
  const sourceFields = previous.schemaVersion === 1 ? ["id", "sha256", "bytes"] : ["id", "path", "sha256", "bytes"];
  const expectedSources = previous.schemaVersion === 1
    ? compiled.sources.map(({ id, sha256, bytes }) => ({ id, sha256: sha256.replace(/^sha256:/u, ""), bytes }))
    : compiled.sources;
  const sourcesMismatch = compareEntries(expectedSources, previous.sources, "manifest sources", sourceFields);
  if (sourcesMismatch) {
    console.error(`StyleSeed context drift: ${sourcesMismatch}`);
    return 2;
  }
  for (const entry of materializeManifestOutputs(previous)) {
    const actualPath = resolve(projectRoot, entry.path);
    if (!existsSync(actualPath)) {
      console.error(`StyleSeed context drift: missing output file ${entry.path}.`);
      return 2;
    }
    const actualContent = readFileSync(actualPath);
    const actualHash = `sha256:${createHash("sha256").update(actualContent).digest("hex")}`;
    const expectedHash = typeof entry.sha256 === "string" && entry.sha256.startsWith("sha256:")
      ? entry.sha256
      : `sha256:${entry.sha256}`;
    if (actualHash !== expectedHash || actualContent.byteLength !== entry.bytes) {
      console.error(`StyleSeed context drift: output mismatch for ${entry.path} (expected ${entry.bytes} bytes ${expectedHash}, found ${actualContent.byteLength} bytes ${actualHash}).`);
      return 2;
    }
  }
  return 0;
}

function resolveTargets(registry, args) {
  if (!registry) return [];
  const artifacts = [...registry.artifacts].sort((left, right) => left.id.localeCompare(right.id));
  if (artifacts.length > 1 && !args.all && !args.artifact) {
    throw new Error("Multiple registry artifacts exist; pass --artifact <id> or --all.");
  }
  if (args.all) return artifacts;
  if (args.artifact) {
    const artifact = registry.artifactMap.get(args.artifact);
    if (!artifact) throw new Error(`Unknown artifact "${args.artifact}"`);
    return [artifact];
  }
  return artifacts;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(help());
  process.exit(0);
}
if (args.list) {
  console.log(JSON.stringify({
    agents: Object.keys(catalog.agents),
    grammars: Object.keys(catalog.grammars),
    adapters: Object.keys(catalog.adapters),
    domains: Object.keys(catalog.domains),
    pages: Object.keys(catalog.pages),
    recipes: ["auto", ...Object.keys(catalog.recipes)],
    palettes: ["auto", ...Object.keys(catalog.palettes)],
    profiles: ["none", ...Object.keys(catalog.profiles)],
  }, null, 2));
  process.exit(0);
}

const projectRoot = resolve(args["project-root"] ?? process.cwd());
const agent = args.agent ?? "codex";
if (!catalog.agents[agent]) throw new Error(`Unknown agent "${agent}"`);
const registry = loadProjectRegistry(projectRoot, { catalog });

if (!registry) {
  const lockPath = safeProjectPath(projectRoot, args["from-lock"] ?? "STYLESEED.md");
  const lock = parseLegacyLock(lockPath);
  const normalized = legacyArgsToNormalized(args, lock);
  const compiled = compileContext({
    catalog,
    projectRoot,
    agent,
    normalizedProject: normalized.project,
    normalizedArtifact: normalized.artifact,
    legacyLock: lock,
    mode: "legacy",
  });
  if (args.check) process.exit(checkCompiled(projectRoot, compiled));
  if (args.stdout) {
    process.stdout.write(compiled.bundle);
    process.exit(0);
  }
  writeOutputs(projectRoot, compiled);
  console.log(`StyleSeed ${catalog.engineVersion}: ${compiled.manifest.selection.grammar} × ${compiled.manifest.selection.adapter} × ${compiled.manifest.selection.domain} × ${compiled.manifest.selection.page} × ${compiled.manifest.selection.recipe} × ${compiled.manifest.selection.palette} × ${compiled.manifest.selection.profile}`);
  console.log(`wrote ${resolve(projectRoot, compiled.manifest.bundle.path)} (${Buffer.byteLength(compiled.bundle)} bytes, ${compiled.manifest.bundle.sha256})`);
  console.log(`wrote ${resolve(projectRoot, compiled.manifestPath)}`);
  if (compiled.paletteJson) console.log(`wrote ${resolve(projectRoot, ".styleseed/palette.json")} and ${resolve(projectRoot, ".styleseed/palette.css")}`);
  process.exit(0);
}

ensureNoRegistryOverrides(args);
const targets = resolveTargets(registry, args);
const compiledTargets = targets.map((entry) => compileContext({
  catalog,
  projectRoot,
  agent,
  normalizedProject: registry.project,
  normalizedArtifact: entry.artifact,
  inputFiles: {
    project: { path: ".styleseed/project.json", content: readFileSync(registry.paths.projectFile, "utf8") },
    artifact: { path: entry.relativePath, content: readFileSync(entry.path, "utf8") },
  },
  mode: "registry",
})).sort((left, right) => left.manifest.artifactId.localeCompare(right.manifest.artifactId));

if (args.check) {
  let status = 0;
  for (const compiled of compiledTargets) status = Math.max(status, checkCompiled(projectRoot, compiled));
  process.exit(status);
}
if (args.stdout) {
  process.stdout.write(compiledTargets.map((compiled) => compiled.bundle).join("\n\n"));
  process.exit(0);
}
for (const compiled of compiledTargets) writeOutputs(projectRoot, compiled);
for (const compiled of compiledTargets) {
  console.log(`StyleSeed ${catalog.engineVersion}: wrote ${compiled.manifest.artifactId} → ${compiled.manifest.bundle.path}`);
}
