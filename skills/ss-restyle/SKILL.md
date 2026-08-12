---
name: ss-restyle
description: Apply one optional StyleSeed aesthetic profile without changing the selected output grammar, product job, or core design judgment.
argument-hint: "<profile> — swiss | editorial | technical | warm-dtc | minimal-mono | brutalist-lite | none"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Apply an aesthetic profile

Read `PRODUCT-PRINCIPLES.md`, `RULESETS.md`, `PRESETS.md`, and `STYLESEED.md`. Profiles are
coordinated visual axes; output grammars organize attention, information, and action. Keep them
separate.

## Workflow

1. Validate that the lock has one output grammar. If not, run `/ss-setup` first.
2. Select exactly one profile from `PRESETS.md`, or `none`. Never stack profiles.
3. Apply its coordinated radius, density, type, palette temperature, elevation, motion,
   composition accent, and signature move **inside the output grammar's allowed ranges**.
4. Preserve deliberate brand values and required fonts when compatible. If incompatible, the
   output grammar and core invariants win; explain the conflict.
5. Update `Aesthetic profile` and affected bounded values in `STYLESEED.md`. Do not rewrite the
   output grammar or a reference-compiled rule set.
6. Run `/ss-score` to ≥80 and `/ss-verify` if renderable. Report the complete effective rule set,
   not just the profile name.

## Rules

- A profile is optional appearance coordination, not a design-method exemption.
- `technical` profile does not turn a commerce page into an observability console.
- `editorial` profile does not justify unreadable serif body in a transaction workflow.
- `brutalist-lite` still requires coherent states, contrast, and one border language.
- Use `/ss-dial` for one-axis changes and `/ss-reference` for a new evidence-derived language.
