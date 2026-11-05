# Design-decision cases

A case records design decisions observed in one public product screen, the reasons we can
source for them, and the rule candidates they support. Cases feed the domain playbooks
(`engine/APP-PLAYBOOKS.md`), the grammars (`engine/RULESETS.md`), and the reference compiler
(`engine/REFERENCE-COMPILER.md`). They are evidence for rules, never rules by themselves.

A case never claims to reproduce a company's internal reasoning. It records what a public
surface shows, what public writing says, and what we infer, each labelled.

## Folder layout

```
research/cases/
  README.md                this guide
  schema/case.schema.json  machine-checked shape of case.json
  _template/               copy this to start a case
  <domain>/<product>-<task>-<YYYY-MM-DD>/
    case.json              metadata, sources, measurements, decisions, rule candidates, validation
    DECISIONS.md           the decisions in prose, with reasons and counterexamples
    measurements/          tool output (design-tokens.json, variables.css, DESIGN.md …); values only
```

`<domain>` is one of the twelve playbook domains (`fintech`, `saas-dashboard`, `ecommerce`,
`social`, `content`, `productivity`, `health`, `education`, `devtools`, `marketplace`,
`booking`, `ai-assistant`).

## Evidence levels

Every source, decision, and rule candidate carries one level. Missing evidence is unknown,
not absence.

| Level | Meaning | Example |
|---|---|---|
| `observed` | measured on the public surface, or stated by the product's own public documentation | spacing scale read from computed styles; the fare shown as a range before selection; a pattern page saying why the left column exists |
| `derived` | computed from observations | accent used on 3 of 3 primary actions, so the accent role is the button fill |
| `inferred` | a reason we supply, or read into third-party writing; the author did not state it | "the range hides price uncertainty before matching" (our reading) |
| `approved` | a named reviewer with design expertise accepted the rule candidate | reviewer handle and date in `ruleCandidates[].review` |

## Workflow

1. **Measure.** Run the extractor (`design-extract` skill, pinned designlang) on the public
   URL. Keep `variables.css`, `design-tokens.json`, `DESIGN.md` under `measurements/`. Do not
   keep screenshots, fonts, images, or page source in the repository; link them.
2. **Correct roles.** The tool's `brand.primary` can be a picture or code sample on the page.
   Re-derive the accent from the colour actually used on primary buttons and links, and record
   that as `derived`.
3. **Observe.** Write what the screen does for its task: order of inputs, what is shown before
   and after a choice, states, density, where the eye lands first.
4. **Decide and source.** For each decision, state whether it is task-driven or brand-driven,
   attach a source for the reason when public writing exists, and mark the level.
5. **Draft rule candidates.** Use the twelve axes of `REFERENCE-COMPILER.md`. Each candidate
   needs applicability, allowed variation, a counterexample, and a verification method.
6. **Validate.** Build one screen the case did not show, with the candidate rules applied, and
   record the StyleSeed score and the bundle used. A candidate that only recreates the source
   screen has not been validated.
7. **Promote.** A promoted candidate points at the playbook or grammar line it changed and, once the rules-as-data step ships, at its entry in `engine/rules/catalog.json` (see `engine/rules/README.md`). Promotion
   is a maintainer merge after review; `approved` requires a reviewer.

`node scripts/validate-cases.mjs` checks every `case.json` against the schema, the evidence
levels, referenced measurement files, and promotion fields.

## What a case may not contain

- Logos, illustrations, photographs, brand copy, or trademarked component arrangements.
- Private screens, screens behind a login the author does not own, or user data.
- Claims about a company's internal process, metrics, or intent beyond cited public writing.
- Measurements the tool did not take. Unknown stays unknown.

## Proposing a case

Copy `_template/`, fill it, run the validator, and open a pull request. Designers who do not use
git can send the same fields through the proposal form on the demo site; it opens the pull
request on their behalf and credits them in `contributors`.
