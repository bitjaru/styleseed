import * as React from "react"
import { cn } from "../ui/utils"

interface TopBarProps extends React.ComponentProps<"header"> {
  logo?: React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
}

function TopBar({
  logo,
  subtitle,
  actions,
  className,
  ...props
}: TopBarProps) {
  return (
    <header
      data-slot="top-bar"
      className={cn("px-6 pt-8 pb-6", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">{logo}</div>
        {actions && (
          <div className="flex items-center gap-3">{actions}</div>
        )}
      </div>
      {subtitle && (
        <p className="text-[13px] text-text-tertiary font-medium mt-3">
          {subtitle}
        </p>
      )}
    </header>
  )
}

interface TopBarActionProps extends React.ComponentProps<"button"> {
  badge?: boolean
}

function TopBarAction({
  badge,
  className,
  children,
  ...props
}: TopBarActionProps) {
  return (
    <button
      data-slot="top-bar-action"
      className={cn(
        "relative size-10 rounded-full bg-card shadow-[var(--shadow-button)] flex items-center justify-center",
        "hover:shadow-[var(--shadow-card-hover)] transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
      {badge && (
        <span className="absolute top-1 right-1 size-1.5 bg-alert-badge rounded-full" />
      )}
    </button>
  )
}

export { TopBar, TopBarAction }
export type { TopBarProps, TopBarActionProps }
