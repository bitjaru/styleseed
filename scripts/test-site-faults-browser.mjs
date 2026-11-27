#!/usr/bin/env node
// Browser gate for WO-23: the site's own pages pass the engine's render-fault probe, at phone width too.
// Starts the built demo (scripts/lib/demo-server.mjs), reads /sitemap.xml from it, takes the path of every
// <loc>, adds /try, and measures them through the engine's own entry (drift-report.mjs report() with
// --faults, as calibrate-render-faults.mjs does) at 1440×900 and 390×844. It fails on any finding of
// amount-wrap, text-overlap, text-spill, or text-clip on any page at either width, except those INTENDED
// allows (by page and class), and on an INTENDED entry that matches no finding. The other classes are not
// gated here and not printed. Output goes to a new temporary folder outside the repository; it is removed
// when the test passes and kept (and printed) when it fails.
//
// --scroll is not passed: no page of the site reveals content on scroll today (no IntersectionObserver
// and no whileInView under demo-pricing/app), the findings are the same with and without it, and it
// doubles the time. When a page starts revealing content on scroll, pass --scroll in the report() call.
//
//   node scripts/test-site-faults-browser.mjs        (after the demo build: node scripts/verify-repo.mjs)
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startDemoServer } from "./lib/demo-server.mjs";
import { parseArgs, report } from "../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browserModule = process.env.STYLESEED_BROWSER_MODULE || resolve(repoRoot, "demo-pricing/node_modules/playwright/index.mjs");
const GATED = ["amount-wrap", "text-overlap", "text-spill", "text-clip"];
// Pages that show faults on purpose: never measured here.
const NEVER = new Set(["/gallery/faults", "/gallery/transitions"]);
// Findings the site keeps on purpose, by page and class (not by count or viewport). An entry that matches no
// finding fails the test.
const INTENDED = [
  { path: "/showcase/night-poster", class: "text-overlap", why: "the poster sets its date behind the band and the footer on purpose" },
];
const CALLS = 4;
const labelOf = (path) => (path === "/" ? "home" : path.replace(/^\//u, "").replace(/\//gu, "-"));
const slash = (path) => path.split("\\").join("/");

// The measure of a gated finding, in words (analyze-faults.mjs does not export its own formatter).
function measureText(f) {
  const m = f.measure ?? {};
  if (f.class === "amount-wrap") return `${m.lines} lines, font ${m.size}px`;
  if (f.class === "text-overlap") return `intersection ${m.w}×${m.h}px, font ${m.size}px`;
  if (f.class === "text-spill") return `${m.by}px past the ${m.side} edge`;
  if (f.class === "text-clip") return `${m.by}px cut on ${m.axis}`;
  return JSON.stringify(m);
}
const findingLine = (path, f) => `${path} @${f.viewport}: ${f.class} ${measureText(f)} at [${f.box.join(", ")}]${f.against ? ` against [${f.against.join(", ")}]` : ""}`;

async function sitemapPaths(baseUrl) {
  const response = await fetch(`${baseUrl}/sitemap.xml`);
  if (!response.ok) throw new Error(`${baseUrl}/sitemap.xml answered ${response.status}: the built demo must serve demo-pricing/app/sitemap.ts`);
  const locs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, loc]) => new URL(loc.trim()).pathname);
  if (!locs.length) throw new Error(`${baseUrl}/sitemap.xml has no <loc>: check demo-pricing/app/sitemap.ts`);
  return [...new Set([...locs, "/try"])].filter((path) => !NEVER.has(path));
}

const started = Date.now();
const out = mkdtempSync(join(tmpdir(), "styleseed-site-faults-"));
let passed = false;
try {
  const server = await startDemoServer();
  let screens;
  try {
    const paths = await sitemapPaths(server.baseUrl);
    // Four report() calls at the same time, the pages dealt over them in sitemap order.
    const parts = Array.from({ length: CALLS }, (_, i) => paths.filter((_, j) => j % CALLS === i)).filter((part) => part.length);
    const results = await Promise.all(parts.map((part, i) => {
      const dir = join(out, `part-${i + 1}`);
      mkdirSync(dir, { recursive: true });
      const args = parseArgs([...part.map((path) => `${server.baseUrl}${path}`), "--out", dir, "--browser", browserModule, "--faults", "--labels", part.map(labelOf).join(",")]);
      return report(args, () => {});
    }));
    screens = parts.flatMap((part, i) => {
      const measured = results[i].faults.screens;
      if (measured.length !== part.length) throw new Error(`report() call ${i + 1} returned ${measured.length} screens for ${part.length} pages`);
      return part.map((path, k) => ({ path, findings: measured[k].findings }));
    });
  } finally { await server.stop(); }

  const used = new Set();
  const failures = [];
  for (const { path, findings } of screens) {
    for (const f of findings.filter((x) => GATED.includes(x.class))) {
      const entry = INTENDED.find((e) => e.path === path && e.class === f.class);
      if (entry) used.add(entry);
      else failures.push(findingLine(path, f));
    }
  }
  const dead = INTENDED.filter((e) => !used.has(e)).map((e) => `INTENDED { path: "${e.path}", class: "${e.class}" } matches no finding: no longer needed: remove it from scripts/test-site-faults-browser.mjs`);
  const seconds = Math.round((Date.now() - started) / 1000);
  if (failures.length || dead.length) {
    console.error(`Site render faults: FAIL on ${screens.length} pages at 1440 and 390 (${seconds}s)`);
    for (const line of [...failures, ...dead]) console.error(`  ${line}`);
    if (failures.length) {
      console.error("To see a page's findings, serve the build (npm run start --prefix demo-pricing) and run");
      console.error("  node engine/.claude/skills/styleseed/workflows/ss-verify/scripts/drift-report.mjs <url> --faults --browser demo-pricing/node_modules/playwright/index.mjs --out <dir outside the repository>");
      console.error("which writes FAULTS.md in <dir>.");
    }
    console.error(`This run's FAULTS.md files are kept in ${slash(out)}`);
    process.exitCode = 1;
  } else {
    const list = INTENDED.map((e) => `${e.path} ${e.class}`).join(", ");
    console.log(`Site render faults: ${screens.length} pages at 1440 and 390, no ${GATED.slice(0, -1).join(", ")} or ${GATED.at(-1)} outside ${INTENDED.length} intended (${list}); ${seconds}s`);
    passed = true;
  }
} catch (e) {
  console.error(e.message);
  console.error(`Output kept in ${slash(out)}`);
  process.exitCode = 1;
} finally {
  if (passed) rmSync(out, { recursive: true, force: true });
}
