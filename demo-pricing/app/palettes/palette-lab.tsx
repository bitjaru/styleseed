"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Clipboard, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { generatePalette, type PaletteCharacter, type PaletteHarmony, type PaletteMode, type PaletteTemperature } from "@engine/color";

const KEY_SUGGESTIONS = ["#276B5E", "#5B5BD6", "#D84A2F", "#0A84FF", "#B8FF5A", "#A98BFF"];
const CHARACTERS: Array<{ value: PaletteCharacter; label: string; detail: string }> = [
  { value: "calm", label: "Calm", detail: "lower chroma" },
  { value: "balanced", label: "Balanced", detail: "product neutral" },
  { value: "vivid", label: "Vivid", detail: "expressive" },
  { value: "deep", label: "Deep", detail: "weighty" },
];
const HARMONIES: Array<{ value: PaletteHarmony; label: string }> = [
  { value: "auto", label: "Auto score" },
  { value: "tonal", label: "Tonal" },
  { value: "adjacent", label: "Adjacent" },
  { value: "contrast", label: "Contrast" },
];
const TEMPERATURES: PaletteTemperature[] = ["neutral", "warm", "cool"];

function Segmented<T extends string>({ value, items, onChange }: { value: T; items: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/[0.055] p-1 sm:flex">
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${value === item.value ? "bg-white text-black shadow-sm" : "text-black/48 hover:text-black"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PaletteLab() {
  const [keyColor, setKeyColor] = useState("#5B5BD6");
  const [draft, setDraft] = useState(keyColor);
  const [mode, setMode] = useState<PaletteMode>("light");
  const [character, setCharacter] = useState<PaletteCharacter>("balanced");
  const [harmony, setHarmony] = useState<PaletteHarmony>("auto");
  const [temperature, setTemperature] = useState<PaletteTemperature>("neutral");
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => generatePalette({ keyColor, mode, character, harmony, temperature }), [keyColor, mode, character, harmony, temperature]);
  const roles = result.roles;

  function commitDraft() {
    const value = draft.trim();
    if (/^#[0-9a-f]{6}$/i.test(value)) setKeyColor(value.toUpperCase());
    else setDraft(keyColor);
  }

  async function copyCss() {
    await navigator.clipboard.writeText(result.css);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="border-b border-black/15 bg-[#ECE9E1]">
      <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="overflow-hidden rounded-[28px] border border-black/20 bg-[#F8F6F0] shadow-[0_24px_80px_rgba(40,35,25,0.10)]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/12 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-black text-white"><Palette size={16} /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/38">StyleSeed Palette Engine</p>
                <h2 className="text-lg font-semibold tracking-[-0.025em]">Key color → semantic system</h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F5E8] px-3 py-1.5 text-[10px] font-bold text-[#17663A]">
              <ShieldCheck size={13} /> {result.contrast.length}/{result.contrast.length} gates pass
            </span>
          </header>

          <div className="grid xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border-b border-black/12 p-5 sm:p-7 xl:border-b-0 xl:border-r">
              <div>
                <label htmlFor="key-color" className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">01 · Choose the key color</label>
                <div className="mt-3 flex gap-2">
                  <input
                    aria-label="Choose key color"
                    type="color"
                    value={keyColor}
                    onChange={(event) => { setKeyColor(event.target.value.toUpperCase()); setDraft(event.target.value.toUpperCase()); }}
                    className="h-12 w-14 cursor-pointer rounded-xl border border-black/15 bg-transparent p-1"
                  />
                  <input
                    id="key-color"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(event) => { if (event.key === "Enter") commitDraft(); }}
                    className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-4 font-mono text-sm font-semibold uppercase outline-none focus:ring-2"
                    style={{ "--tw-ring-color": roles.focus } as React.CSSProperties}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {KEY_SUGGESTIONS.map((color) => (
                    <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => { setKeyColor(color); setDraft(color); }} className={`size-7 rounded-full border-2 ${keyColor === color ? "border-black" : "border-white shadow-sm"}`} style={{ background: color }} />
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">02 · Set perceptual character</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {CHARACTERS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setCharacter(item.value)} className={`rounded-xl border px-3 py-3 text-left transition ${character === item.value ? "border-black bg-black text-white" : "border-black/12 bg-white hover:border-black/35"}`}>
                      <span className="block text-xs font-bold">{item.label}</span>
                      <span className={`mt-0.5 block text-[9px] ${character === item.value ? "text-white/55" : "text-black/38"}`}>{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 space-y-5">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">03 · Context</p>
                  <Segmented value={mode} onChange={setMode} items={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">Surface temperature</p>
                  <Segmented value={temperature} onChange={setTemperature} items={TEMPERATURES.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">Accent relationship</p>
                  <Segmented value={harmony} onChange={setHarmony} items={HARMONIES} />
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="border-b border-black/12 p-4 sm:p-7">
                <div className="overflow-hidden rounded-[22px] border" style={{ borderColor: roles.border, background: roles.background, color: roles.foreground }}>
                  <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5" style={{ borderColor: roles.border, background: roles.chrome, color: roles.chromeForeground }}>
                    <div className="flex items-center gap-2.5"><span className="size-2.5 rounded-full" style={{ background: roles.primary }} /><span className="text-xs font-bold">Northstar</span></div>
                    <div className="flex items-center gap-3 text-[10px] opacity-70"><span>Overview</span><span>Projects</span><span className="rounded-full px-2 py-1 font-bold" style={{ background: roles.primary, color: roles.primaryForeground }}>New project</span></div>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-[1.25fr_0.75fr] sm:p-6">
                    <div className="rounded-2xl border p-5 sm:p-7" style={{ borderColor: roles.border, background: roles.surface }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: roles.mutedForeground }}>Current focus</p>
                      <h3 className="mt-3 max-w-md text-3xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-4xl">A palette should organize attention—not decorate every box.</h3>
                      <p className="mt-4 max-w-lg text-xs leading-relaxed" style={{ color: roles.mutedForeground }}>Canvas carries most of the interface. The key color identifies the product and primary action; the generated companion stays supporting.</p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <button type="button" className="rounded-full px-4 py-2 text-[11px] font-bold" style={{ background: roles.primary, color: roles.primaryForeground }}>Review system</button>
                        <button type="button" className="rounded-full border px-4 py-2 text-[11px] font-bold" style={{ borderColor: roles.border }}>View rationale</button>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-2xl p-5" style={{ background: roles.primary, color: roles.primaryForeground }}><p className="text-[9px] font-bold uppercase tracking-[0.13em] opacity-60">Primary role</p><p className="mt-8 text-xl font-semibold">One action wins.</p></div>
                      <div className="rounded-2xl border p-5" style={{ borderColor: roles.border, background: roles.surface }}><div className="flex items-center justify-between"><span className="text-xs font-semibold">System health</span><span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: roles.success }}><CheckCircle2 size={12} /> Passing</span></div><div className="mt-6 h-1.5 overflow-hidden rounded-full" style={{ background: roles.chrome }}><div className="h-full w-[78%] rounded-full" style={{ background: roles.accent }} /></div></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_0.9fr]">
                <div className="border-b border-black/12 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">Generated reference ramps</p><p className="mt-1 text-xs text-black/48">OKLCH lightness steps; components consume semantic roles.</p></div><button type="button" onClick={copyCss} className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-2 text-[10px] font-bold"><Clipboard size={12} />{copied ? "Copied" : "Copy CSS"}</button></div>
                  <div className="mt-5 space-y-3">
                    {(["primary", "accent"] as const).map((rampName) => (
                      <div key={rampName}>
                        <div className="mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-black/35"><span>{rampName}</span><span>{rampName === "primary" ? roles.primary : roles.accent}</span></div>
                        <div className="grid grid-cols-11 overflow-hidden rounded-lg border border-black/10">{Object.entries(result.ramps[rampName]).map(([step, color]) => <div key={step} title={`${step} ${color}`} className="h-9" style={{ background: color }} />)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-6 gap-2">
                    {["background", "surface", "chrome", "primary", "accent", "focus"].map((role) => <div key={role} className="min-w-0"><div className="h-10 rounded-lg border border-black/10" style={{ background: roles[role] }} /><p className="mt-1 truncate text-center text-[8px] font-bold text-black/35">{role}</p></div>)}
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/38">Why this combination works</p>
                  <ol className="mt-4 space-y-3">
                    {[
                      `Character first: ${character} sets the chroma and lightness envelope before hue selection.`,
                      `Accent ${result.decisions.accent.offset > 0 ? "+" : ""}${result.decisions.accent.offset}° won after avoiding reserved status hues.`,
                      `Foregrounds are chosen after fills; ${result.contrast.length} real role pairs pass their thresholds.`,
                    ].map((item, index) => <li key={item} className="flex gap-3 text-[11px] leading-relaxed text-black/58"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-black text-[9px] font-bold text-white">{index + 1}</span>{item}</li>)}
                  </ol>
                  <div className="mt-5 rounded-xl bg-black/[0.045] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold"><Sparkles size={13} /> Allocation rule</div>
                    <p className="mt-2 text-[10px] leading-relaxed text-black/50">60% canvas and surfaces · 30% chrome, text, and structure · at most 10% primary and companion emphasis combined.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">{result.contrast.slice(0, 6).map((item) => <span key={`${item.foreground}-${item.background}`} className="inline-flex items-center gap-1 rounded-full bg-[#E4F5E8] px-2 py-1 text-[8px] font-bold text-[#17663A]"><Check size={9} />{item.ratio}:1</span>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
