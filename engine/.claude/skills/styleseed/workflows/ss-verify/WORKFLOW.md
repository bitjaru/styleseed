---
name: ss-verify
description: Inspect rendered UI or visual artifacts against their StyleSeed contract. Report findings; fix and re-render only within an authorized build or repair task.
argument-hint: "[route, file, artifact manifest, or export directory]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Before this workflow, follow the once-per-session [update preflight](../ss-update/references/update-preflight.md).


# Verify (look at it, don't just read it)
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

If either registry file exists, require a complete, valid registry. Read the selected artifact's
bundle and manifest above and check with `ss-resolve --artifact <artifact-id> --check`.
An incomplete or invalid registry is an error, not permission to read a legacy bundle or restart
setup. Verify each affected artifact against its own required renders and validation contract.

Only projects without either registry file use `.styleseed/effective-rules.md` and
`.styleseed/manifest.json`, checked with `ss-resolve --from-lock STYLESEED.md --check`.
During an authorized build or repair, invoke `/ss-resolve` or `$ss-resolve` from the corresponding
project-owned configuration when that selected bundle is missing or stale. In inspection-only
mode, report that condition without rewriting bundles or claiming current compliance.
With no registry or lock, establish scope before a
compliance claim. Judge pixels against that compiled method.
A lock value cannot excuse a core failure, and a recipe/profile cannot replace the output grammar.

`/ss-score` reads the **code** and scores it. But some of the worst "AI-made" tells never appear
in source — they only exist in **pixels**: a required priority that is hard to locate, a lower third
of dead whitespace, cramped cards, a web font that silently failed to load and fell back to
Times, competing emphasis that hides the next action, text that's unreadable on its real
background. A human sees these in half a second; a code-reading gate misses all of them.

`/ss-verify` closes that gap: it **renders the UI, screenshots it, and you look at the image** —
then score the same StyleSeed gate against what you see, fix, and re-render. This is the gate
that supplies rendered evidence; it does not establish human design acceptance.

During a build, run it as the final gate after `/ss-score`. A direct screenshot/pixel inspection
does not require a new code-score loop; report code evidence as not checked if unavailable.

## Inspection and repair scope

A request to inspect, verify, or report is inspection-only unless it also authorizes fixes.
Render and capture in a temporary workspace without modifying product source, configuration,
or real user data. Report findings even when they fail. Use existing test fixtures for states;
never empty a live database to produce an empty-state screenshot.

Within an authorized build or repair, fix only in-scope implementation defects and re-render.
Do not change approved identity or waive core floors to raise a score. A missing tool or failed
gate calls for an honest report, not an invented pass or an unrelated installation.

## When NOT to use

- Pure logic/config with no visual artifact → use relevant functional/configuration checks,
  not a design score. A renderable component without a host can use the temporary harness below.
- No way to render at all (no browser, no Playwright, headless blocked) → say so, fall back to
  `/ss-score`, and tell the user the visual gate was skipped. **Never claim you verified visually
  if you didn't actually see a screenshot.**
- A quick pre-commit pass → `/ss-lint`. `/ss-verify` is heavier (it boots a renderer).

For a compiled spatial contract, follow the [spatial roles guide](../ss-resolve/references/spacing.md).
For a configured spatial contract, run the installed `scripts/inspect-spacing.mjs` browser function
with explicit bindings for every declared role, following the guide. Treat failures and unsupported
measurements as unresolved, not a visual pass; inspect content observations too. At required
narrow/wide viewports, check actual gaps, insets, token resolution, grouping, repeated
alignment, overflow, and loading/error layout. Inspect screenshots as well as geometry. Numeric
compliance cannot establish good rhythm or human acceptance. Preserve unrelated spacing when repairing.

For color/type changes and actual-content review, use the
[applied checks](references/applied-checks.md): bind relevant consumers to their actual states and
backgrounds, exercise representative mixed-script/fallback specimens, and preserve observed
findings before reconciling automatic warnings. The shipped read-only `inspect-appearance.mjs`
records scoped CSS/color/font observations; reuse the spacing inspector for no-wrap/overflow.
Unsupported paint or unknown glyph fallback is unresolved, never a visual pass.

## Step 1 — Render it through the active adapter

For `social-carousel`, `slide-deck`, `document-report`, or `single-frame`, use the companion
renderer and open every required exported frame/page at readable resolution. Verify dimensions,
crop/safe zones, font availability, asset placement, and the export manifest. Do not force a
browser workflow onto a PIL, slide, PDF, or image renderer.

For `product-ui`, get a real screenshot in priority order:

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

First record what the actual image communicates for the task, using the
[observation procedure](references/applied-checks.md#observe-before-reconciling). Then reconcile
code/automatic warnings with those observations and the compiled contract. If earlier scores
were already visible, report an informed review rather than claiming blind independence.
These are the checks that need eyes, not source:

```
□ Attention      — can the user locate the reading promise, decision, or comparable regions?
                   Equivalent panels may share weight. Name a hidden priority or task failure;
                   an even grid, gradient, serif, or pill shape alone is not a failure.
□ Balance        — dead whitespace (a lower third of empty), or cramped/colliding elements?
                   Is the visual weight distributed, or all top-left / all-centered?
□ Fonts loaded   — is the intended typeface actually rendering, or a Times/Arial fallback?
                   (a silent font-load fail is a top "looks cheap" tell — invisible in code)
□ Color roles    — are actions, status, categories, brand, and content roles distinguishable?
                   Judge conflicting meanings and emphasis, not the number of visible hues.
□ Contrast (seen) — any text you have to strain to read on its real rendered background?
                   Light-grey-on-white labels, low-contrast on a colored/照片 panel
□ Rhythm/optics  — are edges aligned, gaps consistent, cards optically even? Off-by-a-few-px
                   misalignments that read as "sloppy" but pass a code check
□ Type scale fit — is the approved role scale readable for the task, script, distance, and zoom?
                   Check actual reading and hierarchy, not a universal desktop size or hero quota.
□ Grammar fit   — does the screen visually serve the selected grammar's user job, attention
                   model, composition, density, action hierarchy, and characteristic tells?
□ Recipe fit    — do geometry, containment, controls, collections, navigation, density, and
                   motion visibly match the selected recipe rather than the old universal soft-card look?
                   Reusable functional patterns may fit multiple products; verify real content
                   and appropriate project decisions rather than demanding a unique layout.
□ Motion (if any) — observe the transition and reduced-motion result; does it explain state or
                   sequence without blocking reading or action? Still frames cannot prove timing.
```

## Step 3 — Render states or sequence variants too

The happy-path screenshot hides the most common real-world failure: **no empty / loading / error
state.** Where the surface has a data view, render those variants with test fixtures, an existing
preview query param, or props in a temporary harness, and screenshot each. A blank white void for "no
data" is a fail you can only catch by *looking* at the empty state. (Static marketing pages with
no data surface → N/A, note it.)

For sequential artifacts, inspect the cover/first frame, every content frame, and close/CTA as
a set: continuity, progression, one message per frame, repeated-template fatigue, source labels,
folios, and safe-zone survival. For documents/decks, inspect every page/slide plus a representative
thumbnail or overview view.

## Step 4 — Fix, re-render, repeat

In inspection-only mode, return findings and evidence without edits. In an authorized repair,
fix the code, then **re-render and look again**. Stop on pass, after at most three repair-and-render
passes, or at a permission/tool blocker. Do not reset the limit by switching skills.
Always report the latest image if available, effective rule set, changes, gate status, and
unresolved failures. A failed result may be shown for review, but never labeled accepted.

## Step 5 — Drift across screens (measured, optional)

A screen can pass its own gate and still disagree with the rest of the product: a second teal,
a 12px gap on an 8px grid, one more type size, a 10px radius among 4px ones. After adding a
screen, before a release, or when you take over someone else's work, measure the screens
together instead of trusting the diff:

```bash
node <installed-ss-verify>/scripts/drift-report.mjs \
  http://localhost:3000/ http://localhost:3000/settings http://localhost:3000/billing \
  --out .styleseed/evidence/drift/<date> --project-root . --states error
```

It runs the read-only probe from `ss-reference` on every URL (http(s) or `file:`), and on
`?state=<name>` variants when `--states` is given, then compares accent, ink, canvas, spacing base
and scale, type sizes, radii, fonts, and control heights per screen with a baseline: the registry
palette roles when `--project-root` points at a StyleSeed project, otherwise the majority across
the screens. `DRIFT.md` holds the table and a one-line verdict; `drift.json` holds the same data.

With `--gate`, at-rest drift on accent, ink, canvas, or spacing base exits 3 (INV-05: no unexplained
role drift) so CI can block on it. Record approved decisions and exceptions in the project's
`decisions` ledger instead of lowering the gate (see the
[decisions ledger guide](../ss-resolve/references/decisions.md)): the report reads it from
`.styleseed/project.json` with `--project-root` (from `.styleseed/decisions.json` when the project has no
registry), or from `--decisions <file.json>`. A recorded decision
becomes the baseline for the screens it covers, so a value outside it reads `violates D-…`; a value
an approved exception covers reads `approved D-…` and is not drift. `--gate` also exits 3 on any
decision violation.

With `--structure`, the structure probe runs on the same page loads and the table gains rows for
table row height, list item height, heading sizes in the main region, section gap, primaries per
section, and transition durations, compared the same way. A structure value outside the shared set
does not fail `--gate`; a recorded decision on one of these six axes applies like the others
(`violates D-…` fails `--gate`, `approved D-…` does not). Without the flag the report is unchanged,
except that a decision on a structure axis is listed once as not measured. `--scroll`
scrolls each page to the bottom and back inside its one load before measuring, for screens whose
content reveals on scroll; it is off by default.

With `--faults`, a third read-only probe runs on the same page loads and `FAULTS.md` and `faults.json`
list render faults measured from boxes and computed style: amounts laid out on two lines, text over
other text, text out of the button or card that holds it, clipped text, tight insets, near touches and
near alignments, emoji used as icons, and mixed icon construction in one navigation or list. Each
finding names its class, viewport, and box; nothing is scored. `--gate` fails only on classes whose
catalog rule has priority `blocks`, and an approved ledger exception to a default rule waives it per
screen; the other classes report. The drift files are byte for byte what the run writes without the
flag. Definitions, thresholds, and limits: [render faults](references/render-faults.md).

With `--reference <slug>` (and `--project-root`), the run also measures the distance from one screen
(`--screen <label>`, default the first) to the project's approved generated contract
`.styleseed/rulesets/<slug>/evidence.json`, and writes `DISTANCE.md` and `distance.json` beside the
drift files. It turns `--structure` on, and `--scroll` when the reference was measured with its scroll
pass, and says so; a draft contract, or one edited after approval, is refused before anything is
measured. Kept facts read `same`, `different`, or `absent` (the screen has no such fact, or its value
is a lower bound that cannot decide); adapted facts `same`, `near`, `different`, or `absent`; avoided
token values `copied` (taken from the reference and not already owned by the project) or `clear`.
Observed facts and facts marked `avoid` get no row. One verdict line counts the kept facts that differ
and the avoided values that were copied; nothing is summed or scored. `--gate` also exits 3 on a
`different` kept fact or a `copied` value, naming each. **Distance is not drift:** drift compares the
screens with each other and the project baseline, distance compares one screen with one contract, and
`DRIFT.md` and `drift.json` are byte for byte what the same run writes without `--reference` (with the
flags it turns on).

Read it as measurement, not judgment. A `different` accent may be an approved exception nobody has
recorded yet. A `none`
accent usually means the primary action only appears in a state (a save bar, a dialog), so
re-measure with `--states`. No page text, screenshots, or URLs beyond the ones you passed are
written. The method is described in `engine/REFERENCE-COMPILER.md`, "Measurement and evidence
levels".

## Step 6 — Transition frame jumps (measured, optional)

A transition that names its properties can leave one out, and that property then snaps in one frame
while the rest glides. On your own pages, mark each state change to check: a root
`data-styleseed-transition="<id>"` holding one `data-styleseed-trigger`. Then run:

```bash
node <installed-ss-verify>/scripts/transition-jumps.mjs http://localhost:3000/settings \
  --out .styleseed/evidence/transitions/<date> --compare-all
```

It clicks each trigger forward and back, holds the transitions and animations the change starts, steps
their clocks every 1000/60 ms, and writes `TRANSITIONS.md` and `transitions.json`: boxes that move in one
frame at the start, in the middle, or after the end of the change. With `--compare-all`, both directions
run again with `transition-property: all` set inline on every element under the root (restored
afterwards), and a finding that disappears there was caused by the named list. Only box geometry is
compared. It reports and does not gate; exit 2 means a run was inconclusive (not at rest, too many
elements, chained, script-driven, or skipped after a run that could not return the case).
Never point it at a reference site. Definitions and limits: [transition frame
jumps](references/render-faults.md#transition-frame-jumps).

## Rules

- **You must actually see the rendered artifact.** No render, no visual verdict — fall back to `/ss-score`
  and say the visual gate was skipped. Never fabricate "looks good."
- **Re-render after every fix.** The reason this skill exists is that source and pixels diverge;
  verifying a visual fix by reading the diff defeats it.
- **Build gates, in order:** `/ss-score` (code) first to catch structural issues cheaply, then
  `/ss-verify` (pixels) as the final bar. `/ss-build` runs code-gate in its loop; finish a
  renderable screen with `/ss-verify`.
- **Clean up:** stop only the dev server you started; remove only your own temporary harness files.
- **Shoot at 2×** and at the locked surface's viewport — judging a desktop app on a 390px shot
  (or vice-versa) invalidates the type-scale and balance checks.
