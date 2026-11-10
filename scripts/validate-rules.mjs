#!/usr/bin/env node
// Validate engine/rules/catalog.json without external dependencies: the schema's required
// fields and enums, unique ids, scope values that exist in the compiled context catalog,
// sources that exist with their anchors present, detector ids the checker knows, the rule that
// invariants carry no scope, and the review rules (approved needs an agreeing review; one review
// per reviewer and date).
//
//   node scripts/validate-rules.mjs [catalog.json]   (defaults to engine/rules/catalog.json)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = process.argv[2] ? resolve(process.argv[2]) : join(root, "engine", "rules", "catalog.json");
const schema = JSON.parse(readFileSync(join(root, "engine", "rules", "catalog.schema.json"), "utf8"));
const contextCatalogPath = join(root, "engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json");
const checker = readFileSync(join(root, "engine/.claude/skills/styleseed/workflows/ss-score/scripts/styleseed-check.mjs"), "utf8");
const knownDetectors = new Set([...checker.matchAll(/\b(SS\d{3}): \{ name:/gu)].map((match) => match[1]));

const problems = [];
const note = (msg) => problems.push(msg);

function check(value, def, path) {
  if (def.$ref) def = schema.$defs[def.$ref.split("/").pop()];
  if ("const" in def && value !== def.const) return note(`${path} must equal ${JSON.stringify(def.const)}`);
  if (def.enum && !def.enum.includes(value)) return note(`${path} must be one of ${def.enum.join(", ")}`);
  if (def.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return note(`${path} must be an object`);
    for (const key of def.required ?? []) if (!(key in value)) note(`${path}.${key} is required`);
    for (const [key, v] of Object.entries(value)) {
      const sub = def.properties?.[key];
      if (!sub) { if (def.additionalProperties === false) note(`${path}.${key} is not a known field`); continue; }
      check(v, sub, `${path}.${key}`);
    }
  } else if (def.type === "array") {
    if (!Array.isArray(value)) return note(`${path} must be an array`);
    if (def.minItems && value.length < def.minItems) note(`${path} needs at least ${def.minItems} item(s)`);
    value.forEach((v, i) => check(v, def.items, `${path}[${i}]`));
  } else if (def.type === "string") {
    if (typeof value !== "string") return note(`${path} must be a string`);
    if (def.minLength && value.length < def.minLength) note(`${path} is too short (min ${def.minLength})`);
    if (def.maxLength && value.length > def.maxLength) note(`${path} is too long (max ${def.maxLength})`);
    if (def.pattern && !new RegExp(def.pattern, "u").test(value)) note(`${path} does not match ${def.pattern}`);
    if (def.format === "date" && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) note(`${path} must be YYYY-MM-DD`);
  }
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
check(catalog, schema, "catalog");

const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
const ids = new Set();
for (const rule of rules) {
  if (ids.has(rule.id)) note(`${rule.id}: duplicate id`);
  ids.add(rule.id);
}

const context = existsSync(contextCatalogPath) ? JSON.parse(readFileSync(contextCatalogPath, "utf8")) : null;
const known = context
  ? { grammars: Object.keys(context.grammars ?? {}), adapters: Object.keys(context.adapters ?? {}), domains: Object.keys(context.domains ?? {}), pageTypes: Object.keys(context.pages ?? {}) }
  : null;
if (!known) note(`compiled context catalog missing at ${contextCatalogPath}; run scripts/build-context-catalog.mjs first`);

const sourceCache = new Map();
function sourceText(path) {
  if (!sourceCache.has(path)) sourceCache.set(path, existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : null);
  return sourceCache.get(path);
}

for (const rule of rules) {
  const label = rule.id ?? "(no id)";
  const scope = rule.scope ?? {};
  if (known) {
    for (const [field, values] of Object.entries(scope)) {
      if (!known[field]) continue; // components and states are free text in this phase
      for (const value of values ?? []) if (!known[field].includes(value)) note(`${label}: scope.${field} "${value}" is not a known ${field.replace(/s$/u, "")} (${known[field].join(", ")})`);
    }
  }
  if (rule.kind === "invariant") {
    if (Object.values(scope).some((list) => Array.isArray(list) && list.length)) note(`${label}: invariants bind everywhere and must not carry a scope`);
    if (rule.priority === "advisory") note(`${label}: an invariant cannot be advisory`);
  }
  if (rule.check?.mode === "machine") {
    if (!rule.check.detectors?.length) note(`${label}: check.mode "machine" needs at least one detector id`);
    for (const detector of rule.check.detectors ?? []) if (!knownDetectors.has(detector)) note(`${label}: detector ${detector} is not defined in styleseed-check.mjs (${[...knownDetectors].join(", ")})`);
  } else if (rule.check?.detectors?.length) {
    note(`${label}: detectors are only meaningful with check.mode "machine"`);
  }
  if (typeof rule.source === "string") {
    const path = rule.source.split("#")[0];
    const text = sourceText(path);
    if (text === null) note(`${label}: source ${path} does not exist`);
    else if (typeof rule.anchor === "string" && !text.includes(rule.anchor)) note(`${label}: anchor "${rule.anchor}" not found in ${path}`);
  }
  const reviews = Array.isArray(rule.reviews) ? rule.reviews : [];
  if (rule.evidence?.level === "approved" && !reviews.some((review) => review?.verdict === "agree")) note(`${label}: evidence.level "approved" needs at least one review with verdict "agree" in reviews[]`);
  const pairs = new Set();
  for (const review of reviews) {
    const pair = `${review?.reviewer}|${review?.date}`;
    if (pairs.has(pair)) note(`${label}: reviews[] has two entries by ${review?.reviewer} on ${review?.date}; merge them or date the later one`);
    pairs.add(pair);
  }
  for (const source of rule.evidence?.sources ?? []) {
    if (/^engine\//u.test(source) || /^research\//u.test(source)) {
      const path = source.split("#")[0];
      if (!existsSync(join(root, path))) note(`${label}: evidence source ${path} does not exist`);
    }
  }
}

if (problems.length) {
  console.error(`rule catalog: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`rule catalog: ${rules.length} rule(s) valid (${rules.filter((r) => r.kind === "invariant").length} invariants, ${rules.filter((r) => r.check?.mode === "machine").length} with detectors)`);
