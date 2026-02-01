"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateEditContent } from "@/components/templates/template-edit-content";
import { TemplateItem } from "@/components/templates/types";

export default function EditTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Template fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [callingType, setCallingType] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [createdAt, setCreatedAt] = useState("");

    // Template items
    const [items, setItems] = useState<TemplateItem[]>([]);

    // Track initial values for change detection
    const initialValuesRef = useRef<{
        name: string;
        description: string;
        callingType: string;
        tags: string[];
        items: TemplateItem[];
    } | null>(null);

    // Compute hasChanges
    const hasChanges = useCallback(() => {
        if (!initialValuesRef.current) return false;
        const initial = initialValuesRef.current;
        return (
            name !== initial.name ||
            description !== initial.description ||
            callingType !== initial.callingType ||
            JSON.stringify(tags) !== JSON.stringify(initial.tags) ||
            JSON.stringify(items) !== JSON.stringify(initial.items)
        );
    }, [name, description, callingType, tags, items]);

    useEffect(() => {
        loadTemplateData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadTemplateData = async () => {
        const supabase = createClient();
        const templateId = params.id as string;

        // Get template
        const { data: template, error: templateError } = await (supabase
            .from("templates") as ReturnType<typeof supabase.from>)
            .select("*")
            .eq("id", templateId)
            .single();

        if (templateError || !template) {
            toast({
                title: "Error",
                description: "Failed to load template.",
                variant: "destructive",
            });
            router.push("/templates");
            return;
        }

        // Check if user can edit
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await (supabase
            .from("profiles") as ReturnType<typeof supabase.from>)
            .select("role")
            .eq("id", user.id)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((template as any).is_shared || !['admin', 'leader'].includes((profile as any)?.role || '')) {
            toast({
                title: "Error",
                description: "You don't have permission to edit this template.",
                variant: "destructive",
            });
            router.push("/templates");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = template as any;
        setName(t.name);
        setDescription(t.description || "");
        setCallingType(t.calling_type || "");
        setTags((t.tags as string[] | null) || []);
        setCreatedAt(t.created_at || new Date().toISOString());

        // Get template items with join to identify hymns
        const { data: templateItems } = await supabase
            .from("template_items")
            .select("*, procedural_item_types(is_hymn)")
            .eq("template_id", templateId)
            .order("order_index");

        const loadedItems = templateItems
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? templateItems.map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description || "",
                duration_minutes: item.duration_minutes || 5,
                item_type: item.item_type || 'procedural',
                procedural_item_type_id: item.procedural_item_type_id,
                hymn_id: item.hymn_id,
                is_hymn_type: item.procedural_item_types?.is_hymn || false,
            }))
            : [];

        setItems(loadedItems);

        // Store initial values for change detection
        initialValuesRef.current = {
            name: t.name,
            description: t.description || "",
            callingType: t.calling_type || "",
            tags: (t.tags as string[] | null) || [],
            items: loadedItems,
        };

        setIsLoadingData(false);
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        const supabase = createClient();
        const templateId = params.id as string;

        // Update template
        const { error: templateError } = await (supabase
            .from("templates") as ReturnType<typeof supabase.from>)
            .update({
                name,
                description,
                calling_type: callingType || null,
                tags: tags.length > 0 ? tags : null,
            })
            .eq("id", templateId);

        if (templateError) {
            toast({
                title: "Error",
                description: "Failed to update template.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        // Delete all existing items (simplest strategy for reordering/updates)
        await (supabase.from("template_items") as ReturnType<typeof supabase.from>)
            .delete()
            .eq("template_id", templateId);

        // Insert all items
        const templateItemsToInsert = items
            .filter((item) => item.title.trim())
            .map((item, index) => ({
                template_id: templateId,
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes,
                item_type: item.item_type,
                procedural_item_type_id: item.procedural_item_type_id || null,
                hymn_id: item.hymn_id || null,
                order_index: index,
            }));

        if (templateItemsToInsert.length > 0) {
            const { error: itemsError } = await (supabase
                .from("template_items") as ReturnType<typeof supabase.from>)
                .insert(templateItemsToInsert);

            if (itemsError) {
                toast({
                    title: "Warning",
                    description: "Template updated but some items failed to save.",
                    variant: "destructive",
                });
            }
        }

        toast({
            title: "Success",
            description: "Template updated successfully!",
        });

        // Update initial values ref
        initialValuesRef.current = {
            name,
            description,
            callingType,
            tags,
            items,
        };

        setIsLoading(false);
        router.push(`/templates/${templateId}`);
        router.refresh();
    };

    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading template...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Nav - Pinned at top, never scrolls */}
            <div className="shrink-0 px-6 py-4 border-b bg-background z-10">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link href={`/templates/${params.id}`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Template
                    </Link>
                </Button>
            </div>

            {/* Two-Column Content */}
            <TemplateEditContent
                templateId={params.id as string}
                name={name}
                description={description}
                organization={callingType}
                tags={tags}
                items={items}
                createdAt={createdAt}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onOrganizationChange={setCallingType}
                onTagsChange={setTags}
                onItemsChange={setItems}
                onSave={handleSubmit}
                isSaving={isLoading}
                hasChanges={hasChanges()}
            />
        </div>
    );
}
