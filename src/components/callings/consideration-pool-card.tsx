"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { MoreVertical, Pencil, Trash2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    updateCallingCandidate,
    removeCallingCandidate,
} from "@/lib/actions/calling-actions";
import { toast } from "@/lib/toast";
import type { CallingCandidateStatus } from "@/types/database";

interface CallingConsideration {
    id: string;
    status: CallingCandidateStatus;
    notes: string | null;
    calling: {
        id: string;
        title: string;
        organization: string | null;
    } | null;
}

interface ConsiderationPoolCardProps {
    candidateNameId: string;
    candidateName: string;
    onUpdate?: () => void;
}

const statusColors: Record<CallingCandidateStatus, string> = {
    proposed: "bg-gray-100 text-gray-800",
    discussing: "bg-blue-100 text-blue-800",
    selected: "bg-green-100 text-green-800",
    archived: "bg-amber-100 text-amber-800",
};

export function ConsiderationPoolCard({
    candidateNameId,
    candidateName,
    onUpdate,
}: ConsiderationPoolCardProps) {
    const t = useTranslations("Callings");
    const [considerations, setConsiderations] = useState<CallingConsideration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<CallingConsideration | null>(null);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const fetchConsiderations = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await (supabase
            .from("calling_candidates") as ReturnType<typeof supabase.from>)
            .select(`
                id,
                status,
                notes,
                calling:callings(id, title, organization)
            `)
            .eq("candidate_name_id", candidateNameId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching considerations:", error);
        } else {
            setConsiderations((data as unknown as CallingConsideration[]) || []);
        }

        setIsLoading(false);
    }, [supabase, candidateNameId]);

    useEffect(() => {
        fetchConsiderations();
    }, [fetchConsiderations]);

    const handleUpdateNotes = async () => {
        if (!editingItem) return;

        setIsSaving(true);

        const result = await updateCallingCandidate(editingItem.id, { notes });

        if (result.error) {
        } else {
            toast.success(t("pool.notesUpdated"));
            setEditingItem(null);
            setNotes("");
            fetchConsiderations();
            onUpdate?.();
        }

        setIsSaving(false);
    };

    const handleRemove = async (itemId: string, callingTitle: string) => {
        const result = await removeCallingCandidate(itemId);

        if (result.error) {
        } else {
            toast.success(t("pool.considerationRemoved"), { description: t("pool.considerationRemovedDesc", { name: candidateName, title: callingTitle }) });
            fetchConsiderations();
            onUpdate?.();
        }
    };

    // Sort: selected first, then discussing, then proposed, archived last
    const sortedConsiderations = [...considerations].sort((a, b) => {
        const order: Record<CallingCandidateStatus, number> = {
            selected: 0,
            discussing: 1,
            proposed: 2,
            archived: 3,
        };
        return order[a.status] - order[b.status];
    });

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {t("pool.considerationsTitle")}
                        </CardTitle>
                        <CardDescription>
                            {t("pool.considerationsCount", { count: considerations.length, name: candidateName })}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {isLoading ? (
                    <div className="animate-pulse space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-12 bg-muted rounded-lg" />
                        ))}
                    </div>
                ) : sortedConsiderations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {t("pool.considerationsEmpty")}
                    </p>
                ) : (
                    sortedConsiderations.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">
                                        {item.calling?.title || "Unknown Calling"}
                                    </span>
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                            statusColors[item.status]
                                        )}
                                    >
                                        {t(`pool.candidateStatuses.${item.status}`)}
                                    </span>
                                </div>
                                {item.calling?.organization && (
                                    <span className="text-xs text-muted-foreground">
                                        {item.calling.organization}
                                    </span>
                                )}
                                {item.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {item.notes}
                                    </p>
                                )}
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setEditingItem(item);
                                            setNotes(item.notes || "");
                                        }}
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        {t("pool.actions.editNotes")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleRemove(item.id, item.calling?.title || "")
                                        }
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t("pool.actions.remove")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))
                )}
            </CardContent>

            {/* Edit Notes Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("pool.dialogs.editNotes.title")}</DialogTitle>
                        <DialogDescription>
                            {t("pool.dialogs.editNotes.descriptionExtended", { name: candidateName || "", title: editingItem?.calling?.title || "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("pool.dialogs.editNotes.placeholder")}
                            rows={4}
                            disabled={isSaving}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingItem(null)}
                            disabled={isSaving}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleUpdateNotes} disabled={isSaving}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
