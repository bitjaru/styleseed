#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { constants as fsConstants, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  __testOnlyRejectSpecialNode,
  __testOnlySupportsDirectoryFsync,
  openLearningRoot,
  readJsonNoFollow,
  writeJsonExclusive,
} from "../extensions/learning/skills/ss-learn/scripts/secure-fs.mjs";
import { normalizeCandidate, deriveCandidateId, verifyCandidateRecord, contentHashFor, recordHashFor, reviewHashFor } from "../extensions/learning/skills/ss-learn/scripts/learning-contract.mjs";
import { scanCandidatePrivacy } from "../extensions/learning/skills/ss-learn/scripts/privacy-scan.mjs";

const ALL_TEST_IDS = ["T01", "T02", "T03", "T04", "T05", "T06", "T09a", "T10", "T11"];
function canonicalJson(value) { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`; return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`; }

function parseArgs(argv) {
  const out = { only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--only") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--only requires a comma-separated test ID list.");
      }
      if (out.only !== null) {
        throw new Error("--only may be provided only once.");
      }
      out.only = parseOnly(next);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function parseOnly(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("--only requires a comma-separated test ID list.");
  }
  const selected = [];
  const seen = new Set();
  for (const token of raw.split(",")) {
    if (!token) {
      throw new Error("--only must not contain empty test IDs.");
    }
    if (!ALL_TEST_IDS.includes(token)) {
      throw new Error(`Unknown test ID in --only: ${token}`);
    }
    if (seen.has(token)) {
      throw new Error(`Duplicate test ID in --only: ${token}`);
    }
    seen.add(token);
    selected.push(token);
  }
  return selected;
}

async function assertRejects(label, fn, pattern) {
  await assert.rejects(
    fn,
    (error) => {
      assert.match(String(error?.message ?? error), pattern, `${label} rejected with an unexpected error`);
      return true;
    },
    `${label} should have been rejected`,
  );
}

async function modeOf(path) {
  const stats = await fs.stat(path);
  return stats.mode & 0o777;
}

function makeSpecialNodeShape(kind) {
  return {
    isFile: () => false,
    isSymbolicLink: () => kind === "symlink",
    isFIFO: () => kind === "fifo",
    isSocket: () => kind === "socket",
    isCharacterDevice: () => kind === "char-device",
    isBlockDevice: () => kind === "block-device",
  };
}

async function runT03() {
  assert.equal(__testOnlySupportsDirectoryFsync("win32"), false, "Windows must skip unsupported directory fsync");
  assert.equal(__testOnlySupportsDirectoryFsync("linux"), true, "POSIX hosts must retain directory fsync");

  const sandboxRoot = mkdtempSync("/tmp/ssls-");
  const projectRoot = resolve(sandboxRoot, "project");
  await fs.mkdir(projectRoot, { recursive: true, mode: 0o700 });

  let socketServer = null;
  try {
    const learning = await openLearningRoot(projectRoot);
    assert.equal(await modeOf(resolve(projectRoot, ".styleseed")), 0o700, ".styleseed must be mode 0700");
    assert.equal(await modeOf(learning.root), 0o700, ".styleseed/learning must be mode 0700");
    for (const directory of [learning.candidatesRoot, learning.shareRoot, learning.grantsRoot, learning.claimsRoot, learning.locksRoot]) {
      assert.equal(await modeOf(directory), 0o700, `${directory} must be mode 0700`);
    }

    const goodPath = resolve(learning.candidatesRoot, "good.json");
    await writeJsonExclusive(goodPath, { ok: true });
    assert.equal(await modeOf(goodPath), 0o600, "immutable learning files must be mode 0600");
    assert.deepEqual(await readJsonNoFollow(goodPath, { root: learning.candidatesRoot }), { ok: true });

    const symlinkPath = resolve(learning.candidatesRoot, "symlink.json");
    await fs.symlink("good.json", symlinkPath);
    await assertRejects(
      "symlink input",
      () => readJsonNoFollow(symlinkPath, { root: learning.candidatesRoot }),
      /symbolic links are not allowed/i,
    );

    const hardlinkPath = resolve(learning.candidatesRoot, "hardlink.json");
    await fs.link(goodPath, hardlinkPath);
    await assertRejects(
      "hardlink input",
      () => readJsonNoFollow(hardlinkPath, { root: learning.candidatesRoot }),
      /non-unique linked file/i,
    );

    const fifoPath = resolve(learning.candidatesRoot, "named-pipe.json");
    const mkfifo = spawnSync("mkfifo", [fifoPath], { encoding: "utf8" });
    assert.equal(mkfifo.status, 0, `mkfifo failed\nstdout:\n${mkfifo.stdout}\nstderr:\n${mkfifo.stderr}`);
    await assertRejects(
      "FIFO input",
      () => readJsonNoFollow(fifoPath, { root: learning.candidatesRoot }),
      /fifo nodes are not allowed/i,
    );

    const { createServer } = await import("node:net");
    const socketPath = resolve(learning.candidatesRoot, "socket.json");
    socketServer = createServer();
    try {
      await new Promise((resolveListen, rejectListen) => {
        socketServer.once("error", rejectListen);
        socketServer.listen(socketPath, () => {
          socketServer.off("error", rejectListen);
          resolveListen();
        });
      });
      await assertRejects(
        "socket input",
        () => readJsonNoFollow(socketPath, { root: learning.candidatesRoot }),
        /socket nodes are not allowed/i,
      );
    } catch (error) {
      await new Promise((resolveClose) => socketServer.close(resolveClose));
      socketServer = null;
      assert.throws(
        () => __testOnlyRejectSpecialNode(makeSpecialNodeShape("socket")),
        /socket nodes are not allowed/i,
        `socket unit branch must reject sockets when the host fixture is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const devNullPath = "/dev/null";
    const devNullExists = await fs.access(devNullPath, fsConstants.R_OK).then(() => true).catch(() => false);
    if (devNullExists) {
      await assertRejects(
        "device input",
        () => readJsonNoFollow(devNullPath, { root: "/dev" }),
        /device nodes are not allowed/i,
      );
    } else {
      assert.throws(
        () => __testOnlyRejectSpecialNode(makeSpecialNodeShape("char-device")),
        /device nodes are not allowed/i,
        "device unit branch must reject character devices when no unprivileged fixture exists",
      );
      assert.throws(
        () => __testOnlyRejectSpecialNode(makeSpecialNodeShape("block-device")),
        /device nodes are not allowed/i,
        "device unit branch must reject block devices when no unprivileged fixture exists",
      );
    }
  } finally {
    if (socketServer) {
      await new Promise((resolveClose) => socketServer.close(resolveClose));
    }
    await fs.rm(sandboxRoot, { recursive: true, force: true });
  }
}

function fixture(overrides = {}) {
  return { schemaVersion: 1, title: "Spacing rhythm lesson", context: { grammar: "editorial-reading", adapter: "product-ui", domain: "none", page: "none", recipe: "calm-consumer", palette: "quiet-mineral", profile: "none" }, learning: { problem: "Cards lose rhythm when spacing is arbitrary.", intervention: "Use the same spacing scale for related groups.", rationale: "Repeated intervals make the hierarchy easier to scan.", appliesWhen: ["Dense information surfaces"], avoidWhen: ["Full-bleed expressive artwork"] }, evidence: { beforeScore: 50, afterScore: 80, visualVerification: "verified", repeatCount: 1, artifactHashes: [] }, ...overrides };
}

async function runT01() {
  const root = await openLearningRoot(mkdtempSync("/tmp/ssls-") );
  await assertRejects("path traversal", () => readJsonNoFollow(resolve(root.candidatesRoot, "../../escape.json"), { root: root.candidatesRoot }), /direct child|basename|allowed root/i);
}

async function runT02() {
  const candidate = normalizeCandidate(fixture());
  const id = deriveCandidateId(candidate);
  const record = { recordSchemaVersion: 2, ...candidate, id, status: "draft", engine: { version: "4", revision: `sha256:${"a".repeat(64)}`, learningContractVersion: 2, learningRevision: "sha256:" + "b".repeat(64) }, privacy: { rawMaterialIntended: false, networkTransmission: false, scannerVersion: 2, scannerGuarantee: "guardrail-only" }, reviews: [], contentHash: contentHashFor(candidate) };
  record.recordHash = recordHashFor({ recordSchemaVersion: 2, id, candidate, engine: record.engine, privacy: record.privacy });
  await assert.rejects(() => Promise.resolve().then(() => verifyCandidateRecord(record, { expectedId: `${id}-other` })), /request ID/i);
}

async function runT04() {
  const root = await openLearningRoot(mkdtempSync("/tmp/ssls-")); const path = resolve(root.candidatesRoot, "same.json");
  const results = await Promise.allSettled(Array.from({ length: 2 }, () => writeJsonExclusive(path, { once: true })));
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1, "exactly one immutable create may win");
}

async function runT05() {
  const root = await openLearningRoot(mkdtempSync("/tmp/ssls-")); const path = resolve(root.candidatesRoot, "review.json"); await writeJsonExclusive(path, { state: "draft" });
  const current = await readJsonNoFollow(path, { root: root.candidatesRoot }); const hash = `sha256:${(await import("node:crypto")).createHash("sha256").update(`${canonicalJson(current)}\n`).digest("hex")}`;
  const { replaceJsonAtomic } = await import("../extensions/learning/skills/ss-learn/scripts/secure-fs.mjs");
  const results = await Promise.allSettled([replaceJsonAtomic(path, hash, { state: "final" }), replaceJsonAtomic(path, hash, { state: "other" })]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1, "exactly one review transition may win");
}

async function runT06() {
  const candidate = normalizeCandidate(fixture()); const id = deriveCandidateId(candidate); const engine = { version: "4", revision: `sha256:${"a".repeat(64)}`, learningContractVersion: 2, learningRevision: "sha256:" + "b".repeat(64) }; const privacy = { rawMaterialIntended: false, networkTransmission: false, scannerVersion: 2, scannerGuarantee: "guardrail-only" }; const record = { recordSchemaVersion: 2, ...candidate, id, status: "accepted", engine, privacy, reviews: [{ decision: "accepted", reviewer: "A", reason: "Generalized lesson", reviewedAt: "2026-01-01T00:00:00.000Z", attestation: "APPROVE_LOCAL_REVIEW" }], contentHash: contentHashFor(candidate) }; record.recordHash = recordHashFor({ recordSchemaVersion: 2, id, candidate, engine, privacy }); record.reviewHash = reviewHashFor(record.recordHash, record.reviews[0]); const replay = { ...record, id: `${id}-other` }; await assert.rejects(() => Promise.resolve().then(() => verifyCandidateRecord(replay, { expectedId: replay.id })), /derived|hash|record ID/i);
}

async function runT09a() { await runT06(); }

async function runT10() {
  const cases = [["010-1234-5678", "phone"], ["800101-1234567", "resident-id-like"], ["4111 1111 1111 1111", "card-number"], ["123456789012", "account-like"], ["192.168.0.1", "ip-address"], ["1\u200B92.168.0.1", "ip-address"]];
  for (const [value, code] of cases) { const result = scanCandidatePrivacy(fixture({ title: `Generalized ${value}`, learning: { ...fixture().learning, problem: `Avoid ${value} in examples.` } })); assert(result.findings.some((finding) => finding.code === code || (code === "card-number" && finding.code === "card-number")), `${code} must be blocked`); }
  const safe = scanCandidatePrivacy(fixture()); assert.equal(safe.findings.length, 0, "nearby generic text must remain allowed");
}

async function runT11() {
  const root = await openLearningRoot(mkdtempSync("/tmp/ssls-")); const path = resolve(root.candidatesRoot, "large.json"); await writeJsonExclusive(path, { text: "x".repeat(256 * 1024) }); await assertRejects("oversized JSON", () => readJsonNoFollow(path, { root: root.candidatesRoot, maxBytes: 256 * 1024 }), /maxBytes|exceeds/i);
}

const TESTS = {
  T01: runT01, T02: runT02,
  T03: runT03,
  T04: runT04, T05: runT05, T06: runT06, T09a: runT09a, T10: runT10, T11: runT11,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = args.only ?? ALL_TEST_IDS;
  for (const id of selected) {
    process.stdout.write(`[RUN] ${id}\n`);
    await TESTS[id]();
    process.stdout.write(`[PASS] ${id}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
