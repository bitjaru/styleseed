import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolver = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs");
const checker = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-score/scripts/styleseed-check.mjs");

function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function hash(path) { const bytes = readFileSync(path); return { sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, bytes: bytes.byteLength }; }
function root(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }

function fixture(projectRoot, extraFiles = {}) {
  mkdirSync(resolve(projectRoot, ".styleseed/artifacts"), { recursive: true });
  mkdirSync(resolve(projectRoot, "src/app/dashboard"), { recursive: true });
  writeJson(resolve(projectRoot, ".styleseed/project.json"), {
    schemaVersion: 1, projectId: "check-fixture",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first" },
  });
  writeJson(resolve(projectRoot, ".styleseed/artifacts/index.json"), { schemaVersion: 1, artifacts: [{ id: "app-dashboard", config: "app-dashboard.json" }] });
  writeJson(resolve(projectRoot, ".styleseed/artifacts/app-dashboard.json"), {
    schemaVersion: 1, id: "app-dashboard", target: { kind: "route", locator: "/dashboard" },
    selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
    decisions: { primaryDecision: "Which issue needs action now?", primaryAction: "Open issue", signatureMove: "Keep the selected issue visible." },
    implementation: { sourceRoots: ["src/app/dashboard"], tokenFiles: [] },
    validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
  });
  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){ return <section style={{ clipPath: \"url(#frame)\" }}><a href=\"#add\" id=\"face\">#12345</a><button className=\"text-[#123456] p-[13px] transition-all\"><SearchIcon /></button></section>; }\n");
  for (const [path, content] of Object.entries(extraFiles)) writeFileSync(resolve(projectRoot, path), content);
  const resolved = spawnSync(process.execPath, [resolver, "--project-root", projectRoot, "--artifact", "app-dashboard", "--agent", "codex"], { encoding: "utf8" });
  assert.equal(resolved.status, 0, resolved.stderr || resolved.stdout);
  const manifestPath = resolve(projectRoot, ".styleseed/manifests/app-dashboard.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.inputs = manifest.inputs.map((entry) => ({ ...entry, ...hash(resolve(projectRoot, entry.path)) }));
  writeJson(manifestPath, manifest);
}

function run(projectRoot, args) {
  return spawnSync(process.execPath, [checker, "scan", "--project-root", projectRoot, ...args], { encoding: "utf8" });
}

test("scan emits stable warning-only JSON and SARIF", () => {
  const projectRoot = root("styleseed-check-warnings-");
  try {
    fixture(projectRoot);
    const json = run(projectRoot, ["--artifact", "app-dashboard", "--format", "json"]);
    assert.equal(json.status, 0, `${json.stderr}\n${json.stdout}`);
    const report = JSON.parse(json.stdout);
    assert.deepEqual(Object.keys(report), ["detectorRevision", "inventoryHash", "findings"]);
    assert.equal(report.detectorRevision, "styleseed-check-v3");
    assert.ok(report.findings.some((item) => item.id === "SS001" && item.severity === "warning"));
    const ss001 = report.findings.find((item) => item.id === "SS001");
    assert.deepEqual({ rule: ss001.rule, priority: ss001.priority, blocking: ss001.blocking }, { rule: "CRAFT-semantic-tokens", priority: "strong", blocking: false }, "detectors carry their catalog rule");
    const ss006 = report.findings.find((item) => item.id === "SS006");
    assert.deepEqual({ rule: ss006.rule, priority: ss006.priority, blocking: ss006.blocking }, { rule: "INV-03-essential-actions-visible", priority: "blocks", blocking: true }, "an invariant's detector blocks");
    assert.deepEqual(report.findings.filter((item) => item.id === "SS001").map((item) => item.evidence), ["#123456"], "anchors, ids, url(#…) and 5-digit strings are not colours");
    assert.ok(report.findings.some((item) => item.id === "SS004" && item.file === "src/app/dashboard/page.tsx"));
    assert.ok(report.findings.some((item) => item.id === "SS002"));
    assert.ok(report.findings.some((item) => item.id === "SS003"));

    const sarif = run(projectRoot, ["--artifact", "app-dashboard", "--format", "sarif"]);
    assert.equal(sarif.status, 0, sarif.stderr);
    const document = JSON.parse(sarif.stdout);
    assert.equal(document.version, "2.1.0");
    assert.equal(document.runs[0].results.find((item) => item.ruleId === "SS001").level, "warning");
    assert.equal(document.runs[0].results.find((item) => item.ruleId === "SS006").level, "error", "blocking findings surface as SARIF errors");
    assert.equal(document.runs[0].results.find((item) => item.ruleId === "SS006").properties.rule, "INV-03-essential-actions-visible");
    assert.equal(document.runs[0].tool.driver.rules.find((rule) => rule.id === "SS006").properties.priority, "blocks");

    const gated = run(projectRoot, ["--artifact", "app-dashboard", "--format", "json", "--gate"]);
    assert.equal(gated.status, 3, "--gate exits 3 on blocking findings");
    assert.match(gated.stderr, /gate: FAIL — 1 blocking finding\(s\): INV-03-essential-actions-visible \(SS006\)/u);
    assert.ok(document.runs[0].results.every((item) => /^SS00[1-6]$/u.test(item.ruleId)));
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("approved decisions are not flagged: token-file colours, chart series, and focus replacements", () => {
  const projectRoot = root("styleseed-check-approved-");
  try {
    fixture(projectRoot, {
      "src/app/dashboard/tokens.css": ":root { --ink: #000000; --chart-1: #2563eb; --chart-2: #f59e0b; --chart-3: #16a34a; }\n",
      "src/app/dashboard/chart.tsx": "export const Chart = () => <svg><rect fill=\"var(--chart-1)\" /><rect fill=\"var(--chart-2)\" /><button className=\"outline-none focus-visible:ring-2\" aria-label=\"Zoom\"><ZoomIcon /></button></svg>;\n",
      "src/app/dashboard/naked.tsx": "export const Naked = () => <button className=\"outline-none\">Save</button>;\n",
    });
    const report = JSON.parse(run(projectRoot, ["--artifact", "app-dashboard", "--format", "json"]).stdout);
    const inFile = (file, id) => report.findings.filter((item) => item.file === file && item.id === id);
    assert.deepEqual(inFile("src/app/dashboard/tokens.css", "SS001"), [], "approved black and chart series live in a token file");
    assert.deepEqual(inFile("src/app/dashboard/chart.tsx", "SS001"), [], "consuming tokens is not a hardcoded colour");
    assert.deepEqual(inFile("src/app/dashboard/chart.tsx", "SS005"), [], "outline-none with a focus-visible replacement is a decision, not a suppression");
    assert.equal(inFile("src/app/dashboard/naked.tsx", "SS005").length, 1, "outline-none without any replacement is still reported");
    assert.equal(inFile("src/app/dashboard/naked.tsx", "SS005")[0].blocking, true, "focus suppression maps to the operability invariant");
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("SS004 accepts a reduced-motion fallback declared in a stylesheet of the source set, and still flags files without one", () => {
  const projectRoot = root("styleseed-check-motion-");
  try {
    fixture(projectRoot, { "src/app/dashboard/motion.css": "@media (prefers-reduced-motion: reduce) { * { transition: none; } }\n" });
    const json = run(projectRoot, ["--artifact", "app-dashboard", "--format", "json"]);
    assert.equal(json.status, 0, `${json.stderr}\n${json.stdout}`);
    const report = JSON.parse(json.stdout);
    assert.ok(!report.findings.some((item) => item.id === "SS004"), "a shared stylesheet fallback satisfies SS004");
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
  const lonely = root("styleseed-check-motion-lonely-");
  try {
    fixture(lonely, { "src/app/dashboard/widget.tsx": "export const Widget = () => <div className=\"animate-pulse\" />;\n" });
    const report = JSON.parse(run(lonely, ["--artifact", "app-dashboard", "--format", "json"]).stdout);
    assert.deepEqual(report.findings.filter((item) => item.id === "SS004").map((item) => item.file).sort(), ["src/app/dashboard/page.tsx", "src/app/dashboard/widget.tsx"], "every file with motion and no fallback is reported");
  } finally { rmSync(lonely, { recursive: true, force: true }); }
});

test("scan turns manifest and source-root drift into hard errors", () => {
  const projectRoot = root("styleseed-check-hard-");
  try {
    fixture(projectRoot);
    writeFileSync(resolve(projectRoot, ".styleseed/bundles/app-dashboard.md"), "tampered\n");
    const result = run(projectRoot, ["--artifact", "app-dashboard", "--format", "json"]);
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.ok(report.findings.some((item) => item.id === "SS000" && item.severity === "error"));
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("scan runs when invoked through a symlinked skill directory", () => {
  const projectRoot = root("styleseed-check-symlink-");
  try {
    fixture(projectRoot);
    const linkedSkills = resolve(projectRoot, "linked-skills");
    symlinkSync(resolve(repoRoot, "engine/.claude/skills"), linkedSkills, "dir");
    const linkedChecker = resolve(linkedSkills, "styleseed/workflows/ss-score/scripts/styleseed-check.mjs");
    const result = spawnSync(process.execPath, [linkedChecker, "scan", "--project-root", projectRoot, "--artifact", "missing-artifact"], { encoding: "utf8" });
    assert.equal(result.status, 2, `${result.stderr}\n${result.stdout}`);
    const report = JSON.parse(result.stdout);
    assert.ok(report.findings.some((item) => item.id === "SS000" && item.severity === "error"));
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});
