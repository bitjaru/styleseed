import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import palette from "@/content/site-docs-palette.json";
import versionInfo from "../../public/version.json";

const BASE = "https://styleseed-demo.vercel.app";
const REPOSITORY = "https://github.com/bitjaru/styleseed";
const RELEASE = `${REPOSITORY}/releases/tag/v${versionInfo.version}`;
const DESCRIPTION =
  "A reproducible three-minute StyleSeed evaluator path: clean project-local install, 23-skill discovery, release integrity, source gates, Windows evidence, and explicit claim boundaries.";

const paletteStyle = {
  "--ss-page": palette.roles.background,
  "--ss-surface": palette.roles.surface,
  "--ss-ink": palette.roles.foreground,
  "--ss-muted": palette.roles.mutedForeground,
  "--ss-line": palette.roles.border,
  "--ss-action": palette.roles.primary,
  "--ss-action-ink": palette.roles.primaryForeground,
} as CSSProperties;

const INSTALL = [
  "mkdir styleseed-evaluation && cd styleseed-evaluation",
  "git init",
  "npx skills add bitjaru/styleseed --agent codex --yes --copy",
  "npx skills list --json --agent codex",
];

const EXPECTED = [
  "23 project-local core skills",
  "styleseed router in .agents/skills",
  "No ss-learn or learning MCP in the core install",
  "A fresh Codex process can discover $styleseed",
];

const EVIDENCE = [
  {
    label: "01 · Release",
    title: `Inspect v${versionInfo.version} as an immutable artifact`,
    body: "The release publishes the core archive, inventory, manifest, checksums, source revision, and the exact benchmark boundary used for this version.",
    href: RELEASE,
    action: "Open release assets",
  },
  {
    label: "02 · Automation",
    title: "Read the checks that protect main",
    body: "Engine contracts, runtime behavior, public claims, generated-file drift, markdown paths, plugin boundaries, palettes, and the production site build run in CI.",
    href: `${REPOSITORY}/actions/workflows/validate-engine.yml`,
    action: "Inspect GitHub Actions",
  },
  {
    label: "03 · Windows",
    title: "Reproduce the PowerShell path",
    body: "The Windows guide records the tested environment, npx.cmd fallback, expected 23-skill layout, and the distinction between the core installer and optional repository extensions.",
    href: `${REPOSITORY}/blob/main/docs/WINDOWS-INSTALL.md`,
    action: "Open Windows evidence",
  },
  {
    label: "04 · Benchmark",
    title: "Separate historical evidence from new claims",
    body: "BENCH-V1 exposes its 120-cell result and raw evidence. Version 4.1 adds no new performance or superiority claim; the release records that waiver explicitly.",
    href: `${BASE}/gate`,
    action: "Read BENCH-V1",
  },
];

export const metadata: Metadata = {
  title: "Verify StyleSeed in three minutes",
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/evaluate` },
  openGraph: {
    type: "article",
    url: `${BASE}/evaluate`,
    title: "Verify StyleSeed in three minutes",
    description: DESCRIPTION,
    siteName: "StyleSeed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify StyleSeed in three minutes",
    description: DESCRIPTION,
  },
};

export default function EvaluatePage() {
  const shortRevision = versionInfo.revision.replace("sha256:", "").slice(0, 12);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${BASE}/evaluate#article`,
    url: `${BASE}/evaluate`,
    headline: "Verify StyleSeed in three minutes",
    description: DESCRIPTION,
    datePublished: versionInfo.siteUpdated,
    dateModified: versionInfo.siteUpdated,
    author: { "@id": `${BASE}/#organization` },
    publisher: { "@id": `${BASE}/#organization` },
    isPartOf: { "@id": `${BASE}/#website` },
    about: [
      "Codex skill installation",
      "Windows PowerShell verification",
      "open-source release integrity",
      "reproducible software evidence",
    ],
  };

  return (
    <main
      data-styleseed-recipe="editorial-authority"
      style={paletteStyle}
      className="min-h-screen bg-[var(--ss-page)] text-[var(--ss-ink)]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="border-b border-[var(--ss-line)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-action)]"
          >
            <ArrowLeft size={15} /> StyleSeed
          </Link>
          <a
            href={RELEASE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ss-muted)] hover:text-[var(--ss-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-action)]"
          >
            v{versionInfo.version} release <ArrowUpRight size={14} />
          </a>
        </div>
      </header>

      <section className="border-b border-[var(--ss-line)]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--ss-action)]">
            Evaluator path · public install
          </p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h1 className="max-w-[12ch] text-[clamp(44px,7vw,78px)] font-black leading-[0.96] tracking-[-0.055em]">
                Install it. Inspect it. Rebuild it.
              </h1>
              <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--ss-muted)] sm:text-[18px]">
                This path tests the public install command before trusting the README, then points to
                the immutable artifacts and source gates behind each public claim. No private
                credential, hosted service, or optional learning extension is required.
              </p>
            </div>

            <dl className="border-y border-[var(--ss-line)]">
              {[
                ["Version", versionInfo.version],
                ["Core skills", String(versionInfo.skills)],
                ["Engine revision", `${shortRevision}…`],
                ["Maintained files", String(versionInfo.revisionFiles)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-6 border-b border-[var(--ss-line)] py-3 last:border-b-0">
                  <dt className="text-sm text-[var(--ss-muted)]">{label}</dt>
                  <dd className="font-mono text-sm font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto grid min-w-0 max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--ss-action)]">
            01 · Clean install
          </p>
          <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-black leading-tight tracking-[-0.04em]">
            Start in a disposable repository.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--ss-muted)]">
            Use Node.js 22, Git, and network access. Starting from an empty Git repository prevents
            an existing global skill or cached project setup from masking a packaging bug.
          </p>

          <div className="mt-8 max-w-full overflow-x-auto bg-[var(--ss-ink)] p-5 text-[var(--ss-action-ink)] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-6 border-b border-white/15 pb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-white/60">
                macOS · Linux · PowerShell: use npx.cmd
              </span>
              <span className="font-mono text-xs text-white/50">~3 min</span>
            </div>
            <pre className="w-max min-w-full whitespace-pre font-mono text-[13px] leading-7 sm:text-sm">
              <code>{INSTALL.map((line) => `$ ${line}`).join("\n")}</code>
            </pre>
          </div>
        </div>

        <aside className="border-t border-[var(--ss-line)] lg:mt-24">
          <p className="py-4 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ss-muted)]">
            Expected result
          </p>
          <ul className="divide-y divide-[var(--ss-line)] border-y border-[var(--ss-line)]">
            {EXPECTED.map((item) => (
              <li key={item} className="flex gap-3 py-4 text-sm font-semibold leading-relaxed">
                <Check aria-hidden size={17} className="mt-0.5 shrink-0 text-[var(--ss-action)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-[var(--ss-muted)]">
            Start a fresh agent process after installation. In Codex, invoke{" "}
            <code className="font-mono font-bold text-[var(--ss-ink)]">$styleseed</code> or open
            the Skills picker. Discovery in the same pre-install process is not sufficient evidence.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ss-muted)]">
            The GitHub shortcut resolves public repository state at install time. Treat the
            separately published release assets as the immutable evidence boundary.
          </p>
        </aside>
      </section>

      <section className="border-y border-[var(--ss-line)] bg-[var(--ss-surface)]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--ss-action)]">
              02 · Follow the receipts
            </p>
            <h2 className="mt-3 text-[clamp(30px,4vw,46px)] font-black leading-tight tracking-[-0.04em]">
              Every claim should end at inspectable evidence.
            </h2>
          </div>

          <div className="mt-10 border-t border-[var(--ss-line)]">
            {EVIDENCE.map((item) => (
              <article key={item.label} className="grid gap-4 border-b border-[var(--ss-line)] py-7 md:grid-cols-[0.7fr_1.3fr_auto] md:items-start md:gap-8">
                <p className="font-mono text-xs font-bold text-[var(--ss-action)]">{item.label}</p>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.025em]">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ss-muted)]">{item.body}</p>
                </div>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-[var(--ss-action)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-action)]"
                >
                  {item.action} <ArrowUpRight size={14} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--ss-action)]">
              03 · Source verification
            </p>
            <h2 className="mt-3 text-[clamp(30px,4vw,44px)] font-black leading-tight tracking-[-0.04em]">
              Rebuild the repository, not the story.
            </h2>
          </div>
          <div>
            <p className="text-base leading-relaxed text-[var(--ss-muted)]">
              The full source path regenerates catalogs, runs the runtime and public-claim tests,
              validates the engine, checks links, and builds the production Next.js site. The
              exact command list lives in the evaluator guide so it can evolve with CI.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`${REPOSITORY}/blob/main/docs/EVALUATOR-QUICKSTART.md`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 bg-[var(--ss-action)] px-5 py-3 text-sm font-bold text-[var(--ss-action-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-action)]"
              >
                Run the full evaluator guide <ArrowRight size={14} />
              </a>
              <a
                href={`${REPOSITORY}/blob/main/THIRD_PARTY.md`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 border border-[var(--ss-line)] px-5 py-3 text-sm font-bold hover:bg-[var(--ss-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-action)]"
              >
                Review SBOM and licenses <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="mt-6 border-l-2 border-[var(--ss-action)] pl-4 text-sm leading-relaxed text-[var(--ss-muted)]">
              Evidence boundary: a green local run is not a GitHub Actions run, an Actions run is
              not a production deployment, and BENCH-V1 is historical benchmark evidence rather
              than a new v4.1 performance claim.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
