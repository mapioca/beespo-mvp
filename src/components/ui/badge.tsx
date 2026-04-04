import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
  {
    variants: {
      variant: {
        gray: "rounded-full border-transparent bg-gray-100 text-gray-700",
        primary: "rounded-full border-transparent bg-primary-light text-primary",
        success: "rounded-full border-transparent bg-success/10 text-success",
        warning: "rounded-full border-transparent bg-warning/15 text-warning",
        error: "rounded-full border-transparent bg-error/10 text-error",
        // Compatibility aliases
        default: "rounded-full border-transparent bg-primary-light text-primary",
        secondary: "rounded-full border-transparent bg-gray-100 text-gray-700",
        destructive: "rounded-full border-transparent bg-error/10 text-error",
        outline: "rounded-sm border-gray-200 bg-white text-gray-700",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "gray",
      size: "sm",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
