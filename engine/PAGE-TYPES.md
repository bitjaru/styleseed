# StyleSeed — Page-Type Playbooks

The second axis of design judgment (see `APP-PLAYBOOKS.md` for the first). These
playbooks describe task requirements and contextual starting points, not universal
component, geometry, or font-size mandates. `PRODUCT-PRINCIPLES.md` owns authority.
Use the selected grammar and approved project decisions to interpret the defaults;
`DESIGN-LANGUAGE.md` examples cannot override them.

> **Domain × page type = the actual call.** A fintech *dashboard* and a social
> *dashboard* differ by domain; a *dashboard* and a *form* differ by page type.
> Read the domain playbook **and** the page-type playbook, then scaffold.

For each type: **the job**, **structure**, **hierarchy**, **signature patterns**,
**anti-patterns**, **mobile**.

---

## Dashboard / Home / Overview

- **Job:** answer "how are things?" in 3 seconds, then let the user drill down.
- **Structure:** expose the state that supports the next decision, then its evidence
  and drill-down. A personal summary may lead with a metric; operations may lead with
  a queue, and monitoring with a timeline or comparable panels.
- **Hierarchy:** use the grammar's attention model and approved type/density tokens.
  Do not require a hero number or progressive density when comparison is the task.
- **Patterns:** summary, actionable queue, trend, comparison panel, evidence table.
  Choose project-native components rather than mandatory StyleSeed card names.
- **Anti-patterns:** decorative KPI walls, unclear scope or freshness, charts without
  a decision, and inconsistent emphasis between comparable values.
- **Mobile:** preserve task priority, filters, and access to comparison evidence;
  reflow using the project's gutters and input-mode scale.

## Form / Create / Edit

- **Job:** get accurate input with the least friction and the most confidence.
- **Structure:** logical field groups with explicit labels and a clear completion
  action. Single-column flow is a useful default; related short fields may share a
  row when order, zoom, and narrow-screen reflow remain clear. Use the selected
  recipe's containment: public-service forms use flat sections, not forced cards.
- **Hierarchy:** the field you're on > the next field > everything else. Primary
  action visually dominant; secondary/cancel quiet.
- **Patterns:** labeled inputs, validation timed to the input task, grouped sections,
  explicit save state, associated error/help text, clear required/optional marking.
  Sticky actions and error motion are optional, never required for comprehension.
- **Anti-patterns:** ambiguous field order, placeholder-as-label,
  validating before the user finishes, competing completion actions in one decision region, error states with no
  recovery guidance, disabled submit with no explanation.
- **Mobile:** full-width fields, ≥44px touch targets, numeric keyboards for number
  fields, sticky primary above the keyboard.

## Landing / Marketing / Home (public)

- **Job:** in one screen, say what it is + why it matters + one next action.
- **Structure:** establish a proposition with relevant evidence and a clear next step.
  Image-led, type-led, editorial, and demonstration-led openings are alternatives.
  Choose sections and order by the visitor's questions, not a fixed hero/proof/CTA template.
- **Hierarchy:** make the reading promise and next action perceptually clear through
  position, scale, imagery, contrast, and spacing. The headline need not be largest,
  nor the CTA the brightest element; a quiet visible link can fit the task.
- **Patterns:** product media, demonstrations, meaningful comparisons, sourced proof,
  and local or closing actions. Use real content; no feature-grid or repeated-CTA quota.
- **Motion — expressive choreography is optional when it serves the proposition.**
  Possible techniques include **scroll-LINKED reveals,
  pinned/sticky sections, sequential "the product assembles as you scroll" choreography, subtle
  parallax, a 3D/tilt hero or showcase card, an animated gradient/mesh or video background, rich
  hover** (magnetic/glow/lift). A static brand page is also valid.
  Guardrails still hold: purposeful (not jitter), target smooth rendering
  (`transform`/`opacity` only), never blocks the first read or the CTA/LCP, `prefers-reduced-motion`
  leaves a complete static page, one motion language.
- **Anti-patterns:** multiple competing CTAs, wall of text, every section the same rhythm,
  autoplaying *audio*, motion that **delays the headline or hides content until you scroll**,
  **scroll-JACKING** (hijacking scroll speed / trapping — different from scroll-linked),
  unstable color roles, no reduced-motion fallback. Purposeful repetition is valid.
- **Mobile:** recompose by task priority, preserving the proposition, media crop,
  evidence, and reachable actions. Stack or regroup where useful; preserve comparison
  with legible columns or a bounded data region when needed. Test navigation and zoom.

## Detail / Profile / Item

- **Job:** show one thing deeply, with its next action clear when the task calls for one.
- **Structure:** identity header (title/image/status) → key facts → body/sections →
  a clear next action within the relevant decision region (optionally sticky on mobile).
- **Hierarchy:** the subject and its evidence lead. In reading contexts, save/share
  and other controls recede; in commerce, the commitment action stays easy to find.
- **Patterns:** hero/identity block, key-value facts, tabbed or sectioned body,
  sticky primary action, related items rail, status indicators.
- **Anti-patterns:** burying the primary action, equal weight on everything, no
  clear "what is this," metadata louder than the subject.
- **Mobile:** preserve subject, evidence, and action; use a sticky action or disclosure
  only when useful. Keep important comparison context and terms accessible.

## List / Index / Browse / Search

- **Job:** scan many items fast, find the right one, act.
- **Structure:** optional filter/search bar → consistent rows/cards → clear
  per-item action or tap target. Consistency beats variety here.
- **Hierarchy:** the item's identifying field (name/title) is boldest; status and
  meta are quieter; the value/amount is emphasized on the trailing edge.
- **Patterns:** `ListItem` (title + status dot + trailing value), filterable list,
  segmented control, swipe actions on mobile, empty state, `stagger-cascade`
  entrance, skeleton while loading.
- **Anti-patterns:** rows that vary wildly, no empty/loading state, status by color
  alone (pair with text/dot), tiny tap targets, pagination where infinite scroll
  fits (or vice-versa).
- **Mobile:** full-width rows, swipe-to-act, ≥44px rows, sticky filter.

## Settings / Account / Preferences

- **Job:** let the user find and change one setting with confidence, safely.
- **Structure:** grouped sections by topic (profile / notifications /
  billing / danger), each setting a labeled row with its control on the trailing
  edge. Destructive actions isolated and clearly marked.
- **Hierarchy:** flat and scannable — settings are equal-weight within a group;
  group titles orient. Danger zone visually separated.
- **Patterns:** toggle rows, select rows, account header, billing summary, **danger
  zone** (clearly distinguish destructive actions using the approved system),
  inline-save or explicit-save (be consistent).
- **Anti-patterns:** destructive actions next to benign ones, unclear save model,
  settings with no labels, toggles whose state is ambiguous, no confirmation on
  irreversible actions.
- **Mobile:** full-width rows, controls reachable with the thumb, ≥44px toggles.

## Onboarding / First-run / Empty

- **Job:** get the user to their first win with minimal steps, never a dead end.
- **Structure:** few steps with visible progress, one decision per step, a strong
  "what's next." Empty states are onboarding in disguise — always offer the next
  action.
- **Hierarchy:** the current step and its single action dominate; progress is
  visible but quiet.
- **Patterns:** stepper/progress, one-question-per-screen, `EmptyState` (icon +
  title + description + action), `pop-in`/`confetti-pop` on completion, contextual
  tips, skip/defer where fair.
- **Anti-patterns:** asking everything up front, empty screens with no next action,
  no sense of progress, punishing or shaming empty states, forcing setup before
  any value.
- **Mobile:** one step per screen, big primary, progress at top.

---

## Resolving conflicts

Use `PRODUCT-PRINCIPLES.md`. Preserve core floors, the selected grammar's job, and
adapter constraints. Component names, sizes, animation examples, and layouts here
are defaults; approved project decisions and the selected recipe specialize them.
If two applicable approved decisions disagree, report the conflict rather than
silently choosing one. A page default is not permission to replace the project system.
