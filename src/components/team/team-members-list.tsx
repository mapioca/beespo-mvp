"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { MoreHorizontal, Crown, Shield, Pencil, MessageSquare, Eye, UserMinus } from "lucide-react";
import type { UserRole } from "@/types/database";
import { canManage, isOwner, INVITABLE_ROLES, formatRoleLabel } from "@/lib/auth/role-permissions";

interface TeamMember {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

interface TeamMembersListProps {
    members: TeamMember[];
    currentUserId: string;
    currentUserRole: string;
    onMemberUpdated: () => void;
}

const roleConfig: Record<UserRole, { label: string; icon: typeof Crown; variant: "default" | "secondary" | "outline" }> = {
    owner:     { label: "Owner",     icon: Crown,         variant: "default"   },
    admin:     { label: "Admin",     icon: Shield,        variant: "default"   },
    editor:    { label: "Editor",    icon: Pencil,        variant: "secondary" },
    commenter: { label: "Commenter", icon: MessageSquare, variant: "secondary" },
    viewer:    { label: "Viewer",    icon: Eye,           variant: "outline"   },
};

export function TeamMembersList({
    members,
    currentUserId,
    currentUserRole,
    onMemberUpdated,
}: TeamMembersListProps) {
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [transferringTo, setTransferringTo] = useState<TeamMember | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const canManageTeam = canManage(currentUserRole);
    const canTransferOwnership = isOwner(currentUserRole);

    const handleRoleChange = async (memberId: string, newRole: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/team/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update role");
            }

            toast.success("Role Updated", { description: "Member role has been updated successfully." });
            onMemberUpdated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update role");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!removingId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/team/${removingId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to remove member");
            }

            toast.success("Member Removed", { description: "Member has been removed from the workspace." });
            onMemberUpdated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to remove member");
        } finally {
            setIsLoading(false);
            setRemovingId(null);
        }
    };

    const handleTransferOwnership = async () => {
        if (!transferringTo) return;
        setIsLoading(true);
        try {
            const response = await fetch("/api/team/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newOwnerId: transferringTo.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to transfer ownership");
            }

            toast.success("Ownership Transferred", { description: `${transferringTo.full_name} is now the owner.` });
            onMemberUpdated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to transfer ownership");
        } finally {
            setIsLoading(false);
            setTransferringTo(null);
        }
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        {canManageTeam && <TableHead className="w-[70px]">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map((member) => {
                        const config = roleConfig[member.role];
                        const RoleIcon = config.icon;
                        const isCurrentUser = member.id === currentUserId;

                        return (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">
                                    {member.full_name}
                                    {isCurrentUser && (
                                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                                <TableCell>
                                    {canManageTeam && !isCurrentUser && member.role !== "owner" ? (
                                        <Select
                                            value={member.role}
                                            onValueChange={(value) => handleRoleChange(member.id, value)}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INVITABLE_ROLES.map((r) => (
                                                    <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={config.variant} className="gap-1">
                                            <RoleIcon className="h-3 w-3" />
                                            {config.label}
                                        </Badge>
                                    )}
                                </TableCell>
                                {canManageTeam && (
                                    <TableCell>
                                        {!isCurrentUser && member.role !== "owner" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isLoading}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {canTransferOwnership && (
                                                        <DropdownMenuItem onClick={() => setTransferringTo(member)}>
                                                            <Crown className="mr-2 h-4 w-4" />
                                                            Make Owner
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canTransferOwnership && <DropdownMenuSeparator />}
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setRemovingId(member.id)}
                                                    >
                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                        Remove from Workspace
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Remove Member Dialog */}
            <AlertDialog open={!!removingId} onOpenChange={() => setRemovingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member from the workspace? Their data (created tasks, notes, etc.) will be preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            disabled={isLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLoading ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Transfer Ownership Dialog */}
            <AlertDialog open={!!transferringTo} onOpenChange={() => setTransferringTo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make {transferringTo?.full_name} the owner of this workspace. You will be demoted to Admin. Only owners can transfer billing, ownership, or delete the workspace. This action cannot be undone without their cooperation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransferOwnership} disabled={isLoading}>
                            {isLoading ? "Processing..." : "Transfer Ownership"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
