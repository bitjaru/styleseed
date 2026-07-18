"use client";

import { useEffect, useState } from "react";

export function GithubStarCount({ className = "" }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/github-stars", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { stars?: unknown }) => {
        if (typeof data.stars === "number") setStars(data.stars);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  if (stars === null) return null;

  return (
    <span className={className} aria-label={`${stars.toLocaleString("en-US")} GitHub stars`}>
      ★ {stars.toLocaleString("en-US")}
    </span>
  );
}
