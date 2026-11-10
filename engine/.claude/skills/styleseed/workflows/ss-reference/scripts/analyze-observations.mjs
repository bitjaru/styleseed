// Pure analysis of observe-design output. No I/O, no browser. Every derived value names the
// counts it came from, so a human can disagree with the derivation and keep the observation.
// When observations carry `.structure` (observe-structure, same page load), the summary also
// carries the structure summary and the flat facts list (analyze-structure.mjs).
import { structureSummary, buildFacts } from './analyze-structure.mjs';

export function parseColor(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  const hex = s.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(o => parseInt(h.slice(o, o + 2), 16)).concat(1);
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (!rgb) return null;
  let a = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : Number(rgb[4]);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), a];
}

export function toHex(value) {
  const c = parseColor(value);
  if (!c) return null;
  return '#' + c.slice(0, 3).map(n => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('');
}

export function isNeutral(value, threshold = 14) {
  const c = parseColor(value);
  if (!c) return false;
  const [r, g, b] = c;
  return Math.max(r, g, b) - Math.min(r, g, b) <= threshold;
}

export function luminance(value) {
  const c = parseColor(value);
  if (!c) return null;
  const lin = c.slice(0, 3).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

const sortedEntries = map => Object.entries(map || {}).map(([k, v]) => [k, Number(v)]).sort((a, b) => b[1] - a[1]);

export function mergeCounts(maps) {
  const out = {};
  for (const map of maps) for (const [k, v] of Object.entries(map || {})) out[k] = (out[k] || 0) + Number(v);
  return out;
}

// Spacing: which base (4 or 8) explains most of the observed values, and the scale actually used.
export function clusterSpacing(hist, { minShare = 0.02 } = {}) {
  const entries = sortedEntries(hist).map(([k, v]) => [Number(k), v]).filter(([k]) => Number.isFinite(k) && k > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return { base: null, scale: [], coverage: 0, offScale: [] };
  const share = base => entries.filter(([k]) => Number.isInteger(k) && k % base === 0).reduce((s, [, v]) => s + v, 0) / total;
  const share8 = share(8), share4 = share(4);
  const base = share8 >= 0.6 ? 8 : share4 >= 0.6 ? 4 : null;
  const kept = entries.filter(([, v]) => v / total >= minShare);
  const scale = kept.map(([k]) => k).filter(k => base ? k % base === 0 : true).sort((a, b) => a - b);
  const offScale = kept.filter(([k]) => base && k % base !== 0).map(([k, v]) => ({ px: k, count: v })).slice(0, 8);
  return { base, scale, coverage: Math.round((base ? share(base) : 0) * 100) / 100, offScale };
}

// Type: distinct size steps carrying at least minShare of text elements, largest first.
export function typeSteps(hist, { minShare = 0.02 } = {}) {
  const bySize = {};
  let total = 0;
  for (const [key, count] of Object.entries(hist || {})) {
    const [size, weight, lineHeight] = key.split('|');
    const px = Number(size); if (!Number.isFinite(px)) continue;
    total += Number(count);
    bySize[px] ||= { px, count: 0, weights: {}, lineHeights: {} };
    bySize[px].count += Number(count);
    bySize[px].weights[weight] = (bySize[px].weights[weight] || 0) + Number(count);
    bySize[px].lineHeights[lineHeight] = (bySize[px].lineHeights[lineHeight] || 0) + Number(count);
  }
  const steps = Object.values(bySize).filter(s => total && s.count / total >= minShare).sort((a, b) => b.px - a.px)
    .map(s => ({ px: s.px, share: Math.round((s.count / total) * 100) / 100, weight: sortedEntries(s.weights)[0]?.[0] ?? null, lineHeight: sortedEntries(s.lineHeights)[0]?.[0] ?? null }));
  return { steps, distinctSizes: Object.keys(bySize).length, total };
}

export function radiusFamilies(hist, { minShare = 0.03 } = {}) {
  const entries = sortedEntries(hist).map(([k, v]) => [Number(k), v]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return entries.filter(([, v]) => total && v / total >= minShare).map(([k]) => k).sort((a, b) => a - b);
}

// Shadow family of a computed box-shadow, read from its visible layers (transparent and all-zero
// layers, such as the ring placeholders utility CSS stacks in front, are skipped): the largest
// outer blur decides tight (up to 4px), soft (up to 16px), raised (up to 32px), or floating; a
// shadow made only of spread is a ring, one made only of inset layers is inset.
export function shadowFamily(value) {
  const s = String(value || '').trim();
  if (!s || s === 'none') return null;
  const layers = s.split(/,(?![^()]*\))/).map(layer => {
    const colour = layer.match(/[a-z-]+\([^)]*\)|#[0-9a-f]+/i)?.[0] ?? null;
    const [x = 0, y = 0, blur = 0, spread = 0] = [...layer.replace(/[a-z-]+\([^)]*\)|#[0-9a-f]+/gi, ' ').matchAll(/(-?[\d.]+)px/g)].map(m => Number(m[1]));
    return { inset: /\binset\b/.test(layer), transparent: colour !== null && parseColor(colour)?.[3] === 0, x, y, blur, spread };
  }).filter(l => !l.transparent && (l.x || l.y || l.blur || l.spread));
  if (!layers.length) return null;
  const outer = layers.filter(l => !l.inset);
  if (!outer.length) return 'inset';
  const cast = outer.filter(l => l.x || l.y || l.blur);
  if (!cast.length) return 'ring';
  const blur = Math.max(...cast.map(l => l.blur));
  return blur <= 4 ? 'tight' : blur <= 16 ? 'soft' : blur <= 32 ? 'raised' : 'floating';
}

// The most frequent numeric key of a histogram; ties go to the smaller value.
function modeKey(hist) {
  const entries = Object.entries(hist || {}).map(([k, v]) => [Number(k), Number(v)]).filter(([k]) => Number.isFinite(k));
  entries.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return entries.length ? entries[0][0] : null;
}
const total = hist => Object.values(hist || {}).reduce((sum, n) => sum + Number(n), 0);
const share = (n, of) => (of ? Math.round((n / of) * 100) / 100 : 0);

// What observe-design collects beyond the roles: border, elevation, heading and muted ink, the
// surface colour, the colour on accent-filled actions, motion, scroll depth, target sizes, and
// tabular numerals. Additive to the summary; per-viewport values are keyed by viewport width.
export function summarizeExtras(list, roles) {
  const borders = sortedEntries(mergeCounts(list.map(o => o.borders)));
  const border = borders.length ? { width: Number(borders[0][0].split('|')[0]), color: toHex(borders[0][0].split('|')[1]), count: borders[0][1], distinct: borders.length } : null;
  const shadows = mergeCounts(list.map(o => o.shadows));
  const families = {};
  for (const [value, count] of Object.entries(shadows)) { const f = shadowFamily(value); if (f) families[f] = (families[f] || 0) + count; }
  const shadowTotal = total(families);
  const elevation = {
    families: Object.fromEntries(sortedEntries(families)),
    levels: Object.entries(families).filter(([f, n]) => !['ring', 'inset'].includes(f) && n / shadowTotal >= 0.03).length,
    distinct: Object.keys(shadows).length,
  };
  const headingInk = toHex(sortedEntries(mergeCounts(list.map(o => o.headings)))[0]?.[0]) || null;
  const texts = sortedEntries(mergeCounts(list.map(o => o.text))).map(([c, n]) => [toHex(c), n]).filter(([c]) => c);
  const muted = texts.find(([c]) => c !== roles.ink && (!roles.canvas || roles.inkContrast === null || (contrastRatio(c, roles.canvas) ?? Infinity) < roles.inkContrast));
  const mutedInk = muted ? muted[0] : null;
  const surface = sortedEntries(mergeCounts(list.map(o => o.surfaces))).map(([c]) => toHex(c)).find(c => c && c !== roles.canvas) || null;
  const pairs = sortedEntries(mergeCounts(list.map(o => o.actionPairs))).map(([k]) => k.split('|').map(toHex));
  const onAccent = roles.accent ? (pairs.find(([bg]) => bg === roles.accent)?.[1] ?? null) : null;
  const transitions = mergeCounts(list.map(o => o.motion?.transitions)), animations = mergeCounts(list.map(o => o.motion?.animations));
  const durations = {}, easings = {}, properties = {};
  for (const [key, n] of Object.entries(transitions)) {
    const [family, ms, easing] = key.split('|');
    durations[ms] = (durations[ms] || 0) + n; easings[easing] = (easings[easing] || 0) + n; properties[family] = (properties[family] || 0) + n;
  }
  const easingList = Object.entries(easings).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([e]) => e);
  const motion = {
    transitions: total(transitions), durations: radiusFamilies(durations), duration: modeKey(durations),
    easing: easingList[0] ?? null, easings: easingList.slice(0, 3), properties: Object.fromEntries(sortedEntries(properties)),
    animations: total(animations), infinite: Object.entries(animations).filter(([k]) => k.endsWith('|infinite')).reduce((sum, [, n]) => sum + n, 0),
  };
  const scrollDepth = {}, targets = {}, tabular = {};
  for (const o of list) {
    const width = o.viewport?.width;
    if (!width) continue;
    if (o.documentHeight && o.viewport.height) scrollDepth[width] = Math.round((o.documentHeight / o.viewport.height) * 100) / 100;
    const t = total(o.targets);
    if (t) {
      const sizes = Object.entries(o.targets).map(([k, n]) => [Number(k), Number(n)]);
      targets[width] = { count: t, mode: modeKey(o.targets), under44Share: share(sizes.filter(([k]) => k < 44).reduce((s, [, n]) => s + n, 0), t), under24Share: share(sizes.filter(([k]) => k < 24).reduce((s, [, n]) => s + n, 0), t) };
    }
    if (typeof o.tabular === 'number') tabular[width] = { count: o.tabular, share: share(o.tabular, total(o.type)) };
  }
  return {
    bodyFontSize: list[0]?.body?.fontSize ?? null,
    border, elevation, headingInk, mutedInk, mutedInkContrast: mutedInk && roles.canvas ? contrastRatio(mutedInk, roles.canvas) : null,
    surface, onAccent, onAccentContrast: onAccent && roles.accent ? contrastRatio(onAccent, roles.accent) : null,
    motion, scrollDepth, targets, tabular,
    distinct: { controlHeights: Object.keys(mergeCounts(list.map(o => o.controlHeights))).length, radii: Object.keys(mergeCounts(list.map(o => o.radii))).length },
  };
}

// Roles: the accent is what primary actions are painted with, then what links are coloured with.
// The tool never promotes a colour that only appears in large surfaces or pictures.
export function deriveRoles(obs) {
  const evidence = [];
  const actions = sortedEntries(obs.actions);
  const links = sortedEntries(obs.links);
  const text = sortedEntries(obs.text);
  const bodyColor = obs.body?.color || null;
  let accent = null, accentFrom = null;
  const filledActions = actions.filter(([k]) => k.startsWith('bg:') && !isNeutral(k.slice(3)));
  if (filledActions.length) {
    accent = toHex(filledActions[0][0].slice(3)); accentFrom = 'filled-actions';
    evidence.push({ role: 'accent', from: 'filled-actions', color: accent, count: filledActions[0][1], alternatives: filledActions.slice(1, 4).map(([k, v]) => ({ color: toHex(k.slice(3)), count: v })) });
  } else {
    const coloredLinks = links.filter(([k]) => !isNeutral(k) && toHex(k) !== toHex(bodyColor));
    if (coloredLinks.length) {
      accent = toHex(coloredLinks[0][0]); accentFrom = 'links';
      evidence.push({ role: 'accent', from: 'links', color: accent, count: coloredLinks[0][1], alternatives: coloredLinks.slice(1, 4).map(([k, v]) => ({ color: toHex(k), count: v })) });
    } else {
      evidence.push({ role: 'accent', from: 'none', color: null, note: 'no filled non-neutral action and no coloured link; the page may be monochrome or actions may be images' });
    }
  }
  const ink = text.length ? toHex(text[0][0]) : toHex(bodyColor);
  if (ink) evidence.push({ role: 'ink', from: text.length ? 'text-elements' : 'body', color: ink, count: text[0]?.[1] ?? null, pureBlack: ink === '#000000' });
  const surfaces = sortedEntries(obs.surfaces);
  const canvas = toHex(obs.body?.background) && toHex(obs.body?.background) !== '#000000' && !/rgba\(0, 0, 0, 0\)/.test(obs.body.background) ? toHex(obs.body.background) : (surfaces.length ? toHex(surfaces[0][0]) : null);
  if (canvas) evidence.push({ role: 'canvas', from: 'body-or-largest-surface', color: canvas });
  const inkContrast = ink && canvas ? contrastRatio(ink, canvas) : null;
  const accentContrast = accent && canvas ? contrastRatio(accent, canvas) : null;
  return { accent, accentFrom, ink, canvas, inkContrast, accentContrast, evidence };
}

export function summarize(observations) {
  const list = Array.isArray(observations) ? observations : [observations];
  const spacing = clusterSpacing(mergeCounts(list.map(o => o.spacing)));
  const type = typeSteps(mergeCounts(list.map(o => o.type)));
  const radii = radiusFamilies(mergeCounts(list.map(o => o.radii)));
  // Control heights cluster the same way radii do: families with at least a 3% share.
  const controlHeights = radiusFamilies(mergeCounts(list.map(o => o.controlHeights || {})));
  const merged = {
    actions: mergeCounts(list.map(o => o.actions)), links: mergeCounts(list.map(o => o.links)), text: mergeCounts(list.map(o => o.text)),
    surfaces: mergeCounts(list.map(o => o.surfaces)), body: list[0]?.body || {},
  };
  const roles = deriveRoles(merged);
  const perViewport = list.map(o => ({ viewport: o.viewport, accent: deriveRoles(o).accent }));
  const accentAgrees = perViewport.every(v => v.accent === roles.accent);
  const fonts = sortedEntries(mergeCounts(list.map(o => o.fonts))).slice(0, 4).map(([family, count]) => ({ family, count }));
  const colorCount = new Set([...Object.keys(merged.text), ...Object.keys(merged.surfaces), ...Object.keys(merged.links), ...Object.keys(merged.actions).map(k => k.replace(/^(bg|text):/, ''))].map(toHex).filter(Boolean)).size;
  const out = {
    spacingBase: spacing.base, spacingScale: spacing.scale, spacingCoverage: spacing.coverage, offScale: spacing.offScale,
    typeSteps: type.steps.length, typeStepDetail: type.steps, distinctFontSizes: type.distinctSizes,
    radii, controlHeights, fonts, colorCount,
    accentDerived: roles.accent, accentFrom: roles.accentFrom, accentAgreesAcrossViewports: accentAgrees, perViewport,
    ink: roles.ink, canvas: roles.canvas, inkContrast: roles.inkContrast, accentContrast: roles.accentContrast,
    roleEvidence: roles.evidence,
    ...summarizeExtras(list, roles),
  };
  const structures = list.map(o => o && o.structure).filter(Boolean);
  if (structures.length) {
    out.structure = structureSummary(structures);
    out.facts = buildFacts(out, out.structure).facts;
  }
  return out;
}
