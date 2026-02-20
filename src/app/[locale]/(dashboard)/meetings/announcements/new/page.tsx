"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const t = useTranslations("Dashboard.Meetings.Announcements");
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [displayStart, setDisplayStart] = useState("");
  const [displayUntil, setDisplayUntil] = useState("");

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
      toast.error(t("errorPermission"));
      setIsLoading(false);
      return;
    }

    // Create announcement
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .insert({
        title,
        content,
        priority,
        status: "draft",
        display_start: displayStart || null,
        display_until: displayUntil || null,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      });

    if (error) {
      toast.error(error.message || t("errorCreate"));
      setIsLoading(false);
      return;
    }

    toast.success(t("successCreate"));

    setIsLoading(false);
    router.push("/meetings/announcements");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToAnnouncements")}
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("cardTitle")}</CardTitle>
            <CardDescription>
              {t("cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("titleLabel")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">{t("contentLabel")}</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("contentPlaceholder")}
                rows={6}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t("priorityLabel")}</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}
                disabled={isLoading}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("priorityLow")}</SelectItem>
                  <SelectItem value="medium">{t("priorityMedium")}</SelectItem>
                  <SelectItem value="high">{t("priorityHigh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayStart">{t("displayStartLabel")}</Label>
                <Input
                  id="displayStart"
                  type="datetime-local"
                  value={displayStart}
                  onChange={(e) => setDisplayStart(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {t("displayStartHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayUntil">{t("displayUntilLabel")}</Label>
                <Input
                  id="displayUntil"
                  type="datetime-local"
                  value={displayUntil}
                  onChange={(e) => setDisplayUntil(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {t("displayUntilHint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/meetings/announcements")}
            disabled={isLoading}
          >
            {t("cancelButton")}
          </Button>
          <Button type="submit" disabled={isLoading || !title || !content}>
            {isLoading ? t("creatingButton") : t("createButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
