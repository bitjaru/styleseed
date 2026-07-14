# Changelog

All notable changes to StyleSeed. Agents can check the latest version at
[version.json](https://styleseed-demo.vercel.app/version.json) and run `/ss-update`.

## [2.10.1] — 2026-07-14

**Theme: first-class Codex discovery.** StyleSeed already shipped `AGENTS.md`, but the
repository itself exposed its 19 skills only through Claude Code's `.claude/skills`
path and documented Claude's slash-command syntax for every agent.

### Added
- A root `AGENTS.md` with repository structure, canonical skill ownership, generated-file
  rules, verification commands, and release boundaries.
- A repository-scoped `.agents/skills` bridge to the canonical 19 skills, so Codex discovers
  `$ss-setup`, `$ss-build`, `$ss-score`, `$ss-verify`, and the rest without maintaining a
  second copy that can drift.

### Changed
- English and Korean setup docs now distinguish Claude Code's `/ss-*` invocation from
  Codex's `$ss-*` invocation and `/skills` picker.
- Manual installation and update docs now include Codex's `.agents/skills` project path.
- Stale skill counts in the engine, update, comparison, and contributor docs now say 19.

### Verified
- A fresh Codex session loaded the repository `AGENTS.md`, discovered all 19 repo-scoped
  skills, and invoked `$ss-score` from the canonical `engine/.claude/skills/ss-score/SKILL.md`.
- The 113-route Next.js demo production build passes.

## [2.10.0] — 2026-07-09

**Theme: the gate now has eyes.** `/ss-score` reads the *code* — but some of the worst
"AI-made" tells only exist in *pixels*, and a code-reading gate is blind to every one of them:
a hero that doesn't actually dominate, a lower third of dead whitespace, a web font that
silently failed to load and fell back to Times, two colors that *look* like two accents once
rendered, an empty state that's a blank white void. A human catches these in half a second.

### Added
- **`/ss-verify`** — the VISUAL gate. It renders the screen (dev server + headless screenshot,
  or a static file, or an isolated component harness), the agent **looks at the image**, and
  scores the same StyleSeed gate against what it actually *sees* — the squint "does this look
  AI-made" test, whether one element truly dominates, dead/cramped space, fonts that didn't
  load, hues that read as two accents, contrast as rendered, optical alignment. It **renders the
  empty/loading/error states too** (the blank-void failure you can only catch by looking), then
  fixes and re-renders until it passes. It never claims a visual pass without a real screenshot;
  if nothing can render it falls back to `/ss-score` and says the visual gate was skipped.

### Changed
- **The Quality Gate is now two passes in order:** `/ss-score` (code-clean, cheap, structural)
  → then `/ss-verify` (pixel-clean, the real bar) whenever the screen can render. `/ss-build`
  finishes a renderable screen with `/ss-verify`. Wired into CLAUDE.md / AGENTS.md gates,
  `/ss-build`, `/ss-score`, README, and `llms.txt`. (19 skills total.)

## [2.9.0] — 2026-07-08

**Theme: motion is scoped by surface — stop banning what makes a landing page premium.** A blanket
"no scroll-linked / no parallax / no 3D / no animated gradients" was right for *product* surfaces
(dashboards, data, forms — keep them calm) but got over-generalized to **every** surface, which
made it impossible to build the exact kind of brand page StyleSeed points at as best-in-class
(family.co, stripe.com, linear.app). Those pages *are* scroll-choreographed. This release scopes
the rule instead of dropping it.

### Changed
- **`Cinematic tier` for marketing / landing / brand pages** (DESIGN-LANGUAGE §43, PAGE-TYPES
  Landing): on a public brand page, scroll-**linked** reveals, pinned/sticky sections, the
  "product assembles as you scroll" move, subtle parallax, a 3D/tilt hero, animated gradient/mesh
  or video backgrounds, and rich hover are now **explicitly allowed** — with guardrails: purposeful
  (not jitter), 60fps (`transform`/`opacity` only), never blocks the first read or the CTA/LCP,
  `prefers-reduced-motion` leaves a complete static page, one motion language.
- **The critical distinction the old rule blurred:** scroll-**JACKING** (hijacking scroll speed,
  trapping the user) stays banned *everywhere* — it's not the same as scroll-**linked** choreography
  (native scroll drives it, the user stays in control), which is now encouraged on brand pages.
- **App/dashboard/data/form surfaces keep the restraint** (no scroll-jacking, no scroll-linked
  timelines, no gimmick 3D, never animate money/numbers). The bans didn't go away — they got a
  surface.
- Propagated across DESIGN-LANGUAGE §43, PAGE-TYPES, VISUAL-CRAFT, METHODOLOGY, CLAUDE.md /
  AGENTS.md gates, and `/ss-score` (surface-aware deduction), `/ss-motion`, `/ss-dial`.

## [2.8.0] — 2026-07-06

**Theme: change the look without breaking coherence.** "Make it more minimal" is something you
can just *say* — the model already reads plain language. A skill only earns its place where **one
word must move many tokens at once, in a coordinated way, without breaking a rule**, and where
doing it by hand gives an inconsistent one-off. Two new skills cover exactly that space; vibes
stay words.

### Added
- **`/ss-dial <axis> <direction>`** — turn ONE design axis up or down as a deterministic
  transform. Seven axes: **density · hierarchy · radius · elevation · color (saturation +
  temperature) · weight · motion**. Each is a defined ramp that moves the whole coordinated token
  set together (e.g. `density denser` = spacing + card padding + gap + line-height + type scale,
  all at once), respects the guardrails (8px grid, ≥44px touch, single accent, nested-radius,
  ≤8% shadow / dark tonal ramp, font-size table), **clamps at the ends** (bounded, not runaway),
  writes the new position to `STYLESEED.md`, and re-runs the Quality Gate to ≥ 80.
- **`/ss-restyle <preset>`** — apply a named aesthetic as a *coordinate* across the dial axes
  plus a font, accent family, and one signature move: **swiss · editorial · technical · warm-dtc
  · minimal-mono · brutalist-lite**. A preset is a full identity, not a filter you stack — two
  presets = the mixed-personality tell. Honors a deliberate brand hex, holds the modern floor
  (§CC-9d: white/fresh base, serif as seasoning), rewrites the lock, re-gates. Trend styles
  (glassmorphism, neumorphism) are **deliberately excluded** as dated.

### Why this shape
A mood word ("premium", "editorial") isn't one axis — it's a position across several, so it's a
**preset** (`/ss-restyle`), not a dial. A single measurable axis with a guardrail ("denser",
"sharper", "more muted") is a **dial** (`/ss-dial`). Anything the model handles from plain words
stays words — no skill. (18 skills total.)

## [2.7.0] — 2026-07-06

**Theme: close the gap between *knowing* the rules and *following* them.** The reference demo
(styleseed-demo.vercel.app) looks designed and a free-hand build often doesn't — with the *same
74 rules*. The difference was never the rules; it was a **loop** the demo ran and a free-hand
build skips: lock the look → build → run the Quality Gate → fix to a floor → repeat. This
release turns that loop from prose-you-can-ignore into machinery.

### Added
- **`/ss-build`** — build a screen the demo way, enforced. One command that refuses to write UI
  before the look is locked in `STYLESEED.md`, reads the *full* rules (not a summary), builds
  with one focal point / surface-correct type / no icon-chip cliché, then runs `/ss-score` as a
  **loop** — fixing the top offenders and re-scoring until ≥ 80 — and only *then* presents, with
  the score and what it fixed. This is the front door for building UI now; free-hand is the
  fallback. (16 skills total.)

### Changed
- **The one-paste prompt now bootstraps its own install.** It starts with
  `npx skills add bitjaru/styleseed` (falling back to the rules-URL only if install isn't
  possible), because **the Quality Gate is the step that strips the "AI look" — and `/ss-score`
  / `/ss-build` can only *run* when the skills are installed.** Pointed at the rules-URL alone,
  the "gate" degrades to an honor-system self-check the agent usually skips, the lock never
  persists, and output drifts generic. Install-first makes the gate real and the lock durable.
  Updated on the landing hero, both READMEs, and `llms.txt`.
- **Landing "install" tier rewritten** to state *why* install beats paste (the gate only runs
  when installed; the lock persists; every screen is scored before you see it).
- **CLAUDE.md / AGENTS.md "How to use"** now lead with `/ss-build` (or the same loop by hand:
  lock first → full rules → build → gate loop), instead of a build-then-maybe-lint flow.

## [2.6.0] — 2026-07-02

**Theme: rules that survive contact.** A three-domain stress test (Korean mobile health app ·
dark observability dashboard · warm DTC e-commerce landing, all built with ZERO user direction)
confirmed v2.5.0 escapes the first-generation AI tells — but the builders honestly reported ~12
rule contradictions and gaps, plus the next battlefield: **the escape hatches themselves becoming
clichés.** This release patches all of them.

### The 2nd-generation tells (new)
- **CC-9c — don't let the escape hatch become the new uniform**: ghost index numbers (01·02·03)
  on every section, identical uppercase-overline + big-number KPI cards, the stock
  text-left/visual-right hero + two pill CTAs, the symmetric 8+4 dashboard grid. Pick ONE
  signature treatment per project and vary section anatomy. Enforced in the Quality Gate and
  `/ss-score` (Distinctiveness).
- **CC-9d — distinctive must not cost freshness**: "generic → dated" is a different failure, not
  an escape. Full beige/paper canvas + serif-on-everything + heavy ink blocks reads "government
  pamphlet," not "designed" (especially in Korean — 명조 전면 = 약관 느낌). Modern floor: white/
  fresh base, serif as seasoning (one display moment max, never body), keep the air. Gate now
  fails distinctive-but-dated alongside coherent-but-generic.

### Contradictions fixed (found by dogfooding)
- **Dark-mode elevation**: Golden Rule 7 now speaks both languages — light = layered shadows ≤8%,
  dark = tonal surface ramp + hairline borders (shadows don't read on dark). Gate + `/ss-score`
  no longer punish correct dark-mode hairlines.
- **Spacing**: the stray "6px multiples" guidance now matches VISUAL-CRAFT CR-1 (one 8px grid,
  4px half-step). Golden Rule 5 scoped: mobile mx-6/space-y-6, desktop container + gap-6/gap-8.
- **Radius personality → component mapping table** ("one personality ≠ one number"): sharp
  2–4/6–8 · soft 8–10/12–16 · pill full/20–24, nested law intact.
- **Touch targets**: ≥44px on touch surfaces; pointer-first desktop controls may be 36–40px.

### Gaps filled
- **Accent ≈ semantic collision rule** (green accent vs success green): route positive-progress
  through the accent or shift the semantic hue — decided once, written in the lock. "Completed/
  normal" resting states default to neutral grey everywhere.
- **Content/imagery palette clause**: product illustrations may use 2–3 locked material tones
  (declared in `STYLESEED.md`) — locked content tones ≠ a second accent.
- **Skinless tint formula**: no theme.css? status/accent chips = color at 10–14% alpha over the
  card, light and dark.
- **Type scale additions**: desktop app-chrome scale (dashboard h1 22–24px, hero KPI 48–64px,
  card overlines are labels not titles), dense-data exceptions to the 14px floor (chart ticks,
  mono SHAs/timestamps 12–13px), duration/compound KPI sizing, and Korean/CJK tracking guidance
  (no positive letter-spacing on 한글).
- **Quality Gate page-type awareness**: static mockups / landings with no data surface mark
  States N/A instead of failing.
- **Smart defaults gained warm/consumer examples** (e-commerce → terracotta/coral, health →
  desaturated green-teal) so warm domains stop drifting cool.
- Lock template gained `Imagery palette`, `Semantic resolve`, `Signature move`, and dual-mode
  `Elevation` fields.

## [2.5.0] — 2026-07-01

**Theme: distinctive, not just coherent.** Dogfooding real product builds surfaced the next
failure mode: StyleSeed reliably stopped UI from being *ugly* (rainbow, emoji, pure black) but
could still leave it *generic* — the default indigo, the tight mobile type scale on a desktop
screen, the "Lucide-icon-in-a-pale-chip" cliché repeated for every feature, an all-even grid with
no focal point, and the demo layout copied verbatim. Coherent-but-generic still reads "an AI made
this." This release forces the *identity* layer that made the reference demo look designed.

### Added
- **Mood step in Quick Setup** — the agent now pins the aesthetic in plain words (**edges** →
  radius, **feel** → shadow/ornament, **density** → spacing/type, **tone** → motion/saturation),
  proposing a skin-based default the user tweaks ("sharper corners"). Locked in `STYLESEED.md`.
- **Smart domain defaults** — setup infers a domain-fit skin/color (Korean + fintech/regulation →
  Toss `#3182F6`, etc.) instead of asking cold. **The unlocked default indigo (`#5E6AD2`/`#4F46E5`)
  is now forbidden as a final choice.**
- **Type scale by surface** — a desktop/web B2B scale (body ≥16px, section titles ≥20px, larger
  hero) distinct from the tight mobile-app scale, plus a font-pairing recommendation table. Setup
  and the lock now record **surface** and **font**.
- **Retrofit path** (`/ss-update` Step 6) — re-do a screen built with an older, weaker StyleSeed to
  the new standard: write a lock if missing, re-score, fix to ≥80, report the before/after score.
- **`Distinctiveness` scoring category** in `/ss-score` (10 pts) and a matching Quality-Gate check.

### Changed
- **Quick Setup is now MANDATORY** (was "recommended") — if there's no `STYLESEED.md` and you're
  about to build UI, running setup is the first step, before any code.
- **Quality Gate gained Distinctive / Focal / Type-fit checks** — it now fails a default-indigo
  accent, a copied demo layout, an all-even no-focal grid, and 14px body on a desktop screen.

### Rules (gaps closed from real failures)
- **Golden Rules 14–16** — never ship the default/unlocked accent or a copied demo layout
  (coherent ≠ distinctive); one focal point per screen (an all-even card grid is the
  machine-composed tell); match the type scale to the surface.
- **No icon-chip cliché** (VISUAL-CRAFT **CC-9b**) — a generic Lucide line-icon in an identical
  pale-tinted rounded-square, repeated for every feature, is a top "AI built this" tell; drop the
  chip, vary the treatment, or use numbered/typographic markers.
- Enforced across `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `/ss-score`, and `/ss-update`.

## [2.4.0] — 2026-06-23

**Theme: consistent application.** Real usage showed the one-paste prompt could still
produce mediocre UI (random colors, no key color, different every run). Root cause:
*consistency comes from constraints*, and the paste path is the least-constrained. This
release raises the floor of the default path.

### Added
- **Quality Gate** — a non-negotiable self-review the agent runs *before showing the user any
  UI*: a 7-point checklist (coherence, color=meaning, hierarchy, layout, states, copy, polish);
  with the skills installed it's `/ss-score` looped to a ≥80 floor with fixes; without them it's
  a self-score. No first-draft, incoherent UI (rainbow lists, emoji icons, two accents, missing
  states) reaches the user. Baked into CLAUDE.md, AGENTS.md, llms.txt, and the paste-prompt.
- **Quick Setup protocol** (CLAUDE.md, AGENTS.md, llms.txt): agents now work in **plan
  mode**, lock a key color + motion seed *with the user* before building, then self-check.
- **Design Lock** — agents write and obey a project-root `STYLESEED.md` (skin, accent,
  radius, motion) on every prompt, so decisions persist instead of drifting. `/ss-setup`
  writes it automatically.
- **Troubleshooting guide** (README) + FAQ entries for "applied StyleSeed but it still
  looks bad / results vary."
- **Status chip tint tokens** in all 7 skins (`bg-success-tint`/`bg-warning-tint`/
  `bg-destructive-tint`/`bg-info-tint`, derived via `color-mix`, auto-adapting to dark) so
  agents stop hand-mixing one-off hex for status backgrounds.
- **"What's new" section** on the landing page (auto-synced from `version.json`) + this
  `CHANGELOG.md`.

### Changed
- **Stronger canonical paste-prompt** (homepage, both READMEs): points to `llms-full.txt`
  (the full rules, not the summary) and bakes in plan-mode + key-color lock + coherence
  self-check.

### Rules (gaps closed from real failures)
- **No emoji as UI icons** (CC-9a) — emoji inject many uncontrolled hues and break the
  single-accent rule; use one line-icon set in `currentColor`.
- **Status color = severity, not decoration** (CL-2a) — a normal/OK/"보통" state is neutral
  grey; color marks only the minority of rows that need attention; same value → same color.
- **No decorative hues** (CL-2b) — favorite stars, category dots, markers use the accent or
  grey, not a new color each.
- These are enforced in `/ss-review`, `/ss-score`, and the design-review skill rubric.

## [2.3.0] — 2026-06-15

- **Design judgment expansion**: APP-PLAYBOOKS.md (domain bias) + PAGE-TYPES.md (screen-type
  bias), VISUAL-CRAFT.md (research-backed craft + coherence laws), UX-WRITING.md (verbal
  judgment, Toss-grounded).
- 74 design rules · 15 skills (added `/ss-score`) · 7 brand skins.
- Agent-agnostic delivery: CLAUDE.md + AGENTS.md + .cursorrules.
- 8 `/guides` + 7 `/screens` programmatic-SEO pages, `/how-it-thinks`, `/faq`.

[2.10.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.10.0
[2.9.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.9.0
[2.8.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.8.0
[2.7.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.7.0
[2.6.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.6.0
[2.5.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.5.0
[2.4.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.4.0
[2.3.0]: https://github.com/bitjaru/styleseed/releases/tag/v2.3.0
