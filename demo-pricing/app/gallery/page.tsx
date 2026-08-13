import Link from "next/link";
import { loadRegistry } from "@/lib/registry";
import { Button } from "@engine/components/ui/button";

export const metadata = {
  title: "StyleSeed Gallery — 48 components × 7 brand skins",
  description:
    "Browse every StyleSeed component and brand skin. Click any component to see source and metadata.",
};

const PREVIEW_SKINS = ["toss", "raycast", "arc"] as const;

export default function GalleryPage() {
  const reg = loadRegistry();
  const ui = reg.components.filter((c) => c.type === "ui");
  const patterns = reg.components.filter((c) => c.type === "pattern");

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-12">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← StyleSeed home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Gallery</h1>
          <p className="mt-3 text-lg text-gray-600">
            {reg.counts.components} components ({reg.counts.byType.ui} UI primitives +{" "}
            {reg.counts.byType.pattern} composed patterns) × {reg.counts.skins} brand skins. Each
            entry links to source code and registry metadata.
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <a
              href="/.well-known/styleseed/registry.json"
              className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-gray-700 hover:bg-gray-200"
            >
              registry.json
            </a>
            <a
              href="/llms.txt"
              className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-gray-700 hover:bg-gray-200"
            >
              llms.txt
            </a>
            <a
              href={reg.repository}
              className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-gray-700 hover:bg-gray-200"
            >
              GitHub
            </a>
          </div>
        </header>

        <section className="mb-12 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Live preview — Button under 3 skins
          </h2>
          <p className="mb-4 text-xs text-gray-600">
            Smoke test: same component, three brand DNAs via{" "}
            <code className="rounded bg-white px-1 py-0.5">data-skin</code> attribute.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PREVIEW_SKINS.map((skin) => (
              <div
                key={skin}
                data-skin={skin}
                className="rounded-lg p-4"
                style={{ background: "var(--card)" }}
              >
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary, var(--muted-foreground))" }}>
                  {skin}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="secondary">Secondary</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Section title={`Patterns (${patterns.length})`} subtitle="Composed components — cards, lists, navigation, feedback states" items={patterns} />
        <Section title={`UI primitives (${ui.length})`} subtitle="Single-purpose building blocks — buttons, inputs, dialogs, etc." items={ui} />

        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">Brand skins</h2>
          <p className="mb-6 text-sm text-gray-600">
            Each skin defines colors, radius, shadows, motion via CSS variables. Apply with{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">data-skin="..."</code>.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {reg.skins.map((skin) => (
              <div
                key={skin.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-2">
                  {skin.brand && (
                    <span
                      className="size-4 rounded-full"
                      style={{ background: skin.brand }}
                      aria-hidden
                    />
                  )}
                  <h3 className="font-semibold">{skin.name}</h3>
                </div>
                <p className="mt-2 text-xs text-gray-600">{skin.description}</p>
                <code className="mt-2 block font-mono text-[11px] text-gray-500">{skin.id}</code>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-gray-200 pt-6 text-sm text-gray-500">
          Registry {reg.generated ? `generated ${reg.generated.slice(0, 10)}` : "compiled"} from{" "}
          <a href={reg.repository} className="underline">
            {reg.repository.replace("https://", "")}
          </a>
        </footer>
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ReturnType<typeof loadRegistry>["components"];
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-1 text-xl font-semibold">{title}</h2>
      <p className="mb-6 text-sm text-gray-600">{subtitle}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/gallery/${c.id}`}
            className="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold group-hover:text-blue-600">{c.name}</h3>
              <span className="text-[11px] text-gray-400">{(c.bytes / 1024).toFixed(1)}KB</span>
            </div>
            <code className="mt-1 block font-mono text-[11px] text-gray-500">{c.id}</code>
            {c.exports.length > 1 && (
              <p className="mt-2 text-xs text-gray-600">
                Exports: {c.exports.slice(0, 3).join(", ")}
                {c.exports.length > 3 && ` +${c.exports.length - 3}`}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
