"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./home.module.css";

/** Progressive enhancement: the server HTML is complete and visible without this effect. */
export function ReportReveal({ children }: { children: ReactNode }) {
  const reportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const report = reportRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!report || reduced.matches || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      report.classList.add(styles.reportReveal);
      observer.disconnect();
    }, { threshold: 0 });
    observer.observe(report);
    const finish = () => {
      if (reduced.matches) {
        observer.disconnect();
        report.classList.remove(styles.reportReveal);
      }
    };
    reduced.addEventListener("change", finish);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", finish);
    };
  }, []);

  return <figure ref={reportRef} className={`${styles.output} ${styles.reportTerminal}`}>{children}</figure>;
}
