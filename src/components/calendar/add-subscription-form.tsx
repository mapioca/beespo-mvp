"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarSubscription } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { isValidICalUrl } from "@/lib/ical-parser";
import { AlertCircle, Calendar, Loader2 } from "lucide-react";

import { useTranslations } from "next-intl";

interface AddSubscriptionFormProps {
  onCreated: (subscription: CalendarSubscription) => void;
}

const PRESET_COLORS = [
  "#6b7280", // Gray
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

export function AddSubscriptionForm({ onCreated }: AddSubscriptionFormProps) {
  const t = useTranslations("Calendar.Subscriptions");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [urlError, setUrlError] = useState("");

  const validateUrl = (value: string) => {
    if (!value) {
      setUrlError("");
      return;
    }

    if (!isValidICalUrl(value)) {
      setUrlError(t("invalidUrl"));
    } else {
      setUrlError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !url) {
      toast.error(t("errors.required"));
      return;
    }

    if (!isValidICalUrl(url)) {
      toast.error(t("invalidUrl"));
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("errors.auth"));
      setIsLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await (supabase
      .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      toast.error(t("errors.adminOnly"));
      setIsLoading(false);
      return;
    }

    // Create subscription
    const { data: subscription, error } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: profile.workspace_id,
        name,
        url,
        color,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message || t("errorAdd"));
      setIsLoading(false);
      return;
    }

    toast.success(t("successAdd"));

    // Trigger initial sync
    try {
      const syncResponse = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (syncResponse.ok) {
        const result = await syncResponse.json();
        toast.success(t("syncComplete"), {
          description: t("syncResults", {
            created: result.totalEvents || result.eventsCreated || 0,
            updated: result.eventsUpdated || 0,
            deleted: result.eventsDeleted || 0
          })
        });
      }
    } catch (error) {
      console.error("Initial sync failed:", error);
    }

    onCreated(subscription);

    // Reset form
    setName("");
    setUrl("");
    setColor(PRESET_COLORS[0]);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Calendar className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{t("addTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("addSubtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">{t("urlLabel")}</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            validateUrl(e.target.value);
          }}
          placeholder={t("urlPlaceholder")}
          disabled={isLoading}
          required
        />
        {urlError && (
          <div className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {urlError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("urlHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t("colorLabel")}</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${color === c
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
                }`}
              style={{ backgroundColor: c }}
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !name || !url || !!urlError}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("addingButton")}
          </>
        ) : (
          t("addButton")
        )}
      </Button>
    </form>
  );
}

