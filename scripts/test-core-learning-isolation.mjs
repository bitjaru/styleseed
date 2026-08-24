#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalog = JSON.parse(readFileSync(resolve(root, "engine/.claude/skills/ss-resolve/references/catalog.json"), "utf8"));
const coreFiles = catalog.distributions.core.files.map((file) => file.path);
assert.equal(coreFiles.some((path) => /ss-learn|learning|mcp/i.test(path)), false, "core distribution contains learning or MCP paths");
assert.equal(existsSync(resolve(root, "engine/.claude/skills/ss-learn")), false, "core source contains ss-learn");
assert.equal(existsSync(resolve(root, "mcp")), false, "core source contains MCP bridge");
assert.equal(existsSync(resolve(root, "extensions/learning/skills/ss-learn/SKILL.md")), true, "learning extension skill is missing");
assert.equal(existsSync(resolve(root, "extensions/learning/mcp/styleseed-learning-server.mjs")), true, "learning extension MCP bridge is missing");
const manifest = JSON.parse(readFileSync(resolve(root, "extensions/learning/.codex-plugin/plugin.json"), "utf8"));
assert.equal(manifest.skills, "./skills/", "learning extension manifest must point to its self-contained skill root");
console.log("Core learning isolation verified: core has no ss-learn/MCP payload; optional extension is self-contained.");
