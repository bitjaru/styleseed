# Required functional outcomes

Use this during an authorized build/test task, after resolving the artifact. A functional
gate establishes that the declared checks passed against retained local source. It does not
establish visual quality, production behavior, complete test coverage, or human approval.

## Declare the outcomes

Add to `.styleseed/artifacts/<artifact-id>.json` without replacing its other validation fields:

```json
"functional": {
  "scenarios": ["save-retains-draft", "viewer-cannot-save"]
}
```

This object belongs inside `validation`. IDs are unique lowercase letters, numbers, and
hyphens, start with a letter or number, and have at most 64 characters. The list cannot be
empty. Omitting the object preserves older artifacts, with `functional: not-required` and
an explicit warning that functionality was not verified. Do not remove a requirement to
make an interactive build pass.

Declare test files and the actual implementation they exercise in `implementation.sourceRoots`.
Include relevant shared modules, build/runtime configuration and dependency lockfiles where
changes affect the tested behavior. The inventory hashes declared files; it does not discover
the import graph or freeze external services. Keep generated test output outside these roots.
Resolve again after changing the artifact contract.

## Run actual tests

V1 accepts Node's test runner with flat top-level `test()` cases named exactly by scenario ID.
No nested tests or suites, duplicate names, `.skip`, or `.todo`. Use meaningful assertions
against the real application model or browser interactions; an empty passing callback proves
nothing. Existing browser drivers can run inside a Node test when already installed. Other
test-runner formats need an adapter before they can supply this gate; do not relabel their
output as `node-test-v1`.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSettings } from '../src/settings.mjs';

test('save-retains-draft', async () => {
  const saved = { title: 'Original' };
  const draft = { title: 'Edited' };
  const result = await saveSettings(saved, draft, { fail: true });
  assert.equal(result.ok, false);
  assert.deepEqual(result.draft, draft);
});
```

Adapt the example to the project's actual API. For reload/navigation claims, assert through
the rendered application or storage boundary; a pure model test does not cover that claim.

Use a new evidence run after finalizing the source. Existing evidence initialization requires
clean declared implementation roots in Git; it never commits on your behalf.

```bash
node <installed-ss-score>/scripts/evidence-gate.mjs init \
  --project-root . --artifact <artifact-id> --run <run-id>
node <installed-ss-score>/scripts/run-functional-tests.mjs \
  --project-root . --artifact <artifact-id> --run <run-id> \
  --test tests/settings.test.mjs
node <installed-ss-score>/scripts/evidence-gate.mjs attach \
  --project-root . --artifact <artifact-id> --run <run-id> --gate functional \
  --report .styleseed/evidence/<artifact-id>/<run-id>/functional/report.json
node <installed-ss-score>/scripts/evidence-gate.mjs verify \
  --project-root . --artifact <artifact-id> --run <run-id>
```

Other required gates must also be attached before overall verification passes. Repeat `--test`
for multiple files. The runner executes only explicit project paths, installs nothing, and
has the caller's local permissions; it is not a sandbox. Default timeout is 120 seconds;
`--timeout-ms` accepts 1000–300000. An existing functional run directory is never overwritten.

The runner retains events, stderr, and a report. Verification checks report/output hashes,
compares normalized results to retained events, requires every declared scenario and every
reported check to pass, and rejects nonzero exit status. A timeout, malformed/empty output,
or source change during execution produces no usable report. Fix the issue and use a new run.
Any later source, contract, attached report, or output change invalidates its evidence.

These checks detect missing, stale, or inconsistent evidence. They do not authenticate the
test author or prevent deliberate fabrication of both logs and reports. Review the assertions
and scenario coverage. Human acceptance, when required, is bound to the functional report as
well as the other evidence, and remains a separate decision.
