"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { PromptBox } from "./prompt-box";
import { GithubIcon } from "./github-icon";

const STATS = [
  { value: "74", label: "design rules" },
  { value: "19", label: "AI skills" },
  { value: "7", label: "brand skins" },
  { value: "5", label: "motion seeds" },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] },
  },
};

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-white via-white to-neutral-50">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center"
      >
        {/* badge — entrance, then a soft breathing glow */}
        <motion.div variants={item} className="inline-block">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px rgba(139,92,246,0)",
                "0 0 22px rgba(139,92,246,0.45)",
                "0 0 0px rgba(139,92,246,0)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-neutral-600"
          >
            <Sparkles size={11} className="text-violet-500" />
            A thinking framework for UI · Claude Code, Codex & Cursor
          </motion.div>
        </motion.div>

        <motion.h1
          variants={item}
          className="mx-auto mt-7 max-w-3xl text-[clamp(40px,7vw,68px)] font-bold leading-[1.04] tracking-tight text-neutral-900"
        >
          Teach your AI design <GradientWord>judgment</GradientWord>.{" "}
          <br className="hidden sm:block" />
          Not just components.
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-600"
        >
          Your AI ships default-indigo, icon-chip, template UI. StyleSeed hands it 74 rules of
          designer judgment — and a quality gate that fixes the tells before you see them.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-3 text-[11px] font-bold uppercase tracking-widest text-neutral-400"
        >
          MIT licensed · open source
        </motion.div>

        {/* primary action — the one-paste prompt */}
        <motion.div variants={item} className="mx-auto mt-9 max-w-2xl">
          <p className="text-[14px] font-bold text-neutral-700">
            Try it in 30 seconds — paste into Claude Code, Cursor, or Codex
          </p>
          <div className="mt-3">
            <PromptBox />
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <a
            href="https://github.com/bitjaru/styleseed"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-[14px] font-bold text-neutral-900 transition-colors hover:border-neutral-900"
          >
            <GithubIcon size={15} />
            Star on GitHub
            <span className="font-semibold text-neutral-500">★ 680+</span>
          </a>
          <Link
            href="/how-it-thinks"
            className="inline-flex items-center gap-1 text-[14px] font-semibold text-violet-600 hover:underline"
          >
            See how it thinks
            <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* visual proof — the same product, agent-defaults vs StyleSeed rules */}
        <motion.figure variants={item} className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
            <Image
              src="/v26-compare.png"
              alt="The same product built by an AI agent's defaults versus with StyleSeed's rules — before shows default indigo, gradient text, and placeholder mocks; after shows a chosen accent, the real product, and one focal point."
              width={1516}
              height={1008}
              priority
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 text-[13px] text-neutral-500">
            Same product, same prompt — only the rules changed. This page scored 58/100 on our own
            gate first.{" "}
            <Link href="/scorecard" className="font-semibold text-violet-600 hover:underline">
              See the receipt →
            </Link>
          </figcaption>
        </motion.figure>

        <motion.dl
          variants={item}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <dt className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                {s.label}
              </dt>
              <dd className="mt-1 text-[32px] font-bold tracking-tight text-neutral-900">
                {s.value}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}

function GradientWord({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{
        backgroundImage: "linear-gradient(90deg,#8B5CF6,#3182F6,#4ECDC4,#8B5CF6)",
        backgroundSize: "300% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </motion.span>
  );
}
