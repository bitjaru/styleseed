import * as React from "react"
import { cn } from "../ui/utils"

interface RankedItem {
  rank: number
  name: string
  value: string | number
  isHighlighted?: boolean
  badge?: string
}

interface RankedListProps extends React.ComponentProps<"div"> {
  title: string
  items: RankedItem[]
  footer?: React.ReactNode
}

function RankedList({
  title,
  items,
  footer,
  className,
  ...props
}: RankedListProps) {
  return (
    <div
      data-slot="ranked-list"
      className={cn(
        "mx-6 bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      <h3 className="text-text-primary font-bold text-[18px] leading-snug mb-5">
        {title}
      </h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.rank}
            className={cn(
              "flex items-center justify-between p-5 rounded-xl transition-all",
              item.isHighlighted
                ? "bg-brand-tint border-2 border-brand"
                : "bg-surface-subtle",
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center text-[12px] font-bold",
                  item.isHighlighted
                    ? "bg-brand text-white"
                    : "bg-surface-muted text-text-tertiary",
                )}
              >
                {item.rank}
              </div>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "font-bold text-[14px]",
                    item.isHighlighted ? "text-brand" : "text-text-primary",
                  )}
                >
                  {item.name}
                </p>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-brand text-white text-[9px] font-bold rounded uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>

            <p className="text-text-primary font-bold text-[17px]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {footer && (
        <p className="text-[12px] text-text-secondary text-center mt-5 font-medium">
          {footer}
        </p>
      )}
    </div>
  )
}

export { RankedList }
export type { RankedListProps, RankedItem }
