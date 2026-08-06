"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Circle,
  Image as ImageIcon,
  Layers3,
  Menu,
  MousePointer2,
  Pause,
  Play,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PALETTE_BY_ID, type PaletteRecipe } from "@engine/color";

type DirectionId = "native" | "signature" | "experimental";

const DIRECTIONS = {
  native: {
    eyebrow: "01 · Platform native",
    name: "Quiet utility",
    promise: "Familiar mobile structure with a deliberate, low-risk focus transition.",
    recipe: "native-mobile",
    palette: "quiet-mineral",
    cost: "Low",
    nav: "contained",
  },
  signature: {
    eyebrow: "02 · Product signature",
    name: "Orbit dock",
    promise: "A floating navigation object becomes the session controller when focus starts.",
    recipe: "creative-professional",
    palette: "deep-lime-studio",
    cost: "Medium",
    nav: "floating",
  },
  experimental: {
    eyebrow: "03 · Experimental",
    name: "Spatial signal",
    promise: "Content, media, and navigation share one continuous orbital canvas.",
    recipe: "expressive-brand",
    palette: "signal-coral",
    cost: "High",
    nav: "orbital",
  },
} as const;

const STAGES = [
  ["01", "Brief", "locked"],
  ["02", "Scout", "5 roles"],
  ["03", "Directions", "3 ready"],
  ["04", "Selection", "signature"],
  ["05", "Build", "interactive"],
  ["06", "Verify", "3 / 4"],
] as const;

const MEDIA_JOBS = [
  {
    id: "A1",
    icon: ImageIcon,
    label: "Ambient focus field",
    capability: "raster-generate",
    state: "planned",
    detail: "Soft optical depth; no text or UI baked in.",
  },
  {
    id: "A2",
    icon: Sparkles,
    label: "Session texture loop",
    capability: "image-to-video",
    state: "planned",
    detail: "Optional background material for the focus state.",
  },
  {
    id: "V1",
    icon: Video,
    label: "Prototype scene capture",
    capability: "prototype-record",
    state: "required",
    detail: "Real tap, expansion, cancel, and reduced motion.",
  },
] as const;

export function StudioWorkbench() {
  const [direction, setDirection] = useState<DirectionId>("signature");
  const [focusMode, setFocusMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const active = DIRECTIONS[direction];
  const activePalette = PALETTE_BY_ID[active.palette];

  const transition = useMemo(
    () => reducedMotion ? { duration: 0.01 } : { type: "spring" as const, stiffness: 330, damping: 30 },
    [reducedMotion],
  );

  return (
    <section className="mx-auto max-w-[1480px] px-3 py-3 sm:px-5 sm:py-5">
      <div className="grid min-h-[780px] overflow-hidden rounded-[24px] border border-white/12 bg-[#111316] xl:grid-cols-[230px_minmax(0,1fr)_330px]">
        <aside className="border-b border-white/10 bg-[#0d0f11] p-5 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Run</p>
              <h2 className="mt-1 text-sm font-semibold">Focus OS / mobile</h2>
            </div>
            <button aria-label="Run menu" className="grid size-8 place-items-center rounded-full border border-white/10 text-white/55">
              <Menu size={14} />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 xl:block xl:space-y-1">
            {STAGES.map(([number, label, state], index) => (
              <div
                key={number}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${index === 3 ? "bg-white/8" : ""}`}
              >
                <span className={`font-mono text-[10px] ${index < 4 ? "text-[#b8ff5a]" : "text-white/25"}`}>{number}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white/80">{label}</div>
                  <div className="truncate text-[10px] text-white/32">{state}</div>
                </div>
                {index < 4 ? <Check size={12} className="text-[#b8ff5a]" /> : <Circle size={9} className="text-white/20" />}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Brief</p>
            <p className="mt-3 text-[12px] leading-relaxed text-white/65">
              Help knowledge workers enter a focus session without losing the task context they
              selected. The product should feel calm, precise, and recognizably its own.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["mobile", "product-ui", "focus"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/40">{tag}</span>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 bg-[#14171a]">
          <div className="border-b border-white/10 p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8ff5a]">Human selection gate</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Three directions. One product job.</h2>
              </div>
              <span className="rounded-full border border-[#b8ff5a]/30 bg-[#b8ff5a]/10 px-3 py-1.5 text-[10px] font-bold text-[#b8ff5a]">
                Selected · {active.name}
              </span>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              {(Object.keys(DIRECTIONS) as DirectionId[]).map((id) => {
                const item = DIRECTIONS[id];
                const itemPalette = PALETTE_BY_ID[item.palette];
                const selected = direction === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setDirection(id); setFocusMode(false); }}
                    className={`group min-h-[154px] rounded-2xl border p-4 text-left transition-colors ${
                      selected ? "border-white/30 bg-white/10" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">{item.eyebrow}</span>
                      <div className="flex items-center gap-1" aria-label={`${itemPalette.name} palette`}>
                        {[itemPalette.roles.background, itemPalette.roles.primary, itemPalette.roles.accent].map((color) => (
                          <span key={color} className="size-2.5 rounded-full border border-white/15" style={{ background: color }} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 text-[16px] font-semibold">{item.name}</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/45">{item.promise}</p>
                    <div className="mt-4 flex items-center justify-between text-[9px] text-white/30">
                      <span>{item.recipe}</span><span>{item.cost} cost</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[8px] text-white/22">{item.palette}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(340px,0.82fr)_minmax(260px,0.55fr)] lg:items-center">
            <div className="flex justify-center">
              <PhonePrototype
                key={direction}
                direction={direction}
                active={active}
                palette={activePalette}
                focusMode={focusMode}
                setFocusMode={setFocusMode}
                transition={transition}
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">
                  <Layers3 size={12} /> Compiled scene
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">Task card → focus controller</h3>
                <dl className="mt-5 space-y-3 text-[11px]">
                  {[
                    ["Trigger", "Tap the priority session"],
                    ["Continuity", "Task title · duration · accent field"],
                    ["Transforms", "Floating dock → session controller"],
                    ["Interrupt", "Back or pause returns to the same task"],
                    ["Reduced motion", "Direct swap + focus handoff"],
                  ].map(([term, value]) => (
                    <div key={term} className="grid grid-cols-[92px_1fr] gap-3 border-t border-white/8 pt-3">
                      <dt className="text-white/30">{term}</dt><dd className="text-white/65">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Palette recipe</p>
                    <h3 className="mt-1 text-sm font-semibold">{activePalette.name}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] text-white/40">{activePalette.mode}</span>
                </div>
                <div className="mt-4 grid grid-cols-6 overflow-hidden rounded-xl border border-white/10">
                  {[
                    ["BG", activePalette.roles.background],
                    ["Surface", activePalette.roles.surface],
                    ["Chrome", activePalette.roles.chrome],
                    ["Primary", activePalette.roles.primary],
                    ["Accent", activePalette.roles.accent],
                    ["Focus", activePalette.roles.focus],
                  ].map(([label, color]) => (
                    <div key={label} className="min-w-0">
                      <div className="h-8" style={{ background: color }} />
                      <div className="truncate bg-black/25 px-1 py-1 text-center text-[7px] text-white/35">{label}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] leading-relaxed text-white/42">{activePalette.usage}</p>
                <div className="mt-3 border-t border-white/8 pt-3 text-[9px] leading-relaxed text-white/30">
                  Asset anchors · {activePalette.assetBrief.anchors.join(" · ")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFocusMode((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl bg-[#b8ff5a] px-5 py-4 text-left text-[#10130d]"
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-55">Run actual scene</span>
                  <span className="mt-1 block text-sm font-bold">{focusMode ? "Return to task list" : "Start focus transition"}</span>
                </span>
                <MousePointer2 size={18} />
              </button>
            </div>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-[#0d0f11] p-5 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Media jobs</p>
              <h2 className="mt-1 text-sm font-semibold">Provider-neutral manifest</h2>
            </div>
            <Search size={14} className="text-white/30" />
          </div>

          <div className="mt-6 space-y-2.5">
            {MEDIA_JOBS.map((job) => (
              <article key={job.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/8 text-white/60"><job.icon size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-[12px] font-semibold">{job.label}</h3>
                      <span className={`text-[8px] font-bold uppercase tracking-[0.12em] ${job.state === "required" ? "text-[#b8ff5a]" : "text-white/30"}`}>
                        {job.state}
                      </span>
                    </div>
                    <code className="mt-1 block text-[9px] text-white/30">{job.capability}</code>
                    <p className="mt-3 text-[10px] leading-relaxed text-white/42">{job.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Reel plan</p>
                <h2 className="mt-1 text-sm font-semibold">Prototype first · 8.4 sec</h2>
              </div>
              <button
                type="button"
                aria-label={playing ? "Pause reel plan" : "Play reel plan"}
                onClick={() => setPlaying((value) => !value)}
                className="grid size-9 place-items-center rounded-full bg-white text-black"
              >
                {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-px bg-white/10">
                {[
                  ["01", "Task context", "2.2s", "prototype"],
                  ["02", "Dock transform", "3.8s", "prototype"],
                  ["03", "Ambient close", "2.4s", "generated"],
                ].map(([number, label, duration, source], index) => (
                  <motion.div
                    key={number}
                    animate={playing ? { opacity: [0.42, 1, 0.42] } : { opacity: 1 }}
                    transition={{ duration: 2.1, delay: index * 0.45, repeat: playing ? Infinity : 0 }}
                    className="min-w-0 bg-[#15181b] p-3"
                  >
                    <div className="font-mono text-[8px] text-white/25">{number}</div>
                    <div className="mt-4 truncate text-[9px] font-semibold text-white/70">{label}</div>
                    <div className="mt-1 text-[8px] text-white/25">{duration} · {source}</div>
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="h-0.5 origin-left bg-[#b8ff5a]"
                animate={{ scaleX: playing ? [0, 1] : 0 }}
                transition={{ duration: 8.4, ease: "linear", repeat: playing ? Infinity : 0 }}
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">Acceptance gates</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[["Code", true], ["Pixel", true], ["Temporal", true], ["Human", false]].map(([label, pass]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-[10px] text-white/55">
                  {pass ? <Check size={11} className="text-[#b8ff5a]" /> : <Circle size={9} className="text-white/20" />}
                  {label}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PhonePrototype({
  direction,
  active,
  palette,
  focusMode,
  setFocusMode,
  transition,
}: {
  direction: DirectionId;
  active: (typeof DIRECTIONS)[DirectionId];
  palette: PaletteRecipe;
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  transition: { duration: number } | { type: "spring"; stiffness: number; damping: number };
}) {
  return (
    <div className="relative w-full max-w-[390px] overflow-hidden rounded-[42px] border border-white/15 bg-black p-2 shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
      <motion.div
        layout
        className="relative min-h-[680px] overflow-hidden rounded-[34px]"
        style={{ background: palette.roles.background, color: palette.roles.foreground }}
        transition={transition}
      >
        <div className="relative z-20 flex items-center justify-between px-6 pt-5 text-[10px] font-bold">
          <span>9:41</span><span className="rounded-full bg-current/10 px-2.5 py-1">Focus OS</span>
        </div>

        <AnimatePresence mode="wait">
          {!focusMode ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transition}
              className="relative z-10 px-5 pb-28 pt-10"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] opacity-45">Monday · Priority field</p>
              <h3 className="mt-2 max-w-[270px] text-[36px] font-semibold leading-[0.94] tracking-[-0.055em]">
                Protect one meaningful hour.
              </h3>

              <button
                type="button"
                onClick={() => setFocusMode(true)}
                className="mt-8 block w-full text-left"
              >
                <motion.div
                  layoutId={`focus-card-${direction}`}
                  className="relative overflow-hidden rounded-[26px] p-5"
                  style={{ background: palette.roles.chrome, color: palette.roles.chromeForeground }}
                  transition={transition}
                >
                  <div
                    className="absolute -right-10 -top-12 size-44 rounded-full opacity-60 blur-2xl"
                    style={{ background: palette.roles.primary }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <span className="rounded-full border border-current/15 px-2 py-1 text-[9px] font-bold">60 MIN</span>
                      <ChevronRight size={16} className="opacity-45" />
                    </div>
                    <p className="mt-16 text-[11px] opacity-45">Priority session</p>
                    <h4 className="mt-1 max-w-[220px] text-[23px] font-semibold leading-tight tracking-[-0.035em]">
                      Shape the launch narrative
                    </h4>
                  </div>
                </motion.div>
              </button>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Review prototype", "Send feedback"].map((item, index) => (
                  <div key={item} className="rounded-[20px] border border-current/10 p-4">
                    <span className="text-[9px] font-bold opacity-35">0{index + 2}</span>
                    <p className="mt-8 text-[12px] font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="focus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="relative z-10 flex min-h-[630px] flex-col px-5 pb-24 pt-7"
            >
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setFocusMode(false)} className="grid size-9 place-items-center rounded-full border border-current/15" aria-label="Back to tasks">
                  <ArrowLeft size={15} />
                </button>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-45">Session live</span>
              </div>

              <motion.div
                layoutId={`focus-card-${direction}`}
                className="relative mt-8 flex flex-1 flex-col overflow-hidden rounded-[30px] p-6"
                style={{ background: palette.roles.chrome, color: palette.roles.chromeForeground }}
                transition={transition}
              >
                <div className="absolute inset-0 opacity-55" style={{ background: `radial-gradient(circle at 68% 25%, ${palette.roles.primary} 0, transparent 42%)` }} />
                <div className="relative flex flex-1 flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-40">Priority session</p>
                  <h4 className="mt-2 max-w-[260px] text-[28px] font-semibold leading-[1.02] tracking-[-0.045em]">Shape the launch narrative</h4>
                  <div className="my-auto text-center">
                    <div className="text-[66px] font-medium leading-none tracking-[-0.07em]">54:12</div>
                    <p className="mt-3 text-[10px] opacity-40">Stay with the one decision</p>
                  </div>
                  <button type="button" className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[11px] font-bold" style={{ background: palette.roles.primary, color: palette.roles.primaryForeground }}>
                    <Pause size={13} /> Pause session
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {direction === "experimental" && (
          <div className="pointer-events-none absolute -right-24 top-24 size-64 rounded-full border opacity-60" style={{ borderColor: palette.roles.primary }} />
        )}

        <motion.nav
          layout
          className={`absolute bottom-4 z-30 flex items-center justify-around ${
            active.nav === "contained" ? "inset-x-4 h-14 rounded-2xl" :
            active.nav === "floating" ? "left-1/2 h-14 w-[74%] -translate-x-1/2 rounded-full" :
            "bottom-6 right-5 h-14 w-[58%] rounded-full"
          }`}
          style={{ background: palette.roles.chrome, color: palette.roles.chromeForeground }}
          transition={transition}
        >
          {[Circle, Layers3, Sparkles].map((Icon, index) => (
            <span key={index} className={`grid size-9 place-items-center rounded-full ${index === (focusMode ? 2 : 0) ? "bg-current/10" : "opacity-35"}`}>
              <Icon size={14} />
            </span>
          ))}
        </motion.nav>
      </motion.div>
    </div>
  );
}
