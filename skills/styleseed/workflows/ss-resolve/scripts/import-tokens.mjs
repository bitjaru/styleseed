#!/usr/bin/env node
// Read-only preview of a project's imported token canon. It parses the configured (or a given)
// token file, maps StyleSeed's semantic roles onto it, checks aliases, layering, modes and
// contrast, and prints the result. It writes nothing; `resolve-context.mjs` compiles the import
// into the bundle, palette JSON and CSS once `.styleseed/project.json` carries `tokens`.
//
//   node <installed-ss-resolve>/scripts/import-tokens.mjs --project-root . [--mode light|dark] [--format json|summary]
//   node <installed-ss-resolve>/scripts/import-tokens.mjs --source design/tokens.json --token-format dtcg [--role primary=semantic.bg.brand.base …]
//
// Exit 0: every role maps and every alias resolves (contrast failures are reported, not corrected);
// exit 1: structural problems; exit 2: invalid invocation.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { importTokenCanon, TOKEN_FORMATS, PALETTE_ROLES } from "./token-canon.mjs";
import { safeProjectPath } from "./runtime-contract.mjs";
import { loadProjectRegistry } from "./project-registry.mjs";

function parseArgs(argv) {
  const options = { roles: {} };
  const flags = new Set(["project-root", "source", "token-format", "mode", "format", "light", "dark"]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") { options.help = true; continue; }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    index += 1;
    if (key === "role") {
      const [role, path] = value.split("=");
      if (!PALETTE_ROLES.includes(role) || !path) throw new Error(`--role expects <role>=<token path>; roles: ${PALETTE_ROLES.join(", ")}`);
      options.roles[role] = path;
      continue;
    }
    if (!flags.has(key)) throw new Error(`Unknown option: --${key}`);
    options[key] = value;
  }
  return options;
}

const help = `StyleSeed token canon preview (read-only)

Usage:
  import-tokens.mjs --project-root <dir> [--mode light|dark] [--format json|summary]
  import-tokens.mjs --source <file.json> --token-format ${TOKEN_FORMATS.join("|")} [--light <mode>] [--dark <mode>] [--role <role>=<path> …]

With --project-root the configuration comes from .styleseed/project.json (tokens + brand.paletteMode).
Without it, --source and --token-format describe a file to preview before configuring the project.
`;

function summary(result) {
  const lines = [
    `${result.input.source} · ${result.input.format}${result.input.modeName ? ` · ${result.input.mode} reads "${result.input.modeName}"` : ""} · ${result.tokens.total} tokens`,
    `layering: ${result.tokens.layering.status} (${Object.entries(result.tokens.layering.counts).filter(([key]) => key !== "total").map(([key, count]) => `${count} ${key}`).join(" · ")})`,
  ];
  for (const role of PALETTE_ROLES) {
    const mapped = result.mapping[role];
    lines.push(mapped ? `  ${role.padEnd(18)} ${mapped.value}  ${mapped.token}${mapped.via === "project" ? "  (project)" : ""}` : `  ${role.padEnd(18)} —`);
  }
  if (result.contrast.length) lines.push(`contrast: ${result.contrast.map((check) => `${check.foreground}/${check.background}=${check.ratio}${check.pass ? "" : "✗"}`).join(" · ")}`);
  for (const warning of result.warnings) lines.push(`warning: ${warning}`);
  for (const problem of result.problems) lines.push(`problem: ${problem}`);
  lines.push(result.problems.length ? "status: invalid — fix the problems above; nothing was written" : `status: ${result.valid ? "valid" : "mapped, contrast gates failing"} (read-only preview)`);
  return lines.join("\n");
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(help); process.exit(0); }
  let source; let format; let modes = null; let roles = args.roles; let mode = args.mode ?? "light"; let projectRoot = null; let target;
  if (args["project-root"]) {
    projectRoot = resolve(args["project-root"]);
    const registry = loadProjectRegistry(projectRoot);
    if (!registry) throw new Error("No .styleseed registry here; pass --source and --token-format to preview a file.");
    if (!registry.project.tokens) throw new Error("`.styleseed/project.json` has no `tokens` block. Add { source, format, modes?, roles? } under `tokens` to import a canon.");
    ({ source, format } = registry.project.tokens);
    modes = registry.project.tokens.modes ?? null;
    roles = { ...(registry.project.tokens.roles ?? {}), ...args.roles };
    if (!args.mode) mode = registry.project.brand.paletteMode;
    target = safeProjectPath(projectRoot, source);
  } else {
    if (!args.source || !args["token-format"]) throw new Error("Pass --project-root, or both --source and --token-format.");
    source = args.source;
    format = args["token-format"];
    if (args.light || args.dark) modes = { ...(args.light ? { light: args.light } : {}), ...(args.dark ? { dark: args.dark } : {}) };
    target = resolve(source);
  }
  if (!existsSync(target)) throw new Error(`Token file not found: ${source}`);
  const content = readFileSync(target, "utf8");
  const result = importTokenCanon({
    document: JSON.parse(content), format, mode, modes, roles, source,
    sha256: `sha256:${createHash("sha256").update(content).digest("hex")}`,
  });
  const output = (args.format ?? "summary") === "json" ? JSON.stringify(result, null, 2) : summary(result);
  console.log(output);
  process.exit(result.problems.length ? 1 : 0);
} catch (error) {
  console.error(`Token import preview failed: ${error.message}`);
  process.exit(2);
}
