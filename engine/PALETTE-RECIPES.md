# StyleSeed Palette Recipes

A palette recipe is a semantic color relationship for one product posture. It is not a list of
fashionable hex values. It defines how the content canvas, navigation chrome, surfaces, text,
actions, focus, status, and generated media work together.

```text
brand recipe   = morphology and component selection
palette recipe = semantic color roles and surface relationships
skin           = project implementation of color + type tokens
```

Studio recommends one palette recipe per creative direction. The recipe is a maintained product
posture, not a closed swatch list. When a project supplies a key color, the Palette Engine keeps
that posture but recompiles its ramps and semantic roles from the key.

```text
key color + light/dark environment
→ OKLCH normalization + sRGB gamut mapping
→ perceptual character (calm / balanced / vivid / deep)
→ companion candidate scoring
→ primitive ramps
→ semantic role graph
→ WCAG text/action/focus correction
→ JSON + CSS + generated-media anchors
```

## Generation model

Use `engine/color/generate-palette.mjs` directly, `$ss-tokens generate color`, or persist the
same inputs in `STYLESEED.md` and run `$ss-resolve`:

```bash
node engine/color/generate-palette.mjs \
  --key-color "#5B5BD6" \
  --mode light \
  --character calm \
  --harmony auto \
  --temperature cool \
  --out .styleseed/palette.json
```

- **Character precedes harmony.** Lightness and chroma determine calm, intensity, depth, and
  legibility more reliably than complementary or triadic hue geometry alone.
- **Key hue is preserved.** Out-of-gamut colors reduce chroma at fixed lightness and hue instead
  of clipping RGB channels and shifting identity.
- **Companions are scored.** Candidate hues are evaluated for distance from the key and reserved
  success, warning, and danger families. `auto` changes its search envelope by character.
- **Roles are derived.** Reference ramps feed stable semantic tokens; components never consume
  arbitrary swatches directly.
- **Contrast corrects the result.** Text/fill and focus pairs are checked after role mapping. A
  failing fill moves in lightness while retaining its hue identity.
- **Allocation stays bounded.** Canvas and surfaces dominate, structural color supports, and
  primary plus companion emphasis stays near ten percent of the rendered field.

The deterministic output records inputs, normalized OKLCH, chosen accent logic, ramps, semantic
roles, contrast evidence, generated-media anchors, and CSS variables. The eight built-ins remain
tested defaults and useful fallbacks for projects without a real key color.

## Evidence and method

- [Material 3 color roles](https://m3.material.io/styles/color/roles) separates color values from
  their UI roles.
- [Carbon color](https://carbondesignsystem.com/elements/color/overview/) uses neutral layering,
  role-based tokens, interaction states, and distinct light/dark layer logic.
- [Adobe Spectrum color](https://spectrum.adobe.com/page/color-system/) treats semantic meaning as
  a system and requires a text or icon cue alongside color.
- [GitHub Primer color primitives](https://primer.style/product/primitives/color/) demonstrates
  theme-specific values behind stable product primitives.
- [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  requires 4.5:1 for normal text and 3:1 for large text; StyleSeed validates its normal-text pairs
  at 4.5:1 and focus against the canvas at 3:1.

The built-in values are starting points, not claims about a company palette or a forecast of a
color trend. “Current” styling comes from surface relationships, controlled contrast moments,
image material, and product-specific usage—not from copying an annual color.

### 2026 signal scan

The recipe set also checks current visual signals without turning them into UI law:

- [WGSN + Coloro's 2026 forecast](https://www.wgsn.com/de/node/2129) highlights restorative
  deep teal; `quiet-mineral` uses a restrained blue-green action family against warm neutrals.
- [WGSN + Coloro S/S 26](https://www.wgsn.com/cs/node/1955) spans urgent brights, earthy/offbeat
  naturals, and calming tinted tones. StyleSeed distributes those postures across separate
  recipes instead of mixing them into one rainbow interface.
- [Adobe's 2026 Creative Trends](https://blog.adobe.com/en/publish/2026/01/08/how-creators-leveraging-adobe-2026-creative-trends)
  points toward tactile, emotionally legible, locally specific imagery with functional value.
  Those signals shape each recipe's generated-media anchors and avoid list, not essential UI text.

Trend evidence can influence an expressive anchor or image brief. It never overrides semantic
roles, product hierarchy, contrast, or the selected grammar.

## Required semantic roles

Every palette in `engine/color/palettes.json` supplies:

- `background`, `surface`, `chrome`;
- `foreground`, `mutedForeground`, `chromeForeground`;
- `border`, `primary`, `primaryForeground`, `accent`, `accentForeground`, `focus`;
- `success`, `successForeground`, `warning`, `warningForeground`, `danger`, `dangerForeground`.

Required checks:

- foreground and muted foreground on background;
- foreground on surface;
- chrome foreground on navigation chrome;
- foreground pairs for primary, accent, success, warning, and danger;
- focus against background and surface;
- no semantic status communicated by color alone.

## Built-in recipes

| ID | Posture | Typical use |
|---|---|---|
| `quiet-mineral` | warm neutral, restrained green | calm consumer, health, benefits, personal utility |
| `deep-lime-studio` | dark canvas, high-energy lime | creative tools, focused work, launch prototype |
| `cobalt-instrument` | cool technical neutral, cobalt action | developer tools, data, operations |
| `warm-clay-commerce` | warm paper, burnt-orange action | commerce, hospitality, service brands |
| `civic-blue` | explicit blue shell, sober neutral canvas | public services, regulated workflows |
| `editorial-ink` | paper, ink, controlled red | editorial, research, reports |
| `signal-coral` | pale warm canvas, coral signal | expressive launches and social products |
| `nocturne-violet` | deep violet layers, mint secondary | media, AI, experimental professional tools |

## Recommendation contract

For each direction state:

1. palette recipe ID and product reason;
2. navigation chrome ↔ content canvas relationship;
3. primary/action usage and maximum visual share;
4. semantic status mapping and non-color cue;
5. generated-image anchor colors and colors to avoid;
6. contrast validation result and any project override requiring revalidation.

Do not recommend a palette from mood words or hue-wheel geometry alone. Use the product job,
brand posture, perceptual character, content density, light/dark environment, image/data role,
and selected brand recipe. If a key color exists, generate and inspect the actual role system.
