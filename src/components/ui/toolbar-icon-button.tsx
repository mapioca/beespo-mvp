"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ToolbarIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const ToolbarIconButton = React.forwardRef<
  HTMLButtonElement,
  ToolbarIconButtonProps
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "inline-flex h-[var(--agenda-icon-control-size)] w-[var(--agenda-icon-control-size)] select-none items-center justify-center rounded-full border border-border text-muted-foreground transition-colors shrink-0 [&>*]:pointer-events-none",
      "hover:text-foreground hover:border-border/70 hover:bg-[hsl(var(--agenda-interactive-hover))]",
      "data-[state=open]:text-foreground data-[state=open]:border-border/70 data-[state=open]:bg-[hsl(var(--agenda-interactive-active))]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-[var(--agenda-interactive-disabled-opacity)]",
      className
    )}
    {...props}
  />
))

ToolbarIconButton.displayName = "ToolbarIconButton"
