import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "The AI Builder Design Gate: we make coding agents and app builders produce the same 20 screens, then score every one 0-100 with a public design rubric. Same prompts, same judge, reproducible scripts. No builder clears a B by default.";

export const metadata: Metadata = {
  title: "The AI Builder Design Gate — a scored design leaderboard",
  description,
  // Draft until the neutral-judge, multi-builder run lands. Flip to index on v1.0.
  robots: { index: false, follow: false },
  alternates: { canonical: `${BASE}/gate` },
  openGraph: {
    type: "article",
    url: `${BASE}/gate`,
    title: "The AI Builder Design Gate",
    description,
    siteName: "StyleSeed",
  },
};

/**
 * Baseline run (2026-05-29): 20 fixtures x 5 domains, judge = codex:default.
 * Raw data: results.json in the bench repo — reproducible via `pixelmind bench`.
 * v1.0 adds: neutral judge, v0 / Bolt / Lovable, and rules / rules+gate conditions.
 */
type AgentRow = {
  agent: string;
  avg: number;
  median: number;
  scored: string;
  wall: string;
  cats: Record<string, number>;
};

const CATEGORIES = [
  "hierarchy",
  "spacing",
  "typography",
  "color",
  "alignment",
  "density",
  "consistency",
  "accessibility",
  "brand-fit",
] as const;

const AGENTS: AgentRow[] = [
  {
    agent: "Codex CLI",
    avg: 79.8,
    median: 81,
    scored: "20/20",
    wall: "19m50s",
    cats: {
      hierarchy: 83.5, spacing: 80.1, typography: 82.3, color: 76.9,
      alignment: 86.7, density: 78.2, consistency: 85.4, accessibility: 66.2,
      "brand-fit": 82.8,
    },
  },
  {
    agent: "Claude Code",
    avg: 78.9,
    median: 80,
    scored: "19/20",
    wall: "27m21s",
    cats: {
      hierarchy: 82.3, spacing: 79.4, typography: 81.9, color: 78.3,
      alignment: 85.7, density: 75.6, consistency: 84.5, accessibility: 65.3,
      "brand-fit": 81.6,
    },
  },
];

function grade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "C+";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(score: number): string {
  if (score >= 80) return "bg-emerald-600";
  if (score >= 70) return "bg-amber-500";
  if (score >= 60) return "bg-orange-600";
  return "bg-red-600";
}

export default function Gate() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* header */}
      <div className="border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-14">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[14px] font-bold text-neutral-500 hover:text-neutral-900"
            >
              <ArrowLeft size={15} /> StyleSeed
            </Link>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            v0.1 draft — baseline run
          </div>
          <h1 className="mt-4 text-[clamp(32px,5vw,52px)] font-bold leading-[1.05] tracking-tight">
            The AI Builder
            <br />
            Design Gate
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-600">
            Same 20 prompts, five product domains, one public 0–100 design rubric, one judge.
            Every score comes with its category breakdown and a reproducible script — no vibes.
            The headline from the baseline run:{" "}
            <strong className="font-bold text-neutral-900">
              no coding agent clears a B by default
            </strong>
            , and accessibility is every agent&rsquo;s weakest category.
          </p>
        </div>
      </div>

      {/* leaderboard */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Leaderboard — bare agents, no rules
        </div>
        <h2 className="mt-2 text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
          Baseline: what agents ship on their own
        </h2>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-[12px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="py-3 pr-4">#</th>
                <th className="py-3 pr-4">Agent</th>
                <th className="py-3 pr-4">Grade</th>
                <th className="py-3 pr-4">Avg</th>
                <th className="py-3 pr-4">Median</th>
                <th className="py-3 pr-4">Scored</th>
                <th className="py-3">Wall time</th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a, i) => (
                <tr key={a.agent} className="border-b border-neutral-200">
                  <td className="py-4 pr-4 font-mono text-neutral-400">{i + 1}</td>
                  <td className="py-4 pr-4 font-bold">{a.agent}</td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 font-mono text-[14px] font-bold text-white ${gradeColor(a.avg)}`}
                    >
                      {grade(a.avg)}
                    </span>
                  </td>
                  <td className="py-4 pr-4 font-mono font-bold">{a.avg}</td>
                  <td className="py-4 pr-4 font-mono">{a.median}</td>
                  <td className="py-4 pr-4 font-mono">{a.scored}</td>
                  <td className="py-4 font-mono">{a.wall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
          Run 2026-05-29 · 20 fixtures across dashboard / marketing / app / commerce / data ·
          judge: codex:default at 180s timeout (one Claude Code dashboard fixture failed at 240s
          and counts as unscored). The gate StyleSeed enforces blocks anything under 80 — by that
          bar, the average bare-agent screen doesn&rsquo;t ship.
        </p>

        {/* per-category */}
        <div className="mt-12 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Per-category average
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="py-2 pr-3">Agent</th>
                {CATEGORIES.map((c) => (
                  <th key={c} className="py-2 pr-3">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a) => (
                <tr key={a.agent} className="border-b border-neutral-200">
                  <td className="py-3 pr-3 font-bold">{a.agent}</td>
                  {CATEGORIES.map((c) => {
                    const v = a.cats[c];
                    const weak = v < 70;
                    return (
                      <td
                        key={c}
                        className={`py-3 pr-3 font-mono ${weak ? "font-bold text-red-600" : "text-neutral-700"}`}
                      >
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-neutral-500">
          Red = failing territory. Accessibility is the systematic weakness — both agents land in
          the D band on the category every rubric weights hardest for real users.
        </p>
      </section>

      {/* methodology */}
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Methodology
          </div>
          <h2 className="mt-2 text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
            Same prompts, same judge, receipts included
          </h2>
          <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-700">
            <li>
              <strong className="font-bold">Fixtures.</strong> 20 neutral UI prompts (no design
              instructions), 4 each across dashboards, marketing, app surfaces, commerce, and
              data-heavy screens. Prompts are published verbatim.
            </li>
            <li>
              <strong className="font-bold">Scoring.</strong> Each screen is rendered and scored
              0–100 across nine categories by an LLM judge constrained to the public rubric —
              the same rules StyleSeed enforces as a gate. Every deduction is named.
            </li>
            <li>
              <strong className="font-bold">Reproducibility.</strong> One command re-runs the
              bench; raw results ship as JSON next to the leaderboard. Grader stability on a
              fixed screen: five repeat runs within a 3-point spread.
            </li>
            <li>
              <strong className="font-bold">We eat it too.</strong>{" "}This site&rsquo;s own landing
              went through the same gate and{" "}
              <Link href="/scorecard" className="font-bold underline underline-offset-2">
                failed at 58/100 first
              </Link>
              . The fixes that took it to 86 are public.
            </li>
          </ul>

          <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              v1.0 — in progress
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">
              The launch run adds a judge that is not one of the contestants, the app builders
              (v0, Bolt, Lovable), and two more conditions per agent — with StyleSeed rules, and
              with the full enforced gate — so the board answers the real question:{" "}
              <strong className="font-bold">how much of design quality is the tool, and how
              much is the discipline you wrap around it?</strong>
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/bitjaru/styleseed"
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-[15px] font-bold text-white hover:bg-neutral-700"
            >
              The rules the judge enforces <ArrowUpRight size={16} />
            </a>
            <Link
              href="/scorecard"
              className="inline-flex items-center gap-1.5 text-[15px] font-bold text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
            >
              Our own 58/100 scorecard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
