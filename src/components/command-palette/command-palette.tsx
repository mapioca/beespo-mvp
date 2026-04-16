"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessagesSquare,
  Handshake,
  Megaphone,
  HandHeart,
  CheckSquare,
  ClipboardList,
  Table2,
  BookOpen,
  Home,
  Calendar,
  NotebookPen,
  PanelsTopLeft,
  LayoutTemplate,
  Database,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { createCalling } from "@/lib/actions/calling-actions";
import { createTask } from "@/lib/actions/task-actions";
import { createForm } from "@/lib/actions/form-actions";
import { createTable } from "@/lib/actions/table-actions";
import { NOTEBOOK_COVERS } from "@/lib/notebooks/notebook-covers";

interface CommandEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  action:
    | "meeting"
    | "discussion"
    | "business"
    | "announcement"
    | "calling"
    | "task"
    | "form"
    | "table"
    | "notebook"
    | "navigate";
  href?: string;
  keywords?: string[];
}

interface CommandSection {
  heading: string;
  items: CommandEntry[];
}

const commandSections: CommandSection[] = [
  {
    heading: "Go to",
    items: [
      {
        id: "goto-home",
        label: "Go to Home",
        icon: Home,
        action: "navigate",
        href: "/dashboard",
        keywords: ["home", "dashboard"],
      },
      {
        id: "goto-schedule",
        label: "Go to Schedule",
        icon: Calendar,
        action: "navigate",
        href: "/schedule/calendar",
        keywords: ["schedule", "calendar"],
      },
      {
        id: "goto-meetings",
        label: "Go to Meetings",
        icon: CalendarDays,
        action: "navigate",
        href: "/meetings",
        keywords: ["meetings"],
      },
      {
        id: "goto-agendas",
        label: "Go to Agendas",
        icon: NotebookPen,
        action: "navigate",
        href: "/meetings/agendas",
        keywords: ["agendas", "meetings"],
      },
      {
        id: "goto-programs",
        label: "Go to Programs",
        icon: PanelsTopLeft,
        action: "navigate",
        href: "/meetings/programs",
        keywords: ["programs", "meetings"],
      },
      {
        id: "goto-assignments",
        label: "Go to Assignments",
        icon: ClipboardList,
        action: "navigate",
        href: "/meetings/assignments",
        keywords: ["assignments", "meetings"],
      },
      {
        id: "goto-announcements",
        label: "Go to Announcements",
        icon: Megaphone,
        action: "navigate",
        href: "/meetings/announcements",
        keywords: ["announcements", "meetings"],
      },
      {
        id: "goto-templates",
        label: "Go to Templates",
        icon: LayoutTemplate,
        action: "navigate",
        href: "/library",
        keywords: ["templates", "library"],
      },
      {
        id: "goto-callings",
        label: "Go to Callings",
        icon: HandHeart,
        action: "navigate",
        href: "/callings",
        keywords: ["callings"],
      },
      {
        id: "goto-tasks",
        label: "Go to Tasks",
        icon: CheckSquare,
        action: "navigate",
        href: "/tasks",
        keywords: ["tasks"],
      },
      {
        id: "goto-data",
        label: "Go to Data",
        icon: Database,
        action: "navigate",
        href: "/data",
        keywords: ["data"],
      },
    ],
  },
  {
    heading: "Meetings",
    items: [
      {
        id: "new-meeting",
        label: "Create a new meeting",
        icon: CalendarDays,
        action: "meeting",
        keywords: ["agenda", "schedule", "create"],
      },
      {
        id: "new-discussion",
        label: "Create a new discussion",
        icon: MessagesSquare,
        action: "discussion",
        keywords: ["topic", "conversation", "create"],
      },
      {
        id: "new-business-item",
        label: "Create a new business item",
        icon: Handshake,
        action: "business",
        keywords: ["sustaining", "release", "calling", "create"],
      },
      {
        id: "new-announcement",
        label: "Create a new announcement",
        icon: Megaphone,
        action: "announcement",
        keywords: ["notice", "message", "create"],
      },
    ],
  },
  {
    heading: "Organization",
    items: [
      {
        id: "new-calling",
        label: "Create a new calling",
        icon: HandHeart,
        action: "calling",
        keywords: ["assignment", "role", "create"],
      },
      {
        id: "new-task",
        label: "Create a new task",
        icon: CheckSquare,
        action: "task",
        keywords: ["todo", "action", "create"],
      },
    ],
  },
  {
    heading: "Data",
    items: [
      {
        id: "new-form",
        label: "Create a new form",
        icon: ClipboardList,
        action: "form",
        keywords: ["survey", "questionnaire", "create"],
      },
      {
        id: "new-table",
        label: "Create a new table",
        icon: Table2,
        action: "table",
        keywords: ["spreadsheet", "database", "create"],
      },
      {
        id: "new-notebook",
        label: "Create a new notebook",
        icon: BookOpen,
        action: "notebook",
        keywords: ["notes", "journal", "create"],
      },
    ],
  },
];

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<CommandEntry["action"] | null>(null);

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState(() => new Date().toTimeString().slice(0, 5));

  const [discussionTitle, setDiscussionTitle] = useState("");
  const [discussionDescription, setDiscussionDescription] = useState("");
  const [discussionPriority, setDiscussionPriority] = useState<"low" | "medium" | "high">("medium");
  const [discussionCategory, setDiscussionCategory] = useState("member_concerns");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<"low" | "medium" | "high">("medium");
  const [announcementStart, setAnnouncementStart] = useState("");
  const [announcementUntil, setAnnouncementUntil] = useState("");

  const [businessPerson, setBusinessPerson] = useState("");
  const [businessCalling, setBusinessCalling] = useState("");
  const [businessCategory, setBusinessCategory] = useState("sustaining");

  const [callingTitle, setCallingTitle] = useState("");
  const [callingOrg, setCallingOrg] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");

  const [notebookTitle, setNotebookTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useHotkeys("k", useCallback(toggle, [toggle]));

  const openCreateDialog = (action: CommandEntry["action"], href?: string) => {
    close();
    if (action === "navigate" && href) {
      router.push(href);
      return;
    }
    setActiveAction(action);
    setCreateOpen(true);
  };

  const resetCreateForm = useCallback(() => {
    setMeetingTitle("");
    setDiscussionTitle("");
    setDiscussionDescription("");
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementStart("");
    setAnnouncementUntil("");
    setBusinessPerson("");
    setBusinessCalling("");
    setCallingTitle("");
    setCallingOrg("");
    setTaskTitle("");
    setTaskDescription("");
    setFormTitle("");
    setFormDescription("");
    setTableName("");
    setTableDescription("");
    setNotebookTitle("");
    setIsSaving(false);
  }, []);

  const getWorkspaceContext = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated. Please log in again.");
      return null;
    }
    const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();
    if (!profile?.workspace_id) {
      toast.error("No workspace found.");
      return null;
    }
    return { supabase, user, profile };
  }, []);

  const handleCreate = async () => {
    if (!activeAction) return;
    setIsSaving(true);

    try {
      if (activeAction === "meeting") {
        if (!meetingTitle.trim()) {
          toast.error("Meeting title is required.");
          return;
        }
        const ctx = await getWorkspaceContext();
        if (!ctx) return;
        const [hours, minutes] = meetingTime.split(":").map(Number);
        const scheduledDate = new Date(meetingDate);
        scheduledDate.setHours(hours, minutes);
        const { supabase } = ctx;
        const agendaJson: Record<string, unknown>[] = [];
        const { error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>)("create_meeting_with_agenda", {
          p_template_id: null,
          p_title: meetingTitle.trim(),
          p_scheduled_date: scheduledDate.toISOString(),
          p_agenda_items: agendaJson,
        });
        if (error && error.code === "PGRST202") {
          const { error: fallbackError } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>)("create_meeting_from_template",
            {
              p_template_id: null,
              p_title: meetingTitle.trim(),
              p_scheduled_date: scheduledDate.toISOString(),
            }
          );
          if (fallbackError) {
            toast.error(fallbackError.message || "Failed to create meeting.");
            return;
          }
          toast.success("Meeting created.");
          router.refresh();
          return;
        }
        if (error) {
          toast.error(error.message || "Failed to create meeting.");
          return;
        }
        toast.success("Meeting created.");
        router.refresh();
        return;
      }

      if (activeAction === "discussion") {
        if (!discussionTitle.trim() || !discussionDescription.trim()) {
          toast.error("Title and description are required.");
          return;
        }
        const ctx = await getWorkspaceContext();
        if (!ctx) return;
        const { supabase, user, profile } = ctx;
        if (!["leader", "admin"].includes(profile.role)) {
          toast.error("Only leaders and admins can create discussions.");
          return;
        }
        const { error } = await (supabase.from("discussions") as ReturnType<typeof supabase.from>)
          .insert({
            title: discussionTitle.trim(),
            description: discussionDescription.trim(),
            priority: discussionPriority,
            category: discussionCategory,
            status: "new",
            workspace_id: profile.workspace_id,
            created_by: user.id,
          });
        if (error) {
          toast.error(error.message || "Failed to create discussion.");
          return;
        }
        toast.success("Discussion created.");
        router.refresh();
        return;
      }

      if (activeAction === "business") {
        if (!businessPerson.trim()) {
          toast.error("Person name is required.");
          return;
        }
        const ctx = await getWorkspaceContext();
        if (!ctx) return;
        const { supabase, user, profile } = ctx;
        if (!["leader", "admin"].includes(profile.role)) {
          toast.error("Only leaders and admins can create business items.");
          return;
        }
        const { error } = await (supabase.from("business_items") as ReturnType<typeof supabase.from>)
          .insert({
            person_name: businessPerson.trim(),
            position_calling: businessCalling.trim() || null,
            category: businessCategory,
            status: "pending",
            workspace_id: profile.workspace_id,
            created_by: user.id,
          });
        if (error) {
          toast.error(error.message || "Failed to create business item.");
          return;
        }
        toast.success("Business item created.");
        router.refresh();
        return;
      }

      if (activeAction === "announcement") {
        if (!announcementTitle.trim() || !announcementContent.trim()) {
          toast.error("Title and content are required.");
          return;
        }
        const ctx = await getWorkspaceContext();
        if (!ctx) return;
        const { supabase, user, profile } = ctx;
        if (!["leader", "admin"].includes(profile.role)) {
          toast.error("Only leaders and admins can create announcements.");
          return;
        }
        const { error } = await (supabase.from("announcements") as ReturnType<typeof supabase.from>)
          .insert({
            title: announcementTitle.trim(),
            content: announcementContent.trim(),
            priority: announcementPriority,
            status: "active",
            display_start: announcementStart || null,
            display_until: announcementUntil || null,
            workspace_id: profile.workspace_id,
            created_by: user.id,
          });
        if (error) {
          toast.error(error.message || "Failed to create announcement.");
          return;
        }
        toast.success("Announcement created.");
        router.refresh();
        return;
      }

      if (activeAction === "calling") {
        if (!callingTitle.trim()) {
          toast.error("Calling title is required.");
          return;
        }
        const result = await createCalling({
          title: callingTitle.trim(),
          organization: callingOrg.trim() || undefined,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Calling created.");
        router.refresh();
        return;
      }

      if (activeAction === "task") {
        if (!taskTitle.trim()) {
          toast.error("Task title is required.");
          return;
        }
        const result = await createTask({
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          priority: taskPriority,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Task created.");
        router.refresh();
        return;
      }

      if (activeAction === "form") {
        if (!formTitle.trim()) {
          toast.error("Form title is required.");
          return;
        }
        const schema = {
          id: crypto.randomUUID(),
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          fields: [],
        };
        const result = await createForm({
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          schema,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Form created.");
        router.refresh();
        return;
      }

      if (activeAction === "table") {
        if (!tableName.trim()) {
          toast.error("Table name is required.");
          return;
        }
        const result = await createTable({
          name: tableName.trim(),
          description: tableDescription.trim() || undefined,
          columns: [],
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Table created.");
        router.refresh();
        return;
      }

      if (activeAction === "notebook") {
        if (!notebookTitle.trim()) {
          toast.error("Notebook title is required.");
          return;
        }
        const ctx = await getWorkspaceContext();
        if (!ctx) return;
        const { supabase, user, profile } = ctx;
        const coverStyle = NOTEBOOK_COVERS[0]?.id ?? "classic";
        const { error } = await (supabase.from("notebooks") as ReturnType<typeof supabase.from>)
          .insert({
            title: notebookTitle.trim(),
            cover_style: coverStyle,
            workspace_id: profile.workspace_id,
            created_by: user.id,
          });
        if (error) {
          toast.error(error.message || "Failed to create notebook.");
          return;
        }
        toast.success("Notebook created.");
        router.refresh();
        return;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const dialogTitle = useMemo(() => {
    switch (activeAction) {
      case "meeting":
        return "Create a new meeting";
      case "discussion":
        return "Create a new discussion";
      case "business":
        return "Create a new business item";
      case "announcement":
        return "Create a new announcement";
      case "calling":
        return "Create a new calling";
      case "task":
        return "Create a new task";
      case "form":
        return "Create a new form";
      case "table":
        return "Create a new table";
      case "notebook":
        return "Create a new notebook";
      default:
        return "Create";
    }
  }, [activeAction]);

  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {commandSections.map((section, index) => (
            <div key={section.heading}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={section.heading}>
                {section.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    keywords={item.keywords}
                    onSelect={() => openCreateDialog(item.action, item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                    {item.action === "navigate" && <ArrowRight className="ml-auto h-3 w-3 opacity-50" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setActiveAction(null);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Create a new item without leaving your current page.
            </DialogDescription>
          </DialogHeader>

          {activeAction === "meeting" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Meeting title</Label>
                <Input
                  id="meeting-title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input
                    id="meeting-time"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeAction === "discussion" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="discussion-title">Title</Label>
                <Input
                  id="discussion-title"
                  value={discussionTitle}
                  onChange={(e) => setDiscussionTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discussion-desc">Description</Label>
                <Textarea
                  id="discussion-desc"
                  value={discussionDescription}
                  onChange={(e) => setDiscussionDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={discussionPriority}
                    onValueChange={(v) =>
                      setDiscussionPriority(v as "low" | "medium" | "high")
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Category</Label>
                  <Select value={discussionCategory} onValueChange={setDiscussionCategory}>
                    <SelectTrigger>
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
            </div>
          )}

          {activeAction === "business" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="business-person">Person name</Label>
                <Input
                  id="business-person"
                  value={businessPerson}
                  onChange={(e) => setBusinessPerson(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-calling">Calling (optional)</Label>
                <Input
                  id="business-calling"
                  value={businessCalling}
                  onChange={(e) => setBusinessCalling(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={businessCategory} onValueChange={setBusinessCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sustaining">Sustaining</SelectItem>
                    <SelectItem value="release">Release</SelectItem>
                    <SelectItem value="confirmation">Confirmation</SelectItem>
                    <SelectItem value="ordination">Ordination</SelectItem>
                    <SelectItem value="setting_apart">Setting Apart</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeAction === "announcement" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-content">Content</Label>
                <Textarea
                  id="announcement-content"
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={announcementPriority}
                    onValueChange={(v) =>
                      setAnnouncementPriority(v as "low" | "medium" | "high")
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Display start</Label>
                  <Input
                    type="date"
                    value={announcementStart}
                    onChange={(e) => setAnnouncementStart(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display until</Label>
                <Input
                  type="date"
                  value={announcementUntil}
                  onChange={(e) => setAnnouncementUntil(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeAction === "calling" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="calling-title">Calling title</Label>
                <Input
                  id="calling-title"
                  value={callingTitle}
                  onChange={(e) => setCallingTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calling-org">Organization (optional)</Label>
                <Input
                  id="calling-org"
                  value={callingOrg}
                  onChange={(e) => setCallingOrg(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeAction === "task" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task title</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(v) => setTaskPriority(v as "low" | "medium" | "high")}
                >
                  <SelectTrigger>
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
          )}

          {activeAction === "form" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="form-title">Form title</Label>
                <Input
                  id="form-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">Description</Label>
                <Textarea
                  id="form-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeAction === "table" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="table-name">Table name</Label>
                <Input
                  id="table-name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-desc">Description</Label>
                <Textarea
                  id="table-desc"
                  value={tableDescription}
                  onChange={(e) => setTableDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeAction === "notebook" && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="notebook-title">Notebook title</Label>
                <Input
                  id="notebook-title"
                  value={notebookTitle}
                  onChange={(e) => setNotebookTitle(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A default cover will be applied. You can change it later.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setActiveAction(null);
                resetCreateForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await handleCreate();
                setCreateOpen(false);
                setActiveAction(null);
                resetCreateForm();
              }}
              disabled={isSaving}
            >
              {isSaving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
