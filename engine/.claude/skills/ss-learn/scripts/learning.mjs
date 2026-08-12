#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(resolve(scriptDir, "../../ss-resolve/references/catalog.json"), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

function parseArgs(argv) {
  const command = argv[0];
  const out = { command };
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (key === "json") { out.json = true; continue; }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  return out;
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) throw new Error(`${label} contains forbidden fields: ${extra.join(", ")}`);
}

function boundedText(value, label, min, max) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new Error(`${label} must be ${min}-${max} characters.`);
  }
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
    if (pattern.test(text)) throw new Error(`Privacy scan rejected ${label}. Generalize the candidate further.`);
  }
}

function requireId(group, value, label, allowNone = false) {
  if (allowNone && value === "none") return value;
  if (!catalog[group]?.[value]) throw new Error(`Unknown ${label} "${value}".`);
  return value;
}

function score(value, label) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error(`${label} must be null or an integer from 0 to 100.`);
  return value;
}

function validateInput(input) {
  exactKeys(input, ["schemaVersion", "title", "context", "learning", "evidence"], "candidate");
  if (input.schemaVersion !== 1) throw new Error("candidate.schemaVersion must be 1.");
  exactKeys(input.context, ["grammar", "adapter", "domain", "page", "recipe", "palette", "profile"], "candidate.context");
  exactKeys(input.learning, ["problem", "intervention", "rationale", "appliesWhen", "avoidWhen"], "candidate.learning");
  exactKeys(input.evidence, ["beforeScore", "afterScore", "visualVerification", "repeatCount", "artifactHashes"], "candidate.evidence");
  const normalized = {
    schemaVersion: 1,
    title: boundedText(input.title, "candidate.title", 8, 120),
    context: {
      grammar: requireId("grammars", input.context.grammar, "grammar"),
      adapter: requireId("adapters", input.context.adapter, "adapter"),
      domain: requireId("domains", input.context.domain, "domain", true),
      page: requireId("pages", input.context.page, "page", true),
      recipe: requireId("recipes", input.context.recipe, "recipe"),
      palette: requireId("palettes", input.context.palette, "palette"),
      profile: requireId("profiles", input.context.profile, "profile", true),
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
  if (normalized.evidence.afterScore !== null && normalized.evidence.beforeScore === null) throw new Error("afterScore requires an actually measured beforeScore.");
  scanPrivacy(normalized);
  return normalized;
}

function learningRoot(projectRoot) { return resolve(projectRoot, ".styleseed/learning"); }
function requireConfig(root) {
  const path = resolve(root, "config.json");
  if (!existsSync(path)) throw new Error("Local learning is not initialized. Run ss-learn init after user approval.");
  const config = JSON.parse(readFileSync(path, "utf8"));
  exactKeys(config, ["schemaVersion", "sharing", "collection"], "config");
  exactKeys(config.sharing, ["enabled", "transport", "allowedPurposes"], "config.sharing");
  exactKeys(config.collection, ["sourceCode", "prompts", "screenshots", "assets", "brandTokens", "personalData"], "config.collection");
  if (config.schemaVersion !== 1 || config.sharing.enabled !== false || config.sharing.transport !== "none" || !Array.isArray(config.sharing.allowedPurposes) || config.sharing.allowedPurposes.length !== 0) {
    throw new Error("v1 requires sharing to remain disabled with transport=none and no allowed purposes.");
  }
  if (Object.values(config.collection).some((value) => value !== false)) throw new Error("v1 requires every raw-material collection flag to remain false.");
  return config;
}
function candidatePath(root, id) {
  if (!/^[a-z0-9][a-z0-9-]{7,80}$/.test(id)) throw new Error("Invalid candidate ID.");
  return resolve(root, "candidates", `${id}.json`);
}

function verifiedRecord(record) {
  const normalized = validateInput({
    schemaVersion: record.schemaVersion,
    title: record.title,
    context: record.context,
    learning: record.learning,
    evidence: record.evidence,
  });
  const expectedHash = `sha256:${sha256(stable(normalized))}`;
  if (record.contentHash !== expectedHash) throw new Error("Candidate content no longer matches its capture hash.");
  if (!record.engine || typeof record.engine.version !== "string" || !record.engine.version.trim() || !/^sha256:[0-9a-f]{64}$/.test(record.engine.revision)) throw new Error("Candidate engine provenance is invalid.");
  const expectedRecordHash = `sha256:${sha256(stable({ candidate: normalized, engine: record.engine }))}`;
  if (record.recordHash !== expectedRecordHash) throw new Error("Candidate record no longer matches its provenance hash.");
  if (!Array.isArray(record.reviews) || !["draft", "accepted", "rejected"].includes(record.status)) throw new Error("Candidate review state is invalid.");
  if (record.status === "draft" && (record.reviews.length !== 0 || record.reviewHash !== undefined)) throw new Error("Draft candidate contains unexpected review evidence.");
  if (record.status !== "draft") {
    if (record.reviews.length !== 1 || record.reviews[0].decision !== record.status) throw new Error("Final candidate review state is inconsistent.");
    const expectedReviewHash = `sha256:${sha256(stable(record.reviews[0]))}`;
    if (record.reviewHash !== expectedReviewHash) throw new Error("Candidate review no longer matches its decision hash.");
  }
  return record;
}

const args = parseArgs(process.argv.slice(2));
if (!args.command || args.command === "help") {
  console.log("Usage: learning.mjs init|capture|list|review|prepare-share [options]");
  process.exit(0);
}
const projectRoot = resolve(args["project-root"] ?? process.cwd());
const root = learningRoot(projectRoot);

if (args.command === "init") {
  mkdirSync(resolve(root, "candidates"), { recursive: true });
  mkdirSync(resolve(root, "share"), { recursive: true });
  const ignorePath = resolve(root, ".gitignore");
  const protectiveIgnore = "*\n!.gitignore\n";
  if (existsSync(ignorePath) && readFileSync(ignorePath, "utf8") !== protectiveIgnore) throw new Error("Refusing to initialize: .styleseed/learning/.gitignore is not the fail-closed local-only policy.");
  if (!existsSync(ignorePath)) writeFileSync(ignorePath, protectiveIgnore);
  const path = resolve(root, "config.json");
  if (!existsSync(path)) {
    writeFileSync(path, stable({
      schemaVersion: 1,
      sharing: { enabled: false, transport: "none", allowedPurposes: [] },
      collection: { sourceCode: false, prompts: false, screenshots: false, assets: false, brandTokens: false, personalData: false },
    }));
  }
  console.log(`StyleSeed local learning initialized: ${path}`);
  process.exit(0);
}

requireConfig(root);

if (args.command === "capture") {
  if (!args.input) throw new Error("capture requires --input <candidate.json>.");
  const normalized = validateInput(JSON.parse(readFileSync(resolve(args.input), "utf8")));
  const contentHash = sha256(stable(normalized));
  const slug = normalized.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "design-learning";
  const id = `${slug}-${contentHash.slice(0, 12)}`;
  const path = candidatePath(root, id);
  if (existsSync(path)) throw new Error(`Candidate already exists: ${id}`);
  const record = {
    ...normalized,
    id,
    status: "draft",
    engine: { version: catalog.engineVersion, revision: catalog.engineRevision },
    privacy: { rawMaterialStored: false, networkTransmission: false, scannerVersion: 1 },
    reviews: [],
    contentHash: `sha256:${contentHash}`,
  };
  record.recordHash = `sha256:${sha256(stable({ candidate: normalized, engine: record.engine }))}`;
  writeFileSync(path, stable(record));
  console.log(JSON.stringify({ status: "captured", id, path, contentHash: record.contentHash }, null, 2));
  process.exit(0);
}

if (args.command === "list") {
  const directory = resolve(root, "candidates");
  const items = readdirSync(directory).filter((name) => name.endsWith(".json")).sort().map((name) => {
    const item = JSON.parse(readFileSync(resolve(directory, name), "utf8"));
    return { id: item.id, title: item.title, status: item.status, visualVerification: item.evidence.visualVerification };
  });
  console.log(JSON.stringify({ schemaVersion: 1, items }, null, 2));
  process.exit(0);
}

if (args.command === "review") {
  if (!args.id || !args.decision || !args.reviewer || !args.reason) throw new Error("review requires --id, --decision, --reviewer, and --reason.");
  if (args.attestation !== "APPROVE_LOCAL_REVIEW") throw new Error("review requires --attestation APPROVE_LOCAL_REVIEW after explicit human approval.");
  if (!["accepted", "rejected"].includes(args.decision)) throw new Error("decision must be accepted or rejected.");
  const path = candidatePath(root, args.id);
  const record = verifiedRecord(JSON.parse(readFileSync(path, "utf8")));
  if (record.status !== "draft" || record.reviews.length !== 0) throw new Error("A candidate can receive only one final decision. Capture a revised candidate instead.");
  const review = {
    decision: args.decision,
    reviewer: boundedText(args.reviewer, "reviewer", 2, 80),
    reason: boundedText(args.reason, "reason", 8, 400),
    reviewedAt: new Date().toISOString(),
    attestation: "APPROVE_LOCAL_REVIEW",
  };
  scanPrivacy(review);
  record.reviews.push(review);
  record.status = args.decision;
  record.reviewHash = `sha256:${sha256(stable(review))}`;
  writeFileSync(path, stable(record));
  console.log(JSON.stringify({ status: record.status, id: record.id, reviews: record.reviews.length }, null, 2));
  process.exit(0);
}

if (args.command === "prepare-share") {
  if (!args.id || !args.purpose) throw new Error("prepare-share requires --id and --purpose.");
  if (args.attestation !== "APPROVE_LOCAL_EXPORT") throw new Error("prepare-share requires --attestation APPROVE_LOCAL_EXPORT after separate human approval.");
  if (!["team-registry", "community-candidate"].includes(args.purpose)) throw new Error("purpose must be team-registry or community-candidate.");
  const path = candidatePath(root, args.id);
  const record = verifiedRecord(JSON.parse(readFileSync(path, "utf8")));
  if (record.status !== "accepted") throw new Error("Only an accepted candidate can be packaged.");
  if (record.reviews.length !== 1 || record.reviews[0].decision !== "accepted") throw new Error("Accepted candidate review evidence is invalid.");
  const payload = {
    schemaVersion: 1,
    kind: "styleseed-learning-share-package",
    purpose: args.purpose,
    candidate: {
      id: record.id,
      title: record.title,
      context: record.context,
      learning: record.learning,
      evidence: record.evidence,
      engine: record.engine,
      contentHash: record.contentHash,
      recordHash: record.recordHash,
    },
    approval: {
      reviewedDecision: "accepted",
      localReviewHash: record.reviewHash,
      exportedAt: new Date().toISOString(),
      attestationHash: `sha256:${sha256("APPROVE_LOCAL_EXPORT")}`,
    },
    transmission: { performed: false, transport: "none" },
  };
  scanPrivacy(payload.candidate);
  const packageHash = `sha256:${sha256(stable(payload))}`;
  const output = { ...payload, packageHash };
  const outputPath = resolve(root, "share", `${record.id}.${args.purpose}.json`);
  if (existsSync(outputPath)) throw new Error("Share package already exists. Keep the first approved package immutable.");
  writeFileSync(outputPath, stable(output));
  console.log(JSON.stringify({ status: "prepared-locally", path: outputPath, packageHash, transmitted: false }, null, 2));
  process.exit(0);
}

throw new Error(`Unknown command: ${args.command}`);
