import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANON_ROLE_MAP, PALETTE_ROLES, checkLayers, flattenFigmaVariables, flattenTokensStudio, importTokenCanon,
  importTokenCanonOrThrow, parseTokenDocument, resolveTokens, toColor, tokenCanonSection,
} from "../../engine/.claude/skills/styleseed/workflows/ss-resolve/scripts/token-canon.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const read = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
const sample = () => read("research/tokens/naming-sample.tokens.json");
const studio = () => read("scripts/fixtures/tokens/tokens-studio.sample.json");
const figma = () => read("scripts/fixtures/tokens/figma-variables.sample.json");
const accent = { accent: "semantic.bg.brand.emphasis", accentForeground: "semantic.fg.inverse" };
const literalHexes = (doc) => new Set([...JSON.stringify(doc).matchAll(/"hex":"(#[0-9A-Fa-f]{6})"/gu)].map((match) => match[1].toUpperCase()));

test("colour values from DTCG objects, hex strings and Figma channels normalise to the same hex", () => {
  assert.deepEqual(toColor({ colorSpace: "srgb", components: [0, 0.451, 0.4196], hex: "#00736B" }), { hex: "#00736B", alpha: 1 });
  assert.deepEqual(toColor({ colorSpace: "srgb", components: [0, 0.451, 0.4196] }), { hex: "#00736B", alpha: 1 });
  assert.deepEqual(toColor("#00736b"), { hex: "#00736B", alpha: 1 });
  assert.deepEqual(toColor("#abc"), { hex: "#AABBCC", alpha: 1 });
  assert.equal(toColor("#00736B80").alpha, 0.502);
  assert.deepEqual(toColor({ r: 0, g: 0.451, b: 0.4196, a: 1 }), { hex: "#00736B", alpha: 1 });
  assert.equal(toColor("teal"), null);
  assert.equal(toColor({ value: 16, unit: "px" }), null);
});

test("the DTCG sample imports with every role on an imported literal and all gates passing", () => {
  const doc = sample();
  const result = importTokenCanon({ document: doc, format: "dtcg", roles: accent, source: "design/tokens.json", sha256: "sha256:test" });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.valid, true);
  assert.equal(result.tokens.layering.status, "checked");
  assert.deepEqual(Object.keys(result.roles).sort(), [...PALETTE_ROLES].sort());
  const imported = literalHexes(doc);
  for (const [role, hex] of Object.entries(result.roles)) assert.ok(imported.has(hex), `${role} = ${hex} is not a literal in the file`);
  assert.equal(result.mapping.primary.token, CANON_ROLE_MAP.primary);
  assert.equal(result.mapping.primary.via, "canon");
  assert.equal(result.mapping.accent.via, "project");
  assert.equal(result.contrast.length, 11);
  assert.equal(result.typeRoles.find((role) => role.role === "body").lineHeight, "1.6");
  assert.match(result.css, /--ss-primary: #[0-9A-F]{6}; \/\* semantic\.bg\.brand\.base \*\//u);
  assert.doesNotMatch(result.css, /--ss-primary-50/u, "no ramps are invented for an imported canon");
  const section = tokenCanonSection(result);
  assert.match(section, /^## Imported token canon/u);
  assert.match(section, /Palette generation did not run/u);
  for (const hex of section.matchAll(/#[0-9A-Fa-f]{6}\b/gu)) assert.ok(imported.has(hex[0].toUpperCase()), `${hex[0]} in the bundle section is not imported`);
});

test("a missing role is an error that names the mapping to add, never a generated value", () => {
  const result = importTokenCanon({ document: sample(), format: "dtcg", source: "design/tokens.json" });
  assert.match(result.problems.join("\n"), /role accent: no imported token\. Add tokens\.roles\.accent/u);
  assert.match(result.problems.join("\n"), /role accentForeground: no imported token/u);
  assert.equal(result.roles.accent, undefined);
  assert.equal(result.contrast.length, 0, "contrast is not measured on a partial role set");
  assert.throws(() => importTokenCanonOrThrow({ document: sample(), format: "dtcg", source: "design/tokens.json" }), /Token import failed for design\/tokens\.json:\n {2}- role accent/u);

  const wrongPath = importTokenCanon({ document: sample(), format: "dtcg", roles: { ...accent, primary: "semantic.bg.nothing" }, source: "t.json" });
  assert.match(wrongPath.problems.join("\n"), /tokens\.roles\.primary = semantic\.bg\.nothing is not an imported token/u);

  const notColour = importTokenCanon({ document: sample(), format: "dtcg", roles: { ...accent, primary: "type.body" }, source: "t.json" });
  assert.match(notColour.problems.join("\n"), /role primary: type\.body is a typography token, not a colour/u);

  const missingCanon = sample(); delete missingCanon.semantic.bg.warning.emphasis;
  const absent = importTokenCanon({ document: missingCanon, format: "dtcg", roles: accent, source: "t.json" });
  assert.match(absent.problems.join("\n"), /role warning: the canon token semantic\.bg\.warning\.emphasis is not in the file/u);
});

test("aliases that dangle, cycle, cross layers or change type are reported with their path", () => {
  const doc = sample();
  doc.semantic.fg.base.$value = "{primitive.neutral.1000}";
  doc.semantic.bg.base.$value = "{semantic.bg.subtle}";
  doc.semantic.bg.subtle.$value = "{semantic.bg.base}";
  doc.component.button.primary.bg.default.$value = "{primitive.brand.700}";
  doc.semantic.fg.muted.$value = "{type.body}";
  const result = importTokenCanon({ document: doc, format: "dtcg", roles: accent, source: "t.json" });
  const text = result.problems.join("\n");
  assert.match(text, /semantic\.fg\.base: alias \{primitive\.neutral\.1000\} does not resolve to a token/u);
  assert.match(text, /alias cycle semantic\.bg\.base → semantic\.bg\.subtle/u);
  assert.match(text, /component\.button\.primary\.bg\.default: component tokens alias semantic tokens, not primitive/u);
  assert.match(text, /semantic\.fg\.muted: alias resolves to a typography token but this token is color/u);
});

test("the layer check keeps the designer's rules: literals only in primitives, property and emphasis names in semantic colours", () => {
  const doc = sample();
  doc.semantic.fg.loud = { $value: "{primitive.neutral.900}" };
  doc.semantic.text = { $type: "color", primary: { $value: "{primitive.neutral.900}" } };
  doc.semantic.bd.base.$value = { colorSpace: "srgb", components: [0.5, 0.5, 0.5], hex: "#808080" };
  const { problems, status, counts } = checkLayers(parseTokenDocument(doc, "dtcg").tokens, { format: "dtcg" });
  assert.equal(status, "checked");
  assert.equal(counts.outside, 0);
  const text = problems.join("\n");
  assert.match(text, /semantic\.fg\.loud: last segment names the emphasis/u);
  assert.match(text, /semantic\.text\.primary: semantic colour tokens are grouped by property: fg, bg, or bd/u);
  assert.match(text, /semantic\.bd\.base: semantic tokens must alias \(got a literal\)/u);

  const unlayered = { $type: "color", brand: { blue: { $value: "#0000FF" } } };
  assert.equal(checkLayers(parseTokenDocument(unlayered, "dtcg").tokens).status, "not-applicable");
  const result = importTokenCanon({ document: unlayered, format: "dtcg", source: "flat.json" });
  assert.match(result.warnings.join("\n"), /layering not checked/u);
});

test("a Tokens Studio export resolves set-less aliases, normalises plugin types and reads a theme", () => {
  const doc = studio();
  const { tokens, notes } = flattenTokensStudio(doc, { theme: "Light" });
  assert.equal(tokens.get("core.primitive.space.4").type, "dimension");
  assert.equal(tokens.get("core.primitive.font.sans").type, "fontFamily");
  assert.equal(tokens.get("theme.semantic.fg.base").value, "{primitive.neutral.900}");
  assert.match(notes[0], /theme "Light" enables 2 of 2 token sets/u);
  const { resolved, problems } = resolveTokens(tokens);
  assert.deepEqual(problems, []);
  assert.equal(resolved.get("theme.component.button.primary.bg.default").literal, "#00736B");

  const result = importTokenCanon({ document: doc, format: "tokens-studio", modes: { light: "Light" }, roles: { accent: "semantic.bg.accent.base", accentForeground: "semantic.fg.inverse" }, source: "tokens.json" });
  assert.deepEqual(result.problems, []);
  assert.equal(result.valid, true);
  assert.equal(result.tokens.layering.status, "checked");
  assert.equal(result.roles.primary, "#00736B");
  assert.equal(result.mapping.background.token, "theme.semantic.bg.base");
  assert.deepEqual(result.typeRoles, [{ role: "body", token: "theme.type.body", fontFamily: "Pretendard", fontSize: "16", fontWeight: "400", lineHeight: "150%" }]);
  assert.match(tokenCanonSection(result), /6 dimension · 1 fontFamily/u);

  const missingTheme = importTokenCanon({ document: doc, format: "tokens-studio", modes: { light: "Dusk" }, source: "tokens.json" });
  assert.match(missingTheme.problems.join("\n"), /no theme named "Dusk" in \$themes \(Light\)/u);
  const dtcgModes = importTokenCanon({ document: sample(), format: "dtcg", modes: { light: "Light" }, roles: accent, source: "t.json" });
  assert.match(dtcgModes.problems.join("\n"), /dtcg: the format module has no modes/u);
});

test("a Figma Variables export reads one named mode per collection and reports collections without that mode", () => {
  const doc = figma();
  const roles = { accent: "semantic.bg.accent.base", accentForeground: "semantic.fg.inverse" };
  const light = importTokenCanon({ document: doc, format: "figma-variables", mode: "light", modes: { light: "Light", dark: "Dark" }, roles, source: "figma.json" });
  assert.deepEqual(light.problems, []);
  assert.equal(light.valid, true);
  assert.equal(light.roles.background, "#FFFFFF");
  assert.equal(light.roles.primary, "#00736B");
  assert.equal(light.mapping.primary.token, "Semantic.bg.brand.base");
  assert.equal(light.tokens.layering.status, "checked", "capitalised collection names still land in their layers");
  assert.equal(light.tokens.byType.number, 2, "FLOAT variables import as numbers");

  const dark = importTokenCanon({ document: doc, format: "figma-variables", mode: "dark", modes: { light: "Light", dark: "Dark" }, roles, source: "figma.json" });
  assert.deepEqual(dark.problems, []);
  assert.equal(dark.roles.background, "#101413");
  assert.equal(dark.valid, false, "failing gates are reported, never corrected");
  assert.ok(dark.contrast.some((check) => check.foreground === "primaryForeground" && !check.pass));
  assert.match(dark.warnings.join("\n"), /contrast primaryForeground\/primary = [\d.]+:1 < 4\.5:1 — the imported system owns this value/u);
  assert.match(tokenCanonSection(dark), /Failing gates: .*do not recolour or substitute/u);

  const noMode = flattenFigmaVariables(doc);
  assert.match(noMode.problems.join("\n"), /collection "Semantic" has modes "Light", "Dark"; set tokens\.modes/u);
  const wrongMode = flattenFigmaVariables(doc, { mode: "Dusk" });
  assert.match(wrongMode.problems.join("\n"), /none is named "Dusk"/u);
  assert.match(parseTokenDocument({ meta: {} }, "figma-variables").problems[0], /expected `variables` and `variableCollections`/u);
});

test("translucent role colours and non-colour role tokens are refused so contrast stays measurable", () => {
  const doc = sample();
  doc.primitive.brand["700"].$value = { colorSpace: "srgb", components: [0, 0.45, 0.42], alpha: 0.5, hex: "#00736B" };
  const result = importTokenCanon({ document: doc, format: "dtcg", roles: accent, source: "t.json" });
  assert.match(result.problems.join("\n"), /role primary: semantic\.bg\.brand\.base is translucent \(alpha 0\.5\)/u);
});
