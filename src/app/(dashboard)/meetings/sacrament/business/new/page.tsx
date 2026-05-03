"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BusinessItemForm, BusinessItemFormData } from "@/components/business/business-item-form";
import { canEdit } from "@/lib/auth/role-permissions";

export default function NewBusinessItemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: BusinessItemFormData) => {
    setIsLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated. Please log in again.");
      setIsLoading(false);
      return;
    }

    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!canEdit(profile?.role)) {
      toast.error("You do not have permission to create business items.");
      setIsLoading(false);
      return;
    }

    const { data: businessItem, error: createError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .insert({
        person_name: formData.personName,
        position_calling: formData.positionCalling,
        category: formData.category,
        status: formData.status,
        action_date: formData.actionDate || null,
        notes: formData.notes || null,
        details: formData.details,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createError || !businessItem) {
      toast.error(createError?.message || "Failed to create business item.");
      setIsLoading(false);
      return;
    }

    if (formData.templateIds.length > 0) {
      const { error: linkError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("business_templates") as any)
        .insert(
          formData.templateIds.map((templateId) => ({
            business_item_id: businessItem.id,
            template_id: templateId,
          }))
        );

      if (linkError) {
        console.error("Error linking business item to template:", linkError);
        toast.warning("Created, but could not link to template.");
      }
    }

    toast.success("Business item created successfully!");

    setIsLoading(false);
    router.push("/meetings/sacrament/business");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/sacrament/business">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Business Items
          </Link>
        </Button>
      </div>

      <BusinessItemForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
