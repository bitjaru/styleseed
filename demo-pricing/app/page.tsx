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
import { PromptBox } from "./_home/prompt-box";
import { StartInstall } from "./_home/start-install";
import { GithubIcon } from "./_home/github-icon";
import { GithubStarCount } from "./_home/github-star-count";
import styles from "./_home/home.module.css";
import "./_home/tokens.css";
import "./_home/base.css";

// The same JSON → scoped CSS-variable pattern used by /try and /evaluate.
const theme = {
  ...Object.fromEntries(Object.entries(palette.roles).map(([key, value]) => [`--home-${key}`, value])),
  "--home-primaryHover": palette.ramps.primary["700"],
  "--home-field": palette.ramps.primary["900"],
  "--home-fieldDeep": palette.ramps.primary["950"],
  "--home-fieldInk": palette.ramps.primary["50"],
  "--home-fieldMuted": palette.ramps.primary["200"],
  "--home-mint": palette.ramps.primary["100"],
  "--home-lilac": palette.ramps.accent["100"],
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
    <div className={styles.page} style={theme} data-styleseed-home data-styleseed-recipe="expressive-brand">
      <a href="#main" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="StyleSeed home">
            <span className={styles.mark} aria-hidden="true">S</span><span className={styles.brandName}>StyleSeed</span>
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

      <main id="main" className={styles.main}>
        <Hero />

        <section id="drift-report" className={`${styles.wideContainer} ${styles.section}`} aria-labelledby="drift-title">
          <div className={styles.sectionHeading}>
            <h2 id="drift-title">See what drifted between screens.</h2>
          </div>
          <DriftReport />
        </section>

        <section id="rules" className={`${styles.section} ${styles.rulesSection}`} aria-labelledby="rules-title">
          <div className={`${styles.container} ${styles.rulesLayout}`}>
            <div className={styles.sectionHeading}>
              <h2 id="rules-title">Every rule has an ID.<br /> Every invariant has a fail state.</h2>
            </div>
            <RulesInScope />
          </div>
        </section>

        <section id="comparison" className={styles.section} aria-labelledby="comparison-title">
          <div className={styles.wideContainer}>
            <div className={`${styles.sectionHeading} ${styles.comparisonHeading}`}>
              <h2 id="comparison-title">Same prompt. Only the rules changed.</h2>
            </div>
            <figure className={styles.comparison} data-kind="product">
              <Image
                src="/v26-compare.png"
                alt="Side-by-side product pages: agent defaults with indigo accents and gradient headings on the left; the StyleSeed version with a consistent accent, a product preview, and one focal point on the right."
                width={1516}
                height={1008}
                sizes="(max-width: 720px) calc(100vw - 32px), (max-width: 1164px) calc(100vw - 64px), 1100px"
                className={styles.comparisonImage}
              />
              <figcaption className={styles.receipts}>
                <p><Link href="/scorecard">58 → 86 on our own gate <ArrowRight size={14} aria-hidden="true" /></Link><Link href="/gate">5.3 points in BENCH-V1 for Codex and Claude Code <ArrowRight size={14} aria-hidden="true" /></Link></p>
                <p className={styles.historical}>These are historical results. A score is not design approval.</p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="why" className={styles.section} aria-labelledby="why-title">
          <div className={`${styles.container} ${styles.reading}`}>
            <h2 id="why-title">A design decision should outlast a chat.</h2>
            <div className={styles.whyBody}>
            <p className={styles.whyCopy}>Use both: the official <code>frontend-design</code> skill helps establish visual direction; StyleSeed records your choices in the repo, compiles the rules for each task, and checks the result across screens and sessions.</p>
            <details className={styles.disclosure}>
            <summary>How the two fit together</summary>
            <p className={styles.whyCopy}>
              Why not just use the official <code>frontend-design</code> skill? Use both.
              It helps establish visual direction; StyleSeed records your choices in the repo,
              compiles the rules for each task, and checks the result across screens and sessions.
              It does not replace a designer. People still decide which differences are intentional.
            </p>
            </details>
            <div className={styles.linkRow}>
              <Link href="/why#workflow-fit" className={styles.chipLink}>Why it fits your workflow <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/claude-code-ui-design" className={styles.chipLink}>Claude Code <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/codex-ui-design" className={styles.chipLink}>Codex <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            </div>
          </div>
        </section>

        <section id="get-started" className={`${styles.section} ${styles.startSection}`} aria-labelledby="start-title">
          <div className={styles.startCard}>
            <h2 id="start-title">Put your design decisions in the repo.</h2>
            <p className={styles.startLead}>Install once. Keep your choices in the project.</p>
            <StartInstall />
            <a href="https://github.com/bitjaru/styleseed" target="_blank" rel="noreferrer" className={styles.sourceLink}>
              <GithubIcon size={16} /> Explore the source on GitHub <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <details className={`${styles.disclosure} ${styles.advanced}`}>
            <summary>Advanced: the full one-paste workflow</summary>
            <PromptBox variant="terminal" />
          </details>
        </section>

        <section id="showcase" className={styles.section} aria-labelledby="showcase-title">
          <div className={`${styles.container} ${styles.showcaseHeading}`}>
            <h2 id="showcase-title">Shared judgment. Different products.</h2>
            <Link href="/showcase" className={styles.textLink}>Explore {entries.length} examples <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <ShowcaseRibbon count={entries.length}>
            {[false, true].map((duplicate) => (
              <ul key={String(duplicate)} className={styles.ribbonGroup} aria-hidden={duplicate || undefined}
                style={{ "--fan-copy": duplicate ? 1 : 0 } as CSSProperties}>
                {entries.map((entry, index) => (
                  <li key={entry.id} style={{ "--i": index } as CSSProperties}>
                    <Link href={`/showcase/${entry.id}`} className={styles.showcaseItem} data-kind="product"
                      aria-label={`${entry.name} — ${entry.category}`} tabIndex={duplicate ? -1 : undefined}>
                      <Image
                        src={`/showcase-hero/${entry.id}.png`}
                        alt=""
                        width={1440}
                        height={900}
                        sizes="(max-width: 720px) 320px, 520px"
                        className={styles.showcaseImage}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </ShowcaseRibbon>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <p className={styles.footerCredit}>
            Open source and MIT licensed, made by <a href="https://github.com/bitjaru">bitjaru</a> in Seoul.
          </p>
          <details className={`${styles.disclosure} ${styles.footerDisclosure}`}><summary>Explore StyleSeed</summary>
          <nav className={styles.footerNav} aria-label="All pages">
            <ul>{FOOTER_GROUPS.flatMap((group) => group.links.map(([label, href], index) => (
              <li key={href} data-group-start={index === 0 || undefined}>{href.startsWith("https:")
                ? <a href={href} target="_blank" rel="noreferrer">{label}</a>
                : <Link href={href}>{label}</Link>}
              </li>
            )))}</ul>
          </nav>
          </details>
        </div>
      </footer>
    </div>
  );
}
