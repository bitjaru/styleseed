# Agreement across design systems — run `2026-11-16`

This run measured 45 published demo screens of 8 design systems (lineages) with the repository's design, structure, and render-fault probes and the study's control and anatomy probes. One lineage counts once, however many of its screens were measured. A row on one page type is a candidate when at least 3 lineages hold the same value, they are at least two thirds of the lineages measured on that row, and at least 2 of them are product systems (systems an organisation builds its own products or services with); kits count but cannot carry a row. Fragments (form compositions without an app shell) are shown beside the numbers and decide nothing. A row is a count of what published demo screens rendered. It is not a review and not design acceptance, and it gates nothing.

## Run

- Screens listed 46: measured 45, failed 1, skipped 0.
- Failed: `govuk-feedback` (unexpected-content).
- Lineages: 5 product systems (`cloudscape`, `patternfly`, `primer`, `carbon`, `govuk`), 3 kits (`antpro`, `shadcn`, `mui`); 8 with a measured screen. Context: 7 console lineages, 1 public-service lineage (`govuk`).
- Viewports 1440×900 and 390×844, one page load each, no scroll pass; nothing was clicked, hovered, or typed.

## Claims that map to a catalog rule

Rows whose lineages agree on the opposite of the rule's clause are listed first. An `all` row pools every page type and is context; only page-type rows and the lineage-scope rows can count.

| Claim | Rule | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |
|---|---|---|---|---|---|---|---|
| `lineage.rolesConstant` | `INV-05-no-unexplained-role-drift` | all | 1440 and 390 | 6 | false 4 (2 product systems, 2 kits) · true 2 (2 product systems) | — | candidate, against the clause |
| `lineage.spacingBase` | `CRAFT-spacing-scale` | all | 1440 and 390 | 6 | false 5 (3 product systems, 2 kits) · true 1 (1 product system) | — | candidate, against the clause |
| `controls.shareHeight` | `CRAFT-control-heights` | dashboard | 1440 | 2 | false 1 (1 kit) · true 1 (1 kit) | false 1 (1 kit) · true 1 (1 kit) | thin |
| `controls.shareHeight` | `CRAFT-control-heights` | list | 1440 | 5 | true 4 (3 product systems, 1 kit) · false 1 (1 kit) | true 4 (3 product systems, 1 kit) · false 1 (1 kit) | candidate |
| `controls.shareHeight` | `CRAFT-control-heights` | form | 1440 | 5 | true 5 (2 product systems, 3 kits) | true 7 (4 product systems, 3 kits) | candidate |
| `controls.shareHeight` | `CRAFT-control-heights` | detail | 1440 | 1 | true 1 (1 product system) | true 1 (1 product system) | thin |
| `controls.shareHeight` | `CRAFT-control-heights` | all (context) | 1440 | 6 | true 5 (3 product systems, 2 kits) · false 1 (1 kit) | true 6 (4 product systems, 2 kits) · false 1 (1 kit) | candidate |
| `controls.rowShareHeight` | `CRAFT-control-heights` | dashboard | 1440 | 1 | true 1 (1 kit) | true 1 (1 kit) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | list | 1440 | 2 | true 2 (1 product system, 1 kit) | true 2 (1 product system, 1 kit) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | form | 1440 | 2 | true 2 (2 product systems) | true 2 (2 product systems) | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | detail | 1440 | 0 | none | none | thin |
| `controls.rowShareHeight` | `CRAFT-control-heights` | all (context) | 1440 | 5 | true 5 (3 product systems, 2 kits) | true 5 (3 product systems, 2 kits) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | dashboard | 1440 | 5 | true 5 (2 product systems, 3 kits) | true 5 (2 product systems, 3 kits) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | list | 1440 | 5 | true 5 (3 product systems, 2 kits) | true 5 (3 product systems, 2 kits) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | form | 1440 | 6 | true 6 (3 product systems, 3 kits) | true 8 (5 product systems, 3 kits) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | detail | 1440 | 4 | true 4 (3 product systems, 1 kit) | true 4 (3 product systems, 1 kit) | candidate |
| `controls.pointerUnder44` | `CRAFT-control-heights` | all (context) | 1440 | 7 | true 7 (4 product systems, 3 kits) | true 8 (5 product systems, 3 kits) | candidate |
| `list.overFourRows` | `DL-21-density-by-task` | list | 1440 | 5 | true 2 (1 product system, 1 kit) · mixed 2 (2 product systems) · false 1 (1 kit) | — | split |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | dashboard | 1440 and 390 | 5 | true 5 (2 product systems, 3 kits) | — | candidate |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | list | 1440 and 390 | 4 | true 4 (3 product systems, 1 kit) | — | candidate |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | form | 1440 and 390 | 3 | true 3 (1 product system, 2 kits) | — | split |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | detail | 1440 and 390 | 5 | true 5 (4 product systems, 1 kit) | — | candidate |
| `amounts.oneLine` | `DL-23-amounts-never-wrap` | all (context) | 1440 and 390 | 7 | true 7 (4 product systems, 3 kits) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | dashboard | 1440 and 390 | 5 | true 5 (2 product systems, 3 kits) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | list | 1440 and 390 | 5 | true 5 (3 product systems, 2 kits) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | form | 1440 and 390 | 5 | true 5 (2 product systems, 3 kits) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | detail | 1440 and 390 | 5 | true 5 (4 product systems, 1 kit) | — | candidate |
| `icons.noEmoji` | `CRAFT-functional-icons` | all (context) | 1440 and 390 | 7 | true 7 (4 product systems, 3 kits) | — | candidate |
| `icons.oneFamily` | `CRAFT-icon-family` | dashboard | 1440 and 390 | 5 | false 3 (1 product system, 2 kits) · true 2 (1 product system, 1 kit) | — | split |
| `icons.oneFamily` | `CRAFT-icon-family` | list | 1440 and 390 | 5 | true 3 (1 product system, 2 kits) · false 2 (2 product systems) | — | split |
| `icons.oneFamily` | `CRAFT-icon-family` | form | 1440 and 390 | 5 | true 5 (2 product systems, 3 kits) | — | candidate |
| `icons.oneFamily` | `CRAFT-icon-family` | detail | 1440 and 390 | 5 | true 4 (3 product systems, 1 kit) · false 1 (1 product system) | — | candidate |
| `icons.oneFamily` | `CRAFT-icon-family` | all (context) | 1440 and 390 | 7 | false 4 (2 product systems, 2 kits) · true 3 (2 product systems, 1 kit) | — | split |

## Consistency claims without a rule

A candidate here is a proposal for the maintainer to read, not a rule.

| Claim | Page type | Viewport | Lineages measured | Distribution | With fragments | Status |
|---|---|---|---|---|---|---|
| `controls.shareRadius` | dashboard | 1440 | 2 | false 1 (1 kit) · true 1 (1 kit) | false 1 (1 kit) · true 1 (1 kit) | thin |
| `controls.shareRadius` | list | 1440 | 5 | false 2 (1 product system, 1 kit) · true 2 (1 product system, 1 kit) · mixed 1 (1 product system) | false 2 (1 product system, 1 kit) · true 2 (1 product system, 1 kit) · mixed 1 (1 product system) | split |
| `controls.shareRadius` | form | 1440 | 5 | true 4 (1 product system, 3 kits) · false 1 (1 product system) | true 6 (3 product systems, 3 kits) · false 1 (1 product system) | split |
| `controls.shareRadius` | detail | 1440 | 1 | false 1 (1 product system) | false 1 (1 product system) | thin |
| `controls.shareRadius` | all (context) | 1440 | 6 | true 4 (1 product system, 3 kits) · false 1 (1 product system) · mixed 1 (1 product system) | true 6 (3 product systems, 3 kits) · false 1 (1 product system) | split |
| `controls.narrowAtLeast44` | dashboard | 390 | 5 | false 5 (2 product systems, 3 kits) | false 5 (2 product systems, 3 kits) | candidate |
| `controls.narrowAtLeast44` | list | 390 | 5 | false 5 (3 product systems, 2 kits) | false 5 (3 product systems, 2 kits) | candidate |
| `controls.narrowAtLeast44` | form | 390 | 6 | false 6 (3 product systems, 3 kits) | false 8 (5 product systems, 3 kits) | candidate |
| `controls.narrowAtLeast44` | detail | 390 | 4 | false 4 (3 product systems, 1 kit) | false 4 (3 product systems, 1 kit) | candidate |
| `controls.narrowAtLeast44` | all (context) | 390 | 7 | false 7 (4 product systems, 3 kits) | false 8 (5 product systems, 3 kits) | candidate |
| `fields.inPanel` | form | 1440 | 5 | true 4 (1 product system, 3 kits) · false 1 (1 product system) | true 4 (1 product system, 3 kits) · false 3 (3 product systems) | split |
| `primary.onePerSection` | dashboard | 1440 | 5 | true 4 (2 product systems, 2 kits) · false 1 (1 kit) | — | candidate |
| `primary.onePerSection` | list | 1440 | 5 | true 5 (3 product systems, 2 kits) | — | candidate |
| `primary.onePerSection` | form | 1440 | 6 | true 6 (3 product systems, 3 kits) | — | candidate |
| `primary.onePerSection` | detail | 1440 | 5 | true 4 (3 product systems, 1 kit) · mixed 1 (1 product system) | — | candidate |
| `primary.onePerSection` | all (context) | 1440 | 7 | true 6 (4 product systems, 2 kits) · mixed 1 (1 kit) | — | candidate |
| `lineage.buttonHeight` | all | 1440 | 5 | true 3 (3 product systems) · false 2 (2 kits) | — | split |
| `motion.reducedMotionRules` | all | 1440 and 390 | 7 | true 6 (3 product systems, 3 kits) · false 1 (1 product system) | — | candidate |

## Dimensions

A dimension stays a project's choice. It is reported as a distribution only, with each lineage's per-screen values.

| Claim | Page type | Viewport | Distribution | Per lineage |
|---|---|---|---|---|
| `button.height` | dashboard | 1440 | 32 2 (1 product system, 1 kit) · 36 2 (1 product system, 1 kit) · 24 1 (1 kit) | cloudscape 32 · patternfly 36 · antpro 24 · shadcn 32 · mui 36 |
| `button.height` | list | 1440 | 32 2 (1 product system, 1 kit) · 40 2 (1 product system, 1 kit) · 36 1 (1 product system) | cloudscape 32, 32 · patternfly 36, 36, 36, 36 · antpro 32, 32 · mui 40 · govuk 40, 40, 40 |
| `button.height` | form | 1440 | 32 3 (2 product systems, 1 kit) · 40 2 (1 product system, 1 kit) · 36 1 (1 kit) | cloudscape 32, 32 · antpro 32, 32, 32 · shadcn 36 · primer 32 · mui 40, 40, 40 · govuk 40, 40, 40 |
| `button.height` | detail | 1440 | 32 2 (1 product system, 1 kit) · 36 1 (1 product system) · 40 1 (1 product system) | cloudscape 32, 32, 32 · patternfly 36, 36 · antpro 32 · govuk 40, 40 |
| `button.height` | all (context) | 1440 | 32 3 (2 product systems, 1 kit) · 40 2 (1 product system, 1 kit) · 36 1 (1 product system) · mixed 1 (1 kit) | cloudscape 32, 32, 32, 32, 32, 32, 32, 32 · patternfly 36, 36, 36, 36, 36, 36, 36 · antpro 24, 32, 32, 32, 32, 32, 32 · shadcn 32, 36 · primer 32 · mui 36, 40, 40, 40, 40 · govuk 40, 40, 40, 40, 40, 40, 40, 40 |
| `field.height` | dashboard | 1440 | 32 2 (2 kits) · 28 1 (1 kit) | antpro 32 · shadcn 32 · mui 28 |
| `field.height` | list | 1440 | 32 2 (1 product system, 1 kit) · 28 1 (1 kit) · 36 1 (1 product system) · 40 1 (1 product system) | cloudscape 32, 32 · patternfly 36, 36, 36, 36 · antpro 32, 32 · mui 28 · govuk 40 |
| `field.height` | form | 1440 | 32 2 (1 product system, 1 kit) · 40 2 (1 product system, 1 kit) · 36 1 (1 kit) | cloudscape 32 · antpro 32, 32, 32 · shadcn 36 · mui 40, 40, 36 · govuk 40, 40, 40 |
| `field.height` | detail | 1440 | 32 1 (1 product system) | cloudscape 32 |
| `field.height` | all (context) | 1440 | 32 2 (1 product system, 1 kit) · mixed 2 (2 kits) · 36 1 (1 product system) · 40 1 (1 product system) | cloudscape 32, 32, 32, 32 · patternfly 36, 36, 36, 36 · antpro 32, 32, 32, 32, 32, 32 · shadcn 32, 36 · mui 28, 28, 40, 40, 36 · govuk 40, 40, 40, 40 |
| `field.textSize` | dashboard | 1440 | 14 3 (3 kits) | antpro 14 · shadcn 14 · mui 14 |
| `field.textSize` | list | 1440 | 14 4 (2 product systems, 2 kits) · 16 1 (1 product system) | cloudscape 14, 14 · patternfly 14, 14, 14, 14 · antpro 14, 14 · mui 14 · govuk 16 |
| `field.textSize` | form | 1440 | 14 4 (1 product system, 3 kits) · 19 1 (1 product system) | cloudscape 14 · antpro 14, 14, 14 · shadcn 14 · mui 14, 14, 14 · govuk 19, 19, 19 |
| `field.textSize` | detail | 1440 | 14 1 (1 product system) | cloudscape 14 |
| `field.textSize` | all (context) | 1440 | 14 5 (2 product systems, 3 kits) · 19 1 (1 product system) | cloudscape 14, 14, 14, 14 · patternfly 14, 14, 14, 14 · antpro 14, 14, 14, 14, 14, 14 · shadcn 14, 14 · mui 14, 14, 14, 14, 14 · govuk 16, 19, 19, 19 |
| `text.bodySize` | dashboard | 1440 | 14 5 (2 product systems, 3 kits) | cloudscape 14 · patternfly 14 · antpro 14, 14 · shadcn 14 · mui 14 |
| `text.bodySize` | list | 1440 | 14 3 (2 product systems, 1 kit) · mixed 1 (1 product system) | cloudscape 14, 14 · patternfly 14, 14, 14, 14 · antpro 14, 14, 14 · govuk 16, 19 |
| `text.bodySize` | form | 1440 | 14 3 (3 kits) · 36 1 (1 product system) · mixed 1 (1 product system) | cloudscape 12, 14 · antpro 14 · shadcn 14 · mui 14 · govuk 36, 36 |
| `text.bodySize` | detail | 1440 | 14 3 (2 product systems, 1 kit) · 16 1 (1 product system) · 19 1 (1 product system) | cloudscape 14, 14, 14 · patternfly 14, 14 · antpro 14, 14 · primer 16 · govuk 19, 19 |
| `text.bodySize` | all (context) | 1440 | 14 5 (2 product systems, 3 kits) · 16 1 (1 product system) · mixed 1 (1 product system) | cloudscape 14, 14, 14, 12, 14, 14, 14, 14 · patternfly 14, 14, 14, 14, 14, 14, 14 · antpro 14, 14, 14, 14, 14, 14, 14, 14 · shadcn 14, 14 · primer 16 · mui 14, 14 · govuk 16, 19, 36, 36, 19, 19 |
| `table.rowHeight` | list | 1440 | 40 1 (1 product system) · 48 1 (1 kit) · 52 1 (1 kit) · 56 1 (1 product system) | cloudscape 40 · patternfly 56 · antpro 48 · mui 52 |
| `motion.transitionAll` | all | 1440 and 390 | 0 3 (3 product systems) · 0.5 3 (3 kits) | cloudscape transitions 86 all 0, transitions 239 all 0, transitions 259 all 0, transitions 79 all 0, transitions 30 all 0, transitions 22 all 0, transitions 56 all 0, transitions 22 all 0 · patternfly transitions 123 all 0, transitions 62 all 0, transitions 82 all 0, transitions 87 all 0, transitions 73 all 0, transitions 50 all 0, transitions 86 all 0 · antpro transitions 337 all 78, transitions 207 all 34, transitions 913 all 81, transitions 205 all 40, transitions 222 all 10, transitions 173 all 46, transitions 255 all 54, transitions 191 all 38, transitions 349 all 12, transitions 327 all 40 · shadcn transitions 243 all 78, transitions 10 all 6 · primer transitions 32 all 0, transitions 16 all 0, transitions 16 all 0 · mui transitions 937 all 72, transitions 144 all 13, transitions 72 all 17, transitions 74 all 17, transitions 81 all 16 · govuk transitions 0 all 0, transitions 0 all 0, transitions 0 all 0, transitions 0 all 0, transitions 0 all 0, transitions 0 all 0, transitions 0 all 0, transitions 0 all 0 |

## Component anatomy

What the buttons, fields, panels, tables, navigation, type, spacing, and motion of these screens measure, one lineage one vote. A value is what most of a lineage's eligible screens show; `mixed` is a lineage whose screens disagree. A row marked "set" lists every value a lineage uses, so its counts can exceed the lineages measured. A dimension stays a project's choice; these rows gate nothing.

### Buttons

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `button.padX` | dashboard | 3 | 13px on 1 of 3 (1 kit) · 22px on 1 of 3 (1 product system) · 24px on 1 of 3 (1 product system) | 13px on 1 of 3 (1 kit) · 22px on 1 of 3 (1 product system) · 24px on 1 of 3 (1 product system) | cloudscape 22px · patternfly 24px · mui 13px | — |
| `button.padX` | list | 4 | 12px on 1 of 4 (1 product system) · 16px on 1 of 4 (1 kit) · 22px on 1 of 4 (1 product system) · 24px on 1 of 4 (1 product system) | 12px on 1 of 4 (1 product system) · 16px on 1 of 4 (1 kit) · 22px on 1 of 4 (1 product system) · 24px on 1 of 4 (1 product system) | cloudscape 22px · patternfly 24px · antpro 16px · govuk 12px | — |
| `button.padX` | form | 6 | 16px on 2 of 6 (2 kits) · 12px on 1 of 6 (1 product system) · 13px on 1 of 6 (1 product system) · 17px on 1 of 6 (1 kit) · 22px on 1 of 6 (1 product system) | 16px on 3 of 8 (1 product system, 2 kits) · 8px on 1 of 8 (1 product system) · 12px on 1 of 8 (1 product system) · 13px on 1 of 8 (1 product system) · 17px on 1 of 8 (1 kit) · 22px on 1 of 8 (1 product system) | cloudscape 22px · antpro 16px · shadcn 16px · primer 13px · mui 17px · govuk 12px | — |
| `button.padX` | detail | 4 | 12px on 1 of 4 (1 product system) · 16px on 1 of 4 (1 kit) · 22px on 1 of 4 (1 product system) · 24px on 1 of 4 (1 product system) | 12px on 1 of 4 (1 product system) · 16px on 1 of 4 (1 kit) · 22px on 1 of 4 (1 product system) · 24px on 1 of 4 (1 product system) | cloudscape 22px · patternfly 24px · antpro 16px · govuk 12px | — |
| `button.padX` | all (context) | 7 | 16px on 2 of 7 (2 kits) · 12px on 1 of 7 (1 product system) · 13px on 1 of 7 (1 product system) · 17px on 1 of 7 (1 kit) · 22px on 1 of 7 (1 product system) · 24px on 1 of 7 (1 product system) | 16px on 3 of 8 (1 product system, 2 kits) · 12px on 1 of 8 (1 product system) · 13px on 1 of 8 (1 product system) · 17px on 1 of 8 (1 kit) · 22px on 1 of 8 (1 product system) · 24px on 1 of 8 (1 product system) | cloudscape 22px · patternfly 24px · antpro 16px · shadcn 16px · primer 13px · mui 17px · govuk 12px | — |
| `button.padRatio` | dashboard | 3 | 0.375 on 1 of 3 (1 kit) · 0.625 on 1 of 3 (1 product system) · 0.75 on 1 of 3 (1 product system) | 0.375 on 1 of 3 (1 kit) · 0.625 on 1 of 3 (1 product system) · 0.75 on 1 of 3 (1 product system) | cloudscape 0.75 · patternfly 0.625 · mui 0.375 | — |
| `button.padRatio` | list | 4 | 0.375 on 1 of 4 (1 product system) · 0.5 on 1 of 4 (1 kit) · 0.625 on 1 of 4 (1 product system) · 0.75 on 1 of 4 (1 product system) | 0.375 on 1 of 4 (1 product system) · 0.5 on 1 of 4 (1 kit) · 0.625 on 1 of 4 (1 product system) · 0.75 on 1 of 4 (1 product system) | cloudscape 0.75 · patternfly 0.625 · antpro 0.5 · govuk 0.375 | — |
| `button.padRatio` | form | 6 | 0.375 on 3 of 6 (2 product systems, 1 kit) · 0.5 on 2 of 6 (2 kits) · 0.75 on 1 of 6 (1 product system) | 0.375 on 4 of 8 (3 product systems, 1 kit) · 0.5 on 2 of 8 (2 kits) · 0.25 on 1 of 8 (1 product system) · 0.75 on 1 of 8 (1 product system) | cloudscape 0.75 · antpro 0.5 · shadcn 0.5 · primer 0.375 · mui 0.375 · govuk 0.375 | — |
| `button.padRatio` | detail | 4 | 0.375 on 1 of 4 (1 product system) · 0.5 on 1 of 4 (1 kit) · 0.625 on 1 of 4 (1 product system) · 0.75 on 1 of 4 (1 product system) | 0.375 on 1 of 4 (1 product system) · 0.5 on 1 of 4 (1 kit) · 0.625 on 1 of 4 (1 product system) · 0.75 on 1 of 4 (1 product system) | cloudscape 0.75 · patternfly 0.625 · antpro 0.5 · govuk 0.375 | — |
| `button.padRatio` | all (context) | 7 | 0.375 on 3 of 7 (2 product systems, 1 kit) · 0.5 on 2 of 7 (2 kits) · 0.625 on 1 of 7 (1 product system) · 0.75 on 1 of 7 (1 product system) | 0.375 on 4 of 8 (3 product systems, 1 kit) · 0.5 on 2 of 8 (2 kits) · 0.625 on 1 of 8 (1 product system) · 0.75 on 1 of 8 (1 product system) | cloudscape 0.75 · patternfly 0.625 · antpro 0.5 · shadcn 0.5 · primer 0.375 · mui 0.375 · govuk 0.375 | — |
| `button.textSize` | dashboard | 5 | 14px on 4 of 5 (2 product systems, 2 kits) · 13px on 1 of 5 (1 kit) | 14px on 4 of 5 (2 product systems, 2 kits) · 13px on 1 of 5 (1 kit) | cloudscape 14px · patternfly 14px · antpro 14px · shadcn 14px · mui 13px | — |
| `button.textSize` | list | 5 | 14px on 4 of 5 (2 product systems, 2 kits) · 19px on 1 of 5 (1 product system) | 14px on 4 of 5 (2 product systems, 2 kits) · 19px on 1 of 5 (1 product system) | cloudscape 14px · patternfly 14px · antpro 14px · mui 14px · govuk 19px | — |
| `button.textSize` | form | 6 | 14px on 5 of 6 (2 product systems, 3 kits) · 19px on 1 of 6 (1 product system) | 14px on 7 of 8 (4 product systems, 3 kits) · 19px on 1 of 8 (1 product system) | cloudscape 14px · antpro 14px · shadcn 14px · primer 14px · mui 14px · govuk 19px | — |
| `button.textSize` | detail | 4 | 14px on 3 of 4 (2 product systems, 1 kit) · 19px on 1 of 4 (1 product system) | 14px on 3 of 4 (2 product systems, 1 kit) · 19px on 1 of 4 (1 product system) | cloudscape 14px · patternfly 14px · antpro 14px · govuk 19px | — |
| `button.textSize` | all (context) | 7 | 14px on 6 of 7 (3 product systems, 3 kits) · 19px on 1 of 7 (1 product system) | 14px on 7 of 8 (4 product systems, 3 kits) · 19px on 1 of 8 (1 product system) | cloudscape 14px · patternfly 14px · antpro 14px · shadcn 14px · primer 14px · mui 14px · govuk 19px | — |
| `button.textWeight` | dashboard | 5 | 400 on 2 of 5 (1 product system, 1 kit) · 500 on 2 of 5 (2 kits) · 700 on 1 of 5 (1 product system) | 400 on 2 of 5 (1 product system, 1 kit) · 500 on 2 of 5 (2 kits) · 700 on 1 of 5 (1 product system) | cloudscape 700 · patternfly 400 · antpro 400 · shadcn 500 · mui 500 | — |
| `button.textWeight` | list | 5 | 400 on 3 of 5 (2 product systems, 1 kit) · 500 on 1 of 5 (1 kit) · 700 on 1 of 5 (1 product system) | 400 on 3 of 5 (2 product systems, 1 kit) · 500 on 1 of 5 (1 kit) · 700 on 1 of 5 (1 product system) | cloudscape 700 · patternfly 400 · antpro 400 · mui 500 · govuk 400 | — |
| `button.textWeight` | form | 6 | 500 on 3 of 6 (1 product system, 2 kits) · 400 on 2 of 6 (1 product system, 1 kit) · 700 on 1 of 6 (1 product system) | 400 on 4 of 8 (3 product systems, 1 kit) · 500 on 3 of 8 (1 product system, 2 kits) · 700 on 1 of 8 (1 product system) | cloudscape 700 · antpro 400 · shadcn 500 · primer 500 · mui 500 · govuk 400 | — |
| `button.textWeight` | detail | 4 | 400 on 3 of 4 (2 product systems, 1 kit) · 700 on 1 of 4 (1 product system) | 400 on 3 of 4 (2 product systems, 1 kit) · 700 on 1 of 4 (1 product system) | cloudscape 700 · patternfly 400 · antpro 400 · govuk 400 | — |
| `button.textWeight` | all (context) | 7 | 400 on 3 of 7 (2 product systems, 1 kit) · 500 on 3 of 7 (1 product system, 2 kits) · 700 on 1 of 7 (1 product system) | 400 on 4 of 8 (3 product systems, 1 kit) · 500 on 3 of 8 (1 product system, 2 kits) · 700 on 1 of 8 (1 product system) | cloudscape 700 · patternfly 400 · antpro 400 · shadcn 500 · primer 500 · mui 500 · govuk 400 | — |
| `button.radius` | dashboard | 5 | 8px on 2 of 5 (2 kits) · pill on 2 of 5 (2 product systems) · 4px on 1 of 5 (1 kit) | 8px on 2 of 5 (2 kits) · pill on 2 of 5 (2 product systems) · 4px on 1 of 5 (1 kit) | cloudscape pill · patternfly pill · antpro 4px · shadcn 8px · mui 8px | — |
| `button.radius` | list | 5 | 0px on 1 of 5 (1 product system) · 6px on 1 of 5 (1 kit) · 8px on 1 of 5 (1 kit) · pill on 1 of 5 (1 product system) · mixed on 1 of 5 (1 product system) | 0px on 1 of 5 (1 product system) · 6px on 1 of 5 (1 kit) · 8px on 1 of 5 (1 kit) · pill on 1 of 5 (1 product system) · mixed on 1 of 5 (1 product system) | cloudscape pill · patternfly mixed · antpro 6px · mui 8px · govuk 0px | — |
| `button.radius` | form | 6 | 6px on 2 of 6 (1 product system, 1 kit) · 8px on 2 of 6 (2 kits) · 0px on 1 of 6 (1 product system) · pill on 1 of 6 (1 product system) | 6px on 3 of 8 (2 product systems, 1 kit) · 0px on 2 of 8 (2 product systems) · 8px on 2 of 8 (2 kits) · pill on 1 of 8 (1 product system) | cloudscape pill · antpro 6px · shadcn 8px · primer 6px · mui 8px · govuk 0px | — |
| `button.radius` | detail | 4 | pill on 2 of 4 (2 product systems) · 0px on 1 of 4 (1 product system) · 6px on 1 of 4 (1 kit) | pill on 2 of 4 (2 product systems) · 0px on 1 of 4 (1 product system) · 6px on 1 of 4 (1 kit) | cloudscape pill · patternfly pill · antpro 6px · govuk 0px | — |
| `button.radius` | all (context) | 7 | 6px on 2 of 7 (1 product system, 1 kit) · 8px on 2 of 7 (2 kits) · pill on 2 of 7 (2 product systems) · 0px on 1 of 7 (1 product system) | 0px on 2 of 8 (2 product systems) · 6px on 2 of 8 (1 product system, 1 kit) · 8px on 2 of 8 (2 kits) · pill on 2 of 8 (2 product systems) | cloudscape pill · patternfly pill · antpro 6px · shadcn 8px · primer 6px · mui 8px · govuk 0px | — |
| `button.shape` | dashboard | 5 | rounded on 3 of 5 (3 kits) · pill on 2 of 5 (2 product systems) | rounded on 3 of 5 (3 kits) · pill on 2 of 5 (2 product systems) | cloudscape pill · patternfly pill · antpro rounded · shadcn rounded · mui rounded | split |
| `button.shape` | list | 5 | rounded on 2 of 5 (2 kits) · pill on 1 of 5 (1 product system) · square on 1 of 5 (1 product system) · mixed on 1 of 5 (1 product system) | rounded on 2 of 5 (2 kits) · pill on 1 of 5 (1 product system) · square on 1 of 5 (1 product system) · mixed on 1 of 5 (1 product system) | cloudscape pill · patternfly mixed · antpro rounded · mui rounded · govuk square | split |
| `button.shape` | form | 6 | rounded on 4 of 6 (1 product system, 3 kits) · pill on 1 of 6 (1 product system) · square on 1 of 6 (1 product system) | rounded on 5 of 8 (2 product systems, 3 kits) · square on 2 of 8 (2 product systems) · pill on 1 of 8 (1 product system) | cloudscape pill · antpro rounded · shadcn rounded · primer rounded · mui rounded · govuk square | split |
| `button.shape` | detail | 4 | pill on 2 of 4 (2 product systems) · rounded on 1 of 4 (1 kit) · square on 1 of 4 (1 product system) | pill on 2 of 4 (2 product systems) · rounded on 1 of 4 (1 kit) · square on 1 of 4 (1 product system) | cloudscape pill · patternfly pill · antpro rounded · govuk square | split |
| `button.shape` | all (context) | 7 | rounded on 4 of 7 (1 product system, 3 kits) · pill on 2 of 7 (2 product systems) · square on 1 of 7 (1 product system) | rounded on 4 of 8 (1 product system, 3 kits) · pill on 2 of 8 (2 product systems) · square on 2 of 8 (2 product systems) | cloudscape pill · patternfly pill · antpro rounded · shadcn rounded · primer rounded · mui rounded · govuk square | split |
| `button.iconSize` | dashboard | 4 | 16px on 2 of 4 (1 product system, 1 kit) · 14px on 1 of 4 (1 kit) · 18px on 1 of 4 (1 kit) | 16px on 2 of 4 (1 product system, 1 kit) · 14px on 1 of 4 (1 kit) · 18px on 1 of 4 (1 kit) | cloudscape 16px · antpro 14px · shadcn 16px · mui 18px | — |
| `button.iconSize` | list | 3 | 14px on 2 of 3 (1 product system, 1 kit) · 20px on 1 of 3 (1 kit) | 14px on 2 of 3 (1 product system, 1 kit) · 20px on 1 of 3 (1 kit) | patternfly 14px · antpro 14px · mui 20px | — |
| `button.iconSize` | form | 4 | 16px on 2 of 4 (1 product system, 1 kit) · 14px on 1 of 4 (1 kit) · 20px on 1 of 4 (1 kit) | 16px on 2 of 4 (1 product system, 1 kit) · 14px on 1 of 4 (1 kit) · 20px on 1 of 4 (1 kit) | cloudscape 16px · antpro 14px · shadcn 16px · mui 20px | — |
| `button.iconSize` | detail | 2 | 14px on 1 of 2 (1 product system) · 16px on 1 of 2 (1 product system) | 14px on 1 of 2 (1 product system) · 16px on 1 of 2 (1 product system) | cloudscape 16px · patternfly 14px | — |
| `button.iconSize` | all (context) | 5 | 14px on 2 of 5 (1 product system, 1 kit) · 16px on 2 of 5 (1 product system, 1 kit) · 20px on 1 of 5 (1 kit) | 14px on 2 of 5 (1 product system, 1 kit) · 16px on 2 of 5 (1 product system, 1 kit) · 20px on 1 of 5 (1 kit) | cloudscape 16px · patternfly 14px · antpro 14px · shadcn 16px · mui 20px | — |
| `button.iconGap` | dashboard | 4 | 8px on 3 of 4 (1 product system, 2 kits) · 6px on 1 of 4 (1 kit) | 8px on 3 of 4 (1 product system, 2 kits) · 6px on 1 of 4 (1 kit) | cloudscape 8px · antpro 8px · shadcn 6px · mui 8px | — |
| `button.iconGap` | list | 3 | 8px on 3 of 3 (1 product system, 2 kits) | 8px on 3 of 3 (1 product system, 2 kits) | patternfly 8px · antpro 8px · mui 8px | — |
| `button.iconGap` | form | 4 | 8px on 3 of 4 (1 product system, 2 kits) · mixed on 1 of 4 (1 kit) | 8px on 3 of 4 (1 product system, 2 kits) · mixed on 1 of 4 (1 kit) | cloudscape 8px · antpro mixed · shadcn 8px · mui 8px | — |
| `button.iconGap` | detail | 2 | 8px on 2 of 2 (2 product systems) | 8px on 2 of 2 (2 product systems) | cloudscape 8px · patternfly 8px | — |
| `button.iconGap` | all (context) | 5 | 8px on 4 of 5 (2 product systems, 2 kits) · mixed on 1 of 5 (1 kit) | 8px on 4 of 5 (2 product systems, 2 kits) · mixed on 1 of 5 (1 kit) | cloudscape 8px · patternfly 8px · antpro 8px · shadcn mixed · mui 8px | — |
| `button.textMatchesField` | dashboard | 2 | false on 1 of 2 (1 kit) · true on 1 of 2 (1 kit) | false on 1 of 2 (1 kit) · true on 1 of 2 (1 kit) | shadcn true · mui false | thin |
| `button.textMatchesField` | list | 5 | true on 4 of 5 (2 product systems, 2 kits) · false on 1 of 5 (1 product system) | true on 4 of 5 (2 product systems, 2 kits) · false on 1 of 5 (1 product system) | cloudscape true · patternfly true · antpro true · mui true · govuk false | candidate |
| `button.textMatchesField` | form | 5 | true on 5 of 5 (2 product systems, 3 kits) | true on 7 of 7 (4 product systems, 3 kits) | cloudscape true · antpro true · shadcn true · mui true · govuk true | candidate |
| `button.textMatchesField` | detail | 1 | true on 1 of 1 (1 product system) | true on 1 of 1 (1 product system) | cloudscape true | thin |
| `button.textMatchesField` | all (context) | 6 | true on 6 of 6 (3 product systems, 3 kits) | true on 7 of 7 (4 product systems, 3 kits) | cloudscape true · patternfly true · antpro true · shadcn true · mui true · govuk true | candidate |
| `control.heightCount` | all | 6 | 1 on 3 of 6 (2 product systems, 1 kit) · 2 on 2 of 6 (1 product system, 1 kit) · 3 on 1 of 6 (1 kit) | — | cloudscape 1 · patternfly 1 · antpro 1 · shadcn 2 · mui 3 · govuk 2 | — |

### Fields

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `field.padX` | dashboard | 3 | 8px on 1 of 3 (1 kit) · 12px on 1 of 3 (1 kit) · 13px on 1 of 3 (1 kit) | 8px on 1 of 3 (1 kit) · 12px on 1 of 3 (1 kit) · 13px on 1 of 3 (1 kit) | antpro 12px · shadcn 13px · mui 8px | — |
| `field.padX` | list | 4 | 8px on 2 of 4 (1 product system, 1 kit) · 7px on 1 of 4 (1 product system) · 12px on 1 of 4 (1 kit) | 8px on 2 of 4 (1 product system, 1 kit) · 7px on 1 of 4 (1 product system) · 12px on 1 of 4 (1 kit) | patternfly 8px · antpro 12px · mui 8px · govuk 7px | — |
| `field.padX` | form | 5 | 13px on 3 of 5 (1 product system, 2 kits) · 7px on 1 of 5 (1 product system) · 12px on 1 of 5 (1 kit) | 13px on 3 of 7 (1 product system, 2 kits) · 16px on 2 of 7 (2 product systems) · 7px on 1 of 7 (1 product system) · 12px on 1 of 7 (1 kit) | cloudscape 13px · antpro 12px · shadcn 13px · mui 13px · govuk 7px | — |
| `field.padX` | all (context) | 6 | 13px on 3 of 6 (1 product system, 2 kits) · 7px on 1 of 6 (1 product system) · 8px on 1 of 6 (1 product system) · 12px on 1 of 6 (1 kit) | 13px on 3 of 7 (1 product system, 2 kits) · 7px on 1 of 7 (1 product system) · 8px on 1 of 7 (1 product system) · 12px on 1 of 7 (1 kit) · 16px on 1 of 7 (1 product system) | cloudscape 13px · patternfly 8px · antpro 12px · shadcn 13px · mui 13px · govuk 7px | — |
| `field.radius` | dashboard | 3 | 0px on 2 of 3 (2 kits) · 8px on 1 of 3 (1 kit) | 0px on 2 of 3 (2 kits) · 8px on 1 of 3 (1 kit) | antpro 0px · shadcn 8px · mui 0px | — |
| `field.radius` | list | 5 | 0px on 2 of 5 (1 product system, 1 kit) · 6px on 2 of 5 (1 product system, 1 kit) · 8px on 1 of 5 (1 product system) | 0px on 2 of 5 (1 product system, 1 kit) · 6px on 2 of 5 (1 product system, 1 kit) · 8px on 1 of 5 (1 product system) | cloudscape 8px · patternfly 6px · antpro 6px · mui 0px · govuk 0px | — |
| `field.radius` | form | 5 | 8px on 3 of 5 (1 product system, 2 kits) · 0px on 1 of 5 (1 product system) · 6px on 1 of 5 (1 kit) | 8px on 3 of 7 (1 product system, 2 kits) · 0px on 2 of 7 (2 product systems) · 6px on 2 of 7 (1 product system, 1 kit) | cloudscape 8px · antpro 6px · shadcn 8px · mui 8px · govuk 0px | — |
| `field.radius` | detail | 1 | 8px on 1 of 1 (1 product system) | 8px on 1 of 1 (1 product system) | cloudscape 8px | — |
| `field.radius` | all (context) | 6 | 8px on 3 of 6 (1 product system, 2 kits) · 6px on 2 of 6 (1 product system, 1 kit) · 0px on 1 of 6 (1 product system) | 8px on 3 of 7 (1 product system, 2 kits) · 0px on 2 of 7 (2 product systems) · 6px on 2 of 7 (1 product system, 1 kit) | cloudscape 8px · patternfly 6px · antpro 6px · shadcn 8px · mui 8px · govuk 0px | — |
| `field.style` | dashboard | 3 | box on 1 of 3 (1 kit) · fill on 1 of 3 (1 kit) · none on 1 of 3 (1 kit) | box on 1 of 3 (1 kit) · fill on 1 of 3 (1 kit) · none on 1 of 3 (1 kit) | antpro fill · shadcn none · mui box | split |
| `field.style` | list | 5 | box on 2 of 5 (2 product systems) · none on 2 of 5 (1 product system, 1 kit) · fill on 1 of 5 (1 kit) | box on 2 of 5 (2 product systems) · none on 2 of 5 (1 product system, 1 kit) · fill on 1 of 5 (1 kit) | cloudscape box · patternfly none · antpro fill · mui none · govuk box | split |
| `field.style` | form | 5 | box on 4 of 5 (2 product systems, 2 kits) · fill on 1 of 5 (1 kit) | box on 4 of 7 (2 product systems, 2 kits) · fill on 1 of 7 (1 kit) · none on 1 of 7 (1 product system) · under on 1 of 7 (1 product system) | cloudscape box · antpro fill · shadcn box · mui box · govuk box | candidate |
| `field.style` | detail | 1 | box on 1 of 1 (1 product system) | box on 1 of 1 (1 product system) | cloudscape box | thin |
| `field.style` | all (context) | 6 | box on 3 of 6 (2 product systems, 1 kit) · fill on 1 of 6 (1 kit) · none on 1 of 6 (1 product system) · mixed on 1 of 6 (1 kit) | box on 3 of 7 (2 product systems, 1 kit) · fill on 1 of 7 (1 kit) · none on 1 of 7 (1 product system) · under on 1 of 7 (1 product system) · mixed on 1 of 7 (1 kit) | cloudscape box · patternfly none · antpro fill · shadcn mixed · mui box · govuk box | split |
| `field.borderWidth` | dashboard | 2 | 1px on 2 of 2 (2 kits) | 1px on 2 of 2 (2 kits) | shadcn 1px · mui 1px | — |
| `field.borderWidth` | list | 3 | 1px on 2 of 3 (1 product system, 1 kit) · 2px on 1 of 3 (1 product system) | 1px on 2 of 3 (1 product system, 1 kit) · 2px on 1 of 3 (1 product system) | cloudscape 1px · antpro 1px · govuk 2px | — |
| `field.borderWidth` | form | 5 | 1px on 4 of 5 (1 product system, 3 kits) · 2px on 1 of 5 (1 product system) | 1px on 5 of 6 (2 product systems, 3 kits) · 2px on 1 of 6 (1 product system) | cloudscape 1px · antpro 1px · shadcn 1px · mui 1px · govuk 2px | — |
| `field.borderWidth` | detail | 1 | 1px on 1 of 1 (1 product system) | 1px on 1 of 1 (1 product system) | cloudscape 1px | — |
| `field.borderWidth` | all (context) | 5 | 1px on 4 of 5 (1 product system, 3 kits) · 2px on 1 of 5 (1 product system) | 1px on 5 of 6 (2 product systems, 3 kits) · 2px on 1 of 6 (1 product system) | cloudscape 1px · antpro 1px · shadcn 1px · mui 1px · govuk 2px | — |
| `label.position` | list | 1 | left on 1 of 1 (1 kit) | left on 1 of 1 (1 kit) | antpro left | thin |
| `label.position` | form | 5 | above on 5 of 5 (2 product systems, 3 kits) | above on 7 of 7 (4 product systems, 3 kits) | cloudscape above · antpro above · shadcn above · mui above · govuk above | candidate |
| `label.position` | all (context) | 5 | above on 5 of 5 (2 product systems, 3 kits) | above on 7 of 7 (4 product systems, 3 kits) | cloudscape above · antpro above · shadcn above · mui above · govuk above | candidate |
| `label.gap` | form | 5 | 8px on 2 of 5 (2 kits) · 4px on 1 of 5 (1 product system) · 5px on 1 of 5 (1 product system) · 12px on 1 of 5 (1 kit) | 8px on 4 of 7 (2 product systems, 2 kits) · 4px on 1 of 7 (1 product system) · 5px on 1 of 7 (1 product system) · 12px on 1 of 7 (1 kit) | cloudscape 4px · antpro 8px · shadcn 12px · mui 8px · govuk 5px | — |
| `label.gap` | all (context) | 5 | 8px on 2 of 5 (2 kits) · 4px on 1 of 5 (1 product system) · 5px on 1 of 5 (1 product system) · 12px on 1 of 5 (1 kit) | 8px on 4 of 7 (2 product systems, 2 kits) · 4px on 1 of 7 (1 product system) · 5px on 1 of 7 (1 product system) · 12px on 1 of 7 (1 kit) | cloudscape 4px · antpro 8px · shadcn 12px · mui 8px · govuk 5px | — |
| `label.textWeight` | list | 1 | 400 on 1 of 1 (1 kit) | 400 on 1 of 1 (1 kit) | antpro 400 | — |
| `label.textWeight` | form | 5 | 400 on 3 of 5 (1 product system, 2 kits) · 500 on 1 of 5 (1 kit) · 700 on 1 of 5 (1 product system) | 400 on 4 of 7 (2 product systems, 2 kits) · 500 on 1 of 7 (1 kit) · 600 on 1 of 7 (1 product system) · 700 on 1 of 7 (1 product system) | cloudscape 700 · antpro 400 · shadcn 500 · mui 400 · govuk 400 | — |
| `label.textWeight` | all (context) | 5 | 400 on 3 of 5 (1 product system, 2 kits) · 500 on 1 of 5 (1 kit) · 700 on 1 of 5 (1 product system) | 400 on 4 of 7 (2 product systems, 2 kits) · 500 on 1 of 7 (1 kit) · 600 on 1 of 7 (1 product system) · 700 on 1 of 7 (1 product system) | cloudscape 700 · antpro 400 · shadcn 500 · mui 400 · govuk 400 | — |
| `form.fieldGap` | dashboard | 1 | 21px on 1 of 1 (1 kit) | 21px on 1 of 1 (1 kit) | shadcn 21px | — |
| `form.fieldGap` | form | 5 | 16px on 1 of 5 (1 kit) · 20px on 1 of 5 (1 product system) · 24px on 1 of 5 (1 kit) · 28px on 1 of 5 (1 kit) · 30px on 1 of 5 (1 product system) | 16px on 2 of 7 (1 product system, 1 kit) · 24px on 2 of 7 (1 product system, 1 kit) · 20px on 1 of 7 (1 product system) · 28px on 1 of 7 (1 kit) · 30px on 1 of 7 (1 product system) | cloudscape 20px · antpro 24px · shadcn 28px · mui 16px · govuk 30px | — |
| `form.fieldGap` | all (context) | 5 | 16px on 1 of 5 (1 kit) · 20px on 1 of 5 (1 product system) · 24px on 1 of 5 (1 kit) · 30px on 1 of 5 (1 product system) · mixed on 1 of 5 (1 kit) | 16px on 2 of 7 (1 product system, 1 kit) · 24px on 2 of 7 (1 product system, 1 kit) · 20px on 1 of 7 (1 product system) · 30px on 1 of 7 (1 product system) · mixed on 1 of 7 (1 kit) | cloudscape 20px · antpro 24px · shadcn mixed · mui 16px · govuk 30px | — |

### Panels

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `panel.inset` | dashboard | 5 | 24px on 2 of 5 (1 product system, 1 kit) · 17px on 1 of 5 (1 kit) · 21px on 1 of 5 (1 product system) · 25px on 1 of 5 (1 kit) | — | cloudscape 21px · patternfly 24px · antpro 24px · shadcn 25px · mui 17px | — |
| `panel.inset` | list | 4 | 16px on 1 of 4 (1 product system) · 20px on 1 of 4 (1 kit) · 48px on 1 of 4 (1 kit) · mixed on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly 16px · antpro 48px · mui 20px | — |
| `panel.inset` | form | 4 | 13px on 1 of 4 (1 product system) · 17px on 1 of 4 (1 product system) · 25px on 1 of 4 (1 kit) · 30px on 1 of 4 (1 kit) | — | cloudscape 13px · shadcn 25px · primer 17px · mui 30px | — |
| `panel.inset` | detail | 4 | 7px on 1 of 4 (1 product system) · 17px on 1 of 4 (1 product system) · 66px on 1 of 4 (1 product system) · 101px on 1 of 4 (1 product system) | — | cloudscape 7px · patternfly 66px · primer 17px · govuk 101px | — |
| `panel.inset` | all (context) | 7 | mixed on 2 of 7 (1 product system, 1 kit) · 7px on 1 of 7 (1 product system) · 17px on 1 of 7 (1 product system) · 24px on 1 of 7 (1 kit) · 25px on 1 of 7 (1 kit) · 101px on 1 of 7 (1 product system) | — | cloudscape 7px · patternfly mixed · antpro 24px · shadcn 25px · primer 17px · mui mixed · govuk 101px | — |
| `panel.radius` | dashboard | 5 | 16px on 2 of 5 (2 product systems) · 8px on 1 of 5 (1 kit) · 14px on 1 of 5 (1 kit) · mixed on 1 of 5 (1 kit) | — | cloudscape 16px · patternfly 16px · antpro mixed · shadcn 14px · mui 8px | — |
| `panel.radius` | list | 4 | 0px on 1 of 4 (1 kit) · 8px on 1 of 4 (1 kit) · 16px on 1 of 4 (1 product system) · mixed on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly 16px · antpro 8px · mui 0px | — |
| `panel.radius` | form | 4 | 8px on 2 of 4 (1 product system, 1 kit) · 6px on 1 of 4 (1 product system) · 14px on 1 of 4 (1 kit) | — | cloudscape 8px · shadcn 14px · primer 6px · mui 8px | — |
| `panel.radius` | detail | 4 | 0px on 3 of 4 (3 product systems) · 6px on 1 of 4 (1 product system) | — | cloudscape 0px · patternfly 0px · primer 6px · govuk 0px | — |
| `panel.radius` | all (context) | 7 | 0px on 2 of 7 (2 product systems) · 8px on 2 of 7 (2 kits) · 6px on 1 of 7 (1 product system) · 14px on 1 of 7 (1 kit) · 16px on 1 of 7 (1 product system) | — | cloudscape 0px · patternfly 16px · antpro 8px · shadcn 14px · primer 6px · mui 8px · govuk 0px | — |
| `panel.separation` | dashboard | 5 | border-tone on 2 of 5 (1 product system, 1 kit) · border on 1 of 5 (1 product system) · border-shadow on 1 of 5 (1 kit) · mixed on 1 of 5 (1 kit) | — | cloudscape border-tone · patternfly border · antpro mixed · shadcn border-shadow · mui border-tone | split |
| `panel.separation` | list | 4 | border on 1 of 4 (1 kit) · none on 1 of 4 (1 product system) · tone on 1 of 4 (1 kit) · mixed on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly none · antpro border · mui tone | split |
| `panel.separation` | form | 4 | border on 2 of 4 (2 product systems) · border-shadow-tone on 2 of 4 (2 kits) | — | cloudscape border · shadcn border-shadow-tone · primer border · mui border-shadow-tone | split |
| `panel.separation` | detail | 4 | tone on 3 of 4 (3 product systems) · border on 1 of 4 (1 product system) | — | cloudscape tone · patternfly tone · primer border · govuk tone | candidate |
| `panel.separation` | all (context) | 7 | mixed on 4 of 7 (1 product system, 3 kits) · tone on 2 of 7 (2 product systems) · border on 1 of 7 (1 product system) | — | cloudscape tone · patternfly mixed · antpro mixed · shadcn mixed · primer border · mui mixed · govuk tone | split |
| `panel.gap` | dashboard | 5 | 16px on 2 of 5 (2 kits) · 8px on 1 of 5 (1 product system) · 20px on 1 of 5 (1 product system) · mixed on 1 of 5 (1 kit) | — | cloudscape 20px · patternfly 8px · antpro mixed · shadcn 16px · mui 16px | — |
| `panel.gap` | list | 4 | 16px on 2 of 4 (1 product system, 1 kit) · 0px on 1 of 4 (1 kit) · mixed on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly 16px · antpro 16px · mui 0px | — |
| `panel.gap` | form | 2 | 24px on 1 of 2 (1 kit) · mixed on 1 of 2 (1 product system) | — | cloudscape mixed · antpro 24px | — |
| `panel.gap` | detail | 2 | 20px on 1 of 2 (1 product system) · mixed on 1 of 2 (1 kit) | — | cloudscape 20px · antpro mixed | — |
| `panel.gap` | all (context) | 5 | mixed on 3 of 5 (1 product system, 2 kits) · 16px on 1 of 5 (1 kit) · 20px on 1 of 5 (1 product system) | — | cloudscape 20px · patternfly mixed · antpro mixed · shadcn 16px · mui mixed | — |
| `radius.panelNotSmaller` | dashboard | 3 | true on 2 of 3 (2 kits) · mixed on 1 of 3 (1 kit) | — | antpro mixed · shadcn true · mui true | split |
| `radius.panelNotSmaller` | list | 3 | true on 2 of 3 (1 product system, 1 kit) · mixed on 1 of 3 (1 product system) | — | cloudscape mixed · patternfly true · mui true | split |
| `radius.panelNotSmaller` | form | 4 | true on 4 of 4 (2 product systems, 2 kits) | — | cloudscape true · shadcn true · primer true · mui true | candidate |
| `radius.panelNotSmaller` | detail | 2 | false on 1 of 2 (1 product system) · true on 1 of 2 (1 product system) | — | cloudscape false · govuk true | thin |
| `radius.panelNotSmaller` | all (context) | 7 | true on 5 of 7 (3 product systems, 2 kits) · mixed on 2 of 7 (1 product system, 1 kit) | — | cloudscape mixed · patternfly true · antpro mixed · shadcn true · primer true · mui true · govuk true | candidate |
| `radius.values` (set) | all | 7 | 0px on 5 of 7 (3 product systems, 2 kits) · 8px on 4 of 7 (1 product system, 3 kits) · 6px on 3 of 7 (2 product systems, 1 kit) · 16px on 2 of 7 (2 product systems) · pill on 2 of 7 (2 product systems) · 4px on 1 of 7 (1 kit) · 14px on 1 of 7 (1 kit) | — | cloudscape 0px, 8px, 16px, pill · patternfly 0px, 6px, 16px, pill · antpro 0px, 4px, 6px, 8px · shadcn 8px, 14px · primer 6px · mui 0px, 8px · govuk 0px | — |
| `radius.valueCount` | all | 7 | 4 on 3 of 7 (2 product systems, 1 kit) · 1 on 2 of 7 (2 product systems) · 2 on 2 of 7 (2 kits) | — | cloudscape 4 · patternfly 4 · antpro 4 · shadcn 2 · primer 1 · mui 2 · govuk 1 | — |

### Tables

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `table.headerHeight` | dashboard | 4 | 40px on 3 of 4 (3 kits) · 36px on 1 of 4 (1 product system) | — | cloudscape 36px · antpro 40px · shadcn 40px · mui 40px | — |
| `table.headerHeight` | list | 4 | 36px on 1 of 4 (1 product system) · 48px on 1 of 4 (1 kit) · 52px on 1 of 4 (1 product system) · 56px on 1 of 4 (1 kit) | — | cloudscape 36px · patternfly 52px · antpro 48px · mui 56px | — |
| `table.headerHeight` | form | 1 | 48px on 1 of 1 (1 kit) | — | antpro 48px | — |
| `table.headerHeight` | detail | 3 | 36px on 1 of 3 (1 product system) · 52px on 1 of 3 (1 product system) · mixed on 1 of 3 (1 kit) | — | cloudscape 36px · patternfly 52px · antpro mixed | — |
| `table.headerHeight` | all (context) | 5 | 36px on 1 of 5 (1 product system) · 40px on 1 of 5 (1 kit) · 48px on 1 of 5 (1 kit) · 52px on 1 of 5 (1 product system) · mixed on 1 of 5 (1 kit) | — | cloudscape 36px · patternfly 52px · antpro 48px · shadcn 40px · mui mixed | — |
| `table.bodyRowHeight` | dashboard | 4 | 40px on 2 of 4 (1 product system, 1 kit) · 36px on 1 of 4 (1 kit) · 52px on 1 of 4 (1 kit) | — | cloudscape 40px · antpro 40px · shadcn 52px · mui 36px | — |
| `table.bodyRowHeight` | list | 4 | 40px on 1 of 4 (1 product system) · 48px on 1 of 4 (1 kit) · 52px on 1 of 4 (1 kit) · 56px on 1 of 4 (1 product system) | — | cloudscape 40px · patternfly 56px · antpro 48px · mui 52px | — |
| `table.bodyRowHeight` | form | 1 | 48px on 1 of 1 (1 kit) | — | antpro 48px | — |
| `table.bodyRowHeight` | detail | 4 | mixed on 2 of 4 (1 product system, 1 kit) · 48px on 1 of 4 (1 product system) · 76px on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly 76px · antpro mixed · govuk 48px | — |
| `table.bodyRowHeight` | all (context) | 6 | 48px on 2 of 6 (1 product system, 1 kit) · mixed on 2 of 6 (1 product system, 1 kit) · 40px on 1 of 6 (1 product system) · 52px on 1 of 6 (1 kit) | — | cloudscape 40px · patternfly mixed · antpro 48px · shadcn 52px · mui mixed · govuk 48px | — |
| `table.cellPadX` | dashboard | 4 | 8px on 2 of 4 (2 kits) · 19px on 1 of 4 (1 kit) · 20px on 1 of 4 (1 product system) | — | cloudscape 20px · antpro 8px · shadcn 8px · mui 19px | — |
| `table.cellPadX` | list | 4 | 8px on 1 of 4 (1 kit) · 10px on 1 of 4 (1 kit) · 16px on 1 of 4 (1 product system) · 20px on 1 of 4 (1 product system) | — | cloudscape 20px · patternfly 16px · antpro 8px · mui 10px | — |
| `table.cellPadX` | form | 1 | 8px on 1 of 1 (1 kit) | — | antpro 8px | — |
| `table.cellPadX` | detail | 4 | mixed on 2 of 4 (1 product system, 1 kit) · 0px on 1 of 4 (1 product system) · 16px on 1 of 4 (1 product system) | — | cloudscape mixed · patternfly 16px · antpro mixed · govuk 0px | — |
| `table.cellPadX` | all (context) | 6 | 8px on 2 of 6 (2 kits) · 0px on 1 of 6 (1 product system) · 16px on 1 of 6 (1 product system) · 20px on 1 of 6 (1 product system) · mixed on 1 of 6 (1 kit) | — | cloudscape 20px · patternfly 16px · antpro 8px · shadcn 8px · mui mixed · govuk 0px | — |
| `table.headerHeavier` | dashboard | 4 | true on 3 of 4 (1 product system, 2 kits) · false on 1 of 4 (1 kit) | — | cloudscape true · antpro true · shadcn false · mui true | split |
| `table.headerHeavier` | list | 4 | true on 4 of 4 (2 product systems, 2 kits) | — | cloudscape true · patternfly true · antpro true · mui true | candidate |
| `table.headerHeavier` | form | 1 | true on 1 of 1 (1 kit) | — | antpro true | thin |
| `table.headerHeavier` | detail | 3 | true on 3 of 3 (2 product systems, 1 kit) | — | cloudscape true · patternfly true · antpro true | candidate |
| `table.headerHeavier` | all (context) | 5 | true on 4 of 5 (2 product systems, 2 kits) · false on 1 of 5 (1 kit) | — | cloudscape true · patternfly true · antpro true · shadcn false · mui true | candidate |
| `list.itemHeight` | list | 3 | 80px on 1 of 3 (1 kit) · 124px on 1 of 3 (1 product system) · 172px on 1 of 3 (1 product system) | — | patternfly 124px · antpro 80px · govuk 172px | — |

### Navigation

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `nav.sideWidth` | dashboard | 5 | 288px on 2 of 5 (1 product system, 1 kit) · 240px on 1 of 5 (1 kit) · 256px on 1 of 5 (1 kit) · 280px on 1 of 5 (1 product system) | — | cloudscape 280px · patternfly 288px · antpro 256px · shadcn 288px · mui 240px | — |
| `nav.sideWidth` | list | 4 | 240px on 1 of 4 (1 kit) · 256px on 1 of 4 (1 kit) · 280px on 1 of 4 (1 product system) · 288px on 1 of 4 (1 product system) | — | cloudscape 280px · patternfly 288px · antpro 256px · mui 240px | — |
| `nav.sideWidth` | form | 1 | 256px on 1 of 1 (1 kit) | — | antpro 256px | — |
| `nav.sideWidth` | detail | 3 | 256px on 1 of 3 (1 kit) · 280px on 1 of 3 (1 product system) · 288px on 1 of 3 (1 product system) | — | cloudscape 280px · patternfly 288px · antpro 256px | — |
| `nav.sideWidth` | all (context) | 5 | 288px on 2 of 5 (1 product system, 1 kit) · 240px on 1 of 5 (1 kit) · 256px on 1 of 5 (1 kit) · 280px on 1 of 5 (1 product system) | — | cloudscape 280px · patternfly 288px · antpro 256px · shadcn 288px · mui 240px | — |
| `nav.itemHeight` | dashboard | 5 | 32px on 2 of 5 (2 kits) · 28px on 1 of 5 (1 product system) · 36px on 1 of 5 (1 product system) · 40px on 1 of 5 (1 kit) | — | cloudscape 28px · patternfly 36px · antpro 40px · shadcn 32px · mui 32px | — |
| `nav.itemHeight` | list | 4 | 28px on 1 of 4 (1 product system) · 32px on 1 of 4 (1 kit) · 36px on 1 of 4 (1 product system) · 40px on 1 of 4 (1 kit) | — | cloudscape 28px · patternfly 36px · antpro 40px · mui 32px | — |
| `nav.itemHeight` | form | 1 | 40px on 1 of 1 (1 kit) | — | antpro 40px | — |
| `nav.itemHeight` | detail | 3 | 28px on 1 of 3 (1 product system) · 36px on 1 of 3 (1 product system) · 40px on 1 of 3 (1 kit) | — | cloudscape 28px · patternfly 36px · antpro 40px | — |
| `nav.itemHeight` | all (context) | 5 | 32px on 2 of 5 (2 kits) · 28px on 1 of 5 (1 product system) · 36px on 1 of 5 (1 product system) · 40px on 1 of 5 (1 kit) | — | cloudscape 28px · patternfly 36px · antpro 40px · shadcn 32px · mui 32px | — |
| `nav.topBarHeight` | dashboard | 4 | 40px on 1 of 4 (1 product system) · 52px on 1 of 4 (1 kit) · 56px on 1 of 4 (1 kit) · 68px on 1 of 4 (1 product system) | — | cloudscape 40px · patternfly 68px · antpro 56px · mui 52px | — |
| `nav.topBarHeight` | list | 4 | 40px on 1 of 4 (1 product system) · 52px on 1 of 4 (1 kit) · 56px on 1 of 4 (1 kit) · 72px on 1 of 4 (1 product system) | — | cloudscape 40px · patternfly 72px · antpro 56px · mui 52px | — |
| `nav.topBarHeight` | form | 3 | 40px on 1 of 3 (1 product system) · 52px on 1 of 3 (1 kit) · 56px on 1 of 3 (1 kit) | — | cloudscape 40px · antpro 56px · mui 52px | — |
| `nav.topBarHeight` | detail | 4 | 40px on 1 of 4 (1 product system) · 56px on 1 of 4 (1 kit) · 72px on 1 of 4 (1 product system) · 128px on 1 of 4 (1 product system) | — | cloudscape 40px · patternfly 72px · antpro 56px · primer 128px | — |
| `nav.topBarHeight` | all (context) | 5 | 40px on 1 of 5 (1 product system) · 52px on 1 of 5 (1 kit) · 56px on 1 of 5 (1 kit) · 72px on 1 of 5 (1 product system) · 128px on 1 of 5 (1 product system) | — | cloudscape 40px · patternfly 72px · antpro 56px · primer 128px · mui 52px | — |

### Type

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `text.lineRatio` | dashboard | 5 | 1.45 on 2 of 5 (1 product system, 1 kit) · 1.5 on 1 of 5 (1 product system) · 1.55 on 1 of 5 (1 kit) · 2.5 on 1 of 5 (1 kit) | — | cloudscape 1.45 · patternfly 1.5 · antpro 1.55 · shadcn 1.45 · mui 2.5 | — |
| `text.lineRatio` | list | 4 | 1.45 on 1 of 4 (1 product system) · 1.5 on 1 of 4 (1 product system) · 1.55 on 1 of 4 (1 kit) · mixed on 1 of 4 (1 product system) | — | cloudscape 1.45 · patternfly 1.5 · antpro 1.55 · govuk mixed | — |
| `text.lineRatio` | form | 5 | 1.3 on 1 of 5 (1 product system) · 1.45 on 1 of 5 (1 kit) · 1.5 on 1 of 5 (1 kit) · 1.55 on 1 of 5 (1 kit) · mixed on 1 of 5 (1 product system) | — | cloudscape mixed · antpro 1.55 · shadcn 1.5 · mui 1.45 · govuk 1.3 | — |
| `text.lineRatio` | detail | 5 | 1.5 on 2 of 5 (2 product systems) · 1.3 on 1 of 5 (1 product system) · 1.45 on 1 of 5 (1 product system) · 1.55 on 1 of 5 (1 kit) | — | cloudscape 1.45 · patternfly 1.5 · antpro 1.55 · primer 1.5 · govuk 1.3 | — |
| `text.lineRatio` | all (context) | 7 | 1.5 on 2 of 7 (2 product systems) · mixed on 2 of 7 (2 kits) · 1.3 on 1 of 7 (1 product system) · 1.45 on 1 of 7 (1 product system) · 1.55 on 1 of 7 (1 kit) | — | cloudscape 1.45 · patternfly 1.5 · antpro 1.55 · shadcn mixed · primer 1.5 · mui mixed · govuk 1.3 | — |
| `heading.pageTitle` | dashboard | 5 | 24px on 2 of 5 (2 product systems) · 14px on 1 of 5 (1 kit) · 16px on 1 of 5 (1 kit) · 18px on 1 of 5 (1 kit) | — | cloudscape 24px · patternfly 24px · antpro 14px · shadcn 16px · mui 18px | — |
| `heading.pageTitle` | list | 5 | 24px on 3 of 5 (2 product systems, 1 kit) · 14px on 1 of 5 (1 kit) · 48px on 1 of 5 (1 product system) | — | cloudscape 24px · patternfly 24px · antpro 14px · mui 24px · govuk 48px | — |
| `heading.pageTitle` | form | 4 | 24px on 2 of 4 (2 product systems) · 35px on 1 of 4 (1 kit) · 48px on 1 of 4 (1 product system) | — | cloudscape 24px · primer 24px · mui 35px · govuk 48px | — |
| `heading.pageTitle` | detail | 5 | 24px on 3 of 5 (3 product systems) · 14px on 1 of 5 (1 kit) · 48px on 1 of 5 (1 product system) | — | cloudscape 24px · patternfly 24px · antpro 14px · primer 24px · govuk 48px | — |
| `heading.pageTitle` | all (context) | 7 | 24px on 3 of 7 (3 product systems) · 14px on 1 of 7 (1 kit) · 16px on 1 of 7 (1 kit) · 48px on 1 of 7 (1 product system) · mixed on 1 of 7 (1 kit) | — | cloudscape 24px · patternfly 24px · antpro 14px · shadcn 16px · primer 24px · mui mixed · govuk 48px | — |
| `heading.sectionTitle` | dashboard | 3 | 20px on 2 of 3 (2 product systems) · 14px on 1 of 3 (1 kit) | — | cloudscape 20px · patternfly 20px · mui 14px | — |
| `heading.sectionTitle` | list | 2 | 16px on 1 of 2 (1 product system) · mixed on 1 of 2 (1 product system) | — | patternfly 16px · govuk mixed | — |
| `heading.sectionTitle` | form | 2 | 14px on 1 of 2 (1 kit) · 20px on 1 of 2 (1 product system) | — | cloudscape 20px · mui 14px | — |
| `heading.sectionTitle` | detail | 4 | 12px on 1 of 4 (1 product system) · 18px on 1 of 4 (1 product system) · 20px on 1 of 4 (1 product system) · 24px on 1 of 4 (1 product system) | — | cloudscape 20px · patternfly 18px · primer 12px · govuk 24px | — |
| `heading.sectionTitle` | all (context) | 5 | 12px on 1 of 5 (1 product system) · 14px on 1 of 5 (1 kit) · 20px on 1 of 5 (1 product system) · 24px on 1 of 5 (1 product system) · mixed on 1 of 5 (1 product system) | — | cloudscape 20px · patternfly mixed · primer 12px · mui 14px · govuk 24px | — |
| `heading.weight` | dashboard | 5 | 500 on 3 of 5 (3 kits) · 600 on 1 of 5 (1 product system) · 700 on 1 of 5 (1 product system) | — | cloudscape 700 · patternfly 600 · antpro 500 · shadcn 500 · mui 500 | — |
| `heading.weight` | list | 5 | 600 on 2 of 5 (1 product system, 1 kit) · 700 on 2 of 5 (2 product systems) · 500 on 1 of 5 (1 kit) | — | cloudscape 700 · patternfly 600 · antpro 500 · mui 600 · govuk 700 | — |
| `heading.weight` | form | 4 | 700 on 2 of 4 (2 product systems) · 400 on 1 of 4 (1 product system) · 600 on 1 of 4 (1 kit) | — | cloudscape 700 · primer 400 · mui 600 · govuk 700 | — |
| `heading.weight` | detail | 5 | 600 on 2 of 5 (2 product systems) · 700 on 2 of 5 (2 product systems) · 500 on 1 of 5 (1 kit) | — | cloudscape 700 · patternfly 600 · antpro 500 · primer 600 · govuk 700 | — |
| `heading.weight` | all (context) | 7 | 500 on 2 of 7 (2 kits) · 600 on 2 of 7 (1 product system, 1 kit) · 700 on 2 of 7 (2 product systems) · mixed on 1 of 7 (1 product system) | — | cloudscape 700 · patternfly 600 · antpro 500 · shadcn 500 · primer mixed · mui 600 · govuk 700 | — |
| `icon.size` | dashboard | 5 | 16px on 3 of 5 (1 product system, 2 kits) · 14px on 1 of 5 (1 product system) · mixed on 1 of 5 (1 kit) | — | cloudscape 16px · patternfly 14px · antpro mixed · shadcn 16px · mui 16px | — |
| `icon.size` | list | 4 | 16px on 2 of 4 (1 product system, 1 kit) · 14px on 1 of 4 (1 product system) · mixed on 1 of 4 (1 kit) | — | cloudscape 16px · patternfly 14px · antpro mixed · mui 16px | — |
| `icon.size` | form | 4 | 16px on 2 of 4 (1 product system, 1 kit) · 12px on 1 of 4 (1 kit) · 20px on 1 of 4 (1 kit) | — | cloudscape 16px · antpro 12px · shadcn 16px · mui 20px | — |
| `icon.size` | detail | 3 | 14px on 2 of 3 (1 product system, 1 kit) · 16px on 1 of 3 (1 product system) | — | cloudscape 16px · patternfly 14px · antpro 14px | — |
| `icon.size` | all (context) | 5 | 16px on 2 of 5 (1 product system, 1 kit) · mixed on 2 of 5 (2 kits) · 14px on 1 of 5 (1 product system) | — | cloudscape 16px · patternfly 14px · antpro mixed · shadcn 16px · mui mixed | — |
| `type.sizes` (set) | all | 5 | 12px on 4 of 5 (2 product systems, 2 kits) · 14px on 4 of 5 (2 product systems, 2 kits) · 16px on 3 of 5 (2 product systems, 1 kit) · 20px on 2 of 5 (2 product systems) · 11px on 1 of 5 (1 kit) · 18px on 1 of 5 (1 product system) · 19px on 1 of 5 (1 product system) · 24px on 1 of 5 (1 product system) · 36px on 1 of 5 (1 product system) | — | cloudscape 12px, 14px, 18px, 20px · patternfly 12px, 14px, 16px, 20px · antpro 11px, 12px, 14px, 16px · mui 12px, 14px · govuk 16px, 19px, 24px, 36px | — |
| `heading.sizes` (set) | all | 6 | 24px on 5 of 6 (4 product systems, 1 kit) · 14px on 2 of 6 (2 kits) · 18px on 2 of 6 (1 product system, 1 kit) · 20px on 2 of 6 (2 product systems) · 12px on 1 of 6 (1 product system) · 16px on 1 of 6 (1 product system) · 19px on 1 of 6 (1 product system) · 35px on 1 of 6 (1 kit) · 48px on 1 of 6 (1 product system) | — | cloudscape 20px, 24px · patternfly 16px, 18px, 20px, 24px · antpro 14px · primer 12px, 24px · mui 14px, 18px, 24px, 35px · govuk 19px, 24px, 48px | — |
| `type.sizeCount` | all | 5 | 4 on 4 of 5 (3 product systems, 1 kit) · 2 on 1 of 5 (1 kit) | — | cloudscape 4 · patternfly 4 · antpro 4 · mui 2 · govuk 4 | — |
| `heading.sizeCount` | all | 6 | 2 on 2 of 6 (2 product systems) · 4 on 2 of 6 (1 product system, 1 kit) · 1 on 1 of 6 (1 kit) · 3 on 1 of 6 (1 product system) | — | cloudscape 2 · patternfly 4 · antpro 1 · primer 2 · mui 4 · govuk 3 | — |

### Spacing

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `spacing.grid4Share` | all | 4 | 0.9 on 3 of 4 (1 product system, 2 kits) · 0.75 on 1 of 4 (1 product system) | — | cloudscape 0.75 · patternfly 0.9 · antpro 0.9 · mui 0.9 | — |
| `spacing.onGrid4` | all | 4 | true on 3 of 4 (1 product system, 2 kits) · false on 1 of 4 (1 product system) | — | cloudscape false · patternfly true · antpro true · mui true | split |
| `spacing.steps` (set) | all | 6 | 8px on 5 of 6 (2 product systems, 3 kits) · 12px on 5 of 6 (2 product systems, 3 kits) · 24px on 5 of 6 (2 product systems, 3 kits) · 16px on 4 of 6 (1 product system, 3 kits) · 30px on 3 of 6 (1 product system, 2 kits) · 7px on 2 of 6 (2 product systems) · 15px on 2 of 6 (1 product system, 1 kit) · 20px on 2 of 6 (1 product system, 1 kit) · 22px on 2 of 6 (1 product system, 1 kit) · 2px on 1 of 6 (1 product system) · 4px on 1 of 6 (1 product system) · 5px on 1 of 6 (1 product system) · 6px on 1 of 6 (1 kit) · 10px on 1 of 6 (1 kit) · 13px on 1 of 6 (1 kit) · 17px on 1 of 6 (1 kit) · 19px on 1 of 6 (1 kit) · 21px on 1 of 6 (1 kit) · 28px on 1 of 6 (1 kit) · 48px on 1 of 6 (1 kit) · 55px on 1 of 6 (1 product system) · 59px on 1 of 6 (1 product system) · 60px on 1 of 6 (1 product system) · 66px on 1 of 6 (1 product system) · 72px on 1 of 6 (1 kit) · 78px on 1 of 6 (1 kit) · 80px on 1 of 6 (1 kit) · 83px on 1 of 6 (1 product system) · 84px on 1 of 6 (1 kit) · 101px on 1 of 6 (1 product system) · 489px on 1 of 6 (1 kit) · 637px on 1 of 6 (1 product system) · 724px on 1 of 6 (1 product system) | — | cloudscape 2px, 4px, 7px, 8px, 12px, 20px, 24px, 59px, 60px, 83px, 637px, 724px · patternfly 8px, 16px, 22px, 24px, 66px · antpro 8px, 12px, 16px, 17px, 22px, 24px, 30px, 48px, 72px, 78px · shadcn 6px, 8px, 12px, 13px, 15px, 16px, 21px, 24px, 28px, 84px · mui 8px, 10px, 12px, 16px, 19px, 20px, 24px, 30px, 80px, 489px · govuk 5px, 7px, 12px, 15px, 30px, 55px, 101px | — |
| `spacing.stepCount` | all | 6 | 10 on 3 of 6 (3 kits) · 5 on 1 of 6 (1 product system) · 7 on 1 of 6 (1 product system) · 12 on 1 of 6 (1 product system) | — | cloudscape 12 · patternfly 5 · antpro 10 · shadcn 10 · mui 10 · govuk 7 | — |

### Motion

| Claim | Page type | Lineages measured | Distribution | With fragments | Per lineage | Status |
|---|---|---|---|---|---|---|
| `motion.duration` | dashboard | 5 | 300ms on 3 of 5 (1 product system, 2 kits) · 200ms on 2 of 5 (1 product system, 1 kit) | — | cloudscape 200ms · patternfly 300ms · antpro 300ms · shadcn 200ms · mui 300ms | — |
| `motion.duration` | list | 4 | 300ms on 2 of 4 (2 kits) · 100ms on 1 of 4 (1 product system) · mixed on 1 of 4 (1 product system) | — | cloudscape 100ms · patternfly mixed · antpro 300ms · mui 300ms | — |
| `motion.duration` | form | 3 | 300ms on 2 of 3 (2 kits) · 200ms on 1 of 3 (1 product system) | — | cloudscape 200ms · antpro 300ms · mui 300ms | — |
| `motion.duration` | detail | 4 | mixed on 2 of 4 (1 product system, 1 kit) · 100ms on 1 of 4 (1 product system) · 200ms on 1 of 4 (1 product system) | — | cloudscape 200ms · patternfly mixed · antpro mixed · primer 100ms | — |
| `motion.duration` | all (context) | 6 | 200ms on 2 of 6 (1 product system, 1 kit) · 300ms on 2 of 6 (2 kits) · 100ms on 1 of 6 (1 product system) · mixed on 1 of 6 (1 product system) | — | cloudscape 200ms · patternfly mixed · antpro 300ms · shadcn 200ms · primer 100ms · mui 300ms | — |
| `motion.durations` (set) | all | 4 | 100ms on 4 of 4 (2 product systems, 2 kits) · 200ms on 4 of 4 (2 product systems, 2 kits) · 300ms on 4 of 4 (2 product systems, 2 kits) | — | cloudscape 100ms, 200ms, 300ms · patternfly 100ms, 200ms, 300ms · antpro 100ms, 200ms, 300ms · mui 100ms, 200ms, 300ms | — |

## What this says about the open cards of `research/reviews/batch-01.md`

A count is context for whoever answers a card. It answers no card and is not written into the batch file.

| Card | Question | From this run | Counts |
|---|---|---|---|
| 1 | one height for controls that sit together | yes, as counts on desktop console screens | `controls.shareHeight`: dashboard false 1 · true 1; list true 4 · false 1; form true 5; detail true 1; all true 5 · false 1; `controls.rowShareHeight`: dashboard true 1; list true 2; form true 2; detail none; all true 5 |
| 2 | default text field height on desktop | yes, as a distribution of field and button heights; the card's options do not list every height seen here | `field.height`: dashboard 32 2 · 28 1; list 32 2 · 28 1 · 36 1 · 40 1; form 32 2 · 40 2 · 36 1; detail 32 1; all 32 2 · mixed 2 · 36 1 · 40 1; `button.height`: dashboard 32 2 · 36 2 · 24 1; list 32 2 · 40 2 · 36 1; form 32 3 · 40 2 · 36 1; detail 32 2 · 36 1 · 40 1; all 32 3 · 40 2 · 36 1 · mixed 1 |
| 3 | 44px is a touch rule | half: buttons under 44px at 1440 are counted; whether a system enlarges controls for touch is not, because 390 is a width and no coarse pointer is emulated | `controls.pointerUnder44`: dashboard true 5; list true 5; form true 6; detail true 4; all true 7; `controls.narrowAtLeast44`: dashboard false 5; list false 5; form false 6; detail false 4; all false 7 |
| 4 | `brand` and `primary` | no: it asks about our own role names | — |
| 5 | body text size | yes for console screens, as distributions of field text size and of the size most characters are set in; nothing about reading or marketing pages | `field.textSize`: dashboard 14 3; list 14 4 · 16 1; form 14 4 · 19 1; detail 14 1; all 14 5 · 19 1; `text.bodySize`: dashboard 14 5; list 14 3 · mixed 1; form 14 3 · 36 1 · mixed 1; detail 14 3 · 16 1 · 19 1; all 14 5 · 16 1 · mixed 1 |
| 6 | colour change under reduced motion | no: that needs reduced-motion emulation, a further load per screen; only whether reduced-motion rules exist is counted | `motion.reducedMotionRules`: all true 6 · false 1 |
| 7 | no input fields inside cards | yes, as counts on form screens; a page's one wide content surface also reads as a panel (`wide`) | `fields.inPanel`: form true 4 · false 1 |
| 8 | one corner radius for controls that sit together | yes, as counts | `controls.shareRadius`: dashboard false 1 · true 1; list false 2 · true 2 · mixed 1; form true 4 · false 1; detail false 1; all true 4 · false 1 · mixed 1 |
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
10. The anatomy probe is new and its tests are heuristics. A label is found through `for`, wrapping, or `aria-labelledby` only. A button's inset is the declared one, so a fixed-width button without padding reads 0. A field with two inputs reads as two fields. Icons are `svg`, `img`, and `role="img"` elements, so icon fonts are not seen. Headings are `h1` to `h6` and `role="heading"`, so a system that sets its titles in plain elements has no heading value.
11. An outline drawn on a pseudo-element or a covering child gives a field's or a button's box, height, and radius, and a panel's border, but not a field's drawing style or a button's border width: those are read from the box's own style, so such a field reads as `none` or `fill`.
12. The spacing sample resolves a border in favour of the 4px grid: a 15px padding inside a 1px border counts as 16. That is the study's assumption, so a system that really uses 15px shows as 16.
