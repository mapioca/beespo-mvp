import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function OverviewLoading() {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50/50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Hero Card */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200 overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-56" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-6 w-32 rounded-full" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-12 w-16 ml-auto" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                </div>
              </div>

              {/* Readiness */}
              <div className="px-6 py-4 mt-4 bg-gray-50/80 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>

              {/* Agenda Preview */}
              <div className="px-6 py-4 border-t space-y-3">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="px-6 py-4 bg-gray-50/50 border-t">
                <Skeleton className="h-11 w-32" />
              </div>
            </Card>

            {/* Planning Horizon */}
            <div>
              <Skeleton className="h-4 w-36 mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-white border-0 ring-1 ring-gray-200">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Action Inbox */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-3 border-t mt-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white shadow-sm border-0 ring-1 ring-gray-200">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </CardContent>
            </Card>

            {/* Calendar Teaser */}
            <Card className="bg-primary/5 shadow-sm border-0 ring-1 ring-primary/20">
              <CardContent className="py-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="w-10 h-10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
