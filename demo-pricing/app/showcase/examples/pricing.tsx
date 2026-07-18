import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "pricing",
  name: "Pricing",
  blurb: "Three-tier with billing toggle — a Stripe-style composed editorial surface (mirrors the existing /pricing route).",
  category: "marketing",
  grammar: "commerce-conversion",
  adapter: "product-ui",
  job: "Compare plans, understand the tradeoff, and choose without hidden ambiguity.",
  signature: "Plan differences and total commitment lead; one recommended path stays identifiable.",
  primarySkin: "stripe",
  primarySeed: "silk",
  rationale: {
    design: ["Rule 1 (Color Philosophy)", "Rule 14 (Hierarchy)"],
    methodology: ["Ch.2 Information Density", "Ch.6 Linear/Toss Aesthetic"],
    motion: "Silk layout for tier reflow; Silk entrance for header.",
  },
});
