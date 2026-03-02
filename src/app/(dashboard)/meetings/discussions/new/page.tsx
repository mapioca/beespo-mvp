"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, MessageSquare, X } from "lucide-react";
import Link from "next/link";

export default function NewDiscussionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<string>("member_concerns");

  // Template linking
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("templates")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching templates:", error);
      } else {
        setTemplates(data || []);
      }
      setLoadingTemplates(false);
    };

    fetchTemplates();
  }, []);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
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
      toast.error("Not authenticated. Please log in again.");
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
      toast.error("Only leaders and admins can create discussions.");
      setIsLoading(false);
      return;
    }

    // Create discussion
    const { data: newDiscussion, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("discussions") as any)
      .insert({
        title,
        description,
        priority,
        category,
        status: "new",
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !newDiscussion) {
      toast.error(error?.message || "Failed to create discussion.");
      setIsLoading(false);
      return;
    }

    // Link discussion to selected templates
    if (selectedTemplateIds.length > 0) {
      for (const templateId of selectedTemplateIds) {
        await (supabase
          .from("discussion_templates") as ReturnType<typeof supabase.from>)
          .insert({
            discussion_id: newDiscussion.id,
            template_id: templateId,
          });
      }
    }

    toast.success(
      "Discussion topic created successfully!" +
        (selectedTemplateIds.length > 0
          ? ` Linked to ${selectedTemplateIds.length} template(s).`
          : "")
    );

    setIsLoading(false);
    router.push("/meetings/discussions");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/discussions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discussions
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Discussion Topic</CardTitle>
            <CardDescription>
              Add a topic for ongoing discussion and decision tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Youth Program Planning for Summer"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the discussion topic and what needs to be decided..."
                rows={6}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}
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

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isLoading}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member_concerns">Member Concerns</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="service_opportunities">Service Opportunities</SelectItem>
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
            </div>

            {/* Template Association */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <Label className="font-medium">Applies to Templates</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Select which meeting types should include this discussion topic.
                Only templates with a discussions section will display it.
              </p>

              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates available.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTemplateIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedTemplateIds.map((id) => {
                        const template = templates.find((t) => t.id === id);
                        return template ? (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => toggleTemplate(id)}
                          >
                            {template.name}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`template-${template.id}`}
                          checked={selectedTemplateIds.includes(template.id)}
                          onCheckedChange={() => toggleTemplate(template.id)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`template-${template.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {template.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/meetings/discussions")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !title || !description}>
            {isLoading ? "Creating..." : "Create Discussion"}
          </Button>
        </div>
      </form>
    </div>
  );
}
