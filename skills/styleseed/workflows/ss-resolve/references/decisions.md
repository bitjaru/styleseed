# Project decisions: the decisions ledger

StyleSeed exists to keep one product's decisions across screens and sessions. A catalog default
says what to prefer when nobody has decided; once someone with the authority to decide has decided,
the project records it so the next screen, the next session, and the next agent start from that
decision instead of the default. The ledger is that record. It lives in the project, not in the
catalog: `engine/rules/catalog.json` never holds a project's decisions.

## Configure

`.styleseed/project.json` accepts an optional top-level `decisions` array next to `spacing` and
`tokens`:

```json
"decisions": [
  {
    "id": "D-001",
    "kind": "decision",
    "axis": "controlHeights",
    "values": [36, 44],
    "statement": "Form controls are 36px; primary page actions are 44px.",
    "approvedBy": "design lead",
    "date": "2026-11-10",
    "source": "review:batch-01#2"
  },
  {
    "id": "D-002",
    "kind": "exception",
    "to": "D-001",
    "rule": "CRAFT-control-heights",
    "axis": "controlHeights",
    "values": [32],
    "scope": { "screens": ["orders"], "artifacts": ["app-orders"] },
    "statement": "The orders table toolbar uses 32px filter controls.",
    "approvedBy": "bitjaru",
    "date": "2026-11-10"
  }
]
```

| Field | Rule |
|---|---|
| `id` | Required. `D-` and three or more digits, unique in the project. Entries are compiled in id order. |
| `kind` | Required. `decision` or `exception`. |
| `rule` | Optional. A rule id from the catalog. On an exception it must be a `default` rule. |
| `to` | Exception only, optional. The id of a `decision` in this ledger on the same `axis`. An exception names `rule`, `to`, or both: it has to say what it is an exception to. |
| `axis` | Optional. One of the measured drift axes: `accent`, `ink`, `canvas`, `spacingBase`, `spacingScale`, `typeSizes`, `radii`, `fonts`, `controlHeights`. Without an axis the entry is prose: it reaches the bundle but the drift report cannot measure it. |
| `values` | Required with `axis`, forbidden without it. 1–24 values. Colour axes take exactly one `#RRGGBB` (stored upper case); `spacingBase` exactly one positive integer; `fonts` family names of 1–80 characters; the other axes numbers ≥ 0 (sorted, de-duplicated). |
| `scope` | Optional. `screens` (drift-report labels such as `settings` or `billing-history`) and/or `artifacts` (artifact ids). No scope means the whole project. |
| `statement` | Required. One line, at most 300 characters. This is what an agent reads. |
| `approvedBy` | Required. Who approved it, at most 80 characters. |
| `date` | Required. `YYYY-MM-DD`. |
| `source` | Optional. Where it was decided, at most 200 characters: a review batch, a reference fact id, a meeting. |

The resolver validates the ledger with the rest of `project.json`. It refuses, with the entry id and
what to change: duplicate ids, unknown rule ids, an exception without `rule` or `to`, a `to` that is
missing or decides a different axis, `values` without an axis, a colour axis with more than one
value, two project-wide decisions on the same axis, and two scoped decisions on the same axis whose
screens or artifacts overlap. A scoped decision may coexist with a project-wide one on the same axis;
the scoped one wins on its screens and artifacts.

## Decision versus exception

- A **decision** fixes the value set for an axis: for the whole project, or for the screens and
  artifacts in its scope. It outranks a catalog default. It never outranks an invariant.
- An **exception** adds allowed values on top of a decision (`to`) or a default rule (`rule`), for the
  screens and artifacts in its scope or for the whole project. It does not remove anything.

**Exceptions never apply to invariants.** An exception whose `rule` is an invariant (for example
`INV-04-controls-operable`) fails the resolve: `D-002: exceptions cannot waive an invariant
(INV-04-controls-operable)`. Invariants bind everywhere; if one seems wrong for the project, that is
a conversation about the catalog, not an entry in the ledger.

**`approvedBy` is a record, not authentication.** StyleSeed does not verify who wrote the entry.
The name says who the team holds responsible for the decision; repository history and review are
what make it trustworthy. A self-assigned name is not an expert approval.

## In the bundle

The resolver compiles the entries that apply to an artifact (no `scope.artifacts`, or a list that
includes the artifact id) into the bundle's **Rules in scope** section, between the intro and the
invariants:

```
## Project decisions

Recorded in `.styleseed/project.json`. A decision outranks a default; it never outranks an invariant.

- **D-001** (decision · controlHeights = 36, 44 · approved by design lead, 2026-11-10): Form controls are 36px; primary page actions are 44px.
- **D-002** (exception to D-001, CRAFT-control-heights · controlHeights + 32 · screens: orders · approved by bitjaru, 2026-11-10): The orders table toolbar uses 32px filter controls.
```

A default rule with an applicable exception ends its line with ` Project exception: D-002.` Entries
scoped to other artifacts are left out. With no applicable entry the section is absent and the
bundle is byte-identical to a project without a ledger. The rules section is a hashed source, so a
ledger change that reaches an artifact's bundle changes its method hash and `resolve-context.mjs
--check` exits 2; any ledger change also changes the `project.json` input hash.

## In the drift report

`ss-verify/scripts/drift-report.mjs` reads the ledger from `.styleseed/project.json` when
`--project-root` points at a complete registry (a registry that fails to load stops the report),
and from `--decisions <file.json>` (an array in the same shape) for projects without a registry.
Given both, the file is appended and the combined ledger is validated as one.

The drift report measures screens, so it applies entries by screen label: an entry without scope
covers every screen, `scope.screens` covers those labels (a `?state=` variant by its base label).
An entry scoped only to artifacts names no screen; it shapes bundles but the drift report does not
apply it. Add `scope.screens` to make it measurable.

- A **decision** is the baseline for the screens it covers, replacing the registry palette or the
  majority. Colour axes and `spacingBase` compare against the decided value (`near` still applies to
  colours); set axes compare against the decided set. A value outside it reads `violates D-001`
  instead of `different` or `+extra`.
- A value an **exception** covers reads `approved D-002` and counts as neither drift nor violation.
- Axes no entry touches behave exactly as without a ledger.
- Violations count on at-rest screens, and on state variants for the accent, as drift does.
  `drift.json` carries `decisions: { applied, violations, excepted, entries }`; `DRIFT.md` adds the
  statuses to its legend and lists the recorded entries it applied.
- `--gate` exits 3 on at-rest drift on accent, ink, canvas, or spacing base **or** on any decision
  violation, and names both. A screen whose only deviations are approved exceptions passes.

## Worked examples

**A product-wide control height, with one approved toolbar.** The team decides 36px form controls
and 44px page actions (`D-001` above). Later, the orders table needs compact filters; the designer
approves 32px for that screen only (`D-002`). The `app-orders` bundle shows both entries and marks
`CRAFT-control-heights` with `Project exception: D-002`. On the next drift run, a 32px control on
`orders` reads `approved D-002`; a 32px control that appears on `settings` reads `violates D-001`,
and `--gate` fails until someone either fixes `settings` or records why it is different there.

**An accent that a partner page may break.** A project decides its teal accent for every screen:

```json
"decisions": [
  { "id": "D-010", "kind": "decision", "axis": "accent", "values": ["#0F766E"], "statement": "Primary actions are teal.", "approvedBy": "design lead", "date": "2026-11-10" },
  { "id": "D-011", "kind": "exception", "to": "D-010", "axis": "accent", "values": ["#2563EB"], "scope": { "screens": ["partner-pricing"] }, "statement": "The co-branded pricing page uses the partner's blue for its primary action.", "approvedBy": "design lead", "date": "2026-11-10", "source": "partner agreement review 2026-11-10" }
]
```

Run the report against it:

```bash
node <installed-ss-verify>/scripts/drift-report.mjs \
  http://localhost:3000/ http://localhost:3000/partner-pricing http://localhost:3000/settings \
  --out .styleseed/evidence/drift/<date> --project-root . --gate
```

`partner-pricing` reads `approved D-011` for its blue; any other screen painting actions blue reads
`violates D-010`. Without the ledger the same blue would read `different` on both screens, and the
report could not say which one was approved.

## Limits (v0)

- The ledger covers the measured token-level axes above. Structure facts (layout, grouping, component
  choice) arrive with the reference loop; until then, record them as prose decisions without an axis.
- The drift report applies entries by screen label, not by artifact.
- A decision is a project record, not evidence that the decision is good design. The drift report
  measures whether screens follow it; it does not judge it.
