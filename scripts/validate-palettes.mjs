#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

if (failures.length) {
  console.error(`Palette validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`StyleSeed palettes: ${palettes.length} recipes · WCAG text/action/focus pairs verified`);
