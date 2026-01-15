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
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TemplateBuilder } from "@/components/templates/template-builder";
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
  const [tagInput, setTagInput] = useState("");

  // Template items
  const [items, setItems] = useState<TemplateItem[]>([]);

  useEffect(() => {
    loadTemplateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplateData = async () => {
    const supabase = createClient();
    const templateId = params.id as string;

    // Get template
    const { data: template, error: templateError } = await (supabase
      .from("templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
    if (!user) return; // Should handle auth redirect ideally via middleware

    const { data: profile } = await (supabase
      .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("role")
      .eq("id", user.id)
      .single();

    if (template.is_shared || !['admin', 'leader'].includes(profile?.role || '')) {
      toast({
        title: "Error",
        description: "You don't have permission to edit this template.",
        variant: "destructive",
      });
      router.push("/templates");
      return;
    }

    setName(template.name);
    setDescription(template.description || "");
    setCallingType(template.calling_type || "");
    setTags((template.tags as string[] | null) || []);

    // Get template items with join to identify hymns
    const { data: templateItems } = await supabase
      .from("template_items")
      .select("*, procedural_item_types(is_hymn)")
      .eq("template_id", templateId)
      .order("order_index");

    if (templateItems) {
      setItems(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        templateItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          duration_minutes: item.duration_minutes || 5,
          item_type: item.item_type || 'procedural',
          procedural_item_type_id: item.procedural_item_type_id,
          hymn_id: item.hymn_id,
          is_hymn_type: item.procedural_item_types?.is_hymn || false,
        }))
      );
    }

    setIsLoadingData(false);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const templateId = params.id as string;

    // Update template
    const { error: templateError } = await (supabase
      .from("templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        description: templateError.message || "Failed to update template.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Delete all existing items (simplest strategy for reordering/updates)
    await (supabase.from("template_items") as any).delete().eq("template_id", templateId); // eslint-disable-line @typescript-eslint/no-explicit-any

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
      console.log("Inserting items:", JSON.stringify(templateItemsToInsert, null, 2));
      const { error: itemsError } = await (supabase
        .from("template_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert(templateItemsToInsert);

      if (itemsError) {
        console.error("Error inserting items:", JSON.stringify(itemsError));
        console.error("Error details:", itemsError.message, itemsError.details, itemsError.hint, itemsError.code);
        toast({
          title: "Warning",
          description: "Template updated but some items failed to save: " + (itemsError.message || itemsError.code || "Unknown error"),
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Success",
      description: "Template updated successfully!",
    });

    setIsLoading(false);
    // Use push then refresh to ensure data is fresh
    router.push(`/templates/${templateId}`);
    router.refresh();
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-center text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/templates/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Template</CardTitle>
            <CardDescription>
              Update your template details and agenda items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bishopric Meeting"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="callingType">Organization</Label>
              <Select
                value={callingType}
                onValueChange={setCallingType}
                disabled={isLoading}
              >
                <SelectTrigger id="callingType">
                  <SelectValue placeholder="Select organization (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bishopric">Bishopric</SelectItem>
                  <SelectItem value="ward_council">Ward Council</SelectItem>
                  <SelectItem value="rs_presidency">
                    Relief Society Presidency
                  </SelectItem>
                  <SelectItem value="elders_quorum">
                    Elders Quorum Presidency
                  </SelectItem>
                  <SelectItem value="yw_presidency">
                    Young Women Presidency
                  </SelectItem>
                  <SelectItem value="primary_presidency">
                    Primary Presidency
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag (press Enter)"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || isLoading}
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Add tags to help organize and filter templates (e.g., Leadership, Sacrament, Sunday School)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Modular Template Builder */}
        <TemplateBuilder
          items={items}
          onChange={setItems}
          isLoading={isLoading}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/templates/${params.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
