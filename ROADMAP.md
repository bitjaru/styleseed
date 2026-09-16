# StyleSeed Roadmap

**Make expert design judgment repeatable by coding agents.** Do not replace experts with a
collection of aesthetic preferences. The [product constitution](engine/PRODUCT-PRINCIPLES.md)
is the canonical goal; this roadmap describes intended work, not shipped capabilities.

## Now — improve the engine's actual design quality

1. **Remove instruction contradictions.** Keep artifact scope, approved decisions, and the
   distinction between core floors and contextual defaults consistent across agent entry points.
   Add regression coverage for demonstrated failures rather than more blanket rules.
2. **Define expert-reviewed evaluation tasks.** Start with a B2B resource list, detail view,
   and settings form. Evaluate creating a small design system separately from adopting an
   existing one. Reference screens and acceptance criteria require real reviewer input; they
   must not be labeled expert-approved because an agent wrote them.
3. **Test implementation context.** Compare the current engine with task-specific component
   APIs/imports, token mappings, working state examples, and counterexamples. Then test whether
   a short implementation plan improves the result further.
4. **Promote only demonstrated improvements.** Compare functionality, blinded human visual
   review, correct reuse, cross-screen/session consistency, rework time, and model cost. Keep
   model versions, task inputs, budgets, and failures visible. BENCH-V1 does not establish the
   outcome of this new experiment.

The [design-judgment evaluation protocol](docs/DESIGN-JUDGMENT-EVALUATION.md) defines the first
bounded study. Paid model runs and private design-system access need separate authorization.

## Next — make approved decisions easier to apply

- **Project-native component contracts**, if the experiment supports them: when to use a
  component, its actual API and tokens, supported states, and executable acceptance examples.
- **Existing-system adoption** without replacing approved identity with a StyleSeed preset.
  Document unsupported inputs rather than claiming universal design-system import.
- **Korean typography and UX writing** with mixed-script examples and reviewer feedback.
- **Accessibility checks** for focus order, target sizes, and reduced motion, distinguishing
  machine checks from human evaluation.
- **Adapter conformance** so new render targets preserve decisions and expose verification limits.

## Later — team coordination and optional services

- Explore versioned approvals, bounded exceptions, and design-change review across repositories.
- Consider hosted PR review or evidence viewing only after teams demonstrate a recurring need
  and the engine shows useful quality/rework improvements. No enterprise-readiness or paid
  service availability is implied today.
- Keep reusable rules, local execution, and reviewable evidence central to the open-source
  project. Community grammars still need independent examples and counterexamples.

## How we decide what to build

For each proposal ask: whose judgment does it preserve, what can the agent now execute correctly,
how does it respect the existing system, and what evidence would disprove the claimed improvement?
A beautiful but noncompliant result fails; a compliant but poorly designed result also fails.
CI gates and evidence viewers support that decision, not replace expert judgment.
