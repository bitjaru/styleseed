import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BAR_LINE, BRIEF_HEADINGS, NO_VERDICT, OBSERVED_LEAD, YOURS_TO_DECIDE, bundleConstraints, parseArgs as briefArgs, renderBrief, run as compileBrief } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-brief.mjs";
import { compareToContract, ownedValues } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compare-screens.mjs";
import { parseArgs as contractArgs, run as compileContract } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/compile-contract.mjs";
import { FRAMES_IGNORE, measure, parseArgs as measureArgs, writeFrames } from "../../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs";
import { normalizeReferenceEvidence } from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/reference-contract.mjs";
import { measurement, observation, stubChromium, writeMeasurements, writeProject } from "../lib/reference-synthetic.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const resolver = resolve(repoRoot, "engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/resolve-context.mjs");
const quiet = { log: () => {}, warn: () => {}, out: () => {}, date: "2026-11-11" };
const evidencePath = (root) => join(root, ".styleseed/rulesets/ops-console/evidence.json");
const readEvidence = (root) => JSON.parse(readFileSync(evidencePath(root), "utf8"));
const writeEvidence = (root, e) => writeFileSync(evidencePath(root), `${JSON.stringify(e, null, 2)}\n`);
const resolve_ = (root, args = []) => spawnSync(process.execPath, [resolver, "--project-root", root, "--artifact", "app-ops", "--agent", "codex", ...args], { encoding: "utf8" });
const DECISION = { id: "D-001", kind: "decision", axis: "radii", values: [4, 8], statement: "Controls use 4px and cards 8px.", approvedBy: "reviewer-a", date: "2026-11-10" };

// A project whose artifact app-ops selects an approved reference:ops-console, resolved. The person
// marked the column ratio at 1440 as avoid and wrote a note on every kept derived fact.
function approvedProject(tmp, { decisions = [DECISION] } = {}) {
  const root = join(tmp, "project");
  writeProject(root, { decisions });
  const measurements = writeMeasurements(join(tmp, "reference"), measurement());
  const contract = (argv) => compileContract(contractArgs(["--project-root", root, "--slug", "ops-console", ...argv]), quiet);
  contract(["--measurements", measurements, "--write"]);
  const e = readEvidence(root);
  for (const f of e.facts) if (f.transfer === "keep" && f.level === "derived") f.note = "Holds across this product's screens.";
  e.facts.find((f) => f.id === "composition.columns.ratio" && f.viewport === 1440).transfer = "avoid";
  writeEvidence(root, e);
  contract(["--measurements", measurements, "--write"]);
  contract(["--approve", "--reviewer", "reviewer-a"]);
  const compiled = resolve_(root);
  assert.equal(compiled.status, 0, compiled.stderr);
  return { root, measurements };
}
const brief = (root, extra = []) => compileBrief(briefArgs(["--project-root", root, "--artifact", "app-ops", ...extra]), { log: () => {}, out: () => {} }).text;
const sectionOf = (text, heading) => {
  const start = text.indexOf(`${heading}\n`);
  const next = BRIEF_HEADINGS.map((h) => text.indexOf(`${h}\n`, start + heading.length)).filter((i) => i > start).sort((a, b) => a - b)[0] ?? text.length;
  return text.slice(start + heading.length + 1, next);
};
function sandbox(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "ss-brief-"));
  return Promise.resolve().then(() => fn(tmp)).finally(() => rmSync(tmp, { recursive: true, force: true }));
}

test("the brief: eight sections in order with their exact headings; an empty verdict asks the one question", () => sandbox((tmp) => {
  const { root } = approvedProject(tmp);
  const text = brief(root);
  assert.ok(text.startsWith("# Brief: app-ops\n"));
  let at = -1;
  for (const heading of BRIEF_HEADINGS) {
    const index = text.indexOf(`\n${heading}\n`);
    assert.ok(index > at, `${heading} follows the previous section`);
    assert.equal(text.split(`\n${heading}\n`).length, 2, `${heading} appears once`);
    at = index;
  }
  assert.deepEqual(text.split("\n").filter((line) => line.startsWith("## ")), [...BRIEF_HEADINGS], "no other second-level heading");
  assert.equal(sectionOf(text, BRIEF_HEADINGS[0]).trim(), NO_VERDICT, "the tool never writes a verdict of its own");
  assert.equal(NO_VERDICT, "(none yet: ask the user one question — what is wrong with the current screen?)");
  const withVerdict = brief(root, ["--verdict", "The table hides which payout failed."]);
  assert.equal(sectionOf(withVerdict, BRIEF_HEADINGS[0]).trim(), "The table hides which payout failed.");
  assert.equal(sectionOf(text, BRIEF_HEADINGS[1]).trim(), `- S1: https://example.test/settings\n\n${BAR_LINE}`, "no frames: the source URL");
  assert.ok(sectionOf(text, BRIEF_HEADINGS[2]).startsWith(`\n${OBSERVED_LEAD}\n`));
  assert.equal(sectionOf(text, BRIEF_HEADINGS[3]).trim(), "(not measured yet: run drift-report.mjs --reference ops-console)");
  assert.equal(sectionOf(text, BRIEF_HEADINGS[7]).trim(), YOURS_TO_DECIDE);
  assert.equal(YOURS_TO_DECIDE, "Layout, objects, and motion are the builder's decisions.");
  assert.throws(() => briefArgs(["--project-root", root, "--artifact", "app-ops", "--verdict", "two\nlines"]), /--verdict must be the user's own sentence/u);
}));

test("an observed fact never renders under Keep or Hard constraints, and is never phrased as an imperative", () => sandbox((tmp) => {
  const { root } = approvedProject(tmp);
  const text = brief(root);
  const evidence = readEvidence(root);
  const observed = sectionOf(text, BRIEF_HEADINGS[2]);
  assert.ok(observed.includes("- `composition.region.sideNav.width` at 1440: 240px (derived)"), observed);
  assert.ok(observed.includes("### Information architecture and composition"), "grouped by axis");
  const lines = observed.split("\n").filter((line) => line.startsWith("- "));
  assert.equal(lines.length, evidence.facts.filter((f) => f.transfer === "observe").length, "every observed fact, once");
  for (const line of lines) assert.match(line, /^- `[a-z]+(?:\.[A-Za-z0-9]+)+` at (?:\d+|both viewports): .+ \((?:observed|derived)\)$/u, `an observation, not an instruction: ${line}`);
  for (const heading of [BRIEF_HEADINGS[4], BRIEF_HEADINGS[5]]) {
    const body = sectionOf(text, heading);
    for (const fact of evidence.facts.filter((f) => f.transfer === "observe")) assert.ok(!body.includes(`\`${fact.id}\``), `${fact.id} is observed and stays out of ${heading}`);
    assert.ok(!body.includes("240px") && !body.includes("composition.region."), `no region width under ${heading}`);
  }
  const keep = sectionOf(text, BRIEF_HEADINGS[4]);
  assert.ok(keep.includes("- Primary actions per section, at 1440: at most 1 (`navigation.primary.perSectionMax`)."), keep);
  assert.ok(keep.split("\n").filter((line) => line.startsWith("- ")).length === evidence.facts.filter((f) => f.transfer === "keep").length, "the kept facts, and only them");
  // Outside Keep, nothing reads as an instruction about a fact: no line opens with a verb.
  const imperative = /^- (?:Use|Keep|Make|Set|Match|Copy|Apply|Follow|Build|Place|Give|Add|Avoid|Do)\b/u;
  for (const heading of [BRIEF_HEADINGS[1], BRIEF_HEADINGS[2], BRIEF_HEADINGS[5], BRIEF_HEADINGS[6]]) for (const line of sectionOf(text, heading).split("\n")) assert.doesNotMatch(line, imperative, `${heading}: ${line}`);
}));

test("hard constraints come from the manifest and the bundle; do not copy names the avoided values", () => sandbox((tmp) => {
  const { root } = approvedProject(tmp);
  const text = brief(root);
  const hard = sectionOf(text, BRIEF_HEADINGS[5]);
  assert.ok(hard.includes("- Adapter: `product-ui` (the artifact's manifest)."));
  assert.ok(hard.includes("  - **D-001** (decision · radii = 4, 8): Controls use 4px and cards 8px."), hard);
  assert.match(hard, /- Blocking invariants \(the bundle; statements under "Rules in scope"\): `INV-01-no-fabricated-data`, `INV-02-status-not-color-only`/u);
  const bundle = readFileSync(join(root, ".styleseed/bundles/app-ops.md"), "utf8");
  const { decisions, invariants } = bundleConstraints(bundle);
  assert.equal(decisions.length, 1);
  assert.ok(invariants.length >= 2 && invariants.every((id) => bundle.includes(`- **${id}** (blocks`)), "blocking invariants only");
  assert.ok(!hard.includes("Never fabricate data"), "ids, not restated handbook prose");
  const avoid = sectionOf(text, BRIEF_HEADINGS[6]);
  assert.deepEqual(avoid.split("\n").filter((line) => line.startsWith("- ")), [
    "- The reference's accent: #0f766e.",
    "- The reference's font family: Inter.",
    "- The reference's `composition.columns.ratio` at 1440: 0.29/0.71.",
    "- No logos, illustrations, or copy from the reference.",
  ]);
  const none = join(tmp, "none");
  mkdirSync(none);
  const bare = approvedProject(none, { decisions: [] });
  assert.ok(sectionOf(brief(bare.root), BRIEF_HEADINGS[5]).includes("- Project decisions in scope: none recorded for this artifact."));
}));

test("the brief is deterministic, carries no date but the contract's, includes a distance against this contract, and is not a manifest input", () => sandbox((tmp) => {
  const { root } = approvedProject(tmp);
  const first = brief(root, ["--verdict", "The table hides which payout failed."]);
  assert.equal(brief(root, ["--verdict", "The table hides which payout failed."]), first, "same inputs, same bytes");
  assert.deepEqual([...new Set(first.match(/\d{4}-\d{2}-\d{2}/gu))], ["2026-11-11"], "the contract's approval date only (the decision was recorded on 2026-11-10)");
  const evidence = normalizeReferenceEvidence(readEvidence(root));
  const input = { artifactId: "app-ops", evidence, adapter: "product-ui", decisions: [], invariants: ["INV-01-no-fabricated-data"], verdict: null };
  assert.equal(renderBrief(input), renderBrief(JSON.parse(JSON.stringify(input))));

  // A distance.json measured against this contract is rendered as a table; one against another version is refused.
  const m = measurement();
  const rows = compareToContract({ facts: m.facts.facts, summary: m.summary }, evidence, { ownValues: ownedValues({ brand: { fontFamilies: ["Inter"] } }) });
  const distancePath = join(tmp, "distance.json");
  writeFileSync(distancePath, `${JSON.stringify({ tool: "styleseed distance", version: "1", reference: "ops-console", contractHash: evidence.approval.contractHash, approvedBy: "reviewer-a", approvedOn: "2026-11-11", screen: { label: "build", url: "https://example.test/build" }, observedAt: "2026-11-12", browser: "stub", verdict: "x", rows }, null, 2)}\n`);
  const withDistance = brief(root, ["--distance", distancePath]);
  const stands = sectionOf(withDistance, BRIEF_HEADINGS[3]);
  assert.ok(stands.includes("| Transfer | Fact | Viewport | Comparator | Reference | Built | Status |"));
  assert.ok(stands.includes("| keep | `navigation.primary.perSectionMax` | 1440 | at most | 1 | 1 | same |"), stands);
  assert.ok(!withDistance.includes("2026-11-12"), "the measurement date stays out of the brief");
  assert.ok(!stands.includes("Verdict"), "the brief writes no verdict of its own, not even the distance line");
  writeFileSync(distancePath, readFileSync(distancePath, "utf8").replace(evidence.approval.contractHash, `sha256:${"0".repeat(64)}`));
  assert.throws(() => brief(root, ["--distance", distancePath]), /measured against another version of the reference:ops-console contract/u);

  // --write puts it beside the bundle; it is not a resolver output or a manifest input.
  const result = compileBrief(briefArgs(["--project-root", root, "--artifact", "app-ops", "--write"]), { log: () => {}, out: () => {} });
  assert.equal(result.written, ".styleseed/briefs/app-ops.md");
  assert.equal(readFileSync(join(root, ".styleseed/briefs/app-ops.md"), "utf8"), result.text);
  const manifest = readFileSync(join(root, ".styleseed/manifests/app-ops.json"), "utf8");
  assert.ok(!manifest.includes("briefs/"), "the manifest does not list the brief");
  assert.equal(resolve_(root, ["--check"]).status, 0, "the compiled artifact is still current after the brief was written");
  writeFileSync(join(root, ".styleseed/briefs/app-ops.md"), "edited by a person\n");
  assert.equal(resolve_(root, ["--check"]).status, 0, "editing the brief does not move the method hash");
}));

test("the brief refuses an artifact without an approved reference contract or with a stale bundle", () => sandbox((tmp) => {
  const { root, measurements } = approvedProject(tmp);
  // The evidence changed after the bundle was compiled (re-written as a draft): refused.
  const e = readEvidence(root);
  e.facts.find((f) => f.id === "density.inset" && f.viewport === 1440).note = "Edited after resolving.";
  writeEvidence(root, e);
  compileContract(contractArgs(["--project-root", root, "--slug", "ops-console", "--measurements", measurements, "--write", "--force"]), quiet);
  assert.throws(() => brief(root), /evidence\.json is a draft: an artifact can select reference:ops-console only after a person approves it/u);
  compileContract(contractArgs(["--project-root", root, "--slug", "ops-console", "--approve", "--reviewer", "reviewer-a"]), quiet);
  assert.throws(() => brief(root), /bundles\/app-ops\.md was compiled from another version of \.styleseed\/rulesets\/ops-console\/evidence\.json: run resolve-context\.mjs/u);
  assert.equal(resolve_(root).status, 0);
  assert.ok(brief(root).startsWith("# Brief: app-ops"));
  // An artifact on a built-in grammar has no brief.
  const config = join(root, ".styleseed/artifacts/app-ops.json");
  const artifact = JSON.parse(readFileSync(config, "utf8"));
  artifact.selection.grammar = "operations-console";
  writeFileSync(config, `${JSON.stringify(artifact, null, 2)}\n`);
  assert.throws(() => brief(root), /artifact app-ops selects operations-console; a brief is written for an artifact that selects an approved reference:<slug> grammar/u);
  assert.throws(() => compileBrief(briefArgs(["--project-root", root, "--artifact", "missing"]), { log: () => {}, out: () => {} }), /--artifact missing is not in \.styleseed\/artifacts\/index\.json \(app-ops\)/u);
}));

// --- frames: project mode only, never in this repository, ignored by git by default ----------------

const robotsAllow = async () => ({ status: 200, ok: true, text: async () => "User-agent: *\nAllow: /\n" });
const robotsDisallow = async () => ({ status: 200, ok: true, text: async () => "User-agent: *\nDisallow: /\n" });
const URL_ = "https://example.test/settings";

test("frames: refused in case mode, without a robots allow or --own-site, and in this repository", async () => {
  assert.throws(() => measureArgs([URL_, "--out", "/tmp/x", "--frames"]), /--frames needs project mode .*case mode \(--out\) never writes frames/u);
  assert.throws(() => measureArgs([URL_, "--project-root", "/tmp/p", "--slug", "ref", "--frames"]), /--frames needs --robots \(robots\.txt must allow the path\) or --own-site/u);
  assert.throws(() => measureArgs([URL_, "--project-root", "/tmp/p"]), /--project-root <dir> and --slug <slug> go together/u);
  assert.throws(() => measureArgs([URL_, "--out", "/tmp/x", "--project-root", "/tmp/p", "--slug", "ref"]), /--out and --project-root\/--slug cannot run together/u);
  assert.throws(() => measureArgs([URL_, "https://example.test/other", "--project-root", "/tmp/p", "--slug", "ref"]), /project mode measures one URL per slug/u);
  assert.throws(() => measureArgs([URL_, "--project-root", "/tmp/p", "--slug", "../up"]), /--slug must be a safe id/u);

  const stub = stubChromium({ [URL_]: (width) => observation(width) });
  let started = false;
  const loadBrowserImpl = async () => { started = true; return stub.loadBrowserImpl(); };
  await assert.rejects(measure(measureArgs([URL_, "--project-root", repoRoot, "--slug", "frames-test", "--frames", "--own-site"]), () => {}, { fetchImpl: robotsAllow, loadBrowserImpl }), (error) => error.message === "frames are project-local; the StyleSeed repository stores no third-party screenshots");
  assert.equal(started, false, "refused before any browser starts");
  assert.equal(existsSync(join(repoRoot, ".styleseed/evidence/_reference/frames-test")), false, "nothing written in the repository");

  const tmp = mkdtempSync(join(tmpdir(), "ss-frames-"));
  try {
    await assert.rejects(measure(measureArgs([URL_, "--project-root", tmp, "--slug", "ref", "--frames", "--robots"]), () => {}, { fetchImpl: robotsDisallow, loadBrowserImpl }), /disallows \/settings .*Nothing was measured/u);
    assert.equal(started, false);
    assert.deepEqual(readdirSync(tmp), [], "nothing written");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("frames: project mode writes one viewport screenshot per viewport, a .gitignore, and source.json; case mode writes none", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "ss-frames-"));
  try {
    const project = join(tmp, "project");
    mkdirSync(project);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const stub = stubChromium({ [URL_]: (width) => observation(width) }, { png });
    const logs = [];
    const [dir] = await measure(measureArgs([URL_, "--project-root", project, "--slug", "ref", "--frames", "--robots"]), (line) => logs.push(line), { fetchImpl: robotsAllow, loadBrowserImpl: stub.loadBrowserImpl });
    const base = join(project, ".styleseed/evidence/_reference");
    assert.equal(dir, join(realpathSync(project), ".styleseed/evidence/_reference/ref"));
    assert.deepEqual(readdirSync(join(base, "ref")).sort(), ["TWELVE-AXES.draft.md", "frames", "measurements"], "no case draft in a project");
    assert.deepEqual(readdirSync(join(base, "ref/measurements")).sort(), ["facts.json", "observations.json", "source.json", "summary.json"]);
    assert.deepEqual(readdirSync(join(base, "ref/frames")).sort(), ["1440.png", "390.png"]);
    assert.ok(readFileSync(join(base, "ref/frames/1440.png")).equals(png));
    assert.deepEqual(stub.calls.filter((c) => c.startsWith("screenshot")), ['screenshot {"type":"png","fullPage":false} @1440', 'screenshot {"type":"png","fullPage":false} @390'], "a viewport screenshot only, once per viewport, after the probes");
    assert.ok(stub.calls.indexOf("observeStructure") < stub.calls.findIndex((c) => c.startsWith("screenshot")));
    assert.equal(readFileSync(join(base, ".gitignore"), "utf8"), FRAMES_IGNORE);
    assert.equal(FRAMES_IGNORE, "*/frames/\n");
    assert.match(logs.join("\n"), /frames: \.styleseed\/evidence\/_reference\/ref\/frames\/1440\.png, \.styleseed\/evidence\/_reference\/ref\/frames\/390\.png .*Frames are ignored by git by default .* and are yours to keep private\./u);
    const source = JSON.parse(readFileSync(join(base, "ref/measurements/source.json"), "utf8"));
    assert.deepEqual(Object.keys(source), ["url", "observedAt", "robots", "viewports", "scroll"]);
    assert.deepEqual([source.url, source.robots, source.viewports, source.scroll], [URL_, "allowed", [1440, 390], true]);

    // An existing .gitignore is left as the user keeps it.
    writeFileSync(join(base, ".gitignore"), "# mine\n*/frames/\n");
    const result = writeFrames(project, "second", { 1440: png }, () => {});
    assert.deepEqual(result, { written: [".styleseed/evidence/_reference/second/frames/1440.png"], ignoreCreated: false });
    assert.equal(readFileSync(join(base, ".gitignore"), "utf8"), "# mine\n*/frames/\n");

    // Case mode: same page, no frames anywhere, no screenshot call.
    const caseStub = stubChromium({ [URL_]: (width) => observation(width) }, { png });
    const [caseDir] = await measure(measureArgs([URL_, "--out", join(tmp, "case"), "--id", "case-ref", "--robots"]), () => {}, { fetchImpl: robotsAllow, loadBrowserImpl: caseStub.loadBrowserImpl });
    assert.equal(caseStub.calls.some((c) => c.startsWith("screenshot")), false);
    assert.deepEqual(readdirSync(caseDir).sort(), ["TWELVE-AXES.draft.md", "case.draft.json", "measurements"]);
    assert.equal(existsSync(join(caseDir, "measurements/source.json")), false);

    // Project mode without --frames: measurements only, and the brief's bar then lists the source URL.
    const plainStub = stubChromium({ [URL_]: (width) => observation(width) });
    await measure(measureArgs([URL_, "--project-root", project, "--slug", "plain", "--robots"]), () => {}, { fetchImpl: robotsAllow, loadBrowserImpl: plainStub.loadBrowserImpl });
    assert.deepEqual(readdirSync(join(base, "plain")).sort(), ["TWELVE-AXES.draft.md", "measurements"]);
    assert.equal(plainStub.calls.some((c) => c.startsWith("screenshot")), false);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("the brief's bar lists local frames when they exist, with forward slashes on every platform", () => sandbox((tmp) => {
  const { root } = approvedProject(tmp);
  writeFrames(root, "ops-console", { 390: Buffer.from("a"), 1440: Buffer.from("b") }, () => {});
  writeFileSync(join(root, ".styleseed/evidence/_reference/ops-console/frames/notes.txt"), "ignored\n");
  assert.equal(sectionOf(brief(root), BRIEF_HEADINGS[1]).trim(), [
    "- `.styleseed/evidence/_reference/ops-console/frames/1440.png` (viewport 1440)",
    "- `.styleseed/evidence/_reference/ops-console/frames/390.png` (viewport 390)",
    "",
    BAR_LINE,
  ].join("\n"));
}));
