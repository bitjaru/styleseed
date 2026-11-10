# Switch

## Purpose

Turns one setting on or off, and the change applies immediately: notifications, dark mode,
auto-renew. A choice that only applies after Save is a `Checkbox`.

## Anatomy

- Track — the `Switch` root; filled with `primary` when on.
- Thumb — the circle that moves right when on.
- Label — a separate `Label` next to it, linked with `htmlFor` / `id`.

## States

| State | Looks | Note |
|---|---|---|
| On | `primary` track, thumb on the right. | — |
| Off | `switch-background` track, thumb on the left. | — |
| Focus | Border in `ring`, 3px ring at 50%. | Space toggles it. |
| Disabled | 50% opacity, not-allowed cursor. | — |

## Do

- Always pair it with a visible label that names the setting, not the action ("Email notifications", not "Turn on").
- Apply the change immediately and show the result.
- Make the label clickable too, so the whole row is a target.

## Don't

- Don't use a switch inside a form that needs a submit; use a checkbox.
- Don't use a switch without a label, or with a label that changes between on and off.

## Known gaps

- The track is about 18px × 32px, far under the 44px touch minimum (DESIGN-LANGUAGE §41). Make the label and row the target, or wrap the switch in a 44px area.
- The track uses `transition-all`. DESIGN-LANGUAGE §24 recommends `transition-all` for interactive elements, while the rule catalog's detector SS003 asks for named properties. The two documents disagree.
- On uses `primary`, not `brand`, so it may not match a primary button in skins where the two roles differ.

## Sources

- DESIGN-LANGUAGE §24 Interaction rules; §41 Touch targets
- Rule catalog: detector SS003 (`transition-all`)

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/switch.tsx` · `sha256:d4c744131c61…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Switch } from "@/components/ui/switch";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Switch` | `switch` | `@radix-ui/react-switch` Root props |

- **Tokens consumed:** `card` · `primary` · `ring` · `switch-background`; dark mode only: `card-foreground` · `input` · `primary-foreground`
- **Radius:** fixed `rounded-full` (not the recipe control radius)
- **Focus:** `focus-visible:border-ring` · `focus-visible:ring-[3px]` · `focus-visible:ring-ring/50`
- **Motion:** `transition-all` · `transition-transform`

### Machine checks

- Height under the 44px touch minimum (DESIGN-LANGUAGE §41): `switch` 18.4px × 32px. On touch surfaces, extend the hit area or use a taller size.
- Uses `transition-all`; name the transitioned properties (detector SS003).
- Radius is fixed (rounded-full) instead of the recipe control radius used by Button and Tabs.

<!-- generated:end -->
