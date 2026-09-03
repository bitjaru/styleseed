# StyleSeed release process

Releases are evidence-bearing, versioned distributions. A passing source checkout, an Actions
artifact, a GitHub release, and a production deployment are separate states.

## Channel contract

- `edge`: `npx skills add bitjaru/styleseed` follows current public repository state.
- `stable`: a versioned `styleseed-core-<version>.tar.gz` asset follows the latest published
  `release-manifest.json` and never compares itself directly to mutable `main`.

The packaged resolver catalog records the channel, update manifest, and reinstall command. The
archive inventory repeats that metadata so an evaluator can inspect it without executing a skill.

## Prepare a release candidate

1. Merge the version/changelog change through a green pull request. The version must match every
   maintained plugin manifest.
2. Create a signed `v<version>` tag at the intended commit and push that exact tag.
3. Manually run **Prepare StyleSeed release assets** with the existing tag.
4. The workflow checks out the tag, reruns the canonical source and production build gates, audits
   production dependencies, installs Chromium, and runs the browser smoke suite.
5. It creates and validates:

   - `styleseed-core-<version>.tar.gz` with stable-channel metadata;
   - `inventory.json` with file hashes and the archive hash;
   - `release-manifest.json` with the Git SHA, exact core/skills revisions, evidence boundary, and
     explicit no-new-benchmark claim restrictions;
   - `sbom-core.spdx.json` for the core archive files;
   - `sbom-demo.cdx.json` for production demo dependencies;
   - `SHA256SUMS` for every candidate asset.

The workflow also creates GitHub provenance and core-SBOM attestations, then uploads the candidates
as a 14-day Actions artifact. It does **not** create or publish a GitHub release and does not deploy
the website.

## Publish boundary

Before publishing, a maintainer must:

1. download the candidate artifact from the successful workflow run;
2. verify `SHA256SUMS` and the GitHub attestations;
3. inspect `release-manifest.json` and confirm its `gitSha` is the signed tag target;
4. run a disposable direct-archive install and confirm 23 physical core skills, no `ss-learn`, no
   MCP, a working resolver, and a `current` stable-channel update result against the candidate
   manifest;
5. create a draft GitHub release, attach the six candidate files, review the release notes, and
   publish only after explicit approval.

Production deployment is a separate action. After publication, verify the release assets first;
then update/deploy the public stable pointer and confirm the live SHA independently.

## Local generator check

The release generator is intentionally safe to run without publication:

```bash
node scripts/build-release-assets.mjs \
  --version "$(tr -d '\r\n' < engine/VERSION)" \
  --tag "v$(tr -d '\r\n' < engine/VERSION)" \
  --git-sha "$(git rev-parse HEAD)" \
  --created-at "$(git show -s --format=%cI HEAD)"
node scripts/validate-release-assets.mjs
```

Without `--tag-verified true` and a successful workflow URL, the manifest remains `local-only` and
marks the tag as `not-verified`. Generating files locally is not release evidence.
