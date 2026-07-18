---
name: ss-lint
description: Quick automated lint — detects common design system violations in seconds
argument-hint: "[file-path or directory]"
allowed-tools: Read, Grep, Glob, Bash
---

# Design Lint (Quick Check)

Read `PRODUCT-PRINCIPLES.md`, the selected output grammar, `ADAPTERS.md`, and `STYLESEED.md`
before classifying a match. Lint detects deterministic drift; it must not flag an exact
grammar/profile/adapter contract as a violation or let an arbitrary lock value create an
exception.

## When NOT to use

- For deeper review of design judgment (composition, hierarchy, rhythm) → use `/ss-review`
- For accessibility specifically → use `/ss-a11y`
- For Nielsen UX heuristics → use `/ss-audit`
- For applying refactors — this only flags violations; use `/ss-review` to fix

Target: **$ARGUMENTS**

## What This Does

Fast, grep-based scan for common design violations. Runs in seconds (unlike /ss-review which is a deep manual audit). Run this after every file change.

## Checks

### 1. Hardcoded Colors
Search for hex colors in className strings that should be semantic tokens:
```bash
grep -n '#[0-9a-fA-F]\{3,8\}' [file] | grep -v 'theme.css\|tokens\|\.json'
```
**Violation:** `text-[#3C3C3C]`, `bg-[#3182F6]`
**Fix:** `text-text-primary`, `bg-brand`

### 2. Raw Pixel Values in Tailwind
```bash
grep -n 'p-\[.*px\]\|m-\[.*px\]\|gap-\[.*px\]' [file]
```
**Violation:** `p-[24px]`, `gap-[12px]`
**Fix:** `p-6`, `gap-3`

### 3. Old Width/Height Syntax
```bash
grep -n 'w-[0-9] h-[0-9]\|w-\[.*\] h-\[' [file]
```
**Violation:** `w-4 h-4`
**Fix:** `size-4`

### 4. Physical Properties (LTR-only)
```bash
grep -n ' ml-\| mr-\| pl-\| pr-' [file]
```
**Violation:** `ml-2`, `mr-4`
**Fix:** `ms-2`, `me-4`

### 5. Uncontracted Hard Black
```bash
grep -n 'text-black\|bg-black\|#000000\|#000"' [file]
```
**Violation:** Pure black without an exact structural role in the selected grammar/profile
**Fix:** Use the semantic ink token, or cite the maintained contract that requires hard black

### 6. Missing data-slot
```bash
grep -n 'function [A-Z]' [file] # find components
grep -n 'data-slot' [file]       # check if present
```
**Violation:** Component without `data-slot`
**Fix:** Add `data-slot="component-name"`

### 7. Font Size CSS Variables (CRITICAL — Tailwind v4 conflict)
```bash
grep -n 'text-\[var(--' [file]
grep -n '\-\-text-.*px\|--fs-.*px' [file]
```
**Violation:** `text-[var(--text-sm)]` or `--text-sm: 13px` in theme.css
**Fix:** Use explicit `text-[13px]`. CSS variable font sizes conflict with Tailwind v4's `--text-*` namespace — Tailwind reads them as color, not font-size.

### 8. className Without cn()
```bash
grep -n 'className={`' [file]
```
**Violation:** Template literal className
**Fix:** Use `cn()` for all className composition

## Output Format

```
🔴 FAIL  [file:line] Hardcoded hex: text-[#3C3C3C] → use text-text-primary
🔴 FAIL  [file:line] Raw px: p-[24px] → use p-6
🟡 WARN  [file:line] Physical prop: ml-2 → use ms-2
🟡 WARN  [file:line] Missing data-slot on MyComponent
🟢 PASS  No violations found

Total: X errors, Y warnings
```

If errors > 0, list specific fixes for each violation.
