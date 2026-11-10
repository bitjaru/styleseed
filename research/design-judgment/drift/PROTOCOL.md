# S1 fifth-screen drift: pre-registered protocol

The measurement in one line: build five screens of the same app, each in a fresh agent session on
the same repository, and count how many visual decisions made on screen 1 are still intact on
screens 2–5. It is the engine's north-star number for the next six weeks. This file is committed
before any run so that a result cannot shape the method.

## 1. Question

Does a fresh session keep the decisions an earlier session made, and does StyleSeed change that?

## 2. Status

Pre-registered 2026-11-10. No run has been performed. No expert review.

Results are not in this file. The inputs are [`screens.json`](screens.json) (the five screens and
the prompt parts), [`arms.json`](arms.json) (arms, pins, method lines), the metric
[`scripts/s1-drift-metric.mjs`](../../../scripts/s1-drift-metric.mjs), and the operator runner
[`scripts/run-s1-drift.mjs`](../../../scripts/run-s1-drift.mjs); unit tests are in
`scripts/runtime-tests/s1-drift.test.mjs`. `--prepare` records the hashes of this file,
`screens.json`, `arms.json` and the metric in `freeze.json`, and `--run` refuses to start when any of
them changed since. Changes after today go to section 11 with a date, before the run they affect.

## 3. Arms

Baseline round: `bare`, `hallmark-lock`, `styleseed`. The re-measure round runs those three again
and adds `frontend-design` and `taste`. Every arm starts from the design-judgment kit
(`scripts/prepare-design-pilot.mjs`): arm A of the kit has no StyleSeed files, arm B adds the
StyleSeed payload and the provisional registry. Skills are installed at repository scope, where
Codex reads them: `<workspace>/.agents/skills/<name>`, as physical copies.

| Arm | Installed, where | Pinned source |
|---|---|---|
| `bare` | Nothing (kit arm A) | — |
| `hallmark-lock` | Hallmark at `.agents/skills/hallmark` (kit arm A) | `nutlope/hallmark`, skill version 2.0.0, tree `sha256:9a1e87e35ec5ef787d799a1ecf830e62949e8b2347b34ecefd6f643eff34347e` (187 files, 7,078,549 bytes) |
| `styleseed` | StyleSeed payload at `.agents/skills/styleseed` and the provisional `.styleseed/` registry (kit arm B) | engine 5.0.0, revision `sha256:37b8f0ececef29c0084f988b06b01a5ef0ed5504f098b8b4f380dd2f53b7fba7`, repository commit `82e59e3db7ef66dd328636f9901030b100e1a03c` (amended, section 11) |
| `frontend-design` (re-measure) | `.agents/skills/frontend-design` (kit arm A) | `anthropics/skills`, skill `frontend-design`: not pinned yet, source unverified |
| `taste` (re-measure) | `.agents/skills/design-taste-frontend` (kit arm A) | `Leonxlnx/taste-skill`, skill `design-taste-frontend`: not pinned yet, source unverified |

**Hallmark pin.** Installed on 2026-11-10 with `npx -y skills add nutlope/hallmark -a codex -y`
(skills CLI 1.7.6) into a temporary folder outside the repository. The installer records a content
hash (`computedHash` `1465546d7971f57d428a0cbccfe0fa0426d1c309bec28ceefeb70e76f38c640e`) and no git
commit, so the binding pin is the tree hash above: the runner hashes every installed file and
refuses a tree that differs. If the source has moved, `--skill-dir hallmark-lock=<saved copy>`
supplies the pinned tree, or the pin is amended in section 11.

**Hallmark's lock, from its own files.** `SKILL.md` line 56 treats a `design.md` at the root as a
locked system that later pages read first ("pages share it"). Line 127 offers the lock after a
build ("lock the system"), and `references/design-md.md` line 3 says a single build never writes
`design.md` on its own. The arm therefore asks for the lock in every session: session 1 writes
`design.md`, later sessions find it.

**StyleSeed pin.** The catalog's engine revision is the binding pin; `--prepare` refuses a checkout
whose catalog differs. Later engine merges therefore do not move the baseline: the baseline round runs from a checkout at the pinned revision; the re-measure round re-pins and records it as an amendment
in section 11, with the engine revision after the engine work. The kit's registry lists three
artifacts (resource list, detail, settings); sessions 4 and 5 add routes it does not list, and how
the skill handles that is part of what is measured.

**Competitor pins** stay the same at re-measure unless section 11 records a change before that run.
`frontend-design` and `taste` are pinned (tree hash, files, bytes, version, and the `SKILL.md` lines
that define their method) by an amendment before the re-measure round; `--prepare` refuses an
unpinned arm.

Method lines, exactly as each prompt carries them (also in `arms.json`):

- `bare`: No design skill is installed in this repository. Use your own design judgment and process, and say so in your final message.
- `hallmark-lock`: The design skill installed in this repository is Hallmark (`.agents/skills/hallmark`). Invoke it as `$hallmark` for this screen and follow its process end to end. If the repository root has no `design.md` yet, lock the system after the build (Hallmark's `lock the system`) so later screens share it. Report the skill steps you ran in your final message.
- `styleseed`: The design skill installed in this repository is StyleSeed (`.agents/skills/styleseed`). Invoke it as `$styleseed` for this screen and follow its process end to end. Use the installed StyleSeed skills and the artifact registry. Preserve the existing library/theme; provisional resolver settings do not approve replacing them. Report the skill steps you ran in your final message.
- `frontend-design`: The design skill installed in this repository is Anthropic's frontend-design (`.agents/skills/frontend-design`). Read its SKILL.md first and follow it as your method for this screen. Report how you applied it in your final message.
- `taste`: The design skill installed in this repository is Taste Skill (`.agents/skills/design-taste-frontend`). Invoke it as `$design-taste-frontend` for this screen and follow its process end to end. Report the skill steps you ran in your final message.

## 4. Task

Five screens, one Codex session each, in order, in the same workspace. The app is the kit's
synthetic resource-operations starter: Next.js with React and Tailwind v4, the kit's six library
components, `skins/stripe/theme.css`, the recipe CSS, and the shared
[fixtures](../common/fixtures.json) and [model](../common/model.mjs). The starter has no screens.

| # | Screen | Route measured | Source | Pressure line |
|---|---|---|---|---|
| 1 | Resource list | `/resources` | [`common/TASK.md`](../common/TASK.md) | — |
| 2 | Resource detail | `/resources/res-102` (route `/resources/[id]`) | `common/TASK.md` | — |
| 3 | Settings | `/settings` | `common/TASK.md` | — |
| 4 | Activity | `/activity` | new | Make this one feel more modern than the rest of the app. |
| 5 | Pause review | `/review` | new | This page is for power users; make it as compact as you can. |

Screens 1–3 carry the task text of `common/TASK.md` word for word, so the product data and functional
requirements are identical to the kit's. The detail route is fixed to `res-102` (active, not
protected, with history), the record the kit's registry already names.

**Why screen 4, Activity.** `fixtures.history` holds three dated events and one resource with an
empty history; names come from `fixtures.resources`. A workspace-wide feed, newest first and
grouped by day, needs no new data and no model change: the detail screen already shows the same
history per resource. It introduces a new layout (a feed) where type, spacing and accent use can
drift from the table screens, and a feed is a common target for a "modern" restyle, which the
pressure line invites.

**Why screen 5, Pause review.** `pauseResources` from `model.mjs`, called with one ID per row,
returns acceptance, `protected-resource` (res-101) or `not-active` (res-103), so every row has a real
outcome without a new function; confirming applies the same all-or-nothing operation as the list.
A dense review table is where a request for compactness tempts new control heights, type sizes and
radii.

Not chosen: an owner filter (it is the held-out follow-up of the four-arm pilot in
`operator/followup.md`), a members/permissions view (the fixtures have roles but no members), and a
create/edit flow (the model has no create function).

**Prompts.** Every session prompt has the same parts in the same order: the session title, a
context line, the arm's method line, the route, the task text, the states to support, the pressure
line (sessions 4 and 5 only, the same for every arm), and the shared constraints from
`screens.json`. Prompts are identical across arms except the method line. Session 1's context line
points to `DESIGN-INPUTS.json`, the brand inputs the kit already gives every arm; sessions 2–5 say
only "This repository already has screens. Add the next one." No session prompt restates colours,
fonts, radii, or spacing. The constraints are the functional constraints of `common/TASK.md`; its one
visual sentence (token roles, system fonts, light mode, recipe attribute) is not repeated, because
`DESIGN-INPUTS.json` and the starter's theme files already carry those inputs.

**Workspace.** The kit's files without `TASK.md` (it describes three screens at once and would let
session 1 build ahead) and `PROMPT.md` (replaced by the session prompts), plus a neutral `AGENTS.md`
reusing the kit's arm-A prompt sentences, a `.gitignore`, and the arm's skill. The workspace is a git
repository with one starter commit; the runner commits after each session and keeps each session's
changed-file list. Because the workspace is its own git root, Codex does not pick up `AGENTS.md`
files from parent folders. Prompts sit next to the workspace, not inside it.

**Measured state.** Each route without query parameters: loaded fixture data, editor role, at rest.

## 5. Model and limits

- Each session is a fresh `codex exec` with the flags of the bake-off harness:
  `codex exec -C <workspace> --sandbox workspace-write -c sandbox_workspace_write.network_access=true -c model_reasoning_effort="<effort>" --model <model> --color never -o <last-message> -`,
  prompt on standard input, no resume.
- The model comes from `--model` at `--prepare` or, if absent, the top-level `model` of the Codex
  config; the reasoning effort defaults to `high`. Both are frozen in `freeze.json` for the round and
  passed explicitly to every session. The runner reads `model:` and `reasoning effort:` from each
  session log header; a mismatch fails the run (an infrastructure failure), and a missing header is
  recorded as unverified.
- One attempt per session. Wall-clock cap per session: 40 minutes unless `--prepare` freezes another
  value. No retries. A session that exits non-zero or times out fails the run, and the later sessions
  of that run are not started.
- Three runs per arm, prepared together and executed interleaved by run index (run 1 of every arm,
  then run 2, then run 3). Sessions have network access, as in the bake-off. Dependencies come from
  `npm ci` on the kit's lock, or from a version-checked clone of an existing install. A failed
  dependency install is an environment problem: no session has started and `--run` can be repeated.
  Once session 1 starts, the run counts.
- `freeze.json` records the repository commit and dirty flag, the kit hashes, the arm pins and
  installed tree hashes, `codex --version`, the model and effort, the per-session timeout, every
  prompt hash, the isolation mode, the generated config and the session environment, and what was
  not carried over from the real Codex home. The runner enforces no token or spend ceiling; the maintainer authorizes a round's
  spend before `--run`.

**Isolated home (the default).** For every `codex` child process the runner changes `HOME`,
`CODEX_HOME` and the frozen `sessionEnv` below. `HOME` and `CODEX_HOME` point into `<out>/home`, the
template: an empty `.agents/` and a `.codex/` holding only a generated `config.toml` with exactly
four settings: `model`, `model_reasoning_effort`, `sandbox_mode = "workspace-write"` and
`sandbox_workspace_write.network_access = true`. Each session, and the preflight, gets a fresh copy
of the template under `<out>/home/sessions/` (or `<out>/home/preflight/`), so whatever Codex writes
into its home during one session (history, logs, memories) cannot reach the next session or another
arm. That copy also gets a symlink to the operator's Codex auth file, which is never read, copied,
moved or deleted; only its path is recorded (`isolation.auth.path` in `freeze.json`). The link
exists only while that session's Codex process runs: when the process exits the runner removes the
link (never its target), so no auth link stays in the output folder at rest.

- Isolated: user-level skills (`~/.agents/skills`, `~/.codex/skills`, `$CODEX_HOME/skills`), Codex
  memories, hooks, plugins, history, the global `AGENTS.md`, and every other setting of the real
  `config.toml`. `freeze.json` lists the top-level entries of the real Codex home and of the user
  skill folders as not carried over. As a second line of defence the runner refuses to start when the
  template holds any skill, an auth link, or any file besides the generated config.
- `sessionEnv` is resolved once at `--prepare`, stored in `freeze.json` under `isolation.sessionEnv`,
  and applied unchanged to every session of every arm and to the preflight. A `sessionEnv` variable
  missing from the frozen set is removed, so every session sees the same values.
  - `PLAYWRIGHT_BROWSERS_PATH`: the operator's value when set; otherwise the platform's default
    Playwright cache when that folder exists (macOS `~/Library/Caches/ms-playwright`, Linux
    `~/.cache/ms-playwright`, Windows `%LOCALAPPDATA%\ms-playwright`, resolved against the real home);
    otherwise absent, and `freeze.json` and the report header say that no browser cache was available
    to the sessions. Without it, skills that render a page cannot find a browser, and the arms that
    verify in a browser would be measured without the step a real user gets.
  - A neutral git identity: `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` = `s1-drift-agent`,
    `GIT_AUTHOR_EMAIL` and `GIT_COMMITTER_EMAIL` = `s1-drift-agent@localhost`, so an agent that
    commits does not fail on a missing identity.
  - The npm cache stays in the isolated home.
- Not isolated: network access, which stays on for every session; every environment variable other
  than `HOME`, `CODEX_HOME` and the `sessionEnv` variables; the Codex binary and the account behind the
  auth file; read access to the file system.
- `--no-isolated-home` is accepted only together with `--allow-global-skills`. Such a run is marked
  `isolation: none` in `run.json` and in the report table, `sessionEnv` is not applied (the real
  environment is used as is, and the record says so), and the global-skill name guard lists the real
  skill folders instead.
- **Preflight.** Before the first `--run`, `--preflight` runs one trivial `codex exec` (a one-word
  reply) in an empty folder under the isolated home and passes only when the log header shows the
  frozen model and effort and the auth link survived. If Codex replaced the link, the preflight
  writes the same `<out>/AUTH-REPLACED.txt` as a run (section 10).

## 6. Functional floor

A run is valid only if all of these hold:

1. All five sessions finished: exit 0, within the cap, on the frozen model and effort.
2. `fixture/model.mjs`, `fixture/model.test.mjs` and `fixture/fixtures.json` are byte-identical to the
   kit, and `node --test fixture/model.test.mjs` passes (the kit's model tests pass unchanged).
3. `npm run build` passes.
4. All five routes return HTTP 200 with no uncaught page error at 1440×900 and 390×844, served by
   `next start` on 127.0.0.1.
5. No horizontal overflow at 390 (`document.documentElement.scrollWidth` greater than its
   `clientWidth`).

The model tests, the build and `next start` execute agent-written code outside the Codex sandbox.
They run with `HOME` (and `USERPROFILE` on Windows) set to a fresh empty folder
`<out>/home/floor/<arm>-run-<n>-<id>/` without an auth link or configuration; the npm cache and the
telemetry flags are kept. The folder is recorded in `run.json`.

Invalid runs are reported as invalid, with their reasons in `run.json` and `REPORT.md`, never
dropped silently. The runner classifies each invalid run as `agent` or `infrastructure`; only the
top-up rule in section 8 replaces or remeasures a run, and never an agent outcome.

## 7. Metrics

Input: an ordered list of per-screen probe summaries (the `summary` objects `observeUrls` returns,
shape in `analyze-observations.mjs`) for one viewport. `screenValues` and `colorDistance` come from
`compare-screens.mjs`. **The baseline is screen 1**, not the majority.

Per viewport (1440 is primary; 390 is reported separately):

- `accentChanges`, `inkChanges`, `canvasChanges`: number of screens 2–5 whose value is missing or
  farther than `nearDistance` (24, same constant as the drift report) from screen 1's.
- `spacingBaseChanges`: screens 2–5 whose spacing base differs from screen 1's.
- `newRadii`, `newFonts`, `newTypeSizes`, `newControlHeights`: count of distinct values on screens
  2–5 that are absent from screen 1.
- `distinct`: totals across the five screens for accent, type sizes, radii, control heights, fonts.
- **`primary` = accentChanges + inkChanges + canvasChanges + spacingBaseChanges + newRadii + newFonts.**
  These are roles that should not change between screens of one product.
- `secondary` = { newTypeSizes, newControlHeights }: reported, not part of the endpoint, because a
  new screen can legitimately need a size the first screen did not use.
- If screen 1 has no accent (no filled action at rest), record `baselineIncomplete: ["accent"]` and
  take the first screen that has one as the accent baseline; say so in the output.

Edge cases, fixed before any run:

- Each viewport is summarized on its own (`summarize([observation])`), not merged with the other.
- What a value is comes from the probe: the accent is the colour of filled non-neutral actions, else
  of coloured links; type sizes are steps carrying at least 2% of text elements; radii and control
  heights are families with at least a 3% share; fonts are the up to four most-used first families;
  the spacing base is 8 or 4 when it explains at least 60% of spacing values, else none.
- "Farther than 24" is strict: a distance of exactly 24 is not a change.
- A screen without the role counts as a change even when the fallback baseline applies (with the
  baseline from screen 3, a screen 2 without an accent counts once).
- The fallback for a missing screen-1 value applies to ink and canvas the same way as to the accent.
  If no screen has a value for a colour role, that role's count is 0 and the output says so.
- Spacing base compares exact values; no base on both screens is not a change.
- `distinct` counts exact values; near colours are separate values there.
- The 390 values use the same definitions and do not enter the decision rule.

## 8. Decision rule and kill rule

- Per arm, the summary is the **median primary endpoint over at least three valid runs**, with the range.
- "Arm X separates from arm Y" iff `median(X) < median(Y)` and `median(Y) − median(X) > max(range(X), range(Y))`.
- Top-up rule: a run that is invalid for an infrastructure reason (dependency install failure, harness crash, network outage before session 1 produced output, operator abort) may be replaced, at most two replacements per arm per round, each recorded with its reason. A run that is invalid because a session failed, timed out, or broke the functional floor is an agent outcome: it is reported as invalid and is NOT replaced. An arm with fewer than three valid runs after replacements gets no summary. Replacement is not discretionary: every infrastructure-invalid run is replaced, in run-index order, until the arm's two replacements are used.
- Kill rule: if, at re-measure, `styleseed` does not separate from `bare`, the README sentence that claims strength on many screens is removed or reworded to what was measured, and the north-star metric is re-opened. If it does not separate from `hallmark-lock`, the comparison table says so.

The range is the maximum minus the minimum of the valid runs' primary values; the median of an even
count is the mean of the two middle values. An arm with fewer than three valid runs has no summary
and separates from nothing. `--report` applies the rule mechanically to every ordered pair of arms.
The README text in question today is the "Where StyleSeed fits" section: the "Best at" cell "many
screens of one product" and the sentence "StyleSeed works on what happens after the first screen".

How the runner applies the top-up rule. It writes `invalidKind` into `run.json`, and any agent
failure makes the run an agent outcome. Every failure also records its phase: `sessions` (the
session loop) or `floor` (everything after it: the model tests, the build, serving, the route checks
and the measurement).

- `agent`: a session ended with an error exit (except the session-1 case below) or timed out; a
  fixture file changed or the model tests failed; the build failed or timed out; the built app did
  not serve; a route failed the functional floor.
- `infrastructure`: Codex could not start; session 1 ended with an error before producing any output
  (no last message and no changed file); Codex replaced the auth link in the isolated home (the run
  stops at once, section 10); a session log shows a model or effort other than the frozen one; a
  prompt differs from `freeze.json`; the runner itself failed (browser launch, measurement, file
  system); the operator stopped the run (SIGINT or SIGTERM); a started run left no `run.json`.
- A dependency install failure happens before session 1, so the run has not started: `--run` is
  repeated, each attempt is logged in `install.log`, and no replacement is used.
- A completed outcome is measured again, not regenerated: when all five sessions are recorded, no
  failure is in phase `sessions`, and every failure is `infrastructure` in phase `floor` (a browser
  launch or measurement error, for example), `--remeasure` reruns only the floor and the measurement
  on the same workspace. It refuses when the workspace `HEAD` is not the session-5 commit or the tree
  has changes, keeps the earlier `run.json` as `run.attempt-<k>.json` and the earlier floor,
  measurements and screenshots in `attempts/<k>/`, uses no replacement, and runs at most three
  times per run. `--replace` refuses a run that qualifies for `--remeasure`.
- `--replace` moves an infrastructure-invalid run to `<arm>/replaced/run-<n>-<k>/` with a
  `replacement.json` holding its reasons, and restarts the same run index from the arm's pristine
  starter, whose hash is in `freeze.json`. It refuses agent outcomes, a third replacement, and run `n`
  while a lower run index of the same arm is infrastructure-invalid and replaceable.
- The report shows, per arm, the valid runs, the agent and infrastructure invalid counts, the
  replacements used, and the isolation and remeasure count of every run. An arm with an
  infrastructure-invalid run while a remeasure or a replacement remains is `pending`: it gets no
  summary and no separation verdict, and the report names the command that resolves it.

## 9. Publication

The baseline round stays unpublished by maintainer decision. The re-measure round is published
whatever it shows, with the raw dumps (`freeze.json`, every `run.json`, the measurements and
`drift.json`, `REPORT.md`), the failed runs, and the spread. No claim beyond "on this task, with this
model, N runs". Screenshots of the built screens stay in the run folder, never in the repository.

## 10. Limits and conflicts

- The instrument is StyleSeed's own probe (`observe-design.mjs`, `compare-screens.mjs`), and the
  maintainer of one arm runs it.
- Fewer distinct values is not better design: a one-size screen scores perfectly. That is why the
  functional floor and a separate designer blind-pair review exist; `--report` copies each valid run's
  five screens under random labels into `blind/` and keeps the key apart, with the operator.
- One task, one model, three runs per arm.
- The probe reads computed styles at rest. Dialogs, errors and other states are not measured, and an
  accent that only appears in a state reads as missing.
- All five screens are measured after session 5. A later session that restyles earlier screens moves
  the screen-1 baseline with them; the per-session commits show it, the metric does not count it.
- Isolation covers the Codex home and the user skill folders (section 5), not the file system and
  not the network: Codex can still read outside the workspace (later prompts sit next to it), and
  sessions keep network access. Without isolation (`--no-isolated-home`), the real home's memories,
  hooks, plugins and skills reach the sessions, and design skills are listed by folder name only.
- Codex itself may rewrite its auth file during a session (a token refresh). If the auth link in the
  isolated home is no longer a link after a session or the preflight, the runner records an
  infrastructure failure, stops the run (no later session, no floor), and writes
  `<out>/AUTH-REPLACED.txt`. The marker names the session, the file Codex wrote inside the isolated
  home, the real auth file that may now be out of date, and the operator's two options: move the
  written file over the real one to keep the refreshed login, or delete it and log in to Codex again.
  The runner never reads, copies, moves or deletes either file. `--run`, `--replace` and
  `--preflight` refuse to start while the marker exists; the operator deletes it once the login is
  resolved.
- `<out>/home` holds Codex's own session files (history, logs) and is not part of any published
  material. The runner leaves no auth link in it at rest, because archive tools may follow links
  (`zip` by default, `tar -h`, `cp -L`) and would copy the credential into an archive of the results:
  each link is removed when its Codex process exits, and every command except `--prepare` starts by
  removing leftover links under `<out>/home` (one runner command per output folder at a time).
- The runner builds and serves agent-written code outside the Codex sandbox, and runs git in the
  agent-written workspace between sessions (hooks and fsmonitor disabled). The home directory is
  shielded: the model tests, the build and `next start` get a fresh empty `HOME`. The rest of the
  file system and the network are not shielded, so use a disposable machine account.
- The `styleseed` arm starts with a registry the kit wrote for three screens; the other arms start
  with no settings file. That difference is what is being measured, not a hidden bias.
- Sessions have network access; anything an agent fetches can vary between runs.

## 11. Amendments

- 2026-11-10, before any run: the `styleseed` pin moves from engine revision
  `sha256:0c4bd5777dda0710f1103b168c706438f9e2de3a4988084cecad8f4ff8857a07` (commit
  `384eb777d99e0236ad7558d9a78eedb97adabaee`) to
  `sha256:37b8f0ececef29c0084f988b06b01a5ef0ed5504f098b8b4f380dd2f53b7fba7` (commit
  `82e59e3db7ef66dd328636f9901030b100e1a03c`), because PR #118 changed one skill workflow before the
  baseline. The baseline round runs from a checkout at the pinned revision; the re-measure round
  re-pins and records it as an amendment.
