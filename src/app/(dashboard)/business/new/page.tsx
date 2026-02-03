"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  BusinessItemForm,
  BusinessItemFormData,
} from "@/components/business/business-item-form";

export default function NewBusinessPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: BusinessItemFormData) => {
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast({
        title: "Error",
        description: "Only leaders and admins can create business items.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create business item with details JSONB
    const { data: businessItem, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .insert({
        person_name: formData.personName,
        position_calling: formData.positionCalling || null,
        category: formData.category,
        status: formData.status,
        action_date: formData.actionDate || null,
        notes: formData.notes || null,
        details: formData.details,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create business item.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Link template if selected
    if (formData.templateId) {
      const { error: templateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("business_templates") as any)
        .insert({
          business_item_id: businessItem.id,
          template_id: formData.templateId,
        });

      if (templateError) {
        console.error("Error linking template:", templateError);
        toast({
          title: "Warning",
          description: "Business item created but failed to link to template.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Success",
      description: "Business item created successfully!",
    });

    setIsLoading(false);

    // Navigate after a brief delay to ensure toast is visible
    setTimeout(() => {
      router.push(`/business/${businessItem.id}`);
    }, 500);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 max-w-4xl pb-12">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/business">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Business
            </Link>
          </Button>
        </div>

        <BusinessItemForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          mode="create"
        />
      </div>
    </div>
  );
}
