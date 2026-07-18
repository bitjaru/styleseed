import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

const version = read("engine/VERSION").trim();
const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
const publicVersion = JSON.parse(read("demo-pricing/public/version.json"));
assert(plugin.version === version, `plugin version ${plugin.version} != ${version}`);
assert(publicVersion.version === version, `public version ${publicVersion.version} != ${version}`);

const skillsDir = resolve(root, "engine/.claude/skills");
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("ss-") && existsSync(resolve(skillsDir, entry.name, "SKILL.md")));
assert(skills.length === 20, `expected 20 canonical skills, found ${skills.length}`);
assert(publicVersion.skills === skills.length, `version.json skills ${publicVersion.skills} != ${skills.length}`);
assert(skills.some((entry) => entry.name === "ss-reference"), "ss-reference is missing");

const bridge = resolve(root, ".agents/skills");
assert(existsSync(bridge) && lstatSync(bridge).isSymbolicLink(), ".agents/skills must be the canonical symlink");

for (const file of ["PRODUCT-PRINCIPLES.md", "RULESETS.md", "ADAPTERS.md", "PRESETS.md", "REFERENCE-COMPILER.md", "ARCHITECTURE.md"]) {
  assert(existsSync(resolve(root, "engine", file)), `missing engine/${file}`);
}

const grammarText = read("engine/RULESETS.md");
const grammarIds = [...grammarText.matchAll(/^### `([^`]+)`/gm)].map((match) => match[1]);
assert(grammarIds.length === 8, `expected 8 output grammars, found ${grammarIds.length}: ${grammarIds.join(", ")}`);
assert(publicVersion.grammars === grammarIds.length, `version.json grammars ${publicVersion.grammars} != ${grammarIds.length}`);

const adapterText = read("engine/ADAPTERS.md");
const adapterIds = [...adapterText.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
assert(adapterIds.length === 5, `expected 5 adapters, found ${adapterIds.length}`);
assert(publicVersion.adapters === adapterIds.length, `version.json adapters ${publicVersion.adapters} != ${adapterIds.length}`);

const build = read("engine/.claude/skills/ss-build/SKILL.md");
assert(build.includes("/ss-score") && build.includes("/ss-verify"), "ss-build must require score and verify");
assert(build.indexOf("/ss-score") < build.lastIndexOf("/ss-verify"), "ss-build must run score before verify");

const score = read("engine/.claude/skills/ss-score/SKILL.md");
assert(score.includes("eight weighted categories"), "ss-score category count text drifted");
const weights = [...score.matchAll(/^\| \*\*[^|]+\*\* \| (\d+) \|/gm)].map((match) => Number(match[1]));
assert(weights.reduce((sum, value) => sum + value, 0) === 100, `ss-score weights sum to ${weights.reduce((a, b) => a + b, 0)}`);

const coreFiles = [
  "engine/PRODUCT-PRINCIPLES.md", "engine/RULESETS.md", "engine/ADAPTERS.md",
  "engine/CLAUDE.md", "engine/AGENTS.md", "engine/.cursorrules",
  "engine/.claude/skills/ss-setup/SKILL.md", "engine/.claude/skills/ss-build/SKILL.md",
  "engine/.claude/skills/ss-score/SKILL.md", "engine/.claude/skills/ss-verify/SKILL.md",
];
for (const path of coreFiles) {
  const text = read(path);
  for (const forbidden of ["Palette mode", "brand-palette", "lock-relative", "#721FE5"]) {
    assert(!text.includes(forbidden), `${path} contains stale law: ${forbidden}`);
  }
}

for (const path of ["README.md", "README-KR.md", "demo-pricing/app/_home/hero.tsx", "demo-pricing/app/page.tsx"]) {
  assert(read(path).includes("20"), `${path} does not expose the 20-skill release`);
}

if (failures.length) {
  console.error(`StyleSeed engine validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`StyleSeed ${version}: 8 grammars · 5 adapters · 20 skills · mirrors consistent`);
