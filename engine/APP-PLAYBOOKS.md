# StyleSeed — App-Type Design Playbooks

Design judgment has **two axes**:

1. **App domain** — *what kind of product is this?* (this file)
2. **Page type** — *what kind of screen is this?* (`PAGE-TYPES.md`)

These playbooks are a **domain-bias layer**, applied after the core judgment, output grammar,
and surface adapter. They tell the AI how to tune a domain: a fintech app and a social app can
both have a dashboard, but they should not look the same. Contextual recipes in
`DESIGN-LANGUAGE.md` apply only when they fit the selected grammar.

## How to read a playbook

Each domain sets positions on seven dials, plus signature patterns and traps:

| Dial | What it decides |
|------|-----------------|
| **Color strategy** | how much restraint vs. energy; what the primary and stable role colors signal |
| **Density** | airy vs. packed — how much information per screen |
| **Typography weight** | numbers / text / imagery — where the eye is meant to land |
| **Motion seed** | an optional implementation example; approved project motion takes precedence |
| **Brand recipe** | the default morphology from `BRAND-RECIPES.md` |
| **Signature patterns** | the 2–3 components that define the domain |
| **Anti-patterns** | task failures to check; style names alone are not violations |

> **The composition still wins.** Core invariants such as deliberate hierarchy, stable tokens,
> accessibility, and cross-artifact coherence always hold. Cards, number ratios, shadow levels,
> and color-role counts are contextual decisions owned by the selected grammar and adapter.

`/ss-setup` already asks for the app type — load the matching playbook before
scaffolding, and re-read it from `/ss-page`.

---

## 1. Fintech / Banking / Payments

**Apply to:** Personal balance and payment flows. A finance operations queue needs operational density; a finance landing page may be expressive. Units and risks stay clear in every case.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** maximum restraint — the brand accent is reserved for *money in
  motion* in a calm personal flow. Separate action from actual gain/loss or risk;
  positive change is not always good. Brand/content roles may use other colors.
- **Density:** medium-low. One number should dominate each card. Whitespace
  signals "we're careful with your money."
- **Typography:** make amounts and their meaning easy to read. A 48px balance with
  a 24px unit is one personal-summary example; tables may keep value and unit at
  one readable scale. Currency, dates, and risk must remain unambiguous.
- **Motion:** **Spring** (Toss-style confident bounce on CTAs) or **Silk** for
  balances and sheets. Never bouncy on a number that represents real money
  changing — it reads as unstable.
- **Signature patterns:** HeroCard (balance), transaction `ListItem` with status
  dot, KPI `StatCard` with trend, period toggle, donut for spend breakdown.
- **Anti-patterns:** colors that confuse risk or action, illegible amount treatments, fake
  precision (`$8,400.0000`), shadows that float cards "off the page," motion that
  delays seeing a balance.
- **Brand recipe:** `calm-consumer`; use `native-mobile` for a platform-first utility.
- **Skin material:** custom brand tokens; Toss and Stripe remain optional token references.

## 2. SaaS / B2B Dashboard / Analytics

**Apply to:** Repeated work, analytics, and operations. A launch page, first-run flow, or reading view uses its own page task and density.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** disciplined grayscale with one accent for the primary action and
  selected state. Data viz gets a small, fixed categorical scale — not a new
  color per metric.
- **Density:** high. Power users want information per pixel: tables, filters,
  multi-KPI rows. Density is a feature, not clutter — but keep rhythm.
- **Typography:** balanced numbers + labels. Tables need tabular-nums and tight
  line-height; headings stay quiet.
- **Motion:** **Snap** (Linear-style instant). Power users hate waiting on
  animation. Layout/FLIP for reordering, near-zero entrance.
- **Signature patterns:** scoped chart with needed context (footer optional), comparable KPI
  grid, filterable list/table, segmented control, RankedList.
- **Anti-patterns:** decorative motion, oversized hero numbers that waste space,
  unstable or indistinguishable series colors, modal-heavy flows that interrupt repeated work.
  Six categorical colors are valid when comparison and identification remain clear.
- **Brand recipe:** `enterprise-workbench`; use `developer-platform` for technical evidence.
- **Skin material:** custom brand tokens; Linear and Vercel remain optional token references.

## 3. E-commerce / Retail

**Apply to:** Browsing, product evaluation, and checkout. Merchant operations may instead lead with queues; product imagery must not obscure terms or controls.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** product imagery is the hero — UI chrome stays neutral so photos pop.
  The accent drives one thing: **add-to-cart / buy**. Price gets weight, not color.
- **Density:** medium. Browsing = generous product cards; PDP = focused, one CTA
  above the fold.
- **Typography:** price and currency clearly associated, product title identifiable, specs
  quiet. Imagery > text in the hierarchy.
- **Motion:** **Spring** (energetic, Arc-style) for add-to-cart, quantity stepper,
  cart badge pop (`pop-in`, `confetti-pop` on purchase is fair). Hover lift on
  product cards.
- **Signature patterns:** product card grid, cart badge, quantity stepper, sticky
  buy bar, price + strikethrough, ranked/featured rails.
- **Anti-patterns:** burying the CTA, competing commitment actions in one decision region,
  shouty discount colors everywhere (dilutes urgency), motion that blocks adding
  to cart.
- **Brand recipe:** `commerce-operator` for merchant/product operations; `calm-consumer` for a
  lightweight consumer purchase flow.
- **Skin material:** custom brand tokens; Arc and Toss remain optional token references.

## 4. Social / Community / Feed

**Apply to:** Reading, creating, and reacting to content. Moderation and administration use operational priorities; content colors are separate from action/status roles.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** energetic and warm — the accent can appear more often (likes,
  mentions). Online status has its own semantic role; avatars and media can carry
  varied content colors while controls remain identifiable.
- **Density:** medium, content-led. Avatars and media drive the layout; chrome is
  minimal.
- **Typography:** names bold, timestamps tiny and tertiary, body readable. Let
  user content (images, text) lead.
- **Motion:** **Pulse** (alive, rhythmic) for likes/reactions (`like-burst`),
  live indicators (`pulse-beat`), and new-content arrival (`stagger-cascade`).
- **Signature patterns:** feed list, avatar + name + time row, like/comment/share
  actions, like-burst, bottom-sheet composer, story rail.
- **Anti-patterns:** heavy chrome that competes with user content, slow entrance
  on a feed (kills scroll), engagement bait colors, inconsistent avatar shapes.
- **Brand recipe:** `native-mobile` for app-first feeds; `expressive-brand` for creator surfaces.
- **Skin material:** custom warm accent; Arc remains an optional token reference.

## 5. Content / Media / News / Blog / Docs

**Apply to:** Sustained reading and evidence navigation. A publication index or visual feature may be dense or colorful while the reading measure stays appropriate.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** chrome recedes for reading; monochrome, warm paper, or a wider editorial
  palette can fit. Links, annotations, charts, and media keep distinct stable roles.
- **Density:** comfortable reading measure for the actual font and language, often
  around 60–75 characters for Latin prose; navigation/index may be denser.
- **Typography:** **typography is the design.** Strong type scale, comfortable
  line-height (1.5–1.65 for body), real hierarchy between H/body/caption.
- **Motion:** **Silk** (smooth, continuous) — `reveal-blur`/`reveal-rise` on
  headlines, subtle. Nothing that interrupts reading.
- **Signature patterns:** article hero, readable body column, table of contents,
  pull quotes, related-content rail, code blocks (for docs).
- **Anti-patterns:** full-width body text, motion that interrupts reading, ambiguous
  link/evidence colors, cramped line-height, intrusive autoplay.
- **Brand recipe:** `editorial-authority`.
- **Skin material:** custom editorial tokens; Notion and Vercel remain optional token references.

## 6. Productivity / Tools / Workspace

**Apply to:** Repeated editing and work management. Keep tool chrome predictable while the work itself may be expressive; onboarding can be more spacious.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** quiet grayscale, one accent for primary action + active item.
  Calm so the user's *work* is the focus.
- **Density:** high but organized — sidebars, panels, keyboard-first. Reward
  power use.
- **Typography:** compact, tabular where needed, clear active/hover states.
- **Motion:** **Snap** (instant, precise). Layout transitions for reorder; avoid
  anything that adds latency to a frequent action.
- **Signature patterns:** sidebar + content + (optional) inspector, command
  palette, list/board toggle, inline edit, segmented control, keyboard hints.
- **Anti-patterns:** slow motion on frequent actions, modal overload, decorative
  color, hiding power features behind too much progressive disclosure.
- **Brand recipe:** `creative-professional` or `developer-platform` by task.
- **Skin material:** custom brand tokens; Linear, Notion, and Vercel remain optional references.

## 7. Health / Wellness / Fitness

**Apply to:** Personal tracking and supportive self-service. Clinical review or multi-patient monitoring may require dense comparisons and prominent real alerts.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** calm and reassuring — soft accent, vivid only for *metric rings /
  progress* on a calm base. Avoid alarming reds except for genuine alerts.
- **Density:** low-medium. One clear focus per screen (today's rings, next
  action). Reduce cognitive load — users may be tired or stressed.
- **Typography:** readable values and units, clear labels, and task-appropriate spacing;
  personal summaries may use larger numbers while clinical comparisons stay aligned.
- **Motion:** **Float** (weightless, gentle) for reveals; **Pulse** only for live
  heartbeat/recording. Motion should feel calm, never urgent.
- **Signature patterns:** activity rings, big-metric hero, streak/progress, large
  touch targets (≥44px, often bigger), weekly history.
- **Anti-patterns:** density that hides the current decision, alarming colors for normal states, tiny
  targets, jittery motion, shame-y empty states.
- **Brand recipe:** `calm-consumer`; use `native-mobile` for tracking and capture.
- **Skin material:** custom soft accent; Toss remains an optional token reference.

## 8. Education / Learning / Courses

**Apply to:** Learning a concept or completing a step. Course planning and teacher administration may need the full curriculum or comparable records visible together.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** encouraging — accent marks progress and the next step. Use color to
  reward (completed = success tone), not to decorate.
- **Density:** low per step (one concept at a time), denser in course index.
- **Typography:** clear hierarchy, readable body, prominent "what's next."
- **Motion:** **Spring** for rewards/completion (`pop-in`, `confetti-pop` on
  finishing a module), `stagger-cascade` for lesson lists.
- **Signature patterns:** progress bar/ring, step list with states, lesson card,
  next-action CTA, achievement/streak, empty→first-lesson onboarding.
- **Anti-patterns:** forcing a whole curriculum into a focused lesson step, unclear
  next step, punishing empty/incomplete states, no sense of progress.
- **Brand recipe:** `calm-consumer` for learners; `editorial-authority` for reading-heavy courses.
- **Skin material:** custom learning tokens; Notion and Arc remain optional references.

## 9. Developer Tools / Infra / API

**Apply to:** Diagnosis, configuration, and technical evidence. Documentation and marketing use their own reading/proposition roles; light and dark themes are both valid.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** task-appropriate light or dark roles, restrained tool chrome. Syntax colors
  are their own controlled scale.
- **Density:** compact when comparison benefits, with readable controls. Monospace where it belongs
  (code, IDs, logs).
- **Typography:** mono for code/identifiers, tight tabular numbers, quiet UI text.
- **Motion:** **Snap** (instant, precise). Devs distrust slow/flashy UI. Minimal,
  functional only.
- **Signature patterns:** code blocks with copy, logs/terminal, status badges,
  command palette, key-value config, dark base.
- **Anti-patterns:** motion that delays diagnosis, inadequate contrast, decoration
  that competes with evidence, hiding the CLI/copy affordance.
- **Brand recipe:** `developer-platform`.
- **Skin material:** custom technical tokens; Raycast, Vercel, and Linear remain optional references.

## 10. Marketplace / Listings (two-sided)

**Apply to:** Finding, comparing, and evaluating listings. Seller operations may use dense work queues and multiple scoped actions.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** trust + conversion — neutral chrome, accent for the primary action
  (book/contact/buy) and for ratings/verified signals.
- **Density:** medium — scannable listing grid, focused detail page.
- **Typography:** listing title bold, price/rating prominent, meta quiet.
- **Motion:** **Silk** for transitions, hover lift on listing cards, `pop-in` for
  saved/favorited.
- **Signature patterns:** listing card (image + title + price + rating), filters,
  map/list toggle, detail with sticky action, reviews, verified badge.
- **Anti-patterns:** untrustworthy density (too much, too fast), weak rating/trust
  signals, competing actions within a decision region, buried contact/CTA.
- **Brand recipe:** `commerce-operator`.
- **Skin material:** custom marketplace tokens; Stripe and Notion remain optional references.

## 11. Booking / Travel / Reservations

**Apply to:** Availability, offer comparison, booking, and itinerary use. Exploration can be image-led; commitment needs clear total cost, dates, and recovery.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** confident and visual — imagery (places, rooms) leads; accent drives
  the booking step. Calm so users feel sure about committing money/time.
- **Density:** low-medium, step-focused. Dates and availability must be obvious.
- **Typography:** clear dates/times, price prominent, friendly labels.
- **Motion:** **Float** / **Silk** — smooth, reassuring transitions between steps;
  `reveal-blur` on imagery. Confidence, not flash.
- **Signature patterns:** date/range picker, availability calendar, multi-step
  booking with progress, map, price summary, confirmation.
- **Anti-patterns:** hidden total/fees, unclear current step, jarring motion mid-
  booking, tiny date controls, anxiety-inducing scarcity spam.
- **Brand recipe:** `commerce-operator`; use `native-mobile` for an app-first itinerary.
- **Skin material:** custom travel tokens; Arc and Notion remain optional references.

## 12. AI / Chat / Assistant

**Apply to:** Conversation and generated-content review. Agent workbenches may need dense tool/evidence panels; a chat thread is not mandatory for every AI task.
Sizes, colors, component names, and motion seeds below are contextual starting points; preserve approved project roles.

- **Color:** minimal chrome so the conversation is the focus; one accent for the
  send/primary action. Let content (the answer) lead.
- **Density:** low chrome, high content. Generous reading width for responses.
- **Typography:** readable body for answers, mono for code, quiet UI around the
  thread.
- **Motion:** **Silk** — streaming/typing feel, smooth message entrance
  (`reveal-blur`/`stagger`), nothing that competes with reading the answer.
- **Signature patterns:** message thread, streaming response, composer with
  send, prompt suggestions, copy-on-message, minimal top bar.
- **Anti-patterns:** heavy chrome around the chat, flashy motion on every token,
  cramped reading width, burying the input, ambiguous action/status/content colors.
- **Brand recipe:** `creative-professional` for workbench assistants; `calm-consumer` for simple
  personal assistants.
- **Skin material:** custom assistant tokens; Raycast and Notion remain optional references.

---

## When the domain isn't listed

Pick the closest two and blend. Most apps are a primary domain + a secondary
behavior (e.g. a fintech app with a social feed → fintech restraint for money,
social liveliness *only* in the feed). The core judgment and effective output grammar still
bound everything.
