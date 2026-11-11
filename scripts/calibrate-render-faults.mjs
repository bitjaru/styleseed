#!/usr/bin/env node
// Calibrate the render-fault classes on our own screens (WO-07 Part A, A6). Starts the built demo
// (scripts/lib/demo-server.mjs), runs drift-report.mjs report() with --faults on a fixed list of 32
// screens in three groups, and prints one Markdown table: findings per class and group at 1440 and at
// 390, the screens that have any, the candidate distributions, and every finding of the three gate
// candidates (amount-wrap, text-overlap, text-spill) with its screen, viewport, and box. The rule that
// reads this table is in the work order and in ss-verify/references/render-faults.md: a candidate
// gates only when it has zero findings on all 32 screens at both viewports. Not wired into
// verify-repo.mjs: the landing changes weekly. Output goes to --out <dir> (default: a new temporary
// folder, printed); never inside the repository.
//
//   node scripts/calibrate-render-faults.mjs [--out <dir>] [--browser <playwright module>]
import { mkdtempSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir, type, release, arch } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startDemoServer } from "./lib/demo-server.mjs";
import { parseArgs, report } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";
import { FAULT_CLASSES } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/analyze-faults.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GALLERY = ["button", "badge", "tabs", "input", "select", "switch", "table", "accordion", "progress", "segmented-control", "chart-card", "donut-chart-card", "progress-bar", "ranked-list", "top-bar", "stat-card"];
const SHOWCASE = ["chat", "finance", "fitness", "food", "issues", "music", "notes", "pricing", "settings", "wallet"];
export const CALIBRATION_SCREENS = Object.freeze([
  ...["/gallery", ...GALLERY.map((id) => `/gallery/${id}`)].map((path) => ({ group: "G", path })),
  ...["/", "/architecture", "/gate", "/learn", "/try"].map((path) => ({ group: "R", path })),
  ...SHOWCASE.map((id) => ({ group: "P", path: `/showcase/${id}` })),
]);
const GROUPS = [["G", "gallery (17)"], ["R", "site registry (5)"], ["P", "product-like (10)"]];
const CANDIDATES = ["amount-wrap", "text-overlap", "text-spill"];
const labelOf = (path) => (path === "/" ? "home" : path.replace(/^\//u, "").replace(/\//gu, "-"));

function options(argv) {
  const out = { out: null, browser: process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, "demo-pricing/node_modules/playwright/index.mjs") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out.out = argv[++i];
    else if (argv[i] === "--browser") out.browser = argv[++i];
    else throw new Error(`unknown option ${argv[i]}\nusage: calibrate-render-faults.mjs [--out <dir>] [--browser <playwright module>]`);
  }
  if (out.out !== null) {
    const rel = relative(repoRoot, resolve(out.out));
    if (!rel || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error(`--out ${out.out} is inside the repository; calibration output stays outside it (omit --out for a temporary folder)`);
  }
  return out;
}

const sum = (list) => list.reduce((a, b) => a + b, 0);
function addInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (key === "viewport") continue;
    if (typeof value === "number") target[key] = (target[key] ?? 0) + value;
    else if (value && typeof value === "object") addInto((target[key] ??= {}), value);
  }
  return target;
}

export function calibrationTable(faults, screens = CALIBRATION_SCREENS) {
  const groupOf = new Map(screens.map((s) => [labelOf(s.path), s.group]));
  const lines = [];
  lines.push(`| Class | ${GROUPS.map(([g]) => `${g} @1440 | ${g} @390`).join(" | ")} | Screens with any |`);
  lines.push(`|---|${GROUPS.map(() => "---|---").join("|")}|---|`);
  for (const c of FAULT_CLASSES) {
    const cells = [];
    for (const [g] of GROUPS) {
      for (const width of [1440, 390]) cells.push(sum(faults.screens.filter((s) => groupOf.get(s.label) === g).map((s) => s.findings.filter((f) => f.class === c.id && f.viewport === width).length)));
    }
    const any = faults.screens.filter((s) => s.counts[c.id] > 0).map((s) => `${s.label} (${s.counts[c.id]})`);
    lines.push(`| ${c.id} | ${cells.join(" | ")} | ${any.join(", ") || "none"} |`);
  }
  lines.push("", "Candidate distribution (records under each limit, both viewports, summed per group):", "");
  lines.push(`| Row | ${GROUPS.map(([g]) => g).join(" | ")} |`, `|---|${GROUPS.map(() => "---").join("|")}|`);
  const perGroup = Object.fromEntries(GROUPS.map(([g]) => [g, {}]));
  for (const s of faults.screens) for (const d of s.distribution) addInto(perGroup[groupOf.get(s.label)], d);
  const rows = [["tight-inset", "panel"], ["tight-inset", "chip"], ["text-touch"], ["near-touch"], ["near-align"]];
  for (const path of rows) {
    const pick = (g) => path.reduce((v, k) => v?.[k], perGroup[g]) ?? {};
    const limits = Object.keys(pick("G")).length ? Object.keys(pick("G")) : Object.keys(pick("R"));
    for (const limit of limits) lines.push(`| ${path.join(" ")} < ${limit} | ${GROUPS.map(([g]) => pick(g)[limit] ?? 0).join(" | ")} |`);
  }
  const capped = faults.screens.filter((s) => s.capped.some((c) => Object.keys(c).length > 1));
  lines.push("", `Lower bounds (a probe cap was reached): ${capped.map((s) => s.label).join(", ") || "none"}.`);
  lines.push("", "Gate-candidate findings (screen, viewport, box, against, measure):", "");
  const found = faults.screens.flatMap((s) => s.findings.filter((f) => CANDIDATES.includes(f.class)).map((f) => `- ${f.class} · ${s.label} @${f.viewport} · box [${f.box.join(", ")}]${f.against ? ` · against [${f.against.join(", ")}]` : ""} · ${JSON.stringify(f.measure)}`));
  lines.push(...(found.length ? found : ["- none"]));
  lines.push("", "Zero findings on all screens at both viewports:", "");
  for (const id of CANDIDATES) lines.push(`- ${id}: ${faults.totals.classes[id].findings === 0 ? "yes" : `no (${faults.totals.classes[id].findings})`}`);
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    const out = opts.out ? resolve(opts.out) : mkdtempSync(join(tmpdir(), "styleseed-calibrate-"));
    mkdirSync(out, { recursive: true });
    const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim();
    const dirty = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim() ? " (uncommitted changes)" : "";
    const server = await startDemoServer();
    const started = Date.now();
    let result;
    try {
      const urls = CALIBRATION_SCREENS.map((s) => `${server.baseUrl}${s.path}`);
      const args = parseArgs([...urls, "--out", out, "--browser", opts.browser, "--faults", "--labels", CALIBRATION_SCREENS.map((s) => labelOf(s.path)).join(",")]);
      result = await report(args, () => {});
    } finally { await server.stop(); }
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(`# Render-fault calibration\n\nCommit ${commit}${dirty} · ${type()} ${release()} ${arch()} · Node ${process.version} · ${CALIBRATION_SCREENS.length} screens at 1440×900 and 390×844 · ${seconds}s · output ${out.split("\\").join("/")}\n`);
    console.log(`Verdict: ${result.faults.verdict}\n`);
    console.log(calibrationTable(result.faults));
  } catch (e) { console.error(e.message); process.exit(1); }
}
