import { cn } from "@/lib/utils"

interface BeespoLogoProps {
  className?: string
}

/**
 * Beespo brand mark — a honeycomb-inspired hexagonal logo.
 * Uses currentColor so it adapts to light/dark themes.
 */
export function BeespoLogo({ className }: BeespoLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {/* Rounded hexagon via fill + stroke with round linejoin */}
      <polygon
        points="12,2.5 20.5,7.4 20.5,16.6 12,21.5 3.5,16.6 3.5,7.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
