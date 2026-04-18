import { cn } from "@/lib/utils"

interface DashboardIslandProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardIsland({ children, className, noPadding = false }: DashboardIslandProps) {
  return (
    <div
      className={cn(
        "h-full w-full bg-app-island border border-app-island rounded-[16px] shadow-[var(--shadow-app-island)] overflow-hidden",
        !noPadding && "p-6",
        className
      )}
    >
      {children}
    </div>
  )
}
