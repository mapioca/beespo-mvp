import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function FormsLoading() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Table card */}
        <Card>
          <CardHeader className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y">
              {/* Table header */}
              <div className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 flex-1 max-w-xs" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              {/* Rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="flex-1 max-w-xs space-y-1.5">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
