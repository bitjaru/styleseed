# Disposable Incident Workbench

A synthetic two-route React application used by the external-app regression. It is not the
StyleSeed marketing website, a backend service, or a model-generated result from the current run.
The interaction/layout source is adapted from the maintainer's September 8 acceptance fixture.
This portable edition deliberately uses `system-ui` instead of the original Inter font: no
third-party font binaries, CDN calls, or machine-specific cache paths are needed. It is not a
pixel-identical copy of that historical evidence.

## Run from a StyleSeed checkout

One-time prerequisites: Node 22, Git, and the demo's locked dependencies and Chromium:

```sh
npm ci --prefix demo-pricing
npm exec --prefix demo-pricing -- playwright install chromium
```

From the repository root, run:

```sh
node scripts/test-external-app.mjs
```

The command copies this application and the current physical `skills/` payload to a new
OS temporary directory **outside the repository**, checks it against canonical skill bytes,
copies React dependencies from the demo installation, compiles both artifact contracts, builds
both pages, then runs browser and source-binding checks. There is no package-manager install,
agent session, credential use, or external browser request in the test itself. Dependency and
browser setup above may require network access. Browser requests outside the loopback server
are blocked and fail the test. The test neither reads application secrets nor posts anything.

Reports and the disposable app are retained at the paths printed to stdout on success and
failure. `--output <new-directory>` selects the report folder; an existing folder is refused
to avoid overwrites or stale captures. Each invocation creates a fresh fixture. Inspect the
exact printed temporary directories before removing them; the command does not remove old runs.
CI retains reports for seven days and its temporary workspace is ephemeral.

To inspect the app later, serve the printed fixture's `dist/` with your preferred local static
server. Queue: `/index.html`; detail: `/incident.html`; add `?state=loading`, `?state=empty`, or
`?state=error` to either. The three incident records are synthetic, fixed examples.

## What a pass means

- Both actual routes render at 1440×900 and 390×844, in four data states each.
- Search handles title/ID/service, case and whitespace; no-results and clear/focus work.
- Skip link, keyboard disclosure, detail navigation, and state recovery work.
- Required layout tokens remain stable; there is no horizontal overflow in checked states.
- List-only edits invalidate that artifact's source binding; shared CSS and build-script
  edits invalidate both. Recompilation cannot bless those changed implementation bytes.
- Project choices, configurations, compiled bundles/manifests/palettes, and installed skills
  retain their hashes. No legacy global lock or bundle appears.

`summary.json`, `commands.json`, `browser.json`, PNGs, Playwright traces, doctor reports, and
source-mutation reports support diagnosis. Capture hashes identify output bytes, not visual
quality. Reports explicitly say `visualApproval: NOT PERFORMED`. **No reviewer reports or
synthetic passing evidence are attached**, and doctor remains nonzero because acceptance is
incomplete. The separate runtime unit tests exercise synthetic passing-evidence invalidation.

The summary records actual Node/package versions and their lockfile comparison. A locally
outdated installation produces a warning, not a claim about the pinned CI environment; CI
rejects package-version mismatches. Run the prerequisites above to reproduce that environment.

This regression is not a clean-install test, autonomous Codex acceptance, accessibility
certification, pixel approval, performance benchmark, Windows browser proof, or release approval.
The fixtures' predetermined configuration is test input, not a new human approval event.

See [the broader acceptance procedure](../../docs/EXTERNAL-APP-ACCEPTANCE.md) for the manual and
fresh-agent steps that remain separate. Fixture source is covered by the repository's
[MIT license](../../LICENSE); React/Playwright retain their upstream licenses in installed packages.
