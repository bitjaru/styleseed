---
name: ss-dial
description: Turn one design axis up or down — "denser", "bolder", "flatter", "livelier", "sharper corners". Use for a single-axis change, not a mood word (those go to /ss-restyle); updates the lock and re-runs the gate.
argument-hint: "<axis> <direction>  — e.g. \"density denser\", \"radius sharper\", \"color more-muted\", \"weight bolder\""
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Dial an axis
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

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
- Neither a valid registry nor a legacy lock exists → establish setup before dialing; do not restart setup on registry errors.

## The mechanic (every axis)

1. Resolve the artifact boundary above. If either registry file exists, require a valid complete
   registry. Read project DNA from `.styleseed/project.json` and the target artifact config;
   never create or update `STYLESEED.md` as a registry fallback. With no registry, read that legacy lock.
2. Identify the axis and its supported current value. Move one supported step for “more/less”;
   explicit targets must validate. If already at the end, report that without inventing a value.
3. Apply the change only to the requested artifact or component scope. Project-wide token changes
   are appropriate only when the requested scope is project-wide; resolve every affected artifact.
4. Preserve unrelated axes and approved project tokens. The tables below are contextual examples,
   not permission to overwrite an approved design system or force unsupported registry values.
5. Persist supported values in the authoritative project/artifact configuration, then recompile.
   For legacy projects, update the corresponding lock and implementation tokens. If an axis cannot
   be represented, state that limitation instead of writing an invented enum or silently remapping it.
6. During an authorized change, run the affected code and rendered gates. Report exact scope,
   before/after values, tradeoffs, and remaining failures; a score is not visual or human acceptance.

---

## The axes

### 1. Density and spatial rhythm

The supported density ramp is `compact → comfortable → spacious` in both the registry and this
workflow. Terms like “airy” or “dense” are descriptions, not additional registry values. Density
is a starting posture; do not automatically change type size, line-height, or every spacing token.

For “sections farther apart”, “less padding inside cards”, or “more room on mobile”, use the
installed resolver's [spatial roles guide](../ss-resolve/references/spacing.md). It defines six
independent roles, project defaults, artifact overrides, and base/wide values. A role adjustment
is a single-axis operation even when it does not change the qualitative density enum.

- Recommend by task and grouping, inspecting existing tokens first. The read-only
  `ss-resolve/scripts/recommend-spacing.mjs --project-root . --artifact <id>` offers an unapplied
  starting proposal for registry product UI; its values are not a measured diagnosis. Use the guide
  to inspect current bindings and attach `--measurement` for targeted diagnostic advice before
  changing numbers. Preserve native fallback tokens at nested artifact boundaries.
- Persist only requested roles in `artifact.spacing.roles`; use project `spacing` only for an
  authorized project-wide change. An overridden role replaces both its responsive values.
- Recompile and map the bundle's scoped CSS variables to the implementation. Preserve undeclared
  roles and remove obsolete copied mappings when a role is removed.
- Keep labels/help/controls related, comparison rows regular, and independent sections distinct.
  A marketing narrative and an operational table need different rhythms.
- Gutters adapt to the project and viewport; no universal `px-6` or mandatory 8px grid. Preserve
  readable text and applicable accessibility floors. Whitespace reduction must not shrink hit targets.
- Legacy/non-web projects preserve their native tokens; do not invent registry spacing support
  or trigger a migration to complete a local adjustment.

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
- **Scope is explicit.** Apply all uses of a changed token within the authorized boundary; do not propagate an artifact adjustment into unrelated screens.
- **Clamp at the ends.** Bounded ramp, not an infinite "more" — if already at `spacious`/`sharp`/
  `bold`, say so and stop.
- **Guardrails beat the dial.** Preserve task fitness and applicable accessibility requirements;
  the current artifact bundle and approved project tokens govern contextual visual choices.
- **Persist + re-gate.** Update the authoritative registry config, or the legacy lock only when
  no registry exists, then recompile and run affected code and rendered gates. Report
  `axis: old → new`, scope, and actual evidence; do not treat a score as visual acceptance.
