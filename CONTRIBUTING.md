# Contributing to StyleSeed

Thank you for your interest in contributing! StyleSeed is a **living judgment framework** — its
core value is the design *rules and the reasoning behind them*, and that ecosystem grows when the
people who use it propose what they've learned. If you found a pattern that reliably makes UI look
better, teach it to everyone's AI by proposing it as a rule.

## Ways to Contribute

### 1. Propose a Design Rule (the heart of StyleSeed) ⭐

This is the most valuable thing you can add. StyleSeed's rules (`engine/DESIGN-LANGUAGE.md`,
`engine/VISUAL-CRAFT.md`) are what teach an AI *judgment*. A good rule isn't an opinion — it's a
**decision + the reason it works**, written so a model can apply it.

**Every rule follows the same shape — Decision → Rule → Why → (Source):**

```markdown
## NN. Short Rule Name

**Rule:** <the imperative, with numbers> — e.g. "Numbers are 2:1 with their unit
(48px value over a 24px unit)."

**Why it works:** <the principle/reasoning a model can reuse> — e.g. "The eye locks
onto magnitude first; equal sizes flatten the value into noise."

**Do / Don't:** a minimal good example and the common failure it replaces.

**Source (optional but loved):** the research or product that backs it (Refactoring UI,
Material 3, Apple HIG, WCAG, a named app…).
```

**What makes a rule mergeable:**

- [ ] It's a **decision**, not a preference ("use one accent," not "blue is nice").
- [ ] It states **why** — the reasoning is the payload an AI repeats.
- [ ] It's **specific and testable** (numbers, ratios, a clear do/don't) — vague rules don't change output.
- [ ] It's **brand-agnostic** — a rule about layout/hierarchy/rhythm, not one skin's colors.
- [ ] It doesn't contradict the 11 Golden Rules (`engine/CLAUDE.md`); refinements within them are welcome.
- [ ] Bonus: a real source. Sourced rules build trust with humans *and* models.

**How to submit:** open a **"Propose a design rule"** issue (uses the template) to discuss, or send a
PR adding it to `engine/DESIGN-LANGUAGE.md` (visual/layout rules) or `engine/VISUAL-CRAFT.md` (craft &
coherence). Append it, bump the count in the README/llms.txt, and we'll review the reasoning together.

### 2. Create a New Seed (Most Impactful for visual range)

Each seed is a complete design language that AI coding tools can follow. The more seeds we have, the more design styles developers can choose from.

#### Quick Start: Use Claude Code to Create a Seed

The fastest way to create a new seed is to use Claude Code itself:

1. **Copy the template:**
   ```bash
   cp -r seeds/_template seeds/your-style-name
   ```

2. **Open Claude Code** in the `seeds/your-style-name/` directory

3. **Tell Claude:**
   ```
   Look at seeds/toss/ as a reference implementation. 
   Create a [Your Style]-style design language following the same structure.
   
   Style characteristics:
   - [Describe the visual style you want]
   - [Key color palette]
   - [Typography preferences]
   - [Layout patterns]
   ```

4. **Claude Code will generate:**
   - `DESIGN-LANGUAGE.md` — Visual design rules for your style
   - `tokens/` — Color palettes, typography scale, spacing, shadows
   - `css/theme.css` — Tailwind CSS v4 implementation
   - Adjusted pattern components matching your style

5. **Review and iterate** — Test by building a sample page with the seed

6. **Submit a PR** with your new seed

#### Seed Quality Checklist

- [ ] `DESIGN-LANGUAGE.md` has 500+ lines of specific, actionable design rules
- [ ] `CLAUDE.md` provides clear guidance for AI code generation
- [ ] `tokens/` has all 6 token files (colors, typography, spacing, radii, shadows, motion)
- [ ] `css/theme.css` implements all tokens as CSS custom properties
- [ ] Light and dark mode are both supported
- [ ] At least 5 pattern components are included or adapted
- [ ] No brand-specific content (use generic examples like "Acme Corp")
- [ ] Skills are present and reference the correct file paths

#### Naming Convention

- Use lowercase, single-word names: `toss`, `apple`, `linear`, `stripe`
- If multi-word is necessary, use hyphens: `material-you`

### 2. Improve an Existing Seed

- Fix design inconsistencies
- Add missing pattern components
- Improve design language rules (more specific = better AI output)
- Add accessibility rules
- Fix dark mode issues
- Improve UX skills

### 3. Add Components

- New pattern components that work across seeds
- Additional UI primitives (following shadcn/ui conventions)
- Utility functions

### 4. Documentation

- Fix typos or unclear explanations
- Add examples and usage patterns
- Translate documentation

## Seed Structure

Every seed must follow this structure:

```
seeds/your-style/
├── README.md              # Seed overview and setup instructions
├── CLAUDE.md              # AI integration guide (Claude Code reads this)
├── DESIGN-LANGUAGE.md     # Visual design rules (the core value)
├── .claude/skills/        # Canonical agent skills (Claude /ss-*, Codex $ss-*)
├── tokens/                # JSON design tokens
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   ├── radii.json
│   ├── shadows.json
│   └── motion.json
├── css/
│   ├── theme.css          # CSS custom properties + Tailwind theme
│   ├── base.css           # Element defaults
│   ├── fonts.css          # Font imports
│   └── index.css          # Entry point
├── components/
│   ├── ui/                # Primitives (can reuse from toss seed)
│   └── patterns/          # Style-specific pattern components
├── utils/
├── icons/
└── scaffold/              # New project template
```

## Code Style

- **Components**: Use `function` declarations, `data-slot` attributes, `cn()` for classes
- **TypeScript**: Strict mode, `React.ComponentProps<>` for props
- **CSS**: Semantic tokens only (no hardcoded hex in components)
- **Tailwind**: Use utility classes, avoid arbitrary values where tokens exist

## Pull Request Process

1. Fork the repo and create a branch (`feat/new-seed-name` or `fix/description`)
2. Make your changes
3. Test with Claude Code — build a sample page to verify AI output quality
4. Submit a PR with:
   - Description of the seed's design philosophy
   - Screenshot of a page built with the seed
   - Any known limitations

## Questions?

Open an issue or start a discussion. We're happy to help!
