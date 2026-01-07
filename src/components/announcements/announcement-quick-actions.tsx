"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

export function AnnouncementQuickActions({
  announcementId,
  initialStatus,
  relatedMeetingsCount,
}: {
  announcementId: string;
  initialStatus: "draft" | "active" | "stopped";
  relatedMeetingsCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .update({ status: "active" })
      .eq("id", announcementId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement activated! It will appear in new meetings.",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleStop = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .update({ status: "stopped" })
      .eq("id", announcementId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement stopped!",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    const confirmMessage =
      relatedMeetingsCount > 0
        ? `This announcement is in ${relatedMeetingsCount} meeting${
            relatedMeetingsCount !== 1 ? "s" : ""
          }. Are you sure you want to delete it?`
        : "Are you sure you want to delete this announcement?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .delete()
      .eq("id", announcementId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Success",
        description: "Announcement deleted!",
      });
      router.push("/announcements");
      router.refresh();
    }
  };

  return (
    <div className="space-y-2">
      {initialStatus === "draft" && (
        <Button
          onClick={handleActivate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Activating..." : "Activate"}
        </Button>
      )}
      {initialStatus === "active" && (
        <Button
          onClick={handleStop}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Stopping..." : "Stop"}
        </Button>
      )}
      {initialStatus === "stopped" && (
        <Button
          onClick={handleActivate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Reactivating..." : "Reactivate"}
        </Button>
      )}
      <Button
        onClick={handleDelete}
        disabled={isLoading}
        variant="destructive"
        className="w-full"
      >
        {isLoading ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
