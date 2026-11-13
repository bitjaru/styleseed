# Pattern consensus: what published design-system screens render

This study loads the full product screens that design-system teams publish as demos, measures them
with the repository's own probes, and counts where independent design systems (lineages) land on the
same value for one page type. The counts can move a catalog rule's `evidence` from `inferred` to
`observed` (a later change to `engine/rules/`, not this folder). The same screens also serve as a
negative control for the render-fault classes of `ss-verify`: a class that fires on many screens built
by the teams that maintain these systems has a definition or a threshold worth another look.

What it is not: a review, a score, or design acceptance. Nothing a model judges enters a table, no
public sentence here describes agreement as anything more than counts ("3 of 4 design systems"), no
row adds a rule or changes a rule's `priority`, `check`, `kind`, or `scope`, and nothing here gates.

## Sources

| Lineage | Name | Kind | Host | Access | Licence of the demos | Terms (automated access) | Checked |
|---|---|---|---|---|---|---|---|
| `cloudscape` | AWS Cloudscape | product system | `cloudscape.design` | self-hosted: `cloudscape-design/demos` at `dda7bab`, built and served on `127.0.0.1` | MIT-0 | `restricted`: the AWS Site Terms exclude robots and data-gathering tools, so the hosted pages are never loaded | 2026-11-12 |
| `patternfly` | Red Hat PatternFly | product system | `www.patternfly.org` | hosted, not loaded while its terms read `restricted` | MIT (`patternfly/patternfly-org`) | `restricted`: the Red Hat terms the site's footer links rule out using the site in a way that deploys a robot or a retrieval application | 2026-11-12 |
| `antpro` | Ant Design Pro | kit | `preview.pro.ant.design` | hosted | MIT (`ant-design/ant-design-pro`) | `not-mentioned`: the preview app links no terms page | 2026-11-12 |
| `shadcn` | shadcn/ui | kit | `ui.shadcn.com` | hosted | MIT (`shadcn-ui/ui`) | `not-mentioned`: the site links no terms page | 2026-11-12 |
| `primer` | GitHub Primer | product system | `primer.style` | hosted | MIT (`primer/react`) | `conditional`: the GitHub Acceptable Use Policies allow research use of public, non-personal information when the publication is open access, as this repository is; whether they cover `primer.style` is not stated | 2026-11-12 |
| `carbon` | IBM Carbon | product system | `react.carbondesignsystem.com` | hosted (one form story, a fragment) | Apache-2.0 (`carbon-design-system/carbon`) | `robots-txt`: the IBM terms allow a crawler as far as the site's `robots.txt` permits | 2026-11-12 |

PatternFly's demos are open source (`patternfly/patternfly-org`, MIT), so a later run could measure a
self-hosted build the way Cloudscape is measured; that is the maintainer's decision.

`screens.json` lists the 32 screens (30 full screens and 2 fragments), each with its lineage, the page
type the study assigns (`dashboard`, `list`, `form`, `detail`), its tier (`screen` or `fragment`), its
URL, and `expect`: floors checked at 1440 (elements, tables, fields, buttons, about half of what the
page had when the list was made). A page under a floor has changed or is not showing the product
screen, and it is skipped as `unexpected-content`. A terms verdict is a reading of the site's terms
for a clause on automated access, recorded with its date; it is not a legal reading, and the
maintainer owns the decision. `consensus-study.mjs --measure` refuses a hosted lineage whose verdict
is `restricted` or `unchecked`.

## How a screen is loaded

- One `robots.txt` request per origin (a `robots.txt` that redirects to another origin reads as
  disallowed) and one page load per screen and viewport, 1440×900 and then 390×844. Sequential, one
  page open at a time, a pause after every load (`--delay`, 4 seconds by default), no retry inside a
  run. The default browser user agent; no header or URL names this project.
- Each load: a new browser context with only the viewport and a device scale factor of 1, `load`, a
  wait for network idle and for fonts, 500ms, then the probes in this order: `observe-design`,
  `observe-structure`, `observe-faults`, the study's control probe, and its dialog guard. This is the
  sequence of `measure-reference.mjs` `observeUrls` with the scroll pass off, which is also how
  `scripts/calibrate-render-faults.mjs` measures the repository's own screens;
  `scripts/test-consensus-browser.mjs` checks that the two give equal output.
- Nothing is clicked, hovered, typed, scrolled, or followed; no cookie or storage is written, no
  request is intercepted, nothing is emulated, and no screenshot is taken. A page that needs
  interaction to show its product screen is skipped, not operated.
- Guards: a missing response or an HTTP status of 400 or more (`http-error`), a final URL on another
  origin (`redirected-host`) or on another path or query (`redirected-path`), a dialog covering half of
  the viewport or more (`overlay`), and at 1440 a floor of `expect` not met (`unexpected-content`).
  A screen is measured when its 1440 viewport is; a failed 390 viewport is kept as a status and left
  out of every 390 count.

The control probe (`scripts/lib/consensus-probe.mjs`) reads controls with the definition the engine
probes use: the visible-control-box block, the same text in `observe-design.mjs`,
`observe-structure.mjs`, and this probe, compared by `scripts/runtime-tests/control-box.test.mjs`. On
top of the control heights it records the input element's own height, the radius, the text size, and
the panel of each field; the emphasis, radius, and text size of each labelled action button; the field
and button pairs on one row; and the characters set in each font size. It leaves out navigation,
page-level headers and footers, and anything fixed to the viewport, which the engine probes measure.

## What is stored, and what never is

```
research/consensus/
  README.md             this file
  screens.json          the list of sources and screens (written by a person)
  runs/<date>/
    run.json            probe versions, browser version, viewports, scroll false, delay,
                        the fault class ids in order, one status row per listed screen
    manifest.json       screens.json as it was for this run
    screens/<id>.json   one record per measured screen
    consensus.json  CONSENSUS.md
    negative-control.json  NEGATIVE-CONTROL.md
```

A record holds numbers and enums: per viewport the HTTP status, the element count, the document
height, the dialog share, the design probe's histograms (control heights, radii, target sizes, type,
spacing) and body size, the structure probe's regions, controls, tables, lists, tabs, stylesheet counts,
and skipped hosts, the control probe's output, and the fault probe's findings (at most 50 per class),
true counts per class, candidate counts, distributions, icon signatures, and caps; then the screen's
role colours, spacing base and scale, radius and control-height families, type sizes, the **number** of
font families, motion counts, and the facts of `analyze-structure.mjs`. The only URL in a record is the
listed one.

Never stored: a screenshot, page text, a selector, a class name, an asset URL, a font family name, the
measured page's final URL, or the probes' text, action, link, surface, shadow, border, and backdrop
colour tables. Every stored `.json` file except `manifest.json` is walked by the allow-list of
`scripts/lib/reference-allow-list.mjs` after the screen ids, lineage ids, and listed URLs of that run's
manifest are taken out (`stripIds`); `--check` and `scripts/runtime-tests/consensus.test.mjs` run the walk.

## Counting

One lineage, one vote: a design system counts once however many of its screens are measured. A
claim reads a screen only when the screen can show the fact; a lineage's value is the bucket more than
half of its eligible screens hold (`mixed` when none does), or, for the fault claims, whether every
eligible screen holds. A row is one claim on one page type; `all` pools the page types and is context,
except for the claims that read a whole lineage at once.

**Candidate rule.** A row is a `candidate` when at least 3 lineages hold the same value, they are at
least two thirds of the lineages measured on that row, and at least 2 of them are product systems.
A row with fewer than 3 lineages measured is `thin`; anything else is `split` and is reported as a
distribution. A candidate whose value is the opposite of the rule's clause is listed first. A dimension
(a height, a size) stays a project's choice and is reported as a distribution only. Fragments (form
compositions without an app shell) are measured and shown beside each row; they never change a
row's counts or status.

**Kits.** Cloudscape, PatternFly, Primer, and Carbon are systems a company builds its own products
with (`product-system`). Ant Design Pro and shadcn/ui are open-source kits whose demo is the product
(`kit`). Kits count in every row, but a row needs two agreeing product systems, so kits alone cannot
carry one: a kit's demo shows what the kit ships, not what a product team settled on.

## Limits

1. Sites change. A run is a dated snapshot; raw numbers are kept so a later run can be compared, and
   an old run is never edited.
2. Demos are not products: they carry demo chrome, placeholder titles, and invented data. The control
   probe leaves navigation and fixed widgets out; the engine probes and the fault probe measure
   everything.
3. Lineage independence is partial. Web systems for desktop consoles share conventions and
   influences; agreement among them says what such systems do, not what suits a consumer or a mobile
   product. Two of the five full-screen lineages are kits.
4. The sample is small. With three or four lineages on a page type, two thirds is often all of them,
   and one changed page can flip a row.
5. The control probe's field-box, button, and panel tests are heuristics: the limits of the
   visible-control-box definition apply (a chip of 24px or more built on a button reads as a button,
   a link styled as a button by utility classes alone is not read, a borderless input in a small
   painted container reads at the container, only the state at rest is read; the full list is in
   `engine/REFERENCE-COMPILER.md`, "Measurement and evidence levels"), and a page's single wide
   surface reads as a panel.
6. 390 is a width, not a phone: no touch, no coarse pointer, no mobile user agent.
7. Shadow roots, iframes, and inner scroll containers are not entered; text boxes depend on the fonts
   each site serves and on the measuring machine; some pages give the structure probe no sections.
8. The page type is the study's label, and some screens are mixed.
9. There is no scroll pass: content a page renders only after scrolling is not measured.

## Re-running

```
node scripts/consensus-study.mjs --measure [--base cloudscape=http://127.0.0.1:<port>/<path>/]
node scripts/consensus-study.mjs --report --run <date>
node scripts/consensus-study.mjs --check
```

`--measure` writes a new folder named by the UTC date and refuses a folder that exists: old runs stay
as they are. `--only <id,id> --run <date>` re-measures listed screens of that run once (for a failure
that looked temporary) and replaces their records and status rows. `--report` regenerates the four
generated files from the records; never edit them by hand. `--check` prints one line per run and fails
when a stored file does not pass the allow-list walk, a listed screen has no status row, or a
generated file differs from what its records give.

For Cloudscape, clone `cloudscape-design/demos` outside this repository and build it as its README
says (`npm install`, then `npm run build`; `npm ci` does not work there because the project removes its
own `@cloudscape-design/*` entries from the lock file). The build writes the pages to `lib/`. Serve that
folder on `127.0.0.1` with a static file server (`python3 -m http.server <port> --bind 127.0.0.1
--directory lib`), record `selfHosted` (repository, commit, licence, build date) on the lineage in
`screens.json`, and pass `--base cloudscape=http://127.0.0.1:<port>/`. The hosted Cloudscape pages are
never loaded.

## Runs

- [`runs/2026-11-12/`](runs/2026-11-12/CONSENSUS.md): 24 of 32 screens measured, 0 failed, 8 skipped (PatternFly,
  on its terms). Cloudscape was measured from a local build of `cloudscape-design/demos` at `dda7bab`.
  Chromium 156.0.8078.4. Tables: [`CONSENSUS.md`](runs/2026-11-12/CONSENSUS.md) and
  [`NEGATIVE-CONTROL.md`](runs/2026-11-12/NEGATIVE-CONTROL.md). Measured with control probe version 1
  and with engine probes that read the input element and every button (both readings are in each
  record). Version 1 read a 201px dashed card as a button on one screen, date ranges as two bare 22px
  inputs on three screens, two 20px pills as buttons on one screen, and a label wrapped at 390 as a
  52px button on one screen.
