/**
 * StyleSeed / Toss — Motion Primitives (Framer Motion)
 *
 * Pre-configured animation wrappers that follow the design language.
 * Install: npm install framer-motion
 */
import * as React from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { cn } from "./utils"

// ── Duration & Easing Tokens ────────────────────────

export const duration = {
  fast: 0.1,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.35,
} as const

export const ease = {
  default: [0.25, 0.1, 0.25, 1.0],
  in: [0.4, 0, 1, 1],
  out: [0, 0, 0.2, 1],
  spring: { type: "spring" as const, damping: 25, stiffness: 300 },
} as const

// ── Preset Variants ─────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: "100%" },
}

export const slideRight: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0 },
  exit: { x: "100%" },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// ── FadeIn ──────────────────────────────────────────

interface FadeInProps extends React.ComponentProps<typeof motion.div> {
  delay?: number
}

function FadeIn({ delay = 0, className, children, ...props }: FadeInProps) {
  return (
    <motion.div
      data-slot="fade-in"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: duration.normal, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── FadeUp (Card entry animation) ───────────────────

interface FadeUpProps extends React.ComponentProps<typeof motion.div> {
  delay?: number
}

function FadeUp({ delay = 0, className, children, ...props }: FadeUpProps) {
  return (
    <motion.div
      data-slot="fade-up"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: duration.normal, delay, ease: ease.out }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger (Card grid entry) ───────────────────────

interface StaggerProps extends React.ComponentProps<typeof motion.div> {
  staggerDelay?: number
}

function Stagger({ staggerDelay = 0.05, className, children, ...props }: StaggerProps) {
  return (
    <motion.div
      data-slot="stagger"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function StaggerItem({ className, children, ...props }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      data-slot="stagger-item"
      variants={fadeUp}
      transition={{ duration: duration.normal, ease: ease.out }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── PresenceModal (Modal/Sheet enter + exit) ────────

interface PresenceModalProps {
  isOpen: boolean
  children: React.ReactNode
  variant?: "fade" | "slideUp" | "scale"
  className?: string
}

function PresenceModal({ isOpen, children, variant = "fade", className }: PresenceModalProps) {
  const variants = {
    fade: fadeIn,
    slideUp: slideUp,
    scale: scaleIn,
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-slot="presence-modal"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants[variant]}
          transition={{
            duration: variant === "slideUp" ? duration.moderate : duration.normal,
            ease: ease.out,
          }}
          className={cn(className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Backdrop ────────────────────────────────────────

interface BackdropProps {
  isOpen: boolean
  onClick?: () => void
  className?: string
}

function Backdrop({ isOpen, onClick, className }: BackdropProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-slot="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.normal }}
          onClick={onClick}
          className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm z-40", className)}
        />
      )}
    </AnimatePresence>
  )
}

// ── PageTransition (Page entry stagger) ─────────────

function PageTransition({ className, children, ...props }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      data-slot="page-transition"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function PageSection({ className, children, ...props }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      data-slot="page-section"
      variants={fadeUp}
      transition={{ duration: duration.normal, ease: ease.out }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── NumberCounter (Hero metric counting) ────────────

interface NumberCounterProps {
  value: number
  duration?: number
  className?: string
}

function NumberCounter({ value, duration: d = 0.6, className }: NumberCounterProps) {
  const [display, setDisplay] = React.useState(0)
  const prefersReducedMotion = React.useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )

  React.useEffect(() => {
    if (prefersReducedMotion.current) {
      setDisplay(value)
      return
    }

    let start = 0
    const startTime = performance.now()

    function step(currentTime: number) {
      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / d, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [value, d])

  return <span data-slot="number-counter" className={className}>{display.toLocaleString()}</span>
}

export {
  FadeIn,
  FadeUp,
  Stagger,
  StaggerItem,
  PresenceModal,
  Backdrop,
  PageTransition,
  PageSection,
  NumberCounter,
}
