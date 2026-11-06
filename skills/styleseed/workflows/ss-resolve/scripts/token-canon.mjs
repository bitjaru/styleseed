// Imported token canon. A project's own DTCG (2025.10), Tokens Studio, or Figma Variables file
// becomes the colour and type source of truth. StyleSeed maps its semantic roles onto the imported
// tokens and validates them (aliases, layering, modes, contrast). It never regenerates a colour,
// rewrites a value, or falls back to a preset when a role is missing: a missing role is an error
// that names the token the project must map.
//
// Layering follows the order a working designer builds a system (research/tokens, #96):
//   primitive → semantic (fg / bg / bd × emphasis) → type roles → components
// Only primitives hold literal values; semantic tokens alias primitives; component tokens alias
// semantic tokens; every alias resolves without cycles to a token of the same type.

export const TOKEN_FORMATS = Object.freeze(["dtcg", "tokens-studio", "figma-variables"]);
export const LAYERS = Object.freeze(["primitive", "semantic", "type", "component"]);
export const EMPHASIS = Object.freeze(["base", "subtle", "muted", "emphasis", "inverse"]);
export const PROPERTIES = Object.freeze(["fg", "bg", "bd"]);

// The eighteen semantic roles every StyleSeed palette exposes (same set as the generator).
export const PALETTE_ROLES = Object.freeze([
  "background", "surface", "chrome", "foreground", "mutedForeground", "chromeForeground", "border",
  "primary", "primaryForeground", "accent", "accentForeground", "focus",
  "success", "successForeground", "warning", "warningForeground", "danger", "dangerForeground",
]);

// Default mapping for files that follow the canon naming. `accent` and `accentForeground` have no
// default on purpose: a companion hue is a design decision, so the project maps it (or points it at
// the primary pair when the system has one brand hue).
export const CANON_ROLE_MAP = Object.freeze({
  background: "semantic.bg.base",
  surface: "semantic.bg.subtle",
  chrome: "semantic.bg.muted",
  foreground: "semantic.fg.base",
  mutedForeground: "semantic.fg.muted",
  chromeForeground: "semantic.fg.base",
  border: "semantic.bd.base",
  primary: "semantic.bg.brand.base",
  primaryForeground: "semantic.fg.inverse",
  focus: "semantic.bd.brand.base",
  success: "semantic.bg.success.emphasis",
  successForeground: "semantic.fg.inverse",
  warning: "semantic.bg.warning.emphasis",
  warningForeground: "semantic.fg.inverse",
  danger: "semantic.bg.danger.emphasis",
  dangerForeground: "semantic.fg.inverse",
});

// The same pairs the palette generator guarantees; here they are measured, never corrected.
export const CONTRAST_GATES = Object.freeze([
  ["foreground", "background", 4.5], ["mutedForeground", "background", 4.5], ["foreground", "surface", 4.5],
  ["chromeForeground", "chrome", 4.5], ["primaryForeground", "primary", 4.5], ["accentForeground", "accent", 4.5],
  ["successForeground", "success", 4.5], ["warningForeground", "warning", 4.5], ["dangerForeground", "danger", 4.5],
  ["focus", "background", 3], ["focus", "surface", 3],
]);

const ALIAS = /^\{([^{}]+)\}$/u;
const STUDIO_ALIAS = /^\$([A-Za-z0-9_][A-Za-z0-9_.-]*)$/u;
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/u;

export const isAlias = (value) => typeof value === "string" && ALIAS.test(value);
export const aliasTarget = (value) => value.slice(1, -1).trim();
const token = (path, type, value, extra = {}) => ({ path, type: type ?? null, value, ...extra });
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

// --- colour utilities ------------------------------------------------------------------------------

export function normalizeHex(input) {
  if (typeof input !== "string") return null;
  const match = input.trim().match(HEX);
  if (!match) return null;
  let digits = match[1];
  if (digits.length <= 4) digits = [...digits].map((d) => d + d).join("");
  const alpha = digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1;
  return { hex: `#${digits.slice(0, 6).toUpperCase()}`, alpha: Number(alpha.toFixed(4)) };
}

const channel = (value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");

// Accepts a DTCG colour object, a hex string, or a Figma {r,g,b,a} object. Returns { hex, alpha } or null.
export function toColor(value) {
  if (typeof value === "string") return normalizeHex(value);
  if (!isObject(value)) return null;
  if (typeof value.hex === "string") {
    const hex = normalizeHex(value.hex);
    if (hex) return { hex: hex.hex, alpha: typeof value.alpha === "number" ? value.alpha : hex.alpha };
  }
  if (Array.isArray(value.components) && value.components.length >= 3 && (value.colorSpace === undefined || value.colorSpace === "srgb")) {
    const [r, g, b] = value.components;
    if ([r, g, b].every((c) => typeof c === "number" && Number.isFinite(c))) {
      return { hex: `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase(), alpha: typeof value.alpha === "number" ? value.alpha : 1 };
    }
  }
  if (["r", "g", "b"].every((key) => typeof value[key] === "number")) {
    return { hex: `#${channel(value.r)}${channel(value.g)}${channel(value.b)}`.toUpperCase(), alpha: typeof value.a === "number" ? Number(value.a.toFixed(4)) : 1 };
  }
  return null;
}

function luminance(hex) {
  const rgb = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Number(((high + 0.05) / (low + 0.05)).toFixed(2));
}

// --- parsing: DTCG ---------------------------------------------------------------------------------

export function flattenDtcg(doc) {
  const tokens = new Map();
  const walk = (node, path, inheritedType) => {
    if (!isObject(node)) return;
    const type = node.$type ?? inheritedType;
    if ("$value" in node) {
      tokens.set(path.join("."), token(path.join("."), type, node.$value, { description: node.$description }));
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...path, key], type);
  };
  walk(doc, [], undefined);
  return tokens;
}
export const flatten = flattenDtcg;

// --- parsing: Tokens Studio --------------------------------------------------------------------------

// Tokens Studio writes one JSON with a group per token set, plus `$themes` and `$metadata`. A token
// is `{ value, type }` (or `$value`/`$type` in newer exports). Aliases read `{set.path}`, `{path}`
// (any set) or `$path`. Type names are the plugin's; they are normalised to DTCG-like families.
const STUDIO_TYPES = Object.freeze({
  color: "color", dimension: "dimension", spacing: "dimension", sizing: "dimension", borderRadius: "dimension",
  borderWidth: "dimension", fontSizes: "dimension", letterSpacing: "dimension", paragraphSpacing: "dimension",
  lineHeights: "number", opacity: "number", number: "number", fontWeights: "fontWeight", fontFamilies: "fontFamily",
  typography: "typography", boxShadow: "shadow", border: "border", composition: "composition", text: "string",
  asset: "string", other: "string", boolean: "boolean",
});

function normalizeStudioValue(value) {
  if (typeof value === "string") {
    const studio = value.trim().match(STUDIO_ALIAS);
    if (studio) return `{${studio[1]}}`;
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeStudioValue);
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeStudioValue(child)]));
  return value;
}

export function flattenTokensStudio(doc, { theme = null } = {}) {
  const problems = [];
  const notes = [];
  if (!isObject(doc)) return { tokens: new Map(), problems: ["tokens-studio: the document is not a JSON object"], notes };
  const sets = Object.keys(doc).filter((key) => !key.startsWith("$"));
  let enabled = sets;
  if (theme) {
    const themes = Array.isArray(doc.$themes) ? doc.$themes : [];
    const match = themes.find((entry) => isObject(entry) && (entry.name === theme || entry.id === theme));
    if (!match) problems.push(`tokens-studio: no theme named "${theme}" in $themes (${themes.map((entry) => entry?.name).filter(Boolean).join(", ") || "none"})`);
    else {
      const selected = isObject(match.selectedTokenSets) ? match.selectedTokenSets : {};
      enabled = sets.filter((set) => ["enabled", "source"].includes(selected[set]));
      notes.push(`theme "${theme}" enables ${enabled.length} of ${sets.length} token sets`);
    }
  }
  const tokens = new Map();
  const walk = (node, set, path, inheritedType) => {
    if (!isObject(node)) return;
    const hasValue = "value" in node || "$value" in node;
    if (hasValue) {
      const rawType = node.$type ?? node.type ?? inheritedType;
      const type = rawType === undefined ? null : (STUDIO_TYPES[rawType] ?? String(rawType));
      const full = [set, ...path].join(".");
      if (tokens.has(full)) problems.push(`tokens-studio: duplicate token path ${full}`);
      tokens.set(full, token(full, type, normalizeStudioValue(node.$value ?? node.value), { set, description: node.description ?? node.$description }));
      return;
    }
    const type = node.$type ?? node.type ?? inheritedType;
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, set, [...path, key], type);
  };
  for (const set of enabled) walk(doc[set], set, [], undefined);
  return { tokens, problems, notes };
}

// --- parsing: Figma Variables ------------------------------------------------------------------------

// The REST `GET /v1/files/:key/variables/local` payload (with or without its `meta` wrapper):
// `variables` keyed by id with `valuesByMode`, and `variableCollections` with named modes. A
// variable's path is `<collection>.<name with / → .>`. One mode is read per collection; a collection
// with several modes needs the requested mode name, otherwise the import reports it.
const FIGMA_TYPES = Object.freeze({ COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" });
const segment = (name) => String(name).trim().replace(/\s*\/\s*/gu, ".").replace(/\s+/gu, " ");

export function flattenFigmaVariables(doc, { mode = null } = {}) {
  const problems = [];
  const notes = [];
  const meta = isObject(doc?.meta) ? doc.meta : doc;
  if (!isObject(meta) || !isObject(meta.variables) || !isObject(meta.variableCollections)) {
    return { tokens: new Map(), problems: ["figma-variables: expected `variables` and `variableCollections` objects (local variables export)"], notes };
  }
  const collections = meta.variableCollections;
  const chosenMode = {};
  for (const [id, collection] of Object.entries(collections)) {
    const modes = Array.isArray(collection.modes) ? collection.modes : [];
    if (modes.length === 0) { problems.push(`figma-variables: collection "${collection.name ?? id}" has no modes`); continue; }
    if (modes.length === 1) { chosenMode[id] = modes[0].modeId; continue; }
    const wanted = mode ? modes.find((entry) => String(entry.name).toLowerCase() === String(mode).toLowerCase()) : null;
    if (wanted) { chosenMode[id] = wanted.modeId; continue; }
    problems.push(`figma-variables: collection "${collection.name ?? id}" has modes ${modes.map((entry) => `"${entry.name}"`).join(", ")}; ${mode ? `none is named "${mode}"` : "set tokens.modes.<light|dark> to the mode name to read"}`);
  }
  const pathById = new Map();
  for (const [id, variable] of Object.entries(meta.variables)) {
    const collection = collections[variable.variableCollectionId];
    pathById.set(id, `${segment(collection?.name ?? "variables")}.${segment(variable.name ?? id)}`);
  }
  const tokens = new Map();
  for (const [id, variable] of Object.entries(meta.variables)) {
    const path = pathById.get(id);
    const type = FIGMA_TYPES[variable.resolvedType] ?? String(variable.resolvedType ?? "").toLowerCase() ?? null;
    const modeId = chosenMode[variable.variableCollectionId];
    if (!modeId) continue;
    const raw = isObject(variable.valuesByMode) ? variable.valuesByMode[modeId] : undefined;
    if (raw === undefined) { problems.push(`figma-variables: ${path} has no value in the selected mode`); continue; }
    let value = raw;
    if (isObject(raw) && raw.type === "VARIABLE_ALIAS") {
      const target = pathById.get(raw.id);
      value = target ? `{${target}}` : `{${raw.id}}`;
    } else if (type === "number") value = { value: raw, unit: "px" };
    if (tokens.has(path)) problems.push(`figma-variables: duplicate variable path ${path}`);
    tokens.set(path, token(path, type, value, { description: variable.description || undefined, figmaId: id }));
  }
  if (mode) notes.push(`mode "${mode}" read from ${Object.keys(chosenMode).length} collection(s)`);
  return { tokens, problems, notes };
}

export function parseTokenDocument(doc, format, { mode = null, theme = null } = {}) {
  if (!TOKEN_FORMATS.includes(format)) throw new Error(`Unknown token format "${format}" (expected ${TOKEN_FORMATS.join(", ")})`);
  if (format === "dtcg") {
    if (!isObject(doc)) return { tokens: new Map(), problems: ["dtcg: the document is not a JSON object"], notes: [] };
    return { tokens: flattenDtcg(doc), problems: [], notes: [] };
  }
  if (format === "tokens-studio") return flattenTokensStudio(doc, { theme });
  return flattenFigmaVariables(doc, { mode });
}

// --- alias resolution ---------------------------------------------------------------------------------

function findTarget(tokens, target, index) {
  if (tokens.has(target)) return tokens.get(target);
  const candidates = index.get(target.toLowerCase());
  return candidates && candidates.length === 1 ? tokens.get(candidates[0]) : null;
}

// Paths without their first segment, for aliases that omit the set/collection name.
function suffixIndex(tokens) {
  const index = new Map();
  for (const path of tokens.keys()) {
    const parts = path.split(".");
    for (let start = 0; start < parts.length - 1 && start < 2; start += 1) {
      const key = parts.slice(start).join(".").toLowerCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(path);
    }
  }
  return index;
}

export function resolveTokens(tokens) {
  const problems = [];
  const index = suffixIndex(tokens);
  const resolved = new Map();
  const resolveOne = (entry, seen) => {
    if (!isAlias(entry.value)) return entry;
    const target = aliasTarget(entry.value);
    if (seen.includes(entry.path)) { problems.push(`${seen[0]}: alias cycle ${[...seen, entry.path].join(" → ")}`); return null; }
    const next = findTarget(tokens, target, index);
    if (!next) { problems.push(`${entry.path}: alias {${target}} does not resolve to a token`); return null; }
    const literal = resolveOne(next, [...seen, entry.path]);
    if (literal && entry.type && literal.type && literal.type !== entry.type) problems.push(`${entry.path}: alias resolves to a ${literal.type} token but this token is ${entry.type}`);
    return literal;
  };
  for (const entry of tokens.values()) {
    const literal = resolveOne(entry, []);
    if (literal) resolved.set(entry.path, { ...entry, literal: literal.value, literalPath: literal.path, type: entry.type ?? literal.type ?? null });
  }
  // Exact path first, then a unique suffix (aliases that omit the set / collection name).
  const lookup = (path) => resolved.get(path) ?? (() => { const hits = (index.get(path.toLowerCase()) ?? []).filter((candidate) => resolved.has(candidate)); return hits.length === 1 ? resolved.get(hits[0]) : null; })();
  return { resolved, problems: [...new Set(problems)], index, lookup };
}

// --- layering ------------------------------------------------------------------------------------------

// A path's layer is its first segment, or its second when the first is a token set / collection name.
export function layerPath(path) {
  const parts = path.split(".");
  for (const start of [0, 1]) {
    if (parts.length > start + 1 && LAYERS.includes(parts[start].toLowerCase())) return [parts[start].toLowerCase(), ...parts.slice(start + 1)];
  }
  return null;
}
const layerOf = (path) => layerPath(path)?.[0] ?? null;

export function checkLayers(tokens, { format = "dtcg" } = {}) {
  const problems = [];
  const note = (path, message) => problems.push(`${path}: ${message}`);
  const index = suffixIndex(tokens);
  const resolveAlias = (entry, seen = []) => {
    if (!isAlias(entry.value)) return entry;
    const target = aliasTarget(entry.value);
    if (seen.includes(target)) { note(entry.path, `alias cycle ${[...seen, target].join(" → ")}`); return null; }
    const next = findTarget(tokens, target, index);
    if (!next) { note(entry.path, `alias {${target}} does not resolve to a token`); return null; }
    return resolveAlias(next, [...seen, entry.path]);
  };
  const counts = { primitive: 0, semantic: 0, type: 0, component: 0, outside: 0, total: tokens.size };
  for (const entry of tokens.values()) {
    const parts = layerPath(entry.path);
    if (!parts) { counts.outside += 1; continue; }
    const layer = parts[0];
    counts[layer] += 1;
    if (!entry.type) note(entry.path, "no $type on the token or any parent group");

    if (layer === "primitive") {
      if (isAlias(entry.value)) note(entry.path, "primitives hold literal values, not aliases");
      else if (entry.type === "color" && format === "dtcg") {
        const v = entry.value;
        if (!isObject(v) || typeof v.colorSpace !== "string" || !Array.isArray(v.components)) note(entry.path, "a DTCG 2025.10 color value is an object with colorSpace and components (hex optional)");
        else if (v.hex !== undefined && !/^#[0-9A-Fa-f]{6}$/u.test(v.hex)) note(entry.path, `hex "${v.hex}" is not a six-digit hex colour`);
      } else if (entry.type === "color" && !toColor(entry.value)) note(entry.path, "primitive colour is not a readable colour value");
    }

    if (layer === "semantic" || layer === "component") {
      if (!isAlias(entry.value)) { note(entry.path, `${layer} tokens must alias (got a literal); the designer changes values in one place`); continue; }
      const target = findTarget(tokens, aliasTarget(entry.value), index);
      const targetLayer = target ? layerOf(target.path) : layerOf(aliasTarget(entry.value));
      if (layer === "semantic" && targetLayer !== "primitive") note(entry.path, `semantic tokens alias primitives, not ${targetLayer ?? "tokens outside the layers"}`);
      if (layer === "component" && targetLayer !== "semantic") note(entry.path, `component tokens alias semantic tokens, not ${targetLayer ?? "tokens outside the layers"}`);
      const resolved = resolveAlias(entry);
      if (resolved && resolved.type && entry.type && resolved.type !== entry.type) note(entry.path, `alias resolves to a ${resolved.type} token but this token is ${entry.type}`);
    }

    if (layer === "semantic" && entry.type === "color") {
      if (!PROPERTIES.includes(parts[1])) note(entry.path, "semantic colour tokens are grouped by property: fg, bg, or bd");
      const emphasis = parts.at(-1);
      if (!EMPHASIS.includes(emphasis)) note(entry.path, `last segment names the emphasis (${EMPHASIS.join(", ")}), got "${emphasis}"`);
    }

    if (layer === "type") {
      if (entry.type !== "typography") note(entry.path, "type roles are typography composites");
      const v = isObject(entry.value) ? entry.value : {};
      if (format === "dtcg") {
        if (!v.fontFamily || !v.fontSize || typeof v.fontSize !== "object" || typeof v.fontSize.value !== "number" || !v.fontSize.unit) note(entry.path, "typography value needs fontFamily and a fontSize dimension { value, unit }");
        if (v.fontWeight === undefined || v.lineHeight === undefined) note(entry.path, "typography value needs fontWeight and lineHeight");
      } else if (!v.fontFamily || v.fontSize === undefined) note(entry.path, "typography value needs fontFamily and fontSize");
    }
  }
  const layered = counts.primitive + counts.semantic + counts.type + counts.component;
  const status = layered === 0 ? "not-applicable" : counts.outside === 0 ? "checked" : "partial";
  return { problems, counts, status };
}

// Backwards-compatible entry for the repository checker and its tests (DTCG document in).
export function checkTokenLayers(doc) {
  const { problems, counts } = checkLayers(flattenDtcg(doc), { format: "dtcg" });
  return { problems, counts: { primitive: counts.primitive, semantic: counts.semantic, type: counts.type, component: counts.component, total: counts.total } };
}

// --- role mapping, contrast, outputs ------------------------------------------------------------------

const kebab = (role) => role.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

function readDimension(value) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string") return value.trim();
  if (isObject(value) && typeof value.value === "number") return `${value.value}${value.unit ?? "px"}`;
  return null;
}

function typeRole(entry, lookup) {
  const value = isObject(entry.literal) ? entry.literal : {};
  const pick = (field) => {
    const raw = value[field];
    if (isAlias(raw)) {
      const hit = lookup(aliasTarget(raw));
      return hit ? hit.literal : raw;
    }
    return raw;
  };
  const family = pick("fontFamily");
  const lineHeight = pick("lineHeight");
  return {
    role: layerPath(entry.path)?.slice(1).join(".") ?? entry.path,
    token: entry.path,
    fontFamily: Array.isArray(family) ? family[0] : family ?? null,
    fontSize: readDimension(pick("fontSize")),
    fontWeight: pick("fontWeight") ?? null,
    // A bare number is a unitless multiplier; dimensions and percentages keep their unit.
    lineHeight: typeof lineHeight === "number" ? String(lineHeight) : readDimension(lineHeight) ?? null,
  };
}

/**
 * Import a token document as the project's canon.
 * @param {object} options
 * @param {object} options.document      parsed JSON of the token file
 * @param {string} options.format        dtcg | tokens-studio | figma-variables
 * @param {string} [options.mode]        light | dark — which `modes` entry applies
 * @param {{light?: string, dark?: string}} [options.modes]  mode (Figma) or theme (Tokens Studio) name per StyleSeed mode
 * @param {Record<string,string>} [options.roles]  explicit role → token path overrides
 * @param {string} [options.source]      project-relative path, for messages and the manifest
 * @param {string} [options.sha256]      digest of the file bytes
 * @param {string} [options.version]     engine version recorded in the output
 */
export function importTokenCanon({ document, format, mode = "light", modes = null, roles: roleOverrides = {}, source = "tokens.json", sha256 = null, version = "0" }) {
  const problems = [];
  const warnings = [];
  const notes = [];
  const modeName = modes?.[mode] ?? null;
  if (format === "dtcg" && modes) problems.push("dtcg: the format module has no modes; remove tokens.modes or split the file per mode");
  const parsed = parseTokenDocument(document, format, { mode: modeName, theme: modeName });
  problems.push(...parsed.problems);
  notes.push(...parsed.notes);
  const { tokens } = parsed;
  if (tokens.size === 0 && problems.length === 0) problems.push(`${source}: no tokens found`);

  const { resolved, problems: aliasProblems, index, lookup } = resolveTokens(tokens);
  problems.push(...aliasProblems);
  const layering = checkLayers(tokens, { format });
  problems.push(...layering.problems.filter((problem) => !aliasProblems.includes(problem)));
  if (layering.status === "not-applicable") warnings.push("layering not checked: no path uses the primitive / semantic / type / component layers");
  else if (layering.status === "partial") warnings.push(`${layering.counts.outside} token(s) sit outside the four layers and are imported as-is`);

  // Roles: project overrides first, then the canon default, matched by exact path or unique suffix.
  const mapping = {};
  const roles = {};
  for (const role of PALETTE_ROLES) {
    const override = roleOverrides[role];
    const wanted = override ?? CANON_ROLE_MAP[role] ?? null;
    if (!wanted) { problems.push(`role ${role}: no imported token. Add tokens.roles.${role} in .styleseed/project.json pointing at an imported colour token.`); continue; }
    const direct = resolved.get(wanted) ?? null;
    const candidates = direct ? [direct.path] : (index.get(wanted.toLowerCase()) ?? []).filter((path) => resolved.has(path));
    if (!direct && candidates.length > 1) { problems.push(`role ${role}: ${wanted} matches several tokens (${candidates.join(", ")}); map it to one full path`); continue; }
    const entry = direct ?? (candidates.length === 1 ? resolved.get(candidates[0]) : null);
    if (!entry) {
      problems.push(override
        ? `role ${role}: tokens.roles.${role} = ${wanted} is not an imported token`
        : `role ${role}: the canon token ${wanted} is not in the file. Add it, or map tokens.roles.${role} to an existing imported colour token.`);
      continue;
    }
    if (entry.type && entry.type !== "color") { problems.push(`role ${role}: ${entry.path} is a ${entry.type} token, not a colour`); continue; }
    const color = toColor(entry.literal);
    if (!color) { problems.push(`role ${role}: ${entry.path} does not resolve to a readable colour`); continue; }
    if (color.alpha < 1) { problems.push(`role ${role}: ${entry.path} is translucent (alpha ${color.alpha}); roles need opaque values so contrast can be measured`); continue; }
    mapping[role] = { token: entry.path, value: color.hex, via: override ? "project" : "canon" };
    roles[role] = color.hex;
  }

  const contrastChecks = Object.keys(roles).length === PALETTE_ROLES.length
    ? CONTRAST_GATES.map(([foreground, background, minimum]) => {
      const ratio = contrast(roles[foreground], roles[background]);
      return { foreground, background, ratio, minimum, pass: ratio >= minimum };
    })
    : [];
  for (const check of contrastChecks) {
    if (!check.pass) warnings.push(`contrast ${check.foreground}/${check.background} = ${check.ratio}:1 < ${check.minimum}:1 — the imported system owns this value; report it, do not recolour`);
  }

  const byType = {};
  for (const entry of resolved.values()) byType[entry.type ?? "untyped"] = (byType[entry.type ?? "untyped"] ?? 0) + 1;
  const typeRoles = [...resolved.values()].filter((entry) => layerOf(entry.path) === "type" && entry.type === "typography").map((entry) => typeRole(entry, lookup));

  const css = `:root {\n${Object.entries(roles).map(([role, hex]) => `  --ss-${kebab(role)}: ${hex}; /* ${mapping[role].token} */`).join("\n")}\n}`;
  const result = {
    schemaVersion: 1,
    generator: { name: "StyleSeed Token Import", version, format },
    input: { source, format, mode, modeName, sha256 },
    tokens: { total: tokens.size, byType, layering: { status: layering.status, counts: layering.counts } },
    mapping,
    roles,
    contrast: contrastChecks,
    valid: problems.length === 0 && contrastChecks.length > 0 && contrastChecks.every((check) => check.pass),
    typeRoles,
    problems,
    warnings,
    notes,
    reasoning: [
      "Values come from the project's token file; StyleSeed mapped its semantic roles onto them and measured contrast.",
      "Nothing was generated, adjusted, or substituted. A failing gate or an unmapped role is a decision for the design-system owner.",
    ],
    css,
  };
  return result;
}

export class TokenCanonError extends Error {
  constructor(result) {
    super(`Token import failed for ${result.input.source}:\n${result.problems.slice(0, 20).map((problem) => `  - ${problem}`).join("\n")}${result.problems.length > 20 ? `\n  … ${result.problems.length - 20} more` : ""}`);
    this.name = "TokenCanonError";
    this.result = result;
  }
}

export function importTokenCanonOrThrow(options) {
  const result = importTokenCanon(options);
  if (result.problems.length) throw new TokenCanonError(result);
  return result;
}

// Bundle section: what the agent reads before implementation.
export function tokenCanonSection(result) {
  const layering = result.tokens.layering;
  const layerLine = layering.status === "not-applicable"
    ? "Layering: not checked — the file does not use the primitive / semantic / type / component layers"
    : `Layering: ${layering.status} — ${layering.counts.primitive} primitive · ${layering.counts.semantic} semantic · ${layering.counts.type} type · ${layering.counts.component} component${layering.counts.outside ? ` · ${layering.counts.outside} outside the layers` : ""}`;
  const failing = result.contrast.filter((check) => !check.pass);
  const mapped = PALETTE_ROLES.filter((role) => result.mapping[role]).map((role) => `${role}=${result.mapping[role].token} (${result.roles[role]})`);
  const unmapped = Object.entries(result.tokens.byType).filter(([type]) => type !== "color" && type !== "typography").map(([type, count]) => `${count} ${type}`);
  return [
    "## Imported token canon",
    "",
    `- Source: \`${result.input.source}\` · ${result.input.format}${result.input.sha256 ? ` · ${result.input.sha256}` : ""}${result.input.modeName ? ` · ${result.input.mode} mode reads "${result.input.modeName}"` : ""}`,
    `- ${layerLine}`,
    `- Roles → tokens: ${mapped.join(" · ")}`,
    `- Contrast gates: ${result.contrast.map((check) => `${check.foreground}/${check.background}=${check.ratio}:1${check.pass ? "" : " (fails)"}`).join(" · ")}`,
    ...(failing.length ? [`- Failing gates: ${failing.map((check) => `${check.foreground}/${check.background} ${check.ratio}:1 < ${check.minimum}:1`).join("; ")}. The imported system owns these values. Report them to its owner as a blocking accessibility finding; do not recolour or substitute.`] : []),
    ...(result.typeRoles.length ? [`- Type roles: ${result.typeRoles.map((role) => `${role.role} ${[role.fontFamily, role.fontSize, role.fontWeight, role.lineHeight].filter((part) => part !== null && part !== undefined).join("/")}`).join(" · ")}`] : []),
    ...(unmapped.length ? [`- Also imported, not mapped by StyleSeed: ${unmapped.join(" · ")}. Use them by their own names; \`brand.radius\` and \`brand.elevation\` presets do not override imported tokens.`] : []),
    "- Palette generation did not run and the recipe's hex values are not in effect. Components consume the imported tokens by their own names; `--ss-*` variables in the palette CSS alias the mapped roles for StyleSeed checks only.",
    "- Do not add a colour that is not in the file. A missing role or shade is a request to the design-system owner, not a value to invent.",
  ].join("\n");
}
