"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TemplateAgendaPreview } from "@/components/templates/template-agenda-preview";
import { cloneTemplateAction } from "@/app/(dashboard)/templates/library/actions";
import { toast } from "@/lib/toast";
import { LibraryTemplate } from "./types";

interface TemplatePreviewDialogProps {
  template: LibraryTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
}

export function TemplatePreviewDialog({ template, open, onOpenChange, workspaceId }: TemplatePreviewDialogProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);

  if (!template) return null;

  const isBeespo = template.workspace_id === null;
  const isOwned = workspaceId ? template.workspace_id === workspaceId : false;
  const authorName = isBeespo ? "Beespo Team" : (template.author?.full_name ?? "Community Member");
  const tags = (template.tags as string[] | null) ?? [];

  const handleUse = async () => {
    if (isOwned) {
      onOpenChange(false);
      router.push(`/meetings/new?templateId=${template.id}`);
      return;
    }
    setIsCloning(true);
    try {
      const result = await cloneTemplateAction(template.id);
      if (result.success && result.id) {
        toast.success("Template imported", {
          description: "The template has been added to your workspace.",
        });
        onOpenChange(false);
        router.push("/templates/library?tab=mine");
      } else {
        toast.error(result.error ?? "Failed to import template. Please try again.");
      }
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-xl leading-tight">{template.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{authorName}</p>
            </div>
            <Badge variant={isBeespo ? "secondary" : "outline"} className="text-[10px] uppercase shrink-0 mt-1">
              {isBeespo ? "Beespo" : "Community"}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Agenda preview */}
          <ScrollArea className="flex-1 px-6 py-4">
            <TemplateAgendaPreview items={template.items ?? []} />
          </ScrollArea>

          <Separator orientation="vertical" />

          {/* Right: Metadata + CTA */}
          <div className="w-64 shrink-0 flex flex-col px-6 py-4 gap-4">
            {template.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{template.description}</p>
              </div>
            )}

            {template.calling_type && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Organization</p>
                <p className="text-sm">{template.calling_type}</p>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
                <div className="flex gap-1 flex-wrap">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4">
              <Button className="w-full" onClick={handleUse} disabled={isCloning}>
                {isCloning ? "Importing..." : "Use Template"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
