export const STYLESEED_RECIPES = [
  "calm-consumer",
  "native-mobile",
  "enterprise-workbench",
  "developer-platform",
  "commerce-operator",
  "public-service",
  "creative-professional",
  "editorial-authority",
  "expressive-brand",
] as const

export type StyleSeedRecipe = (typeof STYLESEED_RECIPES)[number]

export function recipeAttributes(recipe: StyleSeedRecipe) {
  return { "data-styleseed-recipe": recipe } as const
}
