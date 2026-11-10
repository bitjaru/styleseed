import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponent, loadRegistry } from "@/lib/registry";
import { previews, hasPreview } from "@/lib/previews";
import { PreviewFrame } from "./preview-frame";
import { getContract } from "@/lib/contracts";
import { ContractSection } from "./contract-section";

export async function generateStaticParams() {
  return loadRegistry().components.map((c) => ({ component: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component: id } = await params;
  const c = getComponent(id);
  if (!c) return { title: "Not found" };
  return {
    title: `${c.name} — StyleSeed`,
    description:
      c.description || `${c.type === "ui" ? "UI primitive" : "Composed pattern"} from StyleSeed`,
  };
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component: id } = await params;
  const c = getComponent(id);
  if (!c) notFound();
  const contract = getContract(id);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/gallery" className="text-sm text-gray-500 hover:text-gray-900">
          ← Gallery
        </Link>

        <header className="mt-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{c.name}</h1>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {c.type === "ui" ? "UI primitive" : "Pattern"}
            </span>
          </div>
          <code className="mt-2 block font-mono text-sm text-gray-500">{c.id}</code>
          {c.description && <p className="mt-3 text-lg text-gray-700">{c.description}</p>}
        </header>

        {hasPreview(c.id) ? (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Live preview
            </h2>
            <PreviewFrame preview={previews[c.id]} skins={loadRegistry().skins} />
          </section>
        ) : contract ? null : (
          <section className="mt-8 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Preview not configured for this component yet. Source code is shown below.
          </section>
        )}

        {contract && <ContractSection contract={contract} skins={loadRegistry().skins} />}

        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Size" value={`${(c.bytes / 1024).toFixed(1)} KB`} />
          <Meta label="Exports" value={String(c.exports.length)} />
          <Meta label="Imports" value={String(c.imports.length)} />
          <Meta label="Type" value={c.type} />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Exports
          </h2>
          <div className="flex flex-wrap gap-2">
            {c.exports.map((name) => (
              <code
                key={name}
                className="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800"
              >
                {name}
              </code>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Imports
          </h2>
          <ul className="space-y-1">
            {c.imports.map((imp) => (
              <li key={imp} className="font-mono text-sm text-gray-700">
                {imp}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Source</h2>
            <a
              href={c.sourceUrl}
              className="text-xs text-blue-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub →
            </a>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800">
            <code>{c.code}</code>
          </pre>
        </section>

        <footer className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-500">
          <p>
            Path: <code className="font-mono break-all">{c.source}</code>
          </p>
          <p className="mt-1">
            Digest: <code className="font-mono break-all">{c.digest}</code>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-gray-900">{value}</div>
    </div>
  );
}
