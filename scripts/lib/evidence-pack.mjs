// The evidence pack (WO-11 A1) and the engine defaults (A2): the only form in which corpus numbers and
// shipped component values reach a user. Pure: no I/O, no clock; the same input gives the same bytes.
//
// buildEvidencePack copies, from one named corpus run, the rows of the claims listed in CLAIM_USES:
// value distributions as counts of lineages by kind, never a per-system or per-screen value. A row
// whose `valueKind` this builder does not know (WO-12 `set` rows) and a claim without a CLAIM_USES
// line are left out without failing, except an `adapt` claim of the run that is in neither CLAIM_USES
// nor NOT_PACKED: that is a problem until someone says how the proposer may use it.
//
// buildEngineDefaults reads what the engine ships (component heights and text sizes, recipe radii and
// gaps, the starting spacing set of a rule) from the source, so "not measured" is structural: these
// numbers live in their own file and the proposer always labels them as unmeasured.
import { DECISION_AXES } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/runtime-contract.mjs";
import { classFacts, parseSource, splitClass } from "../build-component-contracts.mjs";

export const PACK_VERSION = 1;
export const DEFAULTS_VERSION = 1;
export const GENERATED_BY = "scripts/build-evidence-pack.mjs";

// claim id → how the proposer may use it. `use`: `value` = a numeric bucket is a candidate value of the
// axis; `flag` = a boolean claim whose `true` bucket stands for `values`; `note` = printed as a count
// line, never changes a proposal. `complete: false` = the value is one member of a set axis.
// `viewport` = the rows read (default 1440; a row whose viewport is "both" matches any).
export const CLAIM_USES = Object.freeze({
  "button.height": Object.freeze({ axis: "controlHeights", use: "value", unit: "px", label: "default button height" }),
  "field.height": Object.freeze({ axis: "controlHeights", use: "value", unit: "px", label: "default text field height" }),
  "field.textSize": Object.freeze({ axis: "typeSizes", use: "value", unit: "px", complete: false, label: "text field text size" }),
  "text.bodySize": Object.freeze({ axis: "typeSizes", use: "value", unit: "px", complete: false, label: "body text size" }),
  "table.rowHeight": Object.freeze({ axis: "tableRowHeights", use: "value", unit: "px", label: "table row height" }),
  "primary.onePerSection": Object.freeze({ axis: "primariesPerSection", use: "flag", values: Object.freeze([1]), label: "at most one primary action per section" }),
  "controls.shareHeight": Object.freeze({ axis: "controlHeights", use: "note", label: "fields and buttons share one height" }),
  "controls.pointerUnder44": Object.freeze({ axis: "controlHeights", use: "note", label: "default buttons under 44px" }),
  "controls.narrowAtLeast44": Object.freeze({ axis: "controlHeights", use: "note", viewport: 390, caveat: "A width, not touch input.", label: "default buttons at least 44px" }),
  "lineage.buttonHeight": Object.freeze({ axis: "controlHeights", use: "note", label: "one button height across a system's measured screens" }),
  "controls.shareRadius": Object.freeze({ axis: "radii", use: "note", label: "fields and buttons share a corner radius" }),
});

// Claims that never reach the pack, each with the reason (an adapt claim must be listed here or in CLAIM_USES).
export const NOT_PACKED = Object.freeze({
  "motion.transitionAll": "a share band, not a ledger value",
  "lineage.spacingBase": "its test reads every declared spacing value and does not find a system's spacing unit; a later run replaces it with a spacing sample",
});

const NEVER_PROPOSED = new Set(["accent", "ink", "canvas", "fonts"]);
const USES = new Set(["value", "flag", "note"]);
const KNOWN_VALUE_KINDS = new Set([undefined, "value"]);
const ROW_FIELDS = ["claim", "pageType", "viewport", "measured", "distribution"];

const bucketOf = (entry) => ({ value: entry.bucket, lineages: entry.lineages, productSystems: entry.productSystems, kits: entry.kits });

/**
 * @param {{consensus: object, manifest: object, run: object, runPath: string, claimUses?: object, notPacked?: object}} input
 *   consensus, manifest, run: the parsed consensus.json, manifest.json, run.json of one run; runPath:
 *   `research/consensus/runs/<id>`. claimUses and notPacked default to the tables above (tests pass others).
 * @returns {{problems: string[], pack: object}}
 */
export function buildEvidencePack({ consensus, manifest, run, runPath, claimUses = CLAIM_USES, notPacked = NOT_PACKED }) {
  const problems = [];
  const file = `${runPath}/consensus.json`;
  for (const [id, use] of Object.entries(claimUses)) {
    if (!DECISION_AXES.includes(use.axis)) problems.push(`scripts/lib/evidence-pack.mjs: CLAIM_USES["${id}"].axis "${use.axis}" is not a ledger axis (${DECISION_AXES.join(", ")}); name a DECISION_AXES axis`);
    else if (NEVER_PROPOSED.has(use.axis)) problems.push(`scripts/lib/evidence-pack.mjs: CLAIM_USES["${id}"].axis "${use.axis}" is never proposed (accent, ink, canvas, and fonts stay the person's choice); remove the line`);
    if (!USES.has(use.use)) problems.push(`scripts/lib/evidence-pack.mjs: CLAIM_USES["${id}"].use "${use.use}" must be value, flag, or note`);
  }
  const rowsIn = Array.isArray(consensus?.rows) ? consensus.rows : [];
  if (!Array.isArray(consensus?.rows)) problems.push(`${file}: rows is missing; rebuild the run with scripts/consensus-study.mjs or point research/consensus/evidence-pack-run.json at another run`);
  const adapt = new Set();
  rowsIn.forEach((row, index) => {
    const missing = ROW_FIELDS.filter((field) => row?.[field] === undefined);
    if (missing.length) problems.push(`${file}: rows[${index}]${row?.claim ? ` (${row.claim})` : ""} has no ${missing.join(", ")}; a packed row needs claim, pageType, viewport, measured, and distribution`);
    if (row?.transfer === "adapt" && typeof row.claim === "string") adapt.add(row.claim);
  });
  for (const id of adapt) {
    if (!Object.hasOwn(claimUses, id) && !Object.hasOwn(notPacked, id)) problems.push(`${file}: claim ${id} is an adapt claim with no line in CLAIM_USES or NOT_PACKED; add a line to CLAIM_USES in scripts/lib/evidence-pack.mjs, or to NOT_PACKED with a reason`);
  }

  const packed = rowsIn.filter((row) => typeof row?.claim === "string" && Object.hasOwn(claimUses, row.claim) && KNOWN_VALUE_KINDS.has(row.valueKind) && !ROW_FIELDS.some((field) => row[field] === undefined));
  for (const row of packed) {
    const use = claimUses[row.claim];
    const buckets = [...row.distribution, ...(row.withFragments?.distribution ?? [])];
    if (use.use === "value" && buckets.some((entry) => typeof entry.bucket === "boolean")) problems.push(`${file}: claim ${row.claim} (${row.pageType}/${row.viewport}) has a boolean bucket but CLAIM_USES says use "value"; make it a flag or a note in scripts/lib/evidence-pack.mjs`);
    if (use.use === "flag" && buckets.some((entry) => typeof entry.bucket === "number")) problems.push(`${file}: claim ${row.claim} (${row.pageType}/${row.viewport}) has a numeric bucket but CLAIM_USES says use "flag"; make it a value in scripts/lib/evidence-pack.mjs`);
    if (buckets.some((entry) => !(typeof entry.bucket === "number" || typeof entry.bucket === "boolean" || entry.bucket === "mixed"))) problems.push(`${file}: claim ${row.claim} (${row.pageType}/${row.viewport}) has a bucket that is not a number, a boolean, or "mixed"; the pack carries no other value; remove its CLAIM_USES line`);
  }

  const measured = new Set((run?.screens ?? []).filter((entry) => entry.status === "measured").map((entry) => entry.screen));
  const lineages = (manifest?.lineages ?? []).map((lineage) => {
    const own = (manifest.screens ?? []).filter((screen) => screen.lineage === lineage.id && measured.has(screen.id));
    return { id: lineage.id, name: lineage.name, kind: lineage.kind, screens: own.filter((screen) => screen.tier === "screen").length, fragments: own.filter((screen) => screen.tier === "fragment").length };
  }).filter((lineage) => lineage.screens + lineage.fragments > 0);
  const claims = [...new Set(packed.map((row) => row.claim))].map((id) => ({ id, ...structuredClone(claimUses[id]) }));
  const rows = packed.map((row) => ({
    claim: row.claim, pageType: row.pageType, viewport: row.viewport, measured: row.measured,
    buckets: row.distribution.map(bucketOf),
    withFragments: row.withFragments ? { measured: row.withFragments.measured, buckets: row.withFragments.distribution.map(bucketOf) } : null,
  }));
  return {
    problems,
    pack: {
      schemaVersion: PACK_VERSION,
      generatedBy: GENERATED_BY,
      run: { id: consensus?.run, path: runPath, consensusVersion: consensus?.consensusVersion, viewports: run?.viewports, scroll: run?.scroll, touch: run?.touch === true, screens: consensus?.screens },
      lineages, claims, rows,
    },
  };
}

// --- engine defaults --------------------------------------------------------------------------------

export const COMPONENT_SOURCES = Object.freeze({
  button: "engine/components/ui/button.tsx",
  input: "engine/components/ui/input.tsx",
  select: "engine/components/ui/select.tsx",
  table: "engine/components/ui/table.tsx",
});
const RECIPE_FIELDS = Object.freeze({ controlRadius: "control-radius", insetRadius: "inset-radius", surfaceRadius: "surface-radius", sectionGap: "section-gap", pageGutter: "page-gutter", surfacePadding: "surface-padding" });
const SPACING_RULE = "CRAFT-spacing-scale";

// `:root` (key `default`) and each `[data-styleseed-recipe="<id>"]` block of recipes.css, in file order.
export function recipeRadii(css) {
  const recipes = {};
  for (const match of String(css).matchAll(/(?:^|\n)\s*(?::root|\[data-styleseed-recipe="([a-z0-9-]+)"\])\s*\{([^}]*)\}/gu)) {
    const block = match[2];
    const entry = {};
    for (const [field, name] of Object.entries(RECIPE_FIELDS)) {
      const value = block.match(new RegExp(`--ss-${name}:\\s*([^;]+);`, "u"))?.[1]?.trim();
      entry[field] = value !== undefined && /^\d+(?:\.\d+)?px$/u.test(value) ? Number(value.slice(0, -2)) : null;
    }
    recipes[match[1] ?? "default"] = entry;
  }
  return recipes;
}

/**
 * @param {{sources: {button: string, input: string, select: string, table: string}, colours: Set<string>, recipesCss: string, rules: object[]}} input
 *   sources: the text of the four component files of COMPONENT_SOURCES; colours: theme colour names
 *   (build-component-contracts.mjs themeColors); recipesCss: engine/css/recipes.css; rules: the
 *   `rules` of engine/rules/catalog.json.
 * @returns {{problems: string[], defaults: object}}
 */
export function buildEngineDefaults({ sources, colours = new Set(), recipesCss, rules }) {
  const problems = [];
  const parsed = {};
  for (const [id, path] of Object.entries(COMPONENT_SOURCES)) {
    if (typeof sources?.[id] !== "string") { problems.push(`${path}: not read; the engine defaults need it`); continue; }
    try { parsed[id] = parseSource(sources[id], colours); } catch (error) { problems.push(`${path}: cannot be parsed (${error.message}); fix the component source or the reader in scripts/build-component-contracts.mjs`); }
  }
  const need = (value, where) => { if (value === null || value === undefined) problems.push(`${where} could not be read; the engine defaults need it. Check the class string, or the reader in scripts/lib/evidence-pack.mjs`); return value ?? null; };
  const part = (id, slot) => {
    const found = parsed[id]?.parts.find((entry) => entry.slot === slot) ?? null;
    if (parsed[id] && !found) problems.push(`${COMPONENT_SOURCES[id]}: no exported part with data-slot="${slot}"; the engine defaults read it`);
    return found;
  };

  let button = null;
  if (parsed.button) {
    const cva = Object.values(parsed.button.cvas).find((entry) => entry.variants?.size) ?? null;
    if (!cva) problems.push(`${COMPONENT_SOURCES.button}: no cva size group; the engine defaults read button sizes from it`);
    else {
      const sizes = Object.entries(cva.variants.size).map(([key, cls]) => {
        const facts = classFacts(cls, colours);
        return { key, height: need(facts.height, `${COMPONENT_SOURCES.button}: size ${key} height`), text: facts.text, paddingX: facts.paddingX };
      });
      const defaultSize = cva.defaults?.size ?? null;
      if (!defaultSize || !sizes.some((size) => size.key === defaultSize)) problems.push(`${COMPONENT_SOURCES.button}: defaultVariants.size is missing or names no size; the engine defaults need the default button`);
      else if (sizes.find((size) => size.key === defaultSize).text === null) problems.push(`${COMPONENT_SOURCES.button}: the default size ${defaultSize} has no text size; the engine defaults need it`);
      button = { source: COMPONENT_SOURCES.button, defaultSize, sizes };
    }
  }

  let input = null;
  const inputPart = part("input", "input");
  if (inputPart) {
    const facts = classFacts(inputPart.classes, colours);
    const fromMd = inputPart.classes.split(/\s+/u).map(splitClass).find(({ prefixes, utility }) => prefixes.length === 1 && prefixes[0] === "md" && /^text-/u.test(utility));
    const textFromMd = fromMd ? classFacts(fromMd.utility, colours).text : null;
    input = {
      source: COMPONENT_SOURCES.input,
      height: need(facts.height, `${COMPONENT_SOURCES.input}: input height`),
      text: need(facts.text, `${COMPONENT_SOURCES.input}: input text size (text-base)`),
      textFromMd: need(textFromMd, `${COMPONENT_SOURCES.input}: input text size from md (md:text-sm)`),
      paddingX: facts.paddingX,
    };
  }

  let select = null;
  const trigger = part("select", "select-trigger");
  if (trigger) {
    const facts = classFacts(trigger.classes, colours);
    const sizes = Object.entries(facts.heightsBySize).map(([key, height]) => ({ key, height, text: facts.text, paddingX: facts.paddingX }));
    if (!sizes.length) problems.push(`${COMPONENT_SOURCES.select}: select-trigger height could not be read (no data-[size=…]:h-… class); the engine defaults need it`);
    need(facts.text, `${COMPONENT_SOURCES.select}: select-trigger text size`);
    const defaultSize = trigger.extras.find((extra) => extra.name === "size")?.default ?? null;
    if (!defaultSize || !sizes.some((size) => size.key === defaultSize)) problems.push(`${COMPONENT_SOURCES.select}: the size prop has no default that names a data-[size=…] height; the engine defaults need the default select`);
    select = { source: COMPONENT_SOURCES.select, defaultSize, sizes };
  }

  let table = null;
  const head = part("table", "table-head");
  const container = part("table", "table-container");
  if (head && container) {
    const headFacts = classFacts(head.classes, colours);
    table = {
      source: COMPONENT_SOURCES.table,
      headHeight: need(headFacts.height, `${COMPONENT_SOURCES.table}: table-head height`),
      headPaddingX: headFacts.paddingX,
      text: need(classFacts(container.classes, colours).text, `${COMPONENT_SOURCES.table}: table text size`),
    };
  }

  const recipes = recipeRadii(recipesCss);
  if (!Object.hasOwn(recipes, "default")) problems.push("engine/css/recipes.css: no :root block; the engine defaults read the fallback recipe from it");
  if (Object.keys(recipes).length < 2) problems.push("engine/css/recipes.css: no [data-styleseed-recipe=\"<id>\"] block; the engine defaults read recipe radii from them");

  const statement = (rules ?? []).find((rule) => rule.id === SPACING_RULE)?.statement ?? null;
  const set = statement?.match(/\{([\d\s,.]+)\}/u)?.[1] ?? null;
  const values = set ? set.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0) : [];
  if (!values.length) problems.push(`engine/rules/catalog.json: the statement of ${SPACING_RULE} holds no {…} set of spacing steps; the engine defaults read the starting scale from it`);

  return {
    problems,
    defaults: {
      schemaVersion: DEFAULTS_VERSION,
      generatedBy: GENERATED_BY,
      measured: false,
      components: { button, input, select, table },
      recipes,
      spacingScale: { rule: SPACING_RULE, values },
    },
  };
}
