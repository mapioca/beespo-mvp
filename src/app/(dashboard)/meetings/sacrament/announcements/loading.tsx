import { Skeleton } from "@/components/ui/skeleton"

export default function AnnouncementsLoading() {
  return (
    <div className="min-h-full bg-surface-canvas px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-[480px]" />
          </div>
          <Skeleton className="mt-9 h-9 w-40 rounded-[8px]" />
        </div>

        <div className="mt-10 flex gap-8 border-b border-border/70 pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Skeleton className="h-8 w-[240px] rounded-[8px]" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[10px] border border-border/70 bg-background p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-4 h-7 w-3/4" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-4 flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
