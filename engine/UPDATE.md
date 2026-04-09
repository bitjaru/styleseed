# Updating StyleSeed

How to pull the latest engine updates into your existing project.

## Check for Updates

```bash
# In your styleseed clone
cd styleseed
git pull origin main

# See what changed
git log --oneline -10
```

Or check [GitHub Releases](https://github.com/bitjaru/styleseed/releases).

**Get notified automatically:** Click **Watch** → **Custom** → **Releases** on the repo.

## Update Strategy

Every project is different. The key question: **where did you put the StyleSeed files?**

### Common Setups

| Setup | DESIGN-LANGUAGE.md location | Skills location |
|-------|---------------------------|-----------------|
| Copied to root | `./DESIGN-LANGUAGE.md` | `./.claude/skills/` |
| Copied to .claude/ | `./.claude/DESIGN-LANGUAGE.md` | `./.claude/skills/` |
| Copied to src/ | `./src/DESIGN-LANGUAGE.md` | `./.claude/skills/` |

## What's ALWAYS Safe to Update

These files contain no project-specific content:

| File | What It Is | Command |
|------|-----------|---------|
| `DESIGN-LANGUAGE.md` | Design rules (only additions, never breaking) | `cp styleseed/engine/DESIGN-LANGUAGE.md [your-location]` |
| `.claude/skills/` | All 12 skill definitions | `cp -r styleseed/engine/.claude/skills/ your-project/.claude/skills/` |
| `.cursorrules` | Cursor rules | `cp styleseed/engine/.cursorrules your-project/` |

## What to Be CAREFUL With

| File | Risk | Action |
|------|------|--------|
| `CLAUDE.md` | You may have a **project-specific** CLAUDE.md (architecture, context, etc.) | **Don't overwrite.** Instead, merge the Golden Rules section into your existing CLAUDE.md |
| `theme.css` | Your brand colors | **Never overwrite** — this is your skin |
| `components/ui/` | You may have customized components | `diff` first, then decide |
| `components/patterns/` | You may have added custom patterns | `diff` first, then decide |
| `tokens.ts` | May have your brand color hardcoded | Check before overwriting |

## Quick Update (Safe — Rules + Skills Only)

```bash
# Update design rules (find where yours is first)
cp styleseed/engine/DESIGN-LANGUAGE.md your-project/.claude/DESIGN-LANGUAGE.md
# or: cp styleseed/engine/DESIGN-LANGUAGE.md your-project/DESIGN-LANGUAGE.md

# Update skills (always safe)
cp -r styleseed/engine/.claude/skills/ your-project/.claude/skills/

# Update Cursor rules
cp styleseed/engine/.cursorrules your-project/.cursorrules
```

## Merging Golden Rules into Existing CLAUDE.md

If your project has its own CLAUDE.md with project-specific context, don't replace it. Instead, add the Golden Rules section at the top:

```markdown
## Golden Rules (NEVER break these)
 1. All content inside cards — NEVER on bare page background
 2. Single accent color (--brand) — everything else grayscale
 3. No pure black (#000) — darkest text is defined by skin
 4. Numbers 2:1 with units — 48px number + 24px unit, always
 5. space-y-6 between sections · mx-6 for cards · px-6 for grids
 6. Never repeat same section type consecutively
 7. Card shadows ≤ 8% opacity
 8. Touch targets ≥ 44×44px
 9. Semantic tokens only — NEVER hardcode hex in components
10. After generating ANY page → run /ss-review to verify
```

## Full Update (Check Conflicts First)

```bash
# Compare components
diff -r styleseed/engine/components/ui/ your-project/src/components/ui/ | head -20

# If clean (no custom changes):
cp -r styleseed/engine/components/ui/ your-project/src/components/ui/

# Compare tokens
diff styleseed/engine/tokens.ts your-project/tokens.ts
```

## Version Tracking

```bash
cd styleseed && git describe --tags
# v2.0.0, v2.1.0, etc.
```
