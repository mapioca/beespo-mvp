"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
        arrowAlign?: "start" | "center" | "end";
        showArrow?: boolean;
    }
>(({ className, sideOffset = 4, arrowAlign = "center", showArrow = true, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "beespo-tooltip z-50 rounded-[6px] bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            {...props}
        >
            {props.children}
            {showArrow && (
                <TooltipPrimitive.Arrow
                    className="fill-foreground"
                    width={10}
                    height={6}
                    style={
                        arrowAlign === "start"
                            ? { left: 10, right: "auto" }
                            : arrowAlign === "end"
                                ? { right: 10, left: "auto" }
                                : undefined
                    }
                />
            )}
        </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
