---
name: ss-score
description: Score a visual artifact's implementation quality 0-100 against its composed StyleSeed rule set — category breakdown, evidence, and prioritized fixes.
argument-hint: "[file, directory, or artifact manifest]"
allowed-tools: Read, Grep, Glob, Bash
---

# Design Score

`/ss-review` tells you *what's wrong*. `/ss-score` tells you *how good it is
overall* and *what to fix first* — a single number plus a category breakdown, so
you can track UI quality like you track test coverage.

## When NOT to use

- For a quick pass/fail before committing → use `/ss-lint`
- For a full prose audit with fixes → use `/ss-review`
- For logic/config with no visual artifact — scoring is meaningless

## Step 0 — Resolve the effective rule set

Before scoring, read `PRODUCT-PRINCIPLES.md`, `RULESETS.md`, `ADAPTERS.md`, `PRESETS.md`, and `STYLESEED.md`.
If the lock selects `reference:<slug>`, read its project-local `RULESET.md` and evidence/checks.

Score in authority order: core invariants first, then the exact output grammar, domain/page,
optional aesthetic profile, and bounded lock values. The lock cannot waive an invariant.
Unknown values fall back to the nearest built-in grammar; do not invent an exception.

The output must name the effective rule set, for example:

```text
Rule set: operations-console × SaaS × dashboard × swiss
```

## What to score

Score the file (or each file in a directory) on **eight weighted categories** that
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

**Color discipline (16)** — deduct for: accidental `#000`/`text-black` outside a profile or
grammar contract that explicitly uses hard black structurally (−4 each, cap −8); competing
decorative emphasis hues (−5); **emoji used as UI icons** (−5); **a normal/OK/"보통" state shown in a status color** instead of
neutral grey (−4); **status color on most/every row** (no severity hierarchy) (−4);
**decorative hues** (gold stars, rainbow category dots) instead of accent/grey (−3);
hardcoded hex where a semantic token exists (−2 each, cap −6); status conveyed by color
alone (−4); **the unlocked default indigo (`#5E6AD2`/`#4F46E5`) used as the accent** instead of
a chosen domain-fit color (−4).

**Distinctiveness (10)** — a coherent screen can still read "AI-generated." Deduct for: the
**icon-chip cliché** — a generic Lucide line-icon in an identical pale-tinted rounded-square,
repeated for every feature/step (−4, §CC-9b); the **StyleSeed demo layout copied verbatim**
(hero+chat / 3-step / feature-grid / pricing) with no product-specific identity (−4); **no focal
point** — an all-even grid of same-weight, centered, evenly-spaced cards (−3); the hero shows a
stock/placeholder visual instead of *this* product (−3); the **escape hatch as a new uniform**
(§CC-9c) — ghost 01/02/03 index numbers on every section, or identical uppercase-overline +
big-number cards repeated with no variation (−2); **distinctive-but-dated** (§CC-9d) — full
beige/paper page base, serif body text on a product surface, dark-heavy blocks that read
"brochure" not "2026 product" (−3). Cap −10.

**Hierarchy & typography (16)** — deduct for: number/unit not ~2:1 (−4); font
sizes off the Font Size table / `text-[var(--…)]` for size (−5); everything the
same weight, no clear primary (−5); cramped or wrong line-height on body (−3);
**body < 16px on a desktop/web B2B surface** (tight mobile scale on a wide screen) (−4 —
but dense-data chrome is exempt: chart ticks, mono SHAs/timestamps, table metadata at
12–13px are correct; and dashboard app-chrome h1 at 22–24px is correct, not a violation
of the marketing 40–56px headline scale).

**Layout & rhythm (12)** — deduct for: grouping that contradicts the selected grammar (−6):
`operations-console` needs explicit functional groups, while `editorial-reading` should not be
forced into cards; arbitrary off-scale spacing (−3); same section type repeated without purpose
(−4); no discernible proximity rhythm (−3).

**Cards & elevation (10)** — deduct for mixed or task-inappropriate surface language. Hairlines,
flat grouping, tonal ramps, or restrained shadows are valid only when the selected grammar/profile
uses them coherently. Deduct mixed border/shadow languages (−4), visibly heavy or directionally
inconsistent shadows (−4), or missing group/surface separation where the grammar requires it (−5).

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
Rule set: operations-console × product-ui × SaaS × dashboard × swiss

████████████████░░░░░░  C-

Color discipline      11/16   ▓▓▓░  competing orange+blue emphasis hues (l.28-34)
Hierarchy & typography 13/16  ▓▓▓▓  number/unit 1:1 on hero (l.18)
Layout & rhythm         9/12  ▓▓▓░  two identical KPI rows (l.22-31)
Cards & elevation       8/10  ▓▓░░  mixed border + floating-shadow language (l.22)
States & a11y          11/18  ▓▓░░  no empty/loading state; focus ring missing (l.55)
Motion & interaction    4/6   ▓▓▓░  default fade, not a named seed
Coherence               6/12  ▓▓░░  sharp cards (l.22) + pill buttons (l.48); 3 accent hues (§C0)
Distinctiveness          8/10  ▓▓▓░  all-even KPI grid weakens the operational focal panel

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
