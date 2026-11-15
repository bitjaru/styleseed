# Pattern consensus: what published design-system screens render

This study loads the full product screens that design-system teams publish as demos, measures them
with the repository's own probes, and counts where independent design systems (lineages) land on the
same value for one page type. The counts can move a catalog rule's `evidence` from `inferred` to
`observed` (a later change to `engine/rules/`, not this folder). The same screens also serve as a
negative control for the render-fault classes of `ss-verify`: a class that fires on many screens built
by the teams that maintain these systems has a definition or a threshold worth another look. Since
the second version of the claims (`consensusVersion` 2) the study also measures the anatomy of those
screens' buttons, fields, panels, tables, navigation, type, spacing, and motion, and reports each
dimension as a distribution across lineages.

What it is not: a review, a score, or design acceptance. Nothing a model judges enters a table, no
public sentence here describes agreement as anything more than counts ("3 of 4 design systems"), no
row adds a rule or changes a rule's `priority`, `check`, `kind`, or `scope`, and nothing here gates.

## Sources

| Lineage | Name | Kind | Context | Host | Access | Licence of the demos | Terms (automated access) | Checked |
|---|---|---|---|---|---|---|---|---|
| `cloudscape` | AWS Cloudscape | product system | console | `cloudscape.design` | self-hosted: `cloudscape-design/demos` at `dda7bab`, built and served on `127.0.0.1` | MIT-0 | `restricted`: the AWS Site Terms exclude robots and data-gathering tools, so the hosted pages are never loaded | 2026-11-12 |
| `patternfly` | Red Hat PatternFly | product system | console | `www.patternfly.org` | self-hosted from the next run (switch set 2026-11-13): a local build of `patternfly/patternfly-org`, served on `127.0.0.1`; the hosted pages are never loaded | MIT (`patternfly/patternfly-org`) | `restricted`: the Red Hat terms the site's footer links rule out using the site in a way that deploys a robot or a retrieval application | 2026-11-12 |
| `antpro` | Ant Design Pro | kit | console | `preview.pro.ant.design` | hosted | MIT (`ant-design/ant-design-pro`) | `not-mentioned`: the preview app links no terms page | 2026-11-12 |
| `shadcn` | shadcn/ui | kit | console | `ui.shadcn.com` | hosted | MIT (`shadcn-ui/ui`) | `not-mentioned`: the site links no terms page | 2026-11-12 |
| `primer` | GitHub Primer | product system | console | `primer.style` | hosted | MIT (`primer/react`) | `conditional`: the GitHub Acceptable Use Policies allow research use of public, non-personal information when the publication is open access, as this repository is; whether they cover `primer.style` is not stated | 2026-11-12 |
| `carbon` | IBM Carbon | product system | console | `react.carbondesignsystem.com` | hosted (one form story, a fragment) | Apache-2.0 (`carbon-design-system/carbon`) | `robots-txt`: the IBM terms allow a crawler as far as the site's `robots.txt` permits | 2026-11-12 |
| `mui` | MUI templates | kit | console | `mui.com` | hosted, not loaded before its terms are checked | MIT (`mui/material-ui`) | `unchecked`: the terms check is made before the first load | — |
| `govuk` | GOV.UK Frontend | product system | service | `govuk-frontend-review.herokuapp.com` | hosted, not loaded before its terms are checked | MIT (`alphagov/govuk-frontend`) | `unchecked`: the terms check is made before the first load | — |

PatternFly's demos are open source (`patternfly/patternfly-org`, MIT). The maintainer set it to
self-hosted on 2026-11-13: a run measures a local build the way Cloudscape is measured, and its
`selfHosted` entry (repository, commit, licence, build date) is recorded when it is built. The hosted
site stays `restricted` and is never loaded.

`screens.json` lists the 46 screens (44 full screens and 2 fragments), each with its lineage, the page
type the study assigns (`dashboard`, `list`, `form`, `detail`), its tier (`screen` or `fragment`), its
URL, and `expect`: floors checked at 1440 (elements, tables, fields, buttons, about half of what the
page had when the list was made). A page under a floor has changed or is not showing the product
screen, and it is skipped as `unexpected-content`. A terms verdict is a reading of the site's terms
for a clause on automated access, recorded with its date; it is not a legal reading, and the
maintainer owns the decision. `consensus-study.mjs --measure` refuses a hosted lineage whose verdict
is `restricted` or `unchecked`.

**Context.** A lineage may carry `context`: `console` (dense tools for trained users at a desk; the
default when the field is absent) or `service` (public-facing transaction pages: one question per
page, large type and controls). It is a label shown in the tables so a reader can see what a split
depends on; it changes no count and no status.

**Identifiers for sources without hosted pages.** A lineage whose demos exist only as a build of its
repository (no hosted copy) lists its screens under the reserved top-level domain `.invalid`
(RFC 2606), for example `https://paste.invalid/iframe.html?viewMode=story&id=…`: an identifier that
cannot be loaded. The lineage is `self-hosted`, and `--base` maps the identifier onto the local build
as it does for any other self-hosted lineage.

### Reach per page type

Product systems with at least one full screen, by the state of the switches in the work order that
added them (WO-12). A candidate row needs 3 agreeing lineages of which 2 are product systems, so a page
type with one product system cannot produce one.

| Page type | Cloudscape and Primer | and PatternFly (self-hosted) | and GOV.UK (the switches as set for the next run) | and Twilio Paste | Kits available |
|---|---|---|---|---|---|
| dashboard | 1 | 2 | 2 | 2 | Ant Design Pro, shadcn/ui, MUI templates, TDesign starter |
| list | 1 | 2 | 3 | 4 | Ant Design Pro, MUI templates, TDesign starter |
| form | 2 (Primer's has no field) | 2 | 3 | 4 | Ant Design Pro, shadcn/ui, MUI templates, TDesign starter |
| detail | 2 | 3 | 4 | 5 | Ant Design Pro, TDesign starter |

Dashboards have two product systems at most: no third product system checked so far publishes a full
dashboard that can be measured under this study's rules (see "Not measured"). A kit is not relabelled
as a product system to fill the gap.

### Not measured

Each with the reason it is left out; none is added back without a work order that checks it again.

- TDesign React starter (kit): its switch is `skip`. Measuring it means installing its repository and
  running its development server with mock data; the hosted preview is never loaded.
- Twilio Paste (product system): its switch is `skip`. Its hosted site no longer exists, and a build
  of its Storybook covers the whole repository.
- SAP OpenUI5 demo kit: the SAP terms rule out automated extraction on the hosted pages; a local build
  is possible, but a UI5 button paints its box on an inner element and the apps use fragment routes,
  which the study's tooling does not cover yet.
- HPE Design System: its page templates render inside documentation pages in a scaled mock browser;
  the full-screen view needs a click.
- Elastic EUI: component stories and a skeleton page template; its licence is not an open-source one.
- Atlassian, Microsoft Fluent, GitLab Pajamas: documentation or component stories only; GitLab's
  `robots.txt` redirects into a sign-in flow, so it cannot be read.
- Shopify Polaris: the repository is archived, its licence limits use to applications that integrate
  with Shopify, and both hosts redirect elsewhere.
- Salesforce Lightning: documentation only; the repository is archived.
- VMware Clarity, Adobe React Spectrum, Zendesk Garden, Uber Base Web: documentation, component
  examples, or build-tool starters; no product screen.
- Pinterest Gestalt: its `robots.txt` redirects to a sign-in page, so it cannot be read.
- Nordhealth Nord: web components inside shadow roots, which the probes do not enter.
- Arco Design Pro (kit): every page redirects to a sign-in page unless local storage holds a session,
  and this study writes no storage.
- Tremor (kit): built on the same primitives and default scale as shadcn/ui, so it would count one
  family twice.
- Refine (kit): renders through other kits' components, so it is not a lineage of its own.
- Mantine, Chakra UI (kits): Mantine publishes sections rather than full screens; Chakra's full
  templates are paid.
- IBM Carbon beyond its one form story: component stories; the tutorial repository is archived.

## How a screen is loaded

- One `robots.txt` request per origin (a `robots.txt` that redirects to another origin reads as
  disallowed) and one page load per screen and viewport, 1440×900 and then 390×844. Sequential, one
  page open at a time, a pause after every load (`--delay`, 4 seconds by default), no retry inside a
  run. The default browser user agent; no header or URL names this project.
- Each load: a new browser context with only the viewport and a device scale factor of 1, `load`, a
  wait for network idle and for fonts, 500ms, then the probes in this order: `observe-design`,
  `observe-structure`, `observe-faults`, the study's control probe, its anatomy probe, and its dialog
  guard. This is the
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

The anatomy probe (`scripts/lib/consensus-anatomy.mjs`) measures what sits inside and around those
controls. It reads buttons and fields through the same visible-control-box block (a fourth copy,
compared by the same test) and selects them exactly as the control probe does, on the same visible box
(`scripts/test-consensus-browser.mjs` checks that the two agree on every fixture page), then reads per
button the inset from its outer edge to the label or a leading icon, text size and weight, corner
radius, border width, and the size of an icon and its gap to the label; per field the inset to where
the value starts, text size, radius, how its box is drawn (`box`, `under`, `ring`, `fill`, `none`),
border width, and a leading icon; per field its label's position, gap, size, and weight, and the gap
to the next field below it; per panel its inset, radius, border, and how it is set apart (border,
shadow, tone), and the gap to a neighbouring panel; table header and body cells (row height, inset,
text size, weight); headings; line heights per text size; and icon sizes. A button's inset is the
declared one (border, padding, and the margins of wrappers down to the label), because a measured
inset grows with a stretched or minimum-width button; the insets of fields, panels, and cells are
measured from the box edge to where the content starts, because wrappers hide the declaration. A
border drawn on a `::before` or `::after` element that covers a panel is read as that panel's border.
For a field or a button such an outline gives the box, its height, and its radius (the block finds
it), while the field's drawing style and the button's border width are read from the box's own style.
Like the control probe it leaves navigation, page-level headers and footers, and anything fixed to the
viewport out.

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
and skipped hosts, the control probe's output, the anatomy probe's output (records of version 2), and
the fault probe's findings (at most 50 per class),
true counts per class, candidate counts, distributions, icon signatures, and caps; then the screen's
role colours, spacing base and scale, radius and control-height families, type sizes, the **number** of
font families, motion counts, and the facts of `analyze-structure.mjs`. The only URL in a record is the
listed one.

Never stored: a screenshot, page text (labels and headings included), a selector, a class name, an
asset URL, an icon's name or source, a font family name, the position of any element, the measured
page's final URL, or the probes' text, action, link, surface, shadow, border, and backdrop colour
tables. Every stored `.json` file except `manifest.json` is walked by the allow-list of
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

**Kits.** Cloudscape, PatternFly, Primer, Carbon, and GOV.UK Frontend are systems an organisation
builds its own products or services with (`product-system`). Ant Design Pro, shadcn/ui, and the MUI
templates are open-source kits whose demo is the product (`kit`). Kits count in every row, but a row
needs two agreeing product systems, so kits alone cannot carry one: a kit's demo shows what the kit
ships, not what a product team settled on.

**Set-valued rows.** A few claims give each lineage a list of values instead of one: the spacing
steps, type sizes, heading sizes, corner radii, and transition-duration bands a system uses
(`valueKind: "set"`). Such a row counts, for each value, the lineages whose list holds it, so its
counts can add up to more than the lineages measured; it has no status. Beside each set, a single
count per lineage (how many sizes, steps, or radii it uses) is a dimension of its own.

**The spacing sample.** The spacing claims read measured insets and gaps instead of the declared CSS
of every element: per screen, the inline padding of buttons, fields, and table cells, the inset of
narrow panels, and the gaps between a label and its field, between stacked fields, between neighbouring
panels, and between a button's icon and its label, each value with the border it sits inside, keeping
the combinations that hold at least 10% of their kind on that screen. A border is resolved in favour
of the 4px grid (a value that is not a multiple of 4 becomes the value less its border when that is
one), so a 15px padding inside a 1px border counts as 16. A distinct pair of kind and resolved value is
one step, and a lineage's steps are the union over its screens.

## Fixed before the run

The claims of `consensusVersion` 2 (their eligibility tests, buckets, and thresholds), the spacing
sample, the agreement rule, and the anatomy probe were committed at `7a3e87f`
(`7a3e87fdd091ebad713d3e81314cdb2853780ac4`, "anatomy probe and claims") before any page was measured
with them. The anatomy probe's helper block is a copy of the control probe's selection and box
helpers; when the control probe takes up the shared visible-control-box block, the same block replaces
this copy before the first run, and this paragraph then names that commit too.

A reader, a bucket, a threshold, or a probe rule that does what it states and still misreads a real
page is not changed before the run that shows it is committed. The fix then goes into a commit of its
own with its test, raises `consensusVersion` (and the probe's `version` when the probe changes) so the
committed run is never regenerated under the new definition, and a corrected run measures every
screen again into a new dated folder. Both runs stay and are listed under "Runs" with one line on
what changed; no row of the first is deleted, and no threshold is moved toward a result.

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
10. The anatomy probe is new and its tests are heuristics. A label is found through `for`, wrapping,
    or `aria-labelledby` only; a button's inset is the declared one, so a fixed-width button without
    padding reads 0; a field with two inputs reads as two; icons are `svg`, `img`, and `role="img"`
    elements, so icon fonts are not seen; headings are `h1` to `h6` and `role="heading"`, so a system
    that sets its titles in plain elements has no heading value.
11. An outline drawn on a pseudo-element or a covering child gives a field's or a button's box, height,
    and radius, and a panel's border, but not a field's drawing style or a button's border width: those
    are read from the box's own style, so such a field reads as `none` or `fill`.
12. The spacing sample resolves a border in favour of the 4px grid. That is the study's assumption: a
    system that really uses 15px inside a 1px border shows as 16.

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
