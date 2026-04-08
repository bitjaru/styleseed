import * as React from "react"
import { cn } from "../ui/utils"
import type { LucideIcon } from "lucide-react"

interface BriefingItem {
  icon: LucideIcon
  badge: string
  badgeColor: string
  title: string
  description: string
}

interface BriefingCarouselProps extends React.ComponentProps<"div"> {
  title?: string
  items: BriefingItem[]
  cardWidth?: string
}

function BriefingCarousel({
  title,
  items,
  cardWidth = "280px",
  className,
  ...props
}: BriefingCarouselProps) {
  return (
    <div
      data-slot="briefing-carousel"
      className={cn("px-6", className)}
      {...props}
    >
      {title && (
        <h3 className="text-text-primary font-bold text-[18px] leading-snug mb-4">
          {title}
        </h3>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item, index) => {
          const IconComponent = item.icon
          return (
            <div
              key={index}
              className="flex-shrink-0 bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]"
              style={{ width: cardWidth }}
            >
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <IconComponent
                    className="size-4"
                    style={{ color: item.badgeColor }}
                    strokeWidth={2.5}
                  />
                  <span
                    className="text-[12px] font-bold uppercase tracking-[0.05em]"
                    style={{ color: item.badgeColor }}
                  >
                    {item.badge}
                  </span>
                </div>
                <p className="text-text-primary text-[15px] font-bold mb-2 leading-tight">
                  {item.title}
                </p>
                <p className="text-text-tertiary text-[13px]">
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { BriefingCarousel }
export type { BriefingCarouselProps, BriefingItem }
