"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Users } from "lucide-react";
import { ParticipantsTable } from "@/components/participants/participants-table";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

interface Participant {
    id: string;
    name: string;
    created_at: string;
    created_by: string | null;
    profiles?: { full_name: string } | null;
}

interface ParticipantsClientProps {
    participants: Participant[];
    userRole: string;
    totalCount: number;
    currentSearch: string;
}

export function ParticipantsClient({
    participants,
    userRole,
    totalCount,
    currentSearch,
}: ParticipantsClientProps) {
    const t = useTranslations("Dashboard.Participants");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const canManage = userRole === "leader" || userRole === "admin";

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Debounced search - updates URL params for server-side filtering
    const handleSearchChange = useCallback((value: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            startTransition(() => {
                const params = new URLSearchParams(searchParams.toString());
                if (value) {
                    params.set("search", value);
                } else {
                    params.delete("search");
                }
                // Reset to page 1 when searching
                params.delete("page");
                router.push(`${pathname}?${params.toString()}`);
            });
        }, 300);
    }, [router, pathname, searchParams]);

    const handleCreate = async () => {
        if (!newName.trim()) return;

        setIsCreating(true);
        const supabase = createClient();

        // Get current user's workspace_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsCreating(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            setIsCreating(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("participants") as any)
            .insert({
                name: newName.trim(),
                workspace_id: profile.workspace_id,
            });

        if (error) {
            toast.error(t("toastCreateError"));
        } else {
            toast.success(t("toastCreateSuccess"));
            setNewName("");
            setCreateDialogOpen(false);
            router.refresh();
        }

        setIsCreating(false);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8" />
                        {t("title")}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {t("subtitle")}
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("buttonAddParticipant")}
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        defaultValue={currentSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {isPending
                        ? t("totalCountLoading", { count: totalCount })
                        : t("totalCount", { count: totalCount })}
                </div>
            </div>

            {/* Table */}
            <ParticipantsTable
                participants={participants}
                canManage={canManage}
            />

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("dialogAddTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialogAddDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder={t("inputNamePlaceholder")}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                        >
                            {t("buttonCancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newName.trim() || isCreating}
                        >
                            {isCreating ? t("buttonCreating") : t("buttonCreate")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
