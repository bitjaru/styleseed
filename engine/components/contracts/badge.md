# Badge

## Purpose

A short, static label for a status, a category or a count. It informs; it does not act. For a
selectable chip or filter use `Toggle` (or a `Button` at size `xs`); there is no separate chip component.

## Anatomy

- Container — a `<span>` (or the child element with `asChild`, for example a link).
- Optional icon — 12px SVG before the text.
- Text — one to three words.

## Variants

| Code | Designer name | Use when |
|---|---|---|
| `default` | Solid (primary role) | The one label that should stand out in a group. |
| `secondary` | Neutral | Most labels: categories, counts, metadata. |
| `outline` | Line | Quiet labels in dense tables and lists. |
| `destructive` | Critical | An error or blocking status. |

## States

| State | Looks | Note |
|---|---|---|
| Static | Per variant. | The normal case. |
| Link hover | Background at 90% when rendered as a link (`asChild` with `<a>`). | Only when the badge navigates. |
| Focus | 3px ring in the `ring` role at 50%, border in `ring`. | Only when focusable (link). |
| Invalid | Border and ring in `destructive` when `aria-invalid`. | Rare; inherited from the form styles. |

## Do

- Pair colour with text or an icon; never let colour alone carry the status (DESIGN-LANGUAGE §41).
- Keep the text short and in one form across the product ("Paid", not "Payment completed" in one place and "Paid" in another).
- Use `secondary` by default and save `default` for the one label that matters.

## Don't

- Don't attach a click handler to a badge; use `Toggle` or `Button`.
- Don't use `destructive` for a status that is not an error.
- Don't invent a colour per category through `className`; categories that need colour need tokens.

## Known gaps

- Badge uses the `primary` and `secondary` roles while Button's primary uses `brand`. In a skin where `primary` and `brand` differ, a default badge and a primary button do not match.
- The radius is a fixed `rounded-md`, not the recipe control radius that Button and Tabs use.
- The theme has `success`, `warning` and `info` roles but Badge has no variants for them; DESIGN-LANGUAGE §11 gives urgent and info badge colours as hex (#C85A54, #7A7A7A) instead of roles.
- Link hover darkens by opacity (`/90`), which DESIGN-LANGUAGE §46 rejects for buttons.

## Sources

- DESIGN-LANGUAGE §11 Badge color rules; §41 Accessibility (colour not alone); §46 Button design rules

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/badge.tsx` · `sha256:8329a0b50f81…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Badge, badgeVariants } from "@/components/ui/badge";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Badge` | `badge` | native `<span>` props · `variant` default · secondary · destructive · outline (default `default`) · `asChild?: boolean` (default `false`) |

- **Tokens consumed:** `accent` · `accent-foreground` · `destructive` · `foreground` · `primary` · `primary-foreground` · `ring` · `secondary` · `secondary-foreground`
- **Radius:** fixed `rounded-md` (not the recipe control radius)
- **Focus:** `dark:focus-visible:ring-destructive/40` · `focus-visible:border-ring` · `focus-visible:ring-[3px]` · `focus-visible:ring-destructive/20` · `focus-visible:ring-ring/50`
- **Motion:** `transition-[color,box-shadow]`

### Machine checks

- None.

<!-- generated:end -->
