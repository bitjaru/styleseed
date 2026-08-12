import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(resolve(scriptDir, "../../ss-resolve/references/catalog.json"), "utf8"));

export const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in value));
  if (extra.length) throw new Error(`${label} contains forbidden fields: ${extra.join(", ")}`);
  if (missing.length) throw new Error(`${label} is missing fields: ${missing.join(", ")}`);
}

function boundedText(value, label, min, max) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label} must be ${min}-${max} characters.`);
  return value.trim();
}

function textArray(value, label) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new Error(`${label} must contain 1-8 items.`);
  return value.map((item, index) => boundedText(item, `${label}[${index}]`, 4, 180));
}

function scanPrivacy(value) {
  const text = JSON.stringify(value);
  const checks = [
    [/```|\b(import|export)\s+.+\bfrom\b|className\s*=|<\/?[A-Za-z][^>]*>/i, "source code or markup"],
    [/https?:\/\/|www\./i, "URL"],
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "email address"],
    [/(?:^|[\s"'])\/(?:Users|home|private|var|tmp|workspace)\/|[A-Za-z]:\\/i, "absolute filesystem path"],
    [/(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|xox[baprs]-|AKIA[0-9A-Z]{12,})/i, "credential-like token"],
    [/(?:^|[^A-Za-z0-9])#[0-9a-fA-F]{3,8}(?:[^A-Za-z0-9]|$)/, "brand or key color"],
    [/\b(repository|repo name|client name|company name|user name|font family|raw prompt|screenshot path)\b/i, "project identity or raw material"],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(text)) throw new Error(`Privacy scan rejected ${label}.`);
  }
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
  scanPrivacy(normalized);
  return normalized;
}

export function verifySharePackage(input) {
  exactKeys(input, ["schemaVersion", "kind", "purpose", "candidate", "approval", "transmission", "packageHash"], "share package");
  if (input.schemaVersion !== 1 || input.kind !== "styleseed-learning-share-package") throw new Error("Unsupported share package.");
  if (!["team-registry", "community-candidate"].includes(input.purpose)) throw new Error("Invalid share purpose.");
  exactKeys(input.candidate, ["id", "title", "context", "learning", "evidence", "engine", "contentHash", "recordHash"], "share package candidate");
  exactKeys(input.candidate.engine, ["version", "revision"], "share package engine");
  exactKeys(input.approval, ["reviewedDecision", "localReviewHash", "exportedAt", "attestationHash"], "share package approval");
  exactKeys(input.transmission, ["performed", "transport"], "share package transmission");
  const normalized = normalizeCandidate({
    schemaVersion: 1,
    title: input.candidate.title,
    context: input.candidate.context,
    learning: input.candidate.learning,
    evidence: input.candidate.evidence,
  });
  if (!/^[a-z0-9][a-z0-9-]{7,80}$/.test(input.candidate.id)) throw new Error("Invalid candidate ID.");
  if (typeof input.candidate.engine.version !== "string" || !input.candidate.engine.version.trim() || !/^sha256:[0-9a-f]{64}$/.test(input.candidate.engine.revision)) throw new Error("Invalid engine provenance.");
  const contentHash = `sha256:${sha256(stable(normalized))}`;
  const recordHash = `sha256:${sha256(stable({ candidate: normalized, engine: input.candidate.engine }))}`;
  if (input.candidate.contentHash !== contentHash || input.candidate.recordHash !== recordHash) throw new Error("Candidate hashes do not match the package content.");
  if (input.approval.reviewedDecision !== "accepted" || !/^sha256:[0-9a-f]{64}$/.test(input.approval.localReviewHash) || !/^sha256:[0-9a-f]{64}$/.test(input.approval.attestationHash) || Number.isNaN(Date.parse(input.approval.exportedAt))) throw new Error("Invalid package approval evidence.");
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
