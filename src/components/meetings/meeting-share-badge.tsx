"use client"

import { ArrowUpRight, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface MeetingShareBadgeProps {
    type: "shared_with_me" | "shared_outward"
    sharedBy?: string
    fromWorkspace?: string
    onClick?: () => void
}

export function MeetingShareBadge({
    type,
    sharedBy,
    fromWorkspace,
    onClick,
}: MeetingShareBadgeProps) {
    const tooltipText =
        type === "shared_with_me"
            ? [
                  sharedBy ? `Shared by ${sharedBy}` : "Shared with you",
                  fromWorkspace ? `from ${fromWorkspace}` : null,
              ]
                  .filter(Boolean)
                  .join(" ")
            : "Click to manage sharing"

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onClick?.()
                        }}
                        className={cn(
                            "inline-flex items-center justify-center rounded h-4 w-4 shrink-0 transition-opacity hover:opacity-70",
                            type === "shared_with_me"
                                ? "text-amber-500"
                                : "text-indigo-500",
                            onClick ? "cursor-pointer" : "cursor-default"
                        )}
                        aria-label={tooltipText}
                    >
                        {type === "shared_with_me" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                            <Share2 className="h-3.5 w-3.5" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">{tooltipText}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
