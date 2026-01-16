"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CalendarSubscription } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import {
  AlertCircle,
  Calendar,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionListProps {
  subscriptions: CalendarSubscription[];
  isLoading: boolean;
  onUpdate: (subscription: CalendarSubscription) => void;
  onDelete: (subscriptionId: string) => void;
}

export function SubscriptionList({
  subscriptions,
  isLoading,
  onUpdate,
  onDelete,
}: SubscriptionListProps) {
  const { toast } = useToast();
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);

  const handleToggleEnabled = async (subscription: CalendarSubscription) => {
    const supabase = createClient();

    const { data, error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({ is_enabled: !subscription.is_enabled })
      .eq("id", subscription.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
      return;
    }

    onUpdate(data);
  };

  const handleSync = async (subscriptionId: string) => {
    setSyncingIds((prev) => new Set([...prev, subscriptionId]));

    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sync Complete",
          description: `${result.eventsCreated} created, ${result.eventsUpdated} updated, ${result.eventsDeleted} removed`,
        });

        // Refresh subscription data
        const supabase = createClient();
        const { data } = await (supabase
          .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .select("*")
          .eq("id", subscriptionId)
          .single();

        if (data) {
          onUpdate(data);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Sync Failed",
          description: error.error || "Failed to sync calendar",
          variant: "destructive",
        });
      }
    } catch (error) {
        console.error(error);
        toast({
        title: "Error",
        description: "Failed to sync calendar",
        variant: "destructive",
      });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(subscriptionId);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!subscriptionToDelete) return;

    const supabase = createClient();

    const { error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .delete()
      .eq("id", subscriptionToDelete);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Calendar subscription removed",
      });
      onDelete(subscriptionToDelete);
    }

    setDeleteDialogOpen(false);
    setSubscriptionToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No external calendars</p>
        <p className="text-sm text-muted-foreground">
          Add a calendar subscription to display external events
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {subscriptions.map((subscription) => {
          const isSyncing = syncingIds.has(subscription.id);

          return (
            <div
              key={subscription.id}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              {/* Color indicator */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: subscription.color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{subscription.name}</p>
                  {subscription.sync_error && (
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {subscription.last_synced_at
                    ? `Synced ${formatDistanceToNow(new Date(subscription.last_synced_at), { addSuffix: true })}`
                    : "Never synced"}
                </p>
                {subscription.sync_error && (
                  <p className="text-xs text-destructive truncate mt-1">
                    {subscription.sync_error}
                  </p>
                )}
              </div>

              {/* Toggle */}
              <Switch
                checked={subscription.is_enabled}
                onCheckedChange={() => handleToggleEnabled(subscription)}
                disabled={isSyncing}
              />

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isSyncing}>
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleSync(subscription.id)}
                    disabled={!subscription.is_enabled}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSubscriptionToDelete(subscription.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the calendar subscription and all cached events.
              Any announcements created from this calendar will remain but will
              no longer sync with the external source.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
