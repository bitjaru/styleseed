# Updating StyleSeed

StyleSeed updates must preserve project-owned design decisions while replacing the maintained
engine as one coherent payload.

## Version and revision are different

- `engineVersion` is the published release line, such as `4.0.0`.
- `engineRevision` is a SHA-256 digest of the exact maintained method docs, 23 canonical skills,
  provider/plugin entry material, the local MCP bridge, and palette engine files.

A version match alone does not prove that an installation is current. A rule or skill fix on the
same release line changes `engineRevision` and must still be detected.

The resolver records both values in `.styleseed/manifest.json`. The public values are exposed at
`https://styleseed-demo.vercel.app/version.json`.

## Ownership contract

| Owner | Files | Update behavior |
|---|---|---|
| StyleSeed | installed `ss-*` skills and generated effective bundle | refresh through the original install channel, then re-resolve |
| Project | `STYLESEED.md`, app code, components, tokens, assets | preserve unless the user separately approves a retrofit |
| Shared/reviewed | copied StyleSeed blocks inside `AGENTS.md`, `CLAUDE.md`, `.cursorrules` | diff and merge only the managed block; never replace the whole project file |

Major versions may change the design-method model. Even a same-version revision can intentionally
correct a rule or skill. Commit or back up current work, inspect the compiled diff, and never use a
destructive reset as the normal rollback plan.

## Recommended update

From the project root, invoke `/ss-update` in Claude Code or `$ss-update` in Codex. The skill runs
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
For Agent Skills CLI installations:

```bash
npx skills add bitjaru/styleseed
```

Select the same project/provider scope. Do not blind-copy a directory on top of an older payload;
the install channel should reconcile the managed 23-skill set.

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
