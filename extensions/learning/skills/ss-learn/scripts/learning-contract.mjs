import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCandidatePrivacy, scannerVersion } from "./privacy-scan.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalogPath = resolve(scriptDir, "../../../runtime/catalog.json");
const learningCatalogPath = resolve(scriptDir, "../../../runtime/references/learning-catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let learningCatalog = { revision: "sha256:unbuilt", contractVersion: 2, scannerVersion };
try { learningCatalog = JSON.parse(readFileSync(learningCatalogPath, "utf8")); } catch { /* generated during packaging */ }

export const learningContractVersion = 2;
export const learningRevision = learningCatalog.revision;
// Cryptographic identities must not depend on object insertion order. Pretty JSON remains a storage
// concern in secure-fs; hashes use the canonical recursive key order shared with the core runtime.
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}
export const stable = (value) => `${canonicalJson(value)}\n`;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) throw new Error(`${label} contains forbidden fields: ${extra.join(", ")}`);
}

function boundedText(value, label, min, max) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label} must be ${min}-${max} characters.`);
  return value.trim();
}

function textArray(value, label) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new Error(`${label} must contain 1-8 items.`);
  return value.map((item, index) => boundedText(item, `${label}[${index}]`, 4, 180));
}

function contextId(group, value, label, allowNone = false) {
  if (allowNone && value === "none") return value;
  if (!catalog[group]?.[value]) throw new Error(`Unknown ${label} "${value}".`);
  return value;
}

function score(value, label) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error(`${label} must be null or an integer from 0 to 100.`);
  return value;
}

export function normalizeCandidate(input) {
  exactKeys(input, ["schemaVersion", "title", "context", "learning", "evidence"], "candidate");
  if (input.schemaVersion !== 1) throw new Error("candidate.schemaVersion must be 1.");
  exactKeys(input.context, ["grammar", "adapter", "domain", "page", "recipe", "palette", "profile"], "candidate.context");
  exactKeys(input.learning, ["problem", "intervention", "rationale", "appliesWhen", "avoidWhen"], "candidate.learning");
  exactKeys(input.evidence, ["beforeScore", "afterScore", "visualVerification", "repeatCount", "artifactHashes"], "candidate.evidence");
  const normalized = {
    schemaVersion: 1,
    title: boundedText(input.title, "candidate.title", 8, 120),
    context: {
      grammar: contextId("grammars", input.context.grammar, "grammar"),
      adapter: contextId("adapters", input.context.adapter, "adapter"),
      domain: contextId("domains", input.context.domain, "domain", true),
      page: contextId("pages", input.context.page, "page", true),
      recipe: contextId("recipes", input.context.recipe, "recipe"),
      palette: contextId("palettes", input.context.palette, "palette"),
      profile: contextId("profiles", input.context.profile, "profile", true),
    },
    learning: {
      problem: boundedText(input.learning.problem, "candidate.learning.problem", 12, 600),
      intervention: boundedText(input.learning.intervention, "candidate.learning.intervention", 12, 600),
      rationale: boundedText(input.learning.rationale, "candidate.learning.rationale", 12, 600),
      appliesWhen: textArray(input.learning.appliesWhen, "candidate.learning.appliesWhen"),
      avoidWhen: textArray(input.learning.avoidWhen, "candidate.learning.avoidWhen"),
    },
    evidence: {
      beforeScore: score(input.evidence.beforeScore, "candidate.evidence.beforeScore"),
      afterScore: score(input.evidence.afterScore, "candidate.evidence.afterScore"),
      visualVerification: input.evidence.visualVerification,
      repeatCount: input.evidence.repeatCount,
      artifactHashes: input.evidence.artifactHashes,
    },
  };
  if (!["verified", "failed", "not-run"].includes(normalized.evidence.visualVerification)) throw new Error("Invalid visualVerification.");
  if (!Number.isInteger(normalized.evidence.repeatCount) || normalized.evidence.repeatCount < 1 || normalized.evidence.repeatCount > 1000) throw new Error("repeatCount must be 1-1000.");
  if (!Array.isArray(normalized.evidence.artifactHashes) || normalized.evidence.artifactHashes.length > 12 || normalized.evidence.artifactHashes.some((item) => !/^sha256:[0-9a-f]{64}$/.test(item))) throw new Error("artifactHashes must contain at most 12 sha256 digests.");
  if (normalized.evidence.afterScore !== null && normalized.evidence.beforeScore === null) throw new Error("afterScore requires a measured beforeScore.");
  assertCandidatePrivacy(normalized);
  return normalized;
}

export function deriveCandidateId(candidate) {
  const normalized = normalizeCandidate(candidate);
  const contentHash = sha256(stable(normalized));
  const slug = normalized.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "design-learning";
  return `${slug}-${contentHash.slice(0, 12)}`;
}

export function contentHashFor(candidate) { return `sha256:${sha256(stable(normalizeCandidate(candidate)))}`; }

export function recordHashFor({ recordSchemaVersion = 2, id, candidate, engine, privacy }) {
  return `sha256:${sha256(stable({ recordSchemaVersion, id, candidate, engine, privacy }))}`;
}

export function reviewHashFor(recordHash, review) {
  return `sha256:${sha256(stable({ recordHash, review }))}`;
}

export function isLegacyCandidateRecord(record) {
  return Boolean(record && typeof record === "object" && record.recordSchemaVersion === undefined && record.schemaVersion === 1 && typeof record.id === "string");
}

function candidateFromRecord(record) {
  return {
    schemaVersion: record.schemaVersion,
    title: record.title,
    context: record.context,
    learning: record.learning,
    evidence: record.evidence,
  };
}

export function verifyCandidateRecord(record, { expectedId, sourcePath } = {}) {
  if (isLegacyCandidateRecord(record)) throw new Error("Legacy candidate record requires re-capture and cannot be reviewed or exported.");
  if (!record || typeof record !== "object" || record.recordSchemaVersion !== 2) throw new Error("Unsupported candidate record schema.");
  const candidate = normalizeCandidate(candidateFromRecord(record));
  const derivedId = deriveCandidateId(candidate);
  const fileId = sourcePath ? basename(sourcePath).replace(/\.json$/u, "") : undefined;
  if (expectedId && expectedId !== record.id) throw new Error("Request ID does not match candidate record ID.");
  if (fileId && fileId !== record.id) throw new Error("Candidate filename does not match its record ID.");
  if (record.id !== derivedId) throw new Error("Candidate record ID is not derived from its normalized content.");
  const expectedContentHash = contentHashFor(candidate);
  if (record.contentHash !== expectedContentHash) throw new Error("Candidate content no longer matches its capture hash.");
  exactKeys(record.engine, ["version", "revision", "learningContractVersion", "learningRevision"], "candidate.engine");
  if (typeof record.engine.version !== "string" || !record.engine.version.trim() || !/^sha256:[0-9a-f]{64}$/.test(record.engine.revision)) throw new Error("Candidate engine provenance is invalid.");
  if (record.engine.learningContractVersion !== 2 || record.engine.learningRevision !== learningRevision) throw new Error("Candidate learning provenance is stale or invalid.");
  exactKeys(record.privacy, ["rawMaterialIntended", "networkTransmission", "scannerVersion", "scannerGuarantee"], "candidate.privacy");
  if (record.privacy.rawMaterialIntended !== false || record.privacy.networkTransmission !== false || record.privacy.scannerVersion !== scannerVersion || record.privacy.scannerGuarantee !== "guardrail-only") throw new Error("Candidate privacy metadata is invalid.");
  const expectedRecordHash = recordHashFor({ recordSchemaVersion: 2, id: record.id, candidate, engine: record.engine, privacy: record.privacy });
  if (record.recordHash !== expectedRecordHash) throw new Error("Candidate record no longer matches its provenance hash.");
  if (!Array.isArray(record.reviews) || !["draft", "accepted", "rejected"].includes(record.status)) throw new Error("Candidate review state is invalid.");
  if (record.status === "draft" && (record.reviews.length !== 0 || record.reviewHash !== undefined)) throw new Error("Draft candidate contains unexpected review evidence.");
  if (record.status !== "draft") {
    if (record.reviews.length !== 1 || record.reviews[0].decision !== record.status) throw new Error("Final candidate review state is inconsistent.");
    if (record.reviewHash !== reviewHashFor(record.recordHash, record.reviews[0])) throw new Error("Candidate review no longer matches its decision hash.");
  }
  return record;
}
