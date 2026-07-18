import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "music",
  name: "Music Player",
  blurb: "Now-playing, queue, and library — a Spotify-style streaming app.",
  category: "mobile",
  grammar: "consumer-service",
  adapter: "product-ui",
  job: "Recognize what is playing and control playback without interrupting listening.",
  signature: "Media identity supplies the color; transport controls remain immediate and stable.",
  primarySkin: "notion",
  primarySeed: "silk",
  rationale: {
    design: [
      "Rule 1 (Color Philosophy) — album art carries the color, UI stays neutral",
      "Rule 14 (Hierarchy) — album art dominates, controls below",
      "Rule 8 (Touch target ≥44px) for transport controls",
    ],
    methodology: [
      "Ch.1 Progressive Disclosure — now-playing first, queue on demand",
      "Ch.7 Color Discipline — borderless, art-driven accent",
      "Ch.8 Motion Vibe — Silk for smooth, continuous scrubbing",
    ],
    motion: "Silk entrance for the now-playing card; Silk layout for queue reorder.",
  },
});
