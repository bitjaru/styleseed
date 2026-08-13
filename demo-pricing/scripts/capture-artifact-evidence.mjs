#!/usr/bin/env node

import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { loadProjectRegistry } from "../../engine/.claude/skills/ss-resolve/scripts/project-registry.mjs";
import { readStrictJson, sourceInventory } from "../../engine/.claude/skills/ss-score/scripts/evidence-contract.mjs";
import { safeProjectPath } from "../../engine/.claude/skills/ss-resolve/scripts/runtime-contract.mjs";

const here = dirname(new URL(import.meta.url).pathname);
const projectRoot = resolve(here, "..", "..");

function fail(message, code = 1) {
  console.error(`capture-artifact-evidence: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail(`unexpected argument ${token}`);
    const key = token.slice(2);
    if (key === "all") {
      options.all = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function gitStatusFor(paths) {
  const args = ["-C", projectRoot, "status", "--short", "--", ...paths];
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) fail(result.stderr.trim() || "git status failed");
  return result.stdout.trim();
}

function requireCleanSources(artifact) {
  const watched = [...artifact.implementation.sourceRoots, ...artifact.implementation.tokenFiles];
  const status = gitStatusFor(watched);
  if (status) fail(`refusing dirty source tree for ${artifact.id}:\n${status}`);
}

function artifactManifest(artifactId) {
  const path = resolve(projectRoot, ".styleseed", "manifests", `${artifactId}.json`);
  if (!existsSync(path)) fail(`manifest missing for ${artifactId}; run resolve-context first`);
  const manifest = readStrictJson(path);
  if (manifest.schemaVersion !== 2) fail(`manifest for ${artifactId} must be schema v2`);
  return manifest;
}

function gateRunFor(artifactId, runId) {
  const path = resolve(projectRoot, ".styleseed", "evidence", artifactId, runId, "gate-run.json");
  if (!existsSync(path)) fail(`gate-run missing for ${artifactId}/${runId}; initialize evidence-gate first`);
  const gateRun = readStrictJson(path);
  if (gateRun.artifactId !== artifactId || gateRun.runId !== runId) fail(`gate-run identity mismatch for ${artifactId}/${runId}`);
  return gateRun;
}

function requireCurrentInventory(artifact, gateRun) {
  const inventory = sourceInventory(projectRoot, artifact.implementation.sourceRoots);
  if (inventory.hash !== gateRun.implementation?.inventoryHash) {
    fail(`source inventory drifted for ${artifact.id}; rerun evidence-gate init before capture`);
  }
  return inventory;
}

function requireCurrentBundle(manifest, gateRun, artifactId) {
  if (gateRun.manifestPath !== `.styleseed/manifests/${artifactId}.json`) fail(`non-canonical manifest path in gate-run for ${artifactId}`);
  if (gateRun.bundlePath !== manifest.bundle?.path) fail(`bundle path drifted for ${artifactId}`);
  if (gateRun.methodHash !== manifest.methodHash) fail(`method hash drifted for ${artifactId}`);
  if (gateRun.validationHash !== manifest.validationHash) fail(`validation hash drifted for ${artifactId}`);
  if (gateRun.bundleHash !== manifest.bundle?.sha256 || gateRun.bundleBytes !== manifest.bundle?.bytes) {
    fail(`bundle snapshot drifted for ${artifactId}; rerun evidence-gate init before capture`);
  }
}

function ensureNewFileTarget(path) {
  const absolute = safeProjectPath(projectRoot, path);
  if (existsSync(absolute)) fail(`refusing to overwrite existing evidence file: ${path}`);
  mkdirSync(resolve(absolute, ".."), { recursive: true });
  return absolute;
}

function renderPath(artifactId, runId, renderId) {
  return `.styleseed/evidence/${artifactId}/${runId}/renders/${renderId}.png`;
}

function recordingPath(artifactId, runId, scenarioId) {
  return `.styleseed/evidence/${artifactId}/${runId}/recordings/${scenarioId}.webm`;
}

function routeFor(artifact) {
  return artifact.target.locator;
}

function captureRequiredRenders(artifact, runId, browser, baseUrl) {
  return Promise.all((artifact.validation.requiredRenders || []).map(async (render) => {
    const reducedMotion = render.state === "reduced-motion" ? "reduce" : "no-preference";
    const targetPath = renderPath(artifact.id, runId, render.id);
    const absolutePath = ensureNewFileTarget(targetPath);
    const context = await browser.newContext({
      viewport: render.viewport,
      deviceScaleFactor: 2,
      reducedMotion,
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${routeFor(artifact)}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(render.state === "reduced-motion" ? 150 : 400);
    await page.screenshot({ path: absolutePath, fullPage: true });
    await context.close();
    return targetPath;
  }));
}

async function captureTemporalIfRequired(artifact, runId, browser, baseUrl) {
  if (artifact.validation.temporal?.required !== true) return [];
  const outputs = [];
  for (const scenarioId of artifact.validation.temporal.scenarios || []) {
    const targetPath = recordingPath(artifact.id, runId, scenarioId);
    const absolutePath = ensureNewFileTarget(targetPath);
    const reducedMotion = scenarioId.includes("reduced-motion") ? "reduce" : "no-preference";
    const videoContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion,
      recordVideo: { dir: resolve(projectRoot, ".styleseed", "evidence", artifact.id, runId, "recordings"), size: { width: 390, height: 844 } },
    });
    const page = await videoContext.newPage();
    const video = page.video();
    await page.goto(`${baseUrl}${routeFor(artifact)}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.close();
    const rawVideo = await video.path();
    await videoContext.close();
    if (existsSync(absolutePath)) fail(`recording target already exists: ${targetPath}`);
    renameSync(rawVideo, absolutePath);
    outputs.push(targetPath);
  }
  return outputs;
}

async function captureArtifact(artifact, runId, browser, baseUrl) {
  requireCleanSources(artifact);
  const manifest = artifactManifest(artifact.id);
  const gateRun = gateRunFor(artifact.id, runId);
  requireCurrentInventory(artifact, gateRun);
  requireCurrentBundle(manifest, gateRun, artifact.id);
  const renders = await captureRequiredRenders(artifact, runId, browser, baseUrl);
  const recordings = await captureTemporalIfRequired(artifact, runId, browser, baseUrl);
  return { artifactId: artifact.id, runId, renders, recordings };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = options["base-url"];
  const runId = options.run;
  if (!baseUrl) fail("--base-url is required");
  if (!runId) fail("--run is required");
  if (!options.all && !options.artifact) fail("pass exactly one of --all or --artifact");
  if (options.all && options.artifact) fail("pass exactly one of --all or --artifact");

  const registry = loadProjectRegistry(projectRoot);
  if (!registry) fail("registry inputs are missing; create .styleseed/project.json and artifacts/index.json first");
  const artifacts = options.all
    ? [...registry.artifacts].sort((left, right) => left.id.localeCompare(right.id)).map((entry) => entry.artifact)
    : [registry.artifactMap.get(options.artifact)?.artifact];
  if (artifacts.some((artifact) => !artifact)) fail(`unknown artifact: ${options.artifact}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const captured = [];
    for (const artifact of artifacts) {
      captured.push(await captureArtifact(artifact, runId, browser, baseUrl));
    }
    console.log(JSON.stringify({ baseUrl, runId, captured }, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
