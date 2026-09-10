# Design-judgment pilot preparation

Status: **offline preparation, not an agent run or an expert-approved experiment**.
Goal: make expert design judgment repeatable by coding agents, not replace experts with presets.
This kit prepares the three-screen study proposed in
[the evaluation protocol](https://github.com/bitjaru/styleseed/blob/3915d86a1673d15ba66943dd659221ea3dfd97d6/docs/DESIGN-JUDGMENT-EVALUATION.md).
It is separate from the two-screen external-app regression in PR #33 and BENCH-V1.

## What is prepared

| Condition | Shared inputs plus additional context |
|---|---|
| A | Common task, decision data, synthetic fixtures/model tests, component/token library, dependency lock; no StyleSeed skills or compiled rules |
| B | A + the exact installed StyleSeed skill payload and three provisional artifact configs |
| C | B + source-grounded component/token/API guidance and typechecked API examples |
| D | C + a request for a short implementation plan within the same total budget |

The task covers resource search/filter/selection/bulk actions, permission-aware detail/history,
and settings validation/save failures/unsaved changes. All four conditions get identical underlying
code, data, decision inputs, and tools; C/D differ in how implementation context is delivered.
No completed page, model answer, visual golden, or expert score is supplied.

The current library is a **synthetic adoption rehearsal**: six real StyleSeed primitives/helpers,
the existing `skins/stripe/theme.css`, and recipe CSS copied byte-for-byte. It is not a production
enterprise system or an official Stripe library. The skin, resolver palette, primitive defaults,
and accessibility requirements are not assumed compatible; actual experts must approve or revise
the fixture and its exceptions before a quality trial. Existing sub-44px component defaults and
fixed color/radius choices are documented in C's usage context, not silently repaired in the library.
All arms can inspect those same original source files.

`DESIGN-INPUTS.json` exposes the same provisional choices to every condition. B/C/D additionally
receive the machine-readable registry; each artifact requires human acceptance. Its three render
entries are a compiler rehearsal minimum, not the full UI-state rubric. Root/shared source changes
conservatively affect all three artifacts. The prep kit does not generate evidence reports.

## Commands

From the repository root, check inputs without writing anything:

```sh
node scripts/prepare-design-pilot.mjs --check
```

Create fresh physical copies outside the source checkout:

```sh
node scripts/prepare-design-pilot.mjs --prepare
```

An optional `--output <new-directory>` after `--prepare` selects a new folder whose parent already
exists. Existing folders/files/symlinks and destinations inside the checkout are refused. No
credentials, network calls, package installs, agent sessions, or Git writes occur. Temporary
packages remain for inspection; only remove an explicitly inspected run directory.
Source reads use an explicit file list; skill copying follows the catalog inventory rather than
scanning arbitrary extra files in an installation.

The output has `arms/A` through `arms/D` plus `operator/`. Each arm has its own `PROMPT.md`,
`TASK.md`, fixture tests, actual library, Next/React/Tailwind dependency declarations/lock, and CSS
entry point. Screen/layout/route implementations are deliberately absent, so this is not yet a
buildable three-screen app. Demo lifecycle scripts are removed; no marketing-site code is copied.
The full existing dependency graph is retained for reproducibility, not advertised as a minimal app.

`operator/freeze.json` records the source commit, dirty-checkout flag, exact source hashes,
engine revision, common-input hash, and each condition's file inventory. Uncommitted input bytes
are explicitly marked; make a clean committed preparation before freezing a real run.
`operator/review.json` has empty reviewers, approvals, limits and thresholds. The held-out follow-up
task is operator-only and never copied into initial arm folders.

## Local verification

```sh
node --test scripts/runtime-tests/design-pilot.test.mjs
node scripts/check-design-pilot-examples.mjs
```

The second command requires the demo's installed locked dependencies (`npm ci --prefix demo-pricing`)
and checks copied component APIs using TypeScript; it also requires two invalid uses to be rejected.
It never installs dependencies itself. The canonical full repository gate includes this check;
the dependency-free runtime checks run in both Ubuntu and Windows CI.

Checks establish deterministic/additive inputs, copy independence, registry compilation, refusal
of overwrites/path escape, permission/atomicity/data-retention behavior in the **pure model**, and
API type correctness. They do not establish interactive UI behavior, rendering quality, complete
accessibility, controlled agent exposure, or statistical validity. Example snippets are not running
asynchronous state demonstrations. Do not present these checks as completed quality comparisons.

## Before any real model run

1. Have named human experts approve the task/rubric, reference library, incompatibility handling,
   noncompensable failures and promotion thresholds before outputs exist.
2. Freeze exact model/runtime/tool versions, both code/input revisions, run count, time/token/spend
   ceilings, retry policy and explicit execution authorization. All values are currently unset.
3. Put each condition in a separate restricted environment. Sibling folders are **not a security
   boundary**: globally installed skills, parent instructions, network/repo access and session history
   can contaminate a comparison. Copy only one arm into the actual runtime and verify isolation.
4. Implement/freeze browser acceptance checks for every task state, including selection reset,
   cancel/confirm, routing recovery, saving/failed retry and dirty navigation. Pure model tests are
   not substitutes. Run the shared-library compatibility rehearsal before paid generation.
5. Randomize and blind result labels for human review, record disagreements and actual rework/cost,
   then run the operator-only follow-up in a fresh session after initial outputs are frozen.

`readyForAgentRuns` stays false: this tool has no `--run`, `--approve`, or score-promotion path.
Editing a JSON approval field does not create human authority. This preparatory package enables
review of the proposed experiment; it does not imply expert participation or quality improvement.

Repository-authored code is under [MIT](../../LICENSE). Copied package metadata retains upstream
license information. Any additional third-party/private design system or assets need their own
authorization and license review before replacing the rehearsal fixture.
