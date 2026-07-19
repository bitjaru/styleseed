import type { MetadataRoute } from "next";
import "./showcase/examples";
import { listShowcase } from "@/lib/showcase";
import { MOTION_LIBRARY } from "@engine/motion";
import { DOMAINS } from "@/lib/domains";
import { SCREENS } from "@/lib/screens";

const BASE = "https://styleseed-demo.vercel.app";
const CONTENT_UPDATED = new Date("2026-07-19T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/showcase`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/motion`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/motion/guide`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/why`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/scorecard`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/how-it-thinks`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/architecture`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/faq`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/screens`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/interactions`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/gallery`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pricing`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
  ];

  const showcaseRoutes: MetadataRoute.Sitemap = listShowcase().map((e) => ({
    url: `${BASE}/showcase/${e.id}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // programmatic SEO: one page per named motion keyword
  const motionRoutes: MetadataRoute.Sitemap = MOTION_LIBRARY.map((m) => ({
    url: `${BASE}/motion/${m.key}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // programmatic SEO: one design guide per app domain
  const guideRoutes: MetadataRoute.Sitemap = DOMAINS.map((d) => ({
    url: `${BASE}/guides/${d.slug}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // programmatic SEO: one design guide per screen type
  const screenRoutes: MetadataRoute.Sitemap = SCREENS.map((s) => ({
    url: `${BASE}/screens/${s.slug}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...showcaseRoutes, ...motionRoutes, ...guideRoutes, ...screenRoutes];
}
