---
name: ss-score
description: Score a UI file's design quality 0-100 against StyleSeed's design language — per-category breakdown, the worst offenders, and a prioritized fix list. A quantified version of /ss-review.
argument-hint: "[file-path or directory]"
allowed-tools: Read, Grep, Glob, Bash
---

# Design Score

`/ss-review` tells you *what's wrong*. `/ss-score` tells you *how good it is
overall* and *what to fix first* — a single number plus a category breakdown, so
you can track UI quality like you track test coverage.

## When NOT to use

- For a quick pass/fail before committing → use `/ss-lint`
- For a full prose audit with fixes → use `/ss-review`
- For non-UI files (logic, config) — scoring is meaningless

## Step 0 — Read the lock FIRST (the gate scores lock-relative)

Before scoring, **read `STYLESEED.md`** in the project root. The lock's `Preset`,
`Radius personality`, `Elevation`, `Density`, `Palette mode`, and `Surface` **re-key
the deductions below** — a deduction fires when the code violates *the lock*, not when
it deviates from the default Toss-flavored skin. Deductions marked **[LOCK]** are
lock-relative; unmarked deductions are floors that apply everywhere.

Why: coherence means "one deliberate system", not "one house style." A textbook
`brutalist-lite` build (hard borders, true black/white) or an `editorial` reading
surface (serif body, paper tone) is *correct* under its lock — punishing it is a
false positive that teaches users to distrust the gate.

**If there is NO lock**, score against the defaults below at full strictness — an
unlocked project drifting through random choices is exactly the failure the gate
exists to catch. (And say so: "no `STYLESEED.md` found — scored against defaults;
run Quick Setup to lock a look.")

## What to score

Score the file (or each file in a directory) on **six weighted categories** that
map to the design language. Total = 100.

| Category | Weight | Reads from |
|---|---|---|
| **Color discipline** | 16 | DESIGN-LANGUAGE §1, §18, §72 + VISUAL-CRAFT §C4 |
| **Hierarchy & typography** | 16 | §2, §3, §4, §16 + Font Size table + VISUAL-CRAFT §C2 |
| **Layout & rhythm** | 12 | §13, §14, §15, §61 + VISUAL-CRAFT §C1 |
| **Cards & elevation** | 10 | §7, §8, §12, §1 + VISUAL-CRAFT §C3 |
| **States & a11y** | 18 | §11, §70, §71, §72 + VISUAL-CRAFT §C3 |
| **Motion & interaction** | 6 | §24, §59 + `engine/motion` |
| **Coherence** | 12 | VISUAL-CRAFT §C0 (one choice per axis) |
| **Distinctiveness** | 10 | Golden Rules 14–16 + VISUAL-CRAFT §CC-9b (not generic/default/template) |

## How to score each category

For each category, start at full marks and **subtract** for violations you find by
reading the code. Be specific and evidence-based — cite the line.

**Color discipline (16)** — deduct for: **[LOCK]** any `#000`/`text-black` **unless the lock
declares a true-black/oled base or a brutalist/swiss preset** (−4 each, cap −8; pure-#000 *text
on white* stays discouraged by default — the 900/950 neutral reads better); **[LOCK]** hues
outside the locked palette used decoratively (−5) — the lock's `Palette mode` decides what's
legal: `single-accent` (default — one accent + greys) · `brand-palette` (N named colors with
assigned roles, Duolingo/M3-style — legal if each hue is IN the lock with a role) ·
`categorical` (CD-1 category hues on rows/tags/labels — legal when they encode *category*,
not decoration). What's ALWAYS deducted: colors that appear in **no** mode — random per-item
hues no lock names; **emoji used as UI icons** (multi-color, breaks any palette) (−5); **a
normal/OK/"보통" state shown in a *severity* color** instead of neutral grey (−4 — category
coloring per CD-1/CL-2a is not a severity violation); **severity color on most/every row**
(no hierarchy) (−4); hardcoded hex where a semantic token exists (−2 each, cap −6); status
conveyed by color alone (−4); **the unlocked default indigo (`#5E6AD2`/`#4F46E5`) used as the
accent** instead of a chosen domain-fit color (−4 — this one is never excused by a lock:
locking the default indigo *is* the tell).

**Distinctiveness (10)** — a coherent screen can still read "AI-generated." Deduct for: the
**icon-chip cliché** — a generic Lucide line-icon in an identical pale-tinted rounded-square,
repeated for every feature/step (−4, §CC-9b); the **StyleSeed demo layout copied verbatim**
(hero+chat / 3-step / feature-grid / pricing) with no product-specific identity (−4); **no focal
point** — an all-even grid of same-weight, centered, evenly-spaced cards (−3); the hero shows a
stock/placeholder visual instead of *this* product (−3); the **escape hatch as a new uniform**
(§CC-9c) — ghost 01/02/03 index numbers on every section, or identical uppercase-overline +
big-number cards repeated with no variation (−2); **[LOCK] distinctive-but-dated** (§CC-9d) —
full beige/paper page base, serif body text, dark-heavy blocks that read "brochure" not
"2026 product" (−3) — fires on product/SaaS surfaces under the default lock; a locked
`editorial`/reading surface legalizes serif body + a paper-toned canvas, and is instead
gated on reading craft (measure 50–75ch, line-height ≥1.5, contrast). Cap −10.

**Hierarchy & typography (16)** — deduct for: **[LOCK]** number/unit not ~2:1 (−4 — the
Toss-signature default; a lock/preset that declares uniform numeric styling, e.g. technical
mono tables, is exempt — check hierarchy comes from weight/color instead); font
sizes off the Font Size table / `text-[var(--…)]` for size (−5); everything the
same weight, no clear primary (−5); cramped or wrong line-height on body (−3);
**body < 16px on a desktop/web B2B surface** (tight mobile scale on a wide screen) (−4 —
but dense-data chrome is exempt: chart ticks, mono SHAs/timestamps, table metadata at
12–13px are correct; and dashboard app-chrome h1 at 22–24px is correct, not a violation
of the marketing 40–56px headline scale).

**Layout & rhythm (12)** — deduct for: **[LOCK]** no separation language at all (−6) —
"separation" is whatever the lock's `Elevation` declares: cards+tone (default), whitespace+
grid (swiss/editorial/minimal), or hard borders (brutalist). Content floating with *no*
deliberate separation is the violation, not the absence of cards specifically; a locked
`editorial`/reading surface with a bare text column and a proper measure is correct. **[LOCK]**
spacing off the locked density's rhythm (−3) — the locked `Density` position (ss-dial ramp:
airy `space-y-10/p-8` · comfortable `space-y-6/p-6` · dense `space-y-4/p-4`) is the grid;
`px-6`-literals only bind the default comfortable position; same section type repeated in a
row (−4); mixed off-scale one-offs (7/13/19px values on any density) (−3).

**Cards & elevation (10)** — deduct for: **[LOCK]** borders doing separation work that the
locked elevation language assigns to tone+shadow (−4) — this fires ONLY when the lock's
`Elevation` is the layered-shadow default. When the lock declares `flat`/`borders`
(swiss · minimal-mono · brutalist-lite) or the DARK tonal ramp (technical, any dark mode),
borders ARE the elevation language — don't deduct; instead check the border discipline is
coherent (one weight everywhere, per §C0). **[LOCK]** shadows over the locked opacity cap
(default ~8%; a preset may raise it — M3-style elevation is legal if locked) or drop
shadows in dark mode (−4); **[LOCK]** no elevation separation in the locked language (−5)
— tone-flat is a violation under `layered-shadow`, correct under `flat`.

**States & a11y (18)** — deduct for: missing empty/loading/error state on a data
surface (−5 each, cap −10 — a static mockup or marketing landing with NO data surface is
**N/A**: skip these deductions, don't fail the category); contrast below 4.5:1 body / 3:1
large (−6); touch target < 44px on a touch surface (pointer-first desktop controls at
36–40px are fine) (−4); no visible focus / `outline:none` (−5); icon-only control
without `aria-label` (−3).

**Motion & interaction (6)** — deduct for: random/ad-hoc fades instead of a named
seed/keyword (−3); motion that delays content or blocks an action (−4); no
`prefers-reduced-motion` handling on custom motion (−3). **Scroll-linked/parallax/3D/animated-
gradient is SURFACE-DEPENDENT (§43):** on an app/dashboard/data/form surface it's forbidden
(−5); on a **marketing/landing/brand page it's ALLOWED (the Cinematic tier)** — there, do NOT
deduct for scroll-linked reveals, pinned sections, 3D hero, or animated backgrounds; only deduct
for **scroll-JACKING** (hijacking scroll / trapping) (−5), motion that hides content until scroll
or delays the headline/CTA (−4), or a missing `prefers-reduced-motion` fallback (−3). Judge by
page type first, then score.

**Coherence (12)** — the "one choice per axis" laws (VISUAL-CRAFT §C0). Deduct for
each axis that is *mixed* rather than unified across the file: mixed radius
personalities, e.g. sharp panel + pill buttons (−5); two+ competing accent hues used
for emphasis (−4); mixed shadow languages / light directions (−3); mixed icon
families, fill modes, or stroke weights (−3); same radius on a nested element instead
of `inner = outer − padding` (−2); inconsistent control heights for buttons/inputs
(−2). This is the category that most predicts "looks AI-generated" — weight evidence
of system-wide consistency, not per-component prettiness.

Clamp each category at 0. Sum to a total.

## Output format

```
## Design Score: 70 / 100   (src/app/Dashboard.tsx)

████████████████░░░░░░  C-

Color discipline      13/18   ▓▓▓░  #000 headings (l.12,40); orange+blue+green accents (l.28-34)
Hierarchy & typography 15/18  ▓▓▓▓  number/unit 1:1 on hero (l.18)
Layout & rhythm        11/14  ▓▓▓░  two identical KPI rows (l.22-31)
Cards & elevation       8/12  ▓▓░░  1px borders doing separation (l.22)
States & a11y          11/18  ▓▓░░  no empty/loading state; focus ring missing (l.55)
Motion & interaction    6/8   ▓▓▓░  default fade, not a named seed
Coherence               6/12  ▓▓░░  sharp cards (l.22) + pill buttons (l.48); 3 accent hues (§C0)

### Fix first (highest score gain)
1. Add empty + loading states to the orders list       → +7 states (§71)
2. Unify radius (pick soft 8-12px) + collapse to one accent → +9 coherence+color (§C0, §2)
3. Drop the 1px borders, use tone + ≤8% shadow         → +4 cards  (§7)

Re-score after: ~92 / 100.
```

Use letter bands: 90+ A · 80-89 B · 70-79 C · 60-69 D · <60 F.

## Gate mode (use this as the Quality Gate before showing the user UI)

The Quality Gate (CLAUDE.md / AGENTS.md) is `/ss-score` run as a loop, not a one-off:

1. Score the just-generated UI.
2. If **< 80**, apply the "fix first" list (use `/ss-review` to make the edits), then **re-score**.
3. Repeat up to ~3×, or until ≥ 80.
4. Present the UI with the final score and a one-line "fixed: …".

The pass bar is a **floor, not a ceiling** — get to ≥ 80 and stop; don't chase 100. The point
is that no first-draft, obviously-incoherent UI reaches the user. Especially never ship below
80 with a rainbow status list, emoji icons, two accents, or missing states — those are the
exact tells the gate exists to catch.

## Rules

- **Read the file** — score from real evidence (line numbers), never guess.
- Order the "fix first" list by **score gain**, not by severity alone — the goal
  is the fastest path to a better number.
- For a directory, print a one-line score per file, then the lowest-scoring file's
  full breakdown.
- Don't auto-edit in plain scoring. `/ss-score` measures; `/ss-review` and `/ss-motion` fix.
  In **Gate mode** (above) you do fix-and-re-score until the floor is met.
- As a *gate*, ≥ 80 is a floor before showing the user — but don't over-polish: chasing 95→100
  to delay shipping is worse than shipping a clean 85.
