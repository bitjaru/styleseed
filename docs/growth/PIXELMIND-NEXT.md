# StyleSeed Vision Engine next work — 2026-09-30

Status: read-only recovery and implementation recommendation. Pixelmind runtime/repository was not
modified. Current ownership stays with its separate session. Public name stays StyleSeed Vision
Engine; `@pixelmind/*` remains the internal/package namespace.

## Decision

Prioritize a **project-contract-aware reviewer** behind StyleSeed's resolve → build → render →
review loop. Its output should identify a concrete defect, its rule, what to preserve, uncertainty,
and how to recheck. Keep historical benchmarks as historical evidence. Defer a universal ranking
relaunch and paid automated score gate until contract fidelity and human calibration are measured.
This is a product recommendation, not a settled customer-demand result.

## Current verified evidence

Checked local and GitHub main: `98e694ac77e56fc59eebc85e23f27d2a432004d2`, last commit 2026-07-25.
Only local `cro/` was untracked; its contents were not inspected. GitHub open issues/deployments
queries returned empty; that does not rule out deployment in another system.

- `bench/v1/validation.json`: pass=true, scored=120, failed=0, blocked=15.
- V1 gate gain +5.3 for Claude Code/Codex is same-judge feedback-loop score improvement under the
  historical protocol. No human-quality or current-model generalization follows.
- `packages/sdk/src/see.ts` rejects non-default rubrics. `SeeInput` has no selected artifact bundle
  contract. `rubrics/default.ts` names StyleSeed v2.8 and penalizes multiple accents, light borders,
  and uncarded content. `vision/shared.ts` repeats a one-accent premise.
- `packages/grader-web/app/api/grade/route.ts` calls OpenAI; the reported historical Codex single-screen
  repeatability result cannot establish this production provider's agreement or calibration.
- Grader, share card, reviewer UI and $39 report proposal are code/plans. Purchase, live delivery,
  active usage and expert calibration were not verified. No provider calls or paid experiment ran.

## First scoped implementation in Pixelmind

Preserve DEFAULT_RUBRIC and all BENCH-V1 artifacts unchanged. Introduce an opt-in evaluator contract
version rather than changing historical scores in place. No automatic default-provider switch.

Input contract v1 proposal:

```ts
type ArtifactReviewContext = {
  schemaVersion: 1;
  artifactId: string;
  engineRevision: string;
  methodHash: string;
  adapter: string;
  grammar: string;
  intent: string;
  ruleBundle: string; // selected artifact only; bounded size, no llms-full dump
  preservedDecisions: Array<{ id: string; requirement: string; appliesTo: string }>;
  declaredExceptions: Array<{ ruleId: string; condition: string; rationale: string }>;
  render: { viewport: { width: number; height: number }; state: string; screenshotSha256: string };
};
```

Bundle, screenshot, identifiers and decisions can contain project/private data. Build a local preview
and byte-bound context validator first. Provider exposure needs the project's established grant;
never upload automatically from a diagnosis or accept a hash alone as human authorization.

Output: structured findings referencing supplied rule/decision IDs, observed region, severity,
confidence/uncertainty, recommended bounded change, and preservation constraints. Include
`notAssessed` for hidden behavior, exact contrast/target dimensions without measurements, unseen
states, and human acceptance. Score is optional, separately calibrated, and never blocks a functional
failure from being reported. Recompile/source drift invalidates the contract/report association.
Treat evaluated text/code as untrusted evidence, never tool instructions. This boundary needs tests.

## Acceptance before live rollout

1. Offline contract/schema/provenance tests: missing/oversize/unknown fields, artifact mismatch,
   modified screenshot or bundle, stale source/contract, unsupported adapters. Reject rather than
   silently falling back to the old rubric.
2. Preservation counterexamples: approved purple actions; semantic multicolor status/chart;
   border-led operations rows; editorial layout with no cards; dense console typography; nested
   native spacing. No false deduction solely from those choices. One-control defects are paired
   with each correct screen: overflow, collapsed gap, wrong grouping, hidden focus, or unreadable text.
3. Explicit task/adapter scope: screenshot only establishes visible state. Use deterministic DOM
   measurements for spacing/overflow/contrast; actual interactions for save/retry/navigation.
4. Bounded calibration: three screen types (list/detail/settings), desktop and mobile, two independent
   reviewers. Include legitimate exceptions and known defects; reviewers decide what is a defect
   before the model output is shown. Track false-positive preservation failures and missed defects
   by category; report disagreements instead of tuning to the same judge's score.
5. Fix-and-transfer experiment: equal time/token/revision opportunity for the baseline; compare task
   success, rework, preservation, reviewer acceptance and cost. Keep best score separate from final
   accepted artifact. Stop if the reviewer repeatedly changes approved choices or misses task failure.

Reviewer identity, permissions, model/runtime, sample count and cost cap need to be fixed before
paid model runs. The historical SD≤3/MAE≤6/recall≥75% targets are proposed gates from the old plan,
not current passed results. Do not invent human approval.

## Distribution and payment

Use bounded, reproducible defect stories now (first: `/fix-ui-spacing`), with before/after, source,
and measured scope. No anonymous "AI-slop percentage" or current-model leaderboard without a
fixed denominator/protocol and actual data. Public feedback should ask whether a diagnosis matches
the reader's project, not ask for stars or votes.

Only after review→repair→recheck completes for real projects, test a manually reviewed report offer.
The paid hypothesis is saved review/rework time, not a larger number of automated scores. Record
accepted priorities, delivery time, repeat requests and actual payments before subscriptions/teams.

## Fresh primary-source context

- [v0 Design Systems 2.0](https://v0.app/docs/design-systems-2) already packages source-grounded
  skills/starters with human approval and updates. Generic component-context import is insufficient
  differentiation by itself.
- [Design Arena](https://www.designarena.ai/about) already describes human-judgment/blind-vote
  ranking. The old "unoccupied leaderboard format" premise is not a usable claim.

The proposed differentiation is preservation of approved project decisions across actual repairs,
with measured limits and reusable evidence. Customer demand remains to be validated.
