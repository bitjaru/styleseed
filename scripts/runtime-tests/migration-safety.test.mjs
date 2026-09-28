import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeLegacyLock } from "../../engine/.claude/skills/ss-resolve/scripts/legacy-lock-analysis.mjs";
import { canonicalJson } from "../../engine/.claude/skills/ss-resolve/scripts/runtime-contract.mjs";
import { createHash } from "node:crypto";

const script = fileURLToPath(new URL("../../engine/.claude/skills/ss-resolve/scripts/migrate-project.mjs", import.meta.url));
const baseLock = `# Synthetic design lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Primary action: #0F766E
- Font: Inter
`;
const fixtures = fileURLToPath(new URL("../fixtures/migration/", import.meta.url));

function fixture(lock = baseLock) {
  const root = mkdtempSync(join(tmpdir(), "styleseed-migration-safety-"));
  writeFileSync(resolve(root, "STYLESEED.md"), lock);
  return root;
}

function run(root, ...args) {
  return spawnSync(process.execPath, [script, "--project-root", root, ...args], { encoding: "utf8" });
}

function snapshot(root) {
  const walk = (folder, prefix = "") => readdirSync(folder, { withFileTypes: true }).flatMap((item) => {
    const path = resolve(folder, item.name);
    const name = `${prefix}${item.name}`;
    return item.isDirectory() ? walk(path, `${name}/`) : [[name, readFileSync(path).toString("hex")]];
  });
  return walk(root).sort(([a], [b]) => a.localeCompare(b));
}

function digest(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }

function reviewedPlan(root) {
  mkdirSync(resolve(root, "src"));
  const draft = JSON.parse(run(root).stdout);
  const artifact = draft.targets[2].content;
  artifact.validation.requiredRenders = [{ id: "mobile-loaded", state: "loaded", viewport: { width: 390, height: 844 } }];
  return {
    schemaVersion: 1, legacyLockSha256: draft.legacyLockSha256,
    sectionMapping: [{ sectionId: "root", artifactId: "default" }],
    project: draft.targets[0].content,
    artifacts: [artifact], acknowledgedUnmigratedFields: [],
  };
}

function savePlan(root, plan) { writeFileSync(resolve(root, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`); }

function planHash(plan) {
  const { legacyLockSha256, sectionMapping, project, artifacts, acknowledgedUnmigratedFields } = plan;
  return digest(canonicalJson({ legacyLockSha256, sectionMapping, project, artifacts, acknowledgedUnmigratedFields }));
}

test("canonical dry-run preserves known colors and reports unreviewed defaults", () => {
  const root = fixture();
  try {
    const result = run(root, "--dry-run");
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaVersion, 2);
    assert.equal(report.status, "review-required");
    assert.equal(report.requiresReview, true);
    assert.equal(report.canApply, false);
    assert.equal(report.targets[0].content.brand.keyColor, "#0F766E");
    assert.equal(Object.hasOwn(report.targets[0].content.brand, "companionColor"), false);
    assert.deepEqual(report.targets[0].content.brand.fontFamilies, ["Inter"]);
    assert.equal(report.targets[2].content.selection.grammar, "operations-console");
    assert.ok(report.unresolvedCriticalFields.some((item) => item.field === "artifacts.default.validation.requiredRenders" && item.reason === "defaulted"));
    assert.ok(report.unresolvedCriticalFields.some((item) => item.field === "artifacts.default.implementation.sourceRoots" && item.reason === "defaulted"));
    assert.equal(readdirSync(root).join(","), "STYLESEED.md");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("unsupported explicit companion colors stay visible and cannot be silently dropped", () => {
  const root = fixture(`${baseLock}- Companion color: #D97706\n`);
  try {
    const draft = JSON.parse(run(root).stdout);
    assert.ok(draft.unmigratedFields.some((item) => item.field === "Companion color" && item.values.includes("#D97706")));
    const plan = reviewedPlan(root);
    const line = draft.legacyAnalysis.fields.find((item) => item.label === "Companion color").line;
    plan.acknowledgedUnmigratedFields = [{ line, label: "Companion color", reason: "unknown" }];
    savePlan(root, plan);
    const before = snapshot(root);
    const result = run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(plan), "--write");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /companion colors are not supported/u);
    assert.deepEqual(snapshot(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("duplicate and conflicting critical fields retain source lines but never apply", () => {
  const root = fixture(`${baseLock}- Output grammar: consumer-service\n- Key color: #5B5BD6\n`);
  try {
    const before = snapshot(root);
    const report = JSON.parse(run(root).stdout);
    assert.equal(report.status, "review-required");
    assert.ok(report.unresolvedCriticalFields.some((item) => item.field === "artifacts.default.selection.grammar" && item.reason === "duplicate" && item.sourceLines.length === 2));
    assert.ok(report.unresolvedCriticalFields.some((item) => item.field === "project.brand.keyColor" && item.reason === "conflict" && item.sourceLines.length === 2));
    const write = run(root, "--write");
    assert.equal(write.status, 2, write.stderr);
    assert.equal(JSON.parse(write.stdout).canApply, false);
    assert.deepEqual(snapshot(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("unknown fields require review and write refusal leaves all bytes unchanged", () => {
  const root = fixture(`${baseLock}- Extra design direction: preserve the large type\n`);
  try {
    const before = snapshot(root);
    const result = run(root, "--write");
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.requiresReview, true);
    assert.ok(report.unmigratedFields.some((item) => item.field === "Extra design direction" && item.reason === "unknown" && item.sourceLines.length === 1));
    assert.deepEqual(snapshot(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid lock and invalid CLI arguments fail before any write", () => {
  const root = fixture();
  try {
    const before = snapshot(root);
    for (const args of [
      ["--from-lock", "missing.md", "--write"],
      ["--force"],
      ["--write", "--dry-run"],
      ["--artifact", "default", "--artifact", "other", "--write"],
      ["--artifact", "../unsafe", "--write"],
    ]) {
      const result = run(root, ...args);
      assert.equal(result.status, 1, `${args.join(" ")}: ${result.stderr}`);
      assert.deepEqual(snapshot(root), before);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("structured analyzer preserves section paths, duplicate kinds, raw colors, aliases and fenced omissions", () => {
  const report = analyzeLegacyLock(readFileSync(resolve(fixtures, "structured.md"), "utf8"));
  assert.deepEqual(report.surfaceCandidates, ["s-4", "s-10"]);
  assert.deepEqual(report.sections.filter((item) => item.headingPath.at(-1) === "Customer").map((item) => item.id), ["s-4", "s-10"]);
  assert.deepEqual(report.sections.find((item) => item.headingPath.at(-1) === "Detail").headingPath, ["Customer", "Detail"]);
  assert.equal(report.fields.find((item) => item.label === "Domain").normalizedLabel, "App domain");
  assert.equal(report.fields.find((item) => item.label === "Typography").normalizedValue, "Noto Sans KR");
  assert.equal(report.fields.find((item) => item.label === "Source path").rawValue, "src/customer/detail");
  assert.deepEqual(report.duplicateGroups.find((item) => item.field === "Output grammar").kind, "conflicting-value");
  assert.deepEqual(report.duplicateGroups.find((item) => item.field === "Primary action").kind, "same-value");
  assert.equal(report.fields.filter((item) => item.normalizedValue === "fabricated").length, 0);
});

test("multi-surface prose and viewport stay raw and unresolved; CRLF and alias conflicts remain visible", () => {
  const text = readFileSync(resolve(fixtures, "multi-surface.md"), "utf8");
  const report = analyzeLegacyLock(text);
  assert.deepEqual(report.surfaceCandidates, ["s-3", "s-8"]);
  assert.equal(report.fields.find((item) => item.label === "Primary action").rawValue, "Brand purple `#6F2CD8`");
  assert.ok(report.fields.filter((item) => item.label === "Typography").every((item) => item.supported === false));
  assert.equal(report.fields.find((item) => item.label === "Viewport gate").rawValue, "390 × 844 at 2× device scale");
  assert.equal(report.duplicateGroups.find((item) => item.field === "Output grammar").kind, "conflicting-value");
  const crlf = analyzeLegacyLock("# Lock\r\n- Domain: saas\r\n- App domain: fintech\r\n");
  assert.deepEqual(crlf.duplicateGroups.find((item) => item.field === "App domain").lines, [2, 3]);
  const root = fixture("# Lock\n- Domain: saas\n- App domain: fintech\n- Surface adapter: product-ui\n- Output grammar: operations-console\n- Page type: dashboard\n- Primary action: #5B5BD6\n- Font: Inter\n");
  try {
    const migration = run(root);
    assert.equal(migration.status, 0, migration.stderr);
    assert.ok(JSON.parse(migration.stdout).unresolvedCriticalFields.some((item) => item.field === "project.defaults.domain" && item.reason === "alias-conflict"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed single-artifact plan needs exact hash and writes only explicit configuration", () => {
  const root = fixture();
  try {
    const plan = reviewedPlan(root);
    savePlan(root, plan);
    const preview = run(root, "--reviewed-plan", "plan.json", "--dry-run");
    assert.equal(preview.status, 0, preview.stderr);
    const report = JSON.parse(preview.stdout);
    assert.equal(report.status, "ready-for-confirmation");
    assert.equal(report.planHash, planHash(plan));
    assert.equal(report.targets[2].content.validation.requiredRenders[0].viewport.width, 390);
    assert.equal(report.diff.find((item) => item.field === "Key color").before, "#0F766E");
    assert.equal(report.diff.find((item) => item.field === "Companion color").before, null);
    assert.equal(report.diff.find((item) => item.field === "Viewport gate").before, null);
    const before = snapshot(root);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--write").status, 1);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--confirm-plan", digest("wrong"), "--write").status, 1);
    assert.deepEqual(snapshot(root), before);
    const applied = run(root, "--reviewed-plan", "plan.json", "--confirm-plan", report.planHash, "--write");
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).status, "applied");
    assert.deepEqual(JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/default.json"), "utf8")).validation.requiredRenders[0].viewport, { width: 390, height: 844 });
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--confirm-plan", report.planHash, "--write").status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed plan refuses changed source, changed payload, missing mapping and false acknowledgements", () => {
  const root = fixture();
  try {
    const plan = reviewedPlan(root);
    const cases = [
      { ...plan, sectionMapping: [] },
      { ...plan, sectionMapping: [{ sectionId: "missing", artifactId: "default" }] },
      { ...plan, acknowledgedUnmigratedFields: [{ line: 2, label: "invented", reason: "unknown" }] },
      { ...plan, artifacts: [{ ...plan.artifacts[0], id: "other" }] },
      { ...plan, artifacts: [plan.artifacts[0], plan.artifacts[0]] },
      { ...plan, artifacts: [{ ...plan.artifacts[0], implementation: { sourceRoots: ["../escape"], tokenFiles: [] } }] },
      { ...plan, artifacts: [{ ...plan.artifacts[0], implementation: { sourceRoots: ["src"], tokenFiles: ["/tmp/outside"] } }] },
      { ...plan, project: { ...plan.project, brand: { ...plan.project.brand, companionColor: "#123456" } } },
      { ...plan, project: { ...plan.project, brand: { ...plan.project.brand, fontFamilies: ["Roboto", "Inter"] } } },
      { ...plan, artifacts: [{ ...plan.artifacts[0], selection: { ...plan.artifacts[0].selection, domain: "fintech" } }] },
      { ...plan, artifacts: [{ ...plan.artifacts[0], selection: { ...plan.artifacts[0].selection, page: "list" } }] },
    ];
    for (const candidate of cases) {
      savePlan(root, candidate);
      const before = snapshot(root);
      const result = run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(candidate), "--write");
      assert.equal(result.status, 1, result.stderr);
      assert.deepEqual(snapshot(root), before);
    }
    savePlan(root, plan);
    const changed = { ...plan, project: { ...plan.project, brand: { ...plan.project.brand, keyColor: "#123456" } } };
    savePlan(root, changed);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(plan), "--write").status, 1);
    savePlan(root, plan);
    writeFileSync(resolve(root, "STYLESEED.md"), `${baseLock}- Extra: changed\n`);
    const before = snapshot(root);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(plan), "--write").status, 1);
    assert.deepEqual(snapshot(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("legacy lock hash covers original bytes, even for non-UTF-8 input", () => {
  const bytes = Buffer.concat([Buffer.from(baseLock), Buffer.from([0xff, 0x0a])]);
  const root = fixture(bytes);
  try {
    const draft = run(root);
    assert.equal(draft.status, 0, draft.stderr);
    assert.equal(JSON.parse(draft.stdout).legacyLockSha256, digest(bytes));
    const plan = reviewedPlan(root);
    assert.equal(plan.legacyLockSha256, digest(bytes));
    savePlan(root, plan);
    const preview = run(root, "--reviewed-plan", "plan.json");
    assert.equal(preview.status, 0, preview.stderr);
    writeFileSync(resolve(root, "STYLESEED.md"), Buffer.concat([Buffer.from(baseLock), Buffer.from([0xfe, 0x0a])]));
    const before = snapshot(root);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(plan), "--write").status, 1);
    assert.deepEqual(snapshot(root), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed plan refuses symlinks, dangling links and hardlinked source paths", () => {
  const root = fixture();
  try {
    const plan = reviewedPlan(root);
    savePlan(root, plan);
    symlinkSync("missing", resolve(root, "dangling"));
    const linked = { ...plan, artifacts: [{ ...plan.artifacts[0], implementation: { sourceRoots: ["dangling"], tokenFiles: [] } }] };
    savePlan(root, linked);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--dry-run").status, 1);
    symlinkSync("src", resolve(root, "linked-src"));
    linked.artifacts[0].implementation.sourceRoots = ["linked-src"];
    savePlan(root, linked);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--dry-run").status, 1);
    writeFileSync(resolve(root, "tokens.json"), "{}\n");
    linkSync(resolve(root, "tokens.json"), resolve(root, "tokens-hardlink.json"));
    linked.artifacts[0].implementation = { sourceRoots: ["src"], tokenFiles: ["tokens-hardlink.json"] };
    savePlan(root, linked);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--dry-run").status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed multi-surface plan keeps distinct artifacts and resolves both bundles", () => {
  const root = fixture(readFileSync(resolve(fixtures, "multi-surface.md"), "utf8"));
  try {
    mkdirSync(resolve(root, "src/customer"), { recursive: true });
    mkdirSync(resolve(root, "src/operator"), { recursive: true });
    const draft = JSON.parse(run(root).stdout);
    const project = draft.targets[0].content;
    project.defaults.domain = "saas";
    project.defaults.recipe = "calm-consumer";
    project.defaults.palette = "quiet-mineral";
    project.brand.keyColor = "#6F2CD8";
    project.brand.fontFamilies = ["Pretendard"];
    const base = draft.targets[2].content;
    const customer = structuredClone(base);
    customer.id = "customer";
    customer.target.locator = "/customer";
    customer.selection.grammar = "consumer-service";
    customer.selection.recipe = "calm-consumer";
    customer.selection.palette = "quiet-mineral";
    customer.implementation.sourceRoots = ["src/customer"];
    customer.validation.requiredRenders = [{ id: "mobile-loaded", state: "loaded", viewport: { width: 390, height: 844 } }];
    customer.decisions = { primaryDecision: "Review the current customer state", primaryAction: "Continue", signatureMove: "Show one calm next step" };
    const operator = structuredClone(base);
    operator.id = "operator";
    operator.target.locator = "/operator";
    operator.selection.grammar = "operations-console";
    operator.selection.recipe = "enterprise-workbench";
    operator.selection.palette = "cobalt-instrument";
    operator.implementation.sourceRoots = ["src/operator"];
    operator.validation.requiredRenders = [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 900 } }];
    operator.decisions = { primaryDecision: "Review operator exceptions", primaryAction: "Open queue", signatureMove: "Keep the operational queue visible" };
    const plan = {
      schemaVersion: 1, legacyLockSha256: draft.legacyLockSha256,
      sectionMapping: [{ sectionId: "s-3", artifactId: "customer" }, { sectionId: "s-8", artifactId: "operator" }],
      project, artifacts: [customer, operator],
      acknowledgedUnmigratedFields: [
        { line: 5, label: "Primary action", reason: "unsupported" },
        { line: 6, label: "Typography", reason: "unsupported" },
        { line: 7, label: "Viewport gate", reason: "unknown" },
        { line: 10, label: "Primary action", reason: "unsupported" },
        { line: 11, label: "Typography", reason: "unsupported" },
        { line: 12, label: "Viewport gate", reason: "unknown" },
      ],
    };
    savePlan(root, plan);
    const preview = run(root, "--reviewed-plan", "plan.json");
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(preview.stdout).targets.length, 4);
    const applied = run(root, "--reviewed-plan", "plan.json", "--confirm-plan", planHash(plan), "--write");
    assert.equal(applied.status, 0, applied.stderr);
    const resolver = fileURLToPath(new URL("../../engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs", import.meta.url));
    const compiled = spawnSync(process.execPath, [resolver, "--project-root", root, "--all"], { encoding: "utf8" });
    assert.equal(compiled.status, 0, compiled.stderr);
    const checked = spawnSync(process.execPath, [resolver, "--project-root", root, "--all", "--check"], { encoding: "utf8" });
    assert.equal(checked.status, 0, checked.stderr);
    const c = JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/customer.json"), "utf8"));
    const o = JSON.parse(readFileSync(resolve(root, ".styleseed/artifacts/operator.json"), "utf8"));
    assert.deepEqual(c.implementation.sourceRoots, ["src/customer"]);
    assert.deepEqual(o.implementation.sourceRoots, ["src/operator"]);
    assert.equal(c.selection.grammar, "consumer-service");
    assert.equal(o.selection.grammar, "operations-console");
    assert.equal(JSON.parse(readFileSync(resolve(root, ".styleseed/project.json"), "utf8")).brand.keyColor, "#6F2CD8");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed plan rejects duplicate JSON keys and existing output bytes", () => {
  const root = fixture();
  try {
    const plan = reviewedPlan(root);
    writeFileSync(resolve(root, "plan.json"), `{"schemaVersion":1,"schemaVersion":1,"legacyLockSha256":"${plan.legacyLockSha256}"}`);
    const beforeInvalid = snapshot(root);
    assert.equal(run(root, "--reviewed-plan", "plan.json", "--write", "--confirm-plan", planHash(plan)).status, 1);
    assert.deepEqual(snapshot(root), beforeInvalid);
    savePlan(root, plan);
    mkdirSync(resolve(root, ".styleseed"));
    writeFileSync(resolve(root, ".styleseed/project.json"), "existing user data\n");
    const beforeExisting = snapshot(root);
    const result = run(root, "--reviewed-plan", "plan.json", "--write", "--confirm-plan", planHash(plan));
    assert.equal(result.status, 1);
    assert.deepEqual(snapshot(root), beforeExisting);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("reviewed plan removes its first output after a later write failure", (t) => {
  if (process.platform === "win32" || process.getuid?.() === 0) { t.skip("POSIX permissions are required for this failure injection"); return; }
  const root = fixture();
  try {
    const plan = reviewedPlan(root);
    savePlan(root, plan);
    mkdirSync(resolve(root, ".styleseed/artifacts"), { recursive: true });
    chmodSync(resolve(root, ".styleseed/artifacts"), 0o500);
    try {
      const before = snapshot(root);
      const result = run(root, "--reviewed-plan", "plan.json", "--write", "--confirm-plan", planHash(plan));
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Migration write failed/u);
      assert.deepEqual(snapshot(root), before);
    } finally { chmodSync(resolve(root, ".styleseed/artifacts"), 0o700); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
