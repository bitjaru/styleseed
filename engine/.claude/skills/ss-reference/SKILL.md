---
name: ss-reference
description: Compile screenshots, URLs, Figma exports, or an existing UI into a project-local StyleSeed output grammar with evidence, tokens, confidence, anti-patterns, and a validation screen. Use when the user supplies a design reference that StyleSeed does not already model.
argument-hint: "[reference paths or URLs] [--name slug]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# Compile references into a design grammar

Do not merely imitate the supplied screen. Read `PRODUCT-PRINCIPLES.md`, `RULESETS.md`,
`ADAPTERS.md`, and `REFERENCE-COMPILER.md`, then execute the compiler pipeline in full.

## Workflow

1. Ingest every supplied reference and assign evidence IDs (`R1`, `R2`, ...). If a URL can be
   rendered, capture it. If an image cannot be seen, stop claiming visual analysis for it.
2. Separate references by surface adapter and job. Do not merge a marketing homepage with an app
   dashboard unless the user explicitly wants both languages connected.
3. Observe and measure the twelve axes. Every rule cites evidence IDs and a confidence level.
4. Resolve contradictions instead of averaging them. Explain any material choice briefly.
5. Choose the nearest built-in fallback grammar and adapter, then compile the project artifacts required by
   `REFERENCE-COMPILER.md` under `.styleseed/rulesets/<slug>/`.
6. Update `STYLESEED.md` to select `reference:<slug>` while preserving bounded brand choices.
7. Validate transfer: apply the grammar to one representative screen not present in the source
   set, run `/ss-score`, then `/ss-verify` if renderable. Fix and repeat to the gate floor.
8. Report what was learned, what remains low-confidence, where the artifacts live, and the
   validation result.

## Rules

- Visible evidence before adjectives. “Calm” is not a rule; the spacing, type, color, hierarchy,
  and motion decisions that create calm are rules.
- Never copy protected assets, brand marks, or prose.
- One reference produces a provisional grammar. Say so and keep confidence low where warranted.
- The generated grammar is project-local. Do not edit `RULESETS.md` or publish it as built-in.
- Core invariants and accessibility remain non-negotiable.
