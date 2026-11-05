#!/usr/bin/env node
// Check a DTCG (2025.10) token file for the layering a working designer builds:
//   primitive → semantic (fg / bg / bd × emphasis) → type roles → components
// Only primitives hold literal values. Semantic tokens alias primitives; component tokens alias
// semantic tokens. Every alias must resolve, without cycles, to a token of the same type.
//
//   node scripts/check-token-layers.mjs [path/to/tokens.json]   (default: research/tokens/naming-sample.tokens.json)
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(root, "research/tokens/naming-sample.tokens.json");

export function flatten(doc) {
  const tokens = new Map();
  const walk = (node, path, inheritedType) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const type = node.$type ?? inheritedType;
    if ("$value" in node) { tokens.set(path.join("."), { path: path.join("."), type, value: node.$value }); return; }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...path, key], type);
  };
  walk(doc, [], undefined);
  return tokens;
}

const isAlias = (value) => typeof value === "string" && /^\{[^{}]+\}$/u.test(value);
const aliasTarget = (value) => value.slice(1, -1);

export function checkTokenLayers(doc) {
  const tokens = flatten(doc);
  const problems = [];
  const note = (path, message) => problems.push(`${path}: ${message}`);
  const layerOf = (path) => path.split(".")[0];

  const resolveAlias = (token, seen = []) => {
    if (!isAlias(token.value)) return token;
    const target = aliasTarget(token.value);
    if (seen.includes(target)) { note(token.path, `alias cycle ${[...seen, target].join(" → ")}`); return null; }
    const next = tokens.get(target);
    if (!next) { note(token.path, `alias {${target}} does not resolve to a token`); return null; }
    return resolveAlias(next, [...seen, token.path]);
  };

  for (const token of tokens.values()) {
    const layer = layerOf(token.path);
    if (!["primitive", "semantic", "type", "component"].includes(layer)) note(token.path, `unknown layer "${layer}" (expected primitive, semantic, type, or component)`);
    if (!token.type) note(token.path, "no $type on the token or any parent group");

    if (layer === "primitive") {
      if (isAlias(token.value)) note(token.path, "primitives hold literal values, not aliases");
      else if (token.type === "color") {
        const v = token.value;
        if (!v || typeof v !== "object" || typeof v.colorSpace !== "string" || !Array.isArray(v.components)) note(token.path, "a DTCG 2025.10 color value is an object with colorSpace and components (hex optional)");
        else if (v.hex !== undefined && !/^#[0-9A-Fa-f]{6}$/u.test(v.hex)) note(token.path, `hex "${v.hex}" is not a six-digit hex colour`);
      }
    }

    if (layer === "semantic" || layer === "component") {
      if (!isAlias(token.value)) { note(token.path, `${layer} tokens must alias (got a literal); the designer changes values in one place`); continue; }
      const targetLayer = layerOf(aliasTarget(token.value));
      if (layer === "semantic" && targetLayer !== "primitive") note(token.path, `semantic tokens alias primitives, not ${targetLayer}`);
      if (layer === "component" && targetLayer !== "semantic") note(token.path, `component tokens alias semantic tokens, not ${targetLayer}`);
      const resolved = resolveAlias(token);
      if (resolved && resolved.type !== token.type) note(token.path, `alias resolves to a ${resolved.type} token but this token is ${token.type}`);
    }

    if (layer === "semantic" && token.type === "color") {
      const parts = token.path.split(".");
      if (!["fg", "bg", "bd"].includes(parts[1])) note(token.path, "semantic colour tokens are grouped by property: fg, bg, or bd");
      const emphasis = parts.at(-1);
      if (!["base", "subtle", "muted", "emphasis", "inverse"].includes(emphasis)) note(token.path, `last segment names the emphasis (base, subtle, muted, emphasis, inverse), got "${emphasis}"`);
    }

    if (layer === "type") {
      if (token.type !== "typography") note(token.path, "type roles are typography composites");
      const v = token.value || {};
      if (!v.fontFamily || !v.fontSize || typeof v.fontSize !== "object" || typeof v.fontSize.value !== "number" || !v.fontSize.unit) note(token.path, "typography value needs fontFamily and a fontSize dimension { value, unit }");
      if (v.fontWeight === undefined || v.lineHeight === undefined) note(token.path, "typography value needs fontWeight and lineHeight");
    }
  }

  const count = (layer) => [...tokens.values()].filter((t) => layerOf(t.path) === layer).length;
  return { problems, counts: { primitive: count("primitive"), semantic: count("semantic"), type: count("type"), component: count("component"), total: tokens.size } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  const { problems, counts } = checkTokenLayers(doc);
  if (problems.length) {
    console.error(`token layers: ${problems.length} problem(s) in ${file}`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`token layers: ${counts.total} tokens valid (${counts.primitive} primitive · ${counts.semantic} semantic · ${counts.type} type · ${counts.component} component)`);
}
