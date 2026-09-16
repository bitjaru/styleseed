---
name: ss-review
description: Review UI code for design system compliance, accessibility, and best practices
argument-hint: "[file-path]"
allowed-tools: Read, Grep, Glob
---

# UI Design Review
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

If either registry file exists, require both files and valid artifact configuration. Use only
the selected artifact's bundle and manifest; an incomplete registry is not a legacy project.
Only when neither registry file exists, read `.styleseed/effective-rules.md` and
`.styleseed/manifest.json`. If the selected bundle is missing or stale, report the missing
evidence; do not regenerate it during a review-only request or claim verified compliance.
Review task fitness and grammar coherence before framework conventions. For non-web artifacts,
replace React/Tailwind-only checks with the active adapter's render/export checks.

## Review scope

Review and recommend; do not edit implementation or project configuration. A request to fix
findings authorizes a separate implementation step with the appropriate editing tools, not an
expansion of this read-only skill. Honor a narrower user request. Cite the selected contract for
each violation; distinguish core failures, contract drift, optional suggestions, and missing
evidence. Library conventions below apply only when the project uses those conventions.

## When NOT to use

- For accessibility-only issues → use `/ss-a11y`
- For Nielsen UX heuristics → use `/ss-audit`
- For a quick automated check → use `/ss-lint`
- For non-UI code (data fetching, business rules)

Review the file: **$ARGUMENTS**

## Checklist

### 1. Design Token and Recipe Compliance
- [ ] No hardcoded hex colors (use semantic tokens: `text-foreground`, `bg-brand`, etc.)
- [ ] No hardcoded px spacing in Tailwind (use `p-6` not `p-[24px]`)
- [ ] Pattern geometry/elevation uses the selected recipe or explicit semantic variables
- [ ] No hardcoded universal `rounded-2xl + shadow + mx-6` language across unrelated recipes

### 2. Component Conventions
- [ ] Uses `data-slot` attribute
- [ ] Uses `cn()` for className merging
- [ ] Props typed with `React.ComponentProps<>`
- [ ] Supports `className` prop override
- [ ] Named export (not default export for components)
- [ ] No wrapper components that only add a className

### 3. Accessibility (a11y)
- [ ] Touch targets >= 44x44px on touch surfaces; pointer-first desktop controls may be
      36–40px when the adapter and approved component contract support them
- [ ] `focus-visible` styles on all interactive elements
- [ ] Proper `aria-*` attributes where needed
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Images have `alt` text
- [ ] Form inputs have associated labels

### 4. Surface Best Practices
- [ ] No horizontal overflow
- [ ] Touch-friendly spacing between interactive elements
- [ ] Mobile safe area insets handled when the adapter requires them
- [ ] Desktop density/type and non-web canvas/export rules follow the selected adapter
- [ ] Text remains readable at the adapter's viewing distance and supported zoom
- [ ] Scrollable containers have `-webkit-overflow-scrolling: touch`

### 5. Performance
- [ ] No unnecessary re-renders (stable references, memoization where needed)
- [ ] Images are lazy-loaded
- [ ] Heavy components are code-split

### 6. Typography
- [ ] Uses the locked type family and recipe-fit type roles
- [ ] Size, weight, leading, and tracking follow the compiled type roles and approved tokens
- [ ] Display, heading, body, and caption roles remain distinct at the target surface size
- [ ] Language, script, wrapping, and zoom do not cause clipping or impair reading
- [ ] Handbook type examples are defaults, not grounds to replace an approved type scale

### 7. Spacing Consistency
- [ ] Spacing uses one maintained token scale and the selected recipe's major rhythm
- [ ] Off-scale values have an optical, canvas, or platform reason
- [ ] Uses `size-*` shorthand instead of `w-* h-*`
- [ ] Uses `ms-*/me-*` instead of `ml-*/mr-*` (logical properties)
- [ ] Motion transitions use design tokens (`duration-[var(--duration-fast)]`)

### 8. Coherence (VISUAL-CRAFT.md §C0 — the "one choice per axis" laws)
> The biggest reason a UI reads as "AI-generated" isn't ugly parts — it's *mixed*
> parts. Check for one deliberate system of roles, not identical values on every component.
- [ ] **Recipe-bound radius scale** — surfaces, controls, compact choices, and nested elements
      follow their approved roles. For example, `calm-consumer` permits 12–20px outer surfaces
      and pill controls for true compact choices. Flag unexplained drift, not that valid pairing.
- [ ] **One identifiable primary action** plus only the selected grammar's stable semantic,
      categorical, or brand roles — no competing decorative emphasis hues.
- [ ] **No emoji as UI icons** (🚗🧺⭐ as list/nav/status/category markers) — they inject many uncontrolled hues; use one line-icon set in `currentColor`.
- [ ] **Status and category colors have stable roles** under the selected grammar and palette;
      severity remains distinguishable, and a normal state does not compete with urgent states
- [ ] **No uncontracted decorative hues** — additional colors need a documented semantic,
      categorical, editorial, or brand role
- [ ] **One shadow language** — same light direction, same scale/tint; not some black + some tinted, some up-lit + some down-lit.
- [ ] **One icon family / fill mode / stroke weight** across the file.
- [ ] **Nested contours** — use the recipe's nested-radius relationship; for concentric rounded
      rectangles, `max(0, outer − padding)` is a useful default, not a rule for every shape
- [ ] **Consistent control heights** — buttons, inputs, selects share a height set (e.g. 40px).
- [ ] Errors/states never rely on color alone (icon + text too).

## Output Format

Provide:
1. **Score**: Pass / Needs Improvement / Fail
2. **Issues**: List each violation with file:line reference
3. **Fixes**: Concrete code changes for each issue
