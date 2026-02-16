"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BusinessItemForm, BusinessItemFormData } from "@/components/business/business-item-form";

export default function NewBusinessItemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: BusinessItemFormData) => {
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated. Please log in again.");
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
      toast.error("Only leaders and admins can create business items.");
      setIsLoading(false);
      return;
    }

    // Create business item
    const { error } = await (supabase
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
        template_id: formData.templateId,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      });

    if (error) {
      toast.error(error.message || "Failed to create business item.");
      setIsLoading(false);
      return;
    }

    toast.success("Business item created successfully!");

    setIsLoading(false);
    router.push("/meetings/business");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/meetings/business">
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
