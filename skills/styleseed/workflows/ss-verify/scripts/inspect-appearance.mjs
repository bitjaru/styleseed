// Read-only browser probe: pass to page.evaluate in an existing authorized harness.
// No navigation, requests, interaction, DOM writes, screenshots, or text/form-value export.
// A measured pair is not a whole-screen accessibility or design verdict.
export function inspectAppearance({ artifactId, context, colors = [], typography = [] }) {
  const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const validId = value => typeof value === 'string' && idPattern.test(value);
  const roles = ['text', 'large-text', 'required-boundary', 'focus', 'state-cue', 'decorative', 'inactive'];
  const properties = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  const label = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
  if (!validId(artifactId) || !context || !['theme', 'state', 'specimen', 'fontCondition'].every(key => label(context[key]))) throw new Error('Artifact and explicit render context are required');
  if (!Array.isArray(colors) || !Array.isArray(typography) || colors.length + typography.length < 1 || colors.length + typography.length > 50) throw new Error('Supply 1–50 explicit bindings');
  const ids = new Set();
  for (const binding of [...colors, ...typography]) {
    if (!binding || !validId(binding.id) || ids.has(binding.id)) throw new Error('Binding IDs must be unique');
    ids.add(binding.id);
  }
  for (const binding of colors) {
    if (!roles.includes(binding.role) || !label(binding.reason) || !properties.includes(binding.foreground?.property) || !binding.background) throw new Error('Color bindings require a role, applicability reason, and two consumers');
    if (['text', 'large-text'].includes(binding.role) && binding.foreground.property !== 'color') throw new Error('Text bindings must inspect text color');
  }
  for (const binding of typography) if (!label(binding.role) || !label(binding.sampleId)) throw new Error('Typography bindings require a role and local specimen ID');
  const roots = document.querySelectorAll(`[data-styleseed-artifact="${artifactId}"]`);
  if (roots.length !== 1) throw new Error('Artifact root must match exactly once');
  const root = roots[0];
  const select = selector => {
    if (typeof selector !== 'string' || !selector || selector.length > 240) throw new Error('Invalid selector');
    const matches = [...root.querySelectorAll(selector)];
    if (root.matches(selector)) matches.unshift(root);
    const scoped = matches.filter(element => element.closest('[data-styleseed-artifact]') === root);
    return scoped.length === 1 ? scoped[0] : null;
  };
  const parseColor = value => {
    const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
    if (hex) {
      const expanded = hex[1].length === 3 ? [...hex[1]].map(char => char + char).join('') : hex[1];
      return [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16)).concat(1);
    }
    const rgb = value.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (!rgb) return null;
    const result = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
    return result.every(Number.isFinite) && result.slice(0, 3).every(n => n >= 0 && n <= 255) && result[3] >= 0 && result[3] <= 1 ? result : null;
  };
  const luminance = color => color.slice(0, 3).map(n => {
    const s = n / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const visibility = element => {
    const rect = element.getBoundingClientRect();
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || style.contentVisibility === 'hidden') return 'hidden-element';
      if (Number(style.opacity) !== 1 || style.transform !== 'none' || (style.zoom && Number(style.zoom) !== 1)) return 'opacity-transform-or-zoom';
    }
    if (!rect.width || !rect.height) return 'no-rendered-box';
    return null;
  };
  // Deliberately narrow support. Complex paint needs the actual crop and visual/manual review.
  const paintLimit = element => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.filter !== 'none' || style.backdropFilter && style.backdropFilter !== 'none' || style.mixBlendMode !== 'normal' || style.backgroundBlendMode !== 'normal' || style.maskImage && style.maskImage !== 'none' || style.clipPath !== 'none') return 'complex-paint';
      for (const pseudo of ['::before', '::after']) {
        const p = getComputedStyle(node, pseudo);
        if (p.content && !['none', 'normal'].includes(p.content) && p.display !== 'none') return 'pseudo-element-paint';
      }
    }
    return null;
  };
  const tokenCheck = (consumer, element, actual) => {
    if (consumer.token === undefined) return { status: 'not-requested' };
    if (!/^--[a-zA-Z][a-zA-Z0-9-]{0,100}$/.test(consumer.token)) throw new Error('Token must be one CSS custom property name');
    const raw = getComputedStyle(element).getPropertyValue(consumer.token).trim();
    if (!raw) return { token: consumer.token, status: 'fail', code: 'unresolved-token' };
    const expected = parseColor(raw);
    if (!expected) return { token: consumer.token, status: 'unsupported', code: 'unsupported-token-color' };
    return { token: consumer.token, status: expected.every((n, i) => Math.abs(n - actual[i]) < 0.0001) ? 'match' : 'fail', code: 'token-consumer-comparison' };
  };
  const colorChecks = colors.map(binding => {
    const base = { id: binding.id, role: binding.role, reason: binding.reason, foreground: binding.foreground, background: binding.background };
    const result = (status, code, detail = {}) => ({ ...base, status, code, ...detail });
    const element = select(binding.foreground.selector), backdrop = select(binding.background.selector);
    if (!element || !backdrop) return result('fail', 'binding-must-match-once');
    const hidden = visibility(element) || visibility(backdrop);
    if (hidden) return result('unsupported', hidden);
    const inactive = element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true';
    if (binding.role === 'decorative') return result('not-applicable', 'declared-decorative');
    if (binding.role === 'inactive') return inactive ? result('not-applicable', 'observed-inactive') : result('fail', 'inactive-state-not-observed');
    if (inactive) return result('unsupported', 'inactive-requires-applicability-review');
    if (binding.role === 'focus' && !element.matches(':focus-visible')) return result('unsupported', 'focus-state-not-observed');
    const style = getComputedStyle(element), backgroundStyle = getComputedStyle(backdrop);
    if (binding.foreground.property === 'outlineColor' && (parseFloat(style.outlineWidth) === 0 || style.outlineStyle === 'none')) return result('unsupported', 'boundary-not-painted');
    if (binding.foreground.property.startsWith('border')) {
      const side = binding.foreground.property.replace('Color', '');
      if (parseFloat(style[`${side}Width`]) === 0 || style[`${side}Style`] === 'none') return result('unsupported', 'boundary-not-painted');
    }
    const complex = paintLimit(element) || paintLimit(backdrop);
    if (complex) return result('unsupported', complex);
    if (binding.foreground.property === 'color' && (style.textShadow !== 'none' || element.children.length)) return result('unsupported', 'text-paint-needs-leaf-binding');
    if (backdrop !== element && !backdrop.contains(element)) return result('unsupported', 'adjacency-needs-manual-review');
    // For text, its own background can occlude a declared ancestor. For an outer boundary,
    // the element's fill is intentionally not the outside adjacent surface.
    let node = binding.foreground.property === 'color' ? element : element.parentElement;
    if (backdrop !== element) for (; node && node !== backdrop; node = node.parentElement) {
      const paint = parseColor(getComputedStyle(node).backgroundColor);
      if (!paint || paint[3] !== 0) return result('unsupported', 'intervening-background');
    }
    const foreground = parseColor(style[binding.foreground.property]);
    const background = parseColor(backgroundStyle.backgroundColor);
    if (!foreground || !background || foreground[3] !== 1 || background[3] !== 1) return result('unsupported', 'requires-opaque-srgb-pair');
    if (binding.foreground.property === 'color') {
      const fill = style.webkitTextFillColor && parseColor(style.webkitTextFillColor);
      if (parseFloat(style.webkitTextStrokeWidth) > 0 || fill && fill.some((n, i) => n !== foreground[i])) return result('unsupported', 'nonstandard-text-paint');
    }
    let minimum = binding.role === 'text' ? 4.5 : 3;
    if (binding.role === 'large-text') {
      const size = parseFloat(style.fontSize), weight = parseFloat(style.fontWeight);
      if (!(size >= 24 || size >= 56 / 3 && weight >= 700)) return result('fail', 'large-text-size-not-met');
    }
    const tokens = [tokenCheck(binding.foreground, element, foreground), tokenCheck(binding.background, backdrop, background)];
    const fgL = luminance(foreground), bgL = luminance(background);
    const ratio = (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05);
    const details = { foregroundColor: style[binding.foreground.property], backgroundColor: backgroundStyle.backgroundColor, ratio, minimum, tokens };
    if (tokens.some(token => token.status === 'fail')) return result('fail', 'token-binding-failed', details);
    if (tokens.some(token => token.status === 'unsupported')) return result('unsupported', 'token-binding-unresolved', details);
    // Compare the unrounded value. Display formatting is the caller's responsibility.
    return result(ratio >= minimum ? 'pass' : 'fail', 'opaque-pair-contrast', details);
  });
  const typeObservations = typography.map(binding => {
    const base = { id: binding.id, selector: binding.selector, role: binding.role, sampleId: binding.sampleId };
    const element = select(binding.selector);
    if (!element) return { ...base, status: 'fail', code: 'binding-must-match-once' };
    const hidden = visibility(element);
    if (hidden) return { ...base, status: 'unsupported', code: hidden };
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    const properties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStretch', 'fontStyle', 'fontOpticalSizing', 'fontVariationSettings', 'fontVariantNumeric', 'fontSynthesis', 'lineHeight', 'letterSpacing', 'wordBreak', 'overflowWrap'];
    const declared = Object.fromEntries(properties.map(property => [property, style[property]]));
    const normalize = value => value.trim().replace(/^["']|["']$/g, '').toLowerCase();
    const families = style.fontFamily.split(',').map(normalize);
    const faces = [...document.fonts].filter(face => families.includes(normalize(face.family))).slice(0, 20)
      .map(face => ({ family: face.family, weight: face.weight, style: face.style, status: face.status }));
    return { ...base, status: 'observed', declared, box: { width: rect.width, height: rect.height }, fontSetStatus: document.fonts.status, declaredFontFaces: faces, glyphFontVerification: 'not-performed', mixedMarkup: element.children.length > 0 };
  });
  const results = [...colorChecks, ...typeObservations];
  return {
    schemaVersion: 1, artifactId,
    context: Object.fromEntries(['theme', 'state', 'specimen', 'fontCondition'].map(key => [key, context[key]])),
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    status: results.some(item => item.status === 'fail') ? 'fail' : results.some(item => item.status === 'unsupported') ? 'unsupported' : 'observed',
    colorChecks, typography: typeObservations,
    scope: 'declared-consumers-at-one-render-state', designAcceptance: 'not-assessed',
  };
}
