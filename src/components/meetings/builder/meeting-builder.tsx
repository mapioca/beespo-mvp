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
import { PropertiesPane } from "./properties-pane";
import { ToolboxPane } from "./toolbox-pane";
import { AgendaCanvas } from "./agenda-canvas";
import { ToolboxItemDragOverlay } from "./draggable-toolbox-item";
import { CanvasItem, ToolboxItem, Template } from "./types";
import { ContainerType, ContainerChildItem } from "../container-agenda-item";
import {
    UnifiedSelectorModal,
    UnifiedSelectorMode,
    SpeakerSelection,
} from "../unified-selector-modal";
import { ValidationModal, ValidationItem, ValidationState } from "../validation-modal";
import { PreviewModal } from "../preview-modal";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { saveMeetingMarkdown } from "@/lib/actions/meeting-actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export function MeetingBuilder({ initialTemplateId }: MeetingBuilderProps) {
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

    // Modal state
    const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
    const [unifiedModalMode, setUnifiedModalMode] = useState<UnifiedSelectorMode>("hymn");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [targetContainerId, setTargetContainerId] = useState<string | null>(null);

    // Validation state
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [validationState, setValidationState] = useState<ValidationState>("validating");
    const [validationItems, setValidationItems] = useState<ValidationItem[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Preview state
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewMarkdown, setPreviewMarkdown] = useState("");
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [workspaceName, setWorkspaceName] = useState("");

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
            const { data } = await supabase
                .from("templates")
                .select("*")
                .order("name");

            if (data) setTemplates(data as Template[]);

            // Fetch workspace name for preview
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await (supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from("profiles") as any)
                    .select("workspaces(name)")
                    .eq("id", user.id)
                    .single();

                if (profile?.workspaces?.name) {
                    setWorkspaceName(profile.workspaces.name);
                }
            }
        };
        fetchInitialData();
    }, []);

    // Update title when template selected
    useEffect(() => {
        if (selectedTemplateId && selectedTemplateId !== "none") {
            const t = templates.find((t) => t.id === selectedTemplateId);
            if (t && !title) {
                setTitle(`${t.name} - ${format(new Date(), "MMM d")}`);
            }
        }
    }, [selectedTemplateId, templates, title, setTitle]);

    // Load template items when template changes
    const loadTemplateItems = useCallback(async (templateId: string) => {
        if (!templateId || templateId === "none") {
            setCanvasItems([]);
            return;
        }

        const supabase = createClient();

        try {
            // Load template items
            const { data: templateItems, error } = await (supabase
                .from("template_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("*, procedural_item_types(id, name, is_hymn)")
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
                const itemName = (item.procedural_item_types?.name || item.title || "").toLowerCase();
                const isHymn = item.procedural_item_types?.is_hymn || itemName.includes("hymn");
                const requiresParticipant =
                    itemName.includes("prayer") ||
                    itemName.includes("preside") ||
                    itemName.includes("conduct") ||
                    itemName.includes("invocation") ||
                    itemName.includes("benediction") ||
                    itemName.includes("spiritual thought") ||
                    itemName.includes("testimony");

                const baseItem: CanvasItem = {
                    id: `canvas-${Date.now()}-${orderIndex}`,
                    category: item.item_type,
                    title: item.title,
                    description: item.description,
                    duration_minutes: item.duration_minutes || 5,
                    order_index: orderIndex++,
                    procedural_item_type_id: item.procedural_item_type_id,
                    is_hymn: isHymn,
                    requires_participant: requiresParticipant,
                };

                if (item.item_type === "discussion") {
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
                } else if (item.item_type === "business") {
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
                                    // Additional fields for conducting script generation
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
                } else if (item.item_type === "announcement") {
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
    }, []);

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

    // Modal handlers
    const openHymnSelector = useCallback((itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("hymn");
        setUnifiedModalOpen(true);
    }, []);

    const openParticipantSelector = useCallback((itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("participant");
        setUnifiedModalOpen(true);
    }, []);

    const openSpeakerSelector = useCallback((itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("speaker");
        setUnifiedModalOpen(true);
    }, []);

    const openContainerAddModal = useCallback((containerId: string, containerType: ContainerType) => {
        setTargetContainerId(containerId);
        setUnifiedModalMode(containerType as UnifiedSelectorMode);
        setUnifiedModalOpen(true);
    }, []);

    const handleSelectHymn = useCallback((hymn: { id: string; number: number; title: string }) => {
        if (selectedItemId) {
            setCanvasItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItemId
                        ? { ...item, hymn_id: hymn.id, hymn_number: hymn.number, hymn_title: hymn.title }
                        : item
                )
            );
        }
        setUnifiedModalOpen(false);
        setSelectedItemId(null);
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
        setSelectedItemId(null);
    }, [selectedItemId]);

    const handleSelectSpeaker = useCallback((speaker: SpeakerSelection) => {
        if (selectedItemId) {
            setCanvasItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItemId
                        ? { ...item, speaker_id: speaker.id, speaker_name: speaker.name }
                        : item
                )
            );
        }
        setUnifiedModalOpen(false);
        setSelectedItemId(null);
    }, [selectedItemId]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddToContainer = useCallback((selectedItem: any, type: ContainerType) => {
        if (!targetContainerId) return;

        let itemTitle: string;
        let itemDescription: string | null;
        let businessType: string | undefined;

        if (type === "business") {
            itemTitle = `${selectedItem.person_name}${selectedItem.position_calling ? ` - ${selectedItem.position_calling}` : ""}`;
            itemDescription = selectedItem.notes;
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

    const handleRemoveChildItem = useCallback((containerId: string, childId: string) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === containerId
                    ? { ...item, childItems: (item.childItems || []).filter((c) => c.id !== childId) }
                    : item
            )
        );
    }, []);

    const handleUpdateTitle = useCallback((id: string, newTitle: string) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, title: newTitle } : item
            )
        );
        setEditingItemId(null);
    }, []);

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

            if (item.requires_participant && !item.participant_id) {
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

    const handlePreview = useCallback(async () => {
        const valid = await form.trigger();
        if (!valid) {
            toast.error("Please fix form errors before previewing");
            return;
        }

        setPreviewModalOpen(true);
        setIsGeneratingPreview(true);

        // Small delay so the modal opens with spinner visible
        setTimeout(() => {
            const markdown = generateMeetingMarkdown({
                title: form.getValues("title"),
                date: form.getValues("date"),
                time: form.getValues("time"),
                unitName: workspaceName,
                presiding: form.getValues("presiding"),
                conducting: form.getValues("conducting"),
                chorister: form.getValues("chorister"),
                pianistOrganist: form.getValues("pianistOrganist"),
                canvasItems,
            });

            setPreviewMarkdown(markdown);
            setIsGeneratingPreview(false);
        }, 100);
    }, [form, canvasItems, workspaceName]);

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
                duration_minutes: item.duration_minutes,
                order_index: item.order_index,
                item_type: item.category,
                hymn_id: item.hymn_id || null,
                speaker_id: item.speaker_id || null,
                participant_id: item.participant_id || null,
                participant_name: item.participant_name || null,
                discussion_id: item.discussion_id || null,
                business_item_id: item.business_item_id || null,
                announcement_id: item.announcement_id || null,
                structural_type: item.structural_type || null,
                // Include child items for containers
                child_items: item.isContainer && item.childItems ? item.childItems.map((child) => ({
                    title: child.title,
                    description: child.description,
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


            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc(
                "create_meeting_with_agenda",
                {
                    p_template_id: selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : null,
                    p_title: title,
                    p_scheduled_date: scheduledDate.toISOString(),
                    p_agenda_items: agendaJson,
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
    }, [canvasItems, date, time, title, selectedTemplateId, router, form, workspaceName]);

    const isValid = title.trim() !== "" && date !== undefined;
    const selectedSpeakerIds = canvasItems
        .filter((i) => i.speaker_id)
        .map((i) => i.speaker_id as string);

    return (
        <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleValidate(); }} className="h-screen flex flex-col">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Mobile Header (Hidden on lg+) */}
                        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background shrink-0">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Menu className="h-4 w-4" />
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
                                    <Button variant="outline" size="icon">
                                        <Settings2 className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 overflow-y-auto">
                                    <SheetTitle className="sr-only">Properties</SheetTitle>
                                    <SheetDescription className="sr-only">Meeting properties</SheetDescription>
                                    <PropertiesPane
                                        templates={templates}
                                        onCreateMeeting={handleValidate}
                                        onPreview={handlePreview}
                                        isCreating={isCreating}
                                        isValid={isValid}
                                        selectedItem={canvasItems.find(i => i.id === editingItemId)}
                                        onUpdateItem={handleUpdateTitle}
                                    />
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* 3-Column Workspace */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Pane - Library */}
                            <div className="hidden lg:block w-80 h-full overflow-hidden border-r shrink-0">
                                <ToolboxPane onAddItem={handleAddCanvasItem} />
                            </div>

                            {/* Center Pane - Canvas */}
                            <div className="flex-1 h-full overflow-hidden min-w-0">
                                <AgendaCanvas
                                    items={canvasItems}
                                    onRemoveItem={handleRemoveItem}
                                    expandedContainers={expandedContainers}
                                    onToggleContainer={toggleContainer}
                                    onAddToContainer={openContainerAddModal}
                                    onRemoveChildItem={handleRemoveChildItem}
                                    onSelectHymn={openHymnSelector}
                                    onSelectParticipant={openParticipantSelector}
                                    onSelectSpeaker={openSpeakerSelector}
                                    editingItemId={editingItemId}
                                    onSelectItem={setEditingItemId}
                                    onUpdateTitle={handleUpdateTitle}
                                    isOver={isOverCanvas}
                                />
                            </div>

                            {/* Right Pane - Properties */}
                            <div className="hidden lg:block w-[280px] h-full overflow-hidden border-l shrink-0">
                                <PropertiesPane
                                    templates={templates}
                                    onCreateMeeting={handleValidate}
                                    onPreview={handlePreview}
                                    isCreating={isCreating}
                                    isValid={isValid}
                                    selectedItem={canvasItems.find(i => i.id === editingItemId)}
                                    onUpdateItem={handleUpdateTitle}
                                />
                            </div>
                        </div>
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
                            setSelectedItemId(null);
                            setTargetContainerId(null);
                        }}
                        mode={unifiedModalMode}
                        currentSelectionId={
                            selectedItemId
                                ? canvasItems.find((i) => i.id === selectedItemId)?.hymn_id ||
                                canvasItems.find((i) => i.id === selectedItemId)?.participant_id ||
                                canvasItems.find((i) => i.id === selectedItemId)?.speaker_id
                                : undefined
                        }
                        onSelectHymn={handleSelectHymn}
                        onSelectParticipant={handleSelectParticipant}
                        onSelectSpeaker={handleSelectSpeaker}
                        onSelectDiscussion={(disc) => handleAddToContainer(disc, "discussion")}
                        onSelectBusiness={(biz) => handleAddToContainer(biz, "business")}
                        onSelectAnnouncement={(ann) => handleAddToContainer(ann, "announcement")}
                        selectedSpeakerIdsInMeeting={selectedSpeakerIds}
                    />

                    {/* Preview Modal */}
                    <PreviewModal
                        open={previewModalOpen}
                        onClose={() => setPreviewModalOpen(false)}
                        markdown={previewMarkdown}
                        unitName={workspaceName}
                        isLoading={isGeneratingPreview}
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
                </DndContext>
            </form>
        </Form>
    );
}
