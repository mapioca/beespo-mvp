import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TablesLoading() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Table card */}
        <Card>
          <CardHeader className="space-y-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y">
              {/* Table header */}
              <div className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              {/* Rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-44" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-4 w-10 text-right" />
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
