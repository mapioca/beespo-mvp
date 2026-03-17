import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function TemplateLibraryLoading() {
  return (
    <div className="flex flex-col h-screen-dynamic overflow-hidden">
      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-3 border-b flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="flex-1 space-y-2 pb-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="border-t pt-3 flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
