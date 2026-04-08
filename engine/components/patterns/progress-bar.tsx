import * as React from "react"
import { cn } from "../ui/utils"

/* === Linear Progress Bar === */

interface ProgressBarProps extends React.ComponentProps<"div"> {
  value: number
  max?: number
  height?: string
  label?: string
}

function ProgressBar({
  value,
  max = 100,
  height = "h-4",
  label,
  className,
  ...props
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div data-slot="progress-bar" className={cn("", className)} {...props}>
      <div className={cn("bg-surface-muted rounded-full overflow-hidden", height)}>
        <div
          className={cn("bg-brand h-full rounded-full transition-all duration-300")}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && (
        <p className="text-[11px] text-text-primary mt-2 font-bold">{label}</p>
      )}
    </div>
  )
}

/* === Discrete Bar Segments (게이지) === */

interface DiscreteBarProps extends React.ComponentProps<"div"> {
  total: number
  filled: number
  height?: string
}

function DiscreteBar({
  total,
  filled,
  height = "h-6",
  className,
  ...props
}: DiscreteBarProps) {
  return (
    <div
      data-slot="discrete-bar"
      className={cn("flex gap-1", className)}
      {...props}
    >
      {[...Array(total)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded",
            height,
            i < filled ? "bg-brand" : "bg-surface-muted",
          )}
        />
      ))}
    </div>
  )
}

/* === Progress Bar with Label (오늘 방문 스타일) === */

interface ProgressBarWithLabelProps extends React.ComponentProps<"div"> {
  value: number
  max?: number
  label: string
}

function ProgressBarWithLabel({
  value,
  max = 100,
  label,
  className,
  ...props
}: ProgressBarWithLabelProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      data-slot="progress-bar-with-label"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <div className="flex-1 bg-surface-muted rounded-full h-4">
        <div
          className="bg-brand h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] text-text-primary font-bold">{label}</span>
    </div>
  )
}

export { ProgressBar, DiscreteBar, ProgressBarWithLabel }
export type { ProgressBarProps, DiscreteBarProps, ProgressBarWithLabelProps }
