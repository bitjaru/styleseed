import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const skills = resolve(repo, "engine/.claude/skills");
const doctor = resolve(skills, "ss-resolve/scripts/styleseed-doctor.mjs");
const resolver = resolve(skills, "ss-resolve/scripts/resolve-context.mjs");
const gate = resolve(skills, "ss-score/scripts/evidence-gate.mjs");
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
function write(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
}
function run(script, root, args = []) {
  return spawnSync(process.execPath, [script, "--project-root", root, ...args], { encoding: "utf8", timeout: 30000 });
}
function diagnose(root, args = [], script = doctor) {
  const result = run(script, root, ["--json", ...args]);
  assert.equal(result.error, undefined);
  assert.equal(result.stderr, "");
  return { exit: result.status, report: JSON.parse(result.stdout) };
}
function compile(root, args = ["--all"], script = resolver) {
  const result = run(script, root, args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), "styleseed-doctor-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function snapshot(root, prefix = "") {
  const files = {};
  for (const name of readdirSync(resolve(root, prefix)).sort()) {
    const path = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(resolve(root, path));
    if (stat.isDirectory()) Object.assign(files, snapshot(root, path));
    else files[path] = { hash: digest(readFileSync(resolve(root, path))), mtime: stat.mtimeMs, mode: stat.mode };
  }
  return files;
}

// Disposable React source fixture, not a rendered app or autonomous-agent benchmark.
function app(root) {
  write(resolve(root, "package.json"), { private: true, scripts: { build: "node should-not-run.mjs" } });
  write(resolve(root, "should-not-run.mjs"), 'throw new Error("doctor must not execute app scripts");\n');
  write(resolve(root, ".styleseed/project.json"), {
    schemaVersion: 1, projectId: "disposable-app",
    defaults: { agent: "codex", domain: "saas", adapter: "product-ui", recipe: "enterprise-workbench", palette: "cobalt-instrument", profile: "none", fallback: "operations-console" },
    brand: { keyColor: "#0F766E", paletteCharacter: "balanced", paletteMode: "light", paletteHarmony: "auto", surfaceTemperature: "cool", fontFamilies: ["Inter"], radius: "soft", elevation: "restrained-shadow", density: "comfortable", motion: { seed: "spring", intensity: "restrained" }, imageryRole: "product-proof-first" },
  });
  write(resolve(root, ".styleseed/artifacts/index.json"), { schemaVersion: 1, artifacts: ["dashboard", "settings"].map((id) => ({ id, config: `${id}.json` })) });
  for (const id of ["dashboard", "settings"]) {
    write(resolve(root, `src/${id}/page.jsx`), `import React from 'react';\nexport default function Page(){return <main><h1>${id}</h1><button>Open incident</button></main>;}\n`);
    write(resolve(root, `.styleseed/artifacts/${id}.json`), {
      schemaVersion: 1, id, target: { kind: "route", locator: `/${id}` },
      selection: { grammar: "operations-console", adapter: null, domain: null, page: "dashboard", recipe: null, palette: null, profile: null, fallback: null },
      decisions: { primaryDecision: "Which incident needs action?", primaryAction: "Open incident", signatureMove: "Keep the active incident visible." },
      implementation: { sourceRoots: [`src/${id}`], tokenFiles: [] },
      validation: { scoreFloor: 80, requiredRenders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 } }], temporal: { required: false, scenarios: [] }, humanAcceptance: false },
    });
  }
}

function syntheticEvidence(root, id, runId = "fixture-run", gateScript = gate) {
  // Synthetic reports exercise binding only. They must never be published as visual proof.
  const result = spawnSync(process.execPath, [gateScript, "init", "--project-root", root, "--artifact", id, "--run", runId, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout || result.stderr);
  assert.equal(JSON.parse(result.stdout).ok, true);
  const dir = `.styleseed/evidence/${id}/${runId}`;
  const gateRunPath = resolve(root, dir, "gate-run.json");
  const gateRun = readJson(gateRunPath);
  const pixels = "synthetic attachment: not a real render\n";
  write(resolve(root, dir, "fixture.png"), pixels);
  const reports = {
    deterministic: { detectorRevision: "synthetic-test", inventoryHash: gateRun.implementation.inventoryHash, findings: [] },
    code: { score: 100, categories: { color: 16, hierarchy: 16, layout: 12, surfaces: 10, states: 18, motion: 6, coherence: 12, distinctiveness: 10 }, evidence: [], reviewer: "synthetic-test" },
    visual: { inspectionMethod: "synthetic-test-not-visual-proof", renders: [{ id: "desktop-loaded", state: "loaded", viewport: { width: 1440, height: 1000 }, path: `${dir}/fixture.png`, sha256: digest(pixels) }], findings: [] },
  };
  for (const [key, report] of Object.entries(reports)) {
    const path = `${dir}/${key}.json`;
    write(resolve(root, path), report);
    const bytes = readFileSync(resolve(root, path));
    gateRun.gates[key] = { attached: true, reportPath: path, reportSha256: digest(bytes), reportBytes: bytes.length };
  }
  write(gateRunPath, gateRun);
}

test("missing setup and invalid invocations are actionable and write nothing", (t) => {
  const root = temporary(t);
  const result = diagnose(root);
  assert.equal(result.exit, 1);
  assert.equal(result.report.installation.status, "verified");
  assert.equal(result.report.configuration.mode, "missing");
  assert.deepEqual(readdirSync(root), []);
  for (const args of [["--fix"], ["--artifact", "../bad"], ["--agent", "invented"], ["--artifact"]]) {
    assert.equal(diagnose(root, args).exit, 2);
  }
});

test("fresh processes preserve React project choices and isolate artifact drift", (t) => {
  const root = temporary(t);
  app(root);
  compile(root);
  const before = snapshot(root);
  const first = diagnose(root);
  assert.equal(first.exit, 1);
  assert.ok(first.report.artifacts.every((entry) => entry.compilation.status === "current" && entry.evidence.status === "missing"));
  assert.ok(first.report.artifacts.every((entry) => entry.compilation.detail === "Compiled rules and manifest match the current project contract."));
  assert.deepEqual(diagnose(root), first);
  assert.deepEqual(snapshot(root), before);
  const path = resolve(root, ".styleseed/artifacts/settings.json");
  const config = readJson(path);
  config.decisions.primaryAction = "Save settings";
  write(path, config);
  const changed = diagnose(root).report.artifacts;
  assert.equal(changed.find((entry) => entry.id === "dashboard").compilation.status, "current");
  assert.equal(changed.find((entry) => entry.id === "settings").compilation.status, "stale");
  assert.equal(changed.find((entry) => entry.id === "settings").evidence.status, "not-checked");
  compile(root, ["--artifact", "settings"]);
  assert.ok(diagnose(root).report.artifacts.every((entry) => entry.compilation.status === "current"));
  assert.equal(readJson(path).decisions.primaryAction, "Save settings");
  const project = readJson(resolve(root, ".styleseed/project.json"));
  project.brand.density = "compact"; // Explicit human-choice revision is simulated here.
  write(resolve(root, ".styleseed/project.json"), project);
  assert.ok(diagnose(root).report.artifacts.every((entry) => entry.compilation.status === "stale"));
  compile(root);
  assert.ok(diagnose(root).report.artifacts.every((entry) => entry.compilation.status === "current"));
  assert.equal(readJson(resolve(root, ".styleseed/project.json")).brand.density, "compact");
  for (const path of Object.keys(before).filter((path) => path.startsWith("src/"))) assert.deepEqual(snapshot(root)[path], before[path]);
});

test("partial, invalid and symlinked registries never use the legacy lock", (t) => {
  const root = temporary(t);
  write(resolve(root, "STYLESEED.md"), "# legacy\n");
  write(resolve(root, ".styleseed/project.json"), {});
  assert.match(diagnose(root).report.configuration.detail, /Incomplete/);
  assert.equal(diagnose(root).report.configuration.mode, "registry");
  app(root);
  const project = readJson(resolve(root, ".styleseed/project.json"));
  project.brand.radius = "invented";
  write(resolve(root, ".styleseed/project.json"), project);
  assert.equal(diagnose(root).report.configuration.status, "invalid");
  unlinkSync(resolve(root, ".styleseed/project.json"));
  symlinkSync(resolve(root, "missing.json"), resolve(root, ".styleseed/project.json"));
  assert.match(diagnose(root).report.configuration.detail, /symlink/);
});

test("current evidence is rechecked read-only and success is artifact-scoped", (t) => {
  const root = temporary(t);
  app(root);
  compile(root);
  syntheticEvidence(root, "dashboard");
  const before = snapshot(root);
  assert.equal(diagnose(root, ["--artifact", "dashboard"]).exit, 0);
  assert.equal(diagnose(root).exit, 1); // settings has no evidence
  assert.deepEqual(snapshot(root), before);
  assert.equal(existsSync(resolve(root, ".styleseed/evidence/dashboard/fixture-run/verification.json")), false);
  syntheticEvidence(root, "settings");
  assert.equal(diagnose(root).exit, 0);
  write(resolve(root, ".styleseed/evidence/dashboard/fixture-run/verification.json"), { status: "pass" });
  write(resolve(root, ".styleseed/evidence/dashboard/fixture-run/fixture.png"), "tampered");
  const tampered = snapshot(root);
  assert.equal(diagnose(root, ["--artifact", "dashboard"]).report.artifacts[0].evidence.status, "invalid");
  assert.deepEqual(snapshot(root), tampered);
  syntheticEvidence(root, "dashboard", "new-run");
  const recovered = diagnose(root, ["--artifact", "dashboard"]);
  assert.equal(recovered.exit, 0);
  assert.deepEqual(recovered.report.artifacts[0].evidence.currentRunIds, ["new-run"]);
  write(resolve(root, "src/dashboard/page.jsx"), "export default function Page(){return null;}\n");
  assert.equal(diagnose(root, ["--artifact", "dashboard"]).report.artifacts[0].evidence.status, "invalid");
});

test("Git-bound diagnosis preserves the index and refuses changed implementation", (t) => {
  const root = temporary(t);
  app(root);
  for (const args of [["init", "-q"], ["add", "src"], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"]]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  compile(root);
  syntheticEvidence(root, "dashboard");
  const before = snapshot(root);
  assert.equal(diagnose(root, ["--artifact", "dashboard"]).exit, 0);
  assert.deepEqual(snapshot(root), before);
  write(resolve(root, "src/dashboard/other.jsx"), "export const value = 1;\n");
  const changed = diagnose(root, ["--artifact", "dashboard"]);
  assert.equal(changed.exit, 1);
  assert.match(changed.report.artifacts[0].evidence.runs[0].errors.join("\n"), /bound repository revision/);
});

test("unknown artifacts and custom config paths cannot produce unscoped or misleading evidence success", (t) => {
  const root = temporary(t);
  app(root);
  compile(root);
  assert.equal(diagnose(root, ["--artifact", "absent"]).report.configuration.status, "invalid");
  const index = readJson(resolve(root, ".styleseed/artifacts/index.json"));
  index.artifacts[0].config = "custom-name.json";
  write(resolve(root, ".styleseed/artifacts/index.json"), index);
  cpSync(resolve(root, ".styleseed/artifacts/dashboard.json"), resolve(root, ".styleseed/artifacts/custom-name.json"));
  const custom = diagnose(root, ["--artifact", "dashboard"]);
  assert.equal(custom.report.configuration.status, "invalid");
  assert.match(custom.report.configuration.detail, /artifact config must be dashboard.json/);
  assert.deepEqual(custom.report.artifacts, []);
});

test("legacy diagnosis does not migrate and honors the stored agent", (t) => {
  const root = temporary(t);
  write(resolve(root, "STYLESEED.md"), "# Design Lock\n- App domain: saas\n- Surface adapter: product-ui\n- Page type: dashboard\n- Output grammar: operations-console\n- Brand recipe: auto\n- Palette recipe: auto\n- Aesthetic profile: none\n");
  compile(root, ["--from-lock", "STYLESEED.md", "--agent", "claude"]);
  const before = snapshot(root);
  const result = diagnose(root);
  assert.equal(result.report.configuration.mode, "legacy");
  assert.equal(result.report.artifacts[0].compilation.status, "current");
  assert.equal(result.report.artifacts[0].evidence.status, "unsupported");
  assert.deepEqual(snapshot(root), before);
});

test("installed physical skill payload works outside the checkout and fails closed on damage", (t) => {
  const root = temporary(t);
  const installed = resolve(root, ".agents/skills");
  cpSync(skills, installed, { recursive: true });
  const installedDoctor = resolve(installed, "ss-resolve/scripts/styleseed-doctor.mjs");
  app(root);
  compile(root, ["--all"], resolve(installed, "ss-resolve/scripts/resolve-context.mjs"));
  const current = diagnose(root, [], installedDoctor);
  assert.equal(current.report.installation.status, "verified");
  assert.equal(current.report.installation.distribution, "skills");
  assert.ok(current.report.artifacts.every((entry) => entry.compilation.status === "current"));
  syntheticEvidence(root, "dashboard", "installed-run", resolve(installed, "ss-score/scripts/evidence-gate.mjs"));
  assert.equal(diagnose(root, ["--artifact", "dashboard"], installedDoctor).exit, 0);
  const scoreSkill = resolve(installed, "ss-score/SKILL.md");
  write(scoreSkill, "tampered\n");
  assert.equal(diagnose(root, [], installedDoctor).report.installation.status, "tampered");
  unlinkSync(scoreSkill);
  assert.equal(diagnose(root, [], installedDoctor).report.installation.status, "incomplete");
  write(resolve(installed, "ss-resolve/references/catalog.json"), "{");
  assert.equal(diagnose(root, [], installedDoctor).report.installation.status, "invalid");
});
