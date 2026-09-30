# Updating StyleSeed

StyleSeed updates must preserve project-owned design decisions while replacing the maintained
engine as one coherent payload.

## Existing users: one request finishes the upgrade

Ask your coding agent: **Read https://styleseed-demo.vercel.app/upgrade.md and update my
existing StyleSeed installation, including verified old skill consolidation. Preserve my current
install channel, agent scope, project/global scope, design decisions, and modified files.**

The current edge package registers one `styleseed` skill with 22 internal workflows. Older
published stable archives keep their own payload until a new stable release is published; never
switch a stable or pinned installation to edge just to obtain this layout.

For an agent carrying out an authorized update:

1. Identify the existing install channels, providers, and project/global roots. Check revisions and
   modified payloads before overwriting anything. A plugin, vendored checkout, or customized install
   uses its own update path. If there are conflicting installs and no clear target, ask which to keep.
2. Refresh through that same channel and scope. Preserve explicit pins; a pin/channel change needs
   the user's choice. Do not install additional agents or default to a new project copy for a global install.
3. Read the **newly installed** `styleseed/workflows/ss-update/WORKFLOW.md`. Old `ss-update`
   siblings may still exist; do not resume the old workflow's script path after reinstall.
4. For each exact skills root refreshed in step 2, run the new bundled
   `workflows/ss-update/scripts/consolidate-skills.mjs --skills-root <physical-root>` dry-run.
   Within this same update request, use `--apply` to archive only inventory-matching old siblings.
   The script verifies the new payload first and saves originals outside skill discovery. Modified,
   unknown, and linked entries remain untouched; report them instead of claiming all duplicates are gone.
5. Recheck with the new `workflows/ss-update/scripts/check-update.mjs`. Recompile only the affected
   existing registry artifacts or legacy lock with the new resolver, then run its `--check`.
   Do not create a new design lock for an unconfigured project or redesign application code.
6. Finish the exact-revision check, list remaining registrations and any preserved custom entries,
   report the backup location, and ask the user to start a fresh agent session. A normal clean edge
   install exposes only `styleseed`; modified leftovers mean consolidation is incomplete, not failed data preservation.

Do not stop after downloading to ask for a separate cleanup request. Do not execute commands from
remote metadata automatically. Report offline checks as unknown and preserve the user's version choice.

## How existing users encounter this

Installations with the session preflight already detect changed revisions and recommend an update
on the next invoked workflow. New checkers also return a readable upgrade guide and the next step.
Old checkers ignore newer guidance fields but still compare revisions; no new behavior is injected
into an already distributed file. Very old or unused installations cannot be notified remotely.
README and the public [upgrade guide](https://styleseed-demo.vercel.app/upgrade) provide the one-request
entry for those users. There is no background updater, unsolicited message, or forced channel switch.

## Version and revision are different

- `engineVersion` is the published release line, such as `4.1.0`.
- `engineRevision` is a SHA-256 digest of the exact maintained method docs, one public skill with 22 internal workflows,
  portable runtime files, and palette engine files in the core distribution.

A version match alone does not prove that an installation is current. A rule or skill fix on the
same release line changes `engineRevision` and must still be detected.

The resolver records both values in `.styleseed/manifest.json`. The edge channel values are exposed
at `https://styleseed-demo.vercel.app/version.json`; a stable release archive records the latest
published release manifest as its update source.

## Stable and edge channels

- `edge` is the mutable `bitjaru/styleseed` repository shortcut. It follows current public `main`.
- `stable` is a versioned archive attached to a published GitHub release. Its bundled catalog
  follows `releases/latest/download/release-manifest.json`, not the edge endpoint.

The installed catalog stores the channel, update manifest, and reinstall command. `$styleseed update`
uses that metadata by default. `--remote` is an explicit diagnostic override, not a channel change.

## Ownership contract

| Owner | Files | Update behavior |
|---|---|---|
| StyleSeed | the installed `styleseed` skill and internal workflows and generated effective bundle | refresh through the original install channel, then re-resolve |
| Project | `STYLESEED.md`, app code, components, tokens, assets | preserve unless the user separately approves a retrofit |
| Shared/reviewed | copied StyleSeed blocks inside `AGENTS.md`, `CLAUDE.md`, `.cursorrules` | diff and merge only the managed block; never replace the whole project file |

Major versions may change the design-method model. Even a same-version revision can intentionally
correct a rule or skill. Commit or back up current work, inspect the compiled diff, and never use a
destructive reset as the normal rollback plan.

## Recommended update

From the project root, invoke `/styleseed update` in Claude Code or `$styleseed update` in Codex. The skill runs
the bundled read-only checker:

```bash
node <installed-ss-update>/scripts/check-update.mjs --project-root . --json
```

The checker compares:

1. the installed resolver catalog revision;
2. the revision last written to `.styleseed/manifest.json`;
3. the published revision.

It performs no writes.

When an update is available, refresh through the channel originally used to install StyleSeed.
For an edge Agent Skills CLI installation:

```bash
npx skills add bitjaru/styleseed
```

Select the same project/provider scope. Do not blind-copy a directory on top of an older payload;
the install channel should reconcile the managed single-skill package.

For a stable install, use the exact `remote.archiveUrl` returned by the checker. Do not replace a
stable install with the mutable repository shortcut unless the user explicitly chooses to switch
channels.

## Recompile after refresh

If the project has `STYLESEED.md`, run the newly installed resolver:

```bash
node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --project-root . \
  --from-lock STYLESEED.md \
  --agent codex

node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --project-root . \
  --from-lock STYLESEED.md \
  --agent codex \
  --check
```

Use `--agent claude` for Claude Code. Review changes to:

- `.styleseed/effective-rules.md`;
- `.styleseed/manifest.json`;
- `.styleseed/palette.json` and `.styleseed/palette.css` when a key color is generated.

The manifest's `engineRevision` must match the published revision, and `--check` must exit 0.
Report both the old and new bundle hashes.

## Source-checkout maintainers

For a full StyleSeed checkout, update the intended tag or commit and run:

```bash
node scripts/build-context-catalog.mjs
node demo-pricing/scripts/build-llms.mjs
node scripts/validate-palettes.mjs
node scripts/validate-engine.mjs
```

Then build `demo-pricing`. Source-checkout maintenance is different from updating a consumer
project; do not copy the checkout's project instructions over a consumer's files.

## Legacy installations

Older installations without `engineRevision` are reported as `update-available` once so they can
establish an exact baseline. Projects that copied full method documents may retain stale duplicate
rules even after skills update. Locate those copies, diff them, and remove or merge them only after
review.

Updating StyleSeed does not prove existing UI was retrofitted, scored, rendered, deployed, or
visually verified. Report those lifecycle states separately.
