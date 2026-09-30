---
name: styleseed
description: Build, improve, or inspect UI with StyleSeed. Preserves project design choices and routes setup, layout, tokens, review, rendered verification, and updates through one entry point.
---

# StyleSeed

Use the user's goal to choose one first workflow below. This is the only registered core
skill; the 22 workflows and their executable dependencies ship inside this directory.
Read only the selected workflow, then references needed for that task.

## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested
artifact first. Read its `.styleseed/bundles/<artifact-id>.md` and manifest. A partial or invalid
registry is an error; never fall back to the global legacy bundle. Legacy projects may use
`.styleseed/effective-rules.md` only when no registry exists.

Before the first workflow in a project/task session, follow the
[update preflight](workflows/ss-update/references/update-preflight.md).

## Working contract

- Preserve approved project design choices. Support expert judgment; a score is not human acceptance.
- Resolve the current artifact first. For multiple plausible artifacts, ask one bounded clarification question.
- Never fan out to run every workflow. Choose exactly one first workflow; it may call the required gates.
- Honor the user's authorized scope. Audit, score, verify, and status requests do not authorize edits.
  Workflow metadata records the intended tool/scope boundary even though it is not host registration metadata.
- Paths in workflow files are relative to those files. Resolve installed scripts from this skill's
  actual directory, never assume a particular agent folder or download a missing sibling skill.
- In older instructions, `/ss-build`, `$ss-build`, and other `ss-*` names mean the corresponding
  internal workflow. Read `workflows/<name>/WORKFLOW.md`; do not invoke an unregistered skill.
  Users may say `StyleSeed build`, `$styleseed build`, or the old workflow name in natural language.
- Learning is an optional extension, not part of the core install. Only for explicit learning capture,
  use separately installed `ss-learn`; if absent, report that dependency and never auto-install it.

## Choose exactly one first workflow

| Request | Read |
|---|---|
| Build or redesign a screen, page, or component | [build](workflows/ss-build/WORKFLOW.md) |
| First setup or missing design lock | [setup](workflows/ss-setup/WORKFLOW.md) |
| Explore creative directions; direction not yet selected | [studio](workflows/ss-studio/WORKFLOW.md) |
| Use screenshot, URL, Figma export, or existing UI as a reference | [reference](workflows/ss-reference/WORKFLOW.md) |
| What is wrong with this screen; UX critique | [audit](workflows/ss-audit/WORKFLOW.md) |
| Review implementation against project design rules | [review](workflows/ss-review/WORKFLOW.md) |
| Score implementation or run code/evidence gates | [score](workflows/ss-score/WORKFLOW.md) |
| Inspect rendered output, screenshot, or spacing in pixels | [verify](workflows/ss-verify/WORKFLOW.md) |
| Change spacing/density or another single design axis | [dial](workflows/ss-dial/WORKFLOW.md) |
| Apply an aesthetic profile | [restyle](workflows/ss-restyle/WORKFLOW.md) |
| Brand color, semantic palette, or design tokens | [tokens](workflows/ss-tokens/WORKFLOW.md) |
| Named animation or motion treatment | [motion](workflows/ss-motion/WORKFLOW.md) |
| Specifically scaffold a page | [page](workflows/ss-page/WORKFLOW.md) |
| Specifically generate a reusable component | [component](workflows/ss-component/WORKFLOW.md) |
| Compose existing primitives into a UI pattern | [pattern](workflows/ss-pattern/WORKFLOW.md) |
| Accessibility audit and requested fixes | [a11y](workflows/ss-a11y/WORKFLOW.md) |
| Quick design lint | [lint](workflows/ss-lint/WORKFLOW.md) |
| Navigation and user flows | [flow](workflows/ss-flow/WORKFLOW.md) |
| UX microcopy | [copy](workflows/ss-copy/WORKFLOW.md) |
| Loading, empty, success, or error states | [feedback](workflows/ss-feedback/WORKFLOW.md) |
| Update installation or consolidate old skill entries | [update](workflows/ss-update/WORKFLOW.md) |
| Compile rules, inspect local install/bundle/evidence health | [resolve](workflows/ss-resolve/WORKFLOW.md) |

For status-only requests use resolve's read-only `scripts/styleseed-doctor.mjs`; do not update,
recompile, or visually inspect instead. For vague requests infer the first step from project state
and the user's goal; ask only when an unresolved choice materially changes the work.
