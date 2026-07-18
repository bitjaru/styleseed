import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "settings",
  name: "Settings",
  blurb: "Account, billing, and notifications in a single sidebar layout — an Arc-style playful surface.",
  category: "settings",
  grammar: "institutional-service",
  adapter: "product-ui",
  job: "Change consequential account preferences safely and understand what each action affects.",
  signature: "Plain-language grouping, explicit state, and restrained confirmation reduce mistakes.",
  primarySkin: "arc",
  primarySeed: "spring",
  rationale: {
    design: ["Rule 1 (Color Philosophy)", "Rule 65 (Accent Scarcity)"],
    methodology: ["Ch.1 Progressive Disclosure", "Ch.6 Linear/Toss Aesthetic"],
    motion: "Spring press for toggle controls; Silk entrance for panel switch.",
  },
});
