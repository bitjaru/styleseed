# Design-judgment evaluation — proposed protocol

Status: **DRAFT; no expert review or model comparison performed.** This document implements the
research direction in [ROADMAP.md](../ROADMAP.md), not a performance or enterprise-readiness claim.
The goal is [repeatable application of expert judgment](../engine/PRODUCT-PRINCIPLES.md).

## Question and hypothesis

Does task-specific implementation context help a coding agent apply a design system better than
the current StyleSeed instructions alone? A second hypothesis is that a short implementation plan
improves composition and state coverage. Neither hypothesis is established by BENCH-V1 or by the
[external-app regression](EXTERNAL-APP-ACCEPTANCE.md), which tests a fixture and evidence handling.

## Three connected tasks, two separate tracks

| Screen | Required task/state coverage | Human judgment to evaluate |
|---|---|---|
| Resource list | Search, filter, selection, bulk action, loading/empty/error | Scan order, density, selection clarity, action consequences |
| Detail | Status, permission-aware actions, history, unavailable data | Evidence hierarchy, continuity with list, safe action placement |
| Settings form | Validation, saving/saved/error, unsaved changes | Grouping, label/help relationships, recovery and retained input |

- **New system:** an expert reviews a small original design system before implementation trials.
- **Existing system:** use an authorized, version-pinned component/token library and preserve its
  approved choices. Record unsupported engine inputs; do not substitute a StyleSeed skin.
- Use identical product data, functional requirements, viewports, and authorized assets within
  each track. Keep setup/contract-authoring effort separate from implementation effort.
- Do not turn the existing two-screen incident fixture into an expert reference by relabeling it.

## Conditions

| Arm | Context |
|---|---|
| A | Agent with the task and the same underlying project/library, no StyleSeed |
| B | Current StyleSeed baseline, frozen to an exact SHA |
| C | B plus a task-specific component contract and executable examples |
| D | C plus a short implementation plan: information priority, pattern choice, states, responsive treatment, and explicit exceptions |

For C, supply only verified project paths: component import and API, semantic token mapping,
when to use/not use it, working examples for relevant states, and the commands/assertions that
exercise them. Cite the library revision and decision owner. Do not invent imports or claim
automated Figma/component mapping exists. D requests a reviewable plan, not private reasoning.

Freeze the baseline SHA, candidate SHA, dependency lock, prompt files, model/version, tool access,
wall-clock/token/spend limits, retry policy, and run count before execution. Use fresh workspaces;
do not leak other arms' output to the agent. Keep the underlying library accessible to every arm
so the study compares context delivery, not access to implementation assets.

Start with one matched four-arm pilot on one model and one track (three connected screens per
run). This is a feasibility check, not a statistical benchmark. Authorize any paid runs first.
Choose repeated runs and a second agent only after the pilot, without using pilot scores as the
confirmatory result. No particular sample size or spend is authorized by this document.

## Evaluation and promotion

1. Experts approve the task rubric and its noncompensable failures before seeing arm outputs.
   Record actual reviewers and conflicts; an agent-created alias is not expert participation.
2. Functional checks cover task completion, state recovery, keyboard operation, responsive
   overflow, and forbidden replacement of approved components/tokens. Report every failure.
3. Randomize labels/order for visual reviewers and hide the arm, model, and self-score. Review
   actual running screens and matched screenshots. Score hierarchy, typography, density,
   composition, and cross-screen coherence separately; retain disagreements.
4. Measure correct library reuse, human changes/time to acceptance, and generation time/tokens/
   cost. Define what counts as reuse and rework before scoring. A self-score is diagnostic only.
5. In a fresh session, request a held-out change on the same repo without restating identity.
   Check preserved choices and valid adaptation, not screenshot identity. Separate intentional
   human revisions from drift; keep unrelated secrets and private project data out of artifacts.
6. Promote only when required functionality and the approved system remain intact, human review
   shows useful improvement, and the pre-agreed rework/cost tradeoff is acceptable. Reviewers must
   set numeric thresholds before runs; do not select thresholds after seeing results. Publish
   bounded conclusions, failed runs, missing evidence, and the limits of a small pilot.

## Prerequisites still open

- Actual expert reviewers and approved reference/rubric for each track.
- Authorized existing-system fixture, component APIs, and license/asset review.
- Frozen baselines, model availability, pilot budget, repetitions, and acceptance thresholds.

Until these are supplied, protocol preparation and local regression tests may proceed; expert
approval, paid evaluation, and claims of quality improvement remain **NOT VERIFIED**.
