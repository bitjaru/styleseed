import * as React from "react"
import { cn } from "../ui/utils"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  name: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
}

interface BottomNavProps extends React.ComponentProps<"nav"> {
  items: NavItem[]
  activeIndex?: number
  maxWidth?: string
}

function BottomNav({
  items,
  activeIndex = 0,
  maxWidth = "430px",
  className,
  ...props
}: BottomNavProps) {
  return (
    <nav
      data-slot="bottom-nav"
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t border-surface-muted pb-safe",
        className,
      )}
      {...props}
    >
      <div
        className="mx-auto flex items-center justify-around px-6 py-3"
        style={{ maxWidth }}
      >
        {items.map((item, index) => {
          const Icon = item.icon
          const isActive = index === activeIndex
          return (
            <button
              key={item.name}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center gap-1 min-w-11 min-h-11 justify-center",
                "transition-colors duration-[var(--duration-fast)]",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
                isActive ? "text-brand" : "text-text-disabled",
              )}
            >
              <Icon className="size-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export { BottomNav }
export type { BottomNavProps, NavItem }
