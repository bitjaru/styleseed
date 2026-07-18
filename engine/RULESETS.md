# StyleSeed Output Grammars

An output grammar is a maintained contract for **how a class of product should organize
attention, information, action, and feedback**. It is selected by the job of the result,
not by whichever brand the user mentions first.

Toss is evidence for one grammar, not the universal StyleSeed look. Stripe, Shopify, Sentry,
the Financial Times, and other products are likewise evidence — never templates to copy.

Choose exactly one built-in grammar, or compile a project-local one with `/ss-reference`.
Every grammar inherits `PRODUCT-PRINCIPLES.md`.

## Selection guide

| Grammar | Use for | Reference families | Defining priority |
|---|---|---|---|
| `consumer-service` | fintech, health, benefits, personal productivity, mobile home | Toss, Wise, Chime, Credit Karma | reassurance + next useful action |
| `operations-console` | B2B SaaS, admin, analytics, workflow tools | Stripe, Shopify, Polar, Mixpanel | scan + compare + act |
| `technical-instrument` | observability, infrastructure, security, developer tools | Sentry, Better Stack, LogRocket | live state + diagnosis |
| `editorial-reading` | journalism, reports, research, documentation detail | FT, Boston Globe, USWDS content | comprehension + reading rhythm |
| `commerce-conversion` | product detail, booking, cart, checkout, marketplace | Amazon, Shopify commerce patterns | evaluate + trust + commit |
| `institutional-service` | government, regulated forms, healthcare workflows | GOV.UK, USWDS, public-service systems | certainty + accessibility + completion |
| `expressive-marketing` | launches, campaigns, brand and product landing pages | premium product/brand sites | proposition + proof + momentum |
| `sequential-story` | social carousels, visual explainers, slide narratives | editorial carousel and deck systems | hook + progression + retention |

## Required grammar contract

Every built-in or compiled grammar defines these twelve axes:

1. user job and primary decision;
2. attention model and focal point;
3. information architecture and composition;
4. density and spacing rhythm;
5. typography roles and measure;
6. color roles and semantic exceptions;
7. surface, radius, border, and elevation language;
8. imagery/data-visualization role;
9. navigation and action hierarchy;
10. state, feedback, and motion behavior;
11. responsive transformation;
12. characteristic tells to require and anti-patterns to reject.

### `consumer-service`

- **Job:** understand personal state without anxiety and take one useful next action.
- **Attention:** one dominant balance, status, benefit, or briefing; secondary services recede.
- **Composition:** short contextual heading → dominant summary → small set of next actions →
  progressive detail. Mobile-first, thumb-reachable, explicit bottom navigation where needed.
- **Density/type:** comfortable to airy; friendly sans; large plain-language numbers; short copy.
- **Color/surface:** calm neutral base, one brand action color, semantic colors only for real
  status. Soft grouped surfaces are common but a card is used only when it groups a decision.
- **Feedback:** immediate, reassuring, reversible; money and health values do not animate
  theatrically.
- **Reject:** every service as equal card, promotional clutter above state, rainbow categories,
  cute language in serious moments, or copying Toss component-for-component.

### `operations-console`

- **Job:** scan system or business state, compare changes, find exceptions, act efficiently.
- **Attention:** one operational focal panel; supporting KPIs form hierarchy rather than a
  uniform card wall.
- **Composition:** persistent navigation → scope/time controls → focal trend or queue →
  comparable metrics → actionable table/list. Detail lives below or on demand.
- **Density/type:** comfortable to compact; neutral grotesk; tabular numerals; labels may be
  small but body and decisions remain readable on desktop.
- **Color/surface:** restrained brand accent; categorical colors only for stable, repeated data
  semantics. Tone, alignment, and grouping carry more hierarchy than decoration.
- **Feedback:** filters and mutations respond instantly; loading preserves layout; bulk action
  consequences are explicit.
- **Reject:** same-weight KPI tiles everywhere, decorative gradients, mobile-tight type on a
  1440px canvas, or charts without a decision they support.

### `technical-instrument`

- **Job:** observe live state, isolate anomalies, and diagnose a system.
- **Attention:** current incident, trace, monitor, or performance state dominates.
- **Composition:** stable navigation and scope → live status/timeline → dense evidence table or
  trace → drill-down. Group by diagnostic relationship, not visual symmetry.
- **Density/type:** compact to dense; sans for UI, mono only for identifiers, timestamps, code,
  and aligned numeric evidence.
- **Color/surface:** neutral light or dark tonal ramp; one signal accent; status colors are
  semantic and sparse. Dark mode uses tonal levels and hairlines, not floating shadows.
- **Feedback:** near-instant, non-blocking, time-aware; paused/live state is unmistakable.
- **Reject:** decorative terminal cosplay, neon rainbow telemetry, excessive mono body copy,
  or animation that competes with changing data.

### `editorial-reading`

- **Job:** understand, retain, and navigate a narrative or argument.
- **Attention:** title/deck/byline or the opening visual establishes the reading promise.
- **Composition:** strong title rhythm → bounded reading column → meaningful media/pull quote →
  related context after the narrative. Chrome recedes.
- **Density/type:** airy around the story; 45–90 characters per line, normally near 60–70;
  comfortable body size/leading; serif is optional and role-specific, never an automatic theme.
- **Color/surface:** ink and paper-like neutrals may be used without faking print; one quiet
  accent for links and editorial signals. Whitespace and type replace gratuitous cards.
- **Feedback:** reading position, save, share, and footnotes are calm and unobtrusive.
- **Reject:** forcing all content into cards, app-dashboard chrome around prose, overly wide
  measures, serif everywhere, or interaction patterns that interrupt reading.

### `commerce-conversion`

- **Job:** evaluate an offer, resolve uncertainty, select a variant, and commit.
- **Attention:** product/service evidence leads; price, availability, primary CTA, and trust
  information remain easy to connect.
- **Composition:** media → identity/price/proof → variants → primary action → delivery/returns →
  details and comparison. On mobile, keep the commitment action reachable without hiding terms.
- **Density/type:** comfortable; product information is highly scannable; images are evidence,
  not decorative filler.
- **Color/surface:** brand color supports the purchase action; ratings, discounts, stock, and
  errors use stable semantics rather than a promotional rainbow.
- **Feedback:** variant and cart changes are immediate and reversible; costs and constraints
  appear before commitment.
- **Reject:** urgency dark patterns, buried shipping/returns, competing CTAs, tiny variant
  targets, or a lifestyle mood that obscures the actual product.

### `institutional-service`

- **Job:** understand eligibility or obligation, provide accurate information, and complete a
  consequential task with confidence.
- **Attention:** task title, current step, and required action dominate over branding.
- **Composition:** plain-language intro → prerequisites → one step at a time → review → clear
  confirmation and recovery path.
- **Density/type:** comfortable, highly legible, robust at zoom; labels and help stay adjacent
  to controls; long content uses bounded measure.
- **Color/surface:** conservative semantic palette with high contrast; errors never rely on
  color alone; decorative color is rare.
- **Feedback:** preserve entered data, explain errors, expose progress, and provide reference
  numbers/next steps after completion.
- **Reject:** novelty over comprehension, ambiguous icons, low-contrast minimalism, hidden
  requirements, or motion that makes a serious workflow feel unstable.

### `expressive-marketing`

- **Job:** understand the proposition, believe the proof, and choose a next step.
- **Attention:** one unmistakable promise paired with real product or brand evidence.
- **Composition:** proposition → proof → differentiated mechanism → examples/outcomes → CTA.
  Section forms vary to create rhythm; repetition is deliberate, not template filler.
- **Density/type:** airy with confident display hierarchy; body copy remains readable.
- **Color/surface:** wider brand palette and expressive media are allowed when roles remain
  coherent and one action is primary.
- **Feedback:** cinematic motion may support sequence, but first read and CTA work without it;
  reduced motion yields a complete page.
- **Reject:** generic gradient headline, equal three-card feature rows, fake metrics, copied
  demo visuals, scroll-jacking, or motion used as a substitute for a proposition.

### `sequential-story`

- **Job:** make one idea understandable and worth continuing across a bounded visual sequence.
- **Attention:** slide/frame one earns the next gesture; each following frame has one dominant
  message and a visible place in the sequence.
- **Composition:** hook → context/why → evidence or mechanism → useful action → reframe/close.
  Alternate big type, evidence, image, and utility frames so the sequence has rhythm.
- **Density/type:** designed for the adapter's viewing distance and dwell time; one message per
  frame; body copy is bounded and never shrunk to rescue an overloaded slide.
- **Color/surface:** project grammar and brand tokens carry across all frames; emphasis roles
  remain stable. Continuity comes from a system, not identical templates.
- **Imagery:** crops, captions, and sources are intentional; generated-image text/logos are
  replaced during deterministic rendering.
- **Feedback/navigation:** folio, progress, swipe cue, and CTA fit the publishing surface without
  occupying its unsafe UI zones.
- **Reject:** ten identical cards, a weak explanatory cover, one composition repeated on every
  frame, content that works only as a caption, missing source attribution, or platform crop loss.

## Promotion rule

A project-local grammar becomes built-in only after multiple independent reference sets,
counterexamples, a rendered sample on at least two page types, and regression checks show
that it is distinct, transferable, and does not waive the core invariants.
