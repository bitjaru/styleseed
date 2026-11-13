#!/usr/bin/env node
// Fault pairs for the gallery (WO-07 Part C): the good and bad page of every render-fault class and of
// the transition frame jump, copied from the fixture module to demo-pricing/content/fault-pairs.json,
// which /gallery/faults renders.
//
// scripts/lib/fault-pairs.mjs stays the single source: the browser tests measure the same documents.
// The summary and rule of each class come from FAULT_CLASSES (ss-verify/scripts/analyze-faults.mjs);
// `gates` is true when that rule's priority in engine/rules/catalog.json is `blocks`, the same reading
// drift-report.mjs --faults --gate makes. frame-jump maps to CRAFT-motion-family and never gates:
// transition-jumps.mjs has no --gate.
//
//   node scripts/build-fault-pairs.mjs            write the JSON
//   node scripts/build-fault-pairs.mjs --check    exit 1 if the JSON would change
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FAULT_PAIRS, TRANSITION_PAIRS } from "./lib/fault-pairs.mjs";
import { FAULT_CLASSES, classRules } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, "engine/rules/catalog.json");
const outJson = resolve(root, "demo-pricing/content/fault-pairs.json");
const OUT_REL = "demo-pricing/content/fault-pairs.json";
const PAIRS_REL = "scripts/lib/fault-pairs.mjs";

export const FRAME_JUMP = Object.freeze({
  id: "frame-jump",
  rule: "CRAFT-motion-family",
  summary: "A box moves in one frame while the rest of the state change is animated.",
});

// Returns { problems, json }. A problem names the file, the field, and what to do next.
export function buildFaultPairs({ faultPairs = FAULT_PAIRS, transitionPairs = TRANSITION_PAIRS, rules = JSON.parse(readFileSync(catalogPath, "utf8")).rules } = {}) {
  const problems = [];
  const classes = classRules(rules);
  const ids = faultPairs.map((p) => p.id);
  const expected = FAULT_CLASSES.map((c) => c.id);
  if (ids.join(",") !== expected.join(",")) problems.push(`${PAIRS_REL}: FAULT_PAIRS ids are [${ids.join(", ")}]; FAULT_CLASSES needs one pair per class in this order: [${expected.join(", ")}]. Add or reorder the { id, good, bad } entries.`);
  for (const c of FAULT_CLASSES) if (c.rule && !classes.find((k) => k.id === c.id).rule) problems.push(`engine/rules/catalog.json: FAULT_CLASSES maps ${c.id} to ${c.rule}, which is not in the catalog. Add the rule or set the class's rule to null in analyze-faults.mjs.`);
  const jump = transitionPairs.find((p) => p.id === FRAME_JUMP.id);
  if (!jump) problems.push(`${PAIRS_REL}: TRANSITION_PAIRS has no "${FRAME_JUMP.id}" entry. Add { id: "${FRAME_JUMP.id}", interactive: true, good, bad }.`);
  if (!rules.some((r) => r.id === FRAME_JUMP.rule)) problems.push(`engine/rules/catalog.json: ${FRAME_JUMP.rule} is missing; frame-jump maps to it. Restore the rule or change FRAME_JUMP in scripts/build-fault-pairs.mjs.`);
  const entry = (pair, meta) => {
    for (const side of ["good", "bad"]) if (typeof pair[side] !== "string" || !pair[side]) problems.push(`${PAIRS_REL}: pair "${pair.id}" has no "${side}" document. Add a complete HTML document.`);
    return { id: pair.id, summary: meta.summary, rule: meta.rule, gates: meta.gates, interactive: Boolean(pair.interactive), good: pair.good, bad: pair.bad };
  };
  const pairs = faultPairs.filter((p) => expected.includes(p.id)).map((p) => entry(p, classes.find((c) => c.id === p.id)));
  if (jump) pairs.push(entry(jump, { summary: FRAME_JUMP.summary, rule: FRAME_JUMP.rule, gates: false }));
  return { problems, json: { schemaVersion: 1, generatedBy: "scripts/build-fault-pairs.mjs", pairs } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { problems, json } = buildFaultPairs();
  if (problems.length) {
    console.error(`fault pairs: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  const next = `${JSON.stringify(json, null, 2)}\n`;
  const stale = !existsSync(outJson) || readFileSync(outJson, "utf8") !== next;
  if (check && stale) {
    console.error(`fault pairs: ${OUT_REL} is out of date — run node scripts/build-fault-pairs.mjs`);
    process.exit(1);
  }
  if (stale) writeFileSync(outJson, next);
  const gating = json.pairs.filter((p) => p.gates).map((p) => p.id);
  console.log(`fault pairs: ${json.pairs.length} pairs (${gating.length ? `${gating.join(", ")} fail the gate` : "none fails the gate"})${stale ? `; wrote ${OUT_REL}` : ""}`);
}
