# Rule catalog

`catalog.json` is the structured form of StyleSeed's rules: one entry per rule, with the
fields an agent, a checker, and a reviewer need and prose cannot carry reliably.

```
id · axis · statement · kind · scope · priority · exceptions · rationale · evidence · check · source · anchor · reviews
```

- `kind` — `invariant` binds everywhere (the constitution and `DESIGN-LANGUAGE.md` §18) and no
  project exception can waive it; `default` is a recipe's choice and yields to a recorded project
  decision; `project-decision` is reserved and has no entries. A project's decisions and its
  approved exceptions to defaults live in the project, in the `decisions` ledger of
  `.styleseed/project.json`, not in this catalog (see
  [the decisions ledger](../.claude/skills/styleseed/workflows/ss-resolve/references/decisions.md)).
- `scope` — grammars, adapters, domains, page types, components, states. Empty means any. The
  resolver includes an entry when every non-empty list intersects the artifact's selection.
- `priority` — `blocks` is a fail state independent of any score; `strong` weighs heavily;
  `advisory` is a default to prefer.
- `evidence.level` — observed / derived / inferred / approved, the levels defined in
  [`research/cases/README.md`](../../research/cases/README.md). Most first entries are
  `inferred`: reasons the maintainer supplies. Cases move entries toward `observed` and a named
  review toward `approved`.
- `reviews` — named reviews, oldest first: `reviewer`, `date`, `verdict` (agree / conditional /
  disagree), optional `via` (how it was held, e.g. `designer+agent`, max 40) and `note`. An entry
  at `evidence.level: "approved"` needs at least one `agree`; one review per reviewer and date.
- `check.mode` — `machine` names deterministic checks: `detectors` (`SS001`–`SS006` in
  `styleseed-check.mjs`), a `tool` (a workflow script under `engine/.claude/skills/styleseed/workflows/`
  plus flags, e.g. `ss-verify/scripts/drift-report.mjs --gate`), or both; `model` is scored; `human`
  is for the review board. Today: 10 machine (5 by detector, 2 by `drift-report.mjs --gate`,
  3 by `drift-report.mjs --faults`), 14 model, 1 human.
- `source` + `anchor` — the prose that states the rule and an exact phrase that must appear in
  it. `scripts/validate-rules.mjs` fails when the anchor is missing, so the handbook and the
  catalog cannot drift apart silently.

## What reads it

- `scripts/build-context-catalog.mjs` embeds the entries in the compiled context catalog.
- The resolver (`ss-resolve/scripts/compiler.mjs`) appends a **Rules in scope** section to every
  bundle: the project decisions that apply to the artifact (from the project's ledger), all
  invariants, then the defaults whose scope matches the selection, ordered by priority and id. A
  default with an approved project exception says so on its line.
- `styleseed-check.mjs` (ss-score) stamps every deterministic finding with its catalog `rule`,
  `priority`, and `blocking`; the evidence gate refuses a run with a blocking finding, SARIF
  reports it at `error` level, and `scan --gate` exits 3. `drift-report.mjs --gate` does the same
  for at-rest drift (INV-05) and for values that violate a recorded project decision.
- `drift-report.mjs --faults` reports the render faults in `faults.json`, and `--gate` fails on the
  ones whose rule has `priority: blocks`; an approved exception to a default rule waives it per screen.
- `transition-jumps.mjs` names `CRAFT-motion-family` beside its detectors and reports one-frame jumps
  in declared state changes in `transitions.json`; it has no `--gate`.
- `scripts/validate-rules.mjs` runs in `verify-repo --core`: schema, unique ids, known scope
  values, existing sources, present anchors, detector ids, `check.tool` scripts and their flags,
  that invariants carry no scope, and the review rules above.

## Adding or changing an entry

1. State the rule in the prose first (handbook, playbook, or grammar). The catalog records
   decisions; it does not invent them.
2. Add the entry with the smallest honest `scope` and `priority`, the counter-cases under
   `exceptions`, and the reason under `rationale`.
3. Run `node scripts/validate-rules.mjs`, then `node scripts/verify-repo.mjs --core` and commit
   the regenerated catalog and example bundles.

Promoted rule candidates from `research/cases` land here (status `promoted` → a catalog entry
whose `evidence.sources` names the case). That path is the next step of the rules-as-data work;
until it ships, `promotedTo` in a case names the prose line the candidate changed.
