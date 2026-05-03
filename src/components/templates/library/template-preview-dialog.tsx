"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateAgendaPreview } from "@/components/templates/template-agenda-preview";
import { cloneTemplateAction } from "@/app/(dashboard)/library/actions";
import { toast } from "@/lib/toast";
import { LibraryTemplate } from "./types";
import { X } from "lucide-react";

interface TemplatePreviewDialogProps {
  template: LibraryTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
  currentUserId: string;
}

export function TemplatePreviewDialog({ template, open, onOpenChange, workspaceId, currentUserId }: TemplatePreviewDialogProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);

  if (!template) return null;

  const isBeespo = template.workspace_id === null;
  const isOwned = workspaceId ? template.workspace_id === workspaceId : false;
  const isCreatorOwnedOfficial = isBeespo && template.created_by === currentUserId;
  const authorName = isBeespo ? "Beespo Team" : (template.author?.full_name ?? "Community Member");
  const tags = (template.tags as string[] | null) ?? [];

  const itemCount = template.items?.length ?? 0;
  const ownerLabel = isBeespo ? "Beespo" : authorName;

  const handleUse = async () => {
    if (isOwned || isCreatorOwnedOfficial) {
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
        router.push("/library?tab=mine");
      } else {
        toast.error(result.error ?? "Failed to import template. Please try again.");
      }
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-h-[88vh] max-w-3xl overflow-hidden rounded-[28px] border border-border/70 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.16)] [&>button]:hidden">
        <div className="flex h-full min-h-0 flex-col bg-white">
          <div className="border-b border-border/60 bg-white px-8 py-7">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-control px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Template preview
                  </span>
                </div>
                <DialogTitle className="max-w-3xl text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] text-foreground">
                  {template.name}
                </DialogTitle>
                <p className="mt-4 max-w-2xl text-[13px] text-foreground/58">
                  Owned by {ownerLabel} • {itemCount} items
                </p>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-foreground/72">
                  {template.description || "No description provided for this template yet."}
                </p>
                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <div
                        key={tag}
                        className="rounded-full border border-border/60 bg-white px-2.5 py-1 text-[10px] font-medium text-foreground/62"
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Button
                  className="h-10 rounded-full px-4 text-[12px] font-semibold"
                  onClick={handleUse}
                  disabled={isCloning}
                >
                  {isCloning ? "Importing..." : "Use template"}
                </Button>
                <DialogClose className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-control hover:text-foreground">
                  <X className="h-4 w-4 stroke-[1.8]" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-8 py-7">
            <div className="rounded-[26px] border border-border/65 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
              <TemplateAgendaPreview items={template.items ?? []} />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
