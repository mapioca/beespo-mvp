import { notFound } from "next/navigation";
import { getProcessDetails, getProcessTimeline } from "@/lib/actions/calling-actions";
import { ProcessDetailClient } from "./process-detail-client";

export default async function ProcessDetailPage({
    params,
}: {
    params: Promise<{ processId: string }>;
}) {
    const { processId } = await params;

    const [detailsResult, timelineResult] = await Promise.all([
        getProcessDetails(processId),
        getProcessTimeline(processId),
    ]);

    if (!detailsResult.success) {
        notFound();
    }

    return (
        <ProcessDetailClient
            process={detailsResult.process}
            initialHistory={timelineResult.success ? timelineResult.history : []}
            initialComments={timelineResult.success ? timelineResult.comments : []}
            initialTasks={timelineResult.success ? timelineResult.tasks : []}
        />
    );
}
