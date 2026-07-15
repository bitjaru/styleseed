import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Comparison } from "./comparison";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Why does AI-generated UI look the same? Because models pick the same defaults " +
  "every time. A side-by-side of generic AI-generated UI vs the same dashboard with " +
  "StyleSeed's 74 design rules applied: grayscale discipline, one accent, 2:1 numbers, " +
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
            right is the same model reading StyleSeed&rsquo;s 74 design rules. Every fix is
            annotated with the rule that caused it.
          </p>
        </header>

        <Comparison />
      </div>
    </main>
  );
}
