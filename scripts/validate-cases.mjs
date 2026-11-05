#!/usr/bin/env node
// Validate research/cases/**/case.json without external dependencies.
// Checks the schema's required fields, enums, id/folder match, source references,
// measurement files on disk, and the promotion and approval rules the README states.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const casesDir = join(root, "research", "cases");
const schema = JSON.parse(readFileSync(join(casesDir, "schema", "case.schema.json"), "utf8"));

const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_") || name === "schema") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === "case.json") yield p;
  }
}

function check(value, def, path, file, rootObj) {
  if (def.$ref) def = schema.$defs[def.$ref.split("/").pop()];
  if (def.enum && !def.enum.includes(value)) return note(file, `${path} must be one of ${def.enum.join(", ")}`);
  if (def.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return note(file, `${path} must be an object`);
    for (const key of def.required ?? []) if (!(key in value)) note(file, `${path}.${key} is required`);
    for (const [key, v] of Object.entries(value)) {
      const sub = def.properties?.[key];
      if (!sub) { if (def.additionalProperties === false) note(file, `${path}.${key} is not a known field`); continue; }
      check(v, sub, `${path}.${key}`, file, rootObj);
    }
  } else if (def.type === "array") {
    if (!Array.isArray(value)) return note(file, `${path} must be an array`);
    if (def.minItems && value.length < def.minItems) note(file, `${path} needs at least ${def.minItems} item(s)`);
    value.forEach((v, i) => check(v, def.items, `${path}[${i}]`, file, rootObj));
  } else if (def.type === "string") {
    if (typeof value !== "string") return note(file, `${path} must be a string`);
    if (def.minLength && value.length < def.minLength) note(file, `${path} is too short`);
    if (def.pattern && !new RegExp(def.pattern).test(value)) note(file, `${path} does not match ${def.pattern}`);
    if (def.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) note(file, `${path} must be YYYY-MM-DD`);
    if (def.format === "uri" && !/^https?:\/\//.test(value)) note(file, `${path} must be an http(s) URL`);
  } else if (def.type === "integer") {
    if (!Number.isInteger(value)) return note(file, `${path} must be an integer`);
    if (def.minimum !== undefined && value < def.minimum) note(file, `${path} below ${def.minimum}`);
    if (def.maximum !== undefined && value > def.maximum) note(file, `${path} above ${def.maximum}`);
  } else if (def.type === "number" && typeof value !== "number") note(file, `${path} must be a number`);
}

let count = 0;
for (const file of walk(casesDir)) {
  count++;
  const rel = file.slice(root.length + 1);
  let data;
  try { data = JSON.parse(readFileSync(file, "utf8")); } catch (e) { note(rel, `invalid JSON: ${e.message}`); continue; }
  check(data, schema, "case", rel, data);
  if (data.id && data.id !== basename(dirname(file))) note(rel, `id "${data.id}" must equal the folder name`);
  const sourceIds = new Set((data.sources ?? []).map((s) => s.id));
  const decisionIds = new Set((data.decisions ?? []).map((d) => d.id));
  for (const d of data.decisions ?? []) for (const s of d.sources ?? []) if (!sourceIds.has(s)) note(rel, `${d.id} cites unknown source ${s}`);
  for (const r of data.ruleCandidates ?? []) {
    for (const d of r.decisions ?? []) if (!decisionIds.has(d)) note(rel, `${r.id} cites unknown decision ${d}`);
    if (r.evidence === "approved" && !r.review) note(rel, `${r.id} is approved without a review record`);
    if (r.status === "promoted") {
      if (!r.promotedTo) note(rel, `${r.id} is promoted without promotedTo`);
      else if (!existsSync(join(root, r.promotedTo.split("#")[0]))) note(rel, `${r.id} promotedTo path does not exist: ${r.promotedTo}`);
      if (!data.validation) note(rel, `${r.id} is promoted but the case has no validation screen`);
      if (!r.review || r.review.verdict === "disagree") note(rel, `${r.id} is promoted without an agreeing review`);
    }
  }
  for (const m of data.measurements?.files ?? []) if (!existsSync(join(dirname(file), m))) note(rel, `measurement file missing: ${m}`);
  for (const m of readdirSync(join(dirname(file), "measurements"), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)) {
    if (/\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|html)$/i.test(m)) note(rel, `measurements/${m}: images, fonts and page source are not stored; link them in sources`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) in ${count} case(s)`);
  process.exit(1);
}
console.log(`${count} case(s) valid`);
