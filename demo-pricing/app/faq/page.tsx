import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import questions from "@/content/design-questions.json";
import install from "@/content/install.json";
import { InstallCommand, PromptBox } from "../_home/prompt-box";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "App works but looks amateur? Fix repetitive AI layouts, inconsistent pages, and screenshots that do not translate. Practical steps and prompts for Claude Code and Codex.";

export const metadata: Metadata = {
  title: "AI app looks amateur? Fix common UI problems",
  description,
  keywords: [
    "make my app look professional",
    "ui looks generic ai generated",
    "every shadcn app looks the same",
    "make it look like linear stripe notion",
    "design system for claude code cursor",
    "improve spacing typography hierarchy",
    "free design tool for ai coding",
    "private AI design learning",
    "StyleSeed engine revision update",
  ],
  alternates: { canonical: `${BASE}/faq` },
  openGraph: {
    type: "website",
    url: `${BASE}/faq`,
    title: "AI app looks amateur? Fix common UI problems",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/coherence.png`, width: 1280, height: 640 }],
  },
  twitter: { card: "summary_large_image", title: "StyleSeed FAQ", description, images: [`${BASE}/og/coherence.png`] },
};

/** Answer leads with a self-contained 40–60 word capsule (the citation unit), then optional context. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I install StyleSeed without choosing from a long list of agents?",
    a: `Run ${install.default} in your project’s terminal. This installs all core skills for Codex and Claude Code in that project, using copies and skipping the installer menus. Then use $styleseed in Codex or /styleseed in Claude Code and describe the screen you want to improve. If the skills do not appear, start a fresh agent session.`,
  },
  {
    q: "Why is Codex missing from the installer’s Additional agents list?",
    a: "Codex is already in the Universal group, which reads .agents/skills. It does not need to be selected again under Additional agents. When using the interactive installer, select Claude Code there if you also use it, choose Project, and choose Copy for a fresh project. The explicit install command above skips these choices.",
  },
  {
    q: "What is StyleSeed's goal — does it replace designers?",
    a: "StyleSeed aims to make expert design judgment repeatable by coding agents, not replace experts with aesthetic preferences. People own intent, tradeoffs, and acceptance. The current engine compiles selected rules, preserves project choices, and supports implementation checks; passing those checks does not establish expert-level quality.",
  },
  {
    q: "Can it work with our existing design system?",
    a: "Preserving an approved system is a product priority, not a promise of universal import today. Start from the project's real components, semantic tokens, and decisions. Where the engine cannot express them, report the mismatch instead of silently choosing a StyleSeed preset. Component-contract integration and independent quality evaluation are planned research.",
  },
  {
    q: "I applied StyleSeed but the design still looks bad / colors are random / there's no key color — what do I do?",
    a: "Consistency comes from constraints, and the one-paste prompt is the least-constrained path. Fix it in five steps. 1) Select the output grammar and surface adapter before code. 2) Lock a primary action color and define stable roles for any additional hues. 3) If you have references that StyleSeed does not model, run /styleseed reference instead of copying them. 4) Install the provider's project entry or invoke the installed StyleSeed skill so visual work reads STYLESEED.md. 5) Run /styleseed score, then render and inspect with /styleseed verify; the reference demo was not one-shot either.",
  },
  {
    q: "Why does the same prompt give a great result one time and a generic one the next?",
    a: "A prompt alone may leave important decisions implicit, and models can still vary even with the same context. Record the approved system, load the relevant rules and implementation material, and inspect the result. More constraints are not automatically better: task fit, correct components, meaningful states, and human review matter alongside consistency.",
  },
  {
    q: "Why does every shadcn app look the same, and how do I make mine different?",
    a: "Unmodified shadcn converges on a “fingerprint”: slate/zinc neutrals, Inter at default sizes, 8px radius everywhere, a default primary. StyleSeed breaks that fingerprint with rules and 7 brand skins (Toss, Stripe, Linear, Notion, Raycast, Arc, Vercel) so your AI-built app gets a committed accent, a real type pairing, and a signature look — not the default.",
  },
  {
    q: "How do I give Claude Code, Codex, or Cursor a design system so it stops making ugly UI?",
    a: "StyleSeed is a design-method engine for that job. Its core ships 8 output grammars, 5 surface adapters, 48 React components, 7 brand skins, a router, and 22 canonical ss-* workflows. STYLESEED.md preserves bounded project decisions; installed project instructions and StyleSeed skills re-read it for visual work instead of reinventing spacing, colors, type, and motion.",
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
    q: "Can StyleSeed learn from corrections made by a designer?",
    a: "An optional repository-only extension can, but it is not part of the core or public npx installation. With caller-attested review, $ss-learn turns an accepted correction into a generalized local candidate. Capture, review, packaging, bridge exposure, and promotion are separate decisions; one candidate never becomes a team or core rule automatically.",
  },
  {
    q: "Does $ss-learn upload my code, prompts, screenshots, or brand data?",
    a: "No automatic upload exists. The repository-only learning contract rejects project code, prompt text, screenshots, URLs, local paths, brand tokens, and arbitrary extra fields. Its scanner is a guardrail, not an anonymization guarantee, so review the exact package before exposure. The development bridge stays disabled until a host-owned proof adapter is verified; enabling it would reveal one exact approved package to the connected client and model after a one-time grant.",
  },
  {
    q: "Why can $styleseed update find an update when the semantic version has not changed?",
    a: "StyleSeed tracks both engineVersion and engineRevision. The version names the release line; the revision hashes the exact maintained method, 1 skill, plugin boundary, and palette engine. $styleseed update compares installed, project-recorded, and published revisions, then refreshes the engine and re-resolves the project lock without replacing project-owned code or design decisions.",
  },
  {
    q: "Is the StyleSeed Codex plugin available in a public plugin directory?",
    a: "Not yet. The repository contains a development Codex package with one core skill, but public directory release is not verified. The default/core package contains neither ss-learn nor a learning MCP. Use the project-local CLI install above; a public plugin-directory release is a separate distribution path.",
  },
  {
    q: "Installing the skills asks for permission or gets blocked — is that normal? Do I even need them?",
    a: "Tool permissions depend on your agent and workspace settings. The install command skips the installer’s questions; it does not bypass host permissions. The skills include executable compilation and verification tools. Reading llms.txt can provide portable guidance when installation is unavailable, but reading markdown alone does not run those tools or establish a verified result.",
  },
  {
    q: "Does it handle UX writing / microcopy too, or just visuals?",
    a: "Both. StyleSeed covers verbal judgment as well as visual — buttons that name the action (“Send $2,400”, not “Submit”), error messages that help instead of blame (“Check the card number” not “Invalid input”), empty states that invite, calm money copy, one term per concept. The rules install with everything else, so your agent applies them to button labels, errors, and toasts automatically. Korean/CJK projects get writing principles grounded in Toss's published “8 Writing Principles.”",
  },
  {
    q: "My spacing feels off and my layout looks cramped — how do I fix it?",
    a: "Start with grouping, computed spacing values, and the actual project tokens. StyleSeed can compile scoped spatial roles and inspect explicitly mapped rendered consumers for token failures or mismatches. Its numeric recommendations are starting values; responsive content and final rhythm still need review. See the live example at /fix-ui-spacing.",
  },
  {
    q: "How do I give my dashboard better visual hierarchy?",
    a: "StyleSeed's hierarchy rules drive contrast through size, weight, color, and position so there's a clear focal point and scan path — plus dashboard patterns ready to use. Your Claude Code, Codex, or Cursor dashboard stops looking like a flat default admin template where every element competes for the same attention.",
  },
  {
    q: "I'm vibe coding without a designer — how do I get good-looking UI?",
    a: "You can use StyleSeed's maintained guidance as a starting point, make explicit choices, and run its implementation and visual-check workflows. Treat the result as something to review, not expert-approved output. StyleSeed is free and MIT-licensed; it helps apply recorded judgment but does not replace user research, design expertise, or final acceptance.",
  },
  {
    q: "How do I fix too many colors / a messy palette?",
    a: "Assign colors to roles: actions, surfaces, text, and meaningful states or data. Remove decorative color that competes with those roles, and check contrast. The right number of accents depends on the screen and approved design; StyleSeed should preserve those decisions rather than force every product into one palette.",
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
    mainEntity: [...questions.map((q) => ({ q: q.question, a: q.answer })), ...FAQ].map((f) => ({
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
            Your app works. Why doesn&rsquo;t it look right?
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            Start with the problem you can see. Try a focused change, inspect the result,
            then decide whether you need a reusable workflow.
          </p>
          <nav aria-label="Common UI problems" className="mt-6 space-y-3">
            {questions.map((q) => <a key={q.id} href={`#${q.id}`} className="block text-sm font-semibold text-teal-700 underline underline-offset-4">{q.question}</a>)}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="divide-y divide-neutral-200">
          {questions.map((q) => (
            <article key={q.id} id={q.id} className="scroll-mt-8 pb-12 pt-10 first:pt-0">
              <h2 className="text-2xl font-bold leading-snug tracking-tight">{q.question}</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-neutral-700">{q.answer}</p>
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-neutral-700">
                {q.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <h3 className="mb-3 mt-6 text-sm font-bold">Try this with your coding agent</h3>
              <PromptBox prompt={q.prompt} />
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">{q.fit}</p>
              <Link href={q.evidence.href} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 underline underline-offset-4">{q.evidence.label}<ArrowRight size={14} className="shrink-0" /></Link>
              <div lang="ko" className="mt-6 border-l-2 border-neutral-200 pl-4">
                <h3 className="text-base font-bold">{q.questionKo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{q.answerKo}</p>
              </div>
            </article>
          ))}
        </div>
        <div id="install" className="mb-14 scroll-mt-8 border-y border-neutral-200 py-8">
          <h2 className="mb-4 text-2xl font-bold">Want to use StyleSeed for this?</h2>
          <InstallCommand />
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">Then send <code>$styleseed</code> in Codex or <code>/styleseed</code> in Claude Code, followed by your task. The router selects the first workflow.</p>
        </div>
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
