"use client";

import { useState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { RecipientSearch } from "./recipient-search";
import { SharingWithList } from "./sharing-with-list";
import { SaveAsGroupPrompt } from "./save-as-group-prompt";
import type {
  SharingGroupWithMembers,
  ShareRecipient,
  SharePermission,
  MeetingShare,
} from "@/types/share";

interface ShareRecipientsTabProps {
  meetingId: string;
  onShared?: () => void;
}

export function ShareRecipientsTab({
  meetingId,
  onShared,
}: ShareRecipientsTabProps) {
  const [suggestedGroups, setSuggestedGroups] = useState<
    SharingGroupWithMembers[]
  >([]);
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [existingShares, setExistingShares] = useState<MeetingShare[]>([]);
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load groups, recent emails, and existing shares on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [groupsRes, recentRes, sharesRes] = await Promise.all([
          fetch("/api/sharing-groups"),
          fetch("/api/share/recent"),
          fetch(`/api/share/meeting?meeting_id=${meetingId}`),
        ]);

        if (groupsRes.ok) {
          const d = await groupsRes.json();
          setSuggestedGroups(d.groups ?? []);
        }
        if (recentRes.ok) {
          const d = await recentRes.json();
          setRecentEmails(d.emails ?? []);
        }
        if (sharesRes.ok) {
          const d = await sharesRes.json();
          setExistingShares(d.shares ?? []);
        }
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [meetingId]);

  // IDs already staged or already shared — avoid duplicates
  const alreadyAddedIds = [
    ...recipients.map((r) => r.id),
    ...existingShares.map((s) => s.recipient_email),
  ];

  const handleAddRecipient = (recipient: ShareRecipient) => {
    setRecipients((prev) => {
      if (prev.find((r) => r.id === recipient.id)) return prev;
      return [...prev, recipient];
    });
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePermissionChange = (id: string, permission: SharePermission) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, permission } : r))
    );
  };

  const handleShare = async () => {
    if (recipients.length === 0) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/share/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          recipients: recipients.map((r) => ({
            type: r.type,
            group_id: r.group?.id,
            email: r.email,
            permission: r.permission,
          })),
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to share meeting";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        toast.error(errorMsg);
        return;
      }

      const data = await res.json();

      toast.success("Meeting shared", {
        description: `Shared with ${data.shared_count} ${data.shared_count === 1 ? "person" : "people"}.`,
      });
      setRecipients([]);
      onShared?.();

      // Refresh existing shares
      const sharesRes = await fetch(
        `/api/share/meeting?meeting_id=${meetingId}`
      );
      if (sharesRes.ok) {
        const d = await sharesRes.json();
        setExistingShares(d.shares ?? []);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveAsGroup = async (groupName: string) => {
    const emails = recipients
      .filter((r) => r.type === "individual" && r.email)
      .map((r) => r.email!);

    if (emails.length === 0) return;

    const res = await fetch("/api/sharing-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName, memberEmails: emails }),
    });

    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Failed to save group");
      return;
    }

    toast.success("Group saved", {
      description: `"${groupName}" group created with ${emails.length} members.`,
    });

    // Refresh suggested groups
    const groupsRes = await fetch("/api/sharing-groups");
    if (groupsRes.ok) {
      const d = await groupsRes.json();
      setSuggestedGroups(d.groups ?? []);
    }
  };

  const handleRevokeExistingShare = async (shareId: string) => {
    const res = await fetch(`/api/share/meeting?id=${shareId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      let errorMsg = "Failed to revoke share";
      try {
        const d = await res.json();
        errorMsg = d.error || errorMsg;
      } catch {}
      toast.error(errorMsg);
      return;
    }
    setExistingShares((prev) => prev.filter((s) => s.id !== shareId));
    toast.success("Access revoked");
  };

  const individualRecipients = recipients.filter(
    (r) => r.type === "individual"
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <RecipientSearch
        suggestedGroups={suggestedGroups}
        recentEmails={recentEmails}
        existingRecipientIds={alreadyAddedIds}
        onAdd={handleAddRecipient}
        disabled={isSharing || isLoadingData}
      />

      {/* Staged recipients */}
      {recipients.length > 0 && (
        <>
          <SharingWithList
            recipients={recipients}
            onRemove={handleRemoveRecipient}
            onPermissionChange={handlePermissionChange}
            disabled={isSharing}
          />

          {/* Save as Group prompt for 3+ individuals */}
          {individualRecipients.length >= 3 && (
            <SaveAsGroupPrompt
              recipientCount={individualRecipients.length}
              onSave={handleSaveAsGroup}
            />
          )}

          <Button
            onClick={handleShare}
            disabled={isSharing || recipients.length === 0}
            className="w-full"
          >
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Share with {recipients.length}{" "}
                {recipients.length === 1 ? "recipient" : "recipients"}
              </>
            )}
          </Button>
        </>
      )}

      {/* Existing shares */}
      {existingShares.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Currently Shared With
            </p>
            {existingShares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm truncate block">
                    {share.recipient_email}
                  </span>
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {share.permission === "editor" ? "Editor" : "Viewer"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevokeExistingShare(share.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {!isLoadingData &&
        recipients.length === 0 &&
        existingShares.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Search for groups or enter an email to share this meeting.
          </p>
        )}

      {isLoadingData && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
