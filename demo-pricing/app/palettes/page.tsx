import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { PALETTE_RECIPES } from "@engine/color";
import { PaletteLab } from "./palette-lab";

const BASE = "https://styleseed-demo.vercel.app";
const DESC =
  "Generate a refined semantic UI palette from any key color with OKLCH ramps, character-aware companions, surface roles, and deterministic contrast checks; or start from eight maintained StyleSeed recipes.";

export const metadata: Metadata = {
  title: "Semantic color palettes for AI-generated UI",
  description: DESC,
  alternates: { canonical: `${BASE}/palettes` },
  keywords: [
    "AI UI color palette",
    "semantic color palette",
    "Claude Code color palette",
    "Codex UI colors",
    "accessible UI color combinations",
    "design system color roles",
  ],
  openGraph: {
    type: "article",
    url: `${BASE}/palettes`,
    title: "StyleSeed semantic palette recipes",
    description: DESC,
    siteName: "StyleSeed",
    images: [{ url: "/og/styleseed-og.png", width: 1200, height: 630, alt: "StyleSeed semantic palette recipe catalog" }],
  },
};

const ROLE_LABELS = [
  ["Canvas", "background"],
  ["Surface", "surface"],
  ["Chrome", "chrome"],
  ["Primary", "primary"],
  ["Accent", "accent"],
  ["Focus", "focus"],
] as const;

export default function PalettesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE}/palettes#page`,
    name: "StyleSeed semantic palette recipes",
    url: `${BASE}/palettes`,
    description: DESC,
    dateModified: "2026-08-12",
    isPartOf: { "@id": `${BASE}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PALETTE_RECIPES.length,
      itemListElement: PALETTE_RECIPES.map((palette, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: palette.name,
        description: palette.bestFor,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#F4F1E9] text-[#191A18]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="border-b border-black/15">
        <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/55 hover:text-black">
            <ArrowLeft size={14} /> StyleSeed home
          </Link>
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#A64005]">Semantic color generator · OKLCH · deterministic contrast</p>
              <h1 className="mt-4 max-w-4xl text-[clamp(46px,7vw,88px)] font-semibold leading-[0.91] tracking-[-0.06em]">
                Start with one color.
                <br />Derive the system.
              </h1>
            </div>
            <div>
              <p className="max-w-xl text-[16px] leading-relaxed text-black/58">
                Pick a key color, then let perceptual character, contrast, role allocation, and
                product context determine the surfaces, companion accent, text, focus, and status
                colors. The recipes below are useful starting postures—not a closed swatch list.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-black/55">
                {["Normal text ≥ 4.5:1", "Focus ≥ 3:1", "Color never acts alone"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#187451]" />{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PaletteLab />

      <section className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">Maintained starting postures</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Eight recipes, unlimited derived systems.</h2></div>
          <p className="max-w-md text-xs leading-relaxed text-black/48">A recipe supplies job and hierarchy defaults. A project key color recompiles its actual ramps and semantic roles.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PALETTE_RECIPES.map((palette, index) => (
            <article key={palette.id} className="overflow-hidden border border-black/16 bg-[#FFFDF8]">
              <div className="grid grid-cols-6">
                {ROLE_LABELS.map(([label, role]) => (
                  <div key={role} className="min-w-0">
                    <div className="h-16 sm:h-20" style={{ background: palette.roles[role] }} />
                    <div className="truncate border-t border-black/10 px-1 py-1.5 text-center text-[8px] font-bold uppercase tracking-[0.08em] text-black/45">{label}</div>
                  </div>
                ))}
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="font-mono text-[10px] text-black/35">0{index + 1} · {palette.id}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{palette.name}</h2>
                  </div>
                  <span className="rounded-full border border-black/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-black/45">{palette.mode}</span>
                </div>

                <p className="mt-4 text-[13px] font-semibold text-black/72">{palette.bestFor}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-black/52">{palette.usage}</p>

                <div className="mt-6 grid gap-4 border-t border-black/12 pt-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-black/35">Recommended with</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {palette.recipeBias.map((recipe) => (
                        <span key={recipe} className="rounded-full bg-black/[0.055] px-2 py-1 font-mono text-[9px] text-black/52">{recipe}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-black/35">Generated media</p>
                    <p className="mt-2 font-mono text-[9px] leading-relaxed text-black/50">Anchor {palette.assetBrief.anchors.join(" · ")}</p>
                    <p className="mt-1 text-[9px] leading-relaxed text-black/36">Avoid {palette.assetBrief.avoid.join(" · ")}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-black/15 bg-[#191A18] text-[#F7F4EC]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Recommendation is executable</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Studio binds one recipe to every direction.</h2>
          </div>
          <Link href="/studio" className="inline-flex items-center gap-1.5 rounded-full bg-[#B8FF5A] px-5 py-3 text-sm font-bold text-[#10140C]">
            See palettes in Studio <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
