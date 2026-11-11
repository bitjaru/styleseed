// Generated reference contracts. A reference measured by ss-reference (measurements/facts.json and
// summary.json) becomes `.styleseed/rulesets/<slug>/evidence.json`: every fact and every token axis
// carries a transfer decision a person confirms (keep · adapt · observe · avoid), plus an approval
// record. evidence.json is the single source; RULESET.md, tokens.json, checks.md, adapter.json, and
// reference-board.html are rendered from it, byte for byte the same for the same evidence.
//
// The tool never decides what to copy. It proposes default transfers (DEFAULT_TRANSFERS), a person
// edits them, and approval records the name that person typed and the hash of what they approved.
// Observed and avoided facts never reach RULESET.md, which is compiled into the bundle: structure
// never becomes a target there. Measured tokens never replace the project palette.
//
// Pure: no I/O. It sits on the resolver side because compiler.mjs validates generated contracts and
// the resolver must not import from ss-reference; ss-reference/scripts/compile-contract.mjs imports
// this module to write them.
import { checkLayers, parseTokenDocument, resolveTokens } from "./token-canon.mjs";
import { SAFE_ID, canonicalJson, isSha256, parseStrictJson, sha256 } from "./runtime-contract.mjs";

export const EVIDENCE_SCHEMA_VERSION = 1;
export const GENERATOR_TOOL = "compile-contract.mjs";
export const TRANSFERS = Object.freeze(["keep", "adapt", "observe", "avoid"]);
export const COMPARE_OPS = Object.freeze(["eq", "max", "min", "present", "within"]);
export const RENDERED_FILES = Object.freeze(["RULESET.md", "tokens.json", "checks.md", "adapter.json", "reference-board.html"]);
export const CONTRACT_FILES = Object.freeze(["evidence.json", ...RENDERED_FILES]);
// The nine drift axes measured by ss-reference/scripts/compare-screens.mjs (screenValues).
export const TOKEN_AXES = Object.freeze(["accent", "ink", "canvas", "spacingBase", "spacingScale", "typeSizes", "radii", "fonts", "controlHeights"]);
export const DEFAULT_TOKEN_TRANSFERS = Object.freeze({ accent: "avoid", ink: "observe", canvas: "observe", spacingBase: "adapt", spacingScale: "adapt", typeSizes: "adapt", radii: "adapt", fonts: "avoid", controlHeights: "adapt" });
// The twelve axes, in the RULESETS.md order.
export const CONTRACT_AXES = Object.freeze([
  ["user-job", "User job and primary decision"],
  ["attention", "Attention model and focal point"],
  ["composition", "Information architecture and composition"],
  ["density", "Density and spacing rhythm"],
  ["typography", "Typography roles and measure"],
  ["color", "Color roles and semantic exceptions"],
  ["surfaces", "Surface, radius, border, and elevation language"],
  ["imagery-data", "Imagery and data-visualization role"],
  ["navigation-action", "Navigation and action hierarchy"],
  ["states-motion", "State, feedback, and motion behavior"],
  ["responsive", "Responsive transformation"],
  ["tells", "Characteristic tells and anti-patterns"],
]);
const AXIS_IDS = CONTRACT_AXES.map(([axis]) => axis);
// Fact-id family → axis. Mirrors FACT_FAMILIES in ss-reference/scripts/analyze-structure.mjs; the
// resolver may not import it, so scripts/runtime-tests/reference-contract.test.mjs keeps them equal.
export const FACT_AXES = Object.freeze({ composition: "composition", density: "density", typography: "typography", navigation: "navigation-action", states: "states-motion", imagery: "imagery-data", responsive: "responsive", attention: "attention", tells: "tells" });
const TOKEN_AXIS_HOME = { accent: "color", ink: "color", canvas: "color", spacingBase: "density", spacingScale: "density", controlHeights: "density", typeSizes: "typography", fonts: "typography", radii: "surfaces" };
const TOKEN_LABELS = { accent: "Accent", ink: "Ink", canvas: "Canvas", spacingBase: "Spacing base", spacingScale: "Spacing scale", typeSizes: "Type sizes", radii: "Corner radii", fonts: "Font families", controlHeights: "Control heights" };

// Default transfer per fact, as data: the first row whose pattern fits the fact id and whose
// comparator fits the value wins (`*` matches one or more id segments). A row's `within` tolerance is
// in the fact's unit; an object picks by unit (`px`, or `other` for shares and counts). Before any
// row, a lower-bound fact (`bound: "lower"`) whose value is 0 or an empty list is observed: a lower
// bound of zero is not an observation of absence. The last row covers every other fact id.
export const DEFAULT_TRANSFERS = Object.freeze([
  { match: ["navigation.primary.perSectionMax", "navigation.primary.sectionsOverOne"], transfer: "keep", compare: { op: "max" } },
  { match: ["tells.headings.skips", "tells.table.rowHeightSpread"], transfer: "keep", compare: { op: "max" } },
  { match: ["tells.controlHeights.distinct", "tells.radii.distinct", "tells.typeSizes.distinct"], transfer: "keep", compare: { op: "max" } },
  { match: ["states.css.focusVisible", "states.css.reducedMotion"], transfer: "keep", compare: { op: "present" } },
  { match: ["density.*"], transfer: "adapt", compare: { op: "within", tolerance: { px: 4, other: 0.1 } } },
  { match: ["typography.heading.*"], transfer: "adapt", compare: { op: "within", tolerance: 2 } },
  { match: ["composition.rhythm.*", "composition.main.*"], transfer: "adapt", compare: { op: "within", tolerance: 8 } },
  { match: ["navigation.tabs.height", "navigation.region.*.itemHeight"], transfer: "adapt", compare: { op: "within", tolerance: 4 } },
  { match: ["states.motion.duration", "states.motion.durations"], transfer: "adapt", compare: { op: "within", tolerance: 50 } },
  { match: ["tells.spacing.offScaleShare"], transfer: "adapt", compare: { op: "within", tolerance: 0.1 } },
  { match: ["*"], transfer: "observe" },
]);

const CONTROL = /[\u0000-\u001f\u007f]/u;
const FACT_ID = /^[a-z]+(\.[A-Za-z0-9]+)+$/u;
const SOURCE_ID = /^S[0-9]{1,3}$/u;
const HEX = /^#[0-9A-Fa-f]{6}$/u;
const MAX_FACTS = 4000;
const patternCache = new Map();
function patternRegex(pattern) {
  if (!patternCache.has(pattern)) patternCache.set(pattern, new RegExp(`^${pattern.split(".").map((part) => (part === "*" ? "[^.]+(?:\\.[^.]+)*" : part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))).join("\\.")}$`, "u"));
  return patternCache.get(pattern);
}
export const matchesPattern = (pattern, id) => patternRegex(pattern).test(id);
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNumberList = (value) => Array.isArray(value) && value.every(isNumber);
const isZeroCount = (value) => value === 0 || (Array.isArray(value) && value.length === 0);

// Why a comparator cannot apply to a fact, or null when it can.
export function compareProblem(fact, compare) {
  const { op } = compare;
  if (!COMPARE_OPS.includes(op)) return `compare.op "${op}" is not one of ${COMPARE_OPS.join(", ")}`;
  if (fact.bound === "lower" && (!["present", "min"].includes(op) || !(isNumber(fact.value) && fact.value > 0))) return "a lower-bound count (bound: \"lower\") can only be compared with present or min, and only when its value is above 0; set transfer to observe and remove compare";
  if (op === "within") {
    if (!isNumber(fact.value) && !(isNumberList(fact.value) && fact.value.length)) return "within needs a number or a list of numbers; a string, boolean, or list of strings may only use eq";
    if (!isNumber(compare.tolerance) || compare.tolerance < 0) return "within needs a tolerance: a number >= 0 in the fact's unit";
    return null;
  }
  if (compare.tolerance !== undefined) return `tolerance is only used with within; remove it from this ${op} comparator`;
  if (["max", "min", "present"].includes(op) && !isNumber(fact.value)) return `${op} needs a single number; a string, boolean, or list may only use eq (or within, for a list of numbers)`;
  return null;
}

export function defaultTransfer(fact) {
  if (fact.bound === "lower" && isZeroCount(fact.value)) return { transfer: "observe" };
  for (const row of DEFAULT_TRANSFERS) {
    if (!row.match.some((pattern) => matchesPattern(pattern, fact.id))) continue;
    if (!row.compare) return { transfer: row.transfer };
    const { tolerance } = row.compare;
    const compare = { op: row.compare.op, ...(tolerance === undefined ? {} : { tolerance: isNumber(tolerance) ? tolerance : tolerance[fact.unit === "px" ? "px" : "other"] }) };
    if (compareProblem(fact, compare)) continue;
    return { transfer: row.transfer, compare };
  }
  return { transfer: "observe" };
}

// --- validation -------------------------------------------------------------------------------------

function exactKeys(value, keys, where, fail) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(where, "must be an object");
  const extra = Object.keys(value).filter((key) => !keys.includes(key));
  if (extra.length) fail(where, `unknown key(s) ${extra.join(", ")}; remove them`);
  return value;
}
function boundedText(value, max, where, fail, { empty = false } = {}) {
  if (typeof value !== "string" || (!empty && value.length < 1) || value.length > max || CONTROL.test(value)) fail(where, `must be single-line text of ${empty ? 0 : 1}-${max} characters`);
  return value;
}
function calendarDate(value, where, fail) {
  const ok = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!ok) fail(where, "must be a calendar date as YYYY-MM-DD");
  return value;
}
function factValue(value, where, fail) {
  if (isNumber(value) || typeof value === "boolean") return value;
  if (typeof value === "string") return boundedText(value, 2000, where, fail);
  if (Array.isArray(value) && value.length <= 64 && (value.every(isNumber) || value.every((item) => typeof item === "string" && item.length >= 1 && item.length <= 80 && !CONTROL.test(item)))) return [...value];
  return fail(where, "must be a number, a boolean, bounded text, or a list of at most 64 numbers or of short strings");
}

/**
 * Strict validation of a generated evidence.json (schemaVersion 1). Returns a normalized copy with a
 * fixed key order. Throws `<file>: <field>: <problem and what to do>`.
 * @param {object} input parsed JSON
 * @param {{file?: string, catalog?: object|null, verifyApproval?: boolean}} [options]
 *   catalog: validate fallback and adapter against it; verifyApproval: refuse an approved record whose
 *   contractHash no longer matches (compile-contract --write reads with false, to reset it to draft).
 */
export function normalizeReferenceEvidence(input, { file = "evidence.json", catalog = null, verifyApproval = true } = {}) {
  const fail = (where, message) => { throw new Error(`${file}: ${where}: ${message}`); };
  exactKeys(input, ["schemaVersion", "generator", "slug", "fallback", "adapter", "sources", "facts", "tokens", "open", "rendered", "approval"], "evidence", fail);
  if (input.schemaVersion !== EVIDENCE_SCHEMA_VERSION) fail("schemaVersion", `must be ${EVIDENCE_SCHEMA_VERSION}`);
  exactKeys(input.generator, ["tool", "factsVersion"], "generator", fail);
  if (input.generator.tool !== GENERATOR_TOOL) fail("generator.tool", `must be "${GENERATOR_TOOL}"`);
  if (input.generator.factsVersion !== 1) fail("generator.factsVersion", "must be 1 (the facts.json version this contract was compiled from)");
  if (typeof input.slug !== "string" || !SAFE_ID.test(input.slug)) fail("slug", "must be a safe id such as ops-console");
  if (typeof input.fallback !== "string" || !SAFE_ID.test(input.fallback)) fail("fallback", "must name a built-in grammar");
  if (catalog && !Object.hasOwn(catalog.grammars ?? {}, input.fallback)) fail("fallback", `"${input.fallback}" is not a built-in grammar (${Object.keys(catalog.grammars ?? {}).join(", ")})`);
  if (typeof input.adapter !== "string" || !SAFE_ID.test(input.adapter)) fail("adapter", "must name an adapter");
  if (catalog && !Object.hasOwn(catalog.adapters ?? {}, input.adapter)) fail("adapter", `"${input.adapter}" is not an adapter (${Object.keys(catalog.adapters ?? {}).join(", ")})`);

  if (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 16) fail("sources", "must list 1-16 measured sources");
  const sourceIds = new Set();
  const sources = input.sources.map((source, index) => {
    const at = `sources[${index}]`;
    exactKeys(source, ["id", "url", "observedAt", "viewports", "robots"], at, fail);
    if (typeof source.id !== "string" || !SOURCE_ID.test(source.id)) fail(`${at}.id`, "must look like S1");
    if (sourceIds.has(source.id)) fail(`${at}.id`, `duplicate source id ${source.id}`);
    sourceIds.add(source.id);
    if (typeof source.url !== "string" || source.url.length > 2048 || CONTROL.test(source.url) || !/^https?:\/\/[^\s]+$/u.test(source.url)) fail(`${at}.url`, "must be the measured http(s) URL");
    if (!Array.isArray(source.viewports) || source.viewports.length < 1 || source.viewports.length > 8 || !source.viewports.every((width) => Number.isInteger(width) && width > 0 && width <= 10000)) fail(`${at}.viewports`, "must list the measured viewport widths");
    if (!["allowed", "disallowed", "not-checked"].includes(source.robots)) fail(`${at}.robots`, "must be allowed, disallowed, or not-checked");
    return { id: source.id, url: source.url, observedAt: calendarDate(source.observedAt, `${at}.observedAt`, fail), viewports: [...source.viewports], robots: source.robots };
  });

  if (!Array.isArray(input.facts) || input.facts.length > MAX_FACTS) fail("facts", `must be an array of at most ${MAX_FACTS} facts`);
  const seen = new Set();
  const facts = input.facts.map((fact, index) => {
    exactKeys(fact, ["id", "axis", "level", "bound", "viewport", "value", "unit", "source", "transfer", "compare", "note"], `facts[${index}]`, fail);
    if (typeof fact.id !== "string" || fact.id.length > 120 || !FACT_ID.test(fact.id)) fail(`facts[${index}].id`, "must be a fact id such as density.table.rowHeight");
    const viewport = fact.viewport === "both" || (Number.isInteger(fact.viewport) && fact.viewport > 0 && fact.viewport <= 10000) ? fact.viewport : fail(`facts[${index}] (${fact.id}).viewport`, "must be a viewport width or \"both\"");
    const at = `facts[${index}] (${fact.id} @${viewport})`;
    const key = `${fact.id}@${viewport}`;
    if (seen.has(key)) fail(at, "duplicate (id, viewport) pair; keep one entry");
    seen.add(key);
    const family = fact.id.split(".")[0];
    if (!Object.hasOwn(FACT_AXES, family)) fail(`${at}.id`, `unknown fact family ${family} (${Object.keys(FACT_AXES).join(", ")})`);
    if (fact.axis !== FACT_AXES[family]) fail(`${at}.axis`, `must be ${FACT_AXES[family]} for a ${family}.* fact`);
    if (!["observed", "derived"].includes(fact.level)) fail(`${at}.level`, "must be observed or derived");
    if (fact.bound !== undefined && fact.bound !== "lower") fail(`${at}.bound`, "must be \"lower\" when present");
    const value = factValue(fact.value, `${at}.value`, fail);
    if (fact.unit !== undefined && !["px", "ms"].includes(fact.unit)) fail(`${at}.unit`, "must be px or ms when present");
    if (!sourceIds.has(fact.source)) fail(`${at}.source`, `must name a source in sources[] (${[...sourceIds].join(", ")})`);
    if (!TRANSFERS.includes(fact.transfer)) fail(`${at}.transfer`, `must be one of ${TRANSFERS.join(", ")}`);
    const out = { id: fact.id, axis: fact.axis, level: fact.level, ...(fact.bound ? { bound: "lower" } : {}), viewport, value, ...(fact.unit ? { unit: fact.unit } : {}), source: fact.source, transfer: fact.transfer };
    if (fact.transfer === "keep" || fact.transfer === "adapt") {
      if (fact.compare === undefined) fail(`${at}.compare`, `is required when transfer is ${fact.transfer}: add { "op": … } (${COMPARE_OPS.join(", ")}), or set transfer to observe`);
      exactKeys(fact.compare, ["op", "tolerance"], `${at}.compare`, fail);
      const problem = compareProblem(out, fact.compare);
      if (problem) fail(`${at}.compare`, problem);
      out.compare = { op: fact.compare.op, ...(fact.compare.op === "within" ? { tolerance: fact.compare.tolerance } : {}) };
    } else if (fact.compare !== undefined) fail(`${at}.compare`, `is not allowed when transfer is ${fact.transfer}; remove it`);
    if (fact.note !== undefined) out.note = boundedText(fact.note, 200, `${at}.note`, fail, { empty: true });
    return out;
  });

  exactKeys(input.tokens, ["measured", "transfer"], "tokens", fail);
  exactKeys(input.tokens.measured, TOKEN_AXES, "tokens.measured", fail);
  exactKeys(input.tokens.transfer, TOKEN_AXES, "tokens.transfer", fail);
  const measured = {};
  const transfer = {};
  for (const axis of TOKEN_AXES) {
    const value = input.tokens.measured[axis];
    const at = `tokens.measured.${axis}`;
    if (value === undefined) fail(at, "is required (null when it was not measured)");
    if (["accent", "ink", "canvas"].includes(axis)) measured[axis] = value === null || (typeof value === "string" && HEX.test(value)) ? value : fail(at, "must be a #rrggbb colour or null");
    else if (axis === "spacingBase") measured[axis] = value === null || (Number.isInteger(value) && value > 0) ? value : fail(at, "must be a positive integer or null");
    else if (axis === "fonts") measured[axis] = Array.isArray(value) && value.length <= 16 ? value.map((font, index) => boundedText(font, 80, `${at}[${index}]`, fail)) : fail(at, "must be a list of at most 16 font family names");
    else measured[axis] = isNumberList(value) && value.length <= 64 && value.every((n) => n >= 0) ? [...value] : fail(at, "must be a list of at most 64 numbers >= 0");
    if (!TRANSFERS.includes(input.tokens.transfer[axis])) fail(`tokens.transfer.${axis}`, `must be one of ${TRANSFERS.join(", ")}`);
    transfer[axis] = input.tokens.transfer[axis];
  }

  if (!Array.isArray(input.open) || input.open.length > 24) fail("open", "must be an array of at most 24 { axis, question } entries");
  const open = input.open.map((entry, index) => {
    exactKeys(entry, ["axis", "question"], `open[${index}]`, fail);
    if (!AXIS_IDS.includes(entry.axis)) fail(`open[${index}].axis`, `must be one of ${AXIS_IDS.join(", ")}`);
    return { axis: entry.axis, question: boundedText(entry.question, 200, `open[${index}].question`, fail) };
  });

  let rendered;
  if (input.rendered !== undefined) {
    exactKeys(input.rendered, RENDERED_FILES, "rendered", fail);
    rendered = {};
    for (const name of RENDERED_FILES) rendered[name] = isSha256(input.rendered[name]) ? input.rendered[name] : fail(`rendered["${name}"]`, "must be a sha256:<hex> digest; run compile-contract.mjs --write to re-render");
  }

  const raw = input.approval;
  if (!raw || typeof raw !== "object" || !["draft", "approved"].includes(raw.status)) fail("approval.status", "must be draft or approved");
  let approval;
  if (raw.status === "draft") { exactKeys(raw, ["status"], "approval", fail); approval = { status: "draft" }; }
  else {
    exactKeys(raw, ["status", "reviewer", "date", "contractHash"], "approval", fail);
    approval = { status: "approved", reviewer: boundedText(raw.reviewer, 80, "approval.reviewer", fail), date: calendarDate(raw.date, "approval.date", fail), contractHash: isSha256(raw.contractHash) ? raw.contractHash : fail("approval.contractHash", "must be a sha256:<hex> digest") };
  }

  const evidence = { schemaVersion: EVIDENCE_SCHEMA_VERSION, generator: { tool: GENERATOR_TOOL, factsVersion: 1 }, slug: input.slug, fallback: input.fallback, adapter: input.adapter, sources, facts, tokens: { measured, transfer }, open, ...(rendered ? { rendered } : {}), approval };
  if (verifyApproval && approval.status === "approved" && approval.contractHash !== contractHash(evidence)) fail("approval.contractHash", "does not match the contract: evidence.json changed after approval. Run compile-contract.mjs --write, then --approve --reviewer <name> again");
  return evidence;
}

// The contract a person approves: everything except the approval record and the rendered hashes.
export function contractHash(evidence) {
  const { approval, rendered, ...contract } = evidence;
  return sha256(canonicalJson(contract));
}
export const isApproved = (evidence) => evidence?.approval?.status === "approved" && evidence.approval.contractHash === contractHash(evidence);

// A generated contract is evidence.json with schemaVersion 1 and a generator object. Anything else
// (hand-written contracts, unparseable files) takes the hand-written path unchanged.
export function isGeneratedEvidence(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return false; }
  return Boolean(parsed) && parsed.schemaVersion === EVIDENCE_SCHEMA_VERSION && Boolean(parsed.generator) && typeof parsed.generator === "object" && !Array.isArray(parsed.generator);
}

export function serializeEvidence(evidence) {
  return `${JSON.stringify(evidence, null, 2)}\n`;
}

// --- rendering --------------------------------------------------------------------------------------
// Renderers read the contract only (never `approval` or `rendered`), so approving changes no
// rendered byte and the rendered hashes stay valid across approval.

const GENERATED_NOTE = "Generated by compile-contract.mjs from evidence.json. Do not hand-edit: edit evidence.json, run compile-contract.mjs --write, then approve again.";
const LABELS = {
  "navigation.primary.perSectionMax": "Primary actions per section",
  "navigation.primary.sectionsOverOne": "Sections with more than one primary action",
  "navigation.tabs.height": "Tab height",
  "tells.headings.skips": "Skipped heading levels",
  "tells.table.rowHeightSpread": "Spread of table row heights",
  "tells.controlHeights.distinct": "Distinct control heights",
  "tells.radii.distinct": "Distinct corner radii",
  "tells.typeSizes.distinct": "Distinct type sizes",
  "tells.spacing.offScaleShare": "Share of spacing values off the scale",
  "states.css.focusVisible": "Focus-visible style rules",
  "states.css.reducedMotion": "Reduced-motion rules",
  "states.motion.duration": "Most frequent transition duration",
  "states.motion.durations": "Transition durations",
  "density.table.rowHeight": "Table row height",
  "density.list.itemHeight": "List item height",
  "density.gap.stack": "Stack gap",
  "density.gap.inline": "Inline gap",
  "density.inset": "Component inset",
  "composition.rhythm.section": "Section gap",
  "composition.rhythm.group": "Group gap",
  "composition.main.contentWidth": "Main content width",
  "composition.main.insetLeft": "Main left inset",
  "typography.heading.sizes": "Heading sizes in the main region",
};
const withUnit = (value, unit) => (isNumber(value) && unit ? `${value}${unit}` : String(value));
export function formatFactValue(fact) {
  return Array.isArray(fact.value) ? (fact.value.length ? fact.value.map((item) => withUnit(item, fact.unit)).join(", ") : "none") : withUnit(fact.value, fact.unit);
}
const where = (fact) => (fact.viewport === "both" ? "at both viewports" : `at ${fact.viewport}`);
// A lower-bound fact (`bound: "lower"`) reads "at least" wherever its value is quoted.
const measuredText = (fact) => `${fact.bound === "lower" ? "at least " : ""}${formatFactValue(fact)}`;
function comparatorWords(fact) {
  const value = formatFactValue(fact);
  const { op, tolerance } = fact.compare;
  if (op === "max") return `at most ${value}`;
  if (op === "min") return `at least ${value}`;
  if (op === "eq") return `exactly ${value}`;
  if (op === "present") return `present (the reference has ${measuredText(fact)})`;
  return `${value}, within ${withUnit(tolerance, fact.unit)}`;
}
function factHead(fact) {
  const label = LABELS[fact.id];
  return label ? { head: `${label}, ${where(fact)}`, tail: `\`${fact.id}\`` } : { head: `\`${fact.id}\`, ${where(fact)}`, tail: null };
}
function keepLine(fact) {
  const { head, tail } = factHead(fact);
  return `- ${head}: ${comparatorWords(fact)}${tail ? ` (${tail})` : ""}.`;
}
function adaptLine(fact) {
  const { head, tail } = factHead(fact);
  return `- ${head}: the reference measured ${measuredText(fact)}; keep the relationship, the value may differ (${fact.compare.op === "within" ? `within ${withUnit(fact.compare.tolerance, fact.unit)}` : comparatorWords(fact)}; not gated${tail ? `; ${tail}` : ""}).`;
}
const tokenUnit = (axis) => (["spacingBase", "spacingScale", "typeSizes", "radii", "controlHeights"].includes(axis) ? "px" : null);
function tokenValueText(axis, value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.length ? value.map((item) => withUnit(item, tokenUnit(axis))).join(", ") : null;
  return withUnit(value, tokenUnit(axis));
}
const tokenEntries = (evidence, transfers) => TOKEN_AXES.filter((axis) => transfers.includes(evidence.tokens.transfer[axis]) && tokenValueText(axis, evidence.tokens.measured[axis]) !== null);

export function renderRuleset(evidence) {
  const lines = [`# Reference grammar: ${evidence.slug}`, "", `<!-- ${GENERATED_NOTE} -->`, "",
    `Fallback grammar: \`${evidence.fallback}\`. Adapter: \`${evidence.adapter}\`. Measured on ${evidence.sources.length} source(s), listed under Provenance.`,
    "A kept fact is a rule with a comparator. An adapted fact names a relationship to keep; its value may differ. What the reference only shows, and what is not to be copied, is not listed in this file.",
  ];
  CONTRACT_AXES.forEach(([axis, title], index) => {
    const facts = evidence.facts.filter((fact) => fact.axis === axis);
    const body = [
      ...facts.filter((fact) => fact.transfer === "keep").map(keepLine),
      ...tokenEntries(evidence, ["keep"]).filter((name) => TOKEN_AXIS_HOME[name] === axis).map((name) => `- ${TOKEN_LABELS[name]}: ${tokenValueText(name, evidence.tokens.measured[name])} (token axis \`${name}\`, kept; listed in tokens.json).`),
      ...facts.filter((fact) => fact.transfer === "adapt").map(adaptLine),
      ...tokenEntries(evidence, ["adapt"]).filter((name) => TOKEN_AXIS_HOME[name] === axis).map((name) => `- ${TOKEN_LABELS[name]}: the reference used ${tokenValueText(name, evidence.tokens.measured[name])}; keep the relationship, the values may differ (token axis \`${name}\`; proposed in tokens.json, not the project palette).`),
    ];
    const open = evidence.open.filter((entry) => entry.axis === axis).map((entry) => `- Open (a person's call): ${entry.question}.`);
    lines.push("", `## ${index + 1}. ${title}`, "", ...(body.length ? body : ["- Nothing kept or adapted from the reference on this axis; the fallback grammar governs."]), ...open);
  });
  lines.push("", "## Provenance", "", ...evidence.sources.map((source) => `- ${source.id}: ${source.url} · observed ${source.observedAt} · viewports ${source.viewports.join(", ")} · robots.txt ${source.robots}`));
  return `${lines.join("\n")}\n`;
}

export function renderChecks(evidence) {
  const keep = [
    ...evidence.facts.filter((fact) => fact.transfer === "keep").map(keepLine),
    ...tokenEntries(evidence, ["keep"]).map((name) => `- ${TOKEN_LABELS[name]}: ${tokenValueText(name, evidence.tokens.measured[name])} (token axis \`${name}\`, kept).`),
  ];
  const avoid = tokenEntries(evidence, ["avoid"]).map((name) => {
    const value = tokenValueText(name, evidence.tokens.measured[name]);
    const pronoun = Array.isArray(evidence.tokens.measured[name]) && evidence.tokens.measured[name].length > 1 ? "them" : "it";
    return `- The reference ${TOKEN_LABELS[name].toLowerCase()} (${value}): do not adopt ${pronoun} unless the project already owns ${pronoun}.`;
  });
  return `${[`# Reference checks: ${evidence.slug}`, "", `<!-- ${GENERATED_NOTE} -->`, "",
    "Each kept fact is checked against a built screen with its comparator. Values under \"Do not copy\" must not be taken from the reference; a value the project already owns is not a copy.",
    "", "## Keep", "", ...(keep.length ? keep : ["- none"]), "", "## Do not copy", "", ...(avoid.length ? avoid : ["- none"])].join("\n")}\n`;
}

// tokens.json in canon layering: primitives hold the measured values, semantic tokens alias them.
// Only keep and adapt token axes are written; avoid and observe axes are left out.
const dimensionKey = (value) => String(value).replace(".", "_");
const dimension = (value) => ({ $value: { value, unit: "px" } });
function colorToken(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return { $value: { colorSpace: "srgb", components: [r, g, b].map((channel) => Math.round((channel / 255) * 10000) / 10000), hex: hex.toUpperCase() } };
}
export function renderTokens(evidence) {
  const included = new Set(tokenEntries(evidence, ["keep", "adapt"]));
  const m = evidence.tokens.measured;
  const primitive = {};
  const semantic = {};
  const colors = ["accent", "ink", "canvas"].filter((axis) => included.has(axis));
  if (colors.length) {
    primitive.color = { $type: "color", ...Object.fromEntries(colors.map((axis) => [axis, colorToken(m[axis])])) };
    if (included.has("ink")) semantic.fg = { $type: "color", base: { $value: "{primitive.color.ink}" } };
    if (included.has("canvas") || included.has("accent")) semantic.bg = { $type: "color", ...(included.has("canvas") ? { base: { $value: "{primitive.color.canvas}" } } : {}), ...(included.has("accent") ? { brand: { base: { $value: "{primitive.color.accent}" } } } : {}) };
  }
  const space = [...new Set([...(included.has("spacingScale") ? m.spacingScale : []), ...(included.has("spacingBase") ? [m.spacingBase] : [])])].sort((a, b) => a - b);
  if (space.length) primitive.space = { $type: "dimension", ...Object.fromEntries(space.map((value) => [dimensionKey(value), dimension(value)])) };
  if (included.has("spacingBase")) semantic.space = { $type: "dimension", base: { $value: `{primitive.space.${dimensionKey(m.spacingBase)}}` } };
  for (const [axis, group] of [["typeSizes", "font-size"], ["radii", "radius"], ["controlHeights", "control-height"]]) {
    if (included.has(axis)) primitive[group] = { $type: "dimension", ...Object.fromEntries([...m[axis]].sort((a, b) => a - b).map((value) => [dimensionKey(value), dimension(value)])) };
  }
  if (included.has("fonts")) {
    primitive["font-family"] = { $type: "fontFamily", ...Object.fromEntries(m.fonts.map((font, index) => [String(index + 1), { $value: font }])) };
    semantic["font-family"] = { $type: "fontFamily", base: { $value: "{primitive.font-family.1}" } };
  }
  const doc = {
    $description: `Generated by compile-contract.mjs from evidence.json (reference:${evidence.slug}). Measured values whose transfer is keep or adapt, in primitive -> semantic layering. A proposal, not the project palette: adopt it by hand through project.tokens.source.`,
    ...(Object.keys(primitive).length ? { primitive } : {}),
    ...(Object.keys(semantic).length ? { semantic } : {}),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

// Canon parser, alias resolution, and layer check over a tokens.json text; [] when it passes.
export function tokenProblems(text) {
  let doc;
  try { doc = JSON.parse(text); } catch (error) { return [`not valid JSON (${error.message})`]; }
  const parsed = parseTokenDocument(doc, "dtcg");
  return [...new Set([...parsed.problems, ...resolveTokens(parsed.tokens).problems, ...checkLayers(parsed.tokens, { format: "dtcg" }).problems])];
}

export function renderAdapter(evidence) {
  return `${JSON.stringify({ adapter: evidence.adapter }, null, 2)}\n`;
}

const escapeHtml = (value) => String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
export function renderBoard(evidence) {
  const row = (cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
  const table = (head, rows) => `<table>\n<thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table>`;
  const sections = CONTRACT_AXES.map(([axis, title]) => {
    const facts = evidence.facts.filter((fact) => fact.axis === axis);
    const tokens = TOKEN_AXES.filter((name) => TOKEN_AXIS_HOME[name] === axis);
    const open = evidence.open.filter((entry) => entry.axis === axis);
    const parts = [`<h2>${escapeHtml(title)}</h2>`];
    if (facts.length) parts.push(table(["Fact", "Viewport", "Value", "Level", "Transfer", "Note"], facts.map((fact) => row([fact.id, fact.viewport, `${fact.bound === "lower" ? ">= " : ""}${formatFactValue(fact)}`, fact.level, fact.compare ? `${fact.transfer} (${fact.compare.op}${fact.compare.op === "within" ? ` ${fact.compare.tolerance}` : ""})` : fact.transfer, fact.note ?? ""]))));
    if (tokens.length) parts.push(table(["Token axis", "Measured", "Transfer"], tokens.map((name) => row([name, tokenValueText(name, evidence.tokens.measured[name]) ?? "none", evidence.tokens.transfer[name]]))));
    if (open.length) parts.push(`<p>Open (a person's call): ${open.map((entry) => escapeHtml(entry.question)).join("; ")}.</p>`);
    if (parts.length === 1) parts.push("<p>No facts measured on this axis.</p>");
    return parts.join("\n");
  });
  return `${[
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    `<title>Reference board: ${escapeHtml(evidence.slug)}</title>`,
    "<style>body{margin:24px;font:14px/1.5 system-ui,sans-serif;color:#1d2021;background:#fff}table{border-collapse:collapse;margin:0 0 16px}th,td{padding:4px 8px;border:1px solid #d5d9da;text-align:left;vertical-align:top}th{background:#f3f5f5}</style>",
    "</head>",
    "<body>",
    `<h1>Reference board: ${escapeHtml(evidence.slug)}</h1>`,
    `<p>${escapeHtml(GENERATED_NOTE)} Every fact and token axis with its transfer: keep (checked), adapt (relationship), observe (brief only), avoid (do not copy).</p>`,
    `<p>Fallback grammar ${escapeHtml(evidence.fallback)} · adapter ${escapeHtml(evidence.adapter)}.</p>`,
    ...sections,
    "<h2>Sources</h2>",
    table(["Id", "URL", "Observed", "Viewports", "robots.txt"], evidence.sources.map((source) => row([source.id, source.url, source.observedAt, source.viewports.join(", "), source.robots]))),
    "</body>",
    "</html>",
  ].join("\n")}\n`;
}

export function renderContractFiles(evidence) {
  return { "RULESET.md": renderRuleset(evidence), "tokens.json": renderTokens(evidence), "checks.md": renderChecks(evidence), "adapter.json": renderAdapter(evidence), "reference-board.html": renderBoard(evidence) };
}
export function renderedHashes(files) {
  return Object.fromEntries(RENDERED_FILES.map((name) => [name, sha256(files[name])]));
}

// --- resolver check ---------------------------------------------------------------------------------

/**
 * Validate a generated contract for registry compilation. Returns null when evidence.json is not a
 * generated contract (the hand-written path applies), the normalized evidence when it may be
 * selected, and throws naming the file and the command to run otherwise.
 * @param {{slug: string, files: Record<string, Buffer|string>, fallback: string|null, artifactAdapter?: string|null, catalog?: object|null}} input
 *   files: the raw bytes of the six contract files, keyed by name.
 */
export function checkGeneratedContract({ slug, files, fallback, artifactAdapter = null, catalog = null }) {
  const dir = `.styleseed/rulesets/${slug}`;
  const text = (name) => (Buffer.isBuffer(files[name]) ? files[name].toString("utf8") : String(files[name]));
  if (!isGeneratedEvidence(text("evidence.json"))) return null;
  const tool = `ss-reference/scripts/compile-contract.mjs --project-root <dir> --slug ${slug}`;
  let evidence;
  try {
    evidence = normalizeReferenceEvidence(parseStrictJson(text("evidence.json"), { maxBytes: 4 * 1024 * 1024 }), { file: `${dir}/evidence.json`, catalog, verifyApproval: false });
  } catch (error) { throw new Error(`${error.message} (generated reference contract; fix the field, then run ${tool} --write and approve again)`); }
  if (evidence.slug !== slug) throw new Error(`${dir}/evidence.json: slug is "${evidence.slug}" but the contract sits under rulesets/${slug}; run ${tool} --write`);
  if (evidence.approval.status !== "approved") throw new Error(`${dir}/evidence.json is a draft: an artifact can select reference:${slug} only after a person approves it. Review the transfers in evidence.json, then run ${tool} --approve --reviewer <name>`);
  const hash = contractHash(evidence);
  if (evidence.approval.contractHash !== hash) throw new Error(`${dir}/evidence.json changed after approval (approved ${evidence.approval.contractHash}, now ${hash}): run ${tool} --write, then --approve --reviewer <name> again`);
  if (!evidence.rendered) throw new Error(`${dir}/evidence.json has no rendered hashes: run ${tool} --write, then approve again`);
  const fresh = renderedHashes(renderContractFiles(evidence));
  for (const name of RENDERED_FILES) {
    if (files[name] === undefined) throw new Error(`Missing reference grammar contract file: ${dir}/${name} (run ${tool} --write, then approve again)`);
    const onDisk = sha256(Buffer.isBuffer(files[name]) ? files[name] : String(files[name]));
    if (onDisk !== evidence.rendered[name]) throw new Error(`${dir}/${name} was edited by hand or is stale (its hash differs from evidence.json rendered["${name}"]): run ${tool} --write, then approve again`);
    if (evidence.rendered[name] !== fresh[name]) throw new Error(`${dir}/${name} is not what this engine renders from evidence.json: run ${tool} --write (and approve again if it says the contract changed)`);
  }
  const problems = tokenProblems(text("tokens.json"));
  if (problems.length) throw new Error(`${dir}/tokens.json fails the token canon check: ${problems.slice(0, 5).join("; ")}. Run ${tool} --write`);
  if (fallback && evidence.fallback !== fallback) throw new Error(`${dir}/evidence.json: fallback is ${evidence.fallback} but the artifact selecting reference:${slug} uses fallback ${fallback}; make them agree (edit the artifact, or run ${tool} --write --fallback ${fallback} and approve again)`);
  if (artifactAdapter && evidence.adapter !== artifactAdapter) throw new Error(`${dir}/evidence.json: adapter is ${evidence.adapter} but the artifact selecting reference:${slug} names adapter ${artifactAdapter}; make them agree (edit the artifact, or run ${tool} --write --adapter ${artifactAdapter} and approve again)`);
  return evidence;
}

// --- decision proposals -----------------------------------------------------------------------------

const FACT_LEDGER = Object.freeze([
  ["density.table.rowHeight", "tableRowHeights", "Table row heights"],
  ["density.list.itemHeight", "listItemHeights", "List item heights"],
  ["typography.heading.sizes", "headingSizes", "Heading sizes in the main region"],
  ["composition.rhythm.section", "sectionGaps", "Section gaps"],
  ["navigation.primary.perSectionMax", "primariesPerSection", null],
  ["states.motion.durations", "transitionDurations", "Transition durations"],
]);
const TOKEN_LEDGER = Object.freeze(["spacingBase", "spacingScale", "typeSizes", "radii", "fonts", "controlHeights"]);
const LEDGER_ORDER = Object.freeze(["spacingBase", "spacingScale", "typeSizes", "radii", "fonts", "controlHeights", "tableRowHeights", "listItemHeights", "headingSizes", "sectionGaps", "primariesPerSection", "transitionDurations"]);
const MAX_PROPOSED_VALUES = 24;

/**
 * Decision entries for `decisions[]` in .styleseed/project.json, proposed from an approved contract:
 * keep facts and keep token axes that map to a ledger axis. Colours are never proposed. Entries have
 * no id: the person assigns D-NNN. Nothing is written.
 * @param {object} evidence normalized, approved evidence
 * @param {{date?: string, onSkip?: (message: string) => void}} [options] date defaults to the approval date
 */
export function proposeDecisions(evidence, { date = evidence?.approval?.date, onSkip = () => {} } = {}) {
  if (!isApproved(evidence)) throw new Error("proposeDecisions needs an approved contract whose hash matches; run compile-contract.mjs --approve --reviewer <name> first");
  const reviewer = evidence.approval.reviewer;
  const ref = `reference:${evidence.slug}`;
  const out = new Map();
  const add = (axis, values, statement, source) => {
    if (!values.length) return;
    if (values.length > MAX_PROPOSED_VALUES) { onSkip(`${axis}: ${values.length} values exceed the ledger's ${MAX_PROPOSED_VALUES}; record it by hand`); return; }
    out.set(axis, { kind: "decision", axis, values, statement, approvedBy: reviewer, date, source });
  };
  for (const axis of TOKEN_LEDGER) {
    if (evidence.tokens.transfer[axis] !== "keep") continue;
    const measured = evidence.tokens.measured[axis];
    const values = measured === null ? [] : Array.isArray(measured) ? (axis === "fonts" ? [...new Set(measured)] : [...new Set(measured)].sort((a, b) => a - b)) : [measured];
    add(axis, values, `${TOKEN_LABELS[axis]} follow the reference contract ${evidence.slug}: ${values.map((value) => withUnit(value, tokenUnit(axis))).join(", ")} (token axis ${axis}).`, `${ref}#tokens.${axis}`);
  }
  for (const [id, axis, label] of FACT_LEDGER) {
    const kept = evidence.facts.filter((fact) => fact.id === id && fact.transfer === "keep");
    if (!kept.length) continue;
    const numbers = kept.flatMap((fact) => (Array.isArray(fact.value) ? fact.value : [fact.value])).filter((value) => isNumber(value) && value >= 0);
    const unit = kept[0].unit ?? null;
    if (axis === "primariesPerSection") {
      const most = numbers.filter(Number.isInteger);
      if (most.length) add(axis, [Math.max(...most)], `At most ${Math.max(...most)} primary action(s) per section, from the reference contract ${evidence.slug} (${id}).`, `${ref}#${id}`);
      continue;
    }
    const values = [...new Set(numbers)].sort((a, b) => a - b);
    add(axis, values, `${label} follow the reference contract ${evidence.slug}: ${values.map((value) => withUnit(value, unit)).join(", ")} (${id}).`, `${ref}#${id}`);
  }
  return LEDGER_ORDER.filter((axis) => out.has(axis)).map((axis) => out.get(axis));
}
