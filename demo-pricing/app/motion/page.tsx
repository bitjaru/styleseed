"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import {
  MOTION_LIBRARY,
  MOTION_CATEGORIES,
  MOTION_BY_USECASE,
  type MotionKeyword,
} from "@engine/motion";
import { ACCENT, DEMOS, FallbackDemo } from "./_demos";

export default function MotionLibraryPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 max-w-2xl">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Motion Keywords
          </div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">
            Name the motion. Drop it in. Get the same feel everywhere.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
            Each card is a distinct, named move — not another fade. Click a card to
            replay it, then <span className="font-semibold text-neutral-900">Copy</span> the
            snippet, or say the keyword while vibe coding
            (<code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[12px]">/styleseed motion toggle-flip</code>)
            and the same recipe lands in your code.
          </p>
          <Link
            href="/motion/guide"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-[13px] font-bold text-white transition-transform hover:scale-[1.03]"
          >
            Vibe-code your own motion → read the guide
          </Link>
        </header>

        {/* which motion when — a light rule, not a mandate */}
        <section className="mb-14">
          <div className="mb-1 flex items-baseline gap-3">
            <h2 className="text-[20px] font-bold tracking-tight">Which motion when</h2>
            <span className="text-[13px] text-neutral-500">a starting point, not a mandate</span>
          </div>
          <p className="mb-5 max-w-2xl text-[13px] leading-relaxed text-neutral-500">
            Two rules override the table: <strong className="text-neutral-700">pick one seed and keep
            it</strong> across the product, and <strong className="text-neutral-700">never animate the
            payload</strong> — don&rsquo;t bounce a balance, price, or search result into view.
          </p>
          <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3 font-bold">Use case</th>
                  <th className="px-4 py-3 font-bold">Reach for</th>
                  <th className="hidden px-4 py-3 font-bold sm:table-cell">Why</th>
                </tr>
              </thead>
              <tbody>
                {MOTION_BY_USECASE.map((u) => (
                  <tr key={u.useCase} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-neutral-800">{u.useCase}</td>
                    <td className="px-4 py-2.5">
                      <code
                        className="rounded-md px-2 py-1 text-[12px] font-bold"
                        style={
                          u.recommend === "none"
                            ? { background: "#F1F5F9", color: "#64748B" }
                            : { background: `${ACCENT.reveal}14`, color: ACCENT.reveal }
                        }
                      >
                        {u.recommend}
                      </code>
                    </td>
                    <td className="hidden px-4 py-2.5 text-neutral-500 sm:table-cell">{u.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {MOTION_CATEGORIES.map((cat) => {
          const entries = MOTION_LIBRARY.filter((m) => m.category === cat.id);
          if (entries.length === 0) return null;
          return (
            <section key={cat.id} className="mb-14">
              <div className="mb-5 flex items-baseline gap-3">
                <h2 className="text-[20px] font-bold tracking-tight">{cat.label}</h2>
                <span className="text-[13px] text-neutral-500">{cat.blurb}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <KeywordCard key={entry.key} entry={entry} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function KeywordCard({ entry }: { entry: MotionKeyword }) {
  const [trigger, setTrigger] = useState(0);
  const [copied, setCopied] = useState(false);
  const accent = ACCENT[entry.category];
  const Demo = DEMOS[entry.key] ?? FallbackDemo;

  async function copy() {
    try {
      await navigator.clipboard.writeText(entry.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}
    >
      {/* live stage — click to replay/toggle. A div (not button) so the
          press/ripple demos can nest their own <button> without invalid
          nesting / hydration mismatch. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setTrigger((t) => t + 1)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setTrigger((t) => t + 1);
        }}
        className="relative flex h-40 items-center justify-center bg-neutral-50"
        style={{ cursor: "pointer" }}
        aria-label={`Replay ${entry.label} motion`}
      >
        <Demo trigger={trigger} accent={accent} />
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium uppercase tracking-wider text-neutral-300">
          tap
        </span>
      </div>

      {/* meta */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold">{entry.label}</span>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            {copied ? (
              <>
                <Check size={14} style={{ color: "#10B981" }} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>
        <code
          className="w-fit rounded-md px-2 py-1 text-[12px] font-semibold"
          style={{ background: `${accent}14`, color: accent }}
        >
          {entry.key}
        </code>
        <p className="text-[13px] leading-snug text-neutral-500">{entry.vibe}</p>
      </div>
    </div>
  );
}

