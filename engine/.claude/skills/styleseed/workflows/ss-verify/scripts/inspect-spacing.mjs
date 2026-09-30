// Pass this self-contained function to page.evaluate in the project's browser harness.
// It reads geometry/styles only: no page mutations, text values, screenshots, network or clicks.
export function inspectSpacing({ artifactId, spacing, bindings, noWrapControls = [] }) {
  const roles = ['pageInset', 'sectionGap', 'groupGap', 'stackGap', 'inlineGap', 'componentInset'];
  const allowed = {
    pageInset: ['paddingLeft', 'paddingRight'], sectionGap: ['rowGap'], groupGap: ['rowGap'],
    stackGap: ['rowGap'], inlineGap: ['columnGap'],
    componentInset: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'],
  };
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(artifactId) || !spacing?.roles || !Object.keys(spacing.roles).length || Object.keys(spacing.roles).some(role => !roles.includes(role))) throw new Error('Invalid spatial contract');
  if (!Number.isInteger(spacing.wideMinWidth) || spacing.wideMinWidth < 320 || spacing.wideMinWidth > 3840) throw new Error('Invalid spatial breakpoint');
  if (!Array.isArray(bindings) || !bindings.length || bindings.length > 100 || !Array.isArray(noWrapControls) || noWrapControls.length > 100) throw new Error('Explicit bounded bindings are required');
  const roots = document.querySelectorAll(`[data-styleseed-artifact="${artifactId}"]`);
  if (roots.length !== 1) throw new Error('Artifact root must match exactly once');
  const root = roots[0];
  const failures = [], unsupported = [], observations = [], measurements = [];
  const rootStyle = getComputedStyle(root);
  const visible = element => {
    const rect = element.getBoundingClientRect();
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || style.transform !== 'none' || (style.zoom && Number(style.zoom) !== 1)) return false;
    }
    return rect.width > 0 && rect.height > 0;
  };
  if (!visible(root)) unsupported.push({ code: 'hidden-or-transformed-root' });
  const select = selector => {
    if (typeof selector !== 'string' || !selector || selector.length > 240) throw new Error('Invalid binding selector');
    const all = [...root.querySelectorAll(selector)];
    if (root.matches(selector)) all.unshift(root);
    return all.filter(element => element.closest('[data-styleseed-artifact]') === root);
  };
  const lengthPx = (raw, element) => {
    const match = String(raw).trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em)?$/);
    if (!match) return null;
    const number = Number(match[1]);
    if (!match[2] && number !== 0) return null;
    const factor = match[2] === 'rem' ? parseFloat(getComputedStyle(document.documentElement).fontSize) : match[2] === 'em' ? parseFloat(getComputedStyle(element).fontSize) : 1;
    return number * factor;
  };
  const seen = new Set();
  for (const binding of bindings) {
    if (!binding || !roles.includes(binding.role) || !allowed[binding.role].includes(binding.property)) throw new Error('Invalid role/property binding');
    const { role, selector, property } = binding;
    if (!spacing.roles[role]) { failures.push({ code: 'undeclared-role', role }); continue; }
    seen.add(role);
    const value = window.innerWidth >= spacing.wideMinWidth ? spacing.roles[role].wide ?? spacing.roles[role].base : spacing.roles[role].base;
    if (!(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 256) && !(typeof value === 'string' && /^var\(--(?!ss-space-)[a-zA-Z][a-zA-Z0-9-]{0,63}\)$/.test(value))) throw new Error('Invalid bound spatial value');
    const elements = select(selector);
    if (!elements.length || elements.length > 200) { failures.push({ code: 'binding-match-count', role, count: elements.length }); continue; }
    for (const element of elements) {
      const style = getComputedStyle(element);
      if (!visible(element)) { unsupported.push({ code: 'hidden-or-transformed-binding', role }); continue; }
      if (['rowGap', 'columnGap'].includes(property) && !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) { failures.push({ code: 'gap-container-not-supported', role }); continue; }
      const raw = typeof value === 'number' ? `${value}px` : rootStyle.getPropertyValue(value.slice(4, -1)).trim();
      const expected = lengthPx(raw, element);
      const actual = lengthPx(style[property], element);
      if (!raw) { failures.push({ code: 'unresolved-token', role }); continue; }
      if (expected === null) { unsupported.push({ code: 'unsupported-token-length', role }); continue; }
      if (expected < 0 || !Number.isFinite(expected)) { failures.push({ code: 'invalid-token-length', role }); continue; }
      if (actual === null || !Number.isFinite(actual) || actual < 0) { failures.push({ code: 'unapplied-spacing', role }); continue; }
      // Gap/padding can have subpixel rounding; this is compliance, not a visual quality score.
      const delta = Math.abs(actual - expected);
      measurements.push({ role, property, expected, actual, delta });
      if (delta > 0.5) failures.push({ code: 'spacing-mismatch', role, expected, actual });
    }
  }
  for (const role of Object.keys(spacing.roles)) if (!seen.has(role)) failures.push({ code: 'missing-role-binding', role });
  if (root.scrollWidth > root.clientWidth + 1) observations.push({ code: 'horizontal-overflow', excessPx: root.scrollWidth - root.clientWidth });
  for (const selector of noWrapControls) {
    const elements = select(selector);
    if (!elements.length || elements.length > 200) { unsupported.push({ code: 'control-match-count' }); continue; }
    for (const element of elements) {
      if (!visible(element)) { unsupported.push({ code: 'hidden-control' }); continue; }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const tops = []; let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width > 0 && !tops.some(top => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
      }
      if (tops.length > 1) observations.push({ code: 'control-wrap', lines: tops.length });
    }
  }
  return {
    schemaVersion: 1, artifactId, viewport: { width: window.innerWidth, height: window.innerHeight },
    contract: { wideMinWidth: spacing.wideMinWidth, roles: spacing.roles },
    status: failures.length ? 'fail' : unsupported.length ? 'unsupported' : 'pass',
    measurements, failures, unsupported, observations,
    designAcceptance: 'not-assessed', scope: 'supplied-bindings-at-one-viewport',
  };
}
