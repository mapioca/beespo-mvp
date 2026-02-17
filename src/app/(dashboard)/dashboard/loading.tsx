import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50/50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-56 mt-2" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Column - Hero widget */}
          <div className="space-y-4">
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-10 w-14 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>

                {/* Readiness */}
                <div className="p-3 bg-gray-50/80 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>

                {/* Agenda preview */}
                <div>
                  <Skeleton className="h-4 w-24 mb-3" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 mb-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t">
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stacked widgets */}
          <div className="space-y-4">
            {/* Action Inbox skeleton */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5">
                    <Skeleton className="h-3.5 w-3.5 rounded-full mt-1" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Org Pulse skeleton */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-36" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-44 mb-2" />
                <Skeleton className="h-16 w-full rounded mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
