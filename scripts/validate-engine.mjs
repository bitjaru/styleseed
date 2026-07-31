import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
assert(skills.length === 21, `expected 21 canonical skills, found ${skills.length}`);
assert(publicVersion.skills === skills.length, `version.json skills ${publicVersion.skills} != ${skills.length}`);
assert(skills.some((entry) => entry.name === "ss-reference"), "ss-reference is missing");
assert(skills.some((entry) => entry.name === "ss-resolve"), "ss-resolve is missing");

const bridge = resolve(root, ".agents/skills");
assert(existsSync(bridge) && lstatSync(bridge).isSymbolicLink(), ".agents/skills must be the canonical symlink");

for (const file of ["PRODUCT-PRINCIPLES.md", "CRAFT-BASELINE.md", "RULESETS.md", "ADAPTERS.md", "PRESETS.md", "REFERENCE-COMPILER.md", "ARCHITECTURE.md"]) {
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
assert(build.includes(".styleseed/effective-rules.md"), "ss-build must consume compiled context");
assert(!build.includes("Read and combine in authority order"), "ss-build must not hand-compose the full handbook");

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

const catalog = JSON.parse(read("engine/.claude/skills/ss-resolve/references/catalog.json"));
assert(catalog.engineVersion === version, `context catalog ${catalog.engineVersion} != ${version}`);
assert(Object.keys(catalog.grammars).length === 8, "context catalog grammar count drifted");
assert(Object.keys(catalog.adapters).length === 5, "context catalog adapter count drifted");
assert(Object.keys(catalog.domains).length === 12, "context catalog domain count drifted");
assert(Object.keys(catalog.pages).length === 7, "context catalog page count drifted");
assert(Object.keys(catalog.profiles).length === 6, "context catalog profile count drifted");
const publicCatalog = JSON.parse(read("demo-pricing/public/.well-known/styleseed/context-catalog.json"));
assert(JSON.stringify(publicCatalog) === JSON.stringify(catalog), "public context catalog differs from canonical catalog");
const registry = JSON.parse(read("demo-pricing/public/.well-known/styleseed/registry.json"));
assert(registry.version === "3", `expected registry v3, found ${registry.version}`);
assert(registry.counts.skills === skills.length, "registry skill count drifted");
assert(registry.counts.grammars === 8 && registry.counts.adapters === 5, "registry context counts drifted");
const llms = read("demo-pricing/public/llms.txt");
assert(llms.includes("Invoke `/ss-resolve` or `$ss-resolve`"), "llms.txt does not route through ss-resolve");
assert(llms.includes("archive/debug mirror, not the"), "llms.txt must demote llms-full to archive/debug");

const smokeRoot = mkdtempSync(join(tmpdir(), "styleseed-resolve-"));
try {
  writeFileSync(
    resolve(smokeRoot, "STYLESEED.md"),
    `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: operations-console
- Grammar fallback: operations-console
- Aesthetic profile: swiss
- Primary action: #0F766E
`,
  );
  const resolver = resolve(root, "engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs");
  const run = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex"], { encoding: "utf8" });
  assert(run.status === 0, `ss-resolve smoke failed: ${run.stderr || run.stdout}`);
  if (run.status === 0) {
    const manifest = JSON.parse(readFileSync(resolve(smokeRoot, ".styleseed/manifest.json"), "utf8"));
    assert(manifest.selection.grammar === "operations-console", "resolver selected the wrong grammar");
    assert(manifest.bundle.bytes >= 5000 && manifest.bundle.bytes <= 30000, `resolver bundle is ${manifest.bundle.bytes} bytes`);
    assert(/^[0-9a-f]{64}$/.test(manifest.bundle.sha256), "resolver bundle hash is invalid");
    const check = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--check"], { encoding: "utf8" });
    assert(check.status === 0, `ss-resolve hash check failed: ${check.stderr || check.stdout}`);
    writeFileSync(resolve(smokeRoot, "STYLESEED.md"), readFileSync(resolve(smokeRoot, "STYLESEED.md"), "utf8").replace("#0F766E", "#C14E24"));
    const drift = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--check"], { encoding: "utf8" });
    assert(drift.status === 2, `ss-resolve must exit 2 on drift, got ${drift.status}`);
    const invalid = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "codex", "--grammar", "unknown-grammar"], { encoding: "utf8" });
    assert(invalid.status !== 0, "ss-resolve must reject an unknown grammar");

    const referenceDir = resolve(smokeRoot, ".styleseed/rulesets/reference-smoke");
    mkdirSync(referenceDir, { recursive: true });
    writeFileSync(resolve(referenceDir, "RULESET.md"), "# Reference smoke grammar\n\n- Signature: asymmetric evidence rail.");
    writeFileSync(resolve(referenceDir, "checks.md"), "# Checks\n\n- The evidence rail survives transfer.");
    writeFileSync(
      resolve(smokeRoot, "STYLESEED.md"),
      `# StyleSeed — Design Lock
- App domain: saas
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: reference:reference-smoke
- Grammar fallback: operations-console
- Aesthetic profile: none
`,
    );
    const referenceRun = spawnSync(process.execPath, [resolver, "--project-root", smokeRoot, "--from-lock", "STYLESEED.md", "--agent", "claude"], { encoding: "utf8" });
    assert(referenceRun.status === 0, `reference grammar resolve failed: ${referenceRun.stderr || referenceRun.stdout}`);
    if (referenceRun.status === 0) {
      const referenceBundle = readFileSync(resolve(smokeRoot, ".styleseed/effective-rules.md"), "utf8");
      const referenceManifest = JSON.parse(readFileSync(resolve(smokeRoot, ".styleseed/manifest.json"), "utf8"));
      assert(referenceBundle.includes("operations-console"), "reference bundle must include its maintained fallback");
      assert(referenceBundle.includes("asymmetric evidence rail"), "reference bundle omitted the local grammar");
      assert(referenceBundle.includes("evidence rail survives transfer"), "reference bundle omitted local checks");
      assert(referenceManifest.selection.grammarSource === "project:.styleseed/rulesets/reference-smoke/RULESET.md", "reference grammar provenance drifted");
    }
  }
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}

for (const path of ["README.md", "README-KR.md", "demo-pricing/app/_home/hero.tsx", "demo-pricing/app/page.tsx"]) {
  assert(read(path).includes("21"), `${path} does not expose the 21-skill release`);
}

if (failures.length) {
  console.error(`StyleSeed engine validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`StyleSeed ${version}: 8 grammars · 5 adapters · 21 skills · context compiler verified`);
