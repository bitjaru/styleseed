"use client";

import { motion } from "framer-motion";
import {
  Bell,
  CreditCard,
  Download,
  Filter,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { seeds, type SeedId } from "@engine/motion";
import type { EntranceRecipe } from "@engine/motion/contexts";

/** Add a `delay` to an entrance recipe without mutating the original. */
function delayed(recipe: EntranceRecipe, delay: number): EntranceRecipe {
  const animate = recipe.animate as Record<string, unknown>;
  const transition = (animate.transition as Record<string, unknown> | undefined) ?? {};
  return {
    initial: recipe.initial,
    animate: { ...animate, transition: { ...transition, delay } } as EntranceRecipe["animate"],
  };
}

/**
 * Toss-style finance dashboard.
 *
 * Reads skin via CSS variables on the wrapping `[data-skin]` and motion
 * via the seed prop. The `key={seed}` on the outer motion element forces
 * a fresh entrance every time the user toggles the seed so they actually
 * see what each personality feels like.
 */
export function FinancePage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const surfacePage = "var(--surface-page, var(--background, #fafafa))";
  const card = "var(--card, #ffffff)";
  const textPrimary = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #7a7a7a))";
  const border = "var(--border, rgba(0,0,0,0.08))";
  const brand = "var(--brand, #3182F6)";
  const brandTint = "var(--brand-tint, rgba(49,130,246,0.08))";
  const radius = "var(--radius, 16px)";
  // Borderless: cards float on tone + soft shadow, no hairline border (Toss discipline)
  const shadow = "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)";

  const kpis = [
    {
      label: "Today's Revenue",
      value: "48.2",
      unit: "K",
      trend: { value: "+8.2%", up: true },
      icon: Wallet,
    },
    {
      label: "Transactions",
      value: "1,284",
      unit: "",
      trend: { value: "+12.1%", up: true },
      icon: Receipt,
    },
    {
      label: "Avg Order Value",
      value: "37.54",
      unit: "USD",
      trend: { value: "-2.4%", up: false },
      icon: CreditCard,
    },
    {
      label: "Refund Rate",
      value: "1.8",
      unit: "%",
      trend: { value: "-0.3pt", up: true },
      icon: TrendingDown,
    },
  ];

  const trendData = [42, 38, 51, 47, 55, 49, 62, 58, 68, 64, 73, 81];

  const activities = [
    { name: "Northstar Studio", desc: "Subscription · Annual", amount: "+$842.00", time: "09:38" },
    { name: "Maple & Stone", desc: "One-time · Pro plan", amount: "+$199.00", time: "08:51" },
    { name: "Refund — Acme Co.", desc: "Order #41882", amount: "−$59.00", time: "08:24" },
    { name: "Glacier Labs", desc: "Subscription · Monthly", amount: "+$49.00", time: "08:02" },
    { name: "Northwind Designs", desc: "One-time · Starter", amount: "+$29.00", time: "07:47" },
  ];

  return (
    <div
      key={seedId}
      style={{
        background: surfacePage,
        color: textPrimary,
        fontFamily: "var(--font-display, var(--font-inter), Inter, system-ui, sans-serif)",
      }}
      className="min-h-[640px]"
    >
      {/* Top bar */}
      <header
        className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center font-bold text-white"
            style={{ background: brand, borderRadius: 10 }}
          >
            S
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">{skin.toUpperCase()} Bank</div>
            <div className="text-[12px]" style={{ color: textTertiary }}>
              May 29, 2026 · Daily summary
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton motion={m} icon={Search} />
          <IconButton motion={m} icon={Filter} />
          <IconButton motion={m} icon={Bell} hasBadge brand={brand} />
          <PrimaryButton motion={m} brand={brand}>
            <Download size={14} /> Export
          </PrimaryButton>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Hero metric */}
        <motion.section
          {...m.entrance}
          {...m.hover}
          className="relative overflow-hidden p-6 lg:p-7"
          style={{
            background: card,
            borderRadius: radius,
            boxShadow: shadow,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center"
              style={{ background: brandTint, borderRadius: 8 }}
            >
              <Wallet size={14} style={{ color: brand }} />
            </div>
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: textSecondary }}
            >
              Total Revenue This Month
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2 lg:gap-2">
            <span className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-[48px] font-bold leading-none tracking-tight">3.8</span>
              <span className="text-[24px] font-bold" style={{ color: textPrimary }}>
                M
              </span>
            </span>
            <span className="flex items-baseline gap-2 whitespace-nowrap lg:ms-3">
              <span
                className="inline-flex items-center gap-1 text-[13px] font-bold"
                style={{ color: "var(--success, #6B9B7A)" }}
              >
                <TrendingUp size={12} /> +12.4%
              </span>
              <span className="text-[12px]" style={{ color: textTertiary }}>
                vs last month
              </span>
            </span>
          </div>
          <Sparkline
            data={trendData}
            color={brand}
            className="ms-auto mt-4 block w-full max-w-[420px] opacity-60 lg:absolute lg:bottom-0 lg:right-0 lg:ms-0 lg:mt-0 lg:w-[420px]"
            width={420}
            height={120}
          />
        </motion.section>

        {/* KPI strip */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              {...delayed(m.entrance, 0.05 + i * 0.05)}
              {...m.hover}
              className="p-6 lg:p-5"
              style={{
                background: card,
                borderRadius: radius,
                boxShadow: shadow,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center"
                  style={{ background: brandTint, borderRadius: 8 }}
                >
                  <kpi.icon size={14} style={{ color: brand }} />
                </div>
                <span
                  className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: textSecondary }}
                >
                  {kpi.label}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-[28px] font-bold leading-none tracking-tight">
                  {kpi.value}
                </span>
                {kpi.unit && (
                  <span className="text-[15px] font-bold" style={{ color: textPrimary }}>
                    {kpi.unit}
                  </span>
                )}
              </div>
              <div
                className="mt-2 flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold"
                style={{
                  color: kpi.trend.up ? "var(--success, #6B9B7A)" : "var(--destructive, #C85A54)",
                }}
              >
                {kpi.trend.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {kpi.trend.value}
                <span className="ms-1 font-normal" style={{ color: textTertiary }}>
                  vs yesterday
                </span>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Chart + activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.section
            {...delayed(m.entrance, 0.25)}
            className="lg:col-span-2"
            style={{
              background: card,
              borderRadius: radius,
              boxShadow: shadow,
              padding: 24,
            }}
          >
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <div>
                <div className="text-[15px] font-bold tracking-tight">Revenue Trend</div>
                <div className="mt-0.5 text-[12px]" style={{ color: textTertiary }}>
                  Hourly net revenue · 00:00–09:42
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(["1D", "1W", "1M"] as const).map((p, i) => (
                  <Pill
                    key={p}
                    motion={m}
                    active={i === 1}
                    brand={brand}
                    textSecondary={textSecondary}
                  >
                    {p}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <BarChart data={trendData} color={brand} brandTint={brandTint} />
            </div>
            <div
              className="mt-4 grid grid-cols-3 gap-3 border-t pt-4"
              style={{ borderColor: border }}
            >
              <ChartStat label="Avg/hr" value="$4,128" textSecondary={textSecondary} />
              <ChartStat label="Peak" value="09:00" textSecondary={textSecondary} />
              <ChartStat label="vs 7-day" value="+5.6%" accent="var(--success, #6B9B7A)" textSecondary={textSecondary} />
            </div>
          </motion.section>

          <motion.section
            {...delayed(m.entrance, 0.3)}
            style={{
              background: card,
              borderRadius: radius,
              boxShadow: shadow,
              padding: 24,
            }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <div className="text-[15px] font-bold tracking-tight">Recent Activity</div>
              <span className="whitespace-nowrap text-[11px]" style={{ color: textTertiary }}>
                5 of 1,284
              </span>
            </div>
            <ul className="space-y-2">
              {activities.map((a) => (
                <motion.li
                  key={a.name}
                  {...m.layout}
                  {...m.hover}
                  className="flex items-center justify-between gap-4 rounded-lg p-2 cursor-pointer lg:gap-0"
                  style={{ background: "transparent" }}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold leading-tight">{a.name}</div>
                    <div className="text-[11px]" style={{ color: textTertiary }}>
                      {a.desc} · {a.time}
                    </div>
                  </div>
                  <div
                    className="shrink-0 whitespace-nowrap text-[13px] font-bold"
                    style={{
                      color: a.amount.startsWith("−")
                        ? "var(--destructive, #C85A54)"
                        : textPrimary,
                    }}
                  >
                    {a.amount}
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  motion: m,
  icon: Icon,
  hasBadge,
  brand,
}: {
  motion: (typeof seeds)[SeedId];
  icon: typeof Bell;
  hasBadge?: boolean;
  brand?: string;
}) {
  return (
    <motion.button
      {...m.hover}
      {...m.press}
      className="relative flex h-9 w-9 items-center justify-center"
      style={{
        background: "var(--card, #fff)",
        border: "1px solid var(--border, rgba(0,0,0,0.08))",
        borderRadius: 10,
        color: "var(--text-secondary, var(--muted-foreground, #6a6a6a))",
      }}
      type="button"
    >
      <Icon size={16} />
      {hasBadge && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{ background: brand ?? "#FF4444" }}
        />
      )}
    </motion.button>
  );
}

function PrimaryButton({
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
      {...m.hover}
      {...m.press}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold text-white"
      style={{ background: brand, borderRadius: 10 }}
      type="button"
    >
      {children}
    </motion.button>
  );
}

function Pill({
  motion: m,
  active,
  brand,
  textSecondary,
  children,
}: {
  motion: (typeof seeds)[SeedId];
  active: boolean;
  brand: string;
  textSecondary: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      {...m.press}
      className="rounded-md px-2.5 py-1 text-[11px] font-bold"
      style={{
        background: active ? brand : "transparent",
        color: active ? "#fff" : textSecondary,
        border: active ? "none" : "1px solid var(--border, rgba(0,0,0,0.08))",
      }}
      type="button"
    >
      {children}
    </motion.button>
  );
}

function ChartStat({
  label,
  value,
  textSecondary,
  accent,
}: {
  label: string;
  value: string;
  textSecondary: string;
  accent?: string;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: textSecondary }}
      >
        {label}
      </div>
      <div className="mt-1 whitespace-nowrap text-[15px] font-bold" style={{ color: accent ?? "inherit" }}>
        {value}
      </div>
    </div>
  );
}

function BarChart({
  data,
  color,
  brandTint,
}: {
  data: number[];
  color: string;
  brandTint: string;
}) {
  const max = Math.max(...data);
  const width = 600;
  const height = 140;
  const gap = 6;
  const barWidth = (width - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" style={{ maxWidth: "100%" }}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 16);
        const x = i * (barWidth + gap);
        const y = height - h;
        const isPeak = v === max;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={4}
              fill={isPeak ? color : brandTint}
            />
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({
  data,
  color,
  className,
  width,
  height,
}: {
  data: number[];
  color: string;
  className?: string;
  width: number;
  height: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id="spark-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill="url(#spark-fade)"
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}
