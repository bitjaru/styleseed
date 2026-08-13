import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const URL = `${BASE}/learn`;
const DESCRIPTION =
  "How StyleSeed's repository-only learning extension turns a caller-attested correction into a privacy-minimized local candidate while staying outside the default/core install.";

export const metadata: Metadata = {
  title: "Private design learning — caller-attested rules, not project surveillance",
  description: DESCRIPTION,
  keywords: [
    "AI design rule learning",
    "private design system learning",
    "caller attested AI rules",
    "Codex design skill",
    "StyleSeed ss-learn",
    "privacy preserving design workflow",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    url: URL,
    title: "StyleSeed private design learning",
    description: DESCRIPTION,
    siteName: "StyleSeed",
    images: [
      {
        url: `${BASE}/og/styleseed-og.png`,
        width: 1200,
        height: 630,
        alt: "StyleSeed private local learning and caller-attested review workflow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleSeed private design learning",
    description: DESCRIPTION,
    images: [`${BASE}/og/styleseed-og.png`],
  },
};

const STEPS = [
  {
    n: "01",
    title: "Capture only on request",
    body: "A person asks StyleSeed to preserve an accepted correction. There is no background project scan and no automatic observation mode.",
    code: "$ss-learn capture",
  },
  {
    n: "02",
    title: "Generalize the lesson",
    body: "The candidate records applicability, counterexamples, measured evidence, and limits—not the project code, screenshot, prompt, or brand material that produced it.",
    code: "local candidate",
  },
  {
    n: "03",
    title: "Review separately",
    body: "A caller-attested decision accepts or rejects the immutable draft. Preparing a share package requires another explicit attestation.",
    code: "$ss-learn review",
  },
  {
    n: "04",
    title: "Grant one exact read",
    body: "The prepared package stays local and untransmitted. The extension's development-only bridge remains disabled until a host-owned proof adapter is verified; enabling it would expose one exact package to the connected client and model after a one-time grant.",
    code: "one package · one grant",
  },
];

const FAQ = [
  {
    q: "Does StyleSeed train on my project?",
    a: "No. The current workflow creates a local, generalized candidate only after an explicit request. It does not crawl repositories, upload raw material, or train a hosted model.",
  },
  {
    q: "Does an accepted candidate become a StyleSeed rule?",
    a: "No. A share package is evidence, not a rule. Team or core promotion still needs repeated cross-project evidence, counterexamples, regression coverage, and maintainer approval.",
  },
  {
    q: "Is the MCP result private from the model?",
    a: "No. Today the prepared package stays local and untransmitted, and the repository-only bridge must remain disabled. If a verified host adapter later enables it, the exact approved package would become visible to the connected client and model after the one-time grant is consumed.",
  },
];

export default function LearnPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${URL}#article`,
        url: URL,
        headline: "StyleSeed private design learning",
        description: DESCRIPTION,
        datePublished: "2026-08-12",
        dateModified: "2026-08-12",
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        isPartOf: { "@id": `${BASE}/#website` },
        about: ["caller-attested design learning", "privacy-minimized candidates", "local package boundary", "design rule governance"],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F4F6F3] text-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="border-b border-neutral-950/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <Link href="/architecture" className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 hover:text-neutral-950">
            Engine architecture
          </Link>
        </div>
      </header>

      <section className="border-b border-neutral-950/15">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Optional repository extension · not in the core install
          </div>
          <h1 className="mt-5 max-w-[14ch] text-[clamp(44px,7vw,80px)] font-black leading-[0.94] tracking-[-0.055em]">
            Learn from human judgment. Not private projects.
          </h1>
          <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-neutral-600">
            StyleSeed can preserve a correction that a person already accepted, turn it into a
            bounded local candidate, and prepare one reviewed local package. Capture, sharing,
            optional bridge exposure, and core-rule promotion remain separate decisions.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px overflow-hidden border border-neutral-950/15 bg-neutral-950/15 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step) => (
            <article key={step.n} className="bg-[#FBFCFA] p-6">
              <div className="font-mono text-[11px] font-bold text-emerald-700">{step.n}</div>
              <h2 className="mt-8 text-xl font-black leading-tight tracking-[-0.025em]">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              <code className="mt-6 block border-t border-neutral-200 pt-4 font-mono text-xs font-bold text-neutral-800">
                {step.code}
              </code>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-950/15 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-px bg-white/15 lg:grid-cols-2">
          <div className="bg-neutral-950 px-6 py-14 lg:p-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Allowed candidate material</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Generalized design judgment</h2>
            <ul className="mt-7 space-y-3 text-[15px] leading-relaxed text-neutral-300">
              <li>Applicability and explicit non-applicability</li>
              <li>Measured evidence and confidence limits</li>
              <li>Counterexamples and regression expectations</li>
              <li>Content hash and immutable review history</li>
            </ul>
          </div>
          <div className="bg-neutral-950 px-6 py-14 lg:p-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-300">Rejected raw material</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Project surveillance</h2>
            <ul className="mt-7 space-y-3 text-[15px] leading-relaxed text-neutral-300">
              <li>Source code, private prompts, screenshots, or URLs</li>
              <li>Names, reviewer identity, and local file paths</li>
              <li>Brand tokens, credentials, or arbitrary extra fields</li>
              <li>Background crawling or automatic core-rule edits</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Promotion boundary</div>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em]">A candidate is evidence. Never authority.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              One successful correction may be local and accidental. StyleSeed keeps it useful
              without pretending it is universal. Promotion requires repetition across contexts,
              named review, counterexamples, and regression proof.
            </p>
          </div>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ.map((item) => (
              <article key={item.q} className="py-6">
                <h3 className="text-lg font-black tracking-[-0.02em]">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap gap-3 border-t border-neutral-950/15 pt-10">
          <a
            href="https://github.com/bitjaru/styleseed/tree/main/extensions/learning/skills/ss-learn"
            className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-sm font-bold text-white"
          >
            Inspect $ss-learn <ArrowRight size={14} />
          </a>
          <Link href="/codex-ui-design" className="inline-flex items-center gap-2 border border-neutral-300 px-5 py-3 text-sm font-bold">
            Codex workflow <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
