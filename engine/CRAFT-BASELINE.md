# StyleSeed Compact Craft Baseline

This is the small, task-independent craft layer used by the Context Compiler. It preserves
the highest-leverage rules without injecting the full design handbook into every agent turn.
The selected output grammar, adapter, domain, page type, brand recipe, profile, and project lock narrow these
defaults. `PRODUCT-PRINCIPLES.md` remains the higher authority.

## Coherence

- Choose one coordinated family for radius, elevation, borders, icon style, typography, motion,
  control heights, and interaction states. Encode each family as semantic tokens and reuse it.
- A coherent system may contain multiple component shapes and colors, but every variation must
  have a repeated role. Local decoration is not a role.
- Preserve strengths and already-set project decisions. Do not restyle unrelated surfaces while
  fixing one screen.

## Hierarchy and composition

- Give every screen one dominant user decision or reading promise. Supporting content must recede
  through scale, position, contrast, density, or disclosure—not random color.
- Proximity communicates grouping: space around a group should normally be at least twice the
  space within it. Repeated sections need deliberate variation in height, density, or composition.
- Use real product content and evidence. Placeholder dashboards, fake metrics, stock chat panels,
  and equal card walls make otherwise clean work look generic.
- Keep prose near 50–75 characters per line. Let data surfaces use width, but bound any reading
  column inside them.

## Spacing and type

- Start from `{4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96}` and use off-scale values only for a
  documented optical correction.
- Default body text to 16px on general surfaces. Dense desktop UI may use 13–14px for metadata,
  table chrome, timestamps, or identifiers; decisions and explanatory copy stay readable.
- Use no more than two type families and one intentional weight ramp. Use tabular numerals for
  money, tables, timers, and comparable metrics.
- Tighten leading as type grows: body about 1.5, headings 1.2–1.35, display 1.0–1.2.

## Components and interaction

- Use the lightest separation that works: whitespace, then tone, then hairline, then shadow.
  Do not combine a visible border and floating shadow without a functional reason.
- Buttons, inputs, and selects in one context share a height. Touch surfaces provide at least
  44px targets; pointer-first dense desktop controls may be smaller when still operable.
- Labels remain visible. Errors name the problem and recovery and never rely on color alone.
- Use one icon family, fill mode, and stroke family. Do not use emoji as application chrome.
- Loading, empty, error, success, disabled, and permission states preserve layout and provide a
  useful next action where the surface owns data or mutation.

## Color, accessibility, and motion

- Use semantic tokens. Keep one identifiable primary action while allowing stable semantic,
  categorical, or brand roles required by the selected grammar.
- Body text targets WCAG AA contrast; large text and meaningful graphics meet their applicable
  threshold. Focus is visible, controls have names, and keyboard order follows visual order.
- Motion uses one duration/easing family, communicates state or sequence, and never delays the
  first read or an action. Provide a complete reduced-motion result.
- Inspect the real render at the target viewport. Source review cannot certify optical balance,
  font loading, crop, responsive transformation, or visual states.
