const VERSION = "1.0.0";

const CHARACTER = {
  calm: { label: "Calm", chroma: 0.72, accent: 0.78, surface: 0.010, primaryLight: 0.48, primaryDark: 0.76 },
  balanced: { label: "Balanced", chroma: 0.94, accent: 0.96, surface: 0.014, primaryLight: 0.50, primaryDark: 0.75 },
  vivid: { label: "Vivid", chroma: 1.14, accent: 1.15, surface: 0.018, primaryLight: 0.53, primaryDark: 0.78 },
  deep: { label: "Deep", chroma: 0.90, accent: 0.92, surface: 0.014, primaryLight: 0.42, primaryDark: 0.70 },
};

const TEMPERATURE_HUE = { neutral: null, warm: 65, cool: 245 };
const STATUS_HUES = { success: 148, warning: 78, danger: 27 };
const RAMP_LIGHTNESS = [0.98, 0.94, 0.88, 0.80, 0.70, 0.61, 0.53, 0.45, 0.36, 0.27, 0.18];
const RAMP_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function option(value, fallback, supported, label) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!supported.includes(value)) {
    throw new Error(`Invalid ${label}: ${value}. Supported: ${supported.join(", ")}`);
  }
  return value;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function wrapHue(value) {
  return ((value % 360) + 360) % 360;
}

function hueDistance(a, b) {
  const direct = Math.abs(wrapHue(a) - wrapHue(b));
  return Math.min(direct, 360 - direct);
}

function normalizeHex(input) {
  const value = String(input || "").trim();
  const expanded = /^#[0-9a-f]{3}$/i.test(value)
    ? `#${value.slice(1).split("").map((part) => part + part).join("")}`
    : value;
  if (!/^#[0-9a-f]{6}$/i.test(expanded)) throw new Error(`Invalid key color: ${input}`);
  return expanded.toUpperCase();
}

function hexToRgb(hex) {
  const value = normalizeHex(hex);
  return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}

function linearize(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function delinearize(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function rgbToOklab(rgb) {
  const [r, g, b] = rgb.map(linearize);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearRgb({ l, a, b }) {
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  ];
}

function oklchToOklab({ l, c, h }) {
  const radians = wrapHue(h) * Math.PI / 180;
  return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

function hexToOklch(hex) {
  const lab = rgbToOklab(hexToRgb(hex));
  const c = Math.sqrt(lab.a ** 2 + lab.b ** 2);
  return { l: lab.l, c, h: c < 0.0001 ? 0 : wrapHue(Math.atan2(lab.b, lab.a) * 180 / Math.PI) };
}

function inSrgb(linearRgb) {
  return linearRgb.every((value) => value >= -0.000001 && value <= 1.000001);
}

function fitOklch(color) {
  const target = { l: clamp(color.l), c: Math.max(0, color.c), h: wrapHue(color.h) };
  if (inSrgb(oklabToLinearRgb(oklchToOklab(target)))) return target;
  let low = 0;
  let high = target.c;
  for (let index = 0; index < 24; index += 1) {
    const c = (low + high) / 2;
    if (inSrgb(oklabToLinearRgb(oklchToOklab({ ...target, c })))) low = c;
    else high = c;
  }
  return { ...target, c: low };
}

function oklchToHex(input) {
  const color = fitOklch(input);
  const rgb = oklabToLinearRgb(oklchToOklab(color)).map((value) => clamp(delinearize(value)));
  return `#${rgb.map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readableForeground(background, dark, light, target = 4.5) {
  const candidates = [dark, light].map((hex) => ({ hex, ratio: contrast(hex, background) }));
  candidates.sort((a, b) => b.ratio - a.ratio);
  return { ...candidates[0], pass: candidates[0].ratio >= target };
}

function accessibleFill(color, dark, light, target = 4.5) {
  const firstHex = oklchToHex(color);
  const firstForeground = readableForeground(firstHex, dark, light, target);
  if (firstForeground.pass) return { color: fitOklch(color), hex: firstHex, foreground: firstForeground.hex, ratio: firstForeground.ratio, adjusted: false };

  let winner = null;
  for (let step = 3; step <= 97; step += 1) {
    const candidate = fitOklch({ ...color, l: step / 100 });
    const hex = oklchToHex(candidate);
    const foreground = readableForeground(hex, dark, light, target);
    if (!foreground.pass) continue;
    const distance = Math.abs(candidate.l - color.l) + Math.abs(candidate.c - color.c) * 0.25;
    if (!winner || distance < winner.distance) winner = { color: candidate, hex, foreground: foreground.hex, ratio: foreground.ratio, distance };
  }
  if (!winner) throw new Error("Unable to derive an accessible fill");
  return { ...winner, adjusted: true };
}

function rolePair(roles, foreground, background, minimum) {
  const ratio = contrast(roles[foreground], roles[background]);
  return { foreground, background, ratio: Number(ratio.toFixed(2)), minimum, pass: ratio >= minimum };
}

function chooseAccentHue(keyHue, harmony, character) {
  const offsets = {
    tonal: [0, 24, -24],
    adjacent: [42, -42, 68, -68],
    contrast: [145, -145, 180, 118, -118],
    auto: character === "calm" ? [42, -42, 68, -68] : character === "deep" ? [-72, 72, 132, -132] : [118, -118, 148, -148, 42],
  }[harmony];
  const candidates = offsets.map((offset, index) => {
    const hue = wrapHue(keyHue + offset);
    const semanticDistance = Math.min(...Object.values(STATUS_HUES).map((statusHue) => hueDistance(hue, statusHue)));
    const keyDistance = hueDistance(hue, keyHue);
    const separationTarget = harmony === "tonal" ? 12 : harmony === "adjacent" ? 46 : 130;
    const score = semanticDistance * 0.75 - Math.abs(keyDistance - separationTarget) * 0.3 - index * 0.5;
    return { hue, offset, score, semanticDistance };
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function surfaceColor(lightness, hue, chroma) {
  return oklchToHex({ l: lightness, c: chroma, h: hue });
}

function makeRamp(hue, chroma) {
  return Object.fromEntries(RAMP_LIGHTNESS.map((lightness, index) => {
    const centerWeight = 0.62 + 0.38 * (1 - Math.abs(lightness - 0.56) / 0.5);
    return [RAMP_KEYS[index], oklchToHex({ l: lightness, c: chroma * clamp(centerWeight, 0.5, 1), h: hue })];
  }));
}

function tokenCss(result) {
  const declarations = Object.entries(result.roles)
    .map(([role, value]) => `  --ss-${role.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}: ${value};`)
    .join("\n");
  const ramps = Object.entries(result.ramps)
    .flatMap(([name, ramp]) => Object.entries(ramp)
      .map(([step, value]) => `  --ss-${name}-${step}: ${value};`))
    .join("\n");
  return `:root {\n${declarations}\n${ramps}\n}`;
}

export function generatePalette(options = {}) {
  const keyColor = normalizeHex(options.keyColor || "#276B5E");
  const mode = option(options.mode, "light", ["light", "dark"], "mode");
  const character = option(options.character, "balanced", Object.keys(CHARACTER), "character");
  const harmony = option(options.harmony, "auto", ["auto", "tonal", "adjacent", "contrast"], "harmony");
  const temperature = option(options.temperature, "neutral", Object.keys(TEMPERATURE_HUE), "temperature");
  const config = CHARACTER[character];
  const key = hexToOklch(keyColor);
  const keyHue = key.c < 0.025 ? 250 : key.h;
  const neutralHue = TEMPERATURE_HUE[temperature] ?? keyHue;
  const neutralChroma = temperature === "neutral" ? Math.min(config.surface, Math.max(0.004, key.c * 0.08)) : config.surface;
  const darkInk = surfaceColor(mode === "dark" ? 0.10 : 0.15, neutralHue, neutralChroma * 0.55);
  const lightPaper = surfaceColor(mode === "dark" ? 0.96 : 0.99, neutralHue, neutralChroma * 0.42);

  const primaryChroma = clamp(Math.max(key.c, 0.095) * config.chroma, 0.075, character === "vivid" ? 0.25 : 0.19);
  const primary = accessibleFill({ l: mode === "dark" ? config.primaryDark : config.primaryLight, c: primaryChroma, h: keyHue }, darkInk, lightPaper);
  const accentChoice = chooseAccentHue(keyHue, harmony, character);
  const accentChroma = clamp(Math.max(primary.color.c * config.accent, 0.085), 0.075, character === "vivid" ? 0.22 : 0.17);
  const accent = accessibleFill({ l: mode === "dark" ? 0.79 : 0.48, c: accentChroma, h: accentChoice.hue }, darkInk, lightPaper);

  const levels = mode === "dark"
    ? { background: 0.105, surface: 0.155, chrome: 0.215, muted: 0.72, border: 0.34 }
    : { background: 0.965, surface: 0.992, chrome: 0.91, muted: 0.43, border: 0.79 };
  const background = surfaceColor(levels.background, neutralHue, neutralChroma);
  const surface = surfaceColor(levels.surface, neutralHue, neutralChroma * 0.55);
  const chrome = surfaceColor(levels.chrome, neutralHue, neutralChroma * 1.25);
  const foreground = mode === "dark" ? lightPaper : darkInk;
  const mutedForegroundCandidate = surfaceColor(levels.muted, neutralHue, neutralChroma * 0.7);
  const mutedForeground = contrast(mutedForegroundCandidate, background) >= 4.5
    ? mutedForegroundCandidate
    : readableForeground(background, darkInk, lightPaper, 4.5).hex;
  const chromeForeground = readableForeground(chrome, darkInk, lightPaper, 4.5).hex;

  const status = Object.fromEntries(Object.entries(STATUS_HUES).map(([role, hue]) => {
    const chroma = role === "warning" ? 0.12 : 0.14;
    return [role, accessibleFill({ l: mode === "dark" ? 0.78 : 0.44, c: chroma, h: hue }, darkInk, lightPaper)];
  }));

  const focusCandidates = [accent.hex, primary.hex, surfaceColor(mode === "dark" ? 0.82 : 0.48, 250, 0.16)];
  const focus = focusCandidates
    .map((hex) => ({ hex, score: Math.min(contrast(hex, background), contrast(hex, surface)) }))
    .sort((a, b) => b.score - a.score)[0].hex;

  const roles = {
    background,
    surface,
    chrome,
    foreground,
    mutedForeground,
    chromeForeground,
    border: surfaceColor(levels.border, neutralHue, neutralChroma * 1.4),
    primary: primary.hex,
    primaryForeground: primary.foreground,
    accent: accent.hex,
    accentForeground: accent.foreground,
    focus,
    success: status.success.hex,
    successForeground: status.success.foreground,
    warning: status.warning.hex,
    warningForeground: status.warning.foreground,
    danger: status.danger.hex,
    dangerForeground: status.danger.foreground,
  };

  const contrastChecks = [
    rolePair(roles, "foreground", "background", 4.5),
    rolePair(roles, "mutedForeground", "background", 4.5),
    rolePair(roles, "foreground", "surface", 4.5),
    rolePair(roles, "chromeForeground", "chrome", 4.5),
    rolePair(roles, "primaryForeground", "primary", 4.5),
    rolePair(roles, "accentForeground", "accent", 4.5),
    rolePair(roles, "successForeground", "success", 4.5),
    rolePair(roles, "warningForeground", "warning", 4.5),
    rolePair(roles, "dangerForeground", "danger", 4.5),
    rolePair(roles, "focus", "background", 3),
    rolePair(roles, "focus", "surface", 3),
  ];

  const result = {
    schemaVersion: 1,
    generator: { name: "StyleSeed Palette Engine", version: VERSION, colorSpace: "OKLCH", targetGamut: "sRGB" },
    input: { keyColor, mode, character, harmony, temperature },
    normalizedKey: {
      hex: keyColor,
      oklch: { l: Number(key.l.toFixed(4)), c: Number(key.c.toFixed(4)), h: Number(keyHue.toFixed(2)) },
    },
    decisions: {
      character: `${config.label} character controls lightness/chroma before hue harmony.`,
      accent: { hue: Number(accentChoice.hue.toFixed(2)), offset: accentChoice.offset, method: harmony, avoidsStatusCollisionBy: Number(accentChoice.semanticDistance.toFixed(2)) },
      primaryAdjustedForContrast: primary.adjusted,
      accentAdjustedForContrast: accent.adjusted,
      allocation: { dominant: "60% canvas and surfaces", secondary: "30% chrome, type, and supporting structure", accent: "10% primary/accent emphasis combined" },
    },
    ramps: { primary: makeRamp(keyHue, primaryChroma), accent: makeRamp(accentChoice.hue, accentChroma) },
    roles,
    contrast: contrastChecks,
    valid: contrastChecks.every((item) => item.pass),
    assetBrief: {
      anchors: [background, primary.hex, accent.hex],
      hierarchy: "background dominant; primary identifies the product/action; accent is rare supporting emphasis",
      avoid: ["equal-area competing accents", "rainbow category decoration", "text baked into generated imagery"],
    },
    reasoning: [
      "Character is chosen before harmony: lightness and chroma drive perceived calm or intensity more reliably than hue geometry alone.",
      "The key hue is preserved while chroma is reduced to the sRGB gamut boundary instead of clipping RGB channels.",
      `The ${harmony} accent candidate is scored for separation from the key and reserved success, warning, and danger hues.`,
      "Reference colors are mapped through semantic roles; components should never consume raw ramp values directly.",
      "Every text, action, status, and focus pair is checked after generation; failing fills are moved in lightness while preserving hue identity.",
    ],
  };
  return { ...result, css: tokenCss(result) };
}

export { contrast, hexToOklch, normalizeHex, oklchToHex, tokenCss as generatePaletteCss };
