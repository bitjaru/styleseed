# Shopify admin apps — app settings page (2026-11-05)

Surface: design-system-docs · Domain: saas-dashboard · Page type: settings · Nearest grammar: operations-console
Sources are listed in `case.json`. The Shopify admin itself is behind a login, so this case
reads Shopify's own public pattern documentation and measures the documentation site.

## What the screen does

A merchant opens an app's settings page inside the Shopify admin to find one setting and
change it, or to configure several related settings at once. The page is a vertical stack of
groups. Each group has a title and, when useful, a one-line description on the left, and a
card with that group's inputs on the right. Items that carry their own state, such as
connected accounts or tools, get a header row with title, status badge and action. Changes
are not saved field by field: a save bar appears when something is unsaved, destructive
actions ask for confirmation in a dialog, and a toast reports the result.

## Decisions

### D1 — Two columns per group: scan on the left, edit on the right
- **Observed:** the pattern's cover description and live code (S1); the layout guideline's
  "settings layout" definition (S3).
- **Reason:** stated by the authors. Left-column labels and descriptions make the page
  scannable; right-column cards make a found setting easy to configure, alone or with its
  neighbours.
- **Driver:** task.
- **Counterexample:** one or two settings in total (one card); narrow viewports (the pattern
  collapses to one column).

### D2 — Groups stack vertically with a divider
- **Observed:** "Stack all setting groups vertically on the page" (S1 usage notes); `Divider`
  rendered from the small breakpoint in the code.
- **Reason:** keeps a single top-to-bottom scan order.
- **Driver:** task.
- **Counterexample:** comparison tasks (plan A vs plan B) are tables, not settings.

### D3 — Describe a group only when it helps
- **Observed:** "Don't include a description unless it's helpful" (S1); "don't use a body
  paragraph as the group description" (S2).
- **Reason:** stated; a heading without a description reads faster.
- **Driver:** task.
- **Counterexample:** settings whose effect is invisible on the page need the description.

### D4 — 2fr : 5fr from the medium breakpoint, 16px gaps, one column below
- **Observed:** `InlineGrid columns={{xs: '1fr', md: '2fr 5fr'}} gap="400"` and
  `BlockStack gap={{xs: '800', sm: '400'}}` in the pattern code (S1). Polaris `space-400`
  is 16px and `space-800` is 32px.
- **Driver:** platform (Polaris tokens).
- **Counterexample:** on very wide screens the ratio is not scaled; the current template caps
  the page width instead (`inlineSize="small"`, S2).

### D5 — Save bar, confirmation dialog, toast
- **Observed:** Save Bar API, Modal API and Toast API prescribed for the settings template (S2).
- **Reason:** stated: "protecting unsaved changes keeps the page usable".
- **Driver:** task.
- **Counterexample:** a single immediate toggle. S2 does not cover inline save, so that part
  stays unknown for this source.

### D6 — Items with status become nested sections
- **Observed:** nested `s-section` per account or tool, with heading, subheading, status
  badge and action in the header (S2).
- **Driver:** task.
- **Counterexample:** a plain input group without per-item state is one card.

### D7 — One density, 4px grid, one primary action per card
- **Observed:** layout guidelines (S3): 4px spacing grid; "avoid changing information density
  within a single page"; at most one primary action in an interactive card; no paragraphs
  directly on the background.
- **Driver:** platform.
- **Counterexample:** a table region may be tighter on the same 4px multiples.

## Rule candidates

See `case.json` R1–R5. Confidence is `medium` for R1–R4 because every statement comes from
one company's documentation. Products that use a left navigation with a single content column
(GitHub settings, many macOS preference panes) are a different, equally valid system; R1 must
not be read as overriding an approved project system. R5 is `high` because it repeats a floor
StyleSeed already enforces (VISUAL-CRAFT CR-1).

## Measurement notes

`measurements/` holds a designlang 13.4.0 run on the shopify.dev settings template page
(S4). It measures the documentation site: Inter, a 4px scale `[4, 8, 12, 16, 20, 28, 40, 48,
60]`, radii 3/8/16, 27 colours. The tool's `brand.primary` (#475f91) matches the colour used
on the documentation site's links and buttons (checked with a Playwright pass on 2026-11-05),
so it is recorded as `accentDerived`; it says nothing about the admin's palette. The pattern's
own spacing comes from its code (D4), not from this run.

## Validation

Built on 2026-11-05: a payment-settings page (merchant info, settlement, retry policy, connected
providers, reset) in the local demo project `styleseed-demo-v6/payments-console`
(`settings.html`, commit `853ac16`), a screen none of the sources show. Bundle
`operations-console × product-ui × fintech × settings`, artifact `payment-settings`, StyleSeed 5.0.0.

- R1: five groups stacked, each `2fr : 5fr` from 768px and one column below; page width capped at
  1040px instead of scaling the ratio.
- R2: group title plus one-line description; no body paragraphs.
- R3: save bar hidden until a change exists, "저장하지 않은 변경 n건", confirmation dialog for reset
  and disconnect, toast after save, leave guard; a failed save keeps the draft.
- R4: provider rows with name, status badge (neutral when connected, warning dot when not) and one
  action each; the reset card is the only card with a functional danger border.
- R5: spacing only from the project's 4px scale and the bundle's spatial roles.

Self-score 92/100 with the ss-score rubric (colour 14, hierarchy 15, layout 11, cards 10, states 17,
motion 6, coherence 10, distinctiveness 9), read from the code plus renders at 1440 and 390. The
deterministic scan reports only media-query breakpoint warnings that the sibling screens share.
This is the maintainer's agent scoring its own screen; it is not expert approval, and the
candidates stay `candidate` until a named review.

## What this case does not claim

Shopify's internal research, metrics or decision process beyond the sentences quoted from its
public documentation. Everything else here is labelled as our reading.
