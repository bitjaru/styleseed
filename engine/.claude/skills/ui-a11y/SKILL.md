---
name: ui-a11y
description: Audit a component or page for accessibility issues and fix them
argument-hint: [file-path]
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Accessibility Audit

Target: **$ARGUMENTS**

## Audit Criteria

### WCAG 2.2 AA Compliance

#### 1. Perceivable
- **Color contrast**: Text must meet 4.5:1 (normal) or 3:1 (large/bold text)
  - Check `text-muted-foreground` (#717182) on `bg-background` (#FFFFFF) = 4.6:1 (passes)
  - Check `text-brand` (#721FE5) on white = 4.8:1 (passes)
  - Flag any custom colors that don't meet ratio
- **Non-text contrast**: UI controls/graphics must meet 3:1
- **Text alternatives**: All `<img>` need `alt`, icons need `aria-label` when meaningful
- **Color independence**: Don't convey info by color alone (add icons/text)

#### 2. Operable
- **Touch targets**: Minimum 44x44px (`min-h-11 min-w-11`)
  - Common violation: `h-9` (36px) buttons — should be `h-11`
  - Icon buttons need explicit size: `w-11 h-11`
- **Keyboard navigation**: All interactive elements must be keyboard-accessible
  - Tab order should be logical
  - `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Motion**: Animations must respect `prefers-reduced-motion`
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

#### 3. Understandable
- **Labels**: Form inputs must have visible labels or `aria-label`
- **Error messages**: Form errors must be programmatically associated (`aria-describedby`)
- **Language**: `<html lang="en">` (or appropriate language code for your project)

#### 4. Robust
- **Semantic HTML**: Use appropriate elements (`<button>`, `<nav>`, `<main>`, `<header>`)
- **ARIA**: Use Radix UI components (they handle ARIA automatically)
- **Roles**: Custom interactive elements need proper `role` attributes

## Design System Token Reference

| Token | Hex | Contrast on White |
|-------|-----|-------------------|
| `--foreground` | #030213 | 19.8:1 |
| `--muted-foreground` | #717182 | 4.6:1 |
| `--brand` | #721FE5 | 4.8:1 |
| `--destructive` | #D4183D | 5.2:1 |
| `--success` | #6B9B7A | 3.4:1 (large text only!) |
| `--warning` | #F59E0B | 2.1:1 (FAILS — needs darker variant for text) |

## Output

1. **Issues found**: List with severity (Critical/Major/Minor)
2. **Auto-fixes**: Apply fixes directly where possible
3. **Manual review needed**: Flag items that need human judgment
