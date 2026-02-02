"use client";

import { useState, useCallback } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import { TemplateMetadataHeader } from "./template-metadata-header";
import { TemplateCanvas } from "./template-canvas";
import { ToolboxPane } from "@/components/meetings/builder/toolbox-pane";
import { ToolboxItemDragOverlay } from "@/components/meetings/builder/draggable-toolbox-item";
import { TemplateCanvasItem, ToolboxItem } from "./types";

export function TemplateBuilderPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Metadata state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [organization, setOrganization] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    // Canvas state
    const [canvasItems, setCanvasItems] = useState<TemplateCanvasItem[]>([]);

    // DnD state
    const [activeItem, setActiveItem] = useState<ToolboxItem | TemplateCanvasItem | null>(null);
    const [activeType, setActiveType] = useState<"toolbox" | "canvas" | null>(null);
    const [isOverCanvas, setIsOverCanvas] = useState(false);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

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

    // DnD handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current;

        if (data?.type === "toolbox_item") {
            setActiveItem(data.item as ToolboxItem);
            setActiveType("toolbox");
        } else {
            const item = canvasItems.find((i) => i.id === active.id);
            if (item) {
                setActiveItem(item);
                setActiveType("canvas");
            }
        }
    }, [canvasItems]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        setIsOverCanvas(
            over?.id === "template-canvas-drop-zone" ||
            canvasItems.some((i) => i.id === over?.id)
        );
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
            if (over.id !== "template-canvas-drop-zone") {
                const overIndex = canvasItems.findIndex((i) => i.id === over.id);
                if (overIndex !== -1) {
                    insertIndex = overIndex;
                }
            }

            // Create new canvas item (including containers)
            const newItem: TemplateCanvasItem = {
                id: `template-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                category: toolboxItem.category,
                title: toolboxItem.title,
                description: toolboxItem.description,
                duration_minutes: toolboxItem.duration_minutes,
                order_index: insertIndex,
                procedural_item_type_id: toolboxItem.procedural_item_type_id,
                is_hymn: toolboxItem.is_hymn,
                isNew: true,
                // Container support
                isContainer: toolboxItem.type === "container",
                containerType: toolboxItem.containerType,
            };

            // Insert and reindex
            const newItems = [...canvasItems];
            newItems.splice(insertIndex, 0, newItem);
            const reindexed = newItems.map((item, idx) => ({ ...item, order_index: idx }));
            setCanvasItems(reindexed);

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
    const handleRemoveItem = useCallback((id: string) => {
        setCanvasItems((prev) => {
            const filtered = prev.filter((i) => i.id !== id);
            return filtered.map((item, idx) => ({ ...item, order_index: idx }));
        });
    }, []);

    const handleUpdateItem = useCallback((
        id: string,
        field: keyof TemplateCanvasItem,
        value: string | number
    ) => {
        setCanvasItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    }, []);

    // Save template
    const handleSave = useCallback(async () => {
        setIsSaving(true);

        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Error",
                    description: "Not authenticated. Please log in again.",
                    variant: "destructive",
                });
                setIsSaving(false);
                return;
            }

            // Get user profile
            const { data: profile } = await (supabase
                .from("profiles") as ReturnType<typeof supabase.from>)
                .select("workspace_id, role")
                .eq("id", user.id)
                .single();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = profile as any;
            if (!p || !["admin", "leader"].includes(p.role)) {
                toast({
                    title: "Error",
                    description: "Only admins and leaders can create templates.",
                    variant: "destructive",
                });
                setIsSaving(false);
                return;
            }

            // Create template
            const { data: template, error: templateError } = await (supabase
                .from("templates") as ReturnType<typeof supabase.from>)
                .insert({
                    name,
                    description: description || null,
                    calling_type: organization || null,
                    tags: tags.length > 0 ? tags : null,
                    workspace_id: p.workspace_id,
                    created_by: user.id,
                    is_shared: false,
                })
                .select()
                .single();

            if (templateError) {
                toast({
                    title: "Error",
                    description: templateError.message || "Failed to create template.",
                    variant: "destructive",
                });
                setIsSaving(false);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t = template as any;

            // Create template items
            const templateItems = canvasItems
                .filter((item) => item.title.trim())
                .map((item, index) => ({
                    template_id: t.id,
                    title: item.title,
                    description: item.description || null,
                    duration_minutes: item.duration_minutes,
                    item_type: item.category,
                    procedural_item_type_id: item.procedural_item_type_id || null,
                    hymn_id: null,
                    order_index: index,
                }));

            if (templateItems.length > 0) {
                const { error: itemsError } = await (supabase
                    .from("template_items") as ReturnType<typeof supabase.from>)
                    .insert(templateItems);

                if (itemsError) {
                    toast({
                        title: "Warning",
                        description: "Template created but some items failed to save.",
                        variant: "destructive",
                    });
                }
            }

            toast({
                title: "Template created",
                description: "Redirecting to templates...",
            });

            // Show redirecting state and delay to ensure toast is visible
            setIsRedirecting(true);
            await new Promise((resolve) => setTimeout(resolve, 500));

            router.push("/templates");
            router.refresh();
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [name, description, organization, tags, canvasItems, router, toast]);

    // Validation
    const isValid = name.trim() !== "" && canvasItems.length > 0;
    const totalDuration = canvasItems.reduce((sum, item) => sum + item.duration_minutes, 0);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="h-screen flex flex-col">
                {/* Metadata Header */}
                <TemplateMetadataHeader
                    name={name}
                    onNameChange={setName}
                    description={description}
                    onDescriptionChange={setDescription}
                    organization={organization}
                    onOrganizationChange={setOrganization}
                    tags={tags}
                    onTagsChange={setTags}
                    onSave={handleSave}
                    isSaving={isSaving}
                    isRedirecting={isRedirecting}
                    isValid={isValid}
                    itemCount={canvasItems.length}
                    totalDuration={totalDuration}
                />

                {/* 2-Column Workspace */}
                <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                    {/* Left Pane - Toolbox (reused from meetings) */}
                    <div className="col-span-3 h-full overflow-hidden">
                        <ToolboxPane />
                    </div>

                    {/* Right Pane - Template Canvas */}
                    <div className="col-span-9 h-full overflow-hidden">
                        <TemplateCanvas
                            items={canvasItems}
                            onRemoveItem={handleRemoveItem}
                            onUpdateItem={handleUpdateItem}
                            isOver={isOverCanvas}
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
        </DndContext>
    );
}
