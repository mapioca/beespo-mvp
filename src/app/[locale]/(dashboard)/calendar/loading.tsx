import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block w-64 border-r p-4 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
        <Skeleton className="h-6 w-32 mt-6" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Calendar grid skeleton */}
        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
          {/* Header row */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`header-${i}`} className="bg-background p-2">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
          {/* Calendar cells */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={`cell-${i}`}
              className="bg-background min-h-[100px] p-2 space-y-1"
            >
              <Skeleton className="h-5 w-5" />
              {i % 4 === 0 && <Skeleton className="h-5 w-full" />}
              {i % 7 === 2 && <Skeleton className="h-5 w-full" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
