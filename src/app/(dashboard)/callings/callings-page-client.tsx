"use client";

import { useState, useMemo } from "react";
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
    X,
} from "lucide-react";
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
import callingsCatalog from "@/data/callings.json";

function formatOrganization(org: string): string {
    return org
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

interface VacancyCardProps {
    vacancy: {
        id: string;
        callingTitle: string;
        organization: string;
        notes: string;
        createdAt: Date;
    };
    onRemove: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    timeAgo: (date: Date) => string;
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

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function VacancyCard({ vacancy, onRemove, onUpdateNotes, timeAgo }: VacancyCardProps) {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [directoryMembers, setDirectoryMembers] = useState<DirectoryMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
    const [candidates, setCandidates] = useState<VacancyCandidate[]>([]);
    const [inPipelineNames, setInPipelineNames] = useState<string[]>([]);
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

        const alreadyExists = candidates.some((candidate) => candidate.memberId === selectedMember.id);
        const alreadyInPipeline = inPipelineNames.includes(selectedMember.name);

        if (alreadyExists || alreadyInPipeline) {
            setSelectedMember(null);
            setIsAddingCandidate(false);
            return;
        }

        setCandidates((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                memberId: selectedMember.id,
                name: selectedMember.name,
                notes: "",
            },
        ]);
        setSelectedMember(null);
        setIsAddingCandidate(false);
    };

    const handleMoveToPipeline = (candidateId: string, candidateName: string) => {
        setCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateId));
        setInPipelineNames((prev) => (prev.includes(candidateName) ? prev : [...prev, candidateName]));
    };

    const handleRemoveCandidate = (candidateId: string) => {
        setCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateId));
    };

    return (
        <article className="bg-card border border-border rounded-xl overflow-hidden">
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
                            {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
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
                {candidates.length > 0 && (
                    <ul className="divide-y divide-border">
                        {candidates.map((candidate) => (
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
                                                    setCandidates((prev) =>
                                                        prev.map((item) =>
                                                            item.id === candidate.id
                                                                ? { ...item, notes: editingCandidateNotes.trim() }
                                                                : item
                                                        )
                                                    );
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
                                            onClick={() => handleMoveToPipeline(candidate.id, candidate.name)}
                                        >
                                            Move to pipeline
                                            <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveCandidate(candidate.id)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {inPipelineNames.length > 0 && (
                    <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{inPipelineNames.length}</span> already in pipeline:{" "}
                        {inPipelineNames.join(", ")}
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

export function CallingsPageClient() {
    const [openVacancy, setOpenVacancy] = useState(false);
    const [showCallingPicker, setShowCallingPicker] = useState(false);
    const [selectedCalling, setSelectedCalling] = useState<string | null>(null);
    const [callingSearch, setCallingSearch] = useState("");
    const [callingNotes, setCallingNotes] = useState("");
    const [vacancies, setVacancies] = useState<Array<{
        id: string;
        callingId: string;
        callingTitle: string;
        organization: string;
        notes: string;
        createdAt: Date;
    }>>([]);

    const callings = useMemo(() => {
        return callingsCatalog
            .filter((c) => c.active)
            .map((c) => ({
                id: c.id,
                title: c.labels.en,
                organization: formatOrganization(c.organization),
            }));
    }, []);

    const filteredCallings = useMemo(() => {
        return callings.filter((c) =>
            c.title.toLowerCase().includes(callingSearch.toLowerCase())
        );
    }, [callings, callingSearch]);

    const selectedCallingData = callings.find((c) => c.id === selectedCalling);

    const handleAddVacancy = () => {
        if (!selectedCalling || !selectedCallingData) return;
        
        const newVacancy = {
            id: crypto.randomUUID(),
            callingId: selectedCalling,
            callingTitle: selectedCallingData.title,
            organization: selectedCallingData.organization,
            notes: callingNotes,
            createdAt: new Date(),
        };
        
        setVacancies([...vacancies, newVacancy]);
        setSelectedCalling(null);
        setCallingNotes("");
        setOpenVacancy(false);
    };

    const handleRemoveVacancy = (id: string) => {
        setVacancies(vacancies.filter((v) => v.id !== id));
    };

    const handleUpdateVacancyNotes = (id: string, notes: string) => {
        setVacancies(vacancies.map((v) => 
            v.id === id ? { ...v, notes } : v
        ));
    };

    const timeAgo = (date: Date) => {
        const now = new Date();
        const diffInWeeks = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (diffInWeeks === 0) return "this week";
        if (diffInWeeks === 1) return "1w ago";
        return `${diffInWeeks}w ago`;
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
                            <span className="ml-2 text-[10px] font-mono opacity-70">0</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="pipeline"
                            className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none px-0 pb-3 text-[13px] text-muted-foreground"
                        >
                            Pipeline
                            <span className="ml-2 text-[10px] font-mono opacity-70">0</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="archive"
                            className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none px-0 pb-3 text-[13px] text-muted-foreground"
                        >
                            Archive
                            <span className="ml-2 text-[10px] font-mono opacity-70">0</span>
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
                                        onClick={() => setOpenVacancy(true)}
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
                                                timeAgo={timeAgo}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Member considerations */}
                            <section>
                                Member considerations pane
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="pipeline" className="mt-8 focus-visible:outline-none">
                        Pipeline content
                    </TabsContent>

                    <TabsContent value="archive" className="mt-8 focus-visible:outline-none">
                        Archive content
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
                            disabled={!selectedCalling}
                            className="bg-brand text-white hover:bg-brand/90"
                            onClick={handleAddVacancy}
                        >
                            Add to board
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
        </div>
    );
}
