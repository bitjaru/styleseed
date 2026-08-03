import * as React from "react"
import { cn } from "../ui/utils"
import type { StyleSeedRecipe } from "../recipes"

interface PageShellProps extends React.ComponentProps<"div"> {
  maxWidth?: string
  recipe?: StyleSeedRecipe
}

function PageShell({
  maxWidth = "430px",
  recipe,
  className,
  children,
  ...props
}: PageShellProps) {
  return (
    <div
      className="min-h-screen bg-surface-page"
      data-styleseed-recipe={recipe}
      {...props}
    >
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
      className={cn("pb-24 flex flex-col ss-pattern-stack", className)}
      {...props}
    >
      {children}
    </main>
  )
}

export { PageShell, PageContent }
export type { PageShellProps, PageContentProps }
