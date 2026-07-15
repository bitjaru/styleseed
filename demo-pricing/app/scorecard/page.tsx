import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "We ran our own old landing page through our own quality gate (/ss-score). It scored 58/100. Here is the full category breakdown, every generic-AI tell it flagged, and how the fixes took it to 86.";

export const metadata: Metadata = {
  title: "We scored our own landing 58/100 — the StyleSeed self-own",
  description,
  keywords: [
    "why does ai generated ui look the same",
    "ai ui quality score",
    "make claude code ui look designed",
    "design quality gate",
    "ss-score",
    "ai generated design tells",
  ],
  alternates: { canonical: `${BASE}/scorecard` },
  openGraph: {
    type: "article",
    url: `${BASE}/scorecard`,
    title: "We scored our own landing 58/100",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/v26-compare.png`, width: 1516, height: 1008 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "We scored our own landing 58/100",
    description,
    images: [`${BASE}/v26-compare.png`],
  },
};

/** The eight weighted categories of /ss-score (engine/.claude/skills/ss-score). Total = 100. */
type Row = {
  category: string;
  weight: number;
  before: number;
  after: number;
  tell: string;
};

const ROWS: Row[] = [
  {
    category: "Color discipline",
    weight: 16,
    before: 7,
    after: 15,
    tell: "The unlocked default indigo as the accent, plus gradient-rainbow hero text — two decorative hues where there should be one chosen color.",
  },
  {
    category: "Distinctiveness",
    weight: 10,
    before: 3,
    after: 7,
    tell: "The icon-in-a-pale-chip cliché repeated per feature, a placeholder mock instead of the real product, and an all-even card grid with no focal point.",
  },
  {
    category: "Coherence",
    weight: 12,
    before: 5,
    after: 10,
    tell: "A sparkle badge, a gradient headline, and a flat indigo button pulling in three different directions — no single visual language.",
  },
  {
    category: "Hierarchy & typography",
    weight: 16,
    before: 12,
    after: 14,
    tell: "Number/unit not set 2:1, a generic scale that never lets one element dominate.",
  },
  {
    category: "States & a11y",
    weight: 18,
    before: 12,
    after: 15,
    tell: "Missing focus rings; low-contrast gradient text below the 4.5:1 body floor.",
  },
  {
    category: "Layout & rhythm",
    weight: 12,
    before: 9,
    after: 11,
    tell: "Off-grid one-off spacing breaking the 8px rhythm in a couple of sections.",
  },
  {
    category: "Cards & elevation",
    weight: 10,
    before: 7,
    after: 9,
    tell: "1px borders doing separation work that tone + a soft shadow should do.",
  },
  {
    category: "Motion & interaction",
    weight: 6,
    before: 3,
    after: 5,
    tell: "Ad-hoc fades instead of one named motion seed.",
  },
];

const BEFORE_TOTAL = ROWS.reduce((s, r) => s + r.before, 0); // 58
const AFTER_TOTAL = ROWS.reduce((s, r) => s + r.after, 0); // 86

function band(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export default function Scorecard() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* header / back */}
      <div className="border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-14">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[14px] font-bold text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft size={15} /> StyleSeed
          </Link>

          <div className="mt-8 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            The self-own
          </div>
          <h1 className="mt-2 text-[clamp(32px,5vw,52px)] font-bold leading-[1.05] tracking-tight">
            We ran our own landing through our own gate.
            <br />
            It scored{" "}
            <span className="text-red-600">{BEFORE_TOTAL}</span>.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-600">
            StyleSeed ships a quality gate — <code className="rounded bg-neutral-100 px-1 font-mono text-[15px]">/ss-score</code>{" "}
            reads a screen and scores it 0–100 across eight weighted categories. So we pointed it
            at an early version of this very page. It came back{" "}
            <strong className="font-bold text-neutral-900">{BEFORE_TOTAL}/100 ({band(BEFORE_TOTAL)})</strong>{" "}
            — a failing grade, on the tool&rsquo;s own homepage. That&rsquo;s the moment we knew the
            gate was worth shipping. Fixing the flagged tells took it to{" "}
            <strong className="font-bold text-neutral-900">{AFTER_TOTAL}/100 ({band(AFTER_TOTAL)})</strong>.
          </p>
        </div>
      </div>

      {/* the visual */}
      <section className="mx-auto max-w-4xl px-6 pt-14">
        <figure>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
            <Image
              src="/v26-compare.png"
              alt="The same landing before and after StyleSeed: before has default indigo, gradient text, a sparkle badge and a placeholder mock; after has one chosen accent, the real product as the focal point, and a numbered flow that reads designed."
              width={1516}
              height={1008}
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 text-center text-[13px] text-neutral-500">
            The tells the gate deducts for, annotated on a before/after build — default indigo,
            gradient text, icon-chips vs one chosen accent, the real product, one focal point. Our
            landing&rsquo;s {BEFORE_TOTAL} was the same story.
          </figcaption>
        </figure>
      </section>

      {/* the scorecard */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          The breakdown
        </div>
        <h2 className="mt-2 text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
          What the {BEFORE_TOTAL} got dinged for
        </h2>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-neutral-600">
          Every category starts at full marks and loses points for named violations the gate finds
          by reading the code — no vibes, just the tells. Sorted by how much each one hurt.
        </p>

        <div className="mt-10 space-y-5">
          {ROWS.map((r) => {
            const beforePct = (r.before / r.weight) * 100;
            const afterPct = (r.after / r.weight) * 100;
            return (
              <div
                key={r.category}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[15px] font-bold tracking-tight text-neutral-900">
                    {r.category}
                  </h3>
                  <div className="shrink-0 font-mono text-[13px] tabular-nums">
                    <span className="font-bold text-red-600">{r.before}</span>
                    <span className="text-neutral-400"> → </span>
                    <span className="font-bold text-emerald-600">{r.after}</span>
                    <span className="text-neutral-400"> / {r.weight}</span>
                  </div>
                </div>

                {/* before/after bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-widest text-red-500">
                      before
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${beforePct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      after
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${afterPct}%` }} />
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">{r.tell}</p>
              </div>
            );
          })}
        </div>

        {/* totals */}
        <div className="mt-8 flex items-center justify-center gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <div className="text-center">
            <div className="font-mono text-[40px] font-bold leading-none tabular-nums text-red-600">
              {BEFORE_TOTAL}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              before · {band(BEFORE_TOTAL)}
            </div>
          </div>
          <ArrowRight size={24} className="text-neutral-300" />
          <div className="text-center">
            <div className="font-mono text-[40px] font-bold leading-none tabular-nums text-emerald-600">
              {AFTER_TOTAL}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              after · {band(AFTER_TOTAL)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[13px] text-neutral-500">
          The gate&rsquo;s pass bar is 80 — a floor, not a ceiling. We stopped at {AFTER_TOTAL}; the
          point isn&rsquo;t a perfect 100, it&rsquo;s that no obviously-generic first draft ever
          reaches you.
        </p>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200 bg-neutral-900 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
            Score your own UI in one line.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-neutral-300">
            Install StyleSeed, then run <code className="rounded bg-white/10 px-1 font-mono text-[14px]">/ss-score</code>{" "}
            on any screen your agent built. You&rsquo;ll get the same category breakdown — and a
            prioritized fix list ordered by score gain.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <code className="rounded-xl bg-black/40 px-4 py-3 font-mono text-[14px] text-neutral-200">
              npx skills add bitjaru/styleseed
            </code>
            <a
              href="https://github.com/bitjaru/styleseed"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Star on GitHub
              <span className="font-semibold text-neutral-500">★ 680+</span>
            </a>
          </div>
          <p className="mt-6 text-[14px] text-neutral-400">
            <Link href="/why" className="font-semibold text-violet-300 underline underline-offset-2">
              See the full before/after teardown →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
