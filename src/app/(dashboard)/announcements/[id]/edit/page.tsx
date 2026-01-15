"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { TemplateSelector } from "@/components/templates/template-selector";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("draft");
  const [deadline, setDeadline] = useState("");
  const [originalStatus, setOriginalStatus] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Validation state
  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false);
  const [showStatusChangeWarning, setShowStatusChangeWarning] = useState(false);

  useEffect(() => {
    loadAnnouncementData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnnouncementData = async () => {
    const supabase = createClient();
    const announcementId = params.id as string;

    // Get announcement
    const { data: announcement, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .select("*")
      .eq("id", announcementId)
      .single();

    if (error || !announcement) {
      toast({
        title: "Error",
        description: "Failed to load announcement.",
        variant: "destructive",
      });
      router.push("/announcements");
      return;
    }

    // Check if user can edit (leader check)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("role")
      .eq("id", user?.id)
      .single();

    if (!["leader", "admin"].includes(profile?.role || "")) {
      toast({
        title: "Error",
        description: "You don't have permission to edit this announcement.",
        variant: "destructive",
      });
      router.push("/announcements");
      return;
    }

    // Load announcement data
    setTitle(announcement.title);
    setContent(announcement.content || "");
    setPriority(announcement.priority);
    setStatus(announcement.status);
    setOriginalStatus(announcement.status);
    setDeadline(announcement.deadline || "");

    // Fetch existing template link
    const { data: templateLink } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcement_templates") as any)
      .select("template_id")
      .eq("announcement_id", announcementId)
      .maybeSingle();

    if (templateLink) {
      setSelectedTemplateId(templateLink.template_id);
    }

    setIsLoadingData(false);
  };

  const handleDeadlineChange = (value: string) => {
    setDeadline(value);
    // Check if deadline is in the past
    if (value) {
      const deadlineDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setShowDeadlineWarning(deadlineDate < today);
    } else {
      setShowDeadlineWarning(false);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    // Show warning if changing from active to draft
    setShowStatusChangeWarning(
      originalStatus === "active" && value === "draft"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const announcementId = params.id as string;

    // Update announcement
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .update({
        title,
        content: content || null,
        priority,
        status,
        deadline: deadline || null,
      })
      .eq("id", announcementId);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update announcement.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update template link
    // First, delete any existing link
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcement_templates") as any)
      .delete()
      .eq("announcement_id", announcementId);

    // Then insert new link if a template is selected
    if (selectedTemplateId) {
      const { error: templateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("announcement_templates") as any)
        .insert({
          announcement_id: announcementId,
          template_id: selectedTemplateId,
        });

      if (templateError) {
        console.error("Error updating template link:", templateError);
      }
    }

    toast({
      title: "Success",
      description: "Announcement updated successfully!",
    });

    setIsLoading(false);
    router.push(`/announcements/${announcementId}`);
    router.refresh();
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-center text-muted-foreground">
          Loading announcement...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/announcements/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcement
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Announcement</CardTitle>
            <CardDescription>
              Update announcement details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Youth Conference Registration"
                maxLength={200}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Full announcement details..."
                rows={5}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Provide detailed information about the announcement
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={handleStatusChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {status === "draft" && "Not visible yet"}
                  {status === "active" &&
                    "Will appear in new meetings automatically"}
                  {status === "stopped" && "No longer active"}
                </p>
                {showStatusChangeWarning && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Changing to draft will remove this announcement from future
                      meetings.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for no auto-expiration. Announcement will auto-stop
                when deadline passes.
              </p>
              {showDeadlineWarning && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Deadline is in the past. This announcement will be
                    auto-expired on next update.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <TemplateSelector
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/announcements/${params.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !title}>
            {isLoading ? "Updating..." : "Update Announcement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
