import { ArrowDown } from "lucide-react";
import { InstallCommand } from "./prompt-box";
import styles from "./home.module.css";

export function Hero() {
  return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-title">
      <h1 id="home-title">Keep your design decisions in the next agent session.</h1>
      <p>StyleSeed compiles your rules and measures the screens agents build.</p>
      <div className={styles.heroInstall}>
        <InstallCommand variant="terminal" showOptions={false} />
      </div>
      <a href="#drift-report" className={styles.textLink}>
        See a real drift report <ArrowDown size={16} aria-hidden="true" />
      </a>
    </section>
  );
}
