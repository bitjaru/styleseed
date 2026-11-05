# Rule catalog

`catalog.json` is the structured form of StyleSeed's rules: one entry per rule, with the
fields an agent, a checker, and a reviewer need and prose cannot carry reliably.

```
id · axis · statement · kind · scope · priority · exceptions · rationale · evidence · check · source · anchor
```

- `kind` — `invariant` binds everywhere (the constitution and `DESIGN-LANGUAGE.md` §18);
  `default` is a recipe's choice and yields to a recorded project decision; `project-decision`
  is set in a project lock and appears here only as a template.
- `scope` — grammars, adapters, domains, page types, components, states. Empty means any. The
  resolver includes an entry when every non-empty list intersects the artifact's selection.
- `priority` — `blocks` is a fail state independent of any score; `strong` weighs heavily;
  `advisory` is a default to prefer.
- `evidence.level` — observed / derived / inferred / approved, the levels defined in
  [`research/cases/README.md`](../../research/cases/README.md). Most first entries are
  `inferred`: reasons the maintainer supplies. Cases move entries toward `observed` and a named
  review toward `approved`.
- `check.mode` — `machine` names deterministic detectors (`SS001`–`SS006` in
  `styleseed-check.mjs`); `model` is scored; `human` is for the review board.
- `source` + `anchor` — the prose that states the rule and an exact phrase that must appear in
  it. `scripts/validate-rules.mjs` fails when the anchor is missing, so the handbook and the
  catalog cannot drift apart silently.

## What reads it

- `scripts/build-context-catalog.mjs` embeds the entries in the compiled context catalog.
- The resolver (`ss-resolve/scripts/compiler.mjs`) appends a **Rules in scope** section to every
  bundle: all invariants, then the defaults whose scope matches the selection, ordered by
  priority and id.
- `scripts/validate-rules.mjs` runs in `verify-repo --core`: schema, unique ids, known scope
  values, existing sources, present anchors, detector ids, and that invariants carry no scope.

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
