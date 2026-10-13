"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Bell, RefreshCw, Star, Wallet } from "lucide-react";

/**
 * The before/after proof. Both panels are REAL rendered UI (not screenshots),
 * built from the same brief: "revenue dashboard with KPIs and recent orders".
 * Left = what AI ships by default. Right = same model + 74 rules.
 */

const ORDERS = [
  { name: "Acme Corp", amount: "$8,400", status: "Completed", good: true },
  { name: "Nova Studio", amount: "$2,150", status: "In progress", good: false },
  { name: "Brightline", amount: "$5,720", status: "Completed", good: true },
];

const FIXES = [
  { n: 1, rule: "Rule 3", before: "Pure #000 headings", after: "Darkest text is #2A2A2A — 5-level grayscale hierarchy" },
  { n: 2, rule: "Rule 2", before: "Blue, green, purple, orange all fighting", after: "A clear action color with quieter supporting content in this example" },
  { n: 3, rule: "Rule 7", before: "1px gray borders on every box", after: "Tone and restrained depth separate these groups; borders fit other contexts" },
  { n: 4, rule: "Rule 4", before: "Number and unit the same size", after: "This summary uses 48px value / 24px unit; comparable table values may share size" },
  { n: 5, rule: "Rule 6", before: "Four identical KPI boxes in a row", after: "Sections vary by information role; equivalent comparisons may repeat" },
  { n: 6, rule: "Rule 1", before: "Content sits on bare background", after: "Cards group this consumer summary; other grammars use rows or flat sections" },
  { n: 7, rule: "Motion", before: "No motion, or a random fade", after: "A purposeful entrance with a complete reduced-motion result; a seed is optional" },
];

export function Comparison() {
  const [replay, setReplay] = useState(0);

  return (
    <>
      {/* panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── BEFORE ── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700">
              Before
            </span>
            <span className="text-[13px] font-semibold text-neutral-500">
              Generic AI output — functionally fine, visually mush
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {/* deliberately rule-breaking UI */}
            <div className="bg-white p-5" style={{ color: "#000" }}>
              <div className="flex items-center justify-between border-b border-gray-300 pb-3">
                <h2 className="text-xl font-bold" style={{ color: "#000" }}>Dashboard</h2>
                <Bell size={20} style={{ color: "#7C3AED" }} />
              </div>

              <p className="mt-4 text-lg font-bold" style={{ color: "#000" }}>
                Total Revenue: $3,800,000 USD
                <span className="ml-2 text-lg font-bold" style={{ color: "#16A34A" }}>+12.4%</span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { l: "Revenue", v: "$48,200", c: "#2563EB" },
                  { l: "Orders", v: "127", c: "#16A34A" },
                  { l: "Users", v: "1,043", c: "#7C3AED" },
                  { l: "Refunds", v: "$310", c: "#EA580C" },
                ].map((k) => (
                  <div key={k.l} className="border border-gray-300 p-3">
                    <p className="text-sm" style={{ color: "#000" }}>{k.l}</p>
                    <p className="text-lg font-bold" style={{ color: k.c }}>{k.v}</p>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-gray-300" />

              <h3 className="text-lg font-bold" style={{ color: "#000" }}>Recent Orders</h3>
              <div className="mt-2">
                {ORDERS.map((o) => (
                  <div key={o.name} className="flex justify-between border border-gray-300 p-3" style={{ marginTop: 6 }}>
                    <span className="text-base" style={{ color: "#000" }}>{o.name}</span>
                    <span className="text-base font-bold" style={{ color: o.good ? "#16A34A" : "#EA580C" }}>
                      {o.status} · {o.amount}
                    </span>
                  </div>
                ))}
              </div>

              <button className="mt-4 w-full p-3 text-base font-bold text-white" style={{ background: "#2563EB" }}>
                View Full Report
              </button>
            </div>
          </div>
        </section>

        {/* ── AFTER ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                After
              </span>
              <span className="text-[13px] font-semibold text-neutral-500">
                Same brief + StyleSeed&rsquo;s 74 rules
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplay((r) => r + 1)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-200"
            >
              <RefreshCw size={11} /> replay
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-sm" style={{ background: "#FAFAFA" }}>
            <motion.div
              key={replay}
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}
              className="p-5"
              style={{ color: "#2A2A2A" }}
            >
              {/* header */}
              <Rise>
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "#2A2A2A" }}>Dashboard</h2>
                  <Bell size={18} style={{ color: "#9B9B9B" }} />
                </div>
              </Rise>

              {/* hero — 2:1 number/unit, single accent kept for trend only */}
              <Rise>
                <div className="mt-4 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#7A7A7A" }}>
                    <Wallet size={13} /> Total revenue this month
                  </div>
                  <p className="mt-2 leading-none">
                    <span className="text-[48px] font-bold tracking-tight" style={{ color: "#2A2A2A" }}>3.8</span>
                    <span className="ml-1 text-[24px] font-bold" style={{ color: "#9B9B9B" }}>M</span>
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[13px] font-bold" style={{ color: "#3182F6" }}>
                    <ArrowUpRight size={14} /> +12.4% <span className="font-normal" style={{ color: "#9B9B9B" }}>vs last month</span>
                  </p>
                </div>
              </Rise>

              {/* varied KPIs — one trend, one progress (Rule 62: never identical) */}
              <Rise>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)" }}>
                    <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#7A7A7A" }}>Today</p>
                    <p className="mt-1 leading-none">
                      <span className="text-[28px] font-bold" style={{ color: "#2A2A2A" }}>48.2</span>
                      <span className="ml-0.5 text-[14px] font-bold" style={{ color: "#9B9B9B" }}>K</span>
                    </p>
                    <p className="mt-1 text-[12px] font-bold" style={{ color: "#3182F6" }}>+8.2%</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)" }}>
                    <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#7A7A7A" }}>Monthly goal</p>
                    <p className="mt-1 leading-none">
                      <span className="text-[28px] font-bold" style={{ color: "#2A2A2A" }}>76</span>
                      <span className="ml-0.5 text-[14px] font-bold" style={{ color: "#9B9B9B" }}>%</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: "76%", background: "#3182F6" }} />
                    </div>
                  </div>
                </div>
              </Rise>

              {/* list — grayscale status + dot, amounts emphasized */}
              <Rise>
                <div className="mt-3 rounded-2xl bg-white p-2" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)" }}>
                  <p className="px-3 pt-2 text-[14px] font-bold" style={{ color: "#2A2A2A" }}>Recent orders</p>
                  {ORDERS.map((o) => (
                    <div key={o.name} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="text-[14px] font-bold" style={{ color: "#3C3C3C" }}>{o.name}</p>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: o.good ? "#22C55E" : "#D97706" }}>
                          <span className="inline-block size-1.5 rounded-full" style={{ background: o.good ? "#22C55E" : "#D97706" }} />
                          {o.status}
                        </p>
                      </div>
                      <span className="text-[17px] font-bold" style={{ color: "#2A2A2A" }}>{o.amount}</span>
                    </div>
                  ))}
                </div>
              </Rise>

              {/* single CTA — the one accent */}
              <Rise>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 w-full rounded-xl py-3.5 text-[14px] font-bold text-white"
                  style={{ background: "#3182F6" }}
                >
                  View full report
                </motion.button>
              </Rise>
            </motion.div>
          </div>
        </section>
      </div>

      {/* annotated fixes */}
      <section className="mt-14">
        <h2 className="text-[24px] font-bold tracking-tight">What changed — and which rule did it</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIXES.map((f) => (
            <div key={f.n} className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)" }}>
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">{f.rule}</span>
              <p className="mt-3 text-[13px] leading-snug text-red-600/80 line-through decoration-red-300">{f.before}</p>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-neutral-800">{f.after}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[14px] text-neutral-500">
          These 7 are the visible ones. The full design language has{" "}
          <a href="https://github.com/bitjaru/styleseed/blob/main/engine/DESIGN-LANGUAGE.md" className="font-semibold text-neutral-900 underline underline-offset-2">
            74 rules
          </a>{" "}
          — color discipline, spatial rhythm, hierarchy, elevation, component variance, motion.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col items-start gap-4 rounded-2xl bg-neutral-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[20px] font-bold">Give your AI the judgment.</div>
          <div className="mt-1 text-[14px] text-neutral-400">
            MIT licensed. Works with Claude Code, Codex & Cursor out of the box.
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/bitjaru/styleseed"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-transform hover:scale-[1.03]"
          >
            <Star size={15} className="fill-amber-400 text-amber-400" /> Star on GitHub
          </a>
          <Link
            href="/showcase"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 px-5 py-3 text-[14px] font-bold text-white transition-colors hover:border-neutral-500"
          >
            See 11 full builds <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}

function Rise({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
      }}
    >
      {children}
    </motion.div>
  );
}
