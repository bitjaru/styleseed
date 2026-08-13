import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const routerSkillPath = resolve(repoRoot, "engine/.claude/skills/styleseed/SKILL.md");
const routerSkill = readFileSync(routerSkillPath, "utf8");

function routeIntent({
  directSkill = null,
  hasRegistry = false,
  artifactIds = [],
  namedArtifact = null,
  intent,
  explicitLearning = false,
}) {
  if (directSkill) return { kind: "workflow", workflow: directSkill };
  if (hasRegistry && artifactIds.length > 1 && !namedArtifact) {
    return { kind: "question", question: "artifact" };
  }
  if (explicitLearning) return { kind: "workflow", workflow: "ss-learn" };

  switch (intent) {
    case "setup":
      return { kind: "workflow", workflow: "ss-setup" };
    case "build":
      return { kind: "workflow", workflow: "ss-build" };
    case "reference":
      return { kind: "workflow", workflow: "ss-reference" };
    case "studio":
      return { kind: "workflow", workflow: "ss-studio" };
    case "audit":
      return { kind: "workflow", workflow: "ss-audit" };
    case "score":
      return { kind: "workflow", workflow: "ss-score" };
    case "verify":
      return { kind: "workflow", workflow: "ss-verify" };
    case "update":
      return { kind: "workflow", workflow: "ss-update" };
    case "ambiguous-build-vs-studio":
      return { kind: "question", question: "build-vs-studio" };
    case "ambiguous-audit-vs-score-vs-verify":
      return { kind: "question", question: "audit-vs-score-vs-verify" };
    case "ambiguous-build-vs-reference":
      return { kind: "question", question: "build-vs-reference" };
    case "ambiguous-setup-vs-build":
      return { kind: "question", question: "setup-vs-build" };
    default:
      throw new Error(`Unknown intent fixture: ${intent}`);
  }
}

const requiredPhrases = [
  "Resolve the current artifact first",
  "Never fan out",
  "Learning is an optional extension, not part of the core install",
  "never auto-install it",
  "ask one bounded clarification question",
  "Choose exactly one first workflow",
  "Granular `ss-*` skills remain backward compatible",
];

for (const phrase of requiredPhrases) {
  assert(routerSkill.includes(phrase), `router skill missing phrase: ${phrase}`);
}

for (const workflow of [
  "ss-setup",
  "ss-build",
  "ss-reference",
  "ss-studio",
  "ss-audit",
  "ss-score",
  "ss-verify",
  "ss-update",
  "ss-learn",
]) {
  assert(routerSkill.includes(workflow), `router skill missing workflow: ${workflow}`);
}

const fixtures = [
  [{ intent: "setup" }, { kind: "workflow", workflow: "ss-setup" }],
  [{ intent: "build" }, { kind: "workflow", workflow: "ss-build" }],
  [{ intent: "reference" }, { kind: "workflow", workflow: "ss-reference" }],
  [{ intent: "studio" }, { kind: "workflow", workflow: "ss-studio" }],
  [{ intent: "audit" }, { kind: "workflow", workflow: "ss-audit" }],
  [{ intent: "score" }, { kind: "workflow", workflow: "ss-score" }],
  [{ intent: "verify" }, { kind: "workflow", workflow: "ss-verify" }],
  [{ intent: "update" }, { kind: "workflow", workflow: "ss-update" }],
  [{ intent: "build", explicitLearning: true }, { kind: "workflow", workflow: "ss-learn" }],
  [{ intent: "build", directSkill: "ss-build" }, { kind: "workflow", workflow: "ss-build" }],
  [{ intent: "ambiguous-build-vs-studio" }, { kind: "question", question: "build-vs-studio" }],
  [{ intent: "ambiguous-audit-vs-score-vs-verify" }, { kind: "question", question: "audit-vs-score-vs-verify" }],
  [{ intent: "ambiguous-build-vs-reference" }, { kind: "question", question: "build-vs-reference" }],
  [{ intent: "ambiguous-setup-vs-build" }, { kind: "question", question: "setup-vs-build" }],
  [{ hasRegistry: true, artifactIds: ["site-home", "app-dashboard"], intent: "build" }, { kind: "question", question: "artifact" }],
  [{ hasRegistry: true, artifactIds: ["site-home", "app-dashboard"], namedArtifact: "site-home", intent: "build" }, { kind: "workflow", workflow: "ss-build" }],
];

const seen = new Set();
for (const [input, expected] of fixtures) {
  const actual = routeIntent(input);
  assert.deepEqual(actual, expected, `fixture failed for ${JSON.stringify(input)}`);
  if (actual.kind === "workflow") seen.add(actual.workflow);
}

for (const workflow of [
  "ss-setup",
  "ss-build",
  "ss-reference",
  "ss-studio",
  "ss-audit",
  "ss-score",
  "ss-verify",
  "ss-update",
  "ss-learn",
]) {
  assert(seen.has(workflow), `public workflow not reachable in fixtures: ${workflow}`);
}

console.log("router contract OK");
