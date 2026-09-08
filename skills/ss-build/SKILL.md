---
name: ss-build
description: Build a screen with StyleSeed's composed design method — choose or compile an output grammar, apply a brand recipe plus domain/page/profile/lock constraints, then run the code and pixel gates before presenting.
argument-hint: "[what to build]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch
---

# Build with the composed StyleSeed method
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

The build method is the product. Score and screenshots are auxiliary evidence, not the source
of design judgment.

## Step 1 — Establish the rule set before code

If either `.styleseed/project.json` or `.styleseed/artifacts/index.json` exists, require a
complete, valid registry and resolve the requested artifact with the installed resolver's
`scripts/resolve-context.mjs --project-root . --artifact <artifact-id> --agent <agent>`.
Read `.styleseed/bundles/<artifact-id>.md` and preserve `.styleseed/manifests/<artifact-id>.json`
as provenance. Do not create `STYLESEED.md`, restart setup, or use a legacy bundle because a
registry is incomplete, invalid, or lacks a compiled output. Resolve missing scope with the user.
For changes spanning multiple artifacts, resolve and check each affected artifact separately.

Only when neither registry file exists, use the legacy path: if `STYLESEED.md` is missing,
run `/ss-setup` before UI code; otherwise preserve it. Invoke `/ss-resolve` (Claude Code) or
`$ss-resolve` (Codex) with `--from-lock STYLESEED.md --agent <agent>`, read
`.styleseed/effective-rules.md`, and preserve `.styleseed/manifest.json`.

If a supplied visual reference is not represented by the selected grammar, use `/ss-reference`
within the selected project boundary. Never reduce an unfamiliar reference to a palette swap or
replace approved project choices without human approval. Do not load `llms-full.txt` after
resolution succeeds.

## Step 2 — Compose, do not improvise

The compiled bundle already composes the authority order: core invariants → selected grammar →
surface adapter → domain/page → brand recipe → optional profile → bounded lock → craft baseline. Use the
manifest selection and source hashes to detect drift. Open a full source document only when the
bundle points to a genuine ambiguity; do not reassemble the handbook ad hoc.

Before code, state the effective rule set in one line, for example:

```text
operations-console × SaaS × dashboard × enterprise-workbench × swiss × locked brand tokens
```

Resolve conflicts by authority. A profile or lock cannot waive task fitness, coherence, or
accessibility.

## Step 3 — Build with design judgment

- Make the grammar's user job and primary decision visible in the first viewport.
- Establish one focal point; avoid equal-weight template grids.
- Use the grammar's composition, density, type, color, surface, imagery/data, action, state,
  responsive, and motion contracts.
- Use the recipe's containment, geometry, control, collection, and navigation morphology.
  Set `data-styleseed-recipe="<id>"` on the artifact root when using bundled pattern components.
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
- project/artifact configuration paths (or legacy `STYLESEED.md`) and any compiled grammar path.

## Rules

- Grammar before code; code gate after build; pixel gate last.
- Output grammar is functional. Brand recipe is morphological. Aesthetic profile is optional.
  Neither substitutes for the grammar or permits a brand clone.
- The primary action must remain identifiable; additional color is permitted only where the
  grammar gives it stable semantic or categorical meaning.
- Re-read the lock and grammar on every UI change.
