# Input

## Purpose

Single-line text entry: a name, an email, an amount, a search term. Pair it with a visible label;
multi-line text uses `Textarea`.

## Anatomy

- Label — a separate `Label` above the field, linked with `htmlFor` / `id`.
- Field — the `<input>`.
- Help or error text — a separate element below, linked with `aria-describedby`.

## States

| State | Looks | Note |
|---|---|---|
| Default | `input-background` fill, `input` border. | — |
| Placeholder | `muted-foreground` text. | An example, never the label. |
| Focus | Border in `ring`, 3px ring at 50%. | `focus-visible`. |
| Invalid | Border in `destructive`, ring in `destructive` at 20%. | Set `aria-invalid` and show the message below the field. |
| Disabled | 50% opacity, not-allowed cursor. | — |

## Do

- Put the label above the field (DESIGN-LANGUAGE §44).
- Validate on blur, and for Korean, Japanese or Chinese input only after `compositionend` (DESIGN-LANGUAGE §44).
- Say what happened and how to fix it next to the field (UX-WRITING WE-1, WE-2).
- Keep 16px text on phones so iOS does not zoom on focus; the component does this below the `md` breakpoint.

## Don't

- Don't use the placeholder as the label.
- Don't validate while the user is still typing.
- Don't put inputs inside consumer-service cards; use a separate page or bottom sheet (DESIGN-LANGUAGE §44, consumer-service scope).

## Known gaps

- DESIGN-LANGUAGE §44 specifies a 48px field (`h-12`), `rounded-xl`, a transparent border and a brand-coloured focus ring. The code is 36px (`h-9`), `rounded-md`, an `input` border and a `ring`-coloured focus ring. The two disagree; the code is what ships until the designer decides (#96).
- 36px is under the 44px touch minimum (DESIGN-LANGUAGE §41).
- The radius is a fixed `rounded-md`, not the recipe control radius, so an input and a button side by side can have different corners.

## Sources

- DESIGN-LANGUAGE §44 Input & form rules; §41 Touch targets
- UX-WRITING §W2 Errors (WE-1, WE-2)
- CRAFT-BASELINE: control heights (rule `CRAFT-control-heights`)

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/input.tsx` · `sha256:cb82ffcd1a9a…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Input } from "@/components/ui/input";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Input` | `input` | native `<input>` props |

- **Tokens consumed:** `destructive` · `foreground` · `input` · `input-background` · `muted-foreground` · `primary` · `primary-foreground` · `ring`
- **Radius:** fixed `rounded-md` (not the recipe control radius)
- **Focus:** `focus-visible:border-ring` · `focus-visible:ring-[3px]` · `focus-visible:ring-ring/50`
- **Motion:** `transition-[color,box-shadow]`

### Machine checks

- Height under the 44px touch minimum (DESIGN-LANGUAGE §41): `input` 36px. On touch surfaces, extend the hit area or use a taller size.
- Radius is fixed (rounded-md) instead of the recipe control radius used by Button and Tabs.

<!-- generated:end -->
