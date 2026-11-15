// Read-only control probe for the pattern-consensus study: pass to page.evaluate on the same page
// load as the engine probes. Which elements are controls, and the box a person sees for each, come
// from the visible-control-box block below, the same text as in the engine probes observe-design.mjs
// and observe-structure.mjs (scripts/runtime-tests/control-box.test.mjs compares the copies). On top
// of the control heights this probe records, per field, the input element's own height, the radius,
// the text size, and the panel it sits in; per labelled action button, its emphasis, radius, and text
// size; the pairs of a field and a boxed button that sit on one row; and how many characters are set
// in each font size. Unlike the engine probes it leaves chrome out: navigation and banner landmarks,
// page-level headers and footers, and anything fixed to the viewport.
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

  const out = { version: 2, viewport: { width: vw, height: window.innerHeight }, truncated: false, fields: {}, buttons: {}, pairs: [], textSizes: {}, capped: {} };
  const all = document.querySelectorAll('body *');
  const fields = [], buttons = [], fieldBoxes = new Set();
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
    const control = controlBox.read(el);
    if (!control) continue;
    if (control.control === 'field') {
      if (!control.counts || fieldBoxes.has(control.box)) continue;
      fieldBoxes.add(control.box);
      const rec = { el: control.box, kind: control.kind, h: control.height, self: round(b.rect.height), r: control.radius, size: control.font, panel: panelOf(control.box), rect: box(control.box).rect };
      if (fields.length < CAP.fields) fields.push(rec); else tally(out.capped, 'fields');
      continue;
    }
    if (!control.regular) continue;
    const rec = { el, emphasis: control.kind, h: control.height, r: control.radius, size: control.font, rect: box(control.box).rect };
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
