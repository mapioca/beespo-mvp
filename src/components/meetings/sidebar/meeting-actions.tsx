"use client";

import { useState } from "react";
import { Play, Download, Edit, StopCircle, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/conduct/share-dialog";
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
 workspaceSlug,
  isLeader,
}: MeetingActionsProps) {
  const router = useRouter();
  const [isStatusLoading, setIsStatusLoading] = useState(false);
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
      toast.error("Failed to update meeting status");
    } else {
      router.refresh();
      toast.success("Status updated", { description: `Meeting marked as ${newStatus}` });
    }
    setIsStatusLoading(false);
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
            Start Meeting
          </Button>
        )}

        {meeting.status === "in_progress" && (
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
            <Link href={`/meetings/${meeting.id}/conduct`}>
              <Play className="w-4 h-4 mr-2" />
              Conduct Meeting
            </Link>
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          className="flex-1"
        >
          <a href={`/meetings/${meeting.id}/print`} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Print
          </a>
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
                Edit Agenda
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
              End Meeting
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
              Reopen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
