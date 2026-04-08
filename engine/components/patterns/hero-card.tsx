import * as React from "react"
import { cn } from "../ui/utils"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

interface HeroCardProps extends React.ComponentProps<"div"> {
  icon: LucideIcon
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: string
    direction: "up" | "down"
    label?: string
  }
  backgroundElement?: React.ReactNode
  watermarkIcon?: LucideIcon
}

function HeroCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  backgroundElement,
  watermarkIcon: WatermarkIcon,
  className,
  ...props
}: HeroCardProps) {
  return (
    <div
      data-slot="hero-card"
      className={cn(
        "mx-6 rounded-2xl bg-card p-8 shadow-[var(--shadow-card)] relative overflow-hidden",
        className,
      )}
      {...props}
    >
      {backgroundElement && (
        <div className="absolute inset-0 opacity-[0.15]">
          {backgroundElement}
        </div>
      )}

      {WatermarkIcon && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06]">
          <WatermarkIcon className="size-32 text-brand" strokeWidth={1.5} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-xl bg-brand/10 flex items-center justify-center">
            <Icon className="size-[18px] text-brand" strokeWidth={2} />
          </div>
          <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.05em]">
            {label}
          </p>
        </div>

        <p className="text-text-primary text-[48px] font-bold leading-none tracking-[-0.02em] mb-4 whitespace-nowrap">
          {value}
          {unit && <span className="text-[24px] ms-0.5 tracking-normal">{unit}</span>}
        </p>

        {trend && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-[15px] font-bold",
                  trend.direction === "up" ? "text-success" : "text-destructive",
                )}
              >
                {trend.value}
              </span>
              {trend.direction === "up" ? (
                <TrendingUp className="size-4 text-success" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="size-4 text-destructive" strokeWidth={2.5} />
              )}
            </div>
            {trend.label && (
              <span className="text-[13px] text-text-tertiary font-medium">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { HeroCard }
export type { HeroCardProps }
