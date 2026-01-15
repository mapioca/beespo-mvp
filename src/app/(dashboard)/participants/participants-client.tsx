"use client";

import { useState } from "react";
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
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";

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
}

export function ParticipantsClient({ participants, userRole }: ParticipantsClientProps) {
    const [search, setSearch] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const canManage = userRole === "leader" || userRole === "admin";

    const filteredParticipants = search
        ? participants.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase())
        )
        : participants;

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
            toast({
                title: "Error",
                description: "Failed to create participant",
                variant: "destructive",
            });
        } else {
            toast({ title: "Participant created" });
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
                        Participants
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage reusable participant names for meeting assignments
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Participant
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search participants..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <ParticipantsTable
                participants={filteredParticipants}
                canManage={canManage}
            />

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Participant</DialogTitle>
                        <DialogDescription>
                            Create a new participant name for meeting assignments
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Enter name..."
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
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newName.trim() || isCreating}
                        >
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
