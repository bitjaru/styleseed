# Reference-to-Rule-Set Compiler

StyleSeed can turn user-supplied screenshots, URLs, Figma exports, moodboards, or an existing
product into a **project-local output grammar**. The goal is not visual cloning. The goal is
to recover the repeatable design decisions behind the references and make an agent apply them
consistently to new screens.

## Inputs

- Prefer 3–8 references that represent the same intended product language.
- Accept a single reference, but mark every inferred axis low confidence.
- Record source, date, surface adapter, canvas/viewport, and what the user wants to preserve.
- Separate product UI from marketing, editorial, and brand imagery before synthesis.
- Distinguish discovery records, visually inspected previews, and live states. Deduplicate the
  same project across galleries; record shared creator/template lineage when known. Many
  directory entries are not automatically independent evidence or representative prevalence.
- Record whether mobile, motion, keyboard, state transitions, and user outcomes were observed.
  A desktop preview or award does not verify those dimensions.

## Compiler pipeline

1. **Ingest** — capture/render each reference; do not infer from a brand name alone.
2. **Observe** — describe visible facts without aesthetic labels. For sequential artifacts,
   observe both frame-level composition and sequence-level progression.
3. **Measure** — estimate spacing units, type ratios, measure, radii, control heights,
   surface levels, palette roles, contrast, layout proportions, and density. Mark values as
   measured, estimated, or unknown, with the method. Resized previews cannot establish exact
   CSS, font metrics, contrast ratios, or animation timing; unknown is valid.
4. **Classify** — identify user job, page type, attention model, navigation, action hierarchy,
   states, responsive behavior, imagery/data role, and motion evidence.
5. **Cluster** — retain repeated relationships, not merely repeated shapes. Include contrasting
   solutions and task-matched product controls. Record applicability and counterexamples;
   repetition in a curated gallery is not proof of causality or a universal best practice.
6. **Resolve conflicts** — prefer the user's stated goal, repeated evidence, accessibility,
   and task fitness in that order. Never average incompatible systems into a muddy hybrid.
7. **Abstract** — express transferable rules and tokens, not copied component coordinates.
8. **Compile a draft** — write the artifacts below and select the nearest built-in fallback grammar.
   Present inferred decisions, confidence, scope, and exceptions for explicit human approval
   before activating the grammar. A supplied reference is not blanket approval of its inferred rules.
   For a measured reference, `ss-reference/scripts/compile-contract.mjs --write` writes the draft
   contract from `measurements/`; the person edits each transfer, and
   `compile-contract.mjs --approve --reviewer <name>` records the approval.
9. **Validate** — build at least one screen not shown in the references; score and visually
   verify it. A grammar that only recreates the source screen has failed abstraction. Selecting
   `reference:<slug>` in an artifact and running `ss-resolve/scripts/resolve-context.mjs` compiles
   only an approved, unchanged generated contract; `compile-contract.mjs --propose-decisions` prints
   ledger entries for what the person kept.

## Measurement and evidence levels

`ss-reference/scripts/measure-reference.mjs` opens a public URL at 1440×900 and 390×844 in a
browser the caller supplies and, on one page load per viewport, runs two read-only probes.
`observe-design.mjs` records computed-style counts for actions, links, text, surfaces, spacing,
type, radii, controls, fonts, borders, shadows, motion (transition and animation durations and
easings), target sizes, and tabular numerals. `observe-structure.mjs` records structure for
product UI: regions (top bar, side nav, main, aside, bottom bar; by landmark, else by geometry),
the sections of the main region classified by content, column ratios, gaps, headings, buttons by
emphasis, inputs and label positions, tables, lists, tab sets, sticky elements, media, and
readable stylesheet counts (hover, focus-visible, disabled, reduced-motion, breakpoints). The
probes may record geometry (region and section rectangles) as numbers. They record no text,
selectors, class names, element ids, URLs of assets, or screenshots. Caps per viewport: 8
regions, 40 sections, 12 tables, 12 lists, 8 tab sets. A page with several `main` landmarks has
one main region made of all of them (`parts`); its sections come from every part.

Before the probes run, inside the same load, the window is scrolled to the bottom in steps of 80%
of the viewport and back to the top, so content that reveals on scroll is measured revealed
(`--no-scroll` turns this off). The pass is bounded by steps, time, and document height
(`SCROLL_DEFAULTS` in `measure-reference.mjs`); its record (steps, document height at load and
after, which bound stopped it, whether the page was back at the top) is written per viewport in
`observations.json`, `summary.json`, `facts.json`, and the twelve-axis draft. Only the window is
scrolled: inner scroll containers are counted, not scrolled; content that hides again when
scrolled away is measured hidden; a reveal slower than about 900ms on the last screenful may be
measured mid-flight.

`analyze-observations.mjs` turns the counts into a spacing base and scale, type steps, radius
families, and derived roles. The accent is the colour of filled primary actions, then of coloured
links; a colour that only appears in large surfaces or pictures is never promoted. The canvas is
the colour that paints the largest share of the document height behind content (`backdrop`: the
root background and full-bleed opaque backgrounds, measured by the design probe; a tie goes to the
body colour), else the body background when it is painted at all (black included), else the most
frequent surface colour. Each derived role carries the counts behind it so a reviewer can keep the
observation and reject the derivation. `analyze-structure.mjs` writes `measurements/facts.json`:
one flat list of facts with stable ids (`composition.*`, `density.*`, `typography.heading.*`,
`navigation.*`, `states.*`, `imagery.*`, `responsive.*`, `attention.*`, `tells.*`), each with its
axis, level, value, viewport, and source. A fact is an observation, not a decision about what to
copy. The largest text (`attention.text.largest`, and its ratio to the body size) is read from
every counted text element, not only from headings, so a display line or a KPI value outside a
heading tag counts. Stylesheet counts (hover, focus-visible, disabled, reduced-motion,
breakpoints) come from the stylesheets the page lets the probe read; when one could not be read
(a cross-origin sheet without CORS) or the rule budget ran out, those facts carry
`bound: "lower"`: the true count is at least the value, and a zero means "could not tell", not
"none".

The same probe compares screens of one project. `ss-verify/scripts/drift-report.mjs` measures
several URLs (and `?state=` variants on request), derives the same values per screen, and
compares them with a baseline: the registry palette roles when a project root is given, otherwise
the majority across the screens (`compare-screens.mjs`, pure). It writes `drift.json` and
`DRIFT.md` with per-axis statuses `same`, `near`, `different`, `none`, and the values present on
one screen but absent from the shared set. With `--structure` it adds rows for table row height,
list item height, heading sizes in the main region, section gap, primaries per section, and
transition durations. `--scroll` adds the same scroll pass to each page load (off by default, so
a drift run without it measures exactly as before). It does not score; a `different` value is a question for the owner of the
design system.

Record every value, decision, and rule candidate with one evidence level from
[`research/cases/README.md`](../research/cases/README.md): `observed` (measured, or stated in
the product's own public documentation), `derived` (computed from observations), `inferred`
(a reason we supply), `approved` (a named design reviewer accepted it). The measurement step
produces `observed` and `derived` rows and leaves the rest to a person: the job itself, the
intended focal point, the reason for a composition, the role of each medium, the hierarchy
intent, loading, empty, and error states, and brand tells. The twelve-axis draft keeps a
"Decision (person)" column for them; the probes do not fill it in.

## Sources and conduct

- One page load per viewport. Within that load the window may be scrolled to the bottom and back;
  nothing is clicked, hovered, typed, or followed. No crawling, link following, form submission,
  or bypassing bot protection.
- Check `robots.txt` for the measured path and record `allowed`, `disallowed`, or `not-checked`
  in the source entry (`measure-reference.mjs --robots`, built-in `fetch`). A disallowed path
  stops the measurement unless the user passes `--own-site` for a site they operate.
- The user is responsible for the site's terms. Where they prohibit automated access, use the
  vendor's public documentation or a self-hosted instance.
- Product UI sources, in order of preference: public design-system example pages and Storybook
  canvases (measure the canvas `iframe.html?id=…`, not the docs chrome), self-hosted open-source
  apps with seed data, public no-login demos. Not: logged-in third-party products, paid template
  kits.
- Cases in this repository stay public-surface only. This is not legal advice.

## Twelve-axis output

The compiler must fill the same twelve-axis contract as `RULESETS.md`: user job, attention,
composition, density, typography, color, surfaces, imagery/data, navigation/action, states and
motion, responsive transformation, and characteristic tells/anti-patterns.

For each axis record:

```text
Decision · applicability/task · evidence IDs and observation method · confidence
Allowed variation · counterexample · verification needed · unresolved human choice
```

## Media and transfer checks

For imagery/data on the relevant axis record subject, role (proof, instruction, content,
brand expression), crop/focal point, text-safe area when text overlaps, caption/source,
and fallback. Use unknown/not-applicable rather than inventing hidden behavior. An
image-led and a type-led composition can express the same brand; neither is mandatory.

Checks should include at least two valid variants of a decision plus a failure case:
for example equal trend panels and a priority-led queue are both valid for their tasks;
converting a trend into progress for visual variety is not. Test repeated collections,
long/translated content, missing media/data, and relevant narrow-screen transformations.
Do not turn every observed pattern into a mandatory scoring item. Inspect the actual
transfer artifact before claiming visual quality; expert acceptance remains separate.
Bind source versions to concrete copy/media/state specimens using the
[applied transfer procedure](.claude/skills/styleseed/workflows/ss-verify/references/applied-checks.md#reference-transfer).
An old case-study article and a changed live URL are not evidence of the same implementation.

## Generated project artifacts

A reference grammar is six files under `.styleseed/rulesets/<slug>/`:

- `RULESET.md` — human-readable twelve-axis contract and source provenance;
- `tokens.json` — semantic values/ranges, never component-specific copied hex alone;
- `evidence.json` — source IDs, observations, confidence, and unresolved questions;
- `checks.md` — required tells, forbidden tells, and visual regression scenarios;
- `reference-board.html` — visual evidence beside each extracted claim when images are usable.
- `adapter.json` — selected `ADAPTERS.md` contract plus artifact-specific overrides.

The bundle carries the fallback grammar, `RULESET.md`, and `checks.md`; all six files are hashed
manifest inputs, so any edit changes the method hash.

### Generated contracts

For a reference measured with `measure-reference.mjs`, `evidence.json` is the single source and the
other five files are rendered from it, byte for byte the same for the same evidence
(`ss-reference/scripts/compile-contract.mjs`; the rendering and validation live in
`ss-resolve/scripts/reference-contract.mjs`, schema `ss-resolve/references/reference-evidence.schema.json`).
Every fact of `facts.json` and each of the nine token axes of `summary.json` (accent, ink, canvas,
spacing base and scale, type sizes, radii, fonts, control heights) carries a transfer:

| Transfer | Meaning | Rendered into |
|---|---|---|
| `keep` | checked, with a comparator: `eq`, `max` (at most), `min` (at least), `present`, or `within` a tolerance | `RULESET.md` as a rule, and `checks.md` |
| `adapt` | the relationship holds; the value may differ | `RULESET.md` as a relationship |
| `observe` | shown, not compared | the board only |
| `avoid` | do not copy | `checks.md` "Do not copy" (token axes); never `RULESET.md` |

The tool proposes a transfer for each fact and the person decides. The proposals: a few counts are kept
as maxima (primary actions per section, skipped heading levels, distinct control heights, radii, and
type sizes), focus-visible and reduced-motion rules are kept as present, spacing, density, heading,
rhythm, tab and navigation item heights, and transition durations are adapted, and everything else
(regions, sections, columns, media, responsive changes) is observed. A stylesheet count that is a lower
bound of zero is observed: it says "could not tell", not "none". The reference accent and fonts are
avoided, ink and canvas observed. Observed and avoided facts never reach `RULESET.md`, which is
compiled into the bundle: the reference's structure is the bar, not a target. `tokens.json` holds the
kept and adapted token axes only, in primitive → semantic layering, and passes the token canon parser
and layer check; it never replaces the project palette, and adopting it is the project owner's change
to `project.tokens.source`.

```bash
node <ss-reference>/scripts/compile-contract.mjs --project-root . --slug ops-console --measurements <case>/measurements   # dry run: counts per transfer
node <ss-reference>/scripts/compile-contract.mjs --project-root . --slug ops-console --measurements <case>/measurements --write
#   edit the transfers (and notes) in .styleseed/rulesets/ops-console/evidence.json, then --write again
node <ss-reference>/scripts/compile-contract.mjs --project-root . --slug ops-console --approve --reviewer "<name>"
node <ss-reference>/scripts/compile-contract.mjs --project-root . --slug ops-console --propose-decisions
```

- `--write` keeps the person's transfer, compare, and note for every fact that is still measured, gives
  new facts their proposals, lists the facts that disappeared, re-renders the five files, and resets
  approval to draft when the contract changed. It never overwrites an approved contract without
  `--force`, and never overwrites a hand-written contract.
- **Approval is a record.** `--approve --reviewer <name>` writes the name the person typed (never read
  from git config or the environment), the date, and `contractHash`, the hash of the evidence without its
  approval and rendered hashes. It refuses while a kept fact of level `derived` has no note: a derived
  fact needs one sentence from the person saying why it holds. As in the decisions ledger, the name is
  who the team holds responsible, not authentication or an expert approval.
- The resolver compiles a generated contract (contract `reference-contract-v3`) only when it is
  approved, its hash still matches, every rendered file matches its recorded hash and what the engine
  renders from the evidence, `tokens.json` passes the canon checks, and its fallback and adapter agree
  with the artifact. Each refusal names the file and the command to run. Changing a fact or a transfer
  after approval therefore needs `--write` and a new approval.
- `--propose-decisions` prints `decisions[]` entries for kept facts and kept token axes that map to a
  ledger axis, without ids, for an approved contract only; it writes nothing
  (`ss-resolve/references/decisions.md`). Colours are never proposed.
- A hand-written contract (any `evidence.json` without `schemaVersion: 1` and a `generator` object)
  compiles exactly as before.

After explicit approval, select the grammar in the registry artifact configuration; only in
a legacy project without a registry, update `STYLESEED.md`:

```markdown
- Output grammar: reference:<slug>
- Grammar path: .styleseed/rulesets/<slug>/RULESET.md
- Grammar fallback: <nearest built-in grammar>
- Reference confidence: <high|medium|low>
```

## Safety and quality boundaries

- Never claim exact measurements that cannot be observed; use ranges and confidence.
- Do not copy logos, proprietary illustrations, text, or trademarked component arrangements.
- Do not derive identity from one fashionable detail. Require repeated evidence for a rule.
- Accessibility and platform conventions override a reference defect.
- A reference grammar may vary bounded axes; it may not waive the core invariants.
- Keep project-local grammars local by default. Promotion into StyleSeed is a maintainer action.
