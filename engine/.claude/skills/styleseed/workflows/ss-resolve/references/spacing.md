# Spatial rhythm: recommend, persist, implement, inspect

The expert decision supported here is **which content belongs together and how much separation
its task needs**, scoped to a project or artifact. Rhythm also depends on column width, type,
repetition, media, and state transitions; this contract controls whitespace only.

## Start from the task and existing system

Before recommending values, identify the information groups, repeated comparison units, reading
width, and narrow/wide transformations. Read `implementation.tokenFiles` and the components that
own the existing gaps. Map approved project tokens instead of replacing them with a preset.
A settings form should keep label/help/input together; a comparison table should retain regular
rows; a narrative can separate changes of argument. Variation is not mandatory decoration.

The installed CLI emits a **read-only starting proposal** for a registry product UI:

```bash
node <installed-ss-resolve>/scripts/recommend-spacing.mjs --project-root . --artifact settings
```

It preserves explicitly configured roles and suggests missing ones from grammar, page, and density.
Without `--measurement`, it does not read or understand implementation CSS or measure a page.
It never writes config or grants approval. `measurementStatus: not-supplied` identifies this boundary.
Its numbers are heuristics for a new system, not expert-calibrated recommendations. For an existing
system the agent must inspect actual tokens first. Explain the tradeoff: more separation exposes
groups but reduces visible content; compact spacing supports scanning but may flatten hierarchy.

## Optional registry configuration

Both `.styleseed/project.json` and `.styleseed/artifacts/<id>.json` accept a top-level `spacing`:

```json
{
  "spacing": {
    "wideMinWidth": 1024,
    "roles": {
      "pageInset": { "base": 16, "wide": 32 },
      "sectionGap": { "base": 32, "wide": 48 },
      "groupGap": { "base": 24 },
      "stackGap": { "base": 8 },
      "inlineGap": { "base": 8 },
      "componentInset": { "base": "var(--space-card)" }
    }
  }
}
```

| Role | Owns | Avoid |
|---|---|---|
| `pageInset` | Page's outer horizontal padding | Applying it again on every nested panel |
| `sectionGap` | Independent sections | Separating a label from its control |
| `groupGap` | Groups inside a section | Treating every line as a new group |
| `stackGap` | Closely related vertical items | Using it for every major page boundary |
| `inlineGap` | Related horizontal items | Shrinking hit targets to reduce whitespace |
| `componentInset` | Interior of a containing component | Padding uncontained text just for consistency |

Values are CSS pixels (`0..256`, including fractions) or one existing `var(--project-token)`.
No arbitrary CSS, fallback expression, negative length, or unknown role is accepted.
The `--ss-space-*` namespace is engine-owned and cannot be referenced as a project token; this
prevents generated aliases from referencing themselves or each other. Use project-native names. Variable
resolution and suitability require browser checks; syntactic validity alone is not compliance.
`wideMinWidth` is `320..3840` CSS pixels, default 768, and should match the project's layout
transition. Only two states are represented in v1; additional breakpoints remain implementation
work and must be reported rather than silently discarded.

Only declared roles are controlled. Omitted roles keep their project-native implementation values;
undeclared engine aliases are unset on each artifact root. For such roles, consume a native token
directly or explicitly use `var(--ss-space-section-gap, var(--project-section-gap))`. Never depend
on an undeclared engine alias without a native fallback. An artifact
replaces each named project role **as a whole**; if its `wide` is omitted, base applies at all
widths instead of retaining an old project wide value. Removing the artifact role restores
project inheritance; removing both leaves that role uncontrolled. An artifact breakpoint override
applies to all its effective responsive roles, so inspect inherited roles when changing it.
Project defaults apply only to `product-ui`; an explicit artifact spacing contract on another
adapter is rejected. Legacy `STYLESEED.md` does not gain a new parsed spacing field: preserve its
existing tokens and record changes in its project-owned implementation, or use the separately
reviewed migration workflow. Never migrate merely to make a spacing adjustment.

## A focused change

Request: “Give the sections more room; leave the cards alone.”

1. Resolve the target artifact; inspect its current section and component tokens.
2. Change only `artifact.spacing.roles.sectionGap`, for example `{ "base": 40, "wide": 56 }`.
   These are illustrative values, not a universal requirement. Leave density and other roles intact.
3. Recompile with `resolve-context.mjs --project-root . --artifact <id> --agent <agent>`.
4. Read the `spacing` section of the compiled bundle. Copy its scoped CSS into the project's
   existing token stylesheet and consume variables on the relevant container; the resolver does
   not modify application CSS. Attach `data-styleseed-artifact="<id>"` to its root.
5. Map `--ss-space-section-gap` to that container's gap. Keep internal padding mapped to its
   existing token or `--ss-space-component-inset`. Never use a broad selector for all `div`s.
6. When removing a role or contract, remove its previously copied CSS/usage or restore the
   inherited mapping; stale copied styles are not automatically deleted by the compiler.
7. Re-run the affected code and rendered gates. Method hashes include the effective spatial
   contract; an effective change invalidates prior evidence. Other artifacts retain their roles.

The CSS in the bundle supplies variables, not a layout template. CSS inheritance still exists:
the generated low-specificity boundary rule unsets engine aliases on descendant artifact roots,
including roots without their own spacing contract. Explicit child values win regardless of
stylesheet order. Native project variables remain inherited; they are never reset. Recompile and
replace the old CSS blocks in every affected implementation to adopt this behavior. Fixed frame/print renderers need their own units and constraints.

## Inspect the result

At narrow and wide required viewports, measure the actual gap/padding and verify existing token
references resolve. Check related elements remain grouped, repeated rows align, nested containers
do not multiply insets, long/Korean text wraps, and loading/error states keep useful structure.
Use actual content, not blank rectangles. A numeric match proves application of the contract,
not attractive rhythm. Retain screenshots and name unresolved visual or human judgments.

Density is `compact → comfortable → spacious`. It is a qualitative starting posture. Explicit
spatial roles are not multiplied when density changes, and font size, line-height, reading measure,
and hit targets are independent decisions. Do not impose one fixed gutter or one 8px grid on an
approved project scale.


## Rendered inspection and measurement-aware advice

Use the installed `ss-verify/scripts/inspect-spacing.mjs` exported function in the project's
existing Playwright/browser harness. It does not install a browser or navigate to a site. The host
owns the authorized URL, readiness, required states/viewports, and screenshots. Do not run a new
browser against production or invoke user actions merely to collect spacing measurements.

Bind each **declared** role to its actual consuming element and CSS property. Selectors are scoped
to the named artifact root and exclude nested artifacts. One mapping per declared role is the
minimum; include repeated consumers and both inset sides where the artifact requires them. The
inspector reports missing coverage, absent elements, unresolved/negative tokens, non-layout gap
containers and mismatched computed values as failures. Hidden/transformed elements and token
expressions it cannot resolve are `unsupported`, never passing. Supported token lengths are px,
rem, em, and unitless zero. `calc`, `clamp`, percentages and other units require separate inspection.
A valid CSS expression is not invalid design merely because this inspector cannot resolve it.

Example within an existing Node browser harness (replace installed paths and bindings with the
actual project; all 23 core skills are needed for source-bound measurement support):

```js
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { loadProjectRegistry } from '<installed-ss-resolve>/scripts/project-registry.mjs';
import { defaultCatalog } from '<installed-ss-resolve>/scripts/compiler.mjs';
import { effectiveSpacing } from '<installed-ss-resolve>/scripts/spacing-contract.mjs';
import { spacingSnapshot } from '<installed-ss-resolve>/scripts/spacing-measurement.mjs';
import { inspectSpacing } from '<installed-ss-verify>/scripts/inspect-spacing.mjs';
const registry = loadProjectRegistry(process.cwd());
const artifact = registry.artifactMap.get('settings').artifact;
const snapshot = () => {
  const live = loadProjectRegistry(process.cwd());
  return spacingSnapshot(process.cwd(), live.project, live.artifactMap.get(artifact.id).artifact, defaultCatalog.engineRevision);
};
const before = snapshot();
await page.evaluate(() => document.fonts.ready);
const result = await page.evaluate(inspectSpacing, {
  artifactId: artifact.id,
  spacing: effectiveSpacing(registry.project, artifact),
  bindings: [
    { role: 'sectionGap', selector: '.sections', property: 'rowGap' },
    { role: 'componentInset', selector: '.card', property: 'paddingLeft' },
    // Supply mappings for ALL other declared roles and relevant consumers.
  ],
  noWrapControls: ['button.primary'], // Only controls whose copy is intended to stay on one line.
});
assert.deepEqual(snapshot(), before, 'Implementation changed during capture');
writeFileSync('.styleseed/spacing-mobile.json', JSON.stringify({ ...result, provenance: before }, null, 2), { flag: 'wx' });
```

Use a fresh report filename for every run; keep evidence outside `implementation.sourceRoots` and
`tokenFiles`. These declared roots must include the implementation and tokens actually rendered.
Capture each required viewport/state separately and reject changes to config during the run too.
The snapshot binds the normalized configuration, engine revision, implementation and token-file
bytes. It cannot authenticate the running server, renderer, reviewer, or omitted dependencies.

```bash
node <installed-ss-resolve>/scripts/recommend-spacing.mjs \
  --project-root . --artifact settings --measurement .styleseed/spacing-mobile.json
```

The command rejects reports from another artifact, changed configuration, engine or source bytes,
and internally inconsistent reports. It returns measured diagnostic actions alongside explicitly
labeled heuristic starting numbers; it does not rewrite values or claim to choose an optimal gap.
For example, wrapped no-wrap button text prompts a control-width/flex review, not a smaller font
or a blanket reduction of every page gap. Missing tokens prompt token repair before numeric changes.

`status: pass` on the browser result means supplied computed-style bindings match at **one**
viewport; it is not a visual gate pass. Content observations such as horizontal overflow or wrapped
controls still require review. The inspector reads geometry/styles and line counts without copying
text or form values. It does not mutate the DOM. Margins, alignment distribution, multi-column grid
geometry and all other visual relationships still require screenshots and actual layout inspection.
No automatic evidence-gate promotion, human acceptance or expert recommendation claim is made.
