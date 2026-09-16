# StyleSeed repository guide

StyleSeed makes expert design judgment repeatable by coding agents; it does not replace
designers with a collection of aesthetic preferences. `engine/PRODUCT-PRINCIPLES.md` is the
canonical goal and decision framework. Keep the rules, skills, components, skins, and generated
demo artifacts in sync.

## Keep development aligned with the goal

- Read the product constitution and `ROADMAP.md` before proposing new engine behavior or product
  positioning. Name the expert decision being supported, or the existing contract being repaired.
- Preserve approved project design systems; do not equate a StyleSeed preset with expert intent.
- Separate implemented capability, research hypothesis, and human approval in docs and reports.
  Passing CI or an agent score is not proof of expert-level design quality.
- Prioritize quality and reuse experiments before new aesthetic packs or hosted services. For
  behavior changes, record applicability, tradeoffs, verification, and remaining human decisions.
- Update maintained public descriptions and generated mirrors together when the goal changes.
  Preserve historical benchmark reports, release notes, and third-party article titles as history.

## Before changing the engine

- Read `engine/AGENTS.md` for the cross-agent design rules.
- Read the relevant nested guide before editing its subtree. In particular,
  `demo-pricing/AGENTS.md` applies to the Next.js demo.
- Read `engine/PRODUCT-PRINCIPLES.md`, `engine/RULESETS.md`, `engine/ADAPTERS.md`,
  `engine/BRAND-RECIPES.md`, `engine/PALETTE-RECIPES.md`, and
  `engine/ARCHITECTURE.md` before changing product behavior.
- Treat `engine/.claude/skills/` as the canonical source for all 23 StyleSeed
  skills. `.agents/skills` is a repository-scoped Codex symlink to that same
  directory. Root `skills/` is the generated physical mirror used by Codex plugin archives; never
  edit it directly.
- Claude Code invokes a skill as `/ss-setup`, `/ss-build`, and so on. Codex
  invokes it as `$ss-setup`, `$ss-build`, or from its Skills picker.

## Generated files

`demo-pricing/scripts/build-llms.mjs` regenerates the public agent index,
registry, context catalog, skin bundle, engine mirrors, plugin skill mirror, and `llms.txt`/`llms-full.txt`. Edit the source in
`engine/` or `skins/`, then run the generator; do not hand-edit generated
copies as the source of truth.

## Verification

- Every engine change: run `node scripts/verify-repo.mjs --core`.
- Engine, skin, component, registry, or demo changes: run `npm run build` from
  `demo-pricing/`, or use the canonical full gate: `node scripts/verify-repo.mjs` after
  `npm ci --prefix demo-pricing`.
- Run `node scripts/verify-repo.mjs --browser` when changing critical public routes or their
  generated endpoints. It checks `/`, `/gate`, `/learn`, and `/evaluate` at desktop and 390×844.
- The demo build fetches Google Fonts and may require network access.
- Do not claim a visual pass without rendering and inspecting the affected UI.

## Pull requests and releases

- Keep unrelated design-canon changes, tooling changes, and compatibility work
  in separate commits or pull requests.
- Do not change `engine/VERSION`, the changelog, or publish a release unless the
  maintainer explicitly includes release work in the task.
- `docs/RELEASE.md` is the release boundary. The preparation workflow creates verified candidate
  assets only; it never publishes a GitHub release or deploys production.
