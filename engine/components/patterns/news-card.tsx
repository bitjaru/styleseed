import * as React from "react"
import { cn } from "../ui/utils"

interface NewsCardProps extends React.ComponentProps<"div"> {
  title: string
  summary?: string
  source?: string
  timestamp?: string
  trend?: "up" | "down" | "neutral"
  onClick?: () => void
}

function NewsCard({
  title,
  summary,
  source,
  timestamp,
  trend,
  onClick,
  className,
  ...props
}: NewsCardProps) {
  return (
    <div
      data-slot="news-card"
      className={cn(
        "bg-card rounded-2xl p-5 shadow-[var(--shadow-card)]",
        onClick && "cursor-pointer active:bg-surface-subtle transition-colors duration-150",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-bold text-[14px] leading-snug line-clamp-2 mb-1.5">
            {title}
          </p>
          {summary && (
            <p className="text-text-tertiary text-[13px] leading-normal line-clamp-2 mb-2">
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-text-disabled">
            {source && <span>{source}</span>}
            {source && timestamp && <span>·</span>}
            {timestamp && <span>{timestamp}</span>}
          </div>
        </div>

        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "shrink-0 text-[12px] font-bold mt-0.5",
              trend === "up" ? "text-destructive" : "text-info",
            )}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  )
}

export { NewsCard }
export type { NewsCardProps }
