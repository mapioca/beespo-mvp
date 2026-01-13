"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { AddItemModal } from "@/components/templates/add-item-modal";
import { SortableTemplateItems } from "@/components/templates/sortable-template-items";
import { getAddedSpecializedTypes, type SpecializedItemType } from "@/types/agenda";

interface TemplateItem {
  id?: string;
  tempId?: string;
  title: string;
  description: string;
  duration_minutes: number;
  item_type: 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';
  procedural_item_type_id?: string | null;
  hymn_number?: number | null;
  hymn_title?: string | null;
  order_index?: number;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Template fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callingType, setCallingType] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>("");

  // Template items
  const [items, setItems] = useState<TemplateItem[]>([]);

  // Procedural items catalog and hymns
  const [proceduralItems, setProceduralItems] = useState<any[]>([]);
  const [hymns, setHymns] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
    loadCatalogData();
  }, []);

  const loadUserData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setWorkspaceId(profile.workspace_id);
      }
    }
  };

  const loadCatalogData = async () => {
    const supabase = createClient();

    // Load procedural items (non-hymns, global + workspace custom)
    const { data: proceduralData } = await supabase
      .from('procedural_item_types')
      .select('*')
      .eq('is_hymn', false)
      .order('order_hint');

    if (proceduralData) {
      setProceduralItems(proceduralData);
    }

    // Load hymns
    const { data: hymnsData } = await supabase
      .from('procedural_item_types')
      .select('*')
      .eq('is_hymn', true)
      .order('hymn_number');

    if (hymnsData) {
      setHymns(hymnsData);
    }
  };

  const handleAddItem = (newItem: any) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setItems([...items, { ...newItem, tempId, order_index: items.length }]);
  };

  const handleReorder = (reorderedItems: TemplateItem[]) => {
    setItems(reorderedItems);
  };

  const handleUpdateItem = (id: string, updates: Partial<TemplateItem>) => {
    setItems(items.map(item =>
      (item.id === id || item.tempId === id) ? { ...item, ...updates } : item
    ));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id && item.tempId !== id));
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !['admin', 'leader'].includes(profile.role)) {
      toast({
        title: "Error",
        description: "Only admins and leaders can create templates.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .insert({
        name,
        description,
        calling_type: callingType || null,
        workspace_id: profile.workspace_id,
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
    console.log('Items state before filtering:', items);

    const templateItems = items
      .filter((item) => item.title.trim())
      .map((item, index) => ({
        template_id: template.id,
        title: item.title,
        description: item.description || null,
        duration_minutes: item.duration_minutes,
        item_type: item.item_type,
        procedural_item_type_id: item.procedural_item_type_id || null,
        hymn_number: item.hymn_number || null,
        hymn_title: item.hymn_title || null,
        order_index: index,
      }));

    console.log('Template items to insert:', templateItems);
    console.log('Template items count:', templateItems.length);

    if (templateItems.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabase
        .from("template_items")
        .insert(templateItems)
        .select();

      console.log('Insert result:', { insertedItems, itemsError });

      if (itemsError) {
        console.error('Error inserting template items:', itemsError);
        toast({
          title: "Warning",
          description: `Template created but items failed to save: ${itemsError.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Successfully inserted items:', insertedItems);
      }
    } else {
      console.warn('No template items to insert!');
      toast({
        title: "Warning",
        description: "Template created but no items were added.",
        variant: "destructive",
      });
    }

    toast({
      title: "Success",
      description: "Template created successfully!",
    });

    setIsLoading(false);
    router.push("/templates");
    router.refresh();
  };

  const addedSpecializedTypes = getAddedSpecializedTypes(items as any);

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
                  Build your template agenda using procedural items and specialized components
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddModal(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <SortableTemplateItems
                items={items}
                onReorder={handleReorder}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No items added yet.</p>
                <p className="text-sm mt-1">Click "Add Item" to start building your template.</p>
              </div>
            )}
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
          <Button type="submit" disabled={isLoading || items.length === 0}>
            {isLoading ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </form>

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAddItem={handleAddItem}
        addedSpecializedTypes={addedSpecializedTypes}
        proceduralItems={proceduralItems}
        hymns={hymns}
        workspaceId={workspaceId}
        onCatalogUpdate={loadCatalogData}
      />
    </div>
  );
}
