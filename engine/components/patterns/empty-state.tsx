import * as React from "react"
import { cn } from "../ui/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="size-8 rounded-xl bg-surface-muted flex items-center justify-center mb-3">
          <Icon className="size-4 text-text-tertiary" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-[16px] font-bold text-text-primary tracking-[-0.01em] mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-[14px] leading-normal text-text-secondary mb-6 max-w-[280px]">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
