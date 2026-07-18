import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "wallet",
  name: "Mobile Wallet",
  blurb: "Account balance, transfers, and recent activity — a Toss-style consumer banking app.",
  category: "mobile",
  grammar: "consumer-service",
  adapter: "product-ui",
  job: "Know the available balance and complete a trusted money action quickly.",
  signature: "Personal financial state leads; transfer actions and recent activity remain calm and legible.",
  primarySkin: "toss",
  primarySeed: "spring",
  rationale: {
    design: [
      "Rule 1 (Color Philosophy) — single brand accent + grayscale",
      "Rule 14/18/19 (Hierarchy) — large balance, supporting metrics",
      "Rule 8 (Touch target ≥44px)",
    ],
    methodology: [
      "Ch.2 Information Density — balance + 4 actions above-the-fold",
      "Ch.7 Color Discipline — borderless cards via surface tone",
      "Ch.8 Motion Vibe — Spring on every primary action",
    ],
    motion: "Spring entrance for the balance card; Spring press for quick actions and list rows.",
  },
});
