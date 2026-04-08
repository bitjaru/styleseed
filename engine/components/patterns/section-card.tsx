import * as React from "react"
import { cn } from "../ui/utils"

interface SectionCardProps extends React.ComponentProps<"div"> {
  title?: string
  headerRight?: React.ReactNode
  footer?: React.ReactNode
}

function SectionCard({
  title,
  headerRight,
  footer,
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <div
      data-slot="section-card"
      className={cn(
        "mx-6 bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-text-primary font-bold text-[18px] leading-snug">
              {title}
            </h3>
          )}
          {headerRight}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-5">
          {footer}
        </div>
      )}
    </div>
  )
}

export { SectionCard }
export type { SectionCardProps }
