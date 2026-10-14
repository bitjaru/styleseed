import type { SeedId } from "./index";

/**
 * Motion Keyword Library — the named, copy-pasteable motion vocabulary.
 *
 * This is the SINGLE SOURCE OF TRUTH shared by two surfaces:
 *   1. the `/motion` gallery (live demo + Copy button per keyword)
 *   2. the `/ss-motion` skill (keyword → code lookup for vibe coding)
 *
 * The 5 seeds (spring/silk/snap/float/pulse) define a *personality*.
 * These keywords define a *distinctive move* — a flip, a curtain wipe,
 * a morph — so "make the toggle flip" maps to exactly one recipe and
 * every page in the repo gets the same motion. That keyword↔code
 * contract is the thing a plain UI-template gallery can't offer.
 *
 * Each entry is pure data (safe to import from a Server Component).
 * The live demo JSX lives in the gallery page, keyed by `key`.
 */

export type MotionCategory =
  | "flair"
  | "toggle"
  | "reveal"
  | "press"
  | "attention"
  | "list";

export interface MotionKeyword {
  /** Unique handle — what you type when vibe coding. e.g. "toggle-flip". */
  key: string;
  /** Short human label for the gallery card. */
  label: string;
  category: MotionCategory;
  /** One-line description of the move. */
  vibe: string;
  /** Closest personality seed, for consistency guidance. */
  seed: SeedId;
  /** Copy-pasteable, runnable framer-motion snippet. */
  snippet: string;
}

export const MOTION_CATEGORIES: { id: MotionCategory; label: string; blurb: string }[] = [
  { id: "flair", label: "Flair", blurb: "Showy, cursor-aware, scroll-stopping moves." },
  { id: "toggle", label: "Toggle", blurb: "One control, many ways to switch state." },
  { id: "reveal", label: "Reveal", blurb: "How an element arrives on screen." },
  { id: "press", label: "Press", blurb: "Tactile feedback on tap/click." },
  { id: "attention", label: "Attention", blurb: "Looping or one-shot focus pulls." },
  { id: "list", label: "List", blurb: "Choreography across many items." },
];

/**
 * Motion by use-case — a LIGHT rule, not a mandate. Maps a common UI moment to
 * the seed or keyword that fits, with the one-line reason. Powers the "which
 * motion when" cheat on /motion and the recommend mode in /ss-motion.
 *
 * Two anti-rules override everything below:
 *   1. Preserve one coherent motion language; purposeful page/element overrides are valid.
 *   2. NEVER delay content the user came for — don't animate a balance, a search
 *      result, or a price into view. Motion is for affordance, not for the payload.
 */
export interface MotionUseCase {
  /** the UI moment */
  useCase: string;
  /** recommended seed id or keyword handle */
  recommend: string;
  /** one-line why */
  why: string;
}

export const MOTION_BY_USECASE: MotionUseCase[] = [
  { useCase: "Primary button / CTA press", recommend: "spring · press", why: "Tactile, confident feedback — the press should feel like it 'gives'." },
  { useCase: "Modal / dialog / bottom sheet enter", recommend: "silk · entrance", why: "Smooth and composed; never bounce serious or destructive content in." },
  { useCase: "Dropdown / popover / menu", recommend: "snap · entrance", why: "Instant and precise — frequent UI shouldn't make you wait." },
  { useCase: "Toast / inline notification", recommend: "spring · entrance", why: "A small friendly arrival that catches the eye without blocking." },
  { useCase: "List / feed items appearing", recommend: "stagger-cascade", why: "Choreograph many items so the eye follows the order, gently." },
  { useCase: "Feature / marketing card hover", recommend: "tilt-3d", why: "Depth and flair are welcome on content-light marketing surfaces." },
  { useCase: "Dashboard / data card hover", recommend: "snap · hover", why: "A subtle lift only — restraint keeps a dense data UI calm." },
  { useCase: "Like / favorite / reaction", recommend: "like-burst", why: "A celebratory one-shot; reward the tap." },
  { useCase: "Live / online / recording dot", recommend: "pulse-beat", why: "A looping heartbeat signals 'alive' without stealing focus." },
  { useCase: "Loading / skeleton", recommend: "shimmer", why: "Calm, directional progress — communicates work without anxiety." },
  { useCase: "Success / confirmation", recommend: "pop-in", why: "A positive little arrival that says 'done'." },
  { useCase: "Toggle / tab / segment switch", recommend: "toggle-flip", why: "A distinctive, recognizable switch tied to one handle." },
  { useCase: "Page / route transition", recommend: "silk · entrance", why: "Smooth and minimal; get out of the way fast." },
  { useCase: "Number / balance / KPI / price reveal", recommend: "none", why: "Don't animate the payload — the user came to read it instantly." },
];

export const MOTION_LIBRARY: MotionKeyword[] = [
  // ── Flair (showy, cursor/scroll-aware) ───────────────────
  {
    key: "tilt-3d",
    label: "3D tilt",
    category: "flair",
    vibe: "Card tilts in 3D toward the cursor — depth on hover",
    seed: "silk",
    snippet: `import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const x = useMotionValue(0);
const y = useMotionValue(0);
const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 250, damping: 20 });
const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 250, damping: 20 });

<motion.div
  onPointerMove={(e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }}
  onPointerLeave={() => { x.set(0); y.set(0); }}
  style={{ rotateX, rotateY, transformPerspective: 800 }}
/>`,
  },
  {
    key: "magnetic",
    label: "Magnetic",
    category: "flair",
    vibe: "Button drifts toward the cursor, springs back on leave",
    seed: "spring",
    snippet: `import { motion, useSpring } from "framer-motion";

const x = useSpring(0, { stiffness: 300, damping: 20 });
const y = useSpring(0, { stiffness: 300, damping: 20 });

<motion.button
  onPointerMove={(e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.4);
    y.set((e.clientY - r.top - r.height / 2) * 0.4);
  }}
  onPointerLeave={() => { x.set(0); y.set(0); }}
  style={{ x, y }}
>
  Hover me
</motion.button>`,
  },
  {
    key: "glow-pulse",
    label: "Glow pulse",
    category: "flair",
    vibe: "Breathing neon glow — draws the eye to a hot CTA",
    seed: "pulse",
    snippet: `<motion.div
  animate={{
    boxShadow: [
      "0 0 0px rgba(99,91,255,0)",
      "0 0 28px rgba(99,91,255,0.7)",
      "0 0 0px rgba(99,91,255,0)",
    ],
  }}
  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
/>`,
  },
  {
    key: "gradient-sweep",
    label: "Gradient sweep",
    category: "flair",
    vibe: "Animated gradient flows through text or a surface",
    seed: "silk",
    snippet: `<motion.span
  animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
  style={{
    backgroundImage: "linear-gradient(90deg,#6C5CE7,#FF6B6B,#FFD93D,#6C5CE7)",
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  }}
>
  Gradient
</motion.span>`,
  },
  {
    key: "blob-morph",
    label: "Blob morph",
    category: "flair",
    vibe: "Organic shape endlessly morphs — living background blob",
    seed: "float",
    snippet: `<motion.div
  animate={{
    borderRadius: [
      "60% 40% 30% 70% / 60% 30% 70% 40%",
      "30% 60% 70% 40% / 50% 60% 30% 60%",
      "60% 40% 30% 70% / 60% 30% 70% 40%",
    ],
  }}
  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
/>`,
  },
  {
    key: "spotlight",
    label: "Spotlight",
    category: "flair",
    vibe: "Radial light follows the cursor across a card",
    seed: "silk",
    snippet: `import { motion, useMotionValue, useMotionTemplate } from "framer-motion";

const mx = useMotionValue(50);
const my = useMotionValue(50);
const bg = useMotionTemplate\`radial-gradient(160px circle at \${mx}% \${my}%, rgba(255,255,255,0.25), transparent 60%)\`;

<motion.div
  onPointerMove={(e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  }}
  style={{ backgroundImage: bg }}
/>`,
  },
  {
    key: "text-scramble",
    label: "Scramble",
    category: "flair",
    vibe: "Letters decode into place — hacker/terminal reveal",
    seed: "snap",
    snippet: `const CHARS = "!<>-_\\\\/[]{}—=+*^?#";
const [text, setText] = useState("StyleSeed");

function scramble(target: string) {
  let frame = 0;
  const id = setInterval(() => {
    setText(
      target
        .split("")
        .map((c, i) => (i < frame / 3 ? c : CHARS[Math.floor(Math.random() * CHARS.length)]))
        .join(""),
    );
    if (frame++ > target.length * 3) clearInterval(id);
  }, 30);
}

<button onClick={() => scramble("StyleSeed")}>{text}</button>`,
  },
  {
    key: "confetti-pop",
    label: "Confetti",
    category: "flair",
    vibe: "Particle burst on success — celebrate the click",
    seed: "spring",
    snippet: `const COLORS = ["#FF6B6B", "#FFD93D", "#6C5CE7", "#4ECDC4"];
const [bits, setBits] = useState<number[]>([]);

<button onClick={() => setBits(Array.from({ length: 16 }, (_, i) => i))} className="relative">
  Celebrate
  {bits.map((i) => (
    <motion.span
      key={i}
      initial={{ x: 0, y: 0, opacity: 1 }}
      animate={{ x: (Math.random() - 0.5) * 180, y: (Math.random() - 0.5) * 180, opacity: 0, rotate: Math.random() * 360 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onAnimationComplete={() => setBits([])}
      style={{ position: "absolute", left: "50%", top: "50%", width: 8, height: 8, background: COLORS[i % 4] }}
    />
  ))}
</button>`,
  },

  // ── Toggle ───────────────────────────────────────────────
  {
    key: "toggle-flip",
    label: "Flip",
    category: "toggle",
    vibe: "3D Y-axis card flip between two faces",
    seed: "spring",
    snippet: `const [on, setOn] = useState(false);

<motion.button
  onClick={() => setOn((o) => !o)}
  animate={{ rotateY: on ? 180 : 0 }}
  transition={{ type: "spring", stiffness: 260, damping: 22 }}
  style={{ transformStyle: "preserve-3d", perspective: 800 }}
/>`,
  },
  {
    key: "toggle-slide",
    label: "Slide stack",
    category: "toggle",
    vibe: "Old value slides out, new slides in from the side",
    seed: "snap",
    snippet: `<AnimatePresence mode="popLayout" initial={false}>
  <motion.div
    key={index}
    initial={{ x: 40, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: -40, opacity: 0 }}
    transition={{ type: "spring", stiffness: 320, damping: 30 }}
  >
    {value}
  </motion.div>
</AnimatePresence>`,
  },
  {
    key: "toggle-morph",
    label: "Morph",
    category: "toggle",
    vibe: "Shape morphs — pill ⇄ circle, width + radius",
    seed: "silk",
    snippet: `const [on, setOn] = useState(false);

<motion.button
  onClick={() => setOn((o) => !o)}
  animate={{ borderRadius: on ? 999 : 16, width: on ? 56 : 160 }}
  transition={{ type: "spring", stiffness: 300, damping: 26 }}
/>`,
  },
  {
    key: "toggle-curtain",
    label: "Curtain",
    category: "toggle",
    vibe: "Top→bottom clip-path wipe reveals the panel",
    seed: "silk",
    snippet: `const [open, setOpen] = useState(false);

<motion.div
  initial={false}
  animate={{ clipPath: open ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)" }}
  transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.4 }}
/>`,
  },

  // ── Reveal ───────────────────────────────────────────────
  {
    key: "reveal-blur",
    label: "Blur in",
    category: "reveal",
    vibe: "Focus-pulls into place from a soft blur",
    seed: "float",
    snippet: `<motion.div
  initial={{ opacity: 0, filter: "blur(12px)", scale: 0.96 }}
  animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
/>`,
  },
  {
    key: "reveal-rise",
    label: "Text rise",
    category: "reveal",
    vibe: "Masked clip-path rise — text climbs into view",
    seed: "silk",
    snippet: `<motion.div
  initial={{ clipPath: "inset(100% 0 0 0)", y: 12 }}
  animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
/>`,
  },
  {
    key: "reveal-unfold",
    label: "Unfold",
    category: "reveal",
    vibe: "scaleY from the top edge, like an accordion",
    seed: "spring",
    snippet: `<motion.div
  style={{ transformOrigin: "top" }}
  initial={{ scaleY: 0, opacity: 0 }}
  animate={{ scaleY: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
/>`,
  },
  {
    key: "pop-in",
    label: "Pop in",
    category: "reveal",
    vibe: "Spring overshoot from zero — bouncy arrival",
    seed: "spring",
    snippet: `<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 500, damping: 16 }}
/>`,
  },

  // ── Press ────────────────────────────────────────────────
  {
    key: "press-squish",
    label: "Squish",
    category: "press",
    vibe: "Scale-down + tiny skew — jelly press",
    seed: "spring",
    snippet: `<motion.button
  whileTap={{ scale: 0.9, skewX: -4 }}
  transition={{ type: "spring", stiffness: 600, damping: 18 }}
/>`,
  },
  {
    key: "tap-ripple",
    label: "Ripple",
    category: "press",
    vibe: "Material-style radial ripple from the tap point",
    seed: "snap",
    snippet: `const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

function onTap(e: React.PointerEvent) {
  const r = e.currentTarget.getBoundingClientRect();
  setRipples((rs) => [...rs, { id: performance.now(), x: e.clientX - r.left, y: e.clientY - r.top }]);
}

<button onPointerDown={onTap} className="relative overflow-hidden">
  {ripples.map((r) => (
    <motion.span
      key={r.id}
      initial={{ scale: 0, opacity: 0.4 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))}
      style={{ position: "absolute", left: r.x, top: r.y, width: 40, height: 40, borderRadius: 999, background: "currentColor" }}
    />
  ))}
</button>`,
  },

  // ── Attention ────────────────────────────────────────────
  {
    key: "pulse-beat",
    label: "Heartbeat",
    category: "attention",
    vibe: "Looping scale pulse — alive, rhythmic",
    seed: "pulse",
    snippet: `<motion.div
  animate={{ scale: [1, 1.12, 1] }}
  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
/>`,
  },
  {
    key: "wiggle",
    label: "Wiggle",
    category: "attention",
    vibe: "Quick horizontal shake — error / wrong input",
    seed: "snap",
    snippet: `<motion.div
  animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
  transition={{ duration: 0.4 }}
/>`,
  },
  {
    key: "shimmer",
    label: "Shimmer",
    category: "attention",
    vibe: "Skeleton loading sweep across a surface",
    seed: "silk",
    snippet: `<motion.div
  animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
  style={{
    background: "linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)",
    backgroundSize: "200% 100%",
  }}
/>`,
  },

  // ── List ─────────────────────────────────────────────────
  {
    key: "stagger-cascade",
    label: "Cascade",
    category: "list",
    vibe: "Children fade-up one after another",
    seed: "silk",
    snippet: `<motion.ul initial="hidden" animate="show"
  variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
  {items.map((item) => (
    <motion.li
      key={item.id}
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
    >
      {item.label}
    </motion.li>
  ))}
</motion.ul>`,
  },
];

/** Keyword → entry, for the /ss-motion skill and Copy lookups. */
export const MOTION_BY_KEY: Record<string, MotionKeyword> = Object.fromEntries(
  MOTION_LIBRARY.map((m) => [m.key, m]),
);
