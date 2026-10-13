---
name: ss-score
description: Score a visual artifact's implementation quality 0-100 against its composed StyleSeed rule set — category breakdown, evidence, and prioritized fixes.
argument-hint: "[file, directory, or artifact manifest]"
allowed-tools: Read, Grep, Glob, Bash
---

Before this workflow, follow the once-per-session [update preflight](../ss-update/references/update-preflight.md).


# Design Score
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

## Deterministic check boundary

Functional completion is separate from this score. For declared user outcomes, the optional
artifact contract `validation.functional.scenarios` requires executed, passing tests; see
[functional checks](references/functional-checks.md). Missing or skipped outcomes cannot be
offset by appearance points. Plain scoring does not run or attach functional evidence without
an authorized build/test task. An artifact with no functional contract is unverified for
functionality, even when its other gates pass.

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
| **Coherence** | 12 | VISUAL-CRAFT §C0 (repeatable role relationships) |
| **Distinctiveness** | 10 | Golden Rules 14–16 + VISUAL-CRAFT §CC-9b (not generic/default/template) |

## How to score each category

For each category, start at full marks and **subtract** for violations you find by
reading the code. Be specific and evidence-based — cite the line.

Apply deductions only to the selected task, role, and approved project contract.
Name the violated requirement and its applicability; a default example is not a floor.
Unresolved conflicts block a compliance claim rather than inviting silent restyling.
For each finding state the affected task/region, observed failure, contract source, and
valid alternative. Equivalent comparisons may repeat; brand/content palettes can be
multicolored; a local dialog may own an action alongside the page action. Neither a
shape count nor similarity to an award preview earns or loses points by itself.
Code review cannot certify unobserved pixels, responsive behavior, motion, or user outcomes.

**Color discipline (16)** — deduct for: accidental `#000`/`text-black` outside a profile or
approved project or grammar contract that uses hard black structurally (−4 each, cap −8); competing
decorative emphasis hues (−5); **uncontracted emoji replacing functional UI symbols** (−5; user content/reactions are distinct roles); **a normal/OK/"보통" state shown in a status color** instead of
neutral grey when the selected contract requires neutral normal states (−4);
**status color that hides severity hierarchy** (−4; repeated healthy signals in a
monitoring grid are valid when their meaning and anomaly emphasis remain clear);
**unassigned decorative hues** rather than stable roles (−3; rating stars and categorical
data colors are valid when they encode actual meaning in the selected contract);
hardcoded hex where a semantic token exists (−2 each, cap −6); status conveyed by color
alone (−4); **the unlocked default indigo (`#5E6AD2`/`#4F46E5`) used as the accent** instead of
an approved project choice (−4; that same hue is valid when deliberately selected).

**Distinctiveness (10)** — a coherent screen can still read "AI-generated." Deduct for: the
**icon-chip cliché** — a generic Lucide line-icon in an identical pale-tinted rounded-square,
repeated without an information or navigation purpose (−4, §CC-9b); the **StyleSeed demo layout copied verbatim**
(hero+chat / 3-step / feature-grid / pricing) with no product-specific identity (−4); **missing task-appropriate
attention** — equal emphasis hides the current priority (−3; equivalent comparison regions may share weight); the hero shows a
stock/placeholder visual instead of *this* product (−3); the **escape hatch as a new uniform**
(§CC-9c) — ghost 01/02/03 index numbers on every section, or identical uppercase-overline +
big-number cards repeated without a task reason (−2). Beige, serif, dark surfaces,
and repeated functional controls are not violations by themselves. Judge fit and
product-specific content, not fashion or novelty; do not demand decorative variety
in operational tables or regulated forms. Cap −10.

**Hierarchy & typography (16)** — deduct for: value/unit hierarchy contradicting the selected
grammar (−4; compact/tabular and prose-like relationships are valid when specified); type roles
that drift from the compiled contract or CSS that renders the wrong size (−5); everything the
same weight, no clear primary (−5); cramped or wrong line-height on body (−3);
**body type that violates the approved role scale or is unreadable in the actual
task/viewport** (−4). There is no universal 16px desktop floor: a documented 14px
productive scale can be valid. Verify measure, zoom/reflow, script, contrast, and
reading distance; do not exempt unreadable content merely because a token is approved.

**Layout & rhythm (12)** — deduct for: grouping that contradicts the selected grammar or recipe (−6):
`operations-console` needs explicit functional groups, while `editorial-reading` should not be
forced into cards; `enterprise-workbench` needs aligned panels/rows while `public-service`
needs flat step flow; unexplained spacing drift outside approved tokens/optical or platform adjustments (−3); same section type repeated without purpose
(−4); no discernible proximity rhythm (−3).

**Cards & elevation (10)** — deduct for mixed or task-inappropriate surface language. Hairlines,
flat grouping, tonal ramps, or restrained shadows are valid only when the selected grammar/profile
uses them coherently. Deduct unexplained surface-role drift (−4), shadows that obscure content
or contradict the approved material/depth language (−4), or missing required separation (−5).
A border defining an overlay's edge and a shadow communicating its layer may coexist.
Do not score by shadow-layer count, equal padding, or a blanket soft-shadow preference.

**States & a11y (18)** — deduct for: missing empty/loading/error state on a data
surface (−5 each, cap −10 — a static mockup or marketing landing with NO data surface is
**N/A**: skip these deductions, don't fail the category); contrast below 4.5:1 body / 3:1
large (−6); touch target < 44px on a touch surface (pointer-first desktop controls at
36–40px are fine) (−4); no visible focus / `outline:none` (−5); icon-only control
without `aria-label` (−3).

**Motion & interaction (6)** — deduct for: motion without a task purpose or with timing/easing
that drifts from the approved project roles (−3); motion that delays content or blocks an action (−4); no
`prefers-reduced-motion` handling on custom motion (−3). **Scroll-linked/parallax/3D/animated-
gradient is SURFACE-DEPENDENT (§43):** on an app/dashboard/data/form surface it's forbidden
(−5); on a **marketing/landing/brand page it's ALLOWED (the Cinematic tier)** — there, do NOT
deduct for scroll-linked reveals, pinned sections, 3D hero, or animated backgrounds; only deduct
for **scroll-JACKING** (hijacking scroll / trapping) (−5), motion that hides content until scroll
or delays the headline/CTA (−4), or a missing `prefers-reduced-motion` fallback (−3). Judge by
page type and purpose first, then score. A built-in seed is an optional implementation;
an approved project fade or instant state change can be valid. A named seed is not proof
of motion quality; temporal claims require observed interaction.

**Coherence (12)** — repeatable role relationships (VISUAL-CRAFT §C0). Deduct for
each axis that drifts from the selected system: radius roles that contradict the recipe (−5;
do not penalize recipe-approved surface/control differences); two+ competing accent hues used
for emphasis (−4); mixed shadow languages / light directions (−3); mixed icon
families or unexplained optical/state drift (−3; coordinated outline/filled state variants are valid); nested contours that violate the recipe's geometry
(−2; concentric rounded rectangles normally use `max(0, outer − padding)`); unexplained control-height drift
(−2). Use evidence of system-wide consistency; this score is not a validated predictor
of professional quality or whether an AI made the interface.

Clamp each category at 0. Sum to a total.

## Output format

```
## Design Score: 69 / 100   (src/app/Dashboard.tsx)
Rule set: operations-console × product-ui × SaaS × dashboard × enterprise-workbench × swiss

██████████████░░░░░░░░  D

Color discipline      11/16   ▓▓▓░  competing orange+blue emphasis hues (l.28-34)
Hierarchy & typography 12/16  ▓▓▓▓  unit contrast hides the currency in the summary (l.18)
Layout & rhythm         8/12  ▓▓▓░  decorative KPIs push urgent orders below the working view (l.22-31)
Cards & elevation       6/10  ▓▓░░  same-role panels use unrelated depth treatments (l.22)
States & a11y          13/18  ▓▓░░  orders list lacks an empty state (l.55)
Motion & interaction    3/6   ▓▓▓░  approved timing role overridden without purpose (l.44)
Coherence               9/12  ▓▓░░  equivalent navigation icons mix unrelated families (l.48)
Distinctiveness          7/10  ▓▓▓░  generic placeholder imagery obscures the product (l.62)

### Fix first (highest score gain)
1. Add the missing orders empty state and restore readable currency → +5 states, +4 hierarchy
2. Separate action/color roles and restore useful operational priority → +5 color, +4 layout
3. Restore consistent panel depth; preserve justified overlay boundaries → +4 cards

Expected gains are estimates; run a new review after repairs before reporting a new score.
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
