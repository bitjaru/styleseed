---
name: ss-resolve
description: Compile a small, deterministic StyleSeed rule bundle for one agent, output grammar, surface adapter, domain, page type, brand recipe, palette recipe, and optional profile. Use before setup or build, when STYLESEED.md changes, when updating StyleSeed, or whenever an agent would otherwise load the full rule handbook.
---

# Resolve effective StyleSeed context

Use the bundled `scripts/resolve-context.mjs`; do not hand-compose the rule stack.

1. Read `STYLESEED.md` when it exists. Confirm missing required selections with the user.
2. Keep the working directory at the user's project root. Invoke the script by its installed
   path; do not `cd` into the skill directory. Prefer `--from-lock STYLESEED.md`; explicit flags
   override lock values.
3. Read the emitted `.styleseed/effective-rules.md` before building.
4. Preserve `.styleseed/manifest.json`. It records selections, source hashes, and the bundle hash
   for updates and reproducibility.
5. Use `--check` to detect context drift without rewriting files.

```bash
node <installed-ss-resolve>/scripts/resolve-context.mjs \
  --from-lock STYLESEED.md \
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
`.styleseed/rulesets/<slug>/RULESET.md` exists.

When a key color is present in flags or the lock, the resolver uses the shared OKLCH generator and
writes `.styleseed/palette.json` plus `.styleseed/palette.css`. The manifest records the generation
inputs. The maintained recipe still supplies product posture and semantic restrictions; its fixed
hex values become fallbacks rather than overriding the generated system.

Do not load `llms-full.txt` after a bundle resolves successfully. Load a larger source document
only when the bundle names an unresolved ambiguity that requires it.
