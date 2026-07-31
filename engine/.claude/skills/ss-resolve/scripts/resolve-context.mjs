#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(resolve(skillDir, "references/catalog.json"), "utf8"),
);

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (["list", "stdout", "check", "help"].includes(key)) {
      out[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = next;
    index += 1;
  }
  return out;
}

function help() {
  return `StyleSeed Context Compiler

Usage:
  resolve-context.mjs --from-lock STYLESEED.md --agent codex
  resolve-context.mjs --grammar <id> --adapter <id> [options]

Options:
  --agent claude|codex|cursor|generic
  --grammar <built-in id|reference:slug>
  --adapter <id>
  --domain <id|none>
  --page <id|none>
  --profile <id|none>
  --fallback <built-in grammar id>   required for reference grammars without lock fallback
  --from-lock <path>
  --project-root <path>
  --out-dir <path>                   default: .styleseed
  --stdout                           print bundle without writing
  --check                            exit 2 when the existing bundle hash has drifted
  --list                             print supported IDs
`;
}

function parseLock(path) {
  if (!path || !existsSync(path)) return { text: "", values: {} };
  const text = readFileSync(path, "utf8").trim();
  const values = {};
  const keys = {
    "App domain": "domain",
    "Surface adapter": "adapter",
    "Page type": "page",
    "Output grammar": "grammar",
    "Grammar fallback": "fallback",
    "Aesthetic profile": "profile",
  };
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+([^:]+):\s*(.+?)\s*$/);
    if (!match) continue;
    const key = keys[match[1]];
    if (key) values[key] = match[2].replace(/\s+#.*$/, "").trim();
  }
  return { text, values };
}

function choose(args, lock, key, fallback) {
  return args[key] ?? lock.values[key] ?? fallback;
}

function requireId(group, id, label) {
  if (id === "none") return null;
  const value = catalog[group][id];
  if (!value) {
    throw new Error(
      `Unknown ${label} "${id}". Supported: ${Object.keys(catalog[group]).join(", ")}`,
    );
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceEntry(id, content) {
  return { id, sha256: digest(content), bytes: Buffer.byteLength(content) };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(help());
  process.exit(0);
}

if (args.list) {
  console.log(
    JSON.stringify(
      {
        agents: Object.keys(catalog.agents),
        grammars: Object.keys(catalog.grammars),
        adapters: Object.keys(catalog.adapters),
        domains: Object.keys(catalog.domains),
        pages: Object.keys(catalog.pages),
        profiles: ["none", ...Object.keys(catalog.profiles)],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const projectRoot = resolve(args["project-root"] ?? process.cwd());
const lockPath = resolve(projectRoot, args["from-lock"] ?? "STYLESEED.md");
const lock = parseLock(lockPath);
const agent = choose(args, lock, "agent", "generic");
const grammar = choose(args, lock, "grammar");
const adapter = choose(args, lock, "adapter");
const domain = choose(args, lock, "domain", "none");
const page = choose(args, lock, "page", "none");
const profile = choose(args, lock, "profile", "none");
const fallback = choose(args, lock, "fallback");

if (!grammar) throw new Error("Missing output grammar. Pass --grammar or use --from-lock.");
if (!adapter) throw new Error("Missing surface adapter. Pass --adapter or use --from-lock.");
if (!catalog.agents[agent]) {
  throw new Error(`Unknown agent "${agent}". Supported: ${Object.keys(catalog.agents).join(", ")}`);
}

let grammarContent;
let grammarSource = `built-in:${grammar}`;
if (grammar.startsWith("reference:")) {
  const slug = grammar.slice("reference:".length);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`Invalid reference grammar slug: ${slug}`);
  const rulePath = resolve(projectRoot, ".styleseed/rulesets", slug, "RULESET.md");
  if (!existsSync(rulePath)) throw new Error(`Missing reference grammar: ${rulePath}`);
  const referenceContent = readFileSync(rulePath, "utf8").trim();
  const checksPath = resolve(projectRoot, ".styleseed/rulesets", slug, "checks.md");
  let referenceChecks = "";
  if (existsSync(checksPath)) {
    referenceChecks = `\n\n## Reference grammar checks\n\n${readFileSync(checksPath, "utf8").trim()}`;
  }
  grammarSource = `project:${rulePath.slice(projectRoot.length + 1)}`;
  if (!fallback) {
    throw new Error("Reference grammars require --fallback or a Grammar fallback value in STYLESEED.md.");
  }
  const fallbackContent = requireId("grammars", fallback, "fallback grammar");
  grammarContent = `${fallbackContent}\n\n## Project-local reference grammar override\n\n${referenceContent}${referenceChecks}`;
} else {
  grammarContent = requireId("grammars", grammar, "grammar");
}

const adapterContent = requireId("adapters", adapter, "adapter");
const domainContent = requireId("domains", domain, "domain");
const pageContent = requireId("pages", page, "page");
const profileContent = requireId("profiles", profile, "profile");

const selected = {
  agent,
  grammar,
  grammarSource,
  fallback: fallback ?? null,
  adapter,
  domain,
  page,
  profile,
};

const sections = [
  ["agent-execution", catalog.agents[agent]],
  ["core", catalog.core],
  ["grammar", grammarContent],
  ["adapter", adapterContent],
  ...(domainContent ? [["domain", domainContent]] : []),
  ...(pageContent ? [["page", pageContent]] : []),
  ...(profileContent ? [["profile", profileContent]] : []),
  ...(lock.text ? [["lock", `## Project design lock\n\n${lock.text}`]] : []),
  ["craft", catalog.craft],
];

const bundle = [
  "# StyleSeed Effective Rule Bundle",
  "",
  "<!-- Generated by ss-resolve. Do not hand-edit; update STYLESEED.md or resolver inputs. -->",
  "",
  `- Engine: ${catalog.engineVersion}`,
  `- Agent: ${agent}`,
  `- Output grammar: ${grammar}`,
  `- Surface adapter: ${adapter}`,
  `- Domain: ${domain}`,
  `- Page type: ${page}`,
  `- Aesthetic profile: ${profile}`,
  "",
  "Read this bundle before implementation. The agent execution contract is operational; method authority then runs core → grammar → adapter → domain/page → profile → lock → compact craft baseline, with the earlier method layer winning conflicts. Run the code gate and rendered visual gate.",
  "",
  ...sections.flatMap(([, content]) => [content, "", "---", ""]),
].join("\n").replace(/\n---\n\s*$/, "\n");

const bundleHash = digest(bundle);
const sources = sections.map(([id, content]) => sourceEntry(id, content));
const manifest = {
  schemaVersion: 1,
  engineVersion: catalog.engineVersion,
  generatedAt: new Date().toISOString(),
  selection: selected,
  bundle: {
    path: ".styleseed/effective-rules.md",
    sha256: bundleHash,
    bytes: Buffer.byteLength(bundle),
  },
  sources,
};

const outDir = resolve(projectRoot, args["out-dir"] ?? ".styleseed");
const bundlePath = resolve(outDir, "effective-rules.md");
const manifestPath = resolve(outDir, "manifest.json");

if (args.check) {
  if (!existsSync(manifestPath)) {
    console.error("StyleSeed context drift: manifest is missing.");
    process.exit(2);
  }
  const previous = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (previous.bundle?.sha256 !== bundleHash) {
    console.error(
      `StyleSeed context drift: ${previous.bundle?.sha256 ?? "missing"} -> ${bundleHash}`,
    );
    process.exit(2);
  }
  console.log(`StyleSeed context current: ${bundleHash}`);
  process.exit(0);
}

if (args.stdout) {
  process.stdout.write(bundle);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(bundlePath, bundle);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `StyleSeed ${catalog.engineVersion}: ${grammar} × ${adapter} × ${domain} × ${page} × ${profile}`,
);
console.log(`wrote ${bundlePath} (${Buffer.byteLength(bundle)} bytes, sha256:${bundleHash})`);
console.log(`wrote ${manifestPath}`);
