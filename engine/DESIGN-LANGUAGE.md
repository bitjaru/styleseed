# StyleSeed Design Language
> Visual design rules for professional mobile dashboard design

## Table of Contents

### Part 1: Core Visual Rules
| # | Rule | Key Point |
|---|------|-----------|
| 1 | [Color Philosophy](#1-color-philosophy) | Single accent color, 5-level grayscale |
| 2 | [Number/Currency Display](#2-numbercurrency-display-rules) | Big number + small unit, 2:1 ratio |
| 3 | [Text Hierarchy](#3-text-hierarchy-rules) | 5-level typography system |
| 4 | [Trend Indicators](#4-trend-indicator-rules) | Up/down arrows with color |
| 5 | [Gauge/Progress Bar](#5-gaugeprogress-bar-rules) | Linear vs segmented |
| 6 | [Donut Chart](#6-donut-chart-rules) | Key color highlight, grayscale rest |
| 7 | [Icon Badge](#7-icon-badge-rules) | Size by context, 10% opacity bg |
| 8 | [Card Structure](#8-card-internal-structure) | Header → Content → Footer |
| 9 | [List Item](#9-list-item-rules) | Status dot + text same color |
| 10 | [Selection UI](#10-selection-ui-rules-toggle--select) | Pill toggle only, no dropdowns |
| 11 | [Briefing Cards](#11-briefingalert-card-rules) | Horizontal carousel |
| 12 | [Shadow System](#12-shadow-system) | Opacity 4-8%, barely visible |
| 13 | [Page Layout](#13-page-layout-structure) | 430px, space-y-6, pb-24 |
| 14 | [**Four Section Types**](#14-four-section-types) | **A(mx-6) B(px-6) C(carousel) D(hero)** |
| 15 | [Card Division](#15-card-internal-division-rules) | border-t between chart and stats |
| 16 | [Title Margins](#16-title-margin-rules) | Varies by content type |
| 17 | [Chart Style](#17-chart-style-rules) | Area/bar chart styling |
| 18 | [**Prohibition Rules**](#18-prohibition-rules-absolute-donts) | **30+ "never do this" rules** |
| 19 | [**Page Checklist**](#19-new-page-creation-checklist) | **Step-by-step build guide** |
| 20 | [Information Pyramid](#20-information-pyramid-structure) | Top = important, bottom = detail |
| 21 | [Data Density](#21-data-density-rules) | Max 4 items per card |

### Part 2: Extended Rules
| # | Rule | Key Point |
|---|------|-----------|
| 28 | [Scroll & Spacing](#28-scroll--spacing-detail-rules) | Overscroll, carousel snap |
| 29 | [Loading/Skeleton](#29-loading-state-skeleton-rules) | Match layout shape, 300ms delay |
| 30 | [Empty/Error States](#30-empty-state--error-state-rules) | Suggest next action |
| 34 | [Microcopy Tone](#34-microcopy-tone-guide) | Casual, active voice, positive |
| 38 | [Chart Selection](#38-chart-type-selection-guide) | When to use which chart |
| 40 | [Applying to Projects](#40-design-system-application-guide) | Change brand color, keep structure |
| 45 | [Dark Mode](#45-dark-mode-guide) | Card brighter than background |
| 46 | [Button Design](#46-button-design-rules) | 7 variants, 4 sizes |
| 50 | [Dark Pattern Prevention](#50-dark-pattern-prevention-rules) | No forced sheets, always dismissable |
| 59 | [Framer Motion](#59-animation-wrapper-rules-framer-motion) | Preset animations, token mapping |

### Part 3: Page Composition & Visual Rhythm
| # | Rule | Key Point |
|---|------|-----------|
| 61 | [**Visual Rhythm**](#61-visual-rhythm--breaking-monotony) | **Never repeat same section type** |
| 62 | [**KPI Card Variation**](#62-kpi-card-variation--the-4-card-rule) | **Vary secondary elements** |
| 63 | [**Composition Recipes**](#63-section-composition-recipes) | **SaaS, e-commerce, fintech, analytics** |
| 64 | [Element Diversity](#64-element-diversity-within-cards) | Mix content types across page |
| 65 | [Accent Distribution](#65-color-accent-distribution) | Scarcity rule |
| 66 | [Card Size Variation](#66-card-size-variation) | Skyline rule |
| 67 | [Progressive Density](#67-progressive-information-density) | Font size decreases down page |
| 68 | [Min Section Count](#68-empty-page-prevention) | Min 4, max 7 sections |
| 69 | [Chart + Context](#69-chart--context-pairing) | Never chart alone |

> **Start here:** Rules 14, 18, 19, 61-63 are the most critical for page construction.

---

## 1. Color Philosophy

### Key Color Principle — A Single Accent for Unity
- **Create unity with a single key color (your brand color, defined by skin)**
- Key color is used **only for active/selected states**
- Everything else is **grayscale** so the key color stands out

```
✓ Key color usage: active nav, selected chart, progress bar fill, icon badge
✗ Key color forbidden: body text, large background areas, general borders
```

### Impact Colors — Small, Strong
- Urgent/warning colors are used in **very small areas only** (dot, badge text)
- Never painted across large surfaces
- **Dot (6px) + text (11px)** combination is the maximum size

| Role | Color | Size | Usage |
|------|-------|------|-------|
| Completed/Up | `#6B9B7A` | dot 6px + text 13px | trend %, Completed |
| Urgent | `#C85A54` | icon 16px + text 12px | "Urgent" badge |
| In Progress | `#3B82F6` | dot 6px + text 11px | "In Progress" |
| Pending | `#F59E0B` | dot 6px + text 11px | "Pending" |
| Notification | `#FF4444` | dot 6px | notification badge (single dot) |

### Grayscale — 5-Level Text Hierarchy
Pure black (#000) is **never used**. Soft blacks for a gentle tone.

| Level | Hex | Role | Example |
|-------|-----|------|---------|
| **Strong** | `#2A2A2A` | Strongest emphasis | donut center value, briefing title |
| **Primary** | `#3C3C3C` | Metrics, section titles | "$48.2K", "Recent Activity" |
| **Secondary** | `#6A6A6A` | Labels, captions | "Today's Revenue", "Web" |
| **Tertiary** | `#7A7A7A` | Subtitles, dates, descriptions | "vs. last month", date |
| **Disabled** | `#9B9B9B` | Inactive, placeholder | inactive nav, unselected period |

### Backgrounds — Depth Through Subtle Differences
| Background | Hex | Usage |
|------------|-----|-------|
| Page | `#FAFAFA` | Full page (not pure white) |
| Card | `#FFFFFF` | Card interior |
| List row | `#FAFAF9` | Row background (subtle warm tone) |
| Inactive | `#E8E6E1` | Progress track, dividers |
| Key color tint | `#F0E8FF` | Selected row background |

---

## 2. Number/Currency Display Rules

### Core Principle: **Large Numbers + Small Units**
Numbers are large and bold, units are small and attached so **the eye goes to the number first**.

### Unit Size Ratio Table

| Context | Number Size | Unit Size | Ratio | Gap | Example |
|---------|------------|-----------|-------|-----|---------|
| Hero metric | 48px | 24px | **2:1** | `ms-0.5` | 3.8`M` |
| KPI metric | 36px | 18px | **2:1** | `ms-0.5` | $48.2`K` |
| Donut center | 24px | 12px | **2:1** | `ms-0.5` | 66`%` |
| Chart bottom price | 18px | 10px | **1.8:1** | `ms-0.5` | 1,648`/mo` |
| List amount | 17px | 11px | **1.5:1** | `ms-0.5` | 840`K` |
| Inventory quantity | 15px | 10px | **1.5:1** | `ms-0.5` | 32.0`GB` |

### Currency Notation
```
✓ Abbreviated: number + suffix (3.8M, $48.2K)
✓ Dollar: symbol prefix ($68.4)
✓ List price: $ + number ($1,520)
✓ Thousand separators required (1,870 / 1,648)
```

### Code Pattern
```tsx
{/* Hero: 48px + 24px */}
<p className="text-text-primary text-[48px] font-bold leading-none">
  3.8<span className="text-[24px] ms-0.5">M</span>
</p>

{/* KPI: 36px + 18px */}
<p className="text-text-primary text-[36px] font-bold leading-none">
  $48.2<span className="text-[18px] ms-0.5">K</span>
</p>

{/* List amount: 17px + 11px */}
<p className="text-text-primary font-bold text-[17px]">
  840<span className="text-[11px] ms-0.5">K</span>
</p>
```

---

## 3. Text Hierarchy Rules

### 5-Level Typography

| Level | Size | Weight | Color | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------|-------------|----------------|-------|
| **Display** | 48px | bold | #3C3C3C | none | -0.02em | Hero metric |
| **Headline** | 36px | bold | #3C3C3C | none | -0.02em | KPI metric |
| **Title** | 18px | bold | #3C3C3C | snug | — | Section title |
| **Body** | 14-15px | bold/semi | #2A2A2A~#3C3C3C | normal | — | List name, description |
| **Label** | 12px | medium | #6A6A6A | normal | 0.05em | Uppercase label |
| **Caption** | 11px | bold/medium | #6A6A6A~#7A7A7A | normal | — | Status, annotation, unit |
| **Micro** | 10px | medium | #7A7A7A | normal | — | Donut label, smallest unit |

### Label Style (Uppercase + Letter Spacing)
All category labels use **uppercase + tracking-wide**:
```tsx
className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.05em]"
// "Today's Revenue", "Active Users", "Revenue Trend"
```

---

## 4. Trend Indicator Rules

### Upward Trend
```
Color: #6B9B7A (muted green, not vivid green)
Icon: TrendingUp (lucide)
Format: +{number}%
```

### Trend Patterns by Size

| Context | % Size | Icon Size | Weight | Label |
|---------|--------|-----------|--------|-------|
| Hero | 15px | 16px (w-4) | bold | "vs. last month" (13px, #7A7A7A) |
| KPI card | 13px | 14px (w-3.5) | bold | none |
| Chart header | 13px | 14px (w-3.5) | bold | none |

### Structure
```tsx
{/* Hero trend: % + icon + label */}
<div className="flex items-center gap-3">
  <div className="flex items-center gap-1">
    <span className="text-success text-[15px] font-bold">+12.4%</span>
    <TrendingUp className="size-4 text-success" strokeWidth={2.5} />
  </div>
  <span className="text-[13px] text-text-tertiary font-medium">vs. last month</span>
</div>

{/* KPI trend: % + icon (no label) */}
<div className="flex items-center gap-1">
  <span className="text-success text-[13px] font-bold">+8.2%</span>
  <TrendingUp className="size-3.5 text-success" strokeWidth={2.5} />
</div>
```

### Rules
- **% text and icon share the same color** (#6B9B7A)
- Icon `strokeWidth={2.5}` (bolder than standard icons)
- Secondary label ("vs. last month") uses a **different color (#7A7A7A)**, separated with `gap-3`

---

## 5. Gauge/Progress Bar Rules

### Linear Progress Bar

| Property | Value | Ratio |
|----------|-------|-------|
| Track height | `h-4` (16px) | **2/3** of card p-6 (24px) |
| Track color | `#E8E6E1` | surface-muted |
| Track corners | `rounded-full` | Fully rounded |
| Fill color | `var(--brand)` | Key color |
| Fill corners | `rounded-full` | Fully rounded |

```tsx
<div className="bg-surface-muted rounded-full h-4 overflow-hidden">
  <div className="bg-brand h-full w-[30%] rounded-full" />
</div>
```

### Discrete Bar Gauge (10-Segment)

| Property | Value | Ratio |
|----------|-------|-------|
| Segment height | `h-6` (24px) | **Same** as card p-6 |
| Segment gap | `gap-1` (4px) | **1/6** of height |
| Segment corners | `rounded` (4px) | Slightly rounded |
| Active color | `var(--brand)` | Key color |
| Inactive color | `#E8E6E1` | surface-muted |

```tsx
<div className="flex gap-1">
  {[...Array(10)].map((_, i) => (
    <div className={`h-6 flex-1 rounded ${i < filled ? 'bg-brand' : 'bg-surface-muted'}`} />
  ))}
</div>
```

### Progress Bar + Label (Horizontal Combination)
```tsx
<div className="flex items-center gap-2">
  <div className="flex-1 bg-surface-muted rounded-full h-4">
    <div className="bg-brand h-full w-[68%] rounded-full" />
  </div>
  <span className="text-[11px] text-text-primary font-bold">68%</span>
</div>
```

### Gauge Type Selection Criteria

| Data Characteristic | Gauge Type | Example |
|--------------------|------------|---------|
| Continuous ratio (%) | **Linear progress** (h-4) | inventory 30%, visits 68% |
| Discrete achievement (n/N) | **Segment bar** (h-6) | order completion 9/10 |
| Continuous ratio + numeric display | **Progress + label** | visits 68% (number beside) |
| Multi-item ratio comparison | **Donut chart** | usage by category |

### Gauge-to-Card Proportional Relationship

| Gauge | Height | vs. Card Padding | Placement |
|-------|--------|-----------------|-----------|
| Linear progress | `h-4` (16px) | 2/3 of padding (24px) | Below metric, card bottom area |
| Segment bar | `h-6` (24px) | Same as padding (24px) | Below metric, visual weight |
| Donut chart | `size-32` (128px) | 5x+ padding | Card content center |

Rules:
- Linear progress (`h-4`) is a **supplementary indicator**, placed small below the metric
- Segment bar (`h-6`) is a **primary visualization** with equal weight to the metric
- Gauge fill percentage uses `w-[{n}%]` inline style for dynamic rendering
- Gauge track is always `bg-surface-muted`, fill is always `bg-brand`
- Both track and fill use `rounded-full` (linear) or `rounded` (segment)

---

## 6. Donut Chart Rules

### Key Color Highlight Principle
- **Only the selected item uses the key color (var(--brand))**, the rest are grayscale
- Unselected opacity: `0.3` (dimmed)
- Selected glow: `box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)`

### Chart Dimensions

| Property | Value | Ratio |
|----------|-------|-------|
| Container | 128x128px (`size-32`) | — |
| Inner radius | 50px | **39%** of container |
| Outer radius | 64px | **50%** of container |
| Ring thickness | 14px | outer - inner |
| Segment gap | `paddingAngle={4}` | 4 degrees |
| Segment corners | `cornerRadius={8}` | Rounded ends |
| Center number | 24px bold | — |
| Center label | 10px medium uppercase | — |

### Gray Palette (Unselected Segments)
```
#D4D4D4 → #A8A8A8 → #8B8B8B → #6B6B6B
(from lightest to darkest, mapped to item order)
```

### Legend List
- Color dot: `size-3 rounded-full` (12px)
- Name: 13px semibold #2A2A2A
- Quantity: 15px bold #2A2A2A
- Gap: `gap-2.5` (dot-to-name), `space-y-3.5` (row spacing)
- Clickable: `cursor-pointer`, opacity transition `duration-300`

---

## 7. Icon Badge Rules

### Icon Badges by Size

| Context | Container | Icon | Corners | Background |
|---------|-----------|------|---------|------------|
| KPI card | `size-7` (28px) | `size-4` (16px) | `rounded-lg` | `bg-brand/10` |
| Hero card | `size-8` (32px) | `size-[18px]` | `rounded-xl` | `bg-brand/10` |
| Nav button | `size-10` (40px) | `size-[18px]` | `rounded-full` | `bg-card` + shadow |

### Rules
- Background opacity is always **10%** (`/10`)
- Icon and background base color is always **key color**
- Icon `strokeWidth={2}` (default), `strokeWidth={2.5}` (trend/emphasis)

---

## 8. Card Internal Structure

### 3-Part Structure: Header → Content → Footer

```
┌─────────────────────────────────────┐
│  [🟣] Today's Revenue    ← Header  │  icon badge + label
│                                     │  (gap-2, mb-3)
│  $48.2K                  ← Content │  large number + small unit
│                                     │  (mb-3)
│  +8.2% ↑                ← Footer  │  trend or gauge
│                                     │
│  ─────────── (border-t) ──────────  │  optional divider
│  Web     Mobile    API   ← Stats   │  bottom grid
└─────────────────────────────────────┘
```

### Divider Rules
- Color: `border-surface-muted` (#E8E6E1)
- Top spacing: `pt-5` (20px)
- Bottom spacing: `mt-6` (24px)
- Bottom grid: `grid grid-cols-{n} gap-3`

---

## 9. List Item Rules

### Status Indicator: **Same-color dot + same-color text**
```
●  Completed   →  #22C55E dot + #22C55E text
●  In Progress →  #3B82F6 dot + #3B82F6 text
●  Pending     →  #F59E0B dot + #F59E0B text
```

| Element | Size | Ratio |
|---------|------|-------|
| Status dot | `size-1.5` (6px) | — |
| Dot-to-text gap | `me-1.5` (6px) | Same as dot |
| Status text | 11px bold | — |

### Highlighted Row (My Item)
```
Normal row:   bg-surface-subtle (#FAFAF9)
My row:       bg-brand-tint (#F0E8FF) + border-2 border-brand
Normal rank:  bg-surface-muted (#E8E6E1) + text-text-tertiary
My rank:      bg-brand + text-white
Normal name:  text-text-primary (#3C3C3C)
My name:      text-brand
```

---

## 10. Selection UI Rules (Toggle / Select)

### Only 2 Allowed Selection UI Patterns

| Pattern | Usage | Position |
|---------|-------|----------|
| **Pill toggle** | Period/category switch (2-4 options) | Card header right |
| **Chart item selection** | Donut/legend item highlight | Inside chart |

```
✗ Select dropdown forbidden (inside cards)
✗ Dropdown selector (with ▼ arrow)
✗ Radio button groups
✗ Checkbox filters
```
If there are 2-4 options, use a **Pill toggle**. If 5 or more, **separate into a dedicated page**.

### Pattern 1: Capsule Pill Toggle
```
Container:     bg-surface-muted rounded-full p-1
Active button: bg-brand text-white rounded-full shadow
Inactive:      text-text-disabled (#9B9B9B)
```

| Property | Active | Inactive |
|----------|--------|----------|
| Background | `bg-brand` | transparent |
| Text | `text-white` | `text-text-disabled` |
| Corners | `rounded-full` | `rounded-full` |
| Shadow | `shadow-sm` | none |
| Size | 11px bold | 11px bold |
| Padding | `px-4 py-1.5` | `px-4 py-1.5` |

```tsx
<div className="flex gap-1 bg-surface-muted p-1 rounded-full">
  <button className="px-4 py-1.5 text-[11px] font-bold rounded-full bg-brand text-white shadow-sm">
    1W
  </button>
  <button className="px-4 py-1.5 text-[11px] font-bold rounded-full text-text-disabled">
    1M
  </button>
</div>
```

### Pattern 2: Chart Item Selection (Donut)
- Click to select/deselect one at a time (toggle)
- Selected: key color + opacity 1.0 + glow
- Unselected: gray + opacity 0.3
- Legend rows also change opacity simultaneously (0.4)
- `cursor-pointer` + `transition-all duration-300`

### Pill Toggle Placement Rules
- In card header, **title on left, toggle on right** (flex justify-between)
- Toggle belongs in the **header area only**, not the card content area

---

## 11. Briefing/Alert Card Rules

### Horizontal Scroll Carousel
- Card width: `w-[280px]` fixed
- Gap: `gap-3` (12px)
- Scrollbar: hidden (`scrollbar-hide`)
- Card style: same as normal cards (`rounded-2xl p-6 shadow-card`)

### Badge Color Rules
- **Urgent**: `#C85A54` (brownish red) — strong but not vivid red
- **Info/Notice**: `#7A7A7A` (gray) — informational content kept restrained in gray
- Icon and text share the **same color**
- `uppercase tracking-wide` emphasis

---

## 12. Shadow System

| Level | Value | Usage |
|-------|-------|-------|
| card | `0 1px 3px rgba(0,0,0,0.04)` | All cards default |
| button | `0 1px 3px rgba(0,0,0,0.06)` | Icon buttons |
| hover | `0 2px 4px rgba(0,0,0,0.08)` | Hover state |
| elevated | `0 4px 12px rgba(0,0,0,0.08)` | Floating |
| modal | `0 8px 24px rgba(0,0,0,0.12)` | Modal/sheet |

Rule: **Opacity is very low** (4-12%). Shadows create **subtle depth** rather than a "floating" feel.

---

## 13. Page Layout Structure

### Page Skeleton
```
┌──────────────── max-w-[430px] ────────────────┐
│  TopBar (px-6 pt-8 pb-6)                      │
│                                                │
│  ┌─ space-y-6 ─────────────────────────────┐  │
│  │  Hero card (mx-6)           ← mt-1      │  │
│  │  KPI grid (px-6)                         │  │
│  │  Full card section (mx-6)                │  │
│  │  Carousel section (px-6)                 │  │
│  │  Full card section (mx-6)                │  │
│  │  ...                                     │  │
│  │                              ← pb-24     │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  BottomNav (fixed bottom-0)                    │
└────────────────────────────────────────────────┘
```

### Key Values
| Property | Value | Description |
|----------|-------|-------------|
| Container max width | `max-w-[430px]` | Mobile viewport |
| Page background | `#FAFAFA` | Light gray (not pure white) |
| Section gap | `space-y-6` (24px) | Between all sections |
| Bottom nav clearance | `pb-24` (96px) | Prevents nav overlap |
| Bottom-most margin | `h-8` (32px) | Scroll end breathing room |

---

## 14. Four Section Types

### Absolute Rule: All Content Lives Inside Cards
```
✗ Placing text, metrics, lists, etc. directly outside cards
✗ Exposing content directly on the page background (#FAFAFA)
✓ All data/content must exist inside a card (bg-card rounded-2xl shadow-card)
```
**No exceptions.** Only TopBar, BottomNav, and carousel titles may sit outside cards.
Everything else (metrics, charts, lists, text) must be wrapped in a card.
Placing content directly on the page background without a card breaks the design.

### Type A: Full Card — Title Inside Card
```
┌── mx-6 ──────────────────────────────────┐
│  bg-card rounded-2xl p-6 shadow-card     │
│                                          │
│  Title (18px bold, mb-4~6)              │
│  Content                                 │
│  ─────── border-t ───────  (optional)   │
│  Bottom stats grid                       │
└──────────────────────────────────────────┘
```
- **Use for**: usage breakdown, charts, recent activity, competitor pricing
- `mx-6`: 24px left/right margin → card appears to float
- Title mb: `mb-4` before lists, `mb-6` before charts, `mb-5` before tables

### Type B: Grid Container — Collection of Individual Cards
```
┌── px-6 ──────────────────────────────────┐
│  grid grid-cols-2 gap-4                  │
│  ┌─────────┐  ┌─────────┐               │
│  │ Card 1  │  │ Card 2  │               │
│  │ p-6     │  │ p-6     │               │
│  └─────────┘  └─────────┘               │
│  ┌─────────┐  ┌─────────┐               │
│  │ Card 3  │  │ Card 4  │               │
│  └─────────┘  └─────────┘               │
└──────────────────────────────────────────┘
```
- **Use for**: KPI grid (4 metric cards)
- `px-6`: 24px left/right padding → grid feels full-width
- Each card: independent `rounded-2xl p-6 shadow-card`

### Type C: Carousel — Horizontal Scroll
```
┌── px-6 ──────────────────────────────────┐
│  Title (18px bold, mb-4)  ← outside card │
│  ┌────────┐ ┌────────┐ ┌────────┐  →→→  │
│  │ 280px  │ │ 280px  │ │ 280px  │       │
│  │ card   │ │ card   │ │ card   │       │
│  └────────┘ └────────┘ └────────┘       │
│  flex gap-3 overflow-x-auto scrollbar-hide│
└──────────────────────────────────────────┘
```
- **Use for**: briefing cards
- `px-6`: left/right padding
- **Title sits outside the card** (above carousel)
- Fixed card width `w-[280px]`, `flex-shrink-0`

### Type D: Hero Card — Special Large Format
```
┌── mx-6 ──────────────────────────────────┐
│  bg-card rounded-2xl p-8 shadow-card     │
│  relative overflow-hidden                │
│                                          │
│  [background chart/watermark]            │
│  [🟣] Label                  ← z-10     │
│  3.8M                        ← 48px     │
│  +12.4% ↑  vs. last month               │
└──────────────────────────────────────────┘
```
- **Use for**: hero revenue card
- `p-8` (32px): more generous padding than standard cards
- Transparent chart/icon watermark in background
- No title, straight to metric

### mx-6 vs px-6 Usage Criteria
| Wrapping | Usage | Visual Effect |
|----------|-------|---------------|
| `mx-6` | Single card | Card appears **floating** |
| `px-6` | Multiple cards/carousel | Content feels **full-width** |

---

## 15. Card Internal Division Rules

### When Dividers Are Used
- When a stats grid follows below a chart, a **divider is required**
- When separating main content from supporting data

### Divider Structure
```tsx
{/* Chart area */}
<div className="h-40 -mx-2 mb-6">
  {/* Chart */}
</div>

{/* Divider + bottom stats */}
<div className="grid grid-cols-3 gap-3 pt-5 border-t border-surface-muted">
  {/* Stat items */}
</div>
```

### Bottom Stats Grid
| Columns | Use Case | Example |
|---------|----------|---------|
| `grid-cols-3` | 3 price/stat types | Web, Mobile, API |
| `grid-cols-4` | 4 item types | Remaining days by category |

### Stats Cell Structure
```tsx
<div className="text-center">
  <p className="text-[11px] text-text-secondary mb-1.5~2 font-medium uppercase">
    {label}
  </p>
  <p className="text-text-primary font-bold text-[18~20px] leading-none">
    {value}
    <span className="text-[10px] ms-0.5">{unit}</span>
  </p>
</div>
```

---

## 16. Title Margin Rules

The gap between title and content varies by content type:

| Content Type | Title mb | Reason |
|-------------|----------|--------|
| List | `mb-4` (16px) | Lists are high-density, so keep close |
| Table | `mb-5` (20px) | Tables need a bit more room |
| Chart | `mb-6` (24px) | Charts have heavy visual weight, so give generous space |
| Donut + legend | `mb-4` (16px) | Compact layout |

---

## 17. Chart Style Rules

### Area Chart
- Line: `stroke="var(--brand)"` + `strokeWidth={2.5}`
- Gradient fill: key color 15% → 0% (top → bottom)
- No dots displayed (`dot={false}`)
- X-axis: 10px #7A7A7A, axis line/ticks hidden
- Y-axis: completely hidden

### Bar Chart
- Only the highest value uses key color, the rest use `#E8E6E1` (surface-muted)
- Only top corners rounded: `radius={[8, 8, 0, 0]}`
- Axis lines/ticks hidden

### Chart Heights
| Chart Type | Height | Margin Adjustment |
|-----------|--------|-------------------|
| Area | `h-40` (160px) | `-mx-2` |
| Bar | `h-44` (176px) | `-mx-1` |

`-mx` negative margin: makes the chart slightly wider than the card padding → visual breathing room

---

## 18. Prohibition Rules (Absolute Don'ts)

### Key Color Overuse Forbidden
```
✗ Painting entire card background with bg-brand
✗ Key color background + white text large-area card
✗ Key color gradient background
✗ Using key color across 2+ sections simultaneously at large scale
```
Key color is for **small elements only**: icon badges (10% opacity), progress fill, selected dots, active nav, badge pills.
Card backgrounds are **always `bg-card` (white)** or `bg-surface-subtle`.

### Pure Black Forbidden
```
✗ #000000, text-black, bg-black
✗ No pure black usage under any circumstances
```
Darkest color: `#2A2A2A` (strong), default text: `#3C3C3C` (primary).

### Ad-hoc Components Forbidden
```
✗ Creating new patterns not in the seed
✗ Full-width CTA buttons (fixed to bottom)
✗ Card overlapping on top of card
✗ Dropdown selectors placed inside cards
```
If a new component is needed, **compose it from one of the 4 section types (A/B/C/D)**.
If existing pattern combinations cannot solve it, confirm with the user first.

### Layout Forbidden
```
✗ Placing content directly outside cards (text, metrics, lists, etc.)
✗ Placing dividers (hr, border-b, Separator) between sections
✗ Changing section gap to anything other than space-y-6
✗ Using left/right margin/padding other than mx-6/px-6
✗ Changing card padding to anything other than p-6/p-8
✗ Changing card radius to anything other than rounded-2xl
✗ Placing floating buttons above bottom nav
```
**Section separation is achieved through cards + spacing (space-y-6) only.**
The difference between page background (#FAFAFA) and card background (#FFFFFF) serves as a natural divider.
Dividers (border-t) are used **only inside cards** to separate chart from stats.

### Selection UI Forbidden
```
✗ Select dropdown (▼ arrow) inside cards
✗ Radio buttons / checkbox filters
✗ Expressing 5+ options as a toggle (use a separate page)
✗ Placing toggles in card content area (header right only)
```

### Typography Forbidden
```
✗ Using grays outside the defined 5-level grayscale
✗ Displaying numbers and units at the same size
✗ Displaying numbers without units (context is lost)
✗ Omitting uppercase + tracking on labels
```

### Shadow Forbidden
```
✗ Strong shadows (opacity 15% or above)
✗ Colored shadows (adding color in rgba)
✗ Different shadow levels per card
```

---

## 19. New Page Creation Checklist

When building a new page from scratch, follow this order:

### Step 1: Page Skeleton
```tsx
<PageShell>           {/* bg-surface-page, max-w-[430px] */}
  <TopBar />          {/* logo + actions + date */}
  <PageContent>       {/* pb-24 space-y-6 */}
    {/* Sections */}
  </PageContent>
  <BottomNav />       {/* fixed bottom */}
</PageShell>
```

### Step 2: Choose One of 4 Types for Each Section
| Data Type | Recommended Section Type |
|-----------|------------------------|
| 1 key metric (large number) | **Type D** Hero card |
| 2-4 key metrics | **Type B** Grid (grid-cols-2) |
| Chart + supporting data | **Type A** Full card (border-t divider) |
| List (orders, rankings, etc.) | **Type A** Full card (space-y-3 list) |
| Multiple alerts/briefings | **Type C** Carousel (w-[280px]) |
| Status summary (donut, etc.) | **Type A** Full card (chart + legend) |

### Step 3: Internal Structure for Each Card
```
1. Header: [icon badge] + [label 12px uppercase]      (gap-2, mb-3)
2. Metric: [large number] + [small unit]               (2:1 ratio, ms-0.5)
3. Supporting: [trend % + icon] or [gauge]             (mb-3)
4. (Optional) divider + bottom stats grid
```

### Step 4: Color Check
- [ ] Is the key color used only for active/selected states?
- [ ] Are all card backgrounds white (bg-card)?
- [ ] Do all text elements use only 5-level gray tokens?
- [ ] Are status colors limited to dot + text (11px) or smaller?
- [ ] Is there no pure black (#000)?

### Step 5: Layout Check
- [ ] Are all section gaps space-y-6?
- [ ] Single cards use mx-6, multiple use px-6?
- [ ] Card padding is p-6 (hero only p-8)?
- [ ] Card radius is rounded-2xl?
- [ ] No overlapping elements?

---

## 20. Information Pyramid Structure

The page follows a **pyramid structure with importance decreasing from top to bottom**:

```
▲ Hero (48px) — The single most important metric
▲▲ KPI grid (36px) — 2-4 key metrics
▲▲▲ Status summary (donut/gauge) — Current situation
▲▲▲▲ Alerts/briefings — Items requiring attention
▲▲▲▲▲ Charts — Trends/changes
▲▲▲▲▲▲ Lists — Detailed data
```

Rules:
- **First screen (above the fold)**: only hero + KPI grid should be visible
- Number sizes decrease going down (48 → 36 → 24 → 18 → 14px)
- Information density increases going down (1 → 4 → many)

---

## 21. Data Density Rules

### Data Items per Card
| Context | Max Items | Reason |
|---------|-----------|--------|
| KPI grid | **4** (2x2) | Maximum for at-a-glance comparison |
| Donut legend | **4** | Limit of distinguishable colors |
| List (orders) | **3-4** | Amount visible without scrolling |
| Rankings | **4** | Only top items + my position needed |
| Bottom stats | **3-4** (grid-cols-3/4) | Amount that fits in one row |
| Carousel cards | **3+** | Flexible since scrollable |

### Things That Should NOT Go Inside Cards
```
✗ CTA buttons (Order, View More, etc.)
✗ Input fields (input, textarea, select)
✗ Images/illustrations
✗ 5 or more list items
✗ 2+ levels of nested cards
```
Cards are **for displaying data**, not **for prompting actions**.

---

## 22. Number Formatting Detailed Rules

### Decimal Point Rules
| Data Type | Decimals | Example |
|-----------|----------|---------|
| Dollar amounts | integer | $48.2K, $1,520 |
| Million units | 1 decimal place | 3.8M |
| International pricing | 1 decimal place | $68.4 |
| Storage (GB) | 1 decimal place | 18.2GB, 32.0GB |
| Percentage | 1 decimal place | +12.4%, +8.2% |
| Days/people | integer | 3 days, 247 users |

### Thousand Separators
- Always use commas: `1,870` / `1,648` / `$1,520`
- Use `.toLocaleString()`

### Date Format
- TopBar date: `Day, Month D, YYYY` ("Friday, March 27, 2026")
- Chart axis: `MM/DD` ("03/20")

---

## 23. Text Wrapping Rules

### Number + Unit: Absolutely No Wrapping
**All number + unit combinations require `whitespace-nowrap`.**

```tsx
{/* ✓ Correct usage */}
<p className="... whitespace-nowrap">
  $48.2<span className="text-[18px] ms-0.5">K</span>
</p>

{/* ✗ Forbidden: displaying numbers without nowrap */}
<p className="...">$48.2K</p>
```

Applies to: hero metrics, KPI metrics, list amounts, chart prices, donut center, storage quantities — **no exceptions**.

### Wrapping Behavior by Text Type

| Text Type | Wrapping | Treatment | Example |
|-----------|----------|-----------|---------|
| Metric (number + unit) | **Forbidden** | `whitespace-nowrap` | $48.2K |
| Section title (18px) | **1 line fixed** | `whitespace-nowrap` or `truncate` | "Recent Activity" |
| Category label (12px) | **1 line fixed** | `whitespace-nowrap` | "Today's Revenue" |
| Company/name (14px) | **1 line fixed** | `truncate` allowed | "Acme Corp, Downtown" |
| Briefing title (15px) | **Up to 2 lines** | `leading-tight` | "Storage running low" |
| Briefing description (13px) | **1 line** | natural wrap | "18.2GB left (3 days)" |
| Date/annotation (13px) | **1 line** | `whitespace-nowrap` | "March 27, 2026" |
| Trend % (13-15px) | **1 line fixed** | auto (numeric) | "+12.4%" |
| Footer text (12px) | **1 line** | `text-center` | "Mobile baseline, 3km radius" |

### When Text Overflows
```tsx
{/* Long name: truncate (ellipsis) */}
<p className="text-text-primary font-bold text-[14px] truncate">
  Acme Corp, Market Street
</p>
{/* → "Acme Corp, Market St..." */}

{/* Briefing title: allow up to 2 lines, clip the rest */}
<p className="text-[15px] font-bold leading-tight line-clamp-2">
  Storage running low, consider upgrading your plan
</p>
```

### No-Wrap Mandatory List (Must Be 1 Line)
```
✓ whitespace-nowrap: numbers + units, dates, trend %, prices
✓ truncate: company names, addresses, long names
✗ Forbidden: metrics breaking to 2 lines
✗ Forbidden: labels breaking to 2 lines
```

### line-height Usage Context
| Line Height | Tailwind | Usage |
|-------------|----------|-------|
| `leading-none` (1.0) | numbers only | 36-48px metrics (tight, no line gap) |
| `leading-tight` (1.25) | short multi-line text | briefing title (up to 2 lines) |
| `leading-snug` (1.35) | titles | section title 18px |
| `leading-normal` (1.5) | body default | descriptions, annotations, captions |

---

## 24. Interaction Rules

### Clickable Elements (cursor-pointer)
| Element | Interaction | Feedback |
|---------|-------------|----------|
| TopBar icon button | Tap | Shadow change (hover) |
| Donut chart segment | Tap → select/deselect | opacity 0.3 ↔ 1 + key color change |
| Donut legend item | Tap → select/deselect | opacity 0.4 ↔ 1 + glow |
| Period toggle button | Tap → switch | bg-brand + text-white |
| Bottom nav item | Tap → page switch | text-brand |

### Hover Effect Types
| Type | Effect | Usage |
|------|--------|-------|
| Shadow change | `shadow-card` → `shadow-card-hover` | Icon buttons |
| Opacity change | `opacity 0.3 ↔ 1` | Donut segments/legend |
| Glow | `box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)` | Selected donut dot |
| Color transition | `text-disabled` → `text-brand` | Nav, toggle |

### Transition Animations
- `transition-all`: all interactive elements (combined color + shadow + opacity changes)
- `duration-300`: donut/legend (slow transition for smooth feel)
- `duration-[var(--duration-fast)]`: buttons/nav (quick feedback)

### Interaction Forbidden
```
✗ Hover/click effects on cards themselves
✗ Hover highlight on list rows
✗ Swipe gestures (except carousel)
✗ Long-press/context menus
```

---

## 25. Icon Detail Rules

### strokeWidth Rules
| Icon Size | strokeWidth | Usage |
|-----------|-------------|-------|
| 128px (watermark) | `1.5` | Hero background decoration |
| 20px (nav) | `2` | Bottom navigation |
| 18px (button) | `2.2` | TopBar icon buttons |
| 16px (badge) | `2` | KPI/hero icon badge |
| 14-16px (trend) | `2.5` | TrendingUp/Down emphasis |
| 16px (briefing) | `2.5` | Alert icon emphasis |

Rule: **The smaller the icon, the thicker the strokeWidth** (for legibility). Large icons like watermarks stay thin.

### Icon Size Context
| Context | Size | Tailwind |
|---------|------|----------|
| Bottom nav | 20px | `size-5` |
| TopBar button | 18px | `size-[18px]` |
| Hero badge interior | 18px | `size-[18px]` |
| KPI badge interior | 16px | `size-4` |
| Trend (hero) | 16px | `size-4` |
| Trend (KPI) | 14px | `size-3.5` |
| Briefing badge | 16px | `size-4` |
| Watermark | 128px | `size-32` |

---

## 26. Opacity Level Rules

| Opacity | Usage | Example |
|---------|-------|---------|
| `0.06` | Watermark (barely visible) | Hero background icon |
| `0.10` (`/10`) | Icon badge background | `bg-brand/10` |
| `0.15` | Background chart (faintly visible) | Hero background area chart |
| `0.3` | Unselected UI (donut segments) | Unselected pie slices |
| `0.4` | Unselected UI (legend text) | Unselected legend rows |
| `1.0` | Selected/active state | Default |

Rule: **The lower the number, the more decorative**; **the higher, the more informational**.

---

## 27. Layering Rules (z-index / Background Decoration)

### Card Structure with Background Decoration
```
Layer 0: Background chart   → absolute inset-0 opacity-[0.15]
Layer 1: Watermark icon      → absolute right-6 top-1/2 opacity-[0.06]
Layer 2: Content             → relative z-10
```

- Card requires `overflow-hidden` (prevents background from overflowing the card)
- Content uses `relative z-10` to sit above the background
- **Background decoration is used only in hero cards** (not in standard cards)

---

## Core Design Principles Summary

### Color (4)
1. Unity through one key color, used only for active/selected states
2. Pure #000 absolutely forbidden, #3C3C3C is the default
3. Impact colors limited to dot (6px) + text (11px) or smaller
4. Status indicators use same color for dot and text

### Typography (3)
5. Large numbers, small units, 2:1 ratio, `ms-0.5`
6. Labels are 12px uppercase + tracking-wide
7. 5-level grayscale (#2A → #3C → #6A → #7A → #9B)

### Layout (4)
8. `mx-6` = single card, `px-6` = multiple/carousel
9. `space-y-6` unified section gap
10. 4 section types (A/B/C/D)
11. Section separation through cards + spacing only (dividers forbidden)

### Information Structure (3)
12. Top → bottom information pyramid (hero → KPI → detail)
13. Maximum 4 data items per card
14. Cards are for data display (CTAs/inputs forbidden)

### Numbers (2)
15. `whitespace-nowrap` required (prevent number + unit wrapping)
16. Currency as integers, pricing/storage as 1 decimal place

### Interaction (2)
17. Only donut/toggle are interactive; cards/list rows are static
18. `transition-all` default, donut uses `duration-300`

### Details (4)
19. Background #FAFAFA (not pure white)
20. Shadow opacity 4-8%
21. 6 opacity levels (0.06-1.0) distinguished by purpose
22. Background decoration only in hero cards, `overflow-hidden` required

### Prohibitions (7)
23. No content placed directly outside cards — **all content lives inside cards**
24. No key-color background cards
25. No ad-hoc components
26. No card overlap/stacking
27. No dividers between sections
28. No CTA buttons/input fields inside cards
29. No more than 5 list items per card
---
---

# Part 2: Extended Rules — General Application + Detailed Specs

> The rules below are an extended guide for **applying this design system to any project**.

---

## 28. Scroll & Spacing Detail Rules

### Content End Spacing
| Position | Value | Reason |
|----------|-------|--------|
| Below last section | `h-8` (32px) | Breathing room at scroll end; fingers don't cover content |
| Above BottomNav | `pb-24` (96px) | Nav doesn't cover content (nav height ~56px + safety margin) |
| Below TopBar | Auto-handled by section spacing (`space-y-6`) | No extra spacing needed |

### Scroll Behavior
```
OK  TopBar: Always fixed (does not disappear on scroll)
OK  BottomNav: Always fixed (fixed bottom-0)
OK  Only main content scrolls
NO  TopBar collapse/expand (collapsible header prohibited)
NO  BottomNav hide (scroll-hide prohibited)
NO  Scroll-linked animations (parallax prohibited)
```

### Overscroll
- Background visible during iOS bounce scroll: maintain `bg-surface-page` (#FAFAFA)
- Top overscroll: page background color visible above TopBar (not white/black)
- Bottom overscroll: page background color below last spacing (h-8)

### Carousel Scroll
```css
scroll-snap-type: x mandatory;    /* Snap per card */
scroll-snap-align: start;          /* Card left-aligned */
-webkit-overflow-scrolling: touch;  /* Smooth momentum */
scrollbar-width: none;             /* Hide scrollbar */
```

---

## 29. Loading State (Skeleton) Rules

### Principle: Skeletons match the shape of final content
```
OK  Card skeleton: same p-6, rounded-2xl, shadow-card preserved
OK  Text skeleton: rounded rectangle matching actual text height/width
NO  Spinner inside a card
NO  Showing an empty card and filling it later
```

### Skeleton Style
```tsx
{/* Metric skeleton */}
<div className="h-9 w-[60%] bg-surface-muted rounded-lg animate-pulse" />

{/* Label skeleton */}
<div className="h-3 w-[40%] bg-surface-muted rounded animate-pulse" />

{/* Icon badge skeleton */}
<div className="size-7 bg-surface-muted rounded-lg animate-pulse" />
```

### Skeleton Timing
- Display delay: **300ms** (prevents flicker on fast loads)
- Minimum display: **300ms** (disappearing too fast causes visual noise)
- Animation: `animate-pulse` (1.5s cycle)

### KPI Grid Skeleton Example
```tsx
<div className="grid grid-cols-2 gap-4 px-6">
  {[1,2,3,4].map(i => (
    <div key={i} className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-7 bg-surface-muted rounded-lg animate-pulse" />
        <div className="h-3 w-16 bg-surface-muted rounded animate-pulse" />
      </div>
      <div className="h-9 w-24 bg-surface-muted rounded-lg animate-pulse mb-3" />
      <div className="h-3 w-12 bg-surface-muted rounded animate-pulse" />
    </div>
  ))}
</div>
```

---

## 30. Empty State & Error State Rules

### Empty State (0 items)
```
Centered inside card:
  Icon container (32px, bg-surface-muted, rounded-xl)
  + Icon (16px, text-text-tertiary)
  + Message (14px, text-text-secondary)
  + (Optional) Helper text (13px, text-text-tertiary)
```
- Message tone: **Conversational**, blame the system (not the user)
- Example: "No activity yet", "Data is being prepared"

### Metric at Zero
- **Display 0 as-is**: `$0`, `0%`, `0 users`
- Do not hide or replace with a dash (—)
- Trend: if 0%, hide trend icon, display only `0%` text (gray)

### Error State (data load failure)
```
Centered inside card:
  AlertCircle icon (32px, text-destructive)
  + "Couldn't load the data" (14px, text-text-secondary)
  + Retry button (ghost variant, text-brand, "Try again")
```
- If one card fails, only that card shows error; the rest display normally
- Full page failure: full-screen error (EmptyState pattern)

### Partial Data
- 1 of 4 KPIs fails: only the failed card shows error, the other 3 are normal
- Insufficient chart data: "Not enough data" text in the empty area, chart hidden

---

## 31. Negative/Decline Display Rules

### Decline Trend
| Element | Up | Down |
|---------|-----|------|
| Color | `text-success` (#6B9B7A) | `text-destructive` (#D4183D) |
| Icon | TrendingUp | TrendingDown |
| Prefix | `+` | `-` |
| Example | `+12.4%` | `-3.2%` |

### Negative Amounts
- Use minus sign: `-$1.8K` (parentheses `($1.8K)` prohibited)
- Negative amount color: `text-destructive`
- At 0: default text color (#3C3C3C), no trend icon

---

## 32. Large Numbers & Long Text Handling

### Large Number Format
| Range | Format | Example |
|-------|--------|---------|
| up to 9,999 | Comma + $ | $3,500 |
| 10,000 - 999,999 | K (dollars) | $18.7K, $999K |
| 1,000,000+ | M (dollars) | $3.8M, $12.5M |
| 1,000,000,000+ | B (dollars) | $1.2B |

### When Numbers Overflow the Card
- Bump the unit up one level: `$18,700,000` -> `$18.7M`
- If still overflowing: reduce decimals `$3.84M` -> `$3.8M`
- **Never shrink font size** (preserve 2:1 ratio)

### Long Names/Text
| Element | Max Length | On Overflow |
|---------|-----------|-------------|
| Company name (14px) | ~12 chars | `truncate` (ellipsis ...) |
| Section title (18px) | ~10 chars | `truncate` |
| Briefing title (15px) | ~20 chars | `line-clamp-2` (2 lines) |
| Briefing description (13px) | ~25 chars | 1 line, `truncate` on overflow |
| Label (12px) | ~6 chars | Always 1 line, use abbreviation |

---

## 33. CJK Typography Notes

> These rules apply primarily to Korean, Chinese, and Japanese text. For Latin-only projects, some rules (like `keep-all` word-break) can be adjusted or omitted.

### word-break Rules
```css
body {
  word-break: keep-all;      /* CJK: wrap at word boundaries (spaces) */
  overflow-wrap: break-word;  /* Handle long English URLs etc. */
}
```
- CJK text: line breaks at word (space) boundaries (no mid-syllable breaks)
- Latin/numbers: word-level breaks; very long strings use break-word

> **Latin-only note:** For projects using only Latin scripts, `word-break: normal` is usually sufficient. The `keep-all` rule is specifically designed to prevent mid-word breaks in CJK text.

### CJK Minimum Readable Sizes
| Size | Allowed Content | Prohibited |
|------|----------------|------------|
| 10px | Numbers, Latin abbreviations (GB, %) | CJK sentences |
| 11px | Short status text (2-3 chars: "Done") | CJK descriptions |
| 12px | Labels (medium weight or above required) | Thin (400) CJK text |
| 13px+ | All CJK text OK | -- |

### Mixed Number + CJK Text
- "March sales" -> wrap with `whitespace-nowrap` so the number doesn't get orphaned
- "8th of 12" -> maintain space between numbers and CJK characters

### CJK Font Metric Correction Rules (Pretendard)

Pretendard (a CJK font) has a **taller ascender than Latin fonts**, which causes more space above the text.
`leading-none` alone may not achieve visual centering.

> **Latin font note:** When using Latin-only fonts (e.g., Inter, SF Pro), these corrections are generally unnecessary. The metric offsets below apply specifically to CJK fonts like Pretendard, Noto Sans CJK, or similar typefaces with tall ascenders.

#### Problem
```
+--------------------+
|   <- more space     |
|   $18.7K            |  <- visually shifted downward
|                     |
+--------------------+
```

#### Correction Methods

**1. Large metric numbers (36-48px) -- `pt` correction**
```tsx
{/* Before correction: more space above than below */}
<p className="text-[36px] font-bold leading-none">$18.7M</p>

{/* After correction: pt-0.5 ~ pt-1 for visual centering */}
<p className="text-[36px] font-bold leading-none pt-0.5">$18.7M</p>
```

**2. Vertical alignment in cards -- aligning with icon badges**
```tsx
{/* When icon badge (28px) and label (12px) are slightly misaligned */}
<div className="flex items-center gap-2 mb-3">
  <div className="size-7 rounded-lg bg-brand/10 flex items-center justify-center">
    <Icon className="size-4 text-brand" />
  </div>
  <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.05em] translate-y-[0.5px]">
    Today's Sales
  </p>
</div>
```

**3. Button text -- `leading-none` + micro correction**
```tsx
{/* When button text shifts upward in Pretendard */}
<Button className="pt-[1px]">Place order</Button>
```

#### Correction Value Guide
| Text Size | Correction | Tailwind |
|-----------|-----------|----------|
| 48px (hero) | ~2px up | `pt-0.5` |
| 36px (KPI) | ~1.5px up | `pt-0.5` |
| 18px (heading) | No correction needed | -- |
| 14-16px (body) | No correction needed | -- |
| 12px (label) | 0.5px relative to adjacent element | `translate-y-[0.5px]` |

#### Rules
- Corrections are **only noticeable at large sizes (36px+)**. Below 14px, usually unnecessary
- Use `pt-0.5` (2px) or `translate-y-[0.5px]` for micro adjustments
- **Labels next to icons** require visual verification after `items-center` alignment
- When using Inter (Latin) only, corrections are unnecessary -- **only applies when using Pretendard or similar CJK fonts**
- Correction values should be **applied individually after visual inspection**, not globally

---

## 34. Microcopy Tone Guide

### Conversational Tone

A casual-but-polite conversational tone. In English, this means friendly, direct language that avoids corporate stiffness while remaining respectful.

#### Casual vs Formal Tone
```
OK  "Couldn't load the data"
NO  "An error has occurred while retrieving the requested data"

OK  "Please try again"
NO  "Please retry the operation"

OK  "No activity yet"
NO  "No data records found"
```

### Error Messages: Blame the System
```
OK  "Your connection seems unstable"
NO  "A network error has occurred"

OK  "Give it another moment and try again"
NO  "Error 500: Internal Server Error"
```

### Empty States: Suggest the Next Action
```
OK  "No activity yet. Try creating your first entry."
NO  "No data"
```

### Labels/Titles: Use Noun Phrases
```
OK  "Sales Overview", "Inventory Status", "Recent Orders"
NO  "Check your sales", "Verify inventory"
```

---

## 35. Toast / Feedback Rules

### Toast Position & Style
```
Position: Bottom of screen, above BottomNav (bottom-[calc(env(safe-area-inset-bottom)+80px)])
Style: bg-[#2A2A2A] text-white rounded-2xl px-5 py-3.5 shadow-elevated
Text: 15px medium, max 2 lines (line-clamp-2)
```

### Toast Timing
| Type | Display Duration | Example |
|------|-----------------|---------|
| Info | 3 seconds | "Saved successfully" |
| With action | 5 seconds | "Deleted. Undo" |

### Toast Animation
- Enter: `translateY(20px)` -> `0` + fade in, `duration-normal` + `ease-out`
- Exit: fade out only, `duration-fast`
- Only 1 toast at a time; new toast immediately replaces the previous one

---

## 36. Modal / Sheet Rules

### Bottom Sheet (detail view, filters, etc.)
```
Size: 50% of screen (default) / 25% (small confirmation) / 90% (large content)
Corners: rounded-t-2xl (top only, 16px radius)
Handle: w-10 h-1 bg-surface-muted rounded-full mx-auto mt-3
Backdrop: bg-black/40 backdrop-blur-sm
Close: backdrop tap, swipe down, X button
```

### Modal vs Page Decision Criteria
| Content | UI Choice |
|---------|-----------|
| Confirmation/warning (short text) | **Bottom sheet (25%)** |
| Filter/date picker | **Bottom sheet (50%)** |
| Detailed info (needs scroll) | **Full page push** |
| Settings | **Full page push** |

---

## 37. Viewport & Responsive Rules

### Default: 430px Mobile Fixed
```
max-w-[430px] mx-auto    /* Center when exceeding 430px */
min-h-screen              /* Minimum screen height */
bg-surface-page           /* Page background outside 430px */
```

### Screens Exceeding 430px (Tablet/Desktop)
- Cards and content **stay within 430px as-is**
- Area outside 430px: `bg-surface-page` (#FAFAFA) or `bg-background` (#FFF)
- No font/padding scaling -- maintain mobile proportions
- **Desktop sidebar/multi-column layouts are outside this system's scope** (design separately)

### Safe Area Handling
```
TopBar:    pt-safe (top notch/Dynamic Island)
BottomNav: pb-safe (bottom home indicator)
Content:   Automatic (pb-24 provides sufficient clearance)
```
- `viewport-fit=cover` required (set in index.html)
- Left/right safe areas: currently unused (430px container handles this naturally)

---

## 38. Chart Type Selection Guide

### When to Use Which Chart

| Data Characteristic | Chart Type | Reason |
|--------------------|------------|--------|
| Change over time | **Area chart** | Visualize trend as filled area |
| Compare items (by period) | **Bar chart** | Optimal for size comparison |
| Part-to-whole ratio | **Donut chart** | Visualize composition |
| Simple progress (%) | **Progress bar** | Express 0-100% |
| Achievement (n/N) | **Segment bar** | Express discrete progress |
| Single key figure | **Large number (metric)** | Number is more effective than chart |

### Chart Prohibitions
```
NO  3D charts
NO  Dual-axis charts (dual Y-axis)
NO  Stacked bar charts
NO  Radar/radial charts
NO  More than 1 chart per card
```

---

## 39. Notification Severity (4 Levels)

| Severity | Background | Left Border | Icon | Text Color | Example |
|----------|-----------|-------------|------|-----------|---------|
| Critical | `destructive/8` | 4px `destructive` | AlertCircle | `text-destructive` | Storage depleted |
| Warning | `warning/8` | 4px `warning` | AlertTriangle | `text-warning` | Price change |
| Info | `info/8` | 4px `info` | Info | `text-info` | Goal achievement |
| Success | `success/8` | 4px `success` | CheckCircle | `text-success` | Delivery complete |

### Inline Notification Structure
```tsx
<div className="rounded-xl p-4 bg-destructive/8 border-l-4 border-destructive">
  <div className="flex items-center gap-2">
    <AlertCircle className="size-4 text-destructive" />
    <span className="text-[14px] font-medium text-destructive">Storage warning</span>
  </div>
</div>
```

### Inline vs Toast Decision
| Situation | UI |
|-----------|-----|
| Data-related warning (inventory, price) | **Inline** (inside the relevant card) |
| Action result confirmation (save, delete) | **Toast** |
| Connection status change | **Toast** |
| System maintenance | **Page-top banner** |

---

## 40. Design System Application Guide

### Applying to Other Projects

#### Step 1: Change Key Color
```css
:root {
  --brand: /* your brand color here */;  /* <- Change only this to shift the entire tone */
}
```
- Changing just the key color updates: icon badges, progress, toggles, nav -- everything
- Keep the rest of the grayscale **as-is** (works with any key color)

#### Step 2: Domain Adaptation
| Original (Generic) | E-Commerce App | Healthcare App | Finance App |
|--------------------|---------------|----------------|-------------|
| Sales Hero | Sales Hero | Steps Today | Total Assets |
| 4 KPIs | Orders/Shipping/Returns/Visits | Heart Rate/BP/Sleep/Calories | Income/Expenses/Savings/Investments |
| Inventory Donut | Category Breakdown | Nutrient Ratio | Asset Allocation |
| Price Chart | Sales Trend | Weight Change | Returns Trend |
| Order List | Recent Orders | Recent Records | Recent Transactions |
| Competitor Ranking | Popular Products | Rankings | Fund Returns |

#### Step 3: Keep the Structure
```
The page structure stays the same for any project:
1. TopBar (logo + actions)
2. Hero card (the single most important metric)
3. KPI grid (2-4 key indicators)
4. Detail sections (charts, lists, donuts)
5. BottomNav (3-5 tabs)
```

#### Step 4: Do NOT Change These
```
NO  5-level grayscale modification
NO  Card radius (rounded-2xl)
NO  Card shadow (opacity 4%)
NO  Section spacing (space-y-6)
NO  Number + unit 2:1 ratio
NO  Label uppercase + tracking
NO  Page background #FAFAFA
```
These are the **essence of the design system**. Changing only the key color and domain maintains a unified feel.

---

## 41. Accessibility Essentials

### Touch Targets
- All interactive elements: minimum **44x44px** tap area
- Visual size can be smaller (28px icon) -- use invisible padding to reach 44px
- Minimum **8px** gap between adjacent touch targets

### Color Contrast (WCAG AA)
- Body text: **4.5:1** or higher (#3C3C3C on #FFF = 9.7:1 OK)
- Large text (18px+): **3:1** or higher
- **Never convey information through color alone** -- pair with icon/text (status dot + text)

### Screen Reader
- Charts must have `aria-label` describing the data
- Toasts require `role="status"` + `aria-live="polite"`
- Numbers: provide `aria-label` with spoken form (e.g., `aria-label="eighteen point seven million dollars"`)

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
- Skeleton pulse animation also stops
- Number counting animation -> show final value immediately
- Color transitions are preserved (not considered motion)

---

## 42. Tab & Navigation Details

### Bottom Nav Rules
| Property | Value |
|----------|-------|
| Max tabs | **5** (4 recommended) |
| Icon size | 20px |
| Label size | 10px semibold |
| Active color | `text-brand` |
| Inactive color | `text-text-disabled` (#9B9B9B) |
| Notification badge | Top-right of icon `size-1.5 bg-alert-badge` |
| Re-tap active tab | **Scroll to top of page** |

### Page Transitions
- Tab switch: **Instant** (no animation)
- Sub-page push: right-to-left slide (`duration-moderate` 300ms, `ease-out`)
- Back navigation: left-to-right slide
- Modal/sheet: bottom-to-top slide

### Back Button
```
Position: TopBar left
Icon: ChevronLeft, 24px, text-text-primary
Tap area: 44x44px
```

---

## 43. Animation Details (Motion Choreography)

### Page Entry Stagger
```
Card 1: 0ms    delay, opacity 0->1 + translateY(12px)->0
Card 2: 50ms   delay
Card 3: 100ms  delay
Card 4: 150ms  delay
...
duration: 200ms (duration-normal)
easing: ease-out
```
- KPI grid (4 cards): top-left -> top-right -> bottom-left -> bottom-right order
- With `prefers-reduced-motion`: instant opacity 1, no translateY

### Number Counting (Hero Metric Only)
- 0 -> final value, 600ms, `ease-out`
- Only on initial load (repeats on refresh, does NOT repeat on tab switch)
- With `prefers-reduced-motion`: show final value immediately

### Animation Prohibitions
```
NO  Scroll-linked animations (parallax, shrinking header)
NO  Pill toggle sliding (selection sliding effect)
NO  Card zoom in/out
NO  Infinite loop animations (except skeleton pulse)
```

---

## 44. Input & Form Rules (When Used Outside Cards)

> No input fields inside cards. If a form is needed, use a **separate page or bottom sheet**.

### Input Field Style
```
Default:  bg-input-background (#F3F3F5) border-transparent rounded-xl h-12 px-4 text-[16px]
Focus:    border-brand ring-2 ring-brand/20 bg-card
Error:    border-destructive ring-2 ring-destructive/20 bg-card
Disabled: opacity-50 cursor-not-allowed
```
- **16px required** (prevents iOS zoom on input focus)
- Label: above input `text-[13px] font-medium text-text-secondary mb-2`
- Error message: below input `text-[12px] text-destructive font-medium mt-1.5`

### Validation Timing
- **Validate on blur** (not during typing)
- For CJK IME: validate after `compositionend` event (no validation during composition)

---

## 45. Dark Mode Guide

### Core Principle: Maintain Card-to-Background Contrast
The relationship between card (#FFFFFF) and background (#FAFAFA) in light mode must preserve the **same sense of depth** in dark mode.
Cards must be **brighter than background** for visual section separation.

```
Light:  background #FAFAFA  ->  card #FFFFFF     (card is brighter OK)
Dark:   background #121212  ->  card #1E1E1E     (card is brighter OK)

NO: background #1A1A1A -> card #1A1A1A  (same color = card invisible)
NO: background #1E1E1E -> card #121212  (card is darker = inverted)
```

### Background Levels (Depth Through Brightness)
| Level | Hex | Usage | Light Mode Equivalent |
|-------|-----|-------|----------------------|
| 0 (furthest back) | `#121212` | Page background (`--surface-page`) | #FAFAFA |
| 1 | `#1E1E1E` | Card background (`--card`) | #FFFFFF |
| 2 | `#252525` | List row / sub-card (`--surface-subtle`) | #FAFAF9 |
| 3 | `#2C2C2C` | Floating / modal | -- |

**Brightness gap between levels: at least `#0C0C0C` (12 steps)**
Each level must be noticeably brighter than the previous, distinguishable by eye.

### Card Distinction: Shadow -> Border Transition
Light mode uses `shadow-card` for card separation, but shadows are invisible in dark mode.
**In dark mode, use a subtle border for card edges:**
```css
.dark {
  --shadow-card: none;
  --card-border: 1px solid rgba(255, 255, 255, 0.06);
}
```
```tsx
{/* Card in dark mode */}
className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]
  dark:border dark:border-white/6"
```

### Dark Mode CSS Variable Full Mapping
```css
.dark {
  /* Background & Surface */
  --surface-page: #121212;
  --card: #1E1E1E;
  --surface-subtle: #252525;
  --surface-muted: rgba(255, 255, 255, 0.08);
  --brand-tint: rgba(114, 31, 229, 0.15);

  /* Text Hierarchy */
  --text-primary: #E0E0E0;
  --text-secondary: #A0A0A0;
  --text-tertiary: #808080;
  --text-disabled: #555555;
  --icon-default: #909090;

  /* Key Color & Status (brightened) */
  --brand: #9B5FFF;
  --success: #8FBF9A;
  --destructive: #FF5C5C;
  --warning: #FFB347;
  --info: #64B5F6;

  /* Border */
  --border: rgba(255, 255, 255, 0.08);
  --alert-badge: #FF5C5C;

  /* Shadow -> Border replacement */
  --shadow-card: none;
  --shadow-button: none;
}
```

### Dark Mode Checklist
- [ ] Is card background (#1E1E1E) brighter than page background (#121212)?
- [ ] Do cards have `dark:border dark:border-white/6` border?
- [ ] Is list row background (#252525) brighter than card background (#1E1E1E)?
- [ ] Is the key color switched to the bright version (#9B5FFF)?
- [ ] Are all 5 text levels inverted to bright colors?
- [ ] Is the progress track `rgba(255,255,255,0.08)`?
- [ ] Are card boundaries expressed with borders instead of shadows?

### Dark Mode Prohibitions
```
NO  Pure #000000 background (use #121212 even considering OLED burn-in)
NO  Reusing light mode shadows in dark (they're invisible)
NO  Making key color darker in dark mode -- must go brighter
NO  Using same color for card and background (contrast difference required)
NO  Running dark mode without card borders (shadows alone are invisible)
```

---

## 46. Button Design Rules

> Based on the design system + Seed Design official specs.
> Core principle: **not pill but appropriate radius**, **150ms color transition**, **pressed = one step darker**.

### Button Variants (7 Types)

| Variant | Background | Text | Pressed | Usage |
|---------|-----------|------|---------|-------|
| `default` (brandSolid) | `bg-brand` | white | `bg-brand/85` | **Primary CTA** (key color) |
| `neutral` (neutralSolid) | `bg-[#2A2A2A]` | white | `bg-[#3C3C3C]` | Emphasis button (dark background) |
| `secondary` (neutralWeak) | `bg-[#F3F4F5]` | text-primary | `bg-[#EAEBEC]` | Secondary button (light background) |
| `destructive` (criticalSolid) | `bg-destructive` | white | `bg-destructive/85` | Dangerous action (delete, etc.) |
| `outline` | transparent + border | text-primary | `bg-surface-muted/50` | Bordered button |
| `ghost` | transparent | text-primary | `bg-surface-muted/50` | Minimal button |
| `brandGhost` | transparent | `text-brand` | `bg-brand/8` | Key color text (retry, etc.) |

### Button Sizes (4 Levels)

| Size | Height | Radius | Text | Padding X | Icon | Usage |
|------|--------|--------|------|----------|------|-------|
| `xs` | **32px** | **pill** (`rounded-full`) | 13px bold | 14px | 14px | Chips, tags, filters |
| `sm` | **36px** | **10px** (`rounded-lg`) | 14px bold | 14px | 14px | Inline secondary |
| `md` | **40px** | **10px** (`rounded-lg`) | 14px bold | 16px | 16px | **Default button** |
| `lg` | **52px** | **14px** (`rounded-xl`) | 18px bold | 20px | 22px | **Large CTA** |
| `icon` | **40px** | **pill** (`rounded-full`) | -- | -- | 18px | TopBar icons |

Key point: **Only xs is pill (fully rounded)**. sm/md are 10px (`rounded-lg`), lg is 14px (`rounded-xl`). Buttons are NOT all pill-shaped.

### Button States

| State | Effect | Transition |
|-------|--------|-----------|
| Default | See variant table above | -- |
| Pressed/Active | Background color **one step darker** | `150ms` ease |
| Disabled | `bg-surface-muted text-text-disabled` | -- |
| Focus | `ring-2 ring-brand/20` | -- |
| Loading | Text -> spinner (16px) swap, size preserved, clicks blocked | -- |

```
NO  active:scale (shrink effect) -- use color change only
NO  hover:bg-{color}/90 (darken via opacity) -- use a distinct darker shade
OK  active:bg-brand/85 (slightly darker on press)
```

### Primary CTA Placement Rules

**On dashboards**: No CTA buttons in principle (data-viewing pages).

**When CTA is needed on other pages**:
```tsx
{/* Fixed bottom CTA (BottomCTA pattern) */}
<div className="fixed bottom-0 left-0 right-0 px-4 pb-safe bg-card/80 backdrop-blur-lg">
  <div className="mx-auto max-w-[430px] py-3">
    <Button size="lg" className="w-full">Place order</Button>
  </div>
</div>

{/* Inline CTA (outside card, page level) */}
<div className="px-6">
  <Button size="lg" className="w-full">Place order</Button>
</div>
```

| Property | Value |
|----------|-------|
| Height | `h-[52px]` (lg) |
| Width | `w-full` |
| Corners | `rounded-xl` (12px) |
| Text | 18px bold white |
| Background | `bg-brand` |
| When fixed to bottom | `backdrop-blur-lg bg-card/80` + `pb-safe` |

### Button Combination Patterns

#### Primary + Secondary (Side by Side)
```tsx
<div className="flex gap-3 px-6">
  <Button variant="secondary" size="lg" className="flex-1">Close</Button>
  <Button size="lg" className="flex-1">Confirm</Button>
</div>
```
- `gap-3` (12px) spacing
- `flex-1` for equal width
- Primary (key color) on the **right**, Secondary (gray) on the **left**

#### Button + Text Link
```tsx
<div className="flex flex-col items-center gap-4 px-6">
  <Button size="lg" className="w-full">Get started</Button>
  <Button variant="brandGhost" size="sm">Maybe later</Button>
</div>
```

### Icon Button (TopBar Style)
```tsx
<button className="relative size-10 rounded-full bg-card shadow-[var(--shadow-button)]
  flex items-center justify-center
  active:bg-surface-muted/50 transition-colors duration-150
  focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  <Bell className="size-[18px] text-icon-default" strokeWidth={2.2} />
</button>
```
| Property | Value |
|----------|-------|
| Size | `size-10` (40px) |
| Corners | `rounded-full` (circle) |
| Background | `bg-card` (white) |
| Shadow | `shadow-button` (0.06 opacity) |
| Icon | 18px, `text-icon-default` (#4A5568), strokeWidth 2.2 |
| Pressed | `active:bg-surface-muted/50` (color change only) |
| Notification badge | `absolute top-1 right-1 size-1.5 bg-alert-badge rounded-full` |

### Button Spacing & Layout
| Rule | Value |
|------|-------|
| Button-button horizontal gap | `gap-3` (12px) |
| Button-button vertical gap | `gap-4` (16px) |
| Button-content gap | `mt-6` (24px) |
| Fixed bottom CTA safe area | `pb-safe` + `py-3` |
| Screen left/right margin | `px-4` (16px, global-gutter) or `px-6` (24px) |

### Button Prohibitions
```
NO  CTA button inside cards (on dashboards)
NO  active:scale shrink effect (use color transition only)
NO  Gradient backgrounds on buttons
NO  Multi-line text inside buttons
NO  Icon + text together at sm or smaller sizes
NO  More than 1 Primary CTA per screen
```

---

## 47. Badge & Tag Design Rules

### Badge Types (3 Kinds)

#### 1. Status Badge (dot + text)
```tsx
<div className="inline-flex items-center">
  <span className="size-1.5 rounded-full me-1.5" style={{ backgroundColor: color }} />
  <span className="text-[11px] font-bold" style={{ color }}>Complete</span>
</div>
```
- Dot 6px + text 11px bold
- Dot and text are the **same color**
- Gap `me-1.5` (6px)

#### 2. Label Badge (uppercase)
```tsx
<span className="text-[12px] font-bold uppercase tracking-[0.05em]"
  style={{ color: badgeColor }}>
  URGENT
</span>
```
- 12px bold uppercase + tracking
- Used with icon (16px) (`gap-1.5`)
- Color: based on severity (#C85A54 urgent, #7A7A7A notice/info)

#### 3. Pill Badge
```tsx
<span className="px-2 py-0.5 bg-brand text-white text-[9px] font-bold
  rounded uppercase tracking-wider">
  MY WORKSPACE
</span>
```
| Property | Value |
|----------|-------|
| Padding | `px-2 py-0.5` |
| Background | `bg-brand` (key color) |
| Text | 9px bold white uppercase |
| Corners | `rounded` (4px) |

### Badge Usage Principles
```
OK  Badges always appear as a supplement alongside another element (name, list row)
NO  Badge used alone
NO  Icon + text together inside a badge (pill badge)
NO  Large badges (h-8 or above)
```

---

## 48. Divider & Border Detail Rules

### Divider Usage (Only Where Allowed)
| Position | Style | Spacing |
|----------|-------|---------|
| Inside card: between chart and stats | `border-t border-surface-muted` | Above `pt-5`, below `mt-6` |
| Top of BottomNav | `border-t border-surface-muted` | None |

### Divider Prohibitions
```
NO  Between sections (use cards + space-y-6 for separation)
NO  Between list items (use space-y-3 for separation)
NO  Card borders (use shadow for separation)
NO  Vertical dividers
```

### Border Usage
| Purpose | Style |
|---------|-------|
| Highlighted row | `border-2 border-brand` (selected item) |
| Input focus | `border-brand ring-2 ring-brand/20` |
| Input error | `border-destructive ring-2 ring-destructive/20` |
| Notification left | `border-l-4 border-{severity}` |

**No borders in the default state.** Separating cards with shadow is the design principle.

---

## 49. UX Writing Details (Conversational Tone)

> Principles for a casual-but-polite voice and tone. An extension of section 34 (Microcopy Tone).

### 1. Conversational Tone -- No Exceptions
Use a friendly, conversational voice everywhere. No context is too serious for clear, human language.
```
OK  "Your order is complete"
NO  "Your order has been successfully processed"
```

### 2. Active Voice
```
OK  "We completed your order" (active)
NO  "Your order has been completed" (passive) -- only allowed in result notifications

OK  "Sending your verification code"
NO  "A verification code has been dispatched"

OK  "Applying your discount"
NO  "The discount has been applied"
```
Prefer active constructions: put the action front and center.

### 3. Positive Framing
```
OK  "Free shipping on orders over $30"
NO  "Orders under $30 have a shipping fee"

OK  "Connect to Wi-Fi for a faster experience"
NO  "Your internet connection is unstable"
```
Even error messages should be positive: always include a resolution path.

### 4. Casual but Polite
```
OK  "What's your name?"               NO  "Would you kindly provide your full name?"
OK  "Let us check"                     NO  "We shall verify this for you"
OK  "Send to Alex"                     NO  "Initiate transfer to Mr. Alexander"
```
Strip out unnecessary formality. Be direct and warm.

### 5. Plain Language Over Jargon
```
OK  "Check who's sending this"         NO  "Verify sender identity"
OK  "Send money"                       NO  "Initiate remittance"
OK  "Please try again"                 NO  "Retry"
```

### 6. CTA Button Label Rules
```
OK  "Place order"   -- action is clear
OK  "Confirm"       -- outcome is clear
OK  "Get started"   -- next step is clear
NO  "Protect your health with fresh ingredients" -- description, not an action
NO  "Get benefits"  -- too vague
```
- CTAs must **clearly state what happens next**
- No exaggerated/redundant helper text above the CTA
- One CTA per screen is the principle (secondary buttons are separate)

### 7. Dialog Button Rules
```
Left: "Close" (fixed)
Right: Action CTA ("Confirm", "Delete", etc.)

NO  Using "Cancel" on the left
    -> Users may think their in-progress work is being cancelled
```

---

## 50. Dark Pattern Prevention Rules

> These are **launch-blocking** violations per UX best practices.

### Absolute Prohibitions
```
NO  Bottom sheet (ad, notification consent) shown immediately on service entry
NO  Exit-prevention bottom sheet on back navigation
NO  Screen with no reject option (CTA only, no close/cancel)
NO  Full-screen ad appearing at unexpected moments
NO  CTA label so vague that the next action is unpredictable
```

### Correct Patterns
```
OK  Service entry -> show main content immediately
OK  Notification consent -> request when the user naturally feels the need
OK  Bottom sheet always closable via "Close" or backdrop tap
OK  CTA label = action verb + clear outcome
```

---

## 51. Graphic Resource Usage Principles

### Icon Usage Rules
- Size: use within **24-40px** range
- Use only **1** icon/emoji at a time (no parallel placement of 2+)
- Icons are for **UI function** purposes only

### Graphic Usage Principles
| Principle | Description |
|-----------|-------------|
| Context-appropriate | Serves to aid screen meaning, not decoration |
| Size matches info density | Simple graphics small, detailed graphics large |
| One hero per screen | Multiple same-sized graphics -> scattered attention |
| Don't obscure key info | Graphics must not push out text/CTA |
| No negative emotions | Begging/pleading/discomfort = dark pattern |
| No decorative effects | Particles, excessive gradients, meaningless effects |

### Graphic Style
```
OK  Simple, clear, clean digital style
NO  Hand-drawn feel
NO  Painterly / lyrical style
NO  Cartoon-style illustration
NO  Low-resolution graphics
NO  Particles / tiny effects
```

### Dark / Light Mode Support
- Graphics must **look good in both modes**
- Avoid colors that are too bright or too dark
- Use **mid-tone** color palettes

---

## 52. Design Reference Width & Resolution

### Reference Width
| System | Reference Width | Description |
|--------|----------------|-------------|
| Reference (375px) | **375px** | Based on iPhone SE/8 |
| This Design System | **430px** | Based on iPhone Pro Max |

- The 375px reference is common but our Figma original is designed at 430px
- Screens exceeding 430px: `max-w-[430px] mx-auto` center alignment
- Screens below 430px: content scales down naturally (watch for fixed px elements)

### Asset Resolution
- **1x + 2x** preparation is sufficient (3x only when graphic quality is critical)
- No excessive resolution group management (increases memory, loading delays)

### Test Device Guide
- **2-3** devices with different aspect ratios
- **1** device with large Safe Area (iPhone 15 Pro, etc.)
- **1** small screen device (iPhone SE / compact Android)

---

## 53. Component Composition & Screen Structure Principles

### Screen Composition Order
```
1. Navigation (TopBar) -- required, top of every screen
2. Hero / Main content -- the most important information
3. Supporting sections -- grouped in cards with space-y-6
4. BottomNav or BottomCTA -- bottom of screen
```

### Component Composition Prohibitions
```
NO  SectionCard inside SectionCard (nested cards)
NO  StatCard inside HeroCard (card within card)
NO  Carousel inside carousel
NO  Bottom sheet inside bottom sheet
```

### Component Padding Rules
- Most design system components have **built-in padding**
- They look natural even without gap
- When spacing adjustment is needed, use **auto-layout gap**

### When Creating Custom Components
- Must **harmonize** with other design system components
- No arbitrary cropping / color correction / shape distortion
- Solve with existing pattern combinations when possible

---

## 54. Segment Control Rules

Separate from Pill Toggle (section 10) -- a **tab-style control for selecting one of several options**.

### Style
```
Container: bg-surface-muted rounded-xl p-1 gap-1
Active segment: bg-card text-text-primary shadow-card
Inactive segment: bg-transparent text-text-disabled
```

### Sizes
| Size | Height | Text | Radius | Usage |
|------|--------|------|--------|-------|
| sm | 28px | 12px | `rounded-md` | Compact (chart filters) |
| md | 36px | 14px | `rounded-lg` | Default |

### Pill Toggle vs Segment Control
| | Pill Toggle | Segment Control |
|-|-------------|----------------|
| Active style | `bg-brand text-white` | `bg-card text-text-primary shadow` |
| Usage | Key color emphasis needed (period switch) | Neutral switching (filter, view mode) |
| Option count | 2-3 | 2-5 |

---

## 55. Drawer (Side Panel) Rules

### Structure
```
Backdrop: bg-black/40 backdrop-blur-sm
Panel: bg-card shadow-modal, fixed left or right
Header: px-6 py-4 border-b border-surface-muted, title + X close
Content: p-6 overflow-y-auto
Footer (optional): px-6 py-4 border-t border-surface-muted
```

### Transition Animation
- Open: `translateX(100%) -> 0` (right side), `duration-moderate` (300ms)
- Close: `0 -> translateX(100%)`, same duration
- Backdrop: `opacity 0->1`, `duration-normal` (200ms)

### Use Cases
- Detail view (list item -> side detail)
- Filter panel
- Settings panel

### Drawer vs Bottom Sheet vs Full Page
| Content | UI |
|---------|-----|
| Simple confirmation/selection | Bottom sheet |
| Detail data (minimal scroll) | **Drawer** |
| Complex form / long content | Full page push |

---

## 56. Dialog Detail Rules (ConfirmModal)

### Structure
```
Backdrop: bg-black/40 backdrop-blur-sm, tap to close
Card: bg-card rounded-2xl p-5 max-w-sm mx-4 shadow-modal
Title: 16px semibold text-text-primary, center-aligned
Message: 14px normal text-text-secondary, center-aligned
Buttons: horizontal layout, gap-2, both flex-1
```

### Button Rules
```
Left: "Close" -- outline style (border-brand text-brand bg-card)
Right: Action CTA -- solid style (bg-brand text-white)
```
- Button corners: `rounded-full` (pill)
- Height: `h-11` (44px)
- **Do NOT use "Cancel" on the left** -> use "Close" consistently

### Dangerous Action Dialog
```
Right button: bg-destructive text-white ("Delete")
Left button: same ("Close")
```

---

## 57. Custom Icon Creation Rules

### Seed Icon System (`icons/index.tsx`)
- A **self-contained SVG icon library** usable without Lucide
- 24x24 viewBox, stroke-based, inherits `currentColor`

### Icon API
```tsx
import { Bell, Search, Close } from "@/icons"

<Bell size={18} color="var(--icon-default)" strokeWidth={2.2} />
<Search size={20} className="text-text-tertiary" />
```

### Rules for Adding New Icons
```tsx
export function MyIcon({ size = 24, color = "currentColor", strokeWidth = 2, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="..." />
    </svg>
  )
}
```
- **Must** use 24x24 viewBox
- **Must** be stroke-based (fill-based prohibited, except special cases)
- **Must** default to `currentColor` (inherits parent text-color)
- **Must** use `strokeLinecap="round" strokeLinejoin="round"`

### Lucide vs Custom Decision Criteria
| Situation | Choice |
|-----------|--------|
| Available in seed icons | **Custom** first |
| Not available | **Lucide** is OK |
| Project-specific special icons | Add as custom |

---

## 58. TypeScript Token Usage Rules

### `tokens.ts` -- TS Object Synced with CSS Variables

CSS variables are for Tailwind classes; TS tokens are for **dynamic styling**:

```tsx
// OK: Tailwind classes (static styles -- most cases)
<div className="text-text-primary bg-surface-page" />

// OK: TS tokens (dynamic styles -- chart colors, conditionals, etc.)
import { tokens } from "@/tokens"
<Bar fill={isMax ? tokens.colors.brand : tokens.colors.surface.muted} />
<div style={{ boxShadow: tokens.shadows.card }} />
```

### Usage Criteria
| Situation | Method |
|-----------|--------|
| Static classes | Tailwind (`text-brand`, `bg-card`) |
| Recharts / chart colors | `tokens.colors.*` |
| Inline style needed | `tokens.*` |
| Conditional colors | `tokens.colors.*` |
| CSS-in-JS values | `tokens.*` |

---

## 59. Animation Wrapper Rules (Framer Motion)

### Framer Motion Usage Patterns
```tsx
import { motion, AnimatePresence } from "framer-motion"

// Modal enter/exit
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  )}
</AnimatePresence>

// Card entry (stagger)
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, delay: index * 0.05 }}
/>

// Button tap
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1 }}
/>
```

### Motion Token Mapping
| CSS Token | Framer Motion | Usage |
|-----------|---------------|-------|
| `--duration-fast` (100ms) | `duration: 0.1` | Tap, hover |
| `--duration-normal` (200ms) | `duration: 0.2` | Entry, fade |
| `--duration-moderate` (300ms) | `duration: 0.3` | Slide, Drawer |
| `--ease-spring` | `type: "spring", damping: 25, stiffness: 300` | Modal entry |

### Motion Prohibitions
```
NO  CSS transition and Framer Motion on the same element simultaneously
NO  duration exceeding 0.5s (too slow)
NO  Full-page animations (only partial elements)
NO  Scroll-linked motion
```

---

## 60. Formatting Utility Rules

### `utils/format.ts` Usage

```tsx
import { formatCurrency, splitNumberUnit, formatPercent, formatDate, formatRelativeTime } from "@/utils/format"

// Currency
formatCurrency(38000)        // "$38K"
formatCurrency(3800000)      // "$3.8M"

// Number + unit separation (for JSX)
const { number, unit } = splitNumberUnit(18700000)
<p className="text-[36px]">{number}<span className="text-[18px]">{unit}</span></p>

// Trend
formatPercent(12.4)          // "+12.4%"
formatPercent(-3.2)          // "-3.2%"

// Date
formatDate(new Date())       // "Tuesday, April 1, 2026"
formatRelativeTime(date)     // "3 min ago" / "Yesterday" / "Mar 20"
```

### Formatting Principles
- **Always use utility functions for display formatting** (no direct `.toLocaleString()` calls)
- Automatic currency unit conversion: K -> M -> B
- Relative time switches to absolute date after 7 days
- Date ranges: use en-dash (`--`) (standard convention)

---
---

# Part 3: Page Composition & Visual Rhythm

> These rules prevent pages from looking monotonous and repetitive.
> Follow them to create pages that feel designed, not generated.

---

## 61. Visual Rhythm — Breaking Monotony

### The Core Problem
AI tends to generate repetitive layouts: 4 identical StatCards, then a list, then another list.
Professional designers create **visual rhythm** — alternating density, height, and element types.

### The Rhythm Rule: Never Repeat the Same Section Type Twice in a Row

```
✗ Bad: Grid → Grid → Grid (monotonous)
✗ Bad: Full Card → Full Card → Full Card (wall of cards)

✓ Good: Hero (D) → Grid (B) → Full Card (A) → Carousel (C) → Full Card (A)
✓ Good: Hero (D) → Grid (B) → Full Card with chart (A) → Full Card with list (A)
```

Even within the same type, **vary the internal content**:
```
✗ Bad: Two Full Cards both with lists
✓ Good: Full Card with chart → Full Card with list
```

### Height Variation Rule
Alternate between **tall** and **compact** sections:

| Section | Height Feel | Examples |
|---------|------------|---------|
| **Tall** | 200-300px | Hero card, chart card, donut card |
| **Medium** | 120-180px | KPI grid (2×2), usage breakdown with progress bars |
| **Compact** | 80-120px | Briefing carousel, ranked list (3 items) |

```
✓ Tall → Compact → Medium → Tall → Compact
✗ Tall → Tall → Tall (overwhelming)
✗ Compact → Compact → Compact (feels empty)
```

---

## 62. KPI Card Variation — The 4-Card Rule

### Never Make All 4 KPI Cards Identical
When displaying a 2×2 KPI grid, **vary the secondary element** in each card:

| Card | Primary | Secondary Element | Example |
|------|---------|------------------|---------|
| Card 1 | Metric + unit | **Trend arrow** (up/down %) | Revenue $48.2K ↑+8.2% |
| Card 2 | Metric only | **Trend arrow** (up/down %) | Users 12,840 ↑+3.1% |
| Card 3 | Metric + unit | **Mini progress bar** (h-2) | Storage 68% [████░░] |
| Card 4 | Metric + unit | **Comparison text** | Orders 342 (vs 380 last week) |

### Variation Toolkit for KPI Cards

| Element | When to Use | Visual |
|---------|------------|--------|
| **Trend % + arrow** | Time-based comparison | `+8.2% ↑` in green/red |
| **Mini progress bar** | Ratio/capacity metric | Thin bar (h-2) below metric |
| **Comparison text** | Period comparison | `vs 380 last week` in tertiary |
| **Sparkline** | Trend without specific % | Tiny inline chart (h-8, no axes) |
| **Status dot** | State indicator | `● Active` / `● Warning` |
| **Sub-metric** | Breakdown hint | `Desktop 60% · Mobile 40%` in caption |

### Rules
- Use **at most 2 cards with the same secondary element** in a 4-card grid
- If all 4 metrics have trends, still vary: 2 with trend %, 1 with progress, 1 with comparison
- The most important metric gets the **top-left** position (reading order)

---

## 63. Section Composition Recipes

### Recipe 1: SaaS Dashboard
```
1. Hero Card (D)          — MRR or total revenue, big number
2. KPI Grid (B)           — 4 varied cards (revenue, users, churn, conversion)
3. Chart Card (A)         — Revenue trend (area chart) + period toggle
4. Carousel (C)           — AI insights / alerts / briefings
5. Progress Card (A)      — Usage breakdown (3 progress bars)
6. List Card (A)          — Recent activity (3-4 items with status dots)
```

### Recipe 2: E-commerce Dashboard
```
1. Hero Card (D)          — Today's sales, big number
2. KPI Grid (B)           — Orders, AOV, returns, conversion
3. Donut Card (A)         — Sales by category (interactive donut)
4. Chart Card (A)         — Weekly sales trend (bar chart)
5. Carousel (C)           — Top products (horizontal scroll cards)
6. List Card (A)          — Recent orders (status: shipped/pending/delivered)
```

### Recipe 3: Analytics Dashboard
```
1. Hero Card (D)          — Total users or key metric
2. KPI Grid (B)           — DAU, session duration, bounce rate, pages/session
3. Chart Card (A)         — Traffic trend (area chart)
4. Split Card (A)         — Traffic sources (donut) + top pages (ranked list)
5. Chart Card (A)         — Conversion funnel (horizontal bar)
6. List Card (A)          — Real-time events (3-4 items)
```

### Recipe 4: Finance/Fintech
```
1. Hero Card (D)          — Total balance or portfolio value
2. KPI Grid (B)           — Income, expenses, savings rate, investments
3. Donut Card (A)         — Asset allocation (interactive)
4. Chart Card (A)         — Balance trend (area chart, 1W/1M/3M toggle)
5. List Card (A)          — Recent transactions (amount + status)
6. Carousel (C)           — Financial tips / alerts
```

### Recipe Rules
- **First screen (above the fold)**: Always Hero + KPI Grid — answer "how am I doing?" instantly
- **Middle sections**: Alternate between charts and lists — never two charts in a row
- **Bottom sections**: Lower priority info (activity logs, alerts)
- Every recipe has **exactly one chart type per card** — never combine two charts
- Every recipe includes **at least one non-data section** (carousel/briefing) to break the pattern

---

## 64. Element Diversity Within Cards

### Section Card Content Types (mix these across your page)

| Content Type | Visual Character | Best Paired After |
|-------------|-----------------|------------------|
| **Progress bars** (2-4 items) | Horizontal lines, compact | Chart card or KPI grid |
| **Ranked list** (3-4 items) | Numbers + names, dense | Donut chart or hero |
| **Status list** (3-4 items) | Dots + labels, scannable | Chart card |
| **Stat grid** (3-4 items below divider) | Numbers in columns | Chart (as footer below border-t) |
| **Donut + legend** | Circular + list, interactive | KPI grid |
| **Area/Bar chart** | Flowing/blocky, visual | List card |
| **Metric + trend** | Big number, minimal | Anything (versatile) |

### Forbidden Same-Page Combinations
```
✗ Two donut charts on one page (competing circular elements)
✗ Two area charts on one page (repetitive waves)
✗ Three list cards in a row (feels like a spreadsheet)
✗ Chart card immediately after chart card (visual fatigue)
```

### Required Variety
```
✓ At least 1 chart-based section per dashboard page
✓ At least 1 list-based section per dashboard page
✓ At least 1 metric-focused section (KPI grid or hero)
✓ Maximum 2 of the same content type per page
```

---

## 65. Color Accent Distribution

### The Accent Scarcity Rule
Key color creates impact through **scarcity**. Distribute it sparingly:

```
Per page, key color should appear in:
✓ 1 hero card icon badge
✓ 4 KPI card icon badges (small, 10% opacity)
✓ 1 active bottom nav item
✓ 1-2 progress bar fills
✓ 1 chart highlight (selected segment or line)

That's it. Everything else is grayscale.
```

### Status Color Distribution
Don't cluster all status colors in one area:

```
✗ Bad: All 3 list items have green "Completed" status
✓ Good: 1 green (Completed) + 1 blue (In Progress) + 1 yellow (Pending)
```

Vary status states in lists to create **visual interest through color diversity**.

---

## 66. Card Size Variation

### Not All Cards Should Be the Same Height

| Card Purpose | Padding | Internal Spacing | Resulting Height |
|-------------|---------|-----------------|-----------------|
| **Hero** | `p-8` (32px) | Generous `gap-3` | ~200px (tallest) |
| **Stat/KPI** | `p-6` (24px) | Tight `gap-2` | ~140px |
| **Chart** | `p-6` (24px) | Chart `h-40` + stats | ~280px |
| **List** | `p-6` (24px) | `space-y-3` items | ~200px (3 items) |
| **Progress** | `p-6` (24px) | `space-y-4` bars | ~180px |

### The Skyline Rule
Looking at your page from the side, the card heights should create an **interesting skyline**, not a flat wall:

```
✓ Good skyline:  ██ ▄▄ ████ ▄▄ ██ ▄▄▄
✗ Bad skyline:   ██ ██ ██ ██ ██ ██
```

Achieve this by alternating between:
- KPI Grid (short individual cards) and Full Cards (taller)
- Chart cards (tall) and list cards (medium)
- Carousel (compact, horizontal) after any tall section

---

## 67. Progressive Information Density

### Top-to-Bottom Density Gradient

| Position | Density | Elements | Font Sizes |
|----------|---------|----------|-----------|
| **Top** (Hero) | Low — 1 big number | Single metric + trend | 48px / 24px |
| **Upper** (KPI) | Medium — 4 numbers | Grid of metrics | 36px / 18px |
| **Middle** (Charts) | Medium — visual data | Chart + 3-4 stat items | 18px / 11px |
| **Lower** (Lists) | High — many items | 3-4 rows of data | 14px / 11px |
| **Bottom** (Activity) | Highest — detailed | Timestamps, statuses | 13px / 11px |

### Rules
- Information density **increases** as you scroll down
- Font sizes **decrease** as you scroll down
- White space **decreases** as you scroll down
- This creates a natural "zooming in" effect: overview → details

---

## 68. Empty Page Prevention

### Minimum Section Count
A dashboard page should have **at least 4 sections** to feel complete:

```
✗ Too sparse: Hero + KPI Grid only (2 sections — feels empty)
✗ Too sparse: Hero + KPI + one list (3 sections — almost there)
✓ Minimum viable: Hero + KPI + chart/progress + list (4 sections)
✓ Ideal: Hero + KPI + chart + progress/donut + list + carousel (5-6 sections)
✗ Too dense: 8+ sections (overwhelming, consider splitting into tabs)
```

### When a Section Has No Data
- Show the section with an EmptyState — don't remove it
- Removing sections changes the page rhythm and makes it feel broken
- Empty states maintain layout consistency: "No activity yet. Create your first project."

---

## 69. Chart + Context Pairing

### Never Show a Chart Alone — Always Pair with Context

| Chart Type | Required Context | Placement |
|-----------|-----------------|-----------|
| **Area chart** | Period toggle (1W/1M/3M) + 2-3 stat items below border-t | Toggle in header, stats in footer |
| **Bar chart** | Category labels on X-axis + highlight color on max bar | Labels below bars |
| **Donut chart** | Center value + legend list (3-4 items) with click interaction | Legend beside or below |
| **Progress bars** | Label + percentage text on each bar | Label left, % right |

### Stat Footer Patterns (below border-t in chart cards)

```tsx
{/* 3-column stat footer */}
<div className="grid grid-cols-3 gap-3 pt-5 border-t border-surface-muted">
  <div className="text-center">
    <p className="text-[11px] text-text-secondary font-medium uppercase mb-1.5">Web</p>
    <p className="text-text-primary font-bold text-[18px]">$1,648<span className="text-[10px] ms-0.5">/mo</span></p>
  </div>
  {/* ... more columns */}
</div>
```

### Rules
- A chart without context numbers is **decoration, not information**
- Always show the **current value** prominently (not just the trend line)
- Period toggles: max 3 options (1W / 1M / 3M), use pill toggle style
- Stat footer items: max 4 columns (`grid-cols-3` or `grid-cols-4`)

---

## Core Composition Principles Summary

### Rhythm (3)
1. Never repeat the same section type twice in a row
2. Alternate between tall and compact sections (skyline rule)
3. Every page needs at least 1 chart, 1 list, 1 metric section

### Variety (3)
4. Vary KPI card secondary elements (trend, progress, comparison, sparkline)
5. Maximum 2 of the same content type per page
6. Distribute status colors across list items (don't cluster same color)

### Density (3)
7. Information density increases top-to-bottom
8. Font sizes decrease top-to-bottom (48→36→18→14→11px)
9. Minimum 4 sections per dashboard, maximum 7

### Context (2)
10. Charts always paired with stat context (footer or header)
11. Empty sections show EmptyState, never removed from layout
