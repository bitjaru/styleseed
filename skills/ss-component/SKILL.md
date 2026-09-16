---
name: ss-component
description: Generate a new UI component following the StyleSeed design conventions
argument-hint: "[component-name] [description]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# UI Component Generator

## Registry-first artifact boundary

If either `.styleseed/project.json` or `.styleseed/artifacts/index.json` exists, require a
complete, valid registry. Resolve the requested artifact ID before writing a component; ask
for scope if it is ambiguous. Never fall back to the global legacy bundle, create `STYLESEED.md`,
or restart setup because a registry is incomplete, invalid, or has no compiled output.

Locate the installed `ss-resolve` skill directory (shown as `<ss-resolve>` below), then run
this read-only check from the target project root with the active agent (`codex`, `claude`, etc.):

```sh
node "<ss-resolve>/scripts/resolve-context.mjs" --project-root . --artifact <artifact-id> --agent <agent> --check
```

For a valid registry with missing or stale compiled output, run the same command without
`--check`, then check again. Stop on invalid configuration or installation errors; do not
change approved selections to make the check pass. After success, read only the selected
`.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json` as the
compiled method and provenance. A shared component affecting multiple artifacts requires
resolving and checking each affected artifact separately, not merging their bundles.

Legacy projects use the following path only when neither registry file exists. Preserve
`STYLESEED.md`; if it is missing, use setup before component code.

```sh
node "<ss-resolve>/scripts/resolve-context.mjs" --project-root . --from-lock STYLESEED.md --agent <agent> --check
```

For missing or stale legacy output, run the same command without `--check`, then check again.
Read `.styleseed/effective-rules.md` and `.styleseed/manifest.json` only after success.

## When NOT to use

- For full-page scaffolding → use `/ss-page`
- For composed multi-component patterns → use `/ss-pattern`
- For tweaking an existing component — just edit the file directly
- For projects without a configured StyleSeed React/Tailwind v4 component system

Generate a new component: **$0**
Description: $ARGUMENTS

## Instructions

1. Apply the registry/legacy boundary above, then read the actual implementation context:
   - For a registry artifact, start from its `implementation.sourceRoots` and
     `implementation.tokenFiles`. For legacy projects, discover the existing component and
     stylesheet entry points from the project source.
   - Follow the active stylesheet imports to the token definitions and recipe helpers used by
     this artifact. `css/theme.css` and `css/recipes.css` are examples, not required locations.
   - Read an existing nearby primitive (such as the project's button) and its real imports,
     props, variants, and states. Reuse an existing component when it already fits the request.
   - Preserve the project's approved tokens and component API. If required context is missing
     or unsupported, report the gap before inventing files, aliases, tokens, or replacements.

2. Follow these conventions strictly:
   - Use `function` declaration (not `const`)
   - Add `data-slot="component-name"` attribute
   - Use the project's existing `cn()` utility and verified import path for className merging
   - Use `React.ComponentProps<>` for prop typing
   - Always support `className` prop for overrides
   - Use CVA (`class-variance-authority`) if the component has variants
   - Use semantic color tokens (`bg-card`, `text-foreground`) — never inline hex

3. Design token usage:
   - Colors: `text-foreground`, `bg-card`, `text-brand`, `text-muted-foreground`, `border-border`
   - Pattern surfaces: `ss-pattern-surface`; insets/controls/icons use the matching `ss-*` class
   - Primitives use the project token scale; do not hardcode one radius or shadow personality
   - Spacing follows one repeatable selected-recipe rhythm
   - Motion: `duration-[var(--duration-fast)]`, `ease-[var(--ease-default)]`

4. Typography rules:
   - Display (36-48px): `leading-none tracking-[-0.02em]`
   - Heading (18-24px): `leading-snug tracking-[-0.01em]`
   - Body (14-17px): `leading-normal` (default tracking)
   - Caption uppercase (10-13px): `tracking-[0.05em]`
   - Use `size-*` shorthand instead of `w-* h-*`
   - Use `ms-*/me-*` instead of `ml-*/mr-*` (logical properties)

5. Accessibility requirements:
   - Minimum touch target: 44x44px (`min-h-11 min-w-11`)
   - Support `aria-*` attributes passthrough
   - Use `focus-visible:ring-2 focus-visible:ring-ring` for keyboard focus
   - Respect `prefers-reduced-motion` for animations

6. Export the component as a named export (not default)

7. Place the file in the existing component directory established in step 1, inside the
   affected artifact's implementation scope. `src/components/ui/` is a common layout, not
   a path to create in every project. Route composed patterns to `/ss-pattern`.
