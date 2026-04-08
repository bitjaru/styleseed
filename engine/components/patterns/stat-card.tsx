import * as React from "react"
import { cn } from "../ui/utils"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

interface StatCardProps extends React.ComponentProps<"div"> {
  icon: LucideIcon
  label: string
  value: string | number
  unit?: string
  trend?: {
    value: string
    direction: "up" | "down"
  }
  children?: React.ReactNode
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  children,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="size-7 rounded-lg bg-brand/10 flex items-center justify-center">
          <Icon className="size-4 text-brand" strokeWidth={2} />
        </div>
        <p className="text-[12px] text-text-secondary font-medium uppercase tracking-[0.05em]">
          {label}
        </p>
      </div>

      <p className="text-text-primary text-[36px] font-bold leading-none tracking-[-0.02em] mb-3 whitespace-nowrap">
        {value}
        {unit && <span className="text-[18px] ms-0.5 tracking-normal">{unit}</span>}
      </p>

      {trend && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-[13px] font-bold",
              trend.direction === "up" ? "text-success" : "text-destructive",
            )}
          >
            {trend.value}
          </span>
          {trend.direction === "up" ? (
            <TrendingUp className="size-3.5 text-success" strokeWidth={2.5} />
          ) : (
            <TrendingDown className="size-3.5 text-destructive" strokeWidth={2.5} />
          )}
        </div>
      )}

      {children}
    </div>
  )
}

export { StatCard }
export type { StatCardProps }
