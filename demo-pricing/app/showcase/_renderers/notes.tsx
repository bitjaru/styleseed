"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
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

type Note = {
  id: string;
  title: string;
  preview: string;
  emoji: string;
  updated: string;
  starred?: boolean;
};

const NOTES: Note[] = [
  {
    id: "n1",
    title: "Pixelmind launch checklist",
    preview: "Domain + npm scope + first README + Show HN draft…",
    emoji: "🎯",
    updated: "now",
    starred: true,
  },
  {
    id: "n2",
    title: "Motion seeds vibe vocabulary",
    preview: "Spring · Silk · Snap · Float · Pulse — calibration notes per skin.",
    emoji: "🌊",
    updated: "1h",
  },
  {
    id: "n3",
    title: "Q2 roadmap",
    preview: "Sprint 9 · Showcase v1, motion seeds, demo-site rewrite…",
    emoji: "🗓️",
    updated: "yesterday",
    starred: true,
  },
  {
    id: "n4",
    title: "Design rule audit",
    preview: "74 rules · need new entries for motion + density triage.",
    emoji: "📐",
    updated: "2d",
  },
  {
    id: "n5",
    title: "User interview — sam@",
    preview: "Pricing CTA confusion · onboarding skips · settings nav…",
    emoji: "🎙️",
    updated: "1w",
  },
];

const TAGS = ["product", "design", "Q2", "roadmap"];

export function NotesPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const [selected, setSelected] = useState(NOTES[0]!.id);

  const surfacePage = "var(--surface-page, var(--background, #fafafa))";
  const card = "var(--card, #ffffff)";
  const text = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9a9a9a))";
  const border = "var(--border, rgba(0,0,0,0.08))";
  const brand = "var(--brand, #1a1a1a)";
  const brandTint = "var(--brand-tint, rgba(0,0,0,0.04))";

  const current = NOTES.find((n) => n.id === selected) ?? NOTES[0]!;

  return (
    <div
      key={seedId}
      className="flex flex-col md:flex-row"
      style={{
        background: surfacePage,
        color: text,
        minHeight: 640,
        fontFamily: "var(--font-display, var(--font-inter), Inter, system-ui, sans-serif)",
      }}
    >
      {/* Sidebar */}
      <aside
        className="shrink-0 overflow-y-auto border-b p-3 md:w-[280px] md:border-r md:border-b-0"
        style={{
          background: card,
          borderColor: border,
        }}
      >
        <div className="mb-3 flex items-center gap-2 px-2">
          <div
            className="flex h-7 w-7 items-center justify-center text-[14px]"
            style={{ background: brandTint, borderRadius: 8 }}
          >
            📓
          </div>
          <div className="flex-1 leading-tight">
            <div className="text-[12px] font-bold">{skin} notebook</div>
            <div className="text-[10px]" style={{ color: textTertiary }}>
              {NOTES.length} notes · 2 starred
            </div>
          </div>
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            className="flex h-7 w-7 items-center justify-center"
            style={{ color: textSecondary }}
          >
            <Plus size={14} />
          </motion.button>
        </div>

        <div
          className="mb-3 flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: brandTint,
            borderRadius: 8,
            color: textSecondary,
            fontSize: 12,
          }}
        >
          <Search size={12} />
          <span className="flex-1">Search…</span>
          <kbd
            className="rounded px-1 py-0.5 text-[9px] font-bold"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            ⌘K
          </kbd>
        </div>

        <div className="px-2 pb-1 pt-2">
          <div
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: textTertiary, letterSpacing: "0.1em" }}
          >
            <ChevronDown size={10} />
            All notes
          </div>
        </div>

        <nav className="space-y-0.5">
          {NOTES.map((n, i) => (
            <motion.button
              key={n.id}
              type="button"
              {...delayed(m.entrance, 0.04 + i * 0.03)}
              {...m.press}
              onClick={() => setSelected(n.id)}
              className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition-colors"
              style={{
                background: selected === n.id ? brandTint : "transparent",
                color: text,
              }}
            >
              <div className="flex w-full items-center gap-2">
                <span className="text-[14px]">{n.emoji}</span>
                <span className="flex-1 truncate text-[12px] font-semibold">{n.title}</span>
                {n.starred && <Star size={10} style={{ color: "#f59e0b" }} fill="#f59e0b" />}
              </div>
              <div
                className="ms-6 mt-0.5 truncate text-[11px]"
                style={{ color: textTertiary, maxWidth: 220 }}
              >
                {n.preview}
              </div>
            </motion.button>
          ))}
        </nav>

        <div className="px-2 pb-1 pt-4">
          <div
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: textTertiary, letterSpacing: "0.1em" }}
          >
            <ChevronRight size={10} />
            Archive
          </div>
        </div>
      </aside>

      {/* Editor */}
      <div className="min-w-0 grow overflow-y-auto md:flex-1">
        {/* Sticky header */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 md:flex-nowrap md:gap-x-0 md:px-8"
          style={{ borderBottom: `1px solid ${border}`, background: surfacePage }}
        >
          <div className="flex items-center gap-2 text-[12px]" style={{ color: textTertiary }}>
            <FileText size={12} />
            <span>{current.title}</span>
            <span>·</span>
            <span className="whitespace-nowrap md:whitespace-normal">Updated {current.updated} ago</span>
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2 md:shrink">
            <motion.button
              type="button"
              {...m.hover}
              {...m.press}
              className="flex h-7 w-7 items-center justify-center"
              style={{ color: textSecondary }}
            >
              <Star size={13} />
            </motion.button>
            <motion.button
              type="button"
              {...m.hover}
              {...m.press}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold"
              style={{
                background: brandTint,
                color: text,
                borderRadius: 8,
              }}
            >
              <Sparkles size={11} /> Ask AI
            </motion.button>
          </div>
        </div>

        <article className="px-4 py-8 sm:px-6 md:px-12 md:py-10">
          {/* Title */}
          <motion.div {...m.entrance} className="flex items-baseline gap-3">
            <span className="text-[42px] leading-none">{current.emoji}</span>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight">
              {current.title}
            </h1>
          </motion.div>

          {/* Meta row */}
          <motion.div
            {...delayed(m.entrance, 0.06)}
            className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]"
            style={{ color: textTertiary }}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar size={11} /> Updated {current.updated} ago
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Hash size={11} /> {TAGS.length} tags
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Pencil size={11} /> 3 collaborators
            </span>
          </motion.div>

          {/* Tags */}
          <motion.div {...delayed(m.entrance, 0.1)} className="mt-3 flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <span
                key={t}
                className="rounded px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: brandTint, color: textSecondary }}
              >
                #{t}
              </span>
            ))}
          </motion.div>

          {/* Body */}
          <motion.div {...delayed(m.entrance, 0.15)} className="mt-8 space-y-4">
            <p className="text-[15px] leading-relaxed">
              Ship Pixelmind 0.1.0 in time to attach it to the StyleSeed 2.0 launch. Hero asset is
              the same prompt across five LLMs with the verdict overlaid — converges from 67 → 87
              in three iterations.
            </p>

            <div
              className="rounded-lg p-4"
              style={{
                background: brandTint,
                borderLeft: `3px solid ${brand}`,
              }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: brand }}
              >
                Open question
              </div>
              <p className="mt-1 text-[13px]" style={{ color: text }}>
                Do we open the SDK as `@pixelmind/sdk` or wrap it in the StyleSeed monorepo so the
                rubric stays implicit? Open repo == clearer story; monorepo == less moving parts.
              </p>
            </div>

            <ul className="ms-5 list-disc space-y-1.5 text-[14px] leading-relaxed marker:text-slate-400">
              <li>Domain: pixelmind.dev (claimed); pixelmind.io as backup</li>
              <li>npm scope: @pixelmind (need org create)</li>
              <li>First README hero: before/after composite (already auto-generated)</li>
              <li>Show HN draft: emphasize Codex CLI zero-cost path</li>
            </ul>

            <p className="text-[15px] leading-relaxed">
              Next: rewrite the StyleSeed README intro paragraph to cross-link Pixelmind, then queue
              one X thread for Tuesday morning KST.
            </p>
          </motion.div>
        </article>
      </div>
    </div>
  );
}
