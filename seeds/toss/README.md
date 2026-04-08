# Toss Seed

A Toss-style mobile-first design seed for AI coding tools.

Inspired by [Toss Design System (TDS)](https://toss.im/design-system) — the Korean fintech super-app known for its clean, minimal, data-focused UI.

## Style Characteristics

- **Single accent color** — one brand color (#721FE5 purple) for all active/selected states
- **Soft grayscale hierarchy** — 5-level gray system, never pure black
- **Big numbers, small units** — 2:1 size ratio for metrics ($48.2K, not $48.2 K)
- **Card-based layout** — all content lives inside cards with subtle shadows
- **Mobile-first** — optimized for 430px viewport with safe area support
- **Minimal interaction** — cards are for viewing data, not clicking

## What's Included

| Category | Count | Description |
|----------|-------|-------------|
| Design Rules | 60 rules, 2,200+ lines | Complete visual design language |
| UI Primitives | 31 components | shadcn/ui-based (button, card, dialog, etc.) |
| Pattern Components | 16 components | Dashboard patterns (StatCard, HeroCard, ChartCard, etc.) |
| Design Tokens | 6 files | Colors, typography, spacing, radii, shadows, motion |
| Claude Skills | 11 skills | 1 setup + 6 UI + 4 UX slash commands |
| CSS Theme | 4 files | Tailwind CSS v4 with light/dark mode |

## Quick Start

```bash
# Copy into your project
cp -r seeds/toss/* your-project/

# Or copy to src structure:
cp seeds/toss/CLAUDE.md your-project/
cp seeds/toss/DESIGN-LANGUAGE.md your-project/
cp -r seeds/toss/.claude your-project/
cp -r seeds/toss/css your-project/src/styles/
cp -r seeds/toss/components your-project/src/components/
cp -r seeds/toss/tokens your-project/
```

## Customization

Change `--brand` in `css/theme.css` to your brand color. The entire design system adapts:

```css
:root {
  --brand: #721FE5;  /* Change this to your brand color */
}
```

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS v4 (CSS-first)
- Radix UI primitives
- Vite 6
- Lucide React icons
