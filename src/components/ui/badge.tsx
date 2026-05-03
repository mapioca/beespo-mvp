import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--primary-pill-border))] bg-[hsl(var(--primary-pill-bg))] text-[hsl(var(--primary-pill-foreground))] shadow hover:bg-[hsl(var(--primary-pill-hover))]",
        primaryFill:
          "border-transparent bg-[hsl(var(--primary-chip-fill-bg))] text-[hsl(var(--primary-chip-fill-foreground))] hover:bg-[hsl(var(--primary-chip-fill-hover))]",
        secondary:
          "border-[hsl(var(--secondary-border))] bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]",
        secondaryFill:
          "border-transparent bg-[hsl(var(--secondary-chip-fill-bg))] text-[hsl(var(--secondary-chip-fill-foreground))] hover:bg-[hsl(var(--secondary-chip-fill-hover))]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
