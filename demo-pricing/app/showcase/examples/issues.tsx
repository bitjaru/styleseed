import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "issues",
  name: "Issue Tracker",
  blurb: "Kanban board with filters and assignees — a Linear-style power-user view.",
  category: "workflow",
  grammar: "technical-instrument",
  adapter: "product-ui",
  job: "Triage, assign, and move technical work with minimal interaction cost.",
  signature: "Status, ownership, and identifiers stay visible at power-user density.",
  primarySkin: "linear",
  primarySeed: "snap",
  rationale: {
    design: ["Rule 1 (Color Philosophy)", "Rule 14 (Hierarchy)"],
    methodology: ["Ch.2 Information Density", "Ch.6 Linear/Toss Aesthetic", "Ch.8 Motion Vibe"],
    motion: "Snap layout for card reflow; Snap press for actions.",
  },
});
