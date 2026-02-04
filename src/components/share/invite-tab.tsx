"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvitationsList } from "./invitations-list";
import { useShareDialogStore } from "@/stores/share-dialog-store";
import type { SharePermission, MeetingShareInvitation } from "@/types/share";

interface InviteTabProps {
  meetingId: string;
  onInvitationSent?: (invitation: MeetingShareInvitation) => void;
}

export function InviteTab({ meetingId, onInvitationSent }: InviteTabProps) {
  const {
    invitations,
    inviteEmail,
    invitePermission,
    isSendingInvitation,
    isLoadingInvitations,
    setInviteEmail,
    setInvitePermission,
    addInvitation,
    removeInvitation,
    setSendingInvitation,
    setError,
  } = useShareDialogStore();

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      setLocalError("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setLocalError("Please enter a valid email address");
      return;
    }

    setLocalError(null);
    setSendingInvitation(true);

    try {
      const response = await fetch("/api/share/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          email: inviteEmail.trim(),
          permission: invitePermission,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLocalError(data.error || "Failed to send invitation");
        return;
      }

      addInvitation(data.invitation);
      onInvitationSent?.(data.invitation);
    } catch {
      setLocalError("Failed to send invitation. Please try again.");
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/share/invite?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to revoke invitation");
        return;
      }

      removeInvitation(invitationId);
    } catch {
      setError("Failed to revoke invitation. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email address</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setLocalError(null);
              }}
              className="flex-1"
            />
            <Select
              value={invitePermission}
              onValueChange={(value: SharePermission) =>
                setInvitePermission(value)
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {localError && (
            <p className="text-sm text-destructive">{localError}</p>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Viewer:</strong> Read-only access to the shared meeting
          </p>
          <p>
            <strong>Editor:</strong> Can add/remove/reorder agenda items, update
            titles and descriptions
          </p>
        </div>

        <Button
          onClick={handleSendInvitation}
          disabled={isSendingInvitation || !inviteEmail.trim()}
          className="w-full"
        >
          {isSendingInvitation ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
      </div>

      {/* Invitations list */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Sent Invitations</h4>
        <InvitationsList
          invitations={invitations}
          onRevoke={handleRevokeInvitation}
          isLoading={isLoadingInvitations}
        />
      </div>
    </div>
  );
}
