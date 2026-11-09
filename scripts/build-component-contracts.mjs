#!/usr/bin/env node
// Component contracts (#102): one designer-readable file per engine component.
//
// engine/components/contracts/<id>.md holds the judgment a designer writes by hand: purpose, anatomy,
// variants (with the designer's names), states, do / don't, known gaps, sources. This script reads the
// component source and writes the facts that can be generated (parts, props, variants, sizes, tokens
// consumed, radius, focus, motion, machine checks) into a marked block at the end of the same file, and
// writes demo-pricing/content/component-contracts.json for the gallery and the registry.
//
// It fails when the hand-written variant or size table disagrees with the code, when a required section
// is missing, or (with --check) when a generated block or the JSON is out of date.
//
//   node scripts/build-component-contracts.mjs            write generated blocks + JSON
//   node scripts/build-component-contracts.mjs --check    exit 1 if anything would change
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractsDir = resolve(root, "engine/components/contracts");
const outJson = resolve(root, "demo-pricing/content/component-contracts.json");
const GEN_START = "<!-- generated:start";
const GEN_END = "<!-- generated:end -->";
const GEN_HEADER = `${GEN_START} — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->`;

// The order a designer builds a system (#96): actions, labels, navigation, form controls, data.
export const DESIGNER_ORDER = ["button", "badge", "tabs", "input", "select", "switch", "table"];
const REQUIRED = ["Purpose", "Anatomy", "States", "Do", "Don't", "Known gaps", "Sources"];
const INTERACTIVE_SLOTS = new Set(["button", "input", "textarea", "select-trigger", "tabs-list", "tabs-trigger", "switch", "toggle", "checkbox"]);
const TOUCH_MIN = 44;

const sha = (text) => createHash("sha256").update(text).digest("hex");

// --- theme colour names -------------------------------------------------------------------------------

export function themeColors() {
  const names = new Set();
  const skins = resolve(root, "skins");
  for (const skin of readdirSync(skins, { withFileTypes: true })) {
    const file = resolve(skins, skin.name, "theme.css");
    if (!skin.isDirectory() || !existsSync(file)) continue;
    for (const match of readFileSync(file, "utf8").matchAll(/--color-([a-z0-9-]+)\s*:/gu)) names.add(match[1]);
  }
  return names;
}

// --- source parsing -----------------------------------------------------------------------------------

function balanced(text, openIndex) {
  // text[openIndex] is "(" — return the content up to the matching ")", skipping strings and comments.
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      for (i += 1; i < text.length && text[i] !== quote; i += 1) if (text[i] === "\\") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") { i = text.indexOf("\n", i); if (i < 0) break; continue; }
    if (ch === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i) + 1; continue; }
    if (ch === "(") depth += 1;
    if (ch === ")") { depth -= 1; if (depth === 0) return text.slice(openIndex + 1, i); }
  }
  throw new Error("unbalanced parentheses");
}

const strings = (text) => [...text.matchAll(/"((?:[^"\\]|\\.)*)"/gu)].map((m) => m[1]);

// Split a Tailwind class on top-level ":" (not inside [...] or (...)) into prefixes + utility.
export function splitClass(cls) {
  const parts = []; let depth = 0; let current = "";
  for (const ch of cls) {
    if (ch === "[" || ch === "(") depth += 1;
    if (ch === "]" || ch === ")") depth -= 1;
    if (ch === ":" && depth === 0) { parts.push(current); current = ""; continue; }
    current += ch;
  }
  parts.push(current);
  return { prefixes: parts.slice(0, -1), utility: parts.at(-1).replace(/^!/u, "") };
}

const SPACING = (value) => {
  if (/^\d+(\.\d+)?$/u.test(value)) return Number(value) * 4;
  const px = value.match(/^\[(\d+(?:\.\d+)?)px\]$/u); if (px) return Number(px[1]);
  const rem = value.match(/^\[(\d+(?:\.\d+)?)rem\]$/u); if (rem) return Math.round(Number(rem[1]) * 16 * 10) / 10;
  return null;
};
const TEXT_SIZES = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 };

export function classFacts(classList, colours) {
  const tokens = new Set(); const darkTokens = new Set(); const focus = new Set(); const motion = new Set(); const radius = new Set();
  let height = null; let width = null; let paddingX = null; let text = null; let icon = null; const heightsBySize = {};
  for (const raw of classList.split(/\s+/u).filter(Boolean)) {
    const { prefixes, utility } = splitClass(raw);
    const colour = utility.match(/^(?:bg|text|border|ring|outline|fill|stroke|divide|caret|accent)-([a-z][a-z0-9-]*?)(?:\/\d+)?$/u);
    if (colour && colours.has(colour[1])) (prefixes.includes("dark") ? darkTokens : tokens).add(colour[1]);
    if (prefixes.includes("focus-visible") || prefixes.includes("focus")) focus.add(raw);
    if (/^(transition|duration|ease|animate)(-|$)/u.test(utility)) motion.add(raw);
    if (/^rounded(-|$)/u.test(utility) || utility === "ss-pattern-control") radius.add(utility);
    // The element's own box: the first height/width wins, so a child (a switch thumb) cannot override the root.
    if (prefixes.length === 0 || (prefixes.length === 1 && prefixes[0].startsWith("data-[size="))) {
      const h = utility.match(/^(?:h|size)-(.+)$/u);
      const size = prefixes[0]?.match(/^data-\[size=([a-z]+)\]$/u)?.[1];
      if (h && SPACING(h[1]) !== null) { if (size) heightsBySize[size] ??= SPACING(h[1]); else height ??= SPACING(h[1]); }
      const w = utility.match(/^(?:w|size)-(.+)$/u); if (w && SPACING(w[1]) !== null && !size) width ??= SPACING(w[1]);
      const px = utility.match(/^px-(.+)$/u); if (px && SPACING(px[1]) !== null) paddingX ??= SPACING(px[1]);
      const t = utility.match(/^text-(?:\[(\d+)px\]|(xs|sm|base|lg|xl))$/u); if (t) text ??= t[1] ? Number(t[1]) : TEXT_SIZES[t[2]];
    }
    const svg = utility.match(/^size-(.+)$/u);
    if (svg && prefixes.some((p) => p.startsWith("[&_svg") || p.startsWith("[&>svg")) && SPACING(svg[1]) !== null) icon ??= SPACING(svg[1]);
  }
  return { tokens, darkTokens, focus, motion, radius, height, width, paddingX, text, icon, heightsBySize };
}

function radixPackages(code) {
  const map = {};
  for (const m of code.matchAll(/import \* as (\w+) from "(@radix-ui\/[^"]+)"/gu)) map[m[1]] = m[2];
  return map;
}

function describeType(typeText, radix, cvaNames) {
  const props = [];
  const native = typeText.match(/React\.ComponentProps<"(\w+)">/u);
  if (native) props.push(`native \`<${native[1]}>\` props`);
  const prim = typeText.match(/React\.ComponentProps<typeof (\w+)\.(\w+)>/u);
  if (prim) props.push(`\`${radix[prim[1]] ?? prim[1]}\` ${prim[2]} props`);
  for (const m of typeText.matchAll(/VariantProps<typeof (\w+)>/gu)) if (cvaNames.has(m[1])) props.push(`variant props of \`${m[1]}\``);
  const extra = typeText.match(/&\s*\{([^}]*)\}/u);
  const extras = [];
  if (extra) for (const m of extra[1].matchAll(/(\w+)(\?)?\s*:\s*([^;]+);?/gu)) extras.push({ name: m[1], optional: Boolean(m[2]), type: m[3].trim() });
  return { base: props, extras };
}

export function parseSource(code, colours) {
  const exports = (code.match(/export\s*\{([^}]+)\}/u)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const radix = radixPackages(code);
  // cva definitions
  const cvas = {};
  for (const m of code.matchAll(/const (\w+) = cva\(/gu)) {
    const args = balanced(code, m.index + m[0].length - 1);
    // eslint-disable-next-line no-new-func
    const [base, config = {}] = new Function(`return [${args}]`)();
    cvas[m[1]] = { base, variants: config.variants ?? {}, defaults: config.defaultVariants ?? {} };
  }
  const cvaNames = new Set(Object.keys(cvas));
  // functions and their bodies
  const fnMatches = [...code.matchAll(/function (\w+)\s*\(/gu)];
  const parts = [];
  for (let i = 0; i < fnMatches.length; i += 1) {
    const m = fnMatches[i];
    if (!exports.includes(m[1])) continue;
    const params = balanced(code, m.index + m[0].length - 1);
    const typeText = params.includes("}:") ? params.slice(params.lastIndexOf("}:") + 2) : "";
    const destructured = params.match(/^\s*\{([\s\S]*?)\}\s*:/u)?.[1] ?? "";
    const defaults = Object.fromEntries([...destructured.matchAll(/(\w+)\s*=\s*("[^"]*"|true|false|\d+)/gu)].map((d) => [d[1], d[2].replace(/"/gu, "")]));
    const end = fnMatches[i + 1]?.index ?? code.indexOf("export {");
    const body = code.slice(m.index, end);
    const slot = body.match(/data-slot="([^"]+)"/u)?.[1] ?? null;
    const classStrings = [];
    for (const c of body.matchAll(/cn\(/gu)) classStrings.push(...strings(balanced(body, c.index + 2)));
    for (const c of body.matchAll(/className="([^"]+)"/gu)) classStrings.push(c[1]);
    const usedCva = [...body.matchAll(/(\w+Variants)\(/gu)].map((u) => u[1]).filter((n) => cvaNames.has(n));
    for (const name of usedCva) {
      classStrings.push(cvas[name].base);
      for (const group of Object.values(cvas[name].variants)) classStrings.push(...Object.values(group));
    }
    const { base, extras } = describeType(typeText, radix, cvaNames);
    parts.push({ name: m[1], slot, propsBase: base, extras: extras.map((e) => ({ ...e, default: defaults[e.name] ?? null })), cva: usedCva[0] ?? null, classes: classStrings.join(" ") });
  }
  return { exports, cvas, parts, hasHex: /#[0-9a-fA-F]{6}\b/u.test(code.replace(/\/\/.*$/gmu, "")) };
}

// --- contract markdown --------------------------------------------------------------------------------

function parseTable(body) {
  const lines = body.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const cells = (l) => l.trim().replace(/^\||\|$/gu, "").split("|").map((c) => c.trim());
  const header = cells(lines[0]);
  return { header, rows: lines.slice(2).map(cells) };
}
function parseList(body) {
  const items = [];
  for (const line of body.split("\n")) {
    if (/^\s*-\s+/u.test(line)) items.push(line.replace(/^\s*-\s+/u, "").trim());
    else if (items.length && line.trim() && !line.trim().startsWith("|")) items[items.length - 1] += ` ${line.trim()}`;
  }
  return items;
}

export function parseContract(md) {
  const hand = md.split(GEN_START)[0].trimEnd();
  const title = hand.match(/^# (.+)$/mu)?.[1]?.trim() ?? null;
  const sections = {};
  const chunks = hand.split(/^## /mu).slice(1);
  for (const chunk of chunks) {
    const [heading, ...rest] = chunk.split("\n");
    sections[heading.trim()] = rest.join("\n").trim();
  }
  return { hand, title, sections };
}

const codeCell = (cell) => cell?.match(/^`([^`]+)`$/u)?.[1] ?? null;

// --- build one component ------------------------------------------------------------------------------

function findSource(id) {
  for (const dir of ["ui", "patterns"]) {
    const rel = `engine/components/${dir}/${id}.tsx`;
    if (existsSync(resolve(root, rel))) return rel;
  }
  return null;
}

export function buildContract(id, md, colours = themeColors()) {
  const problems = [];
  const sourceRel = findSource(id);
  if (!sourceRel) return { problems: [`${id}: no component at engine/components/{ui,patterns}/${id}.tsx`] };
  const code = readFileSync(resolve(root, sourceRel), "utf8");
  const source = parseSource(code, colours);
  const contract = parseContract(md);
  const s = contract.sections;
  if (!contract.title) problems.push(`${id}: missing "# Title" line`);
  for (const heading of REQUIRED) if (!s[heading]) problems.push(`${id}: missing or empty "## ${heading}"`);

  // Variants and sizes: every value in the code has a row, every row names a value in the code.
  const primaryCva = source.parts.find((p) => p.cva)?.cva;
  const cva = primaryCva ? source.cvas[primaryCva] : null;
  const sizeProp = source.parts.flatMap((p) => p.extras).find((e) => e.name === "size");
  const codeVariants = cva?.variants.variant ? Object.keys(cva.variants.variant) : [];
  const codeSizes = cva?.variants.size ? Object.keys(cva.variants.size) : sizeProp ? [...sizeProp.type.matchAll(/"([^"]+)"/gu)].map((m) => m[1]) : [];
  const variantsTable = s.Variants ? parseTable(s.Variants) : null;
  const sizesTable = s.Sizes ? parseTable(s.Sizes) : null;
  const compare = (label, codeValues, table) => {
    if (!codeValues.length) return;
    if (!table) { problems.push(`${id}: the code has ${label} (${codeValues.join(", ")}) but "## ${label === "variants" ? "Variants" : "Sizes"}" has no table`); return; }
    const documented = table.rows.map((r) => codeCell(r[0])).filter(Boolean);
    for (const v of codeValues) if (!documented.includes(v)) problems.push(`${id}: ${label} \`${v}\` is in the code but not in the table`);
    for (const v of documented) if (!codeValues.includes(v)) problems.push(`${id}: ${label} \`${v}\` is in the table but not in the code`);
  };
  compare("variants", codeVariants, variantsTable);
  compare("sizes", codeSizes, sizesTable);

  // Facts per part, merged.
  const all = { tokens: new Set(), darkTokens: new Set(), focus: new Set(), motion: new Set(), radius: new Set() };
  const flags = [];
  const parts = source.parts.map((part) => {
    const facts = classFacts(part.classes, colours);
    for (const key of Object.keys(all)) for (const v of facts[key]) all[key].add(v);
    return { ...part, facts };
  });
  for (const t of all.darkTokens) if (all.tokens.has(t)) all.darkTokens.delete(t);

  // Sizes from the cva size group (button, toggle) or from data-[size=] heights (select trigger).
  let sizes = [];
  if (cva?.variants.size) {
    sizes = Object.entries(cva.variants.size).map(([key, cls]) => { const f = classFacts(cls, colours); return { key, height: f.height, paddingX: f.paddingX, text: f.text, icon: f.icon }; });
  } else {
    const withSizes = parts.find((p) => Object.keys(p.facts.heightsBySize).length);
    if (withSizes) sizes = Object.entries(withSizes.facts.heightsBySize).map(([key, height]) => ({ key, height, paddingX: withSizes.facts.paddingX, text: withSizes.facts.text, icon: null }));
  }

  // Machine checks.
  const small = [];
  for (const part of parts) {
    if (!INTERACTIVE_SLOTS.has(part.slot)) continue;
    if (part.cva && sizes.length) for (const sz of sizes) { if (sz.height !== null && sz.height < TOUCH_MIN) small.push(`\`${sz.key}\` ${sz.height}px`); }
    else if (Object.keys(part.facts.heightsBySize).length) for (const [k, h] of Object.entries(part.facts.heightsBySize)) { if (h < TOUCH_MIN) small.push(`\`${part.slot}\` size \`${k}\` ${h}px`); }
    else if (part.facts.height !== null && part.facts.height < TOUCH_MIN) small.push(`\`${part.slot}\` ${part.facts.height}px${part.facts.width ? ` × ${part.facts.width}px` : ""}`);
  }
  if (small.length) flags.push(`Height under the ${TOUCH_MIN}px touch minimum (DESIGN-LANGUAGE §41): ${[...new Set(small)].join(", ")}. On touch surfaces, extend the hit area or use a taller size.`);
  if ([...all.motion].some((m) => splitClass(m).utility === "transition-all")) flags.push("Uses `transition-all`; name the transitioned properties (detector SS003).");
  if (source.hasHex) flags.push("Contains a literal hex colour; use a theme role (detector SS001).");
  const radius = all.radius.has("ss-pattern-control")
    ? `recipe control radius (\`ss-pattern-control\` → \`--ss-control-radius\`, 0–999px by brand recipe)${[...all.radius].filter((r) => r !== "ss-pattern-control").length ? `; also ${[...all.radius].filter((r) => r !== "ss-pattern-control").map((r) => `\`${r}\``).join(", ")}` : ""}`
    : all.radius.size ? `fixed ${[...all.radius].map((r) => `\`${r}\``).join(", ")} (not the recipe control radius)` : "none set";
  if (!all.radius.has("ss-pattern-control") && parts.some((p) => INTERACTIVE_SLOTS.has(p.slot)) && all.radius.size) flags.push(`Radius is fixed (${[...all.radius].join(", ")}) instead of the recipe control radius used by Button and Tabs.`);

  const code_ = {
    source: sourceRel,
    sha256: `sha256:${sha(code)}`,
    exports: source.exports,
    parts: parts.map((p) => ({ name: p.name, slot: p.slot, propsBase: p.propsBase, extras: p.extras })),
    variants: codeVariants,
    sizes,
    defaults: cva?.defaults ?? {},
    tokens: [...all.tokens].sort(),
    darkTokens: [...all.darkTokens].sort(),
    radius,
    focus: [...all.focus].sort(),
    motion: [...all.motion].sort(),
    flags,
  };
  const hand = {
    title: contract.title,
    purpose: s.Purpose ?? "",
    anatomy: parseList(s.Anatomy ?? ""),
    variants: variantsTable ? variantsTable.rows.map((r) => ({ code: codeCell(r[0]), designer: r[1] ?? "", use: r[2] ?? "" })) : [],
    sizes: sizesTable ? sizesTable.rows.map((r) => ({ code: codeCell(r[0]), use: r.slice(1).join(" · ") })) : [],
    states: (() => { const t = s.States ? parseTable(s.States) : null; return t ? t.rows.map((r) => ({ state: r[0], looks: r[1] ?? "", note: r[2] ?? "" })) : parseList(s.States ?? "").map((item) => ({ state: item, looks: "", note: "" })); })(),
    do: parseList(s.Do ?? ""),
    dont: parseList(s["Don't"] ?? ""),
    knownGaps: parseList(s["Known gaps"] ?? ""),
    sources: parseList(s.Sources ?? ""),
  };
  return { id, problems, hand, code: code_, contractHand: contract.hand };
}

// --- generated block ----------------------------------------------------------------------------------

const list = (items) => items.map((i) => `\`${i}\``).join(" · ");

export function renderGenerated(result) {
  const c = result.code;
  const importPath = c.source.replace(/^engine\/components\//u, "@/components/").replace(/\.tsx$/u, "");
  const rows = c.parts.map((p) => {
    const props = [...p.propsBase];
    if (p.name && result.code.variants.length && p.propsBase.some((b) => b.startsWith("variant props"))) {
      props.splice(props.findIndex((b) => b.startsWith("variant props")), 1,
        `\`variant\` ${result.code.variants.join(" · ")} (default \`${c.defaults.variant ?? result.code.variants[0]}\`)`,
        ...(c.sizes.length && c.defaults.size ? [`\`size\` ${c.sizes.map((s) => s.key).join(" · ")} (default \`${c.defaults.size}\`)`] : []));
    }
    for (const e of p.extras) props.push(`\`${e.name}${e.optional ? "?" : ""}: ${e.type.replace(/\|/gu, "\\|")}\`${e.default !== null ? ` (default \`${e.default}\`)` : ""}`);
    return `| \`${p.name}\` | ${p.slot ? `\`${p.slot}\`` : "—"} | ${props.join(" · ") || "—"} |`;
  });
  const sizeRows = c.sizes.map((s) => `| \`${s.key}\` | ${s.height ?? "—"}${s.height !== null ? "px" : ""} | ${s.paddingX !== null ? `${s.paddingX}px` : "—"} | ${s.text !== null ? `${s.text}px` : "—"} | ${s.icon !== null ? `${s.icon}px` : "—"} |`);
  return [
    GEN_HEADER,
    "",
    "## From the code",
    "",
    `Source \`${c.source}\` · \`${c.sha256.slice(0, 19)}…\``,
    "",
    "Import, after copying `engine/components` into `src/components`:",
    "",
    "```tsx",
    `import { ${c.exports.join(", ")} } from "${importPath}";`,
    "```",
    "",
    "| Part | `data-slot` | Props |",
    "|---|---|---|",
    ...rows,
    ...(sizeRows.length ? ["", "| Size | Height | Padding x | Text | Icon |", "|---|---|---|---|---|", ...sizeRows] : []),
    "",
    `- **Tokens consumed:** ${list(c.tokens) || "none"}${c.darkTokens.length ? `; dark mode only: ${list(c.darkTokens)}` : ""}`,
    `- **Radius:** ${c.radius}`,
    `- **Focus:** ${list(c.focus) || "none set"}`,
    `- **Motion:** ${list(c.motion) || "none"}`,
    "",
    "### Machine checks",
    "",
    ...(c.flags.length ? c.flags.map((f) => `- ${f}`) : ["- None."]),
    "",
    GEN_END,
    "",
  ].join("\n");
}

// --- main ---------------------------------------------------------------------------------------------

export function buildAll() {
  const colours = themeColors();
  const files = existsSync(contractsDir) ? readdirSync(contractsDir).filter((f) => f.endsWith(".md") && f !== "README.md") : [];
  const ids = files.map((f) => basename(f, ".md")).sort((a, b) => {
    const ia = DESIGNER_ORDER.indexOf(a); const ib = DESIGNER_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const results = ids.map((id) => buildContract(id, readFileSync(resolve(contractsDir, `${id}.md`), "utf8"), colours));
  const allComponents = ["ui", "patterns"].flatMap((dir) => readdirSync(resolve(root, "engine/components", dir)).filter((f) => f.endsWith(".tsx")).map((f) => basename(f, ".tsx")));
  const json = {
    schemaVersion: 1,
    generatedBy: "scripts/build-component-contracts.mjs",
    coverage: { contracts: results.length, components: allComponents.length, missing: allComponents.filter((id) => !ids.includes(id)).sort() },
    components: results.filter((r) => !r.problems.length).map((r) => ({ id: r.id, contract: `engine/components/contracts/${r.id}.md`, ...r.hand, code: r.code })),
  };
  return { results, json };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { results, json } = buildAll();
  const problems = results.flatMap((r) => r.problems);
  if (problems.length) {
    console.error(`component contracts: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  const stale = [];
  for (const r of results) {
    const path = resolve(contractsDir, `${r.id}.md`);
    const next = `${r.contractHand}\n\n${renderGenerated(r)}`;
    if (readFileSync(path, "utf8") !== next) { stale.push(`engine/components/contracts/${r.id}.md`); if (!check) writeFileSync(path, next); }
  }
  const nextJson = `${JSON.stringify(json, null, 2)}\n`;
  if (!existsSync(outJson) || readFileSync(outJson, "utf8") !== nextJson) { stale.push("demo-pricing/content/component-contracts.json"); if (!check) writeFileSync(outJson, nextJson); }
  if (check && stale.length) {
    console.error(`component contracts: out of date — run node scripts/build-component-contracts.mjs\n${stale.map((s) => `  - ${s}`).join("\n")}`);
    process.exit(1);
  }
  const flagged = results.filter((r) => r.code.flags.length).length;
  console.log(`component contracts: ${results.length} of ${json.coverage.components} components (${flagged} with machine checks)${stale.length && !check ? `; wrote ${stale.length} file(s)` : ""}`);
}
