# Tabs

## Purpose

Switches between views of the same content in place, without leaving the page: Overview / Activity,
Week / Month. Each tab shows a panel; only one panel is visible at a time.

## Anatomy

- `Tabs` — the root that holds the selected value.
- `TabsList` — the track that holds the triggers.
- `TabsTrigger` — one tab; the selected one sits on a card-coloured surface.
- `TabsContent` — the panel for one tab.

## States

| State | Looks | Note |
|---|---|---|
| Selected | `card` surface on the `muted` track. | Exactly one at a time. |
| Unselected | Foreground text on the track. | — |
| Focus | 3px ring in the `ring` role at 50%. | Arrow keys move between tabs (Radix). |
| Disabled | 50% opacity, not focusable. | Say why elsewhere if the reason is not obvious. |

## Do

- Use two to five tabs with short labels.
- Switch instantly; no slide animation between panels (DESIGN-LANGUAGE §42).
- Keep each panel about the same kind of content so switching compares like with like.

## Don't

- Don't use tabs for steps in a sequence (use a stepper) or to move between pages (use links).
- Don't nest tabs inside tabs.
- Don't hide information the user needs to compare at a glance behind separate tabs; show it side by side.

## Known gaps

- The track is 36px tall, under the 44px touch minimum (DESIGN-LANGUAGE §41).
- Only the segmented style exists. The token canon sample (`research/tokens`, `component.tab.bd.active`) assumes an underline tab with an active border; there is no underline variant yet.
- For two to four options inside a card header, DESIGN-LANGUAGE §10 asks for a pill toggle; `SegmentedControl` or `ToggleGroup` fits that job better than Tabs.

## Sources

- DESIGN-LANGUAGE §42 Tab & navigation details; §10 Selection UI rules; §41 Touch targets
- research/tokens/README.md (token canon sample, #96)

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/tabs.tsx` · `sha256:a71dd6e8a4b3…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Tabs` | `tabs` | `@radix-ui/react-tabs` Root props |
| `TabsList` | `tabs-list` | `@radix-ui/react-tabs` List props |
| `TabsTrigger` | `tabs-trigger` | `@radix-ui/react-tabs` Trigger props |
| `TabsContent` | `tabs-content` | `@radix-ui/react-tabs` Content props |

- **Tokens consumed:** `card` · `foreground` · `muted` · `muted-foreground` · `ring`; dark mode only: `input`
- **Radius:** recipe control radius (`ss-pattern-control` → `--ss-control-radius`, 0–999px by brand recipe)
- **Focus:** `focus-visible:border-ring` · `focus-visible:outline-1` · `focus-visible:outline-ring` · `focus-visible:ring-[3px]` · `focus-visible:ring-ring/50`
- **Motion:** `transition-[color,box-shadow]`

### Machine checks

- Height under the 44px touch minimum (DESIGN-LANGUAGE §41): `tabs-list` 36px. On touch surfaces, extend the hit area or use a taller size.

<!-- generated:end -->
