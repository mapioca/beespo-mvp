"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Clock, Check, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useLiveMeeting,
  getConnectionStatusColor,
  getConnectionStatusLabel,
} from "@/hooks/use-live-meeting";
import { getOrCreateFingerprint, getReferrer, getUserAgent } from "@/lib/share/fingerprint";
import type { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];

interface LiveMeetingViewProps {
  meetingId: string;
  initialMeeting: Meeting;
  initialAgendaItems: AgendaItem[];
}

export function LiveMeetingView({
  meetingId,
  initialMeeting,
  initialAgendaItems,
}: LiveMeetingViewProps) {
  const hasTrackedView = useRef(false);

  const { meeting, agendaItems, connectionStatus, lastUpdated, refresh } = useLiveMeeting({
    meetingId,
    initialMeeting,
    initialAgendaItems,
    enabled: true,
  });

  // Track view on mount
  useEffect(() => {
    if (hasTrackedView.current) return;

    const trackView = async () => {
      try {
        const fingerprint = await getOrCreateFingerprint();
        const referrer = getReferrer();
        const userAgent = getUserAgent();

        await fetch(`/api/share/${meetingId}/track-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitor_fingerprint: fingerprint,
            referrer,
            user_agent: userAgent,
          }),
        });

        hasTrackedView.current = true;
      } catch (error) {
        console.error("Failed to track view:", error);
      }
    };

    trackView();
  }, [meetingId]);

  if (!meeting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Meeting not found or no longer shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" ? (
            <Wifi className={`h-3 w-3 ${getConnectionStatusColor(connectionStatus)}`} />
          ) : (
            <WifiOff className={`h-3 w-3 ${getConnectionStatusColor(connectionStatus)}`} />
          )}
          <span>{getConnectionStatusLabel(connectionStatus)}</span>
          {lastUpdated && (
            <span className="text-muted-foreground/60">
              Last updated {format(lastUpdated, "h:mm:ss a")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Meeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>
            {format(new Date(meeting.scheduled_date), "EEEE, MMMM d, yyyy")}
          </span>
          <span
            className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${
              meeting.status === "completed"
                ? "bg-green-100 text-green-700"
                : meeting.status === "in_progress"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700"
            }
          `}
          >
            {meeting.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Agenda Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Agenda</h2>

        {agendaItems && agendaItems.length > 0 ? (
          <div className="space-y-3">
            {agendaItems.map((item, idx) => (
              <div
                key={item.id}
                className={`
                  p-4 rounded-lg border bg-card transition-opacity
                  ${item.is_completed ? "opacity-60" : ""}
                `}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl font-bold text-muted-foreground/30">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                        {item.item_type}
                      </span>
                      {item.is_completed && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          Completed
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.participant_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Presenter: {item.participant_name}
                      </p>
                    )}
                  </div>
                  {item.duration_minutes && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {item.duration_minutes} min
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            No agenda items available.
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p>
          This is a public view of the meeting agenda. Notes and detailed
          discussions are only visible to workspace members.
        </p>
      </div>
    </div>
  );
}
