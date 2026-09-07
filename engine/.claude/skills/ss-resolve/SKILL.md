---
name: ss-resolve
description: Compile a small, deterministic StyleSeed rule bundle for one agent, output grammar, surface adapter, domain, page type, brand recipe, palette recipe, and optional profile. Use before setup or build, when project configuration changes, when updating StyleSeed, or to diagnose local installation, rule drift, and evidence health without changing files.
---

# Resolve effective StyleSeed context

Use the bundled `scripts/resolve-context.mjs`; do not hand-compose the rule stack.

1. Resolve the project boundary first: if either `.styleseed/project.json` or
   `.styleseed/artifacts/index.json` exists, require a complete, valid registry. Do not fall back
   to `STYLESEED.md` on a registry error. Only use that lock when no registry exists.
2. Keep the working directory at the user's project root. Invoke the script by its installed
   path; do not `cd` into the skill directory.
3. Legacy single-artifact projects should prefer `--from-lock STYLESEED.md`. Registry projects use
   `.styleseed/project.json` plus `.styleseed/artifacts/*.json` and must resolve with `--artifact`
   or `--all`; in registry mode, edit project-owned config instead of passing selection overrides.
4. Read the emitted bundle before building: legacy writes `.styleseed/effective-rules.md`; registry
   writes `.styleseed/bundles/<artifact-id>.md`.
5. Preserve the manifest output: legacy uses `.styleseed/manifest.json`; registry uses
   `.styleseed/manifests/<artifact-id>.json`.
6. Use `--check` to detect context drift without rewriting files.

For installation or project-health questions, run the read-only diagnostic first:

```bash
node <installed-ss-resolve>/scripts/styleseed-doctor.mjs --project-root . --json
```

It checks the local distribution inventory, project configuration, compiled rules, and stored
evidence against current inputs. Use `--artifact <id>` to narrow a registry check. It never
sets up, migrates, recompiles, renders, or updates the project. Follow its `next` actions only
within the user's authorization. Exit 0 means current evidence for all selected artifacts,
not an independent visual judgment; exit 1 means attention needed; exit 2 means invalid invocation.
Legacy projects can have current rules while evidence remains `unsupported`. Installation
integrity does not prove host discovery, publisher authenticity, or the latest upstream revision.

```bash
node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --from-lock STYLESEED.md \
  --agent codex
```

Registry project:

```bash
node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --project-root . \
  --artifact app-dashboard \
  --agent codex
```

Without a lock:

```bash
node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --agent claude \
  --grammar operations-console \
  --adapter product-ui \
  --domain saas \
  --page dashboard \
  --recipe enterprise-workbench \
  --palette cobalt-instrument \
  --key-color "#175CD3" \
  --palette-character balanced \
  --palette-mode light \
  --palette-harmony auto \
  --surface-temperature cool \
  --profile swiss
```

Use `--list` to print supported IDs. `--recipe auto` maps the selected grammar to a maintained
default; `--palette auto` maps that recipe to a contrast-verified semantic palette. Pass explicit
values when the product needs a different morphology or color posture. The default
output directory is `.styleseed/` in the
project root. For a project-local reference grammar, pass `reference:<slug>` and ensure
`.styleseed/rulesets/<slug>/RULESET.md` exists. Registry projects require the full six-file
reference contract: `RULESET.md`, `tokens.json`, `evidence.json`, `checks.md`,
`reference-board.html`, and `adapter.json`.

When a key color is present in flags or the lock, the resolver uses the shared OKLCH generator and
writes `.styleseed/palette.json` plus `.styleseed/palette.css`. The manifest records the generation
inputs. The maintained recipe still supplies product posture and semantic restrictions; its fixed
hex values become fallbacks rather than overriding the generated system.

Do not load `llms-full.txt` after a bundle resolves successfully. Load a larger source document
only when the bundle names an unresolved ambiguity that requires it.
