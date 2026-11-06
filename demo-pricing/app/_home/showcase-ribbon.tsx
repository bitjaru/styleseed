"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./home.module.css";

export function ShowcaseRibbon({ children, count }: { children: ReactNode; count: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    // CSS owns the loop. Its current time also locates every index on the fan's arc,
    // so the nearest-to-centre cards stay upright and largest as the track moves.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = false;
    const syncPosition = () => {
      const animation = track.getAnimations()[0];
      const time = Number(animation?.currentTime ?? 0);
      const groupWidth = (track.firstElementChild as HTMLElement).offsetWidth;
      root.style.setProperty("--fan-offset", String((time % 90000) / 90000 * groupWidth));
      if (visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(syncPosition);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      root.classList.toggle(styles.ribbonEnhanced, !reduced.matches);
      root.dataset.running = String(visible && !reduced.matches && !document.hidden);
      root.style.setProperty("--fan-centre", String(root.clientWidth / 2));
      if (visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(syncPosition);
    };
    const resize = new ResizeObserver(sync);
    resize.observe(root);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(root);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect();
      reduced.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.ribbon} data-paused={paused} style={{ "--fan-count": count } as CSSProperties}>
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
