import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StudioWorkbench } from "./studio-workbench";

const BASE = "https://styleseed-demo.vercel.app";
const DESC =
  "A working StyleSeed Studio vertical slice: brief to three creative directions, human selection, generated media jobs, interaction scenes, a real UI prototype, and a prototype-first showcase reel.";

export const metadata: Metadata = {
  title: "Studio — creative direction, generated media, and interaction scenes",
  description: DESC,
  keywords: [
    "AI UI design workflow",
    "Claude Code design skill",
    "Codex UI design",
    "semantic color palette",
    "AI interaction design",
    "image to video UI prototype",
  ],
  alternates: { canonical: `${BASE}/studio` },
  openGraph: {
    type: "website",
    url: `${BASE}/studio`,
    title: "StyleSeed Studio — from brief to working interaction reel",
    description: DESC,
    siteName: "StyleSeed",
    images: [{ url: "/og/showcase.png", width: 1280, height: 640, alt: "StyleSeed Studio creative direction workbench" }],
  },
};

export default function StudioPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE}/studio#page`,
    name: "StyleSeed Studio",
    url: `${BASE}/studio`,
    description: DESC,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    isPartOf: { "@id": `${BASE}/#website` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Three product-specific creative directions",
      "Human direction selection gate",
      "Semantic palette recommendation",
      "Interaction scene compilation",
      "Provider-neutral image and video jobs",
      "Prototype-first temporal verification",
    ],
  };

  return (
    <main className="min-h-screen bg-[#0b0c0e] text-[#f5f4ee]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white">
              <ArrowLeft size={14} /> StyleSeed home
            </Link>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
              <span className="size-2 rounded-full bg-[#b8ff5a] shadow-[0_0_16px_#b8ff5a]" />
              Studio vertical slice
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8ff5a]">
                Creative direction compiler · interaction grammar · media pipeline
              </p>
              <h1 className="mt-4 max-w-5xl text-[clamp(46px,7vw,94px)] font-semibold leading-[0.9] tracking-[-0.06em]">
                From a vague brief
                <br />
                to a working scene.
              </h1>
            </div>
            <div className="pb-1">
              <p className="max-w-xl text-[16px] leading-relaxed text-white/58">
                Explore three structurally different directions, select one, inspect its image and
                video jobs, then interact with the prototype the reel must prove. Generated media
                supports the product; it never fakes the product.
              </p>
              <a
                href="https://github.com/bitjaru/styleseed/blob/main/engine/STUDIO-PIPELINE.md"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#b8ff5a] hover:underline"
              >
                Read the run contract <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <StudioWorkbench />
    </main>
  );
}
