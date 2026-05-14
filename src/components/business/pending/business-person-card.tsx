"use client"

import { cn } from "@/lib/utils"
import {
  BUSINESS_CATEGORY_LABEL,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

const CATEGORY_PILL_TONE: Record<
  BusinessCategoryKey,
  { bg: string; text: string; border: string }
> = {
  sustaining: {
    bg: "bg-[hsl(var(--brand)/0.08)]",
    text: "text-[hsl(var(--brand))]",
    border: "border-[hsl(var(--brand)/0.28)]",
  },
  release: {
    bg: "bg-[hsl(var(--brand)/0.08)]",
    text: "text-[hsl(var(--brand))]",
    border: "border-[hsl(var(--brand)/0.28)]",
  },
  ordination: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
  confirmation_ordinance: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
  new_member_welcome: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
  child_blessing: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
  records_received: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-muted-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
  miscellaneous: {
    bg: "bg-[hsl(var(--chip-bg))]",
    text: "text-muted-foreground",
    border: "border-[hsl(var(--chip-border))]",
  },
}

export interface BusinessPersonCardProps {
  name: string
  subtitle?: string | null
  category: BusinessCategoryKey
  onOpen?: () => void
  rightSlot?: React.ReactNode
  className?: string
}

export function BusinessPersonCard({
  name,
  subtitle,
  category,
  onOpen,
  rightSlot,
  className,
}: BusinessPersonCardProps) {
  const tone = CATEGORY_PILL_TONE[category]

  const content = (
    <>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent-warm))] text-[10.5px] font-semibold uppercase tracking-wide text-foreground/80">
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[14px] leading-tight text-foreground">
          {name}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {rightSlot ?? (
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center rounded-full border px-2.5 py-[3px] text-[10.5px] font-medium leading-none",
            tone.bg,
            tone.text,
            tone.border
          )}
        >
          {BUSINESS_CATEGORY_LABEL[category]}
        </span>
      )}
    </>
  )

  const baseClass = cn(
    "flex items-center gap-3 rounded-xl border border-border/60 bg-surface-raised px-3 py-2.5 shadow-[var(--shadow-builder-card)] transition-colors",
    onOpen && "cursor-pointer hover:border-border hover:bg-surface-hover",
    className
  )

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={cn(baseClass, "text-left w-full")}>
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}
