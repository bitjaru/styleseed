---
name: ss-review
description: Review UI code for design system compliance, accessibility, and best practices
argument-hint: [file-path]
allowed-tools: Read, Grep, Glob
---

# UI Design Review

Review the file: **$ARGUMENTS**

## Checklist

### 1. Design Token Compliance
- [ ] No hardcoded hex colors (use semantic tokens: `text-foreground`, `bg-brand`, etc.)
- [ ] No hardcoded px spacing in Tailwind (use `p-6` not `p-[24px]`)
- [ ] Shadows use CSS variables (`shadow-[var(--shadow-card)]`)
- [ ] Border radius follows the scale (`rounded-md`, `rounded-lg`, `rounded-2xl`)

### 2. Component Conventions
- [ ] Uses `data-slot` attribute
- [ ] Uses `cn()` for className merging
- [ ] Props typed with `React.ComponentProps<>`
- [ ] Supports `className` prop override
- [ ] Named export (not default export for components)
- [ ] No wrapper components that only add a className

### 3. Accessibility (a11y)
- [ ] Touch targets >= 44x44px for interactive elements
- [ ] `focus-visible` styles on all interactive elements
- [ ] Proper `aria-*` attributes where needed
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Images have `alt` text
- [ ] Form inputs have associated labels

### 4. Mobile Best Practices
- [ ] No horizontal overflow
- [ ] Touch-friendly spacing between interactive elements
- [ ] Safe area insets handled for notched devices
- [ ] Text sizes >= 12px for readability
- [ ] Scrollable containers have `-webkit-overflow-scrolling: touch`

### 5. Performance
- [ ] No unnecessary re-renders (stable references, memoization where needed)
- [ ] Images are lazy-loaded
- [ ] Heavy components are code-split

### 6. Typography
- [ ] Uses the Pretendard/Inter font stack
- [ ] Font sizes from the 14-step scale (10-48px, see CLAUDE.md)
- [ ] Proper font weights (400, 500, 600, 700)
- [ ] Display text (36-48px): `leading-none` + `tracking-[-0.02em]`
- [ ] Heading text (18-24px): `leading-snug` + `tracking-[-0.01em]`
- [ ] Body text (14-17px): `leading-normal` (no custom tracking)
- [ ] Caption uppercase (10-13px): `tracking-[0.05em]` or `tracking-wide`
- [ ] No `line-height: 1.5` on display/heading text (too loose)

### 7. Spacing Consistency
- [ ] All spacing values are multiples of 6px (p-1.5, p-3, p-6, etc.)
- [ ] No arbitrary spacing (p-5=20px, gap-3.5=14px are violations)
- [ ] Uses `size-*` shorthand instead of `w-* h-*`
- [ ] Uses `ms-*/me-*` instead of `ml-*/mr-*` (logical properties)
- [ ] Motion transitions use design tokens (`duration-[var(--duration-fast)]`)

## Output Format

Provide:
1. **Score**: Pass / Needs Improvement / Fail
2. **Issues**: List each violation with file:line reference
3. **Fixes**: Concrete code changes for each issue
