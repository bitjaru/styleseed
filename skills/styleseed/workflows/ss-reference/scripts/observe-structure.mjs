// Read-only structure probe for reference measurement: pass to page.evaluate in a browser the
// caller controls, on the same page load as observe-design. It reads layout geometry and computed
// styles of visible elements and returns numbers, enums, tag/role names, and CSS colour strings
// only. Geometry (region and section rectangles) is recorded as numbers. No text, selectors, class
// names, element ids, asset URLs, screenshots, or form values leave the page, and nothing is
// navigated, requested, clicked, or written. Caps per viewport: 8 regions, 40 sections, 12 tables,
// 12 lists, 8 tab sets (and 12 sticky elements). Open shadow roots and iframes are not traversed;
// they are counted in `skipped`. Region and section kinds come from landmarks, geometry, and
// content: they are measurements of one rendered viewport, not design judgments.
//
// Button keys are `emphasis|paint|height|region`: the paint is the background of a filled action,
// the border colour of an outline action, and the text colour of a text action.
export function observeStructure({ maxElements = 5000 } = {}) {
  const CAP = { regions: 8, sections: 40, tables: 12, lists: 12, tabs: 8, stickies: 12, rows: 200, rules: 50000 };
  const vw = window.innerWidth, vh = window.innerHeight, sx = window.scrollX, sy = window.scrollY;
  const scroller = document.scrollingElement || document.documentElement;
  const docH = Math.max(scroller.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const docW = Math.max(scroller.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const round = n => Math.round(n);
  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;
  const num = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
  const tally = (map, key, weight = 1) => { if (key === undefined || key === null || key === '') return; map[key] = (map[key] || 0) + weight; };
  const mode = list => { const c = new Map(); for (const v of list) c.set(v, (c.get(v) || 0) + 1); let best = null, n = 0; for (const [v, k] of c) if (k > n || (k === n && v < best)) { best = v; n = k; } return best; };

  // Colours: the same canvas round trip as observe-design, so every colour reads rgb()/rgba().
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
  // Only a CSS colour string may leave the page; anything else reads `other`.
  const colour = value => { const c = norm(value); return typeof c === 'string' && /^(rgba?|hsla?|lab|lch|oklab|oklch|color)\([\d\s.,%/a-z-]*\)$|^#[0-9a-f]{3,8}$/i.test(c) ? c : 'other'; };
  const transparent = value => !value || value === 'transparent' || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(value) || /\/\s*0\)$/.test(value);

  // Element cache: one rect and one computed style per element.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE', 'BR', 'WBR']);
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
  const skipped = { shadowHosts: 0, iframes: 0 };
  const els = [];
  let truncated = false;
  for (const el of document.querySelectorAll('body *')) {
    if (SKIP.has(el.tagName)) continue;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    if (els.length >= maxElements) { truncated = true; break; }
    if (el.shadowRoot) skipped.shadowHosts++;
    if (el.tagName === 'IFRAME' && box(el).visible) skipped.iframes++;
    els.push(el);
  }
  const visible = els.filter(el => box(el).visible);
  const shown = new Set(visible);
  // Visible children per parent; a `display: contents` parent passes its children up.
  const kidsOf = new Map();
  for (const el of visible) {
    let p = el.parentElement;
    while (p && p !== document.body && box(p).cs.display === 'contents') p = p.parentElement;
    if (!kidsOf.has(p)) kidsOf.set(p, []);
    kidsOf.get(p).push(el);
  }
  const kids = el => kidsOf.get(el) || [];
  const flow = el => kids(el).filter(c => !['absolute', 'fixed'].includes(box(c).cs.position));
  const within = (el, sel) => (el.matches(sel) && shown.has(el) ? [el] : []).concat([...el.querySelectorAll(sel)].filter(e => shown.has(e)));

  const HEADING = 'h1,h2,h3,h4,h5,h6,[role=heading]';
  const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=combobox],[role=textbox]';
  const INPUT = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea,[role=textbox],[role=combobox],[role=switch],[role=checkbox],[role=radio],[role=slider],[role=spinbutton]';
  const TEXT_INPUT = 'input:not([type]),input[type=text],input[type=email],input[type=password],input[type=tel],input[type=url],input[type=search],input[type=number],input[type=date],select,textarea,[role=textbox],[role=combobox]';
  const TABLE = 'table,[role=table],[role=grid],[role=treegrid]';
  const SECTIONING = 'article,aside,main,nav,section,[role=main],[role=region],[role=complementary],[role=navigation],[role=article]';
  const interactiveIn = el => [...el.querySelectorAll(INTERACTIVE)].filter(e => shown.has(e));

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
  const ruled = cs => side(cs, 'Top') || side(cs, 'Bottom');
  const hasSurface = el => {
    const { cs } = box(el), bg = norm(cs.backgroundColor);
    return (!transparent(bg) && bg !== effectiveBg(el.parentElement)) || boxed(cs) || (!!cs.boxShadow && cs.boxShadow !== 'none');
  };
  const positionOf = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = box(p).cs.position; if (pos === 'fixed' || pos === 'sticky') return pos; } return 'static'; };

  // Regions: landmarks first, then geometry for what the landmarks did not name.
  const landmark = el => {
    const role = el.getAttribute('role'), tag = el.tagName, outside = !(el.parentElement && el.parentElement.closest(SECTIONING));
    if (tag === 'MAIN' || role === 'main') return 'main';
    if (tag === 'NAV' || role === 'navigation') return 'nav';
    if (tag === 'ASIDE' || role === 'complementary') return 'aside';
    if (role === 'banner' || (tag === 'HEADER' && outside)) return 'banner';
    if (role === 'contentinfo' || (tag === 'FOOTER' && outside)) return 'contentinfo';
    return null;
  };
  const tall = r => r.height >= Math.min(vh, docH) * 0.8;
  const leftColumn = r => r.left <= 16 && r.width >= 40 && r.width <= vw * 0.35 && tall(r);
  const rightColumn = r => r.right >= vw - 16 && r.width >= 40 && r.width <= vw * 0.4 && tall(r);
  const topBand = r => r.top + sy <= 16 && r.width >= vw * 0.6 && r.height >= 24 && r.height <= Math.max(160, vh * 0.2);
  const bottomBand = (r, pos) => pos !== 'static' && r.bottom >= vh - 2 && r.width >= vw * 0.9 && r.height >= 32 && r.height <= 120;
  const picked = [];
  const has = kind => picked.some(p => p.kind === kind);
  const holder = el => picked.find(p => p.el.contains(el));
  for (const el of visible) {
    const lm = landmark(el);
    if (!lm) continue;
    const inside = holder(el);
    if (inside && !(inside.kind === 'main' && (lm === 'aside' || lm === 'nav'))) continue;
    const r = box(el).rect, pos = positionOf(el);
    let kind = null;
    if (lm === 'main') kind = inside ? null : 'main';
    else if (lm === 'banner') kind = topBand(r) ? 'topBar' : leftColumn(r) ? 'sideNav' : null;
    else if (lm === 'nav') kind = leftColumn(r) ? 'sideNav' : topBand(r) ? 'topBar' : bottomBand(r, pos) ? 'bottomBar' : rightColumn(r) ? 'aside' : null;
    else if (lm === 'aside') kind = leftColumn(r) && interactiveIn(el).length >= 3 ? 'sideNav' : r.width <= vw * 0.5 ? 'aside' : null;
    else if (lm === 'contentinfo') kind = bottomBand(r, pos) ? 'bottomBar' : null;
    if (kind && !has(kind) && picked.length < CAP.regions) picked.push({ kind, el, by: 'landmark' });
  }
  const apart = el => !picked.some(p => p.el.contains(el) || el.contains(p.el));
  const outermost = list => list.filter(el => !list.some(o => o !== el && o.contains(el)));
  const byGeometry = (kind, test) => {
    if (has(kind)) return;
    const found = outermost(visible.filter(el => test(el) && apart(el)));
    if (found.length) picked.push({ kind, el: found[0], by: 'geometry' });
  };
  byGeometry('topBar', el => topBand(box(el).rect) && interactiveIn(el).length >= 1);
  byGeometry('sideNav', el => leftColumn(box(el).rect) && interactiveIn(el).length >= 3);
  byGeometry('bottomBar', el => bottomBand(box(el).rect, positionOf(el)) && interactiveIn(el).length >= 2);
  if (!has('main')) {
    let best = null, area = 0;
    for (const el of visible) {
      const r = box(el).rect;
      if (r.width < vw * 0.4 || !apart(el)) continue;
      if (r.width * r.height > area) { best = el; area = r.width * r.height; }
    }
    picked.push({ kind: 'main', el: best || document.body, by: 'geometry' });
  }
  const KINDS = ['topBar', 'sideNav', 'main', 'aside', 'bottomBar'];
  picked.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  const innerFirst = [...picked].sort((a, b) => (a.kind === 'main') - (b.kind === 'main'));
  const regionOf = el => (innerFirst.find(p => p.el.contains(el)) || { kind: 'none' }).kind;
  const mainEl = picked.find(p => p.kind === 'main').el;

  // The content box of a region: descend through single-child wrappers.
  const contentOf = el => {
    let cur = el;
    for (let d = 0; d < 8; d++) {
      const k = flow(cur);
      if (k.length !== 1 || box(k[0]).rect.height < box(cur).rect.height * 0.5) break;
      cur = k[0];
    }
    const { rect, cs } = box(cur);
    return {
      el: cur,
      left: rect.left + num(cs.paddingLeft) + num(cs.borderLeftWidth),
      top: rect.top + num(cs.paddingTop) + num(cs.borderTopWidth),
      width: rect.width - num(cs.paddingLeft) - num(cs.paddingRight) - num(cs.borderLeftWidth) - num(cs.borderRightWidth),
    };
  };
  const regions = picked.map(({ kind, el, by }) => {
    const { rect } = box(el), items = interactiveIn(el), content = contentOf(el);
    return {
      kind, by, x: round(rect.left + sx), y: round(rect.top + sy), w: round(rect.width), h: round(rect.height),
      position: positionOf(el), items: items.length, itemHeight: items.length ? mode(items.map(i => round(box(i).rect.height))) : null,
      contentWidth: round(content.width), insetLeft: round(content.left - rect.left),
    };
  });

  // Buttons by emphasis (same action test as observe-design).
  const buttonLike = el => {
    const tag = el.tagName;
    if (tag === 'BUTTON') return true;
    if (tag === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) return true;
    if (el.getAttribute('role') === 'button') return true;
    if (tag === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(typeof el.className === 'string' ? el.className : '')) return true;
    return false;
  };
  const ring = shadow => { const m = /^(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/.exec(shadow || ''); return m && num(m[2]) > 0 ? m[1] : null; };
  const buttons = [];
  for (const el of visible) {
    if (!buttonLike(el)) continue;
    const { cs, rect } = box(el), bg = norm(cs.backgroundColor);
    let emphasis = 'text', paint = colour(cs.color);
    if (!transparent(bg) && bg !== effectiveBg(el.parentElement)) { emphasis = 'filled'; paint = colour(bg); }
    else if ((cs.backgroundImage || '').includes('gradient')) { emphasis = 'filled'; paint = 'gradient'; }
    else if (boxed(cs)) { emphasis = 'outline'; paint = colour(cs.borderTopColor); }
    else if (ring(cs.boxShadow)) { emphasis = 'outline'; paint = colour(ring(cs.boxShadow)); }
    buttons.push({ el, emphasis, paint, h: round(rect.height), region: regionOf(el) });
  }

  // Charts and repeated lists are needed to classify sections.
  const SHAPES = 'path,rect,circle,line,polyline,polygon,ellipse';
  const charts = visible.filter(el => {
    const tag = el.tagName.toLowerCase(), r = box(el).rect;
    if (r.width * r.height < 120 * 80) return false;
    if (tag === 'canvas') return true;
    return tag === 'svg' && !(el.parentElement && el.parentElement.closest('svg')) && el.querySelectorAll(SHAPES).length >= 3;
  });
  const content = contentOf(mainEl);
  const repeated = el => {
    const k = kids(el);
    if (k.length < 3 || el === content.el) return null;
    const sig = c => `${c.tagName}|${typeof c.className === 'string' ? c.className : ''}`;
    const same = k.filter(c => sig(c) === sig(k[0]));
    if (same.length < 3 || same.length < k.length * 0.8) return null;
    const hs = same.map(c => box(c).rect.height), lo = Math.min(...hs), hi = Math.max(...hs);
    if (hi > 160 || hi > lo * 1.5) return null;
    if (same.some(c => c.matches(TEXT_INPUT) || c.querySelector(TEXT_INPUT) || c.querySelector(TABLE))) return null;
    return same;
  };
  const navEls = picked.filter(p => ['topBar', 'sideNav', 'bottomBar'].includes(p.kind)).map(p => p.el);
  const listFound = [];
  for (const el of visible) {
    if (listFound.length >= CAP.lists) break;
    if (navEls.some(n => n.contains(el)) || el.closest(TABLE) || el.closest('[role=tablist],[role=menu],[role=menubar]')) continue;
    if (listFound.some(l => l.el.contains(el))) continue;
    const items = el.matches('ul,ol,[role=list],[role=listbox],[role=feed]') ? kids(el).filter(c => c.matches('li,[role=listitem],[role=option],[role=article]')) : repeated(el);
    if (!items || items.length < 2) continue;
    if (!items.slice(1).every((c, i) => box(c).rect.top >= box(items[i]).rect.bottom - 1)) continue;
    listFound.push({ el, items });
  }

  // Sections: structural children of the main content box; anonymous wrappers are opened.
  const regionEls = picked.filter(p => p.kind !== 'main').map(p => p.el);
  const plainWrapper = el => {
    if (!['DIV', 'SPAN', 'FORM'].includes(el.tagName) || el.getAttribute('role')) return false;
    const k = flow(el);
    if (k.length < 2 || k.some(c => c.matches(HEADING)) || hasSurface(el) || repeated(el)) return false;
    for (let i = 1; i < k.length; i++) if (box(k[i]).rect.top < box(k[i - 1]).rect.bottom - 1) return false;
    return true;
  };
  let candidates = flow(content.el);
  for (let pass = 0; pass < 3; pass++) {
    candidates = candidates.flatMap(c => (regionEls.includes(c) ? [] : regionEls.some(r => c.contains(r)) || plainWrapper(c) ? flow(c) : [c]));
  }
  const sectionEls = candidates.filter(c => !regionEls.includes(c)).slice(0, CAP.sections);
  // Columns: the element itself, or a full-width descendant, laying children side by side.
  const rowOf = el => {
    const queue = [[el, 0]];
    while (queue.length) {
      const [cur, d] = queue.shift();
      const cr = box(cur).rect;
      const k = flow(cur).filter(c => box(c).cs.display !== 'inline');
      if (k.length >= 2) {
        const first = box(k[0]).rect, row = [k[0]];
        for (const c of k.slice(1)) {
          const r = box(c).rect, prev = box(row[row.length - 1]).rect;
          if (r.top < first.bottom - 1 && r.bottom > first.top + 1 && r.left >= prev.right - 1) row.push(c);
        }
        const widths = row.map(c => box(c).rect.width), sum = widths.reduce((s, w) => s + w, 0);
        if (row.length >= 2 && sum >= cr.width * 0.6 && widths.every(w => w >= cr.width * 0.1)) {
          return { kids: row, ratios: widths.map(w => r2(w / sum)), gap: round(box(row[1]).rect.left - box(row[0]).rect.right) };
        }
      }
      if (d < 2) for (const c of k) if (box(c).rect.width >= cr.width * 0.8) queue.push([c, d + 1]);
    }
    return null;
  };
  const classify = el => {
    const r = box(el).rect;
    if (within(el, TABLE).length) return 'table';
    const inputs = within(el, INPUT).length;
    if (inputs >= 2 || (inputs === 1 && r.height > 72)) return 'form-group';
    const tablists = within(el, '[role=tablist]');
    if (tablists.length && r.height <= Math.max(80, box(tablists[0]).rect.height + 16)) return 'tabs';
    if (listFound.some(l => el.contains(l.el))) return 'list';
    if (charts.some(c => el.contains(c))) return 'chart';
    const row = rowOf(el);
    if (row && row.kids.filter(hasSurface).length >= 2) return 'card-grid';
    const headings = within(el, HEADING).length;
    if (headings && r.height <= 160) return 'heading-block';
    if (within(el, '[role=toolbar]').length || (!headings && r.height <= 72 && buttons.some(b => el.contains(b.el)))) return 'toolbar';
    if (tablists.length) return 'tabs';
    return 'other';
  };
  const headingOf = h => {
    const level = /^H[1-6]$/.test(h.tagName) ? Number(h.tagName[1]) : Math.min(6, Math.max(1, Number(h.getAttribute('aria-level')) || 2));
    const cs = box(h).cs, lh = parseFloat(cs.lineHeight);
    return { level, size: r1(num(cs.fontSize)), weight: Number(cs.fontWeight) || 400, lineHeight: Number.isFinite(lh) ? r1(lh) : 'normal' };
  };
  const rowsBySection = new Map();
  const columns = {};
  const sections = sectionEls.map((el, i) => {
    const r = box(el).rect, kind = classify(el);
    const row = kind === 'table' ? null : rowOf(el);
    if (row) rowsBySection.set(el, row);
    const prevBottom = i ? box(sectionEls[i - 1]).rect.bottom : content.top;
    const cols = row ? row.ratios : [1];
    tally(columns, cols.length === 1 ? '1' : `${cols.length}|${cols.join('/')}|${row.gap}`);
    const h = within(el, HEADING)[0];
    const head = h ? headingOf(h) : null;
    const filled = {};
    for (const b of buttons) if (b.emphasis === 'filled' && el.contains(b.el)) tally(filled, b.paint);
    return { kind, y: round(r.top + sy), h: round(r.height), gapBefore: round(r.top - prevBottom), surface: hasSurface(el), cols, heading: head && { level: head.level, size: head.size, weight: head.weight }, filled };
  });

  // Gaps: between sections, between groups inside a section (or its columns), deeper stacks,
  // side-by-side siblings, and the padding of surfaces inside main.
  const gaps = { section: {}, group: {}, stack: {}, inline: {}, inset: {} };
  sections.forEach((s, i) => { if (i && s.gapBefore > 0) tally(gaps.section, s.gapBefore); });
  const groupParents = new Set(sectionEls);
  for (const row of rowsBySection.values()) for (const k of row.kids) groupParents.add(k);
  for (const [parent, list] of kidsOf) {
    if (!parent || parent === content.el || !mainEl.contains(parent) || !sectionEls.some(s => s.contains(parent))) continue;
    const level = groupParents.has(parent) ? 'group' : 'stack';
    const items = list.filter(c => !['absolute', 'fixed'].includes(box(c).cs.position));
    for (let i = 1; i < items.length; i++) {
      const a = box(items[i - 1]), b = box(items[i]);
      if (b.rect.top >= a.rect.bottom - 1) { const g = round(b.rect.top - a.rect.bottom); if (g > 0 && g < 200) tally(gaps[level], g); }
      else if (b.rect.left >= a.rect.right - 1 && b.rect.top < a.rect.bottom && a.rect.top < b.rect.bottom && a.cs.display !== 'inline' && b.cs.display !== 'inline') {
        const g = round(b.rect.left - a.rect.right); if (g > 0 && g < 200) tally(gaps.inline, g);
      }
    }
  }
  for (const el of visible) {
    if (!mainEl.contains(el) || buttonLike(el) || el.matches(INPUT)) continue;
    const { rect, cs } = box(el);
    if (rect.width * rect.height < 2000 || !hasSurface(el)) continue;
    const p = round(num(cs.paddingLeft)); if (p > 0) tally(gaps.inset, p);
  }

  // Headings in main, in document order.
  const headings = { main: {}, skips: 0 };
  let prevLevel = null;
  for (const h of visible.filter(el => el.matches(HEADING) && mainEl.contains(el))) {
    const { level, size, weight, lineHeight } = headingOf(h);
    tally(headings.main, `${level}|${size}|${weight}|${lineHeight}`);
    if (prevLevel !== null && level > prevLevel + 1) headings.skips++;
    prevLevel = level;
  }

  // Controls: buttons by emphasis, inputs by type and width, label positions, shared left edges.
  const controls = { buttons: {}, inputs: {}, labels: { above: 0, left: 0, none: 0 }, leftEdges: 0 };
  for (const b of buttons) tally(controls.buttons, `${b.emphasis}|${b.paint}|${b.h}|${b.region}`);
  const inputType = el => {
    const role = el.getAttribute('role'), tag = el.tagName;
    if (tag === 'SELECT' || role === 'combobox') return 'select';
    if (tag === 'TEXTAREA') return 'textarea';
    if (role === 'switch' || role === 'checkbox' || role === 'radio') return role;
    if (role === 'textbox') return 'text';
    if (role === 'slider') return 'range';
    if (role === 'spinbutton') return 'number';
    const t = String(el.type || 'text').toLowerCase();
    if (['text', 'email', 'password', 'tel', 'url'].includes(t)) return 'text';
    if (['date', 'datetime-local', 'month', 'week', 'time'].includes(t)) return 'date';
    return ['search', 'number', 'checkbox', 'radio', 'range', 'file', 'color'].includes(t) ? t : 'other';
  };
  const labelEl = el => {
    if (el.id) { try { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l; } catch {} }
    const wrap = el.closest('label');
    if (wrap) return wrap;
    for (const id of (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)) { const l = document.getElementById(id); if (l) return l; }
    return null;
  };
  // Where the label's own words sit; their content is read for emptiness only and never returned.
  const labelRect = (label, el) => {
    if (!label.contains(el)) return box(label).visible ? box(label).rect : null;
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (el.contains(n) || !n.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    return null;
  };
  const TEXTLIKE = new Set(['text', 'search', 'number', 'date', 'select', 'textarea']);
  const lefts = [];
  for (const el of visible.filter(e => e.matches(INPUT))) {
    const type = inputType(el), r = box(el).rect;
    let c = el.parentElement;
    while (c && c !== document.body && box(c).rect.width <= r.width + 1 && kids(c).length <= 1) c = c.parentElement;
    const cb = c ? box(c) : null;
    const cw = cb ? cb.rect.width - num(cb.cs.paddingLeft) - num(cb.cs.paddingRight) : vw;
    const ratio = cw > 0 ? r.width / cw : 1;
    tally(controls.inputs, `${type}|${round(r.height)}|${ratio >= 0.9 ? 'full' : ratio >= 0.5 ? 'wide' : 'narrow'}`);
    if (!TEXTLIKE.has(type)) continue;
    const label = labelEl(el), lr = label && labelRect(label, el);
    tally(controls.labels, !lr ? 'none' : lr.bottom <= r.top + 4 ? 'above' : lr.right <= r.left + 4 ? 'left' : lr.left >= r.right - 4 ? 'right' : 'inside');
    if (mainEl.contains(el)) lefts.push(round(r.left));
  }
  lefts.sort((a, b) => a - b);
  controls.leftEdges = lefts.filter((x, i) => i === 0 || x - lefts[i - 1] > 2).length;

  // Tables.
  const tables = [];
  const lineAt = cs => ruled(cs);
  for (const t of visible.filter(el => el.matches(TABLE) && !(el.parentElement && el.parentElement.closest(TABLE))).slice(0, CAP.tables)) {
    let rows, isHeader, cellsOf;
    if (t.tagName === 'TABLE') {
      rows = [...t.rows].filter(r => shown.has(r) || box(r).visible);
      isHeader = r => r.parentElement.tagName === 'THEAD' || ([...r.cells].length > 0 && [...r.cells].every(c => c.tagName === 'TH'));
      cellsOf = r => [...r.cells];
    } else {
      rows = [...t.querySelectorAll('[role=row]')].filter(r => box(r).visible);
      isHeader = r => !!r.querySelector('[role=columnheader]');
      cellsOf = r => [...r.querySelectorAll('[role=cell],[role=gridcell],[role=rowheader],[role=columnheader]')];
    }
    const head = rows.find(isHeader) || null, body = rows.filter(r => !isHeader(r));
    const first = body[0] || rows[0] || null;
    const cells = first ? cellsOf(first).filter(c => box(c).visible) : [];
    const rowH = {};
    for (const r of body.slice(0, CAP.rows)) tally(rowH, round(box(r).rect.height));
    const cell = cells[0] ? box(cells[0]).cs : null;
    const headCells = head ? cellsOf(head) : [];
    tables.push({
      rows: body.length, cols: cells.length, headerH: head ? round(box(head).rect.height) : 0, rowH,
      padX: cell ? round(num(cell.paddingLeft)) : 0,
      rowBorder: !!first && (lineAt(box(first).cs) || (!!cell && lineAt(cell))),
      stickyHeader: !!head && [head, head.parentElement, ...headCells].some(e => ['sticky', 'fixed'].includes(box(e).cs.position)),
      endAligned: cells.filter(c => { const cs = box(c).cs; return ['right', 'end', '-webkit-right'].includes(cs.textAlign) || (cs.display.includes('flex') && ['flex-end', 'end', 'right'].includes(cs.justifyContent)); }).length,
    });
  }

  // Lists: semantic lists and runs of identical short rows, outside navigation regions.
  const lists = listFound.map(({ el, items }) => {
    const itemH = {};
    for (const c of items.slice(0, CAP.rows)) tally(itemH, round(box(c).rect.height));
    const divided = items.filter(c => lineAt(box(c).cs) || (kids(c)[0] && lineAt(box(kids(c)[0]).cs))).length;
    const separators = kids(el).filter(c => c.matches('hr,[role=separator]')).length;
    const trailing = items.slice(0, CAP.rows).filter(c => {
      const r = box(c).rect;
      return interactiveIn(c).some(a => { const ar = box(a).rect; return ar.right >= r.right - 32 && ar.left >= r.left + r.width / 2; });
    }).length;
    return { items: items.length, itemH, divider: divided >= items.length / 2 || separators >= items.length - 1, trailingAction: trailing >= Math.min(items.length, CAP.rows) / 2 };
  });

  // Tab sets and how the selected tab is marked.
  const indicatorOf = (tab, list) => {
    const cs = box(tab).cs;
    if ((num(cs.borderBottomWidth) >= 2 && side(cs, 'Bottom')) || ((cs.boxShadow || '').includes('inset') && /\b0px -?[1-9]/.test(cs.boxShadow))) return 'underline';
    for (const pseudo of ['::after', '::before']) {
      const p = getComputedStyle(tab, pseudo);
      if (p.content && p.content !== 'none' && num(p.height) > 0 && num(p.height) <= 4 && !transparent(norm(p.backgroundColor))) return 'underline';
    }
    for (const c of list.querySelectorAll('*')) {
      if (c.getAttribute('role') === 'tab') continue;
      const { rect, cs: ccs } = box(c);
      if (rect.height > 0 && rect.height <= 4 && rect.width >= 16 && !transparent(norm(ccs.backgroundColor))) return 'underline';
    }
    const bg = norm(cs.backgroundColor);
    return !transparent(bg) && bg !== effectiveBg(list) ? 'pill' : 'none';
  };
  const tabs = visible.filter(el => el.matches('[role=tablist]')).slice(0, CAP.tabs).map(list => {
    const tabEls = [...list.querySelectorAll('[role=tab]')].filter(t => shown.has(t));
    const selected = tabEls.find(t => t.getAttribute('aria-selected') === 'true');
    return { tabs: tabEls.length, h: tabEls.length ? mode(tabEls.map(t => round(box(t).rect.height))) : round(box(list).rect.height), indicator: selected ? indicatorOf(selected, list) : 'none' };
  });

  // Sticky and fixed elements (outermost only).
  const stickyEls = visible.filter(el => ['sticky', 'fixed'].includes(box(el).cs.position));
  const stickies = [];
  for (const el of stickyEls) {
    if (stickies.length >= CAP.stickies) break;
    if (stickyEls.some(o => o !== el && o.contains(el))) continue;
    const { rect, cs } = box(el);
    if (rect.width * rect.height < 2000) continue;
    const column = rect.height >= vh * 0.6 && rect.width <= vw * 0.4;
    const edge = column ? (rect.left + rect.width / 2 <= vw / 2 ? 'left' : 'right') : cs.top !== 'auto' ? 'top' : cs.bottom !== 'auto' ? 'bottom' : 'none';
    stickies.push({ position: cs.position, edge, w: round(rect.width), h: round(rect.height) });
  }

  // Media: counts, chart-like canvases and SVGs, area share of the document, icon sizes.
  const media = { img: 0, video: 0, canvas: 0, chartLike: charts.length, areaShare: 0, iconSizes: {} };
  let mediaArea = 0;
  const clipArea = r => Math.max(0, Math.min(docW, r.right + sx) - Math.max(0, r.left + sx)) * Math.max(0, Math.min(docH, r.bottom + sy) - Math.max(0, r.top + sy));
  for (const el of visible) {
    const tag = el.tagName.toLowerCase(), { rect, cs } = box(el), size = Math.max(rect.width, rect.height);
    if (tag === 'img') { if (size <= 32) tally(media.iconSizes, round(size)); else { media.img++; mediaArea += clipArea(rect); } }
    else if (tag === 'video') { media.video++; mediaArea += clipArea(rect); }
    else if (tag === 'canvas') { media.canvas++; mediaArea += clipArea(rect); }
    else if (tag === 'svg') {
      if (el.parentElement && el.parentElement.closest('svg')) continue;
      if (size <= 32) tally(media.iconSizes, round(size));
      else if (charts.includes(el)) mediaArea += clipArea(rect);
    } else if ((cs.backgroundImage || '').includes('url(') && rect.width * rect.height >= 64 * 64) mediaArea += clipArea(rect);
  }
  media.areaShare = Math.min(1, r2(mediaArea / Math.max(1, docW * docH)));

  // Readable stylesheets: state selectors, reduced-motion rules, and media-query breakpoints.
  const css = { hover: 0, focusVisible: 0, disabled: 0, reducedMotion: 0, breakpoints: {}, unreadableSheets: 0 };
  const toPx = (n, unit) => round(unit === 'px' ? Number(n) : Number(n) * 16);
  const breakpointsOf = text => {
    const out = [];
    for (const m of String(text || '').matchAll(/(?:min|max)-width\s*:\s*([\d.]+)(px|r?em)/g)) out.push(toPx(m[1], m[2]));
    for (const m of String(text || '').matchAll(/width\s*[<>]=?\s*([\d.]+)(px|r?em)/g)) out.push(toPx(m[1], m[2]));
    for (const m of String(text || '').matchAll(/([\d.]+)(px|r?em)\s*[<>]=?\s*width/g)) out.push(toPx(m[1], m[2]));
    return out;
  };
  let budget = CAP.rules;
  const walkRules = (rules, scope) => {
    for (const rule of rules) {
      if (budget-- <= 0) return;
      if (typeof rule.selectorText === 'string') {
        const s = rule.selectorText;
        if (s.includes(':hover')) css.hover++;
        if (s.includes(':focus-visible')) css.focusVisible++;
        if (/:disabled|\[disabled|\[aria-disabled/.test(s)) css.disabled++;
        if (scope.reduced) css.reducedMotion++;
        for (const bp of scope.bps) tally(css.breakpoints, bp);
      }
      if (rule.styleSheet) { try { walkRules(rule.styleSheet.cssRules, scope); } catch { css.unreadableSheets++; } }
      if (rule.cssRules) {
        const text = typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule ? rule.media.mediaText : '';
        walkRules(rule.cssRules, { reduced: scope.reduced || /prefers-reduced-motion/.test(text), bps: text ? [...scope.bps, ...breakpointsOf(text)] : scope.bps });
      }
    }
  };
  for (const sheet of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
    let rules = null;
    try { rules = sheet.cssRules; } catch { rules = null; }
    if (!rules) { css.unreadableSheets++; continue; }
    const text = sheet.media ? sheet.media.mediaText : '';
    walkRules(rules, { reduced: /prefers-reduced-motion/.test(text), bps: breakpointsOf(text) });
  }

  let scrollContainers = 0;
  for (const el of visible) {
    const { cs, rect } = box(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && rect.height >= vh * 0.5) scrollContainers++;
  }
  return {
    version: 1, viewport: { width: vw, height: vh }, elements: els.length, truncated,
    shell: { documentHeight: round(docH), bodyScrolls: docH > vh + 1, overflowX: Math.max(0, round(docW - vw)), scrollContainers },
    regions, sections, columns, gaps, headings, controls, tables, lists, tabs, stickies, media, css, skipped,
  };
}
