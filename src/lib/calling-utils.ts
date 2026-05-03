import type { CallingProcessStage, CallingStageStatus, CallingStageStatuses } from "@/types/database";

export type ResolvedStageStatuses = Record<CallingProcessStage, CallingStageStatus>;

export function getStageInfo(stage: CallingProcessStage) {
    const stages: Record<CallingProcessStage, { label: string; description: string; order: number }> = {
        defined: { label: "Defined", description: "Candidate identified for consideration", order: 1 },
        approved: { label: "Approved", description: "Bishop has given approval", order: 2 },
        extended: { label: "Extended", description: "Calling has been extended", order: 3 },
        accepted: { label: "Accepted", description: "Candidate has accepted the calling", order: 4 },
        sustained: { label: "Sustained", description: "Ward has sustained the calling", order: 5 },
        set_apart: { label: "Set Apart", description: "Blessing has been given", order: 6 },
        recorded_lcr: { label: "Recorded in LCR", description: "Officially recorded in Church system", order: 7 }
    };
    return stages[stage];
}

export function getAllStages(): CallingProcessStage[] {
    return ['defined', 'approved', 'extended', 'accepted', 'sustained', 'set_apart', 'recorded_lcr'];
}

// Resolve stage_statuses into a fully-populated record. If the JSON is empty
// (e.g. legacy rows), fall back to interpreting current_stage as "last
// completed" so display stays correct until a stage is toggled.
export function resolveStageStatuses(
    stageStatuses: CallingStageStatuses | null | undefined,
    currentStage: CallingProcessStage
): ResolvedStageStatuses {
    const stages = getAllStages();
    const currentIdx = stages.indexOf(currentStage);
    const fallback = {} as ResolvedStageStatuses;
    for (let i = 0; i < stages.length; i++) {
        fallback[stages[i]] = i <= currentIdx ? "complete" : "pending";
    }

    if (!stageStatuses || Object.keys(stageStatuses).length === 0) {
        return fallback;
    }

    const result = { ...fallback };
    for (const stage of stages) {
        const value = stageStatuses[stage];
        if (value === "complete" || value === "pending" || value === "declined") {
            result[stage] = value;
        }
    }
    return result;
}

export function hasDeclinedStage(statuses: ResolvedStageStatuses): boolean {
    return Object.values(statuses).some((status) => status === "declined");
}

export function highestCompletedStageIndex(statuses: ResolvedStageStatuses): number {
    const stages = getAllStages();
    for (let i = stages.length - 1; i >= 0; i--) {
        if (statuses[stages[i]] === "complete") return i;
    }
    return -1;
}

export function firstPendingStage(statuses: ResolvedStageStatuses): CallingProcessStage | null {
    return getAllStages().find((stage) => statuses[stage] === "pending") ?? null;
}

export function countCompletedStages(statuses: ResolvedStageStatuses): number {
    return Object.values(statuses).filter((status) => status === "complete").length;
}
