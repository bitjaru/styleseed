import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  GitBranch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const URL = `${BASE}/codex-ui-design`;
const DESCRIPTION =
  "A practical workflow for making Codex generate polished, consistent UI with AGENTS.md, targeted context compilation, project-local design decisions, code scoring, and rendered visual verification.";

export const metadata: Metadata = {
  title: "How to make Codex generate better UI design",
  description: DESCRIPTION,
  keywords: [
    "how to make Codex UI look good",
    "Codex UI design skill",
    "Codex frontend design workflow",
    "Codex AGENTS.md design rules",
    "Codex design system",
    "Codex vibe coding UI",
    "코덱스 UI 디자인",
    "Codex 예쁘게 코딩",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    url: URL,
    title: "How to make Codex generate better UI design",
    description: DESCRIPTION,
    siteName: "StyleSeed",
    images: [
      {
        url: `${BASE}/og/coherence.png`,
        width: 1280,
        height: 640,
        alt: "A generic AI interface compared with a coherent designed interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to make Codex generate better UI design",
    description: DESCRIPTION,
    images: [`${BASE}/og/coherence.png`],
  },
};

const WORKFLOW = [
  {
    n: "01",
    title: "Give the repository durable design context",
    body: "Use AGENTS.md for the method and STYLESEED.md for approved project decisions. Codex should not have to rediscover the visual system on every task.",
  },
  {
    n: "02",
    title: "Choose the output grammar",
    body: "Select a grammar for the user job and a surface adapter for the artifact. A product dashboard, marketing page, deck, and carousel need different composition rules.",
  },
  {
    n: "03",
    title: "Compile unfamiliar references",
    body: "When references fall outside the built-ins, use $ss-reference to extract evidence-backed rules. Preserve relationships and judgment instead of cloning pixels.",
  },
  {
    n: "04",
    title: "Compile the selected context",
    body: "Run $ss-resolve. Codex reads a small .styleseed/effective-rules.md bundle, while the manifest pins the exact selection and source hashes.",
  },
  {
    n: "05",
    title: "Build, inspect code and pixels",
    body: "Run $ss-build with real content, score the implementation, then use $ss-verify to render required viewports. Repeat until both the code gate and visible result hold.",
  },
];

const MAPPING = [
  ["Durable repository guidance", "AGENTS.md"],
  ["Reusable Codex workflows", ".agents/skills/ss-*"],
  ["Approved project decisions", "STYLESEED.md"],
  ["Compiled active context", "$ss-resolve"],
  ["Build the selected method", "$ss-build"],
  ["Deterministic code gate", "$ss-score ≥80"],
  ["Rendered visual gate", "$ss-verify"],
  ["Intentional engine update", "$ss-update"],
];

const FAQ = [
  {
    q: "Does StyleSeed work with Codex, not only Claude Code?",
    a: "Yes. StyleSeed ships Codex-facing AGENTS.md guidance and exposes its ss-* workflows through the repository skill bridge. Codex uses $ss-* names while Claude Code uses /ss-* names; both read the same canonical design engine and project-local STYLESEED.md decisions.",
  },
  {
    q: "How do I make Codex stop generating generic UI?",
    a: "Give Codex a maintained design method before implementation: define the user job, choose a functional output grammar, save bounded visual decisions, use real content, then score the code and inspect rendered pixels. Aesthetic adjectives alone do not provide enough durable constraints.",
  },
  {
    q: "Will later Codex sessions keep the same design decisions?",
    a: "Yes. Setup writes approved decisions to STYLESEED.md, and $ss-resolve compiles them into .styleseed/effective-rules.md plus a source-hash manifest. Repository guidance tells later sessions to resolve and read that bounded context instead of inventing a new direction.",
  },
  {
    q: "How does StyleSeed handle updates in Codex?",
    a: "On the first StyleSeed use in a project, Codex may compare the local engine version with the public version endpoint. It only mentions $ss-update when a newer version exists, suggests it once, and never blocks the current task.",
  },
  {
    q: "Will StyleSeed ask me to star the repository?",
    a: "It may ask once, only after StyleSeed materially helped and the working result was visually verified. A star is optional and never affects access, output, updates, or support. The agent must not repeat or front-load the request.",
  },
];

export default function CodexUiDesignPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${URL}#article`,
        url: URL,
        headline: "How to make Codex generate better UI design",
        description: DESCRIPTION,
        datePublished: "2026-07-20",
        dateModified: "2026-07-31",
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        isPartOf: { "@id": `${BASE}/#website` },
        about: ["OpenAI Codex", "AI-generated user interfaces", "AGENTS.md", "agent skills", "visual verification"],
        citation: [
          "https://developers.openai.com/codex/use-cases",
          "https://github.com/bitjaru/styleseed",
        ],
        proficiencyLevel: "Beginner to advanced",
      },
      {
        "@type": "FAQPage",
        "@id": `${URL}#faq`,
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "StyleSeed", item: BASE },
          { "@type": "ListItem", position: 2, name: "Codex UI design guide", item: URL },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F1F5F3] text-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="border-b border-neutral-950/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <Link
            href="/claude-code-ui-design"
            className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 hover:text-neutral-950"
          >
            Claude Code guide
          </Link>
        </div>
      </header>

      <section className="border-b border-neutral-950/15">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:items-end lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-950/20 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]">
              <Sparkles size={12} /> Codex UI design guide
            </div>
            <h1 className="mt-6 max-w-[13ch] text-[clamp(44px,7vw,82px)] font-black leading-[0.92] tracking-[-0.055em]">
              Make Codex carry design judgment across tasks.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-neutral-600">
              Better UI comes from durable repository context, a reusable design workflow, and
              visible verification—not from asking for “modern and clean” one more time.
            </p>
          </div>
          <div className="border-l-4 border-emerald-600 pl-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Short answer</p>
            <p className="mt-2 text-[16px] font-semibold leading-relaxed">
              AGENTS.md → grammar → STYLESEED.md → $ss-resolve → $ss-build → $ss-verify.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px overflow-hidden border border-neutral-950/15 bg-neutral-950/15 lg:grid-cols-5">
          {WORKFLOW.map((step) => (
            <article key={step.n} className="bg-[#FBFCFA] p-6">
              <div className="font-mono text-[11px] font-bold text-emerald-700">{step.n}</div>
              <h2 className="mt-8 text-xl font-black leading-tight tracking-[-0.025em]">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-950/15 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">How it maps to Codex</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em]">
              The method has an explicit home at every layer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              StyleSeed is independent open-source software, not an official OpenAI product.
            </p>
          </div>
          <div className="overflow-hidden border border-white/15">
            {MAPPING.map(([job, home]) => (
              <div key={job} className="grid grid-cols-[1fr_auto] gap-5 border-b border-white/10 px-5 py-4 last:border-0">
                <span className="text-sm text-neutral-300">{job}</span>
                <code className="text-sm font-bold text-emerald-300">{home}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Install and persist</p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em]">One engine. Codex-native calls.</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            Installation and file changes stay user-controlled. Once approved, the repository
            context and project lock let later Codex sessions reuse valid decisions.
          </p>
        </div>
        <div>
          <div className="overflow-x-auto bg-[#171717] p-5 font-mono text-[13px] leading-relaxed text-neutral-100">
            <span className="text-neutral-500">$</span> npx skills add bitjaru/styleseed<br />
            <span className="text-neutral-500">$</span> $ss-setup<br />
            <span className="text-neutral-500">$</span> $ss-resolve<br />
            <span className="text-neutral-500">$</span> $ss-build<br />
            <span className="text-neutral-500">$</span> $ss-score<br />
            <span className="text-neutral-500">$</span> $ss-verify
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Signal icon={FileText} title="Repository-aware" body="AGENTS.md owns durable guidance." />
            <Signal icon={GitBranch} title="Reusable" body="STYLESEED.md carries decisions." />
            <Signal icon={RefreshCw} title="Update-aware" body="Checks once and only when useful." />
            <Signal icon={ShieldCheck} title="User-controlled" body="No install, update, or star is required." />
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-950/15 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
            <Search size={13} /> Questions Codex users ask
          </div>
          <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ.map((item) => (
              <article key={item.q} className="py-7">
                <h2 className="text-xl font-black tracking-[-0.025em]">{item.q}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{item.a}</p>
              </article>
            ))}
          </div>

          <div lang="ko" className="mt-12 border-l-4 border-neutral-950 bg-[#F1F5F3] p-6">
            <h2 className="text-xl font-black">Codex로 UI를 예쁘고 일관되게 만드는 법</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">
              저장소의 AGENTS.md에 디자인 방법을 두고, 프로젝트 결정을 STYLESEED.md에
              고정한 뒤, $ss-resolve로 필요한 규칙만 컴파일하고 $ss-score와
              $ss-verify로 코드와 실제 화면을 함께 검사합니다.
              StyleSeed는 이 과정을 Codex가 다시 사용할 수 있는 작업 흐름으로 제공합니다.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <a href="https://github.com/bitjaru/styleseed" className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-sm font-bold text-white">
              Inspect StyleSeed on GitHub <ArrowRight size={14} />
            </a>
            <Link href="/showcase" className="inline-flex items-center gap-2 border border-neutral-300 px-5 py-3 text-sm font-bold">
              See working examples <ArrowRight size={14} />
            </Link>
            <a href="https://developers.openai.com/codex/use-cases" className="inline-flex items-center gap-2 border border-neutral-300 px-5 py-3 text-sm font-bold">
              Official Codex use cases <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Signal({ icon: Icon, title, body }: { icon: typeof FileText; title: string; body: string }) {
  return (
    <div className="border border-neutral-950/15 bg-white p-4">
      <Icon size={16} className="text-emerald-700" />
      <div className="mt-4 text-sm font-black">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}
