#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  containedRegularFile,
  readStrictJson,
  sourceInventory,
  verifyManifestFiles,
} from "./evidence-contract.mjs";
import { verifyEvidenceRun } from "./evidence-gate.mjs";
import { loadProjectRegistry } from "../../ss-resolve/scripts/project-registry.mjs";
import { compileContext, defaultCatalog } from "../../ss-resolve/scripts/compiler.mjs";
import { safeProjectPath } from "../../ss-resolve/scripts/runtime-contract.mjs";

export const DETECTOR_REVISION = "styleseed-check-v1";
const HARD_ID = "SS000";
const RULES = Object.freeze({
  SS001: { name: "hardcoded-color", help: "Use a registered semantic token or theme value." },
  SS002: { name: "arbitrary-pixel-value", help: "Use the selected spacing or sizing token." },
  SS003: { name: "transition-all", help: "Name the property transition explicitly." },
  SS004: { name: "motion-without-reduced-motion", help: "Add a prefers-reduced-motion or useReducedMotion fallback." },
  SS005: { name: "focus-suppression", help: "Provide a visible focus or focus-visible replacement." },
  SS006: { name: "unlabeled-icon-control", help: "Add an aria-label or accessible visible label." },
  [HARD_ID]: { name: "contract-error", help: "Fix the StyleSeed artifact contract or evidence boundary." },
});

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { format: "json" };
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

function safeId(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(value)) fail(`${label} must be a safe ID`);
  return value;
}

function finding(id, file, line, evidence, message, fix, severity = "warning") {
  return { id, file, line, evidence, severity, message, fix };
}

function lineOf(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function lineFindings(content, file, pattern, id, message, fix) {
  const output = [];
  for (const match of content.matchAll(pattern)) {
    const line = lineOf(content, match.index ?? 0);
    output.push(finding(id, file, line, match[0], message, fix));
  }
  return output;
}

function isTokenOrThemeFile(file, tokenFiles) {
  const normalized = file.toLowerCase();
  return tokenFiles.has(file)
    || /(^|\/)(tokens?|theme|themes)(\/|[.-])/u.test(normalized)
    || /(?:\.tokens?|\.theme)\.(?:css|scss|sass|less|json|ts|tsx|js|jsx)$/u.test(normalized);
}

function scanSource(root, artifact, inventory) {
  const tokenFiles = new Set(artifact.implementation?.tokenFiles ?? []);
  const files = [];
  for (const entry of inventory.entries) {
    const actual = containedRegularFile(root, entry.path, { label: `source ${entry.path}`, maxBytes: 512 * 1024 * 1024 });
    let content;
    try { content = actual.content.toString("utf8"); } catch { continue; }
    if (content.includes("\u0000")) continue;
    files.push({ path: entry.path, content, scan: !isTokenOrThemeFile(entry.path, tokenFiles) });
  }

  const findings = [];
  for (const file of files.filter((entry) => entry.scan)) {
    findings.push(...lineFindings(file.content, file.path, /#[0-9a-f]{3,8}\b/giu, "SS001", "Hardcoded color found outside a registered token/theme file.", "Use a semantic color token."));
    findings.push(...lineFindings(file.content, file.path, /(?:\b(?:p|m|gap|space-[xy]|inset|top|right|bottom|left|w|h|min-w|max-w|min-h|max-h)-[^\s"']*\[[^\]]*px\]|\b(?:padding|margin|gap|width|height)\s*:\s*[^;\n]*\b\d+px)/giu, "SS002", "Arbitrary pixel value found in a supported utility or CSS property.", "Use the selected spacing or sizing token."));
    findings.push(...lineFindings(file.content, file.path, /\btransition-all\b/gu, "SS003", "transition-all makes motion scope implicit.", "Name the transitioned properties explicitly."));
    findings.push(...lineFindings(file.content, file.path, /\b(?:outline-none|outline\s*:\s*none)\b/gu, "SS005", "Focus outline is suppressed without a detected replacement.", "Add focus-visible, focus:ring, or another visible replacement."));
    findings.push(...lineFindings(file.content, file.path, /<button\b(?![^>]*(?:aria-label|aria-labelledby|title)=)[^>]*>[^<]*(?:<[A-Z][A-Za-z0-9]*Icon\b|<\w*Icon\b)[^<]*<\/button>/gu, "SS006", "High-confidence icon-only control has no accessible label.", "Add aria-label or a visible text label."));
  }

  const motionFile = files.find((entry) => /\b(?:transition|animate-|motion\.|framer-motion|@keyframes)\b/u.test(entry.content));
  const reducedMotion = files.some((entry) => /prefers-reduced-motion|useReducedMotion|reducedMotion/u.test(entry.content));
  if (motionFile && !reducedMotion) {
    const match = motionFile.content.match(/\b(?:transition|animate-|motion\.|framer-motion|@keyframes)\b/u);
    findings.push(finding("SS004", motionFile.path, lineOf(motionFile.content, match?.index ?? 0), match?.[0] ?? "motion", "Motion was detected without a reduced-motion handling path in the declared source set.", "Add prefers-reduced-motion or useReducedMotion handling."));
  }

  return findings.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.id.localeCompare(right.id) || left.evidence.localeCompare(right.evidence));
}

function hardFinding(file, message, evidence = "") {
  return finding(HARD_ID, file, 1, evidence, message, "Fix the contract, path, or hash before relying on this check.", "error");
}

function validateManifest(root, artifactId, registry) {
  const manifestPath = safeProjectPath(root, `.styleseed/manifests/${artifactId}.json`);
  if (!existsSync(manifestPath)) throw new Error(`missing artifact manifest: .styleseed/manifests/${artifactId}.json`);
  const manifest = readStrictJson(manifestPath);
  if (manifest.schemaVersion !== 2 || manifest.artifactId !== artifactId) throw new Error("artifact manifest is invalid or legacy");
  verifyManifestFiles(root, manifest);
  let compiled;
  try {
    const artifactEntry = registry.artifactMap.get(artifactId);
    compiled = compileContext({
      catalog: defaultCatalog,
      projectRoot: root,
      agent: registry.project.defaults.agent,
      normalizedProject: registry.project,
      normalizedArtifact: registry.artifactMap.get(artifactId).artifact,
      inputFiles: {
        project: { path: ".styleseed/project.json", content: readFileSync(registry.paths.projectFile, "utf8") },
        artifact: { path: artifactEntry.relativePath, content: readFileSync(artifactEntry.path, "utf8") },
      },
      mode: "registry",
    });
  } catch (error) { throw new Error(`artifact manifest cannot be recompiled: ${error.message}`); }
  if (compiled.manifest.methodHash !== manifest.methodHash) throw new Error("artifact manifest method hash is stale");
  if (compiled.manifest.validationHash !== manifest.validationHash) throw new Error("artifact manifest validation hash is stale");
  if (compiled.manifest.bundle.sha256 !== manifest.bundle?.sha256 || compiled.manifest.bundle.bytes !== manifest.bundle?.bytes) throw new Error("artifact manifest bundle declaration is stale");
  return manifest;
}

function scanArtifact(root, artifactId) {
  const findings = [];
  let registry;
  try { registry = loadProjectRegistry(root, { catalog: defaultCatalog }); } catch (error) {
    return { detectorRevision: DETECTOR_REVISION, inventoryHash: sha256(""), findings: [hardFinding(".styleseed/artifacts/index.json", error.message)] };
  }
  if (!registry) return { detectorRevision: DETECTOR_REVISION, inventoryHash: sha256(""), findings: [hardFinding(".styleseed/project.json", "StyleSeed registry is missing.")] };
  const entry = registry.artifactMap.get(artifactId);
  if (!entry) return { detectorRevision: DETECTOR_REVISION, inventoryHash: sha256(""), findings: [hardFinding(".styleseed/artifacts/index.json", `Unknown artifact: ${artifactId}`)] };
  let manifest;
  try { manifest = validateManifest(root, artifactId, registry); } catch (error) {
    findings.push(hardFinding(`.styleseed/manifests/${artifactId}.json`, error.message));
  }
  let inventory;
  try { inventory = sourceInventory(root, entry.artifact.implementation.sourceRoots); } catch (error) {
    findings.push(hardFinding(entry.relativePath, error.message));
  }
  if (!inventory) return { detectorRevision: DETECTOR_REVISION, inventoryHash: sha256(""), findings };
  findings.push(...scanSource(root, entry.artifact, inventory));
  // A manifest failure is still represented in the stable deterministic report; warnings remain useful.
  if (manifest && manifest.artifactId !== artifactId) findings.push(hardFinding(`.styleseed/manifests/${artifactId}.json`, "Manifest artifact ID does not match the requested artifact."));
  return { detectorRevision: DETECTOR_REVISION, inventoryHash: inventory.hash, findings };
}

function sarif(report) {
  const ruleIds = [...new Set(report.findings.map((item) => item.id))].sort();
  return {
    "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "StyleSeed deterministic check", version: DETECTOR_REVISION, rules: ruleIds.map((id) => ({ id, name: RULES[id]?.name ?? "diagnostic", help: { text: RULES[id]?.help ?? "Fix this diagnostic." } })) } },
      results: report.findings.map((item) => ({
        ruleId: item.id,
        level: item.severity === "error" ? "error" : "warning",
        message: { text: `${item.message} Fix: ${item.fix}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: item.file }, region: { startLine: item.line } } }],
        properties: { evidence: item.evidence, severity: item.severity, fix: item.fix },
      })),
    }],
  };
}

function writeOutput(root, outputPath, value) {
  if (!outputPath) return;
  const target = safeProjectPath(root, outputPath);
  const parent = resolve(target, "..");
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  if (existsSync(target)) {
    const stats = lstatSync(target);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) fail(`refusing unsafe output path: ${outputPath}`);
  }
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  renameSync(temp, target);
}

function verifyCommand(root, options) {
  if (!options.artifact || !options.run) fail("verify requires --artifact and --run");
  return verifyEvidenceRun({ projectRoot: root, artifactId: safeId(options.artifact, "--artifact"), runId: safeId(options.run, "--run") });
}

function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  const root = projectRoot(options);
  if (command === "verify") {
    const result = verifyCommand(root, options);
    const output = options.format === "sarif" ? sarif({ findings: result.errors.map((message) => hardFinding(".styleseed/evidence", message)) }) : result;
    writeOutput(root, options.out, output);
    console.log(JSON.stringify(output, null, 2));
    return result.ok ? 0 : 2;
  }
  if (command !== "scan") fail("command must be scan or verify");
  if (options.format !== "json" && options.format !== "sarif") fail("--format must be json or sarif");
  let result;
  if (options.all) {
    let registry;
    try { registry = loadProjectRegistry(root, { catalog: defaultCatalog }); } catch (error) { result = { schemaVersion: 1, detectorRevision: DETECTOR_REVISION, artifacts: [{ artifactId: "all", ...scanArtifact(root, "all") }] }; }
    if (registry) result = { schemaVersion: 1, detectorRevision: DETECTOR_REVISION, artifacts: registry.artifacts.map((entry) => ({ artifactId: entry.id, ...scanArtifact(root, entry.id) })) };
    else if (!result) result = { schemaVersion: 1, detectorRevision: DETECTOR_REVISION, artifacts: [{ artifactId: "all", ...scanArtifact(root, "all") }] };
  } else {
    if (!options.artifact) fail("scan requires --artifact or --all");
    const artifactId = safeId(options.artifact, "--artifact");
    result = scanArtifact(root, artifactId);
  }
  const output = options.format === "sarif"
    ? sarif(options.all ? { findings: result.artifacts.flatMap((item) => item.findings) } : result)
    : result;
  writeOutput(root, options.out, output);
  console.log(JSON.stringify(output, null, 2));
  const findings = options.all ? result.artifacts.flatMap((item) => item.findings) : result.findings;
  return findings.some((item) => item.severity === "error") ? 2 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) { console.error(`styleseed check: ${error.message}`); process.exitCode = 2; }
}
