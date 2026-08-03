import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Search,
} from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const DESC =
  "Nine StyleSeed brand recipes change UI geometry, containment, controls, collections, density, and motion without cloning a company or reducing design to a color skin.";

export const metadata: Metadata = {
  title: "Brand recipes — nine UI morphologies, not one Toss look",
  description: DESC,
  keywords: [
    "AI UI brand recipes",
    "design system morphology",
    "Claude Code UI styles",
    "Codex UI design",
    "Toss design alternative",
    "enterprise dashboard design",
    "public service UI design",
  ],
  alternates: { canonical: `${BASE}/recipes` },
  openGraph: {
    type: "website",
    url: `${BASE}/recipes`,
    title: "StyleSeed brand recipes — one method, nine morphologies",
    description: DESC,
    siteName: "StyleSeed",
    images: [{ url: "/og/showcase.png", width: 1280, height: 640, alt: "StyleSeed brand recipe comparison" }],
  },
};

const RECIPES = [
  {
    id: "calm-consumer",
    label: "Calm consumer",
    refs: "Consumer service research",
    use: "Personal finance · health · benefits",
    structure: "Soft groups · one reassuring summary · sparse actions",
  },
  {
    id: "native-mobile",
    label: "Native mobile",
    refs: "Apple HIG · platform conventions",
    use: "Focused mobile utilities · capture · media",
    structure: "Content-first chrome · reachable controls · adaptive patterns",
  },
  {
    id: "enterprise-workbench",
    label: "Enterprise workbench",
    refs: "Carbon · Fluent · Atlassian",
    use: "B2B operations · admin · analytics",
    structure: "Aligned panels · compact controls · dense evidence",
  },
  {
    id: "developer-platform",
    label: "Developer platform",
    refs: "Primer · technical product research",
    use: "Repositories · observability · infrastructure",
    structure: "Hairlines · compact rows · mono evidence",
  },
  {
    id: "commerce-operator",
    label: "Commerce operator",
    refs: "Polaris · commerce research",
    use: "Merchant admin · catalog · fulfillment",
    structure: "Resource rows · filters · contextual next actions",
  },
  {
    id: "public-service",
    label: "Public service",
    refs: "GOV.UK · USWDS",
    use: "Eligibility · regulated forms · civic services",
    structure: "Flat high-contrast flow · explicit labels · one step",
  },
  {
    id: "creative-professional",
    label: "Creative professional",
    refs: "Adobe Spectrum",
    use: "Creation tools · media workflows · editing",
    structure: "Focused canvas · tool groups · adaptive platform scale",
  },
  {
    id: "editorial-authority",
    label: "Editorial authority",
    refs: "Editorial and public-content systems",
    use: "Reports · journalism · research · docs",
    structure: "Type-led hierarchy · reading measure · rules over cards",
  },
  {
    id: "expressive-brand",
    label: "Expressive brand",
    refs: "Independent campaign systems",
    use: "Launches · campaigns · portfolios · stories",
    structure: "Signature composition · display type · controlled motion",
  },
] as const;

export default function RecipesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE}/recipes#page`,
    url: `${BASE}/recipes`,
    name: "StyleSeed brand recipes",
    description: DESC,
    isPartOf: { "@id": `${BASE}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: RECIPES.length,
      itemListElement: RECIPES.map((recipe, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: recipe.label,
        description: `${recipe.use}. ${recipe.structure}.`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-neutral-200 bg-[linear-gradient(135deg,#f7f7fb_0%,#fff_48%,#f4fbfa_100%)]">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-950">
            <ArrowLeft size={14} /> StyleSeed home
          </Link>
          <p className="mt-12 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
            New in v3.2 · morphology layer
          </p>
          <h1 className="mt-3 max-w-5xl text-[clamp(44px,7vw,78px)] font-bold leading-[0.98] tracking-[-0.05em]">
            One design method.
            <br />
            Not one brand-shaped result.
          </h1>
          <p className="mt-6 max-w-3xl text-[18px] leading-relaxed text-neutral-600">
            A skin changes tokens. A recipe changes containment, geometry, navigation, controls,
            collection patterns, density, and motion. The same product job can now take on a
            genuinely different morphology without copying Toss—or any other company.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              href="https://github.com/bitjaru/styleseed/blob/main/engine/BRAND-RECIPES.md"
              className="inline-flex items-center gap-1.5 bg-neutral-950 px-5 py-3 text-white hover:bg-black"
            >
              Read the recipe contracts <ArrowRight size={14} />
            </a>
            <Link
              href="/architecture"
              className="inline-flex items-center gap-1.5 border border-neutral-300 bg-white px-5 py-3 hover:border-neutral-950"
            >
              See the compiler layer
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="recipe-library">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              Recipe library
            </p>
            <h2 id="recipe-library" className="mt-2 text-4xl font-bold tracking-[-0.035em]">
              Nine reusable shape languages.
            </h2>
          </div>
          <p className="max-w-2xl text-[15px] leading-relaxed text-neutral-600">
            The references explain lineage, not ownership. Recipes contain transferable design
            decisions only; official logos, fonts, icons, copy, and trademarked arrangements are
            never bundled.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {RECIPES.map((recipe) => (
            <article
              key={recipe.id}
              data-styleseed-recipe={recipe.id}
              className="border border-neutral-200 bg-[#f7f7f5] p-3"
            >
              <RecipePreview recipe={recipe.id} />
              <div className="px-2 pb-2 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold tracking-tight">{recipe.label}</h3>
                  <code className="text-[10px] text-neutral-400">{recipe.id}</code>
                </div>
                <p className="mt-2 text-[12px] font-semibold text-neutral-500">{recipe.use}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">{recipe.structure}</p>
                <p className="mt-4 border-t border-neutral-200 pt-3 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                  Evidence lineage · {recipe.refs}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              Three separate decisions
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em]">
              Grammar is not recipe.
              <br />
              Recipe is not skin.
            </h2>
          </div>
          <div className="grid gap-px bg-white/15 sm:grid-cols-3">
            {[
              ["01", "Grammar", "What job, attention model, and information order the result needs."],
              ["02", "Recipe", "What morphology, controls, collections, and density implement that job."],
              ["03", "Skin", "What semantic colors and type tokens express the project brand."],
            ].map(([index, title, copy]) => (
              <div key={title} className="bg-neutral-950 p-6">
                <div className="font-mono text-[11px] text-violet-300">{index}</div>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 border border-neutral-200 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              Your visual language is missing?
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Compile it from references.</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
              <code>$ss-reference</code> converts screenshots, URLs, Figma exports, or existing UI
              into a project-local evidence-backed grammar. It does not force the nearest built-in
              recipe and does not copy the source screen.
            </p>
          </div>
          <Link href="/showcase" className="inline-flex items-center gap-1.5 font-bold text-violet-700 hover:underline">
            Browse working outputs <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function RecipePreview({ recipe }: { recipe: (typeof RECIPES)[number]["id"] }) {
  const editorial = recipe === "editorial-authority";
  const publicService = recipe === "public-service";
  const technical = recipe === "developer-platform" || recipe === "creative-professional";

  return (
    <div className="min-h-[280px] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className={`font-bold tracking-tight ${editorial ? "font-serif text-xl" : "text-sm"}`}>
            {editorial ? "Quarterly operating brief" : publicService ? "Check your application" : "Workspace overview"}
          </div>
          <div className="mt-1 text-[10px] text-neutral-500">
            {technical ? "production / last 24h" : "Updated 4 minutes ago"}
          </div>
        </div>
        <button aria-label="Search" className="ss-pattern-control flex size-8 items-center justify-center border border-neutral-200">
          <Search size={13} />
        </button>
      </div>

      <div className="ss-pattern-surface">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {publicService ? "Current step" : technical ? "Request health" : "Today"}
            </div>
            <div className={`mt-2 font-bold tracking-[-0.04em] ${editorial ? "font-serif text-3xl" : "text-4xl"}`}>
              {publicService ? "2 of 4" : technical ? "99.98%" : "24 ready"}
            </div>
          </div>
          <span className="ss-pattern-control inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
            <Check size={10} /> On track
          </span>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden bg-neutral-100">
          <div className="h-full w-[68%] bg-violet-600" />
        </div>

        <div className="mt-5 space-y-2">
          {[
            ["Review priority items", "8"],
            ["Resolve open exception", "3"],
          ].map(([label, value], index) => (
            <div key={label} className="ss-pattern-inset flex items-center justify-between bg-neutral-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {index === 1 && <CircleAlert size={12} className="text-amber-700" />}
                <span className="text-[11px] font-medium">{label}</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-500">
                {value} <ChevronRight size={11} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
