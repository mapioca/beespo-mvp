"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PipelineActionCenter } from "./pipeline-action-center";
import { PipelineStatusBar } from "./pipeline-status-bar";
import { PipelineStageList } from "./pipeline-stage-list";
import { CallingDetailDrawer } from "./calling-detail-drawer";
import { Loader2, Plus, Search } from "lucide-react";
import { advanceProcessStage, createCalling, dropProcess } from "@/lib/actions/calling-actions";
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

interface CallingItem {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    created_at: string;
}

interface CallingsPipelineProps {
    processes: Process[];
    callings: CallingItem[];
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

const COMMON_ORGANIZATIONS = [
    "Bishopric",
    "Elders Quorum",
    "Relief Society",
    "Young Men",
    "Young Women",
    "Primary",
    "Sunday School",
    "Missionary Work",
    "Temple & Family History",
];

export function CallingsPipeline({
    processes,
    callings,
    onRefresh,
    teamMembers = [],
}: CallingsPipelineProps) {
    const allStages = getAllStages();

    const [selectedStage, setSelectedStage] = useState<CallingProcessStage>(() => {
        // Default to first stage that has items, or 'defined'
        const activeProcs = processes.filter((p) => p.status === "active");
        const firstWithItems = allStages.find((stage) =>
            activeProcs.some((p) => p.current_stage === stage)
        );
        return firstWithItems || "defined";
    });
    const [search, setSearch] = useState("");
    const [selectedCallingId, setSelectedCallingId] = useState<string | null>(null);
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newOrg, setNewOrg] = useState("");
    const [creating, setCreating] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Filter only active processes
    const activeProcesses = useMemo(
        () => processes.filter((p) => p.status === "active"),
        [processes]
    );

    // Callings that don't have an active process (unfilled / awaiting candidates)
    const unfilledCallings = useMemo(() => {
        const callingIdsWithActiveProcess = new Set(
            activeProcesses
                .map((p) => p.calling?.id)
                .filter(Boolean)
        );
        return callings.filter(
            (c) => !c.is_filled && !callingIdsWithActiveProcess.has(c.id)
        );
    }, [callings, activeProcesses]);

    // Group processes by stage
    const groupedProcesses = useMemo(() => {
        const groups = new Map<CallingProcessStage, Process[]>();

        allStages.forEach((stage) => {
            groups.set(stage, []);
        });

        activeProcesses.forEach((process) => {
            const stageGroup = groups.get(process.current_stage);
            if (stageGroup) {
                stageGroup.push(process);
            }
        });

        return groups;
    }, [activeProcesses, allStages]);

    // Apply search filter to get the currently visible processes for the selected stage
    const filteredStageProcesses = useMemo(() => {
        const stageProcesses = groupedProcesses.get(selectedStage) || [];
        if (!search.trim()) return stageProcesses;

        const searchLower = search.toLowerCase();
        return stageProcesses.filter(
            (p) =>
                p.candidate?.name.toLowerCase().includes(searchLower) ||
                p.calling?.title.toLowerCase().includes(searchLower) ||
                p.calling?.organization?.toLowerCase().includes(searchLower)
        );
    }, [groupedProcesses, selectedStage, search]);

    // Build stage tabs data (counts reflect unfiltered data so the nav stays stable)
    const stageTabs = useMemo(() => {
        return allStages.map((stage) => ({
            key: stage,
            label: getStageInfo(stage).label,
            count: (groupedProcesses.get(stage) || []).length,
        }));
    }, [allStages, groupedProcesses]);

    // --- Handlers ---

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

    const handleCreateCalling = async () => {
        if (!newTitle.trim()) return;

        setCreating(true);
        const result = await createCalling({
            title: newTitle.trim(),
            organization: (newOrg && newOrg !== "_none") ? newOrg : undefined,
        });
        setCreating(false);

        if (result.success && result.calling) {
            setShowNewDialog(false);
            setNewTitle("");
            setNewOrg("");
            toast({
                title: "Calling created",
                description: `"${result.calling.title}" has been created. Add candidates to get started.`,
            });
            onRefresh();
            router.refresh();
            // Auto-open the detail modal for the newly created calling
            setSelectedCallingId(result.calling.id);
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to create calling",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Callings</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {activeProcesses.length} active process{activeProcesses.length !== 1 ? "es" : ""}
                            {unfilledCallings.length > 0 && (
                                <> · {unfilledCallings.length} awaiting candidates</>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-8 h-8 w-[180px] text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button size="sm" onClick={() => setShowNewDialog(true)} className="h-8">
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            New Calling
                        </Button>
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 space-y-6 pb-6">
                    {/* Action Center — unfilled callings */}
                    <PipelineActionCenter
                        callings={unfilledCallings}
                        onCallingClick={(id) => setSelectedCallingId(id)}
                    />

                    {/* Pipeline Status Bar */}
                    <PipelineStatusBar
                        stages={stageTabs}
                        selectedStage={selectedStage}
                        onSelect={setSelectedStage}
                    />

                    {/* Focus List — processes for selected stage */}
                    <PipelineStageList
                        processes={filteredStageProcesses}
                        stage={selectedStage}
                        onAdvance={handleAdvance}
                        onDrop={handleDrop}
                        onRowClick={handleRowClick}
                    />
                </div>
            </div>

            {/* New Calling Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Calling</DialogTitle>
                        <DialogDescription>
                            Create a new calling to track and fill.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="pipeline-title">Calling Title</Label>
                            <Input
                                id="pipeline-title"
                                placeholder="e.g., Primary President"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pipeline-organization">Organization (optional)</Label>
                            <Select value={newOrg} onValueChange={setNewOrg}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select organization..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    {COMMON_ORGANIZATIONS.map((org) => (
                                        <SelectItem key={org} value={org}>
                                            {org}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCalling}
                            disabled={!newTitle.trim() || creating}
                        >
                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail modal */}
            <CallingDetailDrawer
                callingId={selectedCallingId}
                open={!!selectedCallingId}
                onOpenChange={(open) => !open && setSelectedCallingId(null)}
                onUpdate={onRefresh}
                teamMembers={teamMembers}
            />
        </div>
    );
}
