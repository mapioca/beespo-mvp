import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void
}

export function FilterChip({ className, children, onRemove, ...props }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-[#F2F2F2] bg-[#F2F2F2] px-3 text-xs font-medium leading-none text-black",
        className
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 transition-colors hover:text-gray-700"
          aria-label="Remove filter"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}
