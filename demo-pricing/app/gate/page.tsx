import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileJson2,
  ShieldCheck,
} from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const EVIDENCE_BASE = "https://github.com/bitjaru/pixelmind";
const RELEASE_URL = `${EVIDENCE_BASE}/releases/tag/bench-v1.0.0`;
const RESULTS_URL = `${EVIDENCE_BASE}/blob/main/bench/v1/results.json`;
const VALIDATION_URL = `${EVIDENCE_BASE}/blob/main/bench/v1/validation.json`;
const LEADERBOARD_URL = `${EVIDENCE_BASE}/blob/main/bench/v1/leaderboard.md`;

const description =
  "BENCH-V1 measures StyleSeed across 120 rendered Codex and Claude Code benchmark cells. The enforced render-score-revise gate improved both agents by 5.3 points; raw rules alone were inconsistent.";

export const metadata: Metadata = {
  title: "BENCH-V1 — StyleSeed's 120-screen design gate benchmark",
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: `${BASE}/gate` },
  openGraph: {
    type: "article",
    url: `${BASE}/gate`,
    title: "BENCH-V1 — the design gate moved both agents +5.3",
    description,
    siteName: "StyleSeed",
    publishedTime: "2026-07-25T03:07:49.160Z",
    modifiedTime: "2026-07-27T00:00:00.000Z",
  },
};

type ResultRow = {
  agent: string;
  bare: number;
  rules: number;
  gate: number;
  rulesDelta: number;
  gateDelta: number;
};

const RESULTS: ResultRow[] = [
  {
    agent: "Codex",
    bare: 74.8,
    rules: 76.4,
    gate: 80.1,
    rulesDelta: 1.6,
    gateDelta: 5.3,
  },
  {
    agent: "Claude Code",
    bare: 74.1,
    rules: 70.4,
    gate: 79.4,
    rulesDelta: -3.7,
    gateDelta: 5.3,
  },
];

const GATE_CATEGORIES = [
  { category: "Color", codex: 81.8, claude: 81.8 },
  { category: "Hierarchy", codex: 82.8, claude: 82.0 },
  { category: "Typography", codex: 80.8, claude: 80.8 },
  { category: "Spacing", codex: 80.0, claude: 78.0 },
  { category: "Cards", codex: 79.9, claude: 78.9 },
  { category: "Coherence", codex: 82.0, claude: 83.9 },
  { category: "Distinctiveness", codex: 70.9, claude: 69.0 },
  { category: "Accessibility", codex: 78.6, claude: 76.4 },
  { category: "Brand fit", codex: 84.9, claude: 84.8 },
];

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "StyleSeed BENCH-V1",
  description,
  url: `${BASE}/gate`,
  datePublished: "2026-07-25",
  dateModified: "2026-07-27",
  creator: {
    "@type": "Organization",
    name: "StyleSeed",
    url: "https://github.com/bitjaru/styleseed",
  },
  measurementTechnique:
    "20 neutral UI fixtures across five domains, rendered by Codex and Claude Code under bare, rules, and enforced gate conditions, then scored by a fixed-seed neutral judge across nine public rubric categories.",
  variableMeasured: [
    "overall design score",
    "color",
    "hierarchy",
    "typography",
    "spacing",
    "cards",
    "coherence",
    "distinctiveness",
    "accessibility",
    "brand fit",
  ],
  sameAs: RELEASE_URL,
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl:
        "https://raw.githubusercontent.com/bitjaru/pixelmind/main/bench/v1/results.json",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl:
        "https://raw.githubusercontent.com/bitjaru/pixelmind/main/bench/v1/validation.json",
    },
  ],
};

function delta(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export default function Gate() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      <header className="border-b border-neutral-200 bg-[#f7f7f4]">
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[14px] font-bold text-neutral-500 transition-colors hover:text-neutral-950"
            >
              <ArrowLeft size={15} /> StyleSeed
            </Link>
          </div>

          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            <ShieldCheck size={13} />
            BENCH-V1 · complete · Jul 25, 2026
          </div>

          <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_300px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-[clamp(38px,7vw,72px)] font-bold leading-[0.98] tracking-[-0.045em]">
                The gate moved both agents{" "}
                <span className="text-violet-700">+5.3.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-600 sm:text-[19px]">
                BENCH-V1 tested Codex and Claude Code on the same 20 UI fixtures
                under three conditions. Raw rules alone were inconsistent. The
                enforced render → score → revise loop improved both agents by the
                same 5.3 points.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 lg:grid-cols-1">
              {[
                ["120", "cells scored"],
                ["0", "failed"],
                ["2 pt", "judge spread"],
              ].map(([value, label]) => (
                <div key={label} className="bg-white px-4 py-4 sm:px-5">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                    {label}
                  </dt>
                  <dd className="mt-1 text-[25px] font-bold tracking-tight tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
            The actual result
          </p>
          <h2 className="mt-2 text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.035em]">
            Rules are guidance. The gate is the mechanism.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            A markdown rule set helped Codex, but hurt Claude Code in this run.
            Quality became consistent only when the agent had to render, receive a
            category score, fix named failures, and submit the best verified
            iteration.
          </p>
        </div>

        <div className="mt-10 hidden overflow-x-auto rounded-2xl border border-neutral-200 sm:block">
          <table className="w-full min-w-[700px] border-collapse text-[14px]">
            <thead className="bg-neutral-50 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">Agent</th>
                <th className="px-5 py-4">Bare</th>
                <th className="px-5 py-4">+ Rules</th>
                <th className="px-5 py-4">Rules Δ</th>
                <th className="px-5 py-4">+ Rules + Gate</th>
                <th className="px-5 py-4">Gate Δ</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((row) => (
                <tr key={row.agent} className="border-t border-neutral-200">
                  <td className="px-5 py-5 text-[15px] font-bold">{row.agent}</td>
                  <td className="px-5 py-5 font-mono tabular-nums text-neutral-600">
                    {row.bare.toFixed(1)}
                  </td>
                  <td className="px-5 py-5 font-mono tabular-nums text-neutral-600">
                    {row.rules.toFixed(1)}
                  </td>
                  <td
                    className={`px-5 py-5 font-mono font-bold tabular-nums ${
                      row.rulesDelta < 0 ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {delta(row.rulesDelta)}
                  </td>
                  <td className="px-5 py-5">
                    <span className="rounded-md bg-violet-100 px-2 py-1 font-mono font-bold tabular-nums text-violet-800">
                      {row.gate.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-5 font-mono text-[16px] font-bold tabular-nums text-violet-700">
                    {delta(row.gateDelta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-3 sm:hidden">
          {RESULTS.map((row) => (
            <article
              key={row.agent}
              className="overflow-hidden rounded-2xl border border-neutral-300"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <h3 className="text-[15px] font-bold">{row.agent}</h3>
                <span className="font-mono text-[16px] font-bold tabular-nums text-violet-700">
                  {delta(row.gateDelta)} with gate
                </span>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-neutral-200">
                {[
                  ["Bare", row.bare.toFixed(1), ""],
                  ["+ Rules", row.rules.toFixed(1), delta(row.rulesDelta)],
                  ["+ Gate", row.gate.toFixed(1), delta(row.gateDelta)],
                ].map(([label, value, change]) => (
                  <div key={label} className="px-3 py-4">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                      {label}
                    </dt>
                    <dd className="mt-1 font-mono text-[18px] font-bold tabular-nums">
                      {value}
                    </dd>
                    {change ? (
                      <div
                        className={`mt-1 font-mono text-[11px] font-bold tabular-nums ${
                          Number(change) < 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {change}
                      </div>
                    ) : null}
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 text-[13px] leading-relaxed text-neutral-600 sm:grid-cols-2">
          <p className="rounded-xl bg-neutral-50 px-4 py-3">
            <strong className="text-neutral-900">120 scored cells</strong> = 20
            fixtures × 2 agents × 3 conditions. Every condition completed 20/20.
          </p>
          <p className="rounded-xl bg-neutral-50 px-4 py-3">
            The 80 line is StyleSeed&rsquo;s shipping threshold, not a claim that
            either agent or judge is objectively &ldquo;best.&rdquo;
          </p>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Gate-condition breakdown
            </p>
            <h2 className="mt-3 text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.035em]">
              Coherence held. Distinctiveness is still the frontier.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-neutral-400">
              The gate produced its strongest results in brand fit, coherence,
              hierarchy, and color. Distinctiveness remained the lowest category,
              so BENCH-V1 is evidence of improvement—not a claim that the design
              problem is solved.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-800">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-neutral-900 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Codex</th>
                  <th className="px-4 py-3">Claude</th>
                </tr>
              </thead>
              <tbody>
                {GATE_CATEGORIES.map((row) => (
                  <tr key={row.category} className="border-t border-neutral-800">
                    <td className="px-4 py-3 font-semibold text-neutral-200">
                      {row.category}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-neutral-300">
                      {row.codex.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-neutral-300">
                      {row.claude.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              Protocol
            </p>
            <h2 className="mt-2 text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.035em]">
              A benchmark with receipts.
            </h2>
            <ul className="mt-7 space-y-5 text-[15px] leading-relaxed text-neutral-600">
              {[
                [
                  "Same work.",
                  "20 neutral prompts across dashboard, marketing, app, commerce, and data-heavy domains.",
                ],
                [
                  "Three conditions.",
                  "Bare agent, StyleSeed rules, then rules plus the enforced score-and-revise gate.",
                ],
                [
                  "Neutral judge.",
                  "A fixed-seed Gemini 3.1 Pro judge scored nine published categories. It passed five repeats at 72, 72, 72, 74, 74—a 2-point spread.",
                ],
                [
                  "Preserved evidence.",
                  "Prompts, outputs, rendered screenshots, verdicts, fix prompts, and the selected best iteration are retained in the release archive.",
                ],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-1 shrink-0 text-violet-600"
                  />
                  <span>
                    <strong className="text-neutral-950">{title}</strong> {body}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-[#f7f7f4] p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              What we did not hide
            </p>
            <div className="mt-5 space-y-5 text-[14px] leading-relaxed text-neutral-600">
              <p>
                <strong className="text-neutral-950">15 app-builder cells remain blocked.</strong>{" "}
                v0, Bolt, and Lovable require first-party access that was not
                available. No scores were estimated or imputed.
              </p>
              <p>
                <strong className="text-neutral-950">
                  The old-vs-new judge correlation is not a clean agreement test.
                </strong>{" "}
                The earlier screenshots were not retained, so the reported
                Spearman ρ 0.394 on n=39 also contains generation variance.
              </p>
              <p>
                <strong className="text-neutral-950">
                  One benchmark is not universal truth.
                </strong>{" "}
                BENCH-V1 supports the narrower claim that an enforced revision
                loop was more reliable than distributing rules alone in this
                protocol.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [RELEASE_URL, "Release + raw archive", ArrowUpRight],
            [LEADERBOARD_URL, "Published leaderboard", ArrowUpRight],
            [RESULTS_URL, "results.json", FileJson2],
            [VALIDATION_URL, "validation.json", FileJson2],
          ].map(([href, label, Icon]) => (
            <a
              key={label as string}
              href={href as string}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-4 text-[13px] font-bold transition-colors hover:border-neutral-950"
            >
              {label as string}
              <Icon
                size={15}
                className="text-neutral-400 transition-colors group-hover:text-neutral-950"
              />
            </a>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-neutral-200 pt-8 sm:flex-row sm:items-center">
          <p className="max-w-xl text-[14px] leading-relaxed text-neutral-600">
            StyleSeed fixes the design method, not one aesthetic: lock bounded
            decisions, choose the right output grammar, render, score, revise, and
            visually verify.
          </p>
          <Link
            href="/architecture"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-neutral-950 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-neutral-700"
          >
            See the engine architecture <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
