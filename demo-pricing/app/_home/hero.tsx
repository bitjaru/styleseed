import Link from "next/link";
import { InstallCommand } from "./prompt-box";
import { PaletteSpecimen } from "./design-specimens";
import styles from "./home.module.css";

export function Hero() {
  return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>Design rules for coding agents</span>
        <h1 id="home-title"><span className={styles.heroLine}>Your design system.</span><span className={styles.heroLine}>Still yours,<span className={styles.heroLast}> next session.</span></span></h1>
        <p>StyleSeed compiles your rules per task and measures the screens agents build.</p>
        <div className={styles.heroInstall}>
          <InstallCommand variant="terminal" showOptions={false} />
        </div>
        <div className={styles.heroAgents}>
          <Link href="/codex-ui-design">Codex</Link><Link href="/claude-code-ui-design">Claude Code</Link>
        </div>
      </div>
      <PaletteSpecimen />
    </section>
  );
}
