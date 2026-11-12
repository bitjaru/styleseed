"use client";

import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  ScanLine,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { useState } from "react";
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

/**
 * Mobile wallet showcase — Toss-style consumer banking layout.
 *
 * Strict borderless discipline: every "card" is separated from the
 * page by either surface tone (subtly lighter background on white
 * page, subtly darker on dark page) or a soft shadow — never a
 * hairline border. Generous internal padding. Big numbers.
 */
export function WalletPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const [balanceShown, setBalanceShown] = useState(true);

  // Toss-style page background sits slightly cooler than card.
  const page = "var(--surface-page, var(--background, #F2F4F6))";
  const card = "var(--card, #ffffff)";
  const cardSoft = "var(--surface-subtle, var(--card, #ffffff))";
  const text = "var(--text-primary, var(--foreground, #1A1A1A))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6A6A6A))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9A9A9A))";
  const brand = "var(--brand, #3182F6)";
  const brandTint = "var(--brand-tint, rgba(49,130,246,0.08))";
  const success = "var(--success, #6B9B7A)";
  const destructive = "var(--destructive, #C85A54)";

  // Toss signature soft shadow: barely visible, suggests elevation by tone alone.
  const softShadow = "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.04)";
  const radius = "20px";

  const recentTx = [
    { id: 1, label: "Starbucks 강남역점", time: "오늘 09:24", amount: -5400, kind: "coffee" },
    { id: 2, label: "급여 입금 — Acme Corp", time: "오늘 09:00", amount: 3200000, kind: "salary" },
    { id: 3, label: "지하철 환승", time: "어제 22:14", amount: -1450, kind: "transit" },
    { id: 4, label: "쿠팡 정기결제", time: "어제 18:02", amount: -8900, kind: "shopping" },
    { id: 5, label: "유진님께 송금", time: "어제 13:40", amount: -50000, kind: "send" },
  ];

  return (
    <div
      key={seedId}
      style={{
        background: page,
        color: text,
        minHeight: 640,
        padding: "40px 20px",
        fontFamily:
          "var(--font-display, 'Pretendard', var(--font-inter), Inter, system-ui, sans-serif)",
      }}
      className="flex items-start justify-center"
    >
      <div
        className="flex flex-col gap-3"
        style={{ width: 400 }}
      >
        {/* Greeting */}
        <motion.header
          {...m.entrance}
          className="flex items-center justify-between px-2"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{
                background: brandTint,
                color: brand,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              SC
            </div>
            <div className="leading-tight">
              <div className="text-[13px]" style={{ color: textSecondary }}>
                좋은 아침이에요
              </div>
              <div className="text-[15px] font-bold">Sam님</div>
            </div>
          </div>
          <motion.button
            type="button"
            {...m.press}
            className="relative flex h-10 w-10 items-center justify-center"
            style={{ background: card, borderRadius: 14, boxShadow: softShadow, color: text }}
          >
            <Bell size={16} />
            <span
              aria-hidden
              className="absolute right-2 top-2 block h-1.5 w-1.5 rounded-full"
              style={{ background: destructive }}
            />
          </motion.button>
        </motion.header>

        {/* Balance hero card — fully borderless, shadow-only */}
        <motion.section
          {...delayed(m.entrance, 0.06)}
          {...m.hover}
          style={{
            background: card,
            borderRadius: radius,
            padding: 24,
            boxShadow: softShadow,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold" style={{ color: textSecondary }}>
              내 통장 잔액
            </div>
            <motion.button
              type="button"
              {...m.press}
              onClick={() => setBalanceShown((v) => !v)}
              className="flex h-7 w-7 items-center justify-center"
              style={{ color: textTertiary }}
            >
              {balanceShown ? <Eye size={14} /> : <EyeOff size={14} />}
            </motion.button>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
            <span
              className="text-[34px] font-bold leading-none tracking-tight"
              style={{ color: text, letterSpacing: "-0.02em" }}
            >
              {balanceShown ? "2,840,300" : "•••••••••"}
            </span>
            <span className="text-[15px] font-bold" style={{ color: textSecondary }}>
              원
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold">
            <TrendingUp size={11} style={{ color: success }} />
            <span className="whitespace-nowrap" style={{ color: success }}>+ 184,200원</span>
            <span style={{ color: textTertiary }}>지난 30일</span>
          </div>

          <div
            className="mt-4 -mx-6 flex items-center justify-between px-6 pt-4"
            style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 text-[12px] font-bold"
              style={{ color: brand }}
            >
              <CreditCard size={12} />
              연결 계좌 3개
              <ChevronRight size={12} />
            </button>
            <button
              type="button"
              className="text-[12px] font-bold"
              style={{ color: textTertiary }}
            >
              내역
            </button>
          </div>
        </motion.section>

        {/* Quick actions — 4 borderless tiles */}
        <motion.section
          {...delayed(m.entrance, 0.12)}
          className="grid grid-cols-4 gap-2"
          style={{ background: card, borderRadius: radius, padding: 14, boxShadow: softShadow }}
        >
          {[
            { icon: ArrowUpRight, label: "보내기" },
            { icon: ArrowDownLeft, label: "받기" },
            { icon: ScanLine, label: "결제" },
            { icon: Plus, label: "충전" },
          ].map((action) => (
            <motion.button
              key={action.label}
              type="button"
              {...m.hover}
              {...m.press}
              className="flex flex-col items-center gap-1.5 py-2 text-[11px] font-bold"
              style={{ color: text }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center"
                style={{ background: brandTint, color: brand, borderRadius: 14 }}
              >
                <action.icon size={18} />
              </span>
              {action.label}
            </motion.button>
          ))}
        </motion.section>

        {/* Spending pulse — borderless soft block */}
        <motion.section
          {...delayed(m.entrance, 0.18)}
          {...m.hover}
          style={{
            background: card,
            borderRadius: radius,
            padding: 20,
            boxShadow: softShadow,
          }}
        >
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[12px] font-semibold" style={{ color: textSecondary }}>
                이번 주 지출
              </div>
              <div className="mt-1 whitespace-nowrap text-[20px] font-bold" style={{ letterSpacing: "-0.01em" }}>
                182,400 <span style={{ color: textSecondary, fontSize: 13 }}>원</span>
              </div>
            </div>
            <span
              className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: brandTint, color: brand }}
            >
              평균보다 12% ↓
            </span>
          </div>
          <div className="mt-4 flex h-10 items-end gap-1.5">
            {[14, 18, 12, 22, 30, 16, 25].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-md"
                style={{
                  height: `${v * 3}%`,
                  background: i === 4 ? brand : brandTint,
                  minHeight: 6,
                }}
              />
            ))}
          </div>
          <div
            className="mt-2 flex justify-between text-[10px]"
            style={{ color: textTertiary }}
          >
            <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span>
          </div>
        </motion.section>

        {/* Recent transactions — list rows with no row dividers (tone only) */}
        <motion.section
          {...delayed(m.entrance, 0.24)}
          style={{
            background: card,
            borderRadius: radius,
            padding: "8px 4px",
            boxShadow: softShadow,
          }}
        >
          <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
            <div className="text-[14px] font-bold">최근 거래</div>
            <button
              type="button"
              className="text-[12px] font-bold"
              style={{ color: textTertiary }}
            >
              전체 보기
            </button>
          </div>
          <ul>
            {recentTx.map((tx, i) => (
              <motion.li
                key={tx.id}
                {...delayed(m.entrance, 0.28 + i * 0.04)}
                {...m.hover}
                className="flex items-center justify-between gap-2 px-4 py-2.5"
                style={{ cursor: "pointer" }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center text-[14px] font-bold"
                    style={{
                      background: iconBgFor(tx.kind, brandTint),
                      color: iconFgFor(tx.kind, brand),
                      borderRadius: 12,
                    }}
                  >
                    {emojiFor(tx.kind)}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-bold">{tx.label}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: textTertiary }}>
                      {tx.time}
                    </div>
                  </div>
                </div>
                <div
                  className="shrink-0 whitespace-nowrap text-[13px] font-bold"
                  style={{
                    color: tx.amount > 0 ? success : text,
                  }}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString("ko-KR")}원
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Footer hint */}
        <div
          className="px-4 py-2 text-center text-[11px]"
          style={{ color: textTertiary }}
        >
          <WalletIcon size={11} className="inline-block me-1" />
          모든 거래는 토스뱅크 약관에 따라 처리됩니다.
        </div>
      </div>
    </div>
  );
}

function emojiFor(kind: string): string {
  return {
    coffee: "☕",
    salary: "💼",
    transit: "🚇",
    shopping: "🛍",
    send: "➡️",
  }[kind] ?? "•";
}

function iconBgFor(_kind: string, brandTint: string): string {
  return brandTint;
}

function iconFgFor(_kind: string, brand: string): string {
  return brand;
}
