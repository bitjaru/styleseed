"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight, Circle, Sparkles } from "lucide-react";
import type { SeedId } from "@engine/motion";

type ArtifactProps = { skin: string; seed: SeedId };

export const SIGNAL_CAROUSEL_FRAMES = [
  { file: "01-hook.png", alt: "Signal Reset frame 1: seven quiet minutes hook" },
  { file: "02-evidence.png", alt: "Signal Reset frame 2: sourced attention residue evidence" },
  { file: "03-action.png", alt: "Signal Reset frame 3: close every unnecessary tab action" },
  { file: "04-reframe.png", alt: "Signal Reset frame 4: protect a small beginning reframe" },
  { file: "05-cta.png", alt: "Signal Reset frame 5: save the seven-minute reset CTA" },
] as const;

export function SignalCarousel(_: ArtifactProps) {
  return (
    <div className="bg-[#DDD8CE] p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black/55">
        <span>5 exported frames · 1080 × 1440</span>
        <a
          href="/showcase-artifacts/signal-carousel/manifest.json"
          className="underline decoration-black/25 underline-offset-4 hover:text-black"
        >
          Inspect PNG manifest ↗
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {SIGNAL_CAROUSEL_FRAMES.map((frame) => (
          <div
            key={frame.file}
            className="aspect-[3/4] overflow-hidden shadow-[0_18px_35px_-22px_rgba(0,0,0,0.45)] last:col-span-2 last:mx-auto last:w-[calc(50%-6px)] sm:last:col-span-1 sm:last:mx-0 sm:last:w-auto"
          >
            <Image
              src={`/showcase-artifacts/signal-carousel/${frame.file}`}
              alt={frame.alt}
              width={1080}
              height={1440}
              className="h-full w-full object-contain"
              sizes="(min-width: 1280px) 210px, (min-width: 640px) 30vw, 46vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignalCarouselFrame({ frame }: { frame: number }) {
  switch (frame) {
    case 1:
      return (
        <div className="flex h-full flex-col justify-between bg-[#F4EFE5] px-[8%] pb-[20%] pt-[18%] text-[#191919]">
          <div className="flex items-center justify-between gap-[3cqw] whitespace-nowrap text-[3.2cqw] font-bold uppercase tracking-[0.18em]">
            <span>Signal / 01</span>
            <span className="text-right">Field notes</span>
          </div>
          <div>
            <div className="text-[31cqw] font-black leading-[0.72] tracking-[-0.1em] text-[#F04B36]">7</div>
            <h2 className="mt-[6%] max-w-[11ch] text-[8.2cqw] font-black leading-[0.94] tracking-[-0.05em]">
              Your attention does not need another system.
            </h2>
          </div>
          <div className="flex items-end justify-between gap-[4cqw] border-t border-[#191919] pt-[5%] text-[3.2cqw] font-semibold">
            <span>It needs seven quiet minutes.</span>
            <ArrowDown className="size-[5cqw] shrink-0" />
          </div>
        </div>
      );
    case 2:
      return (
        <div className="flex h-full flex-col bg-[#191919] px-[8%] pb-[20%] pt-[18%] text-[#F4EFE5]">
          <div className="flex items-center justify-between gap-[3cqw] whitespace-nowrap text-[3.2cqw] font-bold uppercase tracking-[0.18em] text-[#F04B36]">
            <span>The evidence</span>
            <span>02 / 05</span>
          </div>
          <div className="mt-auto">
            <div className="mb-[6%] h-1 w-full bg-white/15">
              <div className="h-full w-[78%] bg-[#F04B36]" />
            </div>
            <p className="text-[8.15cqw] font-black leading-[0.96] tracking-[-0.05em]">
              Part of our attention can stay with the <span className="text-[#F04B36]">unfinished task.</span>
            </p>
            <p className="mt-[6%] max-w-[28ch] text-[3.5cqw] leading-relaxed text-white/65">
              Task switching leaves attention residue, especially when the previous work is incomplete.
            </p>
            <p className="mt-[6%] border-t border-white/15 pt-[4%] text-[2.65cqw] font-semibold leading-relaxed text-white/45">
              Source · Sophie Leroy, 2009 · Organizational Behavior and Human Decision Processes · doi:10.1016/j.obhdp.2009.04.002
            </p>
          </div>
        </div>
      );
    case 3:
      return (
        <div className="relative flex h-full flex-col overflow-hidden bg-[#F04B36] px-[8%] pb-[20%] pt-[18%] text-[#191919]">
          <div
            className="absolute -right-[14%] top-[14%] z-0 size-[64%] rounded-full border-[10cqw]"
            style={{ borderColor: "rgba(244,239,229,0.28)" }}
          />
          <div className="relative z-10 flex items-center justify-between gap-[3cqw] whitespace-nowrap text-[3.5cqw] font-bold uppercase tracking-[0.18em]">
            <span>The reset</span>
            <span>03 / 05</span>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="text-[18cqw] font-black leading-none tracking-[-0.07em]">01</div>
            <h2 className="mt-[4%] text-[8.7cqw] font-black leading-[0.95] tracking-[-0.05em]">
              Close every tab you do not need now.
            </h2>
            <p className="mt-[6%] text-[3.5cqw] font-semibold">One window. One task. Seven minutes.</p>
          </div>
        </div>
      );
    case 4:
      return (
        <div className="flex h-full flex-col justify-between bg-[#DDE8FF] px-[8%] pb-[20%] pt-[18%] text-[#17233D]">
          <div className="flex items-center justify-between gap-[3cqw] whitespace-nowrap text-[3.5cqw] font-bold uppercase tracking-[0.18em]">
            <span className="flex items-center gap-[3cqw]"><Circle className="size-[4cqw]" fill="#F04B36" strokeWidth={0} /> Keep this</span>
            <span>04 / 05</span>
          </div>
          <div>
            <p className="max-w-[11ch] text-[8.8cqw] font-black leading-[0.96] tracking-[-0.05em]">
              Protect a small beginning, not a perfect day.
            </p>
          </div>
          <div className="flex items-center justify-between gap-[4cqw] border-t border-[#17233D]/30 pt-[5%] text-[3.2cqw] font-bold">
            <span>Save for the next noisy hour</span>
            <ArrowUpRight className="size-[5cqw] shrink-0" />
          </div>
        </div>
      );
    case 5:
      return (
        <div className="flex h-full flex-col justify-between bg-[#17233D] px-[8%] pb-[20%] pt-[18%] text-[#DDE8FF]">
          <div className="flex items-center justify-between gap-[3cqw] whitespace-nowrap text-[3.35cqw] font-bold uppercase tracking-[0.18em]">
            <span>Signal / reset</span>
            <span className="text-[#F04B36]">05 / 05</span>
          </div>
          <div>
            <div className="mb-[8%] h-[1.2cqw] w-[28%] bg-[#F04B36]" />
            <p className="max-w-[10ch] text-[10.2cqw] font-black leading-[0.94] tracking-[-0.055em]">
              Seven minutes. One unfinished thought.
            </p>
            <p className="mt-[7%] max-w-[25ch] text-[3.8cqw] leading-relaxed text-[#DDE8FF]/65">
              Keep the window small enough for your attention to return.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-[4cqw] bg-[#F04B36] px-[5%] py-[4%] text-[3.6cqw] font-black text-[#191919]">
              <span>Save this reset</span>
              <ArrowUpRight className="size-[5cqw] shrink-0" />
            </div>
            <p className="mt-[5%] text-[2.65cqw] font-semibold leading-relaxed text-[#DDE8FF]/42">
              Behavioral basis · Leroy, 2009 · Attention residue
            </p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function OrbitDeck(_: ArtifactProps) {
  return (
    <div className="min-h-[640px] bg-[#CCD4DC] p-5 text-white sm:p-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-sm bg-[#07111F] shadow-[0_24px_60px_-28px_rgba(3,10,20,0.75)]">
        <div className="flex items-center justify-between border-b border-white/10 px-7 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          <span>Orbit Systems / Launch narrative</span><span>03 — The mechanism</span>
        </div>
        <div className="grid aspect-[16/9] grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between p-[8%]">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#7BE7C6]/30 bg-[#7BE7C6]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7BE7C6]">
              <Sparkles size={11} /> Operating intelligence
            </div>
            <div>
              <h2 className="max-w-[10ch] text-[clamp(30px,5vw,68px)] font-semibold leading-[0.95] tracking-[-0.055em]">
                One orbit around every decision.
              </h2>
              <p className="mt-5 max-w-[34ch] text-[clamp(10px,1.25vw,15px)] leading-relaxed text-white/55">
                Signals enter once. Orbit maps context, ownership, and the next useful move before work fragments.
              </p>
            </div>
            <div className="flex gap-8 border-t border-white/10 pt-5">
              <DeckMetric value="Context" label="why it matters" />
              <DeckMetric value="Owner" label="who moves next" />
            </div>
          </div>
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(70,112,255,0.28),transparent_42%)]">
            <OrbitGraphic />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 grid max-w-5xl grid-cols-4 gap-2">
        {["Thesis", "Friction", "Mechanism", "Decision"].map((label, index) => (
          <div key={label} className={"border-t px-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] " + (index === 2 ? "border-[#07111F] text-[#07111F]" : "border-black/20 text-black/35")}>
            0{index + 1} · {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeckMetric({ value, label }: { value: string; label: string }) {
  return <div><div className="text-[clamp(19px,2vw,28px)] font-semibold tracking-tight text-[#7BE7C6]">{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/40">{label}</div></div>;
}

function OrbitGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[82, 62, 42].map((size, index) => (
        <div key={size} className="absolute rounded-full border border-white/15" style={{ width: size + "%", height: size + "%" }}>
          <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: index === 0 ? "#7BE7C6" : index === 1 ? "#6E8BFF" : "#F8C96B" }} />
        </div>
      ))}
      <div className="relative z-10 flex size-[22%] items-center justify-center rounded-full bg-[#F2F6FF] text-[clamp(14px,2vw,26px)] font-black tracking-[-0.05em] text-[#07111F] shadow-[0_0_50px_rgba(123,231,198,0.24)]">ORBIT</div>
      <span className="absolute bottom-[13%] right-[10%] text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">Context → owner → action</span>
    </div>
  );
}

export function FieldReport(_: ArtifactProps) {
  return (
    <div className="min-h-[680px] bg-[#D7D5CF] p-5 sm:p-8">
      <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2">
        <article className="aspect-[3/4] bg-[#F5F0E7] p-[8%] text-[#211F1B] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-[#211F1B] pb-3 text-[9px] font-bold uppercase tracking-[0.16em]">
            <span>Field Notes</span><span>04 / 2026</span>
          </div>
          <div className="mt-[14%] border-l-[5px] border-[#E54832] pl-[7%]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E54832]">Research brief</p>
            <h2 className="mt-[6%] max-w-[9ch] font-serif text-[clamp(34px,5vw,66px)] leading-[0.88] tracking-[-0.05em]">
              The quiet infrastructure of trust.
            </h2>
          </div>
          <p className="mt-[12%] max-w-[37ch] text-[clamp(10px,1.15vw,14px)] leading-[1.65] text-[#211F1B]/65">
            Field observations suggest that confidence grows from visible recovery paths—not
            from eliminating every moment of uncertainty.
          </p>
          <div className="mt-[12%] grid grid-cols-2 gap-4 border-t border-[#211F1B]/25 pt-4">
            <ReportStat value="Observe" label="where confidence drops" />
            <ReportStat value="Recover" label="how the service responds" />
          </div>
          <div className="mt-auto pt-[12%] text-[9px] font-bold uppercase tracking-[0.16em]">
            Studio Common / Illustrative concept study
          </div>
        </article>
        <article className="aspect-[3/4] bg-[#F5F0E7] p-[8%] text-[#211F1B] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-[#E54832]">
            <span>Finding 02</span><span>p. 14</span>
          </div>
          <h3 className="mt-[7%] max-w-[14ch] font-serif text-[clamp(25px,3.6vw,44px)] leading-[0.95] tracking-[-0.04em]">
            Recovery is remembered longer than smoothness.
          </h3>
          <p className="mt-[6%] max-w-[44ch] text-[clamp(9px,1vw,13px)] leading-[1.65] text-[#211F1B]/65">
            Participants rarely described the absence of friction. They described the moment a service made the next step obvious after something went wrong.
          </p>
          <div className="mt-[9%] border-y border-[#211F1B]/25 py-[8%]">
            <div className="flex h-40 items-end gap-[5%]">
              {[38, 52, 49, 72, 84].map((height, index) => (
                <div key={index} className="relative flex-1 bg-[#211F1B]/10" style={{ height: height + "%" }}>
                  <div className="absolute inset-x-0 bottom-0 bg-[#E54832]" style={{ height: index === 4 ? "100%" : "8%" }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[8px] font-bold uppercase tracking-[0.12em] text-[#211F1B]/50"><span>Pre-task</span><span>Resolved</span></div>
          </div>
          <blockquote className="mt-[8%] border-l-[4px] border-[#E54832] pl-[6%] font-serif text-[clamp(15px,2vw,23px)] italic leading-snug">
            “I trusted it once I knew I could get back.”
          </blockquote>
        </article>
      </div>
    </div>
  );
}

function ReportStat({ value, label }: { value: string; label: string }) {
  return <div><div className="font-serif text-[clamp(26px,3vw,40px)] leading-none">{value}</div><div className="mt-2 text-[8px] font-bold uppercase tracking-[0.13em] text-[#211F1B]/50">{label}</div></div>;
}

export function NightPoster(_: ArtifactProps) {
  return (
    <div className="flex min-h-[720px] items-center justify-center bg-[#D8D8D0] p-5 sm:p-8">
      <article className="relative aspect-[4/5] h-[min(78vh,660px)] max-w-full overflow-hidden bg-[#0B0C0A] text-[#D7FF3F] shadow-[0_28px_70px_-35px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-x-[7%] top-[6%] z-20 flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
          <span>After Dark</span><span>Seoul / 25</span>
        </div>
        <div className="absolute left-[-8%] top-[13%] rotate-[-12deg] text-[clamp(230px,38vw,430px)] font-black leading-none tracking-[-0.15em] text-[#D7FF3F]">25</div>
        <div className="absolute left-[8%] top-[43%] z-10 w-[84%] border-y-2 border-[#D7FF3F] py-[3%] text-center text-[clamp(15px,2.3vw,28px)] font-black uppercase tracking-[0.28em] text-[#0B0C0A] mix-blend-difference">
          sound · type · motion
        </div>
        <div className="absolute inset-x-[7%] bottom-[7%] z-20 grid grid-cols-[1fr_auto] items-end gap-6">
          <div>
            <div className="text-[clamp(28px,4vw,50px)] font-black leading-[0.88] tracking-[-0.06em]">12.07<br />SAT 22:00</div>
            <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Nodeul / Hall B / ₩28,000</div>
          </div>
          <div className="text-right text-[9px] font-bold uppercase leading-[1.7] tracking-[0.15em] text-white/55">Mina Kim<br />Low Orbit<br />Shin & Park<br />Visuals by 908</div>
        </div>
      </article>
    </div>
  );
}

export function ArtifactThumbnail({ id }: { id: string }) {
  if (id === "signal-carousel") {
    return <div className="relative h-full overflow-hidden bg-[#F4EFE5] p-5 text-[#191919]"><div className="text-[10px] font-bold uppercase tracking-[0.18em]">Signal / 01</div><div className="absolute -bottom-5 -right-2 text-[130px] font-black leading-none tracking-[-0.12em] text-[#F04B36]">7</div><div className="absolute bottom-5 left-5 max-w-[10ch] text-[24px] font-black leading-[0.92] tracking-[-0.05em]">Protect a small beginning.</div></div>;
  }
  if (id === "orbit-deck") {
    return <div className="relative h-full overflow-hidden bg-[#07111F] p-5 text-white"><div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7BE7C6]">Orbit / mechanism</div><div className="absolute -right-4 top-1/2 size-44 -translate-y-1/2 rounded-full border border-white/20"><div className="absolute inset-7 rounded-full border border-[#7BE7C6]/50" /></div><div className="absolute bottom-5 left-5 max-w-[10ch] text-[27px] font-semibold leading-[0.92] tracking-[-0.055em]">One orbit around every decision.</div></div>;
  }
  if (id === "field-report") {
    return <div className="h-full bg-[#F5F0E7] p-5 text-[#211F1B]"><div className="flex justify-between border-b border-black pb-2 text-[8px] font-bold uppercase tracking-[0.15em]"><span>Field Notes</span><span>04 / 2026</span></div><div className="mt-5 border-l-4 border-[#E54832] pl-4"><div className="text-[8px] font-bold uppercase tracking-[0.17em] text-[#E54832]">Research brief</div><div className="mt-2 max-w-[9ch] font-serif text-[28px] leading-[0.9] tracking-[-0.05em]">The quiet infrastructure of trust.</div></div></div>;
  }
  return <div className="relative h-full overflow-hidden bg-[#0B0C0A] text-[#D7FF3F]"><div className="absolute left-4 top-4 z-10 text-[9px] font-black uppercase tracking-[0.2em]">After Dark</div><div className="absolute -bottom-7 -left-5 rotate-[-12deg] text-[150px] font-black leading-none tracking-[-0.16em]">25</div><div className="absolute bottom-4 right-4 text-right text-[9px] font-black uppercase tracking-[0.13em] text-white">12.07<br />Seoul</div></div>;
}
