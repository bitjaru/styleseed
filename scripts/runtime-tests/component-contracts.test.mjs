import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

test("a control height written relative to --ss-control-height reads as its fallback plus the offset (WO-17 A3)", () => {
  const D = "var(--ss-control-height,40px)";
  for (const [cls, px] of [[`h-[${D}]`, 40], [`h-[calc(${D}-4px)]`, 36], [`h-[calc(${D}-8px)]`, 32], [`h-[calc(${D}-12px)]`, 28], [`h-[calc(${D}+4px)]`, 44], [`h-[calc(${D}+12px)]`, 52]]) {
    const facts = classFacts(`${cls} px-4 text-[14px]`, colours);
    assert.equal(facts.height, px, cls);
    assert.deepEqual(facts.controlHeightMisfits, [], cls);
  }
  const select = classFacts(`flex w-full data-[size=default]:h-[calc(${D}-4px)] data-[size=sm]:h-[calc(${D}-8px)] [&_svg:not([class*='size-'])]:size-4`, colours);
  assert.deepEqual(select.heightsBySize, { default: 36, sm: 32 });
  assert.equal(select.height, null);
  assert.equal(select.width, null, "w-full stays unread");
  for (const [cls, px] of [[`size-[${D}]`, 40], [`size-[calc(${D}-8px)]`, 32]]) {
    const facts = classFacts(cls, colours);
    assert.deepEqual([facts.height, facts.width], [px, px], cls);
  }
  const toggle = classFacts(`h-[calc(${D}-4px)] px-2 min-w-[calc(${D}-4px)]`, colours);
  assert.deepEqual([toggle.height, toggle.width, toggle.controlHeightMisfits], [36, null, []], "min-w is the one form and is not read as a width");
  assert.equal(classFacts(`h-[calc(var(--ss-control-height,36px)-4px)]`, colours).height, 32, "the literal fallback is what is read");
  for (const other of ["h-[var(--other)]", "h-[var(--radix-select-trigger-height)]", "h-[calc(100%-1px)]", "h-px", "h-full"]) {
    const facts = classFacts(other, colours);
    assert.equal(facts.height, null, other);
    assert.deepEqual(facts.controlHeightMisfits, [], `${other} does not name the variable and is not reported`);
  }
  const misfits = ["h-(--ss-control-height,40px)", "h-[var(--ss-control-height)]", "h-[calc(var(--ss-control-height,40px)_-_4px)]", "h-[calc(var(--ss-control-height,_40px)-4px)]", "data-[size=sm]:h-[var(--ss-control-height,2.5rem)]", "min-w-[var(--ss-control-height)]", "md:size-[calc(var(--ss-control-height,40px)*2)]"];
  const bad = classFacts(misfits.join(" "), colours);
  assert.deepEqual(bad.controlHeightMisfits, misfits);
  assert.deepEqual([bad.height, bad.width, bad.heightsBySize], [null, null, {}], "a misfit is never read as a number");
});

test("both builders report a class that names --ss-control-height in another form (WO-17 A3)", () => {
  const source = readFileSync(resolve(repoRoot, "engine/components/ui/input.tsx"), "utf8");
  const height = source.match(/ (h-\S+) w-full/u)?.[1];
  assert.ok(height, "the input's height class sits before w-full");
  const changed = source.replace(` ${height} w-full`, " h-[var(--ss-control-height)] w-full");
  assert.notEqual(changed, source);
  assert.deepEqual(buildContract("input", contract("input"), colours).problems, []);
  assert.match(buildContract("input", contract("input"), colours, changed).problems.join("\n"), /^input: engine\/components\/ui\/input\.tsx: `h-\[var\(--ss-control-height\)\]` names --ss-control-height in a form the readers do not know/mu);
});

// WO-17 A2: every shipped control height, the class it carries, and the px it draws today (D = 40px).
const CH = (offset) => (offset ? `[calc(var(--ss-control-height,40px)${offset > 0 ? "+" : "-"}${Math.abs(offset)}px)]` : "[var(--ss-control-height,40px)]");
const A2_ROWS = [
  { file: "ui/button.tsx", row: "xs", before: "xs: \"", cls: `h-${CH(-8)}`, after: " px-3.5", px: 32 },
  { file: "ui/button.tsx", row: "sm", before: "sm: \"", cls: `h-${CH(-4)}`, after: " px-3.5", px: 36 },
  { file: "ui/button.tsx", row: "md", before: "md: \"", cls: `h-${CH(0)}`, after: " px-4", px: 40 },
  { file: "ui/button.tsx", row: "lg", before: "lg: \"", cls: `h-${CH(12)}`, after: " px-5", px: 52 },
  { file: "ui/button.tsx", row: "icon", before: "icon: \"", cls: `size-${CH(0)}`, after: " [&_svg", px: 40 },
  { file: "ui/input.tsx", row: "input", before: "border-input flex ", cls: `h-${CH(-4)}`, after: " w-full", px: 36 },
  { file: "ui/select.tsx", row: "default", before: " ", cls: `data-[size=default]:h-${CH(-4)}`, after: " data-[size=sm]:", px: 36 },
  { file: "ui/select.tsx", row: "sm", before: " ", cls: `data-[size=sm]:h-${CH(-8)}`, after: " *:data-[slot=select-value]", px: 32 },
  { file: "ui/segmented-control.tsx", row: "default", before: "\"", cls: `h-${CH(-4)}`, after: " text-[14px]\"", px: 36 },
  { file: "ui/segmented-control.tsx", row: "sm", before: "\"", cls: `h-${CH(-12)}`, after: " text-[12px]\"", px: 28 },
  { file: "ui/toggle.tsx", row: "default", before: "default: \"", cls: `h-${CH(-4)}`, after: ` px-2 min-w-${CH(-4)}"`, px: 36, minWidth: true },
  { file: "ui/toggle.tsx", row: "sm", before: "sm: \"", cls: `h-${CH(-8)}`, after: ` px-1.5 min-w-${CH(-8)}"`, px: 32, minWidth: true },
  { file: "ui/toggle.tsx", row: "lg", before: "lg: \"", cls: `h-${CH(0)}`, after: ` px-2.5 min-w-${CH(0)}"`, px: 40, minWidth: true },
  { file: "ui/tabs.tsx", row: "tab list", before: "inline-flex ", cls: `h-${CH(-4)}`, after: " w-fit", px: 36 },
  { file: "ui/confirm-modal.tsx", row: "both buttons", before: "flex-1 ", cls: `h-${CH(4)}`, after: " text-[16px]", px: 44, count: 2 },
  { file: "ui/drawer.tsx", row: "close button", before: "className=\"", cls: `size-${CH(-8)}`, after: " flex items-center", px: 32 },
  { file: "patterns/top-bar.tsx", row: "action button", before: "\"relative ", cls: `size-${CH(0)}`, after: " ss-pattern-control", px: 40 },
];

test("every shipped control height hangs off --ss-control-height with the :root fallback, and reads as today's px (WO-17 A2, A4)", () => {
  const recipes = readFileSync(resolve(repoRoot, "engine/css/recipes.css"), "utf8");
  const rootBlock = recipes.match(/(?:^|\n):root\s*\{([^}]*)\}/u)?.[1] ?? "";
  const rootPx = rootBlock.match(/--ss-control-height:\s*(\d+(?:\.\d+)?)px;/u)?.[1];
  assert.equal(rootPx, "40", "engine/css/recipes.css :root sets --ss-control-height: 40px");
  assert.equal(recipes.match(/--ss-control-height:/gu).length, 1, "in Part A only :root sets the variable; no recipe block does");

  const dir = resolve(repoRoot, "engine/components");
  const files = readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".tsx")).map(String).sort();
  const found = [];
  for (const file of files) {
    const text = readFileSync(resolve(dir, file), "utf8");
    const mentions = text.match(/--ss-control-height/gu)?.length ?? 0;
    const literals = [...text.matchAll(/var\(--ss-control-height,(\d+(?:\.\d+)?)px\)/gu)];
    assert.equal(literals.length, mentions, `${file}: every --ss-control-height is written var(--ss-control-height,<n>px), no space`);
    for (const literal of literals) assert.equal(literal[1], rootPx, `${file}: the fallback ${literal[1]}px must equal :root's ${rootPx}px in engine/css/recipes.css`);
    for (const cls of text.match(/[^\s"'`{}]*--ss-control-height[^\s"'`{}]*/gu) ?? []) {
      assert.deepEqual(classFacts(cls, colours).controlHeightMisfits, [], `${file}: ${cls}`);
      found.push(`${file} ${cls}`);
    }
  }
  const expected = [];
  for (const row of A2_ROWS) {
    const text = readFileSync(resolve(dir, row.file), "utf8");
    const snippet = `${row.before}${row.cls}${row.after}`;
    assert.equal(text.split(snippet).length - 1, row.count ?? 1, `${row.file} ${row.row}: ${snippet}`);
    const facts = classFacts(row.cls, colours);
    const size = row.cls.match(/^data-\[size=([a-z]+)\]:/u)?.[1];
    assert.equal(size ? facts.heightsBySize[size] : facts.height, row.px, `${row.file} ${row.row} reads ${row.px}px`);
    if (row.cls.startsWith("size-")) assert.equal(facts.width, row.px, `${row.file} ${row.row} is square`);
    for (let i = 0; i < (row.count ?? 1); i += 1) {
      expected.push(`${row.file} ${row.cls}`);
      if (row.minWidth) expected.push(`${row.file} ${row.cls.replace(/^h-/u, "min-w-")}`);
    }
  }
  assert.deepEqual(found.sort(), expected.sort(), "the classes naming --ss-control-height are exactly the rows of WO-17 A2");
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
