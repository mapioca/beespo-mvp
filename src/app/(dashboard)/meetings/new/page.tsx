"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Calendar, ChevronRight, ChevronLeft, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";

interface Template {
  id: string;
  name: string;
  description: string | null;
  calling_type: string | null;
  is_shared: boolean;
  template_items?: TemplateItem[];
}

interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  item_type: string;
  order_index: number;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Template selection
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Step 2: Meeting details
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Step 3: Preview items
  const [previewItems, setPreviewItems] = useState<TemplateItem[]>([]);
  const [autoAddedBusiness, setAutoAddedBusiness] = useState<number>(0);
  const [autoAddedAnnouncements, setAutoAddedAnnouncements] = useState<number>(0);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Handle pre-selected template from query param
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setStep(2);
      }
    }
  }, [searchParams, templates]);

  const loadTemplates = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Get templates with items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("templates") as any)
      .select("*, template_items(*)")
      .or(`is_shared.eq.true,organization_id.eq.${profile.organization_id}`)
      .order("name");

    if (data) {
      setTemplates(data);
    }
  };

  const loadPreviewItems = async () => {
    if (!selectedTemplate) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Get template items
    const items = selectedTemplate.template_items || [];

    // Get pending business items count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: businessCount } = await (supabase.from("business_items") as any)
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("status", "pending");

    // Get active announcements count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: announcementsCount } = await (supabase.from("announcements") as any)
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("status", "active");

    setPreviewItems(items);
    setAutoAddedBusiness(businessCount || 0);
    setAutoAddedAnnouncements(announcementsCount || 0);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedTemplate) {
        toast({
          title: "Template required",
          description: "Please select a template to continue",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!title.trim() || !scheduledDate || !scheduledTime) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      await loadPreviewItems();
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !title.trim() || !scheduledDate || !scheduledTime) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Combine date and time
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Call the database function to create meeting from template
      const { data: meetingId, error } = await supabase.rpc(
        "create_meeting_from_template",
        {
          p_template_id: selectedTemplate.id,
          p_title: title,
          p_scheduled_date: scheduledDateTime,
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting created successfully",
      });

      router.push(`/meetings/${meetingId}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreview = (templateId: string) => {
    setExpandedTemplateId(expandedTemplateId === templateId ? null : templateId);
  };

  const totalPreviewDuration = previewItems.reduce((sum, item) =>
    sum + (item.duration_minutes || 0), 0) +
    (autoAddedBusiness * 5) +
    (autoAddedAnnouncements * 3);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Meeting</h1>
        <p className="text-muted-foreground">
          Step {step} of 3
        </p>
      </div>

      {/* Step 1: Choose Template */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose a Template</CardTitle>
              <CardDescription>
                Select a template to use as the foundation for your meeting agenda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => {
                  const itemCount = template.template_items?.length || 0;
                  const totalDuration = template.template_items?.reduce(
                    (sum, item) => sum + (item.duration_minutes || 0), 0
                  ) || 0;
                  const isExpanded = expandedTemplateId === template.id;
                  const isSelected = selectedTemplate?.id === template.id;

                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "border-primary ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.calling_type && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {template.calling_type.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                          {template.is_shared && (
                            <Badge variant="secondary" className="text-xs">
                              Shared
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                          <span>{itemCount} items</span>
                          {totalDuration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {totalDuration} min
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      {template.template_items && template.template_items.length > 0 && (
                        <CardContent>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreview(template.id);
                            }}
                            className="w-full"
                          >
                            {isExpanded ? "Hide" : "Preview"} Items
                          </Button>
                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              {template.template_items
                                .sort((a, b) => a.order_index - b.order_index)
                                .map((item, idx) => (
                                  <div key={item.id} className="text-sm flex items-start gap-2">
                                    <span className="text-muted-foreground">{idx + 1}.</span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span>{item.title}</span>
                                        <Badge variant={getItemTypeBadgeVariant(item.item_type)} className="text-xs">
                                          {getItemTypeLabel(item.item_type)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleNext} disabled={!selectedTemplate}>
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Meeting Details */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>
                Enter the details for your meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ward Council Meeting"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Scheduled Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Scheduled Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Template:</strong> {selectedTemplate.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext}>
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview & Confirm</CardTitle>
              <CardDescription>
                Review your meeting details before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {scheduledDate && scheduledTime &&
                      format(new Date(`${scheduledDate}T${scheduledTime}`), "EEEE, MMMM d, yyyy 'at' h:mm a")
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="font-medium">{selectedTemplate?.name}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Agenda Preview</h3>
                  <Badge variant="outline">
                    <Clock className="mr-1 h-3 w-3" />
                    {totalPreviewDuration} min total
                  </Badge>
                </div>

                <div className="space-y-2">
                  {previewItems.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">From Template ({previewItems.length} items)</p>
                      {previewItems
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((item, idx) => (
                          <div key={item.id} className="text-sm flex items-start gap-2 p-2 bg-muted rounded">
                            <span className="text-muted-foreground">{idx + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span>{item.title}</span>
                                <Badge variant={getItemTypeBadgeVariant(item.item_type)} className="text-xs">
                                  {getItemTypeLabel(item.item_type)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {autoAddedBusiness > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Pending Business Items ({autoAddedBusiness} items)</p>
                      <p className="text-xs text-muted-foreground">
                        Business items with pending status will be automatically added
                      </p>
                    </div>
                  )}

                  {autoAddedAnnouncements > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Active Announcements ({autoAddedAnnouncements} items)</p>
                      <p className="text-xs text-muted-foreground">
                        Active announcements will be automatically added
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Note: You can edit the agenda after creating the meeting
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Calendar className="mr-2 h-4 w-4" />
              {isLoading ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
