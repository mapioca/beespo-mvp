"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { PropertiesPane } from "./properties-pane";
import { ToolboxPane } from "./toolbox-pane";
import { AgendaCanvas } from "./agenda-canvas";
import { ToolboxItemDragOverlay } from "./draggable-toolbox-item";
import { CanvasItem, ToolboxItem, Template, CategoryType, BuilderMode } from "./types";
import { ContainerType, ContainerChildItem } from "../container-agenda-item";
import {
    UnifiedSelectorModal,
    UnifiedSelectorMode,
    SpeakerSelection,
} from "../unified-selector-modal";
import { ValidationModal, ValidationItem, ValidationState } from "../validation-modal";
import { PrintPreviewPane } from "./print-preview-pane";
import { ProgramModePane } from "./program-mode-pane";
import { ZoomMeetingSheet } from "@/components/meetings/zoom-meeting-sheet";
import { ZoomIcon } from "@/components/ui/zoom-icon";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { saveMeetingMarkdown } from "@/lib/actions/meeting-actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { List, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuilderTopBar } from "./builder-top-bar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const meetingFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    date: z.date({ message: "Date is required" }),
    time: z.string().min(1, "Time is required"),
    templateId: z.string().nullable(),
    conducting: z.string().optional(),
    presiding: z.string().optional(),
    chorister: z.string().optional(),
    pianistOrganist: z.string().optional(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

interface MeetingBuilderProps {
    initialTemplateId?: string | null;
    initialMeetingId?: string;
}

export function MeetingBuilder({ initialTemplateId, initialMeetingId }: MeetingBuilderProps) {
    const router = useRouter();

    // Form state
    const form = useForm<MeetingFormValues>({
        resolver: zodResolver(meetingFormSchema),
        defaultValues: {
            title: "Untitled Meeting Agenda",
            date: new Date(),
            time: "07:00",
            templateId: initialTemplateId || null,
            conducting: "",
            presiding: "",
            chorister: "",
            pianistOrganist: "",
        },
    });

    const title = form.watch("title");
    const date = form.watch("date");
    const time = form.watch("time");
    const selectedTemplateId = form.watch("templateId");

    const setTitle = useCallback((t: string) => form.setValue("title", t, { shouldValidate: true }), [form]);

    const [templates, setTemplates] = useState<Template[]>([]);

    // Canvas state
    const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

    // DnD state
    const [activeItem, setActiveItem] = useState<ToolboxItem | CanvasItem | null>(null);
    const [activeType, setActiveType] = useState<"toolbox" | "canvas" | null>(null);
    const [isOverCanvas, setIsOverCanvas] = useState(false);

    // Selection & modal state
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
    const [unifiedModalMode, setUnifiedModalMode] = useState<UnifiedSelectorMode>("participant");
    const [targetContainerId, setTargetContainerId] = useState<string | null>(null);

    // Validation state
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [validationState, setValidationState] = useState<ValidationState>("validating");
    const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Builder mode state — default to print-preview when editing existing, planning when creating new
    const [builderMode, setBuilderMode] = useState<BuilderMode>(initialMeetingId ? "print-preview" : "planning");
    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
    const [isLeader, setIsLeader] = useState(true); // assume leader until proven otherwise
    const [isLive, setIsLive] = useState(false);
    const [isTogglingLive, setIsTogglingLive] = useState(false);

    // Save as Template state
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateDialogStep, setTemplateDialogStep] = useState<"closed" | "choose" | "create">("closed");
    const [templateName, setTemplateName] = useState("");

    const openSaveTemplateDialog = useCallback(() => {
        const selectedTemplateId = form.getValues("templateId") || "none";
        const selectedTemplate = templates.find((t) => t.id === selectedTemplateId && selectedTemplateId !== "none");
        const title = form.getValues("title") || "";

        if (selectedTemplate) {
            const isSharedTemplate = selectedTemplate.workspace_id === null || selectedTemplate.workspace_id === undefined;
            if (isSharedTemplate) {
                setTemplateName(title);
                setTemplateDialogStep("create");
            } else {
                setTemplateDialogStep("choose");
            }
        } else {
            setTemplateName(title);
            setTemplateDialogStep("create");
        }
    }, [templates, form]);

    const closeSaveTemplateDialog = useCallback(() => setTemplateDialogStep("closed"), []);

    // Meeting-level notes state
    const [meetingNotes, setMeetingNotes] = useState<string | null>(null);

    // Zoom — track if this meeting has a linked Zoom meeting so we can sync on save
    const [linkedZoomMeetingId, setLinkedZoomMeetingId] = useState<string | null>(null);
    const [zoomJoinUrl, setZoomJoinUrl] = useState<string | null>(null);
    const [zoomStartUrl, setZoomStartUrl] = useState<string | null>(null);
    const [zoomPasscode, setZoomPasscode] = useState<string | null>(null);
    const [isZoomConnected, setIsZoomConnected] = useState(false);
    const [zoomSheetOpen, setZoomSheetOpen] = useState(false);
    const [zoomCreateOpen, setZoomCreateOpen] = useState(false);
    const [zoomCreateDuration, setZoomCreateDuration] = useState(0);
    const [isCreatingZoom, setIsCreatingZoom] = useState(false);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Load templates & workspace name
    useEffect(() => {
        const fetchInitialData = async () => {
            const supabase = createClient();

            // Fetch user + profile first to get workspace_id for filtering
            const { data: { user } } = await supabase.auth.getUser();
            let workspaceId: string | null = null;
            if (user) {
                const { data: profile } = await (supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from("profiles") as any)
                    .select("workspace_id, role, workspaces(name, slug)")
                    .eq("id", user.id)
                    .single();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                workspaceId = (profile as any)?.workspace_id ?? null;
                if (profile?.workspaces?.name) {
                    setWorkspaceName(profile.workspaces.name);
                }
                if (profile?.workspaces?.slug) {
                    setWorkspaceSlug(profile.workspaces.slug);
                }
                const role = profile?.role;
                setIsLeader(role === "leader" || role === "admin");

                // Check if user has Zoom connected
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: zoomApp } = await (supabase.from("apps") as any)
                    .select("id")
                    .eq("slug", "zoom")
                    .single();
                if (zoomApp?.id) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { count } = await (supabase.from("app_tokens") as any)
                        .select("*", { count: "exact", head: true })
                        .eq("user_id", user.id)
                        .eq("app_id", zoomApp.id);
                    setIsZoomConnected((count ?? 0) > 0);
                }
            }

            // Only load Beespo official + user's own workspace templates
            const filter = workspaceId
                ? `workspace_id.is.null,workspace_id.eq.${workspaceId}`
                : "workspace_id.is.null";

            const { data } = await supabase
                .from("templates")
                .select("*")
                .or(filter)
                .order("name");

            if (data) setTemplates(data as Template[]);
        };
        fetchInitialData();
    }, []);

    // Load existing meeting if editing
    useEffect(() => {
        if (!initialMeetingId) return;

        const loadExistingMeeting = async () => {
            const supabase = createClient();

            // Load meeting details
            const { data: meetingData, error: meetingError } = await supabase
                .from("meetings")
                .select("*")
                .eq("id", initialMeetingId)
                .single();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meeting = meetingData as any;

            if (meetingError || !meeting) {
                toast.error("Failed to load meeting details");
                return;
            }

            form.setValue("title", meeting.title);
            if (meeting.scheduled_date) {
                const scheduledDate = new Date(meeting.scheduled_date);
                form.setValue("date", scheduledDate);
                form.setValue("time", format(scheduledDate, "HH:mm"));
            }
            if (meeting.zoom_meeting_id) {
                setLinkedZoomMeetingId(meeting.zoom_meeting_id);
            }
            if (meeting.zoom_join_url) {
                setZoomJoinUrl(meeting.zoom_join_url);
            }
            if (meeting.zoom_start_url) {
                setZoomStartUrl(meeting.zoom_start_url);
            }
            if (meeting.zoom_passcode) {
                setZoomPasscode(meeting.zoom_passcode);
            }
            if (meeting.notes && typeof meeting.notes === "string") {
                setMeetingNotes(meeting.notes);
            }
            setIsLive(!!meeting.is_publicly_shared);

            // Load agenda items with joined speaker and hymn data
            const { data: agendaItems, error: itemsError } = await supabase
                .from("agenda_items")
                .select("*, speakers:meeting_assignments!speaker_id(topic, is_confirmed, directory(name)), hymns(title, hymn_number)")
                .eq("meeting_id", initialMeetingId)
                .order("order_index");

            if (itemsError || !agendaItems) {
                toast.error("Failed to load agenda items");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items: CanvasItem[] = (agendaItems as any[]).map((item: any) => {
                const isContainer = ["discussion", "business", "announcement"].includes(item.item_type);
                const isSpeakerItem = item.item_type === "speaker";

                // Parse child_items from JSONB if it's a container
                let childItems: ContainerChildItem[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (isContainer && item.child_items && Array.isArray(item.child_items)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    childItems = item.child_items.map((child: any) => ({
                        id: `child-${Math.random().toString(36).substr(2, 9)}`,
                        title: child.title || "",
                        description: child.description || "",
                        item_notes: child.item_notes || null,
                        discussion_id: child.discussion_id,
                        business_item_id: child.business_item_id,
                        announcement_id: child.announcement_id,
                        person_name: child.person_name,
                        position_calling: child.position_calling,
                        business_category: child.business_category,
                        business_details: child.business_details,
                    }));
                }

                return {
                    id: item.id, // preserve existing ID
                    category: item.item_type,
                    title: item.title,
                    description: item.description,
                    item_notes: item.item_notes,
                    duration_minutes: item.duration_minutes,
                    order_index: item.order_index,
                    procedural_item_type_id: item.procedural_item_type_id,
                    is_hymn: !!item.hymn_id || (item.title && item.title.toLowerCase().includes("hymn")),
                    // Speaker items must NOT get requires_participant=true — they have their own dedicated
                    // render path (category === "speaker"). Including speaker_id would cause them to be
                    // rendered as participant items showing "TBD" even when a speaker is assigned.
                    requires_participant: !isSpeakerItem && (
                        !!item.participant_id ||
                        ["prayer", "benediction", "invocation"].some(k => (item.title || "").toLowerCase().includes(k))
                    ),
                    hymn_id: item.hymn_id,
                    hymn_number: item.hymns?.hymn_number,
                    hymn_title: item.hymns?.title,
                    speaker_id: item.speaker_id,
                    speaker_name: item.speakers?.directory?.name || item.participant_name,
                    speaker_topic: item.speaker_topic || item.speakers?.topic,
                    speaker_is_confirmed: item.speakers?.is_confirmed,
                    participant_id: item.participant_id,
                    participant_name: item.participant_name,
                    discussion_id: item.discussion_id,
                    business_item_id: item.business_item_id,
                    announcement_id: item.announcement_id,
                    structural_type: item.structural_type,
                    isContainer: isContainer,
                    containerType: isContainer ? item.item_type as ContainerType : undefined,
                    childItems: isContainer ? childItems : undefined,
                };
            });

            // Expand all containers by default
            const containerIds = items.filter((i) => i.isContainer).map((i) => i.id);
            setExpandedContainers(new Set(containerIds));
            setCanvasItems(items);
        };

        loadExistingMeeting();
    }, [initialMeetingId, form]);

    const getLiveUrl = useCallback(() => {
        if (!initialMeetingId || !workspaceSlug) return null;
        return `${window.location.origin}/${workspaceSlug}/program/${initialMeetingId}`;
    }, [initialMeetingId, workspaceSlug]);

    const handleCopyLiveLink = useCallback(async () => {
        const liveUrl = getLiveUrl();
        if (!liveUrl) {
            toast.error("Live link unavailable", { description: "Missing workspace slug or meeting ID." });
            return;
        }
        await navigator.clipboard.writeText(liveUrl);
        toast.success("Live link copied");
    }, [getLiveUrl]);

    const handleGoLive = useCallback(async () => {
        if (!initialMeetingId) {
            toast.error("Save the agenda before going live.");
            return;
        }
        if (!workspaceSlug) {
            toast.error("Workspace not found", { description: "Reload and try again." });
            return;
        }

        setIsTogglingLive(true);
        const supabase = createClient();
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("meetings") as any)
                .update({ is_publicly_shared: true })
                .eq("id", initialMeetingId);

            if (error) {
                toast.error("Failed to go live", { description: error.message });
                return;
            }

            setIsLive(true);
            const liveUrl = getLiveUrl();
            if (liveUrl) {
                await navigator.clipboard.writeText(liveUrl);
                toast.success("Live link copied", { description: "Share it with your audience." });
            } else {
                toast.success("Live is on");
            }
        } finally {
            setIsTogglingLive(false);
        }
    }, [initialMeetingId, workspaceSlug, getLiveUrl]);

    // Update title when template or date changes — use meeting date, not today
    const DEFAULT_TITLE = "Untitled Meeting Agenda";
    useEffect(() => {
        if (selectedTemplateId && selectedTemplateId !== "none") {
            const t = templates.find((tmpl) => tmpl.id === selectedTemplateId);
            if (t) {
                // Only auto-update if the user hasn't set a custom title
                const isDefault = !title || title === DEFAULT_TITLE;
                if (isDefault) {
                    const meetingDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
                    setTitle(`${t.name} ${format(meetingDate, "MMM d, yyyy")}`);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemplateId, templates, date]);

    // Escape key deselects the current item
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && selectedItemId && !unifiedModalOpen) {
                setSelectedItemId(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedItemId, unifiedModalOpen]);

    // Load template items when template changes
    const loadTemplateItems = useCallback(async (templateId: string) => {
        if (!templateId || templateId === "none") {
            setCanvasItems([]);
            return;
        }

        const supabase = createClient();

        // Container name → container type mapping (mirrors toolbox-pane)
        const CONTAINER_NAME_MAP: Record<string, "discussion" | "business" | "announcement"> = {
            "Discussions": "discussion",
            "Ward Business": "business",
            "Announcements": "announcement",
        };

        try {
            // Load template items with joined procedural type info
            const { data: templateItems, error } = await (supabase
                .from("template_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("*, procedural_item_types(id, name, is_hymn, requires_assignee, category)")
                .eq("template_id", templateId)
                .order("order_index");

            if (error || !templateItems) {
                console.error("Error loading template items:", error);
                return;
            }

            // Load linked items
            const { data: linkedDiscussions } = await (supabase
                .from("discussion_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("discussion_id, discussions(id, title, description, status)")
                .eq("template_id", templateId);

            const { data: linkedBusiness } = await (supabase
                .from("business_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("business_item_id, business_items(id, person_name, position_calling, category, notes, status, details)")
                .eq("template_id", templateId);

            const { data: linkedAnnouncements } = await (supabase
                .from("announcement_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("announcement_id, announcements(id, title, content, status, priority)")
                .eq("template_id", templateId);

            // Build canvas items
            const items: CanvasItem[] = [];
            let orderIndex = 0;

            for (const item of templateItems) {
                const procType = item.procedural_item_types;
                const itemName = procType?.name || item.title || "";
                const itemNameLower = itemName.toLowerCase();

                const isHymn = procType?.is_hymn || itemNameLower.includes("hymn");
                const requiresParticipant =
                    procType?.requires_assignee ||
                    itemNameLower.includes("prayer") ||
                    itemNameLower.includes("preside") ||
                    itemNameLower.includes("conduct") ||
                    itemNameLower.includes("invocation") ||
                    itemNameLower.includes("benediction") ||
                    itemNameLower.includes("spiritual thought") ||
                    itemNameLower.includes("testimony");

                // Resolve the correct container type:
                // 1) Trust item_type if it's already a container type
                // 2) Fall back to container name map using the procedural type name (fixes legacy data)
                const containerTypesSet = new Set(["discussion", "business", "announcement"]);
                const containerFromItemType = containerTypesSet.has(item.item_type)
                    ? item.item_type as "discussion" | "business" | "announcement"
                    : undefined;
                const containerFromName = CONTAINER_NAME_MAP[itemName];
                const resolvedContainerType = containerFromItemType ?? containerFromName;

                // Resolve the correct category:
                // 1) Container types use the container type itself as category
                // 2) Speaker items use "speaker" from item_type or procedural name
                // 3) Structural items use "structural" from item_type or structural_type
                // 4) Everything else falls back to item_type ("procedural")
                const isItemSpeaker =
                    item.item_type === "speaker" ||
                    (procType?.category === "speaker") ||
                    itemName === "Speaker" ||
                    itemName === "Youth Speaker" ||
                    itemName === "High Council Speaker" ||
                    itemName === "Returning Missionary";

                const resolvedCategory: CategoryType = resolvedContainerType
                    ?? (isItemSpeaker ? "speaker"
                        : (item.item_type === "structural" || item.structural_type ? "structural"
                            : "procedural"));

                const baseItem: CanvasItem = {
                    id: `canvas-${Date.now()}-${orderIndex}`,
                    category: resolvedCategory,
                    title: item.title,
                    description: item.description,
                    duration_minutes: item.duration_minutes || 5,
                    order_index: orderIndex++,
                    procedural_item_type_id: item.procedural_item_type_id,
                    is_hymn: isHymn,
                    requires_participant: !isItemSpeaker && requiresParticipant,
                    structural_type: item.structural_type ?? undefined,
                };

                if (resolvedContainerType === "discussion") {
                    const childItems: ContainerChildItem[] = [];
                    if (linkedDiscussions?.length) {
                        for (const link of linkedDiscussions) {
                            const disc = link.discussions;
                            if (disc && ["new", "active", "decision_required"].includes(disc.status)) {
                                childItems.push({
                                    id: `child-disc-${disc.id}`,
                                    title: disc.title,
                                    description: disc.description,
                                    discussion_id: disc.id,
                                    status: disc.status,
                                });
                            }
                        }
                    }
                    items.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "discussion",
                        childItems,
                    });
                } else if (resolvedContainerType === "business") {
                    const childItems: ContainerChildItem[] = [];
                    if (linkedBusiness?.length) {
                        for (const link of linkedBusiness) {
                            const biz = link.business_items;
                            if (biz && biz.status === "pending") {
                                childItems.push({
                                    id: `child-biz-${biz.id}`,
                                    title: `${biz.person_name}${biz.position_calling ? ` - ${biz.position_calling}` : ""}`,
                                    description: biz.notes,
                                    business_item_id: biz.id,
                                    business_type: biz.category,
                                    person_name: biz.person_name,
                                    position_calling: biz.position_calling,
                                    business_category: biz.category,
                                    business_details: biz.details,
                                });
                            }
                        }
                    }
                    items.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "business",
                        childItems,
                    });
                } else if (resolvedContainerType === "announcement") {
                    const childItems: ContainerChildItem[] = [];
                    if (linkedAnnouncements?.length) {
                        for (const link of linkedAnnouncements) {
                            const ann = link.announcements;
                            if (ann && ann.status === "active") {
                                childItems.push({
                                    id: `child-ann-${ann.id}`,
                                    title: ann.title,
                                    description: ann.content,
                                    announcement_id: ann.id,
                                    priority: ann.priority,
                                });
                            }
                        }
                    }
                    items.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "announcement",
                        childItems,
                    });
                } else {
                    items.push(baseItem);
                }
            }

            // Expand all containers by default
            const containerIds = items.filter((i) => i.isContainer).map((i) => i.id);
            setExpandedContainers(new Set(containerIds));
            setCanvasItems(items);
        } catch (error) {
            console.error("Error loading template:", error);
        }
    }, []);

    // Handle template change watcher
    useEffect(() => {
        if (selectedTemplateId === initialTemplateId) return; // Handled by initial load
        if (selectedTemplateId && selectedTemplateId !== "none") {
            loadTemplateItems(selectedTemplateId);
        } else if (selectedTemplateId === "none" || selectedTemplateId === null) {
            setCanvasItems([]);
        }
    }, [selectedTemplateId, loadTemplateItems, initialTemplateId]);

    // Load initial template if provided
    useEffect(() => {
        if (initialTemplateId) {
            loadTemplateItems(initialTemplateId);
        }
    }, [initialTemplateId, loadTemplateItems]);

    // DnD handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current;

        if (data?.type === "toolbox_item") {
            setActiveItem(data.item as ToolboxItem);
            setActiveType("toolbox");
        } else {
            // Canvas item being sorted
            const item = canvasItems.find((i) => i.id === active.id);
            if (item) {
                setActiveItem(item);
                setActiveType("canvas");
            }
        }
    }, [canvasItems]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        setIsOverCanvas(over?.id === "canvas-drop-zone" || canvasItems.some((i) => i.id === over?.id));
    }, [canvasItems]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        setActiveItem(null);
        setActiveType(null);
        setIsOverCanvas(false);

        if (!over) return;

        const data = active.data.current;

        // Dragging from toolbox to canvas
        if (data?.type === "toolbox_item") {
            const toolboxItem = data.item as ToolboxItem;

            // Determine insert index
            let insertIndex = canvasItems.length;
            if (over.id !== "canvas-drop-zone") {
                const overIndex = canvasItems.findIndex((i) => i.id === over.id);
                if (overIndex !== -1) {
                    insertIndex = overIndex;
                }
            }

            // Create new canvas item
            const newItem: CanvasItem = {
                id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                category: toolboxItem.category,
                title: toolboxItem.title,
                description: toolboxItem.description,
                duration_minutes: toolboxItem.duration_minutes,
                order_index: insertIndex,
                procedural_item_type_id: toolboxItem.procedural_item_type_id,
                is_hymn: toolboxItem.is_hymn,
                requires_participant: toolboxItem.requires_participant,
                isContainer: toolboxItem.type === "container",
                containerType: toolboxItem.containerType,
                childItems: toolboxItem.type === "container" ? [] : undefined,
                // Pass through config-driven fields for proper icon/behavior rendering
                config: toolboxItem.config,
                is_core: toolboxItem.is_core,
                is_custom: toolboxItem.is_custom,
                icon: toolboxItem.icon,
                structural_type: toolboxItem.structural_type,
            };

            // Insert and reindex
            const newItems = [...canvasItems];
            newItems.splice(insertIndex, 0, newItem);
            const reindexed = newItems.map((item, idx) => ({ ...item, order_index: idx }));
            setCanvasItems(reindexed);

            // Expand container if added
            if (newItem.isContainer) {
                setExpandedContainers((prev) => new Set([...prev, newItem.id]));
            }

            return;
        }

        // Sorting within canvas
        if (active.id !== over.id && canvasItems.some((i) => i.id === active.id)) {
            const oldIndex = canvasItems.findIndex((i) => i.id === active.id);
            const newIndex = canvasItems.findIndex((i) => i.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(canvasItems, oldIndex, newIndex).map((item, idx) => ({
                    ...item,
                    order_index: idx,
                }));
                setCanvasItems(reordered);
            }
        }
    }, [canvasItems]);

    // Canvas item handlers
    const handleAddCanvasItem = useCallback((toolboxItem: ToolboxItem) => {
        setCanvasItems((prev) => {
            const newItem: CanvasItem = {
                id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                category: toolboxItem.category,
                title: toolboxItem.title,
                description: toolboxItem.description,
                duration_minutes: toolboxItem.duration_minutes,
                order_index: prev.length,
                procedural_item_type_id: toolboxItem.procedural_item_type_id,
                is_hymn: toolboxItem.is_hymn,
                requires_participant: toolboxItem.requires_participant,
                isContainer: toolboxItem.type === "container",
                containerType: toolboxItem.containerType,
                childItems: toolboxItem.type === "container" ? [] : undefined,
                config: toolboxItem.config,
                is_core: toolboxItem.is_core,
                is_custom: toolboxItem.is_custom,
                icon: toolboxItem.icon,
                structural_type: toolboxItem.structural_type,
            };

            if (newItem.isContainer) {
                setExpandedContainers((prevExpanded) => new Set([...prevExpanded, newItem.id]));
            }

            const newItems = [...prev, newItem];
            return newItems.map((item, idx) => ({ ...item, order_index: idx }));
        });
    }, []);

    const handleRemoveItem = useCallback((id: string) => {
        setCanvasItems((prev) => {
            const filtered = prev.filter((i) => i.id !== id);
            return filtered.map((item, idx) => ({ ...item, order_index: idx }));
        });
        if (selectedItemId === id) {
            setSelectedItemId(null);
        }
    }, [selectedItemId]);

    const toggleContainer = useCallback((id: string) => {
        setExpandedContainers((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Panel-oriented modal openers (use already-set selectedItemId)


    // Panel-oriented: add to the currently selected container
    const openContainerAddForSelected = useCallback(() => {
        if (!selectedItemId) return;
        const item = canvasItems.find(i => i.id === selectedItemId);
        if (!item?.isContainer || !item.containerType) return;
        setTargetContainerId(selectedItemId);
        setUnifiedModalMode(item.containerType as UnifiedSelectorMode);
        setUnifiedModalOpen(true);
    }, [selectedItemId, canvasItems]);

    // Panel-oriented: remove child from the currently selected container
    const handleRemoveChildFromSelected = useCallback((childId: string) => {
        if (!selectedItemId) return;
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === selectedItemId
                    ? { ...item, childItems: (item.childItems || []).filter((c) => c.id !== childId) }
                    : item
            )
        );
    }, [selectedItemId]);



    const handleSelectParticipant = useCallback((participant: { id: string; name: string }) => {
        if (selectedItemId) {
            setCanvasItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItemId
                        ? { ...item, participant_id: participant.id, participant_name: participant.name }
                        : item
                )
            );
        }
        setUnifiedModalOpen(false);
    }, [selectedItemId]);

    const handleSelectSpeaker = useCallback((speaker: SpeakerSelection) => {
        if (selectedItemId) {
            setCanvasItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItemId
                        ? {
                            ...item,
                            speaker_id: speaker.id,
                            speaker_name: speaker.name,
                            speaker_topic: speaker.topic,
                            speaker_is_confirmed: speaker.is_confirmed
                        }
                        : item
                )
            );
        }
        setUnifiedModalOpen(false);
    }, [selectedItemId]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddToContainer = useCallback((selectedItem: any, type: ContainerType) => {
        if (!targetContainerId) return;

        let itemTitle: string;
        let itemDescription: string | null;
        let businessType: string | undefined;

        if (type === "business") {
            itemTitle = `${selectedItem.person_name}${selectedItem.position_calling ? ` - ${selectedItem.position_calling}` : ""}`;
            itemDescription = selectedItem.generated_script || selectedItem.notes;
            businessType = selectedItem.category;
        } else {
            itemTitle = selectedItem.title;
            itemDescription = selectedItem.description;
        }

        const newChild: ContainerChildItem = {
            id: `child-${type}-${selectedItem.id}-${Date.now()}`,
            title: itemTitle,
            description: itemDescription,
        };

        if (type === "discussion") {
            newChild.discussion_id = selectedItem.id;
            newChild.status = selectedItem.status;
        } else if (type === "business") {
            newChild.business_item_id = selectedItem.id;
            newChild.business_type = businessType;
        } else if (type === "announcement") {
            newChild.announcement_id = selectedItem.id;
            newChild.priority = selectedItem.priority;
        }

        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === targetContainerId
                    ? { ...item, childItems: [...(item.childItems || []), newChild] }
                    : item
            )
        );

        setUnifiedModalOpen(false);
        setTargetContainerId(null);
    }, [targetContainerId]);

    // Direct multi-insert from popovers — uses selectedItemId (not targetContainerId which is only set by the old modal)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddManyToContainer = useCallback((selectedItems: any[], type: ContainerType) => {
        if (!selectedItemId) return;

        setCanvasItems((prev) => {
            const containerId = selectedItemId;
            const newChildren = selectedItems.map((sel) => {
                let itemTitle: string;
                let itemDescription: string | null;
                let businessType: string | undefined;

                if (type === "business") {
                    itemTitle = `${sel.person_name}${sel.position_calling ? ` - ${sel.position_calling}` : ""}`;
                    itemDescription = sel.generated_script || sel.notes;
                    businessType = sel.category;
                } else {
                    itemTitle = sel.title;
                    itemDescription = sel.description;
                }

                const child: ContainerChildItem = {
                    id: `child-${type}-${sel.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    title: itemTitle,
                    description: itemDescription,
                };

                if (type === "discussion") {
                    child.discussion_id = sel.id;
                    child.status = sel.status;
                } else if (type === "business") {
                    child.business_item_id = sel.id;
                    child.business_type = businessType;
                } else if (type === "announcement") {
                    child.announcement_id = sel.id;
                    child.priority = sel.priority;
                }

                return child;
            });

            return prev.map((item) =>
                item.id === containerId
                    ? { ...item, childItems: [...(item.childItems || []), ...newChildren] }
                    : item
            );
        });
    }, [selectedItemId]);

    const handleUpdateTitle = useCallback((id: string, newTitle: string) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, title: newTitle } : item
            )
        );
    }, []);

    const handleUpdateDescription = useCallback((id: string, newDescription: string) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, description: newDescription } : item
            )
        );
    }, []);

    const handleUpdateItemNotes = useCallback((id: string, newNotes: string) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, item_notes: newNotes } : item
            )
        );
    }, []);

    const handleUpdateDuration = useCallback((id: string, newDuration: number) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, duration_minutes: newDuration } : item
            )
        );
    }, []);


    const handleSelectHymn = useCallback((hymn: { id: string; number: number; title: string }) => {
        if (selectedItemId) {
            setCanvasItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItemId
                        ? {
                            ...item,
                            hymn_id: hymn.id,
                            hymn_number: hymn.number,
                            hymn_title: hymn.title,
                        }
                        : item
                )
            );
        }
    }, [selectedItemId]);

    // Validation
    const validateAgenda = useCallback((): ValidationItem[] => {
        const items: ValidationItem[] = [];

        canvasItems.forEach((item) => {
            if (item.is_hymn && !item.hymn_id) {
                items.push({
                    id: `${item.id}-hymn`,
                    title: item.title,
                    status: "warning",
                    message: "Hymn not specified",
                });
            } else if (item.is_hymn && item.hymn_id) {
                items.push({
                    id: `${item.id}-hymn`,
                    title: item.hymn_title || item.title,
                    status: "success",
                });
            }

            if (item.requires_participant && item.category !== "speaker" && !item.participant_id) {
                items.push({
                    id: `${item.id}-participant`,
                    title: item.title,
                    status: "warning",
                    message: "Participant not assigned",
                });
            } else if (item.requires_participant && item.participant_id) {
                items.push({
                    id: `${item.id}-participant`,
                    title: `${item.title} - ${item.participant_name}`,
                    status: "success",
                });
            }

            if (item.category === "speaker" && !item.speaker_id) {
                items.push({
                    id: `${item.id}-speaker`,
                    title: item.title,
                    status: "warning",
                    message: "Speaker not assigned",
                });
            } else if (item.category === "speaker" && item.speaker_id) {
                items.push({
                    id: `${item.id}-speaker`,
                    title: `${item.title} - ${item.speaker_name}`,
                    status: "success",
                });
            }

            if (item.isContainer) {
                const childCount = item.childItems?.length || 0;
                if (childCount === 0) {
                    items.push({
                        id: `${item.id}-container`,
                        title: item.title,
                        status: "warning",
                        message: "No items selected (placeholder will be saved)",
                    });
                } else {
                    items.push({
                        id: `${item.id}-container`,
                        title: `${item.title} (${childCount} item${childCount !== 1 ? "s" : ""})`,
                        status: "success",
                    });
                }
            }

            if (
                item.category === "procedural" &&
                !item.is_hymn &&
                !item.requires_participant
            ) {
                items.push({
                    id: `${item.id}-procedural`,
                    title: item.title,
                    status: "success",
                });
            }
        });

        return items;
    }, [canvasItems]);

    const handleValidate = useCallback(() => {
        setValidationModalOpen(true);
        setValidationState("validating");
        setValidationItems([]);

        setTimeout(() => {
            const items = validateAgenda();
            setValidationItems(items);

            const hasWarnings = items.some((i) => i.status === "warning");
            const hasErrors = items.some((i) => i.status === "error");

            if (hasErrors) {
                setValidationState("error");
            } else if (hasWarnings) {
                setValidationState("warnings");
            } else {
                setValidationState("success");
            }
        }, 800);
    }, [validateAgenda]);

    // Create meeting
    const handleCreateMeeting = useCallback(async () => {
        setIsCreating(true);

        try {
            const supabase = createClient();

            const [hours, minutes] = time.split(":").map(Number);
            const scheduledDate = new Date(date!);
            scheduledDate.setHours(hours, minutes);

            // Build agenda items (preserving containers as container items)
            const agendaItems: CanvasItem[] = [];
            let orderIndex = 0;

            for (const item of canvasItems) {
                if (item.isContainer) {
                    // Always include containers (even if empty - they may be populated from template associations)
                    agendaItems.push({
                        id: item.id,
                        category: item.containerType!,
                        title: item.title,
                        description: item.description,
                        duration_minutes: item.duration_minutes,
                        order_index: orderIndex++,
                        isContainer: true,
                        containerType: item.containerType,
                        childItems: item.childItems || [],
                    });
                } else {
                    agendaItems.push({ ...item, order_index: orderIndex++ });
                }
            }

            const agendaJson = agendaItems.map((item) => ({
                title: item.title,
                description: item.description,
                item_notes: item.item_notes || null,
                duration_minutes: item.duration_minutes,
                order_index: item.order_index,
                item_type: item.category,
                hymn_id: item.hymn_id || null,
                speaker_id: item.speaker_id || null,
                speaker_topic: item.speaker_topic || null,
                participant_id: item.participant_id || null,
                participant_name: item.participant_name || item.speaker_name || null,
                discussion_id: item.discussion_id || null,
                business_item_id: item.business_item_id || null,
                announcement_id: item.announcement_id || null,
                structural_type: item.structural_type || null,
                // Include child items for containers
                child_items: item.isContainer && item.childItems ? item.childItems.map((child) => ({
                    title: child.title,
                    description: child.description,
                    item_notes: child.item_notes || null,
                    discussion_id: child.discussion_id || null,
                    business_item_id: child.business_item_id || null,
                    announcement_id: child.announcement_id || null,
                    // Business item fields for conducting script
                    person_name: child.person_name || null,
                    position_calling: child.position_calling || null,
                    business_category: child.business_category || null,
                    business_details: child.business_details || null,
                })) : null,
            }));


            // Update existing meeting
            if (initialMeetingId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any).rpc(
                    "update_meeting_with_agenda",
                    {
                        p_meeting_id: initialMeetingId,
                        p_title: title,
                        p_scheduled_date: scheduledDate.toISOString(),
                        p_agenda_items: agendaJson,
                        p_notes: meetingNotes,
                    }
                );

                if (error) {
                    toast.error("Failed to update meeting", { description: error.message });
                    setValidationItems([{
                        id: "error-update",
                        title: "Failed to update meeting",
                        status: "error",
                        message: error.message,
                    }]);
                    setValidationState("error");
                    return;
                }

                // Fire-and-forget: persist markdown agenda
                const markdown = generateMeetingMarkdown({
                    title, date: date!, time,
                    unitName: workspaceName,
                    presiding: form.getValues("presiding"),
                    conducting: form.getValues("conducting"),
                    chorister: form.getValues("chorister"),
                    pianistOrganist: form.getValues("pianistOrganist"),
                    meetingNotes,
                    canvasItems,
                });

                // Fire-and-forget
                saveMeetingMarkdown(initialMeetingId, markdown).catch(() => { });

                // Sync the linked Zoom meeting's start time (keepalive so it survives the redirect)
                if (linkedZoomMeetingId) {
                    fetch(`/api/meetings/${initialMeetingId}/zoom`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ start_time: scheduledDate.toISOString() }),
                        keepalive: true,
                    }).catch(() => { });
                }

                toast.success("Meeting updated", { description: "Redirecting..." });
                router.push(`/meetings/${initialMeetingId}`);
                router.refresh();
                return;
            }

            // Create new meeting
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc(
                "create_meeting_with_agenda",
                {
                    p_template_id: selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : null,
                    p_title: title,
                    p_scheduled_date: scheduledDate.toISOString(),
                    p_agenda_items: agendaJson,
                    p_notes: meetingNotes,
                }
            );

            if (error && error.code === "PGRST202") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: fallbackData, error: fallbackError } = await (supabase as any).rpc(
                    "create_meeting_from_template",
                    {
                        p_template_id: selectedTemplateId,
                        p_title: title,
                        p_scheduled_date: scheduledDate.toISOString(),
                    }
                );

                if (fallbackError) {
                    toast.error("Failed to create meeting", { description: fallbackError.message });
                    setValidationItems([{
                        id: "error-create",
                        title: "Failed to create meeting",
                        status: "error",
                        message: fallbackError.message,
                    }]);
                    setValidationState("error");
                    return;
                }

                // Fire-and-forget: persist markdown agenda
                const fallbackMarkdown = generateMeetingMarkdown({
                    title, date: date!, time,
                    unitName: workspaceName,
                    presiding: form.getValues("presiding"),
                    conducting: form.getValues("conducting"),
                    chorister: form.getValues("chorister"),
                    pianistOrganist: form.getValues("pianistOrganist"),
                    meetingNotes,
                    canvasItems,
                });
                saveMeetingMarkdown(fallbackData, fallbackMarkdown).catch(() => { });

                toast.success("Meeting created", { description: "Redirecting..." });
                router.push(`/meetings/${fallbackData}`);
                router.refresh();
                return;
            }

            if (error) {
                toast.error("Failed to create meeting", { description: error.message });
                setValidationItems([{
                    id: "error-create",
                    title: "Failed to create meeting",
                    status: "error",
                    message: error.message,
                }]);
                setValidationState("error");
                return;
            }

            // Fire-and-forget: persist markdown agenda
            const markdown = generateMeetingMarkdown({
                title, date: date!, time,
                unitName: workspaceName,
                presiding: form.getValues("presiding"),
                conducting: form.getValues("conducting"),
                chorister: form.getValues("chorister"),
                pianistOrganist: form.getValues("pianistOrganist"),
                meetingNotes,
                canvasItems,
            });
            saveMeetingMarkdown(data, markdown).catch(() => { });

            toast.success("Meeting created", { description: "Redirecting..." });
            router.push(`/meetings/${data}`);
            router.refresh();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Unable to create meeting";
            setValidationItems([{
                id: "error-create",
                title: "Failed to create meeting",
                status: "error",
                message: errorMessage,
            }]);
            setValidationState("error");
        } finally {
            setIsCreating(false);
        }
    }, [canvasItems, date, time, title, selectedTemplateId, router, form, workspaceName, initialMeetingId, meetingNotes, linkedZoomMeetingId]);

    // Duplicate the current agenda as a brand-new meeting with a different name
    const handleSaveAsNew = useCallback(async (newTitle: string) => {
        try {
            const supabase = createClient();
            const [hours, minutes] = time.split(":").map(Number);
            const scheduledDate = new Date(date!);
            scheduledDate.setHours(hours, minutes);

            const agendaItems: CanvasItem[] = [];
            let orderIndex = 0;
            for (const item of canvasItems) {
                if (item.isContainer) {
                    agendaItems.push({ ...item, order_index: orderIndex++, id: undefined as unknown as string });
                } else {
                    agendaItems.push({ ...item, order_index: orderIndex++, id: undefined as unknown as string });
                }
            }

            const agendaJson = agendaItems.map((item) => ({
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes,
                order_index: item.order_index,
                item_type: item.category,
                hymn_id: item.hymn_id || null,
                speaker_id: item.speaker_id || null,
                speaker_topic: item.speaker_topic || null,
                participant_id: item.participant_id || null,
                participant_name: item.participant_name || item.speaker_name || null,
                discussion_id: item.discussion_id || null,
                business_item_id: item.business_item_id || null,
                announcement_id: item.announcement_id || null,
                structural_type: item.structural_type || null,
                child_items: item.isContainer && item.childItems ? item.childItems.map((child) => ({
                    title: child.title,
                    description: child.description,
                    discussion_id: child.discussion_id || null,
                    business_item_id: child.business_item_id || null,
                    announcement_id: child.announcement_id || null,
                    person_name: child.person_name || null,
                    position_calling: child.position_calling || null,
                    business_category: child.business_category || null,
                    business_details: child.business_details || null,
                })) : null,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc("create_meeting_with_agenda", {
                p_template_id: null,
                p_title: newTitle,
                p_scheduled_date: scheduledDate.toISOString(),
                p_agenda_items: agendaJson,
            });

            if (error) {
                toast.error("Failed to duplicate meeting", { description: error.message });
                throw error;
            }

            toast.success("Meeting duplicated", { description: `"${newTitle}" has been created.` });
            router.push(`/meetings/builder?meeting=${data}`);
            router.refresh();
        } catch (err: unknown) {
            if (!(err instanceof Error && err.message)) {
                toast.error("Failed to duplicate meeting");
            }
            throw err;
        }
    }, [canvasItems, date, time, router]);

    const handleOverwriteTemplate = useCallback(async () => {
        if (!selectedTemplateId || selectedTemplateId === "none" || canvasItems.length === 0) return;

        const supabase = createClient();

        // Guard: Beespo Official templates (workspace_id = null) cannot be overwritten by workspace users
        const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
        if (selectedTemplate && !selectedTemplate.workspace_id) {
            // It's a Beespo Official template — only the creating sys-admin can modify it
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || selectedTemplate.created_by !== user.id) {
                toast.error("Cannot overwrite a shared template.", {
                    description: "Shared templates are managed by system administrators. Create a new template instead.",
                });
                return;
            }
        }

        setIsSavingTemplate(true);

        try {

            // Delete existing items for this template
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: deleteError } = await (supabase.from("template_items") as any)
                .delete()
                .eq("template_id", selectedTemplateId);

            if (deleteError) {
                toast.error("Failed to overwrite template.", { description: deleteError.message });
                return;
            }

            // Build template items — capture name, type, duration, order only (no values)
            // resolveItemType: derive the correct agenda_item_type from multiple signals.
            // Priority: container detection > speaker detection > structural > category/procedural.
            const CONTAINER_NAME_MAP_SAVE: Record<string, string> = {
                "Discussions": "discussion",
                "Ward Business": "business",
                "Announcements": "announcement",
            };
            const SPEAKER_TITLES = new Set(["Speaker", "Youth Speaker", "High Council Speaker", "Returning Missionary"]);

            const resolveItemType = (item: CanvasItem): string => {
                if (item.isContainer && item.containerType) return item.containerType;
                if (CONTAINER_NAME_MAP_SAVE[item.title]) return CONTAINER_NAME_MAP_SAVE[item.title];
                if (item.category === "speaker" || SPEAKER_TITLES.has(item.title)) return "speaker";
                if (item.category === "structural" || item.structural_type) return "structural";
                return item.category ?? "procedural";
            };

            const templateItems = canvasItems.map((item, idx) => ({
                template_id: selectedTemplateId,
                title: item.title,
                item_type: resolveItemType(item),
                duration_minutes: item.duration_minutes,
                order_index: idx,
                procedural_item_type_id: item.procedural_item_type_id ?? null,
                structural_type: item.structural_type ?? null,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: itemsError } = await (supabase.from("template_items") as any)
                .insert(templateItems);

            if (itemsError) {
                toast.error("Template overwritten but items failed to save.", { description: itemsError.message });
                return;
            }

            const templateName = templates.find((t) => t.id === selectedTemplateId)?.name ?? "Template";
            toast.success("Template updated", {
                description: `"${templateName}" has been overwritten with the current agenda.`,
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Unexpected error";
            toast.error("Failed to overwrite template.", { description: errorMessage });
        } finally {
            setIsSavingTemplate(false);
        }
    }, [canvasItems, selectedTemplateId, templates]);

    const handleSaveAsTemplate = useCallback(async (templateName: string) => {
        if (!templateName.trim() || canvasItems.length === 0) return;
        setIsSavingTemplate(true);

        try {
            const supabase = createClient();

            // Get current user + workspace_id
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be signed in to save a template.");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase.from("profiles") as any)
                .select("workspace_id")
                .eq("id", user.id)
                .single();

            const workspaceId = profile?.workspace_id ?? null;

            // Insert template
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: newTemplate, error: templateError } = await (supabase.from("templates") as any)
                .insert({
                    name: templateName.trim(),
                    workspace_id: workspaceId,
                    created_by: user.id,
                })
                .select("id")
                .single();

            if (templateError || !newTemplate) {
                toast.error("Failed to save template.", { description: templateError?.message });
                return;
            }

            // Build template items — capture name, type, duration, order only (no values)
            // resolveItemType: derive the correct agenda_item_type from multiple signals.
            const CONTAINER_NAME_MAP_SAVE2: Record<string, string> = {
                "Discussions": "discussion",
                "Ward Business": "business",
                "Announcements": "announcement",
            };
            const SPEAKER_TITLES2 = new Set(["Speaker", "Youth Speaker", "High Council Speaker", "Returning Missionary"]);

            const resolveItemType2 = (item: CanvasItem): string => {
                if (item.isContainer && item.containerType) return item.containerType;
                if (CONTAINER_NAME_MAP_SAVE2[item.title]) return CONTAINER_NAME_MAP_SAVE2[item.title];
                if (item.category === "speaker" || SPEAKER_TITLES2.has(item.title)) return "speaker";
                if (item.category === "structural" || item.structural_type) return "structural";
                return item.category ?? "procedural";
            };

            const templateItems = canvasItems.map((item, idx) => ({
                template_id: newTemplate.id,
                title: item.title,
                item_type: resolveItemType2(item),
                duration_minutes: item.duration_minutes,
                order_index: idx,
                procedural_item_type_id: item.procedural_item_type_id ?? null,
                structural_type: item.structural_type ?? null,
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: itemsError } = await (supabase.from("template_items") as any)
                .insert(templateItems);

            if (itemsError) {
                toast.error("Template created but items failed to save.", { description: itemsError.message });
                return;
            }

            toast.success("Template saved", {
                description: `"${templateName.trim()}" is now available in your templates.`,
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Unexpected error";
            toast.error("Failed to save template.", { description: errorMessage });
        } finally {
            setIsSavingTemplate(false);
        }
    }, [canvasItems]);

    // ─── Zoom handlers ──────────────────────────────────────────────
    const handleCreateZoom = useCallback(() => {
        if (!isZoomConnected) {
            toast.error("Zoom not connected", {
                description: "Go to Settings → Integrations to connect your Zoom account.",
            });
            return;
        }
        const duration = canvasItems.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
        setZoomCreateDuration(duration > 0 ? duration : 40);
        setZoomCreateOpen(true);
    }, [isZoomConnected, canvasItems]);

    const handleConfirmCreateZoom = useCallback(async () => {
        if (!initialMeetingId) return;
        setIsCreatingZoom(true);
        setZoomCreateOpen(false);
        try {
            const res = await fetch(`/api/meetings/${initialMeetingId}/zoom`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration: zoomCreateDuration }),
            });
            if (!res.ok) {
                const data = await res.json();
                if (data.error === "zoom_not_connected") {
                    toast.error("Zoom not connected", {
                        description: "Go to Settings → Integrations to connect your Zoom account.",
                    });
                } else {
                    toast.error("Failed to create Zoom meeting. Please try again.");
                }
                return;
            }
            const result = await res.json();
            setZoomJoinUrl(result.zoom_join_url);
            setZoomStartUrl(result.zoom_start_url);
            setZoomPasscode(result.zoom_passcode);
            if (result.zoom_meeting_id) setLinkedZoomMeetingId(result.zoom_meeting_id);
            toast.success("Zoom meeting created");
        } catch {
            toast.error("Failed to create Zoom meeting. Please try again.");
        } finally {
            setIsCreatingZoom(false);
        }
    }, [initialMeetingId, zoomCreateDuration]);

    // ─── Delete handler ──────────────────────────────────────────
    const handleDeleteMeeting = useCallback(async () => {
        if (!initialMeetingId) return;

        // Cancel linked Zoom meeting first
        if (linkedZoomMeetingId) {
            try {
                await fetch(`/api/meetings/${initialMeetingId}/zoom`, { method: "DELETE" });
            } catch {
                // Non-fatal — proceed with deletion
            }
        }

        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("agenda_items") as any).delete().eq("meeting_id", initialMeetingId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("meetings") as any).delete().eq("id", initialMeetingId);

        router.push("/meetings/agendas");
        router.refresh();
    }, [initialMeetingId, linkedZoomMeetingId, router]);

    const isValid = title.trim() !== "" && date !== undefined;
    const totalDuration = canvasItems.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);
    const selectedSpeakerIds = canvasItems
        .filter((i) => i.speaker_id)
        .map((i) => i.speaker_id as string);

    return (
        <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleValidate(); }} className="h-screen flex flex-col bg-muted/30">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Global Top Bar (all screen sizes) */}
                        <div className={cn("relative z-10", builderMode === "print-preview" && "bg-muted")}>
                            <BuilderTopBar
                                title={title}
                                initialMeetingId={initialMeetingId}
                                isCreating={isCreating}
                                isValid={isValid}
                                onSave={handleValidate}
                                onSaveAsNew={handleSaveAsNew}
                                markdownForDownload={() => generateMeetingMarkdown({
                                    title: form.getValues("title"),
                                    date: form.getValues("date") ?? new Date(),
                                    time: form.getValues("time") ?? "07:00",
                                    unitName: workspaceName,
                                    presiding: form.getValues("presiding"),
                                    conducting: form.getValues("conducting"),
                                    chorister: form.getValues("chorister"),
                                    pianistOrganist: form.getValues("pianistOrganist"),
                                    canvasItems,
                                })}
                                onSaveAsTemplate={openSaveTemplateDialog}
                                mode={builderMode}
                                onModeChange={setBuilderMode}
                                isLeader={isLeader}
                                totalDuration={totalDuration}
                                workspaceSlug={workspaceSlug}
                                zoomJoinUrl={zoomJoinUrl}
                                isZoomConnected={isZoomConnected}
                                isCreatingZoom={isCreatingZoom}
                                onOpenZoomSheet={() => setZoomSheetOpen(true)}
                                onAddZoom={handleCreateZoom}
                                onDelete={handleDeleteMeeting}
                                isLive={isLive}
                            />
                        </div>

                        {builderMode === "planning" && (
                            <>
                                {/* Mobile sheet toggle (hidden on lg+) — toolbox & properties */}
                                <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="icon" type="button">
                                                <List className="h-4 w-4" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 overflow-y-auto">
                                            <SheetTitle className="sr-only">Library</SheetTitle>
                                            <SheetDescription className="sr-only">Agenda items library</SheetDescription>
                                            <ToolboxPane onAddItem={handleAddCanvasItem} />
                                        </SheetContent>
                                    </Sheet>

                                    <div className="font-semibold truncate px-4">{title || "Untitled Meeting"}</div>

                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="icon" type="button">
                                                <span className="sr-only">Properties</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 overflow-y-auto">
                                            <SheetTitle className="sr-only">Properties</SheetTitle>
                                            <SheetDescription className="sr-only">Meeting properties</SheetDescription>
                                            <PropertiesPane
                                                templates={templates}
                                                meetingNotes={meetingNotes}
                                                onUpdateMeetingNotes={setMeetingNotes}
                                            />
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                {/* 3-Column Workspace */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Left Pane - Library */}
                                    <div className="hidden lg:block w-80 h-full overflow-hidden shrink-0">
                                        <ToolboxPane onAddItem={handleAddCanvasItem} />
                                    </div>

                                    {/* Center Pane - Canvas */}
                                    <div className="flex-1 h-full overflow-hidden min-w-0">
                                        <AgendaCanvas
                                            items={canvasItems}
                                            onRemoveItem={handleRemoveItem}
                                            expandedContainers={expandedContainers}
                                            onToggleContainer={toggleContainer}
                                            selectedItemId={selectedItemId}
                                            onSelectItem={setSelectedItemId}
                                            isOver={isOverCanvas}
                                            onUpdateItem={handleUpdateTitle}
                                            onUpdateDescription={handleUpdateDescription}
                                            onUpdateItemNotes={handleUpdateItemNotes}
                                            onUpdateDuration={handleUpdateDuration}
                                            onSelectHymn={handleSelectHymn}
                                            onSelectParticipant={handleSelectParticipant}
                                            onSelectDiscussion={(discs) => handleAddManyToContainer(discs, "discussion")}
                                            onSelectBusiness={(biz) => handleAddManyToContainer(biz, "business")}
                                            onSelectAnnouncement={(ann) => handleAddManyToContainer(ann, "announcement")}
                                            onSelectSpeaker={handleSelectSpeaker}
                                            selectedSpeakerIdsInMeeting={selectedSpeakerIds}
                                            onAddToContainer={openContainerAddForSelected}
                                            onRemoveChildItem={handleRemoveChildFromSelected}
                                        />
                                    </div>

                                    {/* Right Pane - Properties */}
                                    <div className="hidden lg:block w-[280px] h-full overflow-hidden shrink-0">
                                        <PropertiesPane
                                            templates={templates}
                                            meetingNotes={meetingNotes}
                                            onUpdateMeetingNotes={setMeetingNotes}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {builderMode === "print-preview" && (
                            <PrintPreviewPane
                                title={form.getValues("title")}
                                date={form.getValues("date")}
                                time={form.getValues("time")}
                                unitName={workspaceName}
                                presiding={form.getValues("presiding")}
                                conducting={form.getValues("conducting")}
                                chorister={form.getValues("chorister")}
                                pianistOrganist={form.getValues("pianistOrganist")}
                                meetingNotes={meetingNotes}
                                canvasItems={canvasItems}
                            />
                        )}

                        {builderMode === "program" && (
                            <ProgramModePane
                                title={title}
                                date={date}
                                time={time}
                                unitName={workspaceName}
                                presiding={form.getValues("presiding")}
                                conducting={form.getValues("conducting")}
                                chorister={form.getValues("chorister")}
                                pianistOrganist={form.getValues("pianistOrganist")}
                                meetingNotes={meetingNotes}
                                canvasItems={canvasItems}
                                isLeader={isLeader}
                                isLive={isLive}
                                isTogglingLive={isTogglingLive}
                                liveUrl={getLiveUrl()}
                                onGoLive={handleGoLive}
                                onCopyLiveLink={handleCopyLiveLink}
                            />
                        )}
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {activeItem && activeType === "toolbox" && (
                            <ToolboxItemDragOverlay item={activeItem as ToolboxItem} />
                        )}
                    </DragOverlay>

                    {/* Unified Selector Modal */}
                    <UnifiedSelectorModal
                        open={unifiedModalOpen}
                        onClose={() => {
                            setUnifiedModalOpen(false);
                            setTargetContainerId(null);
                        }}
                        mode={unifiedModalMode}
                        currentSelectionId={
                            selectedItemId
                                ? canvasItems.find((i) => i.id === selectedItemId)?.participant_id ||
                                canvasItems.find((i) => i.id === selectedItemId)?.speaker_id
                                : undefined
                        }
                        onSelectParticipant={handleSelectParticipant}
                        onSelectSpeaker={handleSelectSpeaker}
                        onSelectDiscussion={(disc) => handleAddToContainer(disc, "discussion")}
                        onSelectBusiness={(biz) => handleAddToContainer(biz, "business")}
                        onSelectAnnouncement={(ann) => handleAddToContainer(ann, "announcement")}
                        selectedSpeakerIdsInMeeting={selectedSpeakerIds}
                    />

                    {/* Validation Modal */}
                    <ValidationModal
                        open={validationModalOpen}
                        onClose={() => setValidationModalOpen(false)}
                        state={validationState}
                        items={validationItems}
                        onReviewAgenda={() => setValidationModalOpen(false)}
                        onProceed={handleCreateMeeting}
                        onRetry={handleValidate}
                        isCreating={isCreating}
                    />

                    {/* Save as Template — Step 1: Choose Overwrite or Create New */}
                    <Dialog open={templateDialogStep === "choose"} onOpenChange={(open) => !open && closeSaveTemplateDialog()}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Save Template</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                                You currently have <span className="font-medium text-foreground">{templates.find(t => t.id === form.getValues("templateId"))?.name}</span> selected as a template. What would you like to do?
                            </p>
                            <DialogFooter className="flex-col gap-2 sm:flex-col">
                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={() => {
                                        closeSaveTemplateDialog();
                                        handleOverwriteTemplate();
                                    }}
                                    disabled={isSavingTemplate}
                                >
                                    {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Overwrite Existing
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setTemplateName(title || "");
                                        setTemplateDialogStep("create");
                                    }}
                                >
                                    Create New Template
                                </Button>
                                <DialogClose asChild>
                                    <Button variant="ghost" size="sm" type="button" className="w-full">
                                        Cancel
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Save as Template — Step 2: Name the new template */}
                    <Dialog open={templateDialogStep === "create"} onOpenChange={(open) => !open && closeSaveTemplateDialog()}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Create New Template</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                                This will save the current agenda structure as a reusable template. Values like hymns and participants will not be saved.
                            </p>
                            <div className="space-y-1.5">
                                <Label htmlFor="template-name" className="text-xs">Template Name</Label>
                                <Input
                                    id="template-name"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    onKeyDown={(e) => {
                                        const duplicateNameExists = templates.some(
                                            (t) => t.name.trim().toLowerCase() === templateName.trim().toLowerCase()
                                        );
                                        if (e.key === "Enter" && templateName.trim() && !duplicateNameExists) {
                                            closeSaveTemplateDialog();
                                            handleSaveAsTemplate(templateName);
                                        }
                                    }}
                                    placeholder="e.g. Sacrament Meeting"
                                    className="bg-background h-8 text-sm"
                                    autoFocus
                                />
                                {templates.find(t => t.id === form.getValues("templateId"))?.name.trim().toLowerCase() === templateName.trim().toLowerCase() && (
                                    <p className="text-xs text-amber-600">
                                        This is the same name as the currently selected template. Please choose a different name.
                                    </p>
                                )}
                                {templates.find(t => t.id === form.getValues("templateId"))?.name.trim().toLowerCase() !== templateName.trim().toLowerCase() && 
                                 templates.some(t => t.name.trim().toLowerCase() === templateName.trim().toLowerCase()) && (
                                    <p className="text-xs text-destructive">
                                        A template named &ldquo;{templateName.trim()}&rdquo; already exists. Template names must be unique.
                                    </p>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" size="sm" type="button">Cancel</Button>
                                </DialogClose>
                                <Button
                                    size="sm"
                                    type="button"
                                    disabled={!templateName.trim() || templates.some(t => t.name.trim().toLowerCase() === templateName.trim().toLowerCase()) || isSavingTemplate}
                                    onClick={() => {
                                        closeSaveTemplateDialog();
                                        handleSaveAsTemplate(templateName);
                                    }}
                                >
                                    {isSavingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Template
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    {/* Zoom management sheet */}
                    {initialMeetingId && zoomJoinUrl && (
                        <ZoomMeetingSheet
                            meeting={{
                                id: initialMeetingId,
                                title: form.getValues("title"),
                                scheduled_date: (() => {
                                    const d = form.getValues("date");
                                    const t = form.getValues("time");
                                    if (!d) return null;
                                    const dt = new Date(d);
                                    if (t) {
                                        const [h, m] = t.split(":");
                                        dt.setHours(parseInt(h), parseInt(m));
                                    }
                                    return dt.toISOString();
                                })(),
                                zoom_meeting_id: linkedZoomMeetingId,
                                zoom_join_url: zoomJoinUrl,
                                zoom_start_url: zoomStartUrl,
                                zoom_passcode: zoomPasscode,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            } as any}
                            totalDuration={totalDuration}
                            isZoomFreeAccount={null}
                            open={zoomSheetOpen}
                            onOpenChange={setZoomSheetOpen}
                            onMeetingUpdate={(fields) => {
                                if ("zoom_join_url" in fields) setZoomJoinUrl(fields.zoom_join_url ?? null);
                                if ("zoom_start_url" in fields) setZoomStartUrl(fields.zoom_start_url ?? null);
                                if ("zoom_passcode" in fields) setZoomPasscode(fields.zoom_passcode ?? null);
                                if ("zoom_meeting_id" in fields) setLinkedZoomMeetingId(fields.zoom_meeting_id ?? null);
                            }}
                        />
                    )}

                    {/* Add Zoom — create dialog */}
                    <Dialog open={zoomCreateOpen} onOpenChange={(o) => !isCreatingZoom && setZoomCreateOpen(o)}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ZoomIcon className="h-4 w-4" />
                                    Add Zoom Meeting
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-1">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Duration (minutes)</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={600}
                                        value={zoomCreateDuration}
                                        onChange={(e) => setZoomCreateDuration(Number(e.target.value))}
                                        className="h-9"
                                    />
                                    {totalDuration === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            No items are timed yet — enter a duration manually.
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>
                                        {zoomCreateDuration > 40
                                            ? "Free Zoom accounts are capped at 40 minutes. Participants may be disconnected after that."
                                            : "Free Zoom accounts are limited to 40-minute meetings. Upgrade at zoom.us for longer sessions."}
                                    </span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" size="sm" type="button" onClick={() => setZoomCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" type="button" onClick={handleConfirmCreateZoom} disabled={!zoomCreateDuration}>
                                    Create Zoom Meeting
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </DndContext>
            </form>
        </Form>
    );
}
