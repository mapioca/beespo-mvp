"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  item_type: 'procedural' | 'discussion' | 'business' | 'announcement';
}

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Template fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callingType, setCallingType] = useState("");

  // Template items
  const [items, setItems] = useState<TemplateItem[]>([
    { id: crypto.randomUUID(), title: "", description: "", duration_minutes: 5, item_type: 'procedural' },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), title: "", description: "", duration_minutes: 5, item_type: 'procedural' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof TemplateItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "leader") {
      toast({
        title: "Error",
        description: "Only leaders can create templates.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create template
    const { data: template, error: templateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("templates") as any)
      .insert({
        name,
        description,
        calling_type: callingType || null,
        organization_id: profile.organization_id,
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
      setIsLoading(false);
      return;
    }

    // Create template items
    const templateItems = items
      .filter((item) => item.title.trim())
      .map((item, index) => ({
        template_id: template.id,
        title: item.title,
        description: item.description,
        duration_minutes: item.duration_minutes,
        item_type: item.item_type,
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
          description: "Template created but some items failed to save.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Success",
      description: "Template created successfully!",
    });

    setIsLoading(false);
    router.push("/templates");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
            <CardDescription>
              Define a reusable meeting template with agenda items
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
                  <SelectItem value="rs_presidency">Relief Society Presidency</SelectItem>
                  <SelectItem value="elders_quorum">Elders Quorum Presidency</SelectItem>
                  <SelectItem value="yw_presidency">Young Women Presidency</SelectItem>
                  <SelectItem value="primary_presidency">Primary Presidency</SelectItem>
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
                  Define the default agenda items for this template
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
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
                      <Label htmlFor={`item-title-${item.id}`} className="text-xs">
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
                    <div className="w-40">
                      <Label htmlFor={`item-type-${item.id}`} className="text-xs">
                        Type
                      </Label>
                      <Select
                        value={item.item_type}
                        onValueChange={(value) => updateItem(item.id, "item_type", value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`item-type-${item.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="procedural">Procedural</SelectItem>
                          <SelectItem value="discussion">Discussion</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`item-duration-${item.id}`} className="text-xs">
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
                    <Label htmlFor={`item-desc-${item.id}`} className="text-xs">
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
            onClick={() => router.push("/templates")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
