---
name: ui-setup
description: Interactive setup wizard — guides you step-by-step to configure the design system for your project
argument-hint: (no arguments needed)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, AskUserQuestion
---

# Design System Setup Wizard

Guide the user through setting up StyleSeed for their project, step by step.

## Instructions

Walk through these steps ONE AT A TIME. Ask the user each question, wait for their answer, then proceed to the next step. Do not skip steps or ask multiple questions at once.

### Step 1: App Type

Ask the user:
> What type of app are you building?
> 1. SaaS Dashboard (analytics, metrics, charts)
> 2. E-commerce (products, orders, payments)
> 3. Fintech (transactions, portfolio, market data)
> 4. Social / Content (feeds, profiles, messaging)
> 5. Productivity / Internal tool
> 6. Other (describe it)

Based on their answer, remember the app type for later page composition recommendations.

### Step 2: Brand Color

Ask the user:
> What's your brand color? Pick one:
> 1. 💜 Purple (#721FE5) — default Toss style
> 2. 🔵 Blue (#2563EB) — trust, corporate
> 3. 🟢 Green (#059669) — growth, health, finance
> 4. 🟠 Orange (#EA580C) — energy, creative
> 5. 🔴 Red (#DC2626) — bold, urgent
> 6. ⚫ Dark (#18181B) — minimal, premium
> 7. Custom — enter your hex code

After they choose, update `css/theme.css`:
```css
:root {
  --brand: [chosen color];
}
```
Also update the dark mode brand color (lighten by ~20% for dark backgrounds).

### Step 3: Design Concept (Optional — awesome-design-md)

Ask the user:
> Do you want to base your visual identity on an existing brand?
> You can pick from awesome-design-md (https://github.com/VoltAgent/awesome-design-md):
> 
> Popular options:
> 1. Stripe — clean, professional, purple/blue
> 2. Linear — minimal, dark-first, violet
> 3. Vercel — black & white, geometric
> 4. Notion — warm, friendly, beige tones
> 5. GitHub — neutral, functional
> 6. No thanks — use the default Toss style
> 7. Other — tell me a brand or describe a vibe

If they pick a brand from awesome-design-md:
1. Fetch the DESIGN.md from `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/designs/[brand]/DESIGN.md`
2. Extract the color palette and apply it to `css/theme.css`
3. Keep all StyleSeed layout rules, typography ratios, and component patterns — only swap the visual identity

### Step 4: Font

Ask the user:
> What font style do you prefer?
> 1. Pretendard + Inter (default — great for Korean + English)
> 2. Inter only (clean, universal)
> 3. SF Pro (Apple-style, macOS/iOS feel)
> 4. Geist (Vercel-style, modern)
> 5. Custom — tell me the font name

After they choose, update `css/fonts.css` with the appropriate import and `css/base.css` font-family.

### Step 5: App Name & First Page

Ask the user:
> What's your app name? And what should the first page be?
> Example: "Acme — a SaaS analytics dashboard with revenue, users, and activity"

Then:
1. Update the TopBar logo text
2. Generate the first page using `/ui-page` with the appropriate recipe from DESIGN-LANGUAGE.md (Section 63 — Page Composition Recipes)
3. Apply the chosen brand color, font, and design concept

### Step 6: Summary

Show the user what was configured:
```
✅ Setup Complete!

App: [name]
Brand Color: [color] 
Font: [font]
Design Concept: [concept or "Toss default"]
First Page: [page name]

Files modified:
- css/theme.css (brand color + dark mode)
- css/fonts.css (font import)
- css/base.css (font family)
- src/app/[PageName].tsx (first page)

Next steps:
- Run `npm run dev` to see your app
- Use /ui-page to add more pages
- Use /ux-audit to check UX quality
- Use /ui-review to verify design compliance
```

## Important

- Always ask ONE question at a time
- Wait for the user's response before proceeding
- Keep it conversational and friendly
- If the user seems unsure, suggest the default option
- The Toss design RULES (layout, typography ratios, spacing, forbidden patterns) stay the same regardless of color/font choice — only the visual identity changes
