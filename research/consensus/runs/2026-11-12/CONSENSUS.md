# Agreement across design systems — run `2026-11-12`

This run measured 24 published demo screens of 5 design systems (lineages) with the repository's design, structure, and render-fault probes and the study's control probe. One lineage counts once, however many of its screens were measured. A row on one page type is a candidate when at least 3 lineages hold the same value, they are at least two thirds of the lineages measured on that row, and at least 2 of them are product systems (systems a company builds its own products with); kits count but cannot carry a row. Fragments (form compositions without an app shell) are shown beside the numbers and decide nothing. A row is a count of what published demo screens rendered. It is not a review and not design acceptance, and it gates nothing.

## Run

- Screens listed 32: measured 24, failed 0, skipped 8.
- Skipped: `patternfly-dashboard` (terms), `patternfly-table` (terms), `patternfly-data-list` (terms), `patternfly-card-view` (terms), `patternfly-primary-detail` (terms), `patternfly-description-list` (terms), `patternfly-tabs-table` (terms), `patternfly-form` (terms).
- Lineages: 4 product systems (`cloudscape`, `patternfly`, `primer`, `carbon`), 2 kits (`antpro`, `shadcn`); 5 with a measured screen.
- Viewports 1440×900 and 390×844, one page load each, no scroll pass; nothing was clicked, hovered, or typed.

## Claims that map to a catalog rule

Rows whose lineages agree on the opposite of the rule's clause are listed first. An `all` row pools every page type and is context; only page-type rows and the lineage-scope rows can count.

| Claim | Rule | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |
|---|---|---|---|---|---|---|---|
| `lineage.spacingBase` | `CRAFT-spacing-scale` | all | 1440 and 390 | 3 | false 3 (2 product systems, 1 kit) | — | candidate, against the clause |
| `controls.shareHeight` | `CRAFT-control-heights` | dashboard | 1440 | 1 | true 1 (1 kit) | true 1 (1 kit) | thin |
| `controls.shareHeight` | `CRAFT-control-heights` | list | 1440 | 2 | true 2 (1 product system, 1 kit) | true 2 (1 product system, 1 kit) | thin |
| `controls.shareHeight` | `CRAFT-control-heights` | form | 1440 | 3 | true 3 (1 product system, 2 kits) | true 4 (2 product systems, 2 kits) | split |
| `controls.shareHeight` | `CRAFT-control-heights` | detail | 1440 | 1 | true 1 (1 product system) | true 1 (1 product system) | thin |
| `controls.shareHeight` | `CRAFT-control-heights` | all (context) | 1440 | 3 | true 3 (1 product system, 2 kits) | true 4 (2 product systems, 2 kits) | split |
| `controls.rowShareHeight` | `CRAFT-control-heights` | dashboard | 1440 | 1 | true 1 (1 kit) | true 1 (1 kit) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | list | 1440 | 1 | true 1 (1 kit) | true 1 (1 kit) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | form | 1440 | 1 | true 1 (1 product system) | true 1 (1 product system) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | detail | 1440 | 0 | none | none | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | all (context) | 1440 | 3 | true 3 (1 product system, 2 kits) | true 3 (1 product system, 2 kits) | split |
| `controls.pointerUnder44` | `CRAFT-control-heights` | dashboard | 1440 | 3 | true 3 (1 product system, 2 kits) | true 3 (1 product system, 2 kits) | split |
| `controls.pointerUnder44` | `CRAFT-control-heights` | list | 1440 | 2 | true 2 (1 product system, 1 kit) | true 2 (1 product system, 1 kit) | thin |
| `controls.pointerUnder44` | `CRAFT-control-heights` | form | 1440 | 4 | true 4 (2 product systems, 2 kits) | true 5 (3 product systems, 2 kits) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | detail | 1440 | 3 | true 3 (2 product systems, 1 kit) | true 3 (2 product systems, 1 kit) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | all (context) | 1440 | 4 | true 4 (2 product systems, 2 kits) | true 5 (3 product systems, 2 kits) | candidate |
| `list.overFourRows` | `DL-21-density-by-task` | list | 1440 | 2 | true 1 (1 kit) · mixed 1 (1 product system) | — | thin |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | dashboard | 1440 and 390 | 3 | true 3 (1 product system, 2 kits) | — | split |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | list | 1440 and 390 | 2 | true 2 (1 product system, 1 kit) | — | thin |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | form | 1440 and 390 | 2 | true 2 (1 product system, 1 kit) | — | thin |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | detail | 1440 and 390 | 3 | true 3 (2 product systems, 1 kit) | — | candidate |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | all (context) | 1440 and 390 | 4 | true 4 (2 product systems, 2 kits) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | dashboard | 1440 and 390 | 3 | true 3 (1 product system, 2 kits) | — | split |
| `icons.noEmoji` | `CRAFT-functional-icons` | list | 1440 and 390 | 2 | true 2 (1 product system, 1 kit) | — | thin |
| `icons.noEmoji` | `CRAFT-functional-icons` | form | 1440 and 390 | 3 | true 3 (1 product system, 2 kits) | — | split |
| `icons.noEmoji` | `CRAFT-functional-icons` | detail | 1440 and 390 | 3 | true 3 (2 product systems, 1 kit) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | all (context) | 1440 and 390 | 4 | true 4 (2 product systems, 2 kits) | — | candidate |
| `icons.oneFamily` | `CRAFT-icon-family` | dashboard | 1440 and 390 | 3 | false 3 (1 product system, 2 kits) | — | split |
| `icons.oneFamily` | `CRAFT-icon-family` | list | 1440 and 390 | 2 | false 1 (1 product system) · true 1 (1 kit) | — | thin |
| `icons.oneFamily` | `CRAFT-icon-family` | form | 1440 and 390 | 3 | true 3 (1 product system, 2 kits) | — | split |
| `icons.oneFamily` | `CRAFT-icon-family` | detail | 1440 and 390 | 3 | true 3 (2 product systems, 1 kit) | — | candidate |
| `icons.oneFamily` | `CRAFT-icon-family` | all (context) | 1440 and 390 | 4 | false 3 (1 product system, 2 kits) · true 1 (1 product system) | — | split |
| `lineage.rolesConstant` | `INV-05-no-unexplained-role-drift` | all | 1440 and 390 | 3 | false 2 (1 product system, 1 kit) · true 1 (1 product system) | — | split |

## Consistency claims without a rule

A candidate here is a proposal for the maintainer to read, not a rule.

| Claim | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |
|---|---|---|---|---|---|---|
| `controls.shareRadius` | dashboard | 1440 | 1 | true 1 (1 kit) | true 1 (1 kit) | thin |
| `controls.shareRadius` | list | 1440 | 2 | false 1 (1 product system) · true 1 (1 kit) | false 1 (1 product system) · true 1 (1 kit) | thin |
| `controls.shareRadius` | form | 1440 | 3 | true 2 (2 kits) · false 1 (1 product system) | true 3 (1 product system, 2 kits) · false 1 (1 product system) | split |
| `controls.shareRadius` | detail | 1440 | 1 | false 1 (1 product system) | false 1 (1 product system) | thin |
| `controls.shareRadius` | all (context) | 1440 | 3 | true 2 (2 kits) · false 1 (1 product system) | true 3 (1 product system, 2 kits) · false 1 (1 product system) | split |
| `controls.narrowAtLeast44` | dashboard | 390 | 3 | false 3 (1 product system, 2 kits) | false 3 (1 product system, 2 kits) | split |
| `controls.narrowAtLeast44` | list | 390 | 2 | false 2 (1 product system, 1 kit) | false 2 (1 product system, 1 kit) | thin |
| `controls.narrowAtLeast44` | form | 390 | 4 | false 4 (2 product systems, 2 kits) | false 5 (3 product systems, 2 kits) | candidate |
| `controls.narrowAtLeast44` | detail | 390 | 3 | false 3 (2 product systems, 1 kit) | false 3 (2 product systems, 1 kit) | candidate |
| `controls.narrowAtLeast44` | all (context) | 390 | 4 | false 4 (2 product systems, 2 kits) | false 5 (3 product systems, 2 kits) | candidate |
| `fields.inPanel` | form | 1440 | 3 | true 3 (1 product system, 2 kits) | true 3 (1 product system, 2 kits) · false 1 (1 product system) | split |
| `primary.onePerSection` | dashboard | 1440 | 3 | true 2 (1 product system, 1 kit) · false 1 (1 kit) | — | split |
| `primary.onePerSection` | list | 1440 | 2 | true 2 (1 product system, 1 kit) | — | thin |
| `primary.onePerSection` | form | 1440 | 4 | true 4 (2 product systems, 2 kits) | — | candidate |
| `primary.onePerSection` | detail | 1440 | 3 | true 2 (1 product system, 1 kit) · mixed 1 (1 product system) | — | split |
| `primary.onePerSection` | all (context) | 1440 | 4 | true 3 (2 product systems, 1 kit) · mixed 1 (1 kit) | — | candidate |
| `lineage.buttonHeight` | all | 1440 | 2 | false 1 (1 kit) · true 1 (1 product system) | — | thin |
| `motion.reducedMotionRules` | all | 1440 and 390 | 4 | true 4 (2 product systems, 2 kits) | — | candidate |

## Dimensions

A dimension stays a project's choice. It is reported as a distribution only, with each lineage's per-screen values.

| Claim | Page type | Viewport | Distribution | Per lineage |
|---|---|---|---|---|
| `button.height` | dashboard | 1440 | 32 2 (1 product system, 1 kit) · 24 1 (1 kit) | cloudscape 32 · antpro 24 · shadcn 32 |
| `button.height` | list | 1440 | 32 2 (1 product system, 1 kit) | cloudscape 32, 32 · antpro 32, 32, 200 |
| `button.height` | form | 1440 | 32 3 (2 product systems, 1 kit) · 36 1 (1 kit) | cloudscape 32, 32 · antpro 32, 32, 32 · shadcn 36 · primer 32 |
| `button.height` | detail | 1440 | 32 2 (1 product system, 1 kit) · 20 1 (1 product system) | cloudscape 32, 32, 32 · antpro 32 · primer 20 |
| `button.height` | all (context) | 1440 | 32 2 (1 product system, 1 kit) · mixed 2 (1 product system, 1 kit) | cloudscape 32, 32, 32, 32, 32, 32, 32, 32 · antpro 24, 32, 32, 200, 32, 32, 32, 32 · shadcn 32, 36 · primer 20, 32 |
| `field.height` | dashboard | 1440 | 24 1 (1 kit) · 32 1 (1 kit) | antpro 24 · shadcn 32 |
| `field.height` | list | 1440 | 32 2 (1 product system, 1 kit) | cloudscape 32, 32 · antpro 32, 32 |
| `field.height` | form | 1440 | 32 2 (1 product system, 1 kit) · 36 1 (1 kit) | cloudscape 32 · antpro 32, 32, 32 · shadcn 36 |
| `field.height` | detail | 1440 | 32 1 (1 product system) | cloudscape 32 |
| `field.height` | all (context) | 1440 | 32 2 (1 product system, 1 kit) · mixed 1 (1 kit) | cloudscape 32, 32, 32, 32 · antpro 24, 32, 32, 32, 32, 32 · shadcn 32, 36 |
| `field.textSize` | dashboard | 1440 | 14 2 (2 kits) | antpro 14 · shadcn 14 |
| `field.textSize` | list | 1440 | 14 2 (1 product system, 1 kit) | cloudscape 14, 14 · antpro 14, 14 |
| `field.textSize` | form | 1440 | 14 3 (1 product system, 2 kits) | cloudscape 14 · antpro 14, 14, 14 · shadcn 14 |
| `field.textSize` | detail | 1440 | 14 1 (1 product system) | cloudscape 14 |
| `field.textSize` | all (context) | 1440 | 14 3 (1 product system, 2 kits) | cloudscape 14, 14, 14, 14 · antpro 14, 14, 14, 14, 14, 14 · shadcn 14, 14 |
| `text.bodySize` | dashboard | 1440 | 14 3 (1 product system, 2 kits) | cloudscape 14 · antpro 14, 14 · shadcn 14 |
| `text.bodySize` | list | 1440 | 14 2 (1 product system, 1 kit) | cloudscape 14, 14 · antpro 14, 14, 14 |
| `text.bodySize` | form | 1440 | 14 2 (2 kits) · mixed 1 (1 product system) | cloudscape 12, 14 · antpro 14 · shadcn 14 |
| `text.bodySize` | detail | 1440 | 14 2 (1 product system, 1 kit) · 16 1 (1 product system) | cloudscape 14, 14, 14 · antpro 14, 14 · primer 16 |
| `text.bodySize` | all (context) | 1440 | 14 3 (1 product system, 2 kits) · 16 1 (1 product system) | cloudscape 14, 14, 14, 12, 14, 14, 14, 14 · antpro 14, 14, 14, 14, 14, 14, 14, 14 · shadcn 14, 14 · primer 16 |
| `table.rowHeight` | list | 1440 | 40 1 (1 product system) · 48 1 (1 kit) | cloudscape 40 · antpro 48 |
| `motion.transitionAll` | all | 1440 and 390 | 0 2 (2 product systems) · 0.5 2 (2 kits) | cloudscape transitions 86 all 0, transitions 239 all 0, transitions 259 all 0, transitions 79 all 0, transitions 30 all 0, transitions 22 all 0, transitions 56 all 0, transitions 22 all 0 · antpro transitions 337 all 78, transitions 207 all 34, transitions 913 all 81, transitions 205 all 40, transitions 222 all 10, transitions 173 all 46, transitions 255 all 54, transitions 191 all 38, transitions 349 all 12, transitions 327 all 40 · shadcn transitions 243 all 78, transitions 10 all 6 · primer transitions 32 all 0, transitions 16 all 0, transitions 16 all 0 |

## What this says about the open cards of `research/reviews/batch-01.md`

A count is context for whoever answers a card. It answers no card and is not written into the batch file.

| Card | Question | From this run | Counts |
|---|---|---|---|
| 1 | one height for controls that sit together | yes, as counts on desktop console screens | `controls.shareHeight`: dashboard true 1; list true 2; form true 3; detail true 1; all true 3; `controls.rowShareHeight`: dashboard true 1; list true 1; form true 1; detail none; all true 3 |
| 2 | default text field height on desktop | yes, as a distribution of field and button heights; the card's options do not list every height seen here | `field.height`: dashboard 24 1 · 32 1; list 32 2; form 32 2 · 36 1; detail 32 1; all 32 2 · mixed 1; `button.height`: dashboard 32 2 · 24 1; list 32 2; form 32 3 · 36 1; detail 32 2 · 20 1; all 32 2 · mixed 2 |
| 3 | 44px is a touch rule | half: buttons under 44px at 1440 are counted; whether a system enlarges controls for touch is not, because 390 is a width and no coarse pointer is emulated | `controls.pointerUnder44`: dashboard true 3; list true 2; form true 4; detail true 3; all true 4; `controls.narrowAtLeast44`: dashboard false 3; list false 2; form false 4; detail false 3; all false 4 |
| 4 | `brand` and `primary` | no: it asks about our own role names | — |
| 5 | body text size | yes for console screens, as distributions of field text size and of the size most characters are set in; nothing about reading or marketing pages | `field.textSize`: dashboard 14 2; list 14 2; form 14 3; detail 14 1; all 14 3; `text.bodySize`: dashboard 14 3; list 14 2; form 14 2 · mixed 1; detail 14 2 · 16 1; all 14 3 · 16 1 |
| 6 | colour change under reduced motion | no: that needs reduced-motion emulation, a further load per screen; only whether reduced-motion rules exist is counted | `motion.reducedMotionRules`: all true 4 |
| 7 | no input fields inside cards | yes, as counts on form screens; a page's one wide content surface also reads as a panel (`wide`) | `fields.inPanel`: form true 3 |
| 8 | one corner radius for controls that sit together | yes, as counts | `controls.shareRadius`: dashboard true 1; list false 1 · true 1; form true 2 · false 1; detail false 1; all true 2 · false 1 |
| 9 | button hover on desktop | no: it needs a pointer over the button, and a count of `:hover` rules does not answer it | — |
| 10 | what is wrong with our settings screen | no | — |

## Limits

1. Sites change. A run is a dated snapshot; its raw numbers are kept so a later run can be compared, and an old run is never edited.
2. Demos are not products. They carry demo chrome (switchers, theme widgets, notice banners), placeholder titles, and invented data. The control probe leaves navigation, page-level headers and footers, and fixed widgets out; the design, structure, and fault probes measure everything.
3. Lineages are only partly independent. Web systems for desktop consoles share conventions and influences; agreement among them says what such systems do, not what suits a consumer or a mobile product. Kits are flagged and cannot carry a row.
4. The sample is small. With three or four lineages on a page type, two thirds is often all of them, and one changed page can flip a row.
5. The control probe is new. Its field box and panel tests are heuristics checked on five systems at one width: a date-range field with two inputs reads as two bare inputs, and a page's single wide surface reads as a panel.
6. 390 is a width, not a phone: no touch, no coarse pointer, no mobile user agent. A dialog that opens by itself is measured as it stands, or the viewport is dropped when it covers half of it or more.
7. Probe limits. Shadow roots, iframes, and inner scroll containers are not entered; text boxes depend on the fonts each site serves and on the measuring machine; the structure probe finds no sections on some pages, so `primary.onePerSection` may be thin.
8. Page type is the study's own label, and some screens are mixed (a table with an open detail panel).
9. No scroll pass. Content a page renders only after scrolling is not measured.
