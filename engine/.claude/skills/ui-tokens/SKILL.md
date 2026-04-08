---
name: ui-tokens
description: View, add, or modify design tokens in the StyleSeed design system
argument-hint: [action: list|add|update] [token-type: color|spacing|shadow|radius|typography]
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Design Token Manager

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
