// System proposal (WO-11 A4, B2; WO-20 S). First the system the project starts with (`system`): one table of what
// the shipped components draw with the project's look and what its ledger records, and under "To take it" one entry
// for the default control height or the reason there is none. Then, under "Details and counts", for each ledger
// axis it covers, the values a person may record and the basis of each, strongest first: the project's recorded
// decision, the person's own measurement (a reference kept in an approved contract, then a reference measured but
// not kept, then the product's own screens as counted by `drift-report.mjs --inventory`), corpus counts from the
// evidence pack, and last the engine default, always labelled not measured. A proposal is a count and a choice: it
// states what was measured, on how many systems of which kind, and leaves the value to the person. Nothing is
// scored, nothing gates, and no entry it prints compiles: `approvedBy` and `date` stay empty until the
// person who decides puts their name on it. Pure: no I/O, no clock; the same input gives the same bytes.
import { FACT_LEDGER, isApproved, proposeDecisions } from "./reference-contract.mjs";
import { defaultHeightSource, parseDefaultHeight } from "./runtime-contract.mjs";
import { systemCssDraws } from "./system-css.mjs";

export const PROPOSAL_VERSION = 2;
// A corpus value is proposed when it leads on at least minLineages measured systems, on at least
// shareNum/shareDen of the systems measured for its row, with at least minProductSystems product systems
// among them, on a row with at least minMeasured measured systems. Below that only the counts are shown.
export const PROPOSAL_RULE = Object.freeze({ minMeasured: 3, minLineages: 3, shareNum: 2, shareDen: 3, minProductSystems: 1 });
// The corpus row a page type reads. Any other page (landing, onboarding, none) reads the pooled row.
export const PAGE_ROWS = Object.freeze({ dashboard: "dashboard", list: "list", form: "form", settings: "form", detail: "detail" });
export const TOUCH_FLOOR = Object.freeze({ px: 44, rule: "CRAFT-control-heights", clause: "Touch surfaces provide at least 44px targets" });

const ROW_ORDER = Object.freeze(["dashboard", "list", "form", "detail", "all"]);
const USES = new Set(["value", "flag", "note"]);
const MAX_STATEMENT = 300;
const MAX_SOURCE = 200;
const MAX_VALUES = 24;
const PROPOSALS_FILE = ".styleseed/proposals/system.json";

const list = (values) => values.join(", ");
const an = (value) => (/^8/u.test(String(value)) || value === 11 || value === 18 ? "an" : "a");
// Axis order is the order of the proposal. Core axes always get a section; the others only when they have
// a recorded decision or an option that is not the engine default.
export const PROPOSAL_AXES = Object.freeze([
  { axis: "controlHeights", core: true, title: "Control height", unit: "px", depends: ["input", "density"], sentence: (v) => `Controls use these heights: ${list(v)}px.`, effect: "the drift report reads any other control height as `violates D-…`. Add the other sizes the product uses to `values` first, or record an exception later" },
  { axis: "typeSizes", core: true, title: "Type sizes", unit: "px", depends: ["input", "density"], sentence: (v) => `Text uses these sizes: ${list(v)}px.`, effect: "the drift report reads any text size outside the set as `violates D-…`" },
  { axis: "radii", core: true, title: "Corner radius", unit: "px", depends: ["recipe"], sentence: (v) => `Corners use these radii: ${list(v)}px.`, effect: "the drift report reads any other radius as `violates D-…` (999 stands for a pill)" },
  { axis: "tableRowHeights", core: true, title: "Table row height", unit: "px", depends: ["input", "density"], sentence: (v) => `Table rows are ${list(v)}px tall.`, effect: "the drift report, run with `--structure`, reads any other table row height as `violates D-…`" },
  { axis: "spacingBase", core: true, title: "Spacing unit", unit: "px", depends: ["density"], sentence: (v) => `Spacing follows ${an(v[0])} ${v[0]}px unit.`, effect: "the drift report reads a screen whose measured spacing base differs as `violates D-…`" },
  { axis: "spacingScale", core: false, title: "Spacing steps", unit: "px", depends: ["density"], sentence: (v) => `Spacing uses these steps: ${list(v)}px.`, effect: "the drift report reads any other spacing step above its 2% floor as `violates D-…`" },
  { axis: "headingSizes", core: false, title: "Heading sizes", unit: "px", depends: [], sentence: (v) => `Headings in the main region use these sizes: ${list(v)}px.`, effect: "the drift report, run with `--structure`, reads any other heading size as `violates D-…`" },
  { axis: "listItemHeights", core: false, title: "List item height", unit: "px", depends: ["input", "density"], sentence: (v) => `List items are ${list(v)}px tall.`, effect: "the drift report, run with `--structure`, reads any other list item height as `violates D-…`" },
  { axis: "sectionGaps", core: false, title: "Section gap", unit: "px", depends: ["density"], sentence: (v) => `Sections are separated by ${list(v)}px.`, effect: "the drift report, run with `--structure`, reads any other section gap as `violates D-…`" },
  { axis: "primariesPerSection", core: false, title: "Primary actions per section", unit: "", depends: [], sentence: (v) => `At most ${v[0]} primary ${v[0] === 1 ? "action" : "actions"} per section.`, effect: "the drift report, run with `--structure`, reads a section with more primary actions as `violates D-…`" },
  { axis: "transitionDurations", core: false, title: "Transition durations", unit: "ms", depends: [], sentence: (v) => `Transitions use these durations: ${list(v)}ms.`, effect: "the drift report, run with `--structure`, reads any other duration as `violates D-…`" },
].map((entry) => Object.freeze({ ...entry, depends: Object.freeze(entry.depends) })));
const AXIS_DEF = new Map(PROPOSAL_AXES.map((entry) => [entry.axis, entry]));
// Ledger axes the proposer never proposes and `--entry` still prints (WO-20 A): a button's corner and a
// field's corner. They have no block. A corner is one value for the whole project, a whole number from 0 to
// 200 or 999 for a pill (runtime-contract.mjs). The keys equal compare-screens.mjs RECORD_ONLY_AXES.
const cornerClause = (v) => (v === 0 ? "have square corners" : v === 999 ? "are pills" : `use ${an(v)} ${v}px corner`);
const cornerWords = (v) => (v === 0 ? "square corners" : v === 999 ? "pill corners" : `${v}px`);
const isCorner = (value) => Number.isInteger(value) && value >= 0 && (value <= 200 || value === 999);
export const RECORD_ONLY_DEF = Object.freeze({
  controlRadius: Object.freeze({ axis: "controlRadius", title: "Control corner", unit: "px", sentence: (v) => `Buttons and the other controls that share their corner ${cornerClause(v[0])}.` }),
  fieldRadius: Object.freeze({ axis: "fieldRadius", title: "Field corner", unit: "px", sentence: (v) => `Inputs, selects, and textareas ${cornerClause(v[0])}.` }),
});

// --- skill data: strict shape checks ----------------------------------------------------------------------

const REBUILD = "rebuild with `node scripts/build-evidence-pack.mjs`, or reinstall the skill";
const CONTROL = /[\u0000-\u001f\u007f]/u;
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isPositive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isText = (value, max) => typeof value === "string" && value.length >= 1 && value.length <= max && !CONTROL.test(value);
function checker(file, hint = REBUILD) {
  const fail = (where, message) => { throw new Error(`${file}: ${where}: ${message}; ${hint}`); };
  const keys = (value, wanted, where) => {
    if (!isObject(value)) fail(where, "must be an object");
    const extra = Object.keys(value).filter((key) => !wanted.includes(key));
    const missing = wanted.filter((key) => !Object.hasOwn(value, key));
    if (extra.length) fail(where, `unknown key(s) ${extra.join(", ")}`);
    if (missing.length) fail(where, `missing ${missing.join(", ")}`);
  };
  const array = (value, where, { min = 0 } = {}) => { if (!Array.isArray(value) || value.length < min) fail(where, min ? `must be a non-empty array` : "must be an array"); return value; };
  // `accepted` is the one schema version this proposer reads for the file.
  const version = (value, where, accepted) => {
    if (!Number.isInteger(value) || value < 1) fail(where, `must be ${accepted}`);
    if (value > accepted) fail(where, `is ${value}, newer than this proposer reads (${accepted})`);
    if (value < accepted) fail(where, `is ${value}, older than this proposer reads (${accepted})`);
  };
  return { fail, keys, array, version };
}
const PACK_SCHEMA = 1;
const DEFAULTS_SCHEMA = 2;
const viewportOk = (value) => value === "both" || (Number.isInteger(value) && value > 0);
const bucketValueOk = (value) => (typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean" || value === "mixed";

/**
 * The evidence pack (ss-resolve/references/evidence-pack.json), checked strictly and copied. Unknown keys
 * inside a claims[] item are kept; the proposer ignores a claim whose use or axis it does not know.
 * @param {object} input parsed JSON
 * @param {{file?: string}} [options] the path printed in errors
 */
export function normalizeEvidencePack(input, { file = "evidence-pack.json" } = {}) {
  const { fail, keys, array, version } = checker(file);
  keys(input, ["schemaVersion", "generatedBy", "run", "lineages", "claims", "rows"], "pack");
  version(input.schemaVersion, "schemaVersion", PACK_SCHEMA);
  if (!isText(input.generatedBy, 120)) fail("generatedBy", "must name the builder");
  const run = input.run;
  keys(run, ["id", "path", "consensusVersion", "viewports", "scroll", "touch", "screens"], "run");
  if (!isText(run.id, 64) || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(run.id)) fail("run.id", "must be the run folder name");
  if (!isText(run.path, 200)) fail("run.path", "must be the run folder path");
  if (!Number.isInteger(run.consensusVersion) || run.consensusVersion < 1) fail("run.consensusVersion", "must be a positive integer");
  array(run.viewports, "run.viewports", { min: 1 }).forEach((pair, index) => { if (!Array.isArray(pair) || pair.length < 2 || !pair.every((n) => Number.isInteger(n) && n > 0)) fail(`run.viewports[${index}]`, "must be a [width, height] pair"); });
  if (typeof run.scroll !== "boolean") fail("run.scroll", "must be true or false");
  if (typeof run.touch !== "boolean") fail("run.touch", "must be true or false");
  keys(run.screens, ["listed", "measured", "failed", "skipped"], "run.screens");
  for (const key of ["listed", "measured", "failed", "skipped"]) if (!isCount(run.screens[key])) fail(`run.screens.${key}`, "must be a count");
  const lineages = array(input.lineages, "lineages").map((lineage, index) => {
    const at = `lineages[${index}]`;
    keys(lineage, ["id", "name", "kind", "screens", "fragments"], at);
    if (!isText(lineage.id, 64) || !/^[a-z0-9][a-z0-9-]*$/u.test(lineage.id)) fail(`${at}.id`, "must be a lineage id");
    if (!isText(lineage.name, 80)) fail(`${at}.name`, "must be the lineage name");
    if (!["product-system", "kit"].includes(lineage.kind)) fail(`${at}.kind`, "must be product-system or kit");
    if (!isCount(lineage.screens) || !isCount(lineage.fragments)) fail(at, "screens and fragments must be counts");
    return { id: lineage.id, name: lineage.name, kind: lineage.kind, screens: lineage.screens, fragments: lineage.fragments };
  });
  const claims = array(input.claims, "claims").map((claim, index) => {
    const at = `claims[${index}]`;
    if (!isObject(claim)) fail(at, "must be an object");
    for (const key of ["id", "axis", "use", "label"]) if (!isText(claim[key], 120)) fail(`${at}.${key}`, "must be bounded text");
    if (claim.unit !== undefined && !isText(claim.unit, 8)) fail(`${at}.unit`, "must be a unit such as px");
    if (claim.complete !== undefined && typeof claim.complete !== "boolean") fail(`${at}.complete`, "must be true or false");
    if (claim.values !== undefined && !(Array.isArray(claim.values) && claim.values.length && claim.values.every((v) => typeof v === "number" && Number.isFinite(v)))) fail(`${at}.values`, "must be a non-empty list of numbers");
    if (claim.viewport !== undefined && !viewportOk(claim.viewport)) fail(`${at}.viewport`, "must be a width or \"both\"");
    if (claim.caveat !== undefined && !isText(claim.caveat, 200)) fail(`${at}.caveat`, "must be bounded text");
    return structuredClone(claim);
  });
  const buckets = (value, where) => array(value, where).map((entry, index) => {
    keys(entry, ["value", "lineages", "productSystems", "kits"], `${where}[${index}]`);
    if (!bucketValueOk(entry.value)) fail(`${where}[${index}].value`, "must be a number, a boolean, or \"mixed\"");
    for (const key of ["lineages", "productSystems", "kits"]) if (!isCount(entry[key])) fail(`${where}[${index}].${key}`, "must be a count");
    return { value: entry.value, lineages: entry.lineages, productSystems: entry.productSystems, kits: entry.kits };
  });
  const rows = array(input.rows, "rows").map((row, index) => {
    const at = `rows[${index}]`;
    keys(row, ["claim", "pageType", "viewport", "measured", "buckets", "withFragments"], at);
    if (!isText(row.claim, 120)) fail(`${at}.claim`, "must be a claim id");
    if (!isText(row.pageType, 32)) fail(`${at}.pageType`, "must be a page type");
    if (!viewportOk(row.viewport)) fail(`${at}.viewport`, "must be a width or \"both\"");
    if (!isCount(row.measured)) fail(`${at}.measured`, "must be a count");
    let withFragments = null;
    if (row.withFragments !== null) {
      keys(row.withFragments, ["measured", "buckets"], `${at}.withFragments`);
      if (!isCount(row.withFragments.measured)) fail(`${at}.withFragments.measured`, "must be a count");
      withFragments = { measured: row.withFragments.measured, buckets: buckets(row.withFragments.buckets, `${at}.withFragments.buckets`) };
    }
    return { claim: row.claim, pageType: row.pageType, viewport: row.viewport, measured: row.measured, buckets: buckets(row.buckets, `${at}.buckets`), withFragments };
  });
  return {
    schemaVersion: input.schemaVersion, generatedBy: input.generatedBy,
    run: { id: run.id, path: run.path, consensusVersion: run.consensusVersion, viewports: run.viewports.map((pair) => [...pair]), scroll: run.scroll, touch: run.touch, screens: { ...run.screens } },
    lineages, claims, rows,
  };
}

const RECIPE_KEYS = ["controlRadius", "insetRadius", "surfaceRadius", "sectionGap", "pageGutter", "surfacePadding", "controlHeight"];
const CONTROL_HEIGHT_VARIABLE = "--ss-control-height";
/**
 * The shipped engine defaults (ss-resolve/references/engine-defaults.json), checked strictly and copied.
 * @param {object} input parsed JSON
 * @param {{file?: string}} [options] the path printed in errors
 */
export function normalizeEngineDefaults(input, { file = "engine-defaults.json" } = {}) {
  const { fail, keys, array, version } = checker(file);
  keys(input, ["schemaVersion", "generatedBy", "measured", "components", "recipes", "controlHeight", "spacingScale"], "defaults");
  version(input.schemaVersion, "schemaVersion", DEFAULTS_SCHEMA);
  if (!isText(input.generatedBy, 120)) fail("generatedBy", "must name the builder");
  if (input.measured !== false) fail("measured", "must be false: engine defaults are shipped values, not measurements");
  const c = input.components;
  keys(c, ["button", "input", "select", "table"], "components");
  const numberOrNull = (value, where) => { if (value !== null && !(typeof value === "number" && Number.isFinite(value) && value >= 0)) fail(where, "must be a number or null"); return value; };
  const positive = (value, where) => { if (!isPositive(value)) fail(where, "must be a positive number"); return value; };
  const sized = (value, where) => {
    keys(value, ["source", "defaultSize", "sizes"], where);
    if (!isText(value.source, 200)) fail(`${where}.source`, "must be the component path");
    const sizes = array(value.sizes, `${where}.sizes`, { min: 1 }).map((size, index) => {
      keys(size, ["key", "height", "text", "paddingX"], `${where}.sizes[${index}]`);
      if (!isText(size.key, 32)) fail(`${where}.sizes[${index}].key`, "must be the size key");
      return { key: size.key, height: positive(size.height, `${where}.sizes[${index}].height`), text: numberOrNull(size.text, `${where}.sizes[${index}].text`), paddingX: numberOrNull(size.paddingX, `${where}.sizes[${index}].paddingX`) };
    });
    const main = sizes.find((size) => size.key === value.defaultSize);
    if (!main) fail(`${where}.defaultSize`, "must name one of its sizes");
    if (main.text === null) fail(`${where}.defaultSize`, "the default size needs a text size");
    return { source: value.source, defaultSize: value.defaultSize, sizes };
  };
  const button = sized(c.button, "components.button");
  const select = sized(c.select, "components.select");
  keys(c.input, ["source", "height", "text", "textFromMd", "paddingX"], "components.input");
  if (!isText(c.input.source, 200)) fail("components.input.source", "must be the component path");
  const inputPart = { source: c.input.source, height: positive(c.input.height, "components.input.height"), text: positive(c.input.text, "components.input.text"), textFromMd: positive(c.input.textFromMd, "components.input.textFromMd"), paddingX: numberOrNull(c.input.paddingX, "components.input.paddingX") };
  keys(c.table, ["source", "headHeight", "headPaddingX", "text"], "components.table");
  if (!isText(c.table.source, 200)) fail("components.table.source", "must be the component path");
  const table = { source: c.table.source, headHeight: positive(c.table.headHeight, "components.table.headHeight"), headPaddingX: numberOrNull(c.table.headPaddingX, "components.table.headPaddingX"), text: positive(c.table.text, "components.table.text") };
  if (!isObject(input.recipes) || !Object.keys(input.recipes).length) fail("recipes", "must map recipe ids to their radii, gaps, and control heights");
  if (!Object.hasOwn(input.recipes, "default")) fail("recipes", "must hold `default` (the :root block of recipes.css), the control height of a project that names no recipe");
  const recipes = {};
  for (const [id, recipe] of Object.entries(input.recipes)) {
    keys(recipe, RECIPE_KEYS, `recipes.${id}`);
    recipes[id] = Object.fromEntries(RECIPE_KEYS.map((key) => [key, key === "controlHeight" ? positive(recipe[key], `recipes.${id}.${key}`) : numberOrNull(recipe[key], `recipes.${id}.${key}`)]));
  }
  keys(input.controlHeight, ["variable", "offsets"], "controlHeight");
  if (input.controlHeight.variable !== CONTROL_HEIGHT_VARIABLE) fail("controlHeight.variable", `must be "${CONTROL_HEIGHT_VARIABLE}"`);
  const offsets = array(input.controlHeight.offsets, "controlHeight.offsets", { min: 1 });
  if (!offsets.every((offset, index) => Number.isInteger(offset) && (index === 0 || offset > offsets[index - 1]))) fail("controlHeight.offsets", "must be distinct whole numbers in ascending order");
  if (!offsets.includes(0)) fail("controlHeight.offsets", "must contain 0 (the default control height itself)");
  keys(input.spacingScale, ["rule", "values"], "spacingScale");
  if (!isText(input.spacingScale.rule, 80)) fail("spacingScale.rule", "must be a rule id");
  const values = array(input.spacingScale.values, "spacingScale.values", { min: 1 }).map((value, index) => positive(value, `spacingScale.values[${index}]`));
  return { schemaVersion: input.schemaVersion, generatedBy: input.generatedBy, measured: false, components: { button, input: inputPart, select, table }, recipes, controlHeight: { variable: input.controlHeight.variable, offsets: [...offsets] }, spacingScale: { rule: input.spacingScale.rule, values } };
}

// --- corpus rows --------------------------------------------------------------------------------------------

/**
 * Status of one pack row under the proposal rule, and its leading bucket: the first bucket whose value is
 * not "mixed", when it is the only such bucket or has more lineages than the next; a tie has no lead.
 * `withFragments` is never read here.
 */
export function rowStatus(row, rule = PROPOSAL_RULE) {
  if (!row || row.measured === 0) return { status: "none", lead: null };
  const real = row.buckets.filter((entry) => entry.value !== "mixed").map((entry, index) => ({ entry, index })).sort((a, b) => b.entry.lineages - a.entry.lineages || a.index - b.index).map(({ entry }) => entry);
  const lead = real.length && (real.length === 1 || real[0].lineages > real[1].lineages) ? real[0] : null;
  if (row.measured < rule.minMeasured) return { status: "thin", lead };
  const agrees = lead !== null && lead.lineages >= rule.minLineages && rule.shareDen * lead.lineages >= rule.shareNum * row.measured && lead.productSystems >= rule.minProductSystems;
  return { status: agrees ? "agree" : "split", lead };
}

const rowAt = (pack, claim, pageType, viewport) => pack.rows.find((row) => row.claim === claim && row.pageType === pageType && (row.viewport === viewport || row.viewport === "both")) ?? null;

/**
 * The row a claim is read from: the page's own row when it has at least minMeasured systems, else the
 * pooled `all` row when it has, else whichever has more measured systems (a tie goes to the page's own),
 * else the one that exists.
 */
export function selectRow(pack, claim, { page, viewport }, rule = PROPOSAL_RULE) {
  const own = PAGE_ROWS[page] ? rowAt(pack, claim, PAGE_ROWS[page], viewport) : null;
  const pooled = rowAt(pack, claim, "all", viewport);
  if (own && own.measured >= rule.minMeasured) return own;
  if (pooled && pooled.measured >= rule.minMeasured) return pooled;
  if (own && pooled) return own.measured >= pooled.measured ? own : pooled;
  return own ?? pooled;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const kinds = (entry) => [entry.productSystems ? plural(entry.productSystems, "product system", "product systems") : null, entry.kits ? plural(entry.kits, "kit", "kits") : null].filter(Boolean).join(", ");
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const numeric = (values) => [...new Set(values)].sort((a, b) => a - b);
const valueText = (value, unit) => (value === "mixed" ? "no single value" : value === true ? "yes" : value === false ? "no" : `${value}${unit}`);
const pageText = (pageType) => (pageType === "all" ? "all page types pooled" : `${pageType} pages`);
const viewText = (viewport) => (viewport === "both" ? "1440 and 390 wide" : `${viewport} wide`);
const bucketsText = (measured, buckets, unit) => buckets.map((entry, index) => `${valueText(entry.value, unit)} on ${entry.lineages}${index === 0 ? ` of ${measured} measured systems` : ""} (${kinds(entry)})`).join("; ");
const sameBuckets = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function corpusFor(def, pack, context, rule) {
  const empty = (status, reason) => ({ status, reason, lines: [], notes: [], options: [] });
  if (context.surface === "touch" && pack.run.touch !== true) return empty("not-applicable", "touch");
  const claims = pack.claims.filter((claim) => claim.axis === def.axis && USES.has(claim.use));
  if (!claims.length) return empty("none", "no-claim");
  const lines = [], notes = [], agreed = [], open = [];
  for (const claim of claims) {
    const viewport = claim.viewport ?? 1440;
    const row = selectRow(pack, claim.id, { page: context.page, viewport }, rule);
    if (!row || row.measured === 0) continue;
    const { status, lead } = rowStatus(row, rule);
    const unit = claim.unit ?? "";
    const text = `${cap(claim.label)}: ${bucketsText(row.measured, row.buckets, unit)}. ${cap(pageText(row.pageType))}, ${viewText(row.viewport)}.`;
    if (claim.use === "note") { notes.push({ claim: claim.id, status, text: `${text}${claim.caveat ? ` ${claim.caveat}` : ""}` }); continue; }
    const fragments = row.withFragments && !sameBuckets(row.withFragments.buckets, row.buckets) ? ` With form fragments counted: ${bucketsText(row.withFragments.measured, row.withFragments.buckets, unit)}.` : "";
    const others = ROW_ORDER.map((pageType) => rowAt(pack, claim.id, pageType, viewport)).filter((other) => other && other.measured > 0 && other !== row).map((other) => {
      const otherLead = rowStatus(other, rule).lead;
      return `${other.pageType === "all" ? "pooled" : other.pageType} ${otherLead ? `${valueText(otherLead.value, unit)} on ${otherLead.lineages} of ${other.measured}` : `no lead among ${other.measured}`}`;
    });
    const under = status === "split" ? " Under the proposal rule; shown as measured." : status === "thin" ? ` Fewer than ${rule.minMeasured} measured systems; shown as measured.` : "";
    lines.push({ claim: claim.id, status, pageType: row.pageType, viewport: row.viewport, measured: row.measured, buckets: row.buckets, text: `${text}${under}${fragments}${others.length ? ` Other rows: ${others.join(" · ")}.` : ""}` });
    const valuesOf = (entry) => (claim.use === "flag" ? (entry.value === true ? [...claim.values] : null) : typeof entry.value === "number" ? [entry.value] : null);
    const count = (entry) => ({ claim: claim.id, label: claim.label, value: entry.value, lineages: entry.lineages, measured: row.measured, productSystems: entry.productSystems, kits: entry.kits, pageType: row.pageType, viewport: row.viewport });
    const complete = claim.complete !== false;
    if (status === "agree" && lead && valuesOf(lead)) agreed.push({ values: valuesOf(lead), count: count(lead), complete });
    else for (const entry of row.buckets) if (valuesOf(entry)) open.push({ values: valuesOf(entry), count: count(entry), complete });
  }
  const option = (values, items) => ({ basis: "corpus", values, counts: items.map((item) => item.count), partial: items.some((item) => !item.complete), source: corpusSource(pack.run.id, items.map((item) => item.count)) });
  if (agreed.length) return { status: "agree", reason: null, lines, notes, options: [option(numeric(agreed.flatMap((item) => item.values)), agreed)] };
  const groups = new Map();
  for (const item of open) groups.set(item.values.join(","), [...(groups.get(item.values.join(",")) ?? []), item]);
  const options = [...groups.values()].map((items) => option(items[0].values, items)).sort((a, b) => Math.max(...b.counts.map((c) => c.lineages)) - Math.max(...a.counts.map((c) => c.lineages)) || a.values[0] - b.values[0]);
  const statuses = lines.map((line) => line.status);
  return { status: statuses.includes("split") ? "split" : statuses.includes("thin") ? "thin" : "none", reason: null, lines, notes, options };
}

// --- engine defaults (level 4: shipped, not measured) ----------------------------------------------------

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * The shipped value of an axis, or null when the engine ships none for it. `corners` carries the project's
 * recorded corners ({controlRadius, fieldRadius}, each {id, value}): on `radii` the recorded control corner
 * replaces the recipe's and a recorded field corner is added, and `from` names the entries. Without a recipe
 * `radii` is null either way.
 * @returns {{id: string, values: number[], from: string} | null}
 */
export function engineDefault(axis, defaults, { recipe = null, surface = "pointer", corners = {} } = {}) {
  const { button, input, select, table } = defaults.components;
  const mainButton = button.sizes.find((size) => size.key === button.defaultSize);
  const mainSelect = select.sizes.find((size) => size.key === select.defaultSize);
  if (axis === "controlHeights") {
    // The family the shipped components draw with the recipe (WO-17 B4), on both surfaces: the recipe's
    // --ss-control-height plus every offset the components use. A project that names no recipe, or one the
    // file does not have, gets the :root block's family, because that is what the CSS draws. The proposal
    // block prints the touch floor and which values are under it.
    const id = recipe && Object.hasOwn(defaults.recipes, recipe) ? recipe : "default";
    const height = defaults.recipes[id].controlHeight;
    const values = numeric(defaults.controlHeight.offsets.map((offset) => height + offset));
    return { id: `recipe.${id}`, values, from: `brand recipe ${id}: default controls ${height}px; the components of this StyleSeed version draw ${list(values)}px` };
  }
  if (axis === "typeSizes") {
    if (surface !== "touch") return { id: "components", values: numeric([mainButton.text, input.textFromMd, mainSelect.text, table.text]), from: `button ${mainButton.key} ${mainButton.text}px, input ${input.textFromMd}px from 768 wide, select ${mainSelect.text}px, table ${table.text}px` };
    return { id: "components", values: numeric([mainButton.text, input.text, table.text]), from: `button ${mainButton.key} ${mainButton.text}px, input ${input.text}px under 768 wide, table ${table.text}px` };
  }
  if (axis === "radii") {
    const entry = recipe ? defaults.recipes[recipe] : null;
    if (!entry) return null;
    const control = corners.controlRadius ?? null;
    const field = corners.fieldRadius ?? null;
    const values = numeric([control ? control.value : entry.controlRadius, entry.insetRadius, entry.surfaceRadius, field ? field.value : null].filter((value) => value !== null));
    if (!values.length) return null;
    const part = (label, value) => (value === null ? null : `${label} ${value}px`);
    const shipped = [control ? null : part("control", entry.controlRadius), part("inset", entry.insetRadius), part("surface", entry.surfaceRadius)].filter(Boolean).join(", ");
    const recorded = [
      control ? `recorded control corner ${control.value}px (${control.id})${entry.controlRadius === null ? "" : ` in place of the recipe's ${entry.controlRadius}px`}` : null,
      field ? `recorded field corner ${field.value}px (${field.id})` : null,
    ].filter(Boolean);
    return { id: `recipe.${recipe}`, values, from: `brand recipe ${recipe}: ${[shipped, ...recorded].filter(Boolean).join("; ")}` };
  }
  if (axis === "tableRowHeights") return { id: "components", values: [table.headHeight], from: `table header cell ${table.headHeight}px; body rows have no fixed height` };
  if (axis === "spacingBase") {
    const base = defaults.spacingScale.values.reduce((a, b) => gcd(a, b));
    return { id: `rule.${defaults.spacingScale.rule}`, values: [base], from: `every step of the starting scale in rule ${defaults.spacingScale.rule} is a multiple of ${base}` };
  }
  return null;
}

// --- a measured reference (level 2) ---------------------------------------------------------------------------

const numbersOf = (value) => (Array.isArray(value) ? value : [value]).filter((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);

/**
 * The values one measured reference gives each axis. `summary` and `facts` are its measurements/summary.json
 * and facts.json; `evidence` is the project's generated contract for the same slug when it is approved
 * (isApproved), else null. An axis kept in the approved contract takes the contract's values and source.
 * The reference's URL is never copied.
 */
export function referenceValues({ slug, summary = null, facts = null, evidence = null }) {
  const values = {};
  const factIds = {};
  const set = (axis, list, id) => { const clean = numeric(numbersOf(list)); if (clean.length) { values[axis] = clean; factIds[axis] = id; } };
  if (summary) {
    set("controlHeights", summary.controlHeights ?? [], "tokens.controlHeights");
    set("radii", summary.radii ?? [], "tokens.radii");
    set("typeSizes", (summary.typeStepDetail ?? []).map((step) => step?.px), "tokens.typeSizes");
    set("spacingBase", Number.isInteger(summary.spacingBase) && summary.spacingBase >= 1 ? [summary.spacingBase] : [], "tokens.spacingBase");
    set("spacingScale", summary.spacingScale ?? [], "tokens.spacingScale");
  }
  if (facts && Array.isArray(facts.facts)) {
    for (const [id, axis] of FACT_LEDGER) {
      const numbers = facts.facts.filter((fact) => fact?.id === id).flatMap((fact) => numbersOf(fact.value));
      if (axis === "primariesPerSection") { const most = numbers.filter(Number.isInteger); if (most.length) { values[axis] = [Math.max(...most)]; factIds[axis] = id; } continue; }
      set(axis, numbers, id);
    }
  }
  const kept = [];
  if (evidence && isApproved(evidence)) {
    for (const entry of proposeDecisions(evidence)) {
      if (!AXIS_DEF.has(entry.axis)) continue;
      kept.push(entry.axis);
      values[entry.axis] = [...entry.values];
      factIds[entry.axis] = entry.source.slice(entry.source.indexOf("#") + 1);
    }
  }
  const skipped = [];
  for (const axis of Object.keys(values)) if (values[axis].length > MAX_VALUES) { skipped.push({ axis, count: values[axis].length }); delete values[axis]; delete factIds[axis]; }
  const order = (object) => Object.fromEntries(PROPOSAL_AXES.map(({ axis }) => axis).filter((axis) => Object.hasOwn(object, axis)).map((axis) => [axis, object[axis]]));
  return {
    slug,
    observedAt: typeof facts?.observedAt === "string" ? facts.observedAt : null,
    kept: PROPOSAL_AXES.map(({ axis }) => axis).filter((axis) => kept.includes(axis) && Object.hasOwn(values, axis)),
    values: order(values), factIds: order(factIds),
    skipped: skipped.sort((a, b) => PROPOSAL_AXES.findIndex((d) => d.axis === a.axis) - PROPOSAL_AXES.findIndex((d) => d.axis === b.axis)),
  };
}

// --- the product's own screens (level 2, after the references; WO-11 B2) ------------------------------------

const INVENTORY_HINT = "count the screens again with `drift-report.mjs <url>… --out <dir> --inventory` and pass <dir>/inventory.json";
// The inventory's `dominant` rule (ss-verify/scripts/system-inventory.mjs DOMINANT_SHARE, version "1").
const OWN_DOMINANT = 0.1;
const OWN_AXES = Object.freeze({
  controlHeights: { rule: "dominant", one: "control height", many: "control heights" },
  radii: { rule: "dominant", one: "radius", many: "radii" },
  typeSizes: { rule: "shared", one: "type size", many: "type sizes" },
  spacingBase: { rule: "majority" },
});

/**
 * The inventory of the product's own screens (inventory.json from `drift-report.mjs --inventory`),
 * checked strictly and copied.
 * @param {object} input parsed JSON
 * @param {{file?: string}} [options] the path printed in errors
 */
export function normalizeInventory(input, { file = "inventory.json" } = {}) {
  const { fail, keys, array } = checker(file, INVENTORY_HINT);
  keys(input, ["tool", "version", "observedAt", "viewports", "screens", "axes"], "inventory");
  if (input.tool !== "styleseed system-inventory") fail("tool", "must be \"styleseed system-inventory\"");
  if (input.version !== "1") fail("version", `is ${JSON.stringify(input.version)}; this proposer reads version "1"`);
  if (typeof input.observedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(input.observedAt)) fail("observedAt", "must be the measurement date (YYYY-MM-DD)");
  const viewports = array(input.viewports, "viewports").map((pair, index) => { if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((n) => Number.isInteger(n) && n > 0)) fail(`viewports[${index}]`, "must be a [width, height] pair"); return [...pair]; });
  const screens = array(input.screens, "screens", { min: 1 }).map((screen, index) => {
    keys(screen, ["label"], `screens[${index}]`);
    if (!isText(screen.label, 200)) fail(`screens[${index}].label`, "must be the screen label");
    return { label: screen.label };
  });
  const n = screens.length;
  const sizes = (value, where) => array(value, where).map((v, index) => { if (!(typeof v === "number" && Number.isFinite(v) && v >= 0)) fail(`${where}[${index}]`, "must be a number >= 0"); return v; });
  const histogram = (a, where, { kind = false, extra = [] } = {}) => {
    keys(a, [...(kind ? ["counted", "total", "distinct", "values", "dominant"] : ["counted", "total", "distinct", "values", "shared", "dominant"]), ...extra], where);
    if (!isText(a.counted, 40)) fail(`${where}.counted`, "must name what was counted");
    if (!isCount(a.total) || !isCount(a.distinct)) fail(where, "total and distinct must be counts");
    const values = array(a.values, `${where}.values`).map((v, index) => {
      const at = `${where}.values[${index}]`;
      keys(v, kind ? ["value", "count", "share", "screens"] : ["value", "count", "share", "screens", "reported"], at);
      if (!(typeof v.value === "number" && Number.isFinite(v.value) && v.value >= 0)) fail(`${at}.value`, "must be a number >= 0");
      if (!(Number.isInteger(v.count) && v.count > 0)) fail(`${at}.count`, "must be a positive count");
      if (!(typeof v.share === "number" && v.share >= 0 && v.share <= 1)) fail(`${at}.share`, "must be a share between 0 and 1");
      for (const key of kind ? ["screens"] : ["screens", "reported"]) if (!isCount(v[key]) || v[key] > n) fail(`${at}.${key}`, `must be a count of at most ${n} screens`);
      return kind ? { value: v.value, count: v.count, share: v.share, screens: v.screens } : { value: v.value, count: v.count, share: v.share, screens: v.screens, reported: v.reported };
    });
    if (values.length !== a.distinct || values.reduce((sum, v) => sum + v.count, 0) !== a.total) fail(where, "values must add up to total and distinct");
    return { counted: a.counted, total: a.total, distinct: a.distinct, values, ...(kind ? {} : { shared: sizes(a.shared, `${where}.shared`) }), dominant: sizes(a.dominant, `${where}.dominant`) };
  };
  const axes = input.axes;
  keys(axes, ["controlHeights", "radii", "typeSizes", "spacingBase"], "axes");
  const heights = axes.controlHeights;
  const hasKinds = isObject(heights) && Object.hasOwn(heights, "byKind");
  const controlHeights = histogram(heights, "axes.controlHeights", { extra: ["controlBoxVersion", ...(hasKinds ? ["byKind"] : [])] });
  if (heights.controlBoxVersion !== null && !(Number.isInteger(heights.controlBoxVersion) && heights.controlBoxVersion >= 1)) fail("axes.controlHeights.controlBoxVersion", "must be a version number or null (the older reading)");
  controlHeights.controlBoxVersion = heights.controlBoxVersion;
  if (hasKinds) {
    keys(heights.byKind, ["field", "button"], "axes.controlHeights.byKind");
    controlHeights.byKind = { field: histogram(heights.byKind.field, "axes.controlHeights.byKind.field", { kind: true }), button: histogram(heights.byKind.button, "axes.controlHeights.byKind.button", { kind: true }) };
  }
  const base = axes.spacingBase;
  keys(base, ["counted", "values", "majority"], "axes.spacingBase");
  if (!isText(base.counted, 40)) fail("axes.spacingBase.counted", "must name what was counted");
  const bases = array(base.values, "axes.spacingBase.values").map((v, index) => {
    keys(v, ["value", "screens"], `axes.spacingBase.values[${index}]`);
    if (v.value !== null && !(Number.isInteger(v.value) && v.value >= 1)) fail(`axes.spacingBase.values[${index}].value`, "must be a spacing base in px or null");
    if (!(Number.isInteger(v.screens) && v.screens >= 1 && v.screens <= n)) fail(`axes.spacingBase.values[${index}].screens`, `must be a count of at most ${n} screens`);
    return { value: v.value, screens: v.screens };
  });
  if (base.majority !== null && !(Number.isInteger(base.majority) && base.majority >= 1)) fail("axes.spacingBase.majority", "must be a spacing base in px or null");
  return {
    tool: input.tool, version: input.version, observedAt: input.observedAt, viewports, screens,
    axes: { controlHeights, radii: histogram(axes.radii, "axes.radii"), typeSizes: histogram(axes.typeSizes, "axes.typeSizes"), spacingBase: { counted: base.counted, values: bases, majority: base.majority } },
  };
}

/**
 * The values the product's own screens give each axis: control heights and radii their `dominant` values
 * (on at least 10% of the counted controls or boxes, at least the most frequent one), type sizes their
 * `shared` values (on at least half of the screens as the drift report counts them), and the spacing
 * unit the base on the most screens. Control heights of the older reading (no `controlBoxVersion`) give
 * no value. `path` is the project-relative path of the inventory, printed in the `--entry` command.
 * @param {{path: string, inventory: object}} input inventory normalized (normalizeInventory)
 */
export function ownScreens({ path, inventory }) {
  const { axes } = inventory;
  const values = {};
  const set = (axis, list) => { const clean = numeric(numbersOf(list)); if (clean.length) values[axis] = clean; };
  if (axes.controlHeights.controlBoxVersion !== null) set("controlHeights", axes.controlHeights.dominant);
  set("radii", axes.radii.dominant);
  set("typeSizes", axes.typeSizes.shared);
  if (Number.isInteger(axes.spacingBase.majority) && axes.spacingBase.majority >= 1) values.spacingBase = [axes.spacingBase.majority];
  const skipped = [];
  for (const axis of Object.keys(values)) if (values[axis].length > MAX_VALUES) { skipped.push({ axis, count: values[axis].length }); delete values[axis]; }
  return { path, observedAt: inventory.observedAt, screens: inventory.screens.length, values, skipped, axes: structuredClone(axes) };
}

const pct = (share) => `${Math.round(share * 100)}%`;
// "32px on 55% of 102 controls, 36px on 12%; 7 more under 10% each (28, 30, 34px)": the `dominant` values
// with their shares, in count order, then the others, ascending.
function inUseText(a, unit) {
  if (!a.total) return `no ${a.counted} counted`;
  const top = a.values.filter((v) => a.dominant.includes(v.value));
  const rest = numeric(a.values.filter((v) => !a.dominant.includes(v.value)).map((v) => v.value));
  return `${top.map((v, i) => `${v.value}${unit} on ${pct(v.share)}${i === 0 ? ` of ${a.total} ${a.counted}` : ""}`).join(", ")}${rest.length ? `; ${rest.length} more under ${pct(OWN_DOMINANT)}${rest.length > 1 ? " each" : ""} (${list(rest)}${unit})` : ""}`;
}
// The own-screens line of one axis, printed before the corpus lines. Counts only: the corpus lines stand
// beside it unchanged, and nothing joins the two.
function ownText(def, own) {
  const a = own.axes[def.axis];
  const head = `This product (${plural(own.screens, "screen", "screens")} measured ${own.observedAt}):`;
  if (def.axis === "spacingBase") {
    const parts = a.values.map((v, i) => `${v.value === null ? "no base found" : `${v.value}px`} on ${v.screens}${i === 0 ? ` of ${plural(own.screens, "screen", "screens")}` : ""}`);
    return `${head} spacing base ${parts.join("; ")}.${own.values.spacingBase ? " The own-screens option takes the base on the most screens, as the drift report reads it." : ""}`;
  }
  const words = OWN_AXES[def.axis];
  if (def.axis === "controlHeights" && a.controlBoxVersion === null) return `${head} these control heights were read from the input element, the older reading without the visible control box, so they give no option here. Count the screens again with \`drift-report.mjs … --inventory\` to read the visible control boxes.`;
  const lead = `${head} ${plural(a.distinct, words.one, words.many)} in use; ${inUseText(a, def.unit)}.`;
  const kinds = def.axis === "controlHeights" && a.byKind ? ` ${["field", "button"].map((kind) => `${cap(a.byKind[kind].counted)}: ${inUseText(a.byKind[kind], def.unit)}.`).join(" ")}` : "";
  if (!own.values[def.axis]) return `${lead}${kinds}`;
  const rule = words.rule === "dominant"
    ? ` The own-screens option takes the ${words.many} on at least ${pct(OWN_DOMINANT)} of the ${a.counted}, and at least the most frequent one.`
    : ` The own-screens option takes the sizes on at least half of the screens, as the drift report counts them: ${list(a.shared)}${def.unit}. A size used on few elements can be a real heading, so the share of elements does not decide here.`;
  return `${lead}${kinds}${rule}`;
}
// The values in use on the product's screens that the drift report would read as `violates` once the
// proposed values are recorded: a value its drift row lists on at least one screen (`reported`), with the
// count of elements in use and the screens that list it; for the spacing unit, each other base.
function ownViolations(def, own, chosen) {
  const a = own.axes[def.axis];
  if (def.axis === "spacingBase") return a.values.filter((v) => v.value !== null && !chosen.includes(v.value)).map((v) => ({ value: v.value, count: null, screens: v.screens }));
  if (def.axis === "controlHeights" && a.controlBoxVersion === null) return null;
  return a.values.filter((v) => v.reported > 0 && !chosen.includes(v.value)).map((v) => ({ value: v.value, count: v.count, screens: v.reported }));
}
function violationsText(def, own, violations) {
  if (!violations.length) return "No value in use on these screens would then read as a violation.";
  const counted = own.axes[def.axis].counted;
  const items = violations.slice(0, 8).map((v, i) => `${v.value}${def.unit} (${i === 0 ? `${v.count === null ? "" : `${v.count} ${counted}, `}${plural(v.screens, "screen", "screens")}` : `${v.count === null ? "" : `${v.count}, `}${v.screens}`})`);
  return `Values in use that would then read as violations: ${items.join(", ")}${violations.length > 8 ? ` and ${violations.length - 8} more` : ""}.`;
}

// --- entries ------------------------------------------------------------------------------------------------

const valuesText = (values, unit) => `${list(values)}${unit}`;
const isFlagCount = (count) => typeof count.value === "boolean";
const corpusSource = (runId, counts) => `corpus:${runId}#${[...new Set(counts.map((c) => c.claim))].join("+")}@${[...new Set(counts.map((c) => `${c.pageType}/${c.viewport}`))].join(",")}`;

// "32px on 3 of 4 measured systems (form pages, corpus run 2026-11-12)"; with several counts, or when asked,
// each count starts with its claim label.
function corpusBasis(runId, counts, unit, labels = counts.length > 1) {
  const parts = counts.map((c) => `${labels ? `${c.label} ` : ""}${isFlagCount(c) ? "holds" : valueText(c.value, unit)} on ${c.lineages} of ${c.measured} measured systems`);
  return `${parts.join(", ")} (${[...new Set(counts.map((c) => pageText(c.pageType)))].join(" and ")}, corpus run ${runId})`;
}
const referenceBasis = (option) => `${option.kept ? "kept in the project's reference contract" : "measured on the project's reference"} ${option.slug}${option.observedAt ? `, ${option.observedAt}` : ""}`;
const ownBasis = (option) => `measured on ${plural(option.screens, "screen", "screens")} of this product, ${option.observedAt}`;
const defaultBasis = (option) => `engine default, not measured (${option.from})`;
const basisText = (def, option, runId) => (option.basis === "corpus" ? corpusBasis(runId, option.counts, def.unit) : option.basis === "reference" ? referenceBasis(option) : option.basis === "own-screens" ? ownBasis(option) : defaultBasis(option));
function sentenceFor(def, option) {
  if (option.basis !== "corpus" || option.counts.some(isFlagCount)) return def.sentence(option.values);
  const clauses = option.values.map((value) => {
    const labels = [...new Set(option.counts.filter((c) => c.value === value).map((c) => c.label))];
    return `the ${labels.join(" and the ")} ${labels.length > 1 ? "are" : "is"} ${value}${def.unit}`;
  });
  return `${cap(clauses.join("; "))}.`;
}
const prefixOf = (option, runId) => (option.basis === "corpus" ? `corpus:${runId}` : option.basis === "reference" ? `${option.kept ? "reference" : "measured"}:${option.slug}` : option.basis === "own-screens" ? `own-screens:${option.observedAt}` : option.source.split(" ")[0]);
const severalRows = (prefix, axis, extra = "") => `${prefix}#${axis} (several rows${extra}; see ${PROPOSALS_FILE})`;
// The ledger's limits: a statement of at most 300 characters, a source of at most 200. A statement that would
// be longer says "Basis: see source."; if even that is too long, the axis's generic sentence is used.
function fitted(def, values, sentence, basis, source, fallbackSource) {
  const full = `${sentence} Basis: ${basis}.`;
  const short = `${sentence} Basis: see source.`;
  const statement = full.length <= MAX_STATEMENT ? full : short.length <= MAX_STATEMENT ? short : `${def.sentence(values)} Basis: see source.`;
  return { statement, source: source.length <= MAX_SOURCE ? source : fallbackSource() };
}
function entryFor(def, option, runId) {
  const { statement, source } = fitted(def, option.values, sentenceFor(def, option), basisText(def, option, runId), option.source, () => severalRows(prefixOf(option, runId), def.axis));
  return { kind: "decision", axis: def.axis, values: [...option.values], statement, approvedBy: "", date: "", source };
}

// --- the proposal ---------------------------------------------------------------------------------------------

/**
 * @param {{pack: object, defaults: object, project: {mode: string, decisions: object[], density: string|null, recipe: string|null, ledger: {path: string, entries: number, nextId: string}}, context: {artifact?: string|null, page: string, surface: "pointer"|"touch"}, references?: object[], own?: object|null, rule?: object}} input
 *   pack and defaults normalized; project.decisions normalized (normalizeDecisions); references are
 *   referenceValues results in the order given; own is the ownScreens result for the product's own
 *   measured screens, or null.
 * @returns {object} the proposal (written as .styleseed/proposals/system.json); its last key, `system`, is the
 *   system the project starts with (systemFor)
 */
export function proposeSystem(input) {
  const { proposal, corners } = proposeBlocks(input);
  return { ...proposal, system: systemFor(input, proposal, corners) };
}

// The proposal without `system`, and the recorded corners it was built with. The second proposal of
// defaultHeightEntryFor is made here, never with proposeSystem: `system` offers an entry built from that second
// proposal, so proposeSystem calling itself would never end.
function proposeBlocks({ pack, defaults, project, context, references = [], own = null, rule = PROPOSAL_RULE }) {
  if (own !== null && !(isObject(own) && isObject(own.values) && isObject(own.axes) && typeof own.path === "string")) throw new Error("own: pass the ownScreens result for the product's inventory, or null");
  const decisions = project.decisions ?? [];
  // The recorded corners (no scope, no exception on these axes) reach the `radii` block's engine default.
  const corners = Object.fromEntries(decisions.filter((entry) => entry.kind === "decision" && Object.hasOwn(RECORD_ONLY_DEF, entry.axis)).map((entry) => [entry.axis, { id: entry.id, value: entry.values[0] }]));
  const axes = [];
  for (const def of PROPOSAL_AXES) {
    const recorded = decisions.find((entry) => entry.kind === "decision" && entry.axis === def.axis && !entry.scope) ?? null;
    const scoped = decisions.filter((entry) => entry.axis === def.axis && entry.scope).map((entry) => entry.id);
    const corpus = corpusFor(def, pack, context, rule);
    const options = [];
    const measuredRefs = references.filter((ref) => ref.values?.[def.axis]?.length);
    for (const ref of [...measuredRefs.filter((r) => r.kept.includes(def.axis)), ...measuredRefs.filter((r) => !r.kept.includes(def.axis))]) {
      const kept = ref.kept.includes(def.axis);
      options.push({ basis: "reference", slug: ref.slug, kept, observedAt: ref.observedAt ?? null, values: [...ref.values[def.axis]], source: `${kept ? "reference" : "measured"}:${ref.slug}#${ref.factIds[def.axis]}` });
    }
    const ownAxis = own && OWN_AXES[def.axis] ? own : null;
    if (ownAxis?.values[def.axis]?.length) options.push({ basis: "own-screens", screens: own.screens, observedAt: own.observedAt, values: [...own.values[def.axis]], source: `own-screens:${own.observedAt}#${def.axis}` });
    options.push(...corpus.options);
    const fallback = engineDefault(def.axis, defaults, { recipe: project.recipe, surface: context.surface, corners });
    if (fallback) options.push({ basis: "engine-default", values: fallback.values, from: fallback.from, source: `engine-default:${fallback.id} (not measured)` });
    if (!def.core && !recorded && !options.some((option) => option.basis !== "engine-default")) continue;
    const first = options[0] ?? null;
    const proposed = !recorded && first && (first.basis === "reference" || first.basis === "own-screens" || (first.basis === "corpus" && corpus.status === "agree")) ? 0 : null;
    const status = recorded ? "recorded" : proposed !== null ? "proposed" : corpus.status === "split" ? "split" : corpus.status === "thin" ? "thin" : "unmeasured";
    const floor = context.surface === "touch" && def.axis === "controlHeights" ? TOUCH_FLOOR : null;
    const violations = ownAxis && proposed !== null ? ownViolations(def, own, first.values) : null;
    axes.push({
      axis: def.axis, title: def.title, status, partial: proposed !== null && first.partial === true,
      recorded: recorded ? { id: recorded.id, values: [...recorded.values], by: recorded.approvedBy, date: recorded.date } : null, scoped,
      own: ownAxis ? { text: ownText(def, own), violations, violationsText: violations ? violationsText(def, own, violations) : null } : null,
      corpus: { status: corpus.status, reason: corpus.reason, lines: corpus.lines, notes: corpus.notes }, floor,
      options: recorded ? [] : options.map((option) => {
        const under = floor ? option.values.filter((value) => value < floor.px) : [];
        return { ...option, ...(under.length ? { underFloor: under } : {}), entry: entryFor(def, option, pack.run.id) };
      }),
      proposed,
    });
  }
  const withScreens = pack.lineages.filter((lineage) => lineage.screens > 0);
  const proposal = {
    proposalVersion: PROPOSAL_VERSION,
    inputs: { mode: project.mode, artifact: context.artifact ?? null, page: context.page, pageRow: PAGE_ROWS[context.page] ?? "all", surface: context.surface, density: project.density ?? null, recipe: project.recipe ?? null, references: references.map((ref) => ref.slug), own: own ? own.path : null },
    pack: {
      run: pack.run.id, lineages: pack.lineages.length, withScreens: withScreens.length,
      productSystems: withScreens.filter((lineage) => lineage.kind === "product-system").length, kits: withScreens.filter((lineage) => lineage.kind === "kit").length,
      fragmentOnly: pack.lineages.length - withScreens.length, screens: withScreens.reduce((sum, lineage) => sum + lineage.screens, 0),
      viewports: pack.run.viewports.map((pair) => pair[0]), touch: pack.run.touch === true,
      systems: pack.lineages.map((lineage) => ({ name: lineage.name, kind: lineage.kind, screens: lineage.screens, fragments: lineage.fragments })),
    },
    rule: { ...rule }, ledger: { ...project.ledger }, axes,
  };
  return { proposal, corners };
}

/**
 * The entry for a value set the person chose on one axis. Values equal (as a set) to an option's values give
 * that option's entry, the first in order; otherwise each value is attributed to the first option that holds
 * it and the rest are listed as chosen without a measured basis. A recorded axis is an error. A corner axis
 * (RECORD_ONLY_DEF) takes exactly one value, chosen without a measured basis; it has no block, so whether it
 * is already recorded is checked by the caller (propose-system.mjs). Like every printed entry, it has no id,
 * no name, and no date.
 */
export function entryForValues(proposal, axis, values) {
  const corner = Object.hasOwn(RECORD_ONLY_DEF, axis) ? RECORD_ONLY_DEF[axis] : null;
  if (corner) {
    if (!Array.isArray(values) || values.length !== 1 || !isCorner(values[0])) throw new Error(`--entry ${axis}: give exactly one whole number from 0 to 200, or 999 for a pill (the ${corner.title.toLowerCase()} in px, for example --entry ${axis}=8)`);
    const chosen = [values[0]];
    const { statement, source } = fitted(corner, chosen, corner.sentence(chosen), `${cornerWords(chosen[0])} chosen without a measured basis`, `chosen: ${chosen[0]}`, () => `chosen: ${chosen[0]}`);
    return { kind: "decision", axis, values: chosen, statement, approvedBy: "", date: "", source };
  }
  const def = AXIS_DEF.get(axis);
  if (!def) throw new Error(`--entry ${axis}: not an axis the proposer covers (${[...PROPOSAL_AXES.map((entry) => entry.axis), ...Object.keys(RECORD_ONLY_DEF)].join(", ")})`);
  if (!Array.isArray(values) || !values.length || !values.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) throw new Error(`--entry ${axis}: give numbers >= 0, comma-separated (for example --entry ${axis}=32,40)`);
  const chosen = numeric(values);
  if (chosen.length > MAX_VALUES) throw new Error(`--entry ${axis}: ${chosen.length} values; a ledger entry holds at most ${MAX_VALUES}`);
  if (axis === "spacingBase" && !(chosen.length === 1 && Number.isInteger(chosen[0]) && chosen[0] >= 1)) throw new Error("--entry spacingBase: give exactly one positive integer (the spacing unit in px)");
  if (axis === "primariesPerSection" && !(chosen.length === 1 && Number.isInteger(chosen[0]))) throw new Error("--entry primariesPerSection: give exactly one integer (at most this many primary actions per section)");
  const block = proposal.axes.find((entry) => entry.axis === axis) ?? null;
  if (block?.status === "recorded") throw new Error(`${axis}: already recorded as ${block.recorded.id}; change that entry or record an exception`);
  const options = block?.options ?? [];
  const exact = options.find((option) => option.values.length === chosen.length && option.values.every((value, index) => value === chosen[index]));
  if (exact) return { ...exact.entry, values: [...exact.entry.values] };
  const runId = proposal.pack.run;
  const attributed = new Map();
  const rest = [];
  for (const value of chosen) {
    const index = options.findIndex((option) => option.values.includes(value));
    if (index < 0) rest.push(value);
    else attributed.set(index, [...(attributed.get(index) ?? []), value]);
  }
  const order = [...attributed.keys()].sort((a, b) => a - b);
  const parts = [];
  const sources = [];
  for (const index of order) {
    const option = options[index];
    const held = attributed.get(index);
    if (option.basis === "corpus") {
      const counts = option.counts.filter((c) => isFlagCount(c) || held.includes(c.value));
      parts.push(corpusBasis(runId, counts, def.unit, true));
      sources.push(corpusSource(runId, counts));
    } else {
      parts.push(`${valuesText(held, def.unit)} ${option.basis === "reference" ? referenceBasis(option) : option.basis === "own-screens" ? ownBasis(option) : defaultBasis(option)}`);
      sources.push(option.source);
    }
  }
  if (rest.length) { parts.push(`${valuesText(rest, def.unit)} chosen without a measured basis`); sources.push(`chosen: ${list(rest)}`); }
  const prefix = order.length ? prefixOf(options[order[0]], runId) : "chosen";
  const fallbackSource = () => {
    const short = `${severalRows(prefix, axis)}${rest.length ? `; chosen: ${list(rest)}` : ""}`;
    return short.length <= MAX_SOURCE ? short : severalRows(prefix, axis, " and chosen values");
  };
  const { statement, source } = fitted(def, chosen, def.sentence(chosen), parts.join("; "), sources.join("; "), fallbackSource);
  return { kind: "decision", axis, values: chosen, statement, approvedBy: "", date: "", source };
}

// --- a default control height (WO-20 C2) ---------------------------------------------------------------------

// The look the shipped components draw with a project's recipe: the recipe when the file has it, else null (the
// :root block), the height it draws by default, and the family it draws (engineDefault("controlHeights")).
function lookOf(defaults, recipe) {
  const drawn = engineDefault("controlHeights", defaults, { recipe });
  const id = drawn.id.slice("recipe.".length);
  return { recipe: id === "default" ? null : id, height: defaults.recipes[id].controlHeight, values: drawn.values };
}

// The statement names the default; the family clause holds only where the height is drawn, so it is conditional.
// Over 300 characters the family clause is shortened first, and only then does the basis become "see source".
function defaultHeightStatement(height, values, words) {
  const full = `Default controls are ${height}px tall; at that default the shipped components of this StyleSeed version draw ${list(values)}px. Basis: ${words}.`;
  if (full.length <= MAX_STATEMENT) return full;
  const short = (basis) => `Default controls are ${height}px tall (at that default, shipped sizes ${values[0]} to ${values.at(-1)}px). Basis: ${basis}.`;
  return short(words).length <= MAX_STATEMENT ? short(words) : short("see source");
}

// The basis of a default height a person chose: the first option of the control-height block that is not the
// engine default and holds the height. A reference or the product's own screens count as they stand; a corpus
// option counts when its row agrees, also behind another option, and is quoted by the counts of that height
// alone (two claims that agree on different values are one option). Otherwise the look's own default, or
// "chosen" beside the height the look draws.
function defaultHeightBasis(proposal, height, look) {
  const def = AXIS_DEF.get("controlHeights");
  const block = proposal.axes.find((entry) => entry.axis === def.axis);
  if (block.status === "recorded") throw new Error(`${def.axis}: recorded as ${block.recorded.id}, so its block has no options; read the basis from the proposal made without that decision`);
  const runId = proposal.pack.run;
  for (const option of block.options) {
    if (option.basis === "engine-default" || !option.values.includes(height)) continue;
    if (option.basis === "corpus") {
      if (block.corpus.status !== "agree") continue;
      const counts = option.counts.filter((c) => c.value === height);
      return { words: corpusBasis(runId, counts, def.unit), source: corpusSource(runId, counts), fallback: severalRows(`corpus:${runId}`, def.axis) };
    }
    return { words: option.basis === "reference" ? referenceBasis(option) : ownBasis(option), source: option.source, fallback: severalRows(prefixOf(option, runId), def.axis) };
  }
  const own = height === look.height;
  const words = look.recipe
    ? (own ? `engine default of brand recipe ${look.recipe}, not measured` : `chosen; brand recipe ${look.recipe} draws ${look.height}px by default`)
    : (own ? "engine default, not measured" : `chosen; the shipped components draw ${look.height}px by default`);
  const source = own ? `engine-default:recipe.${look.recipe ?? "default"} (not measured)` : `chosen: ${height}`;
  return { words, source, fallback: source };
}

/**
 * The `controlHeights` entry for a default control height: the height plus every offset the shipped components
 * draw (engine-defaults.json `controlHeight.offsets`), a statement that names the default, and a `source` that
 * starts with `default-height:<D>; ` (runtime-contract.mjs defaultHeightSource) and then says where the height
 * comes from. Without `basis` the basis is read from the proposal's control-height block (defaultHeightBasis);
 * on a recorded axis the block has no options, so pass the proposal made without the recorded decision. A caller
 * may hand in a basis of its own, `{words, source}`, printed after "Basis:" and after the token as given.
 * Pure; like every printed entry, it has no id, no name, and no date.
 * @param {object} proposal from proposeSystem (its recipe, surface, run, and control-height block)
 * @param {object} defaults engine defaults, normalized
 * @param {number} height the default control height in px
 * @returns {{entry: object, underFloor: number[], look: {recipe: string|null, height: number, values: number[]}}}
 *   underFloor: the entry's sizes under the touch floor on a touch surface (none on pointer); look: the recipe the
 *   file has (null for none or one it does not have), the height it draws by default, and the family it draws
 */
export function defaultHeightEntry(proposal, defaults, height, { basis = null } = {}) {
  if (!Number.isSafeInteger(height) || height < 1) throw new Error(`--default-height ${height}: give the default control height as a whole number of px, for example --default-height 32`);
  const offsets = defaults.controlHeight.offsets;
  const values = numeric(offsets.map((offset) => height + offset));
  if (values[0] < 1) throw new Error(`--default-height ${height}: the smallest size around it would be ${values[0]}px; give at least ${1 - offsets[0]}`);
  const look = lookOf(defaults, proposal.inputs.recipe);
  let words, source;
  if (basis !== null) {
    if (!isObject(basis) || !isText(basis.words, MAX_STATEMENT) || !isText(basis.source, MAX_SOURCE)) throw new Error("default height basis: pass {words, source}, each one line of text");
    words = basis.words;
    source = defaultHeightSource(height, basis.source);
    if (source.length > MAX_SOURCE) throw new Error(`default height basis: the source is ${source.length} characters with the token; a ledger source holds at most ${MAX_SOURCE}`);
  } else {
    const found = defaultHeightBasis(proposal, height, look);
    words = found.words;
    source = defaultHeightSource(height, found.source);
    if (source.length > MAX_SOURCE) source = defaultHeightSource(height, found.fallback);
  }
  const statement = defaultHeightStatement(height, values, words);
  const underFloor = proposal.inputs.surface === "touch" ? values.filter((value) => value < TOUCH_FLOOR.px) : [];
  return { entry: { kind: "decision", axis: "controlHeights", values, statement, approvedBy: "", date: "", source }, underFloor, look };
}

// A ledger holds at most one project-wide decision per axis (runtime-contract.mjs).
const projectWideHeight = (entry) => entry.kind === "decision" && entry.axis === "controlHeights" && !entry.scope;

/**
 * One entry, two printers (WO-20 S): the entry `defaultHeightEntry` builds for a default height from the proposal
 * the project would have without its project-wide `controlHeights` decision (scoped entries and exceptions stay).
 * `propose-system.mjs --default-height` prints it, and `system.take` offers it under "To take it". The second
 * proposal is made without its own `system`, so this never calls proposeSystem.
 * @param {object} input the proposer's inputs, as proposeSystem takes them
 * @param {number} height the default control height in px
 * @returns what defaultHeightEntry returns
 */
export function defaultHeightEntryFor(input, height) {
  const decisions = input.project.decisions ?? [];
  const without = decisions.filter((entry) => !projectWideHeight(entry));
  const { proposal } = proposeBlocks(without.length === decisions.length ? input : { ...input, project: { ...input.project, decisions: without } });
  return defaultHeightEntry(proposal, input.defaults, height);
}

// --- the system this project starts with (WO-20 S) -------------------------------------------------------------

const SYSTEM_CSS = "`.styleseed/system.css`";
// The words that depend on the look: the brand recipe the file has, or none (the :root block). None is built by
// adding 's to another. A corner is "pill corners", "square corners", or "<n>px" (cornerWords); a null control radius
// (a value that is not plain px) is "corner".
function lookWords(look) {
  const corner = (value) => (value === null ? "corner" : cornerWords(value));
  return look.recipe
    ? { look: "the brand recipe", lookX: `the brand recipe's ${look.height}px`, draws: "the brand recipe draws", own: "the brand recipe's own default", earlier: "an earlier own default of the brand recipe", corner: (value) => `the brand recipe's ${corner(value)}`, notFixed: "not a fixed value in this brand recipe" }
    : { look: "StyleSeed's default", lookX: `the default ${look.height}px`, draws: "the components draw", own: "StyleSeed's own default", earlier: "an earlier default of StyleSeed's own", corner: (value) => `the default ${corner(value)}`, notFixed: "not a fixed value" };
}
// The look a recorded default was taken from, read only from the exact form the proposer writes after the token,
// `engine-default:recipe.<id> (not measured)`; nothing a person typed reaches the table. `own` when <id> is this
// project's look (`default` for none).
function tookFrom(entry, look, defaults) {
  const rest = entry.source.slice(entry.source.indexOf("; ") + 2);
  const match = /^engine-default:recipe\.(.+) \(not measured\)$/u.exec(rest);
  const id = match ? match[1] : null;
  if (id === null) return { own: false, words: "the own default of another look" };
  if (id === (look.recipe ?? "default")) return { own: true, words: null };
  if (id === "default" && look.recipe) return { own: false, words: "StyleSeed's own default" };
  if (id !== "default" && Object.hasOwn(defaults.recipes, id)) return { own: false, words: `the own default of brand recipe \`${id}\`` };
  return { own: false, words: "the own default of another look" };
}

const ROW_NAMES = Object.freeze({
  controlHeight: "Default height of controls (buttons, inputs, selects, tabs)",
  controlRadius: "Corner of buttons and the controls that share it",
  fieldRadius: "Corner of inputs, selects, and textareas",
  insetRadius: "Corner of list rows",
  surfaceRadius: "Corner of cards",
  surfacePadding: "Padding inside a section card and the other pattern cards",
  sectionGap: "Gap between sections",
  pageGutter: "Side margin of the page",
});

/**
 * The system the project starts with: what the shipped components draw with its look, what its ledger records, and
 * what "To take it" offers. What `.styleseed/system.css` draws is read from systemCssDraws alone; the recorded
 * corners are the object proposeBlocks built for the `radii` block. The renderer prints sections 2 and 3 from this.
 * @returns {{look: {recipe: string|null, height: number, values: number[]}, heightRow: "H0"|"H1"|"H2"|"H3"|"H4",
 *   recorded: number|null, corners: {controlRadius: {id: string, value: number}|null, fieldRadius: {id: string, value: number}|null},
 *   intro: string, rows: {key: string, name: string, value: string, from: string}[], notes: string[],
 *   take: {kind: string, entry: object|null, id: string|null, height: number|null, pinned: boolean}}}
 */
function systemFor(input, proposal, corners) {
  const { defaults, project, context } = input;
  const look = lookOf(defaults, project.recipe ?? null);
  const shipped = defaults.recipes[look.recipe ?? "default"];
  const X = look.height;
  const w = lookWords(look);
  const registry = project.mode === "registry";
  const touch = context.surface === "touch";
  const { drawn, heightNotDrawn } = systemCssDraws(project.decisions ?? []);
  const drawnHeight = drawn.find((entry) => entry.axis === "controlHeights") ?? null;
  const recordedEntry = drawnHeight?.entry ?? heightNotDrawn?.entry ?? null;
  const id = recordedEntry?.id ?? null;
  let heightRow = "H0";
  let D = null;
  let took = null;
  if (drawnHeight) { heightRow = "H1"; D = drawnHeight.value; }
  else if (heightNotDrawn?.reason === "look-default") { D = parseDefaultHeight(recordedEntry).height; heightRow = D === X ? "H2" : "H3"; took = tookFrom(recordedEntry, look, defaults); }
  else if (heightNotDrawn) heightRow = "H4";

  // "To take it", in this order of precedence.
  let take;
  if (heightRow === "H1" || heightRow === "H2") take = { kind: "recorded", entry: null, id, height: D, pinned: false };
  else if (heightRow === "H4") take = { kind: "no-default", entry: null, id, height: recordedEntry.values.length === 1 ? recordedEntry.values[0] : null, pinned: false };
  else if (registry) take = { kind: "registry", entry: null, id, height: null, pinned: false };
  else if (touch && X < TOUCH_FLOOR.px) take = { kind: "floor", entry: null, id, height: TOUCH_FLOOR.px, pinned: false };
  else {
    const { entry } = defaultHeightEntryFor(input, X);
    take = { kind: heightRow === "H0" ? "entry" : "replace", entry, id, height: X, pinned: parseDefaultHeight(entry)?.lookDefault === false };
  }

  // The height row.
  let value, from;
  if (heightRow === "H0") {
    value = `${X}px; the other shipped sizes are ${list(look.values.filter((v) => v !== X))}px`;
    from = `${w.look}, not measured.${take.kind === "entry" ? " Not recorded; the entry under \"To take it\" records it." : " Not recorded."}`;
    const block = proposal.axes.find((entry) => entry.axis === "controlHeights");
    if (block.status === "proposed") {
      const first = block.options[block.proposed];
      const where = first.basis === "corpus" ? "the corpus, which measured desktop consoles" : first.basis === "own-screens" ? "this product's own screens" : `the project's reference \`${first.slug}\``;
      from += ` Block 1 proposes ${valuesText(first.values, "px")} from ${where}.`;
    }
  } else if (heightRow === "H1" || heightRow === "H2") {
    const rest = recordedEntry.values.filter((v) => v !== D);
    value = rest.length ? `${D}px; the other recorded sizes are ${list(rest)}px` : `${D}px`;
    if (heightRow === "H2") from = took.own ? `recorded as ${id} as ${w.own}; ${w.draws} it.` : `recorded as ${id} as ${took.words}; ${w.draws} the same height.`;
    else if (!registry) from = D !== X ? `recorded as ${id}. ${SYSTEM_CSS} draws it after a resolve, where the file is imported, in place of ${w.lookX}.` : `recorded as ${id}. ${SYSTEM_CSS} sets it after a resolve, where the file is imported, and keeps it if the look changes.`;
    else from = D !== X ? `recorded as ${id}. Not drawn for a registry project: the components draw ${w.lookX}.` : `recorded as ${id}; ${w.draws} the same height.`;
  } else if (heightRow === "H3") {
    value = `${D}px recorded; ${w.draws} ${X}px`;
    const ending = take.kind === "replace" ? ` The entry under "To take it" replaces ${id}.` : take.kind === "floor" ? " No entry is offered (touch, below)." : "";
    from = `recorded as ${id} as ${took.own ? w.earlier : took.words}, and ${registry ? "this artifact's look" : "this project's look"} now draws ${X}px.${ending}`;
  } else {
    value = `recorded sizes ${list(recordedEntry.values)}px`;
    from = `recorded as ${id} without a default height; ${w.draws} ${X}px by default.`;
  }

  // The rows. A corner prints as pill, square, or <n>px; a null (not plain px) as not a fixed value.
  const cornerValue = (v) => (v === null ? w.notFixed : v === 999 ? "pill" : v === 0 ? "square" : `${v}px`);
  const pxValue = (v) => (v === null ? w.notFixed : `${v}px`);
  const plain = `${w.look}, not measured`;
  const recordedCorners = { controlRadius: corners.controlRadius ?? null, fieldRadius: corners.fieldRadius ?? null };
  const control = recordedCorners.controlRadius;
  const field = recordedCorners.fieldRadius;
  const controlFrom = !control ? plain
    : control.value === shipped.controlRadius
      ? (registry ? `recorded as ${control.id}; ${w.draws} the same corner.` : `recorded as ${control.id}. ${SYSTEM_CSS} sets it after a resolve, where the file is imported, and keeps it if the look changes.`)
      : (registry ? `recorded as ${control.id}. Not drawn for a registry project: the components draw ${w.corner(shipped.controlRadius)}.` : `recorded as ${control.id}. ${SYSTEM_CSS} draws it after a resolve, where the file is imported, in place of ${w.corner(shipped.controlRadius)}.`);
  const fieldFrom = !field ? "the skin, not measured; no brand recipe sets it"
    : registry ? `recorded as ${field.id}. Not drawn for a registry project: the components draw the skin's corner.` : `recorded as ${field.id}. ${SYSTEM_CSS} draws it after a resolve, where the file is imported, in place of the skin's corner.`;
  const rows = [
    { key: "controlHeight", value, from },
    { key: "controlRadius", value: cornerValue(control ? control.value : shipped.controlRadius), from: controlFrom },
    { key: "fieldRadius", value: field ? cornerValue(field.value) : "the skin's corner", from: fieldFrom },
    { key: "insetRadius", value: cornerValue(shipped.insetRadius), from: plain },
    { key: "surfaceRadius", value: cornerValue(shipped.surfaceRadius), from: plain },
    { key: "surfacePadding", value: pxValue(shipped.surfacePadding), from: plain },
    { key: "sectionGap", value: pxValue(shipped.sectionGap), from: plain },
    { key: "pageGutter", value: pxValue(shipped.pageGutter), from: plain },
  ].map((row) => ({ key: row.key, name: ROW_NAMES[row.key], value: row.value, from: row.from }));

  // Under the table: the corner note, then the touch floor of the default height drawn here.
  const notes = [];
  if (control || field) notes.push("The drift report does not check a button's or a field's corner.");
  const drawnHere = heightRow === "H1" && !registry ? D : X;
  if (touch && drawnHere < TOUCH_FLOOR.px) notes.push(`Floor: rule \`${TOUCH_FLOOR.rule}\` says "${TOUCH_FLOOR.clause}". The default height drawn here, ${drawnHere}px, is under it.`);

  const intro = look.recipe
    ? `What the shipped components draw with brand recipe \`${look.recipe}\`${registry && context.artifact ? ` (artifact \`${context.artifact}\`)` : ""}, and what this project's ledger records. The brand recipe's values are engine defaults, not measured; counts over measured design systems are under "Details and counts".`
    : "What the shipped components draw for a project that names no brand recipe, and what this project's ledger records. These values are engine defaults, not measured; counts over measured design systems are under \"Details and counts\".";
  return { look, heightRow, recorded: D, corners: recordedCorners, intro, rows, notes, take };
}

// --- SYSTEM.md ------------------------------------------------------------------------------------------------

function commandFor(inputs) {
  return `propose-system.mjs --project-root .${inputs.artifact ? ` --artifact ${inputs.artifact}` : ""}${inputs.references.map((slug) => ` --reference ${slug}`).join("")}${inputs.own ? ` --own ${inputs.own}` : ""} --surface ${inputs.surface}`;
}

// "To take it": one entry, or one paragraph that says why there is none. Read from `system` and the command alone,
// except one clause of `no-default` that differs without a registry (the proposal's `inputs.mode`).
function takeLines(system, command, registry) {
  const { take, look } = system;
  const id = take.id;
  const json = (entry) => ["```json", JSON.stringify(entry, null, 2), "```"];
  const keeps = (height) => `\`.styleseed/system.css\` then sets ${height}px, which the look draws already, and keeps it if the look changes.`;
  if (take.kind === "recorded") return [`Nothing to record: the default height is recorded as \`${id}\`.`];
  if (take.kind === "no-default") {
    const head = `The control heights are recorded as \`${id}\` without a default height.`;
    if (take.height === null) return [`${head} To name one: \`${command} --default-height <px>\`; its entry goes in place of \`${id}\`.`];
    const drawsInstead = !registry && take.height !== look.height ? `, and \`.styleseed/system.css\` then draws ${take.height}px in place of ${lookWords(look).lookX}` : "";
    return [`${head} To make ${take.height}px the default height, with the sizes around it: \`${command} --default-height ${take.height}\`; its entry goes in place of \`${id}\`${drawsInstead}.`];
  }
  if (take.kind === "registry") return ["No entry is offered in a registry project: a decision there is project-wide, and its artifacts can have different looks. What block 1 prints is project-wide too. A height for one artifact is a decision with `scope.artifacts`; the drift report applies it to the screens named in its `scope.screens`."];
  if (take.kind === "floor") return [`No entry is offered: the height the look draws, ${look.height}px, is under the touch floor (rule \`${TOUCH_FLOOR.rule}\`). To record a default of ${take.height}px with the sizes around it: \`${command} --default-height ${take.height}\`${id ? `; its entry goes in place of \`${id}\`.` : "."}`];
  if (take.kind === "entry") {
    const effect = take.pinned
      ? `Recording it changes no size today: ${keeps(take.height)} The drift report then reads any other control height as \`violates\`.`
      : "Recording it changes nothing that is drawn; the drift report then reads any other control height as `violates`.";
    return ["One entry records the default height above with the sizes around it:", "", ...json(take.entry), "", `It is what \`${command} --default-height ${take.height}\` prints. Record it under the name of the person who decides, as "Recording" says. ${effect} The other rows need no entry. Block 1 is about this same height: what it prints gives another \`controlHeights\` entry, and a ledger holds one project-wide decision on an axis. The blocks from 2 on are separate choices.`];
  }
  return [`This entry replaces \`${id}\`, whose default the look does not draw:`, "", ...json(take.entry), "", `It is what \`${command} --default-height ${take.height}\` prints. Put it in place of \`${id}\` and keep the id \`${id}\`, with the name of the person who decides and today's date.${take.pinned ? ` ${keeps(take.height)}` : ""}`];
}

/**
 * The proposal as SYSTEM.md. Counts only: no score, no review, and none of the words the wording test bans. It
 * opens with the system this project starts with and "To take it", printed from `p.system` and the command, then
 * the blocks under "Details and counts".
 * @param {object} p the proposal from proposeSystem
 * @param {{command?: string}} [options] the command prefix printed before `--entry` and `--default-height`
 *   (default: from the inputs, without `--page`; propose-system.mjs passes its own, which carries it)
 */
export function renderProposalMarkdown(p, { command = commandFor(p.inputs) } = {}) {
  const out = [];
  const share = p.rule.shareNum === 2 && p.rule.shareDen === 3 ? "two thirds" : `${p.rule.shareNum}/${p.rule.shareDen}`;
  const fragmentOnly = p.pack.fragmentOnly ? `, ${p.pack.fragmentOnly === 1 ? "1 more on a form fragment only" : `${p.pack.fragmentOnly} more on form fragments only`}` : "";
  out.push(`# System proposal — ${p.inputs.page} page, ${p.inputs.surface} input`, "");
  out.push("The tool records nothing. The first section shows what this project draws today and what its ledger already records. Each block under \"Details and counts\" is a count and a choice that stays with the person who decides for this project. Nothing here reviews the product, and the drift report holds the project to a value only once it is recorded in the ledger under that person's name.", "");
  const { system } = p;
  out.push("## The system this project starts with", "", system.intro, "", "| | Value | Where it comes from |", "|---|---|---|", ...system.rows.map((row) => `| ${row.name} | ${row.value} | ${row.from} |`), "");
  for (const note of system.notes) out.push(note, "");
  out.push("## To take it", "", ...takeLines(system, command, p.inputs.mode === "registry"), "");
  out.push("## Details and counts", "");
  out.push(`- Corpus: run \`${p.pack.run}\`. ${plural(p.pack.withScreens, "design system", "design systems")} measured on full product screens (${plural(p.pack.productSystems, "product system", "product systems")}, ${plural(p.pack.kits, "kit", "kits")}; ${plural(p.pack.screens, "published demo screen", "published demo screens")})${fragmentOnly}. Desktop consoles at ${p.pack.viewports[0]} wide${p.pack.viewports[1] ? `, the same pages narrowed to ${p.pack.viewports[1]}` : ""}; ${p.pack.touch ? "touch input measured" : "no touch measurement"}. One system counts once.`);
  out.push(`- Project: page \`${p.inputs.page}\` (corpus rows: ${p.inputs.pageRow === "all" ? "all page types pooled" : p.inputs.pageRow}) · density \`${p.inputs.density ?? "not set"}\` · brand recipe \`${p.inputs.recipe ?? "not resolved"}\` · ledger \`${p.ledger.path}\` (${plural(p.ledger.entries, "entry", "entries")}; next id \`${p.ledger.nextId}\`)`);
  out.push(`- Rule: a corpus value is proposed when it leads on at least ${p.rule.minLineages} measured systems, on at least ${share} of the systems measured for its row, with at least ${plural(p.rule.minProductSystems, "product system", "product systems")} among them. Below that the counts are shown and nothing is proposed.`);
  if (p.inputs.surface === "touch" && !p.pack.touch) out.push("- **This run holds no touch measurement, so nothing below is proposed from the corpus.** To get a measured basis, measure a reference you choose or your own screens and pass it with `--reference <slug>`.");
  out.push("");
  p.axes.forEach((a, index) => {
    const def = AXIS_DEF.get(a.axis);
    const v = (values) => valuesText(values, def.unit);
    const first = a.options[0] ?? null;
    out.push(`## ${index + 1}. ${a.title} (\`${a.axis}\`)`, "");
    if (a.status === "recorded") out.push(`**Recorded: ${v(a.recorded.values)}** as ${a.recorded.id} (${a.recorded.by}, ${a.recorded.date}). Nothing is proposed for a recorded axis.`);
    else if (a.status === "proposed") out.push(`**Proposed: ${v(first.values)}**${a.partial ? " — one part of this axis, not the whole set" : ""} — ${first.basis === "corpus" ? "from the corpus" : first.basis === "own-screens" ? "from this product's own screens" : `from the project's reference \`${first.slug}\` (${first.kept ? "kept in its contract" : "measured, not kept in a contract"})`}.`);
    else if (a.status === "split") out.push("**No value proposed: the measured systems split.**");
    else if (a.status === "thin") out.push(`**No value proposed: fewer than ${p.rule.minMeasured} measured systems.**`);
    else out.push(`**No measured basis.**${a.corpus.reason === "touch" ? " The corpus has no touch measurement." : a.corpus.reason === "no-claim" ? " The corpus has no row for this axis yet." : ""}`);
    out.push("");
    const bullets = [...(a.own ? [`- ${a.own.text}`] : []), ...a.corpus.lines.map((line) => `- ${line.text}`)];
    if (a.corpus.notes.length) bullets.push(`- Also measured: ${a.corpus.notes.map((note) => note.text).join(" ")}`);
    if (a.floor) bullets.push(`- Floor: rule \`${a.floor.rule}\` says "${a.floor.clause}".`);
    if (a.status !== "recorded") {
      const said = { input: `input mode (this proposal is for ${p.inputs.surface} input)`, density: `density (the project says \`${p.inputs.density ?? "not set"}\`)`, recipe: `the brand recipe (the project says \`${p.inputs.recipe ?? "not resolved"}\`)` };
      if (def.depends.length) bullets.push(`- Depends on: ${def.depends.map((key) => said[key]).join(" and ")}. The corpus measures ${def.depends.length > 1 ? "neither relationship" : "no such relationship"}.`);
      const optionText = (o) => `${v(o.values)} (${o.basis === "corpus" ? o.counts.map((c) => `${c.lineages} of ${c.measured}`).join(", ") : o.basis === "reference" ? `reference \`${o.slug}\`, ${o.kept ? "kept" : "measured"}` : o.basis === "own-screens" ? "this product's own screens" : `engine default, not measured: ${o.from}`}${o.underFloor ? `; ${v(o.underFloor)} ${o.underFloor.length === 1 ? "is" : "are"} under the floor` : ""})`;
      const rest = a.options.filter((_, i) => i !== a.proposed);
      if (rest.length) bullets.push(`- ${a.proposed === null ? "Options" : "Other options"}: ${rest.map(optionText).join(" · ")}.`);
      if (a.partial) bullets.push(`- Before recording: this holds ${first.values.length === 1 ? "one value" : `${first.values.length} values`} of a larger set. Add the other values the product uses with \`--entry ${a.axis}=<all values>\`; they have no measured basis here, and the entry's \`source\` says so.`);
      // A `radii` decision must hold every recorded corner (runtime-contract.mjs): the ready entry's lacking
      // corners, ascending, control first on a tie, and the command whose entry holds them.
      if (a.axis === "radii" && a.proposed !== null) {
        const { controlRadius, fieldRadius } = p.system.corners;
        const lacking = [controlRadius && { ...controlRadius, title: "control corner" }, fieldRadius && { ...fieldRadius, title: "field corner" }]
          .filter((corner) => corner && !first.values.includes(corner.value)).sort((left, right) => left.value - right.value);
        if (lacking.length) bullets.push(`- Before recording: this entry lacks the recorded ${lacking.map((corner) => `${corner.title} ${corner.value} (${corner.id})`).join(" and ")}, and a \`radii\` decision must hold every recorded corner. Take the entry from \`${command} --entry radii=${numeric([...first.values, ...lacking.map((corner) => corner.value)]).join(",")}\` instead, or the next resolve refuses the ledger.`);
      }
      bullets.push(`- If recorded: ${def.effect}.${a.own?.violationsText ? ` ${a.own.violationsText}` : ""}`);
    }
    if (a.scoped.length) bullets.push(`- Scoped entries already on this axis: ${a.scoped.join(", ")}.`);
    if (bullets.length) out.push(...bullets, "");
    if (a.status !== "recorded") {
      // Block 1: a height the corpus proposes is taken with its family from --default-height (K10), and nothing
      // proposed names --default-height before a set the project brings (M7). Own screens and a reference keep
      // their entry.
      if (a.axis === "controlHeights" && a.proposed !== null && first.basis === "corpus") out.push(first.values.length === 1 ? `To record ${first.values[0]}px as the default height, with the sizes around it: \`${command} --default-height ${first.values[0]}\`` : `To record one of these as the default height, with the sizes around it: \`${command} --default-height <px>\``);
      else if (a.proposed !== null) out.push("```json", JSON.stringify(first.entry, null, 2), "```");
      else if (a.axis === "controlHeights") out.push(`Entry for a default height, with the sizes around it: \`${command} --default-height <px>\`. Entry for a set the project brings: \`${command} --entry controlHeights=<values>\``);
      else out.push(`Entry for a chosen value: \`${command} --entry ${a.axis}=<values>\``);
      out.push("");
    }
  });
  out.push("## Measured systems", "", `${p.pack.systems.map((s) => `${s.name} (${s.kind === "kit" ? "kit" : "product system"}, ${s.screens ? plural(s.screens, "screen", "screens") : `${s.fragments === 1 ? "1 form fragment" : `${s.fragments} form fragments`} only`})`).join(" · ")}. Published demo screens, measured ${p.pack.run}. Per-system values are in the StyleSeed repository, with that run.`, "");
  out.push("## Recording", "", `Append the entries the person chose to \`${p.ledger.path}\`${p.inputs.mode === "registry" ? " (`decisions`)" : " (a JSON array; create it when missing)"}, give each the next \`D-\` number, and fill \`approvedBy\` with the name the person gives and \`date\` with today's date. An entry with an empty name does not compile. Then resolve again; the bundle lists the entries under "Project decisions" and the drift report measures against them.`, "");
  return out.join("\n");
}

// --- engine defaults against the corpus ------------------------------------------------------------------------

const px4 = (value) => Math.round(value / 4) * 4;
// The fullest row of a claim at a viewport, for a page type with no row of its own (table row height is
// measured on list pages only).
function fullestRow(pack, claim, viewport) {
  return pack.rows.filter((row) => row.claim === claim && row.measured > 0 && (row.viewport === viewport || row.viewport === "both"))
    .sort((a, b) => b.measured - a.measured || ROW_ORDER.indexOf(a.pageType) - ROW_ORDER.indexOf(b.pageType))[0] ?? null;
}

/**
 * One row per shipped value, set beside the corpus row for the same role. Heights are compared after
 * rounding to the nearest 4px, as the corpus buckets are. Counts only; it changes nothing.
 * @returns {{run: string, page: string, pageRow: string, rows: {item: string, value: string, claim: string|null, label: string, row: string, where: string}[]}}
 */
export function engineDefaultsTable(pack, defaults, { page = "form", rule = PROPOSAL_RULE } = {}) {
  const pageRow = PAGE_ROWS[page] ?? "all";
  const rows = [];
  const place = (item, value, claimId, { height }) => {
    const claim = pack.claims.find((entry) => entry.id === claimId) ?? null;
    const unit = claim?.unit ?? "px";
    const row = claim ? (selectRow(pack, claimId, { page, viewport: 1440 }, rule) ?? fullestRow(pack, claimId, 1440)) : null;
    if (!row || row.measured === 0) { rows.push({ item, value: `${value}px`, claim: claimId, label: claim?.label ?? claimId, row: "—", where: "no corpus row" }); return; }
    const compared = height ? px4(value) : Math.round(value);
    const { status, lead } = rowStatus(row, rule);
    const hit = row.buckets.find((entry) => entry.value === compared);
    let where = hit && lead && lead.value === compared ? `the leading bucket (${hit.lineages} of ${row.measured})` : hit ? `a bucket held by ${hit.lineages} of ${row.measured}` : "in no bucket";
    const fragment = !hit && row.withFragments ? row.withFragments.buckets.find((entry) => entry.value === compared) : null;
    if (fragment) where += ` (with form fragments: ${compared}${unit} on ${fragment.lineages} of ${row.withFragments.measured})`;
    if (status === "thin") where += `; fewer than ${rule.minMeasured} measured`;
    rows.push({ item, value: `${value}px`, claim: claimId, label: `${claim.label}${row.pageType !== pageRow ? ` (${pageText(row.pageType)})` : ""}`, row: row.buckets.map((entry, index) => `${valueText(entry.value, unit)} on ${entry.lineages}${index === 0 ? ` of ${row.measured}` : ""}`).join("; "), where });
  };
  const { button, input, select, table } = defaults.components;
  const ordered = (sized) => [...sized.sizes.filter((size) => size.key === sized.defaultSize), ...sized.sizes.filter((size) => size.key !== sized.defaultSize)];
  for (const size of ordered(button)) {
    const item = `Button \`${size.key}\`${size.key === button.defaultSize ? " (default)" : ""}`;
    if (size.text === null) rows.push({ item, value: `${size.height}px`, claim: null, label: "none", row: "—", where: "not compared: a size without a text label; the corpus reads buttons with a visible label" });
    else place(item, size.height, "button.height", { height: true });
  }
  place("Input", input.height, "field.height", { height: true });
  for (const size of ordered(select)) place(`Select \`${size.key}\`${size.key === select.defaultSize ? " (default)" : ""}`, size.height, "field.height", { height: true });
  place("Table header cell", table.headHeight, "table.rowHeight", { height: true });
  place("Input text from 768 wide", input.textFromMd, "field.textSize", { height: false });
  place("Input text under 768 wide", input.text, "field.textSize", { height: false });
  place("Select text", select.sizes.find((size) => size.key === select.defaultSize).text, "field.textSize", { height: false });
  place("Table text", table.text, "text.bodySize", { height: false });
  // The rows above read every height at the :root value; the recipes move them together (WO-17 B4).
  const byHeight = new Map();
  for (const [id, recipe] of Object.entries(defaults.recipes)) byHeight.set(recipe.controlHeight, [...(byHeight.get(recipe.controlHeight) ?? []), id]);
  const heights = numeric([...byHeight.keys()]);
  rows.push({ item: "Default control height", value: `by brand recipe, ${heights[0]} to ${heights.at(-1)}px (${heights.map((height) => `${height}px: ${byHeight.get(height).join(", ")}`).join(" · ")})`, claim: null, label: "none", row: "—", where: "compared per component above" });
  const radii = Object.values(defaults.recipes).flatMap((recipe) => [recipe.controlRadius, recipe.insetRadius, recipe.surfaceRadius]).filter((value) => value !== null);
  rows.push({ item: "Control, inset, and surface radius", value: `by brand recipe, ${Math.min(...radii)} to ${Math.max(...radii)}px`, claim: null, label: "none", row: "—", where: "no corpus claim until a run measures radius" });
  const base = defaults.spacingScale.values.reduce((a, b) => gcd(a, b));
  rows.push({ item: "Spacing steps", value: `${list(defaults.spacingScale.values)}px (rule \`${defaults.spacingScale.rule}\`, multiples of ${base})`, claim: null, label: "none", row: "—", where: "no corpus claim until a run measures spacing" });
  return { run: pack.run.id, page, pageRow, rows };
}

export function renderEngineDefaultsMarkdown(table) {
  const out = [
    `# Engine defaults against the corpus — ${table.page} page, pointer input`,
    "",
    `What the engine ships, read from its component sources, brand recipes, and rule catalog, beside the corpus row for the same role (corpus run \`${table.run}\`; the ${table.page} page reads the ${table.pageRow === "all" ? "pooled" : table.pageRow} rows). Shipped values are not measured. A corpus row counts what the published demo screens of a few design systems rendered on the run's date, one system once; it is not a review of the engine. Heights are compared after rounding to the nearest 4px, as the corpus buckets are. Nothing here changes a component or a rule.`,
    "",
    "| Shipped | Value | Corpus claim | Row | Where the shipped value sits |",
    "|---|---|---|---|---|",
  ];
  let previous = null;
  for (const row of table.rows) {
    const same = previous && row.claim !== null && previous.claim === row.claim && previous.label === row.label && previous.row === row.row;
    out.push(`| ${row.item} | ${row.value} | ${same ? "same" : row.label} | ${same ? "same" : row.row} | ${row.where} |`);
    previous = row;
  }
  return `${out.join("\n")}\n`;
}
