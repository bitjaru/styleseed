import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOMAINS } from "@/lib/domains";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Design guides by app type — fintech, SaaS, e-commerce, social, content, productivity, health, dev tools. How to bias color, density, typography, and motion for each, and which design rules apply.";

export const metadata: Metadata = {
  title: "App design guides by type — fintech, SaaS, e-commerce & more · StyleSeed",
  description,
  keywords: [
    "app design guide",
    "ui design by app type",
    "fintech app design",
    "saas dashboard design",
    "ecommerce ui patterns",
    "design system for claude code",
  ],
  alternates: { canonical: `${BASE}/guides` },
  openGraph: {
    type: "website",
    url: `${BASE}/guides`,
    title: "Design guides by app type",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/coherence.png`, width: 1280, height: 640 }],
  },
  twitter: { card: "summary_large_image", title: "Design guides by app type", description, images: [`${BASE}/og/coherence.png`] },
};

export default function GuidesIndex() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={15} /> StyleSeed
        </Link>

        <header className="mb-12 max-w-2xl">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">Design guides</div>
          <h1 className="text-[clamp(30px,5vw,44px)] font-bold leading-tight tracking-tight">
            A fintech app and a social app shouldn&rsquo;t look the same.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            Design judgment isn&rsquo;t one-size-fits-all. Each app type biases color, density,
            typography, motion, and patterns differently — inside a composed output grammar,
            surface adapter, and fixed quality bar. Pick your domain.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => (
            <Link
              key={d.slug}
              href={`/guides/${d.slug}`}
              className="group flex flex-col rounded-2xl bg-white p-6 transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}
            >
              <div className="h-1.5 w-10 rounded-full" style={{ background: d.accent }} />
              <h2 className="mt-4 text-[18px] font-bold tracking-tight">{d.name}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-600">{d.dna}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: d.accent }}>
                Read the guide <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
