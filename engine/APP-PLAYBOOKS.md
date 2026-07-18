# StyleSeed — App-Type Design Playbooks

Design judgment has **two axes**:

1. **App domain** — *what kind of product is this?* (this file)
2. **Page type** — *what kind of screen is this?* (`PAGE-TYPES.md`)

These playbooks are a **domain-bias layer**, applied after the core judgment, output grammar,
and surface adapter. They tell the AI how to tune a domain: a fintech app and a social app can
both have a dashboard, but they should not look the same. Contextual recipes in
`DESIGN-LANGUAGE.md` apply only when they fit the selected grammar.

## How to read a playbook

Each domain sets positions on six dials, plus signature patterns and traps:

| Dial | What it decides |
|------|-----------------|
| **Color strategy** | how much restraint vs. energy; what the primary and stable role colors signal |
| **Density** | airy vs. packed — how much information per screen |
| **Typography weight** | numbers / text / imagery — where the eye is meant to land |
| **Motion seed** | the default personality (see `engine/motion`) |
| **Signature patterns** | the 2–3 components that define the domain |
| **Anti-patterns** | domain-specific "never do this" |

> **The composition still wins.** Core invariants such as deliberate hierarchy, stable tokens,
> accessibility, and cross-artifact coherence always hold. Cards, number ratios, shadow levels,
> and color-role counts are contextual decisions owned by the selected grammar and adapter.

`/ss-setup` already asks for the app type — load the matching playbook before
scaffolding, and re-read it from `/ss-page`.

---

## 1. Fintech / Banking / Payments

- **Color:** maximum restraint — the brand accent is reserved for *money in
  motion* (CTAs, positive trend, the active balance). Greens/reds only for
  up/down, never decoration. Trust reads as calm, not loud.
- **Density:** medium-low. One number should dominate each card. Whitespace
  signals "we're careful with your money."
- **Typography:** numbers first — hero balance at 48px with 24px unit (2:1).
  Currency, dates, and labels recede.
- **Motion:** **Spring** (Toss-style confident bounce on CTAs) or **Silk** for
  balances and sheets. Never bouncy on a number that represents real money
  changing — it reads as unstable.
- **Signature patterns:** HeroCard (balance), transaction `ListItem` with status
  dot, KPI `StatCard` with trend, period toggle, donut for spend breakdown.
- **Anti-patterns:** playful/rainbow palettes, gradients on amounts, fake
  precision (`$8,400.0000`), shadows that float cards "off the page," motion that
  delays seeing a balance.
- **Skin:** Toss, Stripe.

## 2. SaaS / B2B Dashboard / Analytics

- **Color:** disciplined grayscale with one accent for the primary action and
  selected state. Data viz gets a small, fixed categorical scale — not a new
  color per metric.
- **Density:** high. Power users want information per pixel: tables, filters,
  multi-KPI rows. Density is a feature, not clutter — but keep rhythm.
- **Typography:** balanced numbers + labels. Tables need tabular-nums and tight
  line-height; headings stay quiet.
- **Motion:** **Snap** (Linear-style instant). Power users hate waiting on
  animation. Layout/FLIP for reordering, near-zero entrance.
- **Signature patterns:** ChartCard (period toggle + bottom stats), dense KPI
  grid, filterable list/table, segmented control, RankedList.
- **Anti-patterns:** decorative motion, oversized hero numbers that waste space,
  6 accent colors in a chart legend, modal-heavy flows (prefer inline).
- **Skin:** Linear, Vercel.

## 3. E-commerce / Retail

- **Color:** product imagery is the hero — UI chrome stays neutral so photos pop.
  The accent drives one thing: **add-to-cart / buy**. Price gets weight, not color.
- **Density:** medium. Browsing = generous product cards; PDP = focused, one CTA
  above the fold.
- **Typography:** price prominent (2:1 with currency), product title bold, specs
  quiet. Imagery > text in the hierarchy.
- **Motion:** **Spring** (energetic, Arc-style) for add-to-cart, quantity stepper,
  cart badge pop (`pop-in`, `confetti-pop` on purchase is fair). Hover lift on
  product cards.
- **Signature patterns:** product card grid, cart badge, quantity stepper, sticky
  buy bar, price + strikethrough, ranked/featured rails.
- **Anti-patterns:** burying the CTA, more than one primary action on a PDP,
  shouty discount colors everywhere (dilutes urgency), motion that blocks adding
  to cart.
- **Skin:** Arc, Toss.

## 4. Social / Community / Feed

- **Color:** energetic and warm — the accent can appear more often (likes,
  mentions, online dots). Still one accent, but a livelier hue.
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
- **Skin:** custom warm accent; Arc.

## 5. Content / Media / News / Blog / Docs

- **Color:** near-monochrome; the accent is for links and one CTA. Reading is the
  product — color is a distraction.
- **Density:** low in the reading column (measure ~60–75ch), denser in nav/index.
- **Typography:** **typography is the design.** Strong type scale, comfortable
  line-height (1.5–1.65 for body), real hierarchy between H/body/caption.
- **Motion:** **Silk** (smooth, continuous) — `reveal-blur`/`reveal-rise` on
  headlines, subtle. Nothing that interrupts reading.
- **Signature patterns:** article hero, readable body column, table of contents,
  pull quotes, related-content rail, code blocks (for docs).
- **Anti-patterns:** full-width body text, decorative motion mid-article, multiple
  accents, cramped line-height, autoplaying anything.
- **Skin:** Notion, Vercel.

## 6. Productivity / Tools / Workspace

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
- **Skin:** Linear, Notion, Vercel.

## 7. Health / Wellness / Fitness

- **Color:** calm and reassuring — soft accent, vivid only for *metric rings /
  progress* on a calm base. Avoid alarming reds except for genuine alerts.
- **Density:** low-medium. One clear focus per screen (today's rings, next
  action). Reduce cognitive load — users may be tired or stressed.
- **Typography:** big friendly numbers (2:1), gentle labels, generous spacing.
- **Motion:** **Float** (weightless, gentle) for reveals; **Pulse** only for live
  heartbeat/recording. Motion should feel calm, never urgent.
- **Signature patterns:** activity rings, big-metric hero, streak/progress, large
  touch targets (≥44px, often bigger), weekly history.
- **Anti-patterns:** dense data dumps, alarming colors for normal states, tiny
  targets, jittery motion, shame-y empty states.
- **Skin:** custom soft accent; Toss.

## 8. Education / Learning / Courses

- **Color:** encouraging — accent marks progress and the next step. Use color to
  reward (completed = success tone), not to decorate.
- **Density:** low per step (one concept at a time), denser in course index.
- **Typography:** clear hierarchy, readable body, prominent "what's next."
- **Motion:** **Spring** for rewards/completion (`pop-in`, `confetti-pop` on
  finishing a module), `stagger-cascade` for lesson lists.
- **Signature patterns:** progress bar/ring, step list with states, lesson card,
  next-action CTA, achievement/streak, empty→first-lesson onboarding.
- **Anti-patterns:** showing the whole curriculum at once (overwhelm), unclear
  next step, punishing empty/incomplete states, no sense of progress.
- **Skin:** Notion, Arc.

## 9. Developer Tools / Infra / API

- **Color:** dark-first, restrained, one accent for primary/active. Syntax colors
  are their own controlled scale.
- **Density:** high — devs read dense screens fine. Monospace where it belongs
  (code, IDs, logs).
- **Typography:** mono for code/identifiers, tight tabular numbers, quiet UI text.
- **Motion:** **Snap** (instant, precise). Devs distrust slow/flashy UI. Minimal,
  functional only.
- **Signature patterns:** code blocks with copy, logs/terminal, status badges,
  command palette, key-value config, dark base.
- **Anti-patterns:** flashy motion (reads as unserious to devs), light-only
  themes, decorative gradients, hiding the CLI/copy affordance.
- **Skin:** Raycast, Vercel, Linear.

## 10. Marketplace / Listings (two-sided)

- **Color:** trust + conversion — neutral chrome, accent for the primary action
  (book/contact/buy) and for ratings/verified signals.
- **Density:** medium — scannable listing grid, focused detail page.
- **Typography:** listing title bold, price/rating prominent, meta quiet.
- **Motion:** **Silk** for transitions, hover lift on listing cards, `pop-in` for
  saved/favorited.
- **Signature patterns:** listing card (image + title + price + rating), filters,
  map/list toggle, detail with sticky action, reviews, verified badge.
- **Anti-patterns:** untrustworthy density (too much, too fast), weak rating/trust
  signals, more than one primary action, buried contact/CTA.
- **Skin:** Stripe, Notion.

## 11. Booking / Travel / Reservations

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
- **Skin:** Arc, Notion.

## 12. AI / Chat / Assistant

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
  cramped reading width, burying the input, multiple accents.
- **Skin:** Raycast, Notion.

---

## When the domain isn't listed

Pick the closest two and blend. Most apps are a primary domain + a secondary
behavior (e.g. a fintech app with a social feed → fintech restraint for money,
social liveliness *only* in the feed). The core judgment and effective output grammar still
bound everything.
