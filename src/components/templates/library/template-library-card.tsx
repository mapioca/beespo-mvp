"use client";

import { Clock, Copy, Eye, FilePlus2, FileText, MoreHorizontal, Pencil, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LibraryTemplate } from "./types";

interface TemplateLibraryCardProps {
  template: LibraryTemplate;
  isOwned?: boolean;
  onPreview: (template: LibraryTemplate) => void;
  onUse: (template: LibraryTemplate) => void;
  isCloning?: boolean;
  onRename?: (template: LibraryTemplate) => void;
  onDelete?: (template: LibraryTemplate) => void;
  onEdit?: (template: LibraryTemplate) => void;
  onClone?: (template: LibraryTemplate) => void;
}

export function TemplateLibraryCard({
  template,
  isOwned = false,
  onPreview,
  onUse,
  isCloning,
  onRename,
  onDelete,
  onEdit,
  onClone,
}: TemplateLibraryCardProps) {
  const structurePreviewLimit = 6;
  const isBeespo = template.workspace_id === null;
  const authorName = isBeespo ? "Beespo Team" : (template.author?.full_name ?? "Community Member");
  const totalDuration = (template.items ?? []).reduce((acc, item) => acc + (item.duration_minutes ?? 0), 0);
  const itemCount = template.items?.length ?? 0;
  const tags = (template.tags as string[] | null) ?? [];
  const visibleTags = tags.slice(0, 2);
  const hiddenTags = tags.slice(2);
  const sortedItems = (template.items ?? []).slice().sort((a, b) => a.order_index - b.order_index);
  const previewItems = sortedItems.slice(0, structurePreviewLimit);
  const ownerLabel = isBeespo ? "Beespo" : authorName;

  return (
    <div
      className="group flex h-full flex-col rounded-[24px] border border-border/65 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-border/55 bg-control/55 text-foreground/66">
            <FileText className="h-[15px] w-[15px] stroke-[1.7]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.14em] text-foreground/46 uppercase">
              Template
            </p>
            <h3 className="mt-1 line-clamp-2 text-[18px] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
              {template.name}
            </h3>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-control/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.02em] text-foreground/62">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 stroke-[1.8]" />
            {totalDuration > 0 ? `${totalDuration} min` : "Flexible"}
          </span>
        </div>
      </div>

      <p className="mt-4 min-h-[40px] text-[13px] leading-[1.75] text-muted-foreground">
        {template.description || "A reusable meeting structure with prepared agenda flow and supporting details."}
      </p>

      <div className="mt-4 rounded-[20px] border border-border/55 bg-control/35 p-3 min-h-[274px]">
        <div className="flex items-center justify-between gap-3 border-b border-border/55 pb-2.5">
          <span className="text-[12px] font-semibold tracking-[-0.01em] text-foreground/72">
            Structure
          </span>
        </div>

        <div className="relative mt-2.5 flex min-h-[204px] flex-col">
          {previewItems.length > 0 ? (
            <>
              <div className="relative space-y-1.5 pl-1">
                <div className="absolute bottom-1 left-[9px] top-1 w-px bg-border/45" />
                {previewItems.map((item, index) => (
                  <div key={item.id} className="relative z-[1] flex items-start gap-2.5 text-[13px] leading-5 text-foreground/76">
                    <span className="mt-[1px] inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/60 bg-white px-1.5 text-[10px] font-semibold text-foreground/54">
                      {index + 1}
                    </span>
                    <span className="line-clamp-1 min-w-0 flex-1 pt-px">{item.title}</span>
                  </div>
                ))}
              </div>

              {itemCount > previewItems.length && (
                <button
                  type="button"
                  onClick={() => onPreview(template)}
                  className="relative mt-2 w-full overflow-hidden rounded-2xl border border-dashed border-border/50 bg-white/78 px-3 py-2 text-left transition-colors hover:bg-white"
                >
                  <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-control/55 to-transparent" />
                  <div className="relative flex items-center justify-between gap-2 text-[12px] font-medium text-foreground/58">
                    <span className="underline decoration-[0.06em] underline-offset-2">
                      + {itemCount - previewItems.length} more agenda item{itemCount - previewItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              )}
            </>
          ) : (
            <div className="flex min-h-[204px] items-center justify-center px-3">
              {isOwned ? (
                <button
                  type="button"
                  onClick={() => onEdit?.(template)}
                  className="flex w-full max-w-[260px] flex-col items-center justify-center gap-2 text-center transition-colors hover:text-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-[16px] bg-white/80 text-foreground/62">
                    <FilePlus2 className="h-4.5 w-4.5 stroke-[1.7]" />
                  </div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground/76 underline decoration-transparent underline-offset-4 transition-[text-decoration-color] hover:decoration-foreground/34">
                    Add agenda items to this template
                  </p>
                </button>
              ) : (
                <div className="flex w-full max-w-[250px] flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[16px] bg-white/80 text-foreground/62">
                    <FileText className="h-4.5 w-4.5 stroke-[1.7]" />
                  </div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground/76">
                    No agenda items defined yet
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border/55 pt-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-foreground/54">
          <span className="truncate">Owned by {ownerLabel}</span>
          <span className="text-foreground/28">•</span>
          <span>{itemCount} items</span>
        </div>

        <div className="mt-3 flex h-6 items-center gap-1.5 overflow-hidden">
          {visibleTags.map((tag) => (
            <div
              key={tag}
              className="max-w-[112px] truncate rounded-full border border-border/60 bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/62"
            >
              {tag}
            </div>
          ))}
          {hiddenTags.length > 0 && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full border border-border/60 bg-white px-2 py-0.5 text-[10px] font-medium text-foreground/62 hover:bg-control"
                  >
                    +{hiddenTags.length}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{hiddenTags.join(", ")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {tags.length === 0 && <div className="h-5" />}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button
          size="sm"
          className="h-9 flex-1 rounded-full text-[12px] font-semibold"
          onClick={() => onUse(template)}
          disabled={isCloning}
        >
          {isCloning ? "Importing..." : "Use template"}
        </Button>
        {(isOwned || isBeespo) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-control hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4 stroke-[1.8]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onPreview(template)}>
                <Eye className="mr-2 h-4 w-4" />
                Quick look
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClone?.(template)}>
                <Copy className="mr-2 h-4 w-4" />
                Clone template
              </DropdownMenuItem>
              {isOwned && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(template)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRename?.(template)}>
                    <Type className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(template)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
