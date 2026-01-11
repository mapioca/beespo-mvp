import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DiscussionsLoading() {
    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-36 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Filters skeleton */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-28" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </CardHeader>
            </Card>

            {/* Table skeleton */}
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
