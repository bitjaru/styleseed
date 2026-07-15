import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Star, X } from "lucide-react";
import { SCREENS, SCREEN_BY_SLUG } from "@/lib/screens";

const BASE = "https://styleseed-demo.vercel.app";

export function generateStaticParams() {
  return SCREENS.map((s) => ({ type: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const s = SCREEN_BY_SLUG[type];
  if (!s) return {};
  const title = `${s.seoName} — for Claude Code, Cursor & Codex`;
  const description = `Get Claude Code, Cursor or Codex to build a ${s.name.toLowerCase()} that doesn't look AI-generated. ${s.job} The structure, hierarchy, signature patterns and anti-patterns that make a ${s.name.toLowerCase()} look designed.`;
  return {
    title,
    description,
    keywords: [
      s.seoName.toLowerCase(),
      `${s.slug} that doesn't look ai-generated`,
      `claude code ${s.slug} design`,
      `cursor ${s.slug} ui`,
      `ai generated ${s.slug}`,
      "make ai ui look designed",
      "claude code design",
    ],
    alternates: { canonical: `${BASE}/screens/${s.slug}` },
    openGraph: {
      type: "article",
      url: `${BASE}/screens/${s.slug}`,
      title,
      description,
      siteName: "StyleSeed",
      images: [{ url: `${BASE}/og/coherence.png`, width: 1200, height: 680 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${BASE}/og/coherence.png`] },
  };
}

export default async function ScreenGuidePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const s = SCREEN_BY_SLUG[type];
  if (!s) notFound();

  const others = SCREENS.filter((x) => x.slug !== s.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${s.seoName} — a StyleSeed guide for AI coding agents`,
    description: s.job,
    url: `${BASE}/screens/${s.slug}`,
    author: { "@type": "Organization", name: "StyleSeed" },
  };

  const Block = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
      <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: s.accent }}>{label}</div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-700">{children}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/screens" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={15} /> All screen guides
        </Link>

        <header className="mb-10">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: s.accent }}>
            Screen guide
          </div>
          <h1 className="text-[clamp(30px,5vw,42px)] font-bold leading-tight tracking-tight">{s.seoName}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-neutral-600">
            <span className="font-semibold text-neutral-900">The job: </span>{s.job}
          </p>
        </header>

        <section className="space-y-3">
          <Block label="Structure">{s.structure}</Block>
          <Block label="Hierarchy">{s.hierarchy}</Block>
          <Block label="Mobile">{s.mobile}</Block>
        </section>

        {/* patterns */}
        <section className="mt-10">
          <h2 className="text-[20px] font-bold tracking-tight">Signature patterns</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {s.patterns.map((p) => (
              <li key={p} className="flex items-start gap-2 rounded-xl bg-white p-3 text-[13px] text-neutral-700" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <Check size={15} className="mt-0.5 shrink-0" style={{ color: "#16A34A" }} /> {p}
              </li>
            ))}
          </ul>
        </section>

        {/* anti-patterns */}
        <section className="mt-8">
          <h2 className="text-[20px] font-bold tracking-tight">Avoid</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {s.antiPatterns.map((a) => (
              <li key={a} className="flex items-start gap-2 rounded-xl bg-white p-3 text-[13px] text-neutral-700" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <X size={15} className="mt-0.5 shrink-0 text-red-400" /> {a}
              </li>
            ))}
          </ul>
        </section>

        {/* StyleSeed setup */}
        <section className="mt-10 rounded-2xl bg-white p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
          <h2 className="text-[18px] font-bold tracking-tight">Build it with StyleSeed</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
            This is the <strong className="text-neutral-900">screen-type</strong> half of design
            judgment — cross it with your app&rsquo;s <Link href="/guides" className="font-semibold underline underline-offset-2" style={{ color: s.accent }}>domain</Link> and
            you get the actual decisions. StyleSeed bakes both into 74 rules your AI reads
            automatically; for a {s.name.toLowerCase()}, reach for the{" "}
            <Link href="/motion" className="font-semibold underline underline-offset-2" style={{ color: s.accent }}>{s.seed}</Link> motion seed.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-neutral-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[18px] font-bold">Make your AI design a {s.name.toLowerCase()} right</div>
            <div className="mt-1 text-[14px] text-neutral-400">Open-source design engine for Claude Code, Codex &amp; Cursor. MIT.</div>
          </div>
          <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]">
            <Star size={15} className="fill-amber-400 text-amber-400" /> Star on GitHub
          </a>
        </section>

        {/* other screens */}
        <section className="mt-12">
          <h2 className="text-[16px] font-bold tracking-tight text-neutral-500">Other screen guides</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/screens/${o.slug}`} className="rounded-xl bg-white p-3 text-[14px] font-semibold text-neutral-800 hover:shadow-md" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                {o.seoName} →
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
