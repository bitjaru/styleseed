---
name: ss-page
description: Scaffold a new product page or screen from the compiled StyleSeed output grammar, surface adapter, brand recipe, and project lock.
argument-hint: "[page-name] [description]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Product Page Scaffolder

## When NOT to use

- For a single composed pattern within an existing page → use `/ss-pattern`
- For multi-page navigation structure → use `/ss-flow` first
- For tweaking an existing page — edit the file directly

Create a new page: **$0**
Description: $ARGUMENTS

## Instructions

1. Resolve and read the active design method:
   - `.styleseed/effective-rules.md` and `.styleseed/manifest.json`
   - If missing or stale, invoke `/ss-resolve` or `$ss-resolve` from `STYLESEED.md`
   - `components/patterns/page-shell.tsx` for page layout
   - `components/patterns/top-bar.tsx` for header pattern
   - `components/patterns/bottom-nav.tsx` for navigation

2. Page structure template:
```tsx
import { PageShell, PageContent } from "@/components/patterns/page-shell"
import { TopBar, TopBarAction } from "@/components/patterns/top-bar"
import { BottomNav } from "@/components/patterns/bottom-nav"

export default function PageName() {
  return (
    <PageShell recipe="enterprise-workbench">
      <TopBar
        logo={/* logo or page title */}
        subtitle={/* optional subtitle */}
        actions={/* optional action buttons */}
      />
      <PageContent>
        {/* Compose the grammar's focal point and recipe-fit sections */}
      </PageContent>
      <BottomNav items={[/* nav items */]} activeIndex={0} />
    </PageShell>
  )
}
```

3. Apply the selected adapter and recipe:
   - Set `recipe="<manifest selection.recipe>"` on `PageShell`, or
     `data-styleseed-recipe="<id>"` on a custom artifact root.
   - Use the lock's viewports and the adapter's responsive contract. Do not assume 430px mobile.
   - Use `ss-page-padding`, `ss-page-gutter`, `ss-pattern-stack`, `ss-pattern-surface`,
     `ss-pattern-inset`, `ss-pattern-control`, and `ss-pattern-icon` where bundled patterns fit.
   - Select components by recipe: aligned panels/rows for workbenches, flat steps for public
     service, reading flow for editorial, focused canvas/tool groups for creative tools, and
     soft grouping only when the recipe calls for it.
   - A page may contain cards, panels, rules, whitespace, rows, tables, or a canvas. Never force
     every content block into a card.

4. Use semantic tokens for all colors — never hardcode hex values.

5. Compose the page from existing components (ui/ and patterns/) wherever possible.

6. Safe area: include `env(safe-area-inset-*)` padding for modern devices.

7. **Post-generation verification (MANDATORY):**
   Run `/ss-score` then `/ss-verify`. Confirm:
   - [ ] The first viewport exposes the grammar's user job and one focal point
   - [ ] Containment, geometry, controls, collections, density, and navigation fit the recipe
   - [ ] Only `--brand` color used for accents (no other accent colors)
   - [ ] No hardcoded hex values (all semantic tokens)
   - [ ] Section types alternate (no two identical types in a row)
   - [ ] Spacing uses one repeatable recipe-fit rhythm
   - [ ] Touch targets ≥ 44px on all interactive elements
   If any violation is found, fix it before presenting the page to the user.
