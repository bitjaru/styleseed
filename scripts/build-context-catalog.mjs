import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const catalog = {
  schemaVersion: 1,
  engineVersion: read("VERSION"),
  generatedFrom: [
    "PRODUCT-PRINCIPLES.md",
    "CRAFT-BASELINE.md",
    "RULESETS.md",
    "ADAPTERS.md",
    "APP-PLAYBOOKS.md",
    "PAGE-TYPES.md",
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
  `StyleSeed context catalog: ${grammarIds.length} grammars · ${adapterIds.length} adapters · ${Object.keys(domainHeadings).length} domains · ${Object.keys(pageHeadings).length} pages · ${profileIds.length} profiles`,
);
