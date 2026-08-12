---
name: ss-dial
description: Turn ONE design axis up or down as a coordinated, deterministic transform — "denser", "sharper corners", "more muted", "bolder", "flatter", "livelier". Not a vibe the model reinterprets each time; a defined ramp that moves many tokens together, respects the guardrails (8px grid, a11y floors, single accent, nested-radius), updates the lock, and re-runs the gate. Use this when a human saying "more X" would otherwise get an inconsistent one-off.
argument-hint: "<axis> <direction>  — e.g. \"density denser\", \"radius sharper\", \"color more-muted\", \"weight bolder\""
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Dial an axis

"Make it more minimal" is something you can just *say* — the model already reads plain
language. A skill only earns its place where **one word must move many tokens at once, in a
coordinated way, without breaking a rule** — and where doing it by hand gives an inconsistent
result (some tokens changed, the grid broken, a second accent introduced). That's what
`/ss-dial` is: **not interpretation, but a deterministic ramp + guardrails + re-gate.**

If the request is a *mood word* ("more premium", "more editorial", "more playful"), that's not
one axis — it's a *combination* of positions across several axes. Use **`/ss-restyle
<preset>`** for those. `/ss-dial` moves exactly one axis.

## When NOT to use

- A vague vibe the model can just apply from words ("cleaner", "nicer") → don't wrap it in a
  skill; say it.
- A named aesthetic (Swiss / editorial / brutalist) → `/ss-restyle` (a preset of dial positions).
- Changing the accent *hue itself* (rebrand) → edit the lock's Key color directly, then re-derive.
- No `STYLESEED.md` lock yet → run `/ss-build` or `/ss-setup` first; there's nothing to dial from.

## The mechanic (every axis)

1. **Read `STYLESEED.md`** — find the axis's current position (Mood/Density/Radius/Elevation/
   Type scale/Font weight/Motion fields). If the lock doesn't record it, infer it from the code.
2. **Move ONE position** in the requested direction on that axis's ramp (below). "more X" = one
   step; an explicit target ("density: dense") jumps straight there. **Clamp at the ends** — you
   cannot dial past `dense` or below `airy`. If already at the end, say so and stop (this is why
   "each use makes it *more*" is bounded, not runaway).
3. **Apply the whole coordinated token set** for the new position across every file that uses
   those tokens — not just the one component in view. This is the point: system-wide, consistent.
4. **Respect the guardrails** (each axis lists its own). Never break a Golden Rule to satisfy a
   dial — if "denser" would push a touch control below 44px, stop at the floor and note it.
5. **Update `STYLESEED.md`** with the new position (so it persists and the next prompt obeys it).
6. **Re-run the Quality Gate** (`/ss-score`, loop to ≥ 80). A dial that drops the score below 80
   is reverted or fixed, not shipped. Report: axis, old → new position, score.

---

## The axes

### 1. Density — spacing rhythm + internal padding + type/line-height, together

Ramp: `airy → comfortable → compact → dense`. The page gutter stays `px-6`/`mx-6` always
(fixed rule); density moves the *vertical rhythm, card interior, and reading scale*.

| Position | Section `space-y` | Card padding | Grid `gap` | Body line-height | Type scale |
|---|---|---|---|---|---|
| **airy** | `space-y-10` | `p-8` | `gap-8` | `leading-relaxed` | one step up (desktop-larger) |
| **comfortable** | `space-y-6` | `p-6` | `gap-6` | `leading-normal` | surface default |
| **compact** | `space-y-4` | `p-4` | `gap-4` | `leading-normal` | surface default, tighter headings |
| **dense** | `space-y-4` | `p-4` | `gap-3` (12px half-step) | `leading-snug` on data | data-table scale |

**Guardrails:** stay on the 8px grid (only `p-2/4/6/8`, `gap-*` on grid or the 4px half-step —
never invent `p-5`/`gap-2.5`); **touch controls stay ≥ 44px even at `dense`** (shrink padding,
not tap targets); body never drops below the surface floor (desktop 16px). Dense is for
data-heavy surfaces; don't dense-ify a marketing landing.

### 2. Hierarchy contrast — the size/weight gap between levels

Ramp: `subtle → balanced → strong → dramatic`. Moves the ratio between the hero and the body,
plus display tracking.

| Position | Hero : body size ratio | Display weight | Display tracking |
|---|---|---|---|
| **subtle** | ~2:1 | 600 | `-0.01em` |
| **balanced** | ~2.5:1 | 700 | `-0.02em` |
| **strong** | ~3.2:1 | 700–800 | `-0.02em` |
| **dramatic** | ~4:1 | 800 | `-0.03em` |

**Guardrails:** pick sizes from the Font Size table only (don't invent); body stays at the
surface floor regardless; keep the number-to-unit 2:1 pairing intact; one focal element still
dominates (dialing contrast up must not create two competing heroes).

### 3. Radius — the corner personality (categorical swap, not a slider)

Ramp: `sharp ↔ soft ↔ pill`. Swaps the **whole mapping table** as one set, never one component.

| Position | Controls (btn/input/chip) | Cards | Inner panels |
|---|---|---|---|
| **sharp** | 2–4px | 6–8px | 4–6px |
| **soft** | 8–10px | 12–16px | 10–12px |
| **pill** | full (9999px) | 20–24px | 14–16px |

**Guardrails:** one personality *everywhere* (sharp cards + pill buttons is the exact
mixed-personality tell we ban); nested elements still follow `inner = outer − padding`.

### 4. Elevation / depth — how surfaces separate

Ramp: `flat → subtle → layered → lifted`. **Light and dark speak different languages** — apply
the one that matches the theme.

| Position | Light (shadow, ≤8% opacity) | Dark (tonal + hairline) |
|---|---|---|
| **flat** | no shadow; 1px hairline border | page = card tone; hairline only |
| **subtle** | `0 1px 3px /4%` | one surface step + hairline |
| **layered** | `0 1px 3px /4%` + `0 4px 12px /8%` | two surface steps + hairline |
| **lifted** | add `0 8px 24px /8%` on raised | three steps; brightest = highest |

**Guardrails:** never exceed ~8% shadow opacity in light; **never a drop shadow in dark** (use
the tonal surface ramp + hairline borders); one shadow language / one light direction across
the whole UI.

### 5. Color — saturation and temperature (two sub-dials, accent stays single)

`saturation: muted ↔ balanced ↔ vivid` · `temperature: cooler ↔ neutral ↔ warmer`. Shifts the
**one** accent in HSL and re-derives its tints; may nudge the neutral greys' chroma. Does NOT
add a hue.

| Sub-dial | Move | Applies to |
|---|---|---|
| **more-muted** | accent saturation −10–15% (HSL S) | `--brand` + re-derive `bg-*-tint` at 10–14% alpha |
| **more-vivid** | accent saturation +10–15% | same |
| **warmer** | hue toward 20–40° (amber/terracotta) | `--brand`; optionally greys +2–4% warm chroma |
| **cooler** | hue toward 200–220° (blue/teal) | `--brand`; greys toward cool |

**Guardrails:** still **one accent** — this shifts the existing hue, never introduces a second;
tints follow the 10–14%-alpha-over-card formula (light + dark); accent keeps ≥4.5:1 where it
carries text; a warm/cool grey shift must stay near-neutral (chroma ≤ ~6%), not become a tint.

### 6. Font weight — the weight ramp

Ramp: `light → regular → bold`. Shifts the whole weight scale up/down by one notch, keeping the
*spread* (so hierarchy survives).

| Position | Body | Labels / nav | Headings / metrics |
|---|---|---|---|
| **light** | 400 | 400–500 | 600 |
| **regular** | 400 | 500 | 700 |
| **bold** | 500 | 600 | 700–800 |

**Guardrails:** keep contrast between levels (don't make everything one weight — that flattens
hierarchy); body ≤ 500 for readability at length; CJK weight does the work tracking can't.

### 7. Motion energy — seed + durations

Ramp: `still → calm → lively → energetic`. Swaps the motion seed and scales durations globally.

| Position | Seed | Durations | Character |
|---|---|---|---|
| **still** | none | instant / color-only | no entrance motion |
| **calm** | Silk / Snap | 100–200ms, ease-out | smooth, restrained |
| **lively** | Spring | 200–350ms, slight overshoot | responsive, alive |
| **energetic** | Spring / Pulse | 250–400ms, visible spring | bouncy, playful |

**Guardrails:** **numbers, balances, and money never animate** at any level; always honor
`prefers-reduced-motion`; scroll-linked/parallax/3D is surface-scoped (§43 — forbidden on app/data
surfaces, allowed as the Cinematic tier on marketing/landing pages; scroll-JACKING banned everywhere);
motion never delays content
or blocks an action.

---

## Rules

- **One axis per call.** A mood word ("premium") is a *combination* → `/ss-restyle`, not this.
- **System-wide, or don't.** Applying a position to one component and not the rest re-creates the
  incoherence this skill exists to prevent. Grep the token across the project and move all of it.
- **Clamp at the ends.** Bounded ramp, not an infinite "more" — if already at `dense`/`sharp`/
  `bold`, say so and stop.
- **Guardrails beat the dial.** Never break a Golden Rule (grid, ≥44px touch, single accent,
  nested-radius, ≤8% shadow, no dark drop-shadow, font-size table) to satisfy a direction — stop
  at the floor and tell the user.
- **Persist + re-gate.** Write the new position to `STYLESEED.md`, then `/ss-score` to ≥ 80.
  Report `axis: old → new` and the score. A dial that lowered the score is fixed, not shipped.
