import { Skeleton } from "@/components/ui/skeleton"

export default function AgendasLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6">
        {/* Table header */}
        <div className="flex items-center gap-4 px-3 py-3 bg-muted/40 border-b">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-3 py-4 border-b"
          >
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
