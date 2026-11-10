import { writeFileSync } from "node:fs";
import { generatePalette, generatePaletteCss, contrast, hexToOklch, oklchToHex } from "../../../engine/color/generator.mjs";

// Landing brand study: one key color, with the supporting hue derived by StyleSeed.
const palette = generatePalette({ keyColor: "#0057FF", mode: "light", character: "vivid", harmony: "contrast", temperature: "neutral" });
// Bright surfaces have dark text; the deeper accent role remains available for text.
palette.roles.highlight = palette.ramps.accent["100"];
palette.roles.highlightForeground = palette.roles.foreground;
palette.extensions = { landing: { highlight: "ramps.accent.100", highlightForeground: "roles.foreground" } };
const ratio = contrast(palette.roles.highlightForeground, palette.roles.highlight);
palette.contrast.push({ foreground: "highlightForeground", background: "highlight", ratio: Math.round(ratio * 100) / 100, minimum: 4.5, pass: ratio >= 4.5 });
// Brighter status surfaces retain the generated hues and use ink text.
for (const status of ["success", "warning", "danger"]) {
  const role = `${status}Surface`;
  palette.roles[role] = oklchToHex({ l: .76, c: .16, h: hexToOklch(palette.roles[status]).h });
  palette.roles[`${role}Foreground`] = palette.roles.foreground;
  const ratio = contrast(palette.roles[`${role}Foreground`], palette.roles[role]);
  palette.contrast.push({ foreground: `${role}Foreground`, background: role, ratio: Math.round(ratio * 100) / 100, minimum: 4.5, pass: ratio >= 4.5 });
}
palette.extensions.landing.statusSurfaces = { lightness: .76, chroma: .16, hue: "from each generated status role" };
palette.valid = palette.contrast.every((pair) => pair.pass);
if (!palette.valid) throw new Error("Landing palette failed its declared contrast pairs.");
palette.css = generatePaletteCss(palette);
writeFileSync(new URL("./brand-palette.json", import.meta.url), `${JSON.stringify(palette, null, 2)}\n`);
