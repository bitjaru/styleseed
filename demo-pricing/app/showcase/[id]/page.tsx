import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../examples"; // side-effect: registers every entry
import { getShowcase, listShowcase } from "@/lib/showcase";
import { loadRegistry } from "@/lib/registry";
import { seeds as motionSeeds, type SeedId } from "@engine/motion";
import { ShowcaseFrame } from "./showcase-frame";

const BASE = "https://styleseed-demo.vercel.app";

export function generateStaticParams() {
  return listShowcase().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getShowcase(id);
  if (!entry) return { title: "Not found" };
  const title = `${entry.name} — ${entry.grammar} AI design example`;
  const description = `${entry.job} See the live ${entry.adapter} build, design grammar, signature decision, skin, motion, and implementation rationale.`;
  const image = `${BASE}/showcase-hero/${entry.id}.png`;
  return {
    title,
    description,
    keywords: [entry.grammar, entry.adapter, entry.category, "AI design example", "StyleSeed"],
    alternates: { canonical: `${BASE}/showcase/${entry.id}` },
    openGraph: {
      type: "article",
      url: `${BASE}/showcase/${entry.id}`,
      title,
      description,
      siteName: "StyleSeed",
      images: [{ url: image, width: 1440, height: 900, alt: `${entry.name} StyleSeed example` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getShowcase(id);
  if (!entry) notFound();

  const skins = loadRegistry().skins.map((s) => ({
    id: s.id,
    name: s.name,
    brand: s.brand,
  }));
  const seeds = (Object.keys(motionSeeds) as SeedId[]).map((sid) => ({
    id: sid,
    name: motionSeeds[sid].name,
    vibe: motionSeeds[sid].vibe,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${BASE}/showcase/${entry.id}#example`,
        url: `${BASE}/showcase/${entry.id}`,
        name: entry.name,
        description: entry.job,
        image: `${BASE}/showcase-hero/${entry.id}.png`,
        author: { "@type": "Organization", name: "StyleSeed", url: BASE },
        isPartOf: { "@id": `${BASE}/showcase#builds` },
        about: [entry.grammar, entry.adapter, entry.category, entry.signature],
        keywords: [entry.grammar, entry.adapter, entry.primarySkin, entry.primarySeed].join(", "),
        license: "https://opensource.org/licenses/MIT",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "StyleSeed", item: BASE },
          { "@type": "ListItem", position: 2, name: "Showcase", item: `${BASE}/showcase` },
          {
            "@type": "ListItem",
            position: 3,
            name: entry.name,
            item: `${BASE}/showcase/${entry.id}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/showcase" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
          ← Showcase
        </Link>

        <header className="mb-8 mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800">
                {entry.grammar}
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600">
                {entry.adapter}
              </span>
            </div>
            <h1 className="mt-3 text-[clamp(38px,6vw,64px)] font-bold leading-none tracking-[-0.04em]">
              {entry.name}
            </h1>
            <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-neutral-600">
              {entry.job}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
              Signature decision
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-800">{entry.signature}</p>
          </div>
        </header>

        <ShowcaseFrame
          entryId={entry.id}
          defaultSkin={entry.primarySkin}
          defaultSeed={entry.primarySeed}
          skins={skins}
          seeds={seeds}
        />

        {entry.rationale && (
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Design rationale">
            {entry.rationale.design && (
              <RationaleCard title="Craft decisions" items={entry.rationale.design} />
            )}
            {entry.rationale.methodology && (
              <RationaleCard title="Reasoning evidence" items={entry.rationale.methodology} />
            )}
            {entry.rationale.motion && (
              <RationaleCard title="Motion" items={[entry.rationale.motion]} />
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
          <p>
            Source:{" "}
            <code className="font-mono">
              app/showcase/examples/{entry.id}.tsx
            </code>{" "}
            · Recreate with{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
              /ss-page {entry.id}
            </code>
            {" "}with the <strong>{entry.grammar}</strong> grammar and{" "}
            <strong>{entry.adapter}</strong> adapter.
          </p>
        </footer>
      </div>
    </main>
  );
}

function RationaleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </div>
      <ul className="space-y-1 text-sm leading-relaxed text-neutral-800">
        {items.map((it) => (
          <li key={it}>• {it}</li>
        ))}
      </ul>
    </div>
  );
}
