import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTokenLayers, flatten } from "../check-token-layers.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const color = (hex) => ({ $value: { colorSpace: "srgb", components: [0, 0, 0], hex } });
const alias = (path) => ({ $value: `{${path}}` });
const base = () => ({
  primitive: { $type: "color", neutral: { 900: color("#111111"), 50: color("#FAFAFA") }, brand: { 700: color("#00736B") } },
  semantic: { $type: "color", fg: { base: alias("primitive.neutral.900") }, bg: { base: alias("primitive.neutral.50"), brand: { base: alias("primitive.brand.700") } } },
  type: { $type: "typography", body: { $value: { fontFamily: ["Pretendard"], fontSize: { value: 16, unit: "px" }, fontWeight: 400, lineHeight: 1.6 } } },
  component: { $type: "color", button: { primary: { bg: { default: alias("semantic.bg.brand.base") }, fg: { default: alias("semantic.fg.base") } } } },
});

test("the research sample follows the designer's layering", () => {
  const doc = JSON.parse(readFileSync(resolve(repoRoot, "research/tokens/naming-sample.tokens.json"), "utf8"));
  const { problems, counts } = checkTokenLayers(doc);
  assert.deepEqual(problems, []);
  assert.ok(counts.primitive >= 20 && counts.semantic >= 25 && counts.type >= 5 && counts.component >= 15, JSON.stringify(counts));
  assert.equal(flatten(doc).get("semantic.fg.base").value, "{primitive.neutral.900}");
});

test("a literal in the semantic layer, a component that skips a layer, and an alias cycle are reported", () => {
  const literal = base(); literal.semantic.fg.muted = color("#777777");
  assert.match(checkTokenLayers(literal).problems.join("\n"), /semantic\.fg\.muted: semantic tokens must alias/u);

  const skip = base(); skip.component.button.primary.bg.default = alias("primitive.brand.700");
  assert.match(checkTokenLayers(skip).problems.join("\n"), /component tokens alias semantic tokens, not primitive/u);

  const cycle = base(); cycle.semantic.fg.base = alias("semantic.fg.subtle"); cycle.semantic.fg.subtle = alias("semantic.fg.base");
  assert.match(checkTokenLayers(cycle).problems.join("\n"), /alias cycle/u);

  const dangling = base(); dangling.semantic.bd = { base: alias("primitive.neutral.200") };
  assert.match(checkTokenLayers(dangling).problems.join("\n"), /does not resolve to a token/u);

  const badEmphasis = base(); badEmphasis.semantic.fg.strong = alias("primitive.neutral.900");
  assert.match(checkTokenLayers(badEmphasis).problems.join("\n"), /last segment names the emphasis/u);

  assert.deepEqual(checkTokenLayers(base()).problems, []);
});
