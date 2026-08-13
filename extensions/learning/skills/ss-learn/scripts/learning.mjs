#!/usr/bin/env node
import { readFileSync, promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { grantFileName, learningPaths, stable, sha256, normalizeCandidate, verifyCandidateRecord, verifySharePackage, learningRevision } from "./learning-package.mjs";
import { reviewHashFor, deriveCandidateId, contentHashFor, recordHashFor, learningContractVersion } from "./learning-contract.mjs";
import { assertCandidatePrivacy } from "./privacy-scan.mjs";
import { assertDirectChild, openLearningRoot, readJsonNoFollow, readTextNoFollow, replaceJsonAtomic, writeJsonExclusive, writeTextExclusive } from "./secure-fs.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(resolve(scriptDir, "../../../runtime/catalog.json"), "utf8"));
const missing = (error) => error?.code === "ENOENT";
const bounded = (value, label, min, max) => { if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label} must be ${min}-${max} characters.`); return value.trim(); };
function parseArgs(argv) { const out = { command: argv[0] }; for (let i = 1; i < argv.length; i += 1) { const value = argv[i]; if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`); const key = value.slice(2); const next = argv[i + 1]; if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`); out[key] = next; i += 1; } return out; }
function candidatePath(paths, id) { if (!/^[a-z0-9][a-z0-9-]{7,80}$/.test(id)) throw new Error("Invalid candidate ID."); return resolve(paths.candidatesRoot, `${id}.json`); }
async function requireConfig(paths) { let config; try { config = await readJsonNoFollow(resolve(paths.root, "config.json"), { root: paths.root }); } catch (error) { if (missing(error)) throw new Error("Local learning is not initialized. Run ss-learn init after user approval."); throw error; } if (config.schemaVersion !== 1 || config.sharing?.enabled !== false || config.sharing?.transport !== "none" || config.sharing?.allowedPurposes?.length !== 0 || Object.values(config.collection ?? {}).some((value) => value !== false)) throw new Error("v1 requires sharing disabled and all raw-material collection flags false."); }
async function readRecord(paths, id) { const path = candidatePath(paths, id); const record = await readJsonNoFollow(path, { root: paths.candidatesRoot }); return { path, record: verifyCandidateRecord(record, { expectedId: id, sourcePath: path }) }; }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === "help") { console.log("Usage: learning.mjs init|capture|list|review|prepare-share|grant-mcp-read [options]"); return; }
  const projectRoot = resolve(args["project-root"] ?? process.cwd());
  const paths = learningPaths(projectRoot);
  if (args.command === "init") {
    const opened = await openLearningRoot(projectRoot);
    const ignore = resolve(opened.root, ".gitignore"); const policy = "*\n!.gitignore\n";
    const existing = await readTextNoFollow(ignore, { root: opened.root, maxBytes: 64 }).catch((error) => { if (missing(error)) return null; throw error; });
    if (existing !== null && existing !== policy) throw new Error("Refusing to initialize: .styleseed/learning/.gitignore is not fail-closed.");
    if (existing === null) await writeTextExclusive(ignore, policy);
    const configPath = resolve(opened.root, "config.json");
    try { await readJsonNoFollow(configPath, { root: opened.root }); } catch (error) { if (!missing(error)) throw error; await writeJsonExclusive(configPath, { schemaVersion: 1, sharing: { enabled: false, transport: "none", allowedPurposes: [] }, collection: { sourceCode: false, prompts: false, screenshots: false, assets: false, brandTokens: false, personalData: false } }); }
    console.log(`StyleSeed local learning initialized: ${configPath}`); return;
  }
  await requireConfig(paths);
  if (args.command === "capture") {
    if (!args.input) throw new Error("capture requires --input <candidate.json>.");
    const candidate = normalizeCandidate(JSON.parse(await fs.readFile(resolve(args.input), "utf8")));
    const id = deriveCandidateId(candidate); const path = candidatePath(paths, id);
    const engine = { version: catalog.engineVersion, revision: catalog.engineRevision, learningContractVersion, learningRevision };
    const privacy = { rawMaterialIntended: false, networkTransmission: false, scannerVersion: 2, scannerGuarantee: "guardrail-only" };
    const record = { recordSchemaVersion: 2, ...candidate, id, status: "draft", engine, privacy, reviews: [], contentHash: contentHashFor(candidate) };
    record.recordHash = recordHashFor({ recordSchemaVersion: 2, id, candidate, engine, privacy });
    try { await writeJsonExclusive(path, record); } catch (error) { if (error?.code === "EEXIST") throw new Error(`Candidate already exists: ${id}`); throw error; }
    console.log(JSON.stringify({ status: "captured", id, path, contentHash: record.contentHash }, null, 2)); return;
  }
  if (args.command === "list") {
    const entries = await fs.readdir(paths.candidatesRoot, { withFileTypes: true }).catch((error) => missing(error) ? [] : Promise.reject(error)); const items = [];
    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name))) {
      const sourcePath = resolve(paths.candidatesRoot, entry.name); let item;
      try { item = verifyCandidateRecord(await readJsonNoFollow(sourcePath, { root: paths.candidatesRoot }), { sourcePath }); } catch (error) { const raw = await readJsonNoFollow(sourcePath, { root: paths.candidatesRoot }); if (raw?.recordSchemaVersion === undefined) items.push({ id: entry.name.replace(/\.json$/u, ""), status: "needs-recapture" }); else throw error; }
      if (item) items.push({ id: item.id, title: item.title, status: item.status, visualVerification: item.evidence.visualVerification });
    }
    console.log(JSON.stringify({ schemaVersion: 2, items }, null, 2)); return;
  }
  if (args.command === "review") {
    if (!args.id || !args.decision || !args.reviewer || !args.reason) throw new Error("review requires --id, --decision, --reviewer, and --reason.");
    if (args.attestation !== "APPROVE_LOCAL_REVIEW") throw new Error("review requires --attestation APPROVE_LOCAL_REVIEW after explicit human approval.");
    if (!["accepted", "rejected"].includes(args.decision)) throw new Error("decision must be accepted or rejected.");
    const { path, record } = await readRecord(paths, args.id); if (record.status !== "draft") throw new Error("A candidate can receive only one final decision.");
    const review = { decision: args.decision, reviewer: bounded(args.reviewer, "reviewer", 2, 80), reason: bounded(args.reason, "reason", 8, 400), reviewedAt: new Date().toISOString(), attestation: "APPROVE_LOCAL_REVIEW" }; assertCandidatePrivacy({ title: review.reason, learning: { problem: review.reason, intervention: review.reason, rationale: review.reason, appliesWhen: [review.reason], avoidWhen: [review.reason] } });
    const expected = `sha256:${sha256(stable(await readJsonNoFollow(path, { root: paths.candidatesRoot })) )}`; record.reviews = [review]; record.status = args.decision; record.reviewHash = reviewHashFor(record.recordHash, review); await replaceJsonAtomic(path, expected, record); console.log(JSON.stringify({ status: record.status, id: record.id, reviews: 1 }, null, 2)); return;
  }
  if (args.command === "prepare-share") {
    if (!args.id || !args.purpose || args.attestation !== "APPROVE_LOCAL_EXPORT") throw new Error("prepare-share requires --id, --purpose, and explicit local export approval.");
    const { record } = await readRecord(paths, args.id); if (record.status !== "accepted") throw new Error("Only an accepted candidate can be packaged.");
    const payload = { schemaVersion: 2, kind: "styleseed-learning-share-package", purpose: args.purpose, candidate: { id: record.id, title: record.title, context: record.context, learning: record.learning, evidence: record.evidence, engine: record.engine, privacy: record.privacy, contentHash: record.contentHash, recordHash: record.recordHash, learningRevision }, approval: { reviewedDecision: "accepted", localReviewHash: record.reviewHash, exportedAt: new Date().toISOString() }, transmission: { performed: false, transport: "none" } }; const output = { ...payload, packageHash: `sha256:${sha256(stable(payload))}` }; const outputPath = resolve(paths.shareRoot, `${record.id}.${args.purpose}.json`); try { await writeJsonExclusive(outputPath, output); } catch (error) { if (error?.code === "EEXIST") throw new Error("Share package already exists."); throw error; } console.log(JSON.stringify({ status: "prepared-locally", path: outputPath, packageHash: output.packageHash, transmitted: false }, null, 2)); return;
  }
  if (args.command === "grant-mcp-read") {
    if (!args.package || args.attestation !== "APPROVE_MCP_READ") throw new Error("grant-mcp-read requires --package and explicit MCP approval.");
    const packagePath = await assertDirectChild(paths.shareRoot, args.package, ".json"); const share = verifySharePackage(await readJsonNoFollow(packagePath, { root: paths.shareRoot })); const { record: candidate } = await readRecord(paths, share.candidate.id); if (candidate.status !== "accepted" || candidate.reviewHash !== share.approval.localReviewHash || candidate.recordHash !== share.candidate.recordHash) throw new Error("Share package no longer matches its accepted local candidate and review.");
    const grant = { schemaVersion: 1, kind: "styleseed-mcp-read-grant", packageHash: share.packageHash, candidateId: share.candidate.id, purpose: share.purpose, usesRemaining: 1, clientExposureAcknowledged: true, createdAt: new Date().toISOString(), attestationHash: `sha256:${sha256("APPROVE_MCP_READ")}` }; const grantPath = resolve(paths.grantsRoot, grantFileName(share.packageHash)); try { await writeJsonExclusive(grantPath, grant); } catch (error) { if (error?.code === "EEXIST") throw new Error("An unconsumed MCP grant already exists for this package."); throw error; } console.log(JSON.stringify({ status: "mcp-read-granted-once", packageHash: share.packageHash, grantPath, usesRemaining: 1, disclosure: "The approved package may now be returned once to the connected MCP client and its model." }, null, 2)); return;
  }
  throw new Error(`Unknown command: ${args.command}`);
}
main().catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exit(1); });
