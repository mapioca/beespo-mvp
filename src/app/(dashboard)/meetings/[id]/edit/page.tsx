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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { getMeetingStatusVariant, formatMeetingStatus } from "@/lib/meeting-helpers";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  item_type: "procedural" | "discussion" | "business" | "announcement" | "speaker";
  order_index: number;
  discussion_id: string | null;
  business_item_id: string | null;
  announcement_id: string | null;
  speaker_id: string | null;
}

interface Entity {
  id: string;
  title?: string;
  name?: string;
  person_name?: string;
  status?: string;
  category?: string;
  priority?: string;
  topic?: string;
}

export default function EditMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Meeting details
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState("");
  const [templateName, setTemplateName] = useState<string | null>(null);

  // Agenda items
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  // Add item dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<string>("procedural");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemDuration, setNewItemDuration] = useState<number>(5);
  const [newItemEntityId, setNewItemEntityId] = useState<string>("");

  // Entities for selection
  const [discussions, setDiscussions] = useState<Entity[]>([]);
  const [businessItems, setBusinessItems] = useState<Entity[]>([]);
  const [announcements, setAnnouncements] = useState<Entity[]>([]);
  const [speakers, setSpeakers] = useState<Entity[]>([]);

  useEffect(() => {
    loadMeeting();
    loadEntities();
  }, [params.id]);

  const loadMeeting = async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Get meeting details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting } = await (supabase.from("meetings") as any)
      .select("*, templates(name)")
      .eq("id", params.id)
      .single();

    if (meeting) {
      setTitle(meeting.title);
      const dateTime = new Date(meeting.scheduled_date);
      setScheduledDate(dateTime.toISOString().split("T")[0]);
      setScheduledTime(
        dateTime.toTimeString().split(" ")[0].substring(0, 5)
      );
      setStatus(meeting.status);
      setTemplateName(meeting.templates?.name || null);
    }

    // Get agenda items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agendaItems } = await (supabase.from("agenda_items") as any)
      .select("*")
      .eq("meeting_id", params.id)
      .order("order_index");

    if (agendaItems) {
      setItems(agendaItems);
    }

    setIsLoading(false);
  };

  const loadEntities = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Load discussions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: discussionsData } = await (supabase.from("discussions") as any)
      .select("id, title, status")
      .eq("organization_id", profile.organization_id)
      .order("title");

    if (discussionsData) setDiscussions(discussionsData);

    // Load business items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: businessData } = await (supabase.from("business_items") as any)
      .select("id, person_name, category")
      .eq("organization_id", profile.organization_id)
      .order("person_name");

    if (businessData) setBusinessItems(businessData);

    // Load announcements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: announcementsData } = await (supabase.from("announcements") as any)
      .select("id, title, priority")
      .eq("organization_id", profile.organization_id)
      .order("title");

    if (announcementsData) setAnnouncements(announcementsData);

    // Load speakers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: speakersData } = await (supabase.from("speakers") as any)
      .select("id, name, topic")
      .eq("organization_id", profile.organization_id)
      .order("name");

    if (speakersData) setSpeakers(speakersData);
  };

  const updateItem = (
    id: string,
    field: keyof AgendaItem,
    value: string | number | null
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];

    // Update order_index for both items
    newItems[index].order_index = index;
    newItems[targetIndex].order_index = targetIndex;

    setItems(newItems);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setDeletedItemIds([...deletedItemIds, id]);
  };

  const openAddDialog = () => {
    setNewItemType("procedural");
    setNewItemTitle("");
    setNewItemDescription("");
    setNewItemDuration(5);
    setNewItemEntityId("");
    setShowAddDialog(true);
  };

  const handleAddItem = () => {
    // Validation
    if (!newItemTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the agenda item",
        variant: "destructive",
      });
      return;
    }

    // Validate complex types have entity selected
    const complexTypes = ["discussion", "business", "announcement", "speaker"];
    if (complexTypes.includes(newItemType) && !newItemEntityId) {
      toast({
        title: "Entity required",
        description: `Please select a ${newItemType} for this item`,
        variant: "destructive",
      });
      return;
    }

    // Create new item
    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      title: newItemTitle,
      description: newItemDescription || null,
      duration_minutes: newItemDuration,
      item_type: newItemType as AgendaItem["item_type"],
      order_index: items.length,
      discussion_id: newItemType === "discussion" ? newItemEntityId : null,
      business_item_id: newItemType === "business" ? newItemEntityId : null,
      announcement_id: newItemType === "announcement" ? newItemEntityId : null,
      speaker_id: newItemType === "speaker" ? newItemEntityId : null,
    };

    setItems([...items, newItem]);
    setShowAddDialog(false);

    toast({
      title: "Item added",
      description: "Agenda item added successfully",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const supabase = createClient();

      // Update meeting metadata
      const scheduledDateTime = new Date(
        `${scheduledDate}T${scheduledTime}`
      ).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: meetingError } = await (supabase.from("meetings") as any)
        .update({
          title,
          scheduled_date: scheduledDateTime,
        })
        .eq("id", params.id);

      if (meetingError) throw meetingError;

      // Delete removed items
      if (deletedItemIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deleteError } = await (supabase.from("agenda_items") as any)
          .delete()
          .in("id", deletedItemIds);

        if (deleteError) throw deleteError;
      }

      // Update or insert agenda items
      for (const item of items) {
        const itemData = {
          meeting_id: params.id,
          title: item.title,
          description: item.description,
          duration_minutes: item.duration_minutes,
          item_type: item.item_type,
          order_index: item.order_index,
          discussion_id: item.discussion_id,
          business_item_id: item.business_item_id,
          announcement_id: item.announcement_id,
          speaker_id: item.speaker_id,
        };

        // Check if item is new (UUID format from crypto.randomUUID)
        const isNew = item.id.length === 36 && !item.id.includes("-") === false;

        if (isNew && !item.id.startsWith("00000000")) {
          // Insert new item
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("agenda_items") as any).insert(itemData);
        } else {
          // Update existing item
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("agenda_items") as any)
            .update(itemData)
            .eq("id", item.id);
        }
      }

      toast({
        title: "Success",
        description: "Meeting updated successfully",
      });

      router.push(`/meetings/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to update meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  const getEntityOptions = () => {
    switch (newItemType) {
      case "discussion":
        return discussions.map((d) => ({
          value: d.id,
          label: `${d.title} (${d.status})`,
        }));
      case "business":
        return businessItems.map((b) => ({
          value: b.id,
          label: `${b.person_name} - ${b.category}`,
        }));
      case "announcement":
        return announcements.map((a) => ({
          value: a.id,
          label: `${a.title} (${a.priority})`,
        }));
      case "speaker":
        return speakers.map((s) => ({
          value: s.id,
          label: s.topic ? `${s.name} - ${s.topic}` : s.name || "",
        }));
      default:
        return [];
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/meetings/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meeting
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Meeting</h1>
        <p className="text-muted-foreground">
          Update meeting details and manage agenda items
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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

            <div className="flex items-center gap-4">
              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  <Badge variant={getMeetingStatusVariant(status)}>
                    {formatMeetingStatus(status)}
                  </Badge>
                </div>
              </div>

              {templateName && (
                <div>
                  <Label>Template</Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {templateName}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agenda Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agenda Items</CardTitle>
                <CardDescription>
                  Add, remove, or reorder agenda items
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex flex-col gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Badge
                          variant={getItemTypeBadgeVariant(item.item_type)}
                          className="text-xs"
                        >
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Input
                          value={item.title}
                          onChange={(e) =>
                            updateItem(item.id, "title", e.target.value)
                          }
                          placeholder="Item title"
                        />

                        <Textarea
                          value={item.description || ""}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          placeholder="Description (optional)"
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={item.duration_minutes || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "duration_minutes",
                                parseInt(e.target.value) || null
                              )
                            }
                            placeholder="Duration (min)"
                            className="w-32"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No agenda items. Click &quot;Add Item&quot; to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/meetings/${params.id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agenda Item</DialogTitle>
            <DialogDescription>
              Create a new item for the meeting agenda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Type *</Label>
              <Select value={newItemType} onValueChange={setNewItemType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procedural">Procedural</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="business">Business Item</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="speaker">Speaker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newItemType !== "procedural" && (
              <div className="space-y-2">
                <Label>Select {getItemTypeLabel(newItemType)} *</Label>
                <Select value={newItemEntityId} onValueChange={setNewItemEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Choose ${newItemType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getEntityOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Enter item title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={newItemDuration}
                onChange={(e) =>
                  setNewItemDuration(parseInt(e.target.value) || 5)
                }
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
