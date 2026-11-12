# Render faults: measured defects on rendered screens

Some defects exist only in pixels: a label that runs into its neighbour, an amount broken as `10` /
`kg`, text 2px from the edge of its card, an emoji where an icon belongs. `drift-report.mjs --faults`
measures them on the same page loads as the drift report and writes `FAULTS.md` and `faults.json`
beside the drift files.

It is a measurement, not design acceptance. Every finding is decided by a pure function from
rendered boxes and computed style against a fixed threshold (`scripts/analyze-faults.mjs`); nothing
a model judges enters it, nothing is scored, and a screen with no finding is not thereby a good
screen. The probe (`scripts/observe-faults.mjs`) is read-only: it clicks, hovers, types, navigates,
and requests nothing, and it returns class names, boxes `[x, y, w, h]` in document pixels, numbers,
and enums. No page text, selectors, class names, element ids, asset URLs, or screenshots leave the
page. Text is read inside the page only to classify it (an amount, an emoji).

```bash
node <installed-ss-verify>/scripts/drift-report.mjs \
  http://localhost:3000/ http://localhost:3000/settings \
  --out .styleseed/evidence/drift/<date> --project-root . --faults [--gate]
```

## Terms

- **Shown:** a box of at least 1×1, `display` not `none`, `visibility` not `hidden`, the product
  of `opacity` from the element up to `<body>` at least 0.05, and rendered by the browser
  (`checkVisibility` where available): the content of a closed `<details>` other than its summary,
  and content under `content-visibility: hidden`, is not shown even though its boxes can be read.
- **Text fragment:** one client rect of a non-space text node whose parent is shown (not inside
  `svg`, form fields, or `script`/`style`), cut to the boxes that clip it; a fragment with nothing
  left wider and taller than 0.5px is not measured. Only the reachable document is measured: a box
  entirely left of x = 0 or above y = 0, or entirely right of the root's width when the root clips
  overflow on x (a closed off-canvas drawer), is skipped.
- **Line** (*ours*): fragments sorted by top, then left; a fragment starts a new line when its
  vertical overlap with the current line is less than half the smaller of the two heights. Fragment
  rects are content-area boxes, taller than the line box under tight leading, so wrapped lines can
  overlap a little; a small unit beside a large number stays on the number's line.
- **Block** of an element: its nearest ancestor-or-self whose `display` is neither inline nor
  `contents`.
- **Surface:** an element with its own background that differs from the one behind it, four painted
  borders, or a box shadow, and a `display` other than `inline` (an `inline-flex` badge is one; a
  highlighted `span` in a sentence is not).
- **Holder** of a fragment: the nearest surface ancestor-or-self of its element, unless an element
  between them is absolute, fixed, or sticky, transformed, floated, or has a negative margin. Such
  text was placed on purpose and has no holder.
- **Authored spacing** between two boxes: the `gap` of their nearest common flex or grid container,
  their facing margins, and the facing padding and margin of each element between a box and that
  container. A gap is authored when that sum is at least 1px and the gap is at least the sum minus
  0.5px. Vertical margins outside flex and grid collapse and count once. Table parts are authored.

## Classes

Origin `(S)` marks a definition or threshold adapted from Stageshow (see **Sources**); *ours* has no
counterpart there.

| Class | What it is | Fault when | Never a fault | Threshold | Origin | Rule | Gate |
|---|---|---|---|---|---|---|---|
| `amount-wrap` | An element (not inline) whose whole text is one amount (`10 kg`, `$48.2K`, `₩1,240,000`, `1억 2,000만 원`) and that holds only inline content. | Its fragments sit on 2 or more lines and it holds no `<br>`. | A value and its unit in separate block boxes; an amount inside running text; an amount whose text is transformed (rotated, translated, or scaled), since its line boxes are not its painted lines. | — | `(S)` unit wrapped; its 28px font floor and 4-character unit limit are not used | `DL-23-amounts-never-wrap` | reports |
| `text-overlap` | Fragments of two different blocks that intersect. | The intersection is at least 2px wide and at least 0.5 of the smaller font size tall. | A side under a layer that paints its own background (a badge on an avatar, a popover); a side inside a fixed or sticky element, under `aria-hidden="true"`, or below 0.5 opacity (a watermark). | 2px; 0.5 | *ours* (Stageshow reports text over a neighbouring box) | none | reports |
| `text-spill` | A fragment that runs past the border box of its holder, which does not clip or scroll on that axis. | By 2px or more. | Text without a holder (placed on purpose). | 2px | *ours* (Stageshow: spills its slot) | none | reports |
| `text-clip` | An element with its own text, at least 4×4, whose overflow is hidden or clipped. | Cut on x without `text-overflow: ellipsis`, or on y by more than half its font size without a line clamp. | A mask image on it or an ancestor; a running animation. | — | *ours* (Stageshow: clipped) | none | reports |
| `tight-inset` | The smallest distance from an element's fragments (their unclipped rects) to its holder's inner edge (border box minus borders), per side. A holder of at least 160×48 is a panel, else a chip. | A panel side under 8px (top and bottom are not judged when the panel scrolls on y); a chip's left or right under 4px. | A round compact holder (a count badge, an avatar, a dot); a side whose text lies outside the inner edge, including text that an ellipsis or a scroll cuts (that is a spill or a clip). | 8px `(S)`; 4px *ours* | `(S)` tight inset is under 8px with 12px as its target; it exempts chips and pills, so the chip floor is ours | none | reports |
| `text-touch` | The nearest in-flow surface beside a fragment on its line (overlapping at least half its height), not its own ancestor or descendant. | A gap under 4px that no authored spacing explains. | An inline surface in the text's own block (a badge or `code` chip inside a sentence); out-of-flow surfaces, and surfaces inside an out-of-flow wrapper. | 4px | `(S)` touching is 5px; 4px here because 4px is this engine's sanctioned half-step (`engine/CLAUDE.md`, Spacing) | none | reports |
| `near-touch` | Two consecutive in-flow sibling surfaces on one line (x) or in one column (y). | A gap of 1 to 3px that no authored spacing explains. | Overlapping siblings; out-of-flow siblings. | 1–3px | `(S)` near-tangent (1 to 3px in its craft reference) | none | reports |
| `near-align` | Two consecutive stacked in-flow children of one parent, both text without a surface (start: the first fragment's left) or both surfaces (start: the box left). | The starts differ by 1 to 3px. | Centred or end-aligned children (by `text-align`, or centres or right edges that agree); list items with markers; table parts. | 1–3px | `(S)` near-aligned, same band | none | reports |
| `emoji-icon` | An element whose own text is one to eight emoji, inside a control, leading a flex row whose later siblings hold text, or alone in a square surface of at most 64px. | Every record. | Emoji anywhere else: in a sentence, a message, a heading. | — | `(S)` emoji icon | `CRAFT-functional-icons` | reports |
| `icon-mix` | Top-level `svg` icons of 8–32px, signed `<viewBox grid>\|<stroke, fill, or both>`, grouped by their nearest `nav`, list, table, toolbar, tab list, or menu. | A group with at least two icons outside a selected item and at least two signatures. | Icons in a selected item (`aria-selected`, `aria-current`, `aria-pressed`, `aria-checked`, or `data-state` active, on, checked, open): an outline default with a filled selected state is allowed (VISUAL-CRAFT CC-9). | — | `(S)` mixed icons, redefined: it flags filled beside outline, which our canon allows for state | `CRAFT-icon-family` | reports |

A finding carries the rule of its class only while that rule id is in the catalog; otherwise `rule` is
`null`. The good and bad page of every class are in `scripts/lib/fault-pairs.mjs` of the StyleSeed
repository (fixtures for `scripts/test-render-faults-browser.mjs`).

## Output

- `faults.json`: `tool: "styleseed render-faults"`, `version: "1"`, `observedAt`, `browser`, the
  `thresholds`, `classes` (id, rule, gates, summary), and per screen its `findings` (class, viewport,
  box, against, the `measure` that decided it, rule, gates, `status` `fault` or `approved` with the
  `exception` id), `counts` per class, the candidate `distribution` per viewport (how many candidates
  sit under neighbouring limits, so a reviewer can see what moving a threshold would do), the icon
  signatures, and `capped`. Then `totals` per class and the `verdict`.
- `FAULTS.md`: the counts per class and screen with each class's rule and whether it gates, up to 20
  findings per class and screen (the rest are in `faults.json`), the icon signatures, and the verdict.
  No score, no percentage, and no sum across classes.
- Findings are sorted by class (the order above), widest viewport first, then `y`, `x`; the same input
  gives the same bytes, and only `observedAt` depends on the clock.

**Faults are not drift.** `drift.json` and `DRIFT.md` are byte for byte what the same run writes
without `--faults`, and without the flag no probe runs and no file or key is added. The flag is
independent of `--structure`, `--scroll`, `--states`, and `--reference`.

## The gate follows the catalog

`--gate` fails on a finding when its class maps to a catalog rule whose `priority` is `blocks` and
its status is `fault`; the line names the rule, class, screen, viewport, and count:
`render faults gate: FAIL — <rule>: <class> on <label> @<viewport> (<count>); …`. There is no second
list of gating classes in code: changing a rule's priority in `engine/rules/catalog.json` changes
the gate. State variants (`--states`) count like at-rest screens.

A class may only become a gate when it is a gate candidate (`amount-wrap`, `text-overlap`,
`text-spill`: breaks rather than taste) and a calibration run on our own screens
(`scripts/calibrate-render-faults.mjs`: the gallery, the site registry's five pages, and ten product
showcases, at both viewports) finds none of it. The other seven classes report. The calibration of
2026-11-11 (rerun after the review fixes to the probe) found each of the three candidates on our own
screens, so today every class reports: `DL-23-amounts-never-wrap` stays `strong`, and text-overlap and
text-spill map to no rule.

The project's decisions ledger can waive a **default** rule per screen: an entry with
`kind: "exception"`, the finding's `rule`, no `axis`, and either no scope or `scope.screens` naming
the screen (a `?state=` variant by its base label) turns the finding `approved` with its id; an entry
scoped only to artifacts names no screen and is not applied. Because no selector is stored, the
exception covers every finding of that rule on the screen: coarse, and a limit. An **invariant**
cannot be waived; the ledger refuses such an exception before anything is measured
([decisions ledger](../../ss-resolve/references/decisions.md)).

## Limits

- Units in scripts other than Latin, Hangul, kana, and Han are not recognised; a short CJK word after
  a number counts as its unit (false negatives, not false positives).
- `img` icons and icon fonts are not classified; `img` of at most 32px are counted as `unknown`.
- Text inside form fields is not a text node and is not measured.
- Open shadow roots, iframes, and inner scroll containers are not traversed or scrolled; only the
  window is measured, at the top (after the scroll pass with `--scroll`). SVG path geometry is not read.
- Caps per viewport: 6,000 text fragments and 300 records per list; what a cap drops is counted in
  `capped`, and that screen reads as a lower bound.
- Text boxes come from the fonts of the machine that renders; counts on real pages may differ by a few
  findings between platforms. The fixture pairs are font-independent by construction.

## Transition frame jumps

A component that names the properties it transitions (`CRAFT-motion-family`, detector SS003) can leave
one out: that property then changes in one frame while the rest of the change glides.
`scripts/transition-jumps.mjs` samples a declared state change frame by frame and says where that
happens. It is for your own pages and fixtures, never a reference site: clicking a declared trigger is
the one thing it does to a page. It reports and has no `--gate`.

```bash
node <installed-ss-verify>/scripts/transition-jumps.mjs http://localhost:3000/settings \
  --out .styleseed/evidence/transitions/<date> [--compare-all] [--viewport 1440x900]
```

**Declaring a case.** A root `data-styleseed-transition="<id>"` (lowercase letters, digits, and
hyphens; unique on the page) holds exactly one `data-styleseed-trigger`, which may be the root itself;
a trigger belongs to its nearest case root. The script clicks the trigger with `element.click()` to go
forward and clicks it again to come back. Hover and focus changes are sampled by giving the page a
control that applies the same state. A page with no case, an unsafe or repeated id, or a case without
exactly one trigger stops the run (exit 1) with the page, the case, and the attribute to add.

**Method.** Real-time frames depend on the machine, so the script holds the clock instead: it waits until
no animation under the root is running, records every box under the root, clicks, and pauses every CSS
transition, CSS animation, and Web Animation the change starts (on `transitionrun` and `animationstart`,
right after the click, and on each of the next six frames, since a framework may apply the change a frame
or two late). It then sets every held animation's time to 0, 1000/60 ms, 2 × 1000/60 ms, … up to the
largest end time, records every box at each step, finishes the animations, and records the settled boxes
twice, one frame apart. The same page gives the same frames on every machine. A change that starts no
animation is `instant`, which is valid and has no findings.

**Shown in a frame.** A box is compared only in frames where its element is shown: connected, at least
1×1, not `display: none` or `visibility: hidden`, an opacity product of at least 0.05, rendered
(`checkVisibility`; the content of a closed `<details>` is not), in the reachable document (the
definition under **Terms**), and with some part inside every box that clips it (a collapsed
`overflow: hidden` panel hides its content). An element not shown in one of two compared frames is skipped
for that comparison: appearing and disappearing are not jumps `(S)`. Elements created by the change are
not tracked.

**Findings**, per element and per axis `x, y, w, h`, from boxes `[x, y, w, h]` in document pixels:

| Phase | Compared | Finding when | Size |
|---|---|---|---|
| `start` | rest → time 0 | a displacement over `shiftPx` | `jump` over `jumpPx`, else `shift` |
| `mid` | consecutive steps | a step `d` with \|d\| over `jumpPx` and over `calmFactor` × the larger of the steps before and after it (at least `calmFloor`) | `jump` |
| `end` | last step → settled | a displacement over `shiftPx` | `jump` over `jumpPx`, else `shift` |

| Threshold | Value | Origin |
|---|---|---|
| `jumpPx` | 2px | `(S)` the one-frame jump test |
| `calmFactor` | 3 | `(S)` |
| `calmFloor` | 0.4px | `(S)` |
| `shiftPx` | 0.5px | *ours*: at time 0 and after the end nothing glides, so any displacement there was not animated. Stageshow's 2px tells a snap from a fast glide in real-time frames; an untransitioned 2px border moves content exactly 2px, which a "more than 2px" test would miss. |

An `x` or `y` finding is dropped when an ancestor inside the root has one in the same phase, axis, and
frame with a delta within 0.6px: the outermost is reported `(S)`. An element whose own text changed
between rest and settled is skipped (a label that changes its words changes its width at once); what it
pushes is still reported. A transitioned border width moves in whole pixels and does not trip the 2px
test, which is correct.

**`--compare-all`.** After both directions are sampled as built, both are sampled again with
`transition-property: all !important` set inline on every element under the root whose
`transition-duration` has a non-zero entry, and each value is restored afterwards. That is what the
element did before its properties were named. A finding as built gets `withAll: true` when the same
element, phase, and axis also has one in that second run (naming the properties did not cause it: an
animation missing its keyframes, a `steps()` timing), `withAll: false` when it does not (**the named list
caused it**), and `withAll: null` when the second run was not sampled or tracked other elements.

**Inconclusive** (exit 2; such a run has no findings): `not-at-rest` (an animation under the root was
still running 2s after the run began, or the change started one that never ends), `capped` (more than 400
elements under the root; nothing is clicked), `chained` (once the held animations finished, another one
was running), and `script-driven` (the settled boxes moved between two frames: motion driven by script
rather than an `Animation` cannot be stepped). When the forward run stops before clicking, the back run
is not sampled and reads the same.

**Output.** `transitions.json` (`tool: "styleseed transition-jumps"`, `version: "1"`, `observedAt`,
`browser`, `viewport`, `stepMs`, `thresholds`, per page and case the runs with `direction`, `mode`
(`built` or `all`), `status`, `reason`, the counts of transitions and animations, `duration`, the number of
frames and elements, and the findings with `phase`, `axis`, `delta`, `at` (ms), `size`, `box` (where the
element was before the step), and `withAll`; then `totals` and the `verdict`) and `TRANSITIONS.md` (one
row per case and direction, then the findings). No page text, selectors, property or animation names, or
screenshots. The pair for this check is `frame-jump` in `scripts/lib/fault-pairs.mjs` of the StyleSeed
repository; the ten state changes of the components whose transitions name their properties are
declared on the demo's `/gallery/transitions`.

**Limits.** Clicks only: no hover, focus, keys, or scripted multi-step interaction. Only motion driven by
an `Animation` (CSS transitions and animations, Web Animations) is stepped. At most 400 elements per case.
One viewport per run (`--viewport`). A state applied more than six frames after the click is not seen.
A rotating box reports its bounding box, which grows and shrinks as it turns. Whether another layer covers
a box is not checked. Open shadow roots and iframes are not traversed, elements inside an `svg` are not
tracked (the `svg` is), and SVG path geometry is not read.

## Stageshow faults that do not transfer

Stageshow films marketing demos of mock product UI; these screens are real product UI, so ten of its
fault lines were rewritten above and the rest were dropped: framing, crop, gutters, invented marks,
skeleton ladders, unsized text, and kit overrides (about a film stage or mock content); uneven padding
(our canon allows smaller vertical padding, VISUAL-CRAFT CC-7); tight control (our canon uses 4px from
field to helper, CC-8; the unauthored case is `near-touch`); tight and loose stacks (they need glyph
ink, and leading is a project decision); tight mark (that is `text-touch`); loose lists, fat rows, and
empty panes (density is a project decision, `DL-21`); onion skin (translucent layers are normal in
product UI); uneven inset and avatar alignment (valid choices); clipped and half-pixel glyphs (they need
SVG path geometry); squeezed (it measures by writing to the page); and the multi-step motion faults.

## Sources

Several definitions and threshold values on this page were adapted from Stageshow 1.1.1 (repository
`benjitaylor/skills`, folder `stageshow`, MIT licence), a tool for filming demos of mock product UI: the
tight-inset floor, the near-miss band, the touching distance, the unit-on-its-own-line test, emoji used as
icons, mixed icon construction, and the one-frame jump test. They were rewritten for rendered product
screens. No code, icons, or artwork was taken. Rows marked *ours* have no counterpart there.
