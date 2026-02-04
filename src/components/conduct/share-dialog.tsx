"use client";

import { useState, useEffect } from "react";
import { Share2, Mail, Link2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteTab, PublicLinkTab, ExportTab, ShareAnalyticsBadge } from "@/components/share";
import { useShareDialogStore } from "@/stores/share-dialog-store";
import type { Database } from "@/types/database";
import type { ShareDialogTab } from "@/types/share";

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
  // Default tab to show
  defaultTab?: ShareDialogTab;
}

export function ShareDialog({
  meeting,
  workspaceSlug,
  onUpdate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  defaultTab = "public-link",
}: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const {
    activeTab,
    setActiveTab,
    setInvitations,
    setSettings,
    setAnalytics,
    setLoadingInvitations,
    setLoadingSettings,
    setLoadingAnalytics,
    reset,
  } = useShareDialogStore();

  // Set default tab on mount
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, setActiveTab]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchInvitations = async () => {
      setLoadingInvitations(true);
      try {
        const response = await fetch(`/api/share/invite?meeting_id=${meeting.id}`);
        if (response.ok) {
          const data = await response.json();
          setInvitations(data.invitations || []);
        }
      } catch (error) {
        console.error("Failed to fetch invitations:", error);
      } finally {
        setLoadingInvitations(false);
      }
    };

    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const response = await fetch(`/api/share/${meeting.id}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const response = await fetch(`/api/share/${meeting.id}/analytics`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchInvitations();
    fetchSettings();
    fetchAnalytics();
  }, [
    isOpen,
    meeting.id,
    setInvitations,
    setSettings,
    setAnalytics,
    setLoadingInvitations,
    setLoadingSettings,
    setLoadingAnalytics,
  ]);

  // Reset store when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow closing animation
      const timer = setTimeout(() => {
        reset();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset]);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Share Meeting</DialogTitle>
            {meeting.is_publicly_shared && (
              <ShareAnalyticsBadge meetingId={meeting.id} variant="badge" />
            )}
          </div>
          <DialogDescription>
            Share the meeting agenda via link, email invitation, or export.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ShareDialogTab)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public-link" className="flex items-center gap-1.5">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Public Link</span>
              <span className="sm:hidden">Link</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
              <span className="sm:hidden">Invite</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="public-link" className="m-0">
              <PublicLinkTab
                meeting={meeting}
                workspaceSlug={workspaceSlug}
                onUpdate={onUpdate}
              />
            </TabsContent>

            <TabsContent value="invite" className="m-0">
              <InviteTab meetingId={meeting.id} />
            </TabsContent>

            <TabsContent value="export" className="m-0">
              <ExportTab meetingId={meeting.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
