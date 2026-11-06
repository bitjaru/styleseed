import type { CSSProperties } from "react";
import report from "@/content/landing-drift-report.json";
import { ReportReveal } from "./report-reveal";
import { DriftExplorer } from "./drift-explorer";
import styles from "./home.module.css";

function Measurement({ axis, value }: { axis: string; value: string }) {
  const flag = value.match(/ \((?:different|\+[^)]+)\)$/)?.[0] ?? "";
  const text = flag ? value.slice(0, -flag.length) : value;
  const color = /^(accent|ink|canvas)$/.test(axis) && /^#[\da-f]{6}$/i.test(text) ? text : null;
  return <span className={styles.measurement} data-different={!!flag || undefined}>
    {color && <span aria-hidden="true" className={styles.swatch} style={{ "--measurement-color": color } as CSSProperties} />}
    <span>{text}{flag && <span className={styles.measurementFlag}>{flag}</span>}</span>
  </span>;
}

export function DriftReport() {
  return <div className={styles.reportObject}>
    <ReportReveal>
      <figcaption className={styles.reportHeader}><span>payments-console</span><span>Recorded <time dateTime={report.measuredAt}>{report.measuredAt}</time></span></figcaption>
      <DriftExplorer />
      <div className={styles.terminalCommand}>
        <code data-command-source>{report.command}</code>
        <code className={styles.typedCommand} data-command-typed aria-hidden="true" />
      </div>
    </ReportReveal>
    <div className={styles.reportCaption}>
      <p>These are measurements, not a score. A <code>different</code> value is a question for the owner of the design system.</p>
      <details className={styles.disclosure} id="drift-measurements">
        <summary>All {report.axes.length} axes across {report.screens.length} screens</summary>
        <p className={styles.verdict}>{report.verdict}</p>
        <p className={styles.outputMeta}>Viewports: {report.viewports.map(({ width, height }) => `${width}×${height}`).join(" / ")}</p>
        <div className={styles.tableScroll} role="region" aria-label="All drift measurements by screen" tabIndex={0}>
          <table className={styles.driftTable}>
            <caption className={styles.srOnly}>Computed styles, including error states. Exact values from the recorded run.</caption>
            <thead><tr><th scope="col">Axis</th><th scope="col">Baseline</th>{report.screens.map(({ name }) => <th scope="col" key={name}>{name.split("?")[0]}{name.includes("?") && <span className={styles.stateLabel}>?{name.split("?")[1]}</span>}</th>)}</tr></thead>
            <tbody>{report.axes.map((row) => <tr key={row.axis}><th scope="row">{row.axis}</th><td><Measurement axis={row.axis} value={row.baseline} /></td>{row.values.map((value, i) => <td key={i}><Measurement axis={row.axis} value={value} /></td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className={styles.mobileMeasurements}>
          {report.screens.map((screen, i) => <details key={screen.name} className={styles.screenDetails} open={i === 0}>
            <summary>{screen.name}</summary>
            <dl>{report.axes.map((row) => <div key={row.axis}><dt>{row.axis}<small>Baseline: {row.baseline}</small></dt><dd><Measurement axis={row.axis} value={row.values[i]} /></dd></div>)}</dl>
          </details>)}
        </div>
      </details>
      <details className={styles.disclosure}>
        <summary>Command, sources, and reading the report</summary>
        <pre className={styles.command}><code>{report.command}</code></pre>
        <p>Baseline: {report.baseline}</p><p>{report.howToRead}</p><p>{report.statuses}</p>
        <p>Measured with {report.measuredWith}.</p>
        <pre className={styles.command}><code>{["## Off-scale spacing per screen", ...report.screens.filter((s) => "offScaleSpacing" in s).map((s) => `- ${s.name}: ${s.offScaleSpacing?.join(", ")}`), "", "## Screens", ...report.screens.map((s) => `- ${s.name} — ${s.url}`)].join("\n")}</code></pre>
      </details>
    </div>
  </div>;
}
