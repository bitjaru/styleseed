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
9. **Validate** — build at least one screen not shown in the references; score and visually
   verify it. A grammar that only recreates the source screen has failed abstraction.

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

## Generated project artifacts

Write these under `.styleseed/rulesets/<slug>/`:

- `RULESET.md` — human-readable twelve-axis contract and source provenance;
- `tokens.json` — semantic values/ranges, never component-specific copied hex alone;
- `evidence.json` — source IDs, observations, confidence, and unresolved questions;
- `checks.md` — required tells, forbidden tells, and visual regression scenarios;
- `reference-board.html` — visual evidence beside each extracted claim when images are usable.
- `adapter.json` — selected `ADAPTERS.md` contract plus artifact-specific overrides.

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
