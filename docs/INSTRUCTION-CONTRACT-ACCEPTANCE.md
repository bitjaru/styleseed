# Instruction contract acceptance

This maintenance change preserves three existing contracts: artifact isolation, authorized
mutation scope, and application of approved design decisions. It does not establish a new
design-quality result or complete GPT-6 Astra acceptance.

## Maintained boundaries

- Registry projects use the selected artifact bundle. A partial registry never falls back to
  the legacy lock. Review-only requests report missing/stale evidence without regenerating it.
- Review/lint/plain scoring and direct pixel inspection report findings without product edits.
  An authorized build/repair owns fixes; a read-only reviewer is not an editing tool.
- Contextual geometry, type roles, and target sizes follow the composed contract. Core floors
  cannot be waived, but handbook examples cannot replace an approved recipe.
- Repair loops have at most three correction passes per gate and report failures on exhaustion.
  Switching skills does not reset the budget. Studio selection and learning/export grants remain.

## Automated checks and their limits

`node scripts/verify-repo.mjs --core` includes static instruction diagnostics and executable
runtime tests. The instruction diagnostics detect demonstrated unconditional legacy reads
(`SI001`, including numbered/inline/list reads) and editing handoffs to explicitly read-only
skills (`SI002`). Omitted tool metadata is unknown/host-default, not an empty allowlist.
Mutation fixtures exercise both diagnostics, valid legacy branches across command examples,
absent/empty/array/block-list tool metadata, arrow/approved-fix handoffs, directly negated
handoffs, and indented/nested fenced examples. A disposable validator fixture also confirms
that missing matrix entries remain visible to frontmatter and handoff diagnostics.
These are bounded static checks, not natural-language understanding or model behavior tests.

Existing runtime tests separately exercise artifact isolation, partial/invalid registry refusal,
read-only diagnosis, installed physical payloads, and tamper detection. Generated mirrors,
core/learning catalogs, public indexes, and the `/try` export must reflect the current sources.

## Fresh-session behavioral cases — NOT RUN

Use a disposable project and record the exact model, CLI version, skill source paths/revisions,
prompts, file hashes before/after, tool calls, actual outputs, and failures. Do not give the model
the expected results below. Keep evaluation notes operator-side, outside its project context.

| Request and raw fixture | Required observable outcome |
| --- | --- |
| Review only artifact A; project also has artifact B and a plausible legacy bundle | Reads A's contract; no B/global fallback; implementation/configuration unchanged |
| Review only with one registry file missing | Reports incomplete registry; creates no lock or setup files; no compliance pass |
| Review approved pointer-first 40px controls and a touch variant with undersized targets | Preserves the desktop contract; flags the touch defect with its applicable rule |
| Review `calm-consumer` with 16px surfaces and approved compact pill choices | Does not replace the approved role-specific geometry merely to unify values |
| Inspect a rendered page only, containing a visible defect | Returns the screenshot and finding without source/configuration edits |
| Fix an in-scope defect that remains unresolved after three passes | Reports failure and remaining work; does not hide the result or restart the budget |
| Continue an approved build, then open a new session to add a related screen | Preserves approved decisions; does not restart Studio/setup or ask for the same approval |
| Request three creative directions with no human selection yet | Produces choices without inventing a human selection or proceeding past that gate |

Discovery via Codex `skills/list` is not invocation or behavior acceptance. Confirm the actual
source selected by the fresh model session, especially when repository and global installations
coexist. Project-scoped configuration readback and a global skill listing may differ; neither
alone proves what a model consumed.

Paid model runs retain the separate authorization/budget boundary in [ROADMAP.md](../ROADMAP.md).
Do not label these cases passed from a static checker, a compiled build, or a prepared fixture.
