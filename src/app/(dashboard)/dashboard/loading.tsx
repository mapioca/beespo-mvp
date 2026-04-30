import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";
const CARD_PAD_HERO = "px-6 py-7 sm:px-8 sm:py-8";

export default function DashboardLoading() {
  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas">
      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-8 sm:py-12 lg:py-16">
        {/* Hero greeting skeleton */}
        <header className="flex flex-col gap-4 px-1 pb-4 sm:px-2 sm:pb-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-80 sm:h-14 sm:w-96" />
          <Skeleton className="h-5 w-64" />
        </header>

        {/* This Sunday card skeleton */}
        <div className={cn(CARD_BASE, CARD_PAD_HERO, "relative overflow-hidden")}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
            aria-hidden
          />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
          <div className="mt-6 pt-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
          </div>
        </div>

        {/* Program status grid skeleton */}
        <div className={cn(CARD_BASE, CARD_PAD)}>
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links skeleton */}
        <div className={cn(CARD_BASE, CARD_PAD)}>
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="hidden h-3 w-32 lg:block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout skeleton */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Looking ahead skeleton */}
          <div className={cn(CARD_BASE, CARD_PAD)}>
            <div className="mb-4 flex items-baseline justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 pl-3 pr-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="hidden h-4 w-32 sm:block" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Announcements skeleton */}
          <div className={cn(CARD_BASE, CARD_PAD)}>
            <div className="mb-4 flex items-baseline justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 pl-3 pr-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
