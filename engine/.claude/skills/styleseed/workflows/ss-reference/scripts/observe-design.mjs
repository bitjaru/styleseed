// Read-only browser probe for reference measurement: pass to page.evaluate in a browser the
// caller controls. It reads computed styles of visible elements and returns counts keyed by
// numbers, enums, CSS values, and font family names. No navigation, requests, interaction, DOM
// writes, screenshots, text, selectors, class names, element ids, asset URLs, or form values leave
// the page. Geometry (region and section rectangles) is recorded by the separate structure probe
// (observe-structure.mjs) as numbers, under the same boundary; caps per viewport there: 8 regions,
// 40 sections, 12 tables, 12 lists, 8 tab sets. `backdrop` maps CSS colour strings to the share
// of the document height that the root and full-bleed opaque backgrounds paint behind content.
// Counts are measurements of one rendered viewport; they are not design judgments or role decisions.
export function observeDesign({ maxElements = 5000 } = {}) {
  const tally = (map, key, weight = 1) => { if (key === undefined || key === null || key === '') return; map[key] = (map[key] || 0) + weight; };
  const px = value => { const n = parseFloat(value); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; };
  // Computed colours may come back as lab()/oklab()/color(). Painting one pixel on an sRGB canvas
  // and reading it back gives rgb()/rgba() for any CSS colour; results are cached per string.
  const ctx = (() => { try { const c = document.createElement('canvas'); c.width = 1; c.height = 1; return c.getContext('2d', { willReadFrequently: true }); } catch { return null; } })();
  const normCache = new Map();
  const norm = value => {
    if (!ctx || typeof value !== 'string' || !value) return value;
    if (normCache.has(value)) return normCache.get(value);
    let out = value;
    try {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const alpha = Math.round((a / 255) * 1000) / 1000;
      // Un-premultiply only when visible; a fully transparent pixel stays rgba(0, 0, 0, 0).
      const un = v => alpha > 0 && alpha < 1 ? Math.round(Math.min(255, v / alpha)) : v;
      out = alpha >= 0.999 ? `rgb(${r}, ${g}, ${b})` : alpha <= 0 ? 'rgba(0, 0, 0, 0)' : `rgba(${un(r)}, ${un(g)}, ${un(b)}, ${alpha})`;
    } catch { out = value; }
    normCache.set(value, out);
    return out;
  };
  const transparent = value => !value || value === 'transparent' || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(value) || /\/\s*0\)$/.test(value);
  // Radii: percentages and oversized values are pills; keep them as one family instead of raw numbers.
  const radiusPx = value => { if (typeof value !== 'string') return null; if (value.includes('%')) return parseFloat(value) >= 50 ? 999 : null; const n = px(value); return n === null ? null : n > 200 ? 999 : n; };
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const docHeight = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const out = {
    viewport, documentHeight: docHeight, elements: 0, truncated: false,
    actions: {}, actionText: {}, links: {}, text: {}, headings: {}, surfaces: {},
    spacing: {}, type: {}, radii: {}, controlHeights: {}, fonts: {}, shadows: {}, borders: {},
    body: { color: null, background: null, fontFamily: null, fontSize: null },
    actionPairs: {}, motion: { transitions: {}, animations: {} }, targets: {}, tabular: 0, backdrop: {},
  };
  const bodyStyle = document.body ? getComputedStyle(document.body) : null;
  if (bodyStyle) {
    out.body.color = norm(bodyStyle.color); out.body.background = norm(bodyStyle.backgroundColor);
    out.body.fontFamily = bodyStyle.fontFamily.split(',')[0].replace(/["']/g, '').trim(); out.body.fontSize = px(bodyStyle.fontSize);
  }
  // Backdrop: a one-dimensional painter over the document's vertical axis. The root colour (<html>
  // when opaque, else <body> when opaque) paints the whole height; when both are opaque, <body>
  // paints its own vertical extent over it. Then each visible full-bleed element (left edge at 0,
  // right edge at the viewport's client width) with an opaque background colour paints its own
  // extent, later elements over earlier ones. Fixed and sticky elements (or inside one) do not
  // paint: they cover the viewport, not the document. Images, gradients, and translucent
  // backgrounds do not paint (the colour beneath keeps the span), and z-index is ignored. A card
  // with side margins is a surface, not the canvas.
  const scrollY = window.scrollY, clientW = document.documentElement.clientWidth;
  let spans = [];
  const opaque = value => (typeof value === 'string' && /^rgb\(/.test(value) ? value : null);
  const paint = (top, bottom, colour) => {
    const a = Math.max(0, top), b = Math.min(docHeight, bottom);
    if (!(b > a)) return;
    const next = [];
    for (const s of spans) {
      if (s.b <= a || s.a >= b) { next.push(s); continue; }
      if (s.a < a) next.push({ a: s.a, b: a, c: s.c });
      if (s.b > b) next.push({ a: b, b: s.b, c: s.c });
    }
    next.push({ a, b, c: colour });
    spans = next.sort((x, y) => x.a - y.a);
  };
  const pinned = el => { for (let p = el; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return true; } return false; };
  const rootBg = opaque(norm(getComputedStyle(document.documentElement).backgroundColor));
  const bodyBg = bodyStyle ? opaque(out.body.background) : null;
  if (rootBg) {
    paint(0, docHeight, rootBg);
    if (bodyBg) { const r = document.body.getBoundingClientRect(); paint(r.top + scrollY, r.bottom + scrollY, bodyBg); }
  } else if (bodyBg) paint(0, docHeight, bodyBg);
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE', 'SVG', 'PATH', 'BR', 'WBR']);
  const buttonLike = el => {
    const tag = el.tagName;
    if (tag === 'BUTTON') return true;
    if (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) return true;
    if (el.getAttribute('role') === 'button') return true;
    if (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(el.className || '')) return true;
    return false;
  };
  const hasOwnText = el => { for (const node of el.childNodes) if (node.nodeType === 3 && node.textContent.trim().length > 1) return true; return false; };
  const interactive = el => ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(el.tagName) || ['button', 'link', 'tab', 'menuitem', 'checkbox', 'switch', 'radio', 'combobox', 'textbox', 'option'].includes(el.getAttribute('role'));
  // Motion values: comma lists split outside parentheses; easings keep keywords and numeric functions only.
  const list = value => String(value || '').split(/,(?![^()]*\))/).map(v => v.trim()).filter(Boolean);
  const ms = value => { const n = parseFloat(value); return Number.isFinite(n) ? Math.round(/ms$/.test(value) ? n : n * 1000) : 0; };
  const easing = value => (/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/.test(value) || /^(cubic-bezier|steps|linear)\([-\d.,\s%a-z]*\)$/.test(value) ? value : 'other');
  const propFamily = prop => {
    if (prop === 'all' || prop === 'opacity' || prop === 'transform') return prop;
    if (/^(translate|scale|rotate)$/.test(prop)) return 'transform';
    if (/color$|^fill$|^stroke$|^background$/.test(prop)) return 'color';
    if (/shadow/.test(prop)) return 'shadow';
    if (/^(width|height|max-|min-|margin|padding|inset|top|right|bottom|left|flex|grid)/.test(prop)) return 'layout';
    return 'other';
  };
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    if (out.elements >= maxElements) { out.truncated = true; break; }
    if (skip.has(el.tagName)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    out.elements++;
    const area = Math.round(rect.width * rect.height);
    const bg = norm(cs.backgroundColor), fg = norm(cs.color);
    if (opaque(bg) && rect.left <= 1 && rect.right >= clientW - 1 && !pinned(el)) paint(rect.top + scrollY, rect.bottom + scrollY, bg);
    const isAction = buttonLike(el), isLink = !isAction && el.tagName === 'A' && hasOwnText(el);
    // Actions and links carry the accent role; plain text and surfaces carry ink and canvas.
    if (isAction) {
      const key = transparent(bg) ? `text:${fg}` : `bg:${bg}`;
      tally(out.actions, key); tally(out.actionText, fg);
      tally(out.controlHeights, Math.round(rect.height));
      if (!transparent(bg)) tally(out.actionPairs, `${bg}|${fg}`);
    } else if (isLink) {
      tally(out.links, fg);
    }
    if (isAction || interactive(el)) tally(out.targets, Math.round(Math.min(rect.width, rect.height)));
    const durations = list(cs.transitionDuration);
    if (durations.some(d => ms(d) > 0)) {
      const props = list(cs.transitionProperty), easings = list(cs.transitionTimingFunction);
      durations.forEach((d, i) => { if (ms(d) > 0) tally(out.motion.transitions, `${propFamily(props[i % props.length] || 'all')}|${ms(d)}|${easing(easings[i % easings.length] || 'ease')}`); });
    }
    if (cs.animationName && cs.animationName !== 'none') {
      const durs = list(cs.animationDuration), easings = list(cs.animationTimingFunction), counts = list(cs.animationIterationCount);
      list(cs.animationName).forEach((name, i) => {
        const d = ms(durs[i % durs.length] || '0s');
        const n = counts[i % counts.length] || '1';
        if (name !== 'none' && d > 0) tally(out.motion.animations, `${d}|${easing(easings[i % easings.length] || 'ease')}|${n === 'infinite' ? 'infinite' : Number(n) || 1}`);
      });
    }
    if (hasOwnText(el)) {
      if (/^H[1-6]$/.test(el.tagName)) tally(out.headings, fg); else if (!isAction && !isLink) tally(out.text, fg);
      if (/tabular-nums/.test(cs.fontVariantNumeric) || /["']tnum["']/.test(cs.fontFeatureSettings)) out.tabular++;
      const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      tally(out.fonts, family);
      tally(out.type, `${px(cs.fontSize)}|${cs.fontWeight}|${px(cs.lineHeight) ?? 'normal'}`);
    }
    if (!transparent(bg) && area >= 2000 && !buttonLike(el)) tally(out.surfaces, bg, 1);
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) tally(out.controlHeights, Math.round(rect.height));
    for (const prop of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
      const v = px(cs[prop]); if (v && v > 0 && v < 400) tally(out.spacing, v);
    }
    const radius = radiusPx(cs.borderTopLeftRadius);
    if (radius !== null && (!transparent(bg) || px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none')) tally(out.radii, radius);
    if (cs.boxShadow && cs.boxShadow !== 'none') tally(out.shadows, cs.boxShadow);
    const bw = px(cs.borderTopWidth); if (bw && bw > 0 && cs.borderTopStyle !== 'none') tally(out.borders, `${bw}|${norm(cs.borderTopColor)}`);
  }
  // Share of the document height per colour, two decimals, under 0.01 dropped, largest first (ties
  // by colour string). An unpainted remainder is not listed, so `backdrop` may be empty.
  const painted = {};
  for (const s of spans) painted[s.c] = (painted[s.c] || 0) + (s.b - s.a);
  Object.entries(painted).map(([c, len]) => [c, docHeight > 0 ? len / docHeight : 0]).filter(([, share]) => share >= 0.01)
    .map(([c, share]) => [c, Math.round(share * 100) / 100]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .forEach(([c, share]) => { out.backdrop[c] = share; });
  return out;
}
