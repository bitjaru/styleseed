import * as React from "react"
import { cn } from "../ui/utils"

interface ValueDisplayProps extends React.ComponentProps<"div"> {
  value: number
  change?: number
  prefix?: string
  size?: "sm" | "md" | "lg"
  formatType?: "integer" | "decimal"
  showArrow?: boolean
}

function ValueDisplay({
  value,
  change,
  prefix = "₩",
  size = "md",
  formatType = "integer",
  showArrow = true,
  className,
  ...props
}: ValueDisplayProps) {
  const formatValue = (n: number) => {
    if (formatType === "decimal") {
      return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return Math.round(n).toLocaleString("ko-KR")
  }

  const sizeStyles = {
    sm: { value: "text-[16px] font-semibold leading-tight tracking-[-0.01em]", change: "text-[12px]" },
    md: { value: "text-[20px] font-semibold leading-tight tracking-[-0.02em]", change: "text-[14px]" },
    lg: { value: "text-[24px] font-bold leading-none tracking-[-0.02em]", change: "text-[14px]" },
  }

  return (
    <div
      data-slot="value-display"
      className={cn("flex flex-col items-end justify-center min-w-20", className)}
      {...props}
    >
      <p className={cn("text-text-primary whitespace-nowrap", sizeStyles[size].value)}>
        {prefix}{formatValue(value)}
      </p>

      {change !== undefined && change !== 0 && (
        <p
          className={cn(
            "flex items-center gap-0.5 whitespace-nowrap",
            sizeStyles[size].change,
            change > 0 ? "text-destructive" : "text-info",
          )}
        >
          {showArrow && <span>{change > 0 ? "▲" : "▼"}</span>}
          <span>{formatValue(Math.abs(change))}</span>
        </p>
      )}
    </div>
  )
}

export { ValueDisplay }
export type { ValueDisplayProps }
