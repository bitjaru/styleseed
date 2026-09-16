# Resource operations — common task (draft)

Build three connected React/Tailwind v4 screens using the provided library and synthetic data.
This is an existing-library **rehearsal**, not an expert-approved reference or a completed app.
No backend, external font, image, analytics, authentication service, or network API is needed.
Use the provided dependency lock. The starter intentionally contains no completed screens.

## Same constraints for every condition

- Preserve `src/ui/`, `src/styles/theme.css`, and `src/styles/recipes.css` byte-for-byte.
  Use the provided components through their actual APIs; composition/wrappers may live elsewhere.
- Use the existing semantic token roles, system fonts, light mode, and
  `data-styleseed-recipe="enterprise-workbench"` on the app root. These are provisional fixture
  inputs, not a human approval event or a claim about Stripe's official design system.
- Implement at 1440×900 and 390×844. Maintain readable hierarchy, keyboard access, labels,
  visible focus, 44px interactive targets, and reduced-motion support. Do not hide failures
  by deleting required content or actions. Record any incompatibility with the supplied library.
- Native HTML is allowed for primitives missing from the library (for example select/checkbox).
  Do not replace supplied Button/Input/Table/Label/Badge components with lookalike duplicates.
- The pure functions in `fixture/model.mjs` own data behavior. Keep them and the fixtures intact;
  state transitions and asynchronous UI feedback are your implementation responsibility.
- Run `npm run test:contract` and `npm run build`, then exercise the actual browser flows and
  report what was and was not checked. A passing model test does not prove the UI works.

## Resource list — `/resources`

Search by ID, name, or owner; trim whitespace and ignore case. Combine search with status
(`all`, `active`, `paused`). Select visible rows with accessible checkboxes and a labelled
select-all control; expose selected count and clear selection. Clear selection on filter or
search changes so hidden records are never changed accidentally.

Bulk pause requires confirmation listing affected names/count. A viewer cannot mutate records;
one unknown, already-paused, or protected record rejects the whole operation without partial
updates. Cancellation preserves data and selection. Success updates list/detail consistently.
Support loading, empty dataset, filtered no-results, and request error with retry.

## Detail — `/resources/[id]`

Open the selected record, show its status, owner, protection state, and chronological history.
Back navigation preserves list search/filter. Show permission restrictions with a reason, not
only a disabled icon. Support loading, unknown ID, unavailable history, and request error/retry.
Use the same resource state as the list; do not invent a second copy after a bulk mutation.

## Settings — `/settings`

Edit workspace name (2–40 trimmed characters), digest frequency (`daily`/`weekly`/`off`), and
retention days (whole number 7–90). Show adjacent validation messages, an unsaved-changes
indicator, saving feedback, saved confirmation, and simulated save failure that retains input.
Allow correction/retry. Navigating away while dirty requires discard/stay confirmation.
Views may edit a local draft, but saving requires the editor role. Do not claim server persistence.

## Reproducible test controls

Expose a clearly separated fixture-control panel or query parameters for loading/empty/error,
viewer/editor role, unavailable history, and failed/successful save. Keep the real user actions
operable; these controls must not be mistaken for product navigation or production capabilities.
Record the control values with screenshots. Do not add decorative metrics or invented customers.

Deliver source, build/test commands, matched screenshots, a functionality checklist with failures,
and notes on library reuse and unsupported decisions. Do not assign yourself expert approval.
