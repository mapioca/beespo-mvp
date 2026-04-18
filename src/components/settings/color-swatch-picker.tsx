import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface ColorSwatchPickerProps {
  colors: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function ColorSwatchPicker({
  colors,
  value,
  onChange,
  disabled = false,
  className,
}: ColorSwatchPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-[var(--settings-swatch-gap)]", className)}>
      {colors.map((option) => {
        const isSelected = option === value
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "relative inline-flex h-[var(--settings-swatch-size)] w-[var(--settings-swatch-size)] items-center justify-center rounded-full border transition",
              "border-[hsl(var(--settings-swatch-border))]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--settings-swatch-ring))] focus-visible:ring-offset-2",
              isSelected && "ring-1 ring-[hsl(var(--settings-swatch-ring))]",
              disabled && "cursor-not-allowed opacity-55"
            )}
            style={{ backgroundColor: option }}
            disabled={disabled}
            aria-label={`Select ${option} color`}
            aria-pressed={isSelected}
          >
            {isSelected ? <Check className="h-3 w-3 text-white" /> : null}
          </button>
        )
      })}
    </div>
  )
}
