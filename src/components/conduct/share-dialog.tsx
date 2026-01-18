"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { generateShareToken, getPublicMeetingUrl, copyToClipboard } from "@/lib/slug-helpers";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ShareDialogProps {
  meeting: Meeting;
  workspaceSlug: string | null;
  onUpdate?: (meeting: Meeting) => void;
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // If true, renders without trigger button (for external control)
  hideTrigger?: boolean;
}

export function ShareDialog({
  meeting,
  workspaceSlug,
  onUpdate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const [isShared, setIsShared] = useState(meeting.is_publicly_shared);
  const [shareToken, setShareToken] = useState(meeting.public_share_token);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsShared(meeting.is_publicly_shared);
    setShareToken(meeting.public_share_token);
  }, [meeting]);

  const publicUrl = workspaceSlug && shareToken
    ? getPublicMeetingUrl(workspaceSlug, meeting.id)
    : null;

  const handleToggleShare = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const newIsShared = !isShared;
      let newToken = shareToken;

      // Generate token if enabling sharing and no token exists
      if (newIsShared && !newToken) {
        newToken = generateShareToken();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("meetings") as any)
        .update({
          is_publicly_shared: newIsShared,
          public_share_token: newIsShared ? newToken : shareToken,
        })
        .eq("id", meeting.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to update sharing settings:", error);
        return;
      }

      setIsShared(newIsShared);
      setShareToken(newToken);

      if (onUpdate && data) {
        onUpdate(data);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;

    const success = await copyToClipboard(publicUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateToken = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const newToken = generateShareToken();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("meetings") as any)
        .update({ public_share_token: newToken })
        .eq("id", meeting.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to regenerate token:", error);
        return;
      }

      setShareToken(newToken);

      if (onUpdate && data) {
        onUpdate(data);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Meeting</DialogTitle>
          <DialogDescription>
            Share the meeting agenda publicly. Only the agenda structure is visible, notes remain private.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle Public Sharing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isShared ? (
                <Globe className="h-5 w-5 text-green-500" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="public-share" className="font-medium">
                  Public Access
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isShared
                    ? "Anyone with the link can view"
                    : "Only workspace members can access"}
                </p>
              </div>
            </div>
            <Switch
              id="public-share"
              checked={isShared}
              onCheckedChange={handleToggleShare}
              disabled={isUpdating || !workspaceSlug}
            />
          </div>

          {/* Share Link */}
          {isShared && publicUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  disabled={isUpdating}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs"
                  onClick={handleRegenerateToken}
                  disabled={isUpdating}
                >
                  Regenerate link
                </Button>
                <span className="mx-1">•</span>
                <span>This will invalidate the current link</span>
              </div>
            </div>
          )}

          {/* No workspace slug warning */}
          {!workspaceSlug && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
              Sharing is not available. The workspace needs a URL slug configured.
            </div>
          )}

          {/* What's visible */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">What&apos;s visible publicly:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Meeting title and date
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-500" />
                Agenda item titles and descriptions
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-red-500" />
                Notes and discussions (hidden)
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-red-500" />
                Tasks and assignments (hidden)
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
