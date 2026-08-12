import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engine = resolve(root, "engine");
const out = resolve(engine, ".claude/skills/ss-resolve/references/catalog.json");
const read = (name) => readFileSync(resolve(engine, name), "utf8").trim();

function section(markdown, heading, nextHeadingPattern) {
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`Missing context heading: ${heading}`);
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(nextHeadingPattern);
  return `${heading}${next < 0 ? rest : rest.slice(0, next)}`.trim();
}

const rulesets = read("RULESETS.md");
const adapters = read("ADAPTERS.md");
const domains = read("APP-PLAYBOOKS.md");
const pages = read("PAGE-TYPES.md");
const presets = read("PRESETS.md");
const recipes = read("BRAND-RECIPES.md");
const palettes = JSON.parse(read("color/palettes.json"));

function walkFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(absolute, relative);
    return entry.isFile() ? [relative] : [];
  });
}

const topLevelDistributionFiles = readdirSync(engine, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name === ".cursorrules" || name === "VERSION" || name.endsWith(".md"));
const distributionPaths = [
  ...topLevelDistributionFiles,
  ...walkFiles(resolve(engine, ".claude/skills"), ".claude/skills")
    .filter((path) => path !== ".claude/skills/ss-resolve/references/catalog.json"),
  ...walkFiles(resolve(engine, "color"), "color"),
].sort();
const distributionFiles = distributionPaths.map((path) => {
  const content = readFileSync(resolve(engine, path));
  return {
    path,
    sha256: createHash("sha256").update(content).digest("hex"),
    bytes: statSync(resolve(engine, path)).size,
  };
});
const engineRevision = `sha256:${createHash("sha256")
  .update(distributionFiles.map((file) => `${file.path}\0${file.sha256}\n`).join(""))
  .digest("hex")}`;

const grammarIds = [
  "consumer-service",
  "operations-console",
  "technical-instrument",
  "editorial-reading",
  "commerce-conversion",
  "institutional-service",
  "expressive-marketing",
  "sequential-story",
];

const adapterIds = [
  "product-ui",
  "social-carousel",
  "slide-deck",
  "document-report",
  "single-frame",
];

const domainHeadings = {
  fintech: "## 1. Fintech / Banking / Payments",
  saas: "## 2. SaaS / B2B Dashboard / Analytics",
  ecommerce: "## 3. E-commerce / Retail",
  social: "## 4. Social / Community / Feed",
  content: "## 5. Content / Media / News / Blog / Docs",
  productivity: "## 6. Productivity / Tools / Workspace",
  health: "## 7. Health / Wellness / Fitness",
  education: "## 8. Education / Learning / Courses",
  "developer-tools": "## 9. Developer Tools / Infra / API",
  marketplace: "## 10. Marketplace / Listings (two-sided)",
  booking: "## 11. Booking / Travel / Reservations",
  "ai-assistant": "## 12. AI / Chat / Assistant",
};

const pageHeadings = {
  dashboard: "## Dashboard / Home / Overview",
  form: "## Form / Create / Edit",
  landing: "## Landing / Marketing / Home (public)",
  detail: "## Detail / Profile / Item",
  list: "## List / Index / Browse / Search",
  settings: "## Settings / Account / Preferences",
  onboarding: "## Onboarding / First-run / Empty",
};

function tableRow(markdown, id) {
  const line = markdown
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`| \`${id}\` |`));
  if (!line) throw new Error(`Missing profile row: ${id}`);
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  return [
    `### ${id}`,
    "",
    `- Coordinate: ${cells[1]}`,
    `- Signature: ${cells[2]}`,
    `- This profile does not permit: ${cells[3]}`,
    "- Apply the coordinate coherently across radius, density, typography, palette temperature, elevation, motion, composition, and one signature move.",
  ].join("\n");
}

const profileIds = [
  "swiss",
  "editorial",
  "technical",
  "warm-dtc",
  "minimal-mono",
  "brutalist-lite",
];

const recipeIds = [
  "calm-consumer",
  "native-mobile",
  "enterprise-workbench",
  "developer-platform",
  "commerce-operator",
  "public-service",
  "creative-professional",
  "editorial-authority",
  "expressive-brand",
];

const catalog = {
  schemaVersion: 3,
  engineVersion: read("VERSION"),
  engineRevision,
  distributionFiles,
  generatedFrom: [
    "PRODUCT-PRINCIPLES.md",
    "CRAFT-BASELINE.md",
    "RULESETS.md",
    "ADAPTERS.md",
    "APP-PLAYBOOKS.md",
    "PAGE-TYPES.md",
    "BRAND-RECIPES.md",
    "PALETTE-RECIPES.md",
    "color/palettes.json",
    "PRESETS.md",
  ],
  core: read("PRODUCT-PRINCIPLES.md"),
  craft: read("CRAFT-BASELINE.md"),
  grammars: Object.fromEntries(
    grammarIds.map((id) => [
      id,
      section(rulesets, `### \`${id}\``, /\n### `|\n## /),
    ]),
  ),
  adapters: Object.fromEntries(
    adapterIds.map((id) => [
      id,
      section(adapters, `## \`${id}\``, /\n## `|\n## Adding adapters/),
    ]),
  ),
  domains: Object.fromEntries(
    Object.entries(domainHeadings).map(([id, heading]) => [
      id,
      section(domains, heading, /\n## \d+\. |\n## When the domain/),
    ]),
  ),
  pages: Object.fromEntries(
    Object.entries(pageHeadings).map(([id, heading]) => [
      id,
      section(pages, heading, /\n## /),
    ]),
  ),
  recipes: Object.fromEntries(
    recipeIds.map((id) => [
      id,
      section(recipes, `## \`${id}\``, /\n## `/),
    ]),
  ),
  palettes: Object.fromEntries(
    palettes.map((palette) => [
      palette.id,
      [
        `### ${palette.id}`,
        "",
        `- Name: ${palette.name}`,
        `- Mode: ${palette.mode}`,
        `- Best for: ${palette.bestFor}`,
        `- Recipe bias: ${palette.recipeBias.join(", ")}`,
        `- Semantic roles: ${Object.entries(palette.roles).map(([role, value]) => `${role}=${value}`).join(" · ")}`,
        `- Usage: ${palette.usage}`,
        `- Generated-media anchors: ${palette.assetBrief.anchors.join(", ")}`,
        `- Avoid in generated media: ${palette.assetBrief.avoid.join(", ")}`,
        "- Re-run deterministic contrast validation after any project override.",
      ].join("\n"),
    ]),
  ),
  profiles: Object.fromEntries(profileIds.map((id) => [id, tableRow(presets, id)])),
  agents: {
    claude: [
      "## Claude Code execution contract",
      "",
      "- Invoke StyleSeed skills with `/ss-*`.",
      "- Read this compiled bundle before implementation; do not load the full handbook unless a named ambiguity remains.",
      "- Use the selected renderer, run `/ss-score`, then inspect rendered output with `/ss-verify`.",
    ].join("\n"),
    codex: [
      "## Codex execution contract",
      "",
      "- Invoke StyleSeed skills with `$ss-*` or the Skills picker.",
      "- Read this compiled bundle before implementation; do not load the full handbook unless a named ambiguity remains.",
      "- Run project checks, then `$ss-score`; render and inspect the actual artifact with `$ss-verify` before claiming completion.",
    ].join("\n"),
    cursor: [
      "## Cursor execution contract",
      "",
      "- Use the installed StyleSeed skills from the skill picker or follow this bundle directly.",
      "- Keep decisions in project files, run the project checks, and inspect the real rendered artifact before delivery.",
    ].join("\n"),
    generic: [
      "## Agent execution contract",
      "",
      "- Treat this compiled bundle as the active StyleSeed context.",
      "- Keep decisions in project files, run available project checks, and inspect the real rendered artifact before delivery.",
    ].join("\n"),
  },
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `StyleSeed context catalog: ${grammarIds.length} grammars · ${adapterIds.length} adapters · ${Object.keys(domainHeadings).length} domains · ${Object.keys(pageHeadings).length} pages · ${recipeIds.length} recipes · ${palettes.length} palettes · ${profileIds.length} profiles`,
);
