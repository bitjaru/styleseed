"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./home.module.css";

/** Complete server HTML; typing is a presentation layer over the same selectable output. */
export function ReportReveal({ children }: { children: ReactNode }) {
  const reportRef = useRef<HTMLElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const report = reportRef.current;
    if (!report) return;
    report.classList.add(styles.reportEnhanced);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const command = report.querySelector<HTMLElement>("[data-command-source]")!.textContent!;
    const typed = report.querySelector<HTMLElement>("[data-command-typed]")!;
    const lines = [...report.querySelectorAll<HTMLElement>("[data-verdict-line]")];
    const typingMs = command.length * 25; // 40 characters per second.
    const lineMs = 180;
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const finish = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      report.dataset.typingState = "complete";
      lines.forEach((line) => { line.dataset.visible = "true"; });
    };
    finishRef.current = finish;
    if (!reduced.matches && "IntersectionObserver" in window) {
      report.dataset.typingState = "waiting";
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer?.disconnect();
        const start = performance.now();
        report.dataset.typingState = "typing";
        report.dataset.typingStarted = String(start);
        const tick = (now: number) => {
          const elapsed = now - start;
          typed.textContent = command.slice(0, Math.floor(elapsed / 25));
          lines.forEach((line, index) => { line.dataset.visible = String(elapsed >= typingMs + lineMs * (index + 1)); });
          if (elapsed >= typingMs + lineMs * (lines.length + 1)) {
            report.dataset.typingDuration = String(Math.round(elapsed));
            finish();
          } else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, { threshold: 0.15 });
      observer.observe(report);
    }
    const sync = () => { if (reduced.matches) finish(); };
    reduced.addEventListener("change", sync);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); reduced.removeEventListener("change", sync); };
  }, []);

  return (
    <figure ref={reportRef} className={styles.reportTerminal} data-expanded={expanded}
      onFocusCapture={() => finishRef.current()}>
      {children}
      <div className={styles.reportToggle} data-grid-output>
        <button type="button" aria-expanded={expanded} aria-controls="drift-measurements"
          onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show 4 drift axes" : "All 9 axes"} <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      </div>
    </figure>
  );
}
