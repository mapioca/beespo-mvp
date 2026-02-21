"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, Download, Edit, StopCircle, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { MeetingAgendaPDF, getMeetingPDFFilename } from "@/components/meetings/meeting-agenda-pdf";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  templates?: { name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
  hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingActionsProps {
  meeting: Meeting;
  agendaItems: AgendaItem[];
  workspaceSlug: string | null;
  isLeader: boolean;
}

export function MeetingActions({
  meeting,
  agendaItems,
  workspaceSlug,
  isLeader,
}: MeetingActionsProps) {
  const router = useRouter();
  const t = useTranslations("Dashboard.Meetings.actions");
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(meeting);

  const handleStatusChange = async (newStatus: Meeting["status"]) => {
    setIsStatusLoading(true);
    const supabase = createClient();
    const { error } = await (
      supabase.from("meetings") as any // eslint-disable-line @typescript-eslint/no-explicit-any
    )
      .update({ status: newStatus })
      .eq("id", meeting.id);

    if (error) {
      toast.error(t("toast.statusUpdateFailed"));
    } else {
      router.refresh();
      toast.success(t("toast.statusUpdated"), {
        description: t("toast.markedAs", { status: newStatus }),
      });
    }
    setIsStatusLoading(false);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await pdf(
        <MeetingAgendaPDF meeting={currentMeeting} agendaItems={agendaItems} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getMeetingPDFFilename(currentMeeting);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("toast.downloadStarted"), {
        description: t("toast.downloadStartedDesc"),
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error(t("toast.downloadFailed"), {
        description: t("toast.downloadFailedDesc"),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMeetingUpdate = (updatedMeeting: Meeting) => {
    setCurrentMeeting(updatedMeeting);
  };

  return (
    <div className="space-y-3">
      {/* Primary Actions - Always visible */}
      <div className="flex flex-col gap-2">
        {/* Conduct/Start Meeting - Most prominent */}
        {meeting.status === "scheduled" && isLeader && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusChange("in_progress")}
            disabled={isStatusLoading}
          >
            {isStatusLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {t("startMeeting")}
          </Button>
        )}

        {meeting.status === "in_progress" && (
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
            <Link href={`/meetings/${meeting.id}/conduct`}>
              <Play className="w-4 h-4 mr-2" />
              {t("conductMeeting")}
            </Link>
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isDownloading ? t("downloading") : t("download")}
        </Button>

        <ShareDialog
          meeting={currentMeeting}
          workspaceSlug={workspaceSlug}
          onUpdate={handleMeetingUpdate}
        />
      </div>

      {/* Status-specific actions */}
      {isLeader && (
        <div className="flex gap-2">
          {meeting.status === "scheduled" && (
            <Button asChild variant="outline" className="flex-1" size="sm">
              <Link href={`/meetings/${meeting.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                {t("editAgenda")}
              </Link>
            </Button>
          )}

          {meeting.status === "in_progress" && (
            <Button
              variant="outline"
              className="flex-1"
              size="sm"
              onClick={() => handleStatusChange("completed")}
              disabled={isStatusLoading}
            >
              {isStatusLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4 mr-2" />
              )}
              {t("endMeeting")}
            </Button>
          )}

          {meeting.status === "completed" && (
            <Button
              variant="outline"
              className="flex-1"
              size="sm"
              onClick={() => handleStatusChange("scheduled")}
              disabled={isStatusLoading}
            >
              {isStatusLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t("reopen")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
