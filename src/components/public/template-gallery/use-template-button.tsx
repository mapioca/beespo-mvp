"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cloneTemplateAction } from "@/app/(dashboard)/templates/library/actions";
import { toast } from "@/lib/toast";

interface UseTemplateButtonProps {
  templateId: string;
  templateSlug: string | null;
  userId: string | null;
  className?: string;
}

export function UseTemplateButton({
  templateId,
  templateSlug,
  userId,
  className,
}: UseTemplateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!userId) {
      const next = templateSlug
        ? `/template-gallery/${templateSlug}`
        : "/template-gallery";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await cloneTemplateAction(templateId);
      if (result.success) {
        toast.success("Template imported", {
          description: "The template has been added to your workspace.",
        });
        router.push("/templates/library?tab=mine");
      } else {
        toast.error(result.error ?? "Failed to import template. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button className={className} onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Importing..." : "Use This Template"}
    </Button>
  );
}
