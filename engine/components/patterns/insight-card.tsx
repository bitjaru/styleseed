import * as React from "react"
import { cn } from "../ui/utils"
import type { LucideIcon } from "lucide-react"

interface InsightCardProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon
  title: string
  description: string
  tags?: { label: string; icon?: LucideIcon }[]
  action?: React.ReactNode
  variant?: "default" | "highlighted"
}

function InsightCard({
  icon: Icon,
  title,
  description,
  tags,
  action,
  variant = "default",
  className,
  ...props
}: InsightCardProps) {
  return (
    <div
      data-slot="insight-card"
      className={cn(
        "mx-6 rounded-2xl p-6 shadow-[var(--shadow-card)]",
        variant === "highlighted"
          ? "bg-brand-tint border border-brand/20"
          : "bg-card",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="size-8 rounded-xl bg-brand/10 flex items-center justify-center mb-3">
          <Icon className="size-[18px] text-brand" strokeWidth={2} />
        </div>
      )}

      <p className="text-text-primary font-bold text-[15px] leading-tight mb-2">
        {title}
      </p>
      <p className="text-text-tertiary text-[13px] leading-normal mb-4">
        {description}
      </p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-[11px] font-medium text-text-secondary"
            >
              {tag.icon && <tag.icon className="size-3" />}
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {action}
    </div>
  )
}

export { InsightCard }
export type { InsightCardProps }
