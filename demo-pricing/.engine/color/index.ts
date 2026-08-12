import palettes from "./palettes.json";

export * from "./generator.mjs";

export type PaletteRecipe = (typeof palettes)[number];
export type PaletteRecipeId = PaletteRecipe["id"];

export const PALETTE_RECIPES = palettes;

export const PALETTE_BY_ID = Object.fromEntries(
  palettes.map((palette) => [palette.id, palette]),
) as Record<PaletteRecipeId, PaletteRecipe>;
