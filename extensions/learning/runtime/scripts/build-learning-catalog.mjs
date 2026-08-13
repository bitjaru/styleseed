#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const coreCatalog = JSON.parse(readFileSync(resolve(root, "engine/.claude/skills/ss-resolve/references/catalog.json"), "utf8"));
const contextGroups = ["grammars", "adapters", "domains", "pages", "recipes", "palettes", "profiles"];
const runtimeCatalog = {
  schemaVersion: 1,
  engineVersion: coreCatalog.engineVersion,
  engineRevision: coreCatalog.engineRevision,
  ...Object.fromEntries(contextGroups.map((group) => [group, Object.fromEntries(Object.keys(coreCatalog[group] ?? {}).sort().map((id) => [id, true]))])),
};
const runtimeCatalogTarget = resolve(root, "extensions/learning/runtime/catalog.json");
mkdirSync(dirname(runtimeCatalogTarget), { recursive: true });
writeFileSync(runtimeCatalogTarget, `${JSON.stringify(runtimeCatalog, null, 2)}\n`, { mode: 0o600 });
const files = [
  "extensions/learning/runtime/catalog.json",
  "extensions/learning/skills/ss-learn/scripts/learning-contract.mjs",
  "extensions/learning/skills/ss-learn/scripts/privacy-scan.mjs",
  "extensions/learning/skills/ss-learn/scripts/secure-fs.mjs",
  "extensions/learning/skills/ss-learn/references/candidate.schema.json",
  "extensions/learning/skills/ss-learn/references/candidate-record.schema.json",
  "extensions/learning/skills/ss-learn/references/share-package.schema.json",
];
const digest = (path) => `sha256:${createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex")}`;
const entries = files.map((path) => ({ path, sha256: digest(path) }));
const revisionPayload = { contractVersion: 2, scannerVersion: 2, files: entries };
const revision = `sha256:${createHash("sha256").update(`${JSON.stringify(revisionPayload, null, 2)}\n`).digest("hex")}`;
const output = {
  schemaVersion: 1,
  contractVersion: 2,
  scannerVersion: 2,
  revision,
  files: entries,
};
const target = resolve(root, "extensions/learning/runtime/references/learning-catalog.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`${target}\n${revision}\n`);
