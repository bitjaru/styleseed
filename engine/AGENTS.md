# StyleSeed — design rules for any coding agent

This is the cross-agent entry point. **Codex, Amp, Gemini CLI, Windsurf, Cline, and
any tool that follows the `AGENTS.md` convention read this file automatically.**
Claude Code users get the same rules from `CLAUDE.md` (identical content, deeper API
reference). Cursor users: these same rules live in `.cursorrules`.

StyleSeed is a **design engine**: it teaches you (the agent) the *judgment* to build
professional UI — not just components, but which decision to make and why. When you
build any UI, dashboard, page, or component in this project, follow the rules below.

## Golden Rules (NEVER break these)

```
 1. All content sits in a deliberate separation language — cards+tone by default; a locked
    flat-borders/oled-black/editorial language separates with whitespace/grid/hard borders instead.
    Floating with NO separation language is the violation
 2. Colors come from the locked palette mode — default single accent (--brand) + grayscale;
    a locked brand-palette or +categorical mode is legal; hues in NO mode never are
 3. No pure black (#000) by default — darkest text ~#2A2A2A. A locked oled-black base or
    brutalist-lite/swiss preset legalizes #000 surfaces (text contrast floors stay)
 4. Numbers 2:1 with units — 48px number + 24px unit (default; a lock declaring uniform
    numeric styling is exempt, hierarchy via weight/color instead)
 5. One spatial rhythm on the 8px grid — mobile: space-y-6 · mx-6 · px-6; desktop: container + gap-6/gap-8
 6. Never repeat the same section type consecutively — create visual rhythm
 7. Elevation, ONE language as locked (enum: layered-shadow | tonal-ramp | flat-borders |
    oled-black) — light default layered ≤8%, dark default tonal-ramp; mixing two is the fail
 8. Touch targets ≥ 44×44px on touch surfaces; pointer-first desktop controls may be 36–40px (keep focus rings)
 9. Semantic tokens only (text-brand, bg-card) — NEVER hardcode hex in components
10. Font sizes from the "Font Size by Context" table ONLY — don't guess; match scale to surface (desktop/web B2B body ≥16px, not 14px)
11. NO emoji as UI icons; also AVOID the AI cliché of a generic Lucide line-icon inside an identical pale-tinted rounded-square chip repeated for every feature — vary the treatment or drop the chip
12. NEVER ship the default/unlocked accent (generic indigo #5E6AD2/#4F46E5) or a copied demo layout — lock a domain-fit key color + font FIRST. Coherent ≠ distinctive
13. One focal point per screen — the primary must dominate; an all-even grid of same-weight cards is the "machine-composed" tell
14. After generating ANY page → run the Quality Gate below (or /ss-review); never show UI that hasn't passed.
    Gate scores LOCK-RELATIVE: read STYLESEED.md first — deductions fire on violations of the
    locked look, not deviation from the default skin. No lock = full default strictness
```

**The coherence meta-rule (the #1 fix for "looks AI-generated"):** for each axis —
corner radius, accent color, shadow, spacing unit, icon style — pick ONE value and
apply it everywhere. Mixing an axis (sharp card + pill buttons, two accents) is the
fastest tell of un-designed UI. See `VISUAL-CRAFT.md` §C0.

## When to read which file

- **`CLAUDE.md`** — tokens, component API, imports, forbidden patterns. Reference while coding.
- **`DESIGN-LANGUAGE.md`** — the 74 visual rules + composition recipes. Read **before** building a page (start with the Table of Contents, then rules 14, 18, 19, 61-63).
- **`VISUAL-CRAFT.md`** — research-backed craft + the coherence laws (one choice per axis, layered shadows, nested-radius law, type recipe by app type). Read when a UI "looks off" but you can't say why.
- **`APP-PLAYBOOKS.md`** — how to bias the rules for the app's domain (fintech, SaaS, e-commerce, social…). Read right after you know what kind of app this is.
- **`PAGE-TYPES.md`** — how to bias for the screen type (dashboard / form / landing / detail / list / settings). Domain × page-type = the actual judgment.
- **`METHODOLOGY.md`** — the *why* behind the rules (info density, hierarchy, motion vibe vocabulary).

## Design Lock — read this EVERY prompt before building UI

The #1 cause of "the design looks random / different every time" is that design decisions
live only in chat memory and drift. Fix with a project design-lock file:

1. **Look for `STYLESEED.md` in the project root.** If it exists, it is the source of truth —
   obey it every prompt; never add a second accent, a different radius, or an off-lock color.
2. **If it doesn't exist, run Quick Setup (below) and WRITE it** before scaffolding:

```markdown
# StyleSeed — Design Lock
- App domain:        fintech
- Surface:           desktop-web     # mobile-app | desktop-web (B2B) — decides the type scale
- Mood:              soft · minimal · airy · calm   # edges · feel · density · tone
- Skin:              toss            # or "custom" — NEVER the unlocked default indigo
- Preset:            (none)          # swiss | editorial | technical | warm-dtc | minimal-mono | brutalist-lite (the gate reads this)
- Palette mode:      single-accent   # single-accent | brand-palette: [#hex=role, ...] — optionally +categorical
- Key color (accent): #3182F6        # the accent (single-accent mode) — everything else greyscale
- Font:              Pretendard       # display + body, chosen (not the bare default)
- Radius personality: soft (12px)    # sharp 0-4 | soft 8-12 | pill — one everywhere
- Elevation:         layered-shadow  # ENUM: layered-shadow | tonal-ramp | flat-borders | oled-black
- Density:           comfortable     # airy | comfortable | compact | dense (one position project-wide)
- Motion seed:       Spring          # Spring | Silk | Snap | Float | Pulse
- Type scale:        desktop (body 16-18px)   # mobile-tight | desktop-larger
```

When the user later says "make it more X," update the lock *and* the UI together. The lock is
what keeps the result consistent across prompts — without it, even perfect rules drift.

## Quick Setup — MANDATORY before building (consistency comes from constraints)

**Not optional.** If there's no `STYLESEED.md` lock and you're about to build UI, this is the
**FIRST thing you do — before any code.** Skipping it is how output lands generic (default
indigo, tight type, template layout) and the user says "still looks AI-made." **If your tool
has a plan/ask mode, use it**: decide the choices below **one at a time, with the user**, then
build.

**Smart defaults — recommend, never fall back to the generic default.** Infer from product
name/domain/language/copy and propose ONE default to accept with a tap (Korean + fintech/
regulation → **Toss `#3182F6`**; premium SaaS → **Stripe**; dev/dark → **Linear**; editorial →
**Notion**). **The unlocked default indigo (`#5E6AD2`/`#4F46E5`) is FORBIDDEN as a final choice.**

1. **App type + surface** — domain (fintech / SaaS / e-commerce / social / content /
   productivity / health / dev-tools) **and surface** (mobile app vs desktop/web B2B — sets the
   type scale). Bias per `APP-PLAYBOOKS.md` + `PAGE-TYPES.md`.
2. **Mood / vibe** — ask 3–4 aesthetic calls in plain words (or propose from the skin), then
   lock. Each maps to a concrete value: **Edges** → radius (sharp 0–4 · soft 8–12 · pill) ·
   **Feel** → shadow/ornament (minimal · expressive) · **Density** → spacing+type (airy ·
   compact) · **Tone** → motion+saturation (calm · playful). Default from skin (Toss → soft·
   minimal·airy·calm; Linear → sharp·minimal·compact·calm), let the user tweak ("sharper
   corners"), lock all four. This is what makes it feel *chosen*, not defaulted.
3. **Accent (key color)** — a domain-fit color or skin (see Smart defaults), or the user's brand
   hex. **One accent only; everything else greyscale.**
4. **Font** — recommend by skin/language, don't leave the default: Korean/CJK → Pretendard ·
   fintech/SaaS → Inter · editorial → serif display + Inter · dev → Geist. State it in the lock.
5. **Motion seed** — confirm from Tone: Spring (Toss/Arc) · Silk (Stripe/Notion) · Snap (Linear/
   Raycast/Vercel) · Float · Pulse. Per moment: CTA→spring press, modal→silk, list→stagger.
6. **Write `STYLESEED.md` (the lock), build, then check** — save the choices (incl. surface +
   mood + font), apply the full rules (read `DESIGN-LANGUAGE.md` + `VISUAL-CRAFT.md`, not a summary),
   pick the type scale for the surface (desktop body ≥16px), give the page **one focal point**,
   self-check coherence (VISUAL-CRAFT §C0), then run the Quality Gate.

Confirm each choice before building. **More constraints = less variance.** For the most
consistent results, copy the rule files into the project so they're re-read every prompt —
a one-shot URL read drifts mid-session.

## Quality Gate — run this BEFORE showing the user ANY UI (non-negotiable)

Generating the UI is not "done." Before presenting it, it must pass the gate — the difference
between "looks generated" and "looks designed." Never show UI that hasn't passed.

```
□ Coherence  — ONE accent (no 2nd hue, NO emoji icons, no decorative color), ONE radius,
               ONE shadow, ONE icon set
□ Color=meaning — normal/OK/"보통" rows GREY; color only the minority needing attention; no
               rainbow list; same value → same color
□ Hierarchy  — one clear primary; numbers 2:1 with unit
□ Layout     — content in cards; 8px rhythm; gap-around-group > gap-inside
□ States     — empty + loading + error on every data surface (static mockup / landing with no
               data surface → N/A, don't fail)
□ Copy       — buttons name the action; errors help, not blame
□ Polish     — focus rings; ≥44px touch / 36–40px pointer targets; prefers-reduced-motion;
               elevation in one language (light: soft layered shadow · dark: tonal ramp +
               hairline); no pure #000
□ Not a new uniform — the cliché escape hatch isn't repeated everywhere (ghost 01/02/03 on
               every section = the icon-chip cliché reborn; see VISUAL-CRAFT CC-9c)
□ Motion by surface — app/dashboard = calm (no scroll-jacking, no scroll-linked, no 3D). But a
               marketing/landing/brand page gets the Cinematic tier (§43): scroll-LINKED reveals,
               pinned sections, subtle parallax, 3D hero, animated gradient/video bg, rich hover —
               this is how family/stripe/linear read premium; don't flag it. Guardrails: 60fps
               (transform/opacity), never blocks first read/CTA, prefers-reduced-motion = complete
               static page. Scroll-JACKING (hijacking/trapping) + animating money stay banned.
```
If the `/ss-*` skills are installed run `/ss-score` (0–100 + fix list); else self-score against
the list. **Target ≥ 80** — fix what fails, re-check (loop up to ~3×). **Then, if it renders,
finish with `/ss-verify` (the VISUAL gate)**: `/ss-score` reads the code; some tells live only in
pixels (dead whitespace, a font that didn't load, no focal, a blank empty state). Render →
screenshot → look → fix → re-render, states included. Never claim a visual pass without seeing a
screenshot. Then present + report the score. A 30-second self-review is the product.

## How to use StyleSeed

**Skill invocation differs by agent.** Claude Code uses `/ss-build`,
`/ss-score`, and the other `/ss-*` commands. Codex uses `$ss-build`,
`$ss-score`, and the other `$ss-*` skills (or selects them from `/skills`).
The `/ss-*` spelling below names the shared workflow; use your agent's native
invocation syntax.

**If the `/ss-*` skills are installed, run `/ss-build` to build a screen** — it enforces the
exact loop that made the reference demo look designed instead of generic (lock the look →
build → `/ss-score` → fix to ≥ 80 → *then* show). Building free-hand and skipping that loop is
precisely how output lands "AI-made" (no lock → default indigo; no gate → first draft shipped).

If the skills aren't installed, do the same loop by hand:

1. **Lock the look FIRST** — no `STYLESEED.md`? Run Quick Setup in plan mode (domain·surface·
   mood·accent·font·motion) and write the lock **before any code**. If it exists, obey it.
2. Read `DESIGN-LANGUAGE.md` (TOC → rules 14, 18, 19, 61-63) + `VISUAL-CRAFT.md` (§C0, §CC-9x)
   and the matching `APP-PLAYBOOKS.md` × `PAGE-TYPES.md` — not a one-shot summary.
3. Build with ONE focal point, the surface's type scale, no icon-chip cliché, the lock's
   accent/font/mood everywhere.
4. **Gate loop** — `/ss-score` (code, else self-score) → if < 80, fix the top items → re-score →
   repeat to ≥ 80. Never present a draft you haven't scored. **Then, if it renders, `/ss-verify`
   (pixels)** — screenshot, look, fix what only shows up rendered, re-render. Then present + report.

## Staying current (check once per project — don't nag)

StyleSeed is actively maintained: the rule set grows as the community proposes rules
via PR, so a project pinned to an old copy misses newer judgment. **Once per project**
— at setup, or the first time the user references StyleSeed in a session — you MAY:

1. Read the local version from `engine/VERSION` (or `VERSION` near these files).
2. Fetch `https://styleseed-demo.vercel.app/version.json`.
3. If its `version` is newer, tell the user **once**, briefly:
   *"StyleSeed v<remote> is out (you're on v<local>) — <whatsNew>. Run `/ss-update` (or `npx skills add bitjaru/styleseed`) to pull the new rules."*
   Then drop it.

Never block work on this, never repeat it, and skip it entirely if you can't fetch.

→ Source & updates: https://github.com/bitjaru/styleseed
