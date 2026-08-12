---
name: ss-update
description: Check and update an existing StyleSeed installation by exact rule/skill revision, preserve project-owned design decisions, then recompile and verify the effective bundle.
argument-hint: "(no arguments needed)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# StyleSeed update

Update the **engine payload**, not the user's product UI. A release version describes a published
line; `engineRevision` identifies the exact maintained rules, skills, entry docs, and palette
engine. Two installs with the same release version are not proven equal until their revisions
match.

## When not to use

- First installation → `/ss-setup` or `$ss-setup`.
- One new screen or component → `/ss-build`, `/ss-page`, or `/ss-component`.
- A redesign of old UI → update first, then offer the optional retrofit step below.
- A heavily forked StyleSeed payload → stop after the dry-run report and request a manual diff.

## Ownership boundary

StyleSeed owns installed `ss-*` skill payloads and compiled `.styleseed/effective-rules.md`.
The project owns `STYLESEED.md`, application code, components, tokens, assets, and any existing
`AGENTS.md`, `CLAUDE.md`, or Cursor instructions. Never overwrite project-owned files merely to
update StyleSeed.

An update may change design-method behavior, especially across major versions. It is reversible
through the user's version control, but it is not correct to promise that every update is
additive or non-breaking.

## Step 1 — Read-only revision check

From the user's project root, run the bundled checker by its installed path:

```bash
node <installed-ss-update>/scripts/check-update.mjs --project-root . --json
```

Interpret the result exactly:

- `current` — installed and published revisions match; stop unless the user explicitly wants a
  reinstall.
- `update-available` — refresh the installed payload even when the semantic versions match.
- `project-bundle-stale` — skills are current; skip reinstall and re-resolve the project.
- `legacy-skill-conflict` — the retired standalone seven-category reviewer remains beside the
  canonical skills. Show its path and hash; remove it only after confirming it is not a
  project-modified skill.
- `remote-revision-unavailable` — version-only evidence cannot prove currency. Report the
  boundary and do not say “up to date.”

Also inspect `git status --short`. Do not modify files during this step.

## Step 2 — Report the update boundary

Before changing anything, report:

```text
StyleSeed update report
- Installed: <version> @ <revision>
- Published: <version> @ <revision>
- Project bundle: <version/revision or not resolved>
- Project worktree: clean | has existing changes
- Will refresh: canonical ss-* skill payloads
- Will preserve: STYLESEED.md, app code, components, tokens, assets, project instructions
- Requires review: compiled rule-bundle diff and any copied legacy engine docs
```

If the worktree has unrelated changes, preserve them. Recommend a commit or backup before a
method update, but do not use destructive reset/checkout commands as an update strategy.

## Step 3 — Refresh through the original install channel

Use the same channel that installed StyleSeed:

- Agent Skills CLI installation: run `npx skills add bitjaru/styleseed` and select the same
  project/provider scope. The repository exposes exactly the canonical 23 `ss-*` skills.
- Claude/plugin or another provider marketplace: use that provider's normal update action.
- Vendored source checkout: fetch the intended tag or commit, review the diff, and update the
  canonical engine as a set. Do not mix files from two revisions.

Do not implement an update with a blind recursive copy into an existing skills directory. The
installer must reconcile the managed payload; project-owned files stay outside that operation.

If this skill was invoked only to inspect availability, stop before the external refresh and
present the report.

## Step 4 — Prove the installed revision

Run the new checker's path again. Require the installed and published `engineRevision` values to
match before describing the engine as current. A matching version string by itself is not proof.

If the installed payload still reports the old revision, stop. Do not recompile the project from
a mixed or unproven installation.

## Step 5 — Recompile the project context

When `STYLESEED.md` exists:

1. Run the installed `ss-resolve/scripts/resolve-context.mjs` with
   `--project-root . --from-lock STYLESEED.md --agent <agent>`.
2. Inspect the diff for `.styleseed/effective-rules.md`, `.styleseed/manifest.json`, and generated
   palette files. The manifest must record the new `engineRevision`.
3. Run the same command with `--check`; require exit status 0.
4. Report the old and new bundle hashes. Do not use `llms-full.txt` as the project context.

The design lock persists selections, but a new engine revision may correctly change the compiled
method around those selections. Present that diff instead of hiding it.

## Step 6 — Check legacy copied docs

Older projects may contain copied `DESIGN-LANGUAGE.md`, `PRODUCT-PRINCIPLES.md`, `RULESETS.md`,
or provider entry files. Detect and report them. Do not overwrite project `AGENTS.md`,
`CLAUDE.md`, or `.cursorrules`; recommend replacing only an identifiable StyleSeed-managed block
or removing stale duplicate method files after review.

## Optional retrofit

Updating the engine does not redesign existing screens. If the user wants a retrofit:

1. confirm or create `STYLESEED.md`;
2. re-score the highest-traffic screen against the new effective bundle;
3. apply approved fixes with `/ss-review` or `$ss-review`;
4. render and inspect with `/ss-verify` or `$ss-verify`;
5. report before/after evidence without claiming the old score was measured when it was not.

## Completion report

Separate these states:

- installed revision: verified | not verified;
- project bundle: recompiled and hash-checked | stale | not present;
- application code: unchanged | explicitly retrofitted;
- code gate: passed | not run;
- visual gate: passed from inspected render | not run.

Never call installation, compilation, a build, or a score a visual verification.
