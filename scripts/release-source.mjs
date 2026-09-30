import { spawnSync } from "node:child_process";

export function releaseSkillCounts(inventory) {
  const paths = inventory.files.map(file => file.path);
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate release inventory paths");
  const entries = prefix => paths.filter(path => path.startsWith(prefix))
    .map(path => path.slice(prefix.length))
    .filter(path => /^[^/]+\/SKILL\.md$/u.test(path)).sort();
  const canonical = entries("engine/.claude/skills/");
  const mirror = entries("skills/");
  if (!canonical.length || JSON.stringify(canonical) !== JSON.stringify(mirror)) {
    throw new Error("Release skill discovery mirrors disagree");
  }
  const workflows = prefix => paths.filter(path => path.startsWith(prefix))
    .map(path => path.slice(prefix.length))
    .filter(path => /^styleseed\/workflows\/ss-[^/]+\/WORKFLOW\.md$/u.test(path)).sort();
  const internal = workflows("engine/.claude/skills/");
  if (JSON.stringify(internal) !== JSON.stringify(workflows("skills/"))) {
    throw new Error("Release workflow mirrors disagree");
  }
  return { coreSkills: canonical.length, internalWorkflows: internal.length };
}

export function assertReleaseSkillCounts(manifest, inventory) {
  const counts = releaseSkillCounts(inventory);
  for (const [key, value] of Object.entries(counts)) {
    if (manifest.engine?.[key] !== value) throw new Error(`Release ${key} differs from package inventory`);
  }
  return counts;
}

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
