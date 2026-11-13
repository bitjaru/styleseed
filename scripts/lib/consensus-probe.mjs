// Read-only control probe for the pattern-consensus study: pass to page.evaluate on the same page
// load as the engine probes. The engine probes record the height of the input element itself, which
// understates the visible field where a system wraps a borderless input in a bordered box, and they
// count every <button>, including checkboxes and tabs built on one. This probe measures what the
// control-height claims need: the visible box of each text field, each labelled action button, the
// pairs of the two that sit on one row, and how many characters are set in each font size.
// It returns numbers and enums only. Text is read inside the page to count characters and is never
// returned. No navigation, request, click, hover, key press, DOM write, selector, class name, id,
// URL, or screenshot leaves the page. Caps: 400 fields, 400 buttons, 60 pairs.
export function observeControls({ maxElements = 5000 } = {}) {
  const CAP = { fields: 400, buttons: 400, pairs: 60 };
  const vw = window.innerWidth;
  const num = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
  const round = n => Math.round(n);
  const half = n => Math.round(n * 2) / 2;
  const tally = (map, key, weight = 1) => { map[key] = (map[key] || 0) + weight; };
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
      const un = v => alpha > 0 && alpha < 1 ? Math.round(Math.min(255, v / alpha)) : v;
      out = alpha >= 0.999 ? `rgb(${r}, ${g}, ${b})` : alpha <= 0 ? 'rgba(0, 0, 0, 0)' : `rgba(${un(r)}, ${un(g)}, ${un(b)}, ${alpha})`;
    } catch { out = value; }
    normCache.set(value, out);
    return out;
  };
  const transparent = value => !value || value === 'transparent' || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(value) || /\/\s*0\)$/.test(value);
  const info = new Map();
  const box = el => {
    let i = info.get(el);
    if (!i) {
      const rect = el.getBoundingClientRect(), cs = getComputedStyle(el);
      i = { rect, cs, visible: rect.width > 1 && rect.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && num(cs.opacity) > 0 };
      info.set(el, i);
    }
    return i;
  };
  const bgCache = new Map();
  const effectiveBg = el => {
    if (!el) return 'rgb(255, 255, 255)';
    if (bgCache.has(el)) return bgCache.get(el);
    const own = norm(box(el).cs.backgroundColor);
    const out = !transparent(own) ? own : effectiveBg(el.parentElement);
    bgCache.set(el, out);
    return out;
  };
  const side = (cs, s) => num(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && !transparent(norm(cs[`border${s}Color`]));
  const boxed = cs => ['Top', 'Right', 'Bottom', 'Left'].every(s => side(cs, s));
  const ringed = cs => /\b0px 0px 0px [1-9]|inset/.test(cs.boxShadow || '');
  // What lies behind an element is a picture or a gradient when an ancestor, up to and including
  // the first one with a background colour, paints a background image. A colour comparison cannot
  // tell a white card from such a backdrop, so there an opaque own background counts as painted.
  const imageCache = new Map();
  const imageBehind = el => {
    if (!el) return false;
    if (imageCache.has(el)) return imageCache.get(el);
    const { cs } = box(el);
    const out = (cs.backgroundImage || 'none') !== 'none' ? true : !transparent(norm(cs.backgroundColor)) ? false : imageBehind(el.parentElement);
    imageCache.set(el, out);
    return out;
  };
  const filledBg = el => { const bg = norm(box(el).cs.backgroundColor); return !transparent(bg) && (bg !== effectiveBg(el.parentElement) || imageBehind(el.parentElement)); };
  // Painted: a box a reader sees as one control or one panel.
  const painted = el => { const { cs } = box(el); return boxed(cs) || filledBg(el) || ringed(cs); };
  const SECTIONING = 'article,aside,main,nav,section,[role=main],[role=region],[role=complementary],[role=navigation],[role=article]';
  // Chrome is not measured: navigation and banner landmarks, a page-level header or footer, and
  // anything fixed to the viewport (floating demo widgets, drawers' handles).
  const chromeCache = new Map();
  const inChrome = el => {
    if (!el || el === document.body) return false;
    if (chromeCache.has(el)) return chromeCache.get(el);
    const tag = el.tagName, role = el.getAttribute('role');
    let out = tag === 'NAV' || role === 'navigation' || role === 'banner' || role === 'contentinfo'
      || ((tag === 'HEADER' || tag === 'FOOTER') && !(el.parentElement && el.parentElement.closest(SECTIONING)))
      || box(el).cs.position === 'fixed';
    if (!out) out = inChrome(el.parentElement);
    chromeCache.set(el, out);
    return out;
  };
  const radiusOf = el => { const v = box(el).cs.borderTopLeftRadius || '0'; if (v.includes('%')) return parseFloat(v) >= 50 ? 999 : 0; const n = num(v); return n > 200 || n >= box(el).rect.height / 2 ? 999 : half(n); };

  const FIELD = 'input:not([type]),input[type=text],input[type=email],input[type=password],input[type=tel],input[type=url],input[type=search],input[type=number],input[type=date],select,[role=combobox]';
  const NOT_A_BUTTON = new Set(['checkbox', 'switch', 'radio', 'tab', 'combobox', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'slider', 'link', 'treeitem', 'row', 'gridcell']);
  const STOP = 'td,th,tr,li,label,form,fieldset,[role=row],[role=cell],[role=gridcell],[role=group],[role=radiogroup]';
  // The visible box of a field: the outermost painted ancestor that is still the control (not much
  // taller or wider than the input), else the input itself.
  const fieldBox = el => {
    const er = box(el).rect;
    let best = el, cur = el;
    for (let d = 0; d < 4; d++) {
      const p = cur.parentElement;
      if (!p || p === document.body || p.matches(STOP)) break;
      const pr = box(p).rect;
      if (pr.height > er.height + 28 || pr.height > 72 || pr.width > er.width + 160) break;
      if (painted(p)) best = p;
      cur = p;
    }
    return best;
  };
  // The panel a control sits in: the nearest ancestor of at least 160×48, narrower than the viewport
  // (a full-width band is the page, not a card), that is painted, or that has its own background
  // colour and rounded corners. The second test finds a white card on a backdrop of the same colour
  // that a positioned sibling paints, which no comparison of ancestor colours can see. `wide` is a
  // panel of at least 0.7 of the viewport width (often the page's one content surface), `narrow` a
  // smaller one, `none` no panel.
  const rounded = el => { const { cs } = box(el); return !transparent(norm(cs.backgroundColor)) && num(cs.borderTopLeftRadius) >= 4; };
  const panelOf = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const { rect } = box(p);
      if (rect.width >= 160 && rect.height >= 48 && rect.width <= vw - 32 && (painted(p) || rounded(p))) return rect.width >= vw * 0.7 ? 'wide' : 'narrow';
    }
    return 'none';
  };

  const out = { version: 1, viewport: { width: vw, height: window.innerHeight }, truncated: false, fields: {}, buttons: {}, pairs: [], textSizes: {}, capped: {} };
  const all = document.querySelectorAll('body *');
  const fields = [], buttons = [];
  let seen = 0;
  for (const el of all) {
    if (seen++ >= maxElements) { out.truncated = true; break; }
    if (el instanceof SVGElement) continue;
    const b = box(el);
    if (!b.visible || inChrome(el)) continue;
    // Characters per font size, from the element's own text nodes.
    let chars = 0;
    for (const node of el.childNodes) if (node.nodeType === 3) chars += node.textContent.replace(/\s+/g, ' ').trim().length;
    if (chars && !el.closest('button,[role=button],select,option,script,style')) tally(out.textSizes, half(num(b.cs.fontSize)), chars);
    if (el.matches(FIELD) && !el.disabled) {
      if (el.closest('[role=combobox]') && !el.matches('[role=combobox]')) continue;
      const fb = fieldBox(el), fr = box(fb).rect;
      if (fr.width < 48) continue;
      const kind = el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox' ? 'select' : 'text';
      const rec = { el: fb, kind, h: round(fr.height), self: round(b.rect.height), r: radiusOf(fb), size: half(num(b.cs.fontSize)), panel: panelOf(fb), rect: fr };
      if (fields.length < CAP.fields) fields.push(rec); else tally(out.capped, 'fields');
      continue;
    }
    const tag = el.tagName, role = el.getAttribute('role');
    const buttonLike = tag === 'BUTTON' || (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) || role === 'button'
      || (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : ''));
    if (!buttonLike || NOT_A_BUTTON.has(role) || el.getAttribute('aria-haspopup') === 'listbox') continue;
    const label = (tag === 'INPUT' ? el.value : el.innerText || '').replace(/\s+/g, ' ').trim();
    if (label.length < 2) continue; // icon-only buttons are not the default button
    const bg = norm(b.cs.backgroundColor);
    let emphasis = 'text';
    if ((!transparent(bg) && bg !== effectiveBg(el.parentElement)) || (b.cs.backgroundImage || '').includes('gradient')) emphasis = 'filled';
    else if (boxed(b.cs) || ringed(b.cs)) emphasis = 'outline';
    const rec = { el, emphasis, h: round(b.rect.height), r: radiusOf(el), size: half(num(b.cs.fontSize)), rect: b.rect };
    if (buttons.length < CAP.buttons) buttons.push(rec); else tally(out.capped, 'buttons');
  }
  for (const f of fields) tally(out.fields, `${f.kind}|${f.h}|${f.self}|${f.r}|${f.size}|${f.panel}`);
  for (const b of buttons) tally(out.buttons, `${b.emphasis}|${b.h}|${b.r}|${b.size}`);
  // Pairs: a filled or outline button and a field on one row (their boxes overlap by at least half
  // the smaller height) no more than 480px apart. One record per pair of distinct height and radius.
  const seenPairs = new Set();
  for (const f of fields) for (const b of buttons) {
    if (b.emphasis === 'text') continue;
    const overlap = Math.min(f.rect.bottom, b.rect.bottom) - Math.max(f.rect.top, b.rect.top);
    if (overlap < Math.min(f.rect.height, b.rect.height) / 2) continue;
    const apart = Math.max(b.rect.left - f.rect.right, f.rect.left - b.rect.right);
    if (apart > 480) continue;
    const key = `${f.h}|${b.h}|${f.r}|${b.r}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    if (out.pairs.length < CAP.pairs) out.pairs.push({ field: f.h, button: b.h, fieldRadius: f.r, buttonRadius: b.r }); else tally(out.capped, 'pairs');
  }
  return out;
}

// Read-only: the largest share of the viewport that one visible dialog covers, two decimals.
export function observeGuards() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let share = 0;
  for (const el of document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open],[aria-modal=true]')) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const w = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left)), h = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
    share = Math.max(share, (w * h) / (vw * vh));
  }
  return { overlayShare: Math.round(share * 100) / 100 };
}
