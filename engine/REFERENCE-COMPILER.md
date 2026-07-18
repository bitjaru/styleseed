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

## Compiler pipeline

1. **Ingest** — capture/render each reference; do not infer from a brand name alone.
2. **Observe** — describe visible facts without aesthetic labels. For sequential artifacts,
   observe both frame-level composition and sequence-level progression.
3. **Measure** — estimate spacing units, type ratios, measure, radii, control heights,
   surface levels, palette roles, contrast, layout proportions, and density.
4. **Classify** — identify user job, page type, attention model, navigation, action hierarchy,
   states, responsive behavior, imagery/data role, and motion evidence.
5. **Cluster** — retain repeated decisions; label single-reference choices as hypotheses.
6. **Resolve conflicts** — prefer the user's stated goal, repeated evidence, accessibility,
   and task fitness in that order. Never average incompatible systems into a muddy hybrid.
7. **Abstract** — express transferable rules and tokens, not copied component coordinates.
8. **Compile** — write the artifacts below and select the nearest built-in fallback grammar.
9. **Validate** — build at least one screen not shown in the references; score and visually
   verify it. A grammar that only recreates the source screen has failed abstraction.

## Twelve-axis output

The compiler must fill the same twelve-axis contract as `RULESETS.md`: user job, attention,
composition, density, typography, color, surfaces, imagery/data, navigation/action, states and
motion, responsive transformation, and characteristic tells/anti-patterns.

For each axis record:

```text
Decision · evidence IDs · confidence (high/medium/low) · allowed range · counterexample
```

## Generated project artifacts

Write these under `.styleseed/rulesets/<slug>/`:

- `RULESET.md` — human-readable twelve-axis contract and source provenance;
- `tokens.json` — semantic values/ranges, never component-specific copied hex alone;
- `evidence.json` — source IDs, observations, confidence, and unresolved questions;
- `checks.md` — required tells, forbidden tells, and visual regression scenarios;
- `reference-board.html` — visual evidence beside each extracted claim when images are usable.
- `adapter.json` — selected `ADAPTERS.md` contract plus artifact-specific overrides.

Then update `STYLESEED.md`:

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
