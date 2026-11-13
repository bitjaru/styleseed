// Read-only anatomy probe for the pattern-consensus study (WO-12): pass to page.evaluate on the same
// page load as the other probes, after observeControls. It measures the parts of the controls that
// observeControls counts and of the panels, tables, and text around them: the inset between the edge
// of a button or a field and its content, text size and weight, corner radius, border, icons inside
// buttons, the label of a field and the gap between them, the gap between stacked fields, panel inset,
// radius, and how a panel is set apart (border, shadow, tone), the gap between neighbouring panels,
// table header and body cells, headings, line heights, and icon sizes.
// Buttons and fields are selected and boxed exactly as in observeControls (the visible control box);
// test-consensus-browser.mjs asserts that the two agree on every fixture.
// It returns numbers and enums only. Text is read inside the page to find where it starts and to
// count characters and is never returned. No navigation, request, click, hover, key press, DOM write,
// selector, class name, id, URL, or screenshot leaves the page.
// Caps: 400 buttons, 400 fields, 200 panels, 8 tables, 12 body rows per table, 400 gap pairs, 4000 text runs.
export function observeAnatomy({ maxElements = 5000 } = {}) {
  const CAP = { buttons: 400, fields: 400, panels: 200, tables: 8, rows: 12, pairs: 400, texts: 4000 };
  // Helper block, from here to the comment "The helpers above are those of observeControls…": copied
  // from observeControls in scripts/lib/consensus-probe.mjs as it stands before WO-10 (main 222fa95).
  // When this branch is rebased onto WO-10, it is replaced by WO-10's shared visible-control-box block,
  // pasted unchanged, and this file joins the copies scripts/runtime-tests/control-box.test.mjs compares.
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
  const painted = el => { const { cs } = box(el); return boxed(cs) || filledBg(el) || ringed(cs); };
  const SECTIONING = 'article,aside,main,nav,section,[role=main],[role=region],[role=complementary],[role=navigation],[role=article]';
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
  const rounded = el => { const { cs } = box(el); return !transparent(norm(cs.backgroundColor)) && num(cs.borderTopLeftRadius) >= 4; };
  // The helpers above are those of observeControls, line for line (its comments and panelOf left out).
  // What follows is new.

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
  const fields = [], buttons = [], panels = [], texts = [];
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
    if (el.matches(FIELD) && !el.disabled) {
      if (el.closest('[role=combobox]') && !el.matches('[role=combobox]')) continue;
      const fb = fieldBox(el), fr = box(fb).rect;
      if (fr.width < 48) continue;
      const kind = tag === 'SELECT' || role === 'combobox' ? 'select' : 'text';
      const rec = { el, fb, kind, rect: fr };
      if (fields.length < CAP.fields) { fields.push(rec); controlEls.add(fb); controlEls.add(el); } else tally(out.capped, 'fields');
      continue;
    }
    const buttonLike = tag === 'BUTTON' || (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) || role === 'button'
      || (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : ''));
    if (buttonLike) {
      const label = (tag === 'INPUT' ? el.value : el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!NOT_A_BUTTON.has(role) && el.getAttribute('aria-haspopup') !== 'listbox' && label.length >= 2) {
        const bg = norm(b.cs.backgroundColor);
        let emphasis = 'text';
        if ((!transparent(bg) && bg !== effectiveBg(el.parentElement)) || (b.cs.backgroundImage || '').includes('gradient')) emphasis = 'filled';
        else if (boxed(b.cs) || ringed(b.cs)) emphasis = 'outline';
        if (buttons.length < CAP.buttons) { buttons.push({ el, emphasis, rect: b.rect }); controlEls.add(el); } else tally(out.capped, 'buttons');
      }
      continue;
    }
    // Panels: the test of observeControls' panelOf, applied to every element instead of only to
    // the ancestors of a control. Table parts and controls are not panels.
    if (!/^(TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|INPUT|TEXTAREA|SELECT|IMG|CANVAS|VIDEO|PRE|CODE|LABEL)$/.test(tag)
      && b.rect.width >= 160 && b.rect.height >= 48 && b.rect.width <= vw - 32 && (painted(el) || rounded(el))) {
      if (panels.length < CAP.panels) panels.push({ el, rect: b.rect }); else tally(out.capped, 'panels');
    }
  }

  // Buttons.
  for (const bt of buttons) {
    const { el, rect } = bt, cs = box(el).cs;
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
    const pad = round(isInput ? num(cs.borderLeftWidth) + num(cs.paddingLeft) : declaredInset(el, lead));
    const border = side(cs, 'Top') ? half(num(cs.borderTopWidth)) : 0;
    tally(out.buttons, `${bt.emphasis}|${round(rect.height)}|${pad}|${half(num(fontCs.fontSize))}|${weightOf(fontCs)}|${radiusOf(el)}|${border}|${icon}|${iconSize}|${iconGap}`);
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
  for (const f of fields) {
    const { el, fb, rect } = f, cs = box(el).cs, fcs = box(fb).cs;
    const native = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    const er = box(el).rect;
    const t = native ? null : textRect(el);
    const start = native ? er.left + num(cs.borderLeftWidth) + num(cs.paddingLeft) + num(cs.textIndent) : t ? t.left : er.left + num(cs.borderLeftWidth) + num(cs.paddingLeft);
    const adorned = iconsIn(fb).some(i => { const r = box(i).rect; return r.left + r.width / 2 < start; }) ? 'lead' : 'none';
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(s => side(fcs, s));
    const style = sides.length === 4 ? 'box' : ringed(fcs) ? 'ring' : sides.length === 1 && sides[0] === 'Bottom' ? 'under' : filledBg(fb) ? 'fill' : 'none';
    const border = style === 'box' || style === 'under' ? half(num(fcs.borderBottomWidth)) : 0;
    tally(out.fields, `${f.kind}|${round(rect.height)}|${Math.max(0, round(start - rect.left))}|${half(num(cs.fontSize))}|${radiusOf(fb)}|${style}|${border}|${adorned}`);
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
