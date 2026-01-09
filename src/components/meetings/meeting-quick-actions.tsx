"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Play, StopCircle, XCircle } from "lucide-react";

export function MeetingQuickActions({
  meetingId,
  currentStatus,
}: {
  meetingId: string;
  currentStatus: "scheduled" | "in_progress" | "completed" | "cancelled";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartMeeting = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("meetings") as any)
      .update({ status: "in_progress" })
      .eq("id", meetingId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Meeting started",
        description: "The meeting is now in progress",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleEndMeeting = async () => {
    if (!confirm("Are you sure you want to end this meeting?")) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("meetings") as any)
      .update({ status: "completed" })
      .eq("id", meetingId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Meeting ended",
        description: "The meeting has been marked as completed",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleCancelMeeting = async () => {
    if (!confirm("Are you sure you want to cancel this meeting? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("meetings") as any)
      .update({ status: "cancelled" })
      .eq("id", meetingId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Meeting cancelled",
        description: "The meeting has been cancelled",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  return (
    <div className="flex gap-2">
      {currentStatus === "scheduled" && (
        <>
          <Button
            onClick={handleStartMeeting}
            disabled={isLoading}
          >
            <Play className="mr-2 h-4 w-4" />
            {isLoading ? "Starting..." : "Start Meeting"}
          </Button>
          <Button
            onClick={handleCancelMeeting}
            disabled={isLoading}
            variant="destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {isLoading ? "Cancelling..." : "Cancel"}
          </Button>
        </>
      )}

      {currentStatus === "in_progress" && (
        <>
          <Button
            onClick={handleEndMeeting}
            disabled={isLoading}
            variant="secondary"
          >
            <StopCircle className="mr-2 h-4 w-4" />
            {isLoading ? "Ending..." : "End Meeting"}
          </Button>
          <Button
            onClick={handleCancelMeeting}
            disabled={isLoading}
            variant="destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {isLoading ? "Cancelling..." : "Cancel"}
          </Button>
        </>
      )}

      {(currentStatus === "completed" || currentStatus === "cancelled") && (
        <p className="text-sm text-muted-foreground">
          This meeting has {currentStatus === "completed" ? "ended" : "been cancelled"}
        </p>
      )}
    </div>
  );
}
