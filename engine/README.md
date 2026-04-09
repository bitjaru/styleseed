# StyleSeed Engine

The brand-agnostic design engine. Contains layout rules, components, skills, and design language — everything except colors and fonts.

## What's Here

| Directory | Contents |
|-----------|----------|
| `CLAUDE.md` | AI integration guide — Claude Code reads this automatically |
| `DESIGN-LANGUAGE.md` | 69 visual design rules with Table of Contents |
| `.claude/skills/` | 11 slash commands (1 setup + 6 UI + 4 UX) |
| `components/ui/` | 32 shadcn/ui-based primitives (including motion.tsx) |
| `components/patterns/` | 16 dashboard pattern components |
| `css/` | base.css, fonts.css, index.css (theme.css comes from skins/) |
| `tokens/` | 6 JSON design token files |
| `utils/` | Formatting utilities |
| `icons/` | Custom SVG icon library |
| `scaffold/` | Vite 6 + React 18 + TypeScript starter |

## Usage

```bash
# Copy engine into your project
cp -r engine/* your-project/

# Pick a skin for colors
cp skins/stripe/theme.css your-project/src/styles/theme.css

# Or use interactive setup
/ss-setup
```

Design rules in this engine work with ANY skin — the 69 rules are about layout, composition, typography ratios, and visual rhythm, not specific colors.
