---
name: ss-tokens
description: Generate an accessible semantic palette from a key color, or view, add, and modify StyleSeed design tokens. Use when a user supplies a brand color, asks which colors combine well, needs light/dark theme roles, or needs token files for implementation.
argument-hint: "[action: generate|list|add|update] [token-type: color|spacing|shadow|radius|typography]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Design Token Manager
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

## When NOT to use

- For applying tokens in components → use `/ss-component` or `/ss-pattern`
- For finding token violations in existing code → use `/ss-lint`
- For non-CSS token systems (Figma, native iOS/Android) — Tailwind v4 / CSS variables only

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
valid unless `valid` is true and every item in `contrast` passes. In `STYLESEED.md`, persist
`Key color`, `Palette character`, `Palette mode`, `Palette harmony`, and `Surface temperature`,
then run `$ss-resolve`; the resolver emits the same `.styleseed/palette.json` and `palette.css`.

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
