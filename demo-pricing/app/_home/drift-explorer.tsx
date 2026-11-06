"use client";

import { useState, type CSSProperties } from "react";
import report from "@/content/landing-drift-report.json";
import styles from "./home.module.css";

const choices = [
  { axis: "spacing base", label: "Spacing" },
  { axis: "radii", label: "Radii" },
  { axis: "fonts", label: "Fonts" },
  { axis: "control heights", label: "Controls" },
];
const atRest = report.screens.map((screen, index) => ({ ...screen, index })).filter((screen) => !screen.name.includes("?"));

export function DriftExplorer() {
  const [selected, setSelected] = useState(0);
  const row = report.axes.find((axis) => axis.axis === choices[selected].axis)!;
  return (
    <div className={styles.driftExplorer}>
      <div className={styles.axisChoices} role="group" aria-label="Choose a measured axis">
        {choices.map((choice, index) => <button key={choice.axis} type="button" aria-pressed={selected === index}
          aria-controls="drift-focus" onClick={() => setSelected(index)}>{choice.label}</button>)}
      </div>
      <div id="drift-focus" className={styles.driftFocus}>
        <div className={styles.axisTitle}><h3>{row.axis}</h3><p>Baseline <code>{row.baseline}</code></p></div>
        <div className={styles.measurementColumns}>
          {atRest.map(({ name, index }) => {
            const value = row.values[index];
            const flag = value.match(/ \((?:different|\+[^)]+)\)$/)?.[0] ?? "";
            const clean = flag ? value.slice(0, -flag.length) : value;
            return <div key={name} className={styles.measurementColumn} data-different={!!flag || undefined}>
              <p className={styles.screenName}>{name}</p>
              {row.axis === "spacing base" ? <>
                <p className={styles.measuredNumber}>{clean}</p>
                <div className={styles.measuredBar} aria-hidden="true"><i style={{ "--bar-size": Number(clean) / Math.max(...row.values.map((v) => parseInt(v))) } as CSSProperties} /></div>
              </> : row.axis === "radii" ? <div className={styles.measuredRadii} aria-hidden="true">{clean.split(", ").map((radius) => <i key={radius} style={{ borderRadius: `${radius}px` }} />)}</div>
              : row.axis === "control heights" ? <div className={styles.measuredControls} aria-hidden="true">{clean.split(", ").map((height) => <i key={height} style={{ height: `${height}px` }} />)}</div>
              : <div className={styles.measuredFont} aria-hidden="true">Aa<span>{clean.includes("ui-monospace") ? "+ mono" : ""}</span></div>}
              {row.axis !== "spacing base" && <p className={styles.measuredValue}>{clean}</p>}
              <p className={styles.measurementNote}>{flag ? flag.trim() : "Shared set"}</p>
            </div>;
          })}
        </div>
        <p className={styles.atRestNote}>At rest. Error states are included in the full report.</p>
      </div>
    </div>
  );
}
