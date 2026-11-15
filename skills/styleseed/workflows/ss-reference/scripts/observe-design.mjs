// Read-only browser probe for reference measurement: pass to page.evaluate in a browser the
// caller controls. It reads computed styles of visible elements and returns counts keyed by
// numbers, enums, CSS values, and font family names. No navigation, requests, interaction, DOM
// writes, screenshots, text, selectors, class names, element ids, asset URLs, or form values leave
// the page. Geometry (region and section rectangles) is recorded by the separate structure probe
// (observe-structure.mjs) as numbers, under the same boundary; caps per viewport there: 8 regions,
// 40 sections, 12 tables, 12 lists, 8 tab sets. `backdrop` maps CSS colour strings to the share
// of the document height that the root and full-bleed opaque backgrounds paint behind content.
// Control heights come from the visible-control-box block below: a field at the box a person sees,
// and only boxed action buttons with a one-line label (`controlHeightsByKind` splits them).
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
  // --- visible control box: shared block, version 1 -------------------------------------------------
  // One definition of the box a person sees as one control, for control heights. This block is the
  // same text in ss-reference/scripts/observe-design.mjs, ss-reference/scripts/observe-structure.mjs
  // and scripts/lib/consensus-probe.mjs (scripts/runtime-tests/control-box.test.mjs compares the three
  // copies). It uses `norm` and `transparent` of the probe around it and nothing else. Read-only:
  // rectangles, computed styles, attributes, and the length and line boxes of a button's own text;
  // nothing it reads leaves the page except the numbers and enums the probe tallies. To change it,
  // change all three copies in one commit and raise the version here and `controlBoxVersion` in
  // observe-design.mjs.
  //
  // Field: a text-like <input> (text, email, password, tel, url, search, number, date, datetime-local,
  //   month, week, time), a <select>, a <textarea>, [role=combobox|textbox|searchbox|spinbutton], or a
  //   button with aria-haspopup="listbox". A <textarea>, a list-box <select>, and an aria-multiline
  //   textbox are `multiline`: they have a box, and their height is not a control height.
  // Visible box of a field: walk from the field up through at most 4 ancestors, stopping below a table
  //   part, a list item, a fieldset, a dialog, a toolbar, or a sectioning element, and at the first
  //   ancestor more than 40px taller than the field, taller than 80px (single-line fields), wider
  //   than the larger of 720px and 3x the field, or spanning the viewport. Of the field and the ancestors
  //   passed, the nearest one that paints a box is the visible box: outlined (a border on four sides,
  //   an outline, or a visible box-shadow, drawn by the element, by its ::before or ::after, or by an
  //   absolutely positioned child that covers it) or filled (its own background differs from what is
  //   behind it). A box painted by background only gives way to an outlined ancestor at most 6px
  //   taller. No painted element: the field itself. Fields that resolve to one box are one control. A
  //   box under 40px wide or 16px tall is not a control.
  // Action button: <button>, <input type=submit|button|reset>, [role=button], or <a> whose class names
  //   say btn, button, or cta; not one carrying a widget role (checkbox, radio, switch, tab, option,
  //   menu item, slider, link, …), aria-checked, aria-selected, or aria-haspopup="listbox", and not
  //   inside a tab list, menu, list box, radio group, or tree. Its box is the button, or, when the
  //   button paints nothing itself, a child or grandchild that paints a box, is at least 80% as wide,
  //   and holds the whole visible label. Its height is a control height when it has a visible box
  //   (filled or outline), a visible label of at least 2 characters (1 for a Hangul, Han, or kana
  //   character) on one line, and a height from 24px to 80px.
  const controlBox = (() => {
    const LIMIT = { depth: 4, taller: 40, wrapper: 80, wide: 720, wider: 3, hug: 6, cover: 6, children: 12, textNodes: 24, inner: 0.8, fieldWidth: 40, fieldHeight: 16, buttonMin: 24, buttonMax: 80 };
    const TEXT_TYPES = new Set(['text', 'email', 'password', 'tel', 'url', 'search', 'number', 'date', 'datetime-local', 'month', 'week', 'time']);
    const NOT_ACTION = new Set(['checkbox', 'switch', 'radio', 'tab', 'combobox', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'slider', 'spinbutton', 'textbox', 'searchbox', 'listbox', 'link', 'treeitem', 'row', 'gridcell']);
    const WIDGET = '[role=tablist],[role=menu],[role=menubar],[role=listbox],[role=radiogroup],[role=tree]';
    const STOP = 'td,th,tr,li,fieldset,dialog,main,nav,aside,section,article,header,footer,[role=row],[role=cell],[role=gridcell],[role=columnheader],[role=rowheader],[role=listitem],[role=option],[role=radiogroup],[role=dialog],[role=alertdialog],[role=toolbar],[role=tablist],[role=main],[role=navigation],[role=banner],[role=contentinfo],[role=region],[role=complementary]';
    const FIELD_ROLES = '[role=combobox],[role=textbox],[role=searchbox],[role=spinbutton]';
    const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
    const px = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
    const seen = new Map();
    const at = el => { let i = seen.get(el); if (!i) { i = { rect: el.getBoundingClientRect(), cs: getComputedStyle(el) }; seen.set(el, i); } return i; };
    const shows = el => { const { rect, cs } = at(el); return rect.width > 1 && rect.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && px(cs.opacity) > 0; };
    const behindCache = new Map();
    const behind = el => {
      if (!el) return 'rgb(255, 255, 255)';
      if (behindCache.has(el)) return behindCache.get(el);
      const own = norm(at(el).cs.backgroundColor);
      const out = !transparent(own) ? own : behind(el.parentElement);
      behindCache.set(el, out);
      return out;
    };
    // A picture or gradient lies behind an element when an ancestor, up to and including the first
    // one with a background colour, paints a background image; there an opaque own colour is a fill.
    const imageCache = new Map();
    const imageBehind = el => {
      if (!el) return false;
      if (imageCache.has(el)) return imageCache.get(el);
      const { cs } = at(el);
      const out = (cs.backgroundImage || 'none') !== 'none' ? true : !transparent(norm(cs.backgroundColor)) ? false : imageBehind(el.parentElement);
      imageCache.set(el, out);
      return out;
    };
    const edge = (cs, s) => px(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && !transparent(norm(cs[`border${s}Color`]));
    const shadowOn = cs => {
      const value = cs.boxShadow || 'none';
      if (value === 'none') return false;
      return value.split(/,(?![^()]*\))/).some(layer => {
        const colour = (layer.match(/[a-z-]+\([^)]*\)|#[0-9a-f]+/i) || [null])[0];
        const lengths = [...layer.replace(/[a-z-]+\([^)]*\)|#[0-9a-f]+/gi, ' ').matchAll(/(-?[\d.]+)px/g)].map(m => Number(m[1]));
        return !(colour && transparent(norm(colour))) && lengths.some(n => n !== 0);
      });
    };
    const lined = cs => ['Top', 'Right', 'Bottom', 'Left'].every(s => edge(cs, s)) || (px(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none' && !transparent(norm(cs.outlineColor))) || shadowOn(cs);
    // The style that draws an element's outline: its own, or that of a cover, an absolutely positioned
    // child or ::before / ::after that lies over the whole element and is itself lined (an outline
    // drawn by a sibling of the input, as notched outlines are). Null when nothing outlines it.
    const coverCache = new Map();
    const outlineOf = el => {
      if (coverCache.has(el)) return coverCache.get(el);
      const { rect, cs } = at(el);
      let out = lined(cs) ? cs : null;
      for (const pseudo of out ? [] : ['::before', '::after']) {
        const p = getComputedStyle(el, pseudo);
        if (p.content && p.content !== 'none' && p.position === 'absolute' && ['top', 'right', 'bottom', 'left'].every(s => Math.abs(px(p[s])) <= LIMIT.cover && p[s] !== 'auto') && lined(p)) { out = p; break; }
      }
      if (!out && el.children.length <= LIMIT.children) {
        for (const child of el.children) {
          const c = at(child);
          if (c.cs.position !== 'absolute' || !lined(c.cs)) continue;
          if (Math.abs(c.rect.left - rect.left) <= LIMIT.cover && Math.abs(c.rect.right - rect.right) <= LIMIT.cover && Math.abs(c.rect.bottom - rect.bottom) <= LIMIT.cover && c.rect.top <= rect.top + LIMIT.cover && c.rect.top >= rect.top - 2 * LIMIT.cover) { out = c.cs; break; }
        }
      }
      coverCache.set(el, out);
      return out;
    };
    const outlined = el => !!outlineOf(el);
    // Radius of the box a person sees: the outline's corner when one is drawn, else the element's.
    // 999 is a pill: a percentage of 50 or more, over 200px, or at least half the height.
    const radiusOf = el => {
      const value = (outlineOf(el) || at(el).cs).borderTopLeftRadius || '0';
      if (value.includes('%')) return parseFloat(value) >= 50 ? 999 : 0;
      const n = px(value);
      return n > 200 || n >= at(el).rect.height / 2 ? 999 : Math.round(n * 2) / 2;
    };
    const filled = el => { const { cs } = at(el), bg = norm(cs.backgroundColor); return (cs.backgroundImage || '').includes('gradient') || (!transparent(bg) && (bg !== behind(el.parentElement) || imageBehind(el.parentElement))); };

    const fieldKind = el => {
      const tag = el.tagName, role = el.getAttribute('role');
      if (tag === 'TEXTAREA') return 'multiline';
      if (tag === 'SELECT') return el.multiple || el.size > 1 ? 'multiline' : 'select';
      if (tag === 'INPUT') return TEXT_TYPES.has(String(el.type).toLowerCase()) ? (role === 'combobox' ? 'select' : 'text') : null;
      if (role === 'combobox' || ((tag === 'BUTTON' || role === 'button') && el.getAttribute('aria-haspopup') === 'listbox')) return 'select';
      if (role === 'textbox' || role === 'searchbox') return el.getAttribute('aria-multiline') === 'true' ? 'multiline' : 'text';
      return role === 'spinbutton' ? 'text' : null;
    };
    const fieldBox = (el, kind) => {
      const er = at(el).rect, chain = [el];
      const maxH = kind === 'multiline' ? er.height + LIMIT.taller : Math.min(er.height + LIMIT.taller, Math.max(LIMIT.wrapper, er.height + LIMIT.hug));
      const maxW = Math.max(LIMIT.wide, er.width * LIMIT.wider);
      for (let cur = el, depth = 0; depth < LIMIT.depth; depth++) {
        const p = cur.parentElement;
        if (!p || p === document.body || p === document.documentElement || p.matches(STOP)) break;
        const pr = at(p).rect;
        if (pr.height > maxH || pr.width > maxW || (pr.left <= 1 && pr.right >= document.documentElement.clientWidth - 1)) break;
        // An ancestor that does not hold the field (an inline box, a `display: contents` box) is passed over.
        if (pr.height >= er.height - 1 && pr.width >= er.width - 1) chain.push(p);
        cur = p;
      }
      const paint = chain.map(x => (outlined(x) ? 'outline' : filled(x) ? 'fill' : null));
      const first = paint.findIndex(Boolean);
      if (first < 0) return el;
      if (paint[first] === 'fill') {
        const h = at(chain[first]).rect.height;
        const hugging = chain.findIndex((x, i) => i > first && paint[i] === 'outline' && at(x).rect.height - h <= LIMIT.hug);
        if (hugging > 0) return chain[hugging];
      }
      return chain[first];
    };

    const candidate = el => {
      const tag = el.tagName;
      return tag === 'BUTTON' || (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) || el.getAttribute('role') === 'button'
        || (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : ''));
    };
    const action = el => candidate(el) && !NOT_ACTION.has(el.getAttribute('role')) && !el.hasAttribute('aria-checked') && !el.hasAttribute('aria-selected') && !el.closest(WIDGET);
    // The visible label: how many characters and how many lines. Text in a box of 1px or less, with no
    // opacity, hidden, or at font size 0 is not visible. The text itself is never returned.
    const label = el => {
      if (el.tagName === 'INPUT') { const text = String(el.value || '').trim(); return { chars: text.length, cjk: CJK.test(text), lines: text ? 1 : 0, texts: [] }; }
      let chars = 0, cjk = false, nodes = 0;
      const rects = [], texts = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        if (++nodes > LIMIT.textNodes) return { chars, cjk, lines: 2, texts: [] };
        let hidden = false;
        for (let p = node.parentElement; p && !hidden; p = p === el ? null : p.parentElement) {
          const { rect, cs } = at(p);
          hidden = cs.visibility === 'hidden' || px(cs.opacity) === 0 || px(cs.fontSize) === 0 || (p !== el && cs.display !== 'contents' && (rect.width <= 1 || rect.height <= 1));
        }
        if (hidden) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const list = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1);
        if (!list.length) continue;
        chars += text.length;
        if (CJK.test(text)) cjk = true;
        rects.push(...list);
        texts.push(node);
      }
      rects.sort((a, b) => a.top - b.top);
      let lines = 0, bottom = -Infinity;
      for (const r of rects) { if ((r.top + r.bottom) / 2 > bottom) lines++; bottom = Math.max(bottom, r.bottom); }
      return { chars, cjk, lines, texts };
    };
    // A button that paints nothing itself may paint its box on an inner element: a child or grandchild
    // that paints a box, is at least 80% as wide as the button, and holds the whole visible label.
    const innerBox = (el, texts) => {
      if (!texts.length || el.children.length > LIMIT.children) return null;
      const width = at(el).rect.width;
      for (const child of el.children) for (const c of [child, ...child.children]) {
        if (!shows(c) || at(c).rect.width < width * LIMIT.inner || !(outlined(c) || filled(c))) continue;
        if (texts.every(node => c.contains(node))) return c;
      }
      return null;
    };

    // What a person sees as one control, or null. `counts` says whether its height is a control height.
    //   field:  { control: 'field', kind: 'text'|'select'|'multiline', box, height, radius, font, counts }
    //   button: { control: 'button', kind: 'filled'|'outline'|'text', box, height, radius, font, labelled, lines, regular, counts }
    //           `regular`: a visible one-line label and a height from 24px to 80px; `counts`: regular and boxed.
    const read = el => {
      const kind = fieldKind(el);
      if ((!kind && !action(el)) || !shows(el)) return null;
      if (kind) {
        if (el.parentElement && el.parentElement.closest(FIELD_ROLES)) return null;
        const box = fieldBox(el, kind), r = at(box).rect;
        if (r.width < LIMIT.fieldWidth || r.height < LIMIT.fieldHeight) return null;
        return { control: 'field', kind, box, height: Math.round(r.height), radius: radiusOf(box), font: Math.round(px(at(el).cs.fontSize) * 2) / 2, counts: kind !== 'multiline' };
      }
      const l = label(el);
      let box = el, emphasis = filled(el) ? 'filled' : outlined(el) ? 'outline' : 'text';
      if (emphasis === 'text') { const inner = innerBox(el, l.texts); if (inner) { box = inner; emphasis = filled(inner) ? 'filled' : 'outline'; } }
      const height = Math.round(at(box).rect.height);
      const labelled = l.lines >= 1 && (l.chars >= 2 || (l.chars === 1 && l.cjk));
      const regular = labelled && l.lines === 1 && height >= LIMIT.buttonMin && height <= LIMIT.buttonMax;
      return { control: 'button', kind: emphasis, box, height, radius: radiusOf(box), font: Math.round(px(at(el).cs.fontSize) * 2) / 2, labelled, lines: l.lines, regular, counts: regular && emphasis !== 'text' };
    };
    return { read };
  })();
  // --- end visible control box -----------------------------------------------------------------------
  // Radii: percentages and oversized values are pills; keep them as one family instead of raw numbers.
  const radiusPx = value => { if (typeof value !== 'string') return null; if (value.includes('%')) return parseFloat(value) >= 50 ? 999 : null; const n = px(value); return n === null ? null : n > 200 ? 999 : n; };
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const docHeight = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const out = {
    viewport, documentHeight: docHeight, elements: 0, truncated: false,
    actions: {}, actionText: {}, links: {}, text: {}, headings: {}, surfaces: {},
    spacing: {}, type: {}, radii: {}, controlHeights: {}, controlHeightsByKind: { field: {}, button: {} }, controlBoxVersion: 1, fonts: {}, shadows: {}, borders: {},
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
  const countedBoxes = new Set();
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
    const control = controlBox.read(el);
    if (control && control.counts && !countedBoxes.has(control.box)) {
      countedBoxes.add(control.box);
      tally(out.controlHeights, control.height);
      tally(out.controlHeightsByKind[control.control], control.height);
    }
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
