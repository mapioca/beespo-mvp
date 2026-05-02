import { Skeleton } from "@/components/ui/skeleton"

export default function SacramentArchiveLoading() {
  return (
    <div className="min-h-full bg-surface-canvas px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-[520px]" />
          </div>
          <Skeleton className="hidden h-16 w-28 rounded-[12px] sm:block" />
        </div>

        <div className="mt-10 flex gap-8 border-b border-border/70 pb-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-24" />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Skeleton className="h-10 w-[320px] rounded-[10px]" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[12px] border border-border/70 bg-background p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="mt-4 h-7 w-72" />
              <Skeleton className="mt-3 h-4 w-[420px]" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
