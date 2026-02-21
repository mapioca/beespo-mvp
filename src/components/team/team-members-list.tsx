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
import { MoreHorizontal, Shield, User, Eye, UserMinus, Crown } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamMember {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "leader" | "guest";
    created_at: string;
}

interface TeamMembersListProps {
    members: TeamMember[];
    currentUserId: string;
    currentUserRole: string;
    onMemberUpdated: () => void;
}

const roleConfig = {
    admin: { label: "Admin", icon: Shield, variant: "default" as const },
    leader: { label: "Leader", icon: User, variant: "secondary" as const },
    guest: { label: "Guest", icon: Eye, variant: "outline" as const },
};

export function TeamMembersList({
    members,
    currentUserId,
    currentUserRole,
    onMemberUpdated,
}: TeamMembersListProps) {
    const t = useTranslations("Tables.teamMembers");
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [transferringTo, setTransferringTo] = useState<TeamMember | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isAdmin = currentUserRole === "admin";

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

            toast.success("Ownership Transferred", { description: `${transferringTo.full_name} is now an admin.` });
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
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("email")}</TableHead>
                        <TableHead>{t("role")}</TableHead>
                        {isAdmin && <TableHead className="w-[70px]">{t("actions")}</TableHead>}
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
                                        <span className="ml-2 text-xs text-muted-foreground">{t("you")}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                                <TableCell>
                                    {isAdmin && !isCurrentUser ? (
                                        <Select
                                            value={member.role}
                                            onValueChange={(value) => handleRoleChange(member.id, value)}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                                                <SelectItem value="leader">{t("roleLeader")}</SelectItem>
                                                <SelectItem value="guest">{t("roleGuest")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={config.variant} className="gap-1">
                                            <RoleIcon className="h-3 w-3" />
                                            {config.label}
                                        </Badge>
                                    )}
                                </TableCell>
                                {isAdmin && (
                                    <TableCell>
                                        {!isCurrentUser && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isLoading}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {member.role !== "admin" && (
                                                        <DropdownMenuItem onClick={() => setTransferringTo(member)}>
                                                            <Crown className="mr-2 h-4 w-4" />
                                                            {t("makeAdmin")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setRemovingId(member.id)}
                                                    >
                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                        {t("removeFromWorkspace")}
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
                        <AlertDialogTitle>{t("removeMemberTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("removeMemberDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            disabled={isLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLoading ? t("removing") : t("remove")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Transfer Ownership Dialog */}
            <AlertDialog open={!!transferringTo} onOpenChange={() => setTransferringTo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("makeAdminTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("makeAdminDescription", { name: transferringTo?.full_name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransferOwnership} disabled={isLoading}>
                            {isLoading ? t("processing") : t("makeAdmin")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
