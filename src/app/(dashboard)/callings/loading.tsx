import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STAGES = ["Consideration", "Interview", "Approved", "Extended", "Sustained"];

export default function CallingsLoading() {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Pipeline board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stage) => (
            <div key={stage} className="w-64 flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>

              {/* Cards in column */}
              <Card className="flex-1 bg-muted/30">
                <CardContent className="p-3 space-y-3">
                  {Array.from({ length: stage === "Consideration" ? 3 : stage === "Interview" ? 2 : 1 }).map((_, i) => (
                    <Card key={i} className="shadow-none">
                      <CardHeader className="p-3 pb-2 space-y-1.5">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
