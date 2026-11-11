// Read-only render-fault probe: pass to page.evaluate in a browser the caller controls, on the same
// page load as observe-design and observe-structure (ss-reference). It collects candidates with
// their measurements and decides nothing: the thresholds live in analyze-faults.mjs. It returns
// numbers, enums, boxes `[x, y, w, h]` in document pixels, and icon signatures (`<grid>|<paint>`)
// only. Text is read inside the page to classify it (an amount, an emoji) and never returned; no
// selectors, class names, element ids, asset URLs, screenshots, or form values leave the page, and
// nothing is navigated, requested, clicked, hovered, focused, typed, or written. Open shadow roots
// and iframes are not traversed. Only the window is measured, at its current scroll position (0
// after drift-report's scroll pass); SVG path geometry is not read. Caps per viewport: 6,000 text
// fragments and 300 records per list; what a cap drops is counted in `capped` (and `elements`
// counts the elements past maxElements), and a viewport with a non-zero cap reads as a lower bound.
//
// The helpers box, norm, transparent, effectiveBg, side, boxed, hasSurface, and the INTERACTIVE
// selector mirror ss-reference/scripts/observe-structure.mjs and keep its meaning; keep the copies
// textually close when either file changes.
//
// Known limits, stated rather than solved: units in scripts other than Latin, Hangul, kana, and Han
// are not recognised; a short CJK word after a number counts as its unit; `img` icons and icon fonts
// are not classified (`img` icons of at most 32px are only counted as `unknown`); text inside form
// fields is not a text node and is not measured.
//
// One reading of ours on top of the definitions: a text fragment is the part of its rect inside every
// box that clips it (an ancestor with overflow other than visible on that axis, within its containing
// block chain); a fragment with nothing left wider and taller than 0.5px is not measured. Collapsed
// content (height 0 with overflow hidden) and visually hidden labels are not painted, so they are not text
// on the rendered screen.
export function observeFaults({ maxElements = 5000 } = {}) {
  const CAP = { fragments: 6000, records: 300 };
  const vw = window.innerWidth, vh = window.innerHeight, sx = window.scrollX, sy = window.scrollY;
  const round = n => Math.round(n);
  const r1 = n => Math.round(n * 10) / 10;
  const num = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
  const tally = (map, key, weight = 1) => { if (key === undefined || key === null || key === '') return; map[key] = (map[key] || 0) + weight; };

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
  const transparent = value => !value || value === 'transparent' || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(value) || /\/\s*0\)$/.test(value);
  const alphaOf = value => { const c = norm(value); if (transparent(c)) return 0; const m = /^rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(c || ''); return m ? Number(m[1]) : 1; };

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
  const els = [];
  let truncated = false, droppedElements = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (SKIP.has(el.tagName)) continue;
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
    if (els.length >= maxElements) { truncated = true; droppedElements++; continue; }
    els.push(el);
  }
  const inSet = new Set(els);

  // Shown: a box of at least 1×1, display not none, visibility not hidden, and the product of
  // opacity from the element up to <body> at least 0.05.
  const opacityCache = new Map();
  const opacityOf = el => {
    if (!el || el === document.documentElement) return 1;
    if (opacityCache.has(el)) return opacityCache.get(el);
    const v = num(box(el).cs.opacity) * (el === document.body ? 1 : opacityOf(el.parentElement));
    opacityCache.set(el, v);
    return v;
  };
  const shownCache = new Map();
  const shown = el => {
    if (shownCache.has(el)) return shownCache.get(el);
    const { rect, cs } = box(el);
    const v = rect.width >= 1 && rect.height >= 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && opacityOf(el) >= 0.05;
    shownCache.set(el, v);
    return v;
  };
  const shownEls = els.filter(shown);
  const index = new Map(els.map((el, i) => [el, i]));

  const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=combobox],[role=textbox]';
  const HEADING = 'h1,h2,h3,h4,h5,h6,[role=heading]';
  const NO_TEXT = 'svg,select,option,textarea,script,style,noscript,template';
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
  const hasSurface = el => {
    const { cs } = box(el), bg = norm(cs.backgroundColor);
    return (!transparent(bg) && bg !== effectiveBg(el.parentElement)) || boxed(cs) || (!!cs.boxShadow && cs.boxShadow !== 'none');
  };
  const positionOf = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = box(p).cs.position; if (pos === 'fixed' || pos === 'sticky') return pos; } return 'static'; };

  // Geometry in document pixels.
  const docRect = el => { const r = box(el).rect; return { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy }; };
  const bx = r => [round(r.l), round(r.t), round(r.r - r.l), round(r.b - r.t)];
  const union = (a, b) => (a ? { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) } : { ...b });
  const display = el => box(el).cs.display;
  const inFlow = el => { const cs = box(el).cs; return cs.position !== 'absolute' && cs.position !== 'fixed' && (!cs.float || cs.float === 'none'); };
  const tablePart = el => display(el).startsWith('table');
  const flexOrGrid = el => /(^|-)(flex|grid)$/.test(display(el));
  const isSurface = el => hasSurface(el) && display(el) !== 'inline';
  const lca = (a, b) => { const seen = new Set(); for (let p = a; p; p = p.parentElement) seen.add(p); for (let p = b; p; p = p.parentElement) if (seen.has(p)) return p; return document.body; };
  const memo = fn => { const cache = new Map(); return el => { if (cache.has(el)) return cache.get(el); const v = fn(el); cache.set(el, v); return v; }; };

  // Block of an element: the nearest ancestor-or-self whose display does not start with `inline`
  // and is not `contents`.
  const blockOf = memo(el => { for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const d = display(p); if (!d.startsWith('inline') && d !== 'contents') return p; } return document.body; });

  // Clip box of an element's content: its own overflow clip (padding box, per axis) inside the clip
  // of its containing block chain. Fixed elements escape every ancestor; absolute ones escape the
  // ancestors between them and their containing block.
  const ALL = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
  const clipOf = memo(el => {
    if (!el || el === document.body || el === document.documentElement) return ALL;
    const { cs, rect } = box(el);
    const outer = cs.position === 'fixed' ? ALL : cs.position === 'absolute' ? clipOf(el.offsetParent || document.body) : clipOf(el.parentElement);
    const x = cs.overflowX !== 'visible', y = cs.overflowY !== 'visible';
    if (!x && !y) return outer;
    return {
      l: x ? Math.max(outer.l, rect.left + sx + num(cs.borderLeftWidth)) : outer.l, r: x ? Math.min(outer.r, rect.right + sx - num(cs.borderRightWidth)) : outer.r,
      t: y ? Math.max(outer.t, rect.top + sy + num(cs.borderTopWidth)) : outer.t, b: y ? Math.min(outer.b, rect.bottom + sy - num(cs.borderBottomWidth)) : outer.b,
    };
  });

  // Text fragments: every client rect of every non-space text node whose parent is shown and not
  // inside svg, select, option, textarea, script, style, noscript, or template.
  const frags = [];
  let fragsDropped = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\S/u.test(n.data)) continue;
    const el = n.parentElement;
    if (!el || !inSet.has(el) || !shown(el) || el.closest(NO_TEXT)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const clip = clipOf(el), size = num(box(el).cs.fontSize);
    for (const r of range.getClientRects()) {
      if (!(r.width > 0.5 && r.height > 0.5)) continue;
      const f = { el, size, l: Math.max(r.left + sx, clip.l), t: Math.max(r.top + sy, clip.t), r: Math.min(r.right + sx, clip.r), b: Math.min(r.bottom + sy, clip.b) };
      if (!(f.r - f.l > 0.5 && f.b - f.t > 0.5)) continue;
      if (frags.length >= CAP.fragments) { fragsDropped++; continue; }
      frags.push(f);
    }
  }
  // Per element: its fragments, and over its subtree the first fragment (document order), the
  // extent, and the count.
  const fragsOf = new Map();
  const agg = new Map();
  for (const f of frags) {
    if (!fragsOf.has(f.el)) fragsOf.set(f.el, []);
    fragsOf.get(f.el).push(f);
    for (let p = f.el; p && p !== document.documentElement; p = p.parentElement) {
      const a = agg.get(p);
      if (a) { a.ext = union(a.ext, f); a.count++; } else agg.set(p, { first: f, ext: union(null, f), count: 1 });
    }
  }
  const fragsWithin = el => [el, ...el.querySelectorAll('*')].flatMap(x => fragsOf.get(x) || []);

  // Lines: fragments sorted by top, then left; a fragment starts a new line when its top is at or
  // below the current line's bottom minus 2px.
  const lineCount = list => {
    let n = 0, bottom = -Infinity;
    for (const f of [...list].sort((a, b) => a.t - b.t || a.l - b.l)) {
      if (f.t >= bottom - 2) { n++; bottom = f.b; } else bottom = Math.max(bottom, f.b);
    }
    return n;
  };

  // Holder of a fragment: the nearest surface ancestor-or-self of its element, unless an element
  // between the two (holder excluded) is absolutely, fixed, or sticky positioned, transformed,
  // floated, or has a negative margin: such text was placed on purpose and has no holder.
  const placed = el => {
    const cs = box(el).cs;
    if (['absolute', 'fixed', 'sticky'].includes(cs.position)) return true;
    if ([cs.transform, cs.translate, cs.rotate, cs.scale].some(v => v && v !== 'none')) return true;
    if (cs.float && cs.float !== 'none') return true;
    return ['Top', 'Right', 'Bottom', 'Left'].some(s => num(cs[`margin${s}`]) < 0);
  };
  const holderOf = memo(el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (isSurface(p)) return shown(p) ? p : null;
      if (placed(p)) return null;
    }
    return null;
  });
  // Elements from `el` up to `top`: `top` included or not.
  const chain = (el, top, withTop) => { const out = []; for (let p = el; p && p !== top; p = p.parentElement) out.push(p); if (withTop && top) out.push(top); return out; };

  // Authored spacing between two boxes on an axis: the gap property of their lowest common ancestor
  // when it is a flex or grid container, the facing margins of the two boxes, and the facing padding
  // and margin of each element between a box and that ancestor (for a text fragment, starting at its
  // element). Vertical margins of two boxes outside a flex or grid container collapse, so they count
  // once (the larger). Table parts are always authored.
  const authored = (first, second, axis, gap, { firstText = false, secondText = false } = {}) => {
    const anc = lca(first, second);
    const one = chain(first, anc, false), two = chain(second, anc, false);
    if ([anc, ...one, ...two].some(tablePart)) return true;
    const [end, start] = axis === 'x' ? ['Right', 'Left'] : ['Bottom', 'Top'];
    const facing = (list, s, text) => list.reduce((acc, p, i) => {
      const cs = box(p).cs;
      return { margin: acc.margin + num(cs[`margin${s}`]), padding: acc.padding + (i > 0 || text ? num(cs[`padding${s}`]) : 0) };
    }, { margin: 0, padding: 0 });
    const a = facing(one, end, firstText), b = facing(two, start, secondText);
    const layout = flexOrGrid(anc);
    const gapProp = layout ? num(axis === 'x' ? box(anc).cs.columnGap : box(anc).cs.rowGap) : 0;
    const margins = axis === 'y' && !layout ? Math.max(a.margin, b.margin) : a.margin + b.margin;
    const sum = gapProp + margins + a.padding + b.padding;
    return sum >= 1 && gap >= sum - 0.5;
  };

  const capped = {};
  const cap = (name, list) => {
    list.sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0] || a.box[2] - b.box[2] || a.box[3] - b.box[3]);
    if (list.length > CAP.records) { capped[name] = list.length - CAP.records; list.length = CAP.records; }
    return list;
  };

  // amount-wrap: an element (not inline) whose whole text is one amount, with only inline-level
  // descendants and horizontal writing, outermost first. An inline match uses its block only when the
  // block's whole text is the same amount.
  const NUM = '\\d[\\d.,]*';
  const CJK = '[\\u3130-\\u318F\\uAC00-\\uD7A3\\u3040-\\u30FF\\u4E00-\\u9FFF]';
  const UNIT = `(?:%|‰|°[A-Za-z]?|[A-Za-zµ]{1,4}(?:/[A-Za-z]{1,4})?|${CJK}{1,3}(?:\\s?[원円元])?)`;
  const CUR = '(?:[$€£¥₩₹]|[A-Z]{3}\\s)';
  const PART = `${NUM}(?:\\s?${UNIT})?`;
  const AMOUNT = new RegExp(`^[+\\-−–~≈]?\\s?${CUR}?\\s?${PART}(?:\\s${PART}){0,3}$`, 'u');
  const textOf = el => (el.textContent || '').replace(/\s+/gu, ' ').trim();
  const inlineLevel = el => el.tagName === 'BR' || el.tagName === 'WBR' || display(el).startsWith('inline');
  const recordedAmount = new Set();
  const amounts = [];
  for (const el of shownEls) {
    if (el instanceof SVGElement) continue;
    const text = textOf(el);
    if (text.length < 1 || text.length > 32 || !AMOUNT.test(text)) continue;
    if (![...el.querySelectorAll('*')].every(inlineLevel) || !String(box(el).cs.writingMode || 'horizontal-tb').startsWith('horizontal')) continue;
    let target = el;
    if (display(el) === 'inline') { const block = blockOf(el); target = block !== el && textOf(block) === text ? block : null; }
    if (!target) continue;
    let covered = false;
    for (let p = target; p && !covered; p = p.parentElement) covered = recordedAmount.has(p);
    if (covered) continue;
    const list = fragsWithin(target);
    if (!list.length) continue;
    recordedAmount.add(target);
    amounts.push({ box: bx(docRect(target)), lines: lineCount(list), size: r1(Math.max(...list.map(f => f.size))), forced: !!target.querySelector('br') });
  }

  // text-overlap: fragments of different blocks intersecting by at least 1px each way, one record
  // per pair of elements (the largest intersection). Sweep by top.
  const paintsBg = el => { const cs = box(el).cs; return alphaOf(cs.backgroundColor) >= 0.5 || (!!cs.backgroundImage && cs.backgroundImage !== 'none'); };
  const layered = memo(el => positionOf(el) !== 'static' || !!el.closest('[aria-hidden="true"]') || opacityOf(el) < 0.5);
  const pairs = new Map();
  const byTop = [...frags].sort((a, b) => a.t - b.t || a.l - b.l);
  for (let i = 0; i < byTop.length; i++) {
    const a = byTop[i];
    for (let j = i + 1; j < byTop.length && byTop[j].t <= a.b - 1; j++) {
      const c = byTop[j];
      if (c.el === a.el) continue;
      const w = Math.min(a.r, c.r) - Math.max(a.l, c.l), h = Math.min(a.b, c.b) - Math.max(a.t, c.t);
      if (w < 1 || h < 1 || blockOf(a.el) === blockOf(c.el)) continue;
      const [p, q] = index.get(a.el) <= index.get(c.el) ? [a, c] : [c, a];
      const key = `${index.get(p.el)},${index.get(q.el)}`;
      let pair = pairs.get(key);
      if (!pair) {
        const anc = lca(p.el, q.el);
        const blocked = [p.el, q.el].some(el => layered(el) || chain(el, anc, false).some(paintsBg));
        pair = { blocked, best: null };
        pairs.set(key, pair);
      }
      if (pair.blocked || (pair.best && pair.best.w * pair.best.h >= w * h)) continue;
      pair.best = { box: bx(p), against: bx(q), w: r1(w), h: r1(h), size: r1(Math.min(p.size, q.size)) };
    }
  }
  const overlaps = [...pairs.values()].map(p => p.best).filter(Boolean);

  // text-spill and tight-inset: per fragment with a holder.
  const clipsAxis = (list, axis) => list.some(p => (axis === 'x' ? box(p).cs.overflowX : box(p).cs.overflowY) !== 'visible');
  const spillMap = new Map();
  const insetMap = new Map();
  for (const f of frags) {
    const holder = holderOf(f.el);
    if (!holder) continue;
    const hr = docRect(holder), between = chain(f.el, holder, true);
    const sides = { left: hr.l - f.l, right: f.r - hr.r, top: hr.t - f.t, bottom: f.b - hr.b };
    for (const [s, by] of Object.entries(sides)) {
      if (!(by > 1) || clipsAxis(between, s === 'left' || s === 'right' ? 'x' : 'y')) continue;
      const key = `${index.get(f.el)},${index.get(holder)},${s}`, prev = spillMap.get(key);
      if (!prev || prev.by < by) spillMap.set(key, { f, holder, side: s, by });
    }
    const key = `${index.get(f.el)},${index.get(holder)}`;
    const entry = insetMap.get(key) || { el: f.el, holder, ext: null };
    entry.ext = union(entry.ext, f);
    insetMap.set(key, entry);
  }
  const spills = [...spillMap.values()].map(s => ({ box: bx(s.f), against: bx(docRect(s.holder)), side: s.side, by: r1(s.by) }));
  const insets = [];
  for (const { holder, ext } of insetMap.values()) {
    const { cs } = box(holder), hr = docRect(holder);
    const w = hr.r - hr.l, h = hr.b - hr.t;
    const radius = Math.max(...['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(c => { const v = String(cs[`border${c}Radius`] || '0').split(' ')[0]; return v.endsWith('%') ? (num(v) / 100) * Math.min(w, h) : num(v); }));
    if (radius >= Math.min(w, h) / 2 && w <= 1.5 * h) continue;
    const kind = w >= 160 && h >= 48 ? 'panel' : 'chip';
    const inner = { l: hr.l + num(cs.borderLeftWidth), r: hr.r - num(cs.borderRightWidth), t: hr.t + num(cs.borderTopWidth), b: hr.b - num(cs.borderBottomWidth) };
    const scrollsY = /^(auto|scroll)$/.test(cs.overflowY);
    const judged = v => (v >= 0 ? r1(v) : null);
    const rec = {
      box: bx(ext), against: bx(hr), kind, left: judged(ext.l - inner.l), right: judged(inner.r - ext.r),
      top: kind === 'panel' && !scrollsY ? judged(ext.t - inner.t) : null, bottom: kind === 'panel' && !scrollsY ? judged(inner.b - ext.b) : null,
    };
    const values = [rec.left, rec.right, rec.top, rec.bottom].filter(v => v !== null);
    if (values.length && Math.min(...values) < 16) insets.push(rec);
  }

  // text-clip: an element with its own text, at least 4×4, cut without an ellipsis or a line clamp.
  const masked = memo(el => { if (!el || el === document.documentElement) return false; const cs = box(el).cs; const m = cs.maskImage || cs.webkitMaskImage; return (!!m && m !== 'none') || masked(el.parentElement); });
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('');
  const clips = [];
  for (const el of shownEls) {
    if (el instanceof SVGElement || !/\S/u.test(ownText(el))) continue;
    const { rect, cs } = box(el);
    if (rect.width < 4 || rect.height < 4 || masked(el)) continue;
    let running = false;
    try { running = el.getAnimations().some(a => a.playState === 'running'); } catch { running = false; }
    if (running) continue;
    const r = docRect(el);
    const xBy = el.scrollWidth - el.clientWidth, yBy = el.scrollHeight - el.clientHeight;
    if (['hidden', 'clip'].includes(cs.overflowX) && xBy > 1 && cs.textOverflow !== 'ellipsis') clips.push({ box: bx(r), axis: 'x', by: r1(xBy) });
    const clamp = cs.getPropertyValue('-webkit-line-clamp') || 'none';
    if (['hidden', 'clip'].includes(cs.overflowY) && yBy > num(cs.fontSize) / 2 && clamp === 'none') clips.push({ box: bx(r), axis: 'y', by: r1(yBy) });
  }

  // text-touch: for each fragment, the nearest in-flow surface on its line on each side (at least
  // 4×4, not an ancestor or descendant of the text's element, not an inline surface in the text's
  // own block), with a horizontal gap from 0 to under 6. One record per element and surface (the
  // smallest gap).
  const surfaces = shownEls.filter(el => isSurface(el) && inFlow(el)).map(el => ({ el, r: docRect(el) })).filter(s => s.r.r - s.r.l >= 4 && s.r.b - s.r.t >= 4);
  const BAND = 64;
  const bands = new Map();
  for (const s of surfaces) for (let k = Math.floor(s.r.t / BAND); k <= Math.floor(s.r.b / BAND); k++) { if (!bands.has(k)) bands.set(k, []); bands.get(k).push(s); }
  const touchMap = new Map();
  for (const f of frags) {
    const near = { left: null, right: null };
    const seen = new Set();
    const half = (f.b - f.t) / 2;
    for (let k = Math.floor(f.t / BAND); k <= Math.floor(f.b / BAND); k++) {
      for (const s of bands.get(k) || []) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (Math.min(f.b, s.r.b) - Math.max(f.t, s.r.t) < half) continue;
        if (s.el.contains(f.el) || f.el.contains(s.el)) continue;
        if (display(s.el).startsWith('inline') && blockOf(s.el) === blockOf(f.el)) continue;
        const left = f.l - s.r.r, right = s.r.l - f.r;
        if (left >= 0 && (!near.left || left < near.left.gap)) near.left = { s, gap: left };
        if (right >= 0 && (!near.right || right < near.right.gap)) near.right = { s, gap: right };
      }
    }
    for (const [dir, hit] of Object.entries(near)) {
      if (!hit || hit.gap >= 6) continue;
      const key = `${index.get(f.el)},${index.get(hit.s.el)}`, prev = touchMap.get(key);
      if (prev && prev.gap <= hit.gap) continue;
      touchMap.set(key, { f, s: hit.s, gap: hit.gap, dir });
    }
  }
  const touches = [...touchMap.values()].map(({ f, s, gap, dir }) => ({
    box: bx(f), against: bx(s.r), gap: r1(gap),
    authored: dir === 'left' ? authored(s.el, f.el, 'x', gap, { secondText: true }) : authored(f.el, s.el, 'x', gap, { firstText: true }),
  }));

  // Children per parent (shown, in flow); a `display: contents` parent passes its children up.
  const kidsOf = new Map();
  for (const el of shownEls) {
    if (!inFlow(el)) continue;
    let p = el.parentElement;
    while (p && p !== document.body && display(p) === 'contents') p = p.parentElement;
    if (!kidsOf.has(p)) kidsOf.set(p, []);
    kidsOf.get(p).push(el);
  }

  // near-touch: two consecutive in-flow sibling surfaces sharing a line (x) or a column (y), with a
  // gap from 0.5 to under 6.
  const gaps = [];
  // near-align: two consecutive stacked in-flow children of one parent, both text without a surface
  // or both surfaces, whose starts differ by 0.5 to under 6.
  const aligns = [];
  const extentOf = el => (isSurface(el) ? docRect(el) : agg.get(el)?.ext ?? null);
  const startOf = el => (isSurface(el) ? docRect(el).l : agg.get(el)?.first.l ?? null);
  const sortOf = el => (isSurface(el) ? 'surface' : agg.has(el) ? 'text' : null);
  const leftAligned = el => ['start', 'left', '-webkit-left'].includes(box(el).cs.textAlign);
  const marker = el => display(el) === 'list-item' && box(el).cs.listStyleType !== 'none';
  for (const list of kidsOf.values()) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      const ra = docRect(a), rb = docRect(b);
      if (isSurface(a) && isSurface(b)) {
        const vOverlap = Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t), hOverlap = Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l);
        let axis = null, gap = null, first = a, second = b;
        if (vOverlap >= 0.5 * Math.min(ra.b - ra.t, rb.b - rb.t)) { axis = 'x'; gap = Math.max(rb.l - ra.r, ra.l - rb.r); if (ra.l - rb.r > rb.l - ra.r) [first, second] = [b, a]; }
        else if (hOverlap >= 0.5 * Math.min(ra.r - ra.l, rb.r - rb.l)) { axis = 'y'; gap = Math.max(rb.t - ra.b, ra.t - rb.b); if (ra.t - rb.b > rb.t - ra.b) [first, second] = [b, a]; }
        if (axis && gap >= 0.5 && gap < 6) gaps.push({ box: bx(ra), against: bx(rb), axis, gap: r1(gap), authored: authored(first, second, axis, gap) });
      }
      if (rb.t < ra.b - 1) continue;
      const sort = sortOf(a);
      if (!sort || sort !== sortOf(b)) continue;
      if ([a, b].some(el => tablePart(el) || marker(el) || !leftAligned(el))) continue;
      const ea = extentOf(a), eb = extentOf(b);
      if (Math.abs((ea.l + ea.r) / 2 - (eb.l + eb.r) / 2) <= 0.5 || Math.abs(ea.r - eb.r) <= 0.5) continue;
      const delta = Math.abs(startOf(a) - startOf(b));
      if (delta >= 0.5 && delta < 6) aligns.push({ box: bx(ea), against: bx(eb), delta: r1(delta) });
    }
  }

  // emoji-icon: an element whose own text is 1–8 emoji, in a control, leading a flex row whose
  // later siblings hold text, or alone in a square surface of at most 64px. Not inside a heading.
  const EP = /\p{Emoji_Presentation}/u, XP = /\p{Extended_Pictographic}/u;
  const emojiCount = text => {
    const cps = [...text];
    let count = 0;
    for (let i = 0; i < cps.length; i++) {
      const c = cps[i], code = c.codePointAt(0);
      if (/\s/u.test(c) || code === 0xfe0e || code === 0xfe0f || code === 0x200d || (code >= 0x1f3fb && code <= 0x1f3ff)) continue;
      if (!(EP.test(c) || (code >= 0x1f1e6 && code <= 0x1f1ff) || (XP.test(c) && cps[i + 1] === '️'))) return 0;
      count++;
    }
    return count;
  };
  const nearestSurface = el => { for (let p = el; p && p !== document.body; p = p.parentElement) if (isSurface(p)) return p; return null; };
  const emoji = [];
  for (const el of shownEls) {
    if (el instanceof SVGElement || el.closest(HEADING)) continue;
    const n = emojiCount(ownText(el));
    if (n < 1 || n > 8) continue;
    let context = null;
    if (el.closest(INTERACTIVE)) context = 'control';
    else {
      let p = el.parentElement;
      while (p && p !== document.body && display(p) === 'contents') p = p.parentElement;
      const siblings = kidsOf.get(p) || [];
      if (p && /flex$/.test(display(p)) && /^row/.test(box(p).cs.flexDirection) && siblings[0] === el && siblings.slice(1).some(s => agg.has(s))) context = 'lead';
      else {
        const tile = nearestSurface(el);
        if (tile) {
          const r = docRect(tile), w = r.r - r.l, h = r.b - r.t;
          if (Math.abs(w - h) <= 1 && Math.max(w, h) <= 64 && (agg.get(tile)?.count ?? 0) === (agg.get(el)?.count ?? 0)) context = 'tile';
        }
      }
    }
    if (context) emoji.push({ box: bx(docRect(el)), context, size: r1(num(box(el).cs.fontSize)) });
  }

  // icon-mix: top-level svg icons of 8–32px, signed `<grid>|<paint>`, grouped by their nearest
  // navigation, list, table, toolbar, tab list, or menu. Icons in a selected item are left out of
  // the groups (an outline default with a filled selected state is allowed).
  const SHAPES = 'path,rect,circle,line,polyline,polygon,ellipse';
  const NOT_DRAWN = 'defs,clipPath,clippath,mask,symbol,pattern,marker';
  const GROUP = 'nav,ul,ol,table,[role=navigation],[role=toolbar],[role=tablist],[role=menu],[role=menubar],[role=list],[role=listbox]';
  const SELECTED = '[aria-selected="true"],[aria-current]:not([aria-current="false"]),[aria-pressed="true"],[aria-checked="true"],[data-state="active"],[data-state="on"],[data-state="checked"],[data-state="open"]';
  const paintOf = svg => {
    let filled = false, stroked = false;
    for (const shape of svg.querySelectorAll(SHAPES)) {
      if (shape.closest(NOT_DRAWN)) continue;
      const cs = getComputedStyle(shape);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const fill = shape.tagName.toLowerCase() !== 'line' && cs.fill && cs.fill !== 'none' && num(cs.fillOpacity || '1') > 0 && (/^url\(/.test(cs.fill) || !transparent(norm(cs.fill)));
      const stroke = cs.stroke && cs.stroke !== 'none' && num(cs.strokeWidth) > 0 && num(cs.strokeOpacity || '1') > 0 && (/^url\(/.test(cs.stroke) || !transparent(norm(cs.stroke)));
      filled = filled || !!fill; stroked = stroked || !!stroke;
    }
    return filled && stroked ? 'both' : filled ? 'fill' : stroked ? 'stroke' : 'none';
  };
  const sets = {};
  const groupsOf = new Map();
  let unknown = 0;
  for (const el of shownEls) {
    const tag = el.tagName.toLowerCase(), r = box(el).rect, longer = Math.max(r.width, r.height);
    if (tag === 'img') { if (longer <= 32) unknown++; continue; }
    if (tag !== 'svg' || (el.parentElement && el.parentElement.closest('svg')) || longer < 8 || longer > 32) continue;
    const grid = el.getAttribute('viewBox') && el.viewBox && el.viewBox.baseVal ? String(round(el.viewBox.baseVal.height)) : 'none';
    const paint = paintOf(el), signature = `${grid}|${paint}`;
    tally(sets, signature);
    if (paint === 'none' || el.closest(SELECTED)) continue;
    const group = el.parentElement && el.parentElement.closest(GROUP);
    if (!group) continue;
    if (!groupsOf.has(group)) groupsOf.set(group, []);
    groupsOf.get(group).push(signature);
  }
  const groups = [];
  for (const [group, list] of groupsOf) {
    const groupSets = {};
    for (const s of list) tally(groupSets, s);
    if (list.length >= 2 && Object.keys(groupSets).length >= 2) groups.push({ box: bx(docRect(group)), sets: Object.fromEntries(Object.entries(groupSets).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))), n: list.length });
  }

  if (fragsDropped) capped.textRuns = fragsDropped;
  const out = {
    version: 1, viewport: { width: vw, height: vh }, elements: els.length, truncated, textRuns: frags.length,
    amounts: cap('amounts', amounts), overlaps: cap('overlaps', overlaps), spills: cap('spills', spills), clips: cap('clips', clips),
    insets: cap('insets', insets), touches: cap('touches', touches), gaps: cap('gaps', gaps), aligns: cap('aligns', aligns), emoji: cap('emoji', emoji),
    icons: { sets: Object.fromEntries(Object.entries(sets).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))), groups: cap('groups', groups), unknown },
    capped,
  };
  if (droppedElements) capped.elements = droppedElements;
  return out;
}
