import test from "node:test";
import assert from "node:assert/strict";
import { SKIPPED, THRESHOLDS, analyzeFrames, caseProblems, caseRuns, compareWithAll, parseArgs, renderTransitionsMarkdown, sampleCase, transitionsTotals, transitionsVerdict } from "../../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/transition-jumps.mjs";

// Synthetic samples in the shape sampleTransition returns. Boxes are [x, y, w, h]; null = not shown.
const STEP = 1000 / 60;
const sample = ({ rest, frames, settled = frames.at(-1), parents = rest.map((_, i) => (i === 0 ? -1 : 0)), textChanged = [], status = "sampled", reason } = {}) => ({
  status, ...(reason ? { reason } : {}), clicked: true, transitions: 1, animations: 0, duration: Math.round((frames.length - 1) * STEP * 10) / 10,
  times: frames.map((_, k) => Math.round(k * STEP * 10) / 10), rest, frames, settled, parents, textChanged,
});
// One element whose x follows `xs` (rest is xs[0] unless given).
const alongX = (xs, { rest = xs[0], settled = xs.at(-1) } = {}) => sample({ rest: [[rest, 0, 40, 20]], frames: xs.map((x) => [[x, 0, 40, 20]]), settled: [[settled, 0, 40, 20]] });
const brief = (findings) => findings.map((f) => [f.phase, f.axis, f.delta, f.size]);

test("a glide has no finding, even with a first step of 12px followed by 9px", () => {
  assert.deepEqual(analyzeFrames(alongX([0, 12, 21, 28, 33, 36, 38, 39, 40])), []);
  assert.deepEqual(analyzeFrames(alongX([0, 1, 3, 6, 10, 15, 20, 25, 30, 34, 37, 39, 40])), [], "an ease-in-out glide");
});

test("start: 14px is a jump, 2.0px a shift (not a jump), 0.4px nothing", () => {
  assert.deepEqual(brief(analyzeFrames(alongX([14, 14, 14], { rest: 0 }))), [["start", "x", 14, "jump"]]);
  assert.deepEqual(brief(analyzeFrames(alongX([2, 2, 2], { rest: 0 }))), [["start", "x", 2, "shift"]]);
  assert.deepEqual(analyzeFrames(alongX([0.4, 0.4, 0.4], { rest: 0 })), []);
  assert.deepEqual(analyzeFrames(alongX([0.5, 0.5, 0.5], { rest: 0 })), [], "0.5px is not over shiftPx");
  assert.deepEqual(brief(analyzeFrames(alongX([20, 30, 40], { rest: 40 }))), [["start", "x", -20, "jump"]], "the delta keeps its sign");
  const [f] = analyzeFrames(alongX([14, 14, 14], { rest: 0 }));
  assert.deepEqual([f.at, f.box, f.element], [0, [0, 0, 40, 20], 0], "a start finding is at time 0 and carries the rest box");
});

test("mid: a 10px step between steps of 1px is a jump; steps of 2px are not; a step beside a fast neighbour is not", () => {
  const found = analyzeFrames(alongX([0, 1, 2, 12, 13, 14]));
  assert.deepEqual(brief(found), [["mid", "x", 10, "jump"]]);
  assert.equal(found[0].at, Math.round(3 * STEP * 10) / 10, "at is the time of the later frame");
  assert.deepEqual(found[0].box, [2, 0, 40, 20], "box is where the element was before the step");
  assert.deepEqual(analyzeFrames(alongX([0, 2, 4, 6, 8])), [], "2px steps are not over jumpPx");
  assert.deepEqual(analyzeFrames(alongX([0, 0, 2, 4, 4])), [], "a 2.0px step from rest is not over jumpPx");
  assert.deepEqual(analyzeFrames(alongX([0, 4, 14, 18])), [], "10px beside 4px is not three times its neighbours");
  assert.deepEqual(brief(analyzeFrames(alongX([0, 0, 0, 0, 20, 20, 20, 40]))), [["mid", "x", 20, "jump"], ["mid", "x", 20, "jump"]], "steps(2): a jump at each step");
  assert.deepEqual(brief(analyzeFrames(alongX([0, 1.2, 2.4, 3.6, 4.8]))), [], "steps under the calm floor");
  assert.deepEqual(brief(analyzeFrames(alongX([0, 0, 1.3, 1.3]))), [], "1.3px over neighbours of 0 is under jumpPx");
});

test("end: a 3px displacement after the last frame is a jump; 1px a shift", () => {
  assert.deepEqual(brief(analyzeFrames(alongX([0, 10, 20, 27], { settled: 30 }))), [["end", "x", 3, "jump"]]);
  const [shift] = analyzeFrames(alongX([0, 10, 20, 29], { settled: 30 }));
  assert.deepEqual([shift.phase, shift.size, shift.delta, shift.box], ["end", "shift", 1, [29, 0, 40, 20]]);
});

test("a child moving with its parent gives one finding, the parent's; w and h are not folded", () => {
  const parent = (y, h) => [0, y, 100, h], child = (y) => [10, y, 40, 20];
  const moved = sample({ rest: [parent(0, 60), child(10)], frames: [[parent(14, 60), child(24.4)], [parent(14, 60), child(24.4)]] });
  assert.deepEqual(analyzeFrames(moved).map((f) => [f.element, f.phase, f.axis, f.delta]), [[0, "start", "y", 14]]);
  const apart = sample({ rest: [parent(0, 60), child(10)], frames: [[parent(14, 60), child(24.7)], [parent(14, 60), child(24.7)]] });
  assert.deepEqual(analyzeFrames(apart).map((f) => [f.element, f.axis, f.delta]), [[0, "y", 14], [1, "y", 14.7]], "a delta 0.7px away from the parent's is its own finding");
  const grown = sample({ rest: [parent(0, 60), [0, 0, 100, 60]], frames: [[parent(0, 96), [0, 0, 100, 96]], [parent(0, 96), [0, 0, 100, 96]]] });
  assert.deepEqual(analyzeFrames(grown).map((f) => [f.element, f.axis, f.delta]), [[0, "h", 36], [1, "h", 36]], "h findings are not folded into the ancestor's");
  const grandchild = sample({ rest: [parent(0, 60), child(10), child(10)], parents: [-1, 0, 1], frames: [[parent(14, 60), child(24), child(24.5)], [parent(14, 60), child(24), child(24.5)]] });
  assert.deepEqual(analyzeFrames(grandchild).map((f) => f.element), [0], "the outermost is reported");
});

test("an element whose text changed is skipped; the sibling it pushes is reported", () => {
  const label = (w) => [0, 0, w, 20], pushed = (x) => [x, 0, 40, 20];
  const changed = sample({
    rest: [[0, 0, 200, 20], label(60), pushed(68)], parents: [-1, 0, 0], textChanged: [1],
    frames: [[[0, 0, 200, 20], label(84), pushed(92)], [[0, 0, 200, 20], label(84), pushed(92)]],
  });
  assert.deepEqual(analyzeFrames(changed).map((f) => [f.element, f.phase, f.axis, f.delta]), [[2, "start", "x", 24]]);
});

test("an element missing from one frame is skipped for that comparison; appearing is not a jump", () => {
  assert.deepEqual(analyzeFrames(sample({ rest: [[0, 0, 40, 20]], frames: [[[0, 0, 40, 20]], [[1, 0, 40, 20]], [null], [[30, 0, 40, 20]], [[31, 0, 40, 20]]] })), [], "1 → 30 across a frame where it is not shown is never compared");
  assert.deepEqual(analyzeFrames(sample({ rest: [null], frames: [[[50, 0, 40, 20]], [[50, 0, 40, 20]]] })), [], "not shown at rest: no start comparison");
  assert.deepEqual(analyzeFrames(sample({ rest: [[0, 0, 40, 20]], frames: [[null], [null]], settled: [null] })), [], "gone after the change: no comparison");
  const besideHole = sample({ rest: [[0, 0, 40, 20]], frames: [[[0, 0, 40, 20]], [[0, 0, 40, 20]], [[20, 0, 40, 20]], [null], [[21, 0, 40, 20]]] });
  assert.deepEqual(analyzeFrames(besideHole), [], "calm cannot be judged beside a frame where the element is not shown");
});

test("instant and every inconclusive status carry no findings", () => {
  const jumpy = alongX([14, 14, 30], { rest: 0, settled: 40 });
  assert.ok(analyzeFrames(jumpy).length >= 3);
  for (const [status, reason] of [["instant"], ["inconclusive", "not-at-rest"], ["inconclusive", "capped"], ["inconclusive", "chained"], ["inconclusive", "script-driven"]]) {
    assert.deepEqual(analyzeFrames({ ...jumpy, status, ...(reason ? { reason } : {}) }), [], `${status} ${reason ?? ""}`);
  }
  assert.deepEqual(analyzeFrames(null), []);
});

test("a custom thresholds argument moves the result", () => {
  const two = alongX([2, 2, 2], { rest: 0 });
  assert.deepEqual(brief(analyzeFrames(two, { jumpPx: 1.5 })), [["start", "x", 2, "jump"]]);
  assert.deepEqual(analyzeFrames(two, { shiftPx: 2 }), []);
  assert.deepEqual(analyzeFrames(alongX([0, 1, 2, 12, 13, 14]), { calmFactor: 12 }), []);
  assert.deepEqual(THRESHOLDS, { jumpPx: 2, calmFactor: 3, calmFloor: 0.4, shiftPx: 0.5 });
  assert.ok(Object.isFrozen(THRESHOLDS));
});

test("compareWithAll: withAll is true when the same element, phase, and axis also jumps with every property transitioned", () => {
  const built = { ...alongX([14, 14, 14], { rest: 0 }) };
  built.findings = analyzeFrames(built);
  const forcedSame = { ...built, findings: analyzeFrames(built) };
  const forcedGlide = { ...alongX([0, 7, 14]), findings: [] };
  assert.deepEqual(compareWithAll(built, forcedSame).map((f) => f.withAll), [true]);
  assert.deepEqual(compareWithAll(built, forcedGlide).map((f) => f.withAll), [false], "the named list caused it");
  assert.deepEqual(compareWithAll(built, { ...forcedGlide, status: "inconclusive", reason: "chained" }).map((f) => f.withAll), [null], "an inconclusive second run cannot decide");
  assert.deepEqual(compareWithAll(built, { ...forcedGlide, parents: [-1, 0] }).map((f) => f.withAll), [null], "different elements cannot be matched");
  const otherAxis = { ...forcedGlide, findings: [{ ...built.findings[0], axis: "y" }] };
  assert.deepEqual(compareWithAll(built, otherAxis).map((f) => f.withAll), [false], "the axis must match");
  const otherPhase = { ...forcedGlide, findings: [{ ...built.findings[0], phase: "mid", at: 16.7 }] };
  assert.deepEqual(compareWithAll(built, otherPhase).map((f) => f.withAll), [false], "the phase must match");
});

test("caseRuns, totals, and verdict: runs as built and with every property; the frames are not written", () => {
  const jump = alongX([20, 20, 20], { rest: 0 }), glide = alongX([0, 10, 20]), back = alongX([0, 0, 0], { rest: 20 });
  const runs = caseRuns({ "built:forward": jump, "built:back": back, "all:forward": glide, "all:back": back }, { compareAll: true });
  assert.deepEqual(runs.map((r) => [r.direction, r.mode, r.status, r.findings.length]), [["forward", "built", "sampled", 1], ["back", "built", "sampled", 1], ["forward", "all", "sampled", 0], ["back", "all", "sampled", 1]]);
  assert.deepEqual(runs[0].findings[0], { phase: "start", axis: "x", delta: 20, at: 0, size: "jump", box: [0, 0, 40, 20], withAll: false });
  assert.equal(runs[1].findings[0].withAll, true);
  assert.equal("withAll" in runs[2].findings.concat(runs[3].findings)[0], false, "runs with every property carry no withAll");
  assert.deepEqual(Object.keys(runs[0]), ["direction", "mode", "status", "transitions", "animations", "duration", "frames", "elements", "findings"]);
  assert.deepEqual([runs[0].frames, runs[0].elements], [3, 1]);
  const pages = [{ url: "file:///a.html", label: "a", cases: [{ id: "toggle", runs }] }];
  const totals = transitionsTotals(pages, { compareAll: true });
  assert.deepEqual(totals, { cases: 1, sampled: 4, instant: 0, inconclusive: 0, jumps: 2, shifts: 0, namedList: 1, notCompared: 0 });
  assert.match(transitionsVerdict(pages, totals), /^2 findings in 1 case on 1 page as built \(2 jumps, 0 shifts\), 1 caused by the named property list; 4 of 4 runs sampled/u);
  const plain = caseRuns({ "built:forward": jump, "built:back": { status: "inconclusive", reason: "not-at-rest", clicked: false } });
  assert.deepEqual(plain.map((r) => [r.mode, r.status, r.reason, "withAll" in (r.findings[0] ?? {})]), [["built", "sampled", undefined, false], ["built", "inconclusive", "not-at-rest", false]]);
  const plainPages = [{ url: "file:///b.html", label: "b", cases: [{ id: "toggle", runs: plain }] }];
  const plainTotals = transitionsTotals(plainPages);
  assert.deepEqual([plainTotals.namedList, plainTotals.notCompared], [null, null], "without --compare-all nothing is attributed to the named list");
  assert.match(transitionsVerdict(plainPages, plainTotals), /not compared with every property transitioned \(--compare-all\); 1 of 2 runs sampled, 0 instant, 1 inconclusive\. Inconclusive: toggle back: not-at-rest\.$/u);
  const none = [{ url: "file:///c.html", label: "c", cases: [{ id: "toggle", runs: caseRuns({ "built:forward": glide, "built:back": glide }) }] }];
  assert.equal(transitionsVerdict(none, transitionsTotals(none)), "No frame jump in 1 case on 1 page: 2 of 2 runs sampled, 0 instant, 0 inconclusive.");
});

test("renderTransitionsMarkdown: one row per case and direction, then the findings; no score; equal bytes for equal input", () => {
  const build = () => {
    const runs = caseRuns({ "built:forward": alongX([20, 20, 20], { rest: 0 }), "built:back": alongX([0, 0, 0], { rest: 20 }), "all:forward": alongX([0, 10, 20]), "all:back": { status: "inconclusive", reason: "chained", clicked: true } }, { compareAll: true });
    const pages = [{ url: "file:///a.html", label: "a", cases: [{ id: "toggle", runs }] }];
    const totals = transitionsTotals(pages, { compareAll: true });
    return { pages, totals, verdict: transitionsVerdict(pages, totals) };
  };
  const meta = { observedAt: "2026-11-12", browser: "playwright/index.mjs", viewport: { width: 1440, height: 900 } };
  const md = renderTransitionsMarkdown(build(), meta);
  assert.equal(md, renderTransitionsMarkdown(build(), meta));
  assert.equal(JSON.stringify(build()), JSON.stringify(build()));
  assert.doesNotMatch(md, /score|%/iu);
  assert.match(md, /\| a \| toggle \| forward \| sampled \| 1 \| 0 \| 33\.3 \| 3 \| 1 \| 1 jump \| 1 \|/u);
  assert.match(md, /\| a \| toggle \| back \| sampled \| 1 \| 0 \| 33\.3 \| 3 \| 1 \| 1 jump \| 0, 1 not compared \(all: inconclusive chained\) \|/u);
  assert.match(md, /\*\*Verdict:\*\* 2 findings in 1 case on 1 page as built \(2 jumps, 0 shifts\), 1 caused by the named property list, 1 not compared; /u, "findings that could not be compared are counted in the verdict");
  assert.equal(build().totals.notCompared, 1);
  assert.match(md, /- start jump on x: \+20px at 0ms, box \[0, 0, 40, 20\] \(absent with every property transitioned: the named list caused it\)/u);
  assert.match(md, /- start jump on x: -20px at 0ms, box \[20, 0, 40, 20\] \(not compared\)/u);
});

test("sampleCase: each run starts where the previous one left the case", async () => {
  const stub = (results) => {
    const calls = [];
    return { calls, sample: async ({ direction, forceAll }) => { calls.push(`${forceAll ? "all" : "built"}:${direction}`); return results.shift(); } };
  };
  const ok = { status: "sampled", clicked: true };
  const normal = stub([ok, ok, ok, ok]);
  const all = await sampleCase(normal.sample, { compareAll: true });
  assert.deepEqual(normal.calls, ["built:forward", "built:back", "all:forward", "all:back"]);
  assert.deepEqual(Object.keys(all), ["built:forward", "built:back", "all:forward", "all:back"]);

  const restless = { status: "inconclusive", reason: "not-at-rest", clicked: false };
  const neverClicked = stub([restless, ok, ok]);
  const copied = await sampleCase(neverClicked.sample, { compareAll: true });
  assert.deepEqual(neverClicked.calls, ["built:forward", "all:forward", "all:back"], "a forward run that did not click: its back run is not sampled");
  assert.equal(copied["built:back"], restless, "and reads the same");

  const endless = { status: "inconclusive", reason: "not-at-rest", clicked: true };
  const stuck = stub([endless, restless]);
  const skipped = await sampleCase(stuck.sample, { compareAll: true });
  assert.deepEqual(stuck.calls, ["built:forward", "built:back"], "a back run that could not click leaves the case changed: nothing after it is sampled");
  assert.deepEqual([skipped["all:forward"], skipped["all:back"]].map((s) => [s.status, s.reason]), [["inconclusive", "skipped"], ["inconclusive", "skipped"]]);
  assert.equal(SKIPPED.clicked, false);
  const runs = caseRuns(skipped, { compareAll: true });
  assert.deepEqual(runs.map((r) => `${r.mode}:${r.direction} ${r.status} ${r.reason}`), ["built:forward inconclusive not-at-rest", "built:back inconclusive not-at-rest", "all:forward inconclusive skipped", "all:back inconclusive skipped"]);
});

test("caseProblems names the page, the case, and the attribute to add", () => {
  assert.deepEqual(caseProblems("home", [{ id: "switch", triggers: 1 }]), []);
  assert.match(caseProblems("home", [])[0], /^home: no declared transition case; add data-styleseed-transition="<id>" .* data-styleseed-trigger/u);
  assert.match(caseProblems("home", [{ id: "switch", triggers: 1 }, { id: "switch", triggers: 1 }])[0], /^home: case switch is declared more than once; give each data-styleseed-transition a unique id$/u);
  assert.match(caseProblems("home", [{ id: "switch", triggers: 0 }])[0], /^home: case switch holds 0 elements with data-styleseed-trigger; mark exactly one/u);
  assert.match(caseProblems("home", [{ id: "switch", triggers: 2 }])[0], /holds 2 elements/u);
  const unsafe = caseProblems("home", [{ id: "Bad Id", triggers: 1 }]);
  assert.match(unsafe[0], /^home: case #1: data-styleseed-transition must be a safe id/u);
  assert.doesNotMatch(unsafe[0], /Bad Id/u, "an unsafe id is not echoed");
});

test("parseArgs: defaults, --compare-all, --viewport, and usage errors", () => {
  const args = parseArgs(["file:///a.html", "--out", "out"]);
  assert.deepEqual([args.urls, args.out, args.compareAll, args.viewport, args.timeout], [["file:///a.html"], "out", false, { width: 1440, height: 900 }, 45000]);
  const full = parseArgs(["http://127.0.0.1:3000/gallery/transitions", "--out", "o", "--compare-all", "--viewport", "390x844", "--timeout", "1000", "--browser", "pw.mjs"]);
  assert.deepEqual([full.compareAll, full.viewport, full.timeout, full.browser], [true, { width: 390, height: 844 }, 1000, "pw.mjs"]);
  assert.throws(() => parseArgs([]), /usage: transition-jumps\.mjs/u);
  assert.throws(() => parseArgs(["file:///a.html"]), /--out <dir> is required/u);
  assert.throws(() => parseArgs(["file:///a.html", "--out", "o", "--viewport", "wide"]), /--viewport needs <width>x<height>/u);
  assert.throws(() => parseArgs(["file:///a.html", "--out", "o", "--gate"]), /unknown option --gate/u, "there is no --gate: Part B reports");
  assert.throws(() => parseArgs(["a.html", "--out", "o"]), /URLs must be http\(s\) or file:/u);
});
