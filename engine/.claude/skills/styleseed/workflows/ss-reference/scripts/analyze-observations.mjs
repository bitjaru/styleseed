// Pure analysis of observe-design output. No I/O, no browser. Every derived value names the
// counts it came from, so a human can disagree with the derivation and keep the observation.

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
  return {
    spacingBase: spacing.base, spacingScale: spacing.scale, spacingCoverage: spacing.coverage, offScale: spacing.offScale,
    typeSteps: type.steps.length, typeStepDetail: type.steps, distinctFontSizes: type.distinctSizes,
    radii, controlHeights, fonts, colorCount,
    accentDerived: roles.accent, accentFrom: roles.accentFrom, accentAgreesAcrossViewports: accentAgrees, perViewport,
    ink: roles.ink, canvas: roles.canvas, inkContrast: roles.inkContrast, accentContrast: roles.accentContrast,
    roleEvidence: roles.evidence,
  };
}
