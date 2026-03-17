import { Skeleton } from "@/components/ui/skeleton";

export default function AgendasLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Count + pagination hint */}
      <Skeleton className="h-5 w-32" />

      {/* Table */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 rounded-lg">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border rounded-lg">
            <Skeleton className="h-5 w-20" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t pt-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}
