import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border focus-visible:border-foreground/30 disabled:pointer-events-none disabled:cursor-not-allowed [&>*]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-bg-hover)] hover:text-[var(--btn-primary-text-hover)] active:bg-[var(--btn-primary-bg-active)] active:text-[var(--btn-primary-text-active)] disabled:bg-[var(--btn-primary-bg-disabled)] disabled:text-[var(--btn-primary-text-disabled)] disabled:border disabled:border-[var(--btn-primary-border-disabled)] disabled:opacity-100",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-50",
        outline:
          "border bg-[var(--btn-tertiary-bg)] border-[var(--btn-tertiary-border)] text-[var(--btn-tertiary-text)] hover:bg-[var(--btn-tertiary-bg-hover)] hover:border-[var(--btn-tertiary-border-hover)] hover:text-[var(--btn-tertiary-text-hover)] active:bg-[var(--btn-tertiary-bg-active)] active:border-[var(--btn-tertiary-border-active)] active:text-[var(--btn-tertiary-text-active)] disabled:bg-[var(--btn-tertiary-bg-disabled)] disabled:border-[var(--btn-tertiary-border-disabled)] disabled:text-[var(--btn-tertiary-text-disabled)] disabled:opacity-100",
        secondary:
          "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-bg-hover)] hover:text-[var(--btn-secondary-text-hover)] active:bg-[var(--btn-secondary-bg-active)] active:text-[var(--btn-secondary-text-active)] disabled:bg-[var(--btn-secondary-bg-disabled)] disabled:text-[var(--btn-secondary-text-disabled)] disabled:opacity-100",
        ghost: "hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
