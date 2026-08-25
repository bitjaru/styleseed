#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const rootFiles = [
  "README.md",
  "README-KR.md",
  "CONTRIBUTING.md",
  "ROADMAP.md",
];

const scanDirectories = ["engine", "docs"];

function collectMarkdownFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const filePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(filePath));
    } else if (entry.isFile() && /\.md$/iu.test(entry.name)) {
      files.push(filePath);
    }
  }

  return files;
}

function getMarkdownFiles(repositoryRoot) {
  const files = [];

  for (const file of rootFiles) {
    const filePath = resolve(repositoryRoot, file);

    if (existsSync(filePath)) {
      files.push(filePath);
    }
  }

  for (const directory of scanDirectories) {
    files.push(...collectMarkdownFiles(resolve(repositoryRoot, directory)));
  }

  return files;
}

function isIgnoredTarget(target) {
  return (
    target.startsWith("#") ||
    target.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(target)
  );
}

function stripQueryAndFragment(target) {
  return target.split(/[?#]/u, 1)[0];
}

function extractMarkdownLinks(content) {
  const links = [];
  const lines = content.split(/\r?\n/u);

  let fenced = false;
  let fenceCharacter = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^\s*(`{3,}|~{3,})/u);

    if (fence) {
      const character = fence[1][0];

      if (!fenced) {
        fenced = true;
        fenceCharacter = character;
      } else if (character === fenceCharacter) {
        fenced = false;
        fenceCharacter = null;
      }

      continue;
    }

    if (fenced) {
      continue;
    }

    const linkPattern = /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/gu;

    let match;

    while ((match = linkPattern.exec(line)) !== null) {
      links.push({
        target: match[1] ?? match[2],
        line: index + 1,
      });
    }
  }

  return links;
}

function resolveTarget(sourceFile, target, repositoryRoot) {
  const localTarget = stripQueryAndFragment(target);

  if (!localTarget) {
    return null;
  }

  const decodedTarget = decodeURIComponent(localTarget);

  if (decodedTarget.startsWith("/")) {
    return resolve(repositoryRoot, `.${decodedTarget}`);
  }

  return resolve(dirname(sourceFile), decodedTarget);
}

export function checkMarkdownLinks(repositoryRoot = root) {
  const errors = [];

  for (const sourceFile of getMarkdownFiles(repositoryRoot)) {
    const content = readFileSync(sourceFile, "utf8");

    for (const link of extractMarkdownLinks(content)) {
      if (isIgnoredTarget(link.target)) {
        continue;
      }

      const targetPath = resolveTarget(sourceFile, link.target, repositoryRoot);

      if (!targetPath) {
        continue;
      }

      const relativeTarget = relative(repositoryRoot, targetPath);
      const isOutsideRepository =
        relativeTarget === ".." ||
        relativeTarget.startsWith(`..${sep}`) ||
        isAbsolute(relativeTarget);

      if (isOutsideRepository) {
        continue;
      }

      if (!existsSync(targetPath)) {
        errors.push({
          file: relative(repositoryRoot, sourceFile),
          line: link.line,
          target: link.target,
        });
      }
    }
  }

  return errors;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const errors = checkMarkdownLinks();

  if (errors.length > 0) {
    console.error("Broken Markdown links found:");

    for (const error of errors) {
      console.error(`  ${error.file}:${error.line} -> ${error.target}`);
    }

    process.exit(1);
  }

  console.log("Markdown links OK.");
}
