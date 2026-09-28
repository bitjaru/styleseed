#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { containedRegularFile, readStrictJson, sourceInventory, validateGateReport, verifyManifestFiles } from "./evidence-contract.mjs";
import { nodeTestChecks } from "./functional-results.mjs";
import { safeProjectPath } from "../../ss-resolve/scripts/runtime-contract.mjs";

const usage = "Usage: node run-functional-tests.mjs --project-root <dir> --artifact <id> --run <id> --test <project-relative.test.mjs> [--test <another.test.mjs>] [--timeout-ms <1000..300000>]\nRuns explicitly selected local Node tests in the project. Test code has the caller's permissions; this is not a sandbox. Does not install dependencies, infer commands, or attach/approve evidence.";

export function runFunctionalTests(options) {
  const root = resolve(options["project-root"] || ".");
  for (const key of ["artifact", "run"]) if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(options[key] ?? "")) throw new Error(`--${key} must be a safe ID`);
  if (!options.tests?.length || new Set(options.tests).size !== options.tests.length) throw new Error("Explicit unique --test paths are required");
  const timeout = Number(options["timeout-ms"] ?? 120000);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) throw new Error("timeout must be 1000..300000ms");
  const artifact = readStrictJson(safeProjectPath(root, `.styleseed/artifacts/${options.artifact}.json`));
  if (!artifact.validation?.functional?.scenarios?.length) throw new Error("Register required functional scenarios before running tests");
  const manifest = readStrictJson(safeProjectPath(root, `.styleseed/manifests/${options.artifact}.json`));
  verifyManifestFiles(root, manifest);
  const prefix = `.styleseed/evidence/${options.artifact}/${options.run}`;
  const gateRun = readStrictJson(safeProjectPath(root, `${prefix}/gate-run.json`));
  const before = sourceInventory(root, artifact.implementation.sourceRoots);
  if (gateRun.artifactId !== options.artifact || gateRun.runId !== options.run || gateRun.implementation?.inventoryHash !== before.hash || gateRun.validationHash !== manifest.validationHash || gateRun.methodHash !== manifest.methodHash) throw new Error("Initialize a current evidence run before functional tests");
  const files = options.tests.map((path) => {
    const file = containedRegularFile(root, path);
    if (!before.entries.some((entry) => entry.path === path)) throw new Error("Functional tests must be covered by implementation.sourceRoots");
    return file.absolutePath;
  });
  const dir = safeProjectPath(root, `${prefix}/functional`);
  mkdirSync(dir, { mode: 0o700 }); // An existing run is never overwritten.
  const reporter = fileURLToPath(new URL("./functional-reporter.mjs", import.meta.url));
  const testEnv = { ...process.env };
  delete testEnv.NODE_TEST_CONTEXT; // A parent test runner must not suppress this runner's reporter.
  const result = spawnSync(process.execPath, ["--test", `--test-reporter=${reporter}`, "--", ...files], {
    cwd: root, env: testEnv, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024, shell: false,
  });
  writeFileSync(resolve(dir, "events.jsonl"), result.stdout ?? "", { flag: "wx", mode: 0o600 });
  writeFileSync(resolve(dir, "stderr.txt"), result.stderr ?? "", { flag: "wx", mode: 0o600 });
  if (result.error || result.signal) throw new Error(`Functional runner interrupted: ${result.error?.message ?? result.signal}; retained output is incomplete`);
  verifyManifestFiles(root, manifest);
  const after = sourceInventory(root, artifact.implementation.sourceRoots);
  if (after.hash !== before.hash) throw new Error("Implementation or tests changed during execution; no functional report issued");
  const output = containedRegularFile(root, `${prefix}/functional/events.jsonl`, { maxBytes: 8 * 1024 * 1024 });
  const report = {
    runner: "node-test-v1", inventoryHash: before.hash, exitCode: result.status,
    checks: nodeTestChecks(output.content.toString("utf8")),
    output: { path: `${prefix}/functional/events.jsonl`, sha256: output.sha256, bytes: output.bytes },
  };
  validateGateReport(root, "functional", report);
  const reportPath = `${prefix}/functional/report.json`;
  writeFileSync(safeProjectPath(root, reportPath), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  const ok = report.exitCode === 0 && report.checks.every((check) => check.status === "pass") && artifact.validation.functional.scenarios.every((id) => report.checks.some((check) => check.id === id && check.status === "pass"));
  return { ok, reportPath, checks: report.checks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--help") console.log(usage);
    else {
      const options = { tests: [] };
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i].slice(2), value = args[i + 1];
        if (!args[i].startsWith("--") || !["project-root", "artifact", "run", "test", "timeout-ms"].includes(key) || !value || value.startsWith("--")) throw new Error(usage);
        if (key === "test") options.tests.push(value);
        else { if (Object.hasOwn(options, key)) throw new Error(`Duplicate --${key}`); options[key] = value; }
      }
      const result = runFunctionalTests(options);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
