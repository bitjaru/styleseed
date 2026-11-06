import Link from "next/link";
import { InstallCommand } from "./prompt-box";
import { BaselineSpecimen } from "./baseline-specimen";
import styles from "./home.module.css";

export function Hero() {
  return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
      <div className={styles.heroCopy}>
        <h1 id="home-title">Design decisions.<br />Kept across<br />agent sessions.</h1>
        <p>StyleSeed compiles your rules per task and measures the screens agents build.</p>
        <div className={styles.heroInstall}>
          <InstallCommand variant="terminal" showOptions={false} />
        </div>
        <div className={styles.heroAgents}>
          <Link href="/codex-ui-design">Codex</Link><Link href="/claude-code-ui-design">Claude Code</Link>
        </div>
      </div>
      <BaselineSpecimen />
    </section>
  );
}
