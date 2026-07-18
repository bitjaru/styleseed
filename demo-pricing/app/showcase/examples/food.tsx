import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "food",
  name: "Food Delivery",
  blurb: "Restaurant feed, cart, and live order tracking — a Baemin/DoorDash-style consumer app.",
  category: "mobile",
  grammar: "commerce-conversion",
  adapter: "product-ui",
  job: "Choose food with confidence and move from browsing to an order.",
  signature: "Imagery carries appetite while one persistent cart action carries conversion.",
  primarySkin: "arc",
  primarySeed: "spring",
  rationale: {
    design: [
      "Rule 1 (Color Philosophy) — single appetizing accent + grayscale",
      "Rule 14/18/19 (Hierarchy) — hero promo, then categories, then feed",
      "Rule 8 (Touch target ≥44px)",
    ],
    methodology: [
      "Ch.2 Information Density — search + categories + feed above the fold",
      "Ch.7 Color Discipline — borderless cards via surface tone",
      "Ch.8 Motion Vibe — Spring on add-to-cart and quantity steppers",
    ],
    motion: "Spring press on the cart button; Spring entrance for restaurant cards.",
  },
});
