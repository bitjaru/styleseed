# StyleSeed Brand Recipes

A brand recipe is a maintained **morphology contract**: geometry, containment, density,
navigation, controls, data treatment, and motion. It changes what an agent selects and how the
pieces are composed. It is not a color skin, a component clone, or permission to imitate a
company's protected assets.

```text
output grammar = what job and attention structure the result needs
brand recipe   = what reusable shape language implements that structure
style profile  = an optional coordinated aesthetic adjustment
skin           = semantic color and type tokens
```

Choose one recipe after the output grammar. `auto` selects the maintained mapping for the
grammar; an explicit recipe is useful when the product category and brand posture need a
different morphology. A recipe may narrow component choices but cannot override the grammar,
surface adapter, accessibility, or project-local reference evidence.

## Selection guide

| Recipe | Best for | Reference families | Characteristic morphology |
|---|---|---|---|
| `calm-consumer` | personal finance, health, benefits, friendly utilities | Toss, Wise, consumer-service research | soft grouping, one reassuring summary, sparse actions |
| `native-mobile` | iOS/Android-first utilities and focused mobile tasks | Apple HIG, platform conventions | content-first chrome, reachable controls, adaptive system patterns |
| `enterprise-workbench` | B2B operations, admin, analytics, workflow | Carbon, Fluent, Atlassian | aligned panels, compact controls, visible structure, dense evidence |
| `developer-platform` | developer tools, infrastructure, repositories | Primer, Linear/Vercel research | hairlines, compact rows, mono evidence, restrained dark layers |
| `commerce-operator` | merchant admin, catalog, fulfillment, support | Shopify Polaris, commerce research | task queues, resource rows, contextual actions, operational status |
| `public-service` | government, regulated forms, consequential services | GOV.UK Design System, USWDS | flat high-contrast flow, explicit labels, one step at a time |
| `creative-professional` | creation tools, media workflows, pro editing | Adobe Spectrum | focused canvas, tool groups, platform scale, quiet utility chrome |
| `editorial-authority` | reports, journalism, research, documentation | editorial systems, public-content guidance | type-led hierarchy, reading measure, rules and whitespace over cards |
| `expressive-brand` | launches, campaigns, portfolios, social stories | independent brand and campaign systems | signature composition, display type, controlled contrast and motion |

## Auto selection

| Output grammar | Default recipe |
|---|---|
| `consumer-service` | `calm-consumer` |
| `operations-console` | `enterprise-workbench` |
| `technical-instrument` | `developer-platform` |
| `editorial-reading` | `editorial-authority` |
| `commerce-conversion` | `commerce-operator` |
| `institutional-service` | `public-service` |
| `expressive-marketing` | `expressive-brand` |
| `sequential-story` | `creative-professional` |

The defaults are starting points, not product-category stereotypes. For example, a mobile
warehouse tool can use `operations-console × native-mobile`, and a research launch can use
`expressive-marketing × editorial-authority`.

## Required recipe contract

Every built-in recipe defines:

1. best-fit jobs and compatible grammars;
2. containment and page-shell model;
3. radius, border, elevation, and spacing behavior;
4. typography and icon behavior;
5. navigation, controls, collection, and data morphology;
6. motion and responsive behavior;
7. one characteristic move to require;
8. anti-patterns and protected details to reject;
9. evidence lineage and official source URLs.

## `calm-consumer`

- **Best fit:** personal state, reassurance, benefits, lightweight health, and short recurring
  tasks. Strong with `consumer-service`; usable for a gentle `commerce-conversion`.
- **Containment:** tonal groups and a few soft cards. One summary may float; secondary rows
  should not become an equal card wall.
- **Geometry:** 12–20px outer radius, smaller nested radius, restrained shadow or tonal
  separation, comfortable 20–24px gutters.
- **Type/icons:** friendly sans, plain-language values, simple line icons without repeated
  tinted icon chips.
- **Controls/collections:** reachable primary action, short rows or grouped sections, pill
  controls only for true compact choices.
- **Motion:** immediate and reassuring; spring may be restrained; consequential values do not
  count theatrically.
- **Characteristic move:** one calm contextual briefing connected to the user's current state.
- **Reject:** copying Toss layouts, every service as a rounded card, blue as an automatic brand,
  cute language in serious states, or chips as decoration.
- **Lineage:** StyleSeed consumer-service research; brand examples are evidence, not sources to
  copy.

## `native-mobile`

- **Best fit:** focused mobile utilities, capture, communication, media, and one-handed tasks.
  Compatible with any grammar whose primary surface is a mobile app.
- **Containment:** content is primary; navigation and controls recede into platform-familiar
  bars, sheets, lists, and grouped regions.
- **Geometry:** platform-aware radii and materials, 16–20px screen gutters, touch targets at
  least 44px, no desktop card grid squeezed into a phone.
- **Type/icons:** dynamic type and platform conventions; system symbols when licensed for the
  target platform, otherwise one consistent open icon family.
- **Controls/collections:** few visible controls, secondary actions disclosed nearby, common
  gestures have visible alternatives, important actions remain reachable.
- **Motion/responsive:** adapt to orientation, dark mode, text scaling, and device insets;
  transitions preserve spatial continuity.
- **Characteristic move:** one content-first task with controls concentrated in the reachable
  middle or lower region.
- **Reject:** decorative glass imitation, copying Apple assets, invisible gesture-only actions,
  tiny targets, or a web navbar pretending to be native.
- **Lineage:** [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines).

## `enterprise-workbench`

- **Best fit:** admin, analytics, operations, collaboration, and multi-step B2B work. Strong
  with `operations-console`.
- **Containment:** persistent shell, aligned panels, toolbars, tables, and detail regions.
  Group by work relationship; use card grids sparingly.
- **Geometry:** 0–8px radius, 1px boundaries or tonal layers, minimal floating shadow, 16–24px
  page rhythm on an explicit grid.
- **Type/icons:** neutral UI sans, tabular numbers, compact labels, one functional icon family.
- **Controls/collections:** rectangular controls, visible filters, bulk actions, dense rows,
  comparison tables, and preserved loading geometry.
- **Motion/responsive:** fast state changes; panels reflow or collapse by task priority rather
  than merely shrinking.
- **Characteristic move:** one operational focal panel connected directly to an actionable
  queue or evidence table.
- **Reject:** identical KPI cards, oversized mobile typography on desktop, decorative
  gradients, hidden scope controls, or floating shadows on every panel.
- **Lineage:** [IBM Carbon 2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/),
  [Microsoft Fluent 2](https://fluent2.microsoft.design/design-principles),
  [Atlassian foundations](https://atlassian.design/foundations).

## `developer-platform`

- **Best fit:** repositories, observability, infrastructure, APIs, and security. Strong with
  `technical-instrument`; usable for technical `operations-console`.
- **Containment:** stable shell, compact toolbars, hairline-separated rows, code/evidence
  regions, and contextual drill-down.
- **Geometry:** 4–8px radius, hairline borders, little or no shadow, compact 12–20px rhythm.
- **Type/icons:** sans for UI; mono only for identifiers, timestamps, logs, commands, and aligned
  numeric evidence. Icons are small and functional.
- **Controls/collections:** rectangular or lightly rounded controls, status-aware tables,
  timelines, command palettes, and copyable evidence.
- **Motion/responsive:** near-instant, non-blocking, time-aware; live/paused state is explicit.
- **Characteristic move:** one inspectable evidence region that connects status to diagnosis.
- **Reject:** terminal cosplay, neon telemetry, mono body copy, rounded feature-card grids, or
  animation that competes with live data.
- **Lineage:** [GitHub Primer foundations](https://primer.style/product/getting-started/foundations/)
  and [Primer pattern guidance](https://primer.style/product/contribute/design/).

## `commerce-operator`

- **Best fit:** merchant admin, inventory, orders, fulfillment, customer support, and complex
  purchase operations. Strong with `operations-console` and `commerce-conversion`.
- **Containment:** resource index → filters → actionable rows → contextual detail. Cards group
  merchant decisions, not every datum.
- **Geometry:** 8–12px radius, clear boundaries, moderate density, restrained elevation for
  overlays and temporary context only.
- **Type/icons:** highly scannable labels and values; product imagery is evidence; status text
  accompanies semantic color.
- **Controls/collections:** filter bars, resource tables/lists, contextual actions, variant and
  fulfillment state, reversible mutations.
- **Motion/responsive:** preserve selection and filters; mobile promotes the current task and
  moves secondary columns into detail.
- **Characteristic move:** a resource row or order state exposes the next operational action
  without opening a decorative card.
- **Reject:** promotional rainbow admin UI, buried costs or constraints, ambiguous statuses,
  equal-weight analytics tiles, or urgency dark patterns.
- **Lineage:** [Shopify Polaris](https://polaris-react.shopify.com/) and StyleSeed commerce
  research. Reuse concepts, not Shopify trade dress.

## `public-service`

- **Best fit:** eligibility, applications, regulated forms, healthcare workflows, and civic
  services. Strong with `institutional-service`.
- **Containment:** flat document flow, bounded reading measure, explicit sections, one step at a
  time, review, confirmation, and recovery.
- **Geometry:** 0–4px radius, strong visible boundaries, no decorative shadow, generous vertical
  separation, high-contrast focus.
- **Type/icons:** robust sans, plain language, adjacent labels/help, icons never replace critical
  words.
- **Controls/collections:** rectangular buttons and inputs, clear legends, summaries and error
  links, preserved entered data, reference number on completion.
- **Motion/responsive:** minimal and non-essential; layout survives zoom, reflow, text scaling,
  keyboard, and assistive technology.
- **Characteristic move:** the current task and its requirements are more visually prominent
  than the organization brand.
- **Reject:** low-contrast minimalism, novelty navigation, hidden prerequisites, rounded app
  cards, altered control meanings, or motion that makes the workflow feel unstable.
- **Lineage:** [GOV.UK patterns](https://design-system.service.gov.uk/patterns/) and
  [community principles](https://design-system.service.gov.uk/community/community-principles/).

## `creative-professional`

- **Best fit:** creation, editing, asset management, media, and expert cross-platform tools.
  Compatible with `operations-console`, `technical-instrument`, and `sequential-story`.
- **Containment:** focused canvas or artifact, quiet utility chrome, named tool groups, inspectors,
  and progressive disclosure.
- **Geometry:** 4–8px radius, crisp boundaries, restrained layers, density adapts between
  pointer and touch.
- **Type/icons:** rational, compact, internationalizable labels; icons support trained use but
  critical actions retain text or discoverable labels.
- **Controls/collections:** toolbars, property panels, asset grids, contextual controls, and
  explicit selection state.
- **Motion/responsive:** desktop and mobile scale independently while sharing one language;
  motion explains selection, mode, and spatial change.
- **Characteristic move:** the user's work occupies the focal field while tools form a
  disciplined supporting frame.
- **Reject:** decoration around the canvas, one scale stretched across all inputs, unlabeled
  mystery tools, or copying Adobe product chrome.
- **Lineage:** [Adobe Spectrum principles](https://spectrum.adobe.com/page/principles/) and
  [platform scale](https://spectrum.adobe.com/page/platform-scale/).

## `editorial-authority`

- **Best fit:** journalism, reports, research, policy, and documentation. Strong with
  `editorial-reading`; usable for evidence-heavy `expressive-marketing`.
- **Containment:** type, whitespace, rules, captions, and bounded columns replace app cards.
  Chrome recedes after orientation.
- **Geometry:** 0–4px radius, hairline rules, little or no shadow, generous section rhythm and
  45–90 character reading measures.
- **Type/icons:** deliberate display/body roles, serif optional and role-specific, captions and
  sources remain attached to evidence.
- **Controls/collections:** calm inline actions, table of contents, footnotes, save/share,
  figures, pull quotes, and related context after the narrative.
- **Motion/responsive:** reading position and disclosure only; narrow screens preserve hierarchy
  and source relationships rather than stacking arbitrary cards.
- **Characteristic move:** an authoritative opening promise followed by inspectable evidence.
- **Reject:** dashboard chrome around prose, every section in a card, overly wide measure, serif
  everywhere, fake print texture, or interruption-heavy interactions.
- **Lineage:** StyleSeed editorial research and public-content accessibility guidance.

## `expressive-brand`

- **Best fit:** campaigns, launches, portfolios, brand pages, posters, and social stories.
  Strong with `expressive-marketing` and `sequential-story`.
- **Containment:** section form varies with the narrative; proof, product media, and display type
  create rhythm instead of a repeated feature-card template.
- **Geometry:** project-specific and intentionally consistent; one signature geometry may be
  sharp, soft, or sculptural, but nested and control shapes stay coherent.
- **Type/icons:** distinctive display hierarchy plus readable body; commissioned or licensed
  imagery carries identity more than generic icons.
- **Controls/collections:** one identifiable CTA, product demonstrations, outcomes, and examples;
  repeated collections earn their repetition.
- **Motion/responsive:** cinematic choreography is allowed when native scroll remains under user
  control and reduced motion yields a complete result.
- **Characteristic move:** one product-specific visual mechanism that could not be swapped into
  an unrelated landing page.
- **Reject:** generic gradient headlines, equal three-card rows, fake metrics, scroll-jacking,
  copied campaign compositions, or motion that substitutes for a proposition.
- **Lineage:** independent brand/campaign research; compile supplied references with
  `ss-reference` when a particular visual language matters.

## Legal and promotion boundary

- Reference-family names document provenance; never present a recipe as official, endorsed, or
  pixel-compatible with those systems.
- Do not redistribute protected logos, proprietary icons, fonts, illustrations, product copy,
  screenshots, or trademarked arrangements.
- A project-local reference grammar remains the correct path for a specific brand. Promote it to
  a built-in recipe only after multiple independent sources and transfer tests prove that the
  morphology is reusable and not a clone.
