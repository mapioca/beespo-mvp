"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { CallingCard } from "./calling-card";
import { CallingDetailModal } from "./calling-detail-modal";
import {
    Plus,
    Search,
    LayoutGrid,
    List,
    Loader2,
    UserCheck,
    Clock,
    Users
} from "lucide-react";
import { createCalling } from "@/lib/actions/calling-actions";
import { useRouter } from "next/navigation";
import type { CallingProcessStage, CallingProcessStatus, CallingCandidateStatus } from "@/types/database";

interface CallingCandidate {
    id: string;
    status: CallingCandidateStatus;
    notes: string | null;
    candidate: { id: string; name: string } | null;
}

interface CallingProcess {
    id: string;
    current_stage: CallingProcessStage;
    status: CallingProcessStatus;
    candidate: { id: string; name: string } | null;
}

interface Calling {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    filled_by_name: { id: string; name: string } | null;
    candidates: CallingCandidate[];
    processes: CallingProcess[];
    created_at: string;
}

interface CallingsClientProps {
    callings: Calling[];
    teamMembers: { id: string; full_name: string }[];
    userRole: string;
}

type ViewMode = 'board' | 'list';
type FilterStatus = 'all' | 'open' | 'in_progress' | 'filled';

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

export function CallingsClient({ callings, teamMembers, userRole }: CallingsClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [filterOrg, setFilterOrg] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newOrg, setNewOrg] = useState("");
    const [creating, setCreating] = useState(false);
    const [selectedCallingId, setSelectedCallingId] = useState<string | null>(null);

    const canEdit = ['admin', 'leader'].includes(userRole);

    // Get unique organizations from callings
    const organizations = useMemo(() => {
        const orgs = new Set<string>();
        callings.forEach(c => {
            if (c.organization) orgs.add(c.organization);
        });
        return Array.from(orgs).sort();
    }, [callings]);

    // Filter callings
    const filteredCallings = useMemo(() => {
        return callings.filter(calling => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesTitle = calling.title.toLowerCase().includes(searchLower);
                const matchesOrg = calling.organization?.toLowerCase().includes(searchLower);
                const matchesCandidate = calling.candidates.some(
                    c => c.candidate?.name.toLowerCase().includes(searchLower)
                );
                const matchesProcess = calling.processes.some(
                    p => p.candidate?.name.toLowerCase().includes(searchLower)
                );
                if (!matchesTitle && !matchesOrg && !matchesCandidate && !matchesProcess) {
                    return false;
                }
            }

            // Status filter
            const activeProcess = calling.processes.find(p => p.status === 'active');
            if (filterStatus !== 'all') {
                if (filterStatus === 'open' && (calling.is_filled || activeProcess)) return false;
                if (filterStatus === 'in_progress' && !activeProcess) return false;
                if (filterStatus === 'filled' && !calling.is_filled) return false;
            }

            // Organization filter
            return !(filterOrg !== 'all' && calling.organization !== filterOrg);


        });
    }, [callings, search, filterStatus, filterOrg]);

    // Group callings by status for board view
    const groupedCallings = useMemo(() => {
        const groups = {
            open: [] as Calling[],
            in_progress: [] as Calling[],
            filled: [] as Calling[],
        };

        filteredCallings.forEach(calling => {
            const activeProcess = calling.processes.find(p => p.status === 'active');
            if (calling.is_filled) {
                groups.filled.push(calling);
            } else if (activeProcess) {
                groups.in_progress.push(calling);
            } else {
                groups.open.push(calling);
            }
        });

        return groups;
    }, [filteredCallings]);

    // Stats
    const stats = useMemo(() => ({
        total: callings.length,
        open: callings.filter(c => !c.is_filled && !c.processes.some(p => p.status === 'active')).length,
        inProgress: callings.filter(c => c.processes.some(p => p.status === 'active')).length,
        filled: callings.filter(c => c.is_filled).length,
    }), [callings]);

    const handleCreateCalling = async () => {
        if (!newTitle.trim()) return;

        setCreating(true);
        const result = await createCalling({
            title: newTitle.trim(),
            organization: (newOrg && newOrg !== '_none') ? newOrg : undefined,
        });
        setCreating(false);

        if (result.success) {
            setShowNewDialog(false);
            setNewTitle("");
            setNewOrg("");
            router.refresh();
        }
    };

    const handleCallingClick = (calling: Calling) => {
        setSelectedCallingId(calling.id);
    };

    const handleModalClose = () => {
        setSelectedCallingId(null);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Callings</h1>
                    <p className="text-muted-foreground">
                        Brainstorm candidates and track calling processes
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={() => setShowNewDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Calling
                    </Button>
                )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Users className="w-4 h-4" />
                        Total
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Plus className="w-4 h-4" />
                        Open
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.open}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        In Progress
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.inProgress}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <UserCheck className="w-4 h-4" />
                        Filled
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.filled}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search callings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="filled">Filled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterOrg} onValueChange={setFilterOrg}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Organization" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations.map((org) => (
                            <SelectItem key={org} value={org}>
                                {org}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                        variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('board')}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {filteredCallings.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No callings found</h3>
                    <p className="text-muted-foreground mt-1">
                        {callings.length === 0
                            ? "Create your first calling to get started"
                            : "Try adjusting your search or filters"}
                    </p>
                    {canEdit && callings.length === 0 && (
                        <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Calling
                        </Button>
                    )}
                </div>
            ) : viewMode === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Open Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-normal">
                                Open
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {groupedCallings.open.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {groupedCallings.open.map((calling) => (
                                <CallingCard
                                    key={calling.id}
                                    calling={calling}
                                    onClick={() => handleCallingClick(calling)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* In Progress Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="font-normal">
                                In Progress
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {groupedCallings.in_progress.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {groupedCallings.in_progress.map((calling) => (
                                <CallingCard
                                    key={calling.id}
                                    calling={calling}
                                    onClick={() => handleCallingClick(calling)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Filled Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal bg-green-100 text-green-800">
                                Filled
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {groupedCallings.filled.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {groupedCallings.filled.map((calling) => (
                                <CallingCard
                                    key={calling.id}
                                    calling={calling}
                                    onClick={() => handleCallingClick(calling)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCallings.map((calling) => (
                        <CallingCard
                            key={calling.id}
                            calling={calling}
                            onClick={() => handleCallingClick(calling)}
                        />
                    ))}
                </div>
            )}

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
                            <Label htmlFor="title">Calling Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Primary President"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organization">Organization (optional)</Label>
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

            {/* Detail Modal */}
            <CallingDetailModal
                callingId={selectedCallingId}
                open={!!selectedCallingId}
                onOpenChange={() => handleModalClose()}
                onUpdate={() => router.refresh()}
                teamMembers={teamMembers}
            />
        </div>
    );
}
