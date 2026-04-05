import * as React from "react"
import { cn } from "@/lib/utils"

export interface UnderlineTabItem<T extends string = string> {
  value: T
  label: string
}

interface UnderlineTabsProps<T extends string = string> {
  items: ReadonlyArray<UnderlineTabItem<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}

export function UnderlineTabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
}: UnderlineTabsProps<T>) {
  return (
    <div className={cn("flex min-h-9 items-center gap-4 sm:gap-6", className)} role="tablist">
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "h-9 border-b-2 px-0 text-sm leading-none transition-colors",
              isActive
                ? "border-primary font-semibold text-gray-900"
                : "border-transparent font-medium text-gray-500 hover:text-gray-900"
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
