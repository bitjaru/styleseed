# Applied color, typography, and critique checks

StyleSeed can inspect declared color consumers and font conditions in the user's existing
browser harness. The supported decision is whether approved tokens and type roles still work
in their actual component, state, background, and content. This preserves project identity;
it does not choose a new palette, rank fonts, or certify expert design quality.

The implementation lives in the single core skill:

- [Applied checks and API example](../engine/.claude/skills/styleseed/workflows/ss-verify/references/applied-checks.md)
- [Read-only browser probe](../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-appearance.mjs)
- [Existing spacing and wrapping probe](../engine/.claude/skills/styleseed/workflows/ss-verify/scripts/inspect-spacing.mjs)

## Behavior and scope

Color bindings specify the actual consumer, property, optional existing token, background,
state, and applicability. Simple opaque pairs produce unrounded contrast results. Decorative
and observed inactive cases can be N/A; a required boundary using a faint color is checked
according to its actual role. Unsupported paint, unobserved focus, ambiguous selectors, and
unknown adjacency cannot silently become passing results. The palette generator's `valid`
continues to mean its declared role pairs passed, not the entire screen.

Typography bindings record declared styles, dimensions, and font-delivery conditions for
project-local specimens. Existing spacing measurements handle no-wrap controls and overflow.
Actual glyph selection, mixed-script optical balance, intentional line breaks, photo relations,
and human acceptance remain separate checks. Missing font delivery is distinguishable from
normal delivery without claiming that CSS family names prove the rendered glyphs.

The audit, review, and visual-verification workflows now record task-based observations before
reconciling automatic aesthetic warnings. Findings include their location, task impact, relevant
contract, smallest repair, preserved choices, and a recheck state. A reviewer who has already seen
scores must label the observation informed, not blind. Code-first functional gates still run.

The same change repairs residual audit and motion contradictions: comparable monitoring areas
need no hero metric; coordinated motion may use purposeful overrides; reduced motion is the
caller's explicit responsibility; meaningful live/loading repetition needs an end condition and
an alternative for reduced motion. It does not change seed motion values or claim every existing
snippet is a complete accessible application. Generated image guidance also preserves the
approved content/brand relationship without a universal accent-area restriction.

## Reproduce the technical checks

After installing demo dependencies and building the demo:

```sh
node scripts/test-applied-checks-browser.mjs
```

The command uses the repository's Playwright and a font already present in the demo build.
It makes no test-time font download and adds no third-party font file to the repository. Its
temporary evidence directory contains captured screens and a report with helper/font hashes.
It exercises normal/long/missing-font/missing-weight specimens in light/dark at 390px and
1440px, plus intentionally broken bindings, faint required boundaries, valid decorative lines,
focus, inactive controls, unsupported paint, nested artifact isolation, and the existing wrapping
inspector. It checks that measurement does not modify the DOM or export form values.

The canonical `--browser` gate and pull-request CI both run this fixture. Existing runtime
instruction regressions also cover the demonstrated audit/motion contradictions and real
resolver media output. All mirrors and archives are generated from canonical skill sources.

These tests establish technical behavior and known diagnostic boundaries. They are not the
human comparison proposed in [the evaluation protocol](DESIGN-JUDGMENT-EVALUATION.md), and
do not establish better aesthetics, reduced rework, or independent critique effectiveness.
The helper is opt-in, does not mutate the page, and does not promote evidence-gate status.
