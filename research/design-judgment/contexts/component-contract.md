# Task-specific implementation context — condition C (also supplied to D)

These paths refer to your prepared workspace. The preparer copies current repository bytes and
records their hashes in the operator manifest. This is a source-grounded draft, not expert approval.

| Need | Actual API/import | Boundary |
|---|---|---|
| Commit/cancel/retry | `Button` from `src/ui/button.tsx`; `variant`, `size`, `asChild`, native button props | Sizes are `xs`, `sm`, `md`, `lg`, `icon` — there is no `size="default"`. No built-in loading prop; use disabled/busy state and visible text. |
| Search/settings text | `Input` from `src/ui/input.tsx`; native input props | Controlled `value`/`onChange`; use `id`, `aria-invalid`, `aria-describedby`. No built-in error-message prop. |
| Field relationship | `Label` from `src/ui/label.tsx`; `htmlFor` | The label must target the real input ID. Placeholder text is not a label. |
| Comparable resources | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` from `src/ui/table.tsx` | These are structural primitives, not a data-grid API. You implement filtering, selection and bulk actions. |
| Visible status | `Badge` from `src/ui/badge.tsx`; `variant` = `default`/`secondary`/`destructive`/`outline` | No success/warning variant. Include status text; a colored badge is not permission logic. |

Read `context/examples.tsx` for typechecked API examples. It is not a finished screen or a
working asynchronous application. All conditions have the same underlying primitives/model;
this condition only makes relevant usage context explicit.

## Token and state wiring

- `src/styles/theme.css` maps `--brand` to `bg-brand`/`text-brand`, `--foreground` to
  `text-foreground`, `--muted-foreground` to `text-muted-foreground`, `--border` to `border-border`,
  and `--destructive` to destructive feedback. Use role tokens, not component-local color values.
- `src/styles/recipes.css` supplies `ss-pattern-control` and the enterprise-workbench morphology.
  The root recipe attribute is required; changing palette hue alone does not select morphology.
- Follow the local `./utils` imports. No `@/components/ui/utils` alias is preconfigured here.
- `Button` has sub-44px sizes and `Input` defaults to 36px height. Meet the common task's 44px
  floor through supported `className` overrides/wrappers; do not silently rewrite vendor files.
- Some Button variants contain fixed color values; Input has a fixed radius utility. Record
  conflicts with the requested system and use an applicable existing variant/override. These
  implementation limitations have not been endorsed by an expert or certified accessible.
- Use `filterResources`, `pauseResources`, `validateSettings`, `saveSettings`, and
  `hasUnsavedChanges` from `fixture/model.mjs`. Keep failed drafts; reject atomic mutations
  before changing displayed records. Confirmation, pending feedback, focus, and routing remain UI work.
- Resolver-generated palette output is evidence of its own inputs, not a replacement for the
  supplied theme. Do not import it over the existing theme to make the two systems appear identical.
