import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const layers = [
  ["Core judgment", "Non-negotiable coherence, hierarchy, semantics, accessibility, and task fitness."],
  ["Output grammar", "Consumer service, operations, technical, editorial, commerce, institutional, marketing, or sequential story."],
  ["Surface adapter", "Web/mobile, carousel, slide deck, document/report, or single-frame renderer contract."],
  ["Reference compiler", "Turns screenshots, URLs, Figma exports, or an existing UI into a local grammar with evidence and confidence."],
  ["Build method", "Composes grammar × surface × domain × artifact × optional style profile × bounded lock."],
  ["Auxiliary gates", "Code scoring finds structural drift; pixel verification catches what only appears after rendering."],
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#F7F7FB] text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-neutral-600 hover:text-neutral-950">
          <ArrowLeft size={14} /> Home
        </Link>
        <div className="mt-12 max-w-3xl">
          <div className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Engine architecture · v3</div>
          <h1 className="mt-3 text-[clamp(38px,6vw,64px)] font-bold leading-[1.03] tracking-tight">
            Fixed judgment.<br />Multiple design languages.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-neutral-600">
            StyleSeed no longer treats a Toss-like product aesthetic as the answer to every
            result. It selects the functional grammar the artifact needs, or compiles one from
            the user&rsquo;s references, then hands it to the right renderer.
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
