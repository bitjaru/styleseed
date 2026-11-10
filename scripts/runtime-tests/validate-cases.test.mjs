import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const validator = resolve(repoRoot, "scripts/validate-cases.mjs");
const caseDir = resolve(repoRoot, "research/cases/saas-dashboard/shopify-app-settings-2026-11-05");
const caseId = "shopify-app-settings-2026-11-05";

// Copy the repository case into a temporary cases folder, change its first rule candidate, validate.
function validate(mutate, { measurements = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ss-cases-"));
  try {
    const target = join(dir, "saas-dashboard", caseId);
    mkdirSync(target, { recursive: true });
    if (measurements) cpSync(join(caseDir, "measurements"), join(target, "measurements"), { recursive: true });
    const data = JSON.parse(readFileSync(join(caseDir, "case.json"), "utf8"));
    mutate(data.ruleCandidates[0], data);
    writeFileSync(join(target, "case.json"), JSON.stringify(data, null, 2));
    return spawnSync(process.execPath, [validator, dir], { encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const agree = { reviewer: "koh-yura", date: "2026-11-10", verdict: "agree", via: "designer+agent" };
const disagree = { reviewer: "other-designer", date: "2026-11-10", verdict: "disagree", note: "the left column hides the save action on tablets" };
const promote = (candidate, data, reviews) => {
  Object.assign(candidate, { status: "promoted", evidence: "approved", promotedTo: "engine/APP-PLAYBOOKS.md", reviews });
  data.validation = { screen: "a booking settings page", score: 84, scoredAt: "2026-11-10", bundle: "operations-console × saas × settings" };
};

test("the repository cases validate, and the shipped case carries reviews[]", () => {
  const run = spawnSync(process.execPath, [validator], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const data = JSON.parse(readFileSync(join(caseDir, "case.json"), "utf8"));
  assert.ok(data.ruleCandidates.every((candidate) => Array.isArray(candidate.reviews) && !Object.hasOwn(candidate, "review")));
  assert.equal(validate(() => {}).status, 0);
});

test("case reviews: reviewed needs one, approved needs an agree, promoted needs an agree and no unresolved disagree", () => {
  const reviewedEmpty = validate((candidate) => { candidate.status = "reviewed"; candidate.reviews = []; });
  assert.match(reviewedEmpty.stderr, /R1 is reviewed without a review record in reviews\[\]/u);
  assert.equal(validate((candidate) => { candidate.status = "reviewed"; candidate.reviews = [{ ...agree, verdict: "conditional" }]; }).status, 0);
  assert.match(validate((candidate) => { candidate.evidence = "approved"; candidate.reviews = [{ ...agree, verdict: "conditional" }]; }).stderr, /R1 is approved without an agreeing review/u);
  assert.equal(validate((candidate) => { candidate.evidence = "approved"; candidate.reviews = [agree]; }).status, 0);
  assert.equal(validate((candidate, data) => promote(candidate, data, [agree])).status, 0);
  assert.match(validate((candidate, data) => promote(candidate, data, [agree, disagree])).stderr, /R1 is promoted over an unresolved disagree by other-designer \(2026-11-10\)/u);
  const resolved = validate((candidate, data) => promote(candidate, data, [agree, disagree, { ...disagree, date: "2026-11-12", verdict: "conditional", note: "fixed by keeping the save bar sticky" }]));
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.match(validate((candidate, data) => promote(candidate, data, [disagree])).stderr, /R1 is promoted without an agreeing review/u);
  assert.match(validate((candidate) => { candidate.review = agree; }).stderr, /ruleCandidates\[0\]\.review is not a known field/u);
  assert.match(validate((candidate) => { candidate.reviews = [{ ...agree, via: "x".repeat(41) }]; }).stderr, /reviews\[0\]\.via is too long \(max 40\)/u);
});

test("a case folder without measurements/ is reported, not a crash", () => {
  const run = validate(() => {}, { measurements: false });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /measurements\/ folder is missing/u);
  assert.doesNotMatch(run.stderr, /ENOENT|at readdirSync/u);
});
