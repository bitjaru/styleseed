#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const matrixPath = resolve(root, "engine/skill-contracts.json");
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
const levels = new Set(matrix.evidenceLevels);
const skillRoot = resolve(root, "engine/.claude/skills");
const failures = [];

function validateFrontmatter(skillName, text) {
  if (!text.startsWith("---\n")) {
    failures.push(`${skillName} must start with YAML frontmatter`);
    return;
  }
  const closing = text.indexOf("\n---\n", 4);
  if (closing < 0) {
    failures.push(`${skillName} has unterminated YAML frontmatter`);
    return;
  }
  const frontmatter = text.slice(4, closing);
  if (/^#{1,6}\s/mu.test(frontmatter)) failures.push(`${skillName} has Markdown inside YAML frontmatter`);
  const nameMatch = frontmatter.match(/^name:\s*([^\s]+)\s*$/mu);
  if (!nameMatch || nameMatch[1] !== skillName) failures.push(`${skillName} frontmatter name must match its directory`);
  if (!/^description:\s*\S.+$/mu.test(frontmatter)) failures.push(`${skillName} frontmatter must contain a non-empty description`);
  for (const line of frontmatter.split("\n")) {
    if (!line.trim() || /^\s+/u.test(line) || /^[A-Za-z][A-Za-z0-9-]*:\s*.*$/u.test(line)) continue;
    failures.push(`${skillName} has invalid top-level YAML frontmatter line: ${line}`);
  }
}

if (matrix.schemaVersion !== 1 || !Array.isArray(matrix.evidenceLevels) || !matrix.skills) failures.push("skill contract matrix schema is invalid");
const directories = readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(resolve(skillRoot, entry.name, "SKILL.md"))).map((entry) => entry.name).sort();
for (const directory of directories) {
  const contract = matrix.skills[directory];
  if (!contract) { failures.push(`missing skill contract: ${directory}`); continue; }
  if (typeof contract.consumesBundle !== "boolean" || typeof contract.maySelectGrammar !== "boolean" || typeof contract.mayMutateProjectConfig !== "boolean" || !levels.has(contract.evidenceLevel)) failures.push(`invalid contract fields: ${directory}`);
  const text = readFileSync(resolve(skillRoot, directory, "SKILL.md"), "utf8");
  validateFrontmatter(directory, text);
  if (contract.consumesBundle && !text.includes("Registry-first artifact boundary")) failures.push(`${directory} must declare the registry-first artifact boundary`);
  if (contract.consumesBundle && text.includes("fall back to the global") && !text.includes("Legacy projects")) failures.push(`${directory} contains an unbounded global fallback`);
}
for (const name of Object.keys(matrix.skills)) if (!directories.includes(name)) failures.push(`matrix references missing skill: ${name}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; } else console.log(`skill contracts: ${directories.length} skills validated`);
