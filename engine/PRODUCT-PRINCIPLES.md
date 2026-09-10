# StyleSeed Product Constitution

StyleSeed makes expert design judgment repeatable by coding agents. It is not a collection
of aesthetic preferences that replaces designers.

**StyleSeed는 전문가를 대체하는 디자인 취향 모음이 아니라, 전문가의 디자인 판단을
코딩 에이전트가 반복해서 실행할 수 있게 만드는 시스템입니다.**

This is the project's goal, not a claim that today's engine reproduces expert-level quality.
The current design-method engine compiles selected rules, preserves project decisions, and
supports implementation and evidence workflows. Components, skins, scores, and screenshots
support that purpose; neither their count nor a passing score proves that the goal is achieved.

## Decisions stay with people

- Experts define intent, applicability, tradeoffs, and acceptable exceptions. The agent applies
  recorded decisions; it does not acquire the expert's authority by reading them.
- Preserve the project's approved design system. Do not replace its identity, tokens, or
  components with a StyleSeed preset merely to make the output look different.
- Distinguish accessibility and functional floors, approved project choices, adjustable
  heuristics, and unresolved human decisions. A recommendation is not approval.
- If an approved choice cannot be expressed by the current engine, report that limitation and
  propose a bounded change. Do not silently remap it or pretend arbitrary design-system import
  already works. This goal does not change the resolver's supported values or authority order.
- People may deliberately revise durable choices and re-run checks. Generated scores and
  byte-bound evidence do not authenticate expertise or substitute for design acceptance.

## Development decision test

Before changing the engine, name the design decision being made repeatable, its owner and
applicability, the implementation context the agent needs, and the evidence that would show
an improvement. Maintenance fixes may instead name the existing contract they preserve.

Prioritize task-specific component APIs, token mappings, working state examples, and tests
over adding more aesthetic rules. Evaluate new-system creation and existing-system adoption
separately. Measure functional correctness, expert-reviewed visual quality, correct reuse,
cross-screen/session consistency, and human rework alongside model cost.

A compliant but poorly designed screen is not success; neither is an attractive screen that
breaks the approved system. Use independent human evaluation before claiming expert-level
quality. The research sequence and unimplemented work live in the repository `ROADMAP.md`.

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
  × one brand recipe from BRAND-RECIPES.md
  × one semantic palette posture plus an optional key-color generation from PALETTE-RECIPES.md
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
5. **Brand recipe** — a reusable morphology and component-selection contract from
   `BRAND-RECIPES.md`.
6. **Palette system** — a maintained semantic posture plus deterministic key-color generation,
   role mapping, gamut handling, and contrast correction from `PALETTE-RECIPES.md`.
7. **Aesthetic profile** — an optional coordinated restyle from `PRESETS.md`.
8. **Design lock** — records selections and bounded project parameters.
9. **Skins and components** — implementation material, not sources of judgment.
10. **Score and visual verification** — evidence that the method was applied.

`STYLESEED.md` is persistence, not permission. An arbitrary value in the lock never turns
a violation into a sound design decision. Unknown values are resolver errors, not permission
to silently choose a different grammar. Use only an explicitly configured, supported fallback.

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
- one maintained brand recipe, one semantic palette posture, optional bounded key-color generation,
  one optional aesthetic profile, and one skin or project token implementation;
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

Repeatable application of expert decisions is the product goal. The build method implements
that goal; scoring and verification are supporting gates. They find drift, but never choose
or rewrite the design philosophy after the fact or replace the responsible human's judgment.

## Learning without surveillance

StyleSeed may preserve a design lesson only when a person explicitly asks it to capture an
accepted correction. The stored candidate contains generalized conditions, counterexamples, and
measured evidence—not source code, prompts, screenshots, brand tokens, product identity, or user
content. Local review and export approval are separate decisions. Preparing a package does not
transmit it. Returning it through MCP requires another one-time human grant and must be reported as
client/model exposure. No candidate may automatically modify project or core rules.
