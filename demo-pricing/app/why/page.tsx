import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Comparison } from "./comparison";
import competitorSource from "@/content/competitor-source.json";
import versionInfo from "../../public/version.json";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Why does AI-generated UI look the same? Because models pick the same defaults " +
  "every time. A side-by-side of generic AI-generated UI vs the same dashboard with " +
  "a selected StyleSeed consumer-summary treatment: deliberate hierarchy, stable color roles, " +
  "visual rhythm, intentional motion.";

export const metadata: Metadata = {
  title: "Why does AI-generated UI look the same? — StyleSeed",
  description,
  keywords: [
    "why does ai generated ui look the same",
    "ai generated ui looks the same",
    "make ai ui look designed",
    "claude code design",
    "before after design system",
    "design rules for LLM",
  ],
  alternates: { canonical: `${BASE}/why` },
  openGraph: {
    type: "website",
    url: `${BASE}/why`,
    title: "Why does AI-generated UI look the same?",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/why.png`, width: 1280, height: 640 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why does AI-generated UI look the same?",
    description,
    images: [`${BASE}/og/why.png`],
  },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Why does AI-generated UI look the same? — and the judgment layer that fixes it",
    description,
    url: `${BASE}/why`,
    author: { "@type": "Organization", name: "StyleSeed" },
  };
}

export default function WhyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={15} /> StyleSeed
        </Link>

        <header className="mb-12 max-w-2xl">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Why StyleSeed
          </div>
          <h1 className="text-[clamp(30px,5vw,44px)] font-bold leading-tight tracking-tight">
            Why does AI-generated UI
            <br />
            all look the <span className="text-violet-600">same</span>?
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            Both dashboards below were &ldquo;built by AI&rdquo; from the same brief, with the
            same component library available. The left is what models ship by default. The
            right is the same model reading StyleSeed&rsquo;s {versionInfo.rules} design rules. Every fix is
            annotated with the rule that caused it.
          </p>
        </header>

        <Comparison />

        <section id="workflow-fit" className="mt-20 scroll-mt-8 border-t border-neutral-200 pt-12">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight">Why not just use the official frontend-design skill?</h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-neutral-600">
            Use both. Anthropic&rsquo;s official <code>frontend-design</code> skill helps establish
            visual direction. StyleSeed carries recorded decisions across screens, sessions,
            reference sets, and verification: it compiles only the rules selected for an artifact,
            gives each rule an ID and priority, and records the checks that actually ran.
            A blocking invariant fails independently of the score. People still own the design
            judgment and any exceptions; passing a gate is not approval.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold text-teal-800">
            <Link href="/claude-code-ui-design" className="inline-flex min-h-11 items-center underline underline-offset-4">Claude Code UI design workflow →</Link>
            <Link href="/codex-ui-design" className="inline-flex min-h-11 items-center underline underline-offset-4">Codex UI design workflow →</Link>
          </div>
          <article className="mt-10 rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
            <p className="text-sm text-neutral-500">Named peer · observed {competitorSource.observedAt}</p>
            <h3 className="mt-3 text-xl font-semibold">{competitorSource.impeccable.name} is an execution-layer reference.</h3>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">{competitorSource.impeccable.capabilitySummary}</p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600">
              {competitorSource.styleseedFocus} This is a capability-specific snapshot, not an overall ranking.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold text-teal-800">
              <a href={competitorSource.impeccable.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Repository ↗</a>
              <a href={competitorSource.impeccable.cliSourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">CLI evidence ↗</a>
              <a href={competitorSource.impeccable.hooksSourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Hook evidence ↗</a>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
