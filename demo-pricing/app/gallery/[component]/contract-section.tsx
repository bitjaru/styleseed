import { Fragment, type ReactNode } from "react";
import type { ComponentContract } from "@/lib/contracts";
import { contractExamples } from "@/lib/contract-examples";
import type { Skin } from "@/lib/registry";
import { PreviewFrame } from "./preview-frame";

const REPO = "https://github.com/bitjaru/styleseed/blob/main/";

// Inline `code` from the contract markdown; everything else stays text.
function Rich({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/u).map((part, i) => part.startsWith("`") && part.endsWith("`")
    ? <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">{part.slice(1, -1)}</code>
    : <Fragment key={i}>{part}</Fragment>)}</>;
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{children}</h3>;
}

function ExampleRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-gray-200/60 py-3 first:border-t-0">
      <div className="w-40 shrink-0 text-xs text-gray-500">{label}</div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function ContractSection({ contract, skins }: { contract: ComponentContract; skins: Skin[] }) {
  const examples = contractExamples[contract.id] ?? {};
  const code = contract.code;
  const hasExamples = Boolean(examples.variant || examples.size || examples.states?.length);

  return (
    <section className="mt-10" aria-labelledby="contract-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="contract-title" className="text-2xl font-bold tracking-tight">Contract</h2>
        <a href={`${REPO}${contract.contract}`} className="text-xs text-blue-600 hover:underline" target="_blank" rel="noreferrer">
          Edit {contract.contract} →
        </a>
      </div>
      <p className="mt-3 text-base leading-relaxed text-gray-700"><Rich text={contract.purpose} /></p>

      {hasExamples && (
        <div className="mt-6">
          <Heading>Live examples</Heading>
          <PreviewFrame skins={skins} preview={
            <div className="w-full max-w-2xl">
              {examples.variant && contract.variants.map((v) => v.code && (
                <ExampleRow key={`v-${v.code}`} label={<><code className="font-mono">{v.code}</code><br />{v.designer}</>}>{examples.variant!(v.code)}</ExampleRow>
              ))}
              {examples.size && code.sizes.map((s) => (
                <ExampleRow key={`s-${s.key}`} label={<>size <code className="font-mono">{s.key}</code>{s.height ? ` · ${s.height}px` : ""}</>}>{examples.size!(s.key)}</ExampleRow>
              ))}
              {examples.states?.map((s) => <ExampleRow key={`st-${s.label}`} label={s.label}>{s.node}</ExampleRow>)}
            </div>
          } />
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <Heading>Anatomy</Heading>
          <ul className="space-y-1.5 text-sm text-gray-700">{contract.anatomy.map((a) => <li key={a}><Rich text={a} /></li>)}</ul>
        </div>
        <div>
          <Heading>From the code</Heading>
          <dl className="space-y-2 text-sm text-gray-700">
            <div><dt className="text-xs text-gray-500">Tokens consumed</dt><dd className="mt-1 flex flex-wrap gap-1">{code.tokens.map((t) => <code key={t} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{t}</code>)}</dd></div>
            <div><dt className="text-xs text-gray-500">Radius</dt><dd><Rich text={code.radius} /></dd></div>
            <div><dt className="text-xs text-gray-500">Focus</dt><dd className="font-mono text-xs">{code.focus.join(" · ") || "none set"}</dd></div>
            <div><dt className="text-xs text-gray-500">Motion</dt><dd className="font-mono text-xs">{code.motion.join(" · ") || "none"}</dd></div>
          </dl>
        </div>
      </div>

      {contract.variants.length > 0 && (
        <div className="mt-8">
          <Heading>Variants</Heading>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="py-2 pr-4 font-medium">Code</th><th className="py-2 pr-4 font-medium">Designer name</th><th className="py-2 font-medium">Use when</th></tr></thead>
            <tbody>{contract.variants.map((v) => <tr key={v.code ?? v.designer} className="border-b border-gray-100 align-top"><td className="py-2 pr-4 font-mono text-xs">{v.code}</td><td className="py-2 pr-4">{v.designer}</td><td className="py-2 text-gray-700"><Rich text={v.use} /></td></tr>)}</tbody>
          </table></div>
        </div>
      )}

      <div className="mt-8">
        <Heading>States</Heading>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="py-2 pr-4 font-medium">State</th><th className="py-2 pr-4 font-medium">Looks</th><th className="py-2 font-medium">Note</th></tr></thead>
          <tbody>{contract.states.map((s) => <tr key={s.state} className="border-b border-gray-100 align-top"><td className="py-2 pr-4 font-medium">{s.state}</td><td className="py-2 pr-4 text-gray-700"><Rich text={s.looks} /></td><td className="py-2 text-gray-700"><Rich text={s.note} /></td></tr>)}</tbody>
        </table></div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-5">
          <Heading>Do</Heading>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">{contract.do.map((d) => <li key={d}><Rich text={d} /></li>)}</ul>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <Heading>Don&apos;t</Heading>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">{contract.dont.map((d) => <li key={d}><Rich text={d} /></li>)}</ul>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <Heading>Known gaps</Heading>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-800">{contract.knownGaps.map((g) => <li key={g}><Rich text={g} /></li>)}</ul>
        {code.flags.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Machine checks</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-800">{code.flags.map((f) => <li key={f}><Rich text={f} /></li>)}</ul>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-500">Sources: {contract.sources.map((s, i) => <Fragment key={s}>{i > 0 ? " · " : ""}<Rich text={s} /></Fragment>)}</p>
    </section>
  );
}
