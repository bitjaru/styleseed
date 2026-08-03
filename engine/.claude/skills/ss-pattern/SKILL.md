---
name: ss-pattern
description: Generate a composed UI pattern from the active StyleSeed grammar and brand recipe using existing primitives.
argument-hint: "[pattern-type] [description]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# UI Pattern Generator

## When NOT to use

- For a single primitive component → use `/ss-component`
- For a full mobile screen → use `/ss-page`
- For an entire multi-page user flow → use `/ss-flow`
- For design tokens and color/spacing decisions → use `/ss-tokens`

Pattern type: **$0**
Description: $ARGUMENTS

## Available Pattern Types

### Layout Patterns
- **focal-summary**: one dominant state, briefing, artifact, or decision
- **panel-section**: aligned workbench panel with related controls and evidence
- **flat-step**: public-service task step with explicit labels, help, and recovery
- **reading-section**: bounded prose, figure, caption, quote, or source group without app cards
- **resource-collection**: rows, table, grid, or sequence selected by the recipe and user job
- **canvas-tools**: focused artifact/canvas with quiet supporting tool groups

### Data Display Patterns
- **data-table**: Table with header and rows
- **detail-card**: Key-value pair display
- **chart-card**: Card wrapper for a Recharts chart
- **ranking-list**: Numbered ranking with highlight

### Interactive Patterns
- **action-sheet**: Bottom sheet with action buttons
- **filter-bar**: Horizontal filter/tab bar
- **search-header**: Search input in header area

## Instructions

1. Read `.styleseed/effective-rules.md` and `.styleseed/manifest.json`. Resolve first when stale.
   Then inspect:
   - `components/ui/` for available primitives
   - `components/patterns/` for existing patterns

2. Compose the pattern from existing components — DO NOT recreate primitives.

3. Follow the selected recipe rather than one default card language:
   - Use `ss-pattern-surface` only when containment is earned.
   - Use `ss-page-gutter` or `ss-page-padding` instead of hardcoded universal gutters.
   - Use `ss-pattern-inset`, `ss-pattern-control`, and `ss-pattern-icon` for recipe-aware shape.
   - Public-service and editorial recipes usually prefer flat flow, rules, and whitespace.
   - Enterprise/developer recipes prefer aligned panels, rows, tables, and compact controls.
   - Calm-consumer may use soft groups; expressive-brand must add a product-specific composition.

4. Use semantic tokens for all visual properties.

5. Make the pattern a reusable component with props for dynamic content.

6. Run `/ss-score` and verify that the pattern has a functional relationship to its page
   instead of being an isolated pretty card.
