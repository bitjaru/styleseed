import Link from "next/link";
import { InstallCommand } from "./prompt-box";
import { HeroWord } from "./hero-word";
import styles from "./home.module.css";

export function Hero() {
  return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
      <h1 id="home-title">Keep your <HeroWord /> decisions in the next agent session.</h1>
      <p>StyleSeed compiles your rules per task and measures the screens agents build.</p>
      <div className={styles.heroInstall}>
        <InstallCommand variant="terminal" showOptions={false} />
      </div>
      <div className={styles.heroAgents}>
        <Link href="/codex-ui-design">Codex</Link><span aria-hidden="true">·</span><Link href="/claude-code-ui-design">Claude Code</Link>
      </div>
    </section>
  );
}
