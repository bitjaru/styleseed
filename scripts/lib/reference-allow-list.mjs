// Allow-list for what the reference probes write. Every string (values and object keys) in the
// observe-structure output, in the `structure` block of summary.json, and in
// measurements/facts.json must be built from numbers, CSS colour
// strings, CSS easing functions, punctuation, and the vocabulary below: field names, enums, and
// fact-id segments. Page text, selectors, class names, element ids, and asset URLs cannot pass,
// and any character outside ASCII letters, digits, and a few separators fails outright. The
// measured page's own URL is allowed only as the top-level `url` of the facts file.
export const VOCABULARY = new Set(`
version viewport width height elements truncated shell documentHeight bodyScrolls overflowX scrollContainers
regions kind by x y w h position items itemHeight contentWidth insetLeft
sections gapBefore surface cols heading level size weight filled columns
gaps gap section group stack inline inset headings main skips
controls buttons inputs labels leftEdges
tables rows headerH rowH padX rowBorder stickyHeader endAligned
lists itemH divider trailingAction tabs indicator stickies edge
media img video canvas chartLike areaShare iconSizes
css hover focusVisible disabled reducedMotion breakpoints unreadableSheets skipped shadowHosts iframes
topBar sideNav aside bottomBar landmark geometry static sticky fixed
heading-block toolbar form-group table list card-grid chart other
outline text gradient none full wide narrow
select textarea switch checkbox radio range number date search file color
above left right inside underline pill top bottom normal
factsVersion url observedAt viewports facts id axis value unit from both observed derived px ms
composition density typography navigation-action states-motion imagery-data responsive attention tells
region count sequence max ratio rhythm rowHeight headerHeight targets mode under44Share under24Share
h1 h2 h3 h4 h5 h6 lineHeight sizes navigation sets primary perSectionMax sectionsOverOne
firstViewport placement emphasis largestOverBody imagery icon tabular share rowHeightSpread
states motion transitions duration durations easing animations infinite controlHeights distinct radii typeSizes
spacing offScaleShare structure observations accent at and readable stylesheets document order body fontSize type
sectionCount sectionKinds sectionGaps sectionGap sectionFilled filledByRegion dominant n ratios scale byLevel rowHeights itemHeights tableRowHeight headingMax pageTypeHint form settings dashboard
ease ease-in ease-out ease-in-out linear step-start step-end cubic-bezier steps start end jump-start jump-end jump-none jump-both
`.split(/\s+/u).filter(Boolean));

const COLOUR = /(?:rgba?|hsla?|lab|lch|oklab|oklch|color)\([\d\s.,%/-]*\)|#[0-9a-f]{3,8}\b/giu;
const SAFE = /^[A-Za-z0-9 .,:;|/()[\]<>_-]*$/u;
const TOKEN = /-?\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9-]*/gu;

// The tokens a string must justify: identifiers outside the vocabulary, or the whole string when
// it holds characters outside the safe set. Returns [] for an allowed string.
export function unknownTokens(text) {
  const rest = String(text).replace(COLOUR, " ");
  if (!SAFE.test(rest)) return [rest];
  return [...rest.matchAll(TOKEN)].map(m => m[0]).filter(t => !/^-?\d/u.test(t) && !VOCABULARY.has(t));
}

// Every string in `value` that the allow-list rejects, with its JSON path.
export function disallowedStrings(value, { url = null } = {}) {
  const bad = [];
  const check = (text, path) => { const unknown = unknownTokens(text); if (unknown.length) bad.push(`${path}: ${JSON.stringify(text)} (${unknown.map(t => JSON.stringify(t)).join(", ")})`); };
  const walk = (v, path) => {
    if (typeof v === "string") { if (!(path === "$.url" && url !== null && v === url)) check(v, path); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { check(k, `${path} (key)`); walk(x, `${path}.${k}`); }
  };
  walk(value, "$");
  return bad;
}
