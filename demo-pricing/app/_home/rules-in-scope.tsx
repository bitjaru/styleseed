import { readFileSync } from "node:fs";
import { join } from "node:path";
import styles from "./home.module.css";

function readRulesInScope() {
  const path = join(process.cwd(), "public", "case-study", "folio", "project-detail.md");
  let bundle: string;
  try {
    bundle = readFileSync(path, "utf8");
  } catch (cause) {
    throw new Error("Landing rules artifact is missing. Run prebuild (scripts/build-wanted-case.mjs) before building the site.", { cause });
  }
  const section = bundle.split(/^# Rules in scope\s*$/m)[1]?.split(/^# /m)[0];
  const provenance = section?.match(/^Compiled from .+$/m)?.[0];
  const invariants = section?.split("## Invariants\n")[1]?.split("## Defaults for this selection")[0].trim();
  const defaults = section?.split("## Defaults for this selection\n")[1]?.split("\n").filter((line) => line.startsWith("- **")).slice(0, 4);
  // The catalog may grow; the landing needs at least one invariant and one default, not an exact count.
  if (!provenance || !invariants || !invariants.split("\n").some((line) => line.startsWith("- **INV-")) || !defaults?.length) {
    throw new Error("Landing rules artifact has an unexpected Rules in scope section. Check the prebuild output before publishing.");
  }
  return `# Rules in scope\n\n${provenance}\n\n## Invariants\n\n${invariants}\n\n## Defaults for this selection\n\n${defaults.join("\n")}`;
}

export function RulesInScope() {
  const rules = readRulesInScope();
  return (
    <figure className={styles.output}>
      <div className={styles.outputBar}>
        <span>folio / project-detail.md</span>
        <a href="/case-study/folio/project-detail.md">Read full bundle ↗</a>
      </div>
      <pre className={styles.rules} tabIndex={0} aria-label="Verbatim compiled rules for the Folio project detail screen"><code>{rules}</code></pre>
      <figcaption className={styles.bundleCaption}>An excerpt from the in-repository Folio example, compiled at build time.</figcaption>
    </figure>
  );
}
