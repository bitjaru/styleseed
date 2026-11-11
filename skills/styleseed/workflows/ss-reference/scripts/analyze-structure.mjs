// Pure analysis of observe-structure output: per-viewport summaries, wide → narrow deltas, and the
// flat list of facts written to measurements/facts.json. No I/O, no browser. A fact is an
// observation (`observed`) or a value computed from observations (`derived`); it never says what
// to copy. Every fact names what it came from, so a reviewer can keep the observation and reject
// the derivation. Fact ids are stable across runs and sites: they carry no index that depends on
// document order, and the viewport is a field, not part of the id.
import { toHex, mergeCounts } from './analyze-observations.mjs';

export const FACTS_VERSION = 1;
// Fact-id family → twelve-axis name (research/cases/README.md, engine/REFERENCE-COMPILER.md).
export const FACT_FAMILIES = Object.freeze({
  composition: 'composition', density: 'density', typography: 'typography', navigation: 'navigation-action',
  states: 'states-motion', imagery: 'imagery-data', responsive: 'responsive', attention: 'attention', tells: 'tells',
});
export const REGION_KINDS = Object.freeze(['topBar', 'sideNav', 'main', 'aside', 'bottomBar']);
const r2 = n => Math.round(n * 100) / 100;
const numericEntries = map => Object.entries(map || {}).map(([k, v]) => [Number(k), Number(v)]).filter(([k, v]) => Number.isFinite(k) && Number.isFinite(v));
// The most frequent numeric key; ties go to the smaller value so the result is deterministic.
const modeOf = map => { let best = null, n = -1; for (const [k, v] of numericEntries(map)) if (v > n || (v === n && k < best)) { best = k; n = v; } return best; };
const keysOf = map => numericEntries(map).map(([k]) => k).sort((a, b) => a - b);
const modeOfList = list => { const c = {}; for (const v of list) if (v !== null && v !== undefined) c[v] = (c[v] || 0) + 1; return modeOf(c); };
const topKey = map => Object.entries(map || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

// One viewport of observe-structure output → the values the facts and the drift report read.
export function summarizeStructure(s = {}) {
  const viewport = s.viewport?.width ?? null, height = s.viewport?.height ?? null;
  const regions = {};
  for (const r of s.regions || []) if (!regions[r.kind]) regions[r.kind] = { by: r.by, x: r.x, y: r.y, w: r.w, h: r.h, position: r.position, items: r.items, itemHeight: r.itemHeight ?? null, contentWidth: r.contentWidth ?? null, insetLeft: r.insetLeft ?? null };
  const sections = s.sections || [];
  const gaps = s.gaps || {};
  const patterns = Object.entries(s.columns || {}).filter(([k]) => k.includes('|')).map(([key, count]) => {
    const [n, ratios, gap] = key.split('|');
    return { key, n: Number(n), ratios: ratios.split('/').map(Number), gap: Number(gap), count: Number(count) };
  }).sort((a, b) => b.count - a.count || a.n - b.n || a.key.localeCompare(b.key));
  const headingScale = Object.entries(s.headings?.main || {}).map(([key, count]) => {
    const [level, size, weight, lineHeight] = key.split('|');
    return { level: Number(level), size: Number(size), weight: Number(weight), lineHeight: lineHeight === 'normal' ? 'normal' : Number(lineHeight), count: Number(count) };
  }).sort((a, b) => a.level - b.level || b.count - a.count || b.size - a.size);
  const byLevel = {};
  for (const h of headingScale) if (!byLevel[h.level]) byLevel[h.level] = h;
  const headingSizes = [...new Set(headingScale.map(h => h.size))].sort((a, b) => b - a);
  const buttons = { filled: 0, outline: 0, text: 0 };
  const filledByRegion = {};
  for (const [key, count] of Object.entries(s.controls?.buttons || {})) {
    const [emphasis, paint, , region] = key.split('|');
    buttons[emphasis] = (buttons[emphasis] || 0) + Number(count);
    if (emphasis === 'filled') { filledByRegion[region] ||= {}; filledByRegion[region][paint] = (filledByRegion[region][paint] || 0) + Number(count); }
  }
  const tables = s.tables || [], lists = s.lists || [], tabs = s.tabs || [];
  const rowKeys = keysOf(mergeCounts(tables.map(t => t.rowH)));
  const inputs = Object.values(s.controls?.inputs || {}).reduce((sum, n) => sum + Number(n), 0);
  const share = kind => (sections.length ? sections.filter(x => x.kind === kind).length / sections.length : 0);
  const dominant = patterns[0] || null;
  // A hint for the user-job axis, from what the sections hold. The job itself stays a person's call.
  const pageTypeHint = !sections.length ? null
    : share('table') >= 0.3 ? 'list'
      : share('form-group') >= 0.4 ? (dominant && dominant.n === 2 ? 'settings' : 'form')
        : share('chart') + share('card-grid') >= 0.3 ? 'dashboard' : null;
  return {
    viewport, height,
    shell: s.shell || null,
    regions,
    sectionCount: sections.length,
    sequence: sections.map(x => x.kind),
    firstViewport: sections.filter(x => height === null || x.y < height).map(x => x.kind),
    sectionKinds: Object.fromEntries(['heading-block', 'toolbar', 'form-group', 'table', 'list', 'card-grid', 'chart', 'tabs', 'other'].map(k => [k, sections.filter(x => x.kind === k).length])),
    columns: { max: sections.length ? Math.max(...sections.map(x => (x.cols || [1]).length)) : null, dominant: dominant && { n: dominant.n, ratios: dominant.ratios, gap: dominant.gap, count: dominant.count } },
    rhythm: { section: modeOf(gaps.section), group: modeOf(gaps.group) },
    sectionGaps: keysOf(gaps.section),
    gaps: { stack: modeOf(gaps.stack), inline: modeOf(gaps.inline), inset: modeOf(gaps.inset) },
    headings: { scale: headingScale, byLevel, sizes: headingSizes, max: headingSizes[0] ?? null, skips: s.headings?.skips ?? 0 },
    buttons, filledByRegion,
    sectionFilled: sections.map(x => ({ y: x.y, filled: x.filled || {} })),
    inputs: { count: inputs, leftEdges: s.controls?.leftEdges ?? 0, labels: { ...(s.controls?.labels || {}) } },
    tables: {
      count: tables.length,
      rowHeights: [...new Set(tables.map(t => modeOf(t.rowH)).filter(v => v !== null))].sort((a, b) => a - b),
      rowHeight: modeOf(mergeCounts(tables.map(t => t.rowH))),
      rowHeightSpread: rowKeys.length ? rowKeys[rowKeys.length - 1] - rowKeys[0] : null,
      headerHeight: modeOfList(tables.map(t => t.headerH || null)),
      padX: modeOfList(tables.map(t => t.padX)),
      rowBorder: tables.filter(t => t.rowBorder).length,
      stickyHeader: tables.filter(t => t.stickyHeader).length,
      endAligned: tables.reduce((sum, t) => sum + (t.endAligned || 0), 0),
    },
    lists: {
      count: lists.length,
      itemHeights: [...new Set(lists.map(l => modeOf(l.itemH)).filter(v => v !== null))].sort((a, b) => a - b),
      itemHeight: modeOf(mergeCounts(lists.map(l => l.itemH))),
      divider: lists.filter(l => l.divider).length,
      trailingAction: lists.filter(l => l.trailingAction).length,
    },
    tabs: { count: tabs.length, height: modeOfList(tabs.map(t => t.h)), indicator: topKey(tabs.reduce((m, t) => ({ ...m, [t.indicator]: (m[t.indicator] || 0) + 1 }), {})) },
    stickies: (s.stickies || []).length,
    media: s.media || null,
    css: s.css || null,
    skipped: s.skipped || null,
    pageTypeHint,
  };
}

// Primary actions: filled actions painted with the derived accent. When no filled action carries
// the accent (a monochrome system, or an accent read from links), every filled action counts.
export function primaryStats(v, accent = null) {
  const hex = accent ? toHex(accent) : null;
  const paints = Object.values(v.filledByRegion || {}).flatMap(m => Object.keys(m));
  const basis = hex && paints.some(p => toHex(p) === hex) ? 'accent' : 'filled';
  const isPrimary = p => basis === 'filled' || toHex(p) === hex;
  const count = m => Object.entries(m || {}).reduce((sum, [p, n]) => sum + (isPrimary(p) ? Number(n) : 0), 0);
  const perRegion = {};
  for (const kind of [...REGION_KINDS, 'none']) if (v.filledByRegion?.[kind]) perRegion[kind] = count(v.filledByRegion[kind]);
  const perSection = (v.sectionFilled || []).map(s => count(s.filled));
  const total = Object.values(perRegion).reduce((sum, n) => sum + n, 0);
  const placement = Object.entries(perRegion).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || REGION_KINDS.indexOf(a[0]) - REGION_KINDS.indexOf(b[0]))[0]?.[0] ?? null;
  return {
    basis, count: total, perRegion, placement,
    perSectionMax: perSection.length ? Math.max(...perSection) : null,
    sectionsOverOne: perSection.filter(n => n > 1).length,
    firstViewport: (v.sectionFilled || []).filter(s => v.height === null || s.y < v.height).reduce((sum, s) => sum + count(s.filled), 0),
  };
}

// Wide → narrow: each value as a [wide, narrow] pair; a region missing at one width is null there.
export function responsiveDeltas(wide, narrow) {
  if (!wide || !narrow) return null;
  const pair = (a, b) => [a ?? null, b ?? null];
  const size = (r, kind) => (r ? (kind === 'topBar' || kind === 'bottomBar' ? r.h : r.w) : null);
  const kinds = REGION_KINDS.filter(k => wide.regions[k] || narrow.regions[k]);
  return {
    viewports: [wide.viewport, narrow.viewport],
    columns: pair(wide.columns.max, narrow.columns.max),
    regions: Object.fromEntries(kinds.map(k => [k, pair(size(wide.regions[k], k), size(narrow.regions[k], k))])),
    contentWidth: pair(wide.regions.main?.contentWidth, narrow.regions.main?.contentWidth),
    insetLeft: pair(wide.regions.main?.insetLeft, narrow.regions.main?.insetLeft),
    sectionGap: pair(wide.rhythm.section, narrow.rhythm.section),
    headingMax: pair(wide.headings.max, narrow.headings.max),
    tableRowHeight: pair(wide.tables.rowHeight, narrow.tables.rowHeight),
    sections: pair(wide.sectionCount, narrow.sectionCount),
    overflowX: narrow.shell?.overflowX ?? null,
  };
}

// The structure block a summary carries: per-viewport summaries (widest first) and the deltas.
export function structureSummary(structures) {
  const viewports = structures.filter(Boolean).map(summarizeStructure).sort((a, b) => (b.viewport ?? 0) - (a.viewport ?? 0));
  return { viewports, responsive: viewports.length >= 2 ? responsiveDeltas(viewports[0], viewports[viewports.length - 1]) : null };
}

// summary: analyze-observations.summarize output; structure: structureSummary output.
export function buildFacts(summary = {}, structure = null, url = null, date = null) {
  const facts = [];
  const empty = value => value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value)) || (Array.isArray(value) && !value.length);
  const add = (id, level, value, viewport, from, unit = null) => {
    if (empty(value)) return;
    facts.push({ id, axis: FACT_FAMILIES[id.split('.')[0]], level, value, ...(unit ? { unit } : {}), viewport, from });
  };
  const vps = structure?.viewports || [];
  for (const v of vps) {
    const vp = v.viewport;
    // composition
    add('composition.shell.documentHeight', 'observed', v.shell?.documentHeight, vp, 'structure.shell', 'px');
    add('composition.shell.bodyScrolls', 'observed', v.shell?.bodyScrolls, vp, 'structure.shell');
    add('composition.shell.scrollContainers', 'observed', v.shell?.scrollContainers, vp, 'structure.shell');
    for (const kind of REGION_KINDS) {
      const r = v.regions[kind];
      if (!r) continue;
      const level = r.by === 'landmark' ? 'observed' : 'derived', from = `structure.regions[${kind}] (${r.by})`;
      add(`composition.region.${kind}.width`, level, r.w, vp, from, 'px');
      add(`composition.region.${kind}.height`, level, r.h, vp, from, 'px');
      add(`composition.region.${kind}.position`, level, r.position, vp, from);
    }
    const main = v.regions.main, mainLevel = main?.by === 'landmark' ? 'observed' : 'derived';
    add('composition.main.contentWidth', mainLevel, main?.contentWidth, vp, 'structure.regions[main].contentWidth', 'px');
    add('composition.main.insetLeft', mainLevel, main?.insetLeft, vp, 'structure.regions[main].insetLeft', 'px');
    add('composition.sections.count', 'derived', v.sectionCount, vp, 'structure.sections');
    add('composition.sections.sequence', 'derived', v.sequence.join(' > '), vp, 'structure.sections[].kind');
    add('composition.columns.max', 'observed', v.columns.max, vp, 'structure.sections[].cols');
    const d = v.columns.dominant;
    if (d) {
      add('composition.columns.count', 'observed', d.n, vp, 'structure.columns');
      add('composition.columns.ratio', 'observed', d.ratios.join('/'), vp, 'structure.columns');
      add('composition.columns.gap', 'observed', d.gap, vp, 'structure.columns', 'px');
      add('composition.columns.sections', 'observed', d.count, vp, 'structure.columns');
    }
    add('composition.rhythm.section', 'observed', v.rhythm.section, vp, 'structure.gaps.section', 'px');
    add('composition.rhythm.group', 'observed', v.rhythm.group, vp, 'structure.gaps.group', 'px');
    // density
    add('density.gap.stack', 'observed', v.gaps.stack, vp, 'structure.gaps.stack', 'px');
    add('density.gap.inline', 'observed', v.gaps.inline, vp, 'structure.gaps.inline', 'px');
    add('density.inset', 'observed', v.gaps.inset, vp, 'structure.gaps.inset', 'px');
    if (v.tables.count) {
      add('density.table.rowHeight', 'observed', v.tables.rowHeight, vp, 'structure.tables[].rowH', 'px');
      add('density.table.headerHeight', 'observed', v.tables.headerHeight, vp, 'structure.tables[].headerH', 'px');
      add('density.table.padX', 'observed', v.tables.padX, vp, 'structure.tables[].padX', 'px');
      add('density.table.rowBorder', 'observed', v.tables.rowBorder, vp, 'structure.tables[].rowBorder');
    }
    if (v.lists.count) {
      add('density.list.itemHeight', 'observed', v.lists.itemHeight, vp, 'structure.lists[].itemH', 'px');
      add('density.list.divider', 'observed', v.lists.divider, vp, 'structure.lists[].divider');
    }
    const targets = summary.targets?.[vp];
    if (targets) {
      add('density.targets.mode', 'observed', targets.mode, vp, 'observations.targets', 'px');
      add('density.targets.under44Share', 'observed', targets.under44Share, vp, 'observations.targets');
      add('density.targets.under24Share', 'observed', targets.under24Share, vp, 'observations.targets');
    }
    // typography
    for (const h of Object.values(v.headings.byLevel)) {
      add(`typography.heading.h${h.level}.size`, 'observed', h.size, vp, 'structure.headings.main', 'px');
      add(`typography.heading.h${h.level}.weight`, 'observed', h.weight, vp, 'structure.headings.main');
      add(`typography.heading.h${h.level}.lineHeight`, 'observed', h.lineHeight, vp, 'structure.headings.main', typeof h.lineHeight === 'number' ? 'px' : null);
    }
    add('typography.heading.sizes', 'observed', v.headings.sizes, vp, 'structure.headings.main', 'px');
    // navigation-action
    for (const kind of ['topBar', 'sideNav', 'bottomBar']) {
      const r = v.regions[kind];
      if (!r) continue;
      add(`navigation.region.${kind}.items`, 'observed', r.items, vp, `structure.regions[${kind}].items`);
      add(`navigation.region.${kind}.itemHeight`, 'observed', r.itemHeight, vp, `structure.regions[${kind}].itemHeight`, 'px');
    }
    if (v.tabs.count) {
      add('navigation.tabs.sets', 'observed', v.tabs.count, vp, 'structure.tabs');
      add('navigation.tabs.height', 'observed', v.tabs.height, vp, 'structure.tabs[].h', 'px');
      add('navigation.tabs.indicator', 'derived', v.tabs.indicator, vp, 'structure.tabs[].indicator');
    }
    const buttonTotal = v.buttons.filled + v.buttons.outline + v.buttons.text;
    const p = primaryStats(v, summary.accentDerived ?? null);
    if (buttonTotal) {
      for (const emphasis of ['filled', 'outline', 'text']) add(`navigation.buttons.${emphasis}`, 'derived', v.buttons[emphasis], vp, 'structure.controls.buttons');
      add('navigation.primary.perSectionMax', 'derived', p.perSectionMax, vp, `structure.sections[].filled x ${p.basis}`);
      add('navigation.primary.sectionsOverOne', 'derived', p.sectionsOverOne, vp, `structure.sections[].filled x ${p.basis}`);
      for (const [kind, n] of Object.entries(p.perRegion)) add(`navigation.primary.region.${kind}`, 'derived', n, vp, `structure.controls.buttons x ${p.basis}`);
    }
    if (v.inputs.count) {
      add('navigation.inputs.count', 'observed', v.inputs.count, vp, 'structure.controls.inputs');
      add('navigation.inputs.leftEdges', 'observed', v.inputs.leftEdges, vp, 'structure.controls.leftEdges');
      for (const [position, n] of Object.entries(v.inputs.labels).sort(([a], [b]) => a.localeCompare(b))) add(`navigation.labels.${position}`, 'observed', n, vp, 'structure.controls.labels');
    }
    // attention
    add('attention.firstViewport.sections', 'derived', v.firstViewport.join(' > '), vp, 'structure.sections[].kind, y < viewport height');
    if (buttonTotal) {
      add('attention.primary.count', 'derived', p.count, vp, `structure.controls.buttons x ${p.basis}`);
      add('attention.primary.firstViewport', 'derived', p.firstViewport, vp, `structure.sections[].filled x ${p.basis}, y < viewport height`);
      add('attention.primary.placement', 'derived', p.placement, vp, `structure.controls.buttons x ${p.basis}`);
      add('attention.emphasis.ratio', 'observed', `${v.buttons.filled}:${v.buttons.outline}:${v.buttons.text}`, vp, 'structure.controls.buttons');
    }
    if (summary.bodyFontSize && v.headings.max) add('attention.text.largestOverBody', 'derived', r2(v.headings.max / summary.bodyFontSize), vp, 'structure.headings.main / observations.body.fontSize');
    // imagery-data
    if (v.media) {
      for (const kind of ['img', 'video', 'canvas']) add(`imagery.media.${kind}`, 'observed', v.media[kind], vp, 'structure.media');
      add('imagery.media.areaShare', 'observed', v.media.areaShare, vp, 'structure.media');
      add('imagery.media.chartLike', 'derived', v.media.chartLike, vp, 'structure.media');
      add('imagery.icon.sizes', 'observed', keysOf(v.media.iconSizes), vp, 'structure.media.iconSizes', 'px');
    }
    if (v.tables.count) add('imagery.table.endAligned', 'observed', v.tables.endAligned, vp, 'structure.tables[].endAligned');
    const tabular = summary.tabular?.[vp];
    if (tabular) add('imagery.tabular.share', 'observed', tabular.share, vp, 'observations.tabular / text elements');
    // tells
    if (v.headings.sizes.length) add('tells.headings.skips', 'derived', v.headings.skips, vp, 'structure.headings (document order)');
    if (v.tables.count) add('tells.table.rowHeightSpread', 'derived', v.tables.rowHeightSpread, vp, 'structure.tables[].rowH', 'px');
  }
  // states-motion: stylesheets and computed motion are the same page at every width.
  const css = vps[0]?.css;
  if (css) {
    for (const key of ['hover', 'focusVisible', 'disabled', 'reducedMotion', 'unreadableSheets']) add(`states.css.${key}`, 'observed', css[key], 'both', 'structure.css (readable stylesheets)');
  }
  const motion = summary.motion;
  if (motion) {
    add('states.motion.transitions', 'observed', motion.transitions, 'both', 'observations.motion.transitions');
    add('states.motion.duration', 'observed', motion.duration, 'both', 'observations.motion.transitions', 'ms');
    add('states.motion.durations', 'observed', motion.durations, 'both', 'observations.motion.transitions', 'ms');
    add('states.motion.easing', 'observed', motion.easing, 'both', 'observations.motion.transitions');
    add('states.motion.animations', 'observed', motion.animations, 'both', 'observations.motion.animations');
    add('states.motion.infinite', 'observed', motion.infinite, 'both', 'observations.motion.animations');
  }
  // tells across viewports
  if (summary.distinct) {
    add('tells.controlHeights.distinct', 'derived', summary.distinct.controlHeights, 'both', 'observations.controlHeights');
    add('tells.radii.distinct', 'derived', summary.distinct.radii, 'both', 'observations.radii');
  }
  add('tells.typeSizes.distinct', 'derived', summary.distinctFontSizes, 'both', 'observations.type');
  if (summary.spacingBase) add('tells.spacing.offScaleShare', 'derived', r2(1 - summary.spacingCoverage), 'both', 'observations.spacing');
  // responsive
  const delta = structure?.responsive;
  if (delta) {
    const from = what => `${what} at ${delta.viewports.join(' and ')}`;
    const change = (id, pair, what, unit = null) => { if (pair.some(x => x !== null)) add(id, 'derived', `${pair[0] ?? 'none'} -> ${pair[1] ?? 'none'}`, 'both', from(what), unit); };
    change('responsive.columns', delta.columns, 'structure.sections[].cols');
    for (const [kind, pair] of Object.entries(delta.regions)) change(`responsive.region.${kind}`, pair, `structure.regions[${kind}]`, 'px');
    change('responsive.main.contentWidth', delta.contentWidth, 'structure.regions[main].contentWidth', 'px');
    change('responsive.main.insetLeft', delta.insetLeft, 'structure.regions[main].insetLeft', 'px');
    change('responsive.rhythm.section', delta.sectionGap, 'structure.gaps.section', 'px');
    change('responsive.heading.max', delta.headingMax, 'structure.headings.main', 'px');
    change('responsive.table.rowHeight', delta.tableRowHeight, 'structure.tables[].rowH', 'px');
    change('responsive.sections.count', delta.sections, 'structure.sections');
    add('responsive.overflowX', 'observed', delta.overflowX, delta.viewports[1], 'structure.shell.overflowX', 'px');
  }
  const breakpoints = Object.entries(mergeCounts(vps.map(v => v.css?.breakpoints))).map(([k, n]) => [Number(k), n]).filter(([k]) => Number.isFinite(k))
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 12).map(([k]) => k).sort((a, b) => a - b);
  add('responsive.breakpoints', 'observed', breakpoints, 'both', 'structure.css.breakpoints (readable stylesheets)', 'px');
  return { factsVersion: FACTS_VERSION, url, observedAt: date, viewports: vps.map(v => v.viewport), facts };
}

// Facts grouped by axis, for the twelve-axis draft and the log line.
export function factsByAxis(facts = []) {
  const out = {};
  for (const f of facts) (out[f.axis] ||= []).push(f);
  return out;
}
