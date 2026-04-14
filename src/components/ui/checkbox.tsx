"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type CheckboxVariant = "default" | "form"

interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  variant?: CheckboxVariant
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant = "default", ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      variant === "form"
        ? "grid place-content-center peer h-[var(--form-checkbox-size)] w-[var(--form-checkbox-size)] shrink-0 rounded-[var(--form-checkbox-radius)] border border-[hsl(var(--form-checkbox-border))] bg-[hsl(var(--form-checkbox-bg))] text-[hsl(var(--form-checkbox-check))] transition-colors shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--form-checkbox-focus))] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[hsl(var(--form-checkbox-checked-bg))] data-[state=checked]:text-[hsl(var(--form-checkbox-checked-check))] data-[state=checked]:border-[hsl(var(--form-checkbox-checked-border))]"
        : "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-input shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className={cn(variant === "form" ? "h-3.5 w-3.5" : "h-4 w-4")} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
