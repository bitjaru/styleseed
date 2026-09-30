#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const host = "127.0.0.1";
const routes = ["/", "/gate", "/learn", "/evaluate", "/faq", "/guides", "/codex-ui-design", "/claude-code-ui-design", "/fix-ui-spacing"];
const serverOutput = [];

const sleep = (milliseconds) => new Promise((resolvePromise) => {
  setTimeout(resolvePromise, milliseconds);
});

async function availablePort() {
  const probe = createServer();
  probe.listen(0, host);
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a browser-smoke port");
  await new Promise((resolvePromise, rejectPromise) => {
    probe.close((error) => (error ? rejectPromise(error) : resolvePromise()));
  });
  return address.port;
}

function rememberServerOutput(chunk) {
  serverOutput.push(String(chunk));
  if (serverOutput.length > 80) serverOutput.splice(0, serverOutput.length - 80);
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js exited before browser smoke tests started (exit ${child.exitCode})`);
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for the Next.js production server");
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), sleep(5_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function assertJson(baseUrl, path, validate) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  const value = await response.json();
  validate(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isLocalVercelAnalyticsShim(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === baseUrl && parsed.pathname === "/_vercel/insights/script.js";
  } catch {
    return false;
  }
}

async function checkRoutes(browser, baseUrl, label, options) {
  const context = await browser.newContext(options);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseUrl });
  const failures = [];
  try {
    for (const route of routes) {
      const page = await context.newPage();
      if (route === "/fix-ui-spacing") await page.addInitScript(() => {
        window.__proofEvents = [];
        window.va = (...args) => { if (args[0] === "event") window.__proofEvents.push(args[1]); };
      });
      const pageFailures = [];
      page.on("pageerror", (error) => pageFailures.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const location = message.location();
        // `next start` is not the Vercel edge runtime, so its analytics shim is intentionally absent.
        // Keep this exact exception local; every other console error remains a hard failure.
        if (location.url && isLocalVercelAnalyticsShim(location.url)) return;
        const source = location.url
          ? ` @ ${location.url}${Number.isInteger(location.lineNumber) ? `:${location.lineNumber}` : ""}`
          : "";
        pageFailures.push(`console.error: ${message.text()}${source}`);
      });
      page.on("response", (response) => {
        if (response.status() < 400) return;
        if (isLocalVercelAnalyticsShim(response.url())) return;
        const url = new URL(response.url());
        if (url.origin === baseUrl) pageFailures.push(`HTTP ${response.status()}: ${url.pathname}`);
      });
      try {
        const response = await page.goto(`${baseUrl}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if (!response || !response.ok()) {
          pageFailures.push(`main document returned ${response?.status() ?? "no response"}`);
        }
        await page.waitForTimeout(300);
        if (route === "/fix-ui-spacing") {
          const before = page.getByRole("button", { name: "Before: inherited gap" });
          const after = page.getByRole("button", { name: "After: isolated gap" });
          await page.getByTestId("measured-gap").filter({ hasText: "64" }).waitFor();
          assert(await before.getAttribute("aria-pressed") === "true", "Spacing before state is not exposed");
          const gap = () => page.getByTestId("proof-stack").evaluate(el => parseFloat(getComputedStyle(el).rowGap));
          assert(await gap() === 64, "Spacing fixture did not reproduce inherited gap");
          const capture = process.env.STYLESEED_PROOF_CAPTURE;
          if (capture) { mkdirSync(capture, { recursive: true }); await page.screenshot({ path: resolve(capture, `${label}-before.png`), fullPage: true }); }
          await after.focus();
          await page.keyboard.press("Enter");
          await page.getByTestId("measured-gap").filter({ hasText: "12" }).waitFor();
          assert(await gap() === 12 && await after.getAttribute("aria-pressed") === "true", "Spacing fix or keyboard state failed");
          if (capture) await page.screenshot({ path: resolve(capture, `${label}-after.png`), fullPage: true });
          await before.click();
          assert(await gap() === 64, "Spacing demo cannot return to before state");
          const share = page.getByRole("button", { name: "Copy example link" });
          await share.click();
          assert(await page.evaluate(() => navigator.clipboard.readText()) === "https://styleseed-demo.vercel.app/fix-ui-spacing", "Proof share URL differs");
          const task = page.getByRole("button", { name: "Copy this task prompt" });
          await task.click();
          assert((await page.evaluate(() => navigator.clipboard.readText())).startsWith("The spacing on this screen feels wrong."), "Proof task prompt was not copied");
          const sourceResponse = await fetch(`${baseUrl}/fix-ui-spacing`);
          const source = await sourceResponse.text();
          assert(source.includes("Three checks before changing the numbers"), "Guide answer missing from server HTML");
          assert(await page.locator('link[rel="canonical"]').getAttribute("href") === "https://styleseed-demo.vercel.app/fix-ui-spacing", "Proof canonical URL differs");
          const article = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(n => JSON.parse(n.textContent)).find(x => x["@type"] === "TechArticle"));
          assert(article?.headline === "Why is my AI-generated UI spacing wrong?", "Proof structured data differs");
        }
        const installButton = page.getByRole("button", { name: /^Copy install command:/ }).first();
        if (await installButton.count()) {
          const command = await installButton.locator("code").innerText();
          await installButton.click();
          assert(await page.evaluate(() => navigator.clipboard.readText()) === command, `${route}: clipboard command differs from visible command`);
          // Clipboard denial must leave an exact, selectable command and readable recovery text.
          await page.evaluate(() => {
            navigator.clipboard.writeText = async () => { throw new Error("Test clipboard denial"); };
          });
          await installButton.click();
          assert(await page.evaluate(() => window.getSelection()?.toString()) === command, `${route}: manual-copy selection differs`);
          assert(await page.getByText("Clipboard access was blocked. The command is selected — copy it manually.").count() > 0, `${route}: missing manual-copy guidance`);
        }
        if (route === "/fix-ui-spacing") {
          await page.getByRole("button", { name: "Copy example link" }).click();
          assert(await page.getByText("Copy this link: https://styleseed-demo.vercel.app/fix-ui-spacing").count() === 1, "Share clipboard fallback missing");
          await page.getByRole("button", { name: "Copy this task prompt" }).click();
          assert(await page.getByText("Clipboard access was blocked. The prompt is selected — copy it manually.").count() === 1, "Task clipboard fallback missing");
          const events = await page.evaluate(() => window.__proofEvents);
          for (const name of ["spacing-proof-view", "spacing-proof-before", "spacing-proof-after", "spacing-proof-share-copy", "spacing-proof-prompt-copy", "spacing-proof-install-copy"]) {
            assert(events.filter(event => event.name === name).length === 1, `${name}: event missing, duplicated, or emitted after clipboard failure`);
          }
          assert(events.every(event => !event.data), "Proof events must not carry project or clipboard data");
          const ogUrl = await page.locator('meta[property="og:image"]').first().getAttribute("content");
          const og = await fetch(`${baseUrl}${new URL(ogUrl, baseUrl).pathname}`);
          assert(og.ok && og.headers.get("content-type")?.startsWith("image/"), "Proof share card is not readable");
          if (process.env.STYLESEED_PROOF_CAPTURE && label === "desktop") writeFileSync(resolve(process.env.STYLESEED_PROOF_CAPTURE, "share-card.png"), Buffer.from(await og.arrayBuffer()));
        }
        if (route === "/faq") {
          assert(await page.title() === "AI app looks amateur? Fix common UI problems · StyleSeed", "FAQ title does not match the page's search intent");
          const structuredAnswersMatch = await page.evaluate(() => {
            const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => JSON.parse(node.textContent)).find((value) => value["@type"] === "FAQPage");
            const visible = document.body.innerText;
            return Array.isArray(schema?.mainEntity) && schema.mainEntity.every((entry) => visible.includes(entry.name) && visible.includes(entry.acceptedAnswer.text));
          });
          assert(structuredAnswersMatch, "FAQ structured answers differ from visible content");
        }
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body?.scrollWidth ?? 0,
          title: document.title,
        }));
        if (!dimensions.title.trim()) pageFailures.push("document title is empty");
        if (dimensions.scrollWidth > dimensions.clientWidth + 1) {
          pageFailures.push(`document overflow ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`);
        }
        if (dimensions.bodyScrollWidth > dimensions.clientWidth + 1) {
          pageFailures.push(`body overflow ${dimensions.bodyScrollWidth}px > ${dimensions.clientWidth}px`);
        }
      } catch (error) {
        pageFailures.push(error instanceof Error ? error.message : String(error));
      } finally {
        await page.close();
      }
      if (pageFailures.length > 0) failures.push(`${label} ${route}: ${pageFailures.join(" | ")}`);
    }
  } finally {
    await context.close();
  }
  return failures;
}

const port = Number(process.env.STYLESEED_SMOKE_PORT) || await availablePort();
const baseUrl = `http://${host}:${port}`;
const nextBin = resolve(appRoot, "node_modules/next/dist/bin/next");
const server = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", String(port)], {
  cwd: appRoot,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", rememberServerOutput);
server.stderr.on("data", rememberServerOutput);

let browser;
try {
  await waitForServer(baseUrl, server);
  await assertJson(baseUrl, "/version.json", (value) => {
    assert(/^\d+\.\d+\.\d+$/u.test(value.version), "version.json has no semantic version");
    assert(/^sha256:[0-9a-f]{64}$/u.test(value.revision), "version.json has no exact core revision");
    assert(value.skills === 23, `version.json expected 23 skills, found ${String(value.skills)}`);
  });
  await assertJson(baseUrl, "/.well-known/styleseed/registry.json", (value) => {
    assert(/^\d+\.\d+\.\d+$/u.test(value.context?.engineVersion), "registry has no engine version");
    assert(/^sha256:[0-9a-f]{64}$/u.test(value.context?.engineRevision), "registry has no engine revision");
  });
  await assertJson(baseUrl, "/.well-known/agent-skills/index.json", (value) => {
    assert(Array.isArray(value.skills) && value.skills.length === 23, "agent skill index does not expose 23 skills");
  });
  await assertJson(baseUrl, "/api/github-stars", (value) => {
    assert(
      value.stars === null || (Number.isSafeInteger(value.stars) && value.stars >= 0),
      "github stars endpoint returned an invalid fallback payload",
    );
  });

  browser = await chromium.launch({ headless: true });
  const failures = [
    ...await checkRoutes(browser, baseUrl, "desktop", { viewport: { width: 1440, height: 900 } }),
    ...await checkRoutes(browser, baseUrl, "mobile/reduced-motion", {
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      isMobile: true,
      hasTouch: true,
    }),
  ];
  if (failures.length > 0) throw new Error(`Browser smoke failures:\n- ${failures.join("\n- ")}`);
  console.log(`Browser smoke verified ${routes.length} routes at desktop and 390x844 mobile/reduced-motion viewports.`);
  console.log("Public version, StyleSeed registry, and 23-skill discovery endpoints are readable.");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  if (serverOutput.length > 0) console.error(`Next.js output:\n${serverOutput.join("")}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
