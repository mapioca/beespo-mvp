import type { CallingProcessStage } from "@/types/database";

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
