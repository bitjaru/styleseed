"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Copy, Layers2, SlidersHorizontal } from "lucide-react";
import palette from "./brand-palette.json";
import report from "@/content/landing-drift-report.json";
import s from "./design-specimens.module.css";

const roles = [
  { id: "primary", label: "Primary", description: "The next action, in your color.", use: "Primary actions", foreground: "primaryForeground" },
  { id: "highlight", label: "Accent", description: "A second voice. With a clear role.", use: "Highlight surfaces", foreground: "highlightForeground" },
  { id: "successSurface", label: "Success", description: "A positive state, paired with words.", use: "Success surfaces", foreground: "successSurfaceForeground" },
  { id: "warningSurface", label: "Warning", description: "Something to review before moving on.", use: "Attention surfaces", foreground: "warningSurfaceForeground" },
  { id: "dangerSurface", label: "Danger", description: "A problem you can see and read.", use: "Error surfaces", foreground: "dangerSurfaceForeground" },
  { id: "foreground", label: "Ink", description: "The quiet foundation of every screen.", use: "Text and essential detail", foreground: "surface" },
] as const;

export function PaletteSpecimen() {
  const [selected, setSelected] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const request = useRef(0);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hexRef = useRef<HTMLElement>(null);
  const role = roles[selected];
  const hex = palette.roles[role.id];
  const contrast = palette.contrast.find((pair) => role.id === "foreground"
    ? pair.foreground === "foreground" && pair.background === "surface"
    : pair.background === role.id && pair.foreground === role.foreground)!;
  useEffect(() => () => { request.current++; if (reset.current) clearTimeout(reset.current); }, []);

  async function copyColor() {
    const current = ++request.current;
    if (reset.current) clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(hex);
      if (current !== request.current) return;
      setCopyState("copied");
      reset.current = setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      if (current !== request.current) return;
      setCopyState("failed");
      if (hexRef.current) {
        const range = document.createRange();
        range.selectNodeContents(hexRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return <figure className={s.palette} aria-label="Explore the palette used by this website">
    <figcaption className={s.toolbar}><span><SlidersHorizontal size={16} aria-hidden="true" /> Design language</span><span>This site’s palette</span></figcaption>
    <div className={s.paletteBody}>
      <div className={s.roleList} role="group" aria-label="Choose a color role">
        <span className={s.listLabel}>Color roles</span>
        {roles.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index}
          aria-controls="palette-detail" onClick={() => { request.current++; if (reset.current) clearTimeout(reset.current); setSelected(index); setCopyState("idle"); }}>
          <i aria-hidden="true" style={{ "--swatch": `var(--home-${item.id})` } as CSSProperties} />
          <span>{item.label}</span><Check size={15} aria-hidden="true" className={s.selectedCheck} />
        </button>)}
        <a href="/palettes">Explore palettes <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
      <div id="palette-detail" className={s.detail} style={{ "--selected-color": `var(--home-${role.id})`, "--selected-ink": `var(--home-${role.foreground})` } as CSSProperties}>
        <div className={s.colorStage}>
          <div className={s.colorCard} key={role.id}><span>{role.label}</span><strong>Aa</strong><code>{hex}</code></div>
          <div className={s.rampStack} aria-label="Primary tints and accent pairing">
            <div className={s.ramp} aria-label="Primary tints">
              {(["100", "200", "300", "400", "500"] as const).map((step) => <span key={step} title={`Primary ${step}: ${palette.ramps.primary[step]}`} style={{ "--swatch": palette.ramps.primary[step] } as CSSProperties} />)}
            </div>
            <div className={s.pairing} aria-label="Citrus and ink pairing"><span>Highlight<br /><strong>with purpose.</strong></span><i aria-hidden="true"><Check size={20} /></i></div>
          </div>
        </div>
        <div className={s.colorInfo}>
          <div><p>{role.description}</p><span>{role.use} · {contrast.ratio}:1 contrast</span></div>
          <button type="button" className={s.copyColor} data-copied={copyState === "copied"} aria-label={`Copy ${role.label} color ${hex}`} onClick={copyColor}>
            <code ref={hexRef}>{hex}</code><span key={copyState} className={s.copyGlyph}>{copyState === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</span>
          </button>
        </div>
        <span role="status" className={s.copyMessage}>{copyState === "copied" ? `${hex} copied.` : copyState === "failed" ? "Clipboard blocked. The hex value is selected for manual copying." : "Select a role. See the relationship."}</span>
      </div>
    </div>
  </figure>;
}

const spacingSteps = report.axes.find((axis) => axis.axis === "spacing scale")!.baseline.split(", ").map(Number);

export function DesignSpecimens() {
  const [weight, setWeight] = useState(500);
  const [space, setSpace] = useState(16);
  return <section className={s.specimens} aria-labelledby="language-title">
    <div className={s.intro}>
      <span className={s.eyebrow}>The details are the system</span>
      <h2 id="language-title">Decisions you can see.<br />Rules your agent can use.</h2>
      <p>Color has a role. Type has a rhythm. Space has a scale. Keep the choices that make your product yours.</p>
      <a href="#rules">See how rules travel <ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
    <article className={s.feature}>
      <div className={`${s.specimenStage} ${s.typeStage}`}>
        <div className={s.stageLabel}><span>Typography</span><span>Inter</span></div>
        <div className={s.typePaper}>
          <div className={s.paperMeta}><span>Type specimen</span><span>01 / Inter</span></div>
          <div className={s.typeDisplay} style={{ fontWeight: weight }}><span>A little<br />clarity.</span><code>40</code></div>
          <div className={s.typeHeading}><span>Made to<br />stay together.</span><code>24</code></div>
          <div className={s.typeBody}><span>One family. Every detail<br />has its place.</span><code>14</code></div>
          <div className={s.paperBaseline}><span>Display / Heading / Body</span><span>{weight}</span></div>
        </div>
        <div className={s.typeControls} role="group" aria-label="Preview a type weight">
          {[400, 500, 600].map((value) => <button type="button" aria-pressed={weight === value} onClick={() => setWeight(value)} key={value}>{value}</button>)}
        </div>
        <p className={s.stageFoot}>Change the weight. Keep the hierarchy.</p>
      </div>
      <h3>A voice, down to the letter.</h3>
      <p>Keep the type family and hierarchy coherent. Let scale and weight do different jobs.</p>
    </article>
    <article className={s.feature}>
      <div className={`${s.specimenStage} ${s.spaceStage}`}>
        <div className={s.stageLabel}><span>Spacing</span><span>{space} px</span></div>
        <div className={s.spacingPaper}>
          <div className={s.paperMeta}><span>Component specimen</span><span>02 / Gap</span></div>
          <div className={s.spacingSample} style={{ "--sample-space": `${space}px` } as CSSProperties} aria-label={`Specimen with ${space} pixel spacing`}>
            <span className={s.componentIcon}><Layers2 size={20} aria-hidden="true" /></span>
            <div className={s.componentText}><strong>Shared decisions</strong><span>Room for every detail.</span></div>
            <div className={s.gapGuide} aria-hidden="true"><span>{space} px</span></div>
          </div>
          <div className={s.spacingToken}><span>gap</span><code>space-{space}</code></div>
          <div className={s.spaceScale} aria-hidden="true">{spacingSteps.map(value => <span key={value} data-selected={space === value}><i style={{ height: value }} />{value}</span>)}</div>
        </div>
        <div className={s.spaceControls} role="group" aria-label="Preview a spacing step">
          {spacingSteps.map((value) => <button type="button" aria-pressed={space === value} onClick={() => setSpace(value)} key={value}>{value}</button>)}
        </div>
        <p className={s.stageFoot}>Recorded scale · payments-console</p>
      </div>
      <h3>Space that belongs together.</h3>
      <p>A shared scale makes relationships visible. Measure where a screen starts to drift.</p>
    </article>
  </section>;
}
