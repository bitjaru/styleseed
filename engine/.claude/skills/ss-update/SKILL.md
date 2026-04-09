---
name: ss-update
description: Update StyleSeed engine in your project — analyzes what's outdated and updates safely
argument-hint: (no arguments needed)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# StyleSeed Update Assistant

Automatically detect and update StyleSeed files in the current project.

## Instructions

### Step 1: Detect Current Setup

Scan the project to find where StyleSeed files are:

```bash
# Find DESIGN-LANGUAGE.md
find . -name "DESIGN-LANGUAGE.md" -not -path "*/node_modules/*"

# Find CLAUDE.md
find . -name "CLAUDE.md" -not -path "*/node_modules/*"

# Find skills
find . -path "*/.claude/skills/ui-*" -o -path "*/.claude/skills/ux-*" | head -20

# Find theme.css
find . -name "theme.css" -not -path "*/node_modules/*"

# Find .cursorrules
find . -name ".cursorrules"
```

Report what was found and where.

### Step 2: Check StyleSeed Version

Clone or pull latest styleseed:
```bash
if [ -d "/tmp/styleseed" ]; then
  cd /tmp/styleseed && git pull
else
  git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed
fi
```

Compare versions:
- Check if DESIGN-LANGUAGE.md has the Table of Contents (new version does)
- Check if Golden Rules exist in CLAUDE.md
- Count skills (latest = 12)
- Check if .cursorrules exists

### Step 3: Report & Ask

Show the user what needs updating:

```
StyleSeed Update Report:

Current state:
- DESIGN-LANGUAGE.md: [location] — [old/current version indicator]
- Skills: [count] found (latest: 12)
- Golden Rules: [yes/no]
- .cursorrules: [yes/no]

Recommended updates:
1. ✅ [safe] Update skills (X → 12)
2. ✅ [safe] Add .cursorrules
3. ⚠️ [review] Update DESIGN-LANGUAGE.md ([old line count] → [new line count])
4. ⚠️ [merge] Add Golden Rules to CLAUDE.md (won't overwrite existing content)

Shall I proceed? (I'll ask before each ⚠️ item)
```

### Step 4: Execute Updates

For each update, in order:

**Always safe (do without asking):**
- Copy skills: `cp -r /tmp/styleseed/engine/.claude/skills/ .claude/skills/`
- Copy .cursorrules (if not exists): `cp /tmp/styleseed/engine/.cursorrules .cursorrules`

**Ask before doing:**

For DESIGN-LANGUAGE.md:
- Show diff summary: how many new rules, what sections added
- Ask: "Update DESIGN-LANGUAGE.md? (Y/N)"
- If yes: copy to the detected location

For CLAUDE.md (Golden Rules):
- Check if Golden Rules section already exists
- If not: ask "Add Golden Rules section to your CLAUDE.md? This adds 10 lines at the top. Your existing content stays untouched."
- If yes: insert Golden Rules after the first heading

**Never touch:**
- theme.css — say "Your theme.css (skin) is untouched."
- components/ — say "Your components are untouched. Run `/ss-lint` to check compliance."

### Step 5: Summary

```
Update complete!

✅ Skills: 12 (added X new)
✅ .cursorrules: added
✅ DESIGN-LANGUAGE.md: updated to latest
✅ Golden Rules: added to CLAUDE.md

Not touched:
- theme.css (your skin)
- components/ (your code)

Next: run /ss-lint on your pages to check for rule violations.
```

## Important

- NEVER overwrite theme.css
- NEVER overwrite a project-specific CLAUDE.md — only MERGE the Golden Rules section
- NEVER overwrite components without explicit user approval
- Always show what will change before changing it
- If unsure, ask the user
