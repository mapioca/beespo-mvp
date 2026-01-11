import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnnouncementsLoading() {
    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-10 w-40" />
            </div>

            {/* Filters skeleton */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-28" />
                        <Skeleton className="h-9 w-32" />
                    </div>
                </CardHeader>
            </Card>

            {/* Table skeleton */}
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {/* Header */}
                        <div className="flex items-center gap-4 p-4 bg-muted/50">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        {/* Rows */}
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
