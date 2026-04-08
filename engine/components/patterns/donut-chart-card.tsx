import * as React from "react"
import { cn } from "../ui/utils"

interface DonutItem {
  name: string
  value: number
  stock?: string | number
  unit?: string
}

interface BottomStat {
  label: string
  value: string | number
  subLabel?: string
}

interface DonutChartCardProps extends React.ComponentProps<"div"> {
  title: string
  centerValue?: string | number
  centerUnit?: string
  centerLabel?: string
  items: DonutItem[]
  selectedItem?: string | null
  onItemSelect?: (name: string | null) => void
  bottomStats?: BottomStat[]
  bottomColumns?: number
  chartElement: React.ReactNode
}

function DonutChartCard({
  title,
  centerValue,
  centerUnit,
  centerLabel,
  items,
  selectedItem,
  onItemSelect,
  bottomStats,
  bottomColumns = 4,
  chartElement,
  className,
  ...props
}: DonutChartCardProps) {
  const grayColors = ["#D4D4D4", "#A8A8A8", "#8B8B8B", "#6B6B6B"]

  return (
    <div
      data-slot="donut-chart-card"
      className={cn(
        "mx-6 bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      <h3 className="text-text-primary font-bold text-[18px] leading-snug mb-4">
        {title}
      </h3>

      <div className="flex items-center gap-8">
        <div className="relative size-32 flex-shrink-0">
          {chartElement}
          {(centerValue !== undefined || centerLabel) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {centerValue !== undefined && (
                  <p className="text-text-primary text-[24px] font-bold leading-none whitespace-nowrap">
                    {centerValue}
                    {centerUnit && <span className="text-[12px] ms-0.5">{centerUnit}</span>}
                  </p>
                )}
                {centerLabel && (
                  <p className="text-text-tertiary text-[10px] mt-1 font-medium uppercase">
                    {centerLabel}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3.5">
          {items.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between cursor-pointer transition-all duration-300"
              onClick={() => onItemSelect?.(selectedItem === item.name ? null : item.name)}
              style={{
                opacity: selectedItem === null || selectedItem === undefined || selectedItem === item.name ? 1 : 0.3,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="size-3 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: selectedItem === item.name ? "var(--brand)" : grayColors[index % grayColors.length],
                    boxShadow: selectedItem === item.name ? "0 0 0 2px #721FE540" : "none",
                  }}
                />
                <span className="text-text-primary text-[13px] font-semibold">{item.name}</span>
              </div>
              {item.stock !== undefined && (
                <span className="text-text-primary text-[15px] font-bold whitespace-nowrap">
                  {item.stock}
                  {item.unit && <span className="text-[10px] ms-0.5">{item.unit}</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {bottomStats && bottomStats.length > 0 && (
        <div
          className="gap-3 mt-6 pt-6 border-t border-surface-muted"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${bottomColumns}, 1fr)`,
          }}
        >
          {bottomStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[11px] text-text-secondary mb-1.5 font-medium uppercase">
                {stat.label}
              </p>
              <p className="text-text-primary font-bold text-[20px] leading-none">
                {stat.value}
              </p>
              {stat.subLabel && (
                <p className="text-[11px] text-text-secondary mt-0.5">{stat.subLabel}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { DonutChartCard }
export type { DonutChartCardProps, DonutItem, BottomStat }
