#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BEGIN = "<!-- STYLESEED:MANAGED:BEGIN -->";
const END = "<!-- STYLESEED:MANAGED:END -->";
const DEFAULT_FILES = ["AGENTS.md", "CLAUDE.md", ".cursorrules"];
const BODY = `${BEGIN}
## StyleSeed managed routing

When a .styleseed registry exists, resolve one artifact ID first and read only that artifact's bundle and manifest. Do not use the legacy global bundle for a registry project. Preserve the project's design decisions and run the code, render, temporal, and acceptance gates appropriate to the artifact before claiming verification.
${END}`;

function parseArgs(argv) {
  const options = { write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`unexpected argument ${token}`);
    const key = token.slice(2);
    if (key === "write") { options.write = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function targetFiles(root, requested) {
  if (requested) return [requested];
  const existing = DEFAULT_FILES.filter((file) => existsSync(resolve(root, file)));
  const managed = existing.filter((file) => {
    const stat = lstatSync(resolve(root, file));
    return stat.isFile() && !stat.isSymbolicLink() && readFileSync(resolve(root, file), "utf8").includes(BEGIN);
  });
  if (managed.length > 1) throw new Error("multiple managed StyleSeed files require manual resolution");
  return [managed[0] ?? existing[0] ?? DEFAULT_FILES[0]];
}

function planFor(root, file) {
  if (file.startsWith("/") || file.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`unsafe instruction path: ${file}`);
  const absolute = resolve(root, file);
  if (existsSync(absolute)) {
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new Error(`refusing symlink, hardlink, or non-file target: ${file}`);
    const original = readFileSync(absolute, "utf8");
    const beginCount = original.split(BEGIN).length - 1;
    const endCount = original.split(END).length - 1;
    if (beginCount > 1 || endCount > 1 || beginCount !== endCount) throw new Error(`conflicting or multiple managed blocks: ${file}`);
    const next = beginCount === 1
      ? original.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "u"), BODY)
      : `${original.replace(/\s*$/u, "")}\n\n${BODY}\n`;
    return { file, absolute, exists: true, changed: next !== original, original, next };
  }
  return { file, absolute, exists: false, changed: true, original: "", next: `${BODY}\n` };
}

function writeAtomic(item) {
  if (!item.changed) return;
  const temp = `${item.absolute}.${process.pid}.tmp`;
  writeFileSync(temp, item.next, { flag: "wx", mode: 0o600 });
  renameSync(temp, item.absolute);
}

export function prepareManagedInstructions({ projectRoot = process.cwd(), file, write = false } = {}) {
  const root = resolve(projectRoot);
  const items = targetFiles(root, file).map((target) => planFor(root, target));
  const existingBlocks = items.reduce((count, item) => count + (item.original.split(BEGIN).length - 1), 0);
  if (existingBlocks > 1) throw new Error("multiple managed StyleSeed blocks require manual resolution");
  if (write) items.forEach(writeAtomic);
  return { mode: write ? "write" : "dry-run", targets: items.map(({ file: target, exists, changed }) => ({ file: target, exists, changed })) };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = prepareManagedInstructions({ projectRoot: options["project-root"] || process.cwd(), file: options.file, write: options.write });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error(`managed instructions: ${error.message}`); process.exitCode = 2; }
}
