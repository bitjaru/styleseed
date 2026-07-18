---
name: ss-setup
description: Configure StyleSeed by selecting the output grammar, domain, page type, optional aesthetic profile, and bounded brand tokens before scaffolding a first screen.
argument-hint: "(no arguments needed)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# StyleSeed setup

StyleSeed setup chooses a **design method for the result**, not a favorite brand to imitate.
Read `PRODUCT-PRINCIPLES.md`, `RULESETS.md`, `APP-PLAYBOOKS.md`, `PAGE-TYPES.md`, and
`PRESETS.md` before recommending values.

## When not to use

- Project already has a valid `STYLESEED.md` → use `/ss-update`.
- User supplied references that are not represented by a built-in grammar → run
  `/ss-reference` before setup, then select the compiled grammar.
- One component inside an established system → `/ss-component`.

The method, review, and reference compiler are framework-agnostic. The bundled component
scaffold currently targets React and Tailwind v4; on another stack configure the lock and
apply the method without pretending the scaffold is portable.

## Wizard — one decision at a time

### 1. Product job and surface

Ask what is being built, who uses it, and whether it is a mobile/desktop product, website,
social carousel, slide deck, document/report, or single-frame graphic. Select a surface adapter
from `ADAPTERS.md`, then infer domain and page/artifact type.

### 2. Output grammar

Recommend exactly one grammar from `RULESETS.md` and explain the job match in one sentence:

- `consumer-service`
- `operations-console`
- `technical-instrument`
- `editorial-reading`
- `commerce-conversion`
- `institutional-service`
- `expressive-marketing`
- `sequential-story`
- `reference:<slug>` when `/ss-reference` already compiled one

Do not recommend Toss as the universal default. It is one reference family for
`consumer-service`. If none fits and the user has references, route to `/ss-reference`.

### 3. Page type and domain bias

Confirm the concrete page (dashboard, form, landing, detail, list, settings, onboarding) and
read its domain × page intersection. This controls composition; the aesthetic profile does not.

### 4. Optional aesthetic profile

Recommend one profile from `PRESETS.md` only when it strengthens the product. `none` is a good
default. A profile modifies coordinated visual axes but cannot replace the output grammar.

### 5. Brand and bounded axes

Lock a real brand color if supplied; otherwise propose a domain-fit primary action color. Then
confirm font/language, density, radius, elevation, imagery/data role, and motion inside the
grammar's allowed ranges. Do not use generic indigo or a stale purple mislabeled as Toss.

### 6. Write the design lock

Create `STYLESEED.md`:

```markdown
# StyleSeed — Design Lock
<!-- Selections persist here. This file cannot waive StyleSeed core invariants. -->
- App domain: fintech
- Surface: mobile-app
- Surface adapter: product-ui
- Page type: dashboard
- Output grammar: consumer-service
- Grammar path: built-in:engine/RULESETS.md
- Grammar fallback: consumer-service
- Reference confidence: n/a
- Aesthetic profile: none
- Skin: custom
- Primary action: #3182F6
- Font: Pretendard
- Radius: soft
- Elevation: light=tonal grouping + restrained shadow · dark=tonal ramp + hairline
- Density: comfortable
- Motion: Spring restrained
- Imagery/data role: personal state first; charts only for a decision
- Signature move: one calm contextual briefing above the account summary
- Locked: YYYY-MM-DD
```

For a compiled grammar use its actual path and confidence. Reject unknown enum values rather
than treating the lock as an exemption.

### 7. Scaffold and prove

If the user asked for a first screen, compose core × grammar × domain × page × profile × lock,
build it, run `/ss-score` to the gate floor, and finish with `/ss-verify` when renderable. If
visual rendering is unavailable, disclose that it was skipped.

## Completion report

Report the selected grammar and why, page/domain intersection, optional profile, lock path,
files changed, score, and visual verification status. Mention `/ss-reference` as the path for
future references that need their own grammar.

## Rules

- Ask one question at a time and recommend a concrete default.
- Output grammar is required; aesthetic profile is optional.
- A skin is tokens, not design judgment.
- Never fetch a brand `DESIGN.md` and treat its palette as a complete rule set.
- Never scaffold an unscored first page or claim visual verification without a screenshot.
