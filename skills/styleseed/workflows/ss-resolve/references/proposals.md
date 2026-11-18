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
   measured but not kept; then the product's own screens (`--own`, below).
3. **Corpus counts.** The published demo screens of a few design systems, measured by the StyleSeed
   repository and shipped with this skill as counts (below).
4. **The engine default.** What the engine's components, brand recipe, and starting spacing scale ship.
   It is always labelled `engine default, not measured` and is never proposed. For control height it is
   the set of heights the shipped components draw with the project's brand recipe: the recipe's
   `--ss-control-height` plus each offset the components use (with `enterprise-workbench`, 24, 28, 32,
   36, 40, 48px). A project that names no recipe, or one the file does not have, gets the `:root`
   block's set (28, 32, 36, 40, 44, 52px), because that is what the CSS draws. The basis says "the
   components of this StyleSeed version": an updated skill can describe components the project has not
   copied again.

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
| `proposed` | The first option is a measured reference, the product's own screens, or a corpus value under the rule |
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
44px floor of `CRAFT-control-heights`. The engine default is the same set as on pointer, what the
recipe's components draw (with `native-mobile`, 32, 36, 40, 44, 48, 56px), and its values under the
floor are marked. A measured reference still proposes, and its values under the floor are marked too.

## From the product's own screens

`--own <path>` reads the `inventory.json` that `drift-report.mjs … --inventory` writes for the product's
screens at rest (a path relative to the project root, for example
`.styleseed/evidence/drift/<date>/inventory.json`). It adds one option per axis after the references and
before the corpus counts; when no reference outranks it, that option is the proposal. Two rules decide
which values the option holds:

- **Control height and corner radius** take the `dominant` values: those on at least 10% of the counted
  controls (visible control boxes, fields and buttons together) or boxes with a visible edge, and at least
  the most frequent one. Values under 10% are left out of the option. They stay in the block's first line,
  and after "If recorded" the block lists the values in use that the drift report would then read as
  `violates D-…`, with how many elements and screens carry each; add the ones the product keeps with
  `--entry <axis>=<all values>` before recording.
- **Type sizes** take the `shared` values: those on at least half of the screens as the drift report counts
  them (a size that holds at least 2% of a screen's text elements). The share of elements does not decide
  here, because a type size on few elements can be a real heading: a page title used once per page is small
  in count and still part of the system.
- **Spacing unit** takes the base found on the most screens, as the drift report reads it.

The block's first line counts what the screens use ("This product (3 screens measured …): 6 control
heights in use; 32px on 55% of 102 controls, …"), control heights also for fields and buttons separately.
The corpus lines follow it unchanged, and nothing joins the two sets of counts. Control heights counted
before the visible control box (an inventory whose `controlBoxVersion` is null) are the older reading,
taken from the input element, and give no option. An entry from this option has the source
`own-screens:<date>#<axis>` and the basis "measured on <n> screens of this product, <date>".

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
