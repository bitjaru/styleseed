import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [
  "README.md",
  "README-KR.md",
  "SECURITY.md",
  ".claude-plugin/plugin.json",
  "demo-pricing/app/page.tsx",
  "demo-pricing/app/_home/hero.tsx",
  "demo-pricing/app/_home/prompt-box.tsx",
  "demo-pricing/app/learn/page.tsx",
  "demo-pricing/app/faq/page.tsx",
  "demo-pricing/app/architecture/page.tsx",
  "demo-pricing/app/codex-ui-design/page.tsx",
  "demo-pricing/app/layout.tsx",
  "demo-pricing/app/evaluate/page.tsx",
  "docs/EVALUATOR-QUICKSTART.md",
  "demo-pricing/content/version-source.json"
];
const requiredPhrases = [
  "known high-risk identity patterns are blocked; this is a guardrail, not an anonymization guarantee; review the exact package before exposure.",
  "The implemented default/core install contains no learning MCP.",
  "repository development Codex package",
  "when the StyleSeed workflow is invoked, it compiles the selected artifact and records the checks and rendered evidence that actually ran",
  "Supported versions are published tags or published artifacts, plus separately identified security fixes.",
  "The prepared package stays local and untransmitted."
];
const denylist = [
  "human-approved",
  "human approved",
  "validated Codex plugin package",
  "every artifact is compiled, scored, and visually checked before you see it",
  "The latest release on `main` is the supported version.",
  "identities are rejected",
  "strips project identity"
];
const failures = [];
const texts = files.map((path) => ({ path, text: readFileSync(resolve(root, path), "utf8") }));
const versionInfo = JSON.parse(readFileSync(resolve(root, "demo-pricing/public/version.json"), "utf8"));
const designLanguage = readFileSync(resolve(root, "engine/DESIGN-LANGUAGE.md"), "utf8");
const ruleNumbers = [...designLanguage.matchAll(/^##\s+(\d+)\./gmu)].map((match) => Number(match[1]));
const expectedRules = Math.max(...ruleNumbers);
const expectedSkins = readdirSync(resolve(root, "skins"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .length;
const resolvedDocsPalette = readFileSync(resolve(root, ".styleseed/palettes/site-docs.json"), "utf8");
const bundledDocsPalette = readFileSync(resolve(root, "demo-pricing/content/site-docs-palette.json"), "utf8");

if (versionInfo.channel !== "edge") failures.push(`version.json channel must be edge; found ${String(versionInfo.channel)}`);
if (versionInfo.publicInstall !== "npx skills add bitjaru/styleseed") failures.push("version.json edge install command drifted");
if (versionInfo.stableManifest !== "https://github.com/bitjaru/styleseed/releases/latest/download/release-manifest.json") {
  failures.push("version.json stable release manifest URL drifted");
}

for (const phrase of requiredPhrases) {
  if (!texts.some(({ text }) => text.includes(phrase))) failures.push(`missing required phrase: ${phrase}`);
}
for (const denied of denylist) {
  for (const { path, text } of texts) {
    if (text.includes(denied)) failures.push(`denylisted phrase "${denied}" found in ${path}`);
  }
}
for (const [field, expected] of Object.entries({ rules: expectedRules, skins: expectedSkins })) {
  if (!Number.isSafeInteger(versionInfo[field])) {
    failures.push(`version.json ${field} must be an integer; found ${String(versionInfo[field])}`);
  } else if (versionInfo[field] !== expected) {
    failures.push(`version.json ${field} drifted: expected ${expected}, found ${versionInfo[field]}`);
  }
}
if (texts.some(({ text }) => text.includes("New in v4.0"))) {
  failures.push('stale homepage label "New in v4.0" found');
}
if (resolvedDocsPalette !== bundledDocsPalette) {
  failures.push("demo site-docs palette mirror drifted from the resolved StyleSeed palette");
}

if (failures.length > 0) {
  console.error(`Public claims test failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public claims verified: denylist clear and required limitation phrases present");
