import type { ReactNode } from "react";
import styles from "./home.module.css";

/** Recorded evidence stays fully readable, including its original command. */
export function ReportReveal({ children }: { children: ReactNode }) {
  return <figure className={styles.reportTerminal}>{children}</figure>;
}
