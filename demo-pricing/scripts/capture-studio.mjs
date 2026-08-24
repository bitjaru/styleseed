import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const output = resolve(root, "scripts/captures/studio");
const recordings = resolve(root, "scripts/recordings/studio");
const baseUrl = process.env.STYLESEED_CAPTURE_URL || "http://localhost:4174";

mkdirSync(output, { recursive: true });
mkdirSync(recordings, { recursive: true });

const browser = await chromium.launch();

async function ready(page) {
  await page.goto(`${baseUrl}/studio`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const desktopPage = await desktop.newPage();
await ready(desktopPage);
await desktopPage.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });
await desktopPage.getByRole("button", { name: /Shape the launch narrative/ }).click();
await desktopPage.waitForTimeout(650);
await desktopPage.screenshot({ path: resolve(output, "desktop-focus.png"), fullPage: true });
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await mobile.newPage();
await ready(mobilePage);
await mobilePage.screenshot({ path: resolve(output, "mobile.png"), fullPage: true });
await mobile.close();

const videoContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "no-preference",
  recordVideo: { dir: recordings, size: { width: 390, height: 844 } },
});
const videoPage = await videoContext.newPage();
const video = videoPage.video();
await ready(videoPage);
await videoPage.getByRole("button", { name: /Shape the launch narrative/ }).click();
await videoPage.waitForTimeout(1400);
await videoPage.getByLabel("Back to tasks").click();
await videoPage.waitForTimeout(900);
await videoPage.close();
const rawVideo = await video.path();
await videoContext.close();
const finalVideo = resolve(recordings, "studio-signature.webm");
rmSync(finalVideo, { force: true });
renameSync(rawVideo, finalVideo);

const reduced = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const reducedPage = await reduced.newPage();
await ready(reducedPage);
await reducedPage.getByRole("button", { name: /Shape the launch narrative/ }).click();
await reducedPage.waitForTimeout(100);
await reducedPage.screenshot({ path: resolve(output, "mobile-reduced-focus.png"), fullPage: true });
await reduced.close();

await browser.close();
console.log(JSON.stringify({
  screenshots: [
    resolve(output, "desktop.png"),
    resolve(output, "desktop-focus.png"),
    resolve(output, "mobile.png"),
    resolve(output, "mobile-reduced-focus.png"),
  ],
  recording: finalVideo,
}, null, 2));
