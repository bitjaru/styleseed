import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

function stageCoreDistribution(catalog, destinationRoot) {
  for (const file of catalog.distributionFiles) {
    const source = file.path.startsWith("root/")
      ? resolve(root, file.path.slice(5))
      : resolve(root, "engine", file.path);
    const destination = file.path.startsWith("root/")
      ? resolve(destinationRoot, file.path.slice(5))
      : resolve(destinationRoot, "engine", file.path);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: false });
  }
  cpSync(resolve(root, "skills"), resolve(destinationRoot, "skills"), { recursive: true });
}

const codexPlugin = readJson(".codex-plugin/plugin.json");
const catalog = readJson("engine/.claude/skills/ss-resolve/references/catalog.json");
const searchableFields = [
  codexPlugin.description,
  codexPlugin.interface?.shortDescription,
  codexPlugin.interface?.longDescription,
  ...(codexPlugin.interface?.defaultPrompt ?? []),
  ...(codexPlugin.keywords ?? []),
].filter(Boolean).join("\n").toLowerCase();

assert(codexPlugin.skills === "./skills/", "Codex plugin must point at the host-discoverable root skill directory");
assert(!("mcpServers" in codexPlugin), "Codex plugin must expose zero default MCP servers");
assert(!codexPlugin.keywords?.includes("mcp"), "Codex plugin keywords must not advertise MCP");
assert(!searchableFields.includes("learn"), "Codex plugin manifest must not claim learning capabilities");
assert(!searchableFields.includes("mcp"), "Codex plugin manifest must not claim MCP capabilities");
assert(!existsSync(resolve(root, ".mcp.json")), "Root auto-discovered MCP config must be absent");
assert(!existsSync(resolve(root, "engine/.claude/skills/ss-learn")), "core source must not contain ss-learn");
assert(existsSync(resolve(root, codexPlugin.skills)), "Codex plugin skill path must resolve in the source tree");
assert(existsSync(resolve(root, "engine/.claude/skills/styleseed/SKILL.md")), "Core must expose the primary styleseed router");
assert(readFileSync(resolve(root, "engine/.claude/skills/styleseed/SKILL.md"), "utf8").includes("optional extension"), "Router must describe learning as optional");
assert(!catalog.distributionFiles.some((file) => file.path === "root/.mcp.json"), "Core distribution manifest must not include .mcp.json");
assert(!catalog.distributionFiles.some((file) => file.path.startsWith("root/mcp/")), "Core distribution manifest must not include any MCP server file");
assert(!catalog.distributionFiles.some((file) => /ss-learn|learning|mcp/i.test(file.path)), "Core distribution manifest must not include learning payloads");
assert(!catalog.distributionFiles.some((file) => file.path === "root/.codex-plugin/plugin.json"), "Mutable host cachebuster manifest must not define the engine revision");

const stageRoot = mkdtempSync(join(tmpdir(), "styleseed-core-plugin-"));
try {
  stageCoreDistribution(catalog, stageRoot);
  assert(existsSync(resolve(stageRoot, codexPlugin.skills)), "Codex plugin skill path must resolve in staged core layout");
  assert(!existsSync(resolve(stageRoot, ".mcp.json")), "Staged core layout must not contain a default MCP config");
  assert(!existsSync(resolve(stageRoot, "mcp")), "Staged core layout must not contain a default MCP server directory");
} finally {
  rmSync(stageRoot, { recursive: true, force: true });
}

const skillsOnlyRoot = mkdtempSync(join(tmpdir(), "styleseed-skills-only-"));
try {
  const installedSkills = resolve(skillsOnlyRoot, ".agents/skills");
  mkdirSync(dirname(installedSkills), { recursive: true });
  cpSync(resolve(root, "skills"), installedSkills, { recursive: true });

  const resolver = resolve(installedSkills, "ss-resolve/scripts/resolve-context.mjs");
  const list = spawnSync(process.execPath, [resolver, "--list"], {
    cwd: skillsOnlyRoot,
    encoding: "utf8",
  });
  assert(list.status === 0, `skills-only resolver list failed: ${list.stderr || list.stdout}`);

  const compile = spawnSync(process.execPath, [
    resolver,
    "--project-root", skillsOnlyRoot,
    "--agent", "codex",
    "--grammar", "operations-console",
    "--adapter", "product-ui",
    "--domain", "developer-tools",
    "--page", "dashboard",
    "--recipe", "enterprise-workbench",
    "--palette", "cobalt-instrument",
    "--key-color", "#0F766E",
    "--palette-character", "balanced",
    "--palette-mode", "light",
    "--palette-harmony", "auto",
    "--surface-temperature", "cool",
    "--profile", "technical",
  ], { cwd: skillsOnlyRoot, encoding: "utf8" });
  assert(compile.status === 0, `skills-only resolver compile failed: ${compile.stderr || compile.stdout}`);
  assert(existsSync(resolve(skillsOnlyRoot, ".styleseed/palette.json")), "skills-only resolver did not emit palette.json");

  const tokenOutput = resolve(skillsOnlyRoot, "token-smoke.json");
  const tokenGenerator = resolve(installedSkills, "ss-tokens/scripts/generate-palette.mjs");
  const generate = spawnSync(process.execPath, [
    tokenGenerator,
    "--key-color", "#0F766E",
    "--mode", "light",
    "--character", "balanced",
    "--harmony", "auto",
    "--temperature", "cool",
    "--out", tokenOutput,
  ], { cwd: skillsOnlyRoot, encoding: "utf8" });
  assert(generate.status === 0, `skills-only token generator failed: ${generate.stderr || generate.stdout}`);
  assert(readJson(tokenOutput).valid === true, "skills-only token generator emitted an invalid palette");
} finally {
  rmSync(skillsOnlyRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`Core plugin boundary failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Core plugin boundary verified: zero default MCP exposure, staged plugin boundary, and executable skills-only install");
