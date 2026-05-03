import { CallingsPageClient } from "./callings-page-client";
import { getCallingBoardData } from "@/lib/actions/calling-actions";

export default async function CallingsPage() {
    const boardData = await getCallingBoardData();

    return (
        <CallingsPageClient
            initialCallingOptions={boardData.success ? boardData.callingOptions : []}
            initialVacancies={boardData.success ? boardData.vacancies : []}
            initialConsiderations={boardData.success ? boardData.considerations : []}
            initialPipelineProcesses={boardData.success ? boardData.pipelineProcesses : []}
            initialError={boardData.success ? undefined : boardData.error}
        />
    );
}
