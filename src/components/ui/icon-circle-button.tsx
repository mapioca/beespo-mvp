"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type IconCircleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

export const IconCircleButton = React.forwardRef<
  HTMLButtonElement,
  IconCircleButtonProps
>(({ className, type = "button", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground ring-offset-background transition-colors",
        "hover:bg-[hsl(var(--table-filter-hover))] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})

IconCircleButton.displayName = "IconCircleButton"
