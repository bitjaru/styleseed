import type { CSSProperties } from "react";
import report from "@/content/landing-drift-report.json";
import { ReportReveal } from "./report-reveal";
import styles from "./home.module.css";

// These are the four at-rest differences named in the recorded verdict.
const firstAxes = ["spacing base", "radii", "fonts", "control heights"];
const rows = [...firstAxes.map((axis) => report.axes.find((row) => row.axis === axis)!),
  ...report.axes.filter((row) => !firstAxes.includes(row.axis))];

function Measurement({ axis, value }: { axis: string; value: string }) {
  const flag = value.match(/ \((?:different|\+[^)]+)\)$/)?.[0] ?? "";
  const text = flag ? value.slice(0, -flag.length) : value;
  const color = /^(accent|ink|canvas)$/.test(axis) && /^#[\da-f]{6}$/i.test(text) ? text : null;
  return (
    <span className={styles.measurement} data-different={!!flag || undefined}>
      {color && <span aria-hidden="true" className={styles.swatch} style={{ "--measurement-color": color } as CSSProperties} />}
      {axis === "radii" && <span className={styles.radiiSamples} aria-hidden="true">
        {text.split(", ").map((radius) => <i key={radius} style={{ borderRadius: `${Number(radius)}px` }} />)}
      </span>}
      <span>{text}{flag && <span className={styles.measurementFlag}>{flag}</span>}</span>
    </span>
  );
}

/** A recorded run, not a live probe. Every cell retains the source JSON's exact text. */
export function DriftReport() {
  return (
    <div className={styles.reportObject}>
      <ReportReveal>
        <div className={styles.terminalBar}>
          <span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span>
          <span>payments-console — drift report</span>
        </div>
        <div className={styles.reportIntro}>
          <p className={styles.outputMeta}>Recorded run · {report.measuredAt} · {report.viewports.map(({ width, height }) => `${width}×${height}`).join(" / ")}</p>
          <div className={styles.terminalCommand}>
            <code data-command-source>{report.command}</code>
            <code className={styles.typedCommand} data-command-typed aria-hidden="true" />
          </div>
          <p className={styles.verdict}>
            {report.verdict.split(/(?<=\.) /).map((line, index) => (
              <span data-verdict-line key={line}>{index > 0 ? " " : ""}{line}</span>
            ))}
          </p>
        </div>
        <div data-grid-output>
          <p className={styles.scrollHint}>Scroll to compare all screens →</p>
          <div className={styles.tableScroll} role="region" aria-label="Drift measurements by screen; scroll horizontally to compare" tabIndex={0}>
            <table id="drift-measurements" className={styles.driftTable}>
              <caption className={styles.srOnly}>Computed style measurements from the payments console, including error states. Four at-rest differences first.</caption>
              <thead><tr>
                <th scope="col">Axis</th><th scope="col">Baseline</th>
                {report.screens.map(({ name }) => <th scope="col" key={name}>{name.split("?")[0]}{name.includes("?") && <span className={styles.stateLabel}>?{name.split("?")[1]}</span>}</th>)}
              </tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.axis} data-secondary={!firstAxes.includes(row.axis) || undefined}>
                  <th scope="row">{row.axis}</th>
                  <td><Measurement axis={row.axis} value={row.baseline} /></td>
                  {row.values.map((value, index) => <td key={report.screens[index].name}><Measurement axis={row.axis} value={value} /></td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </ReportReveal>
      <div className={styles.reportCaption}>
        <p>These are measurements, not a score. A <code>different</code> value is a question for the owner of the design system.</p>
        <details className={styles.disclosure}>
          <summary>Command, sources, and reading the report</summary>
          <pre className={styles.command}><code>{report.command}</code></pre>
          <p className={styles.outputMeta}>Baseline: {report.baseline}</p>
          <p>{report.howToRead}</p>
          <p className={styles.outputMeta}>{report.statuses}</p>
          <p className={styles.outputMeta}>Measured with {report.measuredWith}.</p>
          <pre className={styles.command}><code>{[
            "## Off-scale spacing per screen",
            ...report.screens.filter((screen) => "offScaleSpacing" in screen).map((screen) => `- ${screen.name}: ${screen.offScaleSpacing?.join(", ")}`),
            "", "## Screens", ...report.screens.map((screen) => `- ${screen.name} — ${screen.url}`),
          ].join("\n")}</code></pre>
        </details>
      </div>
    </div>
  );
}
