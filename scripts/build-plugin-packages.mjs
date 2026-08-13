#!/usr/bin/env node

import { createGzip } from "node:zlib";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const allowlistPath = resolve(repoRoot, "packaging/codex/allowlist.json");
const catalogPath = resolve(
  repoRoot,
  "engine/.claude/skills/ss-resolve/references/catalog.json",
);

const textDecoder = new TextDecoder("utf8", { fatal: false });

function parseArgs(argv) {
  const args = { clean: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--clean") {
      args.clean = true;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    args[key] = next;
    index += 1;
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function hasDeniedSegment(relativePath, allowlist) {
  const parts = relativePath.split("/");
  return parts.some((part) => allowlist.deniedPathSegments.includes(part));
}

function hasDeniedName(relativePath, allowlist) {
  const base = relativePath.split("/").at(-1);
  return allowlist.deniedNamePatterns.some((pattern) => new RegExp(pattern, "u").test(base));
}

function hasSecretContent(buffer, allowlist) {
  const text = textDecoder.decode(buffer);
  return allowlist.secretContentPatterns.some((pattern) => new RegExp(pattern, "u").test(text));
}

function expectedCatalogLiteralFiles(catalog) {
  return catalog.distributionFiles
    .filter((entry) => !entry.path.startsWith("root/"))
    .map((entry) => entry.path)
    .filter((path) => !path.startsWith(".claude/skills/"))
    .map((path) => `engine/${path}`)
    .sort();
}

function validateAllowlistIntegrity(allowlist, catalog, sourceRoot) {
  const failures = [];
  const expectedLiteral = [
    ".codex-plugin/plugin.json",
    "LICENSE",
    "SECURITY.md",
    ...expectedCatalogLiteralFiles(catalog),
  ].sort();
  const actualLiteral = [...allowlist.literalFiles].sort();
  if (JSON.stringify(expectedLiteral) !== JSON.stringify(actualLiteral)) {
    failures.push("allowlist literalFiles drifted from the catalog-backed core runtime file set");
  }

  const skillDirs = readdirSync(resolve(sourceRoot, "engine/.claude/skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `engine/.claude/skills/${entry.name}`)
    .sort();
  const actualSkills = [...allowlist.skillTrees].sort();
  if (JSON.stringify(skillDirs) !== JSON.stringify(actualSkills)) {
    failures.push("allowlist skillTrees drifted from the canonical engine skill directories");
  }

  const discoverySkillDirs = skillDirs.map((path) => path.replace(/^engine\/\.claude\//u, ""));
  const actualDiscoverySkills = [...allowlist.discoverySkillTrees].sort();
  if (JSON.stringify(discoverySkillDirs) !== JSON.stringify(actualDiscoverySkills)) {
    failures.push("allowlist discoverySkillTrees drifted from the generated Codex skill mirror");
  }
  for (const [canonicalPath, discoveryPath] of skillDirs.map((path, index) => [path, discoverySkillDirs[index]])) {
    const canonicalFiles = walkTree(sourceRoot, canonicalPath, allowlist)
      .map((entry) => [entry.relativePath.slice(canonicalPath.length + 1), entry.sha256]);
    const discoveryFiles = walkTree(sourceRoot, discoveryPath, allowlist)
      .map((entry) => [entry.relativePath.slice(discoveryPath.length + 1), entry.sha256]);
    if (JSON.stringify(canonicalFiles) !== JSON.stringify(discoveryFiles)) {
      failures.push(`generated Codex skill mirror drifted from canonical source: ${discoveryPath}`);
    }
  }

  if ([...allowlist.literalFiles, ...allowlist.skillTrees, ...allowlist.discoverySkillTrees].some((path) => path.includes("**"))) {
    failures.push("allowlist must not contain caller-style glob patterns");
  }

  return failures;
}

function ensureRegularFile(absolutePath, relativePath, allowlist) {
  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink()) throw new Error(`Denied symlink: ${relativePath}`);
  if (!stats.isFile()) throw new Error(`Denied special file: ${relativePath}`);
  if (stats.nlink > 1) throw new Error(`Denied hardlink: ${relativePath}`);
  if (hasDeniedSegment(relativePath, allowlist)) throw new Error(`Denied path segment: ${relativePath}`);
  if (hasDeniedName(relativePath, allowlist)) throw new Error(`Denied secret-like filename: ${relativePath}`);
  const content = readFileSync(absolutePath);
  if (hasSecretContent(content, allowlist)) throw new Error(`Denied secret-like content: ${relativePath}`);
  return {
    absolutePath,
    relativePath,
    bytes: stats.size,
    content,
    sha256: sha256(content),
  };
}

function walkTree(sourceRoot, treePath, allowlist) {
  const absoluteRoot = resolve(sourceRoot, treePath);
  const rootStats = lstatSync(absoluteRoot);
  if (rootStats.isSymbolicLink()) throw new Error(`Denied symlink tree root: ${treePath}`);
  if (!rootStats.isDirectory()) throw new Error(`Allowlisted tree is not a directory: ${treePath}`);
  const files = [];
  const visit = (currentAbsolute, currentRelative) => {
    const entries = readdirSync(currentAbsolute, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = resolve(currentAbsolute, entry.name);
      const relativePath = currentRelative ? `${currentRelative}/${entry.name}` : `${treePath}/${entry.name}`;
      const stats = lstatSync(absolutePath);
      if (stats.isSymbolicLink()) throw new Error(`Denied symlink: ${relativePath}`);
      if (hasDeniedSegment(relativePath, allowlist)) throw new Error(`Denied path segment: ${relativePath}`);
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) throw new Error(`Denied special file: ${relativePath}`);
      if (stats.nlink > 1) throw new Error(`Denied hardlink: ${relativePath}`);
      files.push(ensureRegularFile(absolutePath, relativePath, allowlist));
    }
  };
  visit(absoluteRoot, "");
  return files;
}

function collectAllowedFiles(sourceRoot, allowlist, catalog) {
  const failures = validateAllowlistIntegrity(allowlist, catalog, sourceRoot);
  if (failures.length > 0) throw new Error(failures.join("\n"));
  const files = [];
  for (const relativePath of allowlist.literalFiles) {
    files.push(ensureRegularFile(resolve(sourceRoot, relativePath), relativePath, allowlist));
  }
  for (const treePath of allowlist.skillTrees) {
    files.push(...walkTree(sourceRoot, treePath, allowlist));
  }
  for (const treePath of allowlist.discoverySkillTrees) {
    files.push(...walkTree(sourceRoot, treePath, allowlist));
  }
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const deduped = [];
  const seen = new Set();
  for (const entry of files) {
    if (seen.has(entry.relativePath)) continue;
    seen.add(entry.relativePath);
    deduped.push(entry);
  }
  const totalBytes = deduped.reduce((sum, entry) => sum + entry.bytes, 0);
  if (totalBytes > allowlist.maxPayloadBytes) {
    throw new Error(`Payload too large: ${totalBytes} bytes exceeds ${allowlist.maxPayloadBytes}`);
  }
  return { files: deduped, totalBytes };
}

function stageFile(sourceRoot, stageRoot, entry) {
  const destination = resolve(stageRoot, entry.relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(resolve(sourceRoot, entry.relativePath), destination, { recursive: false });
}

function rewriteStagedManifest(stageRoot) {
  const manifestPath = resolve(stageRoot, ".codex-plugin/plugin.json");
  const manifest = readJson(manifestPath);
  manifest.skills = "./skills/";
  delete manifest.mcpServers;
  const content = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(manifestPath, content);
  return {
    relativePath: ".codex-plugin/plugin.json",
    content,
    bytes: content.length,
    sha256: sha256(content),
  };
}

function tarHeader(name, size, mode = 0o644, type = "0") {
  const header = Buffer.alloc(512, 0);
  const write = (value, start, length) => {
    header.write(value, start, Math.min(length, Buffer.byteLength(value)), "utf8");
  };
  const octal = (value, length) => `${value.toString(8).padStart(length - 1, "0")}\0`;
  const encodedName = Buffer.from(name, "utf8");
  if (encodedName.length > 255) throw new Error(`Tar path too long: ${name}`);
  if (encodedName.length <= 100) {
    write(name, 0, 100);
  } else {
    const slashIndex = name.lastIndexOf("/", 155);
    if (slashIndex <= 0) throw new Error(`Tar path needs ustar prefix split but has no safe boundary: ${name}`);
    const prefix = name.slice(0, slashIndex);
    const suffix = name.slice(slashIndex + 1);
    if (Buffer.byteLength(prefix, "utf8") > 155 || Buffer.byteLength(suffix, "utf8") > 100) {
      throw new Error(`Tar path cannot fit ustar header: ${name}`);
    }
    write(suffix, 0, 100);
    write(prefix, 345, 155);
  }
  write(octal(mode, 8), 100, 8);
  write(octal(0, 8), 108, 8);
  write(octal(0, 8), 116, 8);
  write(octal(size, 12), 124, 12);
  write(octal(0, 12), 136, 12);
  header.fill(0x20, 148, 156);
  write(type, 156, 1);
  write("ustar", 257, 6);
  write("00", 263, 2);
  write("root", 265, 32);
  write("root", 297, 32);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8);
  return header;
}

function tarPad(size) {
  const remainder = size % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder, 0);
}

async function createDeterministicArchive(stageRoot, allowlist, files) {
  const archivePath = resolve(stageRoot, allowlist.archiveName);
  const tarParts = [];
  for (const entry of files) {
    tarParts.push(tarHeader(entry.relativePath, entry.content.length));
    tarParts.push(entry.content);
    tarParts.push(tarPad(entry.content.length));
  }
  tarParts.push(Buffer.alloc(1024, 0));
  const tarBuffer = Buffer.concat(tarParts);
  const gzip = createGzip({ level: 9, mtime: 0 });
  const chunks = [];
  await new Promise((resolvePromise, rejectPromise) => {
    Readable.from(tarBuffer)
      .pipe(gzip)
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", resolvePromise)
      .on("error", rejectPromise);
  });
  const archive = Buffer.concat(chunks);
  writeFileSync(archivePath, archive);
  return {
    path: allowlist.archiveName,
    bytes: archive.length,
    sha256: sha256(archive),
  };
}

function buildInventory(allowlist, files, totalBytes, archive = null) {
  return {
    schemaVersion: 1,
    packageName: allowlist.packageName,
    payloadBytes: totalBytes,
    maxPayloadBytes: allowlist.maxPayloadBytes,
    files: files.map((entry) => ({
      path: entry.relativePath,
      bytes: entry.bytes,
      sha256: entry.sha256,
    })),
    archive,
  };
}

export async function buildPluginPackage({
  sourceRoot = repoRoot,
  stageRoot = resolve(repoRoot, readJson(allowlistPath).stageRoot),
  clean = false,
} = {}) {
  const allowlist = readJson(allowlistPath);
  const catalog = readJson(catalogPath);
  if (clean) rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });

  const { files } = collectAllowedFiles(sourceRoot, allowlist, catalog);
  for (const entry of files) stageFile(sourceRoot, stageRoot, entry);
  const manifestEntry = rewriteStagedManifest(stageRoot);
  const stagedFiles = files.map((entry) => (
    entry.relativePath === manifestEntry.relativePath
      ? { ...entry, content: manifestEntry.content, bytes: manifestEntry.bytes, sha256: manifestEntry.sha256 }
      : entry
  ));
  const stagedTotalBytes = stagedFiles.reduce((sum, entry) => sum + entry.bytes, 0);
  if (stagedTotalBytes > allowlist.maxPayloadBytes) {
    throw new Error(`Staged payload too large: ${stagedTotalBytes} bytes exceeds ${allowlist.maxPayloadBytes}`);
  }
  const archive = await createDeterministicArchive(stageRoot, allowlist, stagedFiles);
  const inventory = buildInventory(allowlist, stagedFiles, stagedTotalBytes, archive);
  writeFileSync(resolve(stageRoot, "inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
  return {
    stageRoot,
    inventory,
    archivePath: resolve(stageRoot, allowlist.archiveName),
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const allowlist = readJson(allowlistPath);
    const stageRoot = resolve(repoRoot, args["stage-root"] ?? allowlist.stageRoot);
    const result = await buildPluginPackage({ sourceRoot: repoRoot, stageRoot, clean: args.clean });
    console.log(JSON.stringify({
      stageRoot: normalizePath(result.stageRoot),
      payloadBytes: result.inventory.payloadBytes,
      fileCount: result.inventory.files.length,
      archive: result.inventory.archive,
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
