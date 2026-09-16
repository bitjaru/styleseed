import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Inbox, Star, TrendingUp, X } from "lucide-react";

const BASE = "https://styleseed-demo.vercel.app";
const ACCENT = "#3182F6";

const description =
  "StyleSeed isn't a component gallery — it's a thinking framework. See the reasoning behind every UI decision: the rule it follows, and why that rule makes the result look designed instead of generated.";

export const metadata: Metadata = {
  title: "How StyleSeed thinks — the reasoning behind every UI decision",
  description,
  keywords: [
    "why ai ui looks generic",
    "design reasoning",
    "design judgment",
    "design system for ai",
    "claude code design rules",
    "ui design principles explained",
  ],
  alternates: { canonical: `${BASE}/how-it-thinks` },
  openGraph: {
    type: "article",
    url: `${BASE}/how-it-thinks`,
    title: "How StyleSeed thinks",
    description,
    siteName: "StyleSeed",
    images: [{ url: `${BASE}/og/rules-blueprint.png`, width: 1280, height: 640 }],
  },
  twitter: { card: "summary_large_image", title: "How StyleSeed thinks", description, images: [`${BASE}/og/rules-blueprint.png`] },
};

/** One reasoning block: a real UI fragment + the decision, the rule, and why it works. */
function Reason({
  n,
  decision,
  rule,
  why,
  children,
  flip,
}: {
  n: number;
  decision: string;
  rule: string;
  why: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <div className={flip ? "md:order-2" : ""}>
        <div className="rounded-2xl bg-neutral-50 p-6" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)" }}>
          {children}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            {n}
          </span>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-400">The decision</span>
        </div>
        <h3 className="mt-3 text-[20px] font-bold leading-snug tracking-tight text-neutral-900">{decision}</h3>
        <div className="mt-3 inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-[12px] font-bold text-neutral-700">
          {rule}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
          <span className="font-semibold text-neutral-900">Why it works · </span>
          {why}
        </p>
      </div>
    </div>
  );
}

export default function HowItThinks() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How StyleSeed thinks — the reasoning behind every UI decision",
    description,
    url: `${BASE}/how-it-thinks`,
    author: { "@type": "Organization", name: "StyleSeed" },
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* hero */}
      <section className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-14">
          <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900">
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <div className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
            How it thinks
          </div>
          <h1 className="mt-3 text-[clamp(32px,5.5vw,52px)] font-bold leading-[1.05] tracking-tight">
            Every pixel here has a reason.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-neutral-600">
            StyleSeed aims to make <strong className="font-semibold text-neutral-900">expert
            design judgment</strong> repeatable by coding agents: recorded decisions, their reasons,
            and checks on the implementation. Experts keep ownership of intent and acceptance.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-neutral-600">
            Below is one screen. We&rsquo;ll walk every decision in it: what we chose, which rule it
            follows, and <strong className="font-semibold text-neutral-900">why that makes it work</strong>.
            This is the framework your AI is reading.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/coherence-mixed-vs-unified.svg"
          alt="Same content, two cards: a 'mixed' card with three accent colors and mixed corner radii looks off; a 'one system' card with one accent and one radius looks designed. The only difference is coherence."
          width={1200}
          height={680}
          className="mx-auto mt-2 w-full max-w-3xl px-6 pb-10"
        />
      </section>

      {/* reasoning blocks */}
      <section className="mx-auto max-w-5xl space-y-16 px-6 py-20">

        <Reason
          n={1}
          decision="The balance is huge; its unit is half its size."
          rule="Rule 4 · Numbers 2:1 with units"
          why="The eye locks onto magnitude first. A 48px number over a 24px unit creates instant hierarchy — make them the same size and the value flattens into noise. The 2:1 ratio is the difference between 'a number' and 'the number that matters.'"
        >
          <div className="rounded-xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Total balance</div>
            <p className="mt-2 font-bold leading-none tracking-tight text-neutral-900">
              <span className="text-[48px]">$3.84</span>
              <span className="ms-1 text-[24px] text-neutral-500">M</span>
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: "#16A34A" }}>
              <TrendingUp size={14} /> +12.4% <span className="font-medium text-neutral-400">vs last month</span>
            </div>
          </div>
        </Reason>

        <Reason
          n={2}
          flip
          decision="One blue. Everything else is grey."
          rule="Rule 2 · Single accent  +  VISUAL-CRAFT §C0 · Coherence"
          why="A second accent splits the question 'where do I look?' Scarcity is what makes the primary action unmissable — the accent earns its meaning by being the only thing wearing it. The rest goes greyscale so the one colored thing is always the answer."
        >
          <div className="rounded-xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="text-[13px] font-semibold text-neutral-700">Send a transfer</div>
            <div className="mt-4 flex gap-2.5">
              <button className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-bold text-white" style={{ background: ACCENT }}>
                Send $2,400
              </button>
              <button className="rounded-lg bg-neutral-100 px-4 py-2.5 text-[14px] font-bold text-neutral-700">
                Cancel
              </button>
            </div>
            <p className="mt-3 text-[12px] text-neutral-400">Only the primary action is colored — the eye never has to choose.</p>
          </div>
        </Reason>

        <Reason
          n={3}
          decision="Content sits in cards, separated by tone — not borders."
          rule="Rule 1 · Everything in cards  +  Rule 7 · Shadows ≤ 8%"
          why="Borders everywhere read as busy and cluttered. A soft tonal background plus a faint shadow separates surfaces without adding a single line — the page feels calm because nothing is fighting for an edge. Reach for a border only when space and tone can't do the job."
        >
          <div className="space-y-2.5 rounded-xl bg-neutral-100 p-4">
            {[
              { name: "Acme Corp", meta: "Downt<wbr/>own · 2:14 PM", amt: "+$8,400" },
              { name: "Northwind", meta: "Refund · 1:09 PM", amt: "−$320" },
            ].map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg bg-white px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div>
                  <div className="text-[14px] font-bold text-neutral-900">{t.name}</div>
                  <div className="text-[12px] text-neutral-400">{t.meta}</div>
                </div>
                <div className="text-[15px] font-bold tabular-nums text-neutral-900">{t.amt}</div>
              </div>
            ))}
          </div>
        </Reason>

        <Reason
          n={4}
          flip
          decision="Numbers are tabular and right-aligned. Every decimal lines up."
          rule="VISUAL-CRAFT §C2/§C5 · Tabular numerals"
          why="With tabular figures every digit is the same width, so columns and decimals stack into a clean vertical edge you can scan in one pass. Proportional numbers jitter the alignment and make a money table feel untrustworthy. For finance this isn't polish — it's legibility."
        >
          <div className="rounded-xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">This week</div>
            <div className="mt-3 space-y-1.5 text-[14px]">
              {[
                ["Payroll", "−$12,480.00"],
                ["Stripe payout", "+$3,209.50"],
                ["AWS", "−$842.16"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-neutral-600">{k}</span>
                  <span className="font-bold tabular-nums text-neutral-900">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Reason>

        <Reason
          n={5}
          decision="One corner personality — the card, its thumbnail, and its button all agree."
          rule="VISUAL-CRAFT §C0 · One radius, nested law"
          why="Mixing sharp and round corners is the #1 tell of un-designed UI. Pick one personality and apply it everywhere. And a nested element uses inner = outer − padding, so its corner shares a center with the card's — otherwise it visibly bulges past the arc."
        >
          <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl" style={{ background: `${ACCENT}22` }} />
              <div className="flex-1">
                <div className="text-[14px] font-bold text-neutral-900">Card · 16px</div>
                <div className="text-[12px] text-neutral-400">Thumbnail · 16 − 4 pad = 12px</div>
              </div>
            </div>
            <button className="mt-3 w-full rounded-xl py-2 text-[13px] font-bold text-white" style={{ background: ACCENT }}>
              Button · same family
            </button>
          </div>
        </Reason>

        <Reason
          n={6}
          flip
          decision="The empty state is designed, not a blank rectangle."
          rule="Rule 71 · Empty / loading / error states"
          why="A data surface has three states besides 'full,' and the AI that forgets them ships a screen that looks broken the moment there's no data. An empty state with an icon, a sentence, and the next action turns a dead end into a starting point."
        >
          <div className="flex flex-col items-center rounded-xl bg-white px-5 py-8 text-center" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
              <Inbox size={20} className="text-neutral-400" />
            </div>
            <div className="mt-3 text-[14px] font-bold text-neutral-900">No transactions yet</div>
            <div className="mt-1 text-[12px] text-neutral-500">Your activity will show up here.</div>
            <button className="mt-3 rounded-lg px-3.5 py-2 text-[13px] font-bold text-white" style={{ background: ACCENT }}>
              Add the first one
            </button>
          </div>
        </Reason>

        <Reason
          n={7}
          decision="Motion is one named seed — confident on the CTA, invisible on a balance."
          rule="Motion system · named seeds, not ad-hoc fades"
          why="A random fade on everything is the motion equivalent of a rainbow palette. One named seed (here: Spring on press) gives every interaction the same personality, and motion never delays the thing the user came to see — you never bounce a balance into view. Consistent feel, zero latency where it counts."
        >
          <div className="rounded-xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2 text-neutral-700"><Check size={14} style={{ color: "#16A34A" }} /> CTA press → <span className="font-semibold">Spring</span> (stiffness 300, damping 18)</div>
              <div className="flex items-center gap-2 text-neutral-700"><Check size={14} style={{ color: "#16A34A" }} /> Card entrance → near-zero, content-first</div>
              <div className="flex items-center gap-2 text-neutral-700"><Check size={14} style={{ color: "#16A34A" }} /> Balance → no motion; the number is the point</div>
            </div>
          </div>
        </Reason>

        <Reason
          n={8}
          flip
          decision="The button says what happens — not “Submit.”"
          rule="UX-WRITING WB-1 · Label the action, not the mechanism"
          why="The words are part of the design too. “Submit” / “OK” / “Confirm” make the user guess what they're agreeing to; a button that reads “Send $2,400” is its own confirmation. Copy that sounds like a system — “Invalid input,” “An error occurred” — reads as AI-made exactly like the wrong color does. StyleSeed writes the verbal judgment down too (buttons name the action, errors help instead of blame, one term per concept) — and you pick the voice, the rules are the floor."
        >
          <div className="rounded-xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2.5">
              <button className="rounded-lg bg-neutral-100 px-4 py-2.5 text-[14px] font-bold text-neutral-400 line-through">Submit</button>
              <X size={16} className="text-red-400" />
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <button className="rounded-lg px-4 py-2.5 text-[14px] font-bold text-white" style={{ background: ACCENT }}>Send $2,400</button>
              <Check size={16} style={{ color: "#16A34A" }} />
            </div>
            <p className="mt-3 text-[12px] text-neutral-400">You can act from the label alone — no guessing what “Submit” does.</p>
          </div>
        </Reason>

      </section>

      {/* the thesis */}
      <section className="border-y border-neutral-200 bg-neutral-900 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-[clamp(24px,4vw,34px)] font-bold leading-tight tracking-tight">
            Decisions need reasons and boundaries.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-neutral-300">
            An agent needs to know when a decision applies and how to implement it, not just which
            style to imitate. Coherence matters, but is not sufficient evidence of design quality.
            <strong className="font-semibold text-white"> Human review still matters.</strong>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://github.com/bitjaru/styleseed"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]"
            >
              <Star size={15} className="fill-amber-400 text-amber-400" /> Star on GitHub
            </a>
            <Link
              href="/why"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-5 py-3 text-[14px] font-bold text-white hover:bg-white/10"
            >
              See generic vs. designed <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* next */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">Go deeper</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/guides", title: "Design guides by app type", desc: "How the rules bias for fintech, SaaS, social, and more." },
            { href: "/why", title: "Generic vs. designed", desc: "The same brief, before and after the rules." },
            { href: "/showcase", title: "The showcase", desc: "Reference builds, re-skinning live in the browser." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="rounded-2xl bg-white p-5 transition-shadow hover:shadow-md" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
              <h3 className="text-[15px] font-bold tracking-tight text-neutral-900">{c.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{c.desc}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: ACCENT }}>
                Open <ArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
