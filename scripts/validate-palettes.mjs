#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generatePalette } from "../engine/color/generator.mjs";

const root = resolve(new URL("../", import.meta.url).pathname);
const palettes = JSON.parse(readFileSync(resolve(root, "engine/color/palettes.json"), "utf8"));
const failures = [];

function rgb(hex) {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) throw new Error(`invalid hex ${hex}`);
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  const values = rgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function requirePair(palette, foreground, background, minimum) {
  const ratio = contrast(palette.roles[foreground], palette.roles[background]);
  if (ratio < minimum) failures.push(`${palette.id}: ${foreground}/${background} ${ratio.toFixed(2)} < ${minimum}`);
}

const requiredRoles = [
  "background", "surface", "chrome", "foreground", "mutedForeground", "chromeForeground",
  "border", "primary", "primaryForeground", "accent", "accentForeground", "focus",
  "success", "successForeground", "warning", "warningForeground", "danger", "dangerForeground",
];

for (const palette of palettes) {
  for (const role of requiredRoles) {
    if (!palette.roles?.[role]) failures.push(`${palette.id}: missing ${role}`);
    else if (!/^#[0-9A-F]{6}$/i.test(palette.roles[role])) failures.push(`${palette.id}: invalid ${role}`);
  }
  requirePair(palette, "foreground", "background", 4.5);
  requirePair(palette, "mutedForeground", "background", 4.5);
  requirePair(palette, "foreground", "surface", 4.5);
  requirePair(palette, "chromeForeground", "chrome", 4.5);
  requirePair(palette, "primaryForeground", "primary", 4.5);
  requirePair(palette, "accentForeground", "accent", 4.5);
  requirePair(palette, "successForeground", "success", 4.5);
  requirePair(palette, "warningForeground", "warning", 4.5);
  requirePair(palette, "dangerForeground", "danger", 4.5);
  requirePair(palette, "focus", "background", 3);
  requirePair(palette, "focus", "surface", 3);
}

if (new Set(palettes.map((palette) => palette.id)).size !== palettes.length) failures.push("palette ids must be unique");

const generatedCases = [
  "#276B5E", "#5B5BD6", "#FF2D55", "#FFD60A", "#0A84FF", "#111111", "#F5F5F5",
].flatMap((keyColor) => ["light", "dark"].flatMap((mode) =>
  ["calm", "balanced", "vivid", "deep"].map((character) => ({ keyColor, mode, character }))));

for (const input of generatedCases) {
  const generated = generatePalette(input);
  const label = `${input.keyColor}/${input.mode}/${input.character}`;
  if (!generated.valid) failures.push(`${label}: generated palette is invalid`);
  if (Object.keys(generated.ramps.primary).length !== 11) failures.push(`${label}: primary ramp must have 11 stops`);
  if (Object.keys(generated.ramps.accent).length !== 11) failures.push(`${label}: accent ramp must have 11 stops`);
  if (!generated.css.includes("--ss-primary-950") || !generated.css.includes("--ss-accent-950")) failures.push(`${label}: CSS must include both ramps`);
  if (generated.contrast.some((item) => !item.pass)) failures.push(`${label}: generated contrast gate failed`);
  if (JSON.stringify(generated) !== JSON.stringify(generatePalette(input))) failures.push(`${label}: generator is not deterministic`);
}

for (const [label, input] of [
  ["mode", { mode: "sepia" }],
  ["character", { character: "loud" }],
  ["harmony", { harmony: "random" }],
  ["temperature", { temperature: "hot" }],
]) {
  try {
    generatePalette(input);
    failures.push(`invalid ${label} must fail closed`);
  } catch (error) {
    if (!error.message.includes(`Invalid ${label}`)) failures.push(`invalid ${label} returned the wrong error`);
  }
}

if (failures.length) {
  console.error(`Palette validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`StyleSeed palettes: ${palettes.length} recipes · ${generatedCases.length} generated matrices · WCAG text/action/focus pairs verified`);
