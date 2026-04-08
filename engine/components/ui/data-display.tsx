import * as React from "react"
import { cn } from "./utils"

interface DataDisplayProps extends React.ComponentProps<"div"> {
  label: string
  value: string | number
  icon?: React.ReactNode
  highlighted?: boolean
}

function DataDisplay({
  label,
  value,
  icon,
  highlighted = false,
  className,
  ...props
}: DataDisplayProps) {
  return (
    <div
      data-slot="data-display"
      className={cn(
        "flex items-center gap-2 px-4 py-3 bg-card rounded-lg border border-surface-muted min-h-12",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="size-6 text-brand shrink-0">{icon}</div>
      )}
      <span className="text-[12px] font-medium text-text-secondary min-w-20">
        {label}
      </span>
      <span
        className={cn(
          "text-[14px] font-semibold flex-1",
          highlighted ? "text-brand" : "text-text-primary",
        )}
      >
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
      </span>
    </div>
  )
}

export { DataDisplay }
export type { DataDisplayProps }
