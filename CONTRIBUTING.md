# Contributing to StyleSeed

StyleSeed grows when users turn a repeatable design decision, regression, example, or integration
lesson into something the next person can reuse. You do not need to understand the whole engine to
make a useful contribution.

## Start with a PR you can finish

- Browse [`good first issue`](https://github.com/bitjaru/styleseed/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22)
  for bounded tasks with an expected file and check.
- Small documentation, typo, broken-link, and test-fixture fixes can go straight to a PR. No proposal
  issue is required.
- Comment on an issue before starting larger work so two people do not solve the same problem.
- Open a proposal issue before changing the core design canon, adding a grammar or adapter, or
  changing a public contract.

If you are unsure where to start, a documentation correction or regression fixture is a complete
contribution—not a lesser one.

## First PR in about 15 minutes

Requirements: Git, Node.js 22, and npm.

```bash
git clone https://github.com/<your-name>/styleseed.git
cd styleseed
git checkout -b docs/clear-install-example
```

Make one bounded change, then run the smallest relevant check from the table below. Every PR should
also pass:

```bash
git diff --check
```

For the same complete source and production-build gate used by Ubuntu CI:

```bash
npm ci --prefix demo-pricing
node scripts/verify-repo.mjs
```

Use `node scripts/verify-repo.mjs --core` for the full non-web suite, or add `--browser` after
installing Playwright Chromium. `--webpack` is the documented local fallback when a constrained
environment cannot run Turbopack; CI still exercises the default Turbopack build.

Push your branch and open a PR. The template asks for the command you ran and, for visual changes, a
current screenshot. CI runs the complete suite.

AI-assisted contributions are welcome. The human submitter is still responsible for reading the
diff, running the stated checks, and removing invented paths or claims.

## Contribution lanes

| Lane | Good first contribution | Source of truth | Minimum local check |
|---|---|---|---|
| Docs, examples, translation | Correct a stale path, add one real setup example, improve Korean or English copy | `README*.md`, `docs/`, maintained files in `demo-pricing/` | `git diff --check` |
| Regression fixture | Reproduce one resolver, registry, evidence, or update bug | `scripts/runtime-tests/` | `node --test scripts/runtime-tests/*.test.mjs` |
| Design rule | Add a specific decision with rationale, do/don't evidence, and counterexample | `engine/DESIGN-LANGUAGE.md` or `engine/VISUAL-CRAFT.md` | `node scripts/validate-engine.mjs` |
| Palette recipe | Improve a maintained palette posture or add validation coverage | `engine/color/palettes.json`, `scripts/validate-palettes.mjs` | `node scripts/validate-palettes.mjs` |
| Skin | Add an original `skin.json` + `theme.css`, without protected assets or a product clone | `skins/<id>/` | `npm run build --prefix demo-pricing` |
| Component or pattern | Fix semantics, states, accessibility, or recipe consumption | `engine/components/` | engine checks + demo build |
| Agent skill | Fix one workflow or cross-agent contract | `engine/.claude/skills/` | skill checks below |
| Grammar or adapter | Propose a new product job or render target with evidence and conformance cases | proposal issue first | agreed in the issue |

Do not edit `skills/` directly. `engine/.claude/skills/` is the canonical skill source; `skills/`
and public registry files are generated mirrors.

## Propose a design rule

This is the core community contribution. A mergeable rule is a decision the agent can apply, not a
taste claim.

```markdown
## Short rule name

**Rule:** State one imperative, with a measurable boundary where possible.
**Why it works:** Explain the reusable design reasoning.
**Do / Don't:** Show the successful case and the failure it replaces.
**Evidence:** Link a primary source, rendered comparison, or reproducible example.
**Counterexample:** Name a context where the rule should not apply.
```

Before writing the PR, open a
[`Propose a design rule`](https://github.com/bitjaru/styleseed/issues/new?template=design_rule.yml)
issue. Rules that change the core canon need applicability and counterexamples because a universal
instruction can improve one surface while damaging another.

## Add a skin

A skin changes token material; it does not copy a company's protected assets or layout. Start from
an existing two-file skin:

```bash
mkdir skins/your-skin
cp skins/arc/skin.json skins/your-skin/skin.json
cp skins/arc/theme.css skins/your-skin/theme.css
```

Update the metadata and tokens, run the demo build, and attach a screenshot of the current output to
the PR. If the change also alters geometry, component choice, or containment, it may belong in a
brand recipe rather than a skin—open an issue before expanding the scope.

## Checks by change type

### Engine, rule, palette, component, or registry

```bash
node demo-pricing/scripts/build-llms.mjs
node scripts/validate-palettes.mjs
node scripts/validate-engine.mjs
git diff --check
```

Run the runtime tests when behavior changes:

```bash
node --test scripts/runtime-tests/*.test.mjs
```

### Agent skills

```bash
node demo-pricing/scripts/build-llms.mjs
node scripts/validate-skill-contracts.mjs
node scripts/test-router-contract.mjs
node scripts/build-plugin-packages.mjs --clean
node scripts/validate-plugin-packages.mjs
git diff --check
```

### Demo, skin, or renderable UI

```bash
npm ci --prefix demo-pricing
npm run build --prefix demo-pricing
git diff --check
```

The demo build fetches Google Fonts and may require network access. A green build is not a visual
pass: inspect the affected route and attach a current screenshot when pixels changed.

## Generated files

Edit maintained sources in `engine/`, `skins/`, or the relevant demo content. Then run:

```bash
node demo-pricing/scripts/build-llms.mjs
```

That command refreshes the public registry, context catalog, skin bundle, engine mirrors, plugin
skill mirror, and LLM indexes. Commit the resulting generated changes with their source change. CI
fails when generated output drifts.

## Pull request boundaries

- Keep one concern per PR. A rule change, tooling refactor, and compatibility fix should not arrive
  as one review unit.
- Link the issue when the work was scoped in one.
- Include the exact commands you ran and their result.
- Include before/after screenshots for a visual change and describe what to inspect.
- Do not change `engine/VERSION`, `CHANGELOG.md`, release manifests, or deployment files unless the
  maintainer explicitly requested release work.
- Do not include secrets, private project material, copyrighted assets, or trademarked product
  clones.

The maintainer may ask to split a useful PR when its parts have different evidence or review needs.
That is a scope decision, not a rejection of the contribution.

## Recognition

Merged PR authors appear in GitHub's contributor history. User-facing contributions are credited in
the relevant release notes, and reusable examples may be linked from the showcase or documentation.

All participation follows the [Code of Conduct](CODE_OF_CONDUCT.md), and contributions are licensed
under the repository's [MIT License](LICENSE).
