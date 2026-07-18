# StyleSeed Engine

The AI design-method engine. It combines fixed judgment, job-specific output grammars,
surface adapters, reference compilation, detailed craft, components, and agent skills.

## What's Here

| Directory | Contents |
|-----------|----------|
| `CLAUDE.md` | AI integration guide — Claude Code reads this automatically |
| `AGENTS.md` | Cross-agent guide — Codex reads this automatically |
| `PRODUCT-PRINCIPLES.md` | Product constitution and authority order |
| `RULESETS.md` | 8 built-in functional output grammars |
| `ADAPTERS.md` | 5 renderer/surface contracts, including non-web outputs |
| `REFERENCE-COMPILER.md` | Evidence-to-rule-set compilation protocol |
| `PRESETS.md` | Optional aesthetic profiles, separate from grammars |
| `ARCHITECTURE.md` | Technical architecture and diagrams |
| `DESIGN-LANGUAGE.md` | 74 visual design rules with Table of Contents |
| `.claude/skills/` | 20 canonical agent skills (Claude `/ss-*`, Codex `$ss-*`) |
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
# Claude Code: /ss-setup
# Codex:       $ss-setup
```

The method works with any skin and across multiple artifact renderers. Select the output grammar
and adapter first; skins provide tokens, not judgment.
