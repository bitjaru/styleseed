import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll, buildContract, classFacts, parseSource, renderGenerated, splitClass, themeColors } from "../build-component-contracts.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const contract = (id) => readFileSync(resolve(repoRoot, `engine/components/contracts/${id}.md`), "utf8");
const colours = themeColors();

test("class parsing keeps nested brackets and separates variant prefixes", () => {
  assert.deepEqual(splitClass("[&_svg:not([class*='size-'])]:size-4"), { prefixes: ["[&_svg:not([class*='size-'])]"], utility: "size-4" });
  assert.deepEqual(splitClass("dark:data-[state=active]:bg-input/30"), { prefixes: ["dark", "data-[state=active]"], utility: "bg-input/30" });
  const facts = classFacts("h-[1.15rem] w-8 bg-primary dark:bg-input/80 focus-visible:ring-ring/50 transition-all [&_svg:not([class*='size-'])]:size-3.5 rounded-full", colours);
  assert.equal(facts.height, 18.4);
  assert.equal(facts.width, 32);
  assert.equal(facts.icon, 14);
  assert.deepEqual([...facts.tokens].sort(), ["primary", "ring"]);
  assert.deepEqual([...facts.darkTokens], ["input"]);
  assert.ok(facts.motion.has("transition-all"));
});

test("the source parser reads cva variants, sizes, defaults, parts and Radix props", () => {
  const button = parseSource(readFileSync(resolve(repoRoot, "engine/components/ui/button.tsx"), "utf8"), colours);
  assert.deepEqual(Object.keys(button.cvas.buttonVariants.variants.variant), ["default", "neutral", "secondary", "destructive", "outline", "ghost", "brandGhost"]);
  assert.deepEqual(button.cvas.buttonVariants.defaults, { variant: "default", size: "md" });
  assert.equal(button.parts[0].slot, "button");
  assert.deepEqual(button.parts[0].extras, [{ name: "asChild", optional: true, type: "boolean", default: "false" }]);
  const select = parseSource(readFileSync(resolve(repoRoot, "engine/components/ui/select.tsx"), "utf8"), colours);
  const trigger = select.parts.find((p) => p.name === "SelectTrigger");
  assert.deepEqual(trigger.propsBase, ["`@radix-ui/react-select` Trigger props"]);
  assert.deepEqual(trigger.extras.map((e) => [e.name, e.default]), [["size", "default"]]);
});

test("the seven first-set contracts build, cover the designer's order and flag real gaps", () => {
  const { results, json } = buildAll();
  assert.deepEqual(results.flatMap((r) => r.problems), []);
  assert.deepEqual(json.components.map((c) => c.id), ["button", "badge", "tabs", "input", "select", "switch", "table"]);
  assert.equal(json.coverage.components, 48);
  const byId = Object.fromEntries(json.components.map((c) => [c.id, c]));
  assert.deepEqual(byId.button.code.sizes.map((s) => [s.key, s.height, s.icon]), [["xs", 32, 14], ["sm", 36, 14], ["md", 40, 16], ["lg", 52, 22], ["icon", 40, 18]]);
  assert.equal(byId.button.variants.find((v) => v.code === "outline").designer, "Line");
  assert.match(byId.switch.code.flags.join("\n"), /`switch` 18\.4px × 32px/u);
  assert.doesNotMatch(byId.switch.code.flags.join("\n"), /transition-all/u, "the switch names its transitioned properties (detector SS003)");
  assert.match(byId.input.code.flags.join("\n"), /`input` 36px/u);
  assert.deepEqual(byId.table.code.flags, []);
  assert.ok(byId.badge.code.tokens.includes("primary") && byId.button.code.tokens.includes("brand"), "the brand/primary split the badge contract describes is real");
  for (const c of json.components) {
    assert.ok(c.purpose.length > 40, `${c.id} purpose`);
    assert.ok(c.do.length >= 3 && c.dont.length >= 2 && c.knownGaps.length >= 1 && c.sources.length >= 1, `${c.id} judgment sections`);
  }
});

test("a variant added in code, a stale table row, or a missing section fails the build", () => {
  const md = contract("button");
  const missingRow = md.replace(/^\| `brandGhost` .*\n/mu, "");
  assert.match(buildContract("button", missingRow, colours).problems.join("\n"), /variants `brandGhost` is in the code but not in the table/u);
  const extraRow = md.replace(/^(\| `destructive` .*\n)/mu, "$1| `glass` | Glass | Never. |\n");
  assert.match(buildContract("button", extraRow, colours).problems.join("\n"), /variants `glass` is in the table but not in the code/u);
  const noSizes = md.replace(/## Sizes[\s\S]*?(?=## States)/u, "");
  assert.match(buildContract("button", noSizes, colours).problems.join("\n"), /the code has sizes \(xs, sm, md, lg, icon\) but "## Sizes" has no table/u);
  const noDont = md.replace(/## Don't[\s\S]*?(?=## Known gaps)/u, "");
  assert.match(buildContract("button", noDont, colours).problems.join("\n"), /missing or empty "## Don't"/u);
  assert.match(buildContract("chip", "# Chip\n", colours).problems[0], /no component at engine\/components/u);
});

test("the generated block is current in every contract file and carries no hand-written text", () => {
  const { results } = buildAll();
  for (const r of results) {
    const file = contract(r.id);
    assert.equal(file, `${r.contractHand}\n\n${renderGenerated(r)}`, `${r.id}.md generated block is stale; run node scripts/build-component-contracts.mjs`);
    assert.match(renderGenerated(r), /^<!-- generated:start/u);
  }
});
