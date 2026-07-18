import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "marketing",
  name: "Marketing Landing",
  blurb: "Hero, features, and CTA — a Vercel-style decisive marketing surface.",
  category: "marketing",
  grammar: "expressive-marketing",
  adapter: "product-ui",
  job: "Understand the promise, trust the proof, and take one next step.",
  signature: "A memorable first fold leads into concrete product proof instead of feature-card filler.",
  primarySkin: "vercel",
  primarySeed: "snap",
  rationale: {
    design: ["Rule 1 (Color Philosophy)", "Rule 14 (Hierarchy)"],
    methodology: ["Ch.2 Information Density", "Ch.6 Linear/Toss Aesthetic"],
    motion: "Snap for fast-load impression; Float for hero copy if a hero asset is added.",
  },
});
