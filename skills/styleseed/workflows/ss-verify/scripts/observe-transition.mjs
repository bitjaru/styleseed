// Transition frame sampler for transition-jumps.mjs: pass to page.evaluate in a browser the caller
// controls, on one of your own pages or fixtures that declares its state changes. Never point it at a
// reference site. A case is a root [data-styleseed-transition="<id>"] holding exactly one
// [data-styleseed-trigger] (the root itself may be it); a trigger belongs to its nearest case root.
//
// One call samples one case in one direction. It waits until no animation under the root is running,
// records every box under the root, clicks the trigger with element.click() (the only thing it does to
// the page), and holds (pauses) every CSS transition, CSS animation, and Web Animation the change starts
// under the root: on `transitionrun` and `animationstart` (capture), right after the click, and on each
// of the next six animation frames, since a framework may apply the change a frame or two late. It then
// steps the held clocks every `stepMs` from 0 to the largest end time (an animation with a negative
// playback rate from its end time back to 0), recording every box at each step, finishes the animations,
// and records the settled boxes twice, one frame apart. Stepping a held clock gives the same frames on
// every machine. With `forceAll` it first sets `transition-property: all !important` inline on every
// element under the root, and restores each value afterwards; nothing else is written. Every element is
// forced, not only those with a duration at rest, because a duration may exist only in the changed state;
// an element whose duration is 0 still changes at once.
//
// It returns numbers, enums, and boxes `[x, y, w, h]` in document pixels to one decimal: no property
// names, animation names (an author's string), text, selectors, or screenshots. Each element's own text
// is read inside the page only to say whether it changed between rest and settled (`textChanged` holds
// indices). Open shadow roots and iframes are not traversed; elements inside an svg are not tracked (the
// top-level svg is), and SVG path geometry is not read.
//
// A box is recorded only when the element is shown in that frame, else null: connected, at least 1×1 and
// not within 2×2 (a visually hidden label is 1×1), display not none, visibility not hidden, the product of
// opacity from it up to <body> at least 0.05, not cut to nothing by a `clip-path: inset()` or a `clip:
// rect()` on it or an ancestor, rendered by the browser (Element.checkVisibility where available, else a
// closed-<details> test), in the reachable document (not entirely left of x = 0 or above y = 0, not
// entirely right of the root's client width when html or body hides or clips overflow on x), and with some
// part (over 0.5px each way) inside every box that clips it. An element that is not shown in one of two
// compared frames is skipped for that comparison by the analysis. These are the "shown" and "reachable"
// readings of observe-faults.mjs, evaluated per frame, with the clip and 2×2 tests added.
//
// Statuses: `sampled`; `instant` (the change started no animation: valid, no findings); `inconclusive`
// with a reason: `not-at-rest` (an animation under the root was still running 2s after the call, or the
// change started one that never ends), `capped` (more than maxElements elements under the root; nothing
// is clicked), `chained` (an animation that existed before the click was set running by it, such as a
// paused CSS animation or a reused Web Animation, or after the held animations finished another one was
// running), or `script-driven` (the settled boxes moved between two frames: motion not driven by an
// Animation cannot be stepped). `clicked` says whether the trigger was clicked.
export function declaredCases() {
  const ATTR = 'data-styleseed-transition', TRIGGER = 'data-styleseed-trigger';
  return [...document.querySelectorAll(`[${ATTR}]`)].map(root => ({
    id: root.getAttribute(ATTR),
    triggers: [root, ...root.querySelectorAll(`[${TRIGGER}]`)].filter(el => el.hasAttribute(TRIGGER) && el.closest(`[${ATTR}]`) === root).length,
  }));
}

export async function sampleTransition({ id, direction = 'forward', stepMs = 1000 / 60, forceAll = false, maxElements = 400 } = {}) {
  const REST_MS = 2000, HOLD_FRAMES = 6;
  const ATTR = 'data-styleseed-transition', TRIGGER = 'data-styleseed-trigger';
  const r1 = n => Math.round(n * 10) / 10;
  const num = value => { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; };
  const nextFrame = () => new Promise(done => { requestAnimationFrame(() => done()); });
  if (!(stepMs > 0)) throw new Error(`sampleTransition: stepMs must be a positive number of milliseconds (got ${stepMs})`);
  const root = [...document.querySelectorAll(`[${ATTR}]`)].find(el => el.getAttribute(ATTR) === id);
  if (!root) throw new Error(`no [${ATTR}="${id}"] on the page (${direction})`);
  const owned = [root, ...root.querySelectorAll(`[${TRIGGER}]`)].filter(el => el.hasAttribute(TRIGGER) && el.closest(`[${ATTR}]`) === root);
  if (owned.length !== 1) throw new Error(`case ${id} holds ${owned.length} [${TRIGGER}] elements; mark exactly one`);
  const trigger = owned[0];
  const nothing = (status, reason, clicked) => ({ status, ...(reason ? { reason } : {}), clicked, transitions: 0, animations: 0, duration: null, times: [], rest: [], frames: [], settled: [], parents: [], textChanged: [] });

  // 1. Rest: no running animation under the root, waiting up to 2s.
  const running = () => root.getAnimations({ subtree: true }).some(a => a.playState === 'running');
  const waitStart = performance.now();
  while (running()) {
    if (performance.now() - waitStart >= REST_MS) return nothing('inconclusive', 'not-at-rest', false);
    await nextFrame();
  }

  // Tracked elements: the root and its descendants in document order, not inside an svg; each one's
  // parent index (-1 for the root).
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'WBR']);
  const els = [root, ...root.querySelectorAll('*')].filter(el => !SKIP.has(el.tagName) && (el === root || !el.parentElement || !el.parentElement.closest('svg')));
  if (els.length > maxElements) return nothing('inconclusive', 'capped', false);
  const indexOf = new Map(els.map((el, i) => [el, i]));
  const parents = els.map((el, i) => { if (i === 0) return -1; for (let p = el.parentElement; p; p = p.parentElement) if (indexOf.has(p)) return indexOf.get(p); return 0; });
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').replace(/\s+/gu, ' ').trim();

  // Shown and reachable, per frame (see the header).
  const ALL = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
  const rendered = el => {
    if (typeof el.checkVisibility === 'function') {
      try { return el.checkVisibility({ contentVisibilityAuto: false, opacityProperty: false, visibilityProperty: true }); } catch { /* fall through */ }
    }
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.tagName !== 'DETAILS' || p.open) continue;
      const summary = [...p.children].find(c => c.tagName === 'SUMMARY');
      if (!summary || !summary.contains(el)) return false;
    }
    return true;
  };
  const record = () => {
    const sx = window.scrollX, sy = window.scrollY;
    const styles = new Map(), rects = new Map(), opacities = new Map(), clips = new Map();
    const style = el => { let v = styles.get(el); if (!v) { v = getComputedStyle(el); styles.set(el, v); } return v; };
    const rectOf = el => { let v = rects.get(el); if (!v) { v = el.getBoundingClientRect(); rects.set(el, v); } return v; };
    const opacityOf = el => {
      if (!el || el === document.documentElement) return 1;
      if (opacities.has(el)) return opacities.get(el);
      const v = num(style(el).opacity) * (el === document.body ? 1 : opacityOf(el.parentElement));
      opacities.set(el, v);
      return v;
    };
    // The clip of an element's content: its own overflow clip (padding box, per axis) inside the clip of
    // its containing block chain. A box is clipped by the content clip of its containing block.
    const contentClip = el => {
      if (!el || el === document.body || el === document.documentElement) return ALL;
      if (clips.has(el)) return clips.get(el);
      const s = style(el), r = rectOf(el), outer = boxClip(el);
      const x = s.overflowX !== 'visible', y = s.overflowY !== 'visible';
      const v = !x && !y ? outer : {
        l: x ? Math.max(outer.l, r.left + sx + num(s.borderLeftWidth)) : outer.l, r: x ? Math.min(outer.r, r.right + sx - num(s.borderRightWidth)) : outer.r,
        t: y ? Math.max(outer.t, r.top + sy + num(s.borderTopWidth)) : outer.t, b: y ? Math.min(outer.b, r.bottom + sy - num(s.borderBottomWidth)) : outer.b,
      };
      clips.set(el, v);
      return v;
    };
    const boxClip = el => {
      const position = style(el).position;
      if (position === 'fixed') return ALL;
      if (position === 'absolute') return contentClip((el instanceof HTMLElement ? el.offsetParent : null) || document.body);
      return contentClip(el.parentElement);
    };
    // Cut to nothing by its own `clip-path: inset()` or `clip: rect()` (absolute or fixed boxes only), or
    // an ancestor's: what is left is under 1px on either axis (`inset(50%)`, `rect(0 0 0 0)`, the
    // visually hidden pattern). Other clip-path shapes are not read.
    const cutAway = new Map();
    const length = (value, of) => (String(value).trim().endsWith('%') ? (num(value) / 100) * of : num(value));
    const clippedAway = el => {
      if (!el || el === document.body || el === document.documentElement) return false;
      if (cutAway.has(el)) return cutAway.get(el);
      const s = style(el), r = rectOf(el);
      let v = false;
      const inset = /^inset\((.*)\)$/u.exec(String(s.clipPath || '').trim());
      if (inset) {
        const parts = inset[1].split(/\s+round\s+/u)[0].trim().split(/\s+/u);
        const [t, rt = t, b = t, l = rt] = parts;
        v = r.width - length(l, r.width) - length(rt, r.width) < 1 || r.height - length(t, r.height) - length(b, r.height) < 1;
      }
      const rect = /^rect\((.*)\)$/u.exec(String(s.clip || '').trim());
      if (!v && rect && (s.position === 'absolute' || s.position === 'fixed')) {
        const [t, rt, b, l] = rect[1].split(/[\s,]+/u).map(x => (x === 'auto' ? null : num(x)));
        v = (rt ?? r.width) - (l ?? 0) < 1 || (b ?? r.height) - (t ?? 0) < 1;
      }
      v = v || clippedAway(el.parentElement);
      cutAway.set(el, v);
      return v;
    };
    const rootClipsX = [document.documentElement, document.body].some(el => el && ['hidden', 'clip'].includes(style(el).overflowX));
    const rootWidth = document.documentElement.clientWidth;
    return els.map(el => {
      if (!el.isConnected) return null;
      const r = rectOf(el), s = style(el);
      if (!(r.width >= 1 && r.height >= 1) || (r.width < 2 && r.height < 2)) return null;
      if (s.display === 'none' || s.visibility === 'hidden' || opacityOf(el) < 0.05 || clippedAway(el) || !rendered(el)) return null;
      const b = { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy };
      if (!(b.r > 0 && b.b > 0) || (rootClipsX && b.l >= rootWidth)) return null;
      const c = boxClip(el);
      if (!(Math.min(b.r, c.r) - Math.max(b.l, c.l) > 0.5 && Math.min(b.b, c.b) - Math.max(b.t, c.t) > 0.5)) return null;
      return [r1(b.l), r1(b.t), r1(r.width), r1(r.height)];
    });
  };

  // --compare-all: one inline property on every element under the root, restored before returning.
  const forced = [];
  const restore = () => {
    for (const f of forced.splice(0)) {
      if (f.value) f.el.style.setProperty('transition-property', f.value, f.priority);
      else f.el.style.removeProperty('transition-property');
    }
  };
  const listener = () => hold();
  const held = new Set();
  let before = new Set();
  const hold = () => {
    for (const a of root.getAnimations({ subtree: true })) {
      if (held.has(a) || before.has(a)) continue;
      held.add(a);
      try { a.pause(); } catch { /* an animation that cannot pause is stepped as it is */ }
    }
  };
  // Lets the held animations run on the page's own clock when a run stops before stepping them.
  const release = list => { for (const a of list) { try { a.play(); } catch { /* left paused */ } } };
  try {
    if (forceAll) {
      // Every element, not only those with a duration at rest: the duration may exist only in the
      // changed state. An element whose duration is 0 still changes at once.
      for (const el of els) {
        if (!el.style) continue;
        forced.push({ el, value: el.style.getPropertyValue('transition-property'), priority: el.style.getPropertyPriority('transition-property') });
        el.style.setProperty('transition-property', 'all', 'important');
      }
    }
    const rest = record();
    const restText = els.map(ownText);

    // 2. Hold: animations present before the click (a finished entrance with fill-mode forwards) are
    // not the change's and are left alone.
    before = new Set(root.getAnimations({ subtree: true }));
    root.addEventListener('transitionrun', listener, true);
    root.addEventListener('animationstart', listener, true);
    try {
      trigger.click();
      hold();
      for (let i = 0; i < HOLD_FRAMES; i++) { await nextFrame(); hold(); }
    } finally {
      root.removeEventListener('transitionrun', listener, true);
      root.removeEventListener('animationstart', listener, true);
    }
    // A held animation that the page cancelled while it was held (a reversed or replaced transition)
    // reads idle; setting its clock would bring it back, so it is dropped.
    const anims = [...held].filter(a => a.playState !== 'idle');
    const transitions = anims.filter(a => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition).length;
    const counts = { clicked: true, transitions, animations: anims.length - transitions };
    const unstepped = reason => ({ status: 'inconclusive', reason, ...counts, duration: null, times: [], rest: [], frames: [], settled: [], parents: [], textChanged: [] });
    // An animation that existed before the click and that the click set running (a paused CSS animation
    // whose play state changed, a reused Web Animation played again) runs on the page's clock, not ours.
    if ([...before].some(a => a.playState === 'running')) { release(anims); return unstepped('chained'); }
    // 5. No held animation: the change is instant.
    if (!anims.length) return { status: 'instant', ...counts, duration: 0, times: [], rest, frames: [], settled: [], parents, textChanged: [] };

    // 3. Step every held clock from 0 to the largest end time; one with a negative playback rate runs
    // from its end time back to 0.
    const ends = anims.map(a => { try { return a.effect ? a.effect.getComputedTiming().endTime : 0; } catch { return 0; } });
    const end = Math.max(0, ...ends);
    if (!Number.isFinite(end)) { release(anims); return unstepped('not-at-rest'); }
    const times = [], frames = [];
    for (let k = 0; ; k++) {
      const t = k * stepMs;
      anims.forEach((a, i) => { a.currentTime = a.playbackRate < 0 ? Math.max(ends[i] - t, 0) : Math.min(t, ends[i]); });
      times.push(r1(t));
      frames.push(record());
      if (t >= end) break;
    }

    // 4. Settle: finish, wait two frames, record, one more frame, record again.
    for (const a of anims) { try { a.finish(); } catch { /* an animation that cannot finish stays where the last step left it */ } }
    await nextFrame();
    await nextFrame();
    const settled = record();
    await nextFrame();
    const again = record();
    const chained = root.getAnimations({ subtree: true }).some(a => !held.has(a) && a.playState === 'running');
    const textChanged = els.map((el, i) => (el.isConnected && ownText(el) !== restText[i] ? i : -1)).filter(i => i >= 0);
    const base = { ...counts, duration: r1(end), times, rest, frames, settled, parents, textChanged };
    if (chained) return { status: 'inconclusive', reason: 'chained', ...base };
    if (JSON.stringify(settled) !== JSON.stringify(again)) return { status: 'inconclusive', reason: 'script-driven', ...base };
    return { status: 'sampled', ...base };
  } finally { restore(); }
}
