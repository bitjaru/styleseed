import { readFileSync } from "node:fs";
import { join } from "node:path";
import styles from "./home.module.css";

// Fixed list so a later priority bump (e.g. DL-23 to blocks) does not reshuffle the landing cards (#131).
const LANDING_DEFAULT_RULE_IDS = [
  "CRAFT-control-heights",
  "CRAFT-functional-icons",
  "CRAFT-icon-family",
  "CRAFT-motion-family",
] as const;

const LANDING_RULE_LINE = /^- \*\*(([A-Z]+(?:-\d+)?)-([a-z0-9-]+))\*\* \((blocks|strong|advisory) · [^)]+\): (.+)$/;

function readRulesInScope() {
  const path = join(process.cwd(), "public", "case-study", "folio", "project-detail.md");
  let bundle: string;
  try { bundle = readFileSync(path, "utf8"); }
  catch (cause) { throw new Error("Landing rules artifact is missing. Run prebuild (scripts/build-wanted-case.mjs) before building the site.", { cause }); }
  const section = bundle.split(/^# Rules in scope\s*$/m)[1]?.split(/^# /m)[0];
  const provenance = section?.match(/^Compiled from .+$/m)?.[0];
  const invariants = section?.split("## Invariants\n")[1]?.split("## Defaults for this selection")[0].trim();
  const defaultLines = section?.split("## Defaults for this selection\n")[1]?.split("\n").filter((line) => line.startsWith("- **"));
  if (!provenance || !invariants || !defaultLines?.length) throw new Error("Landing rules artifact has an unexpected Rules in scope section. Check the prebuild output before publishing.");
  const defaultsById = new Map<string, string>();
  for (const line of defaultLines) {
    const id = line.match(LANDING_RULE_LINE)?.[1];
    if (id) defaultsById.set(id, line);
  }
  const defaults = LANDING_DEFAULT_RULE_IDS.map((id) => {
    const line = defaultsById.get(id);
    if (!line) throw new Error(`Landing default rule is missing from the bundle: ${id}`);
    return line;
  });
  const invariantLines = invariants.split("\n").filter((line) => line.trim());
  const cards = [...invariantLines, ...defaults].map((line, index) => {
    const match = line.match(LANDING_RULE_LINE);
    if (!match || (index < invariantLines.length && !match[2].startsWith("INV-"))) throw new Error(`Malformed landing rule: ${line}`);
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
  const renderCard = (card: typeof cards[number], index: number) => <li className={styles.ruleCard} key={card.id} data-invariant={card.priority === "blocks" || undefined} data-rule-id={card.id}>
    <details open={index === 0}>
      <summary><code>{card.chip}</code><h3>{card.title}</h3><span className={styles.rulePriority}>{card.priority}</span><span className={styles.ruleExpand} aria-hidden="true">+</span></summary>
      <p>{card.sentence}</p>
    </details>
  </li>;
  return (
    <div className={styles.rulesObject}>
      <div className={styles.rulesFile}><span>folio / project-detail.md</span><span>Compiled at build time</span></div>
      <ul className={styles.ruleGrid}>
        {cards.slice(0, 5).map(renderCard)}
      </ul>
      {cards.length > 5 && <details className={styles.moreRules}>
        <summary>{cards.length - 5} more rules<span>Craft defaults</span></summary>
        <ul className={styles.ruleGrid}>{cards.slice(5).map((card, index) => renderCard(card, index + 5))}</ul>
      </details>}
      <p className={styles.bundleCaption}><a href="/case-study/folio/project-detail.md">Read the full bundle</a></p>
      <details className={styles.disclosure}>
        <summary>Provenance and verbatim rules</summary>
        <p className={styles.outputMeta}>{provenance}</p>
        <pre className={styles.rules} tabIndex={0} aria-label="Verbatim compiled rules for the Folio project detail screen"><code>{markdown}</code></pre>
      </details>
    </div>
  );
}
