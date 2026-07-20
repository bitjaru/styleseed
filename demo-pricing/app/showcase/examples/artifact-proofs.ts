import { registerShowcase } from "@/lib/showcase";

registerShowcase({
  id: "signal-carousel",
  name: "Signal Reset",
  blurb: "A five-frame, source-backed social explainer that turns one behavioral insight into a useful reset.",
  category: "social explainer",
  grammar: "sequential-story",
  adapter: "social-carousel",
  job: "Understand why attention fragments and leave with one small reset worth trying today.",
  signature: "The red thread crosses all five exported frames while hook, evidence, action, reframe, and CTA each get a distinct composition.",
  proof: "exported-artifact",
  imagePath: "/showcase-artifacts/signal-carousel/01-hook.png",
  sourcePath: "app/showcase/_renderers/artifact-proofs.tsx",
  reproduction: {
    claude: "/ss-build signal-carousel, then /carousel-build",
    codex: "$ss-build signal-carousel, then npm run export:signal-carousel",
    exportCommand: "npm run export:signal-carousel",
    manifestPath: "/showcase-artifacts/signal-carousel/manifest.json",
  },
  primarySkin: "linear",
  primarySeed: "snap",
  rationale: {
    design: ["One message per frame", "Stable red thread", "3:4 publishing canvas"],
    methodology: [
      "Hook → sourced evidence → action → reframe → CTA",
      "Attention-residue claim cites Leroy (2009) instead of presenting editorial copy as proof",
    ],
    motion: "Snap supports frame-to-frame progression; every exported frame remains complete as a static artifact.",
  },
});

registerShowcase({
  id: "orbit-deck",
  name: "Orbit Launch Deck",
  blurb: "A concise launch narrative with a clear mechanism, credible proof, and a decision-ready close.",
  category: "product launch deck",
  grammar: "expressive-marketing",
  adapter: "slide-deck",
  job: "Understand the product thesis, see the mechanism, and decide whether to continue the conversation.",
  signature: "A luminous orbit diagram acts as the recurring proof device instead of decorative feature cards.",
  proof: "rendered-preview",
  primarySkin: "vercel",
  primarySeed: "float",
  rationale: {
    design: ["16:9 reading distance", "One claim per slide", "Mechanism before feature list"],
    methodology: ["Proposition → mechanism → evidence → decision", "Display type paired with restrained data"],
    motion: "Float is reserved for the orbital model; the argument remains complete in static export.",
  },
});

registerShowcase({
  id: "field-report",
  name: "Field Notes 04",
  blurb: "An editorial research brief designed for sustained reading and evidence scanning.",
  category: "research report",
  grammar: "editorial-reading",
  adapter: "document-report",
  job: "Grasp the finding quickly, inspect supporting evidence, and retain the argument across pages.",
  signature: "A red evidence rail connects the abstract, annotated chart, and field observation without turning the report into a dashboard.",
  proof: "rendered-preview",
  primarySkin: "notion",
  primarySeed: "silk",
  rationale: {
    design: ["Bounded reading measure", "Editorial hierarchy", "Evidence rail instead of card grid"],
    methodology: ["Abstract → finding → evidence → implication", "Print-like rhythm without fake paper decoration"],
    motion: "Calm page transitions only; reading order and exported pages do not depend on animation.",
  },
});

registerShowcase({
  id: "night-poster",
  name: "After Dark / 25",
  blurb: "A single-frame cultural poster built around one typographic gesture and strict event hierarchy.",
  category: "event poster",
  grammar: "expressive-marketing",
  adapter: "single-frame",
  job: "Recognize the event in one glance, remember its attitude, and find date and venue immediately.",
  signature: "The oversized diagonal 25 is both image and information; acid green is reserved for the event signal.",
  proof: "rendered-preview",
  primarySkin: "linear",
  primarySeed: "snap",
  rationale: {
    design: ["One typographic focal point", "Distance-readable hierarchy", "Strict two-color role system"],
    methodology: ["Identity and information share one gesture", "No decorative mockup chrome"],
    motion: "The poster is complete as a still; motion may reveal the diagonal numeral but cannot alter hierarchy.",
  },
});
