import * as React from "react"
import { cn } from "../ui/utils"

interface ListItemProps extends React.ComponentProps<"div"> {
  leading?: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  status?: {
    label: string
    color: string
  }
}

function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  status,
  className,
  ...props
}: ListItemProps) {
  return (
    <div
      data-slot="list-item"
      className={cn(
        "flex items-center justify-between p-5 rounded-xl bg-surface-subtle",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3.5">
        {leading}
        <div>
          <p className="text-text-primary font-bold text-[14px] leading-snug mb-1.5">
            {title}
          </p>
          {status && (
            <div className="inline-flex items-center">
              <span
                className="size-1.5 rounded-full me-1.5"
                style={{ backgroundColor: status.color }}
              />
              <span
                className="text-[11px] font-bold"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>
          )}
          {subtitle && !status && (
            <p className="text-[12px] text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  )
}

export { ListItem }
export type { ListItemProps }
