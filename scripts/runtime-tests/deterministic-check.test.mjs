import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolver = resolve(repoRoot, "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs");
const checker = resolve(repoRoot, "engine/.claude/skills/ss-score/scripts/styleseed-check.mjs");

function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function hash(path) { const bytes = readFileSync(path); return { sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, bytes: bytes.byteLength }; }
function root(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }

function fixture(projectRoot) {
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
  writeFileSync(resolve(projectRoot, "src/app/dashboard/page.tsx"), "export default function Page(){ return <button className=\"text-[#123456] p-[13px] transition-all\"><SearchIcon /></button>; }\n");
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
    assert.equal(report.detectorRevision, "styleseed-check-v1");
    assert.ok(report.findings.some((item) => item.id === "SS001" && item.severity === "warning"));
    assert.ok(report.findings.some((item) => item.id === "SS002"));
    assert.ok(report.findings.some((item) => item.id === "SS003"));

    const sarif = run(projectRoot, ["--artifact", "app-dashboard", "--format", "sarif"]);
    assert.equal(sarif.status, 0, sarif.stderr);
    const document = JSON.parse(sarif.stdout);
    assert.equal(document.version, "2.1.0");
    assert.equal(document.runs[0].results[0].level, "warning");
    assert.ok(document.runs[0].results.every((item) => /^SS00[1-6]$/u.test(item.ruleId)));
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
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
