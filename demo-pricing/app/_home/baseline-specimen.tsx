import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import report from "@/content/landing-drift-report.json";
import styles from "./home.module.css";

const baseline = (axis: string) => report.axes.find((row) => row.axis === axis)!.baseline;

/** A specimen of the recorded measurements, not a simulated product screen. */
export function BaselineSpecimen() {
  return (
    <figure className={styles.specimen} aria-label="Design specimen from the recorded payments-console baseline">
      <div className={styles.specimenSheet}>
        <figcaption className={styles.specimenCaption}><span>payments-console</span><span>Recorded baseline</span></figcaption>
        <div className={styles.specimenColours}>
          {["accent", "ink", "canvas"].map((axis) => (
            <div key={axis} data-colour={axis} style={{ "--specimen-colour": baseline(axis) } as CSSProperties}>
              <span>{axis}</span><code>{baseline(axis)}</code>
            </div>
          ))}
        </div>
        <div className={styles.specimenSpacing}>
          <div className={styles.baseNumber}><strong>{baseline("spacing base")}</strong><span>Spacing base</span></div>
          <div className={styles.spacingDiagram} aria-label={`Spacing scale: ${baseline("spacing scale")}`}>
            {baseline("spacing scale").split(", ").map((value) => <div key={value}><i style={{ "--step": value } as CSSProperties} /><code>{value}</code></div>)}
          </div>
        </div>
        <div className={styles.specimenType}>
          <span>Type sizes</span><div>{baseline("type sizes").split(", ").map((value) => <span key={value} style={{ "--type-size": value } as CSSProperties}>{value}</span>)}</div>
        </div>
        <div className={styles.specimenRadii}>
          <span>Radii</span><div>{baseline("radii").split(", ").map((value) => <span key={value}><i style={{ borderRadius: `${value}px` }} /><code>{value}</code></span>)}</div>
        </div>
        <a href="#drift-report" className={styles.specimenSource}>See the recorded run <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </figure>
  );
}
