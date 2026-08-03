# UI/UX Methodology — StyleSeed Companion

> Philosophy companion to `DESIGN-LANGUAGE.md`. Where DESIGN-LANGUAGE prescribes the *rules* (font sizes, spacing, color tokens), this document explains the *reasoning patterns* behind them.
>
> Pull from this when you're scaffolding a new dashboard, deciding what to show first, or wondering why a layout feels off. Pair with `/ss-flow` or `/ss-page` slash skills for application.

---

## 1. Progressive Disclosure

Reveal information in layers from high-level summary to drill-down. Respects the human working memory limit (~4–7 chunks).

**Principles:**
- Surface only what the current task requires
- Hide advanced options until the user is ready
- Lower cognitive load for new and infrequent users
- Build confidence in complexity gradually

**Reference pattern — Stripe Dashboard:**
- Top level: revenue, volume, dispute rate only
- Every additional detail layer requires intentional click
- Partial previews ("6 of 25 failed") with link to the full page
- Tooltips for extra context — never cluttering the main view

**How to apply:**
- Pick 4–6 KPIs for above-the-fold; everything else goes one click away
- Replace inline detail blocks with summary cards that expand on tap
- Use tabs and drilldown links instead of stacking sections vertically

**Cross-reference:** `DESIGN-LANGUAGE.md` rule 14, 18, 19 (hierarchy).

---

## 2. Information Density Management

Two-tier structure: high-level snapshot → low-level drill-down. Power users want data, but dumping everything at once is unusable.

**Principles:**
- 4–6 core metrics above-the-fold
- Vertical, hierarchical density to optimize absorption
- Logical sections/subsections to bound cognitive load
- Consistent layout to lower the learning curve

**Implementation patterns:**
1. **Metric Strip**: 4–6 KPI cards at the top (revenue, health, alert count, etc.)
2. **Summary Cards**: each widget shown as a single-line summary (number + caption)
3. **Expandable Sections**: detailed chart/table appears on click of the area of interest
4. **Sidebar Navigation**: 240–280px, saves vertical space while keeping sections one click away

**Cross-reference:** `DESIGN-LANGUAGE.md` rules 14/18/19 (hierarchy), 61–63 (mx-6 / px-6 / section spacing).

---

## 3. Atomic Design System

Brad Frost's 5-tier UI component hierarchy. The most widely referenced model for structuring a design system.

**Tiers:**
1. **Atoms** — button, input, label, icon, color, typography (smallest units)
2. **Molecules** — search bar (input + button), form field (label + input + error), menu item (icon + text)
3. **Organisms** — navigation header, product card grid, data table (sort + pagination)
4. **Templates** — page structure (organism layout)
5. **Pages** — final screens with real data

**Design tokens:** colors, typography, spacing, shadows, radii defined as variables. Enables theme switching (light/dark) and cross-platform consistency.

**Why it matters in 2026:** Adoption shortens new-feature time-to-build, reduces visual bugs in production, and unblocks distributed teams.

**Cross-reference:** StyleSeed's `engine/components/{ui,patterns}/` already follows this — `ui/` ≈ atoms+molecules, `patterns/` ≈ organisms. The 8 skins under `skins/` are the design-token implementations.

---

## 4. Skeleton, Empty State, Microinteraction

The three "quality multipliers" that separate amateur dashboards from shipped ones.

### Skeleton Screen
- Preview the content layout with a lightweight placeholder
- Improves perceived load speed, prevents interface reflow
- **Full-screen loading**: skeletons beat spinners because they hint at page structure

### Empty State
- Empty screens need a CTA and guidance
- **One core message per screen** — don't dump text, button, link, tip, and illustration together
- Demo data, templates, or at least a "Get started" CTA are mandatory

### Microinteraction
- Hover states, chart tooltips, filter loading animations, icon transitions
- Communicates system responsiveness
- When consistent, raises UX quality without distracting from content

**Cross-reference:** Use `/ss-feedback` to add loading/empty/error/success states; motion tokens (`--duration-fast/normal/slow`, `--ease-spring`) are defined in each skin.

---

## 5. Contextual Onboarding

New-user experience that respects the user's attention.

**Three patterns:**
1. **Guided Tour** — tooltips / modals / spotlights for core UI elements
2. **Checklist** — structured list of key tasks (satisfaction on completion)
3. **Contextual Tooltip** — small help bubble that appears on first use of a specific feature

**Principles:**
- Never show a raw empty dashboard
- Minimize Time-to-Value (time until the user touches the core feature)
- Right help at the right moment, only the info needed
- Personalize via short upfront questions

**Reference patterns:**
- Notion seeds the first workspace with sample pages
- Slack guides shortest-path to sending a message
- HubSpot walks CRM setup via a step-by-step checklist

**Cross-reference:** `/ss-flow` for navigation/IA, `/ss-copy` for the actual onboarding microcopy.

---

## 6. Morphology Before Brand Styling

A polished interface is not one dominant SaaS aesthetic. Consumer, enterprise, developer,
public-service, editorial, creative, commerce, and campaign products need different geometry,
containment, controls, collections, density, and motion.

### Separate the decisions

- **Output grammar:** the user job, attention model, information order, and action hierarchy.
- **Brand recipe:** the reusable morphology that implements that grammar.
- **Aesthetic profile:** an optional coordinated adjustment such as swiss or editorial.
- **Skin:** semantic color and type tokens.

Changing a skin without changing morphology is a palette swap. Changing every surface to rounded
cards is template drift. `BRAND-RECIPES.md` prevents both by selecting patterns such as:

- aligned panels, tables, and rectangular controls for an enterprise workbench;
- hairlines, compact rows, and mono evidence for a developer platform;
- flat high-contrast steps and explicit labels for a public service;
- reading measure, rules, captions, and whitespace for editorial authority;
- soft groups and one reassuring summary for a calm consumer service.

Brand names in recipe lineage document research. They are not templates or assets to copy.

**Cross-reference:** `BRAND-RECIPES.md`, `RULESETS.md`, and `PRODUCT-PRINCIPLES.md`.

---

## 7. Color Discipline

A bounded palette where every color has a job. Strong systems across many product categories
share this discipline — they do not invent a new color for every component.

### The underlying theories

| Theory | Origin | What it says |
|---|---|---|
| **60-30-10 rule** | Interior design, ported to UI | 60% dominant surface, 30% supporting, 10% accent. Keeps the eye anchored. |
| **Single Accent Principle** | Linear / Stripe school | One brand color carries all "this is interactive / selected" weight. Everything else neutral. |
| **Semantic Color Tokens** | Material 3, IBM Carbon | Colors are named by *role* (`brand`, `success`, `destructive`) not by value (`blue-500`). Same name, different value per skin. |
| **Color Scarcity** | Refactoring UI (Wathan/Schoger) | Accent is impactful only when *rare*. Repeat it 3× per screen, not 30×. |

These say the same thing four ways: **a small, role-mapped palette beats an unbounded one.**

### Recommended palette structure (~13 roles, max)

| Tier | Count | Roles |
|---|---|---|
| **Brand** | 1 | `--brand` — the one accent. Active, selected, primary CTA. |
| **Grayscale text** | 5 | strong / primary / secondary / tertiary / disabled (no pure black) |
| **Surfaces** | 4–5 | page / card / list-row / inactive / brand-tint |
| **Status** | 4 | success / destructive / warning / info — used only at *dot + small text* scale |

Total ~13 named colors. Every component pulls from this set. New designs do **not** introduce a new value.

### Common failure modes

- **Status color sprawl** — painting an entire "danger" card red instead of a 6px dot + red text. Reads as alarm, not info.
- **Multi-accent confusion** — using `--brand` *and* a second accent. The eye no longer knows where to land.
- **Gradient background everywhere** — flat surface + restrained gradient on a single CTA is the convention. Gradients on cards and headers feel mid-2010s.
- **Pure black on white** — too harsh; reduces perceived quality. Use ~`#2A2A2A` on `#FAFAFA` instead.
- **No grayscale hierarchy** — when all text is the same `text-slate-900`, the eye has no path. Need at least 3 grayscale levels active per screen.

### Reference patterns

- **Linear** — almost monochrome. Single tint of purple/blue carries everything interactive; everything else is one of three grays.
- **Stripe Dashboard** — black/white/purple base + a single semantic color per metric type. KPIs are uniformly grayscale numerals with a single colored trend indicator.
- **Toss** — Glacier blue brand, transparent card borders, all status as tiny dots. The blue gradient appears *once* per screen (the primary CTA).
- **Notion** — pure grayscale base, color reserved for tags and icons. Even the brand red is rare.

### Cross-reference

- `DESIGN-LANGUAGE.md` Rule 1 (Color Philosophy) — the implemented palette structure
- `DESIGN-LANGUAGE.md` Rule 65 (Accent Distribution / Scarcity Rule) — how often the brand color appears per page
- Golden Rules 2 (single accent), 3 (no pure black) — these are this chapter's bottom line
- `/ss-tokens` to inspect or modify the active skin's color tokens
- `/ss-review` and `/ss-lint` flag accent overuse against these rules

---

## 8. Motion Vibe Vocabulary

Animation is where vibe coding breaks down hardest. Color has hex, spacing has px, but *feel* lives in five-parameter framer-motion configs that no one wants to think about. "Make it bouncy" should be one word, not seven sliders.

### The vocabulary gap

When an LLM hears "make this button feel snappy," it picks a safe default (a 300ms ease-in-out fade) and the result is indistinguishable from every other AI-generated UI. The same prompt applied to a real product would land on something specific: Linear's 180ms cubic-bezier, Toss's overshoot spring, Raycast's brightness flash. The brand identity is in the motion params, but the words to describe them don't translate to JSON.

StyleSeed solves this with five named seeds, each calibrated by hand for a distinct vibe. A seed is the motion equivalent of a brand skin: a complete personality you can spread onto any `<motion.X>`.

### The five seeds

| Seed | Vibe | When to reach for it |
|---|---|---|
| **Spring** | bouncy, energetic, playful | CTAs that should feel alive; success states; anything Arc-/Toss-like |
| **Silk** | smooth, elegant, continuous | editorial layouts, financial dashboards, modal panels |
| **Snap** | instant, decisive, precise | command palettes, power-user tools, keyboard-driven UI |
| **Float** | weightless, gentle, dreamy | marketing surfaces, hero sections, ambient experiences |
| **Pulse** | rhythmic, alive, punchy | notifications, live indicators, status badges |

Five seeds × five contexts (entrance, exit, hover, press, layout) = 25 spreadable recipes. Each is one calibrated source of truth — never inline the params on the call site.

### Vibe → seed translation

The dictionary below is what `/ss-motion` uses internally to map natural language to a seed. When you write "make this card bouncy," the skill resolves to Spring; when you write "make it feel like Linear," it resolves to Snap via the brand-default mapping.

| Words the user might say | Seed |
|---|---|
| bouncy, springy, playful, energetic, alive | Spring |
| smooth, silky, fluid, elegant, composed, continuous | Silk |
| snappy, quick, instant, decisive, sharp, precise | Snap |
| floaty, gentle, weightless, dreamy, ambient, drifting | Float |
| rhythmic, punchy, pulsing, heartbeat, beat | Pulse |

### Brand → seed defaults

Every skin ships a recommended default seed. Override per page when the feel should diverge.

| Skin | Default seed | Why |
|---|---|---|
| Toss, Arc | Spring | playful brands; CTA overshoot reads as friendly |
| Stripe, Notion | Silk | editorial, calm, no surprises |
| Linear, Raycast, Vercel | Snap | power-user products where the animation should be over before you notice it |

### When to deviate

- A long marketing landing on **Linear** skin still wants **Float** for the hero — the brand's default suits app surfaces, not story surfaces
- A live transactions feed on **Stripe** skin wants **Pulse** for new-row appearance — Silk would feel too quiet
- A modal close on any skin → **Snap** exit, because no one wants to wait for a dismiss to finish

### Reduced motion

`usePrefersReducedMotion()` lives next to the seeds. Long-running surfaces (multi-step entrances, page transitions, animated counters) should swap the seed's transition for `REDUCED_TRANSITION` when the hook returns true. One-off hover/press doesn't need explicit handling — framer-motion already throttles.

### Cross-reference

- `engine/motion/` — the seeds, types, and hook
- `engine/components/ui/motion.tsx` — opinionated wrappers (FadeIn, FadeUp, Stagger) that pre-compose seeds for the most common cases
- `DESIGN-LANGUAGE.md` §43 — motion allowed/forbidden **by surface**: app/dashboard surfaces stay
  calm (no scroll-jacking, no scroll-linked timelines, no infinite loops); marketing/landing/brand
  pages get the **Cinematic tier** (scroll-linked reveals, pinned sections, subtle parallax, 3D
  hero, animated gradient/video bg, rich hover — with the 60fps + reduced-motion + "never blocks
  the first read" guardrails)
- `/ss-motion` slash skill — translates a vibe word + element to the right spread

---

## Application priority — generic dashboard scaffolding

When you're starting a new dashboard, work in this order:

**Day 0–3 — get the bones right**
- Activate a skin via `data-skin` (e.g., `toss` for clean/trust, `linear` for keyboard-power, `arc` for playful)
- Lock in 14px base text and 8px spacing grid
- Split the page into above-the-fold (KPI strip + briefing) and below (detail widgets)
- Make every table row tappable to a detail view

**Week 1–2 — quality lift**
- Replace spinners with card-shaped skeletons that match the final layout
- Rewrite empty states with one CTA each
- Add an onboarding checklist for first-run users
- Toggle widgets between summary and detail mode

**Week 2–4 — polish**
- Extract repeated UI into atomic components
- Add contextual tooltips on first-use of each feature
- Make widgets collapsible
- Add keyboard navigation

---

## References

- [B2B SaaS UX Design in 2026 — Onething Design](https://www.onething.design/post/b2b-saas-ux-design)
- [Smart SaaS Dashboard Design Guide — F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [Dashboard UX Design Best Practices — Lazarev.agency](https://www.lazarev.agency/articles/dashboard-ux-design)
- [Designing for Scale and Complexity — Microsoft Design](https://medium.com/microsoft-design/designing-for-scale-and-complexity-b788363fd1cc)
- [UX Strategies for Real-Time Dashboards — Smashing Magazine](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [Skeleton Screens 101 — NN/g](https://www.nngroup.com/articles/skeleton-screens/)
- [Empty State UX — Pencil & Paper](https://www.pencilandpaper.io/articles/empty-states)
- [Progressive Disclosure in SaaS UX — Lollypop Design](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Linear Dashboard Best Practices](https://linear.app/now/dashboards-best-practices)
- [Atomic Design Methodology — Midrocket](https://midrocket.com/en/guides/atomic-design-methodology/)

---

*Source research compiled 2026-05-21 from a B2B SaaS dashboard (price-monitoring) implementation. Project-specific application notes live in that project's own docs; this file keeps only the universal portions.*
