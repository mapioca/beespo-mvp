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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import { Mail, X, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface Invitation {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
    invited_by: {
        full_name: string;
    } | null;
}

interface PendingInvitationsProps {
    invitations: Invitation[];
    isAdmin: boolean;
    onInvitationUpdated: () => void;
}

export function PendingInvitations({
    invitations,
    isAdmin,
    onInvitationUpdated,
}: PendingInvitationsProps) {
    const t = useTranslations("Tables.pendingInvitations");
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleResend = async (id: string) => {
        setLoadingId(id);
        try {
            const response = await fetch(`/api/invitations/${id}`, {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to resend invitation");
            }

            if (data.emailSent) {
                toast.success("Invitation Resent", { description: "The invitation has been sent again." });
            } else {
                toast.error("Email Failed", { description: "Invitation was updated, but the email failed to send. Check your API key." });
            }
            onInvitationUpdated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
        } finally {
            setLoadingId(null);
        }
    };

    const handleRevoke = async (id: string) => {
        setLoadingId(id);
        try {
            const response = await fetch(`/api/invitations/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to revoke invitation");
            }

            toast.success("Invitation Revoked", { description: "The invitation has been cancelled." });
            onInvitationUpdated();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to revoke invitation");
        } finally {
            setLoadingId(null);
        }
    };

    if (invitations.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Mail className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>{t("noPendingInvitations")}</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                    <TableHead>{t("invitedBy")}</TableHead>
                    <TableHead>{t("expires")}</TableHead>
                    {isAdmin && <TableHead className="w-[100px]">{t("actions")}</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {invitations.map((invitation) => {
                    const isExpiringSoon = new Date(invitation.expires_at) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                    const isLoading = loadingId === invitation.id;

                    return (
                        <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {invitation.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {invitation.invited_by?.full_name || t("unknown")}
                            </TableCell>
                            <TableCell>
                                <span className={isExpiringSoon ? "text-orange-600" : "text-muted-foreground"}>
                                    {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                                </span>
                            </TableCell>
                            {isAdmin && (
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleResend(invitation.id)}
                                            disabled={isLoading}
                                            title={t("resendInvitation")}
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRevoke(invitation.id)}
                                            disabled={isLoading}
                                            title={t("revokeInvitation")}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
