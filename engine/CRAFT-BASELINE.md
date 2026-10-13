# StyleSeed Compact Craft Baseline

This is the small, task-independent craft layer used by the Context Compiler. It preserves
the highest-leverage rules without injecting the full design handbook into every agent turn.
The selected output grammar, adapter, domain, page type, brand recipe, profile, and project lock narrow these
defaults. `PRODUCT-PRINCIPLES.md` remains the higher authority.

## Coherence

- Choose one coordinated family for radius, elevation, borders, icon style, typography, motion,
  control heights, and interaction states. Encode each family as semantic tokens and reuse it.
- A coherent system may contain multiple component shapes and colors, but every variation must
  have a repeatable purpose: functional, semantic, editorial, or brand expression.
  Unexplained local variation is not a role.
- Preserve strengths and already-set project decisions. Do not restyle unrelated surfaces while
  fixing one screen.

## Hierarchy and composition

- Follow the task's attention model: a primary decision, reading promise, or coordinated
  comparison regions. Scale, position, contrast, imagery, density, and disclosure are options;
  no universal hero, brightest CTA, section count, or chart quota is required.
- Proximity communicates grouping: distinguish space around groups from space within them;
  no fixed ratio fits every density or containment model. Vary narrative sections purposefully;
  keep functional rows and comparison
  regions consistent when repetition helps the task. Equivalent information keeps equivalent
  presentation; vary by priority, data question, or narrative role, not for novelty.
- Use real product content and evidence. Placeholder dashboards, fake metrics, stock chat panels,
  and decorative card walls obscure the task. Use data encodings that preserve meaning;
  deltas need real baselines and sparklines need actual series. Attach interpretation context
  (labels, units, period, reference) nearby or in an unambiguous shared scope.
- Start Latin prose near 50–75 characters per line; inspect the actual language, font, and zoom.
  CSS `ch` is a glyph-width unit, not actual character count. Let data regions use needed width.
- Media should show the relevant subject or evidence. Record its role, crop, text-safe area,
  and fallback where needed; a task that needs no image should not receive decorative filler.

## Spacing and type

- Reuse the approved spacing scale. Without one, start from `{4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96}`.
  Document optical, script, canvas, or platform reasons for adjustments; preserve grouping.
- Default body text to 16px on general surfaces; an approved productive desktop scale may use
  14px body. Smaller metadata and identifiers still need readable measure, contrast, and zoom.
- Coordinate type roles and weights; one or two families are economical defaults, not a cap on
  script fallbacks or approved editorial/code roles. Use tabular figures for numeric comparison.
- Tighten leading as type grows: body about 1.5, headings 1.2–1.35, display 1.0–1.2.

## Components and interaction

- Use the lightest effective separation for the context: alignment, whitespace, tone, hairlines,
  or depth. There is no fixed order. A border and shadow may serve distinct boundary/layer roles.
- Buttons, inputs, and selects in one context share a height. Touch surfaces provide at least
  44px targets; pointer-first dense desktop controls may be smaller when still operable.
- Labels remain visible. Errors name the problem and recovery and never rely on color alone.
- Use coordinated icon roles, optical sizes, and state variants. Do not mix unrelated families.
- Loading, empty, error, success, disabled, and permission states preserve orientation and offer
  applicable recovery. Inapplicable optional sections need not occupy empty slots.
- Reflow by task priority; preserve comparison, controls, and interpretation context at narrow
  widths. A bounded scrollable data region can be valid; unreadable shrinking is not.

## Color, accessibility, and motion

- Use semantic tokens for stable action, status, category, brand, and content roles. Identify
  the next action within each decision region; a popover and its page may have distinct actions.
  Judge conflicting meanings, not hue count, warm paper, serif type, or hard black by themselves.
- Body text targets WCAG AA contrast; large text and meaningful graphics meet their applicable
  threshold. Focus is visible, controls have names, and keyboard order follows visual order.
- Motion uses one duration/easing family, communicates state or sequence, and never delays the
  first read or an action. Provide a complete reduced-motion result.
- Inspect the real render at the target viewport. Source review cannot certify optical balance,
  font loading, crop, responsive transformation, or visual states.
