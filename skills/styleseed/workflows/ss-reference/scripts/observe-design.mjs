// Read-only browser probe for reference measurement: pass to page.evaluate in a browser the
// caller controls. It reads computed styles of visible elements and returns counts only.
// No navigation, requests, interaction, DOM writes, screenshots, text, URLs, or form values leave the page.
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
  };
  const bodyStyle = document.body ? getComputedStyle(document.body) : null;
  if (bodyStyle) {
    out.body.color = norm(bodyStyle.color); out.body.background = norm(bodyStyle.backgroundColor);
    out.body.fontFamily = bodyStyle.fontFamily.split(',')[0].replace(/["']/g, '').trim(); out.body.fontSize = px(bodyStyle.fontSize);
  }
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
    const isAction = buttonLike(el), isLink = !isAction && el.tagName === 'A' && hasOwnText(el);
    // Actions and links carry the accent role; plain text and surfaces carry ink and canvas.
    if (isAction) {
      const key = transparent(bg) ? `text:${fg}` : `bg:${bg}`;
      tally(out.actions, key); tally(out.actionText, fg);
      tally(out.controlHeights, Math.round(rect.height));
    } else if (isLink) {
      tally(out.links, fg);
    }
    if (hasOwnText(el)) {
      if (/^H[1-6]$/.test(el.tagName)) tally(out.headings, fg); else if (!isAction && !isLink) tally(out.text, fg);
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
  return out;
}
