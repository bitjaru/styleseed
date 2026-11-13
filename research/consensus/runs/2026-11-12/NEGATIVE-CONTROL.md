# Render-fault classes on published demo screens — run `2026-11-12`

The render-fault probe and its fixed thresholds, run on the full screens of the study at 1440×900 and 390×844 (one load each, no scroll pass). Rates count full screens only; fragments are listed apart, and a screen whose 390 viewport failed is in no 390 denominator. `Candidates` counts the records the probe collected for a class before any threshold: a class with no findings and no candidates was not exercised by these screens.

## Per class

| Class | Screens with any @1440 | Screens with any @390 | Lineages with any @1440 | Lineages with any @390 | Findings @1440 | Findings @390 | Most on one screen @1440 | Most on one screen @390 | Candidates @1440 | Candidates @390 |
|---|---|---|---|---|---|---|---|---|---|---|
| amount-wrap | 0 of 23 | 0 of 23 | 0 of 4 | 0 of 4 | 0 | 0 | 0 | 0 | 210 | 184 |
| text-overlap | 0 of 23 | 0 of 23 | 0 of 4 | 0 of 4 | 0 | 0 | 0 | 0 | 4 | 12 |
| text-spill | 0 of 23 | 0 of 23 | 0 of 4 | 0 of 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| text-clip | 0 of 23 | 1 of 23 | 0 of 4 | 1 of 4 | 0 | 5 | 0 | 5 | 0 | 5 |
| tight-inset | 2 of 23 | 3 of 23 | 1 of 4 | 2 of 4 | 5 | 9 | 4 | 4 | 237 | 197 |
| text-touch | 1 of 23 | 1 of 23 | 1 of 4 | 1 of 4 | 1 | 1 | 1 | 1 | 1 | 1 |
| near-touch | 0 of 23 | 1 of 23 | 0 of 4 | 1 of 4 | 0 | 1 | 0 | 1 | 1 | 2 |
| near-align | 3 of 23 | 2 of 23 | 2 of 4 | 1 of 4 | 4 | 3 | 2 | 2 | 14 | 3 |
| emoji-icon | 0 of 23 | 0 of 23 | 0 of 4 | 0 of 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| icon-mix | 5 of 23 | 3 of 23 | 3 of 4 | 1 of 4 | 6 | 4 | 2 | 2 | — | — |

## Gate candidates

- amount-wrap: 0 finding(s) at 1440, 0 at 390.
- text-overlap: 0 finding(s) at 1440, 0 at 390.
- text-spill: 0 finding(s) at 1440, 0 at 390.

## Candidates under each neighbouring limit

Records under each limit, summed over the full screens (the thresholds themselves are unchanged).

| Row | @1440 | @390 |
|---|---|---|
| tight-inset panel < 2 | 0 | 0 |
| tight-inset panel < 4 | 0 | 0 |
| tight-inset panel < 6 | 4 | 5 |
| tight-inset panel < 8 | 5 | 9 |
| tight-inset panel < 10 | 17 | 23 |
| tight-inset panel < 12 | 19 | 28 |
| tight-inset chip < 2 | 0 | 0 |
| tight-inset chip < 4 | 0 | 0 |
| tight-inset chip < 6 | 0 | 0 |
| tight-inset chip < 8 | 29 | 8 |
| tight-inset chip < 10 | 60 | 29 |
| tight-inset chip < 12 | 76 | 43 |
| text-touch < 1 | 1 | 1 |
| text-touch < 2 | 1 | 1 |
| text-touch < 3 | 1 | 1 |
| text-touch < 4 | 1 | 1 |
| text-touch < 5 | 1 | 1 |
| text-touch < 6 | 1 | 1 |
| near-touch < 1 | 0 | 0 |
| near-touch < 2 | 0 | 1 |
| near-touch < 3 | 0 | 1 |
| near-touch < 4 | 0 | 1 |
| near-touch < 5 | 0 | 1 |
| near-touch < 6 | 0 | 1 |
| near-align < 1 | 0 | 0 |
| near-align < 2 | 0 | 0 |
| near-align < 3 | 4 | 3 |
| near-align < 4 | 4 | 3 |
| near-align < 5 | 14 | 3 |
| near-align < 6 | 14 | 3 |

## Probe caps

None.

## Per screen

Findings at 1440 / 390; `—` is a viewport that failed.

| Screen | Lineage | amount-wrap | text-overlap | text-spill | text-clip | tight-inset | text-touch | near-touch | near-align | emoji-icon | icon-mix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `cloudscape-dashboard` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 0 | 0 / 0 | 0 / 0 | 2 / 2 | 0 / 0 | 1 / 1 |
| `cloudscape-table` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 2 / 2 |
| `cloudscape-cards` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 |
| `cloudscape-form` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 4 / 4 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `cloudscape-edit` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `cloudscape-details` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 0 / 0 |
| `cloudscape-details-hub` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `cloudscape-details-tabs` | cloudscape | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-analysis` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 0 |
| `antpro-workplace` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 5 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-table-list` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-basic-list` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-card-list` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-basic-form` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-advanced-form` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-settings` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-profile-basic` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 4 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `antpro-profile-advanced` | antpro | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `shadcn-dashboard` | shadcn | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 1 / 0 | 0 / 0 | 1 / 0 |
| `shadcn-login` | shadcn | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `primer-issue` | primer | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `primer-pull-request` | primer | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| `primer-settings` | primer | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

## Fragments

Measured and listed; in no rate above.

| Screen | Lineage | amount-wrap | text-overlap | text-spill | text-clip | tight-inset | text-touch | near-touch | near-align | emoji-icon | icon-mix |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `carbon-form` | carbon | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 0 / 0 | 1 / 1 | 0 / 0 | 0 / 0 |

These screens were built by the teams that maintain the design systems. A class that fires on many of them measures something those teams accepted. Whether a definition or a threshold should change is a later decision; this run changes none.
