import * as React from "react"
import { cn } from "./utils"

interface SegmentedControlProps extends React.ComponentProps<"div"> {
  segments: string[]
  activeIndex: number
  onChange?: (index: number) => void
  size?: "sm" | "md"
}

function SegmentedControl({
  segments,
  activeIndex,
  onChange,
  size = "md",
  className,
  ...props
}: SegmentedControlProps) {
  return (
    <div
      data-slot="segmented-control"
      className={cn(
        "flex items-center bg-surface-muted w-full",
        size === "sm" ? "p-0.5 gap-0.5 rounded-lg" : "p-1 gap-1 rounded-xl",
        className,
      )}
      {...props}
    >
      {segments.map((segment, index) => {
        const isActive = index === activeIndex
        return (
          <button
            key={index}
            onClick={() => onChange?.(index)}
            className={cn(
              "flex-1 flex items-center justify-center font-medium transition-all duration-150",
              size === "sm"
                ? "h-7 text-[12px] rounded-md"
                : "h-9 text-[14px] rounded-lg",
              isActive
                ? "bg-card text-text-primary shadow-[var(--shadow-card)]"
                : "bg-transparent text-text-disabled",
            )}
          >
            {segment}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps }
