import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return value.split(sep).join("/");
}

function isSafeDistributionPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (value.startsWith("/") || value.startsWith("../") || value === "..") return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function resolveDistributionRoot(scriptPath) {
  return resolve(dirname(scriptPath), "..", "..", "..", "..", "..");
}

function resolveContainedPath(root, relativePath) {
  if (!isSafeDistributionPath(relativePath)) {
    throw new Error(`Invalid distribution path: ${relativePath}`);
  }
  const absolutePath = resolve(root, relativePath);
  const normalizedRoot = normalizePath(root);
  const normalizedAbsolute = normalizePath(absolutePath);
  if (normalizedAbsolute !== normalizedRoot && !normalizedAbsolute.startsWith(`${normalizedRoot}/`)) {
    throw new Error(`Distribution path escapes root: ${relativePath}`);
  }
  let current = root;
  for (const part of relativePath.split("/")) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Distribution path traverses a symlink: ${relativePath}`);
    }
  }
  return absolutePath;
}

function compareByPath(left, right) {
  if (left.path < right.path) return -1;
  if (left.path > right.path) return 1;
  return 0;
}

export function getCoreDistribution(catalog) {
  const distribution = catalog?.distributions?.core;
  if (
    !distribution
    || typeof distribution.revision !== "string"
    || !/^sha256:[0-9a-f]{64}$/u.test(distribution.revision)
    || !Array.isArray(distribution.files)
  ) {
    throw new Error("Installed catalog does not expose a verifiable distributions.core inventory");
  }
  return distribution;
}

export function verifyDistribution({ catalog, scriptPath }) {
  const distribution = getCoreDistribution(catalog);
  if (typeof scriptPath !== "string" || scriptPath.length === 0) {
    throw new Error("verifyDistribution requires scriptPath");
  }

  const root = resolveDistributionRoot(scriptPath);
  const files = distribution.files.map((entry, index) => {
    if (
      !entry
      || typeof entry.path !== "string"
      || !/^([0-9a-f]{64})$/u.test(entry.sha256 ?? "")
      || !Number.isInteger(entry.bytes)
      || entry.bytes < 0
    ) {
      throw new Error(`Invalid distribution file entry at index ${index}`);
    }
    return {
      path: entry.path,
      sha256: entry.sha256,
      bytes: entry.bytes,
    };
  });

  const sorted = [...files].sort(compareByPath);
  for (let index = 0; index < files.length; index += 1) {
    if (files[index].path !== sorted[index].path) {
      throw new Error(`Distribution file inventory is not sorted by path: ${files[index].path}`);
    }
    if (index > 0 && files[index - 1].path === files[index].path) {
      throw new Error(`Distribution file inventory contains a duplicate path: ${files[index].path}`);
    }
  }

  const actualDigests = [];
  const mismatches = [];
  for (const file of files) {
    const absolutePath = resolveContainedPath(root, file.path);
    if (!existsSync(absolutePath)) {
      mismatches.push({ path: file.path, reason: "missing" });
      continue;
    }
    const stats = lstatSync(absolutePath);
    if (!stats.isFile()) {
      mismatches.push({ path: file.path, reason: "not-a-regular-file" });
      continue;
    }
    if (stats.nlink !== 1) {
      mismatches.push({ path: file.path, reason: "link-count-mismatch", actualLinks: stats.nlink });
      continue;
    }
    const content = readFileSync(absolutePath);
    const actualBytes = stats.size;
    const actualSha256 = sha256(content);
    actualDigests.push({ path: file.path, sha256: actualSha256 });
    if (actualBytes !== file.bytes || actualSha256 !== file.sha256) {
      mismatches.push({
        path: file.path,
        reason: actualBytes !== file.bytes ? "bytes-mismatch" : "sha256-mismatch",
        expectedBytes: file.bytes,
        actualBytes,
        expectedSha256: file.sha256,
        actualSha256,
      });
    }
  }

  const computedRevision = `sha256:${sha256(
    actualDigests
      .sort(compareByPath)
      .map((entry) => `${entry.path}\0${entry.sha256}\n`)
      .join(""),
  )}`;

  if (mismatches.some((entry) => entry.reason === "missing")) {
    return { status: "incomplete", computedRevision, mismatches };
  }
  if (computedRevision !== distribution.revision) {
    mismatches.push({
      path: "__distribution_revision__",
      reason: "revision-mismatch",
      expectedRevision: distribution.revision,
      actualRevision: computedRevision,
    });
  }
  if (mismatches.length > 0) {
    return { status: "tampered", computedRevision, mismatches };
  }
  return { status: "verified", computedRevision, mismatches: [] };
}
