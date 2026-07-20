/**
 * Export the five Signal Reset frames from the production Next.js build.
 * Run `npm run build` first, then `npm run export:signal-carousel`.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 3041;
const OUT_DIR = "public/showcase-artifacts/signal-carousel";
const FRAMES = [
  { index: 1, file: "01-hook.png", role: "hook" },
  { index: 2, file: "02-evidence.png", role: "sourced-evidence" },
  { index: 3, file: "03-action.png", role: "action" },
  { index: 4, file: "04-reframe.png", role: "reframe" },
  { index: 5, file: "05-cta.png", role: "cta-and-attribution" },
];

mkdirSync(OUT_DIR, { recursive: true });

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});

const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("next start timed out; run npm run build first")), 30_000);
  server.stdout.on("data", (chunk) => {
    if (/Ready in|started server on/i.test(chunk.toString())) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  server.on("exit", (code) => {
    if (code && code !== 0) {
      clearTimeout(timer);
      reject(new Error(`next start exited with code ${code}; run npm run build first`));
    }
  });
});
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await ready;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1440 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const manifestFrames = [];

  for (const frame of FRAMES) {
    await page.goto(`http://localhost:${PORT}/showcase/signal-carousel/export/${frame.index}`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    const artifact = page.locator("[data-carousel-export]");
    const png = await artifact.screenshot({ type: "png", animations: "disabled" });
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== 1080 || height !== 1440) {
      throw new Error(`${frame.file} exported at ${width}x${height}, expected 1080x1440`);
    }
    writeFileSync(`${OUT_DIR}/${frame.file}`, png);
    manifestFrames.push({
      ...frame,
      width,
      height,
      bytes: png.length,
      sha256: createHash("sha256").update(png).digest("hex"),
    });
    console.log(`✓ ${frame.file} · ${width}×${height} · ${(png.length / 1024).toFixed(1)}KB`);
  }

  writeFileSync(
    `${OUT_DIR}/manifest.json`,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        id: "signal-carousel",
        canvas: { width: 1080, height: 1440, aspectRatio: "3:4" },
        sequence: "hook → sourced evidence → action → reframe → CTA",
        renderer: "Playwright Chromium capture of the production Next.js export route",
        source: {
          title: "Why is it so hard to do my work? The challenge of attention residue when switching between work tasks",
          author: "Sophie Leroy",
          year: 2009,
          doi: "10.1016/j.obhdp.2009.04.002",
          url: "https://doi.org/10.1016/j.obhdp.2009.04.002",
        },
        frames: manifestFrames,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`✓ manifest.json · ${manifestFrames.length} verified frames`);

  await context.close();
  await browser.close();
} finally {
  server.kill("SIGTERM");
}
