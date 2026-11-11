// Example pairs for the render-fault classes of ss-verify/scripts/analyze-faults.mjs: one entry per
// class, in FAULT_CLASSES order, each a complete small HTML document with plain CSS, no script, no
// remote resource, and fictional copy. A bad page shows its fault once and no other gate-candidate
// class (amount-wrap, text-overlap, text-spill); a good page is the same layout with the fault
// repaired. Both fit in 360px of width, so the 1440 and 390 viewports measure the same thing.
//
// Font-independent by construction: every size that decides a fault comes from padding, fixed
// widths, margins, and positions, never from a font's metrics (a wrapped amount sits in a box far
// narrower than one word, a bad inset is `padding: 2px`, an overlap is 20px of negative margin, a
// touch is a flex item placed against its neighbour). A good case clears its threshold by at least
// 4px, or sits exactly on an edge. CI runs on other platforms with other fonts. The icons are
// single-shape SVGs written for this file. The browser fixture is scripts/test-render-faults-browser.mjs.
const doc = (title, css, body) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f4f2;color:#1b1d1c;font:16px/24px system-ui,sans-serif}
p{margin:0}.card{display:block;width:312px;background:#ffffff;border-radius:8px;padding:24px}
${css}
</style><body>${body}</body></html>`;

const STROKE_HOME = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z"/></svg>';
const STROKE_BOX = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h16v14H4z"/></svg>';
const FILL_BOX = '<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 4h14v12H3z"/></svg>';
const STROKE_BELL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/></svg>';

export const FAULT_PAIRS = Object.freeze([
  {
    // An amount in a box a fraction of one word wide wraps at its space; the repair keeps it on one line.
    id: 'amount-wrap',
    good: doc('amount-wrap good', '.value{font-size:32px;line-height:40px;white-space:nowrap}', '<div class="card"><p>Shipped this week</p><p class="value">10 kg</p></div>'),
    bad: doc('amount-wrap bad', '.value{width:20px;font-size:32px;line-height:40px}', '<div class="card"><p>Shipped this week</p><p class="value">10 kg</p></div>'),
  },
  {
    // A second paragraph pulled 20px up over the first.
    id: 'text-overlap',
    good: doc('text-overlap good', '.pull{margin-top:0}', '<div class="card"><p>Invoice sent to the client</p><p class="pull">Waiting for payment</p></div>'),
    bad: doc('text-overlap bad', '.pull{margin-top:-20px}', '<div class="card"><p>Invoice sent to the client</p><p class="pull">Waiting for payment</p></div>'),
  },
  {
    // A 48px chip whose label runs out past its right edge; the repair lets the chip fit its label.
    id: 'text-spill',
    good: doc('text-spill good', '.chip{display:inline-block;white-space:nowrap;padding:0 8px;background:#e4eaf5;border-radius:4px;font-size:14px;line-height:24px}', '<div class="card"><p>Review status</p><span class="chip">Waiting for review</span></div>'),
    bad: doc('text-spill bad', '.chip{display:inline-block;width:48px;white-space:nowrap;padding:0 8px;background:#e4eaf5;border-radius:4px;font-size:14px;line-height:24px}', '<div class="card"><p>Review status</p><span class="chip">Waiting for review</span></div>'),
  },
  {
    // A file name cut by its 120px box with nothing to say it was cut; the repair adds the ellipsis.
    id: 'text-clip',
    good: doc('text-clip good', '.name{width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}', '<div class="card"><p>Latest export</p><p class="name">quarterly-settlement-report-final.csv</p></div>'),
    bad: doc('text-clip bad', '.name{width:120px;overflow:hidden;white-space:nowrap}', '<div class="card"><p>Latest export</p><p class="name">quarterly-settlement-report-final.csv</p></div>'),
  },
  {
    // A 312px panel with 2px of padding; the repair gives it 16px.
    id: 'tight-inset',
    good: doc('tight-inset good', '.panel{width:312px;min-height:64px;padding:16px;background:#ffffff;border-radius:8px}', '<div class="panel"><p>Storage almost full</p><p>Free up space to keep syncing</p></div>'),
    bad: doc('tight-inset bad', '.panel{width:312px;min-height:64px;padding:2px;background:#ffffff;border-radius:8px}', '<div class="panel"><p>Storage almost full</p><p>Free up space to keep syncing</p></div>'),
  },
  {
    // A status mark set flush against its label in a flex row; the repair adds a 12px gap.
    id: 'text-touch',
    good: doc('text-touch good', '.row{display:flex;align-items:center;gap:12px}.mark{width:24px;height:24px;background:#1f7a5c;border-radius:4px}', '<div class="card"><div class="row"><span class="mark"></span><span>Payments online</span></div></div>'),
    bad: doc('text-touch bad', '.row{display:flex;align-items:center}.mark{width:24px;height:24px;background:#1f7a5c;border-radius:4px}', '<div class="card"><div class="row"><span class="mark"></span><span>Payments online</span></div></div>'),
  },
  {
    // Two 100px tiles spread across 202px leave a 2px seam; the repair spreads them across 216px.
    id: 'near-touch',
    good: doc('near-touch good', '.pair{display:flex;justify-content:space-between;width:216px;margin-top:16px}.tile{width:100px;height:48px;background:#e6ecea;border-radius:6px}', '<div class="card"><p>Two plans</p><div class="pair"><div class="tile"></div><div class="tile"></div></div></div>'),
    bad: doc('near-touch bad', '.pair{display:flex;justify-content:space-between;width:202px;margin-top:16px}.tile{width:100px;height:48px;background:#e6ecea;border-radius:6px}', '<div class="card"><p>Two plans</p><div class="pair"><div class="tile"></div><div class="tile"></div></div></div>'),
  },
  {
    // A second line indented by 2px of padding; the repair starts both on one edge.
    id: 'near-align',
    good: doc('near-align good', '.shift{padding-left:0}', '<div class="card"><p>Plan</p><p class="shift">Billing contact and invoices</p></div>'),
    bad: doc('near-align bad', '.shift{padding-left:2px}', '<div class="card"><p>Plan</p><p class="shift">Billing contact and invoices</p></div>'),
  },
  {
    // A bell emoji as the icon of a button; the repair uses a drawn icon.
    id: 'emoji-icon',
    good: doc('emoji-icon good', '.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font:inherit;color:inherit;background:#eef1f0;border:1px solid #c9d0cd;border-radius:8px}', `<div class="card"><button class="btn" type="button">${STROKE_BELL}<span>Alerts</span></button></div>`),
    bad: doc('emoji-icon bad', '.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font:inherit;color:inherit;background:#eef1f0;border:1px solid #c9d0cd;border-radius:8px}', '<div class="card"><button class="btn" type="button"><span>\u{1F514}</span><span>Alerts</span></button></div>'),
  },
  {
    // One navigation with a stroked 24-grid icon beside a filled 20-grid one; the repair draws both
    // on the 24 grid with strokes.
    id: 'icon-mix',
    good: doc('icon-mix good', '.item{display:flex;align-items:center;gap:12px;padding:8px 0;color:inherit;text-decoration:none}', `<nav class="card" aria-label="Main"><a class="item" href="#home">${STROKE_HOME}<span>Home</span></a><a class="item" href="#orders">${STROKE_BOX}<span>Orders</span></a></nav>`),
    bad: doc('icon-mix bad', '.item{display:flex;align-items:center;gap:12px;padding:8px 0;color:inherit;text-decoration:none}', `<nav class="card" aria-label="Main"><a class="item" href="#home">${STROKE_HOME}<span>Home</span></a><a class="item" href="#orders">${FILL_BOX}<span>Orders</span></a></nav>`),
  },
].map(pair => Object.freeze(pair)));
