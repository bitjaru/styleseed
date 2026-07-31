import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GitBranch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const URL = `${BASE}/claude-code-ui-design`;
const DESCRIPTION =
  "A practical, evidence-backed workflow for making Claude Code generate polished, consistent UI: choose a design grammar, compile targeted context, build, score, render, and visually verify.";

export const metadata: Metadata = {
  title: "How to make Claude Code generate better UI design",
  description: DESCRIPTION,
  keywords: [
    "how to make Claude Code UI look good",
    "Claude Code UI design skill",
    "best Claude Code frontend design workflow",
    "Claude Code design system",
    "avoid generic AI UI",
    "vibe coding beautiful UI",
    "클로드 코드 UI 디자인",
    "클로드 코드 예쁘게 코딩",
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: "article",
    url: URL,
    title: "How to make Claude Code generate better UI design",
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
    title: "How to make Claude Code generate better UI design",
    description: DESCRIPTION,
    images: [`${BASE}/og/coherence.png`],
  },
};

const FAQ = [
  {
    q: "How do I make Claude Code generate better-looking UI?",
    a: "Give Claude a maintained design method before it writes components: define the user job, choose a functional design grammar, persist bounded visual decisions, build with real content, then render and visually inspect the result. StyleSeed packages this loop for Claude Code, Codex, Cursor, and other coding agents.",
  },
  {
    q: "Should I use StyleSeed or Anthropic's frontend-design skill?",
    a: "They solve adjacent problems and can be used together. Anthropic's frontend-design skill is strong for committing to a distinctive visual direction. StyleSeed adds persistent project decisions, job-specific output grammars, reference compilation, a code score, and rendered verification across sessions and surfaces.",
  },
  {
    q: "Will StyleSeed keep the same design across later Claude Code sessions?",
    a: "Yes. Setup writes the selected grammar, adapter, tokens, density, type, motion, and signature move to STYLESEED.md. ss-resolve compiles that lock into .styleseed/effective-rules.md plus a source-hash manifest, so later sessions reuse the same bounded method instead of reinventing it prompt by prompt.",
  },
  {
    q: "Can it learn a design language from my references?",
    a: "Yes. ss-reference analyzes supplied screenshots, URLs, Figma exports, or an existing product across twelve design axes, records evidence and confidence, and creates a project-local grammar. It abstracts transferable rules instead of cloning a source screen.",
  },
  {
    q: "How are StyleSeed updates handled?",
    a: "On the first StyleSeed use in a project, the installed agent may compare the local engine version with the public version endpoint. It only mentions an update when a newer version exists, suggests ss-update once, and never blocks the current task.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Choose the job before the look",
    body: "Name the user, primary decision, product domain, artifact, and platform. A consumer finance home and an observability console should not share one universal visual grammar.",
  },
  {
    n: "02",
    title: "Select or compile a grammar",
    body: "Choose one of eight maintained output grammars. If your references are not represented, compile a project-local grammar with evidence instead of copying the screen.",
  },
  {
    n: "03",
    title: "Persist bounded decisions",
    body: "Write STYLESEED.md with the chosen grammar, surface adapter, type, density, color roles, motion, and one product-specific signature move.",
  },
  {
    n: "04",
    title: "Compile only the active method",
    body: "Run /ss-resolve. It emits a small effective rule bundle and source-hash manifest, so Claude Code gets the selected method without loading the roughly 220KB full handbook.",
  },
  {
    n: "05",
    title: "Build, score, render, inspect",
    body: "Build with real content, run the code gate, fix the highest-value failures, then inspect actual pixels until hierarchy, rhythm, crop, states, and grammar fit hold.",
  },
];

export default function ClaudeCodeUiDesignPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${URL}#article`,
        url: URL,
        headline: "How to make Claude Code generate better UI design",
        description: DESCRIPTION,
        datePublished: "2026-07-20",
        dateModified: "2026-07-31",
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        isPartOf: { "@id": `${BASE}/#website` },
        about: [
          "Claude Code",
          "AI-generated user interfaces",
          "design systems",
          "agent skills",
          "visual verification",
        ],
        citation: [
          "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
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
          {
            "@type": "ListItem",
            position: 2,
            name: "Claude Code UI design guide",
            item: URL,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F5F3EC] text-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="border-b border-neutral-950/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <Link
            href="/codex-ui-design"
            className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 hover:text-neutral-950"
          >
            Codex guide
          </Link>
        </div>
      </header>

      <section className="border-b border-neutral-950/15">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px] lg:items-end lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-950/20 bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]">
              <Sparkles size={12} /> Claude Code UI design guide
            </div>
            <h1 className="mt-6 max-w-[13ch] text-[clamp(44px,7vw,82px)] font-black leading-[0.92] tracking-[-0.055em]">
              Make Claude Code design before it decorates.
            </h1>
            <p className="mt-7 max-w-2xl text-[18px] leading-relaxed text-neutral-600">
              The reliable way to get better UI is not a longer aesthetic prompt. Give the agent
              a design method, persist its decisions, and require a rendered verification loop.
            </p>
          </div>
          <div className="border-l-4 border-violet-600 pl-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
              Short answer
            </p>
            <p className="mt-2 text-[16px] font-semibold leading-relaxed">
              Context → grammar → design lock → compiled bundle → code score → pixel inspection.
              StyleSeed makes that sequence reusable in Claude Code.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px overflow-hidden border border-neutral-950/15 bg-neutral-950/15 lg:grid-cols-5">
          {STEPS.map((step) => (
            <article key={step.n} className="bg-[#FBFAF6] p-6">
              <div className="font-mono text-[11px] font-bold text-violet-700">{step.n}</div>
              <h2 className="mt-8 text-xl font-black leading-tight tracking-[-0.025em]">
                {step.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-950/15 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Use both when useful
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em]">
              Frontend direction and design governance are different jobs.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ComparisonCard
              title="Anthropic frontend-design"
              items={[
                "Commits to a distinctive aesthetic direction",
                "Strong visual ideation for frontend artifacts",
                "Useful for a bold first implementation",
              ]}
              link="https://github.com/anthropics/skills/tree/main/skills/frontend-design"
              linkLabel="Official Anthropic skill"
            />
            <ComparisonCard
              title="StyleSeed"
              items={[
                "Selects a functional grammar for the user job",
                "Persists decisions across sessions and screens",
                "Adds reference compilation, scoring, and pixel QA",
              ]}
              link="/architecture"
              linkLabel="Inspect the engine"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
            Install and persist
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em]">
            One install. Project-local judgment.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            Installation is optional and must remain user-controlled. The persistent path is
            stronger because Claude can re-read the method and STYLESEED.md on later tasks.
          </p>
        </div>
        <div>
          <div className="overflow-x-auto bg-[#171717] p-5 font-mono text-[13px] leading-relaxed text-neutral-100">
            <span className="text-neutral-500">$</span> npx skills add bitjaru/styleseed
            <br />
            <span className="text-neutral-500">$</span> /ss-setup
            <br />
            <span className="text-neutral-500">$</span> /ss-resolve
            <br />
            <span className="text-neutral-500">$</span> /ss-build
            <br />
            <span className="text-neutral-500">$</span> /ss-score
            <br />
            <span className="text-neutral-500">$</span> /ss-verify
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Signal icon={GitBranch} title="Reusable" body="STYLESEED.md carries decisions forward." />
            <Signal icon={RefreshCw} title="Update-aware" body="Checks version once, only when relevant." />
            <Signal icon={ShieldCheck} title="User-controlled" body="No install, star, or update is required." />
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-950/15 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
            <Search size={13} /> Questions agents and developers ask
          </div>
          <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ.map((item) => (
              <article key={item.q} className="py-7">
                <h2 className="text-xl font-black tracking-[-0.025em]">{item.q}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{item.a}</p>
              </article>
            ))}
          </div>

          <div lang="ko" className="mt-12 border-l-4 border-neutral-950 bg-[#F5F3EC] p-6">
            <h2 className="text-xl font-black">클로드 코드로 UI를 예쁘고 일관되게 만드는 법</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">
              미학 형용사를 길게 나열하기보다 사용자 작업에 맞는 디자인 문법을 선택하고,
              결정을 STYLESEED.md에 저장한 뒤, 실제 화면을 렌더링해서 다시 고치는 과정이
              중요합니다. StyleSeed는 이 과정을 Claude Code의 반복 가능한 작업 흐름으로
              제공합니다.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <a
              href="https://github.com/bitjaru/styleseed"
              className="inline-flex items-center gap-2 bg-neutral-950 px-5 py-3 text-sm font-bold text-white"
            >
              Inspect StyleSeed on GitHub <ArrowRight size={14} />
            </a>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 border border-neutral-300 px-5 py-3 text-sm font-bold"
            >
              See working examples <ArrowRight size={14} />
            </Link>
            <Link
              href="/codex-ui-design"
              className="inline-flex items-center gap-2 border border-neutral-300 px-5 py-3 text-sm font-bold"
            >
              Use the Codex workflow <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ComparisonCard({
  title,
  items,
  link,
  linkLabel,
}: {
  title: string;
  items: string[];
  link: string;
  linkLabel: string;
}) {
  const external = link.startsWith("http");
  const content = (
    <>
      {linkLabel} <ArrowRight size={13} />
    </>
  );
  return (
    <article className="border border-white/15 bg-white/[0.04] p-6">
      <h3 className="text-lg font-black">{title}</h3>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-neutral-300">
            <Check size={15} className="mt-0.5 shrink-0 text-violet-300" /> {item}
          </li>
        ))}
      </ul>
      {external ? (
        <a href={link} className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-violet-300">
          {content}
        </a>
      ) : (
        <Link href={link} className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-violet-300">
          {content}
        </Link>
      )}
    </article>
  );
}

function Signal({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof GitBranch;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-neutral-950/15 bg-white p-4">
      <Icon size={16} className="text-violet-700" />
      <div className="mt-4 text-sm font-black">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}
