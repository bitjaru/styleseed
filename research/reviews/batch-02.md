# Review batch 02 — measured spacing and cut-off text on rendered screens

- **Status:** open
- **Cards:** 5 · about 10–15 minutes
- **Reviewer:** read `docs/DESIGNER-GUIDE.ko.md`
- **Reviewer's agent:** read `docs/designer-review-agent.md` before the first card

Every card shows a check StyleSeed runs on rendered screens today (`drift-report.mjs --faults`) and the number
where it draws the line. Each check only reports: no rule in the catalog states it, so it never fails a build.
The maintainer will not turn a number into a rule without a designer's view, so it is asked here. The question
is the threshold, not a style. "I don't know" and "skip" are valid answers.

Each **Look at** link opens one pair on the demo: the left page passes the check, the right page is the same
layout with the fault. Both are small pages with fictional copy.

Card kinds:

| Kind | The reviewer answers with |
|---|---|
| `proposition` | `agree`, `conditional` (say the condition), or `disagree` (say what instead), plus one or two sentences |
| `choice` | one of the listed options, or their own, plus one or two sentences |
| `open` | free text |

The agent fills in **Answer** under each card in the reviewer's own words and changes nothing else in this file.

---

## Card 1 · proposition · text cut off with no sign of the cut

**Look at:** https://styleseed-demo.vercel.app/gallery/faults#text-clip

**What ships:** `drift-report.mjs --faults` reports `text-clip`: an element with its own text, at least 4×4px,
whose box hides its overflow and cuts the text. A cut of more than 1px on the side counts unless the element
sets `text-overflow: ellipsis`; a cut at the bottom counts when it is more than half the font size and the
element sets no line clamp. Elements under a mask (a fade-out) or with a running animation are not judged. The
definition and both limits are ours. On the linked page the left file name ends in "…"; the right one stops
mid-word.

**Proposition:** Text that its own box cuts off is a defect unless the cut is shown: an ellipsis where a line is
cut short, a line clamp where lines are cut at the bottom. It counts from a cut of more than 1px on the side, or
more than half the font size at the bottom.

**질문:** 글자가 자기 상자에 잘렸는데 잘렸다는 표시가 없으면 결함이다. 줄 끝이 잘리면 말줄임표(…)를, 아래쪽 줄이
잘리면 줄 수 제한(line clamp)을 써서 표시해야 한다. 옆으로 1px 넘게, 또는 아래로 글자 크기의 절반 넘게 잘리면 여기에
해당한다. 동의하시나요?

**Feeds:** a proposed catalog rule for `text-clip`. If agreed, the maintainer may propose that rule with this
verdict in its `reviews[]`. Nothing changes automatically.

**Answer**
- Verdict:
- Note:

---

## Card 2 · proposition · text too close to the edge of its panel or chip

**Look at:** https://styleseed-demo.vercel.app/gallery/faults#tight-inset

**What ships:** `drift-report.mjs --faults` reports `tight-inset`: for each text element, the smallest distance
from its text to the inner edge of the surface that holds it (a box with its own background, border, or
shadow). A holder of at least 160×48px is a panel: all four sides are judged and the floor is 8px. A smaller
holder is a chip: its left and right sides are judged and the floor is 4px. Round compact holders (a count
badge, an avatar, a dot) are not judged, and neither are the top and bottom of a panel that scrolls. The 8px
panel floor and the 160×48px panel size are adapted from Stageshow 1.1.1, which aims for 12px; the 4px chip
floor is ours, since Stageshow does not judge chips (sources: the **Sources** section of
`engine/.claude/skills/styleseed/workflows/ss-verify/references/render-faults.md`). On the linked page the right
panel has 2px of padding.

**Proposition:** Text closer than 8px to the inner edge of a panel (a surface of at least 160×48px), or closer
than 4px to the left or right inner edge of a smaller chip, is a defect.

**질문:** 글자가 패널(160×48px 이상인 상자) 안쪽 가장자리에서 8px보다 가까우면 결함이다. 그보다 작은 칩(작은 버튼,
배지 등)은 좌우 가장자리에서 4px보다 가까우면 결함이다. 동의하시나요?

**Feeds:** a proposed catalog rule for `tight-inset`. If agreed, the maintainer may propose that rule with this
verdict in its `reviews[]`. Nothing changes automatically.

**Answer**
- Verdict:
- Note:

---

## Card 3 · proposition · text standing against a neighbouring surface

**Look at:** https://styleseed-demo.vercel.app/gallery/faults#text-touch

**What ships:** `drift-report.mjs --faults` reports `text-touch`: text that stands less than 4px from a
neighbouring surface on its line (a box of at least 4×4px with its own background, border, or shadow, beside
the text rather than holding it), when no gap, margin, or padding in the code accounts for the distance. A
badge or code chip inside a sentence, and floating or pinned layers, are not judged. The test is adapted from
Stageshow 1.1.1's "touching" check, which uses 5px; 4px is ours, because 4px is this engine's sanctioned
half-step (`engine/CLAUDE.md`, Spacing). On the linked page the right status mark sits flush against its label.

**Proposition:** Text that stands less than 4px from a neighbouring surface on its line is a defect when nothing
in the code (a gap, margin, or padding) set that distance.

**질문:** 글자와 같은 줄에 있는 옆 상자(배경·테두리·그림자가 있는 상자) 사이가 4px보다 좁은데, 코드에 그 거리를
정한 값(gap, margin, padding)이 없으면 결함이다. 동의하시나요?

**Feeds:** a proposed catalog rule for `text-touch`. If agreed, the maintainer may propose that rule with this
verdict in its `reviews[]`. Nothing changes automatically.

**Answer**
- Verdict:
- Note:

---

## Card 4 · proposition · two surfaces almost touching

**Look at:** https://styleseed-demo.vercel.app/gallery/faults#near-touch

**What ships:** `drift-report.mjs --faults` reports `near-touch`: two consecutive sibling surfaces, side by side
or stacked, that stand 1 to 3px apart when no gap, margin, or padding in the code accounts for the distance.
Overlapping siblings and floating or pinned ones are not judged. The 1–3px band is adapted from Stageshow
1.1.1's near-tangent band. On the linked page the right two tiles have a 2px seam; the left two stand 16px
apart.

**Proposition:** Two neighbouring surfaces that stand 1 to 3px apart are a defect when nothing in the code (a
gap, margin, or padding) set that distance.

**질문:** 옆이나 위아래로 이웃한 두 상자(배경·테두리·그림자가 있는 상자)가 1~3px 떨어져 있는데, 코드에 그 거리를
정한 값(gap, margin, padding)이 없으면 결함이다. 동의하시나요?

**Feeds:** a proposed catalog rule for `near-touch`. If agreed, the maintainer may propose that rule with this
verdict in its `reviews[]`. Nothing changes automatically.

**Answer**
- Verdict:
- Note:

---

## Card 5 · proposition · stacked blocks that almost share an edge

**Look at:** https://styleseed-demo.vercel.app/gallery/faults#near-align

**What ships:** `drift-report.mjs --faults` reports `near-align`: two consecutive stacked children of one parent,
both plain text or both surfaces, whose left edges differ by 1 to 3px (for text, the left of its first line).
Centred or right-aligned children, list items with markers, and table cells are not judged. Unlike cards 3 and
4, an offset that the code sets (a 2px padding) still counts. The 1–3px band is adapted from Stageshow 1.1.1's
near-aligned check. On the linked page the right second line starts 2px in.

**Proposition:** Two stacked blocks whose left edges differ by 1 to 3px are a defect, even when the code sets
that offset.

**질문:** 위아래로 쌓인 두 덩어리(글끼리 또는 상자끼리)의 왼쪽 시작선이 1~3px 어긋나 있으면, 코드에서 일부러 준
값이라도 결함이다. 동의하시나요?

**Feeds:** a proposed catalog rule for `near-align`. If agreed, the maintainer may propose that rule with this
verdict in its `reviews[]`. Nothing changes automatically.

**Answer**
- Verdict:
- Note:

---

## Record

Filled in by the reviewer's agent after the last card, once the reviewer has read every answer back.

- Reviewer (name or handle, as the reviewer chose):
- Date (YYYY-MM-DD):
- Via: designer+agent
- Agent used:
- Cards answered / skipped:
