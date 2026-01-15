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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateSelector } from "@/components/templates/template-selector";

export default function EditDiscussionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("new");
  const [dueDate, setDueDate] = useState("");
  const [deferredReason, setDeferredReason] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadDiscussionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDiscussionData = async () => {
    const supabase = createClient();
    const discussionId = params.id as string;

    // Get discussion
    const { data: discussion, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussions") as any)
      .select("*")
      .eq("id", discussionId)
      .single();

    if (error || !discussion) {
      toast({
        title: "Error",
        description: "Failed to load discussion.",
        variant: "destructive",
      });
      router.push("/discussions");
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
        description: "You don't have permission to edit this discussion.",
        variant: "destructive",
      });
      router.push("/discussions");
      return;
    }

    // Load discussion data
    setTitle(discussion.title);
    setDescription(discussion.description || "");
    setCategory(discussion.category);
    setPriority(discussion.priority);
    setStatus(discussion.status);
    setDueDate(discussion.due_date || "");
    setDeferredReason(discussion.deferred_reason || "");

    // Fetch existing template link
    const { data: templateLink } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussion_templates") as any)
      .select("template_id")
      .eq("discussion_id", discussionId)
      .maybeSingle();

    if (templateLink) {
      setSelectedTemplateId(templateLink.template_id);
    }

    setIsLoadingData(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const discussionId = params.id as string;

    // Update discussion
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussions") as any)
      .update({
        title,
        description: description || null,
        category,
        priority,
        status,
        due_date: dueDate || null,
        deferred_reason:
          status === "deferred" && deferredReason ? deferredReason : null,
      })
      .eq("id", discussionId);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update discussion.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update template link
    // First, delete any existing link
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussion_templates") as any)
      .delete()
      .eq("discussion_id", discussionId);

    // Then insert new link if a template is selected
    if (selectedTemplateId) {
      const { error: templateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("discussion_templates") as any)
        .insert({
          discussion_id: discussionId,
          template_id: selectedTemplateId,
        });

      if (templateError) {
        console.error("Error updating template link:", templateError);
      }
    }

    toast({
      title: "Success",
      description: "Discussion updated successfully!",
    });

    setIsLoading(false);
    router.push(`/discussions/${discussionId}`);
    router.refresh();
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-center text-muted-foreground">
          Loading discussion...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/discussions/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discussion
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Discussion</CardTitle>
            <CardDescription>Update discussion details and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Budget allocation for youth activities"
                required
                disabled={isLoading}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context and details about this discussion topic"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member_concerns">
                      Member Concerns
                    </SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="service_opportunities">
                      Service Opportunities
                    </SelectItem>
                    <SelectItem value="callings">Callings</SelectItem>
                    <SelectItem value="temple_work">Temple Work</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="facilities">Facilities</SelectItem>
                    <SelectItem value="youth">Youth</SelectItem>
                    <SelectItem value="mission_work">Mission Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={isLoading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={isLoading}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="decision_required">
                      Decision Required
                    </SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {status === "deferred" && (
              <div className="space-y-2">
                <Label htmlFor="deferredReason">Deferred Reason</Label>
                <Textarea
                  id="deferredReason"
                  value={deferredReason}
                  onChange={(e) => setDeferredReason(e.target.value)}
                  placeholder="Explain why this discussion is deferred"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            )}

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
            onClick={() => router.push(`/discussions/${params.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !category}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
