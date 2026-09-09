# External-app acceptance: list to detail across sessions

This is a bounded maintainer acceptance procedure, not a model-quality benchmark, clean-install
certification, or release gate waiver. Runtime fixture tests use synthetic attachments and must
not be described as visual evidence.

## Procedure

1. Create a disposable Git application outside the StyleSeed checkout. Install or stage an exact
   physical skills payload and record its revision and installation method. Do not imply an
   installer was exercised when the payload was copied locally.
2. Approve project DNA and register list and detail artifacts. Give each its own target, bundle,
   manifest, source roots, and required renders. Include shared components, scripts, styles, and
   tokens in every consuming artifact's implementation coverage. Keep approvals unchanged.
3. Build the baseline; review code, render both actual routes at desktop and narrow viewports,
   and inspect loaded, loading, empty, and error output. Commit the implementation before evidence
   initialization. Attach genuine reports and screenshots; verify the baseline with doctor.
4. Start a fresh agent session with only the application, installed skills, and a realistic
   feature request. Ask it to add search, clear search, and a no-results state while preserving
   priority context and existing identity. Keep the application sandboxed and bound external
   calls, dependencies, and runtime. Never require a fabricated visual pass if rendering is blocked.
5. Inspect the resulting diff independently. Compare approved configuration and bundle bytes;
   check that neither a legacy lock nor a global legacy bundle was created. Run the application
   tests. Verify that changed source invalidates baseline evidence for every affected artifact.
6. Commit the tested implementation, re-render, inspect pixels, and exercise keyboard-only
   search/reset, detail navigation, recovery, and reduced-motion behavior. Attach a fresh run
   only after these observations. Old runs must remain invalid; only the fresh run may restore
   `evidence-current`. Preserve both sets of evidence locally.

Useful commands from the external application directory (substitute actual installed paths):

```sh
node .agents/skills/ss-resolve/scripts/resolve-context.mjs --all --agent codex --check
node .agents/skills/ss-resolve/scripts/styleseed-doctor.mjs --project-root . --json
node .agents/skills/ss-score/scripts/evidence-gate.mjs verify \
  --project-root . --artifact incident-list --run baseline --json
```

An exit code alone is insufficient. Inspect the selected artifact IDs, compilation status,
current run IDs, and errors. Gates not required by the contract do not constitute performed
temporal review or human approval, even when the verifier considers the requirement satisfied.

## 2026-09-08 bounded observation

Two static React 19.2.4 routes were built in a disposable repository with a physical copy of the
candidate skills. Approved identity was `operations-console × enterprise-workbench`, generated
teal palette from `#0F766E`, Inter, comfortable density, 8px panels, and 4px controls. Both
artifacts used shared implementation roots. No live application data or backend was involved.

| Check | Observed result |
| --- | --- |
| Baseline code/render evidence | Both artifacts current at fixture commit `9bf8d42` |
| Fresh Codex session | Wrote search, mobile row/fact layout, and detail retry changes; later interrupted after network/DNS failures |
| Approved contract preservation | Project, index, artifact configs, bundles, manifests, palette outputs, and installed skills unchanged |
| Source-change invalidation | Both baseline runs invalid; contracts still current |
| Parent-run functional verification | Title/ID/service search, case/whitespace handling, no results, retained priority, clear/focus return, skip link, detail navigation, keyboard disclosure, same-route retry passed |
| Render inspection | 10 required baseline captures; 10 updated required captures plus 6 search/focus/expanded-detail captures inspected |
| Viewports | 1440×900 and 390×844 at 2×; no horizontal overflow in required captures; Inter loaded; body 16px; primary `#00736B`; panel radius 8px preserved |
| Fresh evidence | Both artifacts current only through `updated` runs at fixture commit `165c90b`; `baseline` remains invalid |

The maintainer performed final code inspection, browser execution, and evidence attachment.
This is **not** a successfully completed unattended Codex run. The local CLI used its configured
ChatGPT authentication; no credential was copied into the fixture. No second CLI run was started.
No new installer run, Windows application run, temporal recording, human acceptance, or
cross-model performance claim is supported by this experiment. Reduced-motion checks exercised
a static/native interaction implementation, not custom animation quality.

The observed instruction defect was narrower than a runtime failure: `ss-build`, `ss-verify`,
and the cross-agent guide declared registry-first behavior but later unconditionally directed
agents back to a legacy lock/global bundle. Those instructions now branch consistently. The
shared-source regression in `scripts/runtime-tests/project-doctor.test.mjs` checks invalidation,
read-only diagnosis, per-artifact refresh, and byte preservation; it does not test model behavior.

Lazyweb received only approved synthetic screen context and a fixture screenshot. A hosted free
preview was created, but its detailed evidence endpoint returned HTTP 404. No uninspected report
recommendation or competitor-derived improvement claim is used here.
