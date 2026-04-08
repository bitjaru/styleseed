import * as React from "react"
import { cn } from "../ui/utils"

interface PageShellProps extends React.ComponentProps<"div"> {
  maxWidth?: string
}

function PageShell({
  maxWidth = "430px",
  className,
  children,
  ...props
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-surface-page" {...props}>
      <div
        data-slot="page-shell"
        className={cn("mx-auto bg-surface-page min-h-screen relative", className)}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}

interface PageContentProps extends React.ComponentProps<"main"> {}

function PageContent({ className, children, ...props }: PageContentProps) {
  return (
    <main
      data-slot="page-content"
      className={cn("pb-24 space-y-6", className)}
      {...props}
    >
      {children}
    </main>
  )
}

export { PageShell, PageContent }
export type { PageShellProps, PageContentProps }
