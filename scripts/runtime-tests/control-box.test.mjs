// The visible-control-box block (WO-10): one definition of the box a person sees as one control,
// pasted unchanged into observe-design.mjs, observe-structure.mjs, and scripts/lib/consensus-probe.mjs.
// This test cuts the block out of the three files as shipped, checks that the copies are equal and
// that observe-design.mjs carries the block's version, and runs the block against a hand-made DOM:
// it is given `norm`, `transparent`, `document`, `getComputedStyle`, and `NodeFilter` and nothing else,
// so a use of any other outside name fails here. scripts/test-control-box-browser.mjs runs the same
// copies in a browser on the fixture pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const COPIES = [
  "engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-design.mjs",
  "engine/.claude/skills/styleseed/workflows/ss-reference/scripts/observe-structure.mjs",
  "scripts/lib/consensus-probe.mjs",
];
const START = "// --- visible control box: shared block, version ";
const END = "// --- end visible control box";
const read = (file) => readFileSync(resolve(repoRoot, file), "utf8");
// From the start of the first marker line to the end of the last one, both included.
function cut(text, file) {
  const a = text.indexOf(START), b = text.indexOf(END);
  assert.ok(a >= 0 && b > a, `${file}: the block's marker lines are missing; paste the visible-control-box block (WO-10 appendix A) after \`const transparent = …\``);
  assert.equal(text.indexOf(START, a + 1), -1, `${file}: the block appears twice`);
  const from = text.lastIndexOf("\n", a) + 1, eol = text.indexOf("\n", b);
  return { from, block: text.slice(from, eol < 0 ? text.length : eol + 1) };
}
const BLOCK = cut(read(COPIES[0]), COPIES[0]).block;

test("the three copies of the block are the same text, after norm and transparent", () => {
  for (const file of COPIES) {
    const text = read(file);
    const { from, block } = cut(text, file);
    assert.equal(block, BLOCK, `${file}: the block differs from the copy in ${COPIES[0]}. Change all three copies in one commit and raise the version.`);
    const head = text.slice(0, from);
    assert.ok(head.includes("const norm ="), `${file}: \`const norm =\` must be declared before the block`);
    assert.ok(head.includes("const transparent ="), `${file}: \`const transparent =\` must be declared before the block`);
  }
});

test("observe-design.mjs carries the block's version and no longer tallies element heights", () => {
  const design = read(COPIES[0]);
  const version = Number(/version (\d+)/u.exec(BLOCK.split("\n")[0])?.[1]);
  const literal = Number(/controlBoxVersion: (\d+)/u.exec(design)?.[1]);
  assert.ok(Number.isInteger(version) && version >= 1, `the first marker line names no version: ${BLOCK.split("\n")[0]}`);
  assert.equal(literal, version, `${COPIES[0]}: controlBoxVersion must equal the block's version (${version})`);
  assert.equal(design.includes("tally(out.controlHeights, Math.round(rect.height))"), false, `${COPIES[0]}: control heights come from controlBox.read, not from the element's rectangle`);
});

// A hand-made DOM: plain objects with what the block reads. node(tag, { attrs, style, rect: [left,
// top, width, height], pseudo: { "::before": style }, lines: [[left, top, width, height], …], type,
// value }, ...children); a string child is a text node, on one line unless `lines` says otherwise.
const STYLE = {
  display: "block", visibility: "visible", opacity: "1", position: "static", backgroundColor: "rgba(0, 0, 0, 0)", backgroundImage: "none",
  boxShadow: "none", outlineWidth: "0px", outlineStyle: "none", outlineColor: "rgb(0, 0, 0)", borderTopLeftRadius: "0px", fontSize: "14px",
  content: "none", top: "auto", right: "auto", bottom: "auto", left: "auto",
  ...Object.fromEntries(["Top", "Right", "Bottom", "Left"].flatMap((s) => [[`border${s}Width`, "0px"], [`border${s}Style`, "none"], [`border${s}Color`, "rgb(0, 0, 0)"]])),
};
const sides = (list, colour = "rgb(180, 189, 187)") => Object.fromEntries(list.flatMap((s) => [[`border${s}Width`, "1px"], [`border${s}Style`, "solid"], [`border${s}Color`, colour]]));
const border = (colour) => sides(["Top", "Right", "Bottom", "Left"], colour);
const FILL = { backgroundColor: "rgb(47, 93, 138)" };
const matchOne = (el, sel) => {
  const m = /^([a-z0-9]+)?(?:\[([a-z-]+)=([a-z]+)\])?$/u.exec(sel.trim());
  return Boolean(m) && (!m[1] || el.tagName === m[1].toUpperCase()) && (!m[2] || el.getAttribute(m[2]) === m[3]);
};
function node(tag, options = {}, ...children) {
  const { attrs = {}, style = {}, rect = [0, 0, 0, 0], pseudo = {}, lines = null, ...props } = options;
  const [left, top, width, height] = rect;
  const el = {
    tagName: tag.toUpperCase(), parentElement: null, children: [], childNodes: [], className: attrs.class || "",
    type: props.type ?? (tag === "input" ? "text" : tag === "button" ? "submit" : undefined), value: props.value ?? "", multiple: false, size: 0,
    style: { ...STYLE, ...style }, pseudo,
    getAttribute: (name) => (name in attrs ? String(attrs[name]) : null),
    hasAttribute: (name) => name in attrs,
    getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
    matches(sel) { return sel.split(",").some((s) => matchOne(el, s)); },
    closest(sel) { for (let p = el; p; p = p.parentElement) if (p.matches(sel)) return p; return null; },
    contains(other) { for (let p = other; p; p = p.parentElement) if (p === el) return true; return false; },
  };
  for (const child of children) {
    if (typeof child === "string") {
      const rects = (lines || [[left + 8, top + 8, Math.max(2, width - 16), 17]]).map(([l, t, w, h]) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h }));
      el.childNodes.push({ nodeType: 3, textContent: child, parentElement: el, rects });
    } else {
      child.parentElement = el;
      el.children.push(child);
      el.childNodes.push(child);
    }
  }
  return el;
}
// The block as shipped, on a page whose body holds `content`; returns controlBox.
function load(...content) {
  const body = node("body", { rect: [0, 0, 1440, 900], style: { backgroundColor: "rgb(255, 255, 255)" } }, ...content);
  const textNodes = (root) => root.childNodes.flatMap((n) => (n.nodeType === 3 ? [n] : textNodes(n)));
  const document = {
    body, documentElement: { clientWidth: 1440 },
    createTreeWalker: (root) => { const list = textNodes(root); let i = 0; return { nextNode: () => list[i++] || null }; },
    createRange: () => { let picked = null; return { selectNodeContents(n) { picked = n; }, getClientRects: () => picked.rects }; },
  };
  const getComputedStyle = (el, pseudo) => (pseudo ? { ...STYLE, ...(el.pseudo[pseudo] || {}) } : el.style);
  // The probes' own `transparent`, with an identity `norm` (the synthetic styles are already rgb()).
  const transparent = (value) => !value || value === "transparent" || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/u.test(value) || /\/\s*0\)$/u.test(value);
  return new Function("norm", "transparent", "document", "getComputedStyle", "NodeFilter", `${BLOCK}\nreturn controlBox;`)((v) => v, transparent, document, getComputedStyle, { SHOW_TEXT: 4 });
}
// The box of the field `input` once `wrap(input)` is on the page.
const boxOf = (input, wrap) => { const outer = wrap(input); return { outer, read: load(outer).read(input) }; };
const bare = (rect = [40, 40, 200, 24]) => node("input", { rect });

test("a borderless input in a bordered box reads at the box", () => {
  const input = node("input", { rect: [41, 37, 222, 22] });
  const box = node("div", { rect: [32, 32, 240, 32], style: { ...border(), backgroundColor: "rgb(255, 255, 255)", borderTopLeftRadius: "6px" } }, input);
  const r = load(box).read(input);
  assert.deepEqual([r.control, r.kind, r.box === box, r.height, r.radius, r.counts], ["field", "text", true, 32, 6, true]);
});

test("a bordered input inside a bordered bar is its own box", () => {
  const own = node("input", { rect: [41, 41, 300, 36], style: border() });
  const bar = node("div", { rect: [32, 32, 440, 54], style: border() }, own);
  assert.equal(load(bar).read(own).box, own);
});

test("an input with its own background gives way to a bordered wrapper at most 6px taller", () => {
  const panel = (input, height) => node("div", { rect: [0, 0, 400, 100], style: { backgroundColor: "rgb(241, 243, 242)" } },
    node("div", { rect: [24, 24, 280, height], style: border("rgb(138, 147, 145)") }, input));
  const near = node("input", { rect: [25, 25, 278, 30], style: { backgroundColor: "rgb(255, 255, 255)" } });
  assert.equal(load(panel(near, 32)).read(near).box, near.parentElement, "2px taller: the wrapper");
  const far = node("input", { rect: [25, 25, 278, 30], style: { backgroundColor: "rgb(255, 255, 255)" } });
  assert.equal(load(panel(far, 38)).read(far).box, far, "8px taller: the input");
});

test("two inputs in one bordered box are one control", () => {
  const a = node("input", { rect: [44, 37, 110, 22] }), b = node("input", { rect: [180, 37, 110, 22] });
  const picker = node("div", { rect: [32, 32, 288, 32], style: border() }, node("div", { rect: [44, 37, 110, 22] }, a), node("div", { rect: [180, 37, 110, 22] }, b));
  const cb = load(picker);
  assert.deepEqual([cb.read(a).box, cb.read(b).box], [picker, picker]);
});

test("the walk stops at table parts, list items, much taller, taller than a control, much wider, a band, and after four ancestors", () => {
  const inputSelf = (input, wrap, what) => assert.equal(boxOf(input, wrap).read.box, input, what);
  inputSelf(bare(), (i) => node("table", { rect: [32, 32, 400, 60] }, node("tr", { rect: [32, 32, 400, 40] }, node("td", { rect: [32, 32, 216, 40], style: border() }, i))), "a bordered td");
  inputSelf(bare(), (i) => node("ul", { rect: [32, 32, 400, 60] }, node("li", { rect: [32, 32, 216, 40], style: border() }, i)), "a bordered li");
  inputSelf(bare(), (i) => node("div", { rect: [32, 32, 216, 65], style: border() }, i), "a wrapper 41px taller");
  inputSelf(bare([40, 40, 200, 60]), (i) => node("div", { rect: [32, 32, 216, 96], style: border() }, i), "a 96px wrapper");
  inputSelf(bare(), (i) => node("div", { rect: [32, 32, 721, 32], style: border() }, i), "a wrapper of 721px around a 200px input");
  inputSelf(bare([40, 40, 500, 24]), (i) => node("div", { rect: [0, 32, 1440, 40], style: border() }, i), "a full-width band");
  inputSelf(bare(), (i) => node("div", { rect: [32, 32, 216, 32], style: border() }, ["a", "b", "c", "d"].reduce((inner) => node("div", { rect: [40, 40, 200, 24] }, inner), i)), "a fifth ancestor");
  const label = boxOf(bare(), (i) => node("label", { rect: [32, 32, 216, 32], style: border() }, i));
  assert.equal(label.read.box, label.outer, "a bordered label is the box");
  const form = boxOf(bare(), (i) => node("form", { rect: [32, 32, 216, 32], style: border() }, i));
  assert.equal(form.read.box, form.outer, "a bordered form is the box");
});

test("an outline drawn by ::before or by a positioned child that covers the wrapper: the wrapper, with the cover's radius", () => {
  const input = node("input", { rect: [32, 32, 280, 37] });
  const wrap = node("span", { rect: [32, 32, 280, 37], pseudo: { "::before": { content: '""', position: "absolute", top: "0px", right: "0px", bottom: "0px", left: "0px", ...border(), borderTopLeftRadius: "6px" } } }, input);
  const before = load(wrap).read(input);
  assert.deepEqual([before.box === wrap, before.height, before.radius], [true, 37, 6]);
  const field = node("input", { rect: [32, 32, 280, 56] });
  const cover = node("fieldset", { rect: [32, 27, 280, 61], style: { position: "absolute", ...border(), borderTopLeftRadius: "4px" } });
  const root = node("div", { rect: [32, 32, 280, 56] }, field, cover);
  const sibling = load(root).read(field);
  assert.deepEqual([sibling.box === root, sibling.height, sibling.radius], [true, 56, 4]);
});

test("what is not a single-line control: an underline, a narrow box, a text area, a checkbox, an input inside a combobox", () => {
  const underline = node("input", { rect: [32, 32, 240, 32], style: sides(["Bottom"]) });
  assert.equal(load(underline).read(underline).box, underline, "a bottom border only: the field itself");
  const narrow = node("input", { rect: [32, 32, 39, 32], style: border() });
  assert.equal(load(narrow).read(narrow), null, "a box of 39px width is not a control");
  const area = node("textarea", { rect: [32, 32, 320, 96], style: border() });
  const a = load(area).read(area);
  assert.deepEqual([a.kind, a.counts], ["multiline", false], "a text area has a box and is not a control height");
  const check = node("input", { rect: [32, 32, 16, 16], type: "checkbox" });
  assert.equal(load(check).read(check), null);
  const inner = node("input", { rect: [41, 38, 200, 24] });
  const combo = node("div", { rect: [32, 32, 240, 36], attrs: { role: "combobox" }, style: border() }, inner);
  const cb = load(combo);
  assert.equal(cb.read(inner), null, "an input inside role=combobox is not read");
  assert.deepEqual([cb.read(combo).control, cb.read(combo).kind, cb.read(combo).box === combo], ["field", "select", true], "the wrapper is the select field");
});

test("buttons: widget roles, aria-checked, aria-selected, and tab lists are not action buttons; aria-pressed is", () => {
  const save = node("button", { rect: [0, 0, 96, 36], style: FILL }, "Save berth");
  const check = node("button", { rect: [0, 0, 16, 16], style: border(), attrs: { role: "checkbox" } }, "On");
  const checked = node("button", { rect: [0, 0, 80, 32], style: border(), attrs: { "aria-checked": "false" } }, "Unpaid");
  const selected = node("button", { rect: [0, 0, 80, 32], style: FILL, attrs: { "aria-selected": "true" } }, "Weekly");
  const tab = node("button", { rect: [0, 0, 80, 36], style: FILL }, "Arrivals");
  const pressed = node("button", { rect: [0, 0, 96, 32], style: border(), attrs: { "aria-pressed": "true" } }, "Month view");
  const cb = load(save, check, checked, selected, node("div", { rect: [0, 0, 200, 36], attrs: { role: "tablist" } }, tab), pressed);
  assert.deepEqual([save, check, checked, selected, tab, pressed].map((x) => { const r = cb.read(x); return r && r.counts ? r.height : r; }), [36, null, null, null, null, 32]);
  const trigger = node("button", { rect: [0, 0, 200, 36], style: border(), attrs: { "aria-haspopup": "listbox" } }, "Low tide");
  const t = load(trigger).read(trigger);
  assert.deepEqual([t.control, t.kind, t.box === trigger, t.height], ["field", "select", true, 36], "a list-box trigger is a select field");
});

test("buttons: a visible label of two characters, or one Hangul, Han, or kana character", () => {
  const empty = node("button", { rect: [0, 0, 32, 32], style: border(), attrs: { "aria-label": "Filter" } });
  const hidden = node("button", { rect: [0, 0, 32, 32], style: border() }, node("span", { rect: [0, 0, 1, 1] }, "Open menu"));
  const glyph = node("button", { rect: [0, 0, 44, 36], style: border() }, "+");
  const hangul = node("button", { rect: [0, 0, 44, 36], style: border() }, "예");
  const cb = load(empty, hidden, glyph, hangul);
  assert.deepEqual([empty, hidden, glyph, hangul].map((x) => cb.read(x).labelled), [false, false, false, true]);
  assert.deepEqual([cb.read(glyph).counts, cb.read(hangul).counts], [false, true]);
});

test("buttons: emphasis, the 24-80px range, one line, and a pill radius", () => {
  const ghost = node("button", { rect: [0, 0, 80, 36] }, "Cancel");
  const g = load(ghost).read(ghost);
  assert.deepEqual([g.kind, g.regular, g.counts], ["text", true, false], "no fill and no outline: text emphasis, not a control height");
  const sized = [23, 24, 80, 81].map((h) => node("button", { rect: [0, 0, 96, h], style: FILL }, "Open"));
  const cb = load(...sized);
  assert.deepEqual(sized.map((x) => cb.read(x).regular), [false, true, true, false]);
  const two = node("button", { rect: [0, 0, 120, 56], style: border(), lines: [[8, 8, 100, 17], [8, 28, 60, 17]] }, "Download the full manifest");
  const w = load(two).read(two);
  assert.deepEqual([w.lines, w.regular, w.counts], [2, false, false], "a label on two lines");
  const pill = node("button", { rect: [0, 0, 96, 32], style: { ...FILL, borderTopLeftRadius: "999px" } }, "Docked");
  assert.equal(load(pill).read(pill).radius, 999);
});

test("a button that paints nothing reads at an inner element that paints a box and holds the label; a badge does not", () => {
  const inner = node("span", { rect: [0, 4, 96, 36], style: { ...border(), backgroundColor: "rgb(250, 250, 250)", borderTopLeftRadius: "6px" } }, "Save draft");
  const hit = node("button", { rect: [0, 0, 96, 44] }, inner);
  const badge = node("span", { rect: [60, 8, 24, 20], style: { backgroundColor: "rgb(219, 231, 243)" } }, "12");
  const ghost = node("button", { rect: [0, 0, 96, 36] }, "Inbox", badge);
  const cb = load(node("div", { rect: [0, 0, 400, 44], style: { backgroundColor: "rgb(255, 255, 255)" } }, hit, ghost));
  const a = cb.read(hit), b = cb.read(ghost);
  assert.deepEqual([a.box === inner, a.kind, a.height, a.radius, a.counts], [true, "filled", 36, 6, true]);
  assert.deepEqual([b.box === ghost, b.kind, b.counts], [true, "text", false]);
});
