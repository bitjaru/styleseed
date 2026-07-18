---
name: ss-build
description: Build a screen with StyleSeed's composed design method — choose or compile an output grammar, apply domain/page/profile/lock constraints, then run the code and pixel gates before presenting.
argument-hint: "[what to build]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# Build with the composed StyleSeed method

The build method is the product. Score and screenshots are auxiliary evidence, not the source
of design judgment.

## Step 1 — Establish the rule set before code

Read `PRODUCT-PRINCIPLES.md` and `ADAPTERS.md`. If `STYLESEED.md` exists, validate its values and referenced
grammar. If it does not, run `/ss-setup` and write it before UI code.

If the user supplied a visual reference that the selected built-in grammar does not capture,
run `/ss-reference` first. Never reduce an unfamiliar reference to a palette swap.

## Step 2 — Compose, do not improvise

Read and combine in authority order:

1. core invariants in `PRODUCT-PRINCIPLES.md`;
2. selected built-in grammar in `RULESETS.md`, or compiled `RULESET.md`;
3. selected surface adapter in `ADAPTERS.md` and its companion renderer contract;
4. matching `APP-PLAYBOOKS.md` domain and `PAGE-TYPES.md` page/artifact type;
5. optional aesthetic profile in `PRESETS.md`;
6. bounded values in `STYLESEED.md`;
7. detailed craft in `DESIGN-LANGUAGE.md` and `VISUAL-CRAFT.md`.

Before code, state the effective rule set in one line, for example:

```text
operations-console × SaaS × dashboard × swiss × locked brand tokens
```

Resolve conflicts by authority. A profile or lock cannot waive task fitness, coherence, or
accessibility.

## Step 3 — Build with design judgment

- Make the grammar's user job and primary decision visible in the first viewport.
- Establish one focal point; avoid equal-weight template grids.
- Use the grammar's composition, density, type, color, surface, imagery/data, action, state,
  responsive, and motion contracts.
- Use product-specific content and evidence. Never copy the StyleSeed demo or a reference screen.
- Implement loading, empty, error, focus, reduced-motion, and responsive behavior where relevant.

## Step 4 — Code gate loop

Run `/ss-score` on the actual implementation. The score must name the effective rule set and
check both core invariants and grammar-specific tells. Fix the highest-gain failures and
re-score, up to roughly three passes, until ≥80. If it cannot pass, report the real blocker.

## Step 5 — Pixel gate loop

For every renderable artifact, invoke `/ss-verify`: use the adapter renderer, inspect every
required viewport/frame/page and relevant state, fix perceptual failures, and re-render. If no renderer
is available, say the visual gate was skipped; never imply it passed.

## Step 6 — Present with proof

Report:

- effective rule set and why it fits;
- final code score;
- visual verification status and viewport;
- material fixes made by the gates;
- `STYLESEED.md` and any compiled grammar path.

## Rules

- Grammar before code; code gate after build; pixel gate last.
- Output grammar is functional. Aesthetic profile is optional and never substitutes for it.
- The primary action must remain identifiable; additional color is permitted only where the
  grammar gives it stable semantic or categorical meaning.
- Re-read the lock and grammar on every UI change.
