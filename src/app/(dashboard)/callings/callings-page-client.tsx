"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import {
    Users,
    Plus,
    Search,
    MoreHorizontal,
    Trash2,
    Pencil,
    ChevronsUpDown,
    ArrowUpRight,
    ArrowRight,
    X,
} from "lucide-react";
import {
    getStageInfo,
    getAllStages,
    countCompletedStages,
    firstPendingStage,
} from "@/lib/calling-utils";
import type { CallingProcessStage, CallingStageStatus } from "@/types/database";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PickerModal } from "@/components/ui/picker-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import {
    addCallingToMemberConsideration,
    addVacancyCandidate,
    createCallingVacancyCard,
    createMemberConsideration,
    deleteCallingVacancyCard,
    deleteMemberConsideration,
    getCallingBoardData,
    removeCallingCandidate,
    removeCallingFromMemberConsideration,
    startMemberConsiderationPipeline,
    startVacancyCandidatePipeline,
    updateCallingVacancyNotes,
    updateMemberConsiderationNotes,
    updateVacancyCandidateNotes,
} from "@/lib/actions/calling-actions";

interface VacancyCardProps {
    vacancy: VacancyItem;
    onRemove: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    onAddCandidate: (id: string, memberName: string) => void;
    onUpdateCandidateNotes: (id: string, notes: string) => void;
    onRemoveCandidate: (id: string) => void;
    onStartPipeline: (id: string) => void;
    timeAgo: (date: string) => string;
}

interface DirectoryMember {
    id: string;
    name: string;
}

interface VacancyCandidate {
    id: string;
    memberId: string;
    name: string;
    notes: string;
}

interface VacancyItem {
    id: string;
    callingId: string;
    callingTitle: string;
    organization: string;
    notes: string;
    createdAt: string;
    candidates: VacancyCandidate[];
    inPipelineNames: string[];
}

interface ConsiderationItem {
    id: string;
    memberId: string;
    memberName: string;
    notes: string;
    createdAt: string;
    candidateCallingIds: string[];
    pipelineCallingIds: string[];
}

interface CallingOption {
    id: string;
    callingId: string | null;
    title: string;
    organization: string;
}

interface PipelineProcess {
    id: string;
    currentStage: CallingProcessStage;
    status: "active" | "completed" | "dropped" | "declined";
    stageStatuses: Record<CallingProcessStage, CallingStageStatus>;
    droppedReason: string | null;
    createdAt: string;
    updatedAt: string;
    candidateName: string;
    callingId: string;
    callingTitle: string;
    organization: string;
}

interface CallingsPageClientProps {
    initialCallingOptions: CallingOption[];
    initialVacancies: VacancyItem[];
    initialConsiderations: ConsiderationItem[];
    initialPipelineProcesses: PipelineProcess[];
    initialError?: string;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ConsiderationCardProps {
    item: ConsiderationItem;
    callings: CallingOption[];
    onRemove: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    onAddCalling: (id: string, calling: CallingOption) => void;
    onRemoveCalling: (id: string, callingId: string) => void;
    onStartPipeline: (id: string, callingId: string) => void;
    timeAgo: (date: string) => string;
}

function ConsiderationCard({
    item,
    callings,
    onRemove,
    onUpdateNotes,
    onAddCalling,
    onRemoveCalling,
    onStartPipeline,
    timeAgo,
}: ConsiderationCardProps) {
    const [isAddingCalling, setIsAddingCalling] = useState(false);
    const [showCallingPicker, setShowCallingPicker] = useState(false);
    const [callingSearch, setCallingSearch] = useState("");
    const [selectedCallingId, setSelectedCallingId] = useState<string | null>(null);

    const selectedCallings = useMemo(
        () => item.candidateCallingIds
            .map((callingId) => callings.find((calling) => calling.callingId === callingId))
            .filter((calling): calling is CallingOption => Boolean(calling)),
        [callings, item.candidateCallingIds]
    );
    const pipelineCallings = useMemo(
        () => item.pipelineCallingIds
            .map((callingId) => callings.find((calling) => calling.callingId === callingId))
            .filter((calling): calling is CallingOption => Boolean(calling)),
        [callings, item.pipelineCallingIds]
    );

    const availableCallings = useMemo(() => {
        const query = callingSearch.trim().toLowerCase();
        const unavailableIds = new Set([...item.candidateCallingIds, ...item.pipelineCallingIds]);

        return callings.filter((calling) => {
            if (calling.callingId && unavailableIds.has(calling.callingId)) return false;
            if (!query) return true;

            return (
                calling.title.toLowerCase().includes(query) ||
                calling.organization.toLowerCase().includes(query)
            );
        });
    }, [callingSearch, callings, item.candidateCallingIds, item.pipelineCallingIds]);

    const selectedCalling = callings.find((calling) => calling.id === selectedCallingId);

    const handleAddCalling = () => {
        if (!selectedCallingId) return;

        const calling = callings.find((option) => option.id === selectedCallingId);
        if (!calling) return;

        onAddCalling(item.id, calling);
        setSelectedCallingId(null);
        setCallingSearch("");
        setIsAddingCalling(false);
    };

    return (
        <article className="bg-surface-raised border border-border rounded-xl overflow-hidden">
            <header className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-surface-sunken text-[12px] font-semibold text-muted-foreground">
                        {getInitials(item.memberName)}
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                            Considering
                        </div>
                        <h3 className="font-serif text-[22px] leading-tight truncate">{item.memberName}</h3>
                        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                                No current calling
                            </span>
                            <span>·</span>
                            <span className="font-mono">added {timeAgo(item.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-1 text-muted-foreground hover:text-foreground"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onRemove(item.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Stop considering
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <div className="px-5 pb-4">
                <Textarea
                    defaultValue={item.notes}
                    placeholder="Why this person — strengths, season of life, impressions..."
                    className="text-[12.5px] min-h-[60px]"
                    onBlur={(e) => onUpdateNotes(item.id, e.target.value)}
                />
            </div>

            <div className="border-t border-border">
                <div className="px-5 py-2.5 text-[10px] uppercase tracking-wider font-medium text-muted-foreground flex items-center justify-between">
                    <span>Possible callings</span>
                    <span className="font-mono opacity-70">added {timeAgo(item.createdAt)}</span>
                </div>
                {selectedCallings.length > 0 ? (
                    <ul className="divide-y divide-border border-t border-border">
                        {selectedCallings.map((calling) => (
                            <li key={calling.id} className="px-5 py-2.5 group/calling flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] truncate">{calling.title}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                        {calling.organization}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover/calling:opacity-100">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11.5px] text-brand hover:text-brand hover:bg-brand/10"
                                        onClick={() => onStartPipeline(item.id, calling.id)}
                                    >
                                        Start pipeline
                                        <ArrowUpRight className="ml-1 h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemoveCalling(item.id, calling.id)}
                                        aria-label={`Remove ${calling.title}`}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {pipelineCallings.length > 0 && (
                    <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{pipelineCallings.length}</span> already in pipeline:{" "}
                        {pipelineCallings.map((calling) => calling.title).join(", ")}
                    </div>
                )}

                {isAddingCalling ? (
                    <div className="border-t border-border px-5 py-3 space-y-2">
                        <button
                            className="inline-flex h-9 w-full max-w-[280px] items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] text-foreground hover:bg-accent/40 transition-colors"
                            onClick={() => setShowCallingPicker(true)}
                        >
                            <span className={`truncate ${selectedCalling ? "text-foreground" : "text-muted-foreground"}`}>
                                {selectedCalling?.title || "Select calling"}
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </button>
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-[12px]"
                                onClick={() => {
                                    setIsAddingCalling(false);
                                    setSelectedCallingId(null);
                                    setCallingSearch("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-[12px]"
                                disabled={!selectedCallingId}
                                onClick={handleAddCalling}
                            >
                                Add calling
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        className="w-full border-t border-border px-5 py-3 text-left text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors flex items-center gap-2"
                        onClick={() => setIsAddingCalling(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add a calling to consider
                    </button>
                )}
            </div>

            <PickerModal
                open={showCallingPicker}
                onOpenChange={setShowCallingPicker}
                title="Select calling"
                searchSlot={
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search callings..."
                            value={callingSearch}
                            onChange={(e) => setCallingSearch(e.target.value)}
                            className="border-0 bg-transparent pl-9 focus-visible:ring-0"
                        />
                    </div>
                }
            >
                <div className="space-y-0.5 px-1">
                    {availableCallings.map((calling) => (
                        <button
                            key={calling.id}
                            onClick={() => {
                                setSelectedCallingId(calling.id);
                                setShowCallingPicker(false);
                            }}
                            className="w-full rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors"
                        >
                            <div className="font-medium text-sm">{calling.title}</div>
                            {calling.organization && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {calling.organization}
                                </div>
                            )}
                        </button>
                    ))}
                    {availableCallings.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No callings found
                        </div>
                    )}
                </div>
            </PickerModal>
        </article>
    );
}

function VacancyCard({
    vacancy,
    onRemove,
    onUpdateNotes,
    onAddCandidate,
    onUpdateCandidateNotes,
    onRemoveCandidate,
    onStartPipeline,
    timeAgo,
}: VacancyCardProps) {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [directoryMembers, setDirectoryMembers] = useState<DirectoryMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
    const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
    const [editingCandidateNotes, setEditingCandidateNotes] = useState("");

    const filteredMembers = useMemo(() => {
        const query = memberSearch.trim().toLowerCase();
        if (!query) return directoryMembers;
        return directoryMembers.filter((member) =>
            member.name.toLowerCase().includes(query)
        );
    }, [directoryMembers, memberSearch]);

    const handleOpenMemberPicker = async () => {
        setShowMemberPicker(true);
        if (directoryMembers.length > 0 || isLoadingMembers) return;

        setIsLoadingMembers(true);
        const supabase = createClient();

        const { data, error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
            .select("id, name")
            .order("name", { ascending: true });

        if (!error) {
            setDirectoryMembers((data as DirectoryMember[] | null) ?? []);
        }

        setIsLoadingMembers(false);
    };

    const handleAddCandidate = () => {
        if (!selectedMember) return;

        const alreadyExists = vacancy.candidates.some((candidate) => candidate.name === selectedMember.name);
        const alreadyInPipeline = vacancy.inPipelineNames.includes(selectedMember.name);

        if (alreadyExists || alreadyInPipeline) {
            setSelectedMember(null);
            setIsAddingCandidate(false);
            return;
        }

        onAddCandidate(vacancy.id, selectedMember.name);
        setSelectedMember(null);
        setIsAddingCandidate(false);
    };

    return (
        <article className="bg-surface-raised border border-border rounded-xl overflow-hidden">
            <header className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                        {vacancy.organization}
                    </div>
                    <h3 className="font-serif text-[22px] leading-tight text-foreground">
                        {vacancy.callingTitle}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Vacant {timeAgo(vacancy.createdAt)}
                        </span>
                        <span className="font-mono">
                            {vacancy.candidates.length} candidate{vacancy.candidates.length === 1 ? "" : "s"}
                        </span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-1 text-muted-foreground hover:text-foreground"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onRemove(vacancy.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove vacancy
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            {isEditingNotes ? (
                <div className="px-5 pb-3 -mt-1">
                    <RichTextEditor
                        content={vacancy.notes}
                        onSave={async (html) => {
                            onUpdateNotes(vacancy.id, html);
                            setIsEditingNotes(false);
                        }}
                        placeholder="Context, requirements, things to pray about…"
                        placeholderFontSize="0.78125rem"
                    />
                </div>
            ) : vacancy.notes ? (
                <div 
                    className="px-5 pb-3 -mt-1 group/notes cursor-text flex items-start gap-2"
                    onClick={() => setIsEditingNotes(true)}
                >
                    <div 
                        className="text-[12.5px] italic text-muted-foreground leading-relaxed flex-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: vacancy.notes }}
                    />
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/notes:opacity-100 transition-opacity mt-0.5 shrink-0" />
                </div>
            ) : (
                <div className="px-5 pb-3 -mt-1">
                    <button
                        className="text-[12.5px] text-muted-foreground/60 hover:text-foreground italic"
                        onClick={() => setIsEditingNotes(true)}
                    >
                        Add notes…
                    </button>
                </div>
            )}

            <div className="border-t border-border">
                {vacancy.candidates.length > 0 && (
                    <ul className="divide-y divide-border">
                        {vacancy.candidates.map((candidate) => (
                            <li key={candidate.id} className="px-5 py-3 group/candidate">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                        {getInitials(candidate.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-foreground truncate">
                                            {candidate.name}
                                        </div>
                                        {editingCandidateId === candidate.id ? (
                                            <Textarea
                                                autoFocus
                                                value={editingCandidateNotes}
                                                onChange={(e) => setEditingCandidateNotes(e.target.value)}
                                                onBlur={() => {
                                                    onUpdateCandidateNotes(candidate.id, editingCandidateNotes.trim());
                                                    setEditingCandidateId(null);
                                                    setEditingCandidateNotes("");
                                                }}
                                                placeholder="Add note..."
                                                className="mt-1.5 min-h-[60px] text-[12.5px]"
                                            />
                                        ) : candidate.notes ? (
                                            <p
                                                className="mt-0.5 text-[12.5px] text-muted-foreground leading-relaxed cursor-text"
                                                onClick={() => {
                                                    setEditingCandidateId(candidate.id);
                                                    setEditingCandidateNotes(candidate.notes);
                                                }}
                                            >
                                                {candidate.notes}
                                            </p>
                                        ) : (
                                            <button
                                                className="mt-0.5 text-[12px] text-muted-foreground/70 hover:text-foreground"
                                                onClick={() => {
                                                    setEditingCandidateId(candidate.id);
                                                    setEditingCandidateNotes("");
                                                }}
                                            >
                                                Add note...
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover/candidate:opacity-100">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-[11.5px] text-brand hover:text-brand hover:bg-brand/10"
                                            onClick={() => onStartPipeline(candidate.id)}
                                        >
                                            Move to pipeline
                                            <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => onRemoveCandidate(candidate.id)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {vacancy.inPipelineNames.length > 0 && (
                    <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{vacancy.inPipelineNames.length}</span> already in pipeline:{" "}
                        {vacancy.inPipelineNames.join(", ")}
                    </div>
                )}

                {isAddingCandidate ? (
                    <div className="border-y border-border px-5 py-3 space-y-2">
                        <button
                            className="inline-flex h-9 w-full max-w-[280px] items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] text-foreground hover:bg-accent/40 transition-colors"
                            onClick={() => {
                                void handleOpenMemberPicker();
                            }}
                        >
                            <span className={`truncate ${selectedMember ? "text-foreground" : "text-muted-foreground"}`}>
                                {selectedMember?.name || "Select member"}
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </button>
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-[12px]"
                                onClick={() => {
                                    setIsAddingCandidate(false);
                                    setSelectedMember(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-[12px]"
                                disabled={!selectedMember}
                                onClick={handleAddCandidate}
                            >
                                Add candidate
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        className="w-full border-y border-border px-5 py-3 text-left text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors flex items-center gap-2"
                        onClick={() => setIsAddingCandidate(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add candidate
                    </button>
                )}
            </div>

            <PickerModal
                open={showMemberPicker}
                onOpenChange={setShowMemberPicker}
                title="Select member"
                searchSlot={
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="border-0 bg-transparent pl-9 focus-visible:ring-0"
                        />
                    </div>
                }
            >
                <div className="space-y-0.5 px-1">
                    {isLoadingMembers ? (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Loading members...
                        </div>
                    ) : filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                            <button
                                key={member.id}
                                onClick={() => {
                                    setSelectedMember(member);
                                    setShowMemberPicker(false);
                                }}
                                className="w-full rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[10px] font-semibold text-muted-foreground">
                                        {getInitials(member.name)}
                                    </div>
                                    <div className="font-medium text-sm truncate">{member.name}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No members found
                        </div>
                    )}
                </div>
            </PickerModal>
        </article>
    );
}

const ALL_STAGES = getAllStages();

function getProcessProgress(process: PipelineProcess) {
    const total = ALL_STAGES.length;
    if (process.status === "completed") {
        return { completed: total, total };
    }
    return { completed: countCompletedStages(process.stageStatuses), total };
}

interface PipelineRowProps {
    process: PipelineProcess;
    timeAgo: (date: string) => string;
}

function PipelineRow({ process, timeAgo }: PipelineRowProps) {
    const { completed, total } = getProcessProgress(process);
    const isDropped = process.status === "dropped";
    const isDeclined = process.status === "declined";
    const isComplete = process.status === "completed";
    const nextPendingStage = firstPendingStage(process.stageStatuses);
    const droppedAtIndex = isDropped && nextPendingStage
        ? ALL_STAGES.indexOf(nextPendingStage)
        : -1;
    // For a declined process, the "declined pivot" is the earliest declined
    // stage — that's where the candidate turned it down.
    const firstDeclinedStage = ALL_STAGES.find((s) => process.stageStatuses[s] === "declined");
    const statusLine = isComplete
        ? { label: "Recorded in LCR", description: null as string | null }
        : isDeclined && firstDeclinedStage
            ? { label: `Declined at ${getStageInfo(firstDeclinedStage).label}`, description: null as string | null }
            : nextPendingStage
                ? (() => {
                    const info = getStageInfo(nextPendingStage);
                    return isDropped
                        ? { label: `Dropped at ${info.label}`, description: null as string | null }
                        : { label: `Next: ${info.label}`, description: info.description };
                })()
                : { label: "All stages complete", description: null as string | null };

    return (
        <Link
            href={`/callings/${process.id}`}
            className="block bg-surface-raised border border-border rounded-xl px-5 py-4 hover:border-primary/40 transition-all"
        >
            <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-muted-foreground">
                    {getInitials(process.candidateName)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-medium">{process.candidateName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-serif italic text-[15px] text-foreground">{process.callingTitle}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-1 truncate">
                        <span className="text-foreground/70">{statusLine.label}</span>
                        {(isDropped || isDeclined) && process.droppedReason && <span> — {process.droppedReason}</span>}
                        {!isDropped && !isDeclined && statusLine.description && <span> — {statusLine.description}</span>}
                        <span className="opacity-60">
                            {" · "}
                            {isDropped || isDeclined || isComplete ? "" : "updated "}
                            {timeAgo(process.updatedAt)}
                        </span>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                    {isDropped ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            Dropped
                        </span>
                    ) : isDeclined ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            Declined
                        </span>
                    ) : isComplete ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Recorded
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[11px] font-medium text-brand">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            In progress
                        </span>
                    )}
                    <div className="flex items-center gap-0.5">
                        {ALL_STAGES.map((stage, idx) => {
                            const done = process.stageStatuses[stage] === "complete";
                            const declined = process.stageStatuses[stage] === "declined";
                            const isNext = !isComplete && !isDropped && !isDeclined && stage === nextPendingStage;
                            const droppedHere = isDropped && idx === droppedAtIndex;
                            return (
                                <span
                                    key={stage}
                                    className={`h-1 w-5 rounded-full transition-colors ${
                                        done
                                            ? "bg-brand"
                                            : declined || droppedHere
                                                ? "bg-destructive"
                                                : isNext
                                                    ? "bg-brand/40"
                                                    : "bg-border"
                                    }`}
                                    title={getStageInfo(stage).label}
                                />
                            );
                        })}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">
                        {completed}/{total} stages
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function CallingsPageClient({
    initialCallingOptions,
    initialVacancies,
    initialConsiderations,
    initialPipelineProcesses,
    initialError,
}: CallingsPageClientProps) {
    const [openVacancy, setOpenVacancy] = useState(false);
    const [openConsideration, setOpenConsideration] = useState(false);
    const [showCallingPicker, setShowCallingPicker] = useState(false);
    const [showConsiderationMemberPicker, setShowConsiderationMemberPicker] = useState(false);
    const [selectedCalling, setSelectedCalling] = useState<string | null>(null);
    const [selectedConsiderationMember, setSelectedConsiderationMember] = useState<DirectoryMember | null>(null);
    const [callingSearch, setCallingSearch] = useState("");
    const [considerationMemberSearch, setConsiderationMemberSearch] = useState("");
    const [callingNotes, setCallingNotes] = useState("");
    const [considerationMembers, setConsiderationMembers] = useState<DirectoryMember[]>([]);
    const [isLoadingConsiderationMembers, setIsLoadingConsiderationMembers] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [callings, setCallings] = useState<CallingOption[]>(initialCallingOptions);
    const [vacancies, setVacancies] = useState<VacancyItem[]>(initialVacancies);
    const [considerations, setConsiderations] = useState<ConsiderationItem[]>(initialConsiderations);
    const [pipelineProcesses, setPipelineProcesses] = useState<PipelineProcess[]>(initialPipelineProcesses);

    useEffect(() => {
        if (initialError) {
            toast.error("Unable to load callings board", { description: initialError });
        }
    }, [initialError]);

    const refreshBoard = async () => {
        const result = await getCallingBoardData();
        if (!result.success) {
            toast.error("Unable to refresh callings board", { description: result.error });
            return;
        }

        setCallings(result.callingOptions);
        setVacancies(result.vacancies);
        setConsiderations(result.considerations);
        setPipelineProcesses(result.pipelineProcesses);
    };

    const runMutation = async (
        action: () => Promise<{ success?: boolean; error?: string }>,
        errorMessage: string,
        messages?: { loading: string; success: string }
    ) => {
        setIsMutating(true);
        const toastId = messages ? toast.loading(messages.loading) : undefined;
        const result = await action();

        if (result.error) {
            toast.error(errorMessage, toastId ? { description: result.error, id: toastId } : { description: result.error });
            setIsMutating(false);
            return false;
        }

        await refreshBoard();

        if (messages && toastId) {
            toast.success(messages.success, { id: toastId });
        }

        setIsMutating(false);
        return true;
    };

    const activeProcesses = useMemo(
        () => pipelineProcesses.filter((p) => p.status === "active"),
        [pipelineProcesses]
    );
    const archivedProcesses = useMemo(
        () => pipelineProcesses.filter(
            (p) => p.status === "completed" || p.status === "dropped" || p.status === "declined"
        ),
        [pipelineProcesses]
    );
    const boardCount = vacancies.length + considerations.length;

    const filteredCallings = useMemo(() => {
        return callings.filter((c) =>
            c.title.toLowerCase().includes(callingSearch.toLowerCase())
        );
    }, [callings, callingSearch]);
    const filteredConsiderationMembers = useMemo(() => {
        const query = considerationMemberSearch.trim().toLowerCase();
        const existingMemberIds = new Set(considerations.map((item) => item.memberId));
        const availableMembers = considerationMembers.filter((member) => !existingMemberIds.has(member.id));

        if (!query) return availableMembers;
        return availableMembers.filter((member) => member.name.toLowerCase().includes(query));
    }, [considerationMemberSearch, considerationMembers, considerations]);

    const selectedCallingData = callings.find((c) => c.id === selectedCalling);

    const handleAddVacancy = async () => {
        if (!selectedCalling || !selectedCallingData) return;

        const title = selectedCallingData.title;
        const organization = selectedCallingData.organization;
        const notes = callingNotes;

        // Close dialog immediately so user isn't stuck waiting on the round-trip.
        setSelectedCalling(null);
        setCallingNotes("");
        setOpenVacancy(false);

        await runMutation(
            () => createCallingVacancyCard({ title, organization, notes }),
            "Unable to track vacancy",
            {
                loading: `Adding ${title}…`,
                success: `${title} added to vacancies`,
            }
        );
    };

    const handleRemoveVacancy = async (id: string) => {
        await runMutation(
            () => deleteCallingVacancyCard(id),
            "Unable to remove vacancy"
        );
    };

    const handleUpdateVacancyNotes = async (id: string, notes: string) => {
        await runMutation(
            () => updateCallingVacancyNotes(id, notes),
            "Unable to update vacancy notes"
        );
    };
    const handleAddVacancyCandidate = async (id: string, memberName: string) => {
        await runMutation(
            () => addVacancyCandidate(id, memberName),
            "Unable to add candidate",
            {
                loading: `Adding ${memberName}…`,
                success: `${memberName} added as candidate`,
            }
        );
    };
    const handleUpdateVacancyCandidateNotes = async (id: string, notes: string) => {
        await runMutation(
            () => updateVacancyCandidateNotes(id, notes),
            "Unable to update candidate notes"
        );
    };
    const handleRemoveVacancyCandidate = async (id: string) => {
        await runMutation(
            () => removeCallingCandidate(id),
            "Unable to remove candidate"
        );
    };
    const handleStartVacancyPipeline = async (id: string) => {
        await runMutation(
            () => startVacancyCandidatePipeline(id),
            "Unable to start pipeline"
        );
    };
    const handleOpenConsiderationMemberPicker = async () => {
        setShowConsiderationMemberPicker(true);
        if (considerationMembers.length > 0 || isLoadingConsiderationMembers) return;

        setIsLoadingConsiderationMembers(true);
        const supabase = createClient();

        const { data, error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
            .select("id, name")
            .order("name", { ascending: true });

        if (!error) {
            setConsiderationMembers((data as DirectoryMember[] | null) ?? []);
        }

        setIsLoadingConsiderationMembers(false);
    };
    const handleAddConsideration = async () => {
        if (!selectedConsiderationMember) return;

        const member = selectedConsiderationMember;

        // Close dialog immediately so user isn't stuck waiting on the round-trip.
        setSelectedConsiderationMember(null);
        setConsiderationMemberSearch("");
        setOpenConsideration(false);

        await runMutation(
            () => createMemberConsideration({
                directoryId: member.id,
                memberName: member.name,
            }),
            "Unable to create member consideration",
            {
                loading: `Adding ${member.name}…`,
                success: `${member.name} added to considerations`,
            }
        );
    };

    const timeAgo = (date: string) => {
        const diff = Math.max(0, Date.now() - new Date(date).getTime());
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w ago`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;

        return `${Math.floor(days / 365)}y ago`;
    };
    const handleRemoveConsideration = async (id: string) => {
        await runMutation(
            () => deleteMemberConsideration(id),
            "Unable to remove member consideration"
        );
    };
    const handleUpdateConsiderationNotes = async (id: string, notes: string) => {
        await runMutation(
            () => updateMemberConsiderationNotes(id, notes),
            "Unable to update consideration notes"
        );
    };
    const handleAddCallingToConsideration = async (id: string, calling: CallingOption) => {
        await runMutation(
            () => addCallingToMemberConsideration(id, {
                title: calling.title,
                organization: calling.organization,
            }),
            "Unable to add calling",
            {
                loading: `Adding ${calling.title}…`,
                success: `${calling.title} added`,
            }
        );
    };
    const handleRemoveCallingFromConsideration = async (id: string, callingId: string) => {
        await runMutation(
            () => removeCallingFromMemberConsideration(id, callingId),
            "Unable to remove calling"
        );
    };
    const handleStartConsiderationPipeline = async (id: string, callingId: string) => {
        await runMutation(
            () => startMemberConsiderationPipeline(id, callingId),
            "Unable to start pipeline"
        );
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Callings", icon: <Users className="h-3.5 w-3.5" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
            />

            {/* Header */}
            <div className="px-8 lg:px-12 py-10 max-w-[1400px] mx-auto w-full">
                <header className="flex items-end justify-between gap-6">
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
                            Callings
                        </div>
                        <h1 className="font-serif text-3xl md:text-[34px] leading-[1.1] tracking-tight text-foreground">
                            Calling <em className="font-serif italic">deliberation</em>
                        </h1>
                        <p className="text-[13px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
                            Match members to callings, callings to members. Track each from quiet consideration through sustaining and into LCR.
                        </p>
                    </div>
                </header>

                <Tabs defaultValue="board" className="mt-10">
                    <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-8">
                        <TabsTrigger
                            value="board"
                            className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none px-0 pb-3 text-[13px] text-muted-foreground"
                        >
                            Board
                            <span className="ml-2 text-[10px] font-mono opacity-70">{boardCount}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="pipeline"
                            className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none px-0 pb-3 text-[13px] text-muted-foreground"
                        >
                            Pipeline
                            <span className="ml-2 text-[10px] font-mono opacity-70">{activeProcesses.length}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="archive"
                            className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none px-0 pb-3 text-[13px] text-muted-foreground"
                        >
                            Archive
                            <span className="ml-2 text-[10px] font-mono opacity-70">{archivedProcesses.length}</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="board" className="mt-8 focus-visible:outline-none">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
                            {/* Vacant callings */}
                            <section>
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <h2 className="font-serif text-xl">Vacant callings</h2>
                                        <p className="text-[12px] text-muted-foreground mt-0.5">
                                            Find someone for an open seat.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setCallingSearch("");
                                            setOpenVacancy(true);
                                        }}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Track a vacancy
                                    </Button>
                                </div>

                                {vacancies.length === 0 ? (
                                    <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
                                        <h3 className="font-serif text-lg">No vacancies tracked</h3>
                                        <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                                            When a calling opens up, track it here to gather candidates.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {vacancies.map((vacancy) => (
                                            <VacancyCard
                                                key={vacancy.id}
                                                vacancy={vacancy}
                                                onRemove={handleRemoveVacancy}
                                                onUpdateNotes={handleUpdateVacancyNotes}
                                                onAddCandidate={handleAddVacancyCandidate}
                                                onUpdateCandidateNotes={handleUpdateVacancyCandidateNotes}
                                                onRemoveCandidate={handleRemoveVacancyCandidate}
                                                onStartPipeline={handleStartVacancyPipeline}
                                                timeAgo={timeAgo}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Member considerations */}
                            <section>
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <h2 className="font-serif text-xl">Member considerations</h2>
                                        <p className="text-[12px] text-muted-foreground mt-0.5">
                                            Find a calling for someone you&apos;re thinking of.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                                        onClick={() => setOpenConsideration(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Consider a member
                                    </Button>
                                </div>
                                {considerations.length === 0 ? (
                                    <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
                                        <h3 className="font-serif text-lg">No one in consideration</h3>
                                        <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                                            Add a member when an impression comes, even before you know which calling.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {considerations.map((item) => (
                                            <ConsiderationCard
                                                key={item.id}
                                                item={item}
                                                callings={callings}
                                                onRemove={handleRemoveConsideration}
                                                onUpdateNotes={handleUpdateConsiderationNotes}
                                                onAddCalling={handleAddCallingToConsideration}
                                                onRemoveCalling={handleRemoveCallingFromConsideration}
                                                onStartPipeline={handleStartConsiderationPipeline}
                                                timeAgo={timeAgo}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="pipeline" className="mt-8 focus-visible:outline-none">
                        <div className="max-w-3xl">
                            <div className="mb-4">
                                <h2 className="font-serif text-xl">Active pipeline</h2>
                                <p className="text-[12px] text-muted-foreground mt-0.5">
                                    Candidates moving toward a calling. Open one to advance stages or drop the process.
                                </p>
                            </div>
                            {activeProcesses.length === 0 ? (
                                <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
                                    <h3 className="font-serif text-lg">No active pipelines</h3>
                                    <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                                        When a candidate is chosen from the board, move them into the pipeline to begin the process.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeProcesses.map((process) => (
                                        <PipelineRow key={process.id} process={process} timeAgo={timeAgo} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="archive" className="mt-8 focus-visible:outline-none">
                        <div className="max-w-3xl">
                            <div className="mb-4">
                                <h2 className="font-serif text-xl">Archive</h2>
                                <p className="text-[12px] text-muted-foreground mt-0.5">
                                    Recorded and dropped callings.
                                </p>
                            </div>
                            {archivedProcesses.length === 0 ? (
                                <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
                                    <h3 className="font-serif text-lg">Nothing archived yet</h3>
                                    <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                                        Completed and dropped callings will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {archivedProcesses.map((process) => (
                                        <PipelineRow key={process.id} process={process} timeAgo={timeAgo} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Track a vacancy dialog */}
            <Dialog open={openVacancy} onOpenChange={setOpenVacancy}>
                <DialogContent className="bg-popover border-border">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Track a vacancy</DialogTitle>
                        <DialogDescription>
                            Open a candidate list for a calling that needs filling.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            Calling
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            onClick={() => setShowCallingPicker(true)}
                        >
                            {selectedCallingData ? selectedCallingData.title : "Select a calling..."}
                        </Button>
                    </div>
                    <div className="space-y-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            Notes (optional)
                        </div>
                        <Textarea
                            placeholder="Context, requirements, things to pray about…"
                            value={callingNotes}
                            onChange={(e) => setCallingNotes(e.target.value)}
                            className="min-h-[80px] text-[13px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenVacancy(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!selectedCalling || isMutating}
                            className="bg-brand text-white hover:bg-brand/90"
                            onClick={handleAddVacancy}
                        >
                            {isMutating ? "Adding..." : "Add to board"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Consider a member dialog */}
            <Dialog
                open={openConsideration}
                onOpenChange={(open) => {
                    setOpenConsideration(open);
                    if (!open) {
                        setSelectedConsiderationMember(null);
                        setConsiderationMemberSearch("");
                    }
                }}
            >
                <DialogContent className="bg-popover border-border">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Consider a member</DialogTitle>
                        <DialogDescription>
                            Open a workspace to mull over possible callings for this person.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            Member
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            onClick={() => {
                                void handleOpenConsiderationMemberPicker();
                            }}
                        >
                            {selectedConsiderationMember?.name || "Select member..."}
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setOpenConsideration(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!selectedConsiderationMember || isMutating}
                            className="bg-brand text-white hover:bg-brand/90"
                            onClick={handleAddConsideration}
                        >
                            {isMutating ? "Adding..." : "Add to board"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Calling picker modal */}
            <PickerModal
                open={showCallingPicker}
                onOpenChange={setShowCallingPicker}
                title="Select calling"
                searchSlot={
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search callings..."
                            value={callingSearch}
                            onChange={(e) => setCallingSearch(e.target.value)}
                            className="border-0 bg-transparent pl-9 focus-visible:ring-0"
                        />
                    </div>
                }
            >
                <div className="space-y-0.5 px-1">
                    {filteredCallings.map((calling) => (
                        <button
                            key={calling.id}
                            onClick={() => {
                                setSelectedCalling(calling.id);
                                setShowCallingPicker(false);
                            }}
                            className="w-full rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors"
                        >
                            <div className="font-medium text-sm">{calling.title}</div>
                            {calling.organization && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {calling.organization}
                                </div>
                            )}
                        </button>
                    ))}
                    {filteredCallings.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No callings found
                        </div>
                    )}
                </div>
            </PickerModal>

            {/* Consideration member picker modal */}
            <PickerModal
                open={showConsiderationMemberPicker}
                onOpenChange={setShowConsiderationMemberPicker}
                title="Select member"
                searchSlot={
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search members..."
                            value={considerationMemberSearch}
                            onChange={(e) => setConsiderationMemberSearch(e.target.value)}
                            className="border-0 bg-transparent pl-9 focus-visible:ring-0"
                        />
                    </div>
                }
            >
                <div className="space-y-0.5 px-1">
                    {isLoadingConsiderationMembers ? (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Loading members...
                        </div>
                    ) : filteredConsiderationMembers.length > 0 ? (
                        filteredConsiderationMembers.map((member) => (
                            <button
                                key={member.id}
                                onClick={() => {
                                    setSelectedConsiderationMember(member);
                                    setShowConsiderationMemberPicker(false);
                                }}
                                className="w-full rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[10px] font-semibold text-muted-foreground">
                                        {getInitials(member.name)}
                                    </div>
                                    <div className="font-medium text-sm truncate">{member.name}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No members found
                        </div>
                    )}
                </div>
            </PickerModal>
        </div>
    );
}
