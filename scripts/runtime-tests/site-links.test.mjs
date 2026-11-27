import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// WO-22: every internal address the site's sources write as a link answers. The resolver below is part of this test
// and follows the work order: exact folder and file names read with readdirSync (macOS and Windows ignore case, the
// server does not), a literal folder first and each [param] folder of a level when that branch ends in no page.
const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const demoRoot = join(repoRoot, "demo-pricing");
const appRoot = join(demoRoot, "app");
const publicRoot = join(demoRoot, "public");
const configFile = join(demoRoot, "next.config.ts");
const configName = "demo-pricing/next.config.ts";

function entries(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}
const hasFile = (dir, name) => entries(dir).some((entry) => entry.isFile() && entry.name === name);
// A folder whose name starts with "_" is private in the App Router and never part of an address.
const isPrivate = (name) => name.startsWith("_");
const isParam = (name) => /^\[[^\].]+\]$/u.test(name);

function routeIn(dir, segments) {
  if (segments.length === 0) return hasFile(dir, "page.tsx") || hasFile(dir, "route.ts");
  const [segment, ...rest] = segments;
  const folders = entries(dir).filter((entry) => entry.isDirectory());
  const exact = folders.find((entry) => entry.name === segment && !isPrivate(entry.name));
  if (exact && routeIn(join(dir, exact.name), rest)) return true;
  return folders.filter((entry) => isParam(entry.name)).some((entry) => routeIn(join(dir, entry.name), rest));
}

function publicFile(segments) {
  let dir = publicRoot;
  for (const [index, segment] of segments.entries()) {
    const last = index === segments.length - 1;
    if (!entries(dir).some((entry) => entry.name === segment && (last ? entry.isFile() : entry.isDirectory()))) return false;
    dir = join(dir, segment);
  }
  return true;
}

function readRedirects(text) {
  const pattern = /\{\s*source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*permanent:\s*(true|false)\s*,?\s*\}/gu;
  return [...text.matchAll(pattern)].map(([, source, destination, permanent]) => ({ source, destination, permanent: permanent === "true" }));
}
const redirects = readRedirects(readFileSync(configFile, "utf8"));

// The way an address answers, or null when nothing answers it.
function resolveAddress(address, seen = new Set()) {
  const path = address.split(/[?#]/u)[0].replace(/\/+$/u, "") || "/";
  if (path === "/") return "home";
  const segments = path.slice(1).split("/");
  if (publicFile(segments)) return "public file";
  if (routeIn(appRoot, segments)) return "page";
  if ((path === "/sitemap.xml" && hasFile(appRoot, "sitemap.ts")) || (path === "/robots.txt" && hasFile(appRoot, "robots.ts"))) return "metadata route";
  const redirect = redirects.find((entry) => entry.source === path);
  if (redirect && !seen.has(path)) {
    seen.add(path);
    return resolveAddress(redirect.destination, seen) ? `redirect to ${redirect.destination}` : null;
  }
  return null;
}

function sourceFiles(dir) {
  return entries(dir).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.isFile() && /\.tsx?$/u.test(entry.name) ? [full] : [];
  });
}

// href="/…" (also href={"/…"} and single quotes), href: "/…", and the second element of a pair ["Label", "/…"].
// Template strings never match; a literal that holds a space is a command such as "/styleseed build", not an address.
const LINK_PATTERNS = [
  /\bhref=\{?(?:"(\/[^"\n]*)"|'(\/[^'\n]*)')/gu,
  /\bhref:\s*(?:"(\/[^"\n]*)"|'(\/[^'\n]*)')/gu,
  /\[\s*(?:"[^"\n]*"|'[^'\n]*')\s*,\s*(?:"(\/[^"\n]*)"|'(\/[^'\n]*)')\s*\]/gu,
];

function collectLinks() {
  const found = new Map();
  for (const file of sourceFiles(appRoot)) {
    const text = readFileSync(file, "utf8");
    const name = relative(repoRoot, file).split(sep).join("/");
    for (const pattern of LINK_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const literal = match[1] ?? match[2];
        if (/\s/u.test(literal) || literal.startsWith("//")) continue;
        if (!found.has(literal)) found.set(literal, new Set());
        found.get(literal).add(name);
      }
    }
  }
  return found;
}

test("every internal address written as a link in demo-pricing/app resolves", () => {
  const links = collectLinks();
  assert.ok(links.size > 0, "No link literal was collected from demo-pricing/app; the patterns of scripts/runtime-tests/site-links.test.mjs no longer match the sources");
  const dead = [...links]
    .filter(([address]) => !resolveAddress(address))
    .map(([address, files]) => `${address} (written in ${[...files].sort().join(", ")})`);
  assert.equal(
    dead.length,
    0,
    `Links that no route answers: ${dead.join("; ")}. Add the page under demo-pricing/app, the file under demo-pricing/public, or a redirect in ${configName}, or correct the link.`,
  );
});

test("every redirect in demo-pricing/next.config.ts leads to an address that resolves, and /components leads to /gallery", () => {
  const text = readFileSync(configFile, "utf8");
  const sources = text.match(/\bsource:/gu)?.length ?? 0;
  assert.ok(sources > 0, `${configName} holds no redirect; /components needs one to /gallery`);
  assert.equal(
    redirects.length,
    sources,
    `${configName}: ${sources} redirect sources, ${redirects.length} read; write each redirect as { source: "/…", destination: "/…", permanent: true | false } so this test can follow it`,
  );
  for (const { source, destination } of redirects) {
    assert.ok(resolveAddress(destination, new Set([source])), `${configName}: ${source} redirects to ${destination}, which no route answers; point it at a page that exists`);
  }
  assert.deepEqual(
    redirects.find((entry) => entry.source === "/components"),
    { source: "/components", destination: "/gallery", permanent: false },
    `${configName}: /components must redirect to /gallery with permanent: false (the home's footer links /components)`,
  );
});

test("the link resolver can fail: case, unknown routes, and the branch that goes back to a [param] folder", () => {
  assert.equal(resolveAddress("/no-such-route"), null);
  assert.equal(resolveAddress("/Gallery"), null);
  assert.equal(resolveAddress("/LLMS.txt"), null);
  assert.notEqual(resolveAddress("/llms.txt"), null);
  assert.notEqual(resolveAddress("/motion/pop-in"), null);
  // app/showcase/signal-carousel holds only export/[frame]; the page is showcase/[id].
  assert.notEqual(resolveAddress("/showcase/signal-carousel"), null);
});
