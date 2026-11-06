import { readFileSync } from "node:fs";
import { join } from "node:path";
import styles from "./home.module.css";

function readRulesInScope() {
  const path = join(process.cwd(), "public", "case-study", "folio", "project-detail.md");
  let bundle: string;
  try { bundle = readFileSync(path, "utf8"); }
  catch (cause) { throw new Error("Landing rules artifact is missing. Run prebuild (scripts/build-wanted-case.mjs) before building the site.", { cause }); }
  const section = bundle.split(/^# Rules in scope\s*$/m)[1]?.split(/^# /m)[0];
  const provenance = section?.match(/^Compiled from .+$/m)?.[0];
  const invariants = section?.split("## Invariants\n")[1]?.split("## Defaults for this selection")[0].trim();
  const defaults = section?.split("## Defaults for this selection\n")[1]?.split("\n").filter((line) => line.startsWith("- **")).slice(0, 4);
  if (!provenance || !invariants || !defaults?.length) throw new Error("Landing rules artifact has an unexpected Rules in scope section. Check the prebuild output before publishing.");
  const lines = [...invariants.split("\n").filter((line) => line.trim()), ...defaults];
  const cards = lines.map((line, index) => {
    const match = line.match(/^- \*\*((INV-\d+|CRAFT)-([a-z0-9-]+))\*\* \((blocks|strong) · [^)]+\): (.+)$/);
    if (!match || (index < lines.length - defaults.length && match[2] === "CRAFT")) throw new Error(`Malformed landing rule: ${line}`);
    const [, id, chip, slug, priority, body] = match;
    const sentence = body.match(/^.+?[.!?](?:\s|$)/)?.[0].trim();
    if (!sentence) throw new Error(`Landing rule has no complete first sentence: ${id}`);
    const title = slug.replaceAll("-", " ");
    return { id, chip, title: title[0].toUpperCase() + title.slice(1), priority, sentence };
  });
  if (!cards.some((card) => card.chip.startsWith("INV-"))) throw new Error("Landing rules have no invariants.");
  return {
    cards, provenance,
    markdown: `# Rules in scope\n\n${provenance}\n\n## Invariants\n\n${invariants}\n\n## Defaults for this selection\n\n${defaults.join("\n")}`,
  };
}

export function RulesInScope() {
  const { cards, provenance, markdown } = readRulesInScope();
  return (
    <div className={styles.rulesObject}>
      <div className={styles.rulesFile}><span>folio / project-detail.md</span><span>Compiled at build time</span></div>
      <ul className={styles.ruleGrid}>
        {cards.map((card, index) => <li className={styles.ruleCard} key={card.id} data-invariant={card.priority === "blocks" || undefined} data-rule-id={card.id}>
          <details open={index === 0}>
            <summary><code>{card.chip}</code><h3>{card.title}</h3><span className={styles.rulePriority}>{card.priority}</span><span className={styles.ruleExpand} aria-hidden="true">+</span></summary>
            <p>{card.sentence}</p>
          </details>
        </li>)}
      </ul>
      <p className={styles.bundleCaption}><a href="/case-study/folio/project-detail.md">Read the full bundle</a></p>
      <details className={styles.disclosure}>
        <summary>Provenance and verbatim rules</summary>
        <p className={styles.outputMeta}>{provenance}</p>
        <pre className={styles.rules} tabIndex={0} aria-label="Verbatim compiled rules for the Folio project detail screen"><code>{markdown}</code></pre>
      </details>
    </div>
  );
}
