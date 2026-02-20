"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NewSpeakerPage() {
  const t = useTranslations("Dashboard.Speakers");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error(t("errorNotAuthenticated"));
      setIsLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast.error(t("errorInsufficientPermissions"));
      setIsLoading(false);
      return;
    }

    // Create speaker
    const { data: speaker, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .insert({
        name,
        topic,
        is_confirmed: isConfirmed,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message || t("errorFailedToCreate"));
      setIsLoading(false);
      return;
    }

    toast.success(t("speakerCreatedSuccess"));

    setIsLoading(false);
    router.push(`/speakers/${speaker.id}`);
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/speakers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToSpeakers")}
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("createNewSpeaker")}</CardTitle>
            <CardDescription>
              {t("createNewSpeakerDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("speakerNameLabel")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("speakerNamePlaceholder")}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">{t("topicLabel")}</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("topicPlaceholder")}
                rows={4}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t("topicHint")}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmed"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="confirmed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t("speakerIsConfirmed")}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("speakerIsConfirmedHint")}
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/speakers")}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isLoading || !name || !topic}>
            {isLoading ? t("creating") : t("createSpeaker")}
          </Button>
        </div>
      </form>
    </div>
  );
}
