---
name: ss-flow
description: Design user flows and navigation structure following proven UX patterns
argument-hint: [flow-name] [description]
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# UX Flow Designer

Design a user flow: **$0**
Description: $ARGUMENTS

## Instructions

1. Read the design system reference:
   - `CLAUDE.md` for component inventory
   - `DESIGN-LANGUAGE.md` for layout patterns (sections 13-14, 19-20)
   - `components/patterns/` for available building blocks

2. Apply these UX principles:

### Information Architecture
- **Progressive Disclosure**: Show only what's needed at each step. Hide complexity behind logical drill-downs.
- **Miller's Law**: Chunk information into groups of 5-9 items maximum.
- **Hick's Law**: Minimize choices per screen. Fewer options = faster decisions.

### Navigation Patterns
- **Hub & Spoke**: Dashboard → detail pages → back to dashboard (default for mobile apps)
- **Linear Flow**: Step 1 → Step 2 → Step 3 (for forms, onboarding, checkout)
- **Tab Navigation**: 3-5 top-level sections via BottomNav

### Screen Flow Rules
- Every flow must have a **clear entry point** and **clear exit point**
- Maximum **3 taps** to reach any key feature from the home screen
- Back navigation must always be available (except root screens)
- Error states must provide **recovery paths** (retry, go back, contact support)
- Loading states must use skeleton screens (never spinners in cards)

### Page Composition (from DESIGN-LANGUAGE.md)
- Follow the **Information Pyramid**: Hero → KPI Grid → Details → Lists
- Each screen should answer ONE primary question
- Above the fold: the most important metric or action
- Use the 4 section types: Full Card (A), Grid (B), Carousel (C), Hero (D)

3. Output format:
   - **Flow diagram** in ASCII showing screen connections
   - **Screen inventory** listing each screen's purpose and key components
   - **Edge cases** (empty states, errors, loading) for each screen
   - **Scaffolded pages** using `PageShell`, `TopBar`, `BottomNav` patterns

4. Generate the actual page files using `/ss-page` conventions.
