import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./showcase/examples";
import { listShowcase } from "@/lib/showcase";
import { seeds as motionSeeds } from "@engine/motion";
import { SeedDemo } from "./_home/seed-demo";
import { Hero } from "./_home/hero";
import { InstallCommand } from "./_home/prompt-box";
import { WhatsNew } from "./_home/whats-new";
import { GithubIcon } from "./_home/github-icon";
import { GithubStarCount } from "./_home/github-star-count";
import competitorSource from "@/content/competitor-source.json";

const HERO_SHOWCASE_IDS = ["finance", "food", "fitness", "music", "issues", "wallet"];

/** Comparison table — StyleSeed vs the two adjacent categories. ✓/✗ are text glyphs on purpose. */
const COMPARISON_ROWS: { label: string; kits: string; packs: string; styleseed: string }[] = [
  { label: "Teaches judgment", kits: "✗", packs: "✗", styleseed: "✓ 74 rules — with the reasoning" },
  { label: "Fights the AI-look", kits: "✗", packs: "✗", styleseed: "✓ bans the tells by name" },
  { label: "Scored gate ≥80", kits: "✗", packs: "✗", styleseed: "✓ self-reviews & fixes first" },
  { label: "Anti-drift lock", kits: "✗", packs: "✗", styleseed: "✓ decisions persist across prompts" },
  { label: "Works in every agent", kits: "✗", packs: "✓", styleseed: "✓ Claude Code · Cursor · Codex · Gemini" },
  { label: "Price", kits: "Paid tiers", packs: "Free", styleseed: "Free · MIT" },
];

function CompareCell({ value, self = false }: { value: string; self?: boolean }) {
  if (value === "✗") return <span className="text-[14px] text-neutral-600">✗</span>;
  if (value === "✓") return <span className="text-[14px] font-bold text-neutral-400">✓</span>;
  if (value.startsWith("✓ ")) {
    return (
      <span className="text-[14px] text-neutral-100">
        <span className="font-bold text-teal-300">✓</span> {value.slice(2)}
      </span>
    );
  }
  return (
    <span className={`text-[14px] ${self ? "text-neutral-100" : "text-neutral-400"}`}>{value}</span>
  );
}

export default function HomePage() {
  const entries = listShowcase();
  const heroEntries = HERO_SHOWCASE_IDS.map((id) =>
    entries.find((e) => e.id === id),
  ).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const seedCount = Object.keys(motionSeeds).length;

  return (
    <>
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-3.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-[14px] font-bold text-white"
            >
              S
            </div>
            <span className="text-[15px] font-bold tracking-tight">StyleSeed</span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-5 text-[14px] font-semibold text-neutral-600 xl:flex">
            <a href="#get-started" className="hover:text-neutral-900">
              Get started
            </a>
            <Link href="/how-it-thinks" className="hover:text-neutral-900">
              How it thinks
            </Link>
            <Link href="/architecture" className="hover:text-neutral-900">
              Architecture
            </Link>
            <Link href="/showcase" className="hover:text-neutral-900">
              Showcase
            </Link>
            <Link href="/motion" className="hover:text-neutral-900">
              Motion
            </Link>
            <Link href="/interactions" className="hover:text-neutral-900">
              Interactions
            </Link>
            <Link href="/gallery" className="hover:text-neutral-900">
              Components
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="https://github.com/bitjaru/styleseed"
              target="_blank"
              rel="noreferrer"
              aria-label="Star StyleSeed on GitHub"
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[14px] font-bold text-neutral-700 transition-colors hover:border-neutral-900 lg:inline-flex"
            >
              Star on GitHub
              <GithubStarCount className="font-semibold text-neutral-500" />
            </a>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[14px] font-bold text-neutral-700 hover:border-neutral-900 hover:text-neutral-950"
            >
              Showcase
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <Hero />

        <section className="border-t border-neutral-200 bg-[#F5F8F7]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1.4fr]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-700">New in v4.0</div>
              <h2 className="mt-2 text-[clamp(28px,4vw,42px)] font-bold leading-tight tracking-tight">
                Direction, color, motion.<br />One working scene.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
                Studio turns a brief into three structurally different directions, requires a
                human selection, then compiles interaction scenes, image and video jobs, and a
                working prototype before it records the showcase reel.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                Eight semantic palette recipes recommend refined canvas, chrome, action, status,
                focus, and generated-media colors for the product job. Every required pair is
                contrast-checked; color does not replace the selected design grammar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/studio" className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-[14px] font-bold text-white hover:bg-black">
                  Open Studio workbench <ArrowRight size={14} />
                </Link>
                <Link href="/architecture" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 hover:border-neutral-950">
                  Engine architecture
                </Link>
                <Link href="/palettes" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 hover:border-neutral-950">
                  Browse 8 palettes
                </Link>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/styleseed-architecture.svg" alt="StyleSeed engine architecture" className="w-full rounded-2xl border border-neutral-200 bg-white" />
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-700">Latest v4 revision</div>
              <h2 className="mt-2 text-[clamp(28px,4vw,42px)] font-bold leading-tight tracking-tight">
                The method can learn.<br />Updates stay exact.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
                A caller-attested accepted correction can now become a privacy-minimized local candidate.
                Separately, every maintained engine payload carries an exact revision hash, so a
                same-version rule or skill fix is still detectable without overwriting project code.
              </p>
            </div>

            <div className="mt-9 grid gap-4 lg:grid-cols-3">
              <article className="border border-neutral-200 bg-[#F4F6F3] p-6">
                <div className="font-mono text-[11px] font-bold text-teal-700">Optional extension</div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">Caller-attested local learning</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
                  Not included in the core install. Capture only on request, review separately, block known high-risk identity
                  patterns, and keep the result local. This is a guardrail, not an anonymization
                  guarantee; review the exact package before exposure.
                </p>
                <Link href="/learn" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-teal-800 hover:underline">
                  See the privacy boundary <ArrowRight size={14} />
                </Link>
              </article>
              <article className="border border-neutral-200 bg-neutral-950 p-6 text-white">
                <div className="font-mono text-[11px] font-bold text-teal-300">engineRevision</div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">Same version, exact payload</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-400">
                  <code className="text-neutral-200">$ss-update</code> compares the installed,
                  project-recorded, and published revision before refresh and re-resolution.
                </p>
                <Link href="/architecture" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-teal-300 hover:underline">
                  Read the update architecture <ArrowRight size={14} />
                </Link>
              </article>
              <article className="border border-neutral-200 bg-[#F5F8F7] p-6">
                <div className="font-mono text-[11px] font-bold text-teal-700">Codex package</div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">23 core skills, no learning payload</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
                  The repository includes a repository development Codex package boundary. The
                  implemented default/core install contains neither ss-learn nor a learning MCP. Public installation
                  remains <code>npx skills add bitjaru/styleseed</code> until a plugin-directory
                  release is independently verified.
                </p>
                <Link href="/codex-ui-design" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-teal-700 hover:underline">
                  Open the Codex guide <ArrowRight size={14} />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* Install first; the long orchestration prompt is an advanced disclosure in the hero. */}
        <section id="get-started" className="scroll-mt-20 border-t border-neutral-200 bg-neutral-900 text-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Get started</div>
                <h2 className="mt-2 text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
                  Install once. Keep the method in the repo.
                </h2>
                <p className="mt-2 max-w-xl text-[15px] text-neutral-400">
                  The core install gives your agent the resolver, builder, score, and visual gate.
                  Approved choices persist in project files instead of disappearing with the chat.
                </p>
              </div>
              <a
                href="https://github.com/bitjaru/styleseed#get-started"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-[14px] font-bold text-white hover:bg-white/10"
              >
                Full setup guide <ArrowRight size={14} />
              </a>
            </div>

            <div className="mt-8 max-w-xl">
              <InstallCommand tone="dark" />
            </div>

            <div className="mt-8 max-w-3xl border-t border-white/10 pt-7">
              <div className="text-[12px] font-bold uppercase tracking-widest text-teal-300">What the install changes</div>
              <h3 className="mt-2 text-[17px] font-bold">A repeatable loop, not a one-off style prompt</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-400">
                When invoked, StyleSeed resolves only the rules selected for the artifact, builds
                against that bundle, records the code and rendered checks that actually ran, and
                preserves the approved lock for later updates. The core package contains 23 skills;
                optional local-learning tools are distributed separately.
              </p>
              <div className="mt-4 space-y-1.5">
                <code className="block rounded-lg bg-black/40 px-3 py-2 font-mono text-[13px]"><span className="text-neutral-400"># Claude Code: </span><span className="text-teal-300">/ss-resolve → /ss-build</span><span className="text-neutral-500"> · </span><span className="text-neutral-400">Codex: </span><span className="text-teal-300">$ss-resolve → $ss-build</span></code>
              </div>
            </div>
          </div>
        </section>

        {/* Restyle gallery — aesthetic profiles, separate from functional output grammars */}
        <section className="border-t border-neutral-900 bg-neutral-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
              One engine, many looks
            </div>
            <h2 className="mt-2 max-w-3xl text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight">
              Same product. Six aesthetic profiles. One <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-teal-200">ss-restyle</code> away.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-400">
              Profiles coordinate radius, density, color, weight, motion, type, and one signature
              move. The selected output grammar still owns the product job and composition — a
              technical profile cannot turn a shop into an observability console. Distinctive isn&rsquo;t a coat of paint. Each profile is a coherent coordinate across the
              dial axes — radius, density, color, weight, motion, plus a font and a signature move —
              so every look reads <em>designed</em>, never generic. Trend gimmicks (glass, neumorphism)
              are deliberately left out.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/style-gallery.png"
              alt="The same Relay product rendered in six StyleSeed presets — swiss, editorial, technical, warm-dtc, minimal-mono, brutalist-lite. Each is coherent and distinct, none looks generic."
              width={2416}
              height={1422}
              className="mt-8 w-full rounded-2xl border border-white/10"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {["swiss", "editorial", "technical", "warm-dtc", "minimal-mono", "brutalist-lite"].map((p) => (
                <code key={p} className="rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-[13px] text-neutral-300 ring-1 ring-white/10">
                  /ss-restyle {p} · $ss-restyle {p}
                </code>
              ))}
            </div>
          </div>
        </section>

        {/* How it thinks — the differentiator, before the gallery */}
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Why it works
            </div>
            <h2 className="mt-2 max-w-2xl text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight text-neutral-900">
              Other repos give your AI components. We give it the reasoning.
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600">
              Every decision in a StyleSeed UI has a stated reason — the rule it follows and why that
              rule makes the result look designed. That&rsquo;s what an AI can actually read, apply,
              and repeat. Walk a real screen, decision by decision.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rules-blueprint.svg"
              alt="A StyleSeed UI annotated with the design rule behind each decision — deliberate hierarchy, stable color roles, coherent geometry, accessible signals, and real states."
              width={1200}
              height={680}
              className="mt-8 w-full rounded-2xl border border-neutral-200 bg-white"
            />
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { k: "The decision", v: "Balance 48px, unit 24px" },
                { k: "The rule", v: "Rule 4 · Numbers 2:1 with units" },
                { k: "Why it works", v: "The eye locks onto magnitude first; equal sizes flatten it into noise." },
              ].map((c, i) => (
                <div key={c.k} className="rounded-2xl bg-neutral-50 p-5" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)" }}>
                  <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: i === 2 ? "#0F766E" : "#6B7280" }}>{c.k}</div>
                  <div className="mt-1.5 text-[14px] font-semibold leading-snug text-neutral-800">{c.v}</div>
                </div>
              ))}
            </div>
            <Link
              href="/how-it-thinks"
              className="mt-7 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-[14px] font-bold text-white hover:bg-black"
            >
              See how it thinks — the full walkthrough
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* vs other design-AI skills — the category differentiator */}
        <section className="border-t border-neutral-200 bg-neutral-900 text-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Vs other design-AI skills
            </div>
            <h2 className="mt-2 max-w-3xl text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight">
              Other design skills make your UI <span className="text-neutral-500">coherent.</span>
              <br />
              StyleSeed also fights the{" "}
              <span className="text-teal-300">generic-AI look</span> — and enforces it.
            </h2>
            <div className="mt-9 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/15">
                    <th scope="col" className="w-[28%] pb-3 pr-4">
                      <span className="sr-only">Capability</span>
                    </th>
                    <th scope="col" className="pb-3 pr-4 text-[14px] font-bold text-neutral-400">
                      Component kits
                    </th>
                    <th scope="col" className="pb-3 pr-4 text-[14px] font-bold text-neutral-400">
                      DESIGN.md packs
                    </th>
                    <th scope="col" className="pb-3 text-[14px] font-bold text-white">
                      StyleSeed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-white/10">
                      <th scope="row" className="py-3.5 pr-4 text-[15px] font-semibold text-neutral-200">
                        {row.label}
                      </th>
                      <td className="py-3.5 pr-4"><CompareCell value={row.kits} /></td>
                      <td className="py-3.5 pr-4"><CompareCell value={row.packs} /></td>
                      <td className="py-3.5"><CompareCell value={row.styleseed} self /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* the question every Claude Code user now asks */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                &ldquo;Why not just use the official frontend-design skill?&rdquo;
              </div>
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-neutral-300">
                Use both. Anthropic&rsquo;s official{" "}
                <code className="rounded bg-white/10 px-1 font-mono text-[13px]">frontend-design</code>{" "}
                skill scaffolds a clean screen fast — it&rsquo;s a great starting point. StyleSeed is the
                layer <span className="font-semibold text-white">on top</span>: it names and bans the
                generic-AI tells, scores every screen to a{" "}
                <span className="font-semibold text-white">≥80 gate</span> and fixes it before you see it,
                and locks your design decisions so they don&rsquo;t drift across prompts. The official
                skill is strong at visual direction; StyleSeed carries that judgment across screens,
                sessions, reference sets, and verification.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <Link
                  href="/claude-code-ui-design"
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-300 hover:underline"
                >
                  Read the Claude Code UI design workflow <ArrowRight size={13} />
                </Link>
                <Link
                  href="/codex-ui-design"
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-300 hover:underline"
                >
                  Read the Codex UI design workflow <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <article className="mt-4 border border-white/10 bg-white/[0.03] p-6">
              <div className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                Named peer · observed {competitorSource.observedAt}
              </div>
              <h3 className="mt-2 text-[18px] font-bold tracking-tight text-white">
                {competitorSource.impeccable.name} is a serious execution-layer reference.
              </h3>
              <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-300">
                {competitorSource.impeccable.capabilitySummary}
              </p>
              <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-neutral-400">
                {competitorSource.styleseedFocus} This is a capability-specific snapshot, not an
                overall ranking.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold">
                <a href={competitorSource.impeccable.repositoryUrl} target="_blank" rel="noreferrer" className="text-teal-300 hover:underline">
                  Repository ↗
                </a>
                <a href={competitorSource.impeccable.cliSourceUrl} target="_blank" rel="noreferrer" className="text-teal-300 hover:underline">
                  CLI evidence ↗
                </a>
                <a href={competitorSource.impeccable.hooksSourceUrl} target="_blank" rel="noreferrer" className="text-teal-300 hover:underline">
                  Hook evidence ↗
                </a>
              </div>
            </article>
            <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-neutral-400">
              Also in the box: 7 brand skins from one <code className="rounded bg-white/10 px-1 font-mono text-[13px]">data-skin</code>{" "}
              attribute, 5 motion seeds plus 20+ keyword moves, and a drop-in{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-[13px]">engine/</code> — no build step, no lock-in.
              The rules are open: propose new ones via PR.{" "}
              <Link href="/why" className="font-semibold text-teal-300 underline underline-offset-2">
                See the before/after →
              </Link>
            </p>
          </div>
        </section>

        {/* Showcase preview */}
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                  Showcase
                </div>
                <h2 className="mt-2 max-w-xl text-[36px] font-bold leading-tight tracking-tight text-neutral-900">
                  {entries.length} examples · 8 grammars · 5 surfaces.
                </h2>
                <p className="mt-3 max-w-md text-[15px] text-neutral-600">
                  Not static templates — each one is the engine&rsquo;s output, re-skinning across 7
                  brand DNAs and {seedCount} motion seeds live in the browser. Copy the source, rules
                  and all.
                </p>
                <p className="mt-2 max-w-md text-[13px] text-neutral-600">
                  Skins are <em>inspired-by</em> token sets — brand-flavored color/radius/shadow/motion
                  values, not recreations of those companies&rsquo; design languages. Restructuring the
                  actual design is the presets&rsquo; job (<code className="rounded bg-neutral-100 px-1 font-mono text-[12px]">/ss-restyle</code>).
                </p>
              </div>
              <Link
                href="/showcase"
                className="inline-flex items-center gap-1 text-[14px] font-bold text-neutral-900 hover:underline"
              >
                View all {entries.length} →
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {heroEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/showcase/${entry.id}`}
                  className="group block overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                    <Image
                      src={`/showcase-hero/${entry.id}.png`}
                      alt={`${entry.name} — ${entry.primarySkin} skin with ${entry.primarySeed} motion`}
                      width={1440}
                      height={900}
                      className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-bold tracking-tight text-neutral-900">
                        {entry.name}
                      </h3>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-600">
                        {entry.category}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[14px] text-neutral-600">
                      {entry.blurb}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Motion seeds */}
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-center">
              <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                Motion system
              </div>
              <h2 className="mt-2 text-[36px] font-bold leading-tight tracking-tight text-neutral-900">
                Vibe words for personality. Keywords for flair.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] text-neutral-600">
                {seedCount} named seeds (each with five spreadable recipes) <em>plus</em> a library of
                20+ scroll-stopping keyword moves — <code className="rounded bg-neutral-100 px-1 text-[13px]">tilt-3d</code>,{" "}
                <code className="rounded bg-neutral-100 px-1 text-[13px]">magnetic</code>,{" "}
                <code className="rounded bg-neutral-100 px-1 text-[13px]">glow-pulse</code>. Try them
                live below, or{" "}
                <Link href="/motion" className="font-semibold text-teal-700 underline underline-offset-2">
                  browse the full gallery
                </Link>
                .
              </p>
            </div>

            <div className="mt-12">
              <SeedDemo />
            </div>
          </div>
        </section>

        {/* Field notes — the writing behind the rules */}
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Field notes
            </div>
            <h2 className="mt-2 text-[clamp(22px,3vw,28px)] font-bold tracking-tight text-neutral-900">
              The thinking behind the rules
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  href: "https://dev.to/kiwibreaksme/why-ai-generated-uis-look-off-and-the-one-principle-that-fixes-it-4j20",
                  tag: "The principle",
                  title: "Why AI-generated UIs look \u2018off\u2019 \u2014 and the one principle that fixes it",
                  sub: "Coherence: one value per axis \u00b7 \ud55c\uad6d\uc5b4\ud310 3.5k+ reads",
                },
                {
                  href: "https://dev.to/kiwibreaksme/i-catalogued-every-tell-that-makes-a-ui-look-ai-generated-my-own-tool-kept-failing-the-test-n52",
                  tag: "The tells",
                  title: "I catalogued every tell that makes a UI look AI-generated",
                  sub: "The taxonomy \u2014 and my own tool failing the test",
                },
                {
                  href: "https://dev.to/kiwibreaksme/aiga-mandeun-ui-boyeojugi-jeone-caejeomsikyeora-geiteureul-mandeulgo-nae-raendingbuteo-ddeoleojin-iyagi-ea7",
                  tag: "The gate \u00b7 \ud55c\uad6d\uc5b4",
                  title: "AI\uac00 \ub9cc\ub4e0 UI, \ubcf4\uc5ec\uc8fc\uae30 \uc804\uc5d0 \ucc44\uc810\uc2dc\ucf1c\ub77c",
                  sub: "\ub8f0\ub9cc\uc73c\ub860 \ubd80\uc871\ud588\ub358 \uc774\uc720, 58\u219286 \ucc44\uc810\ud45c",
                },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="text-[11px] font-bold uppercase tracking-widest text-teal-700">
                    {a.tag}
                  </div>
                  <h3 className="mt-2 text-[15px] font-bold leading-snug text-neutral-900 group-hover:underline">
                    {a.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-neutral-600">{a.sub}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <WhatsNew />

        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <h2 className="text-[44px] font-bold leading-tight tracking-tight text-neutral-900">
              Stop redrawing. Start shipping.
            </h2>
            <div className="mx-auto mt-8 max-w-2xl">
              <InstallCommand />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/bitjaru/styleseed"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-colors hover:border-neutral-900"
              >
                <GithubIcon size={15} />
                Star on GitHub
                <GithubStarCount className="font-semibold text-neutral-500" />
              </a>
            </div>
            <p className="mx-auto mt-5 max-w-md text-[15px] text-neutral-600">
              One command to make the method available to every future project prompt.
            </p>
            <p className="mt-6 text-[14px] text-neutral-500">
              MIT licensed · no telemetry ·{" "}
              <Link href="/showcase" className="font-semibold text-teal-700 underline underline-offset-2">
                browse the showcase
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-900 text-neutral-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[14px] font-bold text-neutral-900">
                S
              </div>
              <span className="text-[15px] font-bold tracking-tight text-white">StyleSeed</span>
            </div>
            <p className="mt-2 max-w-sm text-[14px] text-neutral-400">
              Design engine for vibe coding. MIT licensed. Made by{" "}
              <a
                href="https://github.com/bitjaru"
                className="font-semibold text-neutral-200 hover:text-white"
              >
                bitjaru
              </a>{" "}
              in Seoul.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold">
            <Link href="/why" className="text-neutral-300 hover:text-white">
              Why StyleSeed
            </Link>
            <Link href="/showcase" className="text-neutral-300 hover:text-white">
              Showcase
            </Link>
            <Link href="/motion" className="text-neutral-300 hover:text-white">
              Motion
            </Link>
            <Link href="/interactions" className="text-neutral-300 hover:text-white">
              Interaction gallery
            </Link>
            <Link href="/learn" className="text-neutral-300 hover:text-white">
              Private learning
            </Link>
            <Link href="/gallery" className="text-neutral-300 hover:text-white">
              Component gallery
            </Link>
            <Link href="/pricing" className="text-neutral-300 hover:text-white">
              Pricing demo
            </Link>
            <a
              href="https://dev.to/kiwibreaksme"
              className="text-neutral-300 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              Field notes
            </a>
            <a
              href="https://github.com/bitjaru/styleseed"
              className="text-neutral-300 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://github.com/bitjaru/styleseed/blob/main/LICENSE"
              className="text-neutral-300 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              MIT License
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
