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
const routes = ["/", "/gate", "/learn", "/evaluate", "/faq", "/guides", "/codex-ui-design", "/claude-code-ui-design", "/fix-ui-spacing", "/upgrade"];
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

// Routes outside the sitemap that take their search facts from the root layout; swept with the sitemap pages.
const searchExtraPaths = ["/gallery/faults", "/gallery/button", "/gallery/transitions", "/try"];
const siteNameTwice = /StyleSeed\s*[·—–-]\s*StyleSeed\s*$/u;
// /faq: the five problem questions, the new-product question, and the page's own 21 entries.
const faqStructuredQuestions = 27;
const newProductQuestion = {
  id: "which-design-system",
  question: "Which design system should my app start from?",
  answer: "There is no single best one. It depends on what the product is and who uses it. Start from a few decisions that fit together: a look, a key colour, and how tall and how round the controls are. Before you pick, look at how public design systems draw the same parts. When a tool recommends something, ask where the recommendation comes from. A value measured on public design systems is evidence. A default is a starting point.",
  // WO-20 D: setup can take three sizes of a measured system, drawn first.
  fit: "StyleSeed’s setup recommends one of its built-in looks for the kind of product and says that this is its own default, not a measured value. For control height and text size it shows counts from public design systems where it has them; its other sizes are its own defaults and are labelled so. Setup can take the button height and the button and field corners from one of the measured systems: it draws them and asks before recording them.",
};
const entities = { amp: "&", quot: "\"", lt: "<", gt: ">", "#x27": "'", "#39": "'" };

function decodeEntities(value) {
  return value.replace(/&(amp|quot|lt|gt|#x27|#39);/gu, (_, name) => entities[name]);
}

function readHead(html) {
  const head = html.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/u)?.[1] ?? "";
  const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(([, name, value]) => [name, decodeEntities(value)]));
  const metas = [...head.matchAll(/<meta\b[^>]*>/gu)].map(([tag]) => attributes(tag));
  const links = [...head.matchAll(/<link\b[^>]*>/gu)].map(([tag]) => attributes(tag));
  return {
    titles: [...head.matchAll(/<title(?:\s[^>]*)?>([^<]*)<\/title>/gu)].map(([, text]) => decodeEntities(text)),
    canonicals: links.filter((link) => link.rel === "canonical").map((link) => link.href),
    meta: (key) => metas.filter((meta) => meta.property === key || meta.name === key).map((meta) => meta.content),
  };
}

// Every sitemap page, plus the routes above, states its own address and share title to search engines and chat cards.
// The <loc> values are production addresses: each is fetched from the local server by its path and compared as written.
async function checkSearchFacts(baseUrl) {
  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  assert(sitemap.ok, `/sitemap.xml returned HTTP ${sitemap.status}`);
  const listed = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, loc]) => decodeEntities(loc.trim()));
  assert(listed.length > 0, "/sitemap.xml lists no <loc>; the search-facts sweep has nothing to read");
  const origin = new URL(listed[0]).origin;
  const home = readHead(await (await fetch(`${baseUrl}/`)).text());
  const [homeOgTitle] = home.meta("og:title");
  const [homeTwitterTitle] = home.meta("twitter:title");
  const failures = [];
  if (!homeOgTitle) failures.push("/: og:title is missing, so no page can be compared with the home's");
  if (!homeTwitterTitle) failures.push("/: twitter:title is missing, so no page can be compared with the home's");
  const strip = (address) => address.replace(/\/$/u, "");
  const addresses = [...listed, ...searchExtraPaths.map((path) => `${origin}${path}`)];
  const guides = { index: 0, domains: 0 };
  const pages = new Map();
  for (const address of addresses) {
    const url = new URL(address);
    const route = url.pathname;
    if (url.origin !== origin) {
      failures.push(`${address}: listed under ${url.origin}, not the sitemap's origin ${origin}`);
      continue;
    }
    const response = await fetch(`${baseUrl}${route}${url.search}`, { redirect: "manual" });
    const html = await response.text();
    if (response.ok) pages.set(linkPath(route), html);
    const page = readHead(html);
    // The guides are StyleSeed's own guidance, not measured; each says so and links the measured systems.
    const guide = route.match(/^\/guides(\/[^/]+)?$/u);
    if (guide) {
      guides[guide[1] ? "domains" : "index"] += 1;
      if (!/<a\b[^>]*\bhref="\/systems"/u.test(html)) failures.push(`${route}: no link to /systems; a guide says it is not measured and links "Design systems we measured"`);
    }
    const own = (key, values) => {
      if (values.length !== 1 || strip(values[0]) !== strip(address)) failures.push(`${route}: ${key} is ${values.join(", ") || "missing"}, expected its own address ${address}`);
    };
    if (!response.ok) failures.push(`${route}: answers HTTP ${response.status}`);
    own("canonical", page.canonicals);
    own("og:url", page.meta("og:url"));
    for (const key of ["og:image", "twitter:image"]) {
      if (page.meta(key).length === 0) failures.push(`${route}: ${key} is missing`);
    }
    if (route !== "/") {
      for (const [key, homeTitle] of [["og:title", homeOgTitle], ["twitter:title", homeTwitterTitle]]) {
        if (homeTitle && page.meta(key).includes(homeTitle)) failures.push(`${route}: ${key} is the home's ("${homeTitle}")`);
      }
    }
    if (page.titles.length !== 1) failures.push(`${route}: ${page.titles.length} <title> elements, expected one`);
    for (const title of page.titles) {
      if (siteNameTwice.test(title)) failures.push(`${route}: title "${title}" prints the site name twice`);
    }
    const descriptions = page.meta("description").length;
    if (descriptions !== 1) failures.push(`${route}: ${descriptions} description tags, expected one`);
  }
  if (guides.index !== 1 || guides.domains === 0) failures.push(`/sitemap.xml lists ${guides.index} /guides index and ${guides.domains} /guides/<domain> pages; the /systems link check needs the index and the domain guides`);
  const links = await checkLinks(baseUrl, origin, listed, pages, failures);
  if (failures.length > 0) throw new Error(`Search facts failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  return { listed: listed.length, extra: searchExtraPaths.length, guides: guides.index + guides.domains, ...links };
}

// An address as a link names it: the path without ?…, #…, and a trailing slash.
function linkPath(pathname) {
  return pathname.replace(/\/+$/u, "") || "/";
}

// The internal addresses a page's <a href> elements name. An absolute address on the sitemap's origin is internal.
function pageLinks(html, origin, route) {
  const found = new Set();
  for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/gu)) {
    let url;
    try {
      url = new URL(decodeEntities(href), `${origin}${route}`);
    } catch {
      continue;
    }
    if (url.origin === origin) found.add(linkPath(url.pathname));
  }
  return found;
}

// Every sitemap page can be reached from the home by links, and every other address a swept page links answers.
async function checkLinks(baseUrl, origin, listed, pages, failures) {
  const sitemapPages = new Set(listed.map((address) => linkPath(new URL(address).pathname)));
  if (!pages.has("/")) pages.set("/", await (await fetch(`${baseUrl}/`)).text());
  const linksOf = new Map([...pages].map(([route, html]) => [route, pageLinks(html, origin, route)]));

  // The walk: from /, follow every link to a sitemap page, and repeat from each page reached.
  const reached = new Set(["/"]);
  const queue = ["/"];
  while (queue.length > 0) {
    for (const target of linksOf.get(queue.shift()) ?? []) {
      if (sitemapPages.has(target) && !reached.has(target)) {
        reached.add(target);
        queue.push(target);
      }
    }
  }
  const unreached = [...sitemapPages].filter((route) => !reached.has(route));
  if (unreached.length > 0) failures.push(`not reachable from / by links: ${unreached.join(", ")}; link each from a page that is reached, or take it out of app/sitemap.ts`);

  // The walk alone passes when only the pages with no other link are linked: /motion links every motion page, and
  // /guides links /screens.
  const motionPages = [...sitemapPages].filter((route) => /^\/motion\/[^/]+$/u.test(route) && route !== "/motion/guide");
  if (motionPages.length === 0) failures.push("/sitemap.xml lists no /motion/<key> page; the /motion link check has nothing to read");
  const fromMotion = linksOf.get("/motion") ?? new Set();
  const motionMissing = motionPages.filter((route) => !fromMotion.has(route));
  if (motionMissing.length > 0) failures.push(`/motion: no <a href> to ${motionMissing.join(", ")}; each card's label links its own page`);
  if (!(linksOf.get("/guides") ?? new Set()).has("/screens")) failures.push("/guides: no <a href> to /screens; the guides index links the design guides by screen type");

  // Every other internal link answers: 200, or 307 or 308 to an address that answers 200.
  const others = new Map();
  for (const [route, targets] of linksOf) {
    for (const target of targets) {
      if (sitemapPages.has(target)) continue;
      if (!others.has(target)) others.set(target, []);
      others.get(target).push(route);
    }
  }
  for (const [target, from] of others) {
    const response = await fetch(`${baseUrl}${target}`, { redirect: "manual" });
    await response.arrayBuffer();
    let answer = `HTTP ${response.status}`;
    let ok = response.status === 200;
    if (response.status === 307 || response.status === 308) {
      const location = response.headers.get("location");
      const next = location ? new URL(location, `${baseUrl}${target}`) : null;
      if (next && next.origin === baseUrl) {
        const followed = await fetch(next, { redirect: "manual" });
        await followed.arrayBuffer();
        answer = `HTTP ${response.status} to ${next.pathname}, which answers HTTP ${followed.status}`;
        ok = followed.status === 200;
      } else {
        answer = `HTTP ${response.status} to ${location ?? "no location"}`;
      }
    }
    if (!ok) failures.push(`${target}: linked from ${from.join(", ")}, answers ${answer}; link an address that answers, or add the page or a redirect`);
  }

  // The home's footer links /components; the redirect in next.config.ts sends it to /gallery.
  const components = await fetch(`${baseUrl}/components`, { redirect: "manual" });
  await components.arrayBuffer();
  const location = components.headers.get("location");
  const componentsTo = location ? new URL(location, `${baseUrl}/components`).pathname : "no location";
  if (components.status !== 307 || componentsTo !== "/gallery") failures.push(`/components: answers HTTP ${components.status} to ${componentsTo}, expected 307 to /gallery (the redirect in next.config.ts)`);

  return { reachable: [...sitemapPages].filter((route) => reached.has(route)).length, linked: others.size };
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
        if (route === "/upgrade") {
          const response = await page.request.get(`${baseUrl}/upgrade.md`);
          assert(response.ok(), "agent upgrade guide is missing");
          const guide = await response.text();
          assert(guide.includes("newly installed") && guide.includes("--skills-root"), "upgrade guide does not include the install-to-consolidation handoff");
          const expected = (await page.request.get(`${baseUrl}/version.json`));
          const version = await expected.json();
          assert(version.upgrade?.guideUrl === "https://styleseed-demo.vercel.app/upgrade", "version endpoint omits upgrade route");
          await page.getByRole("button", { name: "Copy the update request", exact: true }).click();
          const copied = await page.evaluate(() => navigator.clipboard.readText());
          assert(copied.includes("https://styleseed-demo.vercel.app/upgrade.md") && copied.includes("project/global scope"), "update request copy lost the guide or scope");
          await page.getByText("한국어 업데이트 요청 복사하기", { exact: true }).click();
          await page.getByRole("button", { name: "한국어 업데이트 요청 복사", exact: true }).click();
          assert((await page.evaluate(() => navigator.clipboard.readText())).includes("기존 설치 경로"), "Korean update request did not copy");
          await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("blocked for regression"); } } }));
          await page.getByRole("button", { name: "Copy the update request", exact: true }).click();
          assert(await page.getByText("Clipboard access was blocked. The prompt is selected — copy it manually.", { exact: true }).count() === 1, "upgrade copy failure has no fallback");
        }
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
          // The landing's terminal variant keeps selectable code beside the copy button.
          const command = (await installButton.getAttribute("aria-label")).replace(/^Copy install command: /, "");
          assert(await page.getByText(command, { exact: true }).first().isVisible(), `${route}: install command is not visible`);
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
          const structured = await page.evaluate(() => {
            const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => JSON.parse(node.textContent)).find((value) => value["@type"] === "FAQPage");
            const visible = document.body.innerText;
            const entries = Array.isArray(schema?.mainEntity) ? schema.mainEntity : [];
            return { count: entries.length, match: entries.length > 0 && entries.every((entry) => visible.includes(entry.name) && visible.includes(entry.acceptedAnswer.text)) };
          });
          assert(structured.match, "FAQ structured answers differ from visible content");
          assert(structured.count === faqStructuredQuestions, `FAQ structured data holds ${structured.count} questions, expected ${faqStructuredQuestions} (the entries of content/design-questions.json and the FAQ list in app/faq/page.tsx)`);
          // The question from a person who has no design system yet: last, visible, and answered as written.
          const asked = page.locator(`article#${newProductQuestion.id}`);
          assert(await page.locator("article[id]").last().getAttribute("id") === newProductQuestion.id, `FAQ: ${newProductQuestion.id} is not the last question`);
          assert(await asked.getByRole("heading", { level: 2, name: newProductQuestion.question, exact: true }).isVisible(), `FAQ: the question "${newProductQuestion.question}" is not visible`);
          assert(await asked.getByText(newProductQuestion.answer, { exact: true }).isVisible(), `FAQ: the answer to "${newProductQuestion.question}" is not visible as written`);
          assert(await asked.getByText(newProductQuestion.fit, { exact: true }).isVisible(), `FAQ: the fit line of "${newProductQuestion.question}" is not visible as written (content/design-questions.json)`);
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
    assert(value.skills === 1, `version.json expected one skill, found ${String(value.skills)}`);
  });
  await assertJson(baseUrl, "/.well-known/styleseed/registry.json", (value) => {
    assert(/^\d+\.\d+\.\d+$/u.test(value.context?.engineVersion), "registry has no engine version");
    assert(/^sha256:[0-9a-f]{64}$/u.test(value.context?.engineRevision), "registry has no engine revision");
  });
  await assertJson(baseUrl, "/.well-known/agent-skills/index.json", (value) => {
    assert(Array.isArray(value.skills) && value.skills.length === 1, "agent skill index does not expose exactly one skill");
  });
  await assertJson(baseUrl, "/api/github-stars", (value) => {
    assert(
      value.stars === null || (Number.isSafeInteger(value.stars) && value.stars >= 0),
      "github stars endpoint returned an invalid fallback payload",
    );
  });
  const swept = await checkSearchFacts(baseUrl);

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
  console.log("Public version, StyleSeed registry, and single-skill discovery endpoints are readable.");
  console.log(`Search facts verified on ${swept.listed} sitemap pages and ${swept.extra} more routes: own canonical and og:url, share images, share titles not the home's, one title and one description, the site name once; all ${swept.reachable} sitemap pages reachable from the home by links; ${swept.linked} other linked addresses answer.`);
  console.log(`The ${swept.guides} guide pages link to /systems; /faq holds ${faqStructuredQuestions} structured questions, the new-product question last.`);
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  if (serverOutput.length > 0) console.error(`Next.js output:\n${serverOutput.join("")}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
