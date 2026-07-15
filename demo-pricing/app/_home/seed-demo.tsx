"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { seeds, type SeedId } from "@engine/motion";

const SEED_ORDER: SeedId[] = ["spring", "silk", "snap", "float", "pulse"];

/**
 * Two layers, live on the home page:
 *  1. Seeds (personality) — pick a vibe word, feel entrance/hover/press.
 *  2. Flair (showy named moves) — the scroll-stopping stuff, straight from
 *     the /motion library, so visitors see the flashy side immediately.
 */
export function SeedDemo() {
  const [active, setActive] = useState<SeedId>("spring");
  const [mounted, setMounted] = useState(true);
  const seed = seeds[active];

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_30px_80px_rgba(0,0,0,0.08)]">
      {/* ── Layer 1: personality seeds ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Personality · pick a vibe word
          </div>
          <div className="mt-1 text-[15px] font-semibold text-neutral-900">
            {seed.name} · {seed.vibe}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMounted((m) => !m)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-white"
        >
          {mounted ? "Replay" : "Add"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SEED_ORDER.map((id) => {
          const s = seeds[id];
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActive(id);
                setMounted(false);
                setTimeout(() => setMounted(true), 80);
              }}
              className={
                "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors " +
                (isActive
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")
              }
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DemoCell label="Entrance" desc="how it appears">
          <div className="flex h-20 items-center justify-center">
            {mounted && (
              <motion.div
                key={`${active}-mount`}
                {...seed.entrance}
                className="h-11 w-11 rounded-xl"
                style={{ background: SEED_COLOR[active] }}
              />
            )}
          </div>
        </DemoCell>
        <DemoCell label="Hover" desc="point at the square">
          <div className="flex h-20 items-center justify-center">
            <motion.div
              {...seed.hover}
              className="h-11 w-11 cursor-pointer rounded-xl"
              style={{ background: SEED_COLOR[active] }}
            />
          </div>
        </DemoCell>
        <DemoCell label="Press" desc="tap the button">
          <div className="flex h-20 items-center justify-center">
            <motion.button
              type="button"
              {...seed.press}
              {...seed.hover}
              className="rounded-lg px-4 py-2 text-[13px] font-bold text-white"
              style={{ background: SEED_COLOR[active] }}
            >
              Tap me
            </motion.button>
          </div>
        </DemoCell>
      </div>

      {/* ── Layer 2: flashy named moves ── */}
      <div className="mt-7 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          Flair · scroll-stopping named moves
        </div>
        <Link
          href="/motion"
          className="inline-flex items-center gap-1 text-[12px] font-bold text-violet-600 hover:text-violet-800"
        >
          20+ moves <ArrowRight size={13} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FlairCell keyword="tilt-3d">
          <TiltMini />
        </FlairCell>
        <FlairCell keyword="magnetic">
          <MagneticMini />
        </FlairCell>
        <FlairCell keyword="glow-pulse">
          <GlowMini />
        </FlairCell>
        <FlairCell keyword="confetti-pop">
          <ConfettiMini />
        </FlairCell>
      </div>

      <div className="mt-6 rounded-lg bg-neutral-50 p-4 font-mono text-[12px] leading-relaxed text-neutral-800">
        <span className="text-neutral-500">{"<"}</span>motion.button{" "}
        <span className="text-violet-600">{"{...spring.press}"}</span>{" "}
        <span className="text-violet-600">{"{...spring.hover}"}</span>
        <span className="text-neutral-500">{">"}</span>
        <br />
        &nbsp;&nbsp;Save
        <br />
        <span className="text-neutral-500">{"</"}</span>motion.button
        <span className="text-neutral-500">{">"}</span>
      </div>
    </div>
  );
}

function DemoCell({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</div>
      {children}
      <div className="mt-1 text-[10px] text-neutral-500">{desc}</div>
    </div>
  );
}

function FlairCell({ keyword, children }: { keyword: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 p-3">
      <div className="flex h-16 items-center justify-center">{children}</div>
      <code className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
        {keyword}
      </code>
    </div>
  );
}

// ── flashy mini demos ──
function TiltMini() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [16, -16]), { stiffness: 250, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-16, 16]), { stiffness: 250, damping: 18 });
  return (
    <motion.div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 600, background: "linear-gradient(135deg,#8B5CF6,#4ECDC4)" }}
      className="flex h-12 w-14 cursor-pointer items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-md"
    >
      hover
    </motion.div>
  );
}

function MagneticMini() {
  const x = useSpring(0, { stiffness: 300, damping: 18 });
  const y = useSpring(0, { stiffness: 300, damping: 18 });
  return (
    <motion.button
      type="button"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.5);
        y.set((e.clientY - r.top - r.height / 2) * 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x, y, background: "#2563EB" }}
      className="rounded-lg px-3 py-2 text-[11px] font-bold text-white"
    >
      pull
    </motion.button>
  );
}

function GlowMini() {
  return (
    <motion.div
      animate={{ boxShadow: ["0 0 0px #8B5CF600", "0 0 22px #8B5CF6cc", "0 0 0px #8B5CF600"] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="flex h-11 w-12 items-center justify-center rounded-lg text-[10px] font-bold text-white"
      style={{ background: "#7C3AED" }}
    >
      live
    </motion.div>
  );
}

const CONFETTI = ["#FF6B6B", "#FFD93D", "#6C5CE7", "#4ECDC4"];
function ConfettiMini() {
  const [bits, setBits] = useState<{ id: number; dx: number; dy: number; c: string }[]>([]);
  return (
    <button
      type="button"
      onClick={() =>
        setBits(
          Array.from({ length: 12 }, (_, i) => ({
            id: i,
            dx: (i / 12 - 0.5) * 90 + (i % 2 ? 12 : -12),
            dy: -30 - (i % 4) * 14,
            c: CONFETTI[i % 4],
          })),
        )
      }
      className="relative rounded-lg px-3 py-2 text-[11px] font-bold text-white"
      style={{ background: "#DB2777" }}
    >
      pop
      {bits.map((b) => (
        <motion.span
          key={b.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: b.dx, y: b.dy, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() => setBits([])}
          style={{ position: "absolute", left: "50%", top: "50%", width: 6, height: 6, borderRadius: 1, background: b.c }}
        />
      ))}
    </button>
  );
}

const SEED_COLOR: Record<SeedId, string> = {
  spring: "#2563EB",
  silk: "#635BFF",
  snap: "#5E6AD2",
  float: "#B45309",
  pulse: "#DB2777",
};
