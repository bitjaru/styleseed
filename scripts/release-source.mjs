import { spawnSync } from "node:child_process";

// Bind metadata to source bytes, not workflow_dispatch's potentially different default ref.
// Cryptographic tag verification remains the release workflow's separate responsibility.
export function assertReleaseCommit(repoRoot, gitSha) {
  const result = spawnSync("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
    cwd: repoRoot, encoding: "utf8", timeout: 10000,
  });
  if (result.error || result.status !== 0) throw new Error("Cannot resolve release checkout HEAD");
  const head = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(gitSha) || gitSha !== head) {
    throw new Error(`Release Git SHA does not match checkout HEAD: expected ${head}`);
  }
  return head;
}
