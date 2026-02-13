"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";
import { AdminTemplateBuilder } from "@/components/admin/templates/builder/admin-template-builder";
import type { TemplateItem } from "@/components/templates/types";
import { createClient } from "@/lib/supabase/client";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { toast } = useToast();
  const [templateData, setTemplateData] = useState<{
    name: string;
    description: string;
    tags: string[];
    items: TemplateItem[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTemplate = async () => {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: template } = await (supabase.from("templates") as any)
        .select("id, name, description, tags")
        .eq("id", templateId)
        .single();

      if (!template) {
        toast({
          title: "Error",
          description: "Template not found.",
          variant: "destructive",
        });
        router.push("/templates");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: templateItems } = await (supabase.from("template_items") as any)
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      const items: TemplateItem[] = (templateItems || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          duration_minutes: item.duration_minutes || 0,
          item_type: item.item_type,
          procedural_item_type_id: item.procedural_item_type_id,
          hymn_id: item.hymn_id,
        })
      );

      setTemplateData({
        name: template.name,
        description: template.description || "",
        tags: template.tags || [],
        items,
      });
      setIsLoading(false);
    };

    loadTemplate();
  }, [templateId, router, toast]);

  if (isLoading || !templateData) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Loading template...</p>
      </div>
    );
  }

  return (
    <AdminTemplateBuilder
      mode="edit"
      templateId={templateId}
      initialName={templateData.name}
      initialDescription={templateData.description}
      initialTags={templateData.tags}
      initialItems={templateData.items}
    />
  );
}
