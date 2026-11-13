// System proposal (WO-11 A4): for each ledger axis, the values a person may record and the basis of each,
// strongest first: the project's recorded decision, the person's own measurement (a reference kept in an
// approved contract, then a reference measured but not kept), corpus counts from the evidence pack, and
// last the engine default, always labelled not measured. A proposal is a count and a choice: it states
// what was measured, on how many systems of which kind, and leaves the value to the person. Nothing is
// scored, nothing gates, and no entry it prints compiles: `approvedBy` and `date` stay empty until the
// person who decides puts their name on it. Pure: no I/O, no clock; the same input gives the same bytes.
import { FACT_LEDGER, isApproved, proposeDecisions } from "./reference-contract.mjs";

export const PROPOSAL_VERSION = 1;
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

// --- skill data: strict shape checks ----------------------------------------------------------------------

const REBUILD = "rebuild with `node scripts/build-evidence-pack.mjs`, or reinstall the skill";
const CONTROL = /[\u0000-\u001f\u007f]/u;
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isPositive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isText = (value, max) => typeof value === "string" && value.length >= 1 && value.length <= max && !CONTROL.test(value);
function checker(file) {
  const fail = (where, message) => { throw new Error(`${file}: ${where}: ${message}; ${REBUILD}`); };
  const keys = (value, wanted, where) => {
    if (!isObject(value)) fail(where, "must be an object");
    const extra = Object.keys(value).filter((key) => !wanted.includes(key));
    const missing = wanted.filter((key) => !Object.hasOwn(value, key));
    if (extra.length) fail(where, `unknown key(s) ${extra.join(", ")}`);
    if (missing.length) fail(where, `missing ${missing.join(", ")}`);
  };
  const array = (value, where, { min = 0 } = {}) => { if (!Array.isArray(value) || value.length < min) fail(where, min ? `must be a non-empty array` : "must be an array"); return value; };
  const version = (value, where) => {
    if (!Number.isInteger(value) || value < 1) fail(where, "must be 1");
    if (value > 1) fail(where, `is ${value}, newer than this proposer reads (1)`);
  };
  return { fail, keys, array, version };
}
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
  version(input.schemaVersion, "schemaVersion");
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

const RECIPE_KEYS = ["controlRadius", "insetRadius", "surfaceRadius", "sectionGap", "pageGutter", "surfacePadding"];
/**
 * The shipped engine defaults (ss-resolve/references/engine-defaults.json), checked strictly and copied.
 * @param {object} input parsed JSON
 * @param {{file?: string}} [options] the path printed in errors
 */
export function normalizeEngineDefaults(input, { file = "engine-defaults.json" } = {}) {
  const { fail, keys, array, version } = checker(file);
  keys(input, ["schemaVersion", "generatedBy", "measured", "components", "recipes", "spacingScale"], "defaults");
  version(input.schemaVersion, "schemaVersion");
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
  if (!isObject(input.recipes) || !Object.keys(input.recipes).length) fail("recipes", "must map recipe ids to their radii and gaps");
  const recipes = {};
  for (const [id, recipe] of Object.entries(input.recipes)) {
    keys(recipe, RECIPE_KEYS, `recipes.${id}`);
    recipes[id] = Object.fromEntries(RECIPE_KEYS.map((key) => [key, numberOrNull(recipe[key], `recipes.${id}.${key}`)]));
  }
  keys(input.spacingScale, ["rule", "values"], "spacingScale");
  if (!isText(input.spacingScale.rule, 80)) fail("spacingScale.rule", "must be a rule id");
  const values = array(input.spacingScale.values, "spacingScale.values", { min: 1 }).map((value, index) => positive(value, `spacingScale.values[${index}]`));
  return { schemaVersion: input.schemaVersion, generatedBy: input.generatedBy, measured: false, components: { button, input: inputPart, select, table }, recipes, spacingScale: { rule: input.spacingScale.rule, values } };
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
const joinAnd = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/**
 * The shipped value of an axis, or null when the engine ships none for it.
 * @returns {{id: string, values: number[], from: string} | null}
 */
export function engineDefault(axis, defaults, { recipe = null, surface = "pointer" } = {}) {
  const { button, input, select, table } = defaults.components;
  const mainButton = button.sizes.find((size) => size.key === button.defaultSize);
  const mainSelect = select.sizes.find((size) => size.key === select.defaultSize);
  if (axis === "controlHeights") {
    if (surface !== "touch") return { id: "components", values: numeric([mainButton.height, input.height, mainSelect.height]), from: `button ${mainButton.key} ${mainButton.height}px, input ${input.height}px, select ${mainSelect.height}px` };
    const tall = [
      ...button.sizes.filter((size) => size.height >= TOUCH_FLOOR.px).map((size) => ({ text: `button ${size.key} ${size.height}px`, height: size.height })),
      ...(input.height >= TOUCH_FLOOR.px ? [{ text: `input ${input.height}px`, height: input.height }] : []),
      ...select.sizes.filter((size) => size.height >= TOUCH_FLOOR.px).map((size) => ({ text: `select ${size.key} ${size.height}px`, height: size.height })),
    ];
    if (!tall.length) return null;
    const under = [[`the default button ${mainButton.height}px`, mainButton.height], [`input ${input.height}px`, input.height], [`select ${mainSelect.height}px`, mainSelect.height]].filter(([, height]) => height < TOUCH_FLOOR.px).map(([text]) => text);
    return { id: "components", values: numeric(tall.map((item) => item.height)), from: `${tall.map((item) => item.text).join(", ")}${under.length ? `; ${joinAnd(under)} ${under.length === 1 ? "is" : "are"} under ${TOUCH_FLOOR.px}px` : ""}` };
  }
  if (axis === "typeSizes") {
    if (surface !== "touch") return { id: "components", values: numeric([mainButton.text, input.textFromMd, mainSelect.text, table.text]), from: `button ${mainButton.key} ${mainButton.text}px, input ${input.textFromMd}px from 768 wide, select ${mainSelect.text}px, table ${table.text}px` };
    return { id: "components", values: numeric([mainButton.text, input.text, table.text]), from: `button ${mainButton.key} ${mainButton.text}px, input ${input.text}px under 768 wide, table ${table.text}px` };
  }
  if (axis === "radii") {
    const entry = recipe ? defaults.recipes[recipe] : null;
    if (!entry) return null;
    const values = numeric([entry.controlRadius, entry.insetRadius, entry.surfaceRadius].filter((value) => value !== null));
    if (!values.length) return null;
    const part = (label, value) => (value === null ? null : `${label} ${value}px`);
    return { id: `recipe.${recipe}`, values, from: `brand recipe ${recipe}: ${[part("control", entry.controlRadius), part("inset", entry.insetRadius), part("surface", entry.surfaceRadius)].filter(Boolean).join(", ")}` };
  }
  if (axis === "tableRowHeights") return { id: "components", values: [table.headHeight], from: `table header cell ${table.headHeight}px; body rows have no fixed height` };
  if (axis === "spacingBase") {
    const base = defaults.spacingScale.values.reduce((a, b) => gcd(a, b));
    return { id: `rule.${defaults.spacingScale.rule}`, values: [base], from: `every step of the starting scale in rule ${defaults.spacingScale.rule} is a multiple of ${base}` };
  }
  return null;
}

// --- a measured reference (level 2) ---------------------------------------------------------------------------

const TOKEN_REFERENCE_AXES = Object.freeze(["controlHeights", "radii", "typeSizes", "spacingBase", "spacingScale"]);
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
    set("spacingBase", summary.spacingBase === null || summary.spacingBase === undefined ? [] : [summary.spacingBase], "tokens.spacingBase");
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
const defaultBasis = (option) => `engine default, not measured (${option.from})`;
const basisText = (def, option, runId) => (option.basis === "corpus" ? corpusBasis(runId, option.counts, def.unit) : option.basis === "reference" ? referenceBasis(option) : defaultBasis(option));
function sentenceFor(def, option) {
  if (option.basis !== "corpus" || option.counts.some(isFlagCount)) return def.sentence(option.values);
  const clauses = option.values.map((value) => {
    const labels = [...new Set(option.counts.filter((c) => c.value === value).map((c) => c.label))];
    return `the ${labels.join(" and the ")} ${labels.length > 1 ? "are" : "is"} ${value}${def.unit}`;
  });
  return `${cap(clauses.join("; "))}.`;
}
const prefixOf = (option, runId) => (option.basis === "corpus" ? `corpus:${runId}` : option.basis === "reference" ? `${option.kept ? "reference" : "measured"}:${option.slug}` : option.source.split(" ")[0]);
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
 * @param {{pack: object, defaults: object, project: {mode: string, decisions: object[], density: string|null, recipe: string|null, ledger: {path: string, entries: number, nextId: string}}, context: {artifact?: string|null, page: string, surface: "pointer"|"touch"}, references?: object[], own?: null, rule?: object}} input
 *   pack and defaults normalized; project.decisions normalized (normalizeDecisions); references are
 *   referenceValues results in the order given; own is reserved for proposals from the product's own
 *   measured screens (a later part) and must be null here.
 * @returns {object} the proposal (written as .styleseed/proposals/system.json)
 */
export function proposeSystem({ pack, defaults, project, context, references = [], own = null, rule = PROPOSAL_RULE }) {
  if (own !== null) throw new Error("proposals from the product's own screens are not part of this version of the proposer; pass own: null");
  const decisions = project.decisions ?? [];
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
    options.push(...corpus.options);
    const fallback = engineDefault(def.axis, defaults, { recipe: project.recipe, surface: context.surface });
    if (fallback) options.push({ basis: "engine-default", values: fallback.values, from: fallback.from, source: `engine-default:${fallback.id} (not measured)` });
    if (!def.core && !recorded && !options.some((option) => option.basis !== "engine-default")) continue;
    const first = options[0] ?? null;
    const proposed = !recorded && first && (first.basis === "reference" || (first.basis === "corpus" && corpus.status === "agree")) ? 0 : null;
    const status = recorded ? "recorded" : proposed !== null ? "proposed" : corpus.status === "split" ? "split" : corpus.status === "thin" ? "thin" : "unmeasured";
    const floor = context.surface === "touch" && def.axis === "controlHeights" ? TOUCH_FLOOR : null;
    axes.push({
      axis: def.axis, title: def.title, status, partial: proposed !== null && first.partial === true,
      recorded: recorded ? { id: recorded.id, values: [...recorded.values], by: recorded.approvedBy, date: recorded.date } : null, scoped,
      corpus: { status: corpus.status, reason: corpus.reason, lines: corpus.lines, notes: corpus.notes }, floor,
      options: recorded ? [] : options.map((option) => {
        const under = floor ? option.values.filter((value) => value < floor.px) : [];
        return { ...option, ...(under.length ? { underFloor: under } : {}), entry: entryFor(def, option, pack.run.id) };
      }),
      proposed,
    });
  }
  const withScreens = pack.lineages.filter((lineage) => lineage.screens > 0);
  return {
    proposalVersion: PROPOSAL_VERSION,
    inputs: { mode: project.mode, artifact: context.artifact ?? null, page: context.page, pageRow: PAGE_ROWS[context.page] ?? "all", surface: context.surface, density: project.density ?? null, recipe: project.recipe ?? null, references: references.map((ref) => ref.slug), own: null },
    pack: {
      run: pack.run.id, lineages: pack.lineages.length, withScreens: withScreens.length,
      productSystems: withScreens.filter((lineage) => lineage.kind === "product-system").length, kits: withScreens.filter((lineage) => lineage.kind === "kit").length,
      fragmentOnly: pack.lineages.length - withScreens.length, screens: withScreens.reduce((sum, lineage) => sum + lineage.screens, 0),
      viewports: pack.run.viewports.map((pair) => pair[0]), touch: pack.run.touch === true,
      systems: pack.lineages.map((lineage) => ({ name: lineage.name, kind: lineage.kind, screens: lineage.screens, fragments: lineage.fragments })),
    },
    rule: { ...rule }, ledger: { ...project.ledger }, axes,
  };
}

/**
 * The entry for a value set the person chose on one axis. Values equal (as a set) to an option's values give
 * that option's entry, the first in order; otherwise each value is attributed to the first option that holds
 * it and the rest are listed as chosen without a measured basis. A recorded axis is an error. Like every
 * printed entry, it has no id, no name, and no date.
 */
export function entryForValues(proposal, axis, values) {
  const def = AXIS_DEF.get(axis);
  if (!def) throw new Error(`--entry ${axis}: not an axis the proposer covers (${PROPOSAL_AXES.map((entry) => entry.axis).join(", ")})`);
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
      parts.push(`${valuesText(held, def.unit)} ${option.basis === "reference" ? referenceBasis(option) : defaultBasis(option)}`);
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

// --- SYSTEM.md ------------------------------------------------------------------------------------------------

function commandFor(inputs) {
  return `propose-system.mjs --project-root .${inputs.artifact ? ` --artifact ${inputs.artifact}` : ""}${inputs.references.map((slug) => ` --reference ${slug}`).join("")} --surface ${inputs.surface}`;
}

/**
 * The proposal as SYSTEM.md. Counts only: no score, no review, and none of the words the wording test bans.
 * @param {object} p the proposal from proposeSystem
 * @param {{command?: string}} [options] the command prefix printed before `--entry` (default: from the inputs)
 */
export function renderProposalMarkdown(p, { command = commandFor(p.inputs) } = {}) {
  const out = [];
  const share = p.rule.shareNum === 2 && p.rule.shareDen === 3 ? "two thirds" : `${p.rule.shareNum}/${p.rule.shareDen}`;
  const fragmentOnly = p.pack.fragmentOnly ? `, ${p.pack.fragmentOnly === 1 ? "1 more on a form fragment only" : `${p.pack.fragmentOnly} more on form fragments only`}` : "";
  out.push(`# System proposal — ${p.inputs.page} page, ${p.inputs.surface} input`, "");
  out.push("Not recorded. Each block is a count and a choice that stays with the person who decides for this project. Nothing here reviews the product, and no value is in force until it is recorded in the ledger under that person's name.", "");
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
    else if (a.status === "proposed") out.push(`**Proposed: ${v(first.values)}**${a.partial ? " — one part of this axis, not the whole set" : ""} — ${first.basis === "corpus" ? "from the corpus" : `from the project's reference \`${first.slug}\` (${first.kept ? "kept in its contract" : "measured, not kept in a contract"})`}.`);
    else if (a.status === "split") out.push("**No value proposed: the measured systems split.**");
    else if (a.status === "thin") out.push(`**No value proposed: fewer than ${p.rule.minMeasured} measured systems.**`);
    else out.push(`**No measured basis.**${a.corpus.reason === "touch" ? " The corpus has no touch measurement." : a.corpus.reason === "no-claim" ? " The corpus has no row for this axis yet." : ""}`);
    out.push("");
    const bullets = a.corpus.lines.map((line) => `- ${line.text}`);
    if (a.corpus.notes.length) bullets.push(`- Also measured: ${a.corpus.notes.map((note) => note.text).join(" ")}`);
    if (a.floor) bullets.push(`- Floor: rule \`${a.floor.rule}\` says "${a.floor.clause}".`);
    if (a.status !== "recorded") {
      const said = { input: `input mode (this proposal is for ${p.inputs.surface} input)`, density: `density (the project says \`${p.inputs.density ?? "not set"}\`)`, recipe: `the brand recipe (the project says \`${p.inputs.recipe ?? "not resolved"}\`)` };
      if (def.depends.length) bullets.push(`- Depends on: ${def.depends.map((key) => said[key]).join(" and ")}. The corpus measures ${def.depends.length > 1 ? "neither relationship" : "no such relationship"}.`);
      const optionText = (o) => `${v(o.values)} (${o.basis === "corpus" ? o.counts.map((c) => `${c.lineages} of ${c.measured}`).join(", ") : o.basis === "reference" ? `reference \`${o.slug}\`, ${o.kept ? "kept" : "measured"}` : `engine default, not measured: ${o.from}`}${o.underFloor ? `; ${v(o.underFloor)} ${o.underFloor.length === 1 ? "is" : "are"} under the floor` : ""})`;
      const rest = a.options.filter((_, i) => i !== a.proposed);
      if (rest.length) bullets.push(`- ${a.proposed === null ? "Options" : "Other options"}: ${rest.map(optionText).join(" · ")}.`);
      if (a.partial) bullets.push(`- Before recording: this holds ${first.values.length === 1 ? "one value" : `${first.values.length} values`} of a larger set. Add the other values the product uses with \`--entry ${a.axis}=<all values>\`; they have no measured basis here, and the entry's \`source\` says so.`);
      bullets.push(`- If recorded: ${def.effect}.`);
    }
    if (a.scoped.length) bullets.push(`- Scoped entries already on this axis: ${a.scoped.join(", ")}.`);
    if (bullets.length) out.push(...bullets, "");
    if (a.status !== "recorded") {
      if (a.proposed !== null) out.push("```json", JSON.stringify(first.entry, null, 2), "```");
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
