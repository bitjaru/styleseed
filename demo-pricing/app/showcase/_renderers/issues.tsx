"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Circle, CircleDot, CircleCheck, CircleDashed, ChevronDown, Filter, Plus, Search } from "lucide-react";
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

type Status = "backlog" | "todo" | "doing" | "review" | "done";
type Priority = "urgent" | "high" | "med" | "low";

type Issue = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee: string;
  labels: string[];
};

const ISSUES: Issue[] = [
  { id: "ENG-432", title: "Fix login flow regression on Safari", status: "backlog", priority: "high", assignee: "sam", labels: ["bug", "auth"] },
  { id: "ENG-431", title: "Spec: token rotation policy", status: "backlog", priority: "med", assignee: "alex", labels: ["spec"] },
  { id: "ENG-429", title: "Webhook retry exponential backoff", status: "backlog", priority: "low", assignee: "kim", labels: ["infra"] },
  { id: "ENG-428", title: "Reduce icon bundle weight", status: "backlog", priority: "low", assignee: "jordan", labels: ["perf"] },
  { id: "ENG-425", title: "Refactor auth middleware", status: "doing", priority: "urgent", assignee: "alex", labels: ["auth", "refactor"] },
  { id: "ENG-422", title: "Migrate analytics to Tinybird", status: "doing", priority: "high", assignee: "kim", labels: ["data"] },
  { id: "ENG-420", title: "Dashboard skeleton states", status: "doing", priority: "med", assignee: "sam", labels: ["ui"] },
  { id: "ENG-418", title: "Image optimization pipeline", status: "review", priority: "high", assignee: "jordan", labels: ["perf", "infra"] },
  { id: "ENG-415", title: "Dark mode token sweep", status: "review", priority: "med", assignee: "sam", labels: ["ui"] },
  { id: "ENG-411", title: "Migrate to Tailwind v4", status: "done", priority: "med", assignee: "alex", labels: ["upgrade"] },
  { id: "ENG-409", title: "Add session telemetry", status: "done", priority: "low", assignee: "kim", labels: ["data"] },
  { id: "ENG-405", title: "Sidebar layout rewrite", status: "done", priority: "high", assignee: "jordan", labels: ["ui"] },
];

const COLUMNS: { id: Status; label: string; icon: typeof Circle }[] = [
  { id: "backlog", label: "Backlog", icon: CircleDashed },
  { id: "doing", label: "In Progress", icon: CircleDot },
  { id: "review", label: "In Review", icon: Circle },
  { id: "done", label: "Done", icon: CircleCheck },
];

const FILTERS = ["all", "mine", "urgent", "ui", "infra"] as const;
type Filter = (typeof FILTERS)[number];

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "var(--destructive, #C85A54)",
  high: "var(--warning, #F59E0B)",
  med: "var(--text-secondary, #6a6a6a)",
  low: "var(--text-tertiary, #9b9b9b)",
};

const PRIORITY_GLYPH: Record<Priority, string> = {
  urgent: "■■■",
  high: "■■",
  med: "■",
  low: "·",
};

const AVATAR_TINT: Record<string, string> = {
  sam: "#F472B6",
  alex: "#60A5FA",
  kim: "#34D399",
  jordan: "#FBBF24",
};

export function IssuesPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const [filter, setFilter] = useState<Filter>("all");

  const surfacePage = "var(--surface-page, var(--background, #fafafa))";
  const card = "var(--card, #ffffff)";
  const text = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9a9a9a))";
  const border = "var(--border, rgba(0,0,0,0.08))";
  const brand = "var(--brand, #5E6AD2)";
  const brandTint = "var(--brand-tint, rgba(94,106,210,0.08))";
  // Borderless cards — light shadow keeps Linear's flat feel without a hairline
  const cardShadow = "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)";

  const visible = ISSUES.filter((iss) => {
    if (filter === "all") return true;
    if (filter === "mine") return iss.assignee === "sam";
    if (filter === "urgent") return iss.priority === "urgent" || iss.priority === "high";
    return iss.labels.includes(filter);
  });

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
      {/* Top bar */}
      <header
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-6 w-6 items-center justify-center text-[12px] font-bold text-white"
            style={{ background: brand, borderRadius: 6 }}
          >
            L
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold tracking-tight">Engine</span>
            <span style={{ color: textTertiary }}>·</span>
            <span className="text-[13px]" style={{ color: textSecondary }}>
              Active issues
            </span>
            <span
              className="ms-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: brandTint, color: brand }}
            >
              {visible.length}
            </span>
          </div>
        </div>
        <div className="flex grow flex-wrap items-center gap-2 lg:grow-0 lg:flex-nowrap">
          <SearchPill textSecondary={textSecondary} border={border} card={card} />
          <IconChip motion={m} icon={Filter} text={textSecondary} card={card} border={border} />
          <PrimaryChip motion={m} brand={brand}>
            <Plus size={12} />
            New issue
          </PrimaryChip>
        </div>
      </header>

      {/* Filter chips */}
      <motion.div
        {...m.entrance}
        className="flex flex-wrap items-center gap-2 px-6 py-3"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: textTertiary }}
        >
          Filter
        </span>
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            motion={m}
            active={filter === f}
            onPick={() => setFilter(f)}
            brand={brand}
            brandTint={brandTint}
            textSecondary={textSecondary}
            border={border}
          >
            {f}
          </FilterChip>
        ))}
        <span className="ms-auto whitespace-nowrap text-[11px]" style={{ color: textTertiary }}>
          Updated 09:42 KST
        </span>
      </motion.div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col, ci) => {
          const items = visible.filter((iss) => iss.status === col.id);
          return (
            <motion.section key={col.id} {...delayed(m.entrance, 0.08 + ci * 0.05)}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <col.icon size={13} style={{ color: textSecondary }} />
                  <span
                    className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: textSecondary }}
                  >
                    {col.label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: textTertiary }}>
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  style={{ color: textTertiary, fontSize: 11 }}
                  className="flex h-5 w-5 items-center justify-center"
                  title="Add to column"
                >
                  <Plus size={11} />
                </button>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((iss, i) => (
                    <motion.article
                      key={iss.id}
                      {...delayed(m.entrance, 0.15 + ci * 0.04 + i * 0.04)}
                      {...m.exit}
                      {...m.hover}
                      {...m.layout}
                      style={{
                        background: card,
                        borderRadius: 10,
                        boxShadow: cardShadow,
                        padding: 12,
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: textTertiary, fontFamily: "ui-monospace, monospace" }}>
                          {iss.id}
                        </span>
                        <span
                          className="font-mono"
                          title={`priority: ${iss.priority}`}
                          style={{ color: PRIORITY_COLOR[iss.priority] }}
                        >
                          {PRIORITY_GLYPH[iss.priority]}
                        </span>
                      </div>
                      <p
                        className="mt-1.5 text-[13px] font-semibold leading-snug"
                        style={{ color: text }}
                      >
                        {iss.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {iss.labels.map((l) => (
                            <span
                              key={l}
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: brandTint,
                                color: brand,
                              }}
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                        <div
                          className="flex h-5 w-5 items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            background: AVATAR_TINT[iss.assignee] ?? brand,
                            borderRadius: 999,
                          }}
                          title={iss.assignee}
                        >
                          {iss.assignee[0]?.toUpperCase()}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

function SearchPill({
  textSecondary,
  border,
  card,
}: {
  textSecondary: string;
  border: string;
  card: string;
}) {
  return (
    <div
      className="flex basis-full items-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:basis-auto sm:grow lg:min-w-[200px] lg:grow-0"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 8,
        color: textSecondary,
      }}
    >
      <Search size={11} />
      <span className="flex-1 whitespace-nowrap">Search issues…</span>
      <kbd
        className="rounded px-1 py-0.5 text-[9px] font-bold"
        style={{ background: "rgba(0,0,0,0.05)" }}
      >
        ⌘K
      </kbd>
    </div>
  );
}

function IconChip({
  motion: m,
  icon: Icon,
  text,
  card,
  border,
}: {
  motion: (typeof seeds)[SeedId];
  icon: typeof Filter;
  text: string;
  card: string;
  border: string;
}) {
  return (
    <motion.button
      type="button"
      {...m.hover}
      {...m.press}
      className="flex h-7 items-center gap-1.5 px-2 text-[11px] font-semibold"
      style={{
        background: card,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 8,
      }}
    >
      <Icon size={12} />
      Filter
      <ChevronDown size={11} />
    </motion.button>
  );
}

function PrimaryChip({
  motion: m,
  brand,
  children,
}: {
  motion: (typeof seeds)[SeedId];
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      {...m.hover}
      {...m.press}
      className="flex h-7 items-center gap-1.5 px-2.5 text-[11px] font-bold text-white"
      style={{ background: brand, borderRadius: 8 }}
    >
      {children}
    </motion.button>
  );
}

function FilterChip({
  motion: m,
  active,
  onPick,
  brand,
  brandTint,
  textSecondary,
  border,
  children,
}: {
  motion: (typeof seeds)[SeedId];
  active: boolean;
  onPick: () => void;
  brand: string;
  brandTint: string;
  textSecondary: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      {...m.press}
      className="rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
      style={{
        background: active ? brandTint : "transparent",
        color: active ? brand : textSecondary,
        border: active ? `1px solid ${brand}` : `1px solid ${border}`,
      }}
    >
      {children}
    </motion.button>
  );
}
