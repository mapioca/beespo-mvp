"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PipelineRow } from "./pipeline-row";
import { CallingDetailModal } from "./calling-detail-modal";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { advanceProcessStage, dropProcess } from "@/lib/actions/calling-actions";
import { getStageInfo, getAllStages } from "@/lib/calling-utils";
import { useToast } from "@/lib/hooks/use-toast";
import type { CallingProcessStage } from "@/types/database";

interface Process {
    id: string;
    current_stage: CallingProcessStage;
    status: "active" | "completed" | "dropped";
    created_at: string;
    updated_at: string;
    candidate: { id: string; name: string } | null;
    calling: {
        id: string;
        title: string;
        organization: string | null;
    } | null;
}

interface CallingsPipelineProps {
    processes: Process[];
    onRefresh: () => void;
    teamMembers?: { id: string; full_name: string }[];
}

// Stage to next stage mapping
const nextStageMap: Record<CallingProcessStage, CallingProcessStage | null> = {
    defined: "approved",
    approved: "extended",
    extended: "accepted",
    accepted: "sustained",
    sustained: "set_apart",
    set_apart: "recorded_lcr",
    recorded_lcr: null,
};

export function CallingsPipeline({
    processes,
    onRefresh,
    teamMembers = [],
}: CallingsPipelineProps) {
    const [openGroups, setOpenGroups] = useState<Set<CallingProcessStage>>(
        new Set(getAllStages())
    );
    const [search, setSearch] = useState("");
    const [selectedCallingId, setSelectedCallingId] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Filter only active processes
    const activeProcesses = useMemo(
        () => processes.filter((p) => p.status === "active"),
        [processes]
    );

    // Group processes by stage
    const groupedProcesses = useMemo(() => {
        const groups = new Map<CallingProcessStage, Process[]>();

        // Initialize all stages
        getAllStages().forEach((stage) => {
            groups.set(stage, []);
        });

        // Populate groups
        activeProcesses.forEach((process) => {
            const stageGroup = groups.get(process.current_stage);
            if (stageGroup) {
                stageGroup.push(process);
            }
        });

        return groups;
    }, [activeProcesses]);

    // Filter by search
    const filteredGroups = useMemo(() => {
        if (!search.trim()) return groupedProcesses;

        const filtered = new Map<CallingProcessStage, Process[]>();
        const searchLower = search.toLowerCase();

        groupedProcesses.forEach((processes, stage) => {
            const filteredProcesses = processes.filter(
                (p) =>
                    p.candidate?.name.toLowerCase().includes(searchLower) ||
                    p.calling?.title.toLowerCase().includes(searchLower) ||
                    p.calling?.organization?.toLowerCase().includes(searchLower)
            );
            filtered.set(stage, filteredProcesses);
        });

        return filtered;
    }, [groupedProcesses, search]);

    const toggleGroup = (stage: CallingProcessStage) => {
        const newOpen = new Set(openGroups);
        if (newOpen.has(stage)) {
            newOpen.delete(stage);
        } else {
            newOpen.add(stage);
        }
        setOpenGroups(newOpen);
    };

    const handleAdvance = async (processId: string, currentStage: CallingProcessStage) => {
        const nextStage = nextStageMap[currentStage];
        if (!nextStage) return;

        const result = await advanceProcessStage(processId, nextStage);

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Stage advanced",
                description: `Moved to ${getStageInfo(nextStage).label}`,
            });
            onRefresh();
        }
    };

    const handleDrop = async (processId: string) => {
        const result = await dropProcess(processId);

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Process dropped",
                description: "The calling process has been dropped",
            });
            onRefresh();
        }
    };

    const handleRowClick = (callingId: string) => {
        setSelectedCallingId(callingId);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Callings Pipeline</h1>
                        <p className="text-sm text-muted-foreground">
                            {activeProcesses.length} active process{activeProcesses.length !== 1 ? "es" : ""}
                        </p>
                    </div>
                    <Button onClick={() => router.push("/callings/new")}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Calling
                    </Button>
                </div>

                {/* Search */}
                {activeProcesses.length > 0 && (
                    <div className="relative mt-4 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or calling..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Pipeline Groups */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {getAllStages().map((stage) => {
                    const stageProcesses = filteredGroups.get(stage) || [];
                    const stageInfo = getStageInfo(stage);
                    const isOpen = openGroups.has(stage);

                    return (
                        <Collapsible
                            key={stage}
                            open={isOpen}
                            onOpenChange={() => toggleGroup(stage)}
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-between px-4 py-3 h-auto",
                                        stageProcesses.length === 0 && "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{stageInfo.label}</span>
                                        <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
                                            {stageProcesses.length}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={cn(
                                            "w-4 h-4 transition-transform",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="space-y-2 mt-2">
                                {stageProcesses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No items in this stage
                                    </p>
                                ) : (
                                    stageProcesses.map((process) => (
                                        <PipelineRow
                                            key={process.id}
                                            personName={process.candidate?.name || "Unknown"}
                                            callingTitle={process.calling?.title || "Unknown Calling"}
                                            organization={process.calling?.organization}
                                            currentStage={process.current_stage}
                                            stageUpdatedAt={process.updated_at}
                                            onAdvance={() => handleAdvance(process.id, process.current_stage)}
                                            onRowClick={() => handleRowClick(process.calling?.id || "")}
                                            onDrop={() => handleDrop(process.id)}
                                        />
                                    ))
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
            </div>

            {/* Detail modal */}
            <CallingDetailModal
                callingId={selectedCallingId}
                open={!!selectedCallingId}
                onOpenChange={(open) => !open && setSelectedCallingId(null)}
                onUpdate={onRefresh}
                teamMembers={teamMembers}
            />
        </div>
    );
}
