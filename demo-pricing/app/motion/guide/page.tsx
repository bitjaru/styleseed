import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PromptCard } from "./prompt-card";

const BASE = "https://styleseed-demo.vercel.app";

const description =
  "Learn to vibe-code your own motion with StyleSeed: combine 5 motion seeds " +
  "(personality) with named keyword moves (toggle-flip, tilt-3d, glow-pulse…) " +
  "and copy-paste prompts for Claude Code, Codex & Cursor to ship consistent, original animation.";

export const metadata: Metadata = {
  title: "Motion Guide — vibe-code your own animation with seeds + keywords",
  description,
  keywords: [
    "framer motion tutorial",
    "vibe coding motion",
    "compose framer motion",
    "react animation guide",
    "claude code motion",
    "cursor animation prompts",
    "custom framer motion presets",
    "프레이머 모션 튜토리얼",
    "바이브코딩 모션",
  ],
  alternates: { canonical: `${BASE}/motion/guide` },
  openGraph: {
    type: "article",
    url: `${BASE}/motion/guide`,
    title: "Motion Guide — vibe-code your own animation",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/motion.png`, width: 1280, height: 640 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Motion Guide — vibe-code your own animation",
    description,
    images: [`${BASE}/og/motion.png`],
  },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Vibe-code your own motion with StyleSeed",
    description,
    url: `${BASE}/motion/guide`,
    author: { "@type": "Organization", name: "StyleSeed" },
    about: ["framer-motion", "UI animation", "vibe coding", "design systems"],
  };
}

export default function MotionGuidePage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-14 text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/motion"
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={15} /> Motion Keywords
        </Link>

        {/* Hero */}
        <header className="mb-14">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Motion Guide
          </div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">
            Vibe-code your own motion
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
            You don&rsquo;t pick easing curves and spring constants anymore — you name a
            feeling. This guide shows how StyleSeed&rsquo;s two motion layers combine, and
            gives you copy-paste prompts so Claude Code, Codex, or Cursor produces{" "}
            <span className="font-semibold text-neutral-900">consistent, original</span>{" "}
            animation instead of another default fade.
          </p>
        </header>

        {/* 1. Two layers */}
        <Section n={1} title="Two layers: personality × move">
          <p className="mb-5 text-[15px] leading-relaxed text-neutral-700">
            Every StyleSeed motion is one of two things. Knowing which you want is the whole
            skill.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <LayerCard
              tag="Seed"
              tagColor="#3182F6"
              title="Personality"
              body="How any motion feels. 5 named seeds — Spring (bouncy), Silk (smooth), Snap (instant), Float (dreamy), Pulse (rhythmic) — each in 5 contexts (entrance / exit / hover / press / layout)."
              example="{...spring.hover}"
            />
            <LayerCard
              tag="Keyword"
              tagColor="#8B5CF6"
              title="Distinctive move"
              body="A specific, recognizable motion behind one handle — toggle-flip, reveal-blur, tilt-3d, glow-pulse, confetti-pop… Say the keyword, get that exact recipe."
              example="/styleseed motion toggle-flip"
            />
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-neutral-700">
            The magic is combining them: a <em>move</em> rendered with a <em>personality</em>.
            A <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[13px]">toggle-flip</code>{" "}
            can feel bouncy (Spring) or instant (Snap) — same move, different soul.
          </p>
        </Section>

        {/* 2. Apply in seconds */}
        <Section n={2} title="Apply one in seconds">
          <p className="mb-4 text-[15px] leading-relaxed text-neutral-700">
            Seeds are spreadable recipes. Import one and spread it onto any{" "}
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[13px]">motion.*</code>{" "}
            element — combine contexts freely:
          </p>
          <Code>{`import { spring } from "@engine/motion";

// hover + press compose cleanly
<motion.button {...spring.hover} {...spring.press}>
  Save
</motion.button>`}</Code>
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">
            For a keyword move, grab the snippet from the{" "}
            <Link href="/motion" className="font-semibold text-neutral-900 underline underline-offset-2">
              gallery
            </Link>{" "}
            (each card has a Copy button) — or just ask your AI by name (next section).
          </p>
        </Section>

        {/* 3. Vibe-coding prompts */}
        <Section n={3} title="Prompts that just work">
          <p className="mb-5 text-[15px] leading-relaxed text-neutral-700">
            Paste any of these into Claude Code, Codex, or Cursor. Because the keywords map to one
            registry, the AI resolves them to real framer-motion code — the same every time.
          </p>
          <div className="flex flex-col gap-3">
            <PromptCard
              prompt="Make this CTA button magnetic and give it a glow-pulse so it draws the eye."
              maps="magnetic + glow-pulse"
            />
            <PromptCard
              prompt="Tilt this pricing card in 3D on hover (tilt-3d) with a spotlight that follows the cursor."
              maps="tilt-3d + spotlight"
            />
            <PromptCard
              prompt="Reveal the feature list with stagger-cascade, each item using the silk seed."
              maps="stagger-cascade + silk"
            />
            <PromptCard
              prompt="When the form is invalid, wiggle the field and squish the submit button on tap."
              maps="wiggle + press-squish"
            />
            <PromptCard
              prompt="Flip this toggle in 3D (toggle-flip) using the spring seed, and pop a confetti-pop when it turns on."
              maps="toggle-flip + spring + confetti-pop"
            />
            <PromptCard
              prompt="Decode the hero headline with a text-scramble on load."
              maps="text-scramble"
            />
          </div>
        </Section>

        {/* 4. Compose your own */}
        <Section n={4} title="Make your own move">
          <p className="mb-4 text-[15px] leading-relaxed text-neutral-700">
            The seeds and keywords are a starting grammar, not a cage. To invent a motion,
            start from a seed&rsquo;s recipe and add one transform. Here&rsquo;s a mischievous
            &ldquo;wobble&rdquo; built on Spring&rsquo;s hover:
          </p>
          <Code>{`// spring.hover gives the bouncy lift — add a tilt for character
<motion.div
  whileHover={{ scale: 1.04, rotate: -3 }}
  transition={{ type: "spring", stiffness: 300, damping: 12 }}
/>`}</Code>
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">
            Then ask your AI to formalize it so it&rsquo;s reusable across your app:
          </p>
          <div className="mt-3">
            <PromptCard
              prompt="Take the spring seed's hover and add a -3deg rotate so it feels playful. Save it in our motion library as a new keyword `wobble-hover` and use it on the avatar."
              maps="new keyword from a seed"
            />
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-neutral-500">
            Rule of thumb: <span className="font-semibold text-neutral-700">one move per element.</span>{" "}
            Pick a personality for the page, reach for a keyword when a specific element
            should stand out, and let <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-[12px]">prefers-reduced-motion</code>{" "}
            (handled automatically) quiet it all down when a user asks.
          </p>
        </Section>

        {/* CTA */}
        <div
          className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-neutral-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="text-[18px] font-bold">Browse the full library</div>
            <div className="mt-1 text-[14px] text-neutral-400">
              Preview and copy every seed and keyword move.
            </div>
          </div>
          <Link
            href="/motion"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]"
          >
            Open the gallery <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-neutral-900 text-[13px] font-bold text-white">
          {n}
        </span>
        <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LayerCard({
  tag,
  tagColor,
  title,
  body,
  example,
}: {
  tag: string;
  tagColor: string;
  title: string;
  body: string;
  example: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl bg-white p-5"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}
    >
      <span
        className="w-fit rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
        style={{ background: `${tagColor}14`, color: tagColor }}
      >
        {tag}
      </span>
      <div className="text-[16px] font-bold">{title}</div>
      <p className="text-[13px] leading-relaxed text-neutral-500">{body}</p>
      <code className="mt-1 w-fit rounded-md bg-neutral-100 px-2 py-1 text-[12px] font-semibold text-neutral-700">
        {example}
      </code>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-neutral-900 p-5 text-[13px] leading-relaxed text-neutral-100">
      <code>{children}</code>
    </pre>
  );
}
