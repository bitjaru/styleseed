"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Code2, Layers, Sparkles, Zap } from "lucide-react";
import { seeds, type SeedId } from "@engine/motion";
import type { EntranceRecipe } from "@engine/motion/contexts";

function delayed(recipe: EntranceRecipe, delay: number): EntranceRecipe {
  const animate = recipe.animate as Record<string, unknown>;
  const transition = (animate.transition as Record<string, unknown> | undefined) ?? {};
  return {
    initial: recipe.initial,
    animate: { ...animate, transition: { ...transition, delay } } as EntranceRecipe["animate"],
  };
}

const FEATURES = [
  {
    icon: Zap,
    title: "Ship in minutes",
    desc: "One drop-in design system. Components, tokens, and motion seeds wired up.",
  },
  {
    icon: Layers,
    title: "Brand-agnostic",
    desc: "Same component, 7 brand DNAs. Toggle one attribute to morph the whole app.",
  },
  {
    icon: Code2,
    title: "AI-ready",
    desc: "74 design rules + 22 canonical skills that installed agent workflows load for visual work.",
  },
];

const HIGHLIGHTS = [
  "33 production components",
  "7 hand-tuned brand skins",
  "5 named motion seeds",
  "Tailwind v4 native",
  "Free under MIT",
];

export function MarketingPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];

  const surfacePage = "var(--surface-page, var(--background, #fafafa))";
  const card = "var(--card, #ffffff)";
  const text = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9a9a9a))";
  const border = "var(--border, rgba(0,0,0,0.08))";
  const brand = "var(--brand, #000000)";
  const brandFg = "var(--brand-foreground, #ffffff)";
  const brandTint = "var(--brand-tint, rgba(0,0,0,0.06))";

  return (
    <div
      key={seedId}
      style={{
        background: surfacePage,
        color: text,
        minHeight: 640,
        fontFamily: "var(--font-display, var(--font-inter), Inter, system-ui, sans-serif)",
      }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center text-[14px] font-bold"
              style={{ background: brand, color: brandFg, borderRadius: 6 }}
            >
              ▲
            </div>
            <span className="text-[14px] font-bold tracking-tight">StyleSeed</span>
          </div>
          <nav className="flex items-center gap-5 text-[13px]" style={{ color: textSecondary }}>
            <span>Engine</span>
            <span>Skins</span>
            <span>Docs</span>
            <span>Showcase</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="px-3 py-1.5 text-[12px] font-semibold"
            style={{ color: textSecondary }}
          >
            Star on GitHub
          </motion.button>
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold"
            style={{
              background: brand,
              color: brandFg,
              borderRadius: 8,
            }}
          >
            Try the demo
            <ArrowRight size={12} />
          </motion.button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-8 py-16 text-center">
        <motion.div {...m.entrance}>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{
              background: brandTint,
              color: brand,
              borderRadius: 999,
              letterSpacing: "0.08em",
            }}
          >
            <Sparkles size={11} />
            New · v2 with motion seeds
          </div>
        </motion.div>
        <motion.h1
          {...delayed(m.entrance, 0.05)}
          className="mx-auto mt-6 max-w-2xl text-[52px] font-bold leading-[1.05] tracking-tight"
        >
          Design that scales without you redrawing it.
        </motion.h1>
        <motion.p
          {...delayed(m.entrance, 0.12)}
          className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed"
          style={{ color: textSecondary }}
        >
          Drop StyleSeed in once. Switch brand DNAs with a single attribute. Ship to Claude Code,
          Cursor, and your favorite vibe-coding stack — all in the same project.
        </motion.p>
        <motion.div
          {...delayed(m.entrance, 0.18)}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="flex items-center gap-1.5 px-5 py-3 text-[14px] font-bold"
            style={{
              background: brand,
              color: brandFg,
              borderRadius: 12,
            }}
          >
            Get started
            <ArrowRight size={14} />
          </motion.button>
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="px-5 py-3 text-[14px] font-bold"
            style={{
              border: `1px solid ${border}`,
              borderRadius: 12,
              color: text,
              background: card,
            }}
          >
            View on GitHub
          </motion.button>
        </motion.div>

        {/* Highlight strip */}
        <motion.div
          {...delayed(m.entrance, 0.25)}
          className="mx-auto mt-10 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]"
          style={{ color: textTertiary }}
        >
          {HIGHLIGHTS.map((h) => (
            <span key={h} className="flex items-center gap-1.5">
              <Check size={11} style={{ color: brand }} />
              {h}
            </span>
          ))}
        </motion.div>
      </section>

      {/* Feature grid */}
      <section
        className="px-8 py-16"
        style={{ borderTop: `1px solid ${border}`, background: card }}
      >
        <div className="mx-auto max-w-5xl">
          <motion.div {...m.entrance} className="mb-12 text-center">
            <div
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: textTertiary, letterSpacing: "0.1em" }}
            >
              Why StyleSeed
            </div>
            <h2 className="mt-2 text-[32px] font-bold tracking-tight">
              One design system. Every brand.
            </h2>
          </motion.div>
          <div className="grid grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...delayed(m.entrance, 0.08 + i * 0.07)}
                {...m.hover}
                className="rounded-xl p-6"
                style={{
                  background: surfacePage,
                  border: `1px solid ${border}`,
                }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center"
                  style={{ background: brand, color: brandFg, borderRadius: 10 }}
                >
                  <f.icon size={16} />
                </div>
                <div className="mt-4 text-[15px] font-bold tracking-tight">{f.title}</div>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: textSecondary }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="px-8 py-16 text-center"
        style={{ borderTop: `1px solid ${border}`, background: surfacePage }}
      >
        <motion.h3
          {...m.entrance}
          className="mx-auto max-w-xl text-[32px] font-bold leading-tight tracking-tight"
        >
          Stop redrawing. Start shipping.
        </motion.h3>
        <motion.div
          {...delayed(m.entrance, 0.1)}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="flex items-center gap-1.5 px-5 py-3 text-[14px] font-bold"
            style={{
              background: brand,
              color: brandFg,
              borderRadius: 12,
            }}
          >
            Drop in StyleSeed
            <ArrowRight size={14} />
          </motion.button>
        </motion.div>
        <p className="mx-auto mt-4 text-[12px]" style={{ color: textTertiary }}>
          MIT licensed · zero install fee · production-ready
        </p>
      </section>
    </div>
  );
}
