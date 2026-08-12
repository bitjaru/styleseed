export type PaletteMode = "light" | "dark";
export type PaletteCharacter = "calm" | "balanced" | "vivid" | "deep";
export type PaletteHarmony = "auto" | "tonal" | "adjacent" | "contrast";
export type PaletteTemperature = "neutral" | "warm" | "cool";

export type PaletteGenerationOptions = {
  keyColor?: string;
  mode?: PaletteMode;
  character?: PaletteCharacter;
  harmony?: PaletteHarmony;
  temperature?: PaletteTemperature;
};

export type GeneratedPalette = {
  schemaVersion: number;
  generator: { name: string; version: string; colorSpace: string; targetGamut: string };
  input: Required<PaletteGenerationOptions>;
  normalizedKey: { hex: string; oklch: { l: number; c: number; h: number } };
  decisions: {
    character: string;
    accent: { hue: number; offset: number; method: PaletteHarmony; avoidsStatusCollisionBy: number };
    primaryAdjustedForContrast: boolean;
    accentAdjustedForContrast: boolean;
    allocation: { dominant: string; secondary: string; accent: string };
  };
  ramps: { primary: Record<string, string>; accent: Record<string, string> };
  roles: Record<string, string>;
  contrast: Array<{ foreground: string; background: string; ratio: number; minimum: number; pass: boolean }>;
  valid: boolean;
  assetBrief: { anchors: string[]; hierarchy: string; avoid: string[] };
  reasoning: string[];
  css: string;
};

export function generatePalette(options?: PaletteGenerationOptions): GeneratedPalette;
export function contrast(a: string, b: string): number;
export function hexToOklch(hex: string): { l: number; c: number; h: number };
export function normalizeHex(hex: string): string;
export function oklchToHex(color: { l: number; c: number; h: number }): string;
export function generatePaletteCss(result: GeneratedPalette): string;
