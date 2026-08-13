import { createHash } from "node:crypto";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_FILE = /^[a-z0-9][a-z0-9-]{0,63}\.json$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const CONTROL = /[\u0000-\u001f\u007f]/u;

const enums = {
  agents: ["claude", "codex", "cursor", "factory", "gemini", "kiro", "opencode", "windsurf"],
  paletteCharacter: ["calm", "balanced", "vivid", "deep"],
  paletteMode: ["light", "dark"],
  paletteHarmony: ["auto", "tonal", "adjacent", "contrast"],
  surfaceTemperature: ["neutral", "warm", "cool"],
  radius: ["sharp", "restrained", "balanced", "soft", "pill"],
  elevation: ["flat", "tonal", "restrained-shadow", "layered"],
  density: ["compact", "comfortable", "spacious"],
  motionSeed: ["spring", "silk", "snap", "float", "pulse"],
  motionIntensity: ["restrained", "standard", "lively"],
  imageryRole: ["data-first", "product-proof-first", "editorial-media", "people-context", "generated-atmosphere", "none"],
  targetKind: ["route", "component", "document", "deck", "carousel", "single-frame"],
  renderState: ["loaded", "loading", "empty", "error", "success", "disabled", "focused", "reduced-motion"],
};

function fail(message) { throw new Error(message); }
function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const extra = Object.keys(value).filter((key) => !keys.includes(key));
  if (extra.length) fail(`${label} contains unknown keys: ${extra.join(", ")}`);
  return value;
}
function required(value, label) { if (value === undefined) fail(`${label} is required`); return value; }
function oneOf(value, values, label) { if (!values.includes(value)) fail(`${label} is invalid`); return value; }
function id(value, label) { if (typeof value !== "string" || !SAFE_ID.test(value)) fail(`${label} must be a safe ID`); return value; }
function text(value, label, max = 600) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || CONTROL.test(value)) fail(`${label} must be bounded single-line text`);
  return value;
}
function grammarId(catalog, value, label) {
  if (typeof value !== "string") fail(`${label} is not in the current catalog`);
  if (value.startsWith("reference:")) {
    const slug = value.slice("reference:".length);
    if (!SAFE_ID.test(slug)) fail(`${label} must use a safe reference grammar slug`);
    return value;
  }
  return catalogId(catalog, "grammars", value, label);
}
function catalogId(catalog, group, value, label, { nullable = false, none = false } = {}) {
  if (nullable && value === null) return null;
  if (none && value === "none") return value;
  if (typeof value !== "string" || !catalog?.[group] || !Object.hasOwn(catalog[group], value)) fail(`${label} is not in the current catalog`);
  return value;
}
function projectPath(value, label) {
  if (typeof value !== "string" || !value || value.length > 240 || CONTROL.test(value) || isAbsolute(value)) fail(`${label} must be a project-relative path`);
  const parts = value.replaceAll("\\", "/").split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail(`${label} contains an unsafe segment`);
  return parts.join("/");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function parseStrictJson(textValue, { maxBytes = 1024 * 1024 } = {}) {
  if (typeof textValue !== "string") fail("JSON input must be text");
  if (Buffer.byteLength(textValue) > maxBytes) fail(`JSON input exceeds ${maxBytes} bytes`);
  let cursor = 0;
  let depth = 0;
  const MAX_DEPTH = 128;
  const ws = () => { while (/[ \t\r\n]/u.test(textValue[cursor] ?? "")) cursor += 1; };
  const string = () => {
    if (textValue[cursor] !== '"') fail(`Expected string at byte ${cursor}`);
    const start = cursor++;
    while (cursor < textValue.length) {
      if (textValue[cursor] === "\\") { cursor += 2; continue; }
      if (textValue[cursor++] === '"') return JSON.parse(textValue.slice(start, cursor));
    }
    fail("Unterminated JSON string");
  };
  const value = () => {
    ws();
    if (textValue[cursor] === '"') return string();
    if (textValue[cursor] === "{") {
      depth += 1; if (depth > MAX_DEPTH) fail(`JSON nesting exceeds ${MAX_DEPTH}`);
      cursor += 1; ws(); const out = {}; const seen = new Set();
      if (textValue[cursor] === "}") { cursor += 1; depth -= 1; return out; }
      while (true) {
        ws(); const key = string();
        if (seen.has(key)) fail(`Duplicate JSON key: ${key}`);
        seen.add(key); ws(); if (textValue[cursor++] !== ":") fail(`Expected colon at byte ${cursor - 1}`);
        out[key] = value(); ws();
        if (textValue[cursor] === "}") { cursor += 1; depth -= 1; return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right))); }
        if (textValue[cursor++] !== ",") fail(`Expected comma at byte ${cursor - 1}`);
      }
    }
    if (textValue[cursor] === "[") {
      depth += 1; if (depth > MAX_DEPTH) fail(`JSON nesting exceeds ${MAX_DEPTH}`);
      cursor += 1; ws(); const out = [];
      if (textValue[cursor] === "]") { cursor += 1; depth -= 1; return out; }
      while (true) {
        out.push(value()); ws();
        if (textValue[cursor] === "]") { cursor += 1; depth -= 1; return out; }
        if (textValue[cursor++] !== ",") fail(`Expected comma at byte ${cursor - 1}`);
      }
    }
    const match = textValue.slice(cursor).match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u);
    if (!match) fail(`Invalid JSON value at byte ${cursor}`);
    cursor += match[0].length;
    return JSON.parse(match[0]);
  };
  const parsed = value(); ws();
  if (cursor !== textValue.length) fail(`Trailing JSON content at byte ${cursor}`);
  return parsed;
}

export function safeProjectPath(projectRoot, relativePath) {
  const normalized = projectPath(relativePath, "path");
  const root = realpathSync(projectRoot);
  const target = resolve(root, normalized);
  const lexical = relative(root, target);
  if (!lexical || lexical.startsWith(`..${sep}`) || lexical === ".." || isAbsolute(lexical)) fail("path escapes project root");
  let current = root;
  for (const part of normalized.split("/")) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) fail(`path traverses a symlink: ${relativePath}`);
  }
  if (existsSync(target)) {
    const stats = lstatSync(target);
    if (!stats.isFile() && !stats.isDirectory()) fail("path target must be a regular file or directory");
    const real = realpathSync(target);
    const contained = relative(root, real);
    if (contained.startsWith(`..${sep}`) || contained === ".." || isAbsolute(contained)) fail("path realpath escapes project root");
  }
  return target;
}

export function normalizeProject(input, catalog) {
  exactObject(input, ["schemaVersion", "projectId", "defaults", "brand"], "project");
  if (required(input.schemaVersion, "project.schemaVersion") !== 1) fail("project.schemaVersion must be 1");
  const defaults = exactObject(required(input.defaults, "project.defaults"), ["agent", "domain", "adapter", "recipe", "palette", "profile", "fallback"], "project.defaults");
  const brand = exactObject(required(input.brand, "project.brand"), ["keyColor", "paletteCharacter", "paletteMode", "paletteHarmony", "surfaceTemperature", "fontFamilies", "radius", "elevation", "density", "motion", "imageryRole"], "project.brand");
  const motion = exactObject(required(brand.motion, "project.brand.motion"), ["seed", "intensity"], "project.brand.motion");
  if (!Array.isArray(brand.fontFamilies) || brand.fontFamilies.length < 1 || brand.fontFamilies.length > 8) fail("fontFamilies must contain 1-8 values");
  const fontFamilies = brand.fontFamilies.map((font) => {
    if (typeof font !== "string" || font.length > 80 || !/^[\p{L}\p{N} .,'-]+$/u.test(font)) fail("fontFamilies contains an invalid font name");
    return font;
  });
  if (typeof brand.keyColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(brand.keyColor)) fail("keyColor must be six-digit hex");
  return {
    schemaVersion: 1,
    projectId: id(required(input.projectId, "project.projectId"), "project.projectId"),
    defaults: {
      agent: oneOf(required(defaults.agent, "defaults.agent"), enums.agents, "defaults.agent"),
      domain: catalogId(catalog, "domains", required(defaults.domain, "defaults.domain"), "defaults.domain", { none: true }),
      adapter: catalogId(catalog, "adapters", required(defaults.adapter, "defaults.adapter"), "defaults.adapter"),
      recipe: catalogId(catalog, "recipes", required(defaults.recipe, "defaults.recipe"), "defaults.recipe"),
      palette: catalogId(catalog, "palettes", required(defaults.palette, "defaults.palette"), "defaults.palette"),
      profile: catalogId(catalog, "profiles", required(defaults.profile, "defaults.profile"), "defaults.profile", { none: true }),
      fallback: catalogId(catalog, "grammars", required(defaults.fallback, "defaults.fallback"), "defaults.fallback", { nullable: true }),
    },
    brand: {
      keyColor: brand.keyColor.toUpperCase(),
      paletteCharacter: oneOf(required(brand.paletteCharacter, "brand.paletteCharacter"), enums.paletteCharacter, "brand.paletteCharacter"),
      paletteMode: oneOf(required(brand.paletteMode, "brand.paletteMode"), enums.paletteMode, "brand.paletteMode"),
      paletteHarmony: oneOf(required(brand.paletteHarmony, "brand.paletteHarmony"), enums.paletteHarmony, "brand.paletteHarmony"),
      surfaceTemperature: oneOf(required(brand.surfaceTemperature, "brand.surfaceTemperature"), enums.surfaceTemperature, "brand.surfaceTemperature"),
      fontFamilies,
      radius: oneOf(required(brand.radius, "brand.radius"), enums.radius, "brand.radius"),
      elevation: oneOf(required(brand.elevation, "brand.elevation"), enums.elevation, "brand.elevation"),
      density: oneOf(required(brand.density, "brand.density"), enums.density, "brand.density"),
      motion: { seed: oneOf(required(motion.seed, "motion.seed"), enums.motionSeed, "motion.seed"), intensity: oneOf(required(motion.intensity, "motion.intensity"), enums.motionIntensity, "motion.intensity") },
      imageryRole: oneOf(required(brand.imageryRole, "brand.imageryRole"), enums.imageryRole, "brand.imageryRole"),
    },
  };
}

export function normalizeIndex(input) {
  exactObject(input, ["schemaVersion", "artifacts"], "artifact index");
  if (input.schemaVersion !== 1 || !Array.isArray(input.artifacts) || input.artifacts.length < 1) fail("artifact index is invalid");
  const seen = new Set();
  const artifacts = input.artifacts.map((entry, index) => {
    exactObject(entry, ["id", "config"], `artifacts[${index}]`);
    const artifactId = id(required(entry.id, `artifacts[${index}].id`), `artifacts[${index}].id`);
    if (seen.has(artifactId)) fail(`duplicate artifact ID: ${artifactId}`);
    seen.add(artifactId);
    if (typeof entry.config !== "string" || !SAFE_FILE.test(entry.config) || entry.config !== `${artifactId}.json`) fail(`artifact config must be ${artifactId}.json`);
    return { id: artifactId, config: entry.config };
  }).sort((left, right) => left.id.localeCompare(right.id));
  return { schemaVersion: 1, artifacts };
}

export function normalizeArtifact(input, project, catalog) {
  exactObject(input, ["schemaVersion", "id", "target", "selection", "decisions", "implementation", "validation"], "artifact");
  if (input.schemaVersion !== 1) fail("artifact.schemaVersion must be 1");
  const target = exactObject(required(input.target, "artifact.target"), ["kind", "locator"], "artifact.target");
  const selection = exactObject(required(input.selection, "artifact.selection"), ["grammar", "adapter", "domain", "page", "recipe", "palette", "profile", "fallback"], "artifact.selection");
  const decisions = exactObject(required(input.decisions, "artifact.decisions"), ["primaryDecision", "primaryAction", "signatureMove"], "artifact.decisions");
  const implementation = exactObject(required(input.implementation, "artifact.implementation"), ["sourceRoots", "tokenFiles"], "artifact.implementation");
  const validation = exactObject(required(input.validation, "artifact.validation"), ["scoreFloor", "requiredRenders", "temporal", "humanAcceptance"], "artifact.validation");
  const temporal = exactObject(required(validation.temporal, "validation.temporal"), ["required", "scenarios"], "validation.temporal");
  const kind = oneOf(required(target.kind, "target.kind"), enums.targetKind, "target.kind");
  let locator;
  if (kind === "route") {
    locator = target.locator;
    if (typeof locator !== "string" || !locator.startsWith("/") || locator.length > 240 || /[?#]/u.test(locator) || CONTROL.test(locator)) fail("route locator is invalid");
  } else locator = projectPath(target.locator, "target.locator");
  if (!Array.isArray(implementation.sourceRoots) || implementation.sourceRoots.length < 1 || !Array.isArray(implementation.tokenFiles)) fail("artifact implementation paths are invalid");
  if (!Array.isArray(validation.requiredRenders) || validation.requiredRenders.length < 1) fail("requiredRenders must not be empty");
  const renderIds = new Set();
  const requiredRenders = validation.requiredRenders.map((render, index) => {
    exactObject(render, ["id", "state", "viewport"], `requiredRenders[${index}]`);
    exactObject(render.viewport, ["width", "height"], `requiredRenders[${index}].viewport`);
    const renderId = id(render.id, `requiredRenders[${index}].id`);
    if (renderIds.has(renderId)) fail(`duplicate render ID: ${renderId}`);
    renderIds.add(renderId);
    for (const dimension of ["width", "height"]) if (!Number.isInteger(render.viewport[dimension]) || render.viewport[dimension] < 1 || render.viewport[dimension] > 10000) fail(`viewport ${dimension} is invalid`);
    return { id: renderId, state: oneOf(render.state, enums.renderState, "render state"), viewport: { width: render.viewport.width, height: render.viewport.height } };
  }).sort((left, right) => left.id.localeCompare(right.id));
  if (typeof temporal.required !== "boolean" || !Array.isArray(temporal.scenarios)) fail("temporal contract is invalid");
  const scenarios = temporal.scenarios.map((scenario) => id(scenario, "temporal scenario"));
  if (new Set(scenarios).size !== scenarios.length) fail("temporal scenarios contain duplicate IDs");
  if (!temporal.required && scenarios.length) fail("temporal scenarios require temporal.required=true");
  if (!Number.isInteger(validation.scoreFloor) || validation.scoreFloor < 80 || validation.scoreFloor > 100) fail("scoreFloor must be 80-100");
  if (typeof validation.humanAcceptance !== "boolean") fail("humanAcceptance must be boolean");
  return {
    schemaVersion: 1,
    id: id(input.id, "artifact.id"),
    target: { kind, locator },
    selection: {
      grammar: grammarId(catalog, selection.grammar, "selection.grammar"),
      adapter: catalogId(catalog, "adapters", selection.adapter ?? project.defaults.adapter, "selection.adapter"),
      domain: catalogId(catalog, "domains", selection.domain ?? project.defaults.domain, "selection.domain", { none: true }),
      page: catalogId(catalog, "pages", selection.page, "selection.page", { none: true }),
      recipe: catalogId(catalog, "recipes", selection.recipe ?? project.defaults.recipe, "selection.recipe"),
      palette: catalogId(catalog, "palettes", selection.palette ?? project.defaults.palette, "selection.palette"),
      profile: catalogId(catalog, "profiles", selection.profile ?? project.defaults.profile, "selection.profile", { none: true }),
      fallback: catalogId(catalog, "grammars", selection.fallback ?? project.defaults.fallback, "selection.fallback", { nullable: true }),
    },
    decisions: { primaryDecision: text(decisions.primaryDecision, "primaryDecision"), primaryAction: text(decisions.primaryAction, "primaryAction"), signatureMove: text(decisions.signatureMove, "signatureMove") },
    implementation: { sourceRoots: implementation.sourceRoots.map((path) => projectPath(path, "sourceRoot")).sort(), tokenFiles: implementation.tokenFiles.map((path) => projectPath(path, "tokenFile")).sort() },
    validation: { scoreFloor: validation.scoreFloor, requiredRenders, temporal: { required: temporal.required, scenarios: [...new Set(scenarios)].sort() }, humanAcceptance: validation.humanAcceptance },
  };
}

export const CONTRACT_ENUMS = Object.freeze(enums);
export const isSha256 = (value) => typeof value === "string" && SHA256.test(value);
