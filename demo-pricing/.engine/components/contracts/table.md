# Table

## Purpose

Compares records across the same columns: orders, invoices, team members. Use a table when people
scan down a column or across a row to compare; use a list when each item is read on its own.

## Anatomy

- `Table` — a horizontally scrollable container and the `<table>`.
- `TableHeader`, `TableBody`, `TableFooter` — row groups.
- `TableRow` — one record.
- `TableHead` — a column header cell.
- `TableCell` — a data cell.
- `TableCaption` — the table's title or summary, below the table.

## States

| State | Looks | Note |
|---|---|---|
| Row hover | `muted` at 50%. | Pointer only. |
| Row selected | `muted` background with `data-state="selected"`. | Pair with a checkbox column. |
| Overflow | The container scrolls horizontally. | Cells do not wrap (`whitespace-nowrap`). |

## Do

- Give every table a caption or an `aria-label`.
- Right-align numbers and use tabular figures (`text-right tabular-nums`) so digits line up (DESIGN-LANGUAGE §22).
- Keep one unit per column and say it in the header.

## Don't

- Don't use a table for layout.
- Don't put interactive controls in every cell; give the row one clear action.
- Don't highlight rows on hover in consumer-service screens, where DESIGN-LANGUAGE §24 forbids hover highlights on list rows.

## Known gaps

- There is no numeric-column helper; every consumer adds `text-right tabular-nums` by hand.
- Row hover is always on, which conflicts with DESIGN-LANGUAGE §24 in the consumer-service recipe.
- All cells use `whitespace-nowrap`, so long text forces horizontal scrolling on phones.

## Sources

- DESIGN-LANGUAGE §22 Number formatting; §24 Interaction rules

<!-- generated:start — scripts/build-component-contracts.mjs rewrites this block from the source; edit the sections above it -->

## From the code

Source `engine/components/ui/table.tsx` · `sha256:e4ec7d3be042…`

Import, after copying `engine/components` into `src/components`:

```tsx
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from "@/components/ui/table";
```

| Part | `data-slot` | Props |
|---|---|---|
| `Table` | `table-container` | native `<table>` props |
| `TableHeader` | `table-header` | native `<thead>` props |
| `TableBody` | `table-body` | native `<tbody>` props |
| `TableFooter` | `table-footer` | native `<tfoot>` props |
| `TableRow` | `table-row` | native `<tr>` props |
| `TableHead` | `table-head` | native `<th>` props |
| `TableCell` | `table-cell` | native `<td>` props |
| `TableCaption` | `table-caption` | native `<caption>` props |

- **Tokens consumed:** `foreground` · `muted` · `muted-foreground`
- **Radius:** none set
- **Focus:** none set
- **Motion:** `transition-colors`

### Machine checks

- None.

<!-- generated:end -->
