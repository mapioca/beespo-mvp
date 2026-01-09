"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("draft");
  const [deadline, setDeadline] = useState("");

  // Validation state
  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Only leaders and admins can create announcements.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create announcement
    const { data: announcement, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("announcements") as any)
      .insert({
        title,
        content: content || null,
        priority,
        status,
        deadline: deadline || null,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Announcement created successfully!",
    });

    setIsLoading(false);
    router.push(`/announcements/${announcement.id}`);
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Announcements
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Announcement</CardTitle>
            <CardDescription>
              Share time-based information with your organization
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
                  onValueChange={setStatus}
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
                    auto-expired.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/announcements")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !title}>
            {isLoading ? "Creating..." : "Create Announcement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
