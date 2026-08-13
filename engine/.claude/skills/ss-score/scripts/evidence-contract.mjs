import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  parseStrictJson,
  safeProjectPath,
} from "../../ss-resolve/scripts/runtime-contract.mjs";

export const GATES = Object.freeze(["deterministic", "code", "visual", "temporal", "human"]);
export const MAX_REPORT_BYTES = 1024 * 1024;
export const MAX_SOURCE_FILES = 20_000;
export const MAX_SOURCE_BYTES = 512 * 1024 * 1024;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const CONTROL = /[\u0000-\u001f\u007f]/u;

export class EvidenceContractError extends Error {
  constructor(message, code = "invalid-evidence") {
    super(message);
    this.name = "EvidenceContractError";
    this.code = code;
  }
}

function fail(message, code = "invalid-evidence") {
  throw new EvidenceContractError(message, code);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function boundedText(value, label, max = 240) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || CONTROL.test(value)) {
    fail(`${label} must be bounded single-line text`);
  }
  return value;
}

function hash(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(`${label} must be a sha256 digest`);
  return value;
}

function id(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) fail(`${label} must be a safe ID`);
  return value;
}

function projectRelative(value, label) {
  if (typeof value !== "string" || !value || value.length > 240 || CONTROL.test(value) || isAbsolute(value)) {
    fail(`${label} must be project-relative`);
  }
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail(`${label} contains an unsafe segment`);
  return parts.join("/");
}

function exactKeys(value, allowed, label) {
  object(value, label);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) fail(`${label} contains unknown keys: ${extra.join(", ")}`);
  return value;
}

export function readStrictJson(path, { maxBytes = MAX_REPORT_BYTES } = {}) {
  let content;
  try { content = readFileSync(path, "utf8"); } catch (error) { fail(`cannot read ${path}: ${error.message}`, "missing-evidence"); }
  try { return parseStrictJson(content, { maxBytes }); } catch (error) { fail(`${path}: ${error.message}`); }
}

export function containedRegularFile(projectRoot, projectPath, { maxBytes = MAX_MEDIA_BYTES, label = "evidence path" } = {}) {
  const target = safeProjectPath(projectRoot, projectPath);
  if (!existsSync(target)) fail(`${label} does not exist: ${projectPath}`, "missing-evidence");
  let stats;
  try { stats = lstatSync(target); } catch (error) { fail(`${label} cannot be inspected: ${error.message}`); }
  if (!stats.isFile()) fail(`${label} must be a regular file: ${projectPath}`);
  if (stats.isSymbolicLink() || stats.nlink !== 1) fail(`${label} must not be a symlink or hardlink: ${projectPath}`);
  if (stats.size > maxBytes) fail(`${label} exceeds ${maxBytes} bytes: ${projectPath}`);
  const realRoot = realpathSync(resolve(projectRoot));
  const realTarget = realpathSync(target);
  const rel = relative(realRoot, realTarget);
  if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) fail(`${label} escapes project root: ${projectPath}`);
  let fd;
  try {
    fd = openSync(target, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1) fail(`${label} changed to an unsafe file: ${projectPath}`);
    if (opened.size > maxBytes) fail(`${label} exceeds ${maxBytes} bytes: ${projectPath}`);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== bytes.byteLength) fail(`${label} changed while being read: ${projectPath}`);
    return { path: projectPath, absolutePath: target, bytes: bytes.byteLength, sha256: sha256(bytes), content: bytes };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function verifyStoredFile(projectRoot, entry, { maxBytes = MAX_MEDIA_BYTES, label = "stored file" } = {}) {
  exactKeys(entry, ["kind", "path", "sha256", "bytes"], label);
  const path = projectRelative(entry.path, `${label}.path`);
  const expectedHash = hash(entry.sha256, `${label}.sha256`);
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) fail(`${label}.bytes must be a non-negative integer`);
  const actual = containedRegularFile(projectRoot, path, { maxBytes, label });
  if (actual.bytes !== entry.bytes || actual.sha256 !== expectedHash) fail(`${label} digest or byte count mismatch: ${path}`, "tampered-evidence");
  return actual;
}

function walkSource(root, current, records, state) {
  const entries = readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolute = resolve(current, entry.name);
    const relativePath = relative(root, absolute).split(sep).join("/");
    const foldedPath = relativePath.normalize("NFC").toLocaleLowerCase("en-US");
    if (state.caseFolded.has(foldedPath)) fail(`source tree contains a case-colliding path: ${relativePath}`);
    state.caseFolded.add(foldedPath);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) fail(`source tree contains a symlink: ${relativePath}`);
    if (stats.isDirectory()) { walkSource(root, absolute, records, state); continue; }
    if (!stats.isFile() || stats.nlink !== 1) fail(`source tree contains a non-regular or hardlinked file: ${relativePath}`);
    if (state.files >= MAX_SOURCE_FILES) fail(`source file cap exceeded: ${MAX_SOURCE_FILES}`);
    if (state.bytes + stats.size > MAX_SOURCE_BYTES) fail(`source byte cap exceeded: ${MAX_SOURCE_BYTES}`);
    const bytes = readFileSync(absolute);
    state.files += 1;
    state.bytes += bytes.byteLength;
    records.push({ path: relativePath, sha256: sha256(bytes), bytes: bytes.byteLength });
  }
}

export function sourceInventory(projectRoot, sourceRoots) {
  if (!Array.isArray(sourceRoots) || sourceRoots.length < 1) fail("implementation.sourceRoots must not be empty");
  const root = realpathSync(projectRoot);
  const records = [];
  const state = { files: 0, bytes: 0, caseFolded: new Set() };
  const seenRoots = new Set();
  for (const sourceRoot of sourceRoots) {
    const path = projectRelative(sourceRoot, "implementation.sourceRoot");
    if (seenRoots.has(path)) fail(`duplicate source root: ${path}`);
    seenRoots.add(path);
    const absolute = safeProjectPath(root, path);
    if (!existsSync(absolute)) fail(`source root does not exist: ${path}`, "missing-evidence");
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) fail(`source root must be a regular directory or file: ${path}`);
    if (stats.isFile()) {
      if (stats.nlink !== 1) fail(`source root file must not be hardlinked: ${path}`);
      const foldedPath = path.normalize("NFC").toLocaleLowerCase("en-US");
      if (state.caseFolded.has(foldedPath)) fail(`source tree contains a case-colliding path: ${path}`);
      state.caseFolded.add(foldedPath);
      if (state.files >= MAX_SOURCE_FILES) fail(`source file cap exceeded: ${MAX_SOURCE_FILES}`);
      if (state.bytes + stats.size > MAX_SOURCE_BYTES) fail(`source byte cap exceeded: ${MAX_SOURCE_BYTES}`);
      const bytes = readFileSync(absolute);
      state.files += 1; state.bytes += bytes.byteLength;
      records.push({ path, sha256: sha256(bytes), bytes: bytes.byteLength });
    } else walkSource(root, absolute, records, state);
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  const serialized = records.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join("");
  return { files: records.length, bytes: state.bytes, entries: records, hash: sha256(serialized) };
}

function validateEvidenceReference(projectRoot, value, label, { maxBytes = MAX_MEDIA_BYTES } = {}) {
  const path = projectRelative(value.path, `${label}.path`);
  const actual = containedRegularFile(projectRoot, path, { maxBytes, label });
  const expectedHash = hash(value.sha256, `${label}.sha256`);
  if (value.bytes !== undefined && value.bytes !== actual.bytes) fail(`${label}.bytes mismatch: ${path}`, "tampered-evidence");
  if (expectedHash !== actual.sha256) fail(`${label}.sha256 mismatch: ${path}`, "tampered-evidence");
  return actual;
}

function validateFindings(projectRoot, findings, label) {
  if (!Array.isArray(findings)) fail(`${label} must be an array`);
  for (const [index, finding] of findings.entries()) {
    object(finding, `${label}[${index}]`);
    if (finding.path !== undefined) {
      const path = projectRelative(finding.path, `${label}[${index}].path`);
      containedRegularFile(projectRoot, path, { maxBytes: MAX_REPORT_BYTES, label: `${label}[${index}].path` });
    }
  }
}

export function validateGateReport(projectRoot, gate, report) {
  if (!GATES.includes(gate)) fail(`unknown evidence gate: ${gate}`);
  object(report, `${gate} report`);
  if (gate === "deterministic") {
    exactKeys(report, ["detectorRevision", "inventoryHash", "findings"], "deterministic report");
    boundedText(report.detectorRevision, "detectorRevision"); hash(report.inventoryHash, "inventoryHash");
    validateFindings(projectRoot, report.findings, "deterministic.findings");
  } else if (gate === "code") {
    exactKeys(report, ["score", "categories", "evidence", "reviewer"], "code report");
    if (typeof report.score !== "number" || !Number.isFinite(report.score) || report.score < 0 || report.score > 100) fail("code.score must be 0-100");
    exactKeys(report.categories, ["color", "hierarchy", "layout", "surfaces", "states", "motion", "coherence", "distinctiveness"], "code.categories");
    for (const key of Object.keys(report.categories)) if (typeof report.categories[key] !== "number" || report.categories[key] < 0) fail(`code.categories.${key} is invalid`);
    if (!Array.isArray(report.evidence)) fail("code.evidence must be an array");
    for (const [index, evidence] of report.evidence.entries()) {
      object(evidence, `code.evidence[${index}]`);
      if (evidence.path !== undefined) containedRegularFile(projectRoot, projectRelative(evidence.path, `code.evidence[${index}].path`), { maxBytes: MAX_REPORT_BYTES, label: `code.evidence[${index}].path` });
    }
    if (report.reviewer !== null && report.reviewer !== undefined) boundedText(report.reviewer, "code.reviewer");
  } else if (gate === "visual") {
    exactKeys(report, ["inspectionMethod", "renders", "findings"], "visual report");
    boundedText(report.inspectionMethod, "visual.inspectionMethod");
    if (!Array.isArray(report.renders) || report.renders.length < 1) fail("visual.renders must not be empty");
    for (const [index, render] of report.renders.entries()) {
      exactKeys(render, ["id", "state", "viewport", "path", "sha256", "bytes"], `visual.renders[${index}]`);
      id(render.id, `visual.renders[${index}].id`); boundedText(render.state, `visual.renders[${index}].state`);
      exactKeys(render.viewport, ["width", "height"], `visual.renders[${index}].viewport`);
      for (const dimension of ["width", "height"]) if (!Number.isInteger(render.viewport[dimension]) || render.viewport[dimension] < 1 || render.viewport[dimension] > 10000) fail(`visual viewport ${dimension} is invalid`);
      validateEvidenceReference(projectRoot, render, `visual.renders[${index}]`);
    }
    validateFindings(projectRoot, report.findings, "visual.findings");
  } else if (gate === "temporal") {
    exactKeys(report, ["applicability", "scenarios"], "temporal report");
    if (!["required", "not-applicable"].includes(report.applicability)) fail("temporal.applicability is invalid");
    if (!Array.isArray(report.scenarios)) fail("temporal.scenarios must be an array");
    for (const [index, scenario] of report.scenarios.entries()) {
      exactKeys(scenario, ["id", "recordingPath", "recordingSha256", "recordingBytes", "reducedMotion"], `temporal.scenarios[${index}]`);
      id(scenario.id, `temporal.scenarios[${index}].id`); validateEvidenceReference(projectRoot, { path: scenario.recordingPath, sha256: scenario.recordingSha256, bytes: scenario.recordingBytes }, `temporal.scenarios[${index}]`);
      if (!["pass", "fail", "not-applicable"].includes(scenario.reducedMotion)) fail(`temporal.scenarios[${index}].reducedMotion is invalid`);
    }
  } else {
    exactKeys(report, ["decision", "reviewerAlias", "reviewedAt", "evidenceHash", "note"], "acceptance report");
    if (report.decision !== "accepted") fail("acceptance.decision must be accepted");
    boundedText(report.reviewerAlias, "acceptance.reviewerAlias", 80); boundedText(report.reviewedAt, "acceptance.reviewedAt", 80);
    hash(report.evidenceHash, "acceptance.evidenceHash");
    if (typeof report.note !== "string" || !report.note.includes("not authenticated")) fail("acceptance.note must state that the alias is not authenticated");
  }
  return report;
}

export function verifyManifestFiles(projectRoot, manifest) {
  object(manifest, "manifest");
  for (const entry of [...(Array.isArray(manifest.inputs) ? manifest.inputs : []), ...(Array.isArray(manifest.outputs) ? manifest.outputs : []), ...(manifest.bundle ? [manifest.bundle] : [])]) {
    if (!entry?.path) fail("manifest file entry is missing a path");
    const actual = containedRegularFile(projectRoot, projectRelative(entry.path, "manifest.path"), { maxBytes: MAX_SOURCE_BYTES, label: `manifest file ${entry.path}` });
    if (entry.bytes !== actual.bytes || entry.sha256 !== actual.sha256) fail(`manifest file digest mismatch: ${entry.path}`, "tampered-evidence");
  }
}
