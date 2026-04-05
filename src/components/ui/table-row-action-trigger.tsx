"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MoreHorizontal } from "lucide-react"

type TableRowActionTriggerProps = React.ComponentPropsWithoutRef<typeof Button> & {
    className?: string
    iconClassName?: string
    label?: string
}

export const TableRowActionTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,
    TableRowActionTriggerProps
>(({ className, iconClassName, label = "Open actions", ...props }, ref) => {
    return (
        <Button
            ref={ref}
            variant="ghost"
            size="sm"
            className={cn(
                "h-8 w-8 rounded-full border border-transparent p-0 text-muted-foreground opacity-0 transition-[opacity,color,background-color,border-color]",
                "duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                "hover:bg-[hsl(var(--agenda-interactive-hover))] hover:text-foreground hover:border-border/50",
                "data-[state=open]:bg-[hsl(var(--agenda-interactive-active))] data-[state=open]:text-foreground data-[state=open]:border-border/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                className
            )}
            {...props}
        >
            <MoreHorizontal className={cn("h-4 w-4 stroke-[1.6]", iconClassName)} />
            <span className="sr-only">{label}</span>
        </Button>
    )
})

TableRowActionTrigger.displayName = "TableRowActionTrigger"
