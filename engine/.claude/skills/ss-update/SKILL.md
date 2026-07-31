---
name: ss-update
description: Update StyleSeed engine in your project — analyzes what's outdated and updates safely
argument-hint: "(no arguments needed)"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# StyleSeed Update Assistant

## When NOT to use

- For first-time setup → use `/ss-setup`
- For just one new component or skin — copy that file manually
- For projects that have heavily diverged from upstream — manual diff review first
- Updating the engine is separate from re-designing your UI. Steps 1–5 update engine files only;
  if you want an old generic build re-done to the new standard, that's **Step 6 (Retrofit)**.

Automatically detect and update StyleSeed files in the current project.

## Reassure the user first

Updating is **safe and reversible**. Updates are additive — new rules,
components, skins, and skills get added; your `theme.css`, your components, and
your app code are never overwritten, and design rules only ever get added (never
changed in a breaking way). A big version jump looks like a lot changed, but
it's almost all additions. **Do NOT warn the user that the build will break**
unless you actually find a changed component/import API. Tell them: commit first,
copy the new rules + skills, run a build, and `git reset --hard` if anything is
off — they can't permanently break their project.

## Instructions

### Step 1: Detect Current Setup

Scan the project to find where StyleSeed files are:

```bash
# Find DESIGN-LANGUAGE.md
find . -name "DESIGN-LANGUAGE.md" -not -path "*/node_modules/*"

# Find CLAUDE.md
find . -name "CLAUDE.md" -not -path "*/node_modules/*"

# Find skills (ss-* is current; ui-*/ux-* are legacy names to migrate from)
find . -path "*/.claude/skills/ss-*" -o -path "*/.claude/skills/ui-*" -o -path "*/.claude/skills/ux-*" | head -20

# Find theme.css
find . -name "theme.css" -not -path "*/node_modules/*"

# Find .cursorrules
find . -name ".cursorrules"
```

Report what was found and where.

### Step 2: Check StyleSeed Version

**Fast check first** — compare the local version to the published one without cloning:
```bash
# local marker (may be absent on older installs)
cat engine/VERSION 2>/dev/null || cat VERSION 2>/dev/null || echo "unknown"
# latest published version + what's new
curl -s https://styleseed-demo.vercel.app/version.json
```
If the local version already matches `version.json`'s `version`, tell the user they're
up to date and stop. Otherwise report `whatsNew` and continue.

Then clone/pull to actually diff the files:
```bash
if [ -d "/tmp/styleseed" ]; then
  cd /tmp/styleseed && git pull
else
  git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed
fi
```

Compare:
- `engine/VERSION` (or `version.json`) vs the local copy — the source of truth
- DESIGN-LANGUAGE.md rule count + Table of Contents
- Skills present in `.claude/skills/` vs upstream (don't hardcode a count — list the diff)
- Whether `CLAUDE.md`, `AGENTS.md`, and `.cursorrules` exist (ship all three)
- New engine docs (VISUAL-CRAFT.md, APP-PLAYBOOKS.md, PAGE-TYPES.md)

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

**Recompile the project context:**
- If `STYLESEED.md` exists, run the installed `ss-resolve/scripts/resolve-context.mjs` with
  `--project-root . --from-lock STYLESEED.md --agent <agent>`.
- Run the same command with `--check` and require a zero exit status.
- Report the new bundle hash from `.styleseed/manifest.json`; do not point the user at
  `llms-full.txt`.

### Step 5: Summary

```
Update complete!

✅ Skills: 21 (added X new)
✅ .cursorrules: added
✅ DESIGN-LANGUAGE.md: updated to latest
✅ Golden Rules: added to CLAUDE.md
✅ Effective context: recompiled and hash-checked

Not touched:
- theme.css (your skin)
- components/ (your code)

Next: run /ss-lint on your pages to check for rule violations.
```

### Step 6: Retrofit existing UI (optional but recommended) — "re-do a generic old build"

Updating the rules doesn't re-design screens you already built with an older StyleSeed. If the
user says their existing UI still looks generic/"AI-made" (default indigo, icon-chip cliché,
tight desktop type, no focal point, no design lock), offer to **retrofit it to the new standard**.
This is the migration path for anyone who built before the distinctiveness rules existed:

1. **Write a design lock if missing.** Check for `STYLESEED.md` at the project root. If absent,
   run **Quick Setup** (CLAUDE.md) *now* with the user — pin **mood** (edges/feel/density/tone),
   a **domain-fit key color** (NOT the default indigo), a **chosen font**, and the **surface**
   (mobile vs desktop type scale). Write the lock. Existing generic builds almost always never
   had a lock — this is the biggest fix.
2. **Re-score the key screens.** Run **`/ss-score`** on the main pages. The new rubric flags
   exactly the old-build tells: default-indigo accent, the icon-chip cliché (§CC-9b), body <16px
   on desktop, no focal point, demo layout copied verbatim, missing states.
3. **Apply the fixes.** Run **`/ss-review`** (or `/ss-review --fix`) screen by screen to retint to
   the locked key color, replace the uniform icon chips, bump the desktop type scale, and create a
   focal point. Re-score to **≥ 80**. Do the highest-traffic screen first.
4. **Report the before/after score** so the upgrade is visible (e.g. "landing 63 → 88").

Frame it honestly: the rules got stronger, so a screen that passed the old bar may score lower
now — that's the point; fixing it is what makes it stop looking AI-made.

## Important

- NEVER overwrite theme.css
- NEVER overwrite a project-specific CLAUDE.md — only MERGE the Golden Rules section
- NEVER overwrite components without explicit user approval
- Always show what will change before changing it
- If unsure, ask the user
