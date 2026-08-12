import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Answers to the real questions developers ask when their AI-built app looks generic: how to make it look professional, stop looking like every shadcn app, look like Linear/Stripe, fix spacing/typography/colors, and give Claude Code, Codex, or Cursor design judgment.";

export const metadata: Metadata = {
  title: "FAQ — making AI-built UI look designed, not generated",
  description,
  keywords: [
    "make my app look professional",
    "ui looks generic ai generated",
    "every shadcn app looks the same",
    "make it look like linear stripe notion",
    "design system for claude code cursor",
    "improve spacing typography hierarchy",
    "free design tool for ai coding",
  ],
  alternates: { canonical: `${BASE}/faq` },
  openGraph: {
    type: "website",
    url: `${BASE}/faq`,
    title: "FAQ — making AI-built UI look designed, not generated",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/coherence.png`, width: 1280, height: 640 }],
  },
  twitter: { card: "summary_large_image", title: "StyleSeed FAQ", description, images: [`${BASE}/og/coherence.png`] },
};

/** Answer leads with a self-contained 40–60 word capsule (the citation unit), then optional context. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "My app looks generic / AI-generated — how do I fix it?",
    a: "StyleSeed fixes generic, “AI-slop” UI with 74 design rules covering color discipline, spacing rhythm, hierarchy, elevation, and motion. Install the project entry or invoke the installed StyleSeed workflow so Claude Code, Codex, or Cursor actually loads those rules for visual work. Instead of defaulting to slate neutrals and 8px radius on everything, the workflow pushes the output toward one intentional system. It's MIT-licensed and free.",
  },
  {
    q: "I applied StyleSeed but the design still looks bad / colors are random / there's no key color — what do I do?",
    a: "Consistency comes from constraints, and the one-paste prompt is the least-constrained path. Fix it in five steps. 1) Select the output grammar and surface adapter before code. 2) Lock a primary action color and define stable roles for any additional hues. 3) If you have references that StyleSeed does not model, run /ss-reference instead of copying them. 4) Install the provider's project entry or invoke the installed StyleSeed skill so visual work reads STYLESEED.md. 5) Run /ss-score, then render and inspect with /ss-verify; the reference demo was not one-shot either.",
  },
  {
    q: "Why does the same prompt give a great result one time and a generic one the next?",
    a: "Because output quality tracks how many constraints the agent has, not luck. A polished result happens when the rules, the key color, the skin, and a review pass are all pinned; a generic one happens when the agent improvised from a summary. Reduce the variance by deciding app type, accent, and motion up front (ideally in plan mode), installing the rule files so they persist across prompts, and running /ss-review to catch drift. More constraints = less variance.",
  },
  {
    q: "Why does every shadcn app look the same, and how do I make mine different?",
    a: "Unmodified shadcn converges on a “fingerprint”: slate/zinc neutrals, Inter at default sizes, 8px radius everywhere, a default primary. StyleSeed breaks that fingerprint with rules and 7 brand skins (Toss, Stripe, Linear, Notion, Raycast, Arc, Vercel) so your AI-built app gets a committed accent, a real type pairing, and a signature look — not the default.",
  },
  {
    q: "How do I make my app look like Linear (or Stripe / Notion / Vercel)?",
    a: "StyleSeed ships 7 brand skins — including Linear, Stripe, Notion, Vercel, Raycast, Arc, and Toss — that encode each product's neutrals, radius, type, density, and motion as rules your agent applies. Ask Claude Code, Codex, or Cursor to build “in the Linear skin” and you get the dense, monochrome, intentional look instead of a generic approximation.",
  },
  {
    q: "How do I give Claude Code, Codex, or Cursor a design system so it stops making ugly UI?",
    a: "StyleSeed is a design-method engine for that job. It ships 8 output grammars, 5 surface adapters, 48 React components, 7 brand skins, a named motion system, and 22 canonical ss-* skills. STYLESEED.md preserves bounded project decisions; installed project instructions and StyleSeed skills re-read it for visual work instead of reinventing spacing, colors, type, and motion.",
  },
  {
    q: "Should I use StyleSeed or Anthropic's official frontend-design skill with Claude Code?",
    a: "Use either or both based on the job. Anthropic's frontend-design skill is strong for choosing and executing a distinctive frontend direction. StyleSeed adds job-specific output grammars, persistent project decisions, reference compilation, a code score, and rendered pixel verification. They are complementary; StyleSeed is independent and is not an official Anthropic product.",
  },
  {
    q: "Does it work with Codex / AGENTS.md (not just Claude Code and Cursor)?",
    a: "Yes. StyleSeed ships an AGENTS.md entry point plus a repository .agents/skills bridge for Codex-facing workflows. Codex uses $ss-* calls or its skills picker, while Claude Code uses /ss-* calls; both resolve to the same canonical design engine and project-local STYLESEED.md lock. A fresh agent session should be started after installation if skill discovery is stale.",
  },
  {
    q: "Installing the skills asks for permission or gets blocked — is that normal? Do I even need them?",
    a: "Yes, that's normal and expected: the /ss-* skills are executable, so your agent asks you to trust them once on first use — the same approval any third-party skill needs (good security), not a StyleSeed-specific block. But you don't need the skills at all. StyleSeed's core is the rules — plain markdown (CLAUDE.md / AGENTS.md / DESIGN-LANGUAGE.md) — which install with zero permissions. Paste the one-sentence prompt, or copy those files in, and you already get the design judgment. The skills are just optional automation on top.",
  },
  {
    q: "Does it handle UX writing / microcopy too, or just visuals?",
    a: "Both. StyleSeed covers verbal judgment as well as visual — buttons that name the action (“Send $2,400”, not “Submit”), error messages that help instead of blame (“Check the card number” not “Invalid input”), empty states that invite, calm money copy, one term per concept. The rules install with everything else, so your agent applies them to button labels, errors, and toasts automatically. Korean/CJK projects get writing principles grounded in Toss's published “8 Writing Principles.”",
  },
  {
    q: "How do I make my app look more professional / polished / expensive?",
    a: "Generic-to-premium is mostly discipline: one saturated accent, a real font pairing, an 8pt spacing scale, intentional hierarchy, a signature shadow, and subtle motion. StyleSeed encodes all of these as 74 rules Claude Code, Codex, and Cursor follow automatically, so “make it look more professional” produces an actually professional result instead of more average defaults.",
  },
  {
    q: "My spacing feels off and my layout looks cramped — how do I fix it?",
    a: "StyleSeed enforces spatial rhythm: a consistent 8pt spacing scale, “inside vs. outside” grouping so related items sit tighter than unrelated ones, and intentional whitespace around focal elements. The agent stops emitting ad-hoc paddings, so your React or Next layout reads as deliberate and scannable rather than cramped or arbitrary.",
  },
  {
    q: "How do I give my dashboard better visual hierarchy?",
    a: "StyleSeed's hierarchy rules drive contrast through size, weight, color, and position so there's a clear focal point and scan path — plus dashboard patterns ready to use. Your Claude Code, Codex, or Cursor dashboard stops looking like a flat default admin template where every element competes for the same attention.",
  },
  {
    q: "Why does my app look amateur or unfinished?",
    a: "Apps look amateur when there's no system-level owner: inconsistent spacing, too many colors, default type, no hover or loading states. StyleSeed gives your AI agent that ownership — 74 rules plus a motion system for hover, loading, success, and error states — so the last 20% of polish that separates real products from prototypes gets handled.",
  },
  {
    q: "How do I stop my UI from looking like a template?",
    a: "StyleSeed replaces template defaults with intentional, branded choices: a committed radius, a stable action color, a deliberate type pairing, and a coherence rule. STYLESEED.md keeps those decisions in the repo; the installed project entry or StyleSeed workflow must load the lock for later visual tasks so new screens do not silently revert to template defaults.",
  },
  {
    q: "I'm vibe coding without a designer — how do I get good-looking UI?",
    a: "StyleSeed is built for vibe coding without a designer. It hands Claude Code, Codex, and Cursor the design judgment a designer would provide — rules, components, brand skins, and motion — so non-designers ship UI that looks designed. It's free and MIT-licensed, and layers on top of shadcn/ui and Tailwind.",
  },
  {
    q: "How do I fix too many colors / a messy palette?",
    a: "StyleSeed's color-discipline rules cut your palette to one saturated accent plus semantic tokens, used sparingly and consistently. The agent stops decorating with color and starts using it to signal meaning, which is the single fastest fix for a UI that feels noisy, cheap, or off.",
  },
  {
    q: "Is there a free / open-source design tool for AI coding agents?",
    a: "Yes — StyleSeed is MIT-licensed and free. It's a design engine for Claude Code, Codex, Cursor, and vibe coding that gives the agent 74 design rules, 48 React components, 7 brand skins, and a named motion system. It works with React, TypeScript, Tailwind, Radix, and shadcn/ui.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-14">
          <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">FAQ</div>
          <h1 className="mt-3 text-[clamp(30px,5vw,44px)] font-bold leading-tight tracking-tight">
            Making AI-built UI look designed, not generated.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            The real questions developers ask when their app looks generic — and the honest answers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="space-y-8">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h2 className="text-[18px] font-bold leading-snug tracking-tight text-neutral-900">{f.q}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-neutral-200 pt-10">
          <a
            href="https://github.com/bitjaru/styleseed"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-[14px] font-bold text-white hover:bg-black"
          >
            <Star size={15} className="fill-amber-400 text-amber-400" /> Star on GitHub
          </a>
          <Link href="/how-it-thinks" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-5 py-3 text-[14px] font-bold text-neutral-900 hover:border-neutral-300">
            See how it thinks <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
