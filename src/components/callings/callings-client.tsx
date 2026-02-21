"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { CallingsKanbanBoard } from "./callings-kanban-board";
import { CallingCard } from "./calling-card";
import { CallingDetailDrawer } from "./calling-detail-drawer";
import {
    Plus,
    Search,
    LayoutGrid,
    List,
    Loader2,
    Users
} from "lucide-react";
import { createCalling } from "@/lib/actions/calling-actions";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
    filled_at: string | null;
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

const COMMON_ORGANIZATION_KEYS = [
    "bishopric",
    "eldersQuorum",
    "reliefSociety",
    "youngMen",
    "youngWomen",
    "primary",
    "sundaySchool",
    "missionaryWork",
    "templeFamilyHistory",
];

export function CallingsClient({ callings, teamMembers, userRole }: CallingsClientProps) {
    const t = useTranslations("Callings");
    const to = useTranslations("Callings.organizations");
    const router = useRouter();
    const [search, setSearch] = useState("");
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

            // Organization filter
            return !(filterOrg !== 'all' && calling.organization !== filterOrg);
        });
    }, [callings, search, filterOrg]);

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
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("subtitle")}
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={() => setShowNewDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("newCalling")}
                    </Button>
                )}
            </div>

            <Separator />

            {/* Filters - Simplified */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterOrg} onValueChange={setFilterOrg}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("organization")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("allOrganizations")}</SelectItem>
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
                        title={t("boardView")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('list')}
                        title={t("listView")}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {filteredCallings.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">{t("noCallingsFound")}</h3>
                    <p className="text-muted-foreground mt-1">
                        {callings.length === 0
                            ? t("emptyStateStart")
                            : t("emptyStateAdjust")}
                    </p>
                    {canEdit && callings.length === 0 && (
                        <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t("createCalling")}
                        </Button>
                    )}
                </div>
            ) : viewMode === 'board' ? (
                <CallingsKanbanBoard
                    callings={filteredCallings}
                    onCallingClick={handleCallingClick}
                />
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
                        <DialogTitle>{t("newCallingDialog.title")}</DialogTitle>
                        <DialogDescription>
                            {t("newCallingDialog.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">{t("newCallingDialog.labelTitle")}</Label>
                            <Input
                                id="title"
                                placeholder={t("newCallingDialog.placeholderTitle")}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="organization">{t("newCallingDialog.labelOrg")}</Label>
                            <Select value={newOrg} onValueChange={setNewOrg}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("newCallingDialog.placeholderOrg")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">{t("newCallingDialog.none")}</SelectItem>
                                    {COMMON_ORGANIZATION_KEYS.map((key) => (
                                        <SelectItem key={key} value={to(key)}>
                                            {to(key)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                            {t("newCallingDialog.cancel")}
                        </Button>
                        <Button
                            onClick={handleCreateCalling}
                            disabled={!newTitle.trim() || creating}
                        >
                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t("newCallingDialog.create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <CallingDetailDrawer
                callingId={selectedCallingId}
                open={!!selectedCallingId}
                onOpenChange={() => handleModalClose()}
                onUpdate={() => router.refresh()}
                teamMembers={teamMembers}
            />
        </div>
    );
}
