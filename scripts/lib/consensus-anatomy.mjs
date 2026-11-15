// Read-only anatomy probe for the pattern-consensus study (WO-12): pass to page.evaluate on the same
// page load as the other probes, after observeControls. It measures the parts of the controls that
// observeControls counts and of the panels, tables, and text around them: the inset between the edge
// of a button or a field and its content, text size and weight, corner radius, border, icons inside
// buttons, the label of a field and the gap between them, the gap between stacked fields, panel inset,
// radius, and how a panel is set apart (border, shadow, tone), the gap between neighbouring panels,
// table header and body cells, headings, line heights, and icon sizes.
// Buttons and fields are read through the visible-control-box block (WO-10's shared block, the same
// text as in observeControls and the engine probes) and selected exactly as observeControls selects
// them; test-consensus-browser.mjs asserts that the two agree on every fixture.
// It returns numbers and enums only. Text is read inside the page to find where it starts and to
// count characters and is never returned. No navigation, request, click, hover, key press, DOM write,
// selector, class name, id, URL, or screenshot leaves the page.
// Caps: 400 buttons, 400 fields, 200 panels, 8 tables, 12 body rows per table, 400 gap pairs, 4000 text runs.
export function observeAnatomy({ maxElements = 5000 } = {}) {
  const CAP = { buttons: 400, fields: 400, panels: 200, tables: 8, rows: 12, pairs: 400, texts: 4000 };
  // From here to the comment "The helpers above…": the lines of observeControls in
  // scripts/lib/consensus-probe.mjs, unchanged, with its panel test (`panelOf` and its comment) left out.
  // The visible-control-box block between its marker lines is WO-10's shared block, pasted unchanged;
  // scripts/runtime-tests/control-box.test.mjs compares this copy with the others.
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
  const rounded = el => { const { cs } = box(el); return !transparent(norm(cs.backgroundColor)) && num(cs.borderTopLeftRadius) >= 4; };
  // The helpers above are those of observeControls (its panel test left out); what follows is new.

  // Radius of a panel, by the rule observeControls used before the shared block (controls take theirs
  // from controlBox.read).
  const radiusOf = el => { const v = box(el).cs.borderTopLeftRadius || '0'; if (v.includes('%')) return parseFloat(v) >= 50 ? 999 : 0; const n = num(v); return n > 200 || n >= box(el).rect.height / 2 ? 999 : half(n); };

  const weightOf = cs => { const w = cs.fontWeight; return w === 'normal' ? 400 : w === 'bold' ? 700 : Math.round(num(w) / 100) * 100 || 400; };
  const lineOf = cs => (cs.lineHeight === 'normal' ? 'normal' : half(num(cs.lineHeight)));
  // The box-shadow layers of a computed style: colour, x, y, blur, spread, inset.
  const shadowLayers = value => {
    if (!value || value === 'none') return [];
    return value.split(/,(?![^(]*\))/).map(part => {
      const colour = (part.match(/(?:rgba?|hsla?|color|lab|lch|oklab|oklch)\([^)]*\)|#[0-9a-f]{3,8}\b/i) || [''])[0];
      const lengths = (part.replace(colour, ' ').match(/-?\d*\.?\d+px/g) || []).map(num);
      return { colour: norm(colour), x: lengths[0] || 0, y: lengths[1] || 0, blur: lengths[2] || 0, spread: lengths[3] || 0, inset: /\binset\b/.test(part) };
    });
  };
  // A drop shadow: a layer that is not inset, has a visible colour, and is blurred or offset.
  const dropShadow = cs => shadowLayers(cs.boxShadow).some(l => !l.inset && !transparent(l.colour) && (l.blur > 0 || l.x !== 0 || l.y !== 0));
  // A border drawn on a pseudo-element that covers the whole box (how some systems outline a
  // container): its width, or 0.
  const pseudoBorder = el => {
    for (const which of ['::before', '::after']) {
      const cs = getComputedStyle(el, which);
      if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.position !== 'absolute') continue;
      if (![cs.top, cs.right, cs.bottom, cs.left].every(v => v !== 'auto' && num(v) === 0)) continue;
      if (boxed(cs)) return half(num(cs.borderTopWidth));
    }
    return 0;
  };
  const visuallyHidden = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const { rect, cs } = box(p); if (rect.width <= 1 || rect.height <= 1 || cs.visibility === 'hidden' || cs.display === 'none' || num(cs.opacity) === 0 || /rect\(0(px)?[ ,]+0(px)?[ ,]+0(px)?[ ,]+0(px)?\)/.test(cs.clip || '')) return true; } return false; };
  const range = document.createRange();
  // The rectangle of an element's visible text: the union of the client rects of the text nodes
  // inside `root` (those inside `skip` left out), with the element that holds the first one.
  const textRect = (root, skip = null) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, first = null, n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const holder = n.parentElement;
      if (!holder || (skip && skip.contains(holder)) || visuallyHidden(holder)) continue;
      range.selectNodeContents(n);
      for (const q of range.getClientRects()) {
        if (q.width < 0.5 || q.height < 0.5) continue;
        if (!first) first = holder;
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      }
    }
    return first ? { left: l, top: t, right: r, bottom: b, first } : null;
  };
  const ICON = 'svg,img,[role=img]';
  // Icons inside `root`: square-ish graphics of 8 to 40px, outermost only.
  const iconsIn = root => [...root.querySelectorAll(ICON)].filter(i => {
    if (i.parentElement && i.parentElement.closest('svg')) return false;
    const { rect, visible } = box(i);
    const size = Math.max(rect.width, rect.height);
    return visible && size >= 8 && size <= 40 && Math.abs(rect.width - rect.height) <= 2;
  });
  // The inset a system declares between the outer edge of `from` and the content that `to` holds:
  // border and padding of `from` and of every wrapper down to `to`, plus the left margins of the
  // wrappers. A stretched or min-width button keeps its declared inset; a geometric one would not.
  const declaredInset = (from, to) => {
    let total = 0;
    for (let p = to; p; p = p.parentElement) {
      const { cs } = box(p);
      total += num(cs.borderLeftWidth) + num(cs.paddingLeft);
      if (p === from) break;
      total += num(cs.marginLeft);
      if (!from.contains(p.parentElement)) break;
    }
    return total;
  };

  const out = { version: 1, viewport: { width: vw, height: window.innerHeight }, truncated: false, buttons: {}, fields: {}, labels: {}, fieldGaps: {}, panels: {}, panelGaps: {}, cells: {}, headings: {}, textLines: {}, icons: {}, capped: {} };
  const all = document.querySelectorAll('body *');
  const fields = [], buttons = [], panels = [], texts = [], fieldBoxes = new Set();
  const controlEls = new Set();
  let seen = 0;
  for (const el of all) {
    if (seen++ >= maxElements) { out.truncated = true; break; }
    if (el instanceof SVGElement) {
      if (el.tagName.toLowerCase() === 'svg' && !(el.parentElement && el.parentElement.closest('svg')) && !inChrome(el)) {
        const { rect, visible } = box(el), size = Math.max(rect.width, rect.height);
        if (visible && size >= 8 && size <= 40 && Math.abs(rect.width - rect.height) <= 2) tally(out.icons, round(size));
      }
      continue;
    }
    const b = box(el);
    if (!b.visible || inChrome(el)) continue;
    const tag = el.tagName, role = el.getAttribute('role');
    if (tag === 'IMG') { const size = Math.max(b.rect.width, b.rect.height); if (size >= 8 && size <= 40 && Math.abs(b.rect.width - b.rect.height) <= 2) tally(out.icons, round(size)); }
    // Characters per font size and line height, from the element's own text nodes; and the place
    // of each run of text, for the helper-text test between stacked fields.
    let chars = 0;
    for (const node of el.childNodes) if (node.nodeType === 3) chars += node.textContent.replace(/\s+/g, ' ').trim().length;
    if (chars && !el.closest('button,[role=button],select,option,script,style')) {
      tally(out.textLines, `${half(num(b.cs.fontSize))}|${lineOf(b.cs)}`, chars);
      if (texts.length < CAP.texts) texts.push({ el, rect: b.rect });
    }
    const level = /^H[1-6]$/.test(tag) ? Number(tag[1]) : role === 'heading' ? Number(el.getAttribute('aria-level')) || 2 : 0;
    if (level && (el.innerText || '').trim()) {
      const t = textRect(el), cs = t ? box(t.first).cs : b.cs;
      tally(out.headings, `${level}|${half(num(cs.fontSize))}|${weightOf(cs)}|${lineOf(cs)}`);
    }
    // Fields and buttons come from controlBox.read and are selected as observeControls selects them:
    // a single-line field once per visible box, a button when it is regular (a visible one-line label,
    // 24 to 80px tall). A button candidate that is not an action button (a toggle, a tab) is skipped
    // too, so it is never taken for a panel.
    const control = controlBox.read(el);
    if (control && control.control === 'field') {
      if (control.counts && !fieldBoxes.has(control.box)) {
        fieldBoxes.add(control.box);
        if (fields.length < CAP.fields) { fields.push({ el, control }); controlEls.add(control.box); controlEls.add(el); } else tally(out.capped, 'fields');
      }
      continue;
    }
    if (control && control.control === 'button') {
      if (control.regular) { if (buttons.length < CAP.buttons) { buttons.push({ el, control }); controlEls.add(el); } else tally(out.capped, 'buttons'); }
      continue;
    }
    if (tag === 'BUTTON' || (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) || role === 'button'
      || (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : ''))) continue;
    // Panels: the test of observeControls' panelOf, applied to every element instead of only to
    // the ancestors of a control. Table parts and controls are not panels.
    if (!/^(TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|INPUT|TEXTAREA|SELECT|IMG|CANVAS|VIDEO|PRE|CODE|LABEL)$/.test(tag)
      && b.rect.width >= 160 && b.rect.height >= 48 && b.rect.width <= vw - 32 && (painted(el) || rounded(el))) {
      if (panels.length < CAP.panels) panels.push({ el, rect: b.rect }); else tally(out.capped, 'panels');
    }
  }

  // Buttons: emphasis, height, radius, and text size from controlBox.read (the box is the button, or
  // the inner element that paints its box); the label's weight; the declared inset from the box's
  // outer edge; the box's top border.
  for (const bt of buttons) {
    const { el, control } = bt, cs = box(el).cs, bcs = box(control.box).cs;
    const isInput = el.tagName === 'INPUT';
    const t = isInput ? null : textRect(el);
    const icons = isInput ? [] : iconsIn(el);
    const fontCs = t ? box(t.first).cs : cs;
    let icon = 'none', iconSize = 0, iconGap = 0, lead = t ? t.first : el;
    if (icons.length && t) {
      const first = icons[0], ir = box(first).rect;
      icon = ir.left + ir.width / 2 < t.left ? 'lead' : ir.left + ir.width / 2 > t.right ? 'trail' : 'none';
      if (icon !== 'none') { iconSize = round(Math.max(ir.width, ir.height)); iconGap = Math.max(0, round(icon === 'lead' ? t.left - ir.right : ir.left - t.right)); }
      if (icon === 'lead') lead = first;
    }
    const pad = round(isInput ? num(cs.borderLeftWidth) + num(cs.paddingLeft) : declaredInset(control.box.contains(lead) ? control.box : el, lead));
    const border = side(bcs, 'Top') ? half(num(bcs.borderTopWidth)) : 0;
    tally(out.buttons, `${control.kind}|${control.height}|${pad}|${control.font}|${weightOf(fontCs)}|${control.radius}|${border}|${icon}|${iconSize}|${iconGap}`);
  }

  // Fields, their labels, and the gaps between stacked fields.
  const blockOf = (label, fb) => {
    // The box of a label: its own when it is not inline; else the nearest block ancestor that
    // does not hold the field.
    let cur = label;
    for (let d = 0; d < 4 && /^(inline|contents)$/.test(box(cur).cs.display); d++) {
      const p = cur.parentElement;
      if (!p || p === document.body || p.contains(fb)) break;
      cur = p;
    }
    return box(cur).rect;
  };
  const groups = [];
  // Fields: kind, height, radius, and text size from controlBox.read, on its visible box.
  for (const f of fields) {
    const { el, control } = f, fb = control.box, rect = box(fb).rect, cs = box(el).cs, fcs = box(fb).cs;
    const native = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    const er = box(el).rect;
    const t = native ? null : textRect(el);
    const start = native ? er.left + num(cs.borderLeftWidth) + num(cs.paddingLeft) + num(cs.textIndent) : t ? t.left : er.left + num(cs.borderLeftWidth) + num(cs.paddingLeft);
    const adorned = iconsIn(fb).some(i => { const r = box(i).rect; return r.left + r.width / 2 < start; }) ? 'lead' : 'none';
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(s => side(fcs, s));
    const style = sides.length === 4 ? 'box' : ringed(fcs) ? 'ring' : sides.length === 1 && sides[0] === 'Bottom' ? 'under' : filledBg(fb) ? 'fill' : 'none';
    const border = style === 'box' || style === 'under' ? half(num(fcs.borderBottomWidth)) : 0;
    tally(out.fields, `${control.kind}|${control.height}|${Math.max(0, round(start - rect.left))}|${control.font}|${control.radius}|${style}|${border}|${adorned}`);
    // The label: the element's own label, else the first element aria-labelledby names.
    let label = native && el.labels && el.labels.length ? el.labels[0] : null;
    if (!label) { const id = (el.getAttribute('aria-labelledby') || '').split(/\s+/)[0]; if (id) label = document.getElementById(id); }
    let position = 'none', gap = 0, top = rect.top, lcs = null;
    if (label && box(label).visible && !visuallyHidden(label)) {
      const lt = textRect(label, fb);
      if (lt) {
        lcs = box(lt.first).cs;
        const lr = label.contains(fb) ? lt : blockOf(label, fb);
        const overlapX = Math.min(lr.right, rect.right) - Math.max(lr.left, rect.left);
        const overlapY = Math.min(lr.bottom, rect.bottom) - Math.max(lr.top, rect.top);
        if (lr.bottom <= rect.top + 2 && overlapX > 0) { position = 'above'; gap = Math.max(0, round(rect.top - lr.bottom)); top = lr.top; }
        else if (lr.right <= rect.left + 2 && overlapY > 0) { position = 'left'; gap = Math.max(0, round(rect.left - lr.right)); }
        else position = 'other';
      }
    }
    tally(out.labels, `${position}|${gap}|${lcs ? half(num(lcs.fontSize)) : 0}|${lcs ? weightOf(lcs) : 0}`);
    groups.push({ top, bottom: rect.bottom, left: rect.left, right: rect.right, fb, label });
  }
  // Stacked fields: for each field the nearest field below it in the same column (left edges within
  // 2px). The gap runs from the bottom of the upper field to the top of the lower one's label when
  // the label is above, else to the lower field. A pair with other text between the two (helper or
  // error text) is counted apart, not as a gap.
  groups.sort((a, b) => a.top - b.top || a.left - b.left);
  let pairs = 0;
  for (let i = 0; i < groups.length; i++) {
    const a = groups[i];
    const below = groups.find((g, j) => j > i && Math.abs(g.left - a.left) <= 2 && g.top >= a.bottom - 1);
    if (!below) continue;
    const gap = round(below.top - a.bottom);
    if (gap < 0 || gap > 96) continue;
    if (pairs++ >= CAP.pairs) { tally(out.capped, 'fieldGaps'); break; }
    const between = texts.some(x => {
      if (a.fb.contains(x.el) || below.fb.contains(x.el) || (below.label && below.label.contains(x.el)) || (a.label && a.label.contains(x.el))) return false;
      const mid = (x.rect.top + x.rect.bottom) / 2;
      return mid > a.bottom && mid < below.top && Math.min(x.rect.right, a.right) - Math.max(x.rect.left, a.left) > 0;
    });
    tally(out.fieldGaps, `${between ? 'helper' : 'plain'}|${gap}`);
  }

  // Every visible run of text outside chrome, once: the element that holds it and its left edge.
  let runList = null;
  const runs = () => {
    if (runList) return runList;
    runList = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const holder = n.parentElement;
      if (!holder || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(holder.tagName) || !box(holder).visible || inChrome(holder) || visuallyHidden(holder)) continue;
      range.selectNodeContents(n);
      let left = Infinity;
      for (const q of range.getClientRects()) if (q.width >= 0.5 && q.height >= 0.5) left = Math.min(left, q.left);
      if (!Number.isFinite(left)) continue;
      if (runList.length >= CAP.texts) { tally(out.capped, 'texts'); break; }
      runList.push({ holder, left });
    }
    return runList;
  };
  // Panels: inset (the outer left edge to the nearest content: text, a control, or an icon),
  // corner radius, how the panel is set apart, and its border width.
  const inControl = el => { for (let p = el; p && p !== document.body; p = p.parentElement) if (controlEls.has(p)) return true; return false; };
  const kept = panels.filter(p => !inControl(p.el));
  for (const p of kept) {
    const { el, rect } = p, cs = box(el).cs;
    let left = Infinity;
    for (const r of runs()) if (el.contains(r.holder)) left = Math.min(left, r.left);
    for (const c of controlEls) if (el.contains(c) && c !== el) left = Math.min(left, box(c).rect.left);
    for (const i of iconsIn(el)) left = Math.min(left, box(i).rect.left);
    if (!Number.isFinite(left)) continue;
    const border = boxed(cs) ? half(num(cs.borderTopWidth)) : pseudoBorder(el);
    const marks = [border > 0 || ringed(cs) ? 'border' : null, dropShadow(cs) ? 'shadow' : null, filledBg(el) ? 'tone' : null].filter(Boolean);
    p.keep = true;
    tally(out.panels, `${rect.width >= vw * 0.7 ? 'wide' : 'narrow'}|${Math.max(0, round(left - rect.left))}|${radiusOf(el)}|${marks.join('-') || 'none'}|${border}`);
  }
  // Neighbouring panels: one directly below another with the same left and right edges, or one
  // directly to the right with the same top edge; neither holds the other; 0 to 96px apart.
  const list = kept.filter(p => p.keep);
  let panelPairs = 0;
  for (const a of list) {
    let down = null, across = null;
    for (const c of list) {
      if (c === a || a.el.contains(c.el) || c.el.contains(a.el)) continue;
      if (Math.abs(c.rect.left - a.rect.left) <= 2 && Math.abs(c.rect.right - a.rect.right) <= 2 && c.rect.top >= a.rect.bottom - 1 && (!down || c.rect.top < down.rect.top)) down = c;
      if (Math.abs(c.rect.top - a.rect.top) <= 2 && c.rect.left >= a.rect.right - 1 && (!across || c.rect.left < across.rect.left)) across = c;
    }
    for (const [other, gap, axis] of [[down, down && down.rect.top - a.rect.bottom, 'stack'], [across, across && across.rect.left - a.rect.right, 'inline']]) {
      if (!other || gap < 0 || gap > 96) continue;
      if (panelPairs++ >= CAP.pairs) { tally(out.capped, 'panelGaps'); break; }
      tally(out.panelGaps, `${axis}|${round(gap)}`);
    }
  }

  // Tables: header and body cells of real tables and of ARIA grids. Row height, the inset from the
  // cell's left edge to its text (left-aligned cells whose first content is text), text size, weight.
  const tables = [...document.querySelectorAll('table,[role=table],[role=grid],[role=treegrid]')].filter(tb => box(tb).visible && !inChrome(tb) && !(tb.parentElement && tb.parentElement.closest('table,[role=table],[role=grid],[role=treegrid]')));
  if (tables.length > CAP.tables) tally(out.capped, 'tables', tables.length - CAP.tables);
  for (const tb of tables.slice(0, CAP.tables)) {
    const rows = [...tb.querySelectorAll('tr,[role=row]')].filter(r => box(r).visible);
    let bodyRows = 0;
    for (const row of rows) {
      const cells = [...row.children].filter(c => /^(TD|TH)$/.test(c.tagName) || /^(cell|gridcell|columnheader|rowheader)$/.test(c.getAttribute('role') || ''));
      if (!cells.length) continue;
      const head = cells.every(c => c.tagName === 'TH' || c.getAttribute('role') === 'columnheader') || !!row.closest('thead');
      if (!head && bodyRows++ >= CAP.rows) continue;
      const rowH = round(box(row).rect.height);
      for (const cell of cells) {
        const { rect, visible } = box(cell);
        if (!visible) continue;
        const t = textRect(cell);
        if (!t) continue;
        const tcs = box(t.first).cs;
        const align = tcs.textAlign;
        const leftAligned = (align === 'left' || align === 'start' || align === '-webkit-auto' || align === 'auto') && tcs.direction !== 'rtl';
        const blocked = [...cell.querySelectorAll('input,button,select,[role=checkbox],[role=button],' + ICON)].some(c => { const r = box(c).rect; return box(c).visible && r.left + r.width / 2 < t.left; });
        // A cell whose text sits nearer its right edge than its left is right-aligned or centred by layout.
        const pad = leftAligned && !blocked && t.left - rect.left <= rect.right - t.right + 1 ? Math.max(0, round(t.left - rect.left)) : 'none';
        tally(out.cells, `${head ? 'head' : 'body'}|${rowH}|${pad}|${half(num(tcs.fontSize))}|${weightOf(tcs)}`);
      }
    }
  }
  return out;
}
