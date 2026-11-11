import test from "node:test";
import assert from "node:assert/strict";
import { RECOMPILE, registryArtifactIds, scanRegistryArtifact } from "../check-registry-artifacts.mjs";

// The repository's own site artifacts (.styleseed at the root) are compiled outputs. Every engine
// change moves the engine revision and the method hash, so a manifest that nobody recompiles fails
// the deterministic check with SS000 before any detector runs (#114).
test("every registry artifact at the repository root scans without a contract error (SS000)", () => {
  const ids = registryArtifactIds();
  assert.ok(ids.length >= 1, "the repository registry lists at least one artifact");
  for (const id of ids) {
    const { contractErrors } = scanRegistryArtifact(id);
    assert.deepEqual(contractErrors.map((finding) => `${finding.file}: ${finding.message}`), [], `${id} has contract errors; run ${RECOMPILE} and commit the outputs`);
  }
});
