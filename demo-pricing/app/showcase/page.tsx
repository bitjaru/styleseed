import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import "./examples";
import {
  OUTPUT_GRAMMARS,
  SURFACE_ADAPTERS,
  listShowcase,
} from "@/lib/showcase";
import { loadRegistry } from "@/lib/registry";
import { seeds as motionSeeds } from "@engine/motion";
import { ShowcaseBrowser } from "./showcase-browser";

const BASE = "https://styleseed-demo.vercel.app";
const OG = `${BASE}/og/showcase.png`;
const SHOW_DESC =
  "Explore StyleSeed v3 through live, inspectable builds organized by output grammar, user job, surface adapter, skin, and motion. See why each AI-generated result was designed that way.";

export const metadata: Metadata = {
  title: "AI design grammar showcase — live StyleSeed builds",
  description: SHOW_DESC,
  keywords: [
    "AI design examples",
    "vibe coding showcase",
    "design grammar examples",
    "Claude Code UI examples",
    "Codex UI design",
    "AI design system gallery",
    "StyleSeed showcase",
  ],
  alternates: { canonical: `${BASE}/showcase` },
  openGraph: {
    type: "website",
    url: `${BASE}/showcase`,
    title: "StyleSeed v3 showcase — design grammar in working outputs",
    description: SHOW_DESC,
    siteName: "StyleSeed",
    images: [{ url: OG, width: 1280, height: 640, alt: "StyleSeed output grammar showcase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleSeed v3 design grammar showcase",
    description: SHOW_DESC,
    images: [OG],
  },
};

const ADAPTER_LABELS = {
  "product-ui": "Product UI",
  "social-carousel": "Social carousel",
  "slide-deck": "Slide deck",
  "document-report": "Document / report",
  "single-frame": "Single frame",
} as const;

export default function ShowcasePage() {
  const entries = listShowcase();
  const skinCount = loadRegistry().skins.length;
  const seedCount = Object.keys(motionSeeds).length;
  const liveGrammars = OUTPUT_GRAMMARS.filter((grammar) =>
    entries.some((entry) => entry.grammar === grammar),
  );
  const liveAdapters = SURFACE_ADAPTERS.filter((adapter) =>
    entries.some((entry) => entry.adapter === adapter),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE}/showcase#page`,
        url: `${BASE}/showcase`,
        name: "StyleSeed AI design grammar showcase",
        description: SHOW_DESC,
        isPartOf: { "@id": `${BASE}/#website` },
        about: ["AI design judgment", "output grammars", "vibe coding", "design systems"],
        mainEntity: { "@id": `${BASE}/showcase#builds` },
      },
      {
        "@type": "ItemList",
        "@id": `${BASE}/showcase#builds`,
        numberOfItems: entries.length,
        itemListElement: entries.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${BASE}/showcase/${entry.id}`,
          name: `${entry.name} — ${entry.grammar}`,
          description: entry.job,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "StyleSeed", item: BASE },
          { "@type": "ListItem", position: 2, name: "Showcase", item: `${BASE}/showcase` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-neutral-200 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.09),transparent_36%),linear-gradient(to_bottom,#fff,#fafafa)]">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10">
          <Link href="/" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
            ← StyleSeed home
          </Link>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                StyleSeed v3 · evidence, not templates
              </p>
              <h1 className="mt-3 max-w-4xl text-[clamp(42px,7vw,72px)] font-bold leading-[0.98] tracking-[-0.045em]">
                See how the method changes with the job.
              </h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-neutral-600">
                These are working outputs, not a component gallery. Each one exposes the user job,
                output grammar, surface adapter, and signature decision behind the visual result.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200">
              <Metric value={entries.length} label="live builds" />
              <Metric value={`${liveGrammars.length}/${OUTPUT_GRAMMARS.length}`} label="grammars represented" />
              <Metric value={`${liveAdapters.length}/${SURFACE_ADAPTERS.length}`} label="surfaces represented" />
              <Metric value={`${skinCount} × ${seedCount}`} label="skin / motion" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <ShowcaseBrowser entries={entries} grammars={OUTPUT_GRAMMARS} />

        <section className="mt-20 border-t border-neutral-200 pt-12" aria-labelledby="adapter-coverage">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                Honest coverage
              </p>
              <h2 id="adapter-coverage" className="mt-2 text-3xl font-bold tracking-tight">
                Five surface contracts. Every one is now visible.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                The social-carousel example now includes five native 1080×1440 exports. The
                remaining non-web surfaces stay clearly labeled as concept previews until their
                own export harnesses and production files ship.
              </p>
              <Link
                href="/architecture"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:underline"
              >
                Read the adapter architecture <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SURFACE_ADAPTERS.map((adapter) => {
                const hasInteractiveProof = adapter === "product-ui";
                const isRepresented = liveAdapters.includes(adapter);
                const hasNativeExport = entries.some(
                  (entry) => entry.adapter === adapter && entry.proof === "exported-artifact",
                );
                return (
                  <div key={adapter} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-neutral-950">{ADAPTER_LABELS[adapter]}</h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                          hasInteractiveProof || hasNativeExport
                            ? "bg-emerald-100 text-emerald-800"
                            : isRepresented
                              ? "bg-violet-100 text-violet-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {hasInteractiveProof || hasNativeExport ? <Check size={11} /> : <FlaskConical size={11} />}
                        {hasInteractiveProof
                          ? "Interactive"
                          : hasNativeExport
                            ? "Exported"
                            : isRepresented
                              ? "Concept preview"
                              : "Engine ready"}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
                      {adapter === "product-ui"
                        ? `${entries.filter((entry) => entry.adapter === adapter).length} inspectable web and mobile product builds.`
                        : hasNativeExport
                          ? "Five production-size PNG frames and an inspectable export manifest ship with the example."
                          : isRepresented
                            ? "A composed concept is inspectable now; native export validation remains explicit."
                            : "Grammar and verification contract shipped; validated public artifact next."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-neutral-950 px-6 py-10 text-white sm:px-10">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Your reference is not here?
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Compile it into a rule set.</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-300">
                <code className="text-violet-200">$ss-reference</code> analyzes screenshots, URLs,
                Figma exports, or existing UI into an evidence-backed project grammar—without
                cloning the source screen.
              </p>
            </div>
            <Link
              href="/architecture"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-neutral-950 hover:bg-neutral-200"
            >
              See how it compiles <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white p-5">
      <div className="text-2xl font-bold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </div>
    </div>
  );
}
