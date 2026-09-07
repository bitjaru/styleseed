#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const safeId = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const limitations = [
  "Local inventory consistency is not publisher authenticity, latest-release availability, or agent-host discovery.",
  "Evidence is revalidated, not newly rendered or independently judged. No files, settings, or approvals are changed.",
];

function present(path) {
  try { lstatSync(path); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// Reject even dangling links before the registry loader can consider legacy fallback.
function projectPath(root, relative) {
  let current = root;
  for (const part of relative.split("/")) {
    current = resolve(current, part);
    if (present(current) && lstatSync(current).isSymbolicLink()) throw new Error(`Refusing project symlink: ${relative}`);
  }
  return current;
}

function compileCheck(root, id, agent, registry) {
  const args = [resolve(scriptDir, "resolve-context.mjs"), "--project-root", root, "--agent", agent, "--check"];
  args.push(...(registry ? ["--artifact", id] : ["--from-lock", "STYLESEED.md"]));
  const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 });
  return {
    status: result.status === 0 ? "current" : result.status === 2 ? "stale" : "invalid",
    detail: (result.error?.message || result.stderr || result.stdout || "Resolver did not complete").trim(),
    ...(result.status === 0 ? {} : { next: "Run ss-resolve for this artifact after reviewing the reported drift; doctor does not recompile." }),
  };
}

function evidenceCheck(root, entry, verifyEvidenceRun) {
  const dir = projectPath(root, `.styleseed/evidence/${entry.id}`);
  if (!present(dir)) return { status: "missing", next: "Collect code and rendered evidence with ss-score / ss-verify for this artifact." };
  const runs = [];
  for (const name of readdirSync(dir).sort()) {
    const path = projectPath(root, `.styleseed/evidence/${entry.id}/${name}`);
    if (!safeId.test(name) || !lstatSync(path).isDirectory()) {
      runs.push({ id: name, status: "invalid", errors: ["Expected a safe run ID and directory"] });
      continue;
    }
    const result = verifyEvidenceRun({ projectRoot: root, artifactId: entry.id, runId: name, writeSummary: false });
    runs.push({ id: name, status: result.ok ? "current" : "invalid", gates: result.gates, errors: result.errors, warnings: result.warnings });
  }
  // Old invalid runs are history, not a veto on a run bound to current inputs.
  const currentRunIds = runs.filter((run) => run.status === "current").map((run) => run.id);
  return {
    status: currentRunIds.length ? "current" : runs.length ? "invalid" : "missing",
    currentRunIds,
    runs,
    ...(currentRunIds.length ? {} : { next: "Collect fresh evidence for the current artifact; cached verification.json is not proof." }),
  };
}

export async function diagnoseProject({ projectRoot = process.cwd(), artifact, agent } = {}) {
  if (artifact !== undefined && !safeId.test(artifact)) throw new Error("--artifact must be a safe artifact ID");
  const root = realpathSync(resolve(projectRoot));
  if (!lstatSync(root).isDirectory()) throw new Error("--project-root must be a directory");
  const report = { schemaVersion: 1, projectRoot: root, status: "attention", installation: { status: "not-checked" }, configuration: { status: "not-checked" }, artifacts: [], limitations };
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(resolve(scriptDir, "../references/catalog.json"), "utf8"));
    const { verifyDistribution } = await import("./distribution-integrity.mjs");
    report.installation = verifyDistribution({ catalog, scriptPath });
  } catch (error) {
    report.installation = { status: "invalid", detail: error.message };
  }
  if (report.installation.status !== "verified") {
    report.installation.next = "Restore a complete StyleSeed distribution from your trusted install source before diagnosing project state.";
    return report;
  }
  const { CONTRACT_ENUMS } = await import("./runtime-contract.mjs");
  if (agent !== undefined && !CONTRACT_ENUMS.agents.includes(agent)) throw new Error(`--agent must be one of: ${CONTRACT_ENUMS.agents.join(", ")}`);

  try {
    const { loadProjectRegistry } = await import("./project-registry.mjs");
    const { parseStrictJson } = await import("./runtime-contract.mjs");
    const projectFile = projectPath(root, ".styleseed/project.json");
    const indexFile = projectPath(root, ".styleseed/artifacts/index.json");
    report.configuration = { mode: present(projectFile) || present(indexFile) ? "registry" : "legacy", status: "not-checked" };
    const registry = loadProjectRegistry(root, { catalog });
    if (!registry) {
      const lock = projectPath(root, "STYLESEED.md");
      if (!present(lock)) {
        report.configuration = { mode: "missing", status: "missing", next: "Run ss-setup to choose and approve a project contract." };
        return report;
      }
      if (artifact !== undefined) throw new Error("--artifact requires a registry project; legacy mode has one lock");
      const manifest = projectPath(root, ".styleseed/manifest.json");
      const storedAgent = present(manifest) ? parseStrictJson(readFileSync(manifest, "utf8")).selection?.agent : null;
      const compilation = compileCheck(root, "legacy", agent ?? storedAgent ?? "codex", false);
      report.configuration = { mode: "legacy", status: compilation.status === "invalid" ? "invalid" : "valid" };
      report.artifacts.push({ id: "legacy", compilation, evidence: { status: "unsupported", next: "Legacy bundles do not provide registry evidence-run verification. Use explicit migration before adopting registry evidence." } });
      return report;
    }
    report.configuration = { mode: "registry", status: "valid", projectId: registry.project.projectId };
    const entries = artifact ? registry.artifacts.filter((entry) => entry.id === artifact) : registry.artifacts;
    if (!entries.length) throw new Error(artifact ? `Unknown artifact: ${artifact}` : "Registry has no artifacts");
    const { verifyEvidenceRun } = await import("../../ss-score/scripts/evidence-gate.mjs");
    for (const entry of entries) {
      const compilation = compileCheck(root, entry.id, agent ?? registry.project.defaults.agent, true);
      let evidence = { status: "not-checked", next: "Resolve compilation drift before evaluating evidence against the current contract." };
      if (compilation.status === "current") {
        try { evidence = evidenceCheck(root, entry, verifyEvidenceRun); }
        catch (error) { evidence = { status: "invalid", detail: error.message }; }
      }
      report.artifacts.push({ id: entry.id, compilation, evidence });
    }
    if (report.artifacts.every((entry) => entry.compilation.status === "current" && entry.evidence.status === "current")) report.status = "evidence-current";
  } catch (error) {
    report.configuration = { ...report.configuration, status: "invalid", detail: error.message, next: "Correct the reported project boundary or configuration, then rerun doctor; do not overwrite approved choices or bypass a registry error." };
  }
  return report;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (["--json", "--help"].includes(flag)) { options[flag.slice(2)] = true; continue; }
    if (!["--project-root", "--artifact", "--agent"].includes(flag)) throw new Error(`Unknown option: ${flag}`);
    if (!argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(`Missing value for ${flag}`);
    options[flag.slice(2)] = argv[++index];
  }
  return options;
}

async function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log("Usage: node <installed-ss-resolve>/scripts/styleseed-doctor.mjs [--project-root PATH] [--artifact ID] [--agent NAME] [--json]\nRead-only local diagnosis. Exit 0: current evidence for every selected artifact; 1: attention needed; 2: invalid invocation.");
      return;
    }
    const report = await diagnoseProject({ projectRoot: options["project-root"], artifact: options.artifact, agent: options.agent });
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`StyleSeed doctor: ${report.status}\nInstallation: ${report.installation.status}\nConfiguration: ${report.configuration.mode ?? "unknown"} / ${report.configuration.status}`);
      for (const check of [report.installation, report.configuration]) {
        if (check.detail) console.log(check.detail);
        if (check.mismatches?.length) console.log(JSON.stringify(check.mismatches));
        if (check.next) console.log(`Next: ${check.next}`);
      }
      for (const entry of report.artifacts) {
        console.log(`${entry.id}: compilation=${entry.compilation.status}; evidence=${entry.evidence.status}`);
        for (const check of [entry.compilation, entry.evidence]) {
          if (check.detail) console.log(check.detail);
          if (check.next) console.log(`Next: ${check.next}`);
          for (const run of check.runs ?? []) console.log(`  ${run.id}: ${run.status}${run.errors.length ? ` — ${run.errors.join("; ")}` : ""}`);
        }
      }
      for (const limitation of report.limitations) console.log(`Note: ${limitation}`);
    }
    process.exitCode = report.status === "evidence-current" ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({ schemaVersion: 1, status: "error", error: error.message }));
    process.exitCode = 2;
  }
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(scriptPath)) await main(process.argv.slice(2));
