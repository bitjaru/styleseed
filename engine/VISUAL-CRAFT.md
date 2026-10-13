# Visual Craft — contextual guidance for coherent UI

DESIGN-LANGUAGE.md tells you the **rules**. METHODOLOGY.md tells you **why** they
exist. This file tells you the **craft** — the concrete, numeric decisions that
separate "designed by one mind" from "assembled from parts": how to make a
component look intentional, how to space it, which type to pick for which kind of
app, and — most importantly — how to keep the *whole* UI **coherent**.

This guide combines design-system guidance with contextual craft heuristics; not every
number is an empirically validated threshold. Preserve the approved project system.
Numbers and techniques below are starting points; task fitness and rendered evidence decide.
Contrast, operability, truthful content, and other core floors remain binding.

> **Read this:** before scaffolding a new product surface, and whenever a UI
> "looks off" but you can't say why. Pair with **APP-PLAYBOOKS.md** (domain bias)
> and **PAGE-TYPES.md** (screen bias).
>
> **Priority:** `PRODUCT-PRINCIPLES.md` → output grammar (`RULESETS.md` or compiled) →
> `ADAPTERS.md` → domain/page → brand recipe → optional profile → bounded lock. This file refines craft within
> that composed method; it never overrides it.

---

## §C0 — The Coherence Laws (read this first)

Unexplained changes in repeated roles make an interface harder to read: the same
control changes shape, severity changes color, or identical layers imply different depth.
Judge these relationships against the approved system, not against one preferred look.

**The meta-law: encode a repeatable relationship between roles, not one identical
value for every component.** Coherence means the same decisions repeat under the
same conditions. Sharp panels, rounded controls, and circular avatars can coexist
when their roles are explicit in the approved system. The examples below are defaults.

| Axis | Coordinate system-wide | Failure mode |
|---|---|---|
| **Corner / radius** | A role-based token family for containers, nested surfaces, controls, and avatars. Follow the recipe and approved project system. | The same component role changes shape without a reason. |
| **Shadow** | A depth/material family where depth is needed; direction, softness, and tint follow that intent. | Equivalent layers imply unrelated materials or depth. |
| **Color roles** | Identifiable actions in each decision region; stable status, category, brand, and content roles. | Conflicting emphasis or unstable meanings collapse hierarchy. |
| **Spacing unit** | The approved token scale, with documented optical, script, canvas, or platform adjustments. | Unexplained local gaps obscure grouping or alignment. |
| **Icon style** | A coordinated family with documented optical sizes and selected/unselected variants. | Unrelated icon languages or inconsistent state meanings. |
| **Type scale** | Coordinated display, reading, utility, numeric, and script-fallback roles. | Arbitrary role changes impair hierarchy or reading. |
| **Motion / easing** | One duration set (~150/200/300ms) + one easing family; same enter/exit logic everywhere. | Some snappy, some sluggish = feels like different apps. |
| **Border** | Role tokens for separators, controls, focus, and errors; widths and contrast may differ by purpose. | Random boundaries or invisible required focus/control edges. |
| **State layers** | Repeatable feedback per control role; links may underline while buttons change fill. | The same state on the same role behaves unpredictably. |
| **Control height** | Buttons, inputs, selects share a height set (e.g. **40px** default). | A 44px input next to a 32px button breaks the baseline. |

**Treat unexplained drift within a role as a violation, not variation between
documented roles.** Reuse approved decisions rather than inventing local exceptions.

---

## §C1 — Spacing & rhythm

**CR-1 · Reuse the approved spacing scale.** Without one, start from
`{2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96}`px. These are examples, not a ban on
7px or 13px. Optical alignment, script, canvas, and platform constraints may justify
other tokens. Explain the role and inspect repeated uses.

**CR-2 · Proximity communicates relatedness.** Make groups distinguishable from
items within them. Around twice the internal gap is a useful starting point when
space alone groups content. Dense panels may use alignment, tone, or a hairline
instead. Check that the visual groups match the information groups.

**CR-3 · The form spacing ladder.** label→input **4–8px** · field→field **12–16px** ·
section→section **24–32px** mobile / **32–48px** desktop. Each tier ~doubles the last,
so hierarchy is unambiguous. ([Designary], [Atlassian Spacing])

**CR-4 · Padding follows content and containment.** Starting ranges: compact
12–16px, standard 16–24px, marketing 24–32px, display 48px+. Shared alignments and
readable internal groups matter more than equal padding on every edge. Clear
boundaries can support an outer gap smaller than a panel's inner padding.

**CR-5 · Adjust space to the task.** Generous space can clarify reading and a brand
promise; excessive space can separate related controls or hide comparison evidence.
Start from the selected density and test with real content.

**CR-6 · Use the lightest effective separation for the context.** Whitespace,
alignment, tone, hairlines, and depth are options, not a mandatory sequence.
A dense inspector may need a hairline; an overlay may need both a boundary and
shadow. Remove boundaries that duplicate a signal without helping comprehension.

**CR-7 · Bound prose for comfortable reading.** Roughly 50–75 characters per line
is a useful starting range for Latin long-form prose, not a universal limit for
labels, tables, or CJK. CSS `ch` measures the font's zero glyph, not actual character
count, and cannot be converted to one fixed pixel width. Inspect real language,
font, size, wrapping, and zoom; data regions may use a wider area.
[Baymard's line-length guidance](https://baymard.com/research-articles/line-length-readability)
supports a prose starting range, not a universal measured improvement percentage.

**CR-8 · Choose table density by task and input.** Row heights such as 32–40px
compact, 48px standard, and 56px spacious are starting points. Preserve comparable
rows, required touch targets, readable labels, and expanded/error states. Offer a
density control when repeated use benefits; do not import another system's exact
step size as a universal requirement.

**CR-9 · Don't enforce a strict pixel baseline grid on responsive web** — it assumes
fixed heights it doesn't have. Repetition of the spacing scale creates rhythm; a
baseline grid does not. ([Imperavi Vertical Rhythm])

**CR-10 · Share alignment relationships.** Establish meaningful edges, columns,
caption lines, or axes. Symmetry and a fixed column count are optional: an asymmetric
image can share its edge with a text column. Preserve alignment for numeric
comparison; inspect real wrapping. Optical correction of glyphs and icons may
improve alignment beyond their bounding boxes.

---

## §C2 — Typography

**CT-1 · Use readable type roles.** Start general body text near 16px; an approved
productive desktop scale can use 14px. WCAG does not prescribe a minimum font size.
Verify actual script, contrast, zoom, viewing distance, and task. A scale such as
`12 · 14 · 16 · 20 · 24 · 32 · 48` is an example, not a required set.

**CT-2 · Ratio by density.** dense product UI/dashboards **1.125–1.2** · general default **1.25** ·
content/editorial **1.333** · marketing/display **1.5–1.618**. Run *two* scales in one
system if needed (tight UI scale + loose editorial scale). ([Cieden Type Scales])

**CT-3 · Limit families through roles, not a font-count score.** One or two families
are economical defaults. Script fallbacks, code, data, or editorial expression may
need more when their roles are stable. Serif and sans are both valid; judge readable
roles and the relationship between type, content, and the approved brand.

**CT-4 · Tabular numerals are mandatory** (`font-variant-numeric: tabular-nums`) for
tables, money, dashboards, timers — applied to the *whole* numeric grid, never
selectively. Proportional figures inline in prose; lining figures in UI. Pick a font
with disambiguated `0/O` and `1/l/I` for anything numeric or financial.
([MyFonts Figures], [TypeType Numerals])

**CT-5 · Combine weight, size, position, and contrast.** A 400 body / 500–600 label /
700 heading ramp is a common example; font weight numbers are not optically equal
across families. Preserve the approved ramp and inspect legibility rather than
requiring a fixed weight count or judging hierarchy by size alone.

**CT-6 · Line-height tightens as type grows.** body **1.5** (long-form 1.5–1.7) ·
headings 1.2–1.35 · display/hero **1.0–1.2** · captions 1.4–1.6. *Why: big type already
reads as a shape and needs less leading; small text needs more air.* ([Butterick], [Material 3 Type])

**CT-7 · Tracking depends on font, script, size, and role.** Latin display text may
start around −0.01 to −0.03em and uppercase labels around +0.05 to +0.12em. These
are examples, not lower/upper bounds. Body usually keeps its font default; CJK and
connected scripts need their own checks. Reject collisions and impaired reading,
not a value merely outside an example range.

**CT-8 · Use the font's optical-size contract.** Prefer supported optical sizing
and the font/provider's guidance. A Text/Display split from one platform is not
a universal 19px/20px threshold. Inspect the actual loaded font at each role size.

### Type recipe by app type

Use this as the **type half** of the domain bias in APP-PLAYBOOKS.md. These are
possible starting recipes, applied only after the page task and approved type roles;
the Hero column is unused when there is no hero. Reading measures depend on language.

| App type | Typeface character | Hero | Body | Numerals | Weights | Signature |
|---|---|---|---|---|---|---|
| **Fintech** | Restrained neo-grotesque, low contrast (Inter, IBM Plex, Söhne) | 36–48 | 15–16 | **Tabular lining (mandatory)** | 400 / 500 / 600–700 KPIs | Aligned money columns, disambiguated 0/O |
| **SaaS dashboard** | Humanist screen-sans (Inter) | 28–36 | 14 (13 dense) | Tabular in tables | 400 / 500 / 600, scale 1.2 | Weight-driven hierarchy, tight density |
| **E-commerce** | Friendly humanist + optional brand display | 32–48 | 16 | Tabular for price/grid | 400 / 600 price+CTA | Bold confident price, warm body |
| **Social** | System humanist (SF Pro / Roboto) | weight-up ~20–28 | 15–17 | Proportional | 400 / 600 | Bolder-not-bigger titles, native feel |
| **Content / editorial** | High-contrast serif display + humanist body | 40–64 | 18–21 | Oldstyle/proportional in prose | 400 / 700 | Serif authority, 60–75ch measure |
| **Health** | Warm humanist sans, open counters | 32–44 | 16–18 | Proportional (tabular for vitals) | 400 / 600 | Generous air, line-height 1.6 |
| **Dev tools** | Grotesque + matched mono superfamily (Geist, Plex) | 32–48 | 14–16 (code 13–14 mono) | Tabular / mono | 400 / 500 / 600 | Mono for code/logs, Swiss precision |
| **Marketing** | Expressive oversized display + clean sans | 64–120+ | 18 | Lining proportional | 400 / 700–900 | Display-led option; image-led openings are also valid |

---

## §C3 — Component craft

### Depth & elevation
**CC-1 · Establish a reason for depth before choosing a shadow.** Flat, tonal,
soft-shadow, and intentional hard-shadow treatments can all fit a selected system.
When a soft material calls for it, layered shadows can approximate a penumbra;
the number of CSS layers is not a quality test. Coordinate direction, softness,
tint, and elevation by role. Do not require an above-left source or tinted shadow
for every material. [Josh Comeau's shadow guide](https://www.joshwcomeau.com/css/designing-shadows/)
is a technique reference, not a universal layer-count requirement.

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

**CC-6 · Make the next action clear within each decision region.** A page-level
Share action and a filter popover's Apply action can coexist because their scopes
are distinct. Use placement, label, contrast, size, and grouping appropriate to
the task; filled/outline/ghost is one possible hierarchy. A destructive confirmation
may have a locally prominent destructive action with explicit consequences and a
safe cancel/recovery path. Avoid competing actions within the same decision.

### Cards
**CC-7 · Containment serves the content.** Reuse role-based padding, radius, and
elevation tokens. Equal padding is a starting point; optical alignment or attached
media may justify different edges. Border and shadow can coexist when one defines
the boundary and the other a floating layer. Reject redundant emphasis, not the
combination itself. Hover communicates interactivity without requiring lift or scale.

### Inputs & forms
**CC-8 · Input height = button height** (default 40px; 44–48 touch). Label **above** the
field (top-aligned scans fastest); **labels never vanish** (no placeholder-as-label).
Focus ring **≥2px, 3:1 contrast**, visible on light *and* dark (WCAG 2.2). Errors
**never color alone**: red border + icon + a message saying what's wrong and how to fix
it. Rhythm: 8px label→field, 4px field→helper, 16–24px between fields. ([UX Collective Text Fields], [WCAG 2.2])

### Icons
**CC-9 · Coordinate icon family, optical weight, and state variants.** A 2px stroke
at 24px is one example. Outline default and filled selected can coexist when their
meaning is repeated and accessible; neither one fill mode nor one absolute stroke
width is mandatory at every size. Align icons optically with their labels.

**CC-9a · Use predictable functional icons.** Platform-dependent emoji are poor
substitutes for navigation, status, or action symbols because their glyphs and
meaning vary and may ignore the project's icon system. Use the approved functional
icon family with accessible labels. User content, reactions, and approved brand
illustrations have separate roles; their hue count alone is not a defect.

**CC-9b · Decorative markers need a purpose.** A generic icon chip on every feature
may add noise without explaining the product. Omit unhelpful markers or use a
project-appropriate icon, image, or typographic treatment. Repeated chips are valid
for repeated navigation or categories; switching icon sets just to appear original
is not an improvement.

**CC-9c · Preserve equivalent presentation for equivalent information.** Repeated
KPI labels, index numbers, panels, or collections are valid when they aid comparison
or navigation. Vary composition when priority, data question, or narrative role
changes. Do not impose a signature count or redesign adjacent sections merely
because their anatomy repeats. Consistent image treatment, type roles, alignment,
and content can express identity without decorative novelty.

**CC-9d · Evaluate type, surface, and imagery together in context.** Serif, warm
paper across the whole canvas, hard black, dense tool panels, and quiet neutral UI
are not violations by themselves. Judge reading, task focus, and the approved
brand language. A creator's colorful work can sit inside restrained editing chrome;
an editorial site can use serif body text. Neither a white base nor a fashion date
is a universal quality floor. Inspect real text, content, and surface relationships.

**CC-10 · Repeat state feedback by control role.** Preserve the approved project's
hover, focus, press, drag, selected, and disabled treatment. Material state-layer
percentages are implementation examples for that system, not mandatory opacity
values for every UI. Links may underline while buttons change fill. Keep visible
focus, non-color error cues, and coherent timing; motion must not delay interaction.
Flat or hard-shadow designs still need complete functional states.

---

## §C4 — Color & dark mode

**CL-1 · Map values to semantic roles.** Reuse the approved palette and its primitive
ramps. Perceptual spaces such as OKLCH are useful for generation and gamut correction;
raw hex is a valid token representation, not a design flaw. Do not hand-adjust chroma
at extreme lightness without checking gamut and contrast. `PALETTE-RECIPES.md` owns
StyleSeed's generator and validated role pairs.

**CL-2 · Assign stable roles to action, status, category, brand, and content color.**
Neutral chrome with one action accent is a useful option, not a hue-count limit.
A multicolored brand, product photo, avatar, or categorical visualization can coexist
with identifiable actions and severity. Judge conflicting emphasis and lost meaning.

**CL-2a · Status reflects actual state.** Neutral normal states can help an exception
queue; repeated green healthy states may help a monitor. Choose by the user's task,
apply the same mapping consistently, and keep anomalies easy to distinguish. Do not
recolor equivalent states to add variety or use the proportion of colored badges as
a quality score. Pair color with text/icon/shape. Use semantic foreground and tint
tokens, revalidated for each theme, instead of local color mixtures.

**CL-2b · Content color is not automatically an extra action accent.** Categories,
editorial fields, avatars, and illustrations may use their own coordinated palettes.
Record what the colors mean and which belong to content rather than controls. Check
that action, focus, and severity remain identifiable in the actual composition.

**CL-2c · Saved and rating affordances need stable meaning.** Fill/outline plus an
accessible selected state can distinguish on/off. A gold rating or red favorite is
valid when it is a maintained role, not a new ad-hoc emphasis on each component.
Retain labels or shape cues; color alone must not convey the state.

**CL-3 · Neutral temperature follows the palette.** Tinted, neutral, warm-paper,
and structural hard-black tokens are valid when the project system coordinates them.
Choose through contrast and content relationships, not a fixed tint percentage or
an automatic ban on black.

**CL-4 · Contrast floors (WCAG 2.2 AA):** body **≥4.5:1**, large text (≥24px / ≥18.66px
bold) **≥3:1**, UI components & graphics **≥3:1**. AAA = 7:1 / 4.5:1. **Never convey
info by color alone** — pair with text/icon/shape. ([WCAG 2.2], [WebAIM])

**CL-5 · Re-derive dark roles rather than inverting colors.** Preserve readable
foreground/surface pairs, focus, status, and distinguishable layers. Tonal elevation
is often useful; a fixed #121212 base, overlay percentage, or desaturation amount
is not universal. Follow the selected palette and inspect every relevant state.

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

**CD-4 · Number craft follows the question.** Align comparable numeric columns and
use tabular figures where alignment matters. A KPI needs a label, value/unit, and
interpretation context; a delta needs a real baseline, and a sparkline needs real
time-series data. Equal questions may use identical panels. Choose row/column counts
by comparison and viewport, not a four-per-row or two-row quota. Provide equivalent
accessible data; chart marks and labels meet their applicable contrast requirements.
A shared scope or legend can supply context without duplicating a footer on each chart.

---

## §C6 — Dated style signals and functional requirements

The 2025–2026 discussion of bento grids, large type, translucent materials, layered
shadows, and denser tools is a set of contextual style options, not evidence that
these forms are durable or required. Mixed-size cells suit unequal priorities;
comparable data may need equal panels. Glass needs legibility and a solid fallback;
flat or hard-shadow systems remain valid. Never add a trend just to clear a score.

Judge any style by the same functional floors: readable contrast, identifiable
controls, honest content, safe interaction, and complete reduced motion. Low contrast
or hidden essential information is a defect whatever aesthetic name it uses.

**AI-product feedback:** expose actual waiting/streaming/tool/error states, cancellation
where supported, and sources near the claims they support. State uncertainty where it
matters to the decision. Avoid invented progress, anthropomorphic claims of knowledge,
or presenting generated explanations as verified reasoning. This is a functional
contract, not a requirement for a particular chat layout or animation.

## Sources

Refactoring UI (Wathan & Schoger) · Material Design 3 (type / spacing / elevation /
shape / color / state layers / dark theme) · Apple Human Interface Guidelines
(typography / color / layout / materials) · IBM Carbon (2x grid / spacing / data-viz
palettes) · WCAG 2.2 (W3C) & WebAIM (contrast) · Butterick's *Practical Typography* ·
FT Visual Vocabulary & Edward Tufte (data-ink, sparklines) · Nielsen Norman Group
(chart clutter, explainable AI) · Josh W. Comeau & Tobias Ahlin (CSS shadows) ·
Cloud Four (nested radius) · Baymard Institute (line length) · Atlassian Design,
Shopify Polaris, EightShapes, Cieden, Designary (spacing & type systems).

*Applicability and evidence matter more than numeric conformity. Required accessibility
and functional floors remain intact; token examples, layer counts, and aesthetic treatments
remain contextual. Static reference observations do not prove mobile usability, motion
quality, conversion lift, or expert acceptance.*
