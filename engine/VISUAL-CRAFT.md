# Visual Craft — research-backed rules for beautiful, coherent UI

DESIGN-LANGUAGE.md tells you the **rules**. METHODOLOGY.md tells you **why** they
exist. This file tells you the **craft** — the concrete, numeric decisions that
separate "designed by one mind" from "assembled from parts": how to make a
component look intentional, how to space it, which type to pick for which kind of
app, and — most importantly — how to keep the *whole* UI **coherent**.

Every rule here is grounded in primary design literature (sources at the bottom).
Numbers are defaults, not dogma — but don't deviate without a reason.

> **Read this:** before scaffolding a new product surface, and whenever a UI
> "looks off" but you can't say why. Pair with **APP-PLAYBOOKS.md** (domain bias)
> and **PAGE-TYPES.md** (screen bias).
>
> **Priority:** `PRODUCT-PRINCIPLES.md` → output grammar (`RULESETS.md` or compiled) →
> `ADAPTERS.md` → domain/page → optional profile → bounded lock. This file refines craft within
> that composed method; it never overrides it.

---

## §C0 — The Coherence Laws (read this first)

The single biggest reason AI-generated UI looks "off" isn't ugly components — it's
**incoherence**: a sharp-cornered dialog next to pill-shaped buttons, two competing
accent colors, icons from three families, shadows lit from different directions. A
UI reads as professional when it feels **shaped by one deliberate mind**
([UX Collective], [Tubik]).

**The meta-law: for each design axis below, choose exactly ONE coordinated family, encode
it as a token, and apply it everywhere.** Coherence is not "every screen is identical"
— it's that the same decisions repeat. The user's instinct — *"if the corners are
sharp, everything must be sharp"* — is exactly right, and it generalizes to every row
of this table.

| Axis | Pick ONE, system-wide | Failure mode when mixed |
|---|---|---|
| **Corner / radius** | One personality: **sharp 0–4px** · **soft 8–12px** · **pill 9999px**. Card, button, input, modal, image, avatar all obey it. | Sharp dialog + rounded buttons = "two products glued together." The #1 tell of un-designed UI. |
| **Shadow** | One scale, one light source (**above-left**), one hue tint. A modal and a card use the *same* family, different tiers. | Mixed light directions / some-black-some-tinted = "scene with two suns." |
| **Color roles** | One primary action plus the grammar's stable semantic/categorical/brand roles. | Competing emphasis hues or local decorative colors collapse hierarchy. |
| **Spacing unit** | One base grid: **8px** (4px allowed as a half-step for icon↔label). Every margin/padding/gap is a multiple. | Off-grid values (7, 13, 19px) read as "sloppy" without users knowing why. |
| **Icon style** | One family, one fill mode (all outline **or** all filled), one stroke weight (e.g. **2px @ 24px**). | Mixing Material + Feather + emoji, or 1.5px and 2px strokes, looks "out of place." |
| **Type scale** | One modular scale, ≤2 font families, one weight ramp. | Arbitrary sizes destroy rhythm; >2 families looks amateur. |
| **Motion / easing** | One duration set (~150/200/300ms) + one easing family; same enter/exit logic everywhere. | Some snappy, some sluggish = feels like different apps. |
| **Border** | One hairline weight (**1px**) and one low-contrast neutral border token. | Mixed 1px/2px borders and random grays look unintentional. |
| **State layers** | One opacity ramp for hover/focus/pressed on *all* interactive elements. | Buttons darken, links underline, cards scale — feedback feels random. |
| **Control height** | Buttons, inputs, selects share a height set (e.g. **40px** default). | A 44px input next to a 32px button breaks the baseline. |

**Treat a mixed axis as a lint error, not a style choice.** When in doubt, copy the
decision already made elsewhere in the product rather than inventing a new one.

---

## §C1 — Spacing & rhythm

**CR-1 · Snap everything to one scale.** Use `{2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96}`px.
No arbitrary values (no 13px, no 7px). 8px base; 4px only as a half-step for
icon↔text and tightly stacked small text. *Why: a constrained scale forces
deliberate, repeatable layout; 8px divides cleanly across 1x/1.5x/2x/3x densities.*
([Refactoring UI], [Material 3 Spacing], [IBM Carbon 2x Grid])

**CR-2 · Proximity = relatedness.** The space *around* a group must be **≥ 2×** the
space *within* it. Uniform spacing everywhere is the #1 beginner failure — it
destroys all grouping signal. *Why: Gestalt — the eye reads tight items as one unit,
loose items as separate.* ([Refactoring UI "Avoid ambiguous spacing"])

**CR-3 · The form spacing ladder.** label→input **4–8px** · field→field **12–16px** ·
section→section **24–32px** mobile / **32–48px** desktop. Each tier ~doubles the last,
so hierarchy is unambiguous. ([Designary], [Atlassian Spacing])

**CR-4 · Card padding by size.** compact **12–16px** · standard **16–24px** · large/marketing
**24–32px** · hero **48–64px+**. And the outer margin between cards must be **≥** the
card's inner padding, so each card reads as self-contained. ([Refactoring UI], [UX Lab])

**CR-5 · Start over-spaced, then reduce.** Designers under-space by default; "ample"
usually turns out to be "just enough." When unsure, go one step *up* the scale.
([Refactoring UI "Start with too much white space"])

**CR-6 · Separate with the lightest tool first:** whitespace → background tint →
shadow → border (last resort). Don't put a border on everything. *Why: borders
everywhere read as busy/cluttered; space and tone separate without noise.* ([Refactoring UI])

**CR-7 · Measure (line length) 50–75 characters**, ~66 ideal; `max-width: 65ch` (≈680–720px).
Never exceed 80ch — wider copy gets skipped ~41% more (Baymard) and breaks the
return sweep. Dashboards go edge-to-edge, but any text column inside still obeys 75ch.
([Baymard Line Length], [Butterick])

**CR-8 · Data-table density tiers.** row height **32–40px** compact · **48px** default ·
**56px** spacious. Default to 48px and expose a density toggle for power users. Each
density step changes control height by exactly **4px** (Material density 0 / −1 / −2 / −3).
([Pencil&Paper], [Material Density])

**CR-9 · Don't enforce a strict pixel baseline grid on responsive web** — it assumes
fixed heights it doesn't have. Repetition of the spacing scale creates rhythm; a
baseline grid does not. ([Imperavi Vertical Rhythm])

**CR-10 · Everything lines up to something.** Establish a small set of shared
left/right edges (a 12-col grid, 16px gutters) and align all content to them. Apply
*optical* (not pixel) alignment for weighted glyphs: nudge arrow/play icons, trim
the icon-side padding of icon-buttons, center type by cap-height. ([IBM Carbon], [Liferay Optical Alignment])

---

## §C2 — Typography

**CT-1 · Base body = 16px;** build a 5–7 step modular scale, e.g. `12 · 14 · 16 · 20 · 24 · 32 · 48`.
*Why: a shared multiplier makes sizes harmonize like musical intervals; 16px is the
WCAG-practical body minimum.* ([Material 3 Type], [FontFYI])

**CT-2 · Ratio by density.** dense product UI/dashboards **1.125–1.2** · general default **1.25** ·
content/editorial **1.333** · marketing/display **1.5–1.618**. Run *two* scales in one
system if needed (tight UI scale + loose editorial scale). ([Cieden Type Scales])

**CT-3 · Max 2 typefaces** — or one superfamily (e.g. IBM Plex Sans/Serif/Mono). Pair
by **contrast**: geometric/grotesque heading + humanist body. Reach for a serif display
only to signal **editorial / trust / luxury**. ([EightShapes], [Pangram Pangram])

**CT-4 · Tabular numerals are mandatory** (`font-variant-numeric: tabular-nums`) for
tables, money, dashboards, timers — applied to the *whole* numeric grid, never
selectively. Proportional figures inline in prose; lining figures in UI. Pick a font
with disambiguated `0/O` and `1/l/I` for anything numeric or financial.
([MyFonts Figures], [TypeType Numerals])

**CT-5 · Build hierarchy with weight, not just size.** 400 body · 500–600 labels/subheads ·
700 headings. Ship 3 weights (add 800–900 for marketing display only). **Never go
below 400** for body/UI — de-emphasize with color or size instead. ([Refactoring UI], [Fontfabric Weight])

**CT-6 · Line-height tightens as type grows.** body **1.5** (long-form 1.5–1.7) ·
headings 1.2–1.35 · display/hero **1.0–1.2** · captions 1.4–1.6. *Why: big type already
reads as a shape and needs less leading; small text needs more air.* ([Butterick], [Material 3 Type])

**CT-7 · Letter-spacing.** display **−0.01 to −0.03em** (never past −0.03) · UPPERCASE
labels **+0.05 to +0.12em** · body **0** (leave the font's default alone). Express in
`em` so it scales with size. ([Butterick], [DesignYourWay])

**CT-8 · Optical sizing.** Text-optical faces ≤19px, Display-optical ≥20px (the SF
Text ≤19pt / SF Display ≥20pt split). ([Apple HIG Typography])

### Type recipe by app type

Use this as the **type half** of the domain bias in APP-PLAYBOOKS.md.

| App type | Typeface character | Hero | Body | Numerals | Weights | Signature |
|---|---|---|---|---|---|---|
| **Fintech** | Restrained neo-grotesque, low contrast (Inter, IBM Plex, Söhne) | 36–48 | 15–16 | **Tabular lining (mandatory)** | 400 / 500 / 600–700 KPIs | Aligned money columns, disambiguated 0/O |
| **SaaS dashboard** | Humanist screen-sans (Inter) | 28–36 | 14 (13 dense) | Tabular in tables | 400 / 500 / 600, scale 1.2 | Weight-driven hierarchy, tight density |
| **E-commerce** | Friendly humanist + optional brand display | 32–48 | 16 | Tabular for price/grid | 400 / 600 price+CTA | Bold confident price, warm body |
| **Social** | System humanist (SF Pro / Roboto) | weight-up ~20–28 | 15–17 | Proportional | 400 / 600 | Bolder-not-bigger titles, native feel |
| **Content / editorial** | High-contrast serif display + humanist body | 40–64 | 18–21 | Oldstyle/proportional in prose | 400 / 700 | Serif authority, 60–75ch measure |
| **Health** | Warm humanist sans, open counters | 32–44 | 16–18 | Proportional (tabular for vitals) | 400 / 600 | Generous air, line-height 1.6 |
| **Dev tools** | Grotesque + matched mono superfamily (Geist, Plex) | 32–48 | 14–16 (code 13–14 mono) | Tabular / mono | 400 / 500 / 600 | Mono for code/logs, Swiss precision |
| **Marketing** | Expressive oversized display + clean sans | 64–120+ | 18 | Lining proportional | 400 / 700–900 | Hero dominates, loose 1.5–1.618 scale |

---

## §C3 — Component craft

### Depth & elevation
**CC-1 · Layered shadows, never one hard shadow.** Stack 3–6 `box-shadow`s with
increasing offset/blur and decreasing opacity (8–20% per layer, lower at higher
elevation). One light source, **above and slightly left**, vertical offset ≈ **2×**
horizontal — every shadow on the page shares it. **Tint the shadow toward the surface
hue**, never pure `rgba(0,0,0)`. *Why: real penumbra is a gradient; one black shadow
looks like a cutout sticker.* ([Josh Comeau Shadows], [Tobias Ahlin])

**CC-2 · Two shadow intents:** small/tight = element sits *near* the page (buttons,
inputs); large/blurry = element *floats toward* the user (modals, popovers, dragged
cards). Shadow size encodes z-distance. In dark mode, prefer **tonal elevation**
(lighter surface) over shadow, which nearly disappears on dark. ([Refactoring UI], [Material 3 Elevation])

### Border radius
**CC-3 · Radius is a token,** not a magic number. Define a scale (`4 / 8 / 12 / 16 / full`)
and pick **one personality** (§C0). Bigger components get bigger radius proportionally.

**CC-4 · The nested-radius law:** `inner radius = outer radius − padding`. Implement
with `calc()`, clamp ≥0. *Why: concentric corners must share a center, or the inner
corner "bulges" past the outer arc.* Apple's Liquid Glass formalizes this. ([Cloud Four], [Material 3 Shape])

### Buttons
**CC-5 · Heights 36 / 40 / 44–48px;** touch target ≥ **44px** (iOS) / **48dp** (Android).
Horizontal padding ≈ **2× vertical**, on grid. Icon+label gap **8px** (4px dense). ([Justinmind], [Apple HIG])

**CC-6 · One primary button per view.** Hierarchy by **contrast** (filled → outline →
ghost), never by size. Destructive is red but **never** more prominent than the
primary. All buttons in a row share one height. ([Cieden Button Hierarchy], [Carbon])

### Cards
**CC-7 · Padding 16 / 24 / 32px** equal on all sides; radius obeys the system
personality and the nested law for inner media/buttons. **Border XOR shadow, never
both** — flat/dense UI uses a 1px border (elevation 0); standalone/floating uses a soft
shadow (elevation 1). Hover on an interactive card = raise **one** elevation tier over
~200ms, not a scale jump. ([Material 3 Elevation], [Refactoring UI])

### Inputs & forms
**CC-8 · Input height = button height** (default 40px; 44–48 touch). Label **above** the
field (top-aligned scans fastest); **labels never vanish** (no placeholder-as-label).
Focus ring **≥2px, 3:1 contrast**, visible on light *and* dark (WCAG 2.2). Errors
**never color alone**: red border + icon + a message saying what's wrong and how to fix
it. Rhythm: 8px label→field, 4px field→helper, 16–24px between fields. ([UX Collective Text Fields], [WCAG 2.2])

### Icons
**CC-9 · One family, one fill mode, one stroke weight** (typically **2px @ 24px**).
Optically size and center (tall/wide glyphs get nudged), align to text via
`currentColor` at ~1em–1.25em. Semantics: **outline = default/inactive, filled =
active/selected** — and if you use both, make filled optically lighter so weights
match. ([Material 3 Icons], [Dutchicon])

**CC-9a · NEVER use emoji as UI icons** (🚗 🧺 🔥 ☀️ ⭐ …). Emoji render in fixed
multi-color across platforms, so they **inject 5–10 uncontrolled hues** and break the
single-accent rule instantly — this is one of the most common reasons an AI-built screen
"looks random/noisy." Emoji also vary per OS and ignore your stroke/size system. Use a
**single line-icon set** (Lucide, Heroicons, Phosphor) in **`currentColor`**, tinted
greyscale or the accent — not emoji. Emoji are acceptable *only* as user-generated content
(a reaction, a name a user typed), never as interface chrome (list bullets, nav, status,
category markers, favorite stars).

**CC-9b · Avoid the "AI-generated" icon-chip cliché.** The opposite failure from emoji: a
**generic Lucide line-icon inside an identical pale-tinted rounded-square chip** (`bg-{accent}-50
rounded-lg p-2` + icon), repeated for *every* feature card, step, and bullet. Because every AI
agent reaches for the same default icon set and the same default chip treatment, this exact
pattern has become one of the most recognizable "a coding agent built this" tells — coherent, but
anonymous. Escape it by choosing at least one: (a) **drop the chip** and let a slightly larger
mono icon sit inline with the heading; (b) vary treatment by role instead of one uniform chip;
(c) use an icon set with more character (Phosphor duotone, a custom set) or a signature accent
shape; (d) replace decorative feature-icons with **numbered/typographic markers** (01 · 02 · 03).
Icons should earn their place, not auto-decorate every row. One distinctive treatment beats the
default chip on everything.

**CC-9c · Don't let the escape hatch become the new uniform (the 2nd-generation tells).** When
every agent flees the same cliché through the same exit, the exit becomes the next cliché. Already
recognizable as "an agent did this":
- **Ghost index numbers (01 · 02 · 03) on every section** — great once, a tell when it's the
  default replacement for every icon chip
- **UPPERCASE-overline + big-number card** repeated identically for every KPI
- **Text-left / visual-right hero + two pill CTAs + a rating row** — the stock DTC composition
- **The symmetric 8+4 / 8+4 dashboard grid** — correct, but machine-neat

The rule: **pick ONE signature treatment per project and vary the section anatomy.** Rotate from a
wider menu — oversized serif index on the *single most important* step only, hairline-joined grids
(one border-box, no per-card chrome), side-margin labels, inline annotations/underlines, a
full-bleed color band for ONE section, bento variation (one 2×-weight cell), numbered *text*
headers (no ghost styling). If two adjacent sections have identical anatomy (marker + heading +
body ×N), redesign one of them. Signature = used once or twice with intent; uniform = the tell.

**CC-9d · Distinctive must not cost freshness ("generic → dated" is a different failure, not an
escape).** Overshooting the editorial direction — a full beige/paper page background + a serif
face on *everything* + heavy ink blocks — stops reading "designed" and starts reading "government
pamphlet / insurance terms," especially in Korean (명조 전면 사용 = 신문/약관 느낌). The modern
floor:
- **Base stays fresh**: page background white or near-white; warm/tinted paper tones are a
  *section* accent (one band, a card), never the whole canvas.
- **Serif is seasoning, not the diet**: display serif on the hero headline or ONE key number —
  body, labels, UI chrome stay in a modern sans (Pretendard/Inter). Never serif body on a SaaS/
  product surface. Prefer contemporary serifs (Fraunces, Newsreader; KR: 본명조 display cuts) over
  dated ones.
- **Keep the air**: distinctive treatments must preserve whitespace and lightness — density +
  dark blocks + serif compounds into "old", not "premium".
- Quick self-check: *"would this pass as a 2026 product site, or does it look like a 2010s
  brochure?"* If unsure, pull the base back to white and re-check.
**CC-10 · One state-layer ramp everywhere** (Material 3 canonical: hover **8%**, focus
**10%**, pressed **10%**, dragged **16%**; disabled = 38% content / 12% container) — a
translucent overlay of the on-color, one state at a time. Transitions **150–200ms**
for hover/press, ~300ms for larger moves, one shared easing; animate transform &
opacity, not layout. *"Polished" = layered low-opacity shadow + crisp focus ring +
real hover/active/disabled states + on-grid spacing. "Flat/unfinished" = one hard
shadow, no focus state, color-only errors, off-grid spacing.* ([Material 3 States])

---

## §C4 — Color & dark mode

**CL-1 · Build every color as a ramp,** 9–11 steps (`50 → 950`), **500 = base**. Author
in **HSL / OKLCH / LCH, never raw hex** — and **raise chroma at the extremes** (L<20%,
L>90%) to fight wash-out. *Why: hue/saturation/lightness map to human vision; hex
doesn't.* ([Refactoring UI Color], [UX Bootcamp HSL])

**CL-2 · One accent + a full grey ramp.** Greys (8–10 steps) carry text/surfaces/borders.
Add only **4 semantic hues** — success/warning/error/info — used strictly by meaning,
never decoration. Prefer role-named **semantic tokens** (`primary`, `surface`, `error`)
so themes swap automatically. ([Refactoring UI], [Apple HIG Color])

**CL-2a · Status color is for *severity*, not for every row.** The fastest way to make a
list look noisy is to put a colored badge on **every** item. Rules: (1) **A normal / OK /
"보통" / default state is NEUTRAL grey — never colored.** Color is an exception that means
"look here," so coloring the default makes everything shout and nothing reads. (2) Map color
to severity **consistently**: positive/good = success green (or neutral), needs-attention =
warning amber, bad/blocked = error red — and the same score must always get the same color.
(3) Reserve color for the **minority** of items that actually need attention; if most rows
are "fine," most rows are grey. (4) Pair the color with text/icon (CL-4) so it survives
colorblindness and greyscale. *A screen where 80% of badges are colored has no hierarchy.*
For the **soft chip background** behind a status label, use the skin's tint tokens —
`bg-success-tint`, `bg-warning-tint`, `bg-destructive-tint`, `bg-info-tint` (a foreground
of the matching `text-success`/`text-warning`/… ) — **don't hand-mix a one-off hex**; the
tints auto-adapt to dark mode.

**CL-2b · No decorative hues.** Favorite stars, category dots, avatars, section markers, and
illustrations must use the **accent or the grey ramp** — not a new color each (gold stars,
rainbow category dots, a different hue per card). Decoration is exactly where the 2nd, 3rd,
4th accent sneaks in. One accent + greys, everywhere, including the "fun" bits.

**CL-2c · Favorite / saved / rating affordances use shape, not a special color.** A
bookmark/favorite/star/heart toggle conveys on/off by **fill, not hue**: **filled in the
accent = on, outline in grey = off** (or filled grey if the accent is already busy nearby).
A rating shows N filled accent/grey icons of M. Do **not** reach for gold stars, a red heart,
or any one-off color — that's a hidden second accent. This is the compliant way to express
"saved/favorite," so the affordance never has to be dropped for coherence.

**CL-3 · Tint your greys.** Give the neutral ramp a **5–15% tint** toward the brand hue
(or a deliberate warm/cool bias), consistent across all steps. **No pure `#000` text** —
use the 900/950 neutral. *Why: pure grey looks lifeless and clashes with the accent.*
([Refactoring UI neutrals])

**CL-4 · Contrast floors (WCAG 2.2 AA):** body **≥4.5:1**, large text (≥24px / ≥18.66px
bold) **≥3:1**, UI components & graphics **≥3:1**. AAA = 7:1 / 4.5:1. **Never convey
info by color alone** — pair with text/icon/shape. ([WCAG 2.2], [WebAIM])

**CL-5 · Dark mode is not an invert.** Base = **#121212** (not `#000`); raise elevation
with white overlays (~5% @1dp, 8% @2dp, 12% @8dp, 16% @24dp). **Desaturate accents
~25%** (Material: primary tone 40→80). Re-derive each role from the tonal palette.
([Material Dark Theme], [Material 3 Color])

---

## §C5 — Data visualization

**CD-1 · Three palette families:** **categorical** (distinct hues, unordered — cap usable
at **~6–8**; beyond that, group "Other" or use small multiples) · **sequential** (one hue,
light→dark = low→high) · **diverging** (two hues meeting at a neutral midpoint, for ± around
a reference). ([IBM Carbon Data-viz], [ColorBrewer])

**CD-2 · Choose the chart from the data question** (FT Visual Vocabulary): deviation,
correlation, ranking, distribution, change-over-time, part-to-whole, magnitude,
spatial, flow. Don't use a pie for a trend. ([FT Visual Vocabulary])

**CD-3 · Maximize data-ink / cut chartjunk:** kill 3D, gradients, shadows, heavy
gridlines, borders. **Direct-label instead of legends** (also helps color-blind users
and cuts eye travel). ([Tufte data-ink], [NN/g Clutter])

**CD-4 · Number craft.** Tabular numerals, **right-aligned** numbers (decimals stack),
left-aligned text labels. A single KPI = **one big bold number + ▲/▼ delta + inline
sparkline**; a big number beats a chart when the answer is one value. KPIs 4-per-row,
≤2 rows. Series **≥3:1 vs background**; colorblind-safe; always offer **"View as data
table."** ([Five Rules for Tables], [Tufte sparklines])

---

## §C6 — 2025–2026 trends: durable vs fad

**Durable** (adopt): design tokens for every value · **bento grids** (mixed-size cards,
8pt gaps) for overview/dashboard surfaces · **big type** as a hierarchy tool · matured,
*subtle* glassmorphism (Apple Liquid Glass — translucency + real-time lensing, not
heavy blur) · **soft layered shadows** · **curated information density** (Linear/Notion/
Stripe — pack more per screen but let hierarchy carry it) · transparent, controllable
**AI UX**.

**Fad / use sparingly** (brand-expression only): neumorphism (fails contrast) ·
neubrutalism (poor for dense/utility UI) · kinetic/morphing type in product chrome ·
hiding info behind clicks in the name of minimalism · low-contrast "calm" palettes
that drop below the 4.5:1 floor.

**AI-product UX specifics:** stream output with explicit **listening → thinking →
doing** states + a **Stop** button; place **citations inline next to the claim** with
meaningful labels; use **neutral, non-anthropomorphic** copy + a "verify outputs"
disclaimer near the input; never present step-by-step "reasoning" as ground truth.
([NN/g Explainable AI], [Envato Trends], [MyDesigner Density])

---

## Sources

Refactoring UI (Wathan & Schoger) · Material Design 3 (type / spacing / elevation /
shape / color / state layers / dark theme) · Apple Human Interface Guidelines
(typography / color / layout / materials) · IBM Carbon (2x grid / spacing / data-viz
palettes) · WCAG 2.2 (W3C) & WebAIM (contrast) · Butterick's *Practical Typography* ·
FT Visual Vocabulary & Edward Tufte (data-ink, sparklines) · Nielsen Norman Group
(chart clutter, explainable AI) · Josh W. Comeau & Tobias Ahlin (CSS shadows) ·
Cloud Four (nested radius) · Baymard Institute (line length) · Atlassian Design,
Shopify Polaris, EightShapes, Cieden, Designary (spacing & type systems).

*Numbers are sourced defaults; treat the structural laws (one-choice-per-axis,
layered shadows, nested radius, proximity, contrast floors) as load-bearing and the
exact figures as sensible starting points.*
