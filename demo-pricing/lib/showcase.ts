import type { SeedId } from "@engine/motion";

export const OUTPUT_GRAMMARS = [
  "consumer-service",
  "operations-console",
  "technical-instrument",
  "editorial-reading",
  "commerce-conversion",
  "institutional-service",
  "expressive-marketing",
  "sequential-story",
] as const;

export const SURFACE_ADAPTERS = [
  "product-ui",
  "social-carousel",
  "slide-deck",
  "document-report",
  "single-frame",
] as const;

export type OutputGrammar = (typeof OUTPUT_GRAMMARS)[number];
export type SurfaceAdapter = (typeof SURFACE_ADAPTERS)[number];

/**
 * A showcase entry is metadata only — server-safe. The actual render
 * function lives in app/showcase/_renderers/ so it can be looked up
 * inside a client component without crossing the server↔client boundary.
 */
export type ShowcaseEntry = {
  id: string;
  /** Human-readable title shown on the cards and detail page. */
  name: string;
  /** One-line elevator pitch. */
  blurb: string;
  /** Primary intent: "dashboard" / "pricing" / "marketing" / ... */
  category: string;
  /** Functional v3 grammar that owns hierarchy, density, and action logic. */
  grammar: OutputGrammar;
  /** Renderer/surface contract used by this artifact. */
  adapter: SurfaceAdapter;
  /** The user job this build is designed to support. */
  job: string;
  /** One identifying move that proves the grammar is more than a skin. */
  signature: string;
  /** Default skin to render when the user lands on the entry. */
  primarySkin: string;
  /** Default motion seed to render with. */
  primarySeed: SeedId;
  /** Cross-links to DESIGN-LANGUAGE rules and METHODOLOGY chapters. */
  rationale?: {
    design?: string[];
    methodology?: string[];
    motion?: string;
  };
};

const _entries: ShowcaseEntry[] = [];

export function registerShowcase(entry: ShowcaseEntry): void {
  if (_entries.some((e) => e.id === entry.id)) return;
  _entries.push(entry);
}

export function listShowcase(): ShowcaseEntry[] {
  return [..._entries].sort((a, b) => a.id.localeCompare(b.id));
}

export function getShowcase(id: string): ShowcaseEntry | undefined {
  return _entries.find((e) => e.id === id);
}
