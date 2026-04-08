import * as React from "react"
import { cn } from "./utils"

interface DrawerProps extends React.ComponentProps<"div"> {
  isOpen: boolean
  onClose: () => void
  title: string
  position?: "left" | "right"
  width?: string
  footer?: React.ReactNode
}

function Drawer({
  isOpen,
  onClose,
  title,
  position = "right",
  width = "w-80",
  footer,
  className,
  children,
  ...props
}: DrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-[var(--duration-normal)]",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-slot="drawer"
        className={cn(
          "fixed top-0 h-full bg-card shadow-[var(--shadow-modal)] z-50",
          "transform transition-transform duration-[var(--duration-moderate)]",
          width,
          position === "right" && "right-0",
          position === "left" && "left-0",
          position === "right" && (isOpen ? "translate-x-0" : "translate-x-full"),
          position === "left" && (isOpen ? "translate-x-0" : "-translate-x-full"),
          className,
        )}
        {...props}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-muted shrink-0">
            <h2 className="text-text-primary font-bold text-[18px] leading-snug">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-lg active:bg-surface-muted/50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-surface-muted shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { Drawer }
export type { DrawerProps }
