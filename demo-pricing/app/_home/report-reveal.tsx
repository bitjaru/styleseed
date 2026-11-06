"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./home.module.css";

/** The recorded report is always complete. Only its command is briefly retyped. */
export function ReportReveal({ children }: { children: ReactNode }) {
  const reportRef = useRef<HTMLElement>(null);
  const finishRef = useRef<() => void>(() => {});
  useEffect(() => {
    const root = reportRef.current;
    if (!root) return;
    const source = root.querySelector<HTMLElement>("[data-command-source]");
    const typed = root.querySelector<HTMLElement>("[data-command-typed]");
    if (!source || !typed) return;
    const command = source.textContent ?? "";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const finish = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      root.dataset.typingState = "complete";
    };
    finishRef.current = finish;
    root.dataset.typingState = "complete";
    if (!reduced.matches && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer?.disconnect();
        root.dataset.typingState = "typing";
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / 1600);
          typed.textContent = command.slice(0, Math.floor(command.length * progress));
          if (progress === 1) finish();
          else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, { threshold: 0.3 });
      observer.observe(root);
    }
    const sync = () => { if (reduced.matches) finish(); };
    reduced.addEventListener("change", sync);
    return () => { finish(); reduced.removeEventListener("change", sync); };
  }, []);
  return <figure ref={reportRef} className={styles.reportTerminal} onFocusCapture={() => finishRef.current()}>{children}</figure>;
}
