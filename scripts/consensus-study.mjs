#!/usr/bin/env node
// Pattern-consensus study (WO-09 Part A). Measures the published product screens listed in
// research/consensus/screens.json with the repository's probes (observe-design, observe-structure,
// observe-faults) and the study's control probe (scripts/lib/consensus-probe.mjs), stores numbers and
// enums per screen, and generates the agreement table and the negative-control table from them
// (scripts/lib/consensus.mjs). Method, sources, and limits: research/consensus/README.md.
//
//   node scripts/consensus-study.mjs --measure [--run <YYYY-MM-DD>] [--only <id,id>] [--base <lineage>=<url prefix>]…
//                                              [--browser <playwright module>] [--delay 4000] [--timeout 45000] [--root research/consensus]
//   node scripts/consensus-study.mjs --report --run <YYYY-MM-DD> [--root research/consensus]
//   node scripts/consensus-study.mjs --check [--run <YYYY-MM-DD>] [--root research/consensus]
//
// Requests: one robots.txt fetch per origin (a robots.txt that redirects to another origin reads as
// disallowed) and one page load per screen and viewport, sequential, one page open at a time, a pause
// of --delay ms after every load, no retry inside a run. Default browser user agent; nothing in a
// header or URL names this project. Never in this script: a click, hover, key press, scroll call,
// cookie or storage write, request interception, user-agent override, touch or reduced-motion
// emulation, screenshot, or a second load of the same viewport. A lineage whose access is `skipped`,
// or a hosted lineage whose terms check is `restricted` or `unchecked`, is not loaded at all.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { observeDesign } from "../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs";
import { observeStructure } from "../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs";
import { summarize } from "../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs";
import { buildFacts } from "../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-structure.mjs";
import { checkRobots, loadBrowser } from "../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { observeFaults } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/observe-faults.mjs";
import { analyzeFaults, FAULT_CLASSES } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";
import { observeControls, observeGuards } from "./lib/consensus-probe.mjs";
import { CONSENSUS_VERSION, REASONS, generateReports, stripIds, validateManifest } from "./lib/consensus.mjs";
import { disallowedStrings } from "./lib/reference-allow-list.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STUDY_VERSION = 1;
export const RECORD_VERSION = 1;
const SAFE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const MAX_ELEMENTS = 5000;
const FINDINGS_PER_CLASS = 50;
const CANDIDATE_LISTS = ["amounts", "overlaps", "spills", "clips", "insets", "touches", "gaps", "aligns", "emoji"];
const GENERATED = ["consensus.json", "CONSENSUS.md", "negative-control.json", "NEGATIVE-CONTROL.md"];
const USAGE = `usage: consensus-study.mjs --measure [--run <YYYY-MM-DD>] [--only <id,id>] [--base <lineage>=<url prefix>]... [--browser <playwright module>] [--delay 4000] [--timeout 45000] [--root research/consensus]
       consensus-study.mjs --report --run <YYYY-MM-DD> [--root research/consensus]
       consensus-study.mjs --check [--run <YYYY-MM-DD>] [--root research/consensus]`;

const isDate = (v) => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const json = (value) => `${JSON.stringify(value, null, 1)}\n`;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const posix = (path) => path.split("\\").join("/");
// A path as printed: relative to the working directory when inside it, always with /.
const shown = (path) => { const rel = relative(process.cwd(), path); return posix(rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : path); };

export function parseArgs(argv) {
  const args = { mode: null, run: null, only: null, bases: {}, browser: process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, "demo-pricing/node_modules/playwright/index.mjs"), delay: 4000, timeout: 45000, root: resolve(repoRoot, "research/consensus") };
  const modes = [];
  const value = (i, flag) => { if (i >= argv.length || argv[i].startsWith("--")) throw new Error(`${flag} needs a value\n${USAGE}`); return argv[i]; };
  const whole = (text, flag) => { if (!/^\d+$/u.test(text)) throw new Error(`${flag} must be a whole number of milliseconds (got ${text})`); return Number(text); };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--measure" || a === "--report" || a === "--check") modes.push(a.slice(2));
    else if (a === "--run") args.run = value(++i, a);
    else if (a === "--only") args.only = value(++i, a).split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--base") {
      const text = value(++i, a), eq = text.indexOf("=");
      const lineage = eq > 0 ? text.slice(0, eq) : "", prefix = eq > 0 ? text.slice(eq + 1) : "";
      if (!SAFE_ID.test(lineage)) throw new Error(`--base ${text}: write <lineage>=<url prefix>, for example cloudscape=http://127.0.0.1:8080/examples/react/`);
      if (Object.hasOwn(args.bases, lineage)) throw new Error(`--base ${lineage} is given twice; pass one prefix per lineage`);
      let u = null;
      try { u = new URL(prefix); } catch {}
      if (!u || !["http:", "https:"].includes(u.protocol) || !prefix.endsWith("/")) throw new Error(`--base ${lineage}: the prefix must be an http(s) URL ending with / (got ${prefix})`);
      args.bases[lineage] = prefix;
    } else if (a === "--browser") args.browser = value(++i, a);
    else if (a === "--delay") args.delay = whole(value(++i, a), a);
    else if (a === "--timeout") args.timeout = whole(value(++i, a), a);
    else if (a === "--root") args.root = resolve(value(++i, a));
    else throw new Error(`unknown option ${a}\n${USAGE}`);
  }
  if (modes.length !== 1) throw new Error(`pass exactly one of --measure, --report, --check\n${USAGE}`);
  args.mode = modes[0];
  if (args.run !== null && !isDate(args.run)) throw new Error(`--run must be a date such as 2026-11-13 (got ${args.run})`);
  if (args.mode === "report" && args.run === null) throw new Error("--report needs --run <YYYY-MM-DD>: the run folder to regenerate");
  if (args.mode !== "measure" && (args.only || Object.keys(args.bases).length)) throw new Error("--only and --base belong to --measure");
  if (args.only) {
    if (!args.only.length) throw new Error("--only needs at least one screen id");
    for (const id of args.only) if (!SAFE_ID.test(id)) throw new Error(`--only: ${id} is not a screen id`);
    if (new Set(args.only).size !== args.only.length) throw new Error("--only lists a screen twice");
  }
  return args;
}

// `path + query` with a trailing `index.html` and trailing slashes removed; the fragment is ignored.
export function samePage(listed, final) {
  const norm = (value) => { const u = new URL(value); return `${u.pathname.replace(/index\.html$/u, "").replace(/\/+$/u, "")}${u.search}`; };
  try { return norm(listed) === norm(final); } catch { return false; }
}

// A fetch for checkRobots that fetches each origin's robots.txt once per run and answers with a
// server error when the response's final URL is on another origin, so a robots.txt that redirects
// away (into a sign-in flow, say) reads as disallowed. A failed fetch is remembered as failed.
export function cachedRobots(fetchImpl = globalThis.fetch) {
  const cache = new Map();
  return async (robotsUrl, init) => {
    const origin = new URL(robotsUrl).origin;
    if (!cache.has(origin)) {
      cache.set(origin, (async () => {
        const res = await fetchImpl(robotsUrl, init);
        let finalOrigin = origin;
        try { if (res.url) finalOrigin = new URL(res.url).origin; } catch { finalOrigin = null; }
        if (finalOrigin !== origin) return { status: 503, body: "" };
        return { status: res.status, body: res.status >= 200 && res.status < 300 ? await res.text() : "" };
      })());
    }
    const r = await cache.get(origin);
    return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => r.body };
  };
}

// The measured URL of a self-hosted screen: the --base prefix plus what follows basePath in the
// listed URL (path and query).
export function selfHostedUrl(listed, basePath, base) {
  const u = new URL(listed);
  if (!u.pathname.startsWith(basePath)) throw new Error(`${listed} does not start with the lineage's basePath ${basePath}`);
  return `${base}${u.pathname.slice(basePath.length)}${u.search}`;
}

const errorReason = (e) => (e && (e.name === "TimeoutError" || /Timeout \d+ms exceeded|timeout/iu.test(e.message || "")) ? "timeout" : "navigation-error");
const total = (map) => Object.values(map ?? {}).reduce((a, b) => a + Number(b), 0);

// One viewport of one screen: a new context, one load, the guards, the five probes, the guards after.
// Returns { status: "measured", httpStatus, outputs: { design, structure, faults, controls, guards } }
// or { status: "failed", reason }. `expect` (the 1440 viewport only) holds the floors.
export async function measureViewport(browser, url, { width, height }, { timeout = 45000, allowFile = false, expect = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    let response;
    try {
      response = await page.goto(url, { waitUntil: "load", timeout });
      await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(500);
    } catch (e) { return { status: "failed", reason: errorReason(e) }; }
    const fileOk = allowFile && url.startsWith("file:");
    const httpStatus = response ? response.status() : null;
    if (fileOk ? httpStatus !== null && httpStatus >= 400 : !response || httpStatus >= 400) return { status: "failed", reason: "http-error" };
    const finalUrl = page.url();
    let sameOrigin = false;
    try { sameOrigin = new URL(finalUrl).origin === new URL(url).origin && new URL(finalUrl).protocol === new URL(url).protocol; } catch {}
    if (!sameOrigin) return { status: "failed", reason: "redirected-host" };
    if (!samePage(url, finalUrl)) return { status: "failed", reason: "redirected-path" };
    const outputs = {};
    try {
      for (const [key, probe] of [["design", observeDesign], ["structure", observeStructure], ["faults", observeFaults], ["controls", observeControls], ["guards", observeGuards]]) {
        outputs[key] = await page.evaluate(probe, { maxElements: MAX_ELEMENTS });
      }
    } catch (e) { return { status: "failed", reason: errorReason(e) }; }
    if (Number(outputs.guards?.overlayShare ?? 0) >= 0.5) return { status: "failed", reason: "overlay" };
    if (expect) {
      const seen = { elements: outputs.design.elements, tables: (outputs.structure.tables ?? []).length, fields: total(outputs.controls.fields), buttons: total(outputs.controls.buttons) };
      if (Object.entries(expect).some(([k, floor]) => !(seen[k] >= floor))) return { status: "failed", reason: "unexpected-content" };
    }
    return { status: "measured", httpStatus, outputs };
  } finally { await context.close().catch(() => {}); }
}

// What the record keeps of the fault probe: analyzeFaults plus the true count per class and the
// length of each candidate list; at most 50 findings per class.
function faultsBlock(probe) {
  const a = analyzeFaults(probe);
  const counts = Object.fromEntries(FAULT_CLASSES.map((c) => [c.id, a.findings.filter((f) => f.class === c.id).length]));
  const candidates = Object.fromEntries(CANDIDATE_LISTS.map((k) => [k, (probe[k] ?? []).length]));
  const findings = FAULT_CLASSES.flatMap((c) => a.findings.filter((f) => f.class === c.id).slice(0, FINDINGS_PER_CLASS));
  return { counts, candidates, findings, distribution: a.distribution, icons: a.icons, capped: a.capped };
}

function viewportEntry({ width, height }, m) {
  if (m.status !== "measured") return { viewport: width, height, status: "failed", reason: m.reason };
  const { design: d, structure: s, faults, controls: c, guards } = m.outputs;
  return {
    viewport: width, height, status: "measured", httpStatus: m.httpStatus,
    elements: d.elements, truncated: d.truncated, documentHeight: d.documentHeight, overlayShare: guards.overlayShare,
    design: { controlHeights: d.controlHeights, radii: d.radii, targets: d.targets, type: d.type, spacing: d.spacing, bodyFontSize: d.body?.fontSize ?? null },
    structure: { regions: s.regions, controls: s.controls, tables: s.tables, lists: s.lists, tabs: s.tabs, css: s.css, skipped: s.skipped },
    controls: { fields: c.fields, buttons: c.buttons, pairs: c.pairs, textSizes: c.textSizes, capped: c.capped, truncated: c.truncated },
    faults: faultsBlock(faults),
  };
}

// The stored record of one measured screen (numbers and enums; `url` is the listed URL).
export function buildRecord({ screen, access, robots, observedAt, sizes, results }) {
  const measured = results.filter((m) => m.status === "measured");
  const observations = measured.map((m) => ({ ...m.outputs.design, structure: m.outputs.structure }));
  const summary = summarize(observations);
  const facts = buildFacts(summary, summary.structure ?? null, screen.url, observedAt).facts;
  const motion = summary.motion ?? {};
  return {
    recordVersion: RECORD_VERSION, screen: screen.id, url: screen.url, access, observedAt, robots, scroll: false,
    viewports: sizes.map((size, i) => viewportEntry(size, results[i])),
    values: {
      accent: summary.accentDerived ?? null, ink: summary.ink ?? null, canvas: summary.canvas ?? null,
      spacingBase: summary.spacingBase ?? null, spacingCoverage: summary.spacingCoverage ?? 0, spacingScale: summary.spacingScale ?? [],
      radii: summary.radii ?? [], controlHeights: summary.controlHeights ?? [],
      typeSizes: [...new Set((summary.typeStepDetail ?? []).map((t) => t.px))].sort((a, b) => a - b),
      fontCount: new Set(observations.flatMap((o) => Object.keys(o.fonts ?? {}))).size,
      motion: { transitions: motion.transitions ?? 0, durations: motion.durations ?? [], properties: motion.properties ?? {} },
    },
    facts,
  };
}

// Measure the listed screens (or `only`) in manifest order. Returns { rows, records, chromium,
// probes }: one status row per screen and one record per measured screen. `file:` URLs are accepted
// only with `allowFile` (tests), and they skip the robots.txt check.
export async function measureScreens(manifest, { chromium, allowFile = false, delay = 4000, timeout = 45000, today, only = null, bases = {}, fetchImpl = globalThis.fetch, log = () => {} } = {}) {
  if (!isDate(today ?? "")) throw new Error("measureScreens: pass today as a date (YYYY-MM-DD)");
  const robotsFetch = cachedRobots(fetchImpl);
  const lineages = new Map(manifest.lineages.map((l) => [l.id, l]));
  const sizes = manifest.viewports.map(([width, height]) => ({ width, height }));
  const screens = manifest.screens.filter((s) => !only || only.includes(s.id));
  const rows = [], records = [];
  const pause = (ms) => new Promise((done) => setTimeout(done, ms));
  let browser = null, version = null, probes = null;
  try {
    for (const screen of screens) {
      const lineage = lineages.get(screen.lineage);
      const skip = (reason) => { rows.push({ screen: screen.id, status: "skipped", reason }); log(`${screen.id}: skipped (${reason})`); };
      if (!lineage || lineage.access === "skipped" || (lineage.access === "hosted" && ["restricted", "unchecked"].includes(lineage.terms?.automatedAccess))) { skip("terms"); continue; }
      let url = screen.url, robots = "not-checked";
      if (lineage.access === "self-hosted") {
        if (!bases[lineage.id]) { skip("no-base"); continue; }
        url = selfHostedUrl(screen.url, lineage.basePath, bases[lineage.id]);
      }
      const protocol = new URL(url).protocol;
      if (protocol === "file:" ? !allowFile : !["http:", "https:"].includes(protocol)) throw new Error(`${screen.id}: ${protocol} URLs are not measured (file: URLs only in tests, with allowFile)`);
      if (lineage.access === "hosted" && protocol !== "file:") {
        const verdict = await checkRobots(url, { fetchImpl: robotsFetch });
        if (verdict.status !== "allowed") { skip("robots"); continue; }
        robots = "allowed";
      }
      if (!browser) { browser = await chromium.launch({ headless: true }); version = browser.version(); }
      const results = [];
      for (const [i, size] of sizes.entries()) {
        const m = await measureViewport(browser, url, size, { timeout, allowFile, expect: i === 0 ? screen.expect : null });
        results.push(m);
        await pause(delay);
        if (i === 0 && m.status !== "measured") break;
      }
      if (results[0].status !== "measured") { rows.push({ screen: screen.id, status: "failed", reason: results[0].reason }); log(`${screen.id}: failed (${results[0].reason})`); continue; }
      probes ??= { structure: results[0].outputs.structure.version ?? null, faults: results[0].outputs.faults.version ?? null, controls: results[0].outputs.controls.version ?? null };
      records.push(buildRecord({ screen, access: lineage.access, robots, observedAt: today, sizes, results }));
      const narrow = results.slice(1).find((m) => m.status !== "measured");
      rows.push({ screen: screen.id, status: "measured", ...(narrow ? { narrow: narrow.reason } : {}) });
      log(`${screen.id}: measured${narrow ? ` (390 failed: ${narrow.reason})` : ""}`);
    }
  } finally { if (browser) await browser.close(); }
  return { rows, records, chromium: version, probes };
}

// --- Run folders --------------------------------------------------------------------------------

function readRun(dir) {
  const manifest = readJson(join(dir, "manifest.json"));
  const run = readJson(join(dir, "run.json"));
  const screensDir = join(dir, "screens");
  const records = existsSync(screensDir) ? readdirSync(screensDir).filter((n) => n.endsWith(".json")).sort().map((n) => readJson(join(screensDir, n))) : [];
  return { manifest, run, records };
}

// Errors in one stored run folder; [] when it holds only its JSON files and the two Markdown files,
// every JSON file but manifest.json passes the allow-list walk against that run's manifest, every
// listed screen has one status row (failed and skipped rows with a reason), every measured row has
// its record, and the generated files equal what their records give (same consensusVersion only).
export function checkRunFolder(dir) {
  const errors = [];
  const at = shown(dir);
  const name = basename(dir);
  if (!isDate(name)) errors.push(`${at}: a run folder is named by its date (YYYY-MM-DD)`);
  for (const file of ["run.json", "manifest.json", ...GENERATED]) if (!existsSync(join(dir, file))) errors.push(`${at}/${file}: missing; ${GENERATED.includes(file) ? `run --report --run ${name}` : "a run folder needs it"}`);
  if (errors.length) return { errors, counts: null };
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "screens") { errors.push(`${at}/${entry}: a run folder holds only screens/ as a subfolder`); continue; }
      for (const inner of readdirSync(path)) if (!inner.endsWith(".json") || statSync(join(path, inner)).isDirectory()) errors.push(`${at}/screens/${inner}: screens/ holds only .json records`);
    } else if (!entry.endsWith(".json") && !["CONSENSUS.md", "NEGATIVE-CONTROL.md"].includes(entry)) errors.push(`${at}/${entry}: a run folder holds only .json files, CONSENSUS.md, and NEGATIVE-CONTROL.md`);
  }
  let data;
  try { data = readRun(dir); } catch (e) { return { errors: [...errors, `${at}: ${e.message}`], counts: null }; }
  const { manifest, run, records } = data;
  const walk = (file, value) => { for (const bad of disallowedStrings(stripIds(value, manifest))) errors.push(`${at}/${file}: ${bad}`); };
  for (const entry of readdirSync(dir).filter((n) => n.endsWith(".json") && n !== "manifest.json").sort()) walk(entry, readJson(join(dir, entry)));
  if (existsSync(join(dir, "screens"))) for (const entry of readdirSync(join(dir, "screens")).filter((n) => n.endsWith(".json")).sort()) {
    const record = readJson(join(dir, "screens", entry));
    walk(`screens/${entry}`, record);
    if (`${record.screen}.json` !== entry) errors.push(`${at}/screens/${entry}: holds the record of ${record.screen}; name it ${record.screen}.json`);
  }
  if (run.run !== name) errors.push(`${at}/run.json: run is ${run.run}, the folder is ${name}`);
  const rows = run.screens ?? [];
  for (const s of manifest.screens) {
    const mine = rows.filter((r) => r.screen === s.id);
    if (mine.length !== 1) { errors.push(`${at}/run.json: ${s.id} needs exactly one status row (has ${mine.length})`); continue; }
    const row = mine[0];
    if (!["measured", "failed", "skipped"].includes(row.status)) errors.push(`${at}/run.json: ${s.id} has status ${row.status}`);
    if (row.status !== "measured" && !REASONS.includes(row.reason)) errors.push(`${at}/run.json: ${s.id} is ${row.status} without a known reason`);
    const hasRecord = records.some((r) => r.screen === s.id);
    if ((row.status === "measured") !== hasRecord) errors.push(`${at}: ${s.id} is ${row.status} in run.json but ${hasRecord ? "has" : "has no"} record in screens/`);
  }
  for (const r of rows) if (!manifest.screens.some((s) => s.id === r.screen)) errors.push(`${at}/run.json: status row for ${r.screen}, which manifest.json does not list`);
  const consensus = readJson(join(dir, "consensus.json"));
  if (consensus.consensusVersion === CONSENSUS_VERSION && !errors.length) {
    let fresh = null;
    try { fresh = generateReports(manifest, run, records); } catch (e) { errors.push(`${at}: ${e.message}`); }
    if (fresh) for (const file of GENERATED) if (readFileSync(join(dir, file), "utf8") !== fresh[file]) errors.push(`${at}/${file}: differs from what the records give; regenerate with --report --run ${name} (never edit a generated file by hand)`);
  }
  const counts = { listed: rows.length, measured: rows.filter((r) => r.status === "measured").length, failed: rows.filter((r) => r.status === "failed").length, skipped: rows.filter((r) => r.status === "skipped").length };
  return { errors, counts, regenerated: consensus.consensusVersion === CONSENSUS_VERSION };
}

export function runFolders(root) {
  const runs = join(root, "runs");
  if (!existsSync(runs)) return [];
  return readdirSync(runs).filter((n) => statSync(join(runs, n)).isDirectory()).sort().map((n) => join(runs, n));
}

function writeReports(dir) {
  const { manifest, run, records } = readRun(dir);
  const files = generateReports(manifest, run, records);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return Object.keys(files);
}

async function runMeasure(args, log = console.log) {
  const today = new Date().toISOString().slice(0, 10);
  const date = args.run ?? today;
  const dir = join(args.root, "runs", date);
  let manifest, manifestText;
  if (args.only) {
    if (!existsSync(join(dir, "run.json"))) throw new Error(`--only re-measures screens of an existing run, and ${shown(dir)} has no run.json; run --measure without --only first`);
    manifestText = readFileSync(join(dir, "manifest.json"), "utf8");
  } else {
    if (existsSync(dir)) throw new Error(`${shown(dir)} exists; an old run stays as it is. Pass --run <another date>, or --only <ids> to re-measure screens of that run`);
    manifestText = readFileSync(join(args.root, "screens.json"), "utf8");
  }
  manifest = JSON.parse(manifestText);
  const problems = validateManifest(manifest, args.only ? `${shown(dir)}/manifest.json` : `${shown(args.root)}/screens.json`);
  if (problems.length) throw new Error(problems.join("\n"));
  for (const id of args.only ?? []) if (!manifest.screens.some((s) => s.id === id)) throw new Error(`--only: ${id} is not a screen of ${args.only ? "this run's manifest.json" : "screens.json"}`);
  for (const [lineage, base] of Object.entries(args.bases)) {
    const l = manifest.lineages.find((x) => x.id === lineage);
    if (!l) throw new Error(`--base ${lineage}: no such lineage in the manifest`);
    if (l.access !== "self-hosted") throw new Error(`--base ${lineage}: the lineage's access is ${l.access}; only a self-hosted lineage takes --base`);
    if (!l.selfHosted) throw new Error(`--base ${lineage}: record the build first (selfHosted: { repository, commit, licence, builtAt } on the lineage in screens.json)`);
    log(`${lineage}: self-hosted, measured from ${base}`);
  }
  const { chromium, from } = await loadBrowser(args.browser);
  log(`run ${date}: ${args.only ? args.only.length : manifest.screens.length} screen(s), delay ${args.delay}ms, browser module ${shown(from)}`);
  const result = await measureScreens(manifest, { chromium, delay: args.delay, timeout: args.timeout, today, only: args.only, bases: args.bases, log });
  mkdirSync(join(dir, "screens"), { recursive: true });
  let run;
  if (args.only) {
    run = readJson(join(dir, "run.json"));
    const replaced = new Map(result.rows.map((r) => [r.screen, r]));
    run.screens = manifest.screens.map((s) => replaced.get(s.id) ?? run.screens.find((r) => r.screen === s.id)).filter(Boolean);
    if (!run.probes && result.probes) run.probes = result.probes;
    for (const id of args.only) rmSync(join(dir, "screens", `${id}.json`), { force: true });
  } else {
    writeFileSync(join(dir, "manifest.json"), manifestText);
    run = { run: date, version: STUDY_VERSION, probes: result.probes, chromium: result.chromium, viewports: manifest.viewports, scroll: false, delay: args.delay, faultClasses: FAULT_CLASSES.map((c) => c.id), screens: result.rows };
  }
  for (const record of result.records) writeFileSync(join(dir, "screens", `${record.screen}.json`), json(record));
  writeFileSync(join(dir, "run.json"), json(run));
  const counts = ["measured", "failed", "skipped"].map((s) => `${run.screens.filter((r) => r.status === s).length} ${s}`).join(", ");
  log(`run ${date}: ${counts} of ${run.screens.length} listed → ${shown(dir)}\nnext: node scripts/consensus-study.mjs --report --run ${date}`);
}

function runReport(args, log = console.log) {
  const dir = join(args.root, "runs", args.run);
  if (!existsSync(join(dir, "run.json"))) throw new Error(`${shown(dir)}/run.json is missing; measure the run first (--measure --run ${args.run})`);
  const written = writeReports(dir);
  log(`run ${args.run}: wrote ${written.join(", ")} → ${shown(dir)}`);
}

function runCheck(args, log = console.log) {
  const dirs = args.run ? [join(args.root, "runs", args.run)] : runFolders(args.root);
  if (args.run && !existsSync(dirs[0])) throw new Error(`${shown(dirs[0])} does not exist`);
  if (!dirs.length) { log(`no runs under ${shown(join(args.root, "runs"))}`); return true; }
  let ok = true;
  for (const dir of dirs) {
    const { errors, counts, regenerated } = checkRunFolder(dir);
    if (errors.length) { ok = false; log(`run ${basename(dir)}: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`); continue; }
    log(`run ${basename(dir)}: ${counts.listed} listed, ${counts.measured} measured, ${counts.failed} failed, ${counts.skipped} skipped; every JSON file passes the allow-list; ${regenerated ? "the generated files equal what the records give" : "generated with an older consensusVersion, not regenerated"}`);
  }
  return ok;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.mode === "measure") await runMeasure(args);
    else if (args.mode === "report") runReport(args);
    else if (!runCheck(args)) process.exit(1);
  } catch (e) { console.error(e.message); process.exit(1); }
}
