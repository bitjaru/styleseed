---
name: ss-score
description: Score a visual artifact's implementation quality 0-100 against its composed StyleSeed rule set — category breakdown, evidence, and prioritized fixes.
argument-hint: "[file, directory, or artifact manifest]"
allowed-tools: Read, Grep, Glob, Bash
---

# Design Score
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

## Deterministic check boundary

For the executable contract and stable diagnostics, run the canonical checker:

```bash
node <installed-ss-score>/scripts/styleseed-check.mjs scan \
  --project-root . --artifact <artifact-id> --format json
node <installed-ss-score>/scripts/styleseed-check.mjs scan \
  --project-root . --artifact <artifact-id> --format sarif --out .styleseed/evidence/<artifact>/<run>/deterministic.sarif
```

The checker revalidates the artifact manifest, bundle/output hashes, declared source roots, and
project containment before scanning. Contract/path/hash/coverage failures are hard errors. Source
detectors are warning-only until their fixture precision is measured and a maintainer promotes them.
Stable detector IDs are `SS001` hardcoded colors, `SS002` arbitrary pixel values, `SS003`
`transition-all`, `SS004` motion without reduced-motion handling, `SS005` focus suppression, and
`SS006` high-confidence unlabeled icon controls. A deterministic JSON report contains only
`detectorRevision`, `inventoryHash`, and sorted `findings`, so it can be attached to the evidence
gate without caller-supplied pass claims.

Within an authorized evidence-writing/build task, attach the generated JSON through the same
typed gate path as other reports. Plain scoring reports findings without attaching evidence:

```bash
node <installed-ss-score>/scripts/evidence-gate.mjs attach \
  --project-root . --artifact <artifact-id> --run <run-id> \
  --gate deterministic \
  --report .styleseed/evidence/<artifact-id>/<run-id>/deterministic.json
```

`/ss-review` tells you *what's wrong*. `/ss-score` tells you *how good it is
overall* and *what to fix first* — a single number plus a category breakdown, so
you can track UI quality like you track test coverage.

## When NOT to use

- For a quick pass/fail before committing → use `/ss-lint`
- For a full prose audit and recommendations → use `/ss-review`; applying fixes is a separate, authorized implementation step
- For logic/config with no visual artifact — scoring is meaningless

## Step 0 — Resolve the effective rule set

Before scoring, apply the registry-first artifact boundary above. Registry projects read
`.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`; check with
`ss-resolve --artifact <artifact-id> --check`. A partial or invalid registry is an error, never
a reason to use the legacy bundle or source handbook.

Legacy projects without a registry read `.styleseed/effective-rules.md` and
`.styleseed/manifest.json`, using `ss-resolve --from-lock STYLESEED.md --check`. If the selected
bundle is missing or stale, plain scoring reports missing evidence without regeneration.
Within an authorized build/fix task, invoke `/ss-resolve` or `$ss-resolve` from the corresponding
project-owned configuration first. With no registry or lock, resolve the intended scope with
the user before making a project-specific compliance claim.

Score in authority order: core invariants first, then the exact output grammar, domain/page,
brand recipe, optional aesthetic profile, and bounded lock values. The lock cannot waive an invariant.
Unknown values are a resolver error; do not invent an exception.

The output must name the effective rule set, for example:

```text
Rule set: operations-console × SaaS × dashboard × enterprise-workbench × swiss
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

**Hierarchy & typography (16)** — deduct for: value/unit hierarchy contradicting the selected
grammar (−4; compact/tabular and prose-like relationships are valid when specified); type roles
that drift from the compiled contract or CSS that renders the wrong size (−5); everything the
same weight, no clear primary (−5); cramped or wrong line-height on body (−3);
**body < 16px on a desktop/web B2B surface** (tight mobile scale on a wide screen) (−4 —
but dense-data chrome is exempt: chart ticks, mono SHAs/timestamps, table metadata at
12–13px are correct; and dashboard app-chrome h1 at 22–24px is correct, not a violation
of the marketing 40–56px headline scale).

**Layout & rhythm (12)** — deduct for: grouping that contradicts the selected grammar or recipe (−6):
`operations-console` needs explicit functional groups, while `editorial-reading` should not be
forced into cards; `enterprise-workbench` needs aligned panels/rows while `public-service`
needs flat step flow; arbitrary off-scale spacing (−3); same section type repeated without purpose
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
each axis that drifts from the selected system: radius roles that contradict the recipe (−5;
do not penalize recipe-approved surface/control differences); two+ competing accent hues used
for emphasis (−4); mixed shadow languages / light directions (−3); mixed icon
families, fill modes, or stroke weights (−3); nested contours that violate the recipe's geometry
(−2; concentric rounded rectangles normally use `max(0, outer − padding)`); unexplained control-height drift
(−2). This is the category that most predicts "looks AI-generated" — weight evidence
of system-wide consistency, not per-component prettiness.

Clamp each category at 0. Sum to a total.

## Output format

```
## Design Score: 70 / 100   (src/app/Dashboard.tsx)
Rule set: operations-console × product-ui × SaaS × dashboard × enterprise-workbench × swiss

████████████████░░░░░░  C-

Color discipline      11/16   ▓▓▓░  competing orange+blue emphasis hues (l.28-34)
Hierarchy & typography 13/16  ▓▓▓▓  number/unit 1:1 on hero (l.18)
Layout & rhythm         9/12  ▓▓▓░  two identical KPI rows (l.22-31)
Cards & elevation       8/10  ▓▓░░  mixed border + floating-shadow language (l.22)
States & a11y          11/18  ▓▓░░  no empty/loading state; focus ring missing (l.55)
Motion & interaction    4/6   ▓▓▓░  default fade, not a named seed
Coherence               6/12  ▓▓░░  control shape drifts from enterprise-workbench (l.48); competing accents
Distinctiveness          8/10  ▓▓▓░  all-even KPI grid weakens the operational focal panel

### Fix first (highest score gain)
1. Add empty + loading states to the orders list       → +7 states (§71)
2. Restore locked control geometry and primary-action hierarchy → +9 coherence+color
3. Restore recipe-bound hairlines; remove unrelated floating shadows → +4 cards

Re-score after: ~92 / 100.
```

Use letter bands: 90+ A · 80-89 B · 70-79 C · 60-69 D · <60 F.

## Gate mode (use this as the Quality Gate before showing the user UI)

Gate mode applies within an authorized build or fix task. Plain scoring stays read-only with
respect to implementation and configuration. A low score is not permission to begin editing.

1. Score the just-generated UI.
2. If **< 80**, return findings to the authorized implementation step, then re-score after fixes.
   `/ss-review` can explain findings but is read-only; it is not the editing step.
3. Stop when ≥ 80 or after at most three fix-and-re-score passes. Do not restart the budget
   by switching skills. Stop earlier on a permission boundary or an unavailable dependency.
4. Report the actual score, fixes, and unresolved failures even when the gate did not pass.
   Label incomplete work as failed or blocked, not accepted or ready to ship.

The pass bar is a **floor, not a ceiling** — get to ≥ 80 and stop; don't chase 100. Reporting
a failed gate is required and is not a release approval. A passing aggregate score does not
waive core failures or establish human acceptance.

## Rules

- **Read the file** — score from real evidence (line numbers), never guess.
- Address broken required flows and accessibility/core failures first, then prioritize remaining
  improvements by impact and effort. Do not optimize the number at the expense of the contract.
- For a directory, print a one-line score per file, then the lowest-scoring file's
  full breakdown.
- Don't auto-edit in plain scoring. `/ss-score` measures and `/ss-review` recommends;
  the authorized implementation step owns edits in Gate mode.
- As a *gate*, ≥ 80 is required for a passing claim, not for reporting a failed result.
  Do not delay completion by chasing 95→100 after the required checks pass.
