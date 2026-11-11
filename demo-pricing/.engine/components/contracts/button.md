# Button

## Purpose

Starts an action on the current screen: submit, save, open, delete. One primary button per region of
a screen; everything else is a quieter variant. Navigation to another page is a link, not a button.

## Anatomy

- Container — the `<button>` (or the child element with `asChild`), height and radius from the size and the brand recipe.
- Leading or trailing icon — optional SVG, sized automatically per size.
- Label — a verb and an object, one to three words.

## Variants

| Code | Designer name | Use when |
|---|---|---|
| `default` | Primary (brand solid) | The one main action in a region: Save, Place order. |
| `neutral` | Neutral solid | Strong emphasis that should not use the key colour, for example on a brand-coloured surface. |
| `secondary` | Secondary (neutral weak) | The alternative beside a primary: Close next to Confirm. |
| `outline` | Line | A bordered secondary action in toolbars and dense forms. |
| `ghost` | Ghost | Low-emphasis actions in dense UI, and icon-only buttons. |
| `brandGhost` | Text button | A key-colour text action without a surface: Retry, Maybe later. |
| `destructive` | Critical | An action that deletes or cannot be undone. |

## Sizes

| Code | Use |
|---|---|
| `xs` | Chips, tags and filter buttons. |
| `sm` | Inline secondary actions; matches the default input and select height. |
| `md` | The default button. |
| `lg` | Large or full-width CTA, including a CTA fixed to the bottom of a mobile screen. |
| `icon` | Icon-only button, for example in a top bar. Needs an `aria-label`. |

## States

| State | Looks | Note |
|---|---|---|
| Default | Per variant. | — |
| Pressed | Background one step darker (`active:` …`/85`, `/90`, `/8`). | Colour only; no scale change. |
| Disabled | `surface-muted` background, `text-disabled` text, pointer events off. | Keep the label readable; explain why nearby if it is not obvious. |
| Focus | 2px ring in the brand colour at 20%. | Keyboard only (`focus-visible`). |
| Loading | Not built in. | Swap the label for a 16px spinner, keep the size, block clicks (DESIGN-LANGUAGE §46). |

## Do

- Label the outcome: "Save changes", "Delete project", never "Submit" or "OK" (UX-WRITING WB-1, WB-2).
- In a pair, put the primary on the right and the secondary on the left, 12px apart (DESIGN-LANGUAGE §46).
- Name both outcomes in a destructive dialog: "Delete / Keep" (UX-WRITING WB-3).
- Give icon-only buttons an `aria-label`.

## Don't

- Don't put two primary buttons in one region.
- Don't shrink on press (`active:scale`) or use a gradient background (DESIGN-LANGUAGE §46).
- Don't recolour a variant through `className` (`bg-…`); pick a variant or add one to the contract.
- Don't use `destructive` for emphasis that is not destructive.

## Known gaps

- `md` (40px), `sm` (36px), `xs` (32px) and `icon` (40px) are under the 44px touch minimum (DESIGN-LANGUAGE §41).
- The default `md` button (40px) is taller than the default input and select (36px), so the defaults break "buttons, inputs and selects in one context share a height" (CRAFT-BASELINE). Use `sm` beside default form controls.
- There is no hover style; pointer users get feedback only on press.
- There is no loading state; §46 describes one.

## Sources

- DESIGN-LANGUAGE §46 Button design rules; §41 Touch targets; §24 Interaction rules
- UX-WRITING §W1 Buttons & actions (WB-1, WB-2, WB-3)
- CRAFT-BASELINE: control heights (rule `CRAFT-control-heights`)

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/button.tsx` · `sha256:f2064403176b…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Button, buttonVariants } from "@/components/ui/button";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Button` | `button` | native `<button>` props · `variant` default · neutral · secondary · destructive · outline · ghost · brandGhost (default `default`) · `size` xs · sm · md · lg · icon (default `md`) · `asChild?: boolean` (default `false`) |

| Size | Height | Padding x | Text | Icon |
|---|---|---|---|---|
| `xs` | 32px | 14px | 13px | 14px |
| `sm` | 36px | 14px | 14px | 14px |
| `md` | 40px | 16px | 14px | 16px |
| `lg` | 52px | 20px | 18px | 22px |
| `icon` | 40px | — | — | 18px |

- **Tokens consumed:** `accent` · `background` · `border` · `brand` · `destructive` · `foreground` · `secondary` · `surface-muted` · `text-disabled` · `text-primary`
- **Radius:** recipe control radius (`ss-pattern-control` → `--ss-control-radius`, 0–999px by brand recipe)
- **Focus:** `focus-visible:ring-2` · `focus-visible:ring-brand/20` · `focus-visible:ring-destructive/20`
- **Motion:** `duration-150` · `transition-colors`

### Machine checks

- Height under the 44px touch minimum (DESIGN-LANGUAGE §41): `xs` 32px, `sm` 36px, `md` 40px, `icon` 40px. On touch surfaces, extend the hit area or use a taller size.

<!-- generated:end -->
