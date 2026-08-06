#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGES = ["briefed", "directed", "selected", "planned", "built", "verified"];
const ROLES = new Set(["structure", "navigation", "signature", "motion", "asset-language"]);
const LANES = new Set(["native", "signature", "experimental"]);
const GATES = ["code", "visual", "temporal", "human"];
const GATE_STATUSES = new Set(["pending", "pass", "fail", "blocked"]);
const MEDIA_STATUSES = new Set(["planned", "running", "complete", "blocked", "rejected"]);

function fail(message, code = 1) {
  console.error(`Studio run error: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) fail(`unexpected argument ${token}`);
    const key = token.slice(2);
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) fail(`missing value for --${key}`);
    options[key] = value;
    i += 1;
  }
  return { command, options };
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "studio-run";
}

function now() {
  return new Date().toISOString();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function projectRoot(options) {
  return resolve(options["project-root"] || process.cwd());
}

function runDir(options) {
  const id = options.run;
  if (!id) fail("--run is required");
  return resolve(projectRoot(options), ".styleseed", "studio", id);
}

function requireRun(options) {
  const dir = runDir(options);
  const path = resolve(dir, "run.json");
  if (!existsSync(path)) fail(`run not found: ${dir}`);
  return { dir, path, run: readJson(path) };
}

function requiredString(value, label, failures) {
  if (typeof value !== "string" || !value.trim()) failures.push(`${label} is required`);
}

function validateDirection(direction, index, failures) {
  const prefix = `directions[${index}]`;
  for (const key of [
    "id", "lane", "name", "promise", "grammar", "recipe", "palette", "composition",
    "navigationChrome", "typeAndMaterial", "assetDirection", "motionDirection", "signatureMove",
    "cost", "risk",
  ]) requiredString(direction?.[key], `${prefix}.${key}`, failures);
  if (!LANES.has(direction?.lane)) failures.push(`${prefix}.lane is invalid`);
  if (!Array.isArray(direction?.tradeoffs) || direction.tradeoffs.length === 0) {
    failures.push(`${prefix}.tradeoffs must contain at least one item`);
  }
}

function validateTarget(dir, run, target) {
  const failures = [];
  if (!STAGES.includes(target)) failures.push(`unknown target stage ${target}`);
  const briefPath = resolve(dir, "brief.md");
  if (!existsSync(briefPath) || readFileSync(briefPath, "utf8").trim().length < 40) {
    failures.push("brief.md must contain a concrete product brief");
  }

  if (STAGES.indexOf(target) >= STAGES.indexOf("directed")) {
    const references = readJson(resolve(dir, "references.json"));
    if (!Array.isArray(references.items)) failures.push("references.json items must be an array");
    else references.items.forEach((item, index) => {
      requiredString(item.id, `references[${index}].id`, failures);
      if (!ROLES.has(item.role)) failures.push(`references[${index}].role is invalid`);
      for (const key of ["source", "observedAt", "observation", "principle", "confidence", "rights"])
        requiredString(item[key], `references[${index}].${key}`, failures);
    });

    const directions = readJson(resolve(dir, "directions.json"));
    if (!Array.isArray(directions.directions) || directions.directions.length !== 3) {
      failures.push("directions.json must contain exactly three directions");
    } else {
      directions.directions.forEach((direction, index) => validateDirection(direction, index, failures));
      const lanes = new Set(directions.directions.map((direction) => direction.lane));
      for (const lane of LANES) if (!lanes.has(lane)) failures.push(`missing ${lane} direction`);
      const ids = new Set(directions.directions.map((direction) => direction.id));
      if (ids.size !== 3) failures.push("direction ids must be unique");
    }
  }

  if (STAGES.indexOf(target) >= STAGES.indexOf("selected")) {
    const selection = readJson(resolve(dir, "selection.json"));
    const directions = readJson(resolve(dir, "directions.json")).directions || [];
    requiredString(selection.selectedDirectionId, "selection.selectedDirectionId", failures);
    requiredString(selection.decisionBy, "selection.decisionBy", failures);
    requiredString(selection.decidedAt, "selection.decidedAt", failures);
    requiredString(selection.rationale, "selection.rationale", failures);
    if (!directions.some((direction) => direction.id === selection.selectedDirectionId)) {
      failures.push("selection does not match a direction id");
    }
  }

  if (STAGES.indexOf(target) >= STAGES.indexOf("planned")) {
    const scenes = readJson(resolve(dir, "scenes.json"));
    if (!Array.isArray(scenes.scenes) || scenes.scenes.length === 0) failures.push("at least one interaction scene is required");
    else scenes.scenes.forEach((scene, index) => {
      for (const key of ["id", "trigger", "from", "to", "feedback", "interrupt", "reducedMotion"])
        requiredString(scene[key], `scenes[${index}].${key}`, failures);
      for (const key of ["continuity", "enter", "exit", "rendererTargets"])
        if (!Array.isArray(scene[key])) failures.push(`scenes[${index}].${key} must be an array`);
    });

    const assets = readJson(resolve(dir, "assets.json"));
    if (!Array.isArray(assets.jobs)) failures.push("assets.json jobs must be an array");
    else assets.jobs.forEach((job, index) => {
      for (const key of ["id", "role", "kind", "capability", "provider", "prompt", "status", "provenance", "rights", "fallback", "consumingScene"])
        requiredString(job[key], `assets[${index}].${key}`, failures);
      if (!Array.isArray(job.inputs)) failures.push(`assets[${index}].inputs must be an array`);
      if (!MEDIA_STATUSES.has(job.status)) failures.push(`assets[${index}].status is invalid`);
      if (job.status === "complete") requiredString(job.output, `assets[${index}].output`, failures);
    });

    const video = readJson(resolve(dir, "video.json"));
    if (video.mode !== "prototype-first") failures.push("video.mode must be prototype-first");
    if (!Array.isArray(video.shots) || !video.shots.some((shot) => shot.sourceType === "prototype-recording")) {
      failures.push("video plan must contain at least one prototype-recording shot");
    }
  }

  if (STAGES.indexOf(target) >= STAGES.indexOf("built")) {
    requiredString(run.outputs?.prototype, "run.outputs.prototype", failures);
  }

  if (STAGES.indexOf(target) >= STAGES.indexOf("verified")) {
    requiredString(run.outputs?.recording, "run.outputs.recording", failures);
    const verification = readJson(resolve(dir, "verification.json"));
    for (const gate of GATES) {
      if (verification.gates?.[gate] !== "pass") failures.push(`verification gate ${gate} must pass`);
    }
    if (!Array.isArray(verification.evidence) || verification.evidence.length < 4) {
      failures.push("verification needs evidence for all four gates");
    }
    requiredString(verification.reviewer, "verification.reviewer", failures);
    requiredString(verification.acceptedAt, "verification.acceptedAt", failures);
  }

  return failures;
}

function init(options) {
  for (const key of ["name", "brief", "surface", "platform"]) if (!options[key]) fail(`--${key} is required`);
  const root = projectRoot(options);
  const baseId = slugify(options.name);
  let id = baseId;
  let suffix = 2;
  while (existsSync(resolve(root, ".styleseed", "studio", id))) id = `${baseId}-${suffix++}`;
  const dir = resolve(root, ".styleseed", "studio", id);
  mkdirSync(resolve(dir, "assets", "generated"), { recursive: true });
  mkdirSync(resolve(dir, "evidence", "frames"), { recursive: true });
  mkdirSync(resolve(dir, "evidence", "recordings"), { recursive: true });
  const createdAt = now();
  writeJson(resolve(dir, "run.json"), {
    schemaVersion: 1,
    id,
    title: options.name,
    createdAt,
    updatedAt: createdAt,
    stage: "briefed",
    surface: options.surface,
    platform: options.platform,
    outputs: { prototype: null, recording: null },
  });
  writeFileSync(resolve(dir, "brief.md"), `# ${options.name}\n\n${options.brief.trim()}\n`);
  writeJson(resolve(dir, "references.json"), { items: [] });
  writeJson(resolve(dir, "directions.json"), { directions: [] });
  writeJson(resolve(dir, "selection.json"), { selectedDirectionId: null, decisionBy: null, decidedAt: null, rationale: null });
  writeJson(resolve(dir, "scenes.json"), { scenes: [] });
  writeJson(resolve(dir, "assets.json"), { jobs: [] });
  writeJson(resolve(dir, "video.json"), { mode: "prototype-first", shots: [] });
  writeJson(resolve(dir, "verification.json"), {
    gates: Object.fromEntries(GATES.map((gate) => [gate, "pending"])),
    evidence: [], reviewer: null, acceptedAt: null, risks: [],
  });
  console.log(dir);
}

function select(options) {
  const { dir, path, run } = requireRun(options);
  for (const key of ["direction", "by", "rationale"]) if (!options[key]) fail(`--${key} is required`);
  const directedFailures = validateTarget(dir, run, "directed");
  if (directedFailures.length) fail(`cannot select before directions pass:\n- ${directedFailures.join("\n- ")}`);
  const directions = readJson(resolve(dir, "directions.json")).directions;
  if (!directions.some((direction) => direction.id === options.direction)) fail(`unknown direction ${options.direction}`);
  writeJson(resolve(dir, "selection.json"), {
    selectedDirectionId: options.direction,
    decisionBy: options.by,
    decidedAt: now(),
    rationale: options.rationale,
  });
  run.stage = "selected";
  run.updatedAt = now();
  writeJson(path, run);
  console.log(`${run.id}: selected ${options.direction}`);
}

function output(options) {
  const { path, run } = requireRun(options);
  if (!options.prototype && !options.recording) fail("pass --prototype and/or --recording");
  if (options.prototype) run.outputs.prototype = options.prototype;
  if (options.recording) run.outputs.recording = options.recording;
  run.updatedAt = now();
  writeJson(path, run);
  console.log(`${run.id}: outputs updated`);
}

function media(options) {
  const { dir, path, run } = requireRun(options);
  for (const key of ["job", "status"]) if (!options[key]) fail(`--${key} is required`);
  if (!MEDIA_STATUSES.has(options.status)) {
    fail(`--status must be one of ${[...MEDIA_STATUSES].join(", ")}`);
  }
  const assetsPath = resolve(dir, "assets.json");
  const assets = readJson(assetsPath);
  const job = assets.jobs?.find((item) => item.id === options.job);
  if (!job) fail(`media job not found: ${options.job}`);
  if (options.status === "complete") {
    for (const key of ["provider", "output", "provenance"]) {
      if (!options[key] && !job[key]) fail(`complete media job requires --${key}`);
    }
  }
  job.status = options.status;
  if (options.provider) job.provider = options.provider;
  if (options.output) job.output = options.output;
  if (options.provenance) job.provenance = options.provenance;
  job.updatedAt = now();
  writeJson(assetsPath, assets);
  run.updatedAt = now();
  writeJson(path, run);
  console.log(`${run.id}: media ${job.id} -> ${job.status}`);
}

function gate(options) {
  const { dir, path, run } = requireRun(options);
  for (const key of ["gate", "status"]) if (!options[key]) fail(`--${key} is required`);
  if (!GATES.includes(options.gate)) fail(`--gate must be one of ${GATES.join(", ")}`);
  if (!GATE_STATUSES.has(options.status)) {
    fail(`--status must be one of ${[...GATE_STATUSES].join(", ")}`);
  }
  if (options.gate === "human" && options.status === "pass" && !options.reviewer) {
    fail("human pass requires --reviewer");
  }
  const verificationPath = resolve(dir, "verification.json");
  const verification = readJson(verificationPath);
  verification.gates[options.gate] = options.status;
  if (options.evidence) {
    verification.evidence.push({
      gate: options.gate,
      path: options.evidence,
      note: options.note || `${options.gate} ${options.status}`,
      recordedAt: now(),
    });
  }
  if (options.reviewer) verification.reviewer = options.reviewer;
  if (options.gate === "human" && options.status === "pass") verification.acceptedAt = now();
  writeJson(verificationPath, verification);
  run.updatedAt = now();
  writeJson(path, run);
  console.log(`${run.id}: gate ${options.gate} -> ${options.status}`);
}

function advance(options) {
  const { dir, path, run } = requireRun(options);
  const target = options.stage;
  if (!STAGES.includes(target)) fail(`--stage must be one of ${STAGES.join(", ")}`);
  const currentIndex = STAGES.indexOf(run.stage);
  const targetIndex = STAGES.indexOf(target);
  if (targetIndex !== currentIndex + 1) fail(`advance must be sequential: ${run.stage} -> ${STAGES[currentIndex + 1] || "complete"}`);
  if (target === "selected") fail("use the select command for the human selection gate");
  const failures = validateTarget(dir, run, target);
  if (failures.length) fail(`cannot advance to ${target}:\n- ${failures.join("\n- ")}`);
  run.stage = target;
  run.updatedAt = now();
  writeJson(path, run);
  console.log(`${run.id}: ${target}`);
}

function validate(options) {
  const { dir, run } = requireRun(options);
  const target = options.target || run.stage;
  const failures = validateTarget(dir, run, target);
  if (failures.length) fail(`${target} validation failed:\n- ${failures.join("\n- ")}`, 2);
  console.log(`${run.id}: ${target} contract valid`);
}

function status(options) {
  const { dir, run } = requireRun(options);
  const selection = readJson(resolve(dir, "selection.json"));
  const assets = readJson(resolve(dir, "assets.json"));
  const video = readJson(resolve(dir, "video.json"));
  const verification = readJson(resolve(dir, "verification.json"));
  console.log(JSON.stringify({
    id: run.id,
    stage: run.stage,
    surface: run.surface,
    platform: run.platform,
    selectedDirection: selection.selectedDirectionId,
    mediaJobs: assets.jobs.length,
    mediaComplete: assets.jobs.filter((job) => job.status === "complete").length,
    prototypeShots: video.shots.filter((shot) => shot.sourceType === "prototype-recording").length,
    gates: verification.gates,
    outputs: run.outputs,
    path: dir,
  }, null, 2));
}

const { command, options } = parseArgs(process.argv.slice(2));
if (command === "init") init(options);
else if (command === "select") select(options);
else if (command === "output") output(options);
else if (command === "media") media(options);
else if (command === "gate") gate(options);
else if (command === "advance") advance(options);
else if (command === "validate") validate(options);
else if (command === "status") status(options);
else fail("command must be init, select, output, media, gate, advance, validate, or status");
