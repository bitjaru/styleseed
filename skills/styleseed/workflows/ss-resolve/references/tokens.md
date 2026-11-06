# Bring your own tokens: the project's token file as the canon

A team with an existing design system hands StyleSeed its token file. The resolver reads it, maps
StyleSeed's semantic roles onto the imported tokens, measures them, and compiles the result into the
bundle. It does not generate a palette, adjust a value, or substitute a preset for anything the file
lacks. Presets and the key-colour generator remain the path for a project that has no system yet.

## Configure

`.styleseed/project.json` accepts an optional top-level `tokens` block next to `brand`:

```json
"tokens": {
  "source": "design/tokens.json",
  "format": "dtcg",
  "modes": { "light": "Light", "dark": "Dark" },
  "roles": { "accent": "semantic.bg.accent.base", "accentForeground": "semantic.fg.inverse" }
}
```

| Field | Meaning |
|---|---|
| `source` | Project-relative `.json` file. It becomes a manifest input, so editing it is method drift that `--check` reports. |
| `format` | `dtcg` (Format Module 2025.10, hex-string drafts accepted), `tokens-studio` (plugin export, one JSON with token sets, `$themes`, `$metadata`), or `figma-variables` (REST local-variables payload: `variables` + `variableCollections`, with or without the `meta` wrapper). |
| `modes` | Which Figma mode or Tokens Studio theme each StyleSeed mode reads. `brand.paletteMode` selects the entry. Not allowed for `dtcg`, whose format module has no modes. |
| `roles` | Role → token path overrides. Required for roles the canon default does not cover; allowed for any role. |

`brand.keyColor`, `paletteCharacter`, `paletteHarmony` and `surfaceTemperature` stay in the contract
but do not run the generator while `tokens` is present. `brand.radius` and `brand.elevation` remain
recipe presets; imported dimension and shadow tokens are listed in the bundle and never overridden.

## Role mapping

Files that follow the designer's layering (`research/tokens` in the repository, #96) map without
configuration. Each role has exactly one canon path; a path that is missing from the file is an error
that names the role, never a value StyleSeed picks:

| Role | Canon token | Role | Canon token |
|---|---|---|---|
| background | `semantic.bg.base` | primary | `semantic.bg.brand.base` |
| surface | `semantic.bg.subtle` | primaryForeground | `semantic.fg.inverse` |
| chrome | `semantic.bg.muted` | focus | `semantic.bd.brand.base` |
| foreground | `semantic.fg.base` | success · successForeground | `semantic.bg.success.emphasis` · `semantic.fg.inverse` |
| mutedForeground | `semantic.fg.muted` | warning · warningForeground | `semantic.bg.warning.emphasis` · `semantic.fg.inverse` |
| chromeForeground | `semantic.fg.base` | danger · dangerForeground | `semantic.bg.danger.emphasis` · `semantic.fg.inverse` |
| border | `semantic.bd.base` | accent · accentForeground | no default: map them, or point both at the primary pair |

Paths match exactly, or by a unique suffix when the file prefixes them with a token set or
collection name (`theme.semantic.bg.base`, `Semantic.bg.base`). An ambiguous suffix is an error that
asks for the full path. Every mapped token must resolve to an opaque colour; a translucent value or
a dimension token in a colour role is refused so contrast can be measured.

## What is validated

- **Aliases**: every `{path}` resolves; cycles, dangling targets and type changes across an alias chain are errors.
- **Layering**: when paths use `primitive` / `semantic` / `type` / `component`, the same rules as `scripts/check-token-layers.mjs` apply: literals only in primitives, semantic tokens alias primitives, component tokens alias semantic tokens, semantic colours read `semantic.{fg|bg|bd}[.role].{emphasis}` with `base · subtle · muted · emphasis · inverse`. A file without those layers is imported as-is and the bundle says the layering was not checked.
- **Modes**: a Figma collection with several modes must have the requested one; a Tokens Studio theme must exist in `$themes`.
- **Contrast**: the eleven role pairs the generator guarantees are measured. A failing pair is reported in the palette JSON (`valid: false`) and in the bundle as a blocking accessibility finding for the design-system owner. It is not corrected.

Structural problems stop the resolve before anything is written. Contrast failures compile and are
reported, because the decision belongs to the owner of the system, not to the resolver.

## Outputs

- The bundle's palette section keeps the recipe's posture and semantic restrictions, withholds its
  hex values, and appends `## Imported token canon`: source and hash, layering counts, role → token
  table, contrast gates, type roles, and the counts of imported tokens StyleSeed does not map.
- `.styleseed/palettes/<artifact>.json` has the generator's shape (`roles`, `contrast`, `valid`, `css`)
  with `generator.name = "StyleSeed Token Import"`, plus `mapping` and `tokens`. The drift report and
  other consumers read `roles` unchanged. No ramps are produced.
- `.styleseed/palettes/<artifact>.css` declares `--ss-*` for the mapped roles only, each annotated with
  its token path. Components keep consuming the project's own token names.
- The manifest records the token file as the `tokens` input and folds the `tokens` block and file
  hash into `methodHash`.

## Preview before configuring

```bash
node <installed-ss-resolve>/scripts/import-tokens.mjs --source design/tokens.json --token-format dtcg \
  --role accent=semantic.bg.accent.base --role accentForeground=semantic.fg.inverse
node <installed-ss-resolve>/scripts/import-tokens.mjs --project-root .            # from project.json
```

The preview is read-only. Exit 0 means every role maps and every alias resolves; contrast failures
are listed as warnings. Exit 1 lists the problems to fix.

## Limits

- One file per project. Multi-file DTCG sets and Tokens Studio multi-file exports need a combined file.
- Colour, dimension, number, font family, typography and shadow types are recognised; other types
  pass through with their counts. Radius and elevation are not yet mapped onto the recipe presets.
- Figma exports are the REST local-variables shape. Community plugin exports differ; convert them to
  DTCG first.
- The import validates the file. It does not verify that application code consumes those tokens;
  the deterministic checker (`SS001`) and the rendered checks still do that per artifact.
