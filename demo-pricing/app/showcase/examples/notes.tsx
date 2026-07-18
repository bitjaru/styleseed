import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "notes",
  name: "Notes Editor",
  blurb: "Sidebar + editor + meta panel — a Notion-style calm content surface.",
  category: "editor",
  grammar: "editorial-reading",
  adapter: "product-ui",
  job: "Read and shape long-form thinking while keeping navigation close but quiet.",
  signature: "Typography and measure lead; panels support the document instead of boxing every block.",
  primarySkin: "notion",
  primarySeed: "silk",
  rationale: {
    design: ["Rule 1 (Color Philosophy)", "Rule 14 (Hierarchy)"],
    methodology: ["Ch.1 Progressive Disclosure", "Ch.2 Information Density"],
    motion: "Silk entrance for panel reveals; Silk layout for FLIP between notes.",
  },
});
