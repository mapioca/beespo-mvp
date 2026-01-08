"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

export function SpeakerQuickActions({
  speakerId,
  initialConfirmed,
  hasRelatedMeeting,
}: {
  speakerId: string;
  initialConfirmed: boolean;
  hasRelatedMeeting: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleConfirmed = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const newConfirmedStatus = !initialConfirmed;

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .update({ is_confirmed: newConfirmedStatus })
      .eq("id", speakerId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: newConfirmedStatus
          ? "Speaker marked as confirmed!"
          : "Speaker marked as pending!",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    const confirmMessage = hasRelatedMeeting
      ? "This speaker is assigned to a meeting. Are you sure you want to delete them?"
      : "Are you sure you want to delete this speaker?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .delete()
      .eq("id", speakerId);

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
        description: "Speaker deleted!",
      });
      router.push("/speakers");
      router.refresh();
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleToggleConfirmed}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading
          ? "Updating..."
          : initialConfirmed
          ? "Mark as Pending"
          : "Mark as Confirmed"}
      </Button>
      <Button
        onClick={handleDelete}
        disabled={isLoading}
        variant="destructive"
        className="w-full"
      >
        {isLoading ? "Deleting..." : "Delete Speaker"}
      </Button>
    </div>
  );
}
