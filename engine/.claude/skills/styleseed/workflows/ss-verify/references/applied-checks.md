# Verify a design decision in its real use

Use this reference for color, typography, and critique inside the selected artifact's existing
verification workflow. Preserve the approved tokens, components, content, and type roles.
These are scoped diagnostic procedures, not new palette modes, mandatory fonts, or design scores.
The decision owner defines the task and acceptable variation; the agent records implementation
and rendered evidence. A passing contrast pair or matching style does not establish good design.

## Select a small, relevant specimen

Use project-owned fixtures, component stories, or a disposable harness with approved content.
Never change real user data to manufacture a state. Start with a few relationships that matter
to the task; do not expand every screen into an exhaustive Cartesian product.

Record the artifact/method revision, implementation and token revision, route, required viewport,
theme, state, specimen ID, font condition, and screenshot/sequence. The host owns provenance and
readiness; the probe below cannot authenticate a running server or bind source hashes itself.
Keep private text in the project. The probe exports selectors, CSS/font metadata, and measurements,
not text, input values, screenshots, or tokens to a service.

| Decision | Useful variation | A valid counterexample |
|---|---|---|
| Is the required action/state identifiable? | Actual default/focus/selected/error state; light/dark only if supported | A decorative divider need not satisfy the same contrast requirement as the only identifying input boundary |
| Does the approved type system survive real copy? | Normal/long Korean and English, mixed numerals/units, font unavailable or weight missing | A deliberately multiline heading or approved script fallback is not a defect |
| Does image placement preserve reading? | Actual image, changed focal crop, image unavailable | Text on an opaque panel separate from the image does not need image-pixel contrast analysis |
| Does a reference relationship transfer? | Same job and lock with changed copy, media, or state | Different line counts/layouts can preserve the same hierarchy; a visually similar form can still hide recovery |

## Color: inspect the consumer, state, and background

The palette generator validates only its declared role pairs. Its `valid` flag is not an audit
of actual CSS, states, boundaries, or media. Bind an existing consumer and the real adjacent or
underlying surface. Name why the color is required for reading/identification, or why it is N/A.

The installed `scripts/inspect-appearance.mjs` exports a self-contained `inspectAppearance`
function for the project's existing browser harness. It navigates nowhere and changes nothing.
Pass explicit bindings scoped to one `data-styleseed-artifact` root. Each selector must match
exactly once inside that artifact, excluding nested artifacts. Up to 50 total bindings are allowed.

```js
import { inspectAppearance } from '<installed-ss-verify>/scripts/inspect-appearance.mjs';
// The host first prepares the authorized fixture/state and waits for the intended font condition.
const observation = await page.evaluate(inspectAppearance, {
  artifactId: 'settings',
  context: { theme: 'light', state: 'default', specimen: 'long-ko-en', fontCondition: 'normal' },
  colors: [
    {
      id: 'help-copy', role: 'text', reason: 'Instructions needed to recover from input errors',
      foreground: { selector: '.help', property: 'color', token: '--help-text' },
      background: { selector: '.panel', token: '--panel-bg' },
    },
    {
      id: 'input-edge', role: 'required-boundary', reason: 'This edge identifies the editable field',
      foreground: { selector: '#team-name', property: 'borderTopColor', token: '--input-border' },
      background: { selector: '.panel', token: '--panel-bg' },
    },
  ],
  typography: [
    { id: 'help-type', selector: '.help', role: 'input-help', sampleId: 'long-ko-en' },
  ],
});
```

Color roles are `text` (4.5:1), `large-text` (3:1, checks the applicable CSS size/weight),
`required-boundary`, `focus`, `state-cue` (3:1), or `decorative`/`inactive` (N/A with a reason).
These encode a reviewer's explicit applicability decision, not an automatic semantics detector.
Inactive must actually be disabled/aria-disabled; focus must be visibly focused in the captured
state. Check functional and non-color cues separately. The helper checks contrast, not focus
area/thickness, keyboard behavior, or whether a declared boundary is sufficient to identify a control.

Foreground properties: `color`, `backgroundColor`, four `border*Color` sides, and `outlineColor`.
The background is an explicitly selected element's `backgroundColor`, either the consumer itself
or an ancestor. Optional `token` names compare the consumer with an existing CSS custom property.
Only opaque sRGB pairs and hex/rgb token values are computed; transparent intermediate surfaces
may be traversed but an intervening opaque surface prevents a guessed ancestor comparison.
Ratios are compared without rounding. A decorative line is not made darker just to clear a test.

Images/gradients, opacity, shadows, filters, blends, masks, generated pseudo-elements, transformed/hidden
elements, unsupported token expressions, and unproven adjacency return `unsupported`. This is a
request for appropriate inspection, not a defect in valid CSS. Rich text needs leaf bindings.
The probe does not detect arbitrary occluding siblings, sample photographs, or prove all painted
pixels are represented by CSS. Inspect screenshots and the actual relevant image crop; do not
use a photograph's average color as the background behind text. An opaque text panel can be a
valid solution, but applying the same overlay to every image is not a rule.

`colorChecks[].status` applies to that declared pair only. Overall `observed` means requested
measurements completed, not visual/functional/human acceptance. Unknown/unsupported checks stay
unresolved; never translate them into a visual pass. Reports are local diagnostics and do not
automatically promote the evidence gate or replace the existing visual report.

When allocation is the actual question, keep palette values and content fixed and compare a
small number of valid area/placement alternatives. Record which reading/action relationship
improves and what it costs. Area is a descriptive observation, not a universal percentage or score.

## Typography: actual copy and font delivery

Use the approved families and roles. Include only representative samples: a long organization
name, mixed Korean/Latin label, currency/unit string, or recovery message when relevant. In an
authorized disposable fixture, simulate unavailable fonts or missing weights; do not alter a
production font connection or fetch unapproved fonts for a test.

The probe records computed type styles, box dimensions, font-set readiness and matching declared
FontFace statuses. It does not identify the actual face used for every glyph. A font-family string,
`document.fonts.status === 'loaded'`, or an empty matching FontFace list does not prove the intended
font rendered. A face with `error` may explain the fallback; a loaded Latin face does not establish
Korean glyph coverage or a requested weight. Record unresolved fallback/synthetic weight as unknown.

Reuse `inspect-spacing.mjs` and its existing `noWrapControls` for line-count/overflow observations
when a spatial contract applies. Only bind controls whose copy is intended to stay on one line.
Do not duplicate those measurements or shrink the font to hide a width/layout defect. For other
roles, inspect the screenshot/actual text layout instead of enforcing one global line count.

Compare normal/long copy at required widths and supported zoom, and normal/fallback delivery
only when relevant. Read the actual sentence: mixed-script weight, punctuation, numeral alignment,
line breaks, clipping, and the relationship to images. Optical suitability remains a visual/human
judgment. Different scripts need not have identical metrics, and typography must not be reduced
to a font popularity list or fixed Latin measure.

## Observe before reconciling

1. Read the task and approved contract. Record the actual render's reading/action order, evidence,
   and any confusing relationship before using automatic aesthetic warnings to choose findings.
   Critical functional/accessibility failures can be fixed first; do not postpone them for blinding.
2. Add the code/contrast/token/state evidence. If warnings or scores were already visible, mark
   the observation as informed rather than claiming independent or blind review.
3. Reconcile each finding: **location/render ID → observation → task impact → applicable contract
   → minimum repair → choices to preserve → state to recheck**. Include disagreements and N/A.
4. Choose the repair level: token mapping, shared component, information/interaction structure,
   or local implementation. A detected shape/font/palette alone is not grounds for redesign.
5. After an authorized repair, rerender the affected specimen. Report remaining unknowns and
   the evidence boundary. A direct inspection does not authorize fixes, extra agents, or paid runs.

Keep code-first build gates for inexpensive functional/contract failures. The procedure above
separates perceptual observations from automated aesthetic suggestions; it does not require a
second agent, a new score, or a claim of independent human evaluation. To compare review methods,
use fixed normal/defective cases and record false positives, useful findings, rework, and cost.
No effectiveness claim follows from agreeing with the checklist.

## Reference transfer

Use the existing reference compiler's provenance, two valid variants, counterexample, and held-out
screen. Tie each proposed relationship to a specific source version and an actual specimen. Change
one relevant input (copy length, photo crop, missing data) while preserving the job and approved
system. Record why the relationship survives or fails; do not score source-screen similarity.

## Sources and execution

This procedure is independently authored. Source observations and exclusions are documented in
the repository's research; no external skill/code is required at runtime.

- [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): applicability and exceptions.
- [Radix color roles](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale): consumer/state mapping.
- [Impeccable typeset](https://github.com/pbakaus/impeccable/blob/245ad82def45831dc56a21b683c7a1ff530b06cc/skill/reference/typeset.md)
  and [critique](https://github.com/pbakaus/impeccable/blob/245ad82def45831dc56a21b683c7a1ff530b06cc/skill/reference/critique.md): specimen conditions and observation separation.

Repository maintainers can run `node scripts/test-applied-checks-browser.mjs` to exercise the
shipped helper, real font delivery, existing spacing inspector, valid counterexamples and injected
defects at narrow/wide widths. This is a technical regression fixture, not the proposed human
design-quality comparison. Required human review/budgets remain governed by the evaluation protocol.
