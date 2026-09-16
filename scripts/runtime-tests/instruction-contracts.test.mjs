import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";
import { inspectInstructionContracts } from "../lib/instruction-contracts.mjs";

const readonly = "---\nname: ss-review\nallowed-tools: Read, Grep, Glob\n---\nReview and recommend.";
const registry = "If `.styleseed/artifacts/index.json` exists, use the artifact bundle.\n\n";

test("flags an unconditional legacy read in registry instructions with source location", () => {
  const findings = inspectInstructionContracts({ "ss-review": readonly + "\n\n" + registry +
    "Read `.styleseed/effective-rules.md` and `.styleseed/manifest.json`." });
  assert.deepEqual(findings.map(({ skill, code, line }) => ({ skill, code, line })),
    [{ skill: "ss-review", code: "SI001", line: 9 }]);
});

test("permits conditional legacy handling and legacy-only instructions", () => {
  assert.deepEqual(inspectInstructionContracts({
    "ss-review": readonly + "\n\n" + registry +
      "Only when neither registry file exists, read `.styleseed/effective-rules.md`.",
    "ss-legacy": "Read `.styleseed/effective-rules.md`.",
  }), []);
});

test("finds inline, numbered and nested-list legacy reads, not only paragraph-first Read", () => {
  for (const directive of [
    "1. Read `.styleseed/effective-rules.md` and its manifest.",
    "- Read `.styleseed/effective-rules.md` first.",
    "Resolve first, then read `.styleseed/effective-rules.md`.",
    "1. Resolve and read the active design method:\n   - `.styleseed/effective-rules.md` and its manifest",
  ]) {
    const findings = inspectInstructionContracts({ "ss-page": registry + directive });
    assert.equal(findings.length, 1, directive);
    assert.equal(findings[0].code, "SI001");
  }
});

test("a qualified legacy section survives command examples but ends at the next heading", () => {
  const valid = registry + "Legacy projects use this path only when neither registry file exists.\n\n" +
    "```sh\nnode resolve --from-lock STYLESEED.md\n```\n\n" +
    "Read `.styleseed/effective-rules.md` after success.";
  assert.deepEqual(inspectInstructionContracts({ "ss-component": valid }), []);
  const findings = inspectInstructionContracts({ "ss-component": valid +
    "\n\n## Registry work\n\n1. Read `.styleseed/effective-rules.md`." });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "SI001");
});

test("editing handoffs are checked against the target's declared tools", () => {
  for (const invocation of ["/ss-review", "$ss-review", "ss-review"]) {
    const caller = `Use \`${invocation}\` to make the edits.`;
    assert.equal(inspectInstructionContracts({ "ss-score": caller, "ss-review": readonly })[0]?.code, "SI002");
    assert.deepEqual(inspectInstructionContracts({ "ss-score": caller,
      "ss-review": readonly.replace("Read, Grep, Glob", "Read, Edit, Grep, Glob") }), []);
  }
});

test("absent tool metadata does not invent a read-only restriction", () => {
  for (const target of ["ss-resolve", "ss-studio"]) {
    assert.deepEqual(inspectInstructionContracts({
      "ss-build": `Use \`${target}\` to fix the configuration.`,
      [target]: `---\nname: ${target}\ndescription: Workflow with host-default tools.\n---\nWorkflow`,
    }), []);
  }
});

test("detects arrow and approved-fix handoffs without treating recommendations as edits", () => {
  for (const caller of [
    "- For a full prose audit with fixes → use `/ss-review`",
    "For an audit with fixes -> use `$ss-review`",
    "3. apply approved fixes with `/ss-review` or `$ss-review`;",
    "Apply fixes using `ss-review`.",
  ]) assert.equal(inspectInstructionContracts({ "ss-score": caller, "ss-review": readonly })[0]?.code, "SI002", caller);
  for (const caller of [
    "For a prose audit and recommendations → use `/ss-review`.",
    "Use `/ss-review` for findings, then apply approved fixes in an authorized implementation step.",
    "Do not use `/ss-review` to fix the code.",
    "Never apply fixes with `/ss-review`.",
  ]) assert.deepEqual(inspectInstructionContracts({ "ss-score": caller, "ss-review": readonly }), [], caller);
});

test("missing matrix entries still participate in frontmatter and handoff diagnostics", () => {
  const fixture = mkdtempSync(resolve(tmpdir(), "styleseed-contract-matrix-"));
  try {
    const scripts = resolve(fixture, "scripts");
    mkdirSync(resolve(scripts, "lib"), { recursive: true });
    for (const file of ["validate-skill-contracts.mjs", "lib/instruction-contracts.mjs"]) {
      cpSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), resolve(scripts, file));
    }
    for (const [name, text] of Object.entries({
      "ss-review": readonly.replace("name: ss-review", "name: wrong-name"),
      "ss-score": "---\nname: ss-score\ndescription: Score only.\n---\nUse `/ss-review` to fix the code.",
    })) {
      const dir = resolve(fixture, "engine/.claude/skills", name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "SKILL.md"), text);
    }
    writeFileSync(resolve(fixture, "engine/skill-contracts.json"), JSON.stringify({
      schemaVersion: 1, evidenceLevels: ["code"], skills: {
        "ss-score": { consumesBundle: false, maySelectGrammar: false, mayMutateProjectConfig: false, evidenceLevel: "code" },
      },
    }));
    const result = spawnSync(process.execPath, [resolve(scripts, "validate-skill-contracts.mjs")], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing skill contract: ss-review/u);
    assert.match(result.stderr, /ss-review frontmatter name must match/u);
    assert.match(result.stderr, /SI002/u);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("empty, inline-array and block-list tool declarations remain distinct", () => {
  const caller = "Use `/ss-review` to edit the file.";
  for (const declaration of ["allowed-tools:", "allowed-tools: []", "allowed-tools: [Read, Grep, Glob]", "allowed-tools:\n  - Read\n  - Glob"]) {
    const target = `---\nname: ss-review\n${declaration}\ndescription: Review only.\n---\nReview`;
    assert.equal(inspectInstructionContracts({ "ss-score": caller, "ss-review": target })[0]?.code, "SI002", declaration);
  }
  for (const declaration of ["allowed-tools: [Read, Edit]", "allowed-tools:\n  - Read\n  - Write", "allowed-tools: Read, CustomHostTool"]) {
    const target = `---\nname: ss-review\n${declaration}\n---\nReview`;
    assert.deepEqual(inspectInstructionContracts({ "ss-score": caller, "ss-review": target }), []);
  }
});

test("does not interpret fenced examples as executable instructions", () => {
  for (const example of [
    "```text\nUse `/ss-review` to fix the code.\n```\n",
    "   ```text\r\nUse `/ss-review` to fix the code.\r\n   ```\r\n",
    "````md\n```\nUse `/ss-review` to fix the code.\n```\n````\n",
  ]) assert.deepEqual(inspectInstructionContracts({ "ss-score": example, "ss-review": readonly }), []);
});

test("canonical skills pass bounded static checks, not model behavior acceptance", () => {
  const root = fileURLToPath(new URL("../../engine/.claude/skills/", import.meta.url));
  const skills = Object.fromEntries(readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, readFileSync(resolve(root, entry.name, "SKILL.md"), "utf8")]));
  assert.deepEqual(inspectInstructionContracts(skills), []);
});
