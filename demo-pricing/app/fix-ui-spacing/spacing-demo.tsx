"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { track } from "@vercel/analytics";
import { InstallCommand, PromptBox } from "../_home/prompt-box";
import proof from "@/content/spacing-proof.json";

type ProofEvent = "spacing-proof-view" | "spacing-proof-before" | "spacing-proof-after" | "spacing-proof-share-copy" | "spacing-proof-prompt-copy" | "spacing-proof-install-copy";
function sendProofEvent(name: ProofEvent) {
  try { track(name); } catch { /* Measurement availability must not break the example. */ }
}
export function ProofPrompt({ prompt }: { prompt: string }) {
  return <PromptBox prompt={prompt} onCopied={() => sendProofEvent("spacing-proof-prompt-copy")} />;
}
export function ProofInstall() {
  return <InstallCommand onCopied={() => sendProofEvent("spacing-proof-install-copy")} />;
}
export function SpacingDemo() {
  const [fixed, setFixed] = useState(false);
  const [measured, setMeasured] = useState<number | null>(null);
  const stack = useRef<HTMLDivElement>(null);
  const viewed = useRef(false);
  useEffect(() => { if (!viewed.current) { viewed.current = true; sendProofEvent("spacing-proof-view"); } }, []);
  useLayoutEffect(() => {
    if (stack.current) setMeasured(parseFloat(getComputedStyle(stack.current).rowGap));
  }, [fixed]);
  return <section aria-labelledby="demo-heading" className="my-10 border-y border-neutral-200 py-8">
    <h2 id="demo-heading" className="text-2xl font-bold tracking-tight">Same content. One boundary fix.</h2>
    <p className="mt-3 text-base leading-relaxed text-neutral-600">The parent declares 64px. The child owns a 12px project token. Switch the CSS to see which value reaches the child.</p>
    <div className="mt-5 flex flex-wrap gap-3" role="group" aria-label="Spacing example version">
      {[[false, "Before: inherited gap"], [true, "After: isolated gap"]].map(([value, label]) => <button key={String(value)} type="button" aria-pressed={fixed === value} onClick={() => { setFixed(Boolean(value)); sendProofEvent(value ? "spacing-proof-after" : "spacing-proof-before"); }} className={`min-h-11 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${fixed === value ? "border-teal-800 bg-teal-800 text-white" : "border-neutral-300 bg-white text-neutral-800"}`}>{label}</button>)}
    </div>
    <div className="mt-6 grid items-start gap-6 sm:grid-cols-[1fr_180px]">
      <div data-styleseed-artifact="proof-parent" className="bg-neutral-100 p-4" style={{ "--project-gap": "12px" } as CSSProperties}>
        <style>{fixed ? proof.afterCss : proof.beforeCss}</style>
        <div data-styleseed-artifact="proof-child" ref={stack} data-testid="proof-stack" style={{ display: "flex", flexDirection: "column", gap: "var(--ss-space-section-gap, var(--project-gap))", padding: "var(--ss-space-component-inset)" }} className="bg-white">
          <div><p className="text-xs font-semibold text-neutral-600">NOTIFICATIONS</p><h3 className="mt-2 text-lg font-bold">Keep your team informed</h3></div>
          <div className="border-t border-neutral-200 pt-3"><p className="font-semibold">Weekly summary</p><p className="mt-1 text-sm leading-relaxed text-neutral-600">Project activity, once a week.</p></div>
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true" className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Measured child gap</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-neutral-900"><span data-testid="measured-gap">{measured ?? "—"}</span><span className="ml-1 text-lg font-medium">px</span></p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{fixed ? "The child uses its existing project token." : "The child inherits the parent's engine alias."}</p>
      </div>
    </div>
    <p className="mt-5 text-sm leading-relaxed text-neutral-600">Synthetic CSS regression example. This reads your browser’s computed gap; it is not a customer result or a design-quality score. The fix restores a chosen value—it does not establish that 12px is optimal.</p>
  </section>;
}

export function ShareExample() {
  const [state, setState] = useState("");
  const url = "https://styleseed-demo.vercel.app/fix-ui-spacing";
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setState("Link copied."); sendProofEvent("spacing-proof-share-copy"); }
    catch { setState(`Copy this link: ${url}`); }
  };
  return <div className="mt-6">
    <button type="button" onClick={copy} className="min-h-11 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">Copy example link</button>
    <p aria-live="polite" className="mt-2 break-words text-sm text-neutral-600">{state}</p>
  </div>;
}
