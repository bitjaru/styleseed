/**
 * Page-type (screen-type) design guides — the data behind /screens and
 * /screens/[type]. Mirrors engine/PAGE-TYPES.md, structured for programmatic SEO
 * targeting AI-coding-agent long-tail queries — "<screen> that doesn't look
 * AI-generated" — the second axis of design judgment (domain × screen-type).
 * See lib/domains.ts for the first axis.
 */

export interface Screen {
  slug: string;
  name: string;
  /** SEO-facing phrase, e.g. "AI dashboard that doesn't look generated" */
  seoName: string;
  accent: string;
  /** what this screen has to accomplish */
  job: string;
  structure: string;
  hierarchy: string;
  patterns: string[];
  antiPatterns: string[];
  mobile: string;
  /** recommended motion seed for this screen type */
  seed: string;
}

export const SCREENS: Screen[] = [
  {
    slug: "dashboard",
    name: "Dashboard / Overview",
    seoName: "AI dashboard that doesn't look generated",
    accent: "#3182F6",
    job: "Answer “how are things?” in 3 seconds, then let the user drill down.",
    structure: "Information pyramid — one hero metric → a small KPI set → a supporting list or chart. Vary section types; never four identical cards in a row.",
    hierarchy: "Density increases as you scroll. Top = a 48px hero number; bottom = 13–14px detailed rows.",
    patterns: ["Hero metric card", "KPI grid (mixed: trend / progress / comparison)", "Chart card with period toggle", "Ranked list", "Briefing carousel for alerts"],
    antiPatterns: ["a wall of identical KPIs", "no clear primary metric", "charts with 6 legend colors", "everything the same visual weight"],
    mobile: "Single column, hero first, horizontal-scroll carousels for KPI sets.",
    seed: "snap",
  },
  {
    slug: "form",
    name: "Form / Create / Edit",
    seoName: "Forms that don't look AI-generated",
    accent: "#10B981",
    job: "Get accurate input with the least friction and the most confidence.",
    structure: "Single column, logical grouping into section cards, one clear primary action (bottom or sticky). Labels above fields, not beside.",
    hierarchy: "The field you're on > the next field > everything else. Primary action visually dominant; secondary/cancel quiet.",
    patterns: ["Labeled inputs (label above)", "Inline validation on blur, not every keystroke", "Grouped section cards", "Sticky save bar", "Clear required / optional marking"],
    antiPatterns: ["multi-column forms (the eye zig-zags)", "placeholder-as-label", "validating before the user finishes", "two primary buttons", "errors with no recovery guidance", "a disabled submit with no explanation"],
    mobile: "Full-width fields, ≥44px touch targets, numeric keyboards for number fields, sticky primary above the keyboard.",
    seed: "snap",
  },
  {
    slug: "landing",
    name: "Landing / Marketing",
    seoName: "Landing pages that don't look AI-generated",
    accent: "#8B5CF6",
    job: "In one screen: say what it is + why it matters + one next action.",
    structure: "Hero (headline + subhead + a single primary CTA) → proof (features / social proof) → CTA again. One conversion goal per page.",
    hierarchy: "Headline dominates; the CTA is the single brightest element; supporting text recedes. The accent belongs to the CTA.",
    patterns: ["Hero with one CTA", "Feature grid", "Social proof (logos / stats / quotes)", "Before/after, comparison", "Closing CTA", "Tasteful entrance motion — one flair accent max"],
    antiPatterns: ["multiple competing CTAs", "a wall of text", "every section the same rhythm", "autoplaying noise", "motion that delays the headline", "six accent colors"],
    mobile: "Stack everything, keep the CTA reachable, don't shrink the headline into mush.",
    seed: "silk",
  },
  {
    slug: "detail",
    name: "Detail / Profile",
    seoName: "Detail & profile pages that don't look AI-generated",
    accent: "#F59E0B",
    job: "Show one thing deeply, with its primary action obvious.",
    structure: "Identity header (title / image / status) → key facts → body sections → one primary action (often sticky on mobile).",
    hierarchy: "The subject's name/title and its primary action win. Metadata is tertiary.",
    patterns: ["Identity / hero block", "Key-value facts", "Tabbed or sectioned body", "Sticky primary action", "Related-items rail", "Status indicators"],
    antiPatterns: ["burying the primary action", "equal weight on everything", "no clear ‘what is this’", "metadata louder than the subject"],
    mobile: "Sticky action bar, collapse long sections, single column.",
    seed: "silk",
  },
  {
    slug: "list",
    name: "List / Search / Browse",
    seoName: "List & search UI that doesn't look AI-generated",
    accent: "#5E6AD2",
    job: "Scan many items fast, find the right one, act.",
    structure: "Optional filter/search bar → consistent rows or cards → a clear per-item action. Consistency beats variety here.",
    hierarchy: "The identifying field (name/title) is boldest; status and meta are quieter; the value/amount is emphasized on the trailing edge.",
    patterns: ["List item (title + status dot + trailing value)", "Filterable list", "Segmented control", "Swipe actions on mobile", "Empty state", "Skeleton while loading"],
    antiPatterns: ["rows that vary wildly", "no empty/loading state", "status by color alone (pair with text)", "tiny tap targets", "pagination where infinite scroll fits"],
    mobile: "Full-width rows, swipe-to-act, ≥44px rows, sticky filter.",
    seed: "snap",
  },
  {
    slug: "settings",
    name: "Settings / Account",
    seoName: "Settings pages that don't look AI-generated",
    accent: "#64748B",
    job: "Let the user find and change one setting with confidence, safely.",
    structure: "Grouped section cards by topic (profile / notifications / billing / danger), each setting a labeled row with its control on the trailing edge. Destructive actions isolated and marked.",
    hierarchy: "Flat and scannable — settings are equal-weight within a group; group titles orient. Danger zone visually separated.",
    patterns: ["Toggle rows", "Select rows", "Account header", "Billing card", "Danger zone (the one place a functional border + destructive tone is right)", "Consistent inline- or explicit-save"],
    antiPatterns: ["destructive actions next to benign ones", "an unclear save model", "settings with no labels", "toggles whose state is ambiguous", "no confirmation on irreversible actions"],
    mobile: "Full-width rows, controls reachable with the thumb, ≥44px toggles.",
    seed: "snap",
  },
  {
    slug: "onboarding",
    name: "Onboarding / Empty state",
    seoName: "Onboarding & empty states that don't look AI-generated",
    accent: "#FF6B35",
    job: "Get the user to their first win with minimal steps — never a dead end.",
    structure: "Few steps with visible progress, one decision per step, a strong ‘what's next.’ Empty states are onboarding in disguise — always offer the next action.",
    hierarchy: "The current step and its single action dominate; progress is visible but quiet.",
    patterns: ["Stepper / progress", "One question per screen", "Empty state (icon + title + description + action)", "Celebration motion on completion", "Contextual tips", "Skip/defer where fair"],
    antiPatterns: ["asking everything up front", "empty screens with no next action", "no sense of progress", "shaming empty states", "forcing setup before any value"],
    mobile: "One step per screen, a big primary, progress at top.",
    seed: "spring",
  },
];

export const SCREEN_BY_SLUG: Record<string, Screen> = Object.fromEntries(
  SCREENS.map((s) => [s.slug, s]),
);
