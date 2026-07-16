---
name: ss-verify
description: The VISUAL gate — render the UI, screenshot it, and score what you actually SEE, not what the code says. Catches the tells that only show up in pixels (dead whitespace, cramping, a hero that doesn't dominate, fonts that didn't load, real rendered color, the squint "does this look AI-made" test) — the things /ss-score can't read from source. Renders empty/loading/error states too, then fixes and re-renders until it passes. Use as the final gate on any screen you can render.
argument-hint: "[route or file] [--surface mobile|desktop]  — e.g. \"/dashboard --surface desktop\""
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Verify (look at it, don't just read it)

`/ss-score` reads the **code** and scores it. But some of the worst "AI-made" tells never appear
in source — they only exist in **pixels**: a hero that doesn't actually dominate, a lower third
of dead whitespace, cramped cards, a web font that silently failed to load and fell back to
Times, two colors that *look* like two accents once rendered, text that's unreadable on its real
background. A human sees these in half a second; a code-reading gate misses all of them.

`/ss-verify` closes that gap: it **renders the UI, screenshots it, and you look at the image** —
then score the same StyleSeed gate against what you see, fix, and re-render. This is the gate
that most predicts whether a real user will say "this looks designed."

Run it as the **final** gate after `/ss-score` passes — code-clean is necessary but not
sufficient; pixel-clean is the real bar.

## When NOT to use

- Nothing renderable yet (pure logic/config, or a component with no host page) → use `/ss-score`.
- No way to render at all (no browser, no Playwright, headless blocked) → say so, fall back to
  `/ss-score`, and tell the user the visual gate was skipped. **Never claim you verified visually
  if you didn't actually see a screenshot.**
- A quick pre-commit pass → `/ss-lint`. `/ss-verify` is heavier (it boots a renderer).

## Step 1 — Render it

Get a real screenshot. In priority order:

**A. Running project (Next / Vite / etc.) — the normal case.**
1. Start the dev server in the background (`npm run dev` / `pnpm dev` / framework command); wait
   for the ready line and capture the port.
2. Screenshot the route with headless Chromium via Playwright. If the project has `playwright`
   in `node_modules`, use it; else use a globally cached Chromium. Minimal script:
   ```js
   import { chromium } from "playwright";           // or an absolute path into node_modules
   const b = await chromium.launch();
   const c = await b.newContext({ viewport: SURFACE, deviceScaleFactor: 2 });
   const p = await c.newPage();
   await p.goto(URL, { waitUntil: "networkidle" });
   await p.evaluate(() => document.fonts.ready);      // don't shoot before fonts load
   await p.waitForTimeout(400);
   await p.screenshot({ path: OUT, fullPage: true });
   await b.close();
   ```
   **Surface viewports:** mobile `{width:390,height:844}` · desktop `{width:1440,height:900}`.
   Pick from the lock's `Surface`, or `--surface`.
3. If a browser MCP (claude-in-chrome) is available instead, navigate + screenshot with that.

**B. Static HTML file** → open it directly with `file://…` and screenshot (same script).

**C. Isolated component** (no host page) → render it into a minimal throwaway page that imports
the component with realistic props, then screenshot that.

**Then actually READ the screenshot back** (Read the PNG). You must *see* it. Shoot at
`deviceScaleFactor: 2` so text is crisp enough to judge.

## Step 2 — Score what you SEE (the visual gate)

Look at the image and run the StyleSeed gate **perceptually** — and **judge against the lock**:
read `STYLESEED.md` first, because what "reads AI-generated" depends on the locked look. Pill
controls are the locked personality under `warm-dtc` (not a tell); hard borders are the style
under `brutalist-lite`; a serif reading column is correct under `editorial`. The tells below are
the *unlocked-default* signatures — the combination of generic choices nobody locked.
**If there is NO lock, judge at full default strictness** (pill+generic-sans IS a tell,
serif-paper IS dated, borders-as-separation on light IS flat) and say so in the report —
same fallback rule as `/ss-score` Step 0:

```
□ Squint test    — blur your focus / imagine it at 50%. Does it still read "AI-generated"?
                   (bland gradient, pill button + generic sans WITH no locked pill personality,
                   icon-chip row, even flat grid) → FAIL
□ Focal          — does ONE element actually dominate at a glance? If your eye lands nowhere,
                   or on an all-even grid, the focal point failed regardless of what code intended
□ Balance        — dead whitespace (a lower third of empty), or cramped/colliding elements?
                   Is the visual weight distributed, or all top-left / all-centered?
□ Fonts loaded   — is the intended typeface actually rendering, or a Times/Arial fallback?
                   (a silent font-load fail is a top "looks cheap" tell — invisible in code)
□ One accent (seen) — count the hues you actually SEE. Two things competing for "the color" = FAIL,
                   even if the code named one token
□ Contrast (seen) — any text you have to strain to read on its real rendered background?
                   Light-grey-on-white labels, low-contrast on a colored/照片 panel
□ Rhythm/optics  — are edges aligned, gaps consistent, cards optically even? Off-by-a-few-px
                   misalignments that read as "sloppy" but pass a code check
□ Type scale fit — on desktop, does the body text look too small for the canvas? does the hero
                   feel undersized? (the surface-scale tell, judged by eye)
□ Motion (if any) — capture before/after or a mid-transition frame; is it purposeful, or the
                   "cheap fade/bounce on everything" tell? does it block the first read?
```

## Step 3 — Render the STATES too (not just the happy path)

The happy-path screenshot hides the most common real-world failure: **no empty / loading / error
state.** Where the surface has a data view, render those variants (a query param, a mock, a
forced prop, or temporarily emptying the data) and screenshot each. A blank white void for "no
data" is a fail you can only catch by *looking* at the empty state. (Static marketing pages with
no data surface → N/A, note it.)

## Step 4 — Fix, re-render, repeat

For each visual failure, fix the code, then **re-render and look again** — don't assume the fix
worked from the diff (the whole point is that code ≠ pixels). Loop up to ~3×. Present only when
the screenshot passes, with the final image, a one-line "fixed: …", and the gate result.

## Rules

- **You must actually see a screenshot.** No render, no visual verdict — fall back to `/ss-score`
  and say the visual gate was skipped. Never fabricate "looks good."
- **Re-render after every fix.** The reason this skill exists is that source and pixels diverge;
  verifying a visual fix by reading the diff defeats it.
- **Both gates, in order:** `/ss-score` (code) first to catch structural issues cheaply, then
  `/ss-verify` (pixels) as the final bar. `/ss-build` runs code-gate in its loop; finish a
  renderable screen with `/ss-verify`.
- **Clean up:** stop the dev server you started; delete any throwaway harness/mock files.
- **Shoot at 2×** and at the locked surface's viewport — judging a desktop app on a 390px shot
  (or vice-versa) invalidates the type-scale and balance checks.
