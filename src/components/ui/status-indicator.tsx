"use client"

import { cn } from "@/lib/utils"

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

const DOT_CLASSES: Record<StatusTone, string> = {
    neutral: "bg-zinc-400/70",
    info: "bg-blue-400/65",
    success: "bg-emerald-500/65",
    warning: "bg-amber-500/65",
    danger: "bg-rose-500/65",
}

interface StatusIndicatorProps {
    label: string
    tone?: StatusTone
    className?: string
}

export function StatusIndicator({
    label,
    tone = "neutral",
    className,
}: StatusIndicatorProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 text-[var(--table-meta-font-size)] font-medium leading-5 text-muted-foreground",
                className
            )}
        >
            <span className={cn("h-[4px] w-[4px] rounded-full", DOT_CLASSES[tone])} aria-hidden />
            <span>{label}</span>
        </span>
    )
}
