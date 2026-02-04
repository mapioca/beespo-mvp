"use client";

import { Trash2, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MeetingShareInvitation, ShareInvitationStatus } from "@/types/share";

interface InvitationsListProps {
  invitations: MeetingShareInvitation[];
  onRevoke: (invitationId: string) => void;
  isLoading?: boolean;
}

const statusConfig: Record<
  ShareInvitationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
  },
  accepted: {
    label: "Accepted",
    variant: "default",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  revoked: {
    label: "Revoked",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
};

export function InvitationsList({
  invitations,
  onRevoke,
  isLoading,
}: InvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No invitations sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => {
        const status = statusConfig[invitation.status];
        const isExpired = new Date(invitation.expires_at) < new Date();
        const displayStatus = isExpired && invitation.status === "pending" ? statusConfig.expired : status;

        return (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {invitation.email}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {invitation.permission}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={displayStatus.variant}
                    className="text-xs flex items-center gap-1"
                  >
                    {displayStatus.icon}
                    {displayStatus.label}
                  </Badge>
                  {invitation.status === "pending" && !isExpired && (
                    <span className="text-xs text-muted-foreground">
                      Expires{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {invitation.status === "pending" && !isExpired && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRevoke(invitation.id)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
