"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  BusinessItemForm,
  BusinessItemFormData,
} from "@/components/business/business-item-form";
import { BusinessItemDetails } from "@/lib/business-script-generator";

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Initial data for the form
  const [initialData, setInitialData] = useState<{
    personName: string;
    positionCalling: string;
    category: string;
    status: string;
    actionDate: string;
    notes: string;
    details: BusinessItemDetails | null;
    templateId: string | null;
  } | null>(null);

  useEffect(() => {
    loadBusinessData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusinessData = async () => {
    const supabase = createClient();
    const businessItemId = params.id as string;

    // Get business item
    const { data: businessItem, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .select("*")
      .eq("id", businessItemId)
      .single();

    if (error || !businessItem) {
      toast({
        title: "Error",
        description: "Failed to load business item.",
        variant: "destructive",
      });
      router.push("/business");
      return;
    }

    // Check if user can edit (leader check)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("role")
      .eq("id", user?.id)
      .single();

    if (!["leader", "admin"].includes(profile?.role || "")) {
      toast({
        title: "Error",
        description: "You don't have permission to edit this business item.",
        variant: "destructive",
      });
      router.push("/business");
      return;
    }

    // Fetch existing template link
    const { data: templateLink } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_templates") as any)
      .select("template_id")
      .eq("business_item_id", businessItemId)
      .maybeSingle();

    // Set initial data for the form
    setInitialData({
      personName: businessItem.person_name,
      positionCalling: businessItem.position_calling || "",
      category: businessItem.category,
      status: businessItem.status,
      actionDate: businessItem.action_date || "",
      notes: businessItem.notes || "",
      details: businessItem.details || null,
      templateId: templateLink?.template_id || null,
    });

    setIsLoadingData(false);
  };

  const handleSubmit = async (formData: BusinessItemFormData) => {
    setIsLoading(true);

    const supabase = createClient();
    const businessItemId = params.id as string;

    // Update business item with details JSONB
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .update({
        person_name: formData.personName,
        position_calling: formData.positionCalling || null,
        category: formData.category,
        status: formData.status,
        action_date: formData.actionDate || null,
        notes: formData.notes || null,
        details: formData.details,
      })
      .eq("id", businessItemId);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update business item.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update template link
    // First, delete any existing link
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_templates") as any)
      .delete()
      .eq("business_item_id", businessItemId);

    // Then insert new link if a template is selected
    if (formData.templateId) {
      const { error: templateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("business_templates") as any)
        .insert({
          business_item_id: businessItemId,
          template_id: formData.templateId,
        });

      if (templateError) {
        console.error("Error updating template link:", templateError);
      }
    }

    toast({
      title: "Success",
      description: "Business item updated successfully!",
    });

    setIsLoading(false);
    router.push(`/business/${businessItemId}`);
    router.refresh();
  };

  if (isLoadingData || !initialData) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          <p className="text-center text-muted-foreground">
            Loading business item...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 max-w-4xl pb-12">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={`/business/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Business Item
            </Link>
          </Button>
        </div>

        <BusinessItemForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          mode="edit"
        />
      </div>
    </div>
  );
}
