---
name: ss-tokens
description: Generate an accessible semantic palette from a key color, or view, add, and modify design tokens. Use when a user supplies a brand color or needs light/dark theme roles.
argument-hint: "[action: generate|import|list|add|update] [token-type: color|spacing|shadow|radius|typography]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Before this workflow, follow the once-per-session [update preflight](../ss-update/references/update-preflight.md).


# Design Token Manager
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

## When NOT to use

- For applying tokens in components → use `/ss-component` or `/ss-pattern`
- For finding token violations in existing code → use `/ss-lint`
- For native iOS/Android token pipelines — the CSS implementation below is Tailwind v4 / CSS variables only; a DTCG, Tokens Studio or Figma Variables file is imported with `import`, not re-typed here

Action: **$0** | Token type: **$1**
Arguments: $ARGUMENTS

## Token File Locations

| Type | JSON Source | CSS Implementation |
|------|-----------|-------------------|
| Colors | `tokens/colors.json` | `css/theme.css` `:root` + `@theme inline` |
| Typography | `tokens/typography.json` | `css/fonts.css` + `css/base.css` |
| Spacing | `tokens/spacing.json` | Tailwind utilities (no custom CSS needed) |
| Radius | `tokens/radii.json` | `css/theme.css` `@theme inline` |
| Shadows | `tokens/shadows.json` | `css/theme.css` `:root` |

## Instructions

### `generate color` — Derive the system from one key color

Do not pick a second color by eye or copy a preset. Run the shared StyleSeed generator:

```bash
node <installed-ss-tokens>/scripts/generate-palette.mjs \
  --key-color "#276B5E" \
  --mode light \
  --character calm \
  --harmony auto \
  --temperature neutral \
  --out .styleseed/palette.json
```

The generator is bundled inside this skill for skills-only installations and is deterministically
mirrored from the canonical `engine/color` source during repository generation.

Supported controls are `light|dark` mode, `calm|balanced|vivid|deep` character,
`auto|tonal|adjacent|contrast` harmony, and `neutral|warm|cool` surface temperature.
The generator preserves the key hue, maps chroma into sRGB without channel clipping, builds
11-step OKLCH primary/accent ramps, scores the accent against the key and reserved status hues,
maps primitives to semantic roles, and adjusts fill lightness until text/action/focus pairs pass.

Use `--format css` for CSS variables or JSON for an auditable result. Never mark the palette
valid unless `valid` is true and every item in `contrast` passes. This validates those declared
pairs only. It does not validate every border, component state, actual background, or photograph.
Use the [applied color checks](../ss-verify/references/applied-checks.md#color-inspect-the-consumer-state-and-background)
when implementing the roles. Preserve an existing approved multicolor system; unsupported input
is a limitation to report, not permission to regenerate its identity. In `STYLESEED.md`, persist
`Key color`, `Palette character`, `Palette mode`, `Palette harmony`, and `Surface temperature`,
then run `$ss-resolve`; the resolver emits the same `.styleseed/palette.json` and `palette.css`.

### `import` — Use the project's own token file as the canon

When the team already has a design system, do not generate a palette and do not re-type its values.
Point the registry at the file and let the resolver map StyleSeed's roles onto it:

```json
"tokens": { "source": "design/tokens.json", "format": "dtcg", "roles": { "accent": "semantic.bg.accent.base", "accentForeground": "semantic.fg.inverse" } }
```

Preview before writing config, then resolve as usual:

```bash
node <installed-ss-resolve>/scripts/import-tokens.mjs --source design/tokens.json --token-format dtcg
node <installed-ss-resolve>/scripts/resolve-context.mjs --project-root . --artifact <id>
```

Formats: DTCG 2025.10, Tokens Studio export, Figma Variables (REST local-variables JSON). The import
checks aliases, the designer's layering (primitive → semantic fg/bg/bd → type → component), modes, and
the eleven contrast gates. A role the file cannot supply is an error naming the mapping to add; a
failing contrast pair is reported to the system's owner, not corrected. Only imported values reach the
bundle, palette JSON and `--ss-*` CSS. Fields, default role map and limits:
[token canon guide](../ss-resolve/references/tokens.md).

### `propose` — sizes, radii, and spacing with their basis

Do not pick control heights, type sizes, radii, row heights, or a spacing unit by eye, and do not copy a preset.
After the artifact resolves, run:

```bash
node <installed-ss-resolve>/scripts/propose-system.mjs --project-root . --surface pointer --write
```

(`--surface touch` for a touch-first product, `--artifact <id>` in a registry project, `--reference <slug>` for each
reference the person measured.) Read `.styleseed/proposals/SYSTEM.md`: per axis it gives a value and its basis, in
this order: the project's recorded decision, the person's own measurement, counts over the measured design systems
that ship with this skill, and the engine default, labelled not measured. Present each axis with its counts, let the
person choose, and append only what they chose to the decisions ledger with the name they give; `--entry
<axis>=<values>` prints the entry for a value other than the proposed one. Then resolve again and apply the decided
values in the token files below. The tool writes no ledger and no name. See
[system proposals](../ss-resolve/references/proposals.md).

### `list` — Show current tokens
Read and display the requested token file in a formatted table.

### `add` — Add new token
1. Add the token to the JSON source file (`tokens/*.json`)
2. Add the CSS custom property to `css/theme.css` under `:root`
3. If it needs a Tailwind utility, add to the `@theme inline` block
4. If it has a dark mode variant, add to the `.dark` block

### `update` — Modify existing token
1. Update the value in the JSON source file
2. Update the CSS custom property in `theme.css`
3. Check all components for direct usage that might need updating

## Rules
- Always keep JSON and CSS in sync
- Use semantic names, not descriptive names (`--success` not `--green-500`)
- Colors should support both light and dark modes
- New tokens must be added to BOTH the JSON source AND the CSS implementation
- Treat preset recipes as maintained defaults, not the limit of available colors.
- Character and role allocation are stronger design controls than complementary/triadic geometry alone.
- Before adding or changing a size, radius, or spacing token, read the project's recorded decisions. A value
  outside a decision needs the decision changed or an exception recorded by the person, not a silent token edit.
