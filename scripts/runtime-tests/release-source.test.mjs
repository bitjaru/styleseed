import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertReleaseCommit } from "../release-source.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("release metadata accepts only the checked-out commit, not an older dispatch ref", t => {
  const root = mkdtempSync(join(tmpdir(), "styleseed-release-source-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "--quiet", "--template="]);
  const commit = message => git(root, ["-c", "user.name=Release Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgsign=false", "commit", "--allow-empty", "--quiet", "-m", message]);
  commit("source before release");
  const oldSha = git(root, ["rev-parse", "HEAD"]);
  commit("release source");
  const current = git(root, ["rev-parse", "HEAD"]);
  assert.equal(assertReleaseCommit(root, current), current);
  assert.throws(() => assertReleaseCommit(root, oldSha), /does not match checkout HEAD/u);
  assert.throws(() => assertReleaseCommit(root, "main"), /does not match checkout HEAD/u);
});

test("release generation rejects a mismatched SHA before replacing output files", t => {
  const dist = join(repo, "dist");
  mkdirSync(dist, { recursive: true });
  const output = mkdtempSync(join(dist, "release-sha-rejection-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  writeFileSync(join(output, "keep.txt"), "existing candidate bytes");
  const version = readFileSync(join(repo, "engine/VERSION"), "utf8").trim();
  const result = spawnSync(process.execPath, [join(repo, "scripts/build-release-assets.mjs"),
    "--version", version, "--git-sha", "0".repeat(40), "--created-at", "2026-09-11T00:00:00Z",
    "--output-dir", output], { cwd: repo, encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not match checkout HEAD/u);
  assert.deepEqual(readdirSync(output), ["keep.txt"]);
  assert.equal(readFileSync(join(output, "keep.txt"), "utf8"), "existing candidate bytes");
});

test("release workflow binds its execution ref and manifest to the verified checkout", () => {
  const workflow = readFileSync(join(repo, ".github/workflows/prepare-release.yml"), "utf8");
  assert.ok(workflow.includes('test "$GITHUB_REF" = "refs/tags/$RELEASE_TAG"'));
  assert.ok(workflow.includes('test "$GITHUB_SHA" = "$git_sha"'));
  assert.ok(workflow.includes('RELEASE_GIT_SHA: ${{ steps.release.outputs.git_sha }}'));
  assert.ok(workflow.includes('--git-sha "$RELEASE_GIT_SHA"'));
  assert.ok(!workflow.includes('--git-sha "$GITHUB_SHA"'));
  const validator = readFileSync(join(repo, "scripts/validate-release-assets.mjs"), "utf8");
  assert.ok(validator.includes("assertReleaseCommit(repoRoot, manifest.gitSha)"));
});
