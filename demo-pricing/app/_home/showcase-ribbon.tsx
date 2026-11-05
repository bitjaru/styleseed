"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./home.module.css";

export function ShowcaseRibbon({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // No JS means a static, scrollable row with no nonfunctional pause control.
    rootRef.current?.classList.add(styles.ribbonEnhanced);
  }, []);

  return (
    <div ref={rootRef} className={styles.ribbon} data-paused={paused}>
      <div className={styles.ribbonViewport}>
        <div ref={trackRef} className={styles.ribbonTrack} onFocusCapture={(event) => {
          // Reset the paused track for keyboard browsing: an early link must not remain
          // translated off the left edge, where native horizontal scrolling cannot reach it.
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) {
            for (const animation of trackRef.current?.getAnimations() ?? []) animation.currentTime = 0;
            event.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
          }
        }}>
          {children}
        </div>
      </div>
      <div className={`${styles.container} ${styles.ribbonControls}`}>
        <button type="button" className={styles.motionControl} aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}>
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {paused ? "Resume motion" : "Pause motion"}
        </button>
      </div>
    </div>
  );
}
