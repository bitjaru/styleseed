"use client";

import { useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import styles from "./home.module.css";

export function ShowcaseRibbon({ children, count }: { children: ReactNode; count: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = viewport.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className={styles.ribbon}>
    <div ref={viewport} className={styles.ribbonViewport} role="region" aria-label={`${count} StyleSeed showcase examples`} tabIndex={0}>
      <div className={styles.ribbonTrack}>{children}</div>
    </div>
    <div className={styles.ribbonControls}>
      <button type="button" onClick={() => move(-1)} aria-label="Previous showcase examples"><ArrowLeft size={18} aria-hidden="true" /></button>
      <span>{count} products. Their own design language.</span>
      <button type="button" onClick={() => move(1)} aria-label="Next showcase examples"><ArrowRight size={18} aria-hidden="true" /></button>
    </div>
  </div>;
}
