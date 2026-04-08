import * as React from "react"
import { cn } from "../ui/utils"

interface ChartStat {
  label: string
  value: string | number
  unit?: string
}

interface ChartCardProps extends React.ComponentProps<"div"> {
  title?: string
  headerLeft?: React.ReactNode
  periods?: string[]
  activePeriod?: string
  onPeriodChange?: (period: string) => void
  stats?: ChartStat[]
  statsColumns?: number
}

function ChartCard({
  title,
  headerLeft,
  periods,
  activePeriod,
  onPeriodChange,
  stats,
  statsColumns = 3,
  className,
  children,
  ...props
}: ChartCardProps) {
  return (
    <div
      data-slot="chart-card"
      className={cn(
        "mx-6 bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          {title && (
            <h3 className="text-text-primary font-bold text-[18px] leading-snug">
              {title}
            </h3>
          )}
          {headerLeft}
        </div>

        {periods && (
          <div className="flex gap-1 bg-surface-muted p-1 rounded-full">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange?.(period)}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-semibold rounded-full transition-all",
                  activePeriod === period
                    ? "bg-brand text-white shadow-sm"
                    : "text-text-tertiary",
                )}
              >
                {period}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-40 -mx-2 mb-6">
        {children}
      </div>

      {stats && stats.length > 0 && (
        <div
          className="gap-3 pt-5 border-t border-surface-muted"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${statsColumns}, 1fr)`,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[11px] text-text-secondary mb-2 font-medium uppercase">
                {stat.label}
              </p>
              <p className="text-text-primary font-bold text-[18px] leading-none whitespace-nowrap">
                {stat.value}
                {stat.unit && <span className="text-[10px] ms-0.5">{stat.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { ChartCard }
export type { ChartCardProps, ChartStat }
