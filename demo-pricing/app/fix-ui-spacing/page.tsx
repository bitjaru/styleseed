import type { Metadata } from "next";
import Link from "next/link";
import { ShareExample, SpacingDemo, ProofPrompt, ProofInstall } from "./spacing-demo";
import proof from "@/content/spacing-proof.json";
const BASE = "https://styleseed-demo.vercel.app";
const title = "Why is my AI-generated UI spacing wrong?";
const description = "Check grouping, computed CSS, and nested spacing tokens before adding more padding. Try a real 64px to 12px CSS regression example for Claude Code and Codex.";
export const metadata: Metadata = { title: `${title} · StyleSeed`, description,
  alternates: { canonical: `${BASE}/fix-ui-spacing` },
  openGraph: { type: "article", title, description, url: `${BASE}/fix-ui-spacing` },
  twitter: { card: "summary_large_image", title, description } };
const prompt = "The spacing on this screen feels wrong. Identify which elements belong together, then inspect their computed padding/gap and the actual CSS token values. Check whether nested screens inherit a parent spacing alias. Preserve approved project tokens and components. Explain three prioritized fixes, apply only the authorized changes, and render desktop and mobile before and after. Check overflow, wrapped controls, and unrelated screens. Report what was measured and what still needs my judgment.";
export default function SpacingGuide() {
  const article = { "@context": "https://schema.org", "@type": "TechArticle", headline: title, description,
    datePublished: "2026-09-30", dateModified: "2026-09-30", mainEntityOfPage: `${BASE}/fix-ui-spacing`,
    author: { "@type": "Organization", name: "StyleSeed", url: BASE } };
  return <main data-styleseed-artifact="site-docs" className="min-h-screen bg-white px-5 py-12 text-neutral-900 sm:px-8">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
    <article className="mx-auto max-w-3xl">
      <Link href="/faq" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline underline-offset-4">StyleSeed / UI problems</Link>
      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">UI spacing guide · September 30, 2026</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-700">Start with grouping and the CSS value that actually reaches the element. More padding can hide a broken token or an inherited gap. It can also push mobile controls out of view.</p>
        <p lang="ko" className="mt-4 text-base leading-relaxed text-neutral-600">AI가 만든 화면의 간격이 어색하다면, 같은 그룹과 다른 그룹의 간격을 나누고 실제 적용된 CSS 값을 확인하세요. 부모의 간격이 자식 화면에 넘어오는지도 살펴봅니다.</p>
      </header>
      <SpacingDemo />
      <section className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight">Three checks before changing the numbers</h2>
        <ol className="list-decimal space-y-4 pl-5 text-base leading-relaxed text-neutral-700">
          <li><strong>Group by the task.</strong> A label, field, and hint belong together. Separate that group from the next decision. Equal gaps everywhere can flatten the hierarchy.</li>
          <li><strong>Read the applied value.</strong> Inspect the element’s computed gap or padding, its layout container, and its token reference. A missing or cyclic variable can collapse a gap even when the config looks correct.</li>
          <li><strong>Check ownership and content.</strong> A nested screen should use its own choices. Recheck narrow widths, longer labels, empty/error states, overflow, and wrapped controls after a spacing change.</li>
        </ol>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">What changed in the example?</h2>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">Previously, a child without its own section-gap alias could inherit 64px from its parent. StyleSeed’s CSS generator now resets its spacing aliases at nested artifact boundaries. The child can use its original 12px project token through a fallback. Explicit child overrides still work, even when parent CSS loads afterward.</p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">Project tokens and type stay in place. The 64px → 12px result is a reproduced inheritance repair. It is not an AI model comparison, a customer outcome, or a claim that every screen needs tighter spacing.</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-teal-800">
          <a href="https://github.com/bitjaru/styleseed/pull/63" className="underline underline-offset-4">Fix and regression tests</a>
          <a href="https://github.com/bitjaru/styleseed/blob/main/scripts/test-spacing-browser.mjs" className="underline underline-offset-4">Run the browser regression</a>
          <a href="https://github.com/bitjaru/styleseed/blob/main/demo-pricing/scripts/build-spacing-proof.mjs" className="underline underline-offset-4">Reproduce this fixture</a>
        </div>
        <details className="mt-5 text-sm text-neutral-600"><summary className="cursor-pointer py-3 font-semibold underline underline-offset-4">Fixture source and limits</summary><p className="mt-2 break-all leading-relaxed">Canonical source: {proof.source}. SHA-256: {proof.sourceSha256}. The parent owns 64px; the child project token is 12px. The fixed CSS is generated from the canonical engine. The before CSS deliberately reproduces the previous inheritance behavior. Only named page/toggle/copy events are sent when site analytics is enabled. No screenshot, project data, computed values, or clipboard contents are uploaded.</p></details>
        <ShareExample />
      </section>
      <section className="mt-12">
        <h2 className="mb-5 text-2xl font-bold tracking-tight">Try this on your own screen</h2>
        <ProofPrompt prompt={prompt} />
        <p className="mt-4 text-base leading-relaxed text-neutral-600">Use your existing components and tokens as the starting point. Ask for actual rendered evidence; a rules file alone does not change the page.</p>
      </section>
      <section id="install" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="mb-5 text-2xl font-bold tracking-tight">Want a repeatable workflow?</h2>
        <ProofInstall />
        <p className="mt-4 text-base leading-relaxed text-neutral-700">Then use <code>$styleseed</code> in Codex or <code>/styleseed</code> in Claude Code with your screen and the prompt above. New projects choose a method; existing projects preserve approved choices.</p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">Already installed? Run <code>$ss-update</code> or <code>/ss-update</code>, recompile affected bundles, and review any copied CSS. Updating skills alone does not repair an existing screen.</p>
        <Link href="/evaluate" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline underline-offset-4">Understand what the checks establish</Link>
      </section>
    </article>
  </main>;
}
