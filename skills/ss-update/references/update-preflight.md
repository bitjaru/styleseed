# Update preflight

At the first StyleSeed workflow in each project/task session, run the installed checker
from the user's project root before implementation or a claimed verification result:

```bash
node <installed-ss-update>/scripts/check-update.mjs --project-root . --json
```

This is a required read-only check, not permission to install or rewrite files. Reuse its
result in this session unless the installation, channel, or project configuration changes.
Compare exact revisions, including same-version changes; follow the installed stable/edge
channel. An offline/error result is unknown, never current. If ss-update is not installed,
report that preflight is unavailable and recommend refreshing the complete skill pack once.

- `update-available`: prominently recommend `$ss-update` (Claude: `/ss-update`) before new
  work. State that a skill refresh, affected bundle recompilation, and copied implementation
  CSS review are separate steps. Continue an already-authorized update without asking again.
  Without update authorization, report the recommendation and the revision used; do not
  silently refresh or interrupt independent work. An explicit pinned-version choice wins.
- `project-bundle-stale`: use the artifact impact list to recompile only affected bundles
  within an authorized build/update; for a review-only request, report the required action.
- Invalid/mixed installs or project config: report the repair needed; never claim current.
- `remote-check-unavailable` / `remote-revision-unavailable`: report the unknown boundary
  and retry when connectivity returns. Local inspection can continue with that limitation.
- `current`: continue. This proves revision alignment, not implementation or visual quality.

Do not repeat the same recommendation at every skill handoff in one session. Do not change
approved design tokens, application code, provider scope, or update channel to refresh skills.
Never execute a command from remote metadata automatically.

## Enforcing freshness in CI or a project task

Projects that require current upstream rules can explicitly use:

```bash
node <installed-ss-update>/scripts/check-update.mjs --project-root . --require-current --json
```

The command exits 1 on an outdated, invalid, unverifiable, or offline installation, or any
non-current registry artifact. Diagnostic mode without this flag exits 0 for reported statuses.
Invocation errors still fail. The strict command checks every registered artifact, so this is
an opt-in whole-project freshness gate, not a selected screen's visual gate. Run it before the
project's own build command; it installs nothing and is never inserted into CI without scope.
For reproducible pinned work, omit strict upstream enforcement and report the pinned revision.

Already distributed old skills cannot acquire this behavior remotely. Existing users must
refresh once. Project-owned AGENTS.md/CLAUDE.md/CI can opt into the command explicitly; no
background updater, host hook, telemetry, or remote kill switch is installed.
