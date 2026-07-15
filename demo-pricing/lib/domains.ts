/**
 * App-domain design guides — the data behind /guides and /guides/[domain].
 * Mirrors engine/APP-PLAYBOOKS.md + the type recipe in engine/VISUAL-CRAFT.md,
 * structured for programmatic SEO pages targeting AI-coding-agent long-tail
 * queries — "make Claude Code / Cursor / Codex build a <domain> app that
 * doesn't look AI-generated".
 */

export interface Dial {
  label: string;
  value: string;
}

/** Research-backed type recipe (VISUAL-CRAFT.md §C2 table). */
export interface TypeSpec {
  character: string;
  hero: string;
  body: string;
  numerals: string;
}

export interface Domain {
  slug: string;
  name: string;
  /** SEO-facing phrase, e.g. "Fintech UI that doesn't look AI-generated" */
  seoName: string;
  accent: string;
  dna: string;
  /** the recommended corner personality (VISUAL-CRAFT §C0 coherence law) */
  radius: string;
  type: TypeSpec;
  dials: Dial[];
  antiPatterns: string[];
  seed: string;
  skins: string[];
  /** showcase entry ids that exemplify this domain */
  showcase: string[];
}

export const DOMAINS: Domain[] = [
  {
    slug: "fintech",
    name: "Fintech & Banking",
    seoName: "Fintech UI that doesn't look AI-generated",
    accent: "#3182F6",
    dna: "Trust through restraint. The accent is reserved for money in motion; calm reads as careful.",
    radius: "Soft (8–12px) — approachable but composed",
    type: {
      character: "Restrained neo-grotesque, low contrast (Inter, IBM Plex Sans, Söhne)",
      hero: "36–48px",
      body: "15–16px",
      numerals: "Tabular lining — mandatory; pick a font with disambiguated 0/O & 1/l",
    },
    dials: [
      { label: "Color", value: "Maximum restraint — accent only for CTAs, positive trend, active balance. Green/red for up/down, never decoration." },
      { label: "Density", value: "Medium-low. One number dominates each card. Whitespace signals care." },
      { label: "Typography", value: "Numbers first — hero balance 48px with 24px unit (2:1). Currency and dates recede." },
      { label: "Motion", value: "Spring (confident Toss bounce on CTAs) or Silk for balances. Never bouncy on real money changing." },
      { label: "Patterns", value: "Balance hero, transaction list with status dot, KPI with trend, period toggle, spend donut." },
    ],
    antiPatterns: ["rainbow palettes", "gradients on amounts", "fake precision ($8,400.0000)", "floating shadows", "motion that delays seeing a balance"],
    seed: "spring",
    skins: ["toss", "stripe"],
    showcase: ["finance", "wallet"],
  },
  {
    slug: "saas",
    name: "SaaS & B2B Dashboards",
    seoName: "SaaS dashboards that look designed, not generated",
    accent: "#5E6AD2",
    dna: "Information per pixel. Power users want density, speed, and one quiet accent.",
    radius: "Sharp–medium (4–8px) — precise, dense",
    type: {
      character: "Humanist screen-sans built for small sizes (Inter)",
      hero: "28–36px",
      body: "14px (13px in dense tables)",
      numerals: "Tabular in every table; weight (not size) carries hierarchy",
    },
    dials: [
      { label: "Color", value: "Disciplined grayscale, one accent for primary action + selected state. Charts use a small fixed scale." },
      { label: "Density", value: "High. Tables, filters, multi-KPI rows. Density is a feature — keep rhythm." },
      { label: "Typography", value: "Balanced numbers + labels, tabular-nums, tight line-height, quiet headings." },
      { label: "Motion", value: "Snap (instant, Linear-style). Layout/FLIP for reorder, near-zero entrance." },
      { label: "Patterns", value: "Chart card with period toggle, dense KPI grid, filterable table, segmented control." },
    ],
    antiPatterns: ["decorative motion", "oversized hero numbers wasting space", "6-color chart legends", "modal-heavy flows"],
    seed: "snap",
    skins: ["linear", "vercel"],
    showcase: ["finance", "issues"],
  },
  {
    slug: "ecommerce",
    name: "E-commerce & Retail",
    seoName: "E-commerce UI that doesn't look AI-generated",
    accent: "#FF6B35",
    dna: "Product imagery is the hero; the accent drives one thing — buy.",
    radius: "Soft (8–12px) — friendly, tactile",
    type: {
      character: "Friendly humanist sans + optional characterful brand display",
      hero: "32–48px",
      body: "16px",
      numerals: "Tabular for price & grids; price weighted, not colored",
    },
    dials: [
      { label: "Color", value: "Neutral chrome so photos pop. Accent only for add-to-cart/buy. Price gets weight, not color." },
      { label: "Density", value: "Medium. Browsing = generous product cards; PDP = focused, CTA above the fold." },
      { label: "Typography", value: "Price prominent (2:1 with currency), product title bold, specs quiet." },
      { label: "Motion", value: "Spring (energetic) for add-to-cart, quantity stepper, cart pop. Hover lift on cards." },
      { label: "Patterns", value: "Product card grid, cart badge, quantity stepper, sticky buy bar, featured rails." },
    ],
    antiPatterns: ["buried CTA", "two primaries on a PDP", "shouty discount colors everywhere", "motion blocking add-to-cart"],
    seed: "spring",
    skins: ["arc", "toss"],
    showcase: ["food", "music"],
  },
  {
    slug: "social",
    name: "Social & Community",
    seoName: "Social app UI that looks designed, not AI-generated",
    accent: "#FF4E8B",
    dna: "User content leads; the UI is alive but never competes with it.",
    radius: "Soft → pill — playful, avatars fully round",
    type: {
      character: "System humanist sans (SF Pro, Roboto) — fast, familiar",
      hero: "title via weight, ~20–28px",
      body: "15–17px",
      numerals: "Proportional (counts read inline)",
    },
    dials: [
      { label: "Color", value: "Energetic, warmer accent — appears for likes, mentions, online dots. Still one accent." },
      { label: "Density", value: "Medium, content-led. Avatars and media drive layout; chrome is minimal." },
      { label: "Typography", value: "Names bold, timestamps tiny/tertiary, body readable. Let content lead." },
      { label: "Motion", value: "Pulse (alive) for likes (like-burst), live dots (pulse-beat), new content (stagger-cascade)." },
      { label: "Patterns", value: "Feed list, avatar + name + time row, like/comment/share, bottom-sheet composer, story rail." },
    ],
    antiPatterns: ["heavy chrome over content", "slow feed entrance (kills scroll)", "engagement-bait colors", "inconsistent avatar shapes"],
    seed: "pulse",
    skins: ["arc"],
    showcase: ["music", "chat"],
  },
  {
    slug: "content",
    name: "Content, Media & Docs",
    seoName: "Blog & editorial UI that doesn't look AI-generated",
    accent: "#635BFF",
    dna: "Typography is the design. Reading is the product; color is a distraction.",
    radius: "Sharp (0–4px) — editorial, print-like",
    type: {
      character: "High-contrast serif display + humanist sans/serif body",
      hero: "40–64px",
      body: "18–21px, measure 60–75ch",
      numerals: "Oldstyle figures in serif prose",
    },
    dials: [
      { label: "Color", value: "Near-monochrome; accent for links and one CTA only." },
      { label: "Density", value: "Low in the reading column (~60–75ch), denser in nav/index." },
      { label: "Typography", value: "Strong type scale, 1.5–1.65 body line-height, real H/body/caption hierarchy." },
      { label: "Motion", value: "Silk (smooth) — reveal-blur/reveal-rise on headlines, subtle. Nothing that interrupts reading." },
      { label: "Patterns", value: "Article hero, readable body column, table of contents, pull quotes, related rail." },
    ],
    antiPatterns: ["full-width body text", "decorative motion mid-article", "multiple accents", "autoplaying media"],
    seed: "silk",
    skins: ["notion", "vercel"],
    showcase: ["notes", "marketing"],
  },
  {
    slug: "productivity",
    name: "Productivity & Tools",
    seoName: "Productivity UI that looks designed, not generated",
    accent: "#5E6AD2",
    dna: "Calm chrome so the user's work is the focus; keyboard-first, fast.",
    radius: "Sharp–medium (4–8px) — crisp, efficient",
    type: {
      character: "Humanist / neo-grotesque screen sans (Inter, Geist)",
      hero: "24–32px",
      body: "14–15px",
      numerals: "Tabular where numbers align (counts, dates)",
    },
    dials: [
      { label: "Color", value: "Quiet grayscale, one accent for primary action + active item." },
      { label: "Density", value: "High but organized — sidebars, panels, keyboard shortcuts." },
      { label: "Typography", value: "Compact, tabular where needed, clear active/hover states." },
      { label: "Motion", value: "Snap (instant, precise). Layout transitions for reorder; no latency on frequent actions." },
      { label: "Patterns", value: "Sidebar + content + inspector, command palette, list/board toggle, inline edit." },
    ],
    antiPatterns: ["slow motion on frequent actions", "modal overload", "decorative color", "over-hiding power features"],
    seed: "snap",
    skins: ["linear", "notion", "vercel"],
    showcase: ["notes", "issues"],
  },
  {
    slug: "health",
    name: "Health, Wellness & Fitness",
    seoName: "Health & fitness UI that doesn't look AI-generated",
    accent: "#10B981",
    dna: "Calm and reassuring. One clear focus per screen; reduce load on a tired user.",
    radius: "Soft → pill (12px+) — calm, gentle",
    type: {
      character: "Warm humanist sans, open counters (Lato-type)",
      hero: "32–44px",
      body: "16–18px, line-height 1.6",
      numerals: "Proportional (tabular for vitals/streaks)",
    },
    dials: [
      { label: "Color", value: "Soft accent, vivid only for metric rings/progress on a calm base. Reds only for real alerts." },
      { label: "Density", value: "Low-medium. One focus per screen (today's rings, next action)." },
      { label: "Typography", value: "Big friendly numbers (2:1), gentle labels, generous spacing." },
      { label: "Motion", value: "Float (weightless) for reveals; Pulse only for live heartbeat. Never urgent." },
      { label: "Patterns", value: "Activity rings, big-metric hero, streak/progress, large touch targets, weekly history." },
    ],
    antiPatterns: ["dense data dumps", "alarming colors for normal states", "tiny targets", "shame-y empty states"],
    seed: "float",
    skins: ["toss"],
    showcase: ["fitness"],
  },
  {
    slug: "devtools",
    name: "Developer Tools",
    seoName: "Developer-tool UI that doesn't look AI-generated",
    accent: "#8B5CF6",
    dna: "Dark-first, dense, precise. Devs distrust slow or flashy UI.",
    radius: "Sharp (4px) — technical, exact",
    type: {
      character: "Grotesque + matched mono superfamily (Geist Sans/Mono, IBM Plex)",
      hero: "32–48px",
      body: "14–16px (code 13–14px mono)",
      numerals: "Tabular / monospace for IDs, logs, tokens",
    },
    dials: [
      { label: "Color", value: "Dark-first, restrained, one accent. Syntax colors are their own controlled scale." },
      { label: "Density", value: "High — devs read dense screens fine. Monospace for code/IDs/logs." },
      { label: "Typography", value: "Mono for code/identifiers, tight tabular numbers, quiet UI text." },
      { label: "Motion", value: "Snap (instant). Minimal, functional only — flashy reads as unserious." },
      { label: "Patterns", value: "Code blocks with copy, logs/terminal, status badges, command palette, key-value config." },
    ],
    antiPatterns: ["flashy motion", "light-only themes", "decorative gradients", "hiding the CLI/copy affordance"],
    seed: "snap",
    skins: ["raycast", "vercel", "linear"],
    showcase: ["issues", "settings"],
  },
];

export const DOMAIN_BY_SLUG: Record<string, Domain> = Object.fromEntries(
  DOMAINS.map((d) => [d.slug, d]),
);
