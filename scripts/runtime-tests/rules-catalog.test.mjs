import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ruleApplies, selectRules, renderRulesSection } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/rules-in-scope.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const rule = (over = {}) => ({
  id: "X-1", axis: "color", statement: "A statement long enough to pass.", kind: "default", scope: {}, priority: "advisory",
  rationale: "a reason", evidence: { level: "inferred", sources: ["engine/CRAFT-BASELINE.md"] }, check: { mode: "model" },
  source: "engine/CRAFT-BASELINE.md", anchor: "Coherence", ...over,
});

test("invariants apply everywhere; defaults apply when every non-empty scope list matches", () => {
  const invariant = rule({ id: "INV-1", kind: "invariant", priority: "blocks", scope: {} });
  const consumerDashboard = rule({ id: "DL-1", scope: { grammars: ["consumer-service"], pageTypes: ["dashboard"] } });
  const productUi = rule({ id: "DL-2", scope: { adapters: ["product-ui"] } });
  const any = rule({ id: "DL-3" });
  const ops = { grammar: "operations-console", adapter: "product-ui", domain: "fintech", page: "settings" };
  const consumer = { grammar: "consumer-service", adapter: "product-ui", domain: "fintech", page: "dashboard" };
  assert.equal(ruleApplies(invariant, ops), true);
  assert.equal(ruleApplies(consumerDashboard, ops), false, "grammar does not match");
  assert.equal(ruleApplies(consumerDashboard, { ...consumer, page: "list" }), false, "page does not match");
  assert.equal(ruleApplies(consumerDashboard, consumer), true);
  assert.equal(ruleApplies(productUi, ops), true);
  assert.equal(ruleApplies(productUi, { ...ops, adapter: "slide-deck" }), false);
  assert.equal(ruleApplies(any, { grammar: "editorial-reading" }), true, "empty scope matches any selection");
  const selected = selectRules([any, consumerDashboard, invariant, productUi], consumer);
  assert.deepEqual(selected.invariants.map((r) => r.id), ["INV-1"]);
  assert.deepEqual(selected.defaults.map((r) => r.id), ["DL-1", "DL-2", "DL-3"]);
});

test("selection orders by priority then id and the section carries ids, scope, exceptions and detectors", () => {
  const rules = [
    rule({ id: "B-advisory", priority: "advisory" }),
    rule({ id: "A-strong", priority: "strong", exceptions: ["documented optical corrections"], check: { mode: "machine", detectors: ["SS002"] }, scope: { grammars: ["operations-console"] } }),
    rule({ id: "C-blocks", priority: "blocks" }),
    rule({ id: "INV-9", kind: "invariant", priority: "blocks" }),
  ];
  const selection = { grammar: "operations-console", adapter: "product-ui", domain: "saas", page: "dashboard" };
  assert.deepEqual(selectRules(rules, selection).defaults.map((r) => r.id), ["C-blocks", "A-strong", "B-advisory"]);
  const section = renderRulesSection(rules, selection);
  assert.ok(section.startsWith("# Rules in scope\n"));
  assert.ok(section.includes("grammar operations-console · adapter product-ui · domain saas · page dashboard"));
  assert.ok(section.includes("## Invariants\n\n- **INV-9** (blocks · inferred): "));
  assert.ok(section.includes("- **A-strong** (strong · inferred · grammars: operations-console): A statement long enough to pass. Exceptions: documented optical corrections. Checks: SS002. Source: engine/CRAFT-BASELINE.md"));
  assert.equal(renderRulesSection([], selection), "", "no rules, no section");
  assert.equal(renderRulesSection(rules, selection), section, "rendering is deterministic");
});

test("the repository catalog validates and is embedded in the compiled context catalog", () => {
  const validate = spawnSync(process.execPath, [resolve(repoRoot, "scripts/validate-rules.mjs")], { encoding: "utf8" });
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const canon = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8")).rules;
  const compiled = JSON.parse(readFileSync(resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/references/catalog.json"), "utf8"));
  assert.ok(Array.isArray(compiled.rules), "compiled catalog carries the rules array");
  assert.deepEqual(compiled.rules.map((r) => r.id), canon.map((r) => r.id));
  assert.ok(canon.length >= 20, `expected at least 20 entries, found ${canon.length}`);
  assert.ok(canon.filter((r) => r.kind === "invariant").length >= 5);
  const detectors = new Set(canon.flatMap((r) => r.check.detectors ?? []));
  for (const id of ["SS001", "SS002", "SS003", "SS004", "SS005", "SS006"]) assert.ok(detectors.has(id), `${id} should map to a catalog rule`);
});

test("catalog reviews are plural: approved needs an agreeing review, one review per reviewer and date", () => {
  const canon = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "ss-rule-reviews-"));
  const validate = (mutate) => {
    const catalog = JSON.parse(JSON.stringify(canon));
    mutate(catalog.rules.find((entry) => entry.id === "CRAFT-control-heights"));
    const file = join(dir, "catalog.json");
    writeFileSync(file, JSON.stringify(catalog));
    return spawnSync(process.execPath, [resolve(repoRoot, "scripts/validate-rules.mjs"), file], { encoding: "utf8" });
  };
  try {
    assert.ok(canon.rules.every((entry) => !Object.hasOwn(entry, "review")), "no catalog entry uses the singular review");
    const agree = { reviewer: "reviewer-a", date: "2026-11-10", verdict: "agree", via: "designer+agent" };
    assert.equal(validate((entry) => { entry.evidence.level = "approved"; entry.reviews = [{ ...agree, verdict: "conditional", date: "2026-11-09" }, agree]; }).status, 0);
    const conditionalOnly = validate((entry) => { entry.evidence.level = "approved"; entry.reviews = [{ ...agree, verdict: "conditional" }]; });
    assert.equal(conditionalOnly.status, 1);
    assert.match(conditionalOnly.stderr, /CRAFT-control-heights: evidence\.level "approved" needs at least one review with verdict "agree"/u);
    assert.match(validate((entry) => { entry.evidence.level = "approved"; }).stderr, /needs at least one review with verdict "agree"/u);
    assert.match(validate((entry) => { entry.reviews = [agree, { ...agree, verdict: "disagree" }]; }).stderr, /two entries by reviewer-a on 2026-11-10/u);
    assert.match(validate((entry) => { entry.reviews = [{ ...agree, via: "x".repeat(41) }]; }).stderr, /reviews\[0\]\.via is too long \(max 40\)/u);
    assert.match(validate((entry) => { entry.review = agree; }).stderr, /\.review is not a known field/u);
    assert.equal(validate((entry) => { entry.reviews = [{ ...agree, verdict: "disagree" }]; }).status, 0, "an inferred entry may carry a disagree");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("check.tool renders under Checks: next to detectors", () => {
  const selection = { grammar: "operations-console", adapter: "product-ui" };
  const toolOnly = rule({ id: "T-1", check: { mode: "machine", tool: "ss-verify/scripts/drift-report.mjs --gate" } });
  const both = rule({ id: "T-2", check: { mode: "machine", detectors: ["SS003"], tool: "ss-verify/scripts/drift-report.mjs --gate" } });
  const section = renderRulesSection([toolOnly, both], selection);
  assert.ok(section.includes("- **T-1** (advisory · inferred · any selection): A statement long enough to pass. Checks: ss-verify/scripts/drift-report.mjs --gate. Source: engine/CRAFT-BASELINE.md"));
  assert.ok(section.includes("Checks: SS003, ss-verify/scripts/drift-report.mjs --gate. Source:"));
});

test("check.tool: machine mode accepts a workflow script that exists with flags it parses", () => {
  const canon = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "ss-rule-tool-"));
  const validate = (check) => {
    const catalog = JSON.parse(JSON.stringify(canon));
    catalog.rules.find((entry) => entry.id === "DL-23-amounts-never-wrap").check = check;
    const file = join(dir, "catalog.json");
    writeFileSync(file, JSON.stringify(catalog));
    return spawnSync(process.execPath, [resolve(repoRoot, "scripts/validate-rules.mjs"), file], { encoding: "utf8" });
  };
  try {
    assert.equal(validate({ mode: "machine", tool: "ss-verify/scripts/drift-report.mjs --gate" }).status, 0);
    assert.equal(validate({ mode: "machine", tool: "ss-verify/scripts/drift-report.mjs" }).status, 0, "flags are optional");
    assert.match(validate({ mode: "machine" }).stderr, /DL-23-amounts-never-wrap: check\.mode "machine" needs at least one detector id or a check\.tool/u);
    assert.match(validate({ mode: "machine", tool: "ss-verify/scripts/missing.mjs" }).stderr, /check\.tool script ss-verify\/scripts\/missing\.mjs does not exist/u);
    assert.match(validate({ mode: "machine", tool: "ss-verify/scripts/drift-report.mjs --strict" }).stderr, /check\.tool flag --strict is not an option of ss-verify\/scripts\/drift-report\.mjs/u);
    assert.match(validate({ mode: "machine", tool: "../../scripts/verify-repo.mjs" }).stderr, /check\.tool does not match/u);
    assert.match(validate({ mode: "model", tool: "ss-verify/scripts/drift-report.mjs --gate" }).stderr, /detectors and check\.tool are only meaningful with check\.mode "machine"/u);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("drift-checked rules name the drift gate and the README counts match the catalog", () => {
  const canon = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8")).rules;
  for (const id of ["INV-05-no-unexplained-role-drift", "CRAFT-control-heights"]) {
    const entry = canon.find((r) => r.id === id);
    assert.deepEqual(entry.check, { mode: "machine", tool: "ss-verify/scripts/drift-report.mjs --gate" }, id);
    assert.match(entry.rationale, /drift-report\.mjs --gate/u, `${id} says what the tool checks`);
  }
  assert.match(canon.find((r) => r.id === "INV-05-no-unexplained-role-drift").rationale, /decisions ledger/u);
  assert.doesNotMatch(canon.find((r) => r.id === "INV-05-no-unexplained-role-drift").rationale, /the lock records/u);
  const readme = readFileSync(resolve(repoRoot, "engine/rules/README.md"), "utf8").replace(/\s+/gu, " ");
  const counts = readme.match(/Today: (\d+) machine \([^)]*\), (\d+) model, (\d+) human\./u);
  assert.ok(counts, "engine/rules/README.md states the check-mode counts as 'Today: N machine (…), N model, N human.'");
  const byMode = (mode) => canon.filter((r) => r.check.mode === mode).length;
  assert.deepEqual(counts.slice(1).map(Number), [byMode("machine"), byMode("model"), byMode("human")], "update the counts in engine/rules/README.md");
});

test("render-fault rules: DL-23 and the two icon defaults name drift-report.mjs --faults; the README counts them", () => {
  const canon = JSON.parse(readFileSync(resolve(repoRoot, "engine/rules/catalog.json"), "utf8")).rules;
  const byId = new Map(canon.map((r) => [r.id, r]));
  const dl23 = byId.get("DL-23-amounts-never-wrap");
  const gates = dl23.priority === "blocks";
  assert.deepEqual(dl23.check, { mode: "machine", tool: `ss-verify/scripts/drift-report.mjs --faults${gates ? " --gate" : ""}` });
  assert.match(dl23.rationale, /drift-report\.mjs --faults measures rendered screens: an element whose whole text is one amount and that is laid out on two or more lines is reported as amount-wrap\./u);
  assert.equal(/With --gate it exits 3 unless an approved exception to this rule covers the screen\./u.test(dl23.rationale), gates);
  for (const id of ["CRAFT-functional-icons", "CRAFT-icon-family"]) {
    const entry = byId.get(id);
    assert.ok(entry, `${id} is in the catalog`);
    assert.deepEqual([entry.kind, entry.priority, entry.axis, entry.scope, entry.evidence.level], ["default", "strong", "imagery-data", {}, "inferred"], id);
    assert.deepEqual(entry.check, { mode: "machine", tool: "ss-verify/scripts/drift-report.mjs --faults" }, id);
    assert.equal(entry.exceptions.length, 2, id);
    assert.match(entry.rationale, /so it reports and never fails the gate\.$/u, id);
  }
  const inv06 = byId.get("INV-06-text-stays-whole");
  const section18 = readFileSync(resolve(repoRoot, "engine/DESIGN-LANGUAGE.md"), "utf8").includes("Rendered text also stays whole: it does not run over other text or out of the box that holds it.");
  assert.equal(section18, Boolean(inv06), "the DESIGN-LANGUAGE §18 sentence exists exactly when INV-06 does");
  if (inv06) {
    assert.deepEqual([inv06.kind, inv06.priority, inv06.check.tool], ["invariant", "blocks", "ss-verify/scripts/drift-report.mjs --faults --gate"]);
    assert.equal(canon.indexOf(inv06), canon.findIndex((r) => r.id === "INV-05-no-unexplained-role-drift") + 1, "INV-06 follows INV-05");
  }
  const readme = readFileSync(resolve(repoRoot, "engine/rules/README.md"), "utf8").replace(/\s+/gu, " ");
  const faults = readme.match(/(\d+) by `drift-report\.mjs --faults`/u);
  assert.ok(faults, "engine/rules/README.md counts the rules checked by drift-report.mjs --faults");
  assert.equal(Number(faults[1]), canon.filter((r) => /drift-report\.mjs --faults/u.test(r.check.tool ?? "")).length);
  assert.match(readme, /`drift-report\.mjs --faults` reports the render faults in `faults\.json`, and `--gate` fails on the ones whose rule has `priority: blocks`; an approved exception to a default rule waives it per screen\./u);
});
