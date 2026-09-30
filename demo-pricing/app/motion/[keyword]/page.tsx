import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import {
  MOTION_LIBRARY,
  MOTION_BY_KEY,
  type MotionCategory,
} from "@engine/motion";
import { DemoStage } from "./demo-stage";

const BASE = "https://styleseed-demo.vercel.app";

const ACCENT: Record<MotionCategory, string> = {
  flair: "#8B5CF6",
  toggle: "#3182F6",
  reveal: "#635BFF",
  press: "#FF4E8B",
  attention: "#F59E0B",
  list: "#10B981",
};

const CAT_LABEL: Record<MotionCategory, string> = {
  flair: "Flair",
  toggle: "Toggle",
  reveal: "Reveal",
  press: "Press",
  attention: "Attention",
  list: "List",
};

const SEED_VIBE: Record<string, string> = {
  spring: "bouncy, energetic",
  silk: "smooth, elegant",
  snap: "instant, decisive",
  float: "weightless, dreamy",
  pulse: "rhythmic, alive",
};

export function generateStaticParams() {
  return MOTION_LIBRARY.map((m) => ({ keyword: m.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const m = MOTION_BY_KEY[keyword];
  if (!m) return {};
  const title = `${m.label} (${m.key}) — copy-paste framer-motion · StyleSeed`;
  const description = `${m.vibe}. Copy-paste the ${m.key} framer-motion recipe — live demo + code you can drop into any React project, or run /styleseed motion ${m.key} in Claude Code.`;
  return {
    title,
    description,
    keywords: [
      m.key,
      `${m.key} framer motion`,
      `${m.label} react`,
      `${m.key} animation`,
      "framer motion examples",
      "copy paste framer motion",
    ],
    alternates: { canonical: `${BASE}/motion/${m.key}` },
    openGraph: {
      type: "article",
      url: `${BASE}/motion/${m.key}`,
      title,
      description,
      siteName: "StyleSeed",
      images: [{ url: `${BASE}/og/motion.png`, width: 1280, height: 640 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE}/og/motion.png`],
    },
  };
}

export default async function MotionKeywordPage({
  params,
}: {
  params: Promise<{ keyword: string }>;
}) {
  const { keyword } = await params;
  const m = MOTION_BY_KEY[keyword];
  if (!m) notFound();

  const accent = ACCENT[m.category];
  const related = MOTION_LIBRARY.filter(
    (x) => x.category === m.category && x.key !== m.key,
  ).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${m.label} — framer-motion recipe (${m.key})`,
    description: m.vibe,
    url: `${BASE}/motion/${m.key}`,
    author: { "@type": "Organization", name: "StyleSeed" },
    about: ["framer-motion", "react animation", m.key],
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <Link
          href="/motion"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={15} /> All motion keywords
        </Link>

        {/* header */}
        <header className="mb-8">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: `${accent}1a`, color: accent }}
            >
              {CAT_LABEL[m.category]}
            </span>
            <code
              className="rounded-md px-2 py-0.5 text-[12px] font-semibold"
              style={{ background: `${accent}14`, color: accent }}
            >
              {m.key}
            </code>
          </div>
          <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-tight">{m.label}</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-neutral-600">{m.vibe}.</p>
        </header>

        {/* live demo + code */}
        <DemoStage keyword={m.key} accent={accent} snippet={m.snippet} />

        {/* how to use */}
        <section className="mt-12">
          <h2 className="text-[20px] font-bold tracking-tight">How to use it</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card title="Copy-paste">
              Grab the code above and drop it onto any{" "}
              <code className="rounded bg-neutral-100 px-1 text-[12px]">motion.*</code> element.
            </Card>
            <Card title="Or name it">
              In Claude Code / Cursor, run{" "}
              <code className="rounded bg-neutral-100 px-1 text-[12px]">/styleseed motion {m.key}</code>{" "}
              and the recipe lands in your code.
            </Card>
            <Card title="Personality">
              Pairs naturally with the{" "}
              <span className="font-semibold text-neutral-900">{m.seed}</span> seed (
              {SEED_VIBE[m.seed] ?? "consistent feel"}).
            </Card>
          </div>
        </section>

        {/* related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[20px] font-bold tracking-tight">Related {CAT_LABEL[m.category]} moves</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.key}
                  href={`/motion/${r.key}`}
                  className="group flex items-center justify-between rounded-2xl bg-white p-4 transition-shadow hover:shadow-md"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                >
                  <div>
                    <div className="text-[14px] font-bold">{r.label}</div>
                    <div className="text-[12px] text-neutral-500">{r.vibe}</div>
                  </div>
                  <ArrowRight size={16} className="text-neutral-300 group-hover:text-neutral-900" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-neutral-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[18px] font-bold">20+ named motion moves</div>
            <div className="mt-1 text-[14px] text-neutral-400">
              All copy-paste, all in StyleSeed&rsquo;s design engine. MIT.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/motion"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]"
            >
              Browse the gallery <ArrowRight size={15} />
            </Link>
            <a
              href="https://github.com/bitjaru/styleseed"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 px-5 py-3 text-[14px] font-bold text-white hover:border-neutral-500"
            >
              <Star size={15} className="fill-amber-400 text-amber-400" /> Star
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div className="text-[13px] font-bold">{title}</div>
      <p className="mt-1.5 text-[13px] leading-snug text-neutral-600">{children}</p>
    </div>
  );
}
