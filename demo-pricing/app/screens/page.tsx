import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SCREENS } from "@/lib/screens";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Design guides by screen type — dashboard, form, landing page, detail, list & search, settings, onboarding. The job, structure, hierarchy, and patterns for each, and the anti-patterns to avoid.";

export const metadata: Metadata = {
  title: "Design guides by screen type — dashboard, form, landing & more",
  description,
  keywords: [
    "dashboard design",
    "form design",
    "landing page design",
    "settings page design",
    "ui layout patterns",
    "design system for claude code",
  ],
  alternates: { canonical: `${BASE}/screens` },
  openGraph: {
    type: "website",
    url: `${BASE}/screens`,
    title: "Design guides by screen type",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/coherence.png`, width: 1200, height: 680 }],
  },
  twitter: { card: "summary_large_image", title: "Design guides by screen type", description, images: [`${BASE}/og/coherence.png`] },
};

export default function ScreensIndex() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={15} /> StyleSeed
        </Link>

        <header className="mb-12 max-w-2xl">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">Screen guides</div>
          <h1 className="text-[clamp(30px,5vw,44px)] font-bold leading-tight tracking-tight">
            A form and a dashboard obey different rules.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            Every screen type has a job — and the structure, hierarchy, and patterns that do it.
            This is the <strong className="font-semibold text-neutral-900">screen-type axis</strong> of
            design judgment; cross it with your <Link href="/guides" className="font-semibold underline underline-offset-2">app domain</Link> for
            the actual decisions.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((s) => (
            <Link
              key={s.slug}
              href={`/screens/${s.slug}`}
              className="group flex flex-col rounded-2xl bg-white p-6 transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}
            >
              <div className="h-1.5 w-10 rounded-full" style={{ background: s.accent }} />
              <h2 className="mt-4 text-[18px] font-bold tracking-tight">{s.name}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-600">{s.job}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: s.accent }}>
                Read the guide <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
