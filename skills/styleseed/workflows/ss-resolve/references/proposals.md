# System proposals: values with their basis

`ss-resolve/scripts/propose-system.mjs` proposes the numbers a product's system is built from (control
height, type sizes, corner radius, table row height, spacing unit, and the other ledger axes when there
is a basis for them) and says, for each one, what it rests on. A proposal is a count and a choice: it
states what was measured, on how many systems of which kind, and leaves the value to the person who
decides for the project. It does not review the product, nothing in it is scored, and it gates nothing.
Nothing is in force until a person records it in the [decisions ledger](decisions.md) under their name.

```bash
node <installed-ss-resolve>/scripts/propose-system.mjs --project-root . --surface pointer --write
```

## Basis order

Each axis lists its options strongest first, and the first one is proposed when it is measured:

1. **The project's recorded decision.** A recorded axis shows `Recorded: …` and proposes nothing; change
   the entry or record an exception instead.
2. **The person's own measurement.** A reference the person measured with `/ss-reference`
   (`--reference <slug>`): first one whose axis is kept in the project's reference contract, then one
   measured but not kept.
3. **Corpus counts.** The published demo screens of a few design systems, measured by the StyleSeed
   repository and shipped with this skill as counts (below).
4. **The engine default.** What the engine's components, brand recipe, and starting spacing scale ship.
   It is always labelled `engine default, not measured` and is never proposed.

## The rule for a corpus value

A corpus value is proposed when it leads on at least 3 measured systems, on at least two thirds of the
systems measured for its row, with at least 1 product system among them (a company's own design system
rather than a kit). Below that the counts are shown, with the options, and nothing is proposed. One
system counts once however many of its screens were measured. A page type reads its own row when that
row has 3 measured systems, otherwise the row of all page types pooled; `settings` reads the form rows.

## Statuses

| Status | Meaning |
|---|---|
| `recorded` | The ledger already decides this axis for the whole project |
| `proposed` | The first option is a measured reference or a corpus value under the rule |
| `split` | The measured systems disagree; the counts are shown |
| `thin` | Fewer than 3 systems were measured for the row |
| `unmeasured` | No measured basis; only the engine default is listed |

## One value of a set (`partial`)

A corpus value describes one role: the height most labelled buttons of a screen have, the size most
characters are set in. Most ledger axes are sets: `controlHeights` holds every control height the product
uses, `typeSizes` every text size, and the drift report reads any value outside a recorded set as
`violates D-…`. A proposal built from such a role is marked "one part of this axis, not the whole set"
and adds a "Before recording" line: add the other values with `--entry <axis>=<all values>`; those
values are listed as chosen without a measured basis. Every block also says what the drift report will
do once the entry is recorded ("If recorded: …").

## Touch

The corpus was measured with pointer input, at 1440 wide and the same pages narrowed to 390. A width
is not touch. With `--surface touch` nothing is proposed from the corpus; control height shows the
44px floor of `CRAFT-control-heights`, and the engine default lists only the shipped sizes at or above
it. A measured reference still proposes, and its values under the floor are marked.

## Files and options

- `--write` writes `.styleseed/proposals/SYSTEM.md` (what a person reads) and
  `.styleseed/proposals/system.json` (the same proposal with every count). They are not resolver outputs
  and not manifest inputs; rewrite them whenever the inputs change. Without `--write` the Markdown goes
  to stdout; `--json` prints the object.
- `--entry <axis>=<v1,v2,…>` prints the ledger entry for a value set the person chose: the matching
  option's entry, or the values attributed to the options that hold them, with the rest listed after
  `chosen:`. It writes nothing. Every entry the tool prints has `approvedBy` and `date` empty and no
  id; it does not compile until the person's name is on it.
- `--reference <slug>` adds a reference measured in this project
  (`.styleseed/evidence/_reference/<slug>/measurements/`). When `.styleseed/rulesets/<slug>/evidence.json`
  is a generated contract a person has signed off (see [decisions](decisions.md)), the axes it keeps
  count as kept; a draft counts as measured, and the tool says so.
- `--artifact <id>` picks the artifact in a registry project; `--page <id>` reads another page type's
  rows.
- `--engine-defaults [--page <id>]` prints what the engine ships beside the corpus rows for the same
  roles, as counts. It needs no project and changes nothing.

## The evidence pack

The corpus reaches this skill as one generated file, `references/evidence-pack.json`, built by
`scripts/build-evidence-pack.mjs` in the StyleSeed repository from one dated run of its corpus study (in
the repository's `research/` folder, which does not ship). It holds the run id, the viewports, each design system's name and kind with its
screen counts, and, per claim, page type, and viewport, how many systems landed in each value bucket,
counted by kind. It holds no per-system value and nothing from the measured pages' text. The shipped
component values sit beside it in `references/engine-defaults.json`, read from the component sources, so
the two never mix. A later run reaches the skill as a new pack; the run id is printed on every proposal.

**Run `2026-11-12`, settings page, pointer input** (dated example): control height 32px proposed (3 of 4
measured systems); type sizes 14px proposed as one part of the set (text field text, 3 of 3); one
primary action per section proposed (4 of 4); corner radius, table row height, and spacing unit have no
measured basis in this run.

## Limits

1. **A thin corpus.** Four design systems on full screens, two of them kits, one measured on two screens;
   desktop consoles only. Every line prints its counts and kinds, and below the rule nothing is proposed.
2. **The tool speaks with more weight than its basis.** "Proposed: 32px" sits on the same line as its
   count, an entry cannot compile without a person's name, and the agent presents the counts as printed.
3. **Roles and sets.** Recording a single default height or body size as a whole axis makes the next
   drift run flag every other value; the "If recorded" and "Before recording" lines say so.
4. **Buckets.** Heights are rounded to 4px in the study (37 counts as 36); a proposal prints the bucket.
5. **Page types are coarse.** `settings` reads the form rows; a row with fewer than three systems falls
   back to the pooled row, which mixes page types and often has no single value.
6. **Touch.** A touch-first project gets no corpus proposal, and the shipped defaults under the 44px floor
   are printed as such.
7. **Two ledger locations.** A project without a registry keeps its ledger in `.styleseed/decisions.json`,
   a registry in `.styleseed/project.json`; the resolver refuses the file in a registry project, and the
   move is manual.
8. **An agent can type a name.** The tool leaves `approvedBy` empty and the workflows forbid filling it in;
   nothing mechanical stops an agent from doing it. Repository history and the person's own review remain
   the control.
