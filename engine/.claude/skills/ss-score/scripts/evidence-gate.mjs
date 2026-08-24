#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  containedRegularFile,
  GATES,
  readStrictJson,
  sourceInventory,
  validateGateReport,
  verifyManifestFiles,
} from "./evidence-contract.mjs";
import { safeProjectPath } from "../../ss-resolve/scripts/runtime-contract.mjs";

const GATE_KEYS = Object.freeze({ acceptance: "human" });
const GIT_COMMIT = /^[0-9a-f]{40,64}$/u;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) fail(`unexpected argument ${token}`);
    const key = token.slice(2);
    if (["all", "json"].includes(key)) { options[key] = true; continue; }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function projectRoot(options) {
  return resolve(options["project-root"] || process.cwd());
}

function safeRunId(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(value)) fail("--run must be a safe ID");
  return value;
}

function git(root, args) {
  return spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function repositoryRevision(root, sourceRoots, { required = false } = {}) {
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head.status !== 0) {
    if (required) fail("repository revision is missing or unavailable");
    return null;
  }
  const commit = head.stdout.trim();
  if (!GIT_COMMIT.test(commit)) fail("repository revision is invalid");
  const status = git(root, ["status", "--porcelain", "--untracked-files=all", "--", ...sourceRoots]);
  if (status.status !== 0) fail(status.stderr.trim() || "cannot inspect implementation source status");
  if (status.stdout.trim()) fail("implementation source roots must be clean before evidence init");
  return { vcs: "git", commit };
}

function verifyRepositoryRevision(root, revision, sourceRoots) {
  if (revision === null || revision === undefined) return;
  if (!revision || revision.vcs !== "git" || !GIT_COMMIT.test(revision.commit ?? "") || Object.keys(revision).some((key) => !["vcs", "commit"].includes(key))) {
    fail("repository revision contract is invalid");
  }
  const commit = git(root, ["cat-file", "-e", `${revision.commit}^{commit}`]);
  if (commit.status !== 0) fail("bound repository revision is unavailable");
  const tracked = git(root, ["diff", "--quiet", revision.commit, "--", ...sourceRoots]);
  if (tracked.status !== 0) fail("implementation source roots differ from the bound repository revision");
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots]);
  if (untracked.status !== 0) fail(untracked.stderr.trim() || "cannot inspect untracked implementation sources");
  if (untracked.stdout.trim()) fail("implementation source roots contain files outside the bound repository revision");
}

function paths(root, artifactId, runId) {
  return {
    artifact: safeProjectPath(root, `.styleseed/artifacts/${artifactId}.json`),
    manifest: safeProjectPath(root, `.styleseed/manifests/${artifactId}.json`),
    dir: safeProjectPath(root, `.styleseed/evidence/${artifactId}/${runId}`),
    gateRun: safeProjectPath(root, `.styleseed/evidence/${artifactId}/${runId}/gate-run.json`),
  };
}

function readArtifact(root, artifactId) {
  return readStrictJson(safeProjectPath(root, `.styleseed/artifacts/${artifactId}.json`));
}

function readManifest(root, artifactId) {
  return readStrictJson(safeProjectPath(root, `.styleseed/manifests/${artifactId}.json`));
}

function reportPathFor(root, gateRun, gate) {
  const entry = gateRun.gates?.[gate] ?? gateRun.gates?.[GATE_KEYS[gate]];
  if (!entry?.attached || typeof entry.reportPath !== "string") return null;
  return entry.reportPath;
}

function reportFor(root, gateRun, gate) {
  const path = reportPathFor(root, gateRun, gate);
  if (!path) return null;
  const actual = containedRegularFile(root, path, { label: `${gate} report`, maxBytes: 1024 * 1024 });
  const report = readStrictJson(actual.absolutePath);
  validateGateReport(root, gate, report);
  const entry = gateRun.gates?.[gate];
  if (!/^sha256:[0-9a-f]{64}$/u.test(entry?.reportSha256 ?? "") || !Number.isSafeInteger(entry?.reportBytes)) fail(`${gate} report attachment digest is missing`);
  if (entry.reportSha256 !== actual.sha256) fail(`${gate} report changed after attach`);
  if (entry.reportBytes !== actual.bytes) fail(`${gate} report byte count changed after attach`);
  return { report, actual };
}

function addError(errors, message) {
  errors.push(message instanceof Error ? message.message : String(message));
}

function writeJsonAtomic(path, value) {
  const parent = resolve(path, "..");
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  if (existsSync(path)) {
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) fail(`refusing unsafe generated output: ${path}`);
  }
  const temp = resolve(parent, `.${path.split("/").at(-1)}.${process.pid}.tmp`);
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  renameSync(temp, path);
}

export function verifyEvidenceRun({ projectRoot, artifactId, runId }) {
  const root = resolve(projectRoot);
  const errors = [];
  const warnings = [];
  const gates = Object.fromEntries(GATES.map((gate) => [gate, "blocked"]));
  let artifact;
  let manifest;
  let gateRun;
  try { artifact = readArtifact(root, artifactId); } catch (error) { addError(errors, error); return { ok: false, errors, warnings, gates }; }
  try { manifest = readManifest(root, artifactId); } catch (error) { addError(errors, error); return { ok: false, errors, warnings, gates }; }
  try { gateRun = readStrictJson(paths(root, artifactId, runId).gateRun); } catch (error) { addError(errors, error); return { ok: false, errors, warnings, gates }; }

  if (gateRun.schemaVersion !== 1 || gateRun.artifactId !== artifactId || gateRun.runId !== runId) {
    errors.push("gate-run identity or schema is invalid");
  }
  try { verifyManifestFiles(root, manifest); } catch (error) { addError(errors, error); }
  if (gateRun.manifestPath !== `.styleseed/manifests/${artifactId}.json`) errors.push("gate-run manifestPath is not canonical");
  if (gateRun.bundlePath !== manifest.bundle?.path) errors.push("gate-run bundlePath does not match manifest");
  if (gateRun.methodHash !== manifest.methodHash) errors.push("manifest method evidence is stale");
  if (gateRun.validationHash !== manifest.validationHash) errors.push("manifest validation evidence is stale");
  if (gateRun.bundleHash !== manifest.bundle?.sha256 || gateRun.bundleBytes !== manifest.bundle?.bytes) errors.push("manifest bundle snapshot is stale");
  try { verifyRepositoryRevision(root, gateRun.repositoryRevision, gateRun.implementation?.sourceRoots ?? artifact.implementation?.sourceRoots); } catch (error) { addError(errors, error); }

  let inventory = null;
  try {
    inventory = sourceInventory(root, gateRun.implementation?.sourceRoots ?? artifact.implementation?.sourceRoots);
    if (gateRun.implementation?.inventoryHash !== inventory.hash) errors.push("implementation source inventory is stale");
  } catch (error) { addError(errors, error); }

  for (const gate of GATES) {
    try {
      const entry = gateRun.gates?.[gate];
      if (!entry?.attached) {
        if (gate === "temporal" && artifact.validation?.temporal?.required === false) {
          gates[gate] = "pass";
          continue;
        }
        if (gate === "human" && artifact.validation?.humanAcceptance === false) {
          gates[gate] = "pass";
          continue;
        }
        throw new Error(`${gate} evidence is required`);
      }
      const result = reportFor(root, gateRun, gate);
      if (!result) throw new Error(`${gate} evidence is missing`);
      const { report } = result;
      if (gate === "deterministic") {
        if (report.inventoryHash !== inventory?.hash) throw new Error("deterministic inventory is stale");
        if (report.findings.some((finding) => finding.severity === "error" || finding.severity === "fail")) throw new Error("deterministic evidence contains hard findings");
      } else if (gate === "code") {
        if (report.score < artifact.validation.scoreFloor) throw new Error(`code score ${report.score} is below floor ${artifact.validation.scoreFloor}`);
      } else if (gate === "visual") {
        const required = artifact.validation.requiredRenders ?? [];
        for (const render of required) {
          const found = report.renders.find((candidate) => candidate.id === render.id && candidate.state === render.state && candidate.viewport?.width === render.viewport.width && candidate.viewport?.height === render.viewport.height);
          if (!found) throw new Error(`required viewport is missing: ${render.id}`);
        }
        if (report.findings.some((finding) => finding.severity === "error" || finding.severity === "fail")) throw new Error("visual evidence contains hard findings");
      } else if (gate === "temporal") {
        const contract = artifact.validation.temporal ?? { required: false, scenarios: [] };
        if (contract.required && report.applicability === "not-applicable") throw new Error("temporal evidence is required but marked not-applicable");
        for (const scenario of contract.scenarios ?? []) {
          const found = report.scenarios.find((candidate) => candidate.id === scenario);
          if (!found) throw new Error(`required temporal scenario is missing: ${scenario}`);
          if (found.reducedMotion === "fail") throw new Error(`temporal scenario failed reduced-motion inspection: ${scenario}`);
        }
      }
      gates[gate] = "pass";
    } catch (error) {
      gates[gate] = "fail";
      addError(errors, error);
    }
  }

  if (artifact.validation?.humanAcceptance === true && gates.human === "pass") {
    try {
      const human = reportFor(root, gateRun, "human")?.report;
      const bound = {
        methodHash: gateRun.methodHash,
        validationHash: gateRun.validationHash,
        bundleHash: gateRun.bundleHash,
        implementationHash: inventory?.hash ?? null,
        reports: Object.fromEntries(["deterministic", "code", "visual", "temporal"].map((gate) => [gate, gateRun.gates?.[gate]?.reportSha256 ?? null])),
      };
      const expected = `sha256:${createHash("sha256").update(`${JSON.stringify(bound)}\n`).digest("hex")}`;
      if (human.evidenceHash !== expected) throw new Error("acceptance evidenceHash does not bind the verified run evidence");
    } catch (error) {
      gates.human = "fail";
      addError(errors, error);
    }
  }

  const ok = errors.length === 0 && Object.values(gates).every((status) => status === "pass");
  const summary = {
    schemaVersion: 1,
    artifactId,
    runId,
    status: ok ? "pass" : "fail",
    gates,
    errors,
    warnings,
    computed: {
      manifestMethodHash: manifest.methodHash,
      manifestValidationHash: manifest.validationHash,
      bundle: manifest.bundle ? { path: manifest.bundle.path, sha256: manifest.bundle.sha256, bytes: manifest.bundle.bytes } : null,
      repositoryRevision: gateRun.repositoryRevision ?? null,
      implementation: inventory ? { hash: inventory.hash, files: inventory.files, bytes: inventory.bytes } : null,
    },
  };
  try {
    const verificationPath = safeProjectPath(root, `.styleseed/evidence/${artifactId}/${runId}/verification.json`);
    writeJsonAtomic(verificationPath, summary);
  } catch (error) { addError(errors, `cannot write verification summary: ${error.message}`); }
  summary.status = errors.length === 0 && Object.values(gates).every((status) => status === "pass") ? "pass" : "fail";
  return { ok: summary.status === "pass", errors, warnings, gates, summary };
}

function init(options) {
  const root = projectRoot(options);
  const artifactId = options.artifact;
  const runId = safeRunId(options.run);
  if (!artifactId || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(artifactId)) fail("--artifact must be a safe ID");
  const artifact = readArtifact(root, artifactId);
  const manifest = readManifest(root, artifactId);
  verifyManifestFiles(root, manifest);
  const inventory = sourceInventory(root, artifact.implementation.sourceRoots);
  const dir = safeProjectPath(root, `.styleseed/evidence/${artifactId}/${runId}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const value = {
    schemaVersion: 1,
    artifactId,
    runId,
    manifestPath: `.styleseed/manifests/${artifactId}.json`,
    bundlePath: manifest.bundle.path,
    methodHash: manifest.methodHash,
    validationHash: manifest.validationHash,
    bundleHash: manifest.bundle.sha256,
    bundleBytes: manifest.bundle.bytes,
    repositoryRevision: repositoryRevision(root, artifact.implementation.sourceRoots),
    implementation: { sourceRoots: artifact.implementation.sourceRoots, inventoryHash: inventory.hash },
    gates: Object.fromEntries(GATES.map((gate) => [gate, { attached: false, reportPath: null, reportSha256: null, reportBytes: null }])),
  };
  writeFileSync(resolve(dir, "gate-run.json"), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return { ok: true, value };
}

function attach(options) {
  const root = projectRoot(options);
  const artifactId = options.artifact;
  const runId = safeRunId(options.run);
  const gate = options.gate === "acceptance" ? "human" : options.gate;
  if (!GATES.includes(gate)) fail("--gate must be deterministic, code, visual, temporal, or human");
  if (!options.report) fail("--report is required");
  const runPaths = paths(root, artifactId, runId);
  const gateRun = readStrictJson(runPaths.gateRun);
  const reportPath = options.report.replaceAll("\\", "/");
  const actual = containedRegularFile(root, reportPath, { label: `${gate} report`, maxBytes: 1024 * 1024 });
  const report = readStrictJson(actual.absolutePath);
  validateGateReport(root, gate, report);
  const relativeReport = reportPath;
  gateRun.gates ??= {};
  gateRun.gates[gate] = { attached: true, reportPath: relativeReport, reportSha256: actual.sha256, reportBytes: actual.bytes };
  writeJsonAtomic(runPaths.gateRun, gateRun);
  return { ok: true, gate, reportPath: relativeReport };
}

function verifyCommand(options) {
  const root = projectRoot(options);
  if (options.all) {
    const index = readStrictJson(safeProjectPath(root, ".styleseed/artifacts/index.json"));
    if (index.schemaVersion !== 1 || !Array.isArray(index.artifacts)) fail("artifact index is invalid");
    const artifactIds = index.artifacts.map((entry) => entry.id).sort();
    const results = artifactIds.map((artifactId) => {
      const evidenceDir = safeProjectPath(root, `.styleseed/evidence/${artifactId}`);
      const runs = existsSync(evidenceDir) ? readdirSync(evidenceDir).sort() : [];
      if (runs.length === 0) return { artifactId, ok: false, errors: ["required evidence run is missing"] };
      const verifiedRuns = runs.map((runId) => verifyEvidenceRun({ projectRoot: root, artifactId, runId }));
      return { artifactId, ok: verifiedRuns.some((run) => run.ok), runs: verifiedRuns };
    });
    return { ok: results.every((result) => result.ok), results };
  }
  if (!options.artifact || !options.run) fail("--artifact and --run are required unless --all is used");
  return verifyEvidenceRun({ projectRoot: root, artifactId: options.artifact, runId: safeRunId(options.run) });
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  let result;
  if (command === "init") result = init(options);
  else if (command === "attach") result = attach(options);
  else if (command === "verify") result = verifyCommand(options);
  else fail("command must be init, attach, or verify");
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log("evidence gate: pass");
  else console.error("evidence gate: fail");
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(`evidence gate: ${error.message}`); process.exitCode = 1; });
