---
name: ss-restyle
description: Re-style a project to a named aesthetic — swiss, editorial, technical, warm-dtc, minimal-mono, brutalist-lite. A preset is a *coordinate* across the dial axes (radius + density + color + weight + motion) plus a font, accent family, and one signature move — applied coherently as a single identity, written to the lock, and re-gated. This is for mood words ("more editorial") that aren't one axis; for a single axis use /ss-dial.
argument-hint: "<preset>  — swiss | editorial | technical | warm-dtc | minimal-mono | brutalist-lite"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Re-style to a preset

A mood word — "make it more editorial", "give it a Swiss feel" — is **not one axis**. It's a
defined *position across several* (this radius **and** that density **and** that color
temperature **and** that weight **and** that motion), tied together with a font and one
signature move. Left to plain language, the model resolves it differently every time and half
the axes drift. `/ss-restyle` pins the whole coordinate at once, **coherently**, and re-gates.

Each preset below is a full identity, not a filter you stack on top of another. Applying two
presets = the mixed-personality tell we ban. Pick one; it *replaces* the look.

## When NOT to use

- Moving a single axis ("denser", "sharper", "more muted") → `/ss-dial`.
- No `STYLESEED.md` yet → `/ss-build` / `/ss-setup` first (a restyle rewrites a lock; it needs one).
- A brand with a fixed hex → keep the accent, use `/ss-dial` for feel; don't let a preset
  overwrite a real brand color (presets *suggest* an accent family — honor an existing lock's hue).

## The mechanic

1. **Read `STYLESEED.md`.** Keep anything the user has explicitly locked (a real brand hex, a
   required font) — a preset fills the *unopinionated* axes, it doesn't overrule a deliberate choice.
2. **Set the preset's coordinate** — apply each field below via the same coordinated token sets
   `/ss-dial` uses (radius mapping table, density ramp, color HSL + tint re-derive, weight ramp,
   motion seed), plus the font and elevation language. System-wide, every file — grep the tokens.
3. **Hold the modern floor (§CC-9d).** Distinctive must not read *dated*: white/fresh base, serif
   as seasoning (one display moment, never body), keep the air. A preset that turns into a beige
   serif brochure has failed, not succeeded.
4. **Rewrite the lock** — Skin/Mood/Accent/Font/Radius/**Elevation (enum value)**/**Density**/
   **Palette mode**/Motion/Type + a one-line `Signature move`, **and set `Preset: <name>`** — this field is the handshake the gate reads:
   `/ss-score` re-keys its deductions to the preset's language (v2.11), so brutalist borders or
   an editorial serif body are scored as the locked style, not as violations of the default skin.
   This is now the source of truth for every later prompt.
5. **Re-run the Quality Gate** (`/ss-score`, loop to ≥ 80 — it scores lock-relative, so the
   preset's own defining traits are legal). Report: preset applied, the coordinate, the score.
   A restyle that scores < 80 is fixed before presenting — a named look is no excuse for
   incoherence (mixed axes, missing states, contrast failures still fail under any preset).

---

## The presets (coordinate = radius · density · color · weight · motion)

### `swiss` — grid honesty, typographic confidence
`sharp · compact · muted-cool · bold · calm`
- **Font:** a neutral grotesk (Inter / Helvetica Now feel), tight tracking on display.
- **Accent:** restrained — near-neutral, or a single strong signal (classic Swiss red `#D6291E`)
  used sparingly. One accent, lots of black/white/grey.
- **Elevation:** flat — hairline borders and whitespace do the separating, not shadows.
- **Signature:** a strong asymmetric grid, oversized left-aligned headline, generous but
  *structured* space. Numbers and labels align to the grid. No ornament.

### `editorial` — magazine, serif as seasoning
`soft · airy · warm-muted · regular · calm`
- **Font:** a serif display (Fraunces / Newsreader) for headlines **only**, Inter/neutral sans for body.
- **Accent:** a warm muted ink — oxblood `#7B2D26`, forest `#2F4A3C`, or deep amber. Muted, not loud.
- **Elevation:** subtle; content leads, chrome recedes.
- **Signature:** one oversized serif headline moment, a wide reading measure (`max-w-2xl/3xl`),
  strong first-paragraph emphasis. **Modern floor:** white base, serif is the seasoning — body
  stays sans, don't tip into a paper-and-serif pamphlet (§CC-9d).

### `technical` — dark, dense, instrument-panel
`sharp · dense · cool · regular · still` (dark-first)
- **Font:** Geist / IBM Plex Sans; mono (Plex Mono / Geist Mono) for IDs, SHAs, timestamps, metrics.
- **Accent:** one signal hue on dark — teal `#2DD4BF`, lime, or amber — used for state, not decoration.
- **Elevation:** the **dark tonal ramp** — page < card < raised by surface lightness + hairline
  borders. No drop shadows.
- **Signature:** high data density (dense dial), mono numerics with `tabular-nums`, tonal
  surfaces, minimal motion (still). Chrome scale: h1 22–24px, KPI 48–64px.

### `warm-dtc` — consumer, friendly, product-forward
`pill · airy · warm-vivid · bold · lively`
- **Font:** a rounded/friendly grotesk; large, confident.
- **Accent:** warm and vivid — terracotta `#C14E24`, coral, or amber-brown. (Cool blues read
  corporate here — avoid.)
- **Elevation:** subtle → layered; soft, inviting depth.
- **Signature:** big product imagery, pill controls, generous space, `lively`/Spring micro-motion
  on CTAs. One warm accent; if it collides with the success green, resolve per the lock's
  `Semantic resolve`.

### `minimal-mono` — whitespace and restraint
`soft · airy · muted · light · calm`
- **Font:** one neutral sans; weight and size do all the work (no second family).
- **Accent:** near-monochrome — a single restrained accent used *rarely* (one CTA, one active state).
- **Elevation:** flat → subtle; mostly hairlines and air.
- **Signature:** dominant whitespace, light weights, a single small accent moment, one clear
  focal element. The discipline *is* the design — resist adding anything.

### `brutalist-lite` — raw, high-contrast, but still coherent
`sharp · comfortable · vivid · bold · snap`
- **Font:** a bold grotesk, oversized headlines; can go heavier than usual.
- **Accent:** one loud hue against black/white. Still **one** accent — loud ≠ rainbow.
- **Elevation:** flat with **hard 1–2px borders** as the personality (borders do separation here,
  which is allowed *as the deliberate style* — no soft shadows mixed in).
- **Signature:** heavy borders, blocky high-contrast sections, snappy instant motion, exposed
  structure. **"lite" = still coherent:** one accent, one border weight, states and a11y intact,
  gate ≥ 80. Raw is the look; broken is not.

---

## Rules

- **One preset replaces the look — never stack two** (that's the mixed-personality tell). To
  nudge from a preset, use `/ss-dial` on a single axis afterward.
- **Honor deliberate locks.** A real brand hex or a user-chosen font survives a restyle; the
  preset fills the rest. Say what you kept.
- **System-wide.** Apply the coordinate across every file, not the screen in view.
- **Modern floor always (§CC-9d).** Distinctive must not cost freshness — white/fresh base, serif
  as seasoning, keep the air. Dated ≠ distinctive.
- **Persist + re-gate.** Rewrite `STYLESEED.md` to the new coordinate, then `/ss-score` to ≥ 80.
  Report the preset, the coordinate, and the score.
