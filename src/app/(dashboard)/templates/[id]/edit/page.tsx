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
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  isNew?: boolean;
}

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("templates") as any)
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
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("role")
      .eq("id", user?.id)
      .single();

    if (template.is_shared || profile?.role !== "leader") {
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

    // Get template items
    const { data: templateItems } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("template_items") as any)
      .select("*")
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
        }))
      );
    }

    setIsLoadingData(false);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        duration_minutes: 5,
        isNew: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof TemplateItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const templateId = params.id as string;

    // Update template
    const { error: templateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("templates") as any)
      .update({
        name,
        description,
        calling_type: callingType || null,
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

    // Delete all existing items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("template_items") as any).delete().eq("template_id", templateId);

    // Insert all items (both existing and new)
    const templateItems = items
      .filter((item) => item.title.trim())
      .map((item, index) => ({
        template_id: templateId,
        title: item.title,
        description: item.description,
        duration_minutes: item.duration_minutes,
        order_index: index,
      }));

    if (templateItems.length > 0) {
      const { error: itemsError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("template_items") as any)
        .insert(templateItems);

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

    setIsLoading(false);
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
              <Label htmlFor="callingType">Calling Type</Label>
              <Select
                value={callingType}
                onValueChange={setCallingType}
                disabled={isLoading}
              >
                <SelectTrigger id="callingType">
                  <SelectValue placeholder="Select calling type (optional)" />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agenda Items</CardTitle>
                <CardDescription>
                  Update the default agenda items for this template
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label
                        htmlFor={`item-title-${item.id}`}
                        className="text-xs"
                      >
                        Title *
                      </Label>
                      <Input
                        id={`item-title-${item.id}`}
                        value={item.title}
                        onChange={(e) =>
                          updateItem(item.id, "title", e.target.value)
                        }
                        placeholder="Agenda item title"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="w-32">
                      <Label
                        htmlFor={`item-duration-${item.id}`}
                        className="text-xs"
                      >
                        Duration (min)
                      </Label>
                      <Input
                        id={`item-duration-${item.id}`}
                        type="number"
                        min="1"
                        value={item.duration_minutes}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "duration_minutes",
                            parseInt(e.target.value) || 5
                          )
                        }
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor={`item-desc-${item.id}`}
                      className="text-xs"
                    >
                      Description
                    </Label>
                    <Textarea
                      id={`item-desc-${item.id}`}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="Optional description"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="flex items-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1 || isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
