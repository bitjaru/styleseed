"use client";

import { useEffect, useState } from "react";
import report from "@/content/landing-drift-report.json";
import styles from "./home.module.css";

// Short display names for measured axes, never additional product claims.
const words = [
  { label: "accent", axis: "accent" },
  { label: "spacing", axis: "spacing scale" },
  { label: "type", axis: "type sizes" },
  { label: "radius", axis: "radii" },
  { label: "control", axis: "control heights" },
];
for (const { axis } of words) {
  if (!report.axes.some((row) => row.axis === axis)) throw new Error(`Hero axis is missing from the recorded report: ${axis}`);
}

export function HeroWord() {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(interval);
      setIndex(reduced.matches ? -1 : 0);
      if (!reduced.matches) interval = setInterval(() => {
        if (!document.hidden) setIndex((value) => (value + 1) % words.length);
      }, 2400);
    };
    sync();
    reduced.addEventListener("change", sync);
    return () => { clearInterval(interval); reduced.removeEventListener("change", sync); };
  }, []);
  return (
    <span className={styles.heroChip} data-hero-word={index < 0 ? "design" : words[index].label}>
      <span className={styles.srOnly}>design</span>
      {[{ label: "design", axis: "" }, ...words].map(({ label }, wordIndex) => (
        <span key={label} className={styles.chipWord} data-active={wordIndex === index + 1} aria-hidden="true">
          <span className={styles.chipGlyph} data-glyph={label}>
            {label === "type" ? "Aa" : label === "spacing" ? <><i /><i /><i /><i /></> : null}
          </span>
          {label}
        </span>
      ))}
    </span>
  );
}
