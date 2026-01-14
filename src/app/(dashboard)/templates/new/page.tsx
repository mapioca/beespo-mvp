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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateBuilder } from "@/components/templates/template-builder";
import { TemplateItem } from "@/components/templates/types";

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Template fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callingType, setCallingType] = useState("");

  // Template items
  const [items, setItems] = useState<TemplateItem[]>([]);

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
    const { data: template, error: templateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("templates") as any)
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
    const templateItems = items
      .filter((item) => item.title.trim())
      .map((item, index) => ({
        template_id: template.id,
        title: item.title,
        description: item.description,
        duration_minutes: item.duration_minutes,
        item_type: item.item_type,
        procedural_item_type_id: item.procedural_item_type_id || null,
        hymn_id: item.hymn_id || null,
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
