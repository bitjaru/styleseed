import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./showcase/examples";
import { listShowcase } from "@/lib/showcase";
import palette from "@/content/site-docs-palette.json";
import { Hero } from "./_home/hero";
import { DriftReport } from "./_home/drift-report";
import { RulesInScope } from "./_home/rules-in-scope";
import { ShowcaseRibbon } from "./_home/showcase-ribbon";
import { InstallCommand, PromptBox } from "./_home/prompt-box";
import { GithubIcon } from "./_home/github-icon";
import { GithubStarCount } from "./_home/github-star-count";
import styles from "./_home/home.module.css";

// The same JSON → scoped CSS-variable pattern used by /try and /evaluate.
const theme = {
  ...Object.fromEntries(Object.entries(palette.roles).map(([key, value]) => [`--home-${key}`, value])),
  "--home-primaryHover": palette.ramps.primary["700"],
} as CSSProperties;
const FOOTER_GROUPS = [
  { title: "Explore", links: [
    ["Why StyleSeed", "/why"], ["Showcase", "/showcase"], ["Studio", "/studio"],
    ["Motion", "/motion"], ["Interactions", "/interactions"], ["Components", "/components"],
    ["Component gallery", "/gallery"], ["Pricing demo", "/pricing"], ["Palettes", "/palettes"],
  ] },
  { title: "Understand", links: [
    ["Architecture", "/architecture"], ["How it thinks", "/how-it-thinks"],
    ["FAQ", "/faq"], ["Private learning", "/learn"], ["Verify", "/evaluate"],
    ["Scorecard", "/scorecard"], ["Benchmark", "/gate"], ["Field notes", "https://dev.to/kiwibreaksme"],
  ] },
  { title: "Use StyleSeed", links: [
    ["Get started", "#get-started"], ["Codex workflow", "/codex-ui-design"],
    ["Claude Code workflow", "/claude-code-ui-design"], ["Upgrade", "/upgrade"],
    ["GitHub", "https://github.com/bitjaru/styleseed"],
    ["MIT License", "https://github.com/bitjaru/styleseed/blob/main/LICENSE"],
  ] },
];

export default function HomePage() {
  const entries = listShowcase();

  return (
    <div className={styles.page} style={theme} data-styleseed-recipe="expressive-brand">
      <a href="#main" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="StyleSeed home">
            <span className={styles.mark} aria-hidden="true">S</span> StyleSeed
          </Link>
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#get-started">Get started</a>
            <a href="#why">Why</a>
            <Link href="/showcase">Showcase</Link>
            <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer">
              GitHub <GithubStarCount className={styles.stars} />
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <Hero />

        <section id="drift-report" className={`${styles.container} ${styles.driftSection}`} aria-labelledby="drift-title">
          <div className={styles.sectionHeading}>
            <h2 id="drift-title">See what drifted between screens.</h2>
          </div>
          <DriftReport />
        </section>

        <section className={styles.section} aria-labelledby="rules-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <h2 id="rules-title">The rules for this screen.<br />With a fail state for each invariant.</h2>
              <p>Each task gets a compiled bundle with rule IDs and priorities. A <code>blocks</code> failure stands regardless of the score.</p>
            </div>
            <RulesInScope />
          </div>
        </section>

        <section className={`${styles.section} ${styles.surfaceSection}`} aria-labelledby="comparison-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <h2 id="comparison-title">Same prompt. Only the rules changed.</h2>
            </div>
            <figure className={styles.comparison}>
              <Image
                src="/v26-compare.png"
                alt="Side-by-side product pages: agent defaults with indigo accents and gradient headings on the left; the StyleSeed version with a consistent accent, a product preview, and one focal point on the right."
                width={1516}
                height={1008}
                sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1248px) calc(100vw - 64px), 1200px"
                className={styles.comparisonImage}
              />
              <figcaption className={styles.receipts}>
                <p>This page first scored 58/100 on our own gate. The recorded revision reached 86/100. <Link href="/scorecard">58 → 86: see the scorecard <ArrowRight size={14} aria-hidden="true" /></Link></p>
                <p>A 5.3-point improvement in BENCH-V1 for both Codex and Claude Code. <Link href="/gate">Read the benchmark <ArrowRight size={14} aria-hidden="true" /></Link></p>
                <p className={styles.muted}>These are historical results. A score is not design approval.</p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="why" className={styles.section} aria-labelledby="why-title">
          <div className={`${styles.container} ${styles.reading}`}>
            <h2 id="why-title">A design decision should outlast a chat.</h2>
            <p className={styles.whyCopy}>
              Why not just use the official <code>frontend-design</code> skill? Use both.
              It helps establish visual direction; StyleSeed records your choices in the repo,
              compiles the rules for each task, and checks the result across screens and sessions.
              It does not replace a designer. People still decide which differences are intentional.
            </p>
            <div className={styles.linkRow}>
              <Link href="/why#workflow-fit" className={styles.textLink}>Why it fits your workflow <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/claude-code-ui-design" className={styles.textLink}>Claude Code <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/codex-ui-design" className={styles.textLink}>Codex <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="showcase-title">
          <div className={styles.container}>
            <div className={styles.showcaseHeading}>
              <div>
                <h2 id="showcase-title">Shared judgment. Different products.</h2>
              </div>
              <Link href="/showcase" className={styles.textLink}>Explore {entries.length} examples <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <ShowcaseRibbon>
            {[false, true].map((duplicate) => (
              <ul key={String(duplicate)} className={styles.ribbonGroup} aria-hidden={duplicate || undefined}>
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/showcase/${entry.id}`} className={styles.showcaseItem} tabIndex={duplicate ? -1 : undefined}>
                      <span className={styles.showcaseFrame}>
                        <Image
                          src={`/showcase-hero/${entry.id}.png`}
                          alt={`${entry.name}: ${entry.job}`}
                          width={1440}
                          height={900}
                          sizes="(max-width: 720px) 280px, 320px"
                          className={styles.showcaseImage}
                        />
                      </span>
                      <span className={styles.showcaseLabel}>{entry.name} <ArrowRight size={16} aria-hidden="true" /></span>
                      <span className={styles.showcaseCategory}>{entry.category}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </ShowcaseRibbon>
        </section>

        <section id="get-started" className={`${styles.section} ${styles.startSection}`} aria-labelledby="start-title">
          <div className={`${styles.container} ${styles.startInner}`}>
            <h2 id="start-title">Put your design decisions in the repo.</h2>
            <div className={styles.startInstall}><InstallCommand variant="terminal" /></div>
            <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer" className={styles.textLink}>
              <GithubIcon size={16} /> Explore the source on GitHub <ArrowRight size={16} aria-hidden="true" />
            </a>
            <details className={`${styles.disclosure} ${styles.advanced}`}>
              <summary>Advanced: the full one-paste workflow</summary>
              <PromptBox variant="terminal" />
            </details>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p className={styles.footerCredit}>
            Open source and MIT licensed, made by <a href="https://github.com/bitjaru">bitjaru</a> in Seoul.
          </p>
          <nav className={styles.footerNav} aria-label="All pages">
            <ul>{FOOTER_GROUPS.flatMap((group) => group.links.map(([label, href], index) => (
              <li key={href} data-group-start={index === 0 || undefined}>{href.startsWith("https:")
                ? <a href={href} target="_blank" rel="noreferrer">{label}</a>
                : <Link href={href}>{label}</Link>}
              </li>
            )))}</ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
