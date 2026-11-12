import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FAULT_PAIRS, TRANSITION_PAIRS } from "../lib/fault-pairs.mjs";
import { FAULT_CLASSES } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";
import { FRAME_JUMP, buildFaultPairs } from "../build-fault-pairs.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const catalog = JSON.parse(readFileSync(join(repoRoot, "engine/rules/catalog.json"), "utf8"));
const allPairs = [...FAULT_PAIRS, ...TRANSITION_PAIRS];

test("one pair per class in FAULT_CLASSES order, plus frame-jump", () => {
  assert.deepEqual(FAULT_PAIRS.map((p) => p.id), FAULT_CLASSES.map((c) => c.id));
  assert.deepEqual(TRANSITION_PAIRS.map((p) => p.id), ["frame-jump"]);
});

test("good and bad are complete documents under 4KB with no remote resource, no image, and script only when interactive", () => {
  for (const pair of allPairs) {
    for (const side of ["good", "bad"]) {
      const html = pair[side];
      const where = `${pair.id} ${side}`;
      assert.equal(typeof html, "string", where);
      assert.match(html, /^<!doctype html>/iu, `${where}: starts with <!doctype html>`);
      assert.match(html, /<\/html>\s*$/u, `${where}: ends with </html>`);
      assert.ok(Buffer.byteLength(html, "utf8") < 4096, `${where}: ${Buffer.byteLength(html, "utf8")} bytes, must be under 4KB`);
      assert.doesNotMatch(html, /http/iu, `${where}: no http`);
      assert.doesNotMatch(html, /<img\b/iu, `${where}: no <img>`);
      if (!pair.interactive) assert.doesNotMatch(html, /<script\b/iu, `${where}: no <script> in a pair that is not interactive`);
    }
  }
});

test("the JSON carries summary, rule, and gates from FAULT_CLASSES and the catalog", () => {
  const { problems, json } = buildFaultPairs();
  assert.deepEqual(problems, []);
  assert.equal(json.schemaVersion, 1);
  assert.equal(json.generatedBy, "scripts/build-fault-pairs.mjs");
  assert.deepEqual(json.pairs.map((p) => p.id), [...FAULT_CLASSES.map((c) => c.id), "frame-jump"]);
  const byId = new Map(catalog.rules.map((r) => [r.id, r]));
  for (const c of FAULT_CLASSES) {
    const pair = json.pairs.find((p) => p.id === c.id);
    assert.equal(pair.summary, c.summary, c.id);
    assert.equal(pair.rule, c.rule && byId.has(c.rule) ? c.rule : null, c.id);
    assert.equal(pair.gates, Boolean(pair.rule) && byId.get(pair.rule).priority === "blocks", c.id);
    assert.equal(pair.interactive, false, c.id);
  }
  const jump = json.pairs.at(-1);
  assert.deepEqual({ rule: jump.rule, gates: jump.gates, interactive: jump.interactive, summary: jump.summary }, { rule: "CRAFT-motion-family", gates: false, interactive: true, summary: FRAME_JUMP.summary });
});

test("gates follows the rule's priority in the catalog given", () => {
  const blocking = catalog.rules.map((r) => (r.id === "DL-23-amounts-never-wrap" ? { ...r, priority: "blocks" } : r));
  const { json } = buildFaultPairs({ rules: blocking });
  assert.deepEqual(json.pairs.filter((p) => p.gates).map((p) => p.id), ["amount-wrap"]);
  const withoutIcons = catalog.rules.filter((r) => r.id !== "CRAFT-icon-family");
  const missing = buildFaultPairs({ rules: withoutIcons });
  assert.equal(missing.json.pairs.find((p) => p.id === "icon-mix").rule, null);
  assert.match(missing.problems.join("\n"), /icon-mix to CRAFT-icon-family, which is not in the catalog/u);
});

test("a missing or misordered pair is a problem that names the file and what to do", () => {
  const { problems } = buildFaultPairs({ faultPairs: FAULT_PAIRS.slice(1), transitionPairs: [] });
  assert.match(problems.join("\n"), /scripts\/lib\/fault-pairs\.mjs: FAULT_PAIRS ids are .*Add or reorder/u);
  assert.match(problems.join("\n"), /TRANSITION_PAIRS has no "frame-jump" entry/u);
});

test("build-fault-pairs.mjs --check exits 0 on the committed JSON", () => {
  const result = spawnSync(process.execPath, [join(repoRoot, "scripts/build-fault-pairs.mjs"), "--check"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stderr}${result.stdout}`);
});
