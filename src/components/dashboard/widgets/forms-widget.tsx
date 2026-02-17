"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { createForm } from "@/lib/actions/form-actions";
import type { FormsData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";

interface Props {
  data: FormsData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function FormsWidget({ data, dragHandleProps, isDragging }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createForm({
        title: "Untitled Form",
        schema: { id: crypto.randomUUID(), title: "Untitled Form", fields: [] },
      });
      if (result.error) throw new Error(result.error);
      toast.success("Form created");
      if (result.data) {
        router.push(`/forms/${result.data.id}`);
      }
    } catch {
      toast.error("Failed to create form");
    } finally {
      setCreating(false);
    }
  };

  return (
    <WidgetCard
      title="Forms"
      icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {data.forms.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Create your first form
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreate}
            disabled={creating}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Form
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {data.forms.map((form) => (
              <Link
                key={form.id}
                href={`/forms/${form.id}`}
                className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {form.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.response_count} responses
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                    form.is_published
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {form.is_published ? "Published" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Link
              href="/forms"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              View all forms
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCreate}
              disabled={creating}
              className="h-7 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
