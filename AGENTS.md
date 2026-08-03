# StyleSeed repository guide

StyleSeed is an AI design-method engine for coding agents. It combines fixed judgment,
job-specific output grammars, surface adapters, and project-local reference grammars. Keep the
rules, skills, components, skins, and generated demo artifacts in sync.

## Before changing the engine

- Read `engine/AGENTS.md` for the cross-agent design rules.
- Read the relevant nested guide before editing its subtree. In particular,
  `demo-pricing/AGENTS.md` applies to the Next.js demo.
- Read `engine/PRODUCT-PRINCIPLES.md`, `engine/RULESETS.md`, `engine/ADAPTERS.md`,
  `engine/BRAND-RECIPES.md`, and
  `engine/ARCHITECTURE.md` before changing product behavior.
- Treat `engine/.claude/skills/` as the canonical source for all 21 StyleSeed
  skills. `.agents/skills` is a repository-scoped Codex symlink to that same
  directory; never create a second copy of a skill there.
- Claude Code invokes a skill as `/ss-setup`, `/ss-build`, and so on. Codex
  invokes it as `$ss-setup`, `$ss-build`, or from its Skills picker.

## Generated files

`demo-pricing/scripts/build-llms.mjs` regenerates the public agent index,
registry, context catalog, skin bundle, engine mirrors, and `llms.txt`/`llms-full.txt`. Edit the source in
`engine/` or `skins/`, then run the generator; do not hand-edit generated
copies as the source of truth.

## Verification

- Every engine change: run `node scripts/validate-engine.mjs` and `git diff --check`.
- Engine, skin, component, registry, or demo changes: run `npm run build` from
  `demo-pricing/`, then run `git diff --check` from the repository root.
- The demo build fetches Google Fonts and may require network access.
- Do not claim a visual pass without rendering and inspecting the affected UI.

## Pull requests and releases

- Keep unrelated design-canon changes, tooling changes, and compatibility work
  in separate commits or pull requests.
- Do not change `engine/VERSION`, the changelog, or publish a release unless the
  maintainer explicitly includes release work in the task.
