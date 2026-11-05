import type { CSSProperties } from "react";
import report from "@/content/landing-drift-report.json";
import { ReportReveal } from "./report-reveal";
import styles from "./home.module.css";

/** A recorded run, not a live browser probe or a fabricated product preview. */
export function DriftReport() {
  return (
    <ReportReveal>
      <div className={`${styles.outputBar} ${styles.terminalBar}`}>
        <code className={styles.terminalCommand} title={report.command}>
          {report.command.replace(/^node \S+\//, "node …/")}
        </code>
        <span>payments-console · recorded run</span>
      </div>
      <div className={styles.reportIntro}>
        <p className={styles.outputMeta}>
          Measured {report.measuredAt} · {report.viewports.map(({ width, height }) => `${width}×${height}`).join(" / ")}
        </p>
        <p className={styles.verdict} data-report-line style={{ "--report-line": 0 } as CSSProperties}>{report.verdict}</p>
        <p className={styles.outputMeta} data-report-line style={{ "--report-line": 1 } as CSSProperties}>Baseline: {report.baseline}</p>
      </div>
      <p className={styles.scrollHint}>Scroll to compare all screens →</p>
      <div className={styles.tableScroll} role="region" aria-label="Drift measurements by screen; scroll horizontally to compare" tabIndex={0}>
        <table className={styles.driftTable}>
          <caption className={styles.srOnly}>Computed style measurements from the payments console, including error states.</caption>
          <thead>
            <tr>
              <th scope="col">Axis</th>
              <th scope="col">Baseline</th>
              {report.screens.map(({ name }) => <th scope="col" key={name}>{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.axes.map((row, index) => (
              <tr key={row.axis} data-report-line style={{ "--report-line": index + 2 } as CSSProperties}>
                <th scope="row">{row.axis}</th>
                <td>{row.baseline}</td>
                {row.values.map((value, index) => (
                  <td key={report.screens[index].name} data-different={value.includes("(different)") || value.includes("(+") || undefined}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className={styles.reportCaption}>
        <p>These are measurements, not a score. A <code>different</code> value is a question for the owner of the design system.</p>
        <details className={styles.disclosure}>
          <summary>Command, sources, and reading the report</summary>
          <pre className={styles.command}><code>{report.command}</code></pre>
          <p>{report.howToRead}</p>
          <p className={styles.outputMeta}>{report.statuses}</p>
          <p className={styles.outputMeta}>Measured with {report.measuredWith}.</p>
          <pre className={styles.command}><code>{[
            "## Off-scale spacing per screen",
            ...report.screens.filter((screen) => "offScaleSpacing" in screen).map((screen) => `- ${screen.name}: ${screen.offScaleSpacing?.join(", ")}`),
            "",
            "## Screens",
            ...report.screens.map((screen) => `- ${screen.name} — ${screen.url}`),
          ].join("\n")}</code></pre>
        </details>
      </figcaption>
    </ReportReveal>
  );
}
