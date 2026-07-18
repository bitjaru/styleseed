# StyleSeed Product Constitution

StyleSeed is an **AI design-method engine**. Its primary job is to make a coding agent
reason like a strong UI/UX designer and apply that reasoning consistently. Components,
skins, scores, and screenshots support that job; they do not define it.

## The fixed method, not one fixed look

StyleSeed enforces a stable way of judging design. It does **not** force every product to
look like Toss, a SaaS dashboard, or the StyleSeed demo. A trustworthy consumer-finance
home, an observability console, an editorial story, and a product-detail page solve
different jobs and therefore need different design grammars.

The effective rule set is composed:

```text
Core judgment
  × one output grammar from RULESETS.md (built-in or reference-compiled)
  × one surface adapter from ADAPTERS.md
  × one domain playbook from APP-PLAYBOOKS.md
  × one page type from PAGE-TYPES.md
  × optional aesthetic profile from PRESETS.md
  × bounded project tokens from STYLESEED.md
= the rules for this screen
```

## Authority order

When instructions disagree, use this order:

1. **Core invariants** below.
2. **Output grammar** — the functional visual language selected in `RULESETS.md`, or a
   project-local grammar compiled by `REFERENCE-COMPILER.md`.
3. **Surface adapter** — the renderer contract and physical constraints in `ADAPTERS.md`.
4. **Domain playbook** and **page/artifact type**.
5. **Aesthetic profile** — an optional coordinated restyle from `PRESETS.md`.
6. **Design lock** — records selections and bounded project parameters.
7. **Skins and components** — implementation material, not sources of judgment.
8. **Score and visual verification** — evidence that the method was applied.

`STYLESEED.md` is persistence, not permission. An arbitrary value in the lock never turns
a violation into a sound design decision. Unknown values fall back to the nearest maintained
grammar and the core defaults.

## Core invariants

These apply to every grammar, profile, domain, page, skin, and agent:

- One deliberate visual system per product: radius, spacing, elevation, icon language,
  typography, color roles, imagery, and motion agree.
- One focal point per screen and a clear information hierarchy.
- Color communicates role or meaning. One primary action remains identifiable even when
  semantic, categorical, or product colors are present.
- Semantic tokens replace component-level hardcoded colors.
- Spacing follows a repeatable scale; proximity communicates grouping.
- Typography fits the surface and task, with readable measure, contrast, and hierarchy.
- Data surfaces include useful loading, empty, and error states.
- Controls remain operable: visible focus, sufficient targets, labels, reduced-motion
  support, and no dark patterns.
- Motion fits the surface and never delays comprehension or action.
- Distinctiveness comes from the product, its content, and its selected grammar — not a
  copied demo, generic indigo, repeated icon chips, emoji chrome, or template uniformity.

## What the lock may select

The lock may select only inputs the engine understands:

- domain, surface adapter, page/artifact type, and one output grammar;
- one optional aesthetic profile and one skin or semantic token set;
- primary action/accent, type pairing, density, radius, elevation, imagery, and motion values
  inside the selected grammar's allowed ranges;
- one product-specific signature move that still obeys the invariants;
- a project-local reference grammar with provenance and confidence recorded by the compiler.

The lock may not invent a palette mode, waive accessibility, legalize mixed systems, or
override a core invariant. A reusable built-in grammar requires research, examples, and
regression evaluation. A reference-derived grammar stays project-local until it meets that bar.

## The product loop

```text
understand the job → choose or compile a grammar → lock bounded decisions
→ build with judgment → score the implementation → visually verify rendered output
→ present the result and evidence
```

The build method is the product. Scoring and verification are auxiliary gates: they find
drift, but they never choose or rewrite the design philosophy after the fact.
