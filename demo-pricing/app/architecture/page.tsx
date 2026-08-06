import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const DESCRIPTION =
  "How StyleSeed Studio turns a brief into three directions, then compiles fixed AI design judgment, output grammar, morphology, semantic palette, generated-media plans, and interaction scenes before code, pixel, temporal, and human verification.";

export const metadata: Metadata = {
  title: "StyleSeed engine architecture — AI design grammar compiler",
  description: DESCRIPTION,
  keywords: [
    "AI design engine architecture",
    "design grammar compiler",
    "reference to design system",
    "vibe coding design method",
    "StyleSeed architecture",
    "AI interaction design pipeline",
    "semantic color palette system",
  ],
  alternates: { canonical: `${BASE}/architecture` },
  openGraph: {
    type: "article",
    url: `${BASE}/architecture`,
    title: "StyleSeed v4.0 engine architecture",
    description: DESCRIPTION,
    siteName: "StyleSeed",
    images: [
      {
        url: `${BASE}/og/styleseed-og.png`,
        width: 1200,
        height: 630,
        alt: "StyleSeed v4.0 creative direction, semantic palette, interaction, media, and context compiler architecture diagram",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleSeed v4.0 engine architecture",
    description: DESCRIPTION,
    images: [`${BASE}/og/styleseed-og.png`],
  },
};

const layers = [
  ["Core judgment", "Non-negotiable coherence, hierarchy, semantics, accessibility, and task fitness."],
  ["Output grammar", "Consumer service, operations, technical, editorial, commerce, institutional, marketing, or sequential story."],
  ["Surface adapter", "Web/mobile, carousel, slide deck, document/report, or single-frame renderer contract."],
  ["Brand recipe", "Nine reusable morphologies change containment, geometry, controls, collections, density, and motion without cloning a company."],
  ["Palette recipe", "Eight semantic systems bind canvas, chrome, action, status, focus, and generated-media anchors with deterministic contrast checks."],
  ["Reference compiler", "Turns screenshots, URLs, Figma exports, or an existing UI into a local grammar with evidence and confidence."],
  ["Studio director", "Produces native, signature, and experimental directions, records human selection, then compiles interaction scenes and image/video jobs."],
  ["Context compiler", "ss-resolve emits only the selected 10–20KB method plus a manifest of selections, source hashes, and bundle hash."],
  ["Build method", "The agent implements real product content from effective-rules.md instead of reassembling the full handbook."],
  ["Evidence gates", "Code and pixel checks find structural and rendered drift; temporal evidence proves the interaction, and a named human accepts the result."],
];

export default function ArchitecturePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${BASE}/architecture#page`,
        url: `${BASE}/architecture`,
        headline: "StyleSeed v4.0 engine architecture",
        description: DESCRIPTION,
        image: `${BASE}/styleseed-architecture.svg`,
        datePublished: "2026-07-18",
        dateModified: "2026-08-06",
        author: { "@type": "Organization", name: "StyleSeed", url: BASE },
        isPartOf: { "@id": `${BASE}/#website` },
        about: [
          "AI design judgment",
          "output grammars",
          "surface adapters",
          "brand recipes",
          "semantic palettes",
          "interaction scenes",
          "generated media",
          "reference compiler",
          "context compiler",
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "StyleSeed", item: BASE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Engine architecture",
            item: `${BASE}/architecture`,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F7F7FB] text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-neutral-600 hover:text-neutral-950">
          <ArrowLeft size={14} /> Home
        </Link>
        <div className="mt-12 max-w-3xl">
          <div className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Engine architecture · v4.0</div>
          <h1 className="mt-3 text-[clamp(38px,6vw,64px)] font-bold leading-[1.03] tracking-tight">
            Fixed judgment.<br />Multiple design languages.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-neutral-600">
            StyleSeed no longer treats a Toss-like product aesthetic as the answer to every
            result. It selects the functional grammar the artifact needs, or compiles one from
            the user&rsquo;s references. A separate brand recipe selects morphology rather than
            color. A palette recipe binds semantic color roles and generated-media anchors. Studio
            adds three directed concepts, a human decision, and executable interaction/media plans.
            Then <code>ss-resolve</code> hands the agent only the
            selected method and a source-hash manifest before the right renderer takes over.
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/styleseed-architecture.svg" alt="StyleSeed engine architecture" className="mt-12 w-full rounded-3xl border border-neutral-200 bg-white" />

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          {layers.map(([title, body], index) => (
            <article key={title} className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-600">0{index + 1}</div>
              <h2 className="mt-2 text-[20px] font-bold">{title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 border border-neutral-200 bg-white p-8 md:p-10">
          <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Grammar → morphology → palette → skin</div>
          <h2 className="mt-3 text-[clamp(26px,4vw,38px)] font-bold tracking-tight">
            Job, morphology, semantic color, and brand material stay separate.
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-600">
            The grammar owns attention and information order. The recipe owns geometry,
            containment, controls, and collection patterns. The palette owns role relationships
            and contrast. The skin implements project-specific colors and type tokens. This keeps
            a fashionable swatch from pretending to be a complete design system.
          </p>
          <Link href="/recipes" className="mt-6 inline-flex items-center gap-1.5 font-bold text-violet-700 hover:underline">
            Compare all nine recipes <ArrowRight size={14} />
          </Link>
        </section>

        <section className="mt-16 rounded-3xl bg-neutral-950 p-8 text-white md:p-12">
          <div className="text-[11px] font-bold uppercase tracking-widest text-violet-300">Reference → grammar</div>
          <h2 className="mt-3 max-w-2xl text-[clamp(28px,4vw,42px)] font-bold tracking-tight">
            Give it references StyleSeed has never seen.
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-neutral-400">
            <code className="text-violet-300">/ss-reference</code> observes and measures the
            visible system, resolves contradictions, records evidence and confidence, compiles
            tokens and anti-patterns, then proves transfer on a screen or artifact absent from
            the source set.
          </p>
          <a href="https://github.com/bitjaru/styleseed/blob/main/engine/ARCHITECTURE.md" className="mt-7 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-950">
            Read the technical document <ArrowRight size={14} />
          </a>
        </section>
      </div>
    </main>
  );
}
