import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [
  "README.md",
  "README-KR.md",
  "SECURITY.md",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "engine/PRODUCT-PRINCIPLES.md",
  "engine/AGENTS.md",
  "engine/CLAUDE.md",
  "engine/.cursorrules",
  "demo-pricing/scripts/build-llms.mjs",
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
  "strips project identity",
  "designed-looking products without a design team",
  "makes AI reason like a strong UI/UX designer",
  "디자인 팀 없이도 디자인된 티가 나는 제품",
  "Zero designer.",
  "StyleSeed is built for vibe coding without a designer."
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

// validate-engine.mjs ties every count in version.json back to its engine source. What nothing
// checked is the same numbers retyped by hand in the public READMEs, as prose, as ASCII summaries
// and as badge URLs. Those are the numbers an evaluator counts first, so hold them to version.json.
const countedClaims = {
  rules: "(?:craft\\s+)?rules",
  grammars: "(?:output\\s+)?grammars",
  adapters: "(?:surface\\s+)?adapters",
  skills: "skills",
  // A bare "N recipes" means brand recipes; palette counts always carry the word palette.
  recipes: "(?:brand\\s+)?recipes",
  palettes: "palette\\s+recipes|palettes",
  skins: "(?:brand\\s+)?skins"
};
const claimSurfaces = ["README.md", "README-KR.md"];
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const claimsSeen = Object.fromEntries(Object.keys(countedClaims).map((field) => [field, 0]));
for (const path of claimSurfaces) {
  const entry = texts.find((item) => item.path === path);
  if (!entry) {
    failures.push(`counted-claim surface missing from the checked files: ${path}`);
    continue;
  }
  for (const [field, keyword] of Object.entries(countedClaims)) {
    const expected = versionInfo[field];
    if (!Number.isSafeInteger(expected)) {
      failures.push(`version.json ${field} must be an integer before READMEs can be checked against it`);
      continue;
    }
    const prose = new RegExp(`(\\d+)\\s*(?:\\*\\*)?\\s+(?:\\*\\*)?(?:${keyword})\\b`, "giu");
    const badge = new RegExp(`badgen\\.net/badge/${field}/(\\d+)/`, "gu");
    for (const pattern of [prose, badge]) {
      for (const match of entry.text.matchAll(pattern)) {
        claimsSeen[field] += 1;
        if (Number(match[1]) === expected) continue;
        failures.push(`${path}:${lineOf(entry.text, match.index)} claims ${match[1]} for ${field}; version.json says ${expected} (${JSON.stringify(match[0])})`);
      }
    }
  }
}
// A README rewrite that drops the wording would otherwise disable this check in silence.
for (const [field, seen] of Object.entries(claimsSeen)) {
  if (seen === 0) failures.push(`no ${field} count found in ${claimSurfaces.join(" or ")}; the counted-claim check would pass vacuously`);
}

if (failures.length > 0) {
  console.error(`Public claims test failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public claims verified: denylist clear and required limitation phrases present");
