import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "..");
const output = resolve(root, "scripts/captures/palettes");
const baseUrl = process.env.STYLESEED_CAPTURE_URL || "http://127.0.0.1:4177";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();

async function ready(page) {
  await page.goto(`${baseUrl}/palettes`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const desktopPage = await desktop.newPage();
await ready(desktopPage);
await desktopPage.screenshot({ path: resolve(output, "desktop-default.png"), fullPage: true });
const keyColorInput = desktopPage.locator("#key-color");
await keyColorInput.fill("#D84A2F");
await keyColorInput.press("Enter");
await desktopPage.getByRole("button", { name: "Vivid" }).click();
await desktopPage.getByRole("button", { name: "Dark" }).click();
await desktopPage.getByRole("button", { name: "Contrast" }).click();
await desktopPage.waitForTimeout(250);
await desktopPage.screenshot({ path: resolve(output, "desktop-dark-vivid.png"), fullPage: true });
const passingText = await desktopPage.getByText(/gates pass/).textContent();
const committedKey = await keyColorInput.inputValue();
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await mobile.newPage();
await ready(mobilePage);
await mobilePage.screenshot({ path: resolve(output, "mobile.png"), fullPage: true });
await mobile.close();

await browser.close();
console.log(JSON.stringify({
  screenshots: [
    resolve(output, "desktop-default.png"),
    resolve(output, "desktop-dark-vivid.png"),
    resolve(output, "mobile.png"),
  ],
  passingText,
  committedKey,
}, null, 2));
