import { createHash } from "node:crypto";
import { constants as fsConstants, promises as fs } from "node:fs";
import { dirname, basename, relative, resolve } from "node:path";
function parseStrictJson(text) { return JSON.parse(text); }
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

const JSON_FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const DEFAULT_MAX_BYTES = 256 * 1024;

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ensureStrictBasename(name, suffix) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Path basename is required.");
  }
  if (name !== basename(name) || name === "." || name === "..") {
    throw new Error(`Refusing unsafe basename: ${name}`);
  }
  if (suffix && !name.endsWith(suffix)) {
    throw new Error(`Expected basename to end with ${suffix}.`);
  }
  return name;
}

function assertContained(rootRealPath, targetRealPath) {
  const rel = relative(rootRealPath, targetRealPath);
  if (rel.startsWith("..") || rel === "..") {
    throw new Error("Resolved path escapes the allowed root.");
  }
  if (rel.split(/[\\/]/u).length > 1) {
    throw new Error("Resolved path must be a direct child of the allowed root.");
  }
}

function rejectSpecialNode(stats) {
  if (stats.isFile()) return;
  if (stats.isSymbolicLink()) throw new Error("Symbolic links are not allowed.");
  if (stats.isFIFO()) throw new Error("FIFO nodes are not allowed.");
  if (stats.isSocket()) throw new Error("Socket nodes are not allowed.");
  if (stats.isCharacterDevice?.() || stats.isBlockDevice?.()) throw new Error("Device nodes are not allowed.");
  throw new Error("Only regular files are allowed.");
}

export function __testOnlyRejectSpecialNode(stats) {
  rejectSpecialNode(stats);
}

async function fsyncDirectory(path) {
  const handle = await fs.open(path, fsConstants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function ensureDirectory0700(path) {
  let stats = await fs.lstat(path).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (stats && (stats.isSymbolicLink() || !stats.isDirectory())) {
    throw new Error(`Refusing unsafe learning directory: ${path}`);
  }
  if (!stats) {
    await fs.mkdir(path, { recursive: false, mode: DIR_MODE });
    stats = await fs.lstat(path);
    if (stats.isSymbolicLink() || !stats.isDirectory()) throw new Error(`Refusing unsafe learning directory: ${path}`);
  }
  await fs.chmod(path, DIR_MODE);
}

async function ensureFile0600(path) {
  await fs.chmod(path, JSON_FILE_MODE);
}

export async function openLearningRoot(projectRoot) {
  const realProjectRoot = await fs.realpath(resolve(projectRoot));
  const styleseedRoot = resolve(realProjectRoot, ".styleseed");
  const root = resolve(styleseedRoot, "learning");
  await ensureDirectory0700(styleseedRoot);
  await ensureDirectory0700(root);
  for (const name of ["candidates", "share", "mcp-grants", "claims", "locks"]) {
    await ensureDirectory0700(resolve(root, name));
  }
  const realRoot = await fs.realpath(root);
  const realStyleseedRoot = await fs.realpath(styleseedRoot);
  assertContained(realStyleseedRoot, realRoot);
  return {
    root: realRoot,
    candidatesRoot: resolve(realRoot, "candidates"),
    shareRoot: resolve(realRoot, "share"),
    grantsRoot: resolve(realRoot, "mcp-grants"),
    claimsRoot: resolve(realRoot, "claims"),
    locksRoot: resolve(realRoot, "locks"),
  };
}

export async function assertDirectChild(root, path, suffix) {
  const realRoot = await fs.realpath(root);
  const candidatePath = resolve(path);
  const parentPath = dirname(candidatePath);
  const name = ensureStrictBasename(basename(candidatePath), suffix);
  const realParent = await fs.realpath(parentPath);
  if (realParent !== realRoot) {
    throw new Error("Target must be a direct child of the allowed root.");
  }
  return resolve(realParent, name);
}

export async function readJsonNoFollow(path, { root, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!root) throw new Error("readJsonNoFollow requires { root }.");
  const checkedPath = await assertDirectChild(root, path);
  const entryStats = await fs.lstat(checkedPath);
  rejectSpecialNode(entryStats);
  const handle = await fs.open(checkedPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
  try {
    const stats = await handle.stat();
    rejectSpecialNode(stats);
    if (stats.nlink !== 1) throw new Error("Refusing non-unique linked file.");
    if (stats.size > maxBytes) throw new Error(`File exceeds maxBytes (${maxBytes}).`);
    const realPath = await fs.realpath(checkedPath);
    const realRoot = await fs.realpath(root);
    assertContained(realRoot, realPath);
    const content = await handle.readFile({ encoding: "utf8" });
    return parseStrictJson(content, { maxBytes });
  } finally {
    await handle.close();
  }
}

export async function readTextNoFollow(path, { root, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!root) throw new Error("readTextNoFollow requires { root }.");
  const checkedPath = await assertDirectChild(root, path);
  const entryStats = await fs.lstat(checkedPath);
  rejectSpecialNode(entryStats);
  const handle = await fs.open(checkedPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
  try {
    const stats = await handle.stat();
    rejectSpecialNode(stats);
    if (stats.nlink !== 1) throw new Error("Refusing non-unique linked file.");
    if (stats.size > maxBytes) throw new Error(`File exceeds maxBytes (${maxBytes}).`);
    return await handle.readFile({ encoding: "utf8" });
  } finally {
    await handle.close();
  }
}

export async function writeTextExclusive(path, value) {
  if (typeof value !== "string") throw new Error("Text value is required.");
  const candidatePath = resolve(path);
  const parentPath = dirname(candidatePath);
  const name = ensureStrictBasename(basename(candidatePath));
  const realParent = await fs.realpath(parentPath);
  const finalPath = resolve(realParent, name);
  const handle = await fs.open(finalPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, JSON_FILE_MODE);
  try {
    await handle.writeFile(value, { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(realParent);
  return finalPath;
}

export async function writeJsonExclusive(path, value) {
  const candidatePath = resolve(path);
  const parentPath = dirname(candidatePath);
  const name = ensureStrictBasename(basename(candidatePath), ".json");
  if (await fs.stat(parentPath).catch(() => null)) {
    await fs.chmod(parentPath, DIR_MODE);
  } else {
    await fs.mkdir(parentPath, { recursive: false, mode: DIR_MODE });
  }
  const realParent = await fs.realpath(parentPath);
  const finalPath = resolve(realParent, name);
  const handle = await fs.open(
    finalPath,
    fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
    JSON_FILE_MODE,
  );
  try {
    await handle.writeFile(stableJson(value), { encoding: "utf8" });
    await ensureFile0600(finalPath);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(realParent);
  return finalPath;
}

export async function replaceJsonAtomic(path, expectedHash, value) {
  const candidatePath = resolve(path);
  const parentPath = dirname(candidatePath);
  const name = ensureStrictBasename(basename(candidatePath), ".json");
  const realParent = await fs.realpath(parentPath);
  const finalPath = resolve(realParent, name);
  const learningRoot = dirname(realParent);
  const locksDir = resolve(learningRoot, "locks");
  await ensureDirectory0700(locksDir);
  const lockPath = resolve(locksDir, `${name}.lock`);
  let lockHandle;
  let tempPath;
  let completed = false;
  try {
    lockHandle = await fs.open(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, JSON_FILE_MODE);
    await lockHandle.writeFile(`${process.pid}\n`, "utf8");
    await lockHandle.sync();
    await fsyncDirectory(locksDir);
    const current = await readJsonNoFollow(finalPath, { root: realParent });
    const currentHash = `sha256:${sha256Hex(`${canonicalJson(current)}\n`)}`;
    if (currentHash !== expectedHash) throw new Error("Existing file hash does not match expectedHash.");
    const tempName = `.${name}.${process.pid}.${Date.now()}.tmp`;
    tempPath = resolve(realParent, tempName);
    const handle = await fs.open(tempPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, JSON_FILE_MODE);
    try {
      await handle.writeFile(stableJson(value), { encoding: "utf8" });
      await ensureFile0600(tempPath);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fsyncDirectory(realParent);
    await fs.rename(tempPath, finalPath);
    tempPath = undefined;
    await fsyncDirectory(realParent);
    completed = true;
  } finally {
    if (lockHandle) await lockHandle.close();
    if (tempPath) await fs.unlink(tempPath).catch(() => {});
    // A controlled rejection releases its lock. A process crash leaves the lock in place and fails closed.
    if (lockHandle) {
      await fs.unlink(lockPath).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
      await fsyncDirectory(locksDir);
    }
  }
  if (!completed) throw new Error("Atomic replacement did not complete.");
  return finalPath;
}

export async function claimFileOnce(path) {
  const candidatePath = resolve(path);
  const parentPath = dirname(candidatePath);
  const name = ensureStrictBasename(basename(candidatePath), ".json");
  const realParent = await fs.realpath(parentPath);
  const claimsDir = resolve(dirname(realParent), "claims");
  await ensureDirectory0700(claimsDir);
  const claimedPath = resolve(claimsDir, `${name}.${process.pid}.${Date.now()}.claim`);
  await fs.rename(resolve(realParent, name), claimedPath);
  await fsyncDirectory(realParent);
  await fsyncDirectory(claimsDir);
  return claimedPath;
}
