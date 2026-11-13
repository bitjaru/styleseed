// Local fixture pages for the visible control box (the shared block in observe-design.mjs,
// observe-structure.mjs, and scripts/lib/consensus-probe.mjs). Each page isolates one markup pattern;
// `expect` is the control-height histogram the definition gives for it at 1440 and at 390 (the design
// probe's `controlHeights`). The copy is fictional fixture text; no probe may export it. Used by
// scripts/test-control-box-browser.mjs. A measurement regression fixture, not a design judgment.
const page = (css, body) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>control box fixture</title><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#ffffff;color:#1b1d1c;font:14px/20px system-ui,sans-serif}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}button{white-space:nowrap}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bare{border:0;outline:0;padding:0;background:transparent;font:inherit;min-width:0}
.btn{height:32px;padding:0 16px;border:0;border-radius:6px;background:#2f5d8a;color:#ffffff;font:inherit}
.out{height:32px;padding:0 16px;border:1px solid #b4bdbb;border-radius:6px;background:transparent;color:#1b1d1c;font:inherit}
${css}</style><body>${body}</body></html>`;
const icon = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12l-5 6v4l-2 1V9z" fill="#6b7270"/></svg>';

export const CONTROL_BOX_FIXTURES = Object.freeze({
  wrapped: { expect: { 32: 2 }, html: page(
    '.box{display:flex;align-items:center;width:240px;height:32px;padding:0 8px;border:1px solid #b4bdbb;border-radius:6px;background:#ffffff}.box input{height:22px;width:100%}',
    '<div class="row"><div class="box"><input class="bare" type="text" value="Harbour invoices" aria-label="Invoices"></div><button class="btn">Find invoices</button></div>') },
  'affix-on-grey': { expect: { 32: 1 }, html: page(
    '.panel{background:#f1f3f2;padding:24px;width:400px}.wrap{display:flex;width:280px;height:32px;border:1px solid #8a9391;border-radius:8px}.wrap input{border:0;outline:0;background:#ffffff;height:30px;width:100%;padding:0 8px;border-radius:7px;font:inherit}',
    '<div class="panel"><div class="wrap"><input type="text" value="Quay 4" aria-label="Berth"></div></div>') },
  'group-addons': { expect: { 36: 2 }, html: page(
    '.grp{display:flex;width:420px}.addon{display:flex;align-items:center;height:36px;padding:0 12px;border:1px solid #b4bdbb;border-right:0;border-radius:6px 0 0 6px;background:#f1f3f2}.grp input{height:36px;flex:1;border:1px solid #b4bdbb;padding:0 8px;font:inherit}.grp button{height:36px;padding:0 16px;border:1px solid #2f5d8a;border-radius:0 6px 6px 0;background:#2f5d8a;color:#fff;font:inherit}',
    '<div class="grp"><span class="addon">harbour.test/</span><input type="text" value="berths" aria-label="Path"><button>Open path</button></div>') },
  'inline-button': { expect: { 36: 1 }, html: page(
    '.ig{display:flex;align-items:center;width:360px;height:36px;border:1px solid #b4bdbb;border-radius:8px;padding:0 4px 0 12px}.ig input{flex:1;height:28px}.ghost{height:28px;padding:0 8px;border:0;background:transparent;font:inherit;color:#2f5d8a}',
    '<div class="ig"><input class="bare" type="search" placeholder="Search berths" aria-label="Search"><button class="ghost">Search</button></div>') },
  'date-range': { expect: { 32: 1 }, html: page(
    '.picker{display:inline-flex;align-items:center;width:288px;height:32px;padding:4px 11px;border:1px solid #b4bdbb;border-radius:6px}.pin{flex:1;display:inline-flex}.pin input{width:100%;height:22px}.sep{padding:0 8px;color:#6b7270}',
    `<div class="picker"><div class="pin"><input class="bare" value="2026-11-01" aria-label="Start date"></div><div class="sep">~</div><div class="pin"><input class="bare" value="2026-11-30" aria-label="End date"></div><span>${icon}</span></div>`) },
  'search-icon': { expect: { 36: 1 }, html: page(
    '.rel{position:relative;width:280px}.rel svg{position:absolute;left:10px;top:10px}.rel input{width:100%;height:36px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px 0 34px;font:inherit}',
    `<div class="rel">${icon}<input type="search" placeholder="Search vessels" aria-label="Search vessels"></div>`) },
  'label-box': { expect: { 48: 1 }, html: page(
    'label.inp{display:flex;align-items:center;gap:8px;width:320px;height:48px;padding:0 16px;border:1px solid #b4bdbb;border-radius:8px}label.inp input{flex:1;height:24px}',
    `<label class="inp">${icon}<input class="bare" type="text" placeholder="Vessel name"></label>`) },
  'floating-label': { expect: { 56: 1 }, html: page(
    '.fl{width:320px;padding:9px 12px 7px;border-radius:6px;outline:1px solid #b4bdbb;outline-offset:-1px}.fl label{display:block;font-size:12px;line-height:16px;color:#4d5150}.fl input{display:block;width:100%;height:24px;font:inherit}',
    '<div class="fl"><label for="fl1">Captain</label><input id="fl1" class="bare" type="text" value="First mate"></div>') },
  toggles: { expect: { 32: 2 }, html: page(
    '.check{width:16px;height:16px;padding:0;border:1px solid #6b7270;border-radius:4px;background:#ffffff}.sw{width:36px;height:20px;border:0;border-radius:999px;background:#2f5d8a;padding:0}.tabs{display:flex;gap:4px}.tab{height:36px;padding:0 12px;border:0;background:transparent;font:inherit}.tab[aria-selected=true]{background:#2f5d8a;color:#fff;border-radius:6px}.seg{height:32px;padding:0 12px;border:1px solid #b4bdbb;background:#fff;font:inherit}',
    `<div class="row"><button role="checkbox" aria-checked="false" class="check"><span class="sr">Only unpaid</span></button><span>Only unpaid</span><button role="switch" aria-checked="true" class="sw" aria-label="Alerts"></button><button role="radio" aria-checked="true" class="seg">Weekly</button></div>
<div class="tabs" role="tablist"><button role="tab" aria-selected="true" class="tab">Arrivals</button><button role="tab" aria-selected="false" class="tab">Departures</button></div>
<div class="row" style="margin-top:16px"><button class="seg" aria-pressed="true">Month view</button><button class="seg" aria-pressed="false">Year view</button></div>`) },
  'icon-only': { expect: {}, html: page(
    '.ib{width:32px;height:32px;padding:0;border:1px solid #b4bdbb;border-radius:6px;background:#fff}',
    `<div class="row"><button class="ib" aria-label="Filter">${icon}</button><button class="ib">${icon}<span class="sr">Open menu</span></button><button class="ib">×</button><button class="ib" style="border:0;background:transparent" aria-label="More">${icon}</button></div>`) },
  'select-native': { expect: { 36: 1, 40: 1 }, html: page(
    'select.own{height:36px;width:200px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit;background:#fff}.sw2{display:inline-flex;align-items:center;width:200px;height:40px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px}.sw2 select{appearance:none;border:0;outline:0;background:transparent;width:100%;height:24px;font:inherit}',
    '<div class="row"><select class="own" aria-label="Berth"><option>North quay</option><option>South quay</option></select><div class="sw2"><select aria-label="Tide"><option>High tide</option><option>Low tide</option></select></div></div>') },
  'select-custom': { expect: { 36: 2 }, html: page(
    '.trg{display:inline-flex;align-items:center;justify-content:space-between;width:200px;height:36px;border:1px solid #b4bdbb;border-radius:6px;padding:0 12px;background:#fff;font:inherit}',
    `<div class="row"><button role="combobox" aria-expanded="false" class="trg"><span>North quay</span>${icon}</button><button aria-haspopup="listbox" class="trg"><span>Low tide</span>${icon}</button></div>`) },
  textarea: { expect: { 36: 1 }, html: page(
    'textarea{width:320px;height:96px;border:1px solid #b4bdbb;border-radius:6px;padding:8px;font:inherit}input.f{height:36px;width:320px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit}',
    '<div><input class="f" type="text" value="Cargo manifest" aria-label="Title"></div><div style="margin-top:16px"><textarea aria-label="Notes">Loaded at dawn.</textarea></div>') },
  tiles: { expect: {}, html: page(
    '.add{width:320px;height:201px;border:1px dashed #b4bdbb;border-radius:8px;background:#fff;font:inherit}.rowbtn{display:block;width:320px;margin-top:16px;padding:12px;border:1px solid #b4bdbb;border-radius:8px;background:#fff;text-align:left;font:inherit}.rowbtn b,.rowbtn span{display:block}',
    '<button class="add">+ New berth</button><button class="rowbtn"><b>North quay</b><span>Four vessels docked</span></button>') },
  pills: { expect: { 24: 1 }, html: page(
    '.pill{height:20px;padding:0 7px;border:0;border-radius:999px;background:#dbe7f3;color:#1b3a57;font-size:12px;line-height:20px}.chip{height:24px;padding:0 8px;border:0;border-radius:999px;background:#dbe7f3;color:#1b3a57;font-size:12px}',
    '<div class="row"><button class="pill">Open</button><button class="pill">Urgent</button><button class="chip">Docked</button></div>') },
  ghost: { expect: { 36: 1 }, html: page(
    '.gh{height:36px;padding:0 16px;border:0;background:transparent;font:inherit}.lk{padding:0;border:0;background:transparent;color:#2f5d8a;font-size:12px;line-height:17px}.sv{height:36px;padding:0 16px;border:0;border-radius:6px;background:#2f5d8a;color:#fff;font:inherit}',
    '<div class="row"><button class="gh">Cancel</button><button class="sv">Save berth</button><button class="lk">Info</button></div>') },
  'bar-with-own-border': { expect: { 36: 2 }, html: page(
    '.bar{display:flex;gap:8px;align-items:center;width:440px;padding:8px;border:1px solid #d5dbd9;border-radius:8px}.bar input{height:36px;flex:1;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit}.bar button{height:36px}',
    '<div class="bar"><input type="text" value="Berth 12" aria-label="Berth"><button class="btn" style="height:36px">Assign berth</button></div>') },
  'header-bare-input': { expect: { 22: 1 }, html: page(
    'body{padding:0}.top{display:flex;align-items:center;height:56px;padding:0 24px;background:#f1f3f2;border-bottom:1px solid #d5dbd9}.top input{width:240px;height:22px}',
    '<div class="top"><input class="bare" type="search" placeholder="Search the harbour" aria-label="Search"></div>') },
  'sibling-outline': { expect: { 56: 1 }, html: page(
    '.mroot{position:relative;display:inline-flex;width:280px;border-radius:4px}.mroot input{box-sizing:content-box;height:23px;padding:16.5px 14px;width:100%;border:0;outline:0;background:none;font:inherit}.mroot fieldset{position:absolute;inset:-5px 0 0;margin:0;padding:0 8px;border:1px solid #8a9391;border-radius:inherit;pointer-events:none}.mroot legend{padding:0;height:11px;width:0}',
    '<div class="mroot"><input type="text" value="Pier seven" aria-label="Pier"><fieldset aria-hidden="true"><legend></legend></fieldset></div>') },
  'native-toggles': { expect: {}, html: page('',
    '<div class="row"><input type="checkbox" aria-label="Paid"><input type="radio" aria-label="Weekly"><input type="range" aria-label="Draft"><input type="file" aria-label="Manifest"><input type="color" aria-label="Flag"><input type="hidden" value="x"></div>') },
  'wrapped-label': { expect: {}, html: page(
    '.narrow{width:120px}.narrow button{white-space:normal;width:100%;min-height:36px;height:auto;padding:8px 16px;border:1px solid #b4bdbb;border-radius:999px;background:#fff;font:inherit}',
    '<div class="narrow"><button>Download the full manifest</button></div>') },
  'autosize-combobox': { expect: { 38: 1 }, html: page(
    '.ctl{display:flex;align-items:center;width:260px;height:38px;border:1px solid #b4bdbb;border-radius:4px;background:#fff}.vc{display:grid;flex:1;padding:2px 8px;align-items:center}.sv2{grid-area:1/1/2/3}.ic{grid-area:1/1/2/3;display:inline-grid;margin:2px;padding:1px 0}.ic input{width:2px;height:20px}',
    '<div class="ctl"><div class="vc"><div class="sv2">North quay</div><div class="ic"><input class="bare" role="combobox" aria-expanded="false" aria-label="Quay" value=""></div></div><div style="padding:8px">' + icon + '</div></div>') },
  'combobox-wrapper': { expect: { 36: 1 }, html: page(
    '.cb{display:flex;align-items:center;width:240px;height:36px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px}.cb input{flex:1;height:24px}',
    '<div class="cb" role="combobox" aria-expanded="false" aria-haspopup="listbox"><input class="bare" type="text" role="searchbox" value="Tug" aria-label="Vessel type"></div>') },
  'hidden-input': { expect: { 36: 1 }, html: page(
    '.vh{position:absolute;width:1px;height:1px;opacity:1;border:0;padding:0}input.f{height:36px;width:240px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit}',
    '<input class="vh" type="text" tabindex="-1" aria-hidden="true"><input class="f" type="text" value="Dock nine" aria-label="Dock">') },
  'cjk-one-char': { expect: { 36: 2 }, html: page(
    '.y{height:36px;padding:0 16px;border:1px solid #b4bdbb;border-radius:6px;background:#fff;font:inherit}',
    '<div class="row"><button class="y">예</button><button class="y">아니요</button><button class="y">+</button></div>') },
  'otp-cells': { expect: { 48: 4 }, html: page(
    '.otp{display:flex;gap:8px}.otp input{width:40px;height:48px;border:1px solid #b4bdbb;border-radius:6px;text-align:center;font:inherit}',
    '<div class="otp"><input inputmode="numeric" maxlength="1" value="4" aria-label="Digit 1"><input inputmode="numeric" maxlength="1" value="2" aria-label="Digit 2"><input inputmode="numeric" maxlength="1" value="7" aria-label="Digit 3"><input inputmode="numeric" maxlength="1" value="9" aria-label="Digit 4"></div>') },
  'card-bare-input': { expect: { 60: 1 }, html: page(
    '.card{width:320px;padding:12px;border:1px solid #d5dbd9;border-radius:8px}.card input{width:100%;height:34px}',
    '<div class="card"><input class="bare" type="text" placeholder="Name this route" aria-label="Route name"></div>') },
  'underline-only': { expect: { 32: 1 }, html: page(
    'input.u{width:240px;height:32px;border:0;border-bottom:1px solid #6b7270;outline:0;background:transparent;font:inherit;padding:0}',
    '<input class="u" type="text" value="Lighthouse" aria-label="Landmark">') },
  'table-cell-bare': { expect: { 24: 2 }, html: page(
    'table{border-collapse:collapse}td{border:1px solid #d5dbd9;padding:8px;height:40px}td input{width:160px;height:24px}',
    '<table><tbody><tr><td><input class="bare" type="text" value="Crane A" aria-label="Crane"></td><td><input class="bare" type="text" value="12 tonnes" aria-label="Load"></td></tr></tbody></table>') },
  'form-as-box': { expect: { 36: 1, 44: 1 }, html: page(
    'form.nl{display:flex;align-items:center;width:380px;height:44px;padding:4px 4px 4px 16px;border:1px solid #b4bdbb;border-radius:999px}form.nl input{flex:1;height:28px}form.nl button{height:36px;padding:0 16px;border:0;border-radius:999px;background:#2f5d8a;color:#fff;font:inherit}',
    '<form class="nl" onsubmit="return false"><input class="bare" type="email" placeholder="you@example.test" aria-label="Email"><button>Subscribe</button></form>') },
  'pseudo-outline': { expect: { 37: 1 }, html: page(
    '.pf{position:relative;display:flex;width:280px}.pf::before{content:"";position:absolute;inset:0;border:1px solid #8a9391;border-radius:6px;pointer-events:none}.pf input{width:100%;height:37px;padding:0 12px;border:0;outline:0;background:transparent;font:inherit}',
    '<span class="pf"><input type="text" value="Anchor point" aria-label="Anchor"></span>') },
  'anchor-button': { expect: { 36: 1 }, html: page(
    'a.btn-link{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:6px;background:#2f5d8a;color:#fff;text-decoration:none}a.plain{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:6px;background:#2f5d8a;color:#fff;text-decoration:none}',
    '<div class="row"><a class="btn-link" href="#a">Book a berth</a><a class="plain" href="#b">Read the guide</a></div>') },
  'disabled': { expect: { 36: 2 }, html: page(
    'input.f{height:36px;width:200px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit}',
    '<div class="row"><input class="f" type="text" value="Locked berth" aria-label="Berth" disabled><button class="btn" style="height:36px" disabled>Release berth</button></div>') },
  'card-fields': { expect: { 44: 1 }, html: page(
    '.cc{display:flex;align-items:center;gap:8px;width:340px;height:44px;padding:0 12px;border:1px solid #b4bdbb;border-radius:8px}.cc input{height:24px}',
    '<div class="cc"><input class="bare" style="flex:1" inputmode="numeric" value="0000 0000 0000 0000" aria-label="Card number"><input class="bare" style="width:56px" value="12 / 30" aria-label="Expiry"><input class="bare" style="width:44px" value="123" aria-label="Security code"></div>') },
  'chips-input': { expect: { 40: 1 }, html: page(
    '.ti{display:flex;flex-wrap:wrap;align-items:center;gap:4px;width:480px;min-height:40px;padding:4px 8px;border:1px solid #b4bdbb;border-radius:6px}.tag{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:4px;background:#e8eceb}.ti input{width:60px;height:24px}',
    '<div class="ti"><span class="tag">Tug</span><span class="tag">Ferry</span><span class="tag">Barge</span><input class="bare" role="combobox" aria-expanded="false" aria-label="Vessel types"></div>') },
  'row-bare-input': { expect: { 56: 1 }, html: page(
    '.line{display:flex;align-items:center;gap:12px;width:300px;height:56px;padding:0 12px;border:1px solid #d5dbd9;border-radius:8px}.line input{width:60px;height:24px;text-align:right}',
    '<div class="line"><span style="flex:1">Mooring rope</span><input class="bare" inputmode="numeric" value="3" aria-label="Quantity"></div>') },
  'many-fields': { expect: { 36: 3 }, html: page(
    'label{display:block;margin:12px 0 4px}input.f,select.f{display:block;height:36px;width:320px;border:1px solid #b4bdbb;border-radius:6px;padding:0 8px;font:inherit;background:#fff}',
    '<label for="m1">Vessel</label><input id="m1" class="f" type="text" value="Aurora"><label for="m2">Flag</label><select id="m2" class="f"><option>Flag A</option></select><label for="m3">Call sign</label><input id="m3" class="f" type="text" value="TEST1">') },
  'inner-box-button': { expect: { 36: 1 }, html: page(
    '.hit{height:44px;padding:4px 0;border:0;background:transparent;font:inherit}.hit span.in{display:flex;align-items:center;height:36px;padding:0 12px;border:1px solid #8a9391;border-radius:6px;background:#ffffff}.gh2{height:36px;padding:0 12px;border:0;background:transparent;font:inherit}.badge{display:inline-block;padding:0 6px;border-radius:999px;background:#dbe7f3;font-size:12px;line-height:20px}',
    '<div class="row"><button class="hit"><span class="in">Save draft</span></button><button class="gh2">Inbox <span class="badge">12</span></button></div>') },
});
