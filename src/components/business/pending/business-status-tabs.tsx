"use client"

import { cn } from "@/lib/utils"

export type BusinessLifecycleStatus = "pending" | "scheduled" | "presented"

interface BusinessStatusTabsProps {
  active: BusinessLifecycleStatus
  counts: Record<BusinessLifecycleStatus, number>
  onChange: (value: BusinessLifecycleStatus) => void
  className?: string
}

const TABS: { value: BusinessLifecycleStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "presented", label: "Presented" },
]

export function BusinessStatusTabs({
  active,
  counts,
  onChange,
  className,
}: BusinessStatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Business status"
      className={cn(
        "flex items-center gap-5 border-b border-border/60",
        className
      )}
    >
      {TABS.map(({ value, label }) => {
        const isActive = active === value
        const count = counts[value]
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={cn(
              "group relative flex items-center gap-2 border-b-2 border-transparent px-1 pb-2.5 pt-1 text-[13.5px] transition-colors",
              isActive
                ? "border-brand font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold leading-none transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border border-[hsl(var(--chip-border))]"
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
