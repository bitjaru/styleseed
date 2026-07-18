# StyleSeed Surface Adapters

StyleSeed's method is renderer-independent. A surface adapter translates the composed design
rules into the physical constraints and verification workflow of a concrete output.

```text
StyleSeed decides: judgment · grammar · hierarchy · visual language · bounded tokens
Adapter decides: canvas · safe zones · renderer · asset rules · export · surface-specific QA
```

## Adapter contract

Every adapter declares:

- `id`, artifact type, renderer or companion skill;
- canvas/viewport, responsive or crop variants, safe zones, and reading distance;
- supported primitives and asset/font constraints;
- how StyleSeed semantic tokens are injected;
- artifact-specific states or sequence rules;
- render/export command and output manifest;
- pixel verification procedure and accessibility/export checks.

The active adapter is recorded in `STYLESEED.md`. Adapter constraints may narrow a grammar;
they cannot override core judgment.

## Built-in adapter profiles

| Adapter | Outputs | Typical renderer/companion |
|---|---|---|
| `product-ui` | web apps, mobile apps, dashboards, forms | project framework, browser renderer |
| `social-carousel` | Instagram carousels, visual explainers | `carousel-build` skill / PIL pipeline |
| `slide-deck` | presentations, pitches, teaching decks | presentation skill or native slide renderer |
| `document-report` | PDF, DOCX, long-form reports | document/PDF renderer |
| `single-frame` | posters, covers, social cards, thumbnails | image/SVG/canvas renderer |

## `social-carousel` integration

Use `sequential-story` unless another grammar clearly owns the content. The installed Claude
`carousel-build` skill is the canonical companion when available:

1. StyleSeed reads or compiles the grammar and writes brand/type/motion/content rules to
   `STYLESEED.md`.
2. `carousel-build` reads that lock, then applies deterministic engineering constraints:
   3:4 `1080×1440`, platform safe zones, crop behavior, 8px rhythm, type scale, gradient
   banding prevention, available font weights, and reproducible PIL rendering.
3. Copy and publishing skills may add their own contracts without altering visual authority.
4. `/ss-score` checks sequence coherence and grammar fit; `/ss-verify` opens every exported
   frame and checks crop, safe zone, typography, rhythm, false text, and continuity.

Recommended lock additions:

```markdown
- Surface adapter: social-carousel
- Artifact type: information-carousel
- Canvas: 1080x1440
- Sequence grammar: hook → why → evidence → action → reframe → CTA
- Renderer: carousel-build
- Safe zone contract: adapter:ADAPTERS.md#social-carousel-integration
```

Do not duplicate the renderer's rapidly changing platform measurements inside a visual grammar.
The adapter/companion owns them; StyleSeed owns the visual judgment applied within them.

## Adding adapters

Add an adapter when the same StyleSeed method can be expressed through a new deterministic
renderer. Test at least one built-in and one reference-compiled grammar on the surface, document
failure modes, and prove the exported artifact can be visually inspected.
