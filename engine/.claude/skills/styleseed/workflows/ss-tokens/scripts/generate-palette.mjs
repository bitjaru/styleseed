#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generatePalette } from "./generator.mjs";

function parseArgs(argv) {
  const supported = new Set(["help", "key-color", "mode", "character", "harmony", "temperature", "format", "out"]);
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (!supported.has(key)) throw new Error(`Unknown option: --${key}`);
    if (key === "help") {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function help() {
  return `StyleSeed Palette Engine

Usage:
  generate-palette.mjs --key-color <hex> [options]

Options:
  --key-color <hex>                 Brand/product key color (required)
  --mode light|dark                 default: light
  --character calm|balanced|vivid|deep
  --harmony auto|tonal|adjacent|contrast
  --temperature neutral|warm|cool
  --format json|css|summary         default: json
  --out <path>                      write output instead of stdout
`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help());
    process.exit(0);
  }
  if (!args["key-color"]) throw new Error("--key-color is required");
  const palette = generatePalette({
    keyColor: args["key-color"],
    mode: args.mode,
    character: args.character,
    harmony: args.harmony,
    temperature: args.temperature,
  });
  const format = args.format || "json";
  if (!["json", "css", "summary"].includes(format)) {
    throw new Error(`Invalid format: ${format}. Supported: json, css, summary`);
  }
  const output = format === "css"
    ? `${palette.css}\n`
    : format === "summary"
      ? `${JSON.stringify({ input: palette.input, roles: palette.roles, valid: palette.valid, contrast: palette.contrast, decisions: palette.decisions }, null, 2)}\n`
      : `${JSON.stringify(palette, null, 2)}\n`;
  if (args.out) {
    const target = resolve(args.out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, output);
    console.log(target);
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  console.error(`Palette generation failed: ${error.message}`);
  process.exit(1);
}
