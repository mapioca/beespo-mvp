"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

export function BusinessQuickActions({
  businessItemId,
  initialStatus,
}: {
  businessItemId: string;
  initialStatus: "pending" | "completed";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkComplete = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .update({ status: "completed" })
      .eq("id", businessItemId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Business item marked as complete!",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleMarkPending = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .update({ status: "pending" })
      .eq("id", businessItemId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Business item marked as pending!",
      });
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this business item?")) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .delete()
      .eq("id", businessItemId);

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
        description: "Business item deleted!",
      });
      router.push("/business");
      router.refresh();
    }
  };

  return (
    <div className="space-y-2">
      {initialStatus === "pending" ? (
        <Button
          onClick={handleMarkComplete}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Marking..." : "Mark Complete"}
        </Button>
      ) : (
        <Button
          onClick={handleMarkPending}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Marking..." : "Mark Pending"}
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
