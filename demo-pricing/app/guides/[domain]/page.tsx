import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star, X } from "lucide-react";
import { DOMAINS, DOMAIN_BY_SLUG } from "@/lib/domains";

const BASE = "https://styleseed-demo.vercel.app";

export function generateStaticParams() {
  return DOMAINS.map((d) => ({ domain: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const d = DOMAIN_BY_SLUG[domain];
  if (!d) return {};
  const title = `${d.seoName} — for Claude Code, Cursor & Codex`;
  const description = `Get Claude Code, Cursor or Codex to build a ${d.name.toLowerCase()} app that doesn't look AI-generated. ${d.dna} The color, density, typography, motion and patterns that make ${d.name.toLowerCase()} look designed — plus the StyleSeed skin to start from.`;
  return {
    title,
    description,
    keywords: [
      d.seoName.toLowerCase(),
      `${d.name.toLowerCase()} ui that doesn't look ai-generated`,
      `claude code ${d.slug} design`,
      `cursor ${d.slug} ui`,
      `ai generated ${d.slug} ui`,
      "make ai ui look designed",
      "claude code design",
    ],
    alternates: { canonical: `${BASE}/guides/${d.slug}` },
    openGraph: {
      type: "article",
      url: `${BASE}/guides/${d.slug}`,
      title,
      description,
      siteName: "StyleSeed",
      images: [{ url: `${BASE}/og/coherence.png`, width: 1280, height: 640 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${BASE}/og/coherence.png`] },
  };
}

export default async function DomainGuidePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const d = DOMAIN_BY_SLUG[domain];
  if (!d) notFound();

  const others = DOMAINS.filter((x) => x.slug !== d.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${d.seoName} — a StyleSeed guide for AI coding agents`,
    description: d.dna,
    url: `${BASE}/guides/${d.slug}`,
    author: { "@type": "Organization", name: "StyleSeed" },
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/guides" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={15} /> All design guides
        </Link>

        <header className="mb-10">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: d.accent }}>
            Design guide
          </div>
          <h1 className="text-[clamp(30px,5vw,42px)] font-bold leading-tight tracking-tight">{d.seoName}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-neutral-600">{d.dna}</p>
        </header>

        {/* type recipe + corner personality (VISUAL-CRAFT §C2/§C0) */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: d.accent }}>Typography</div>
            <dl className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-neutral-700">
              <div><dt className="inline font-semibold text-neutral-500">Typeface · </dt><dd className="inline">{d.type.character}</dd></div>
              <div><dt className="inline font-semibold text-neutral-500">Hero · </dt><dd className="inline">{d.type.hero}</dd></div>
              <div><dt className="inline font-semibold text-neutral-500">Body · </dt><dd className="inline">{d.type.body}</dd></div>
              <div><dt className="inline font-semibold text-neutral-500">Numerals · </dt><dd className="inline">{d.type.numerals}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: d.accent }}>Corner personality</div>
            <p className="mt-2 text-[15px] font-semibold text-neutral-800">{d.radius}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              Pick one and apply it to <em>every</em> card, button, input, and modal. Mixing sharp and
              round corners is the #1 tell of un-designed UI.
            </p>
          </div>
        </section>

        {/* the six dials */}
        <section className="space-y-3">
          {d.dials.map((dial) => (
            <div key={dial.label} className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: d.accent }}>{dial.label}</div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-700">{dial.value}</p>
            </div>
          ))}
        </section>

        {/* anti-patterns */}
        <section className="mt-10">
          <h2 className="text-[20px] font-bold tracking-tight">Avoid in {d.name.toLowerCase()}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {d.antiPatterns.map((a) => (
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
            StyleSeed bakes this judgment into 74 rules your AI reads automatically.
            For {d.name.toLowerCase()}, start from the{" "}
            <strong className="text-neutral-900">{d.skins.map((s) => s[0].toUpperCase() + s.slice(1)).join(" / ")}</strong>{" "}
            skin and the{" "}
            <Link href="/motion" className="font-semibold underline underline-offset-2" style={{ color: d.accent }}>
              {d.seed}
            </Link>{" "}
            motion seed.
          </p>
          {d.showcase.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {d.showcase.map((id) => (
                <Link key={id} href={`/showcase/${id}`} className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-200">
                  See the {id} build <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-neutral-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[18px] font-bold">Make your AI design {d.name.toLowerCase()} right</div>
            <div className="mt-1 text-[14px] text-neutral-400">Open source design engine for Claude Code, Codex & Cursor. MIT.</div>
          </div>
          <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]">
            <Star size={15} className="fill-amber-400 text-amber-400" /> Star on GitHub
          </a>
        </section>

        {/* other domains */}
        <section className="mt-12">
          <h2 className="text-[16px] font-bold tracking-tight text-neutral-500">Other design guides</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/guides/${o.slug}`} className="rounded-xl bg-white p-3 text-[14px] font-semibold text-neutral-800 hover:shadow-md" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                {o.seoName} →
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
