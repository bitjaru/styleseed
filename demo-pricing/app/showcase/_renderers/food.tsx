"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Minus,
  Plus,
  Search,
  ShoppingBag,
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

const CATEGORIES = ["🍔 Burgers", "🍕 Pizza", "🍜 Noodles", "🥗 Salad", "🍰 Dessert", "☕ Cafe"];

const RESTAURANTS = [
  { id: 1, name: "Shake & Stack", tag: "Burgers · American", rating: 4.8, time: "20–30", fee: "Free", emoji: "🍔", promo: "20% off" },
  { id: 2, name: "Forno Vero", tag: "Pizza · Italian", rating: 4.7, time: "25–35", fee: "$1.99", emoji: "🍕" },
  { id: 3, name: "Slurp House", tag: "Ramen · Japanese", rating: 4.9, time: "15–25", fee: "Free", emoji: "🍜", promo: "New" },
  { id: 4, name: "Green Bowl", tag: "Salad · Healthy", rating: 4.6, time: "10–20", fee: "$0.99", emoji: "🥗" },
];

export function FoodPage({ skin, seed: seedId }: { skin: string; seed: SeedId }) {
  const m = seeds[seedId];
  const [cart, setCart] = useState(2);

  const page = "var(--surface-page, var(--background, #FAF8F5))";
  const card = "var(--card, #ffffff)";
  const text = "var(--text-primary, var(--foreground, #1a1a1a))";
  const textSecondary = "var(--text-secondary, var(--muted-foreground, #6a6a6a))";
  const textTertiary = "var(--text-tertiary, var(--muted-foreground, #9a9a9a))";
  const brand = "var(--brand, #FF5E7E)";
  const brandFg = "var(--brand-foreground, #ffffff)";
  const brandTint = "var(--brand-tint, rgba(255,94,126,0.1))";
  const gradient = "var(--gradient-brand, var(--brand, #FF5E7E))";
  const shadow = "0 1px 2px rgba(0,0,0,0.03), 0 6px 16px rgba(0,0,0,0.05)";
  const radius = "20px";

  return (
    <div
      key={seedId}
      style={{
        background: page,
        color: text,
        minHeight: 640,
        padding: "40px 20px",
        fontFamily: "var(--font-display, var(--font-inter), Inter, system-ui, sans-serif)",
      }}
      className="flex items-start justify-center"
    >
      <div className="flex w-full min-w-0 max-w-[400px] flex-col gap-4">
        {/* Location + cart */}
        <motion.header {...m.entrance} className="flex items-center justify-between px-1">
          <div>
            <div className="text-[11px] font-semibold" style={{ color: textTertiary }}>
              DELIVER TO
            </div>
            <div className="flex items-center gap-1 text-[15px] font-bold">
              Gangnam, Seoul <ChevronRight size={14} style={{ color: textSecondary }} />
            </div>
          </div>
          <motion.button
            type="button"
            {...m.hover}
            {...m.press}
            onClick={() => setCart((c) => c + 1)}
            className="relative flex h-11 w-11 items-center justify-center"
            style={{ background: card, borderRadius: 14, boxShadow: shadow, color: text }}
          >
            <ShoppingBag size={18} />
            <AnimatePresence>
              {cart > 0 && (
                <motion.span
                  key={cart}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: { type: "spring", stiffness: 500, damping: 18 } }}
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: brand, color: brandFg }}
                >
                  {cart}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.header>

        {/* Search */}
        <motion.div
          {...delayed(m.entrance, 0.05)}
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: card, borderRadius: 14, boxShadow: shadow, color: textTertiary }}
        >
          <Search size={16} />
          <span className="text-[14px]">Search restaurants or dishes</span>
        </motion.div>

        {/* Promo hero */}
        <motion.div
          {...delayed(m.entrance, 0.1)}
          {...m.hover}
          className="relative overflow-hidden p-5"
          style={{ background: gradient, color: brandFg, borderRadius: radius }}
        >
          <div className="text-[12px] font-bold uppercase tracking-widest opacity-90">
            Today only
          </div>
          <div className="mt-1 text-[24px] font-bold leading-tight">
            Free delivery
            <br />
            over $20
          </div>
          <div className="mt-2 text-[12px] opacity-90">Use code FRESH20 at checkout</div>
          <div className="absolute -right-4 -top-2 text-[80px] opacity-20">🛵</div>
        </motion.div>

        {/* Categories */}
        <motion.div
          {...delayed(m.entrance, 0.15)}
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              type="button"
              className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold"
              style={{
                background: i === 0 ? brand : card,
                color: i === 0 ? brandFg : text,
                boxShadow: i === 0 ? "none" : shadow,
              }}
            >
              {c}
            </button>
          ))}
        </motion.div>

        {/* Restaurant feed */}
        <div className="flex items-baseline justify-between px-1 pt-1">
          <div className="text-[16px] font-bold">Popular near you</div>
          <button type="button" className="text-[12px] font-bold" style={{ color: brand }}>
            See all
          </button>
        </div>

        <div className="space-y-3">
          {RESTAURANTS.map((r, i) => (
            <motion.div
              key={r.id}
              {...delayed(m.entrance, 0.2 + i * 0.05)}
              {...m.hover}
              className="flex items-center gap-3 p-3"
              style={{ background: card, borderRadius: radius, boxShadow: shadow, cursor: "pointer" }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center text-[32px]"
                style={{ background: brandTint, borderRadius: 16 }}
              >
                {r.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-bold">{r.name}</span>
                  {r.promo && (
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: brandTint, color: brand }}
                    >
                      {r.promo}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[12px]" style={{ color: textTertiary }}>
                  {r.tag}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px]" style={{ color: textSecondary }}>
                  <span className="flex items-center gap-1 whitespace-nowrap font-bold" style={{ color: text }}>
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    {r.rating}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock size={11} />
                    {r.time} min
                  </span>
                  <span
                    className="whitespace-nowrap"
                    style={{ color: r.fee === "Free" ? "var(--success, #6B9B7A)" : textSecondary }}
                  >
                    {r.fee === "Free" ? "Free delivery" : r.fee}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sticky cart bar */}
        <motion.div
          {...delayed(m.entrance, 0.4)}
          className="flex flex-wrap items-center justify-between gap-2 p-2 sm:pl-4"
          style={{ background: gradient, color: brandFg, borderRadius: radius, boxShadow: shadow }}
        >
          <div className="flex items-center gap-3 ps-2 sm:ps-0">
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-1">
              <button
                type="button"
                onClick={() => setCart((c) => Math.max(0, c - 1))}
                className="flex h-7 w-7 items-center justify-center"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-4 text-center text-[14px] font-bold">{cart}</span>
              <button
                type="button"
                onClick={() => setCart((c) => c + 1)}
                className="flex h-7 w-7 items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="whitespace-nowrap text-[13px] font-bold">items in cart</span>
          </div>
          <motion.button
            type="button"
            {...m.press}
            className="grow whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[13px] font-bold sm:grow-0"
            style={{ color: brand }}
          >
            Checkout · $24.80
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
