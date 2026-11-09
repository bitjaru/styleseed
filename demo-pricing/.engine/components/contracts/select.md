# Select

## Purpose

Chooses one option from a list that is too long to show at once (five or more). For two to four
options, show them all with a segmented control or radio group.

## Anatomy

- `Select` — the root that holds the value.
- `SelectTrigger` — the field that shows `SelectValue` and a chevron.
- `SelectContent` — the popover list, with scroll buttons when it overflows.
- `SelectItem` — one option; the chosen one shows a check.
- `SelectGroup`, `SelectLabel`, `SelectSeparator` — optional grouping.

## Sizes

| Code | Use |
|---|---|
| `default` | Forms and settings; matches the default input height. |
| `sm` | Toolbars and dense tables. |

## States

| State | Looks | Note |
|---|---|---|
| Placeholder | Trigger text in `muted-foreground`. | — |
| Open | Popover fades and zooms in. | Reduced motion removes the animation (`engine/css/base.css`). |
| Item highlighted | `accent` background. | Keyboard and pointer. |
| Item selected | Check icon on the right. | — |
| Focus | Border in `ring`, 3px ring at 50%. | — |
| Invalid | Border and ring in `destructive`. | Set `aria-invalid`. |
| Disabled | 50% opacity. | Trigger and single items. |

## Do

- Use it for five or more options; a native `<select>` is also fine in settings and forms (DESIGN-LANGUAGE §10).
- Give it a visible label, like an input.
- Order options meaningfully: by frequency, alphabetically, or in their natural order.

## Don't

- Don't use a select for two to four options inside a consumer-service card; use a pill toggle (DESIGN-LANGUAGE §10).
- Don't use it for actions; a menu of actions is a `DropdownMenu`.

## Known gaps

- The trigger is 36px (`default`) or 32px (`sm`), under the 44px touch minimum (DESIGN-LANGUAGE §41).
- The trigger's radius is set by its own classes, not the recipe control radius used by Button and Tabs.

## Sources

- DESIGN-LANGUAGE §10 Selection UI rules; §41 Touch targets
- CRAFT-BASELINE: control heights (rule `CRAFT-control-heights`)

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/select.tsx` · `sha256:6aaf21119523…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Select` | `select` | `@radix-ui/react-select` Root props |
| `SelectGroup` | `select-group` | `@radix-ui/react-select` Group props |
| `SelectValue` | `select-value` | `@radix-ui/react-select` Value props |
| `SelectTrigger` | `select-trigger` | `@radix-ui/react-select` Trigger props · `size?: "sm" \| "default"` (default `default`) |
| `SelectContent` | `select-content` | `@radix-ui/react-select` Content props |
| `SelectLabel` | `select-label` | `@radix-ui/react-select` Label props |
| `SelectItem` | `select-item` | `@radix-ui/react-select` Item props |
| `SelectSeparator` | `select-separator` | `@radix-ui/react-select` Separator props |
| `SelectScrollUpButton` | `select-scroll-up-button` | `@radix-ui/react-select` ScrollUpButton props |
| `SelectScrollDownButton` | `select-scroll-down-button` | `@radix-ui/react-select` ScrollDownButton props |

| Size | Height | Padding x | Text | Icon |
|---|---|---|---|---|
| `default` | 36px | 12px | 14px | — |
| `sm` | 32px | 12px | 14px | — |

- **Tokens consumed:** `accent` · `accent-foreground` · `border` · `destructive` · `input` · `input-background` · `muted-foreground` · `popover` · `popover-foreground` · `ring`
- **Radius:** fixed `rounded-md`, `rounded-sm` (not the recipe control radius)
- **Focus:** `focus-visible:border-ring` · `focus-visible:ring-[3px]` · `focus-visible:ring-ring/50` · `focus:bg-accent` · `focus:text-accent-foreground`
- **Motion:** `data-[state=closed]:animate-out` · `data-[state=open]:animate-in` · `transition-[color,box-shadow]`

### Machine checks

- Height under the 44px touch minimum (DESIGN-LANGUAGE §41): `select-trigger` size `default` 36px, `select-trigger` size `sm` 32px. On touch surfaces, extend the hit area or use a taller size.
- Radius is fixed (rounded-md, rounded-sm) instead of the recipe control radius used by Button and Tabs.

<!-- generated:end -->
