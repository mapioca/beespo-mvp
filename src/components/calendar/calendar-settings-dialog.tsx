"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddSubscriptionForm } from "./add-subscription-form";
import { SubscriptionList } from "./subscription-list";
import { CalendarSubscription } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
}: CalendarSettingsDialogProps) {
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await (supabase
      .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) return;

    const { data } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("*")
      .eq("workspace_id", profile.workspace_id)
      .order("created_at", { ascending: false });

    setSubscriptions(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchSubscriptions();
    }
  }, [open]);

  const handleSubscriptionCreated = (subscription: CalendarSubscription) => {
    setSubscriptions((prev) => [subscription, ...prev]);
  };

  const handleSubscriptionUpdated = (subscription: CalendarSubscription) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subscription.id ? subscription : s))
    );
  };

  const handleSubscriptionDeleted = (subscriptionId: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== subscriptionId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
          <DialogDescription>
            Manage external calendar subscriptions and sync settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="subscriptions" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="add">Add Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="mt-4">
            <SubscriptionList
              subscriptions={subscriptions}
              isLoading={isLoading}
              onUpdate={handleSubscriptionUpdated}
              onDelete={handleSubscriptionDeleted}
            />
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <AddSubscriptionForm onCreated={handleSubscriptionCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
