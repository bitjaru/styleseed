# StyleSeed evaluator quickstart

This path checks the public install command before trusting the documentation, then separates local,
CI, release, benchmark, and production evidence. Use Node.js 22, Git, and network access.

## 1. Verify the public Codex install

Start outside any existing project so global or project-local skills cannot hide a packaging error.

```bash
mkdir styleseed-evaluation
cd styleseed-evaluation
git init
npx skills add bitjaru/styleseed --agent codex --yes --copy
npx skills list --json --agent codex
```

Expected result:

- exactly 23 project-local skill directories under `.agents/skills/`;
- `.agents/skills/styleseed/SKILL.md` exists;
- `ss-learn` and a learning MCP are absent from the core install;
- the install contains physical copies rather than links back to another checkout.

Start a fresh Codex process in this directory. Invoke `$styleseed` or open the Skills picker. The
router should identify the current artifact boundary and choose one first workflow. Discovery in a
process that was already running before installation is not sufficient evidence.

The `bitjaru/styleseed` shortcut resolves public repository state at install time. It is an install
smoke, not immutable release evidence; inspect the separately published tag and assets in the next
step.

### Windows PowerShell

Use `npx.cmd` if PowerShell resolves the `npx.ps1` wrapper through a restrictive execution policy:

```powershell
New-Item -ItemType Directory -Path styleseed-evaluation
Set-Location styleseed-evaluation
git init
npx.cmd skills add bitjaru/styleseed --agent codex --yes --copy
npx.cmd skills list --json --agent codex
```

See [WINDOWS-INSTALL.md](WINDOWS-INSTALL.md) for the recorded Windows environment, expected tree,
and troubleshooting boundary.

## 2. Inspect the published release

Open the [latest published release](https://github.com/bitjaru/styleseed/releases/latest) and verify:

- the core archive, `inventory.json`, and `release-manifest.json` are attached;
- the manifest records the Git SHA, engine revision, skills revision, archive checksum, and tests;
- the release body distinguishes the historical BENCH-V1 result from claims added by the release;
- optional learning code and the repository development plugin boundary are not represented as a
  public plugin-directory release.

The supported unit is a published tag or immutable release artifact. `main` is useful development
state, but it is not an immutable release by itself.

## 3. Rebuild the source gates

Clone the repository, then run the same generated-file and product checks used by CI:

```bash
git clone https://github.com/bitjaru/styleseed.git
cd styleseed
node scripts/build-context-catalog.mjs
node extensions/learning/runtime/scripts/build-learning-catalog.mjs
node demo-pricing/scripts/build-llms.mjs
node scripts/validate-skill-contracts.mjs
node scripts/test-router-contract.mjs
node scripts/test-core-learning-isolation.mjs
node scripts/test-core-plugin-boundary.mjs
node scripts/test-public-claims.mjs
node scripts/test-learning-security.mjs
node scripts/validate-palettes.mjs
node --test scripts/runtime-tests/*.test.mjs
node scripts/validate-engine.mjs
node scripts/build-plugin-packages.mjs --clean
node scripts/validate-plugin-packages.mjs
node scripts/check-markdown-links.mjs
npm ci --prefix demo-pricing
npm run build --prefix demo-pricing
git diff --check
git diff --exit-code
```

`git diff --exit-code` matters: a successful generator that changes committed catalogs still means
the repository was drifting. Review the current [GitHub Actions run](https://github.com/bitjaru/styleseed/actions/workflows/validate-engine.yml)
separately; a green local run is not CI evidence.

## 4. Check the evidence boundary

| Layer | What it proves | What it does not prove |
|---|---|---|
| Public install | The released skills can be copied and discovered in a clean project | Windows behavior unless run on Windows |
| Windows job or recorded run | PowerShell paths and the Windows checkout work | Production deployment |
| Local source gates | The checked-out source passes on this machine | GitHub Actions or Vercel state |
| GitHub Actions | The exact pushed SHA passed its runner matrix | Public pages are serving that SHA |
| Release assets | The published archive and manifest are immutable and inspectable | A newer `main` commit is released |
| BENCH-V1 | Historical 120-cell benchmark evidence and its stated method | A new v4.1 performance or superiority claim |
| Production render | The public site serves and renders the deployed revision | Installer behavior on every client |

Also inspect [THIRD_PARTY.md](../THIRD_PARTY.md), [SECURITY.md](../SECURITY.md), and the
[live verification page](https://styleseed-demo.vercel.app/evaluate).
