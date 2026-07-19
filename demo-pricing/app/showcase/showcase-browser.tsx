"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { OutputGrammar, ShowcaseEntry } from "@/lib/showcase";
import { ArtifactThumbnail } from "./_renderers/artifact-proofs";

const GRAMMAR_LABELS: Record<OutputGrammar, string> = {
  "consumer-service": "Consumer service",
  "operations-console": "Operations console",
  "technical-instrument": "Technical instrument",
  "editorial-reading": "Editorial reading",
  "commerce-conversion": "Commerce conversion",
  "institutional-service": "Institutional service",
  "expressive-marketing": "Expressive marketing",
  "sequential-story": "Sequential story",
};

type ShowcaseBrowserProps = {
  entries: ShowcaseEntry[];
  grammars: readonly OutputGrammar[];
};

export function ShowcaseBrowser({ entries, grammars }: ShowcaseBrowserProps) {
  const [activeGrammar, setActiveGrammar] = useState<OutputGrammar | "all">("all");
  const visibleEntries = useMemo(
    () => {
      const filtered =
        activeGrammar === "all"
          ? entries
          : entries.filter((entry) => entry.grammar === activeGrammar);
      return [...filtered].sort(
        (a, b) => Number(b.proof === "rendered-preview") - Number(a.proof === "rendered-preview"),
      );
    },
    [activeGrammar, entries],
  );

  return (
    <section aria-labelledby="proof-library">
      <div className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
            Live proof library
          </p>
          <h2 id="proof-library" className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
            Browse by design grammar, not visual skin.
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
            Each build names the user job, functional grammar, surface adapter, and signature
            decision that shaped it. Skins only coordinate the final aesthetic layer.
          </p>
        </div>
        <div className="shrink-0 text-[12px] font-semibold text-neutral-500" aria-live="polite">
          Showing {visibleEntries.length} of {entries.length} builds
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter showcase by output grammar">
        <FilterButton active={activeGrammar === "all"} onClick={() => setActiveGrammar("all")}>
          All builds
        </FilterButton>
        {grammars.map((grammar) => {
          const count = entries.filter((entry) => entry.grammar === grammar).length;
          return (
            <FilterButton
              key={grammar}
              active={activeGrammar === grammar}
              onClick={() => setActiveGrammar(grammar)}
            >
              {GRAMMAR_LABELS[grammar]} <span className="opacity-60">{count}</span>
            </FilterButton>
          );
        })}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleEntries.map((entry) => (
          <Link
            key={entry.id}
            href={`/showcase/${entry.id}`}
            className="group flex overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_18px_45px_-24px_rgba(0,0,0,0.35)]"
          >
            <article className="flex min-w-0 flex-1 flex-col">
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                {entry.proof === "rendered-preview" ? (
                  <ArtifactThumbnail id={entry.id} />
                ) : (
                  <Image
                    src={`/showcase-hero/${entry.id}.png`}
                    alt={`${entry.name} designed with the ${entry.grammar} grammar`}
                    width={1440}
                    height={900}
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-neutral-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                  {GRAMMAR_LABELS[entry.grammar]}
                </span>
                {entry.proof === "rendered-preview" && (
                  <span className="absolute right-3 top-3 rounded-full bg-violet-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    New v3 artifact
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col border-t border-neutral-200 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-bold tracking-tight text-neutral-950 group-hover:text-violet-700">
                    {entry.name}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {entry.adapter}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-neutral-600">
                  {entry.job}
                </p>
                <div className="mt-4 border-l-2 border-violet-300 pl-3 text-[12px] leading-relaxed text-neutral-700">
                  <span className="font-bold text-neutral-950">Signature:</span> {entry.signature}
                </div>
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-5 font-mono text-[10px] text-neutral-500">
                  <span>skin:{entry.primarySkin}</span>
                  <span>motion:{entry.primarySeed}</span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {visibleEntries.length === 0 && (
        <div className="mt-7 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
          <p className="font-semibold text-neutral-900">No live build for this grammar yet.</p>
          <p className="mt-1 text-sm text-neutral-600">
            The engine contract exists; the showcase stays honest until a validated artifact ships.
          </p>
        </div>
      )}
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}
