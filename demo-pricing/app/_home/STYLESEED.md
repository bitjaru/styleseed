# Landing brand study

Scope: `/` only. User requested a more distinctive S mark and a brighter, fashionable
palette on 2026-11-10. This supersedes the handoff's teal constraint for the landing.
Global project branding and historical evidence are unchanged pending review.

- Key color: #0057FF
- Palette character: vivid
- Palette mode: light
- Palette harmony: contrast
- Surface temperature: neutral
- Typeface: Inter
- Treatment: monochrome page and specimen stages, white component objects,
  blue actions and selections, citrus annotations and completion feedback.
  Status surface colors retain generated status hues with a lighter OKLCH fill.
  No ambient animation.

`generate-brand-palette.mjs` uses the canonical StyleSeed color generator, then
maps accent ramp 100 to the landing's `highlight` surface and checks its text pair.
Run it with Node to regenerate `brand-palette.json`. The page and interactive
palette specimen consume that same JSON; no hex values belong in the components.

The S uses two upright modules on a compact ink tile. Citrus belongs inside the
mark. Hover and keyboard focus separate the modules slightly; reduced motion
removes the transition. This revision follows the user-authorized Fable critique.

Typography demonstrates real 40/24/14px hierarchy. The spacing specimen changes
the actual component gap. Recorded report gaps are diagrammed at a labeled 4×
scale. Five core rules stay visible; further rules use native disclosure.
