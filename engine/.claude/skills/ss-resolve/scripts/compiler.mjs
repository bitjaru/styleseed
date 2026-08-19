import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sha256, safeProjectPath } from "./runtime-contract.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const paletteGeneratorPath = [
  resolve(scriptDir, "palette-generator.mjs"),
  resolve(scriptDir, "../../../../color/generator.mjs"),
  resolve(scriptDir, "../../../engine/color/generator.mjs"),
].find((path) => existsSync(path));
if (!paletteGeneratorPath) throw new Error("StyleSeed palette generator is missing from the installed distribution");
const { generatePalette } = await import(pathToFileURL(paletteGeneratorPath).href);
const defaultCatalog = JSON.parse(readFileSync(resolve(skillDir, "references/catalog.json"), "utf8"));

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

const PALETTE_DEFAULTS_BY_RECIPE = {
  "calm-consumer": { character: "calm", temperature: "neutral" },
  "native-mobile": { character: "balanced", temperature: "neutral" },
  "enterprise-workbench": { character: "balanced", temperature: "cool" },
  "developer-platform": { character: "deep", temperature: "cool" },
  "commerce-operator": { character: "balanced", temperature: "warm" },
  "public-service": { character: "calm", temperature: "neutral" },
  "creative-professional": { character: "vivid", temperature: "neutral" },
  "editorial-authority": { character: "deep", temperature: "warm" },
  "expressive-brand": { character: "vivid", temperature: "warm" },
};

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function sourceEntry(id, path, content) {
  return { id, path, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

function outputEntry(kind, path, content) {
  return { kind, path, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

function requireCatalogContent(catalog, group, id, label) {
  if (id === null || id === "none") return "";
  const value = catalog[group]?.[id];
  if (!value) throw new Error(`Unknown ${label} "${id}". Supported: ${Object.keys(catalog[group] ?? {}).join(", ")}`);
  return value;
}

function buildLegacyLockSection(legacyLock) {
  const lines = [];
  const mapping = [
    ["domain", "App domain"],
    ["adapter", "Surface adapter"],
    ["page", "Page type"],
    ["grammar", "Output grammar"],
    ["fallback", "Grammar fallback"],
    ["recipeSelection", "Brand recipe"],
    ["paletteSelection", "Palette recipe"],
    ["keyColor", "Key color"],
    ["paletteCharacter", "Palette character"],
    ["paletteMode", "Palette mode"],
    ["paletteHarmony", "Palette harmony"],
    ["surfaceTemperature", "Surface temperature"],
    ["profile", "Aesthetic profile"],
  ];
  for (const [key, label] of mapping) {
    const value = legacyLock?.normalized?.[key];
    if (value === null || value === undefined || value === "") continue;
    lines.push(`- ${label}: ${value}`);
  }
  if (!lines.length) return "";
  return `## Project design lock\n\n${lines.join("\n")}`;
}

function resolveRecipeAndPalette(selection, projectBrand, catalog) {
  const recipeGrammar = selection.grammar.startsWith("reference:") ? selection.fallback : selection.grammar;
  const recipe = selection.recipeSelection === "auto"
    ? AUTO_RECIPE_BY_GRAMMAR[recipeGrammar]
    : selection.recipeSelection;
  if (!recipe) throw new Error(`No automatic brand recipe for grammar "${recipeGrammar}". Pass an explicit recipe.`);
  if (!catalog.recipes?.[recipe]) throw new Error(`Unknown brand recipe "${recipe}"`);
  const palette = selection.paletteSelection === "auto"
    ? AUTO_PALETTE_BY_RECIPE[recipe]
    : selection.paletteSelection;
  if (!palette) throw new Error(`No automatic palette recipe for brand recipe "${recipe}". Pass an explicit palette.`);
  if (!catalog.palettes?.[palette]) throw new Error(`Unknown palette recipe "${palette}"`);
  const defaults = PALETTE_DEFAULTS_BY_RECIPE[recipe] ?? { character: "balanced", temperature: "neutral" };
  const paletteGeneration = projectBrand.keyColor
    ? generatePalette({
        keyColor: projectBrand.keyColor,
        mode: projectBrand.paletteMode,
        character: projectBrand.paletteCharacter ?? defaults.character,
        harmony: projectBrand.paletteHarmony ?? "auto",
        temperature: projectBrand.surfaceTemperature ?? defaults.temperature,
      })
    : null;
  return { recipe, palette, paletteGeneration };
}

function resolveReferenceGrammar({ projectRoot, grammar, fallback, registryMode }) {
  if (!grammar.startsWith("reference:")) return null;
  const slug = grammar.slice("reference:".length);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(slug)) throw new Error(`Invalid reference grammar slug: ${slug}`);
  const baseDir = safeProjectPath(projectRoot, `.styleseed/rulesets/${slug}`);
  const requiredFiles = registryMode
    ? ["RULESET.md", "tokens.json", "evidence.json", "checks.md", "reference-board.html", "adapter.json"]
    : ["RULESET.md"];
  const optionalFiles = registryMode ? [] : ["checks.md"];
  const files = [];
  for (const name of [...requiredFiles, ...optionalFiles]) {
    const filePath = resolve(baseDir, name);
    if (!existsSync(filePath)) {
      if (requiredFiles.includes(name)) {
        throw new Error(`Missing reference grammar contract file: .styleseed/rulesets/${slug}/${name}`);
      }
      continue;
    }
    files.push({
      name,
      path: `.styleseed/rulesets/${slug}/${name}`,
      content: readFileSync(filePath, "utf8").trim(),
    });
  }
  const fallbackContent = requireCatalogContent(defaultCatalog, "grammars", fallback, "fallback grammar");
  const ruleSet = files.find((file) => file.name === "RULESET.md");
  const checks = files.find((file) => file.name === "checks.md");
  const composite = [
    fallbackContent,
    "",
    "## Project-local reference grammar override",
    "",
    ruleSet.content,
    ...(checks ? ["", "## Reference grammar checks", "", checks.content] : []),
  ].join("\n");
  return {
    slug,
    grammarSource: `project:.styleseed/rulesets/${slug}/RULESET.md`,
    grammarContent: composite,
    sourceFiles: files,
    contract: registryMode ? "reference-contract-v2" : "reference-contract-legacy",
  };
}

function buildBundle({ catalog, selected, sections }) {
  return [
    "# StyleSeed Effective Rule Bundle",
    "",
    "<!-- Generated by ss-resolve. Do not hand-edit; update project-owned inputs or resolver inputs. -->",
    "",
    `- Engine: ${catalog.engineVersion}`,
    `- Engine revision: ${catalog.engineRevision ?? "legacy-unknown"}`,
    `- Agent: ${selected.agent}`,
    `- Output grammar: ${selected.grammar}`,
    `- Surface adapter: ${selected.adapter}`,
    `- Domain: ${selected.domain}`,
    `- Page type: ${selected.page}`,
    `- Brand recipe: ${selected.recipe}${selected.recipeSelection === "auto" ? " (auto)" : ""}`,
    `- Palette recipe: ${selected.palette}${selected.paletteSelection === "auto" ? " (auto)" : ""}`,
    ...(selected.paletteGeneration ? [`- Generated palette: ${selected.paletteGeneration.keyColor} · ${selected.paletteGeneration.mode} · ${selected.paletteGeneration.character} · ${selected.paletteGeneration.harmony}`] : []),
    `- Aesthetic profile: ${selected.profile}`,
    "",
    "Read this bundle before implementation. The agent execution contract is operational; method authority then runs core → grammar → adapter → domain/page → brand recipe → palette recipe → profile → lock → compact craft baseline, with the earlier method layer winning conflicts. Run the code gate and rendered visual gate.",
    "",
    ...sections.flatMap((section) => [section.content, "", "---", ""]),
  ].join("\n").replace(/\n---\n\s*$/, "\n");
}

function toNamedInput(id, path, content) {
  return { entry: sourceEntry(id, path, content), content };
}

export function compileContext({
  catalog = defaultCatalog,
  projectRoot,
  agent,
  normalizedProject,
  normalizedArtifact,
  inputFiles = null,
  legacyLock = null,
  mode = "legacy",
}) {
  const registryMode = mode === "registry";
  const selection = {
    grammar: normalizedArtifact.selection.grammar,
    adapter: normalizedArtifact.selection.adapter ?? normalizedProject.defaults.adapter,
    domain: normalizedArtifact.selection.domain ?? normalizedProject.defaults.domain,
    page: normalizedArtifact.selection.page,
    recipeSelection: normalizedArtifact.selection.recipe ?? normalizedProject.defaults.recipe,
    paletteSelection: normalizedArtifact.selection.palette ?? normalizedProject.defaults.palette,
    profile: normalizedArtifact.selection.profile ?? normalizedProject.defaults.profile,
    fallback: normalizedArtifact.selection.fallback ?? normalizedProject.defaults.fallback,
  };
  const { recipe, palette, paletteGeneration } = resolveRecipeAndPalette(selection, normalizedProject.brand, catalog);
  const reference = resolveReferenceGrammar({
    projectRoot,
    grammar: selection.grammar,
    fallback: selection.fallback,
    registryMode,
  });

  const grammarContent = reference
    ? reference.grammarContent
    : requireCatalogContent(catalog, "grammars", selection.grammar, "grammar");
  const grammarSource = reference ? reference.grammarSource : `built-in:${selection.grammar}`;
  const adapterContent = requireCatalogContent(catalog, "adapters", selection.adapter, "adapter");
  const domainContent = requireCatalogContent(catalog, "domains", selection.domain, "domain");
  const pageContent = requireCatalogContent(catalog, "pages", selection.page, "page");
  const recipeContent = requireCatalogContent(catalog, "recipes", recipe, "brand recipe");
  let paletteContent = requireCatalogContent(catalog, "palettes", palette, "palette recipe");
  const profileContent = selection.profile === "none" ? "" : requireCatalogContent(catalog, "profiles", selection.profile, "profile");

  if (paletteGeneration) {
    paletteContent = [
      paletteContent,
      "",
      "## Generated semantic palette override",
      "",
      `- Key color: ${paletteGeneration.input.keyColor}`,
      `- Mode: ${paletteGeneration.input.mode}`,
      `- Character: ${paletteGeneration.input.character}`,
      `- Harmony: ${paletteGeneration.input.harmony}`,
      `- Surface temperature: ${paletteGeneration.input.temperature}`,
      `- Semantic roles: ${Object.entries(paletteGeneration.roles).map(([role, value]) => `${role}=${value}`).join(" · ")}`,
      `- Contrast gates: ${paletteGeneration.contrast.map((item) => `${item.foreground}/${item.background}=${item.ratio}:1`).join(" · ")}`,
      "- Allocation: 60% canvas/surfaces · 30% chrome/type/structure · at most 10% primary and accent emphasis combined.",
      "- This override replaces the recipe hex values while preserving its product posture and semantic restrictions.",
      "- Components consume semantic roles. Raw ramp values remain reference tokens.",
    ].join("\n");
  }

  const selected = {
    agent,
    grammar: selection.grammar,
    grammarSource,
    referenceContract: reference?.contract ?? null,
    fallback: selection.fallback ?? null,
    adapter: selection.adapter,
    domain: selection.domain,
    page: selection.page,
    recipe,
    recipeSelection: selection.recipeSelection,
    palette,
    paletteSelection: selection.paletteSelection,
    paletteGeneration: paletteGeneration ? paletteGeneration.input : null,
    profile: selection.profile,
  };

  const sections = [
    { id: "agent-execution", path: "catalog:agents", content: catalog.agents[agent] },
    { id: "core", path: "catalog:core", content: catalog.core },
    { id: "grammar", path: grammarSource, content: grammarContent },
    { id: "adapter", path: `catalog:adapters/${selection.adapter}`, content: adapterContent },
    ...(domainContent ? [{ id: "domain", path: `catalog:domains/${selection.domain}`, content: domainContent }] : []),
    ...(pageContent ? [{ id: "page", path: `catalog:pages/${selection.page}`, content: pageContent }] : []),
    { id: "recipe", path: `catalog:recipes/${recipe}`, content: recipeContent },
    { id: "palette", path: `catalog:palettes/${palette}`, content: paletteContent },
    ...(profileContent ? [{ id: "profile", path: `catalog:profiles/${selection.profile}`, content: profileContent }] : []),
    ...(legacyLock ? [{ id: "lock", path: legacyLock.path ?? "legacy:STYLESEED.md", content: buildLegacyLockSection(legacyLock) }] : []),
    { id: "craft", path: "catalog:craft", content: catalog.craft },
  ].filter((section) => section.content && section.content.trim().length > 0);

  const bundle = buildBundle({ catalog, selected, sections });
  const bundlePath = registryMode
    ? `.styleseed/bundles/${normalizedArtifact.id}.md`
    : ".styleseed/effective-rules.md";
  const paletteJsonPath = registryMode
    ? `.styleseed/palettes/${normalizedArtifact.id}.json`
    : ".styleseed/palette.json";
  const paletteCssPath = registryMode
    ? `.styleseed/palettes/${normalizedArtifact.id}.css`
    : ".styleseed/palette.css";
  const manifestPath = registryMode
    ? `.styleseed/manifests/${normalizedArtifact.id}.json`
    : ".styleseed/manifest.json";

  const paletteJson = paletteGeneration ? `${stableStringify(paletteGeneration)}\n` : null;
  const paletteCss = paletteGeneration ? `${paletteGeneration.css}\n` : null;
  const bundleEntry = outputEntry("bundle", bundlePath, bundle);
  const outputs = [
    bundleEntry,
    ...(paletteJson ? [outputEntry("palette-json", paletteJsonPath, paletteJson)] : []),
    ...(paletteCss ? [outputEntry("palette-css", paletteCssPath, paletteCss)] : []),
  ];

  const sources = [
    ...sections.map((section) => sourceEntry(section.id, section.path, section.content)),
    ...(reference?.sourceFiles ?? []).map((file) => sourceEntry(`reference:${file.name}`, file.path, file.content)),
  ];

  if (!registryMode) {
    const legacyOutputs = outputs.map((entry) => ({ ...entry, sha256: entry.sha256.replace(/^sha256:/u, "") }));
    const legacyBundle = { ...bundleEntry, sha256: bundleEntry.sha256.replace(/^sha256:/u, "") };
    const legacyPaletteJson = legacyOutputs.find((entry) => entry.kind === "palette-json") ?? null;
    const legacyPaletteCss = legacyOutputs.find((entry) => entry.kind === "palette-css") ?? null;
    const manifest = {
      schemaVersion: 1,
      engineVersion: catalog.engineVersion,
      engineRevision: catalog.engineRevision ?? null,
      generatedAt: new Date().toISOString(),
      selection: selected,
      bundle: legacyBundle,
      outputs: legacyOutputs,
      palette: paletteGeneration
        ? {
            json: legacyPaletteJson,
            css: legacyPaletteCss,
          }
        : null,
      sources: sources.map(({ id, sha256: fileSha, bytes }) => ({ id, sha256: fileSha.replace(/^sha256:/u, ""), bytes })),
    };
    return { bundle, manifest, paletteJson, paletteCss, manifestPath, outputs, sources };
  }

  if (!inputFiles?.project?.path || typeof inputFiles.project.content !== "string" || !inputFiles?.artifact?.path || typeof inputFiles.artifact.content !== "string") {
    throw new Error("Registry compilation requires exact project and artifact input bytes");
  }
  const projectInput = toNamedInput("project", inputFiles.project.path, inputFiles.project.content);
  const artifactInput = toNamedInput("artifact", inputFiles.artifact.path, inputFiles.artifact.content);
  const methodHash = sha256({
    project: normalizedProject.defaults,
    brand: normalizedProject.brand,
    selection: {
      grammar: selected.grammar,
      adapter: selected.adapter,
      domain: selected.domain,
      page: selected.page,
      recipe: selected.recipe,
      palette: selected.palette,
      profile: selected.profile,
      fallback: selected.fallback,
    },
    decisions: normalizedArtifact.decisions,
    sources: sources.map((entry) => ({ id: entry.id, sha256: entry.sha256 })),
  });
  const validationHash = sha256({
    target: normalizedArtifact.target,
    implementation: normalizedArtifact.implementation,
    validation: normalizedArtifact.validation,
  });
  const validationSlices = {
    target: sha256(normalizedArtifact.target),
    implementation: sha256(normalizedArtifact.implementation),
    scoreFloor: sha256(normalizedArtifact.validation.scoreFloor),
    requiredRenders: sha256(normalizedArtifact.validation.requiredRenders),
    temporal: sha256(normalizedArtifact.validation.temporal),
    humanAcceptance: sha256(normalizedArtifact.validation.humanAcceptance),
  };
  const manifest = {
    schemaVersion: 2,
    artifactId: normalizedArtifact.id,
    engineVersion: catalog.engineVersion,
    engineRevision: catalog.engineRevision,
    distributionIntegrity: "verified",
    selection: selected,
    inputs: [projectInput.entry, artifactInput.entry],
    sources,
    methodHash,
    validationHash,
    validationSlices,
    bundle: bundleEntry,
    outputs,
  };
  return { bundle, manifest, paletteJson, paletteCss, manifestPath, outputs, sources };
}

export function materializeManifestOutputs(existingManifest) {
  if (Array.isArray(existingManifest?.outputs)) return existingManifest.outputs;
  const outputs = [];
  if (existingManifest?.bundle) outputs.push({ kind: "bundle", ...existingManifest.bundle });
  if (existingManifest?.palette?.json) outputs.push({ kind: "palette-json", ...existingManifest.palette.json });
  if (existingManifest?.palette?.css) outputs.push({ kind: "palette-css", ...existingManifest.palette.css });
  return outputs;
}

export function compareEntries(expected, actual, label, keyFields) {
  if (!Array.isArray(actual)) return `${label} declarations are missing or invalid.`;
  if (expected.length !== actual.length) return `${label} count mismatch: expected ${expected.length}, found ${actual.length}.`;
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index];
    const right = actual[index];
    for (const field of keyFields) {
      if (left[field] !== right?.[field]) {
        return `${label} mismatch for ${left.path ?? left.id ?? `entry ${index}`}: expected ${field}=${left[field]}, found ${right?.[field] ?? "missing"}.`;
      }
    }
  }
  return null;
}

export { defaultCatalog };
