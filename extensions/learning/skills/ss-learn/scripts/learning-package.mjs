import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCandidate, verifyCandidateRecord, deriveCandidateId, contentHashFor, recordHashFor, stable, sha256, learningRevision, learningContractVersion } from "./learning-contract.mjs";

export { stable, sha256, normalizeCandidate, verifyCandidateRecord, learningRevision, learningContractVersion };

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(resolve(scriptDir, "../../../runtime/catalog.json"), "utf8"));

export function learningPaths(projectRoot) {
  const root = resolve(projectRoot, ".styleseed", "learning");
  return { root, candidatesRoot: resolve(root, "candidates"), shareRoot: resolve(root, "share"), grantsRoot: resolve(root, "mcp-grants"), claimsRoot: resolve(root, "claims"), locksRoot: resolve(root, "locks") };
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in value));
  if (extra.length) throw new Error(`${label} contains forbidden fields: ${extra.join(", ")}`);
  if (missing.length) throw new Error(`${label} is missing fields: ${missing.join(", ")}`);
}

export function verifySharePackage(input) {
  exactKeys(input, ["schemaVersion", "kind", "purpose", "candidate", "approval", "transmission", "packageHash"], "share package");
  if (input.schemaVersion !== 2 || input.kind !== "styleseed-learning-share-package") throw new Error("Unsupported share package.");
  if (!["team-registry", "community-candidate"].includes(input.purpose)) throw new Error("Invalid share purpose.");
  exactKeys(input.candidate, ["id", "title", "context", "learning", "evidence", "engine", "privacy", "contentHash", "recordHash", "learningRevision"], "share package candidate");
  exactKeys(input.candidate.engine, ["version", "revision", "learningContractVersion", "learningRevision"], "share package engine");
  exactKeys(input.candidate.privacy, ["rawMaterialIntended", "networkTransmission", "scannerVersion", "scannerGuarantee"], "share package privacy");
  exactKeys(input.approval, ["reviewedDecision", "localReviewHash", "exportedAt"], "share package approval");
  exactKeys(input.transmission, ["performed", "transport"], "share package transmission");
  const normalized = normalizeCandidate({ schemaVersion: 1, title: input.candidate.title, context: input.candidate.context, learning: input.candidate.learning, evidence: input.candidate.evidence });
  if (input.candidate.learningRevision !== learningRevision) throw new Error("Share package learning revision is stale.");
  if (deriveCandidateId(normalized) !== input.candidate.id) throw new Error("Share package candidate ID is not derived from its content.");
  if (contentHashFor(normalized) !== input.candidate.contentHash) throw new Error("Share package candidate content hash is invalid.");
  const expectedRecordHash = recordHashFor({ recordSchemaVersion: 2, id: input.candidate.id, candidate: normalized, engine: input.candidate.engine, privacy: input.candidate.privacy });
  if (expectedRecordHash !== input.candidate.recordHash) throw new Error("Share package candidate record hash is invalid.");
  if (input.approval.reviewedDecision !== "accepted" || !/^sha256:[0-9a-f]{64}$/.test(input.approval.localReviewHash) || Number.isNaN(Date.parse(input.approval.exportedAt))) throw new Error("Invalid package approval evidence.");
  if (input.transmission.performed !== false || input.transmission.transport !== "none") throw new Error("Only an untransmitted local package can be granted to MCP.");
  const payload = { ...input };
  delete payload.packageHash;
  const packageHash = `sha256:${sha256(stable(payload))}`;
  if (input.packageHash !== packageHash) throw new Error("Share package hash does not match its content.");
  return input;
}

export function grantFileName(packageHash) {
  if (!/^sha256:[0-9a-f]{64}$/.test(packageHash)) throw new Error("Invalid package hash.");
  return `${packageHash.slice(7)}.json`;
}
