import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

export interface InputProps extends Omit<React.ComponentProps<"input">, "type"> {
  type?: React.HTMLInputTypeAttribute
  inputSize?: "default" | "compact"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", inputSize = "default", ...props }, ref) => {
    const isSearch = type === "search"

    if (isSearch) {
      return (
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            className={cn(
              "flex w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              inputSize === "compact" ? "h-8" : "h-10",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          inputSize === "compact" ? "h-8" : "h-10",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
