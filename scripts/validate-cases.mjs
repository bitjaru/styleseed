#!/usr/bin/env node
// Validate research/cases/**/case.json without external dependencies.
// Checks the schema's required fields, enums, id/folder match, source references,
// measurement files on disk, and the review, promotion and approval rules the README states.
// No image, font, or page-source file may sit anywhere in a case folder. A case.draft.json (what
// measure-reference.mjs writes) is skipped and counted: fill it in and rename it to case.json.
//
//   node scripts/validate-cases.mjs [cases-dir]   (defaults to research/cases; the schema always
//                                                  comes from research/cases/schema)
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const casesDir = process.argv[2] ? resolve(process.argv[2]) : join(root, "research", "cases");
const schema = JSON.parse(readFileSync(join(root, "research", "cases", "schema", "case.schema.json"), "utf8"));

const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);
const drafts = [];
const ASSET = /\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|html)$/i;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_") || name === "schema") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === "case.json") yield p;
    else if (name === "case.draft.json") drafts.push(p);
  }
}

// Every file under a case folder, as paths relative to it.
function filesIn(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(join(dir, e.name), `${prefix}${e.name}/`) : e.isFile() ? [`${prefix}${e.name}`] : []));
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
    if (def.maxLength && value.length > def.maxLength) note(file, `${path} is too long (max ${def.maxLength})`);
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
    const reviews = Array.isArray(r.reviews) ? r.reviews : [];
    const agrees = reviews.some((review) => review?.verdict === "agree");
    if (r.status === "reviewed" && !reviews.length) note(rel, `${r.id} is reviewed without a review record in reviews[]`);
    if (r.evidence === "approved" && !agrees) note(rel, `${r.id} is approved without an agreeing review in reviews[]`);
    if (r.status === "promoted") {
      if (!r.promotedTo) note(rel, `${r.id} is promoted without promotedTo`);
      else if (!existsSync(join(root, r.promotedTo.split("#")[0]))) note(rel, `${r.id} promotedTo path does not exist: ${r.promotedTo}`);
      if (!data.validation) note(rel, `${r.id} is promoted but the case has no validation screen`);
      if (!agrees) note(rel, `${r.id} is promoted without an agreeing review`);
      // A disagree stands until the same reviewer records a later-dated review.
      for (const review of reviews.filter((entry) => entry?.verdict === "disagree")) {
        if (!reviews.some((later) => later?.reviewer === review.reviewer && String(later?.date) > String(review.date))) note(rel, `${r.id} is promoted over an unresolved disagree by ${review.reviewer} (${review.date})`);
      }
    }
  }
  for (const m of data.measurements?.files ?? []) if (!existsSync(join(dirname(file), m))) note(rel, `measurement file missing: ${m}`);
  for (const f of filesIn(dirname(file))) {
    if (ASSET.test(f)) note(rel, `${f}: images, fonts and page source are not stored; link them in sources`);
  }
  const measurementsDir = join(dirname(file), "measurements");
  if (!existsSync(measurementsDir) || !statSync(measurementsDir).isDirectory()) note(rel, "measurements/ folder is missing; keep the measurement tool output there");
}

// A draft is not validated as a case, but its folder is still a case folder: no assets in it either.
for (const draft of drafts) {
  if (existsSync(join(dirname(draft), "case.json"))) continue;
  const rel = draft.slice(root.length + 1);
  for (const f of filesIn(dirname(draft))) {
    if (ASSET.test(f)) note(rel, `${f}: images, fonts and page source are not stored; link them in sources`);
  }
}

const skipped = drafts.length ? `; ${drafts.length} draft(s) skipped (${drafts.map((d) => relative(casesDir, d).split(sep).join("/")).join(", ")}): fill in a case.draft.json and rename it to case.json to validate it` : "";
if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) in ${count} case(s)${skipped}`);
  process.exit(1);
}
console.log(`${count} case(s) valid${skipped}`);
