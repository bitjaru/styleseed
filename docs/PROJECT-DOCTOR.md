# Read-only project doctor

Run from your application directory, using the **actual installed path** of `ss-resolve`:

```sh
node <installed-ss-resolve>/scripts/styleseed-doctor.mjs --project-root .
node <installed-ss-resolve>/scripts/styleseed-doctor.mjs --project-root . --artifact app-dashboard --json
```

For contributors running from the StyleSeed checkout:

```sh
node engine/.claude/skills/ss-resolve/scripts/styleseed-doctor.mjs --project-root /path/to/application --json
```

The placeholder is not a package name or a shell command. For a project-local installation it
may be `.agents/skills/ss-resolve`; use the path actually created by your installer. This command
ships inside the existing resolver skill, not as a 24th skill or a new npm executable.

## What it checks

| Layer | Meaning | Follow-up when attention is needed |
| --- | --- | --- |
| Installation | Installed files match the bundled distribution inventory | Restore a complete distribution from a trusted source |
| Configuration | Registry is complete and valid, or an explicit legacy lock exists | Correct configuration or run setup with human approval |
| Compilation | A fresh in-memory compilation matches stored bundles and manifests | Review drift, then explicitly run `ss-resolve` |
| Evidence | At least one run is bound to current files and passes the existing evidence verifier | Collect fresh code, visual, temporal, and human evidence as required |

No project files, Git index, lock choices, reports, approvals, or settings are written. Doctor
does not run application scripts, install dependencies, access the network, or trigger rendering.
It does not trust cached `verification.json`; the verifier reads the underlying reports and
attachments again. Old failed runs remain visible but do not invalidate a passing run bound to
current inputs. No run is selected as "latest" using its name or file modification time.

Registry mode always takes priority. A partial registry is an error, not a reason to use an old
`STYLESEED.md`. Legacy compilation is checked, but registry evidence is `unsupported` until an
explicit migration. Registry config filenames must match `<artifact-id>.json`; a mismatch is an
invalid configuration, not an alternative evidence location.

The registry's default agent is used unless `--agent <supported-agent>` is supplied.
Legacy checks reuse the stored manifest's agent, falling back to Codex when no manifest exists.

## Exit codes and automation

- `0`: `evidence-current` — every selected artifact has current compilation and a passing stored evidence run.
- `1`: `attention` — missing setup, damaged installation, invalid configuration, stale rules, missing/invalid evidence, or unsupported legacy evidence.
- `2`: `error` — invalid invocation or inaccessible project root.

Use `--json` for the schema-versioned report. With `--artifact`, success is scoped to that one
artifact, not the whole repository. Running without it checks every registered artifact.

## Verification boundary

Inventory consistency does not establish publisher authenticity, the latest upstream release,
or whether a particular agent host discovered the skills. Evidence verification validates recorded
claims and their binding; it does not independently judge screenshots or reproduce human approval.
`evidence-current` is deliberately not called "design approved" or "release ready".

The automated disposable-app tests exercise fresh Node processes, contract persistence, scoped
drift, and read-only checks. They are not an autonomous-agent benchmark or a visual quality test.
