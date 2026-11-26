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

## The system first

`SYSTEM.md` opens with "The system this project starts with", then "To take it", then "Details and counts": the
lines about the corpus, the project, and the rule (and the touch line when it applies), the blocks described below,
"Measured systems", and "Recording". `system.json` holds the first section as its last key, `system`, and the
Markdown prints the first two sections from that key and the command alone.

The table has eight rows, each named for what takes the value: the default height of controls (buttons, inputs,
selects, tabs), the corner of buttons and the controls that share it, the corner of inputs, selects, and textareas,
the corner of list rows, the corner of cards, the padding inside a section card and the other pattern cards, the gap
between sections, and the side margin of the page. A row the ledger does not record shows what the shipped
components draw with the project's brand recipe, or with the `:root` block of `recipes.css` when the project names
none: engine defaults, labelled not measured. A value that is not plain px (the `clamp(…)` of `expressive-brand`)
prints as not a fixed value. The field corner is the skin's, which no brand recipe sets. A recorded row gives the
entry's id and what `.styleseed/system.css` does with it, read as the resolver reads it: draws it after a resolve in
place of the look's value, or sets it and keeps it if the look changes when it equals the look's value. A registry
project records and does not draw, and the row says so. The height row also says when the recorded default is a
look's own default (the file leaves it to the look), when the look now draws another height, and when the recorded
control heights name no default height; when block 1 proposes a height, it says from where. A recorded corner adds
one line under the table: the drift report does not check a button's or a field's corner. The counts stay under
"Details and counts".

"To take it" prints the first of these that applies:

| Kind | When | What it prints |
|---|---|---|
| `recorded` | The recorded default height is one the file sets, or a look's own default at the height the look draws | Nothing to record |
| `no-default` | The recorded control heights name no default height | The `--default-height` command whose entry goes in place of the recorded one |
| `registry` | A registry project, with no project-wide control height recorded, or with a look's own default at a height its look does not draw | No entry: a decision there is project-wide, and its artifacts can have different looks |
| `floor` | Touch, and the look draws a default under 44px | No entry; the command for a 44px default |
| `entry` | No project-wide control height recorded | The entry `--default-height` prints for the height the look draws, and what recording it changes |
| `replace` | A look's own default recorded at a height the look does not draw | The entry for the height the look draws, to put in place of the recorded one under its id |

The entry under "To take it" is the one `--default-height` prints for the same project, built from the proposal the
project would have without its project-wide `controlHeights` decision. When the product's own screens, a reference,
or an agreeing corpus row hold the height the look draws, the entry carries that basis, and
`.styleseed/system.css` then sets the height and keeps it if the look changes; the text says so.

On touch, nothing whose default is under the 44px floor of `CRAFT-control-heights` is offered unless the person asked
for it: the command for a 44px default is named and its entry is not printed, because the 44px family changes every
control of the product. A family whose default is 44 still holds 32, 36, and 40px, and block 1 marks them under the
floor. A registry project is offered no entry: its decision is project-wide while its look is per artifact, and the
height it records is not drawn. A height for one artifact is a decision with `scope.artifacts`; the drift report
applies it to the screens named in its `scope.screens`.

## Basis order

Each axis lists its options strongest first, and the first one is proposed when it is measured:

1. **The project's recorded decision.** A recorded axis shows `Recorded: …` and proposes nothing; change
   the entry or record an exception instead. For control height, `--default-height <px>` (below) also
   prints a replacing entry, which goes in place of the recorded one under its id.
2. **The person's own measurement.** A reference the person measured with `/ss-reference`
   (`--reference <slug>`): first one whose axis is kept in the project's reference contract, then one
   measured but not kept; then the product's own screens (`--own`, below).
3. **Corpus counts.** The published demo screens of a few design systems, measured by the StyleSeed
   repository and shipped with this skill as counts (below).
4. **The engine default.** What the engine's components, brand recipe, and starting spacing scale ship.
   It is always labelled `engine default, not measured` and is never proposed in a block. The first section
   offers the default height the look draws as one entry, labelled not measured unless a measured option holds
   the same height (above). For control height it is
   the set of heights the shipped components draw with the project's brand recipe: the recipe's
   `--ss-control-height` plus each offset the components use (with `enterprise-workbench`, 24, 28, 32,
   36, 40, 48px). A project that names no recipe, or one the file does not have, gets the `:root`
   block's set (28, 32, 36, 40, 44, 52px), because that is what the CSS draws. The basis says "the
   components of this StyleSeed version": an updated skill can describe components the project has not
   copied again. For corner radius it is the brand recipe's control, inset, and surface radius. When the
   ledger records a control or field corner (`controlRadius`, `fieldRadius`), the recorded control corner
   takes the place of the recipe's, the recorded field corner is added, and the basis names those entries
   ("recorded control corner 999px (D-001) in place of the recipe's 3px"), so an entry taken from this
   option holds the recorded corners.

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
do once the entry is recorded ("If recorded: …"). Control height is the exception: where the corpus proposes
the height, block 1 prints `--default-height <px>` in place of a one-value entry, and where nothing is proposed
it names that command before `--entry controlHeights=<values>`.

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
  `.styleseed/proposals/system.json` (the same proposal with every count; `proposalVersion` 2, with the
  first section as its last key, `system`). They are not resolver outputs and not manifest inputs; rewrite
  them whenever the inputs change. It prints one line for the default control height (`system: default
  control height 36px (the brand recipe, not measured); not recorded`, or the id that records it), then
  one line per axis. Without `--write` the Markdown goes to stdout; `--json` prints the object.
- `--entry <axis>=<v1,v2,…>` prints the ledger entry for a value set the person chose: the matching
  option's entry, or the values attributed to the options that hold them, with the rest listed after
  `chosen:`. It writes nothing. Every entry the tool prints has `approvedBy` and `date` empty and no
  id; it does not compile until the person's name is on it. It also takes two axes the ledger records
  and the tool never proposes, `controlRadius` (the corner of buttons and of the controls that share it)
  and `fieldRadius` (the corner of inputs, selects, and textareas): exactly one whole number from 0 to
  200, or 999 for a pill, listed after `chosen:` (`--entry controlRadius=8` prints "Buttons and the
  other controls that share their corner use an 8px corner."). A corner already recorded stops it with
  that entry's id; change the entry instead. When a recorded `radii` decision does not hold the value,
  the entry is printed and one line names that decision and the value to add, because the resolver
  refuses a `radii` decision without a recorded corner. With a single control height it adds one line:
  one height recorded alone flags the other sizes of the shipped components; use `--default-height`.
- `--default-height <px>` prints one `controlHeights` entry for a default control height and writes
  nothing. Its values are the height and every offset the shipped components draw around it
  (`controlHeight.offsets` in `references/engine-defaults.json`: for 32, 20, 24, 28, 32, 36, 44px), and its
  statement names the default ("Default controls are 32px tall; at that default the shipped components of
  this StyleSeed version draw 20, 24, 28, 32, 36, 44px. Basis: …"). The basis is the first option of the
  control-height block that is not the engine default and holds the height: a reference or the product's
  own screens as they stand, a corpus count only on a row that agrees and only the count of that height;
  otherwise "engine default of brand recipe <id>, not measured" for the recipe's own height, or "chosen"
  beside the height the recipe draws. On a recorded axis the basis is read from the options the block
  would have without the record. The `source` starts with the token `default-height:<px>; ` and then names
  the basis as other entries do (`engine-default:recipe.<id> (not measured)` when the person took the
  brand recipe's own default, `chosen: <px>` when nothing measured holds it): it matches
  `^default-height:([1-9][0-9]*); (.+)$`, and the height is one of `values`. Keep `source` as printed when
  recording; it carries the default height. In a project without a registry, `.styleseed/system.css` draws
  the height after the next resolve unless the person took the brand recipe's own default, and the command
  says so on stderr: for a height other than the brand recipe's, that where the file is not imported the
  components keep the brand recipe's height and the drift report reads the sizes the entry does not hold as
  `violates`; for the brand recipe's own height with a measured basis, that the file sets it and keeps it if
  the look changes. A registry project records the height and does not draw it: the components keep the
  height the brand recipe draws, and when the two differ the command says so on stderr with the sizes the
  drift report then reads as `violates`. With `--surface touch` and a default under 44px it
  prints the entry and the floor line, because a recorded decision outranks a default rule. On a recorded
  axis it names the id the entry replaces: put the entry in its place and keep that id. It takes
  `--reference`, `--own`, `--page`, and `--artifact`, and is refused beside `--entry`, `--write`, `--json`,
  and `--engine-defaults`. The entry is built by `defaultHeightEntry` in `system-proposal.mjs`, which a
  later caller can hand a basis of its own (words and a source, written after the token).
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
   drift run flag every other value; the "If recorded" and "Before recording" lines say so. For control
   height, `--default-height` prints the default with the sizes the shipped components draw around it, and
   block 1 prints that command in place of a one-value entry when the corpus proposes the height.
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
