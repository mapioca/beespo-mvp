"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { quickCreateMeeting } from "@/lib/actions/event-meeting-actions";

export function QuickCreateMeetingButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleClick() {
    setIsCreating(true);
    try {
      const result = await quickCreateMeeting();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.push(`/meetings/${result.meetingId}?setup=plan&created=event`);
    } catch {
      toast.error("Failed to create meeting.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button onClick={() => void handleClick()} disabled={isCreating}>
      {isCreating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          New meeting
        </>
      )}
    </Button>
  );
}
