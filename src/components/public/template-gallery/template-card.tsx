"use client";

import Link from "next/link";
import { Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UseTemplateButton } from "./use-template-button";
import { TemplateThumbnail } from "./template-thumbnail";
import { GalleryTemplate } from "./types";

interface TemplateCardProps {
  template: GalleryTemplate;
  userId: string | null;
}

export function TemplateCard({ template, userId }: TemplateCardProps) {
  const items = template.items ?? [];
  const totalDuration = items.reduce((acc, i) => acc + (i.duration_minutes ?? 0), 0);
  const tags = (template.tags as string[] | null) ?? [];
  const hasSlug = template.slug !== null;

  return (
    <div className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Thumbnail area */}
      <div className="bg-muted/40 px-5 py-4 min-h-[160px] flex flex-col justify-start border-b">
        <TemplateThumbnail items={items} />
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          {totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalDuration} min
            </span>
          )}
        </div>

        {/* Calling type + tags */}
        <div className="flex flex-wrap gap-1.5">
          {template.calling_type && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {template.calling_type}
            </Badge>
          )}
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {hasSlug ? (
            <Link
              href={`/template-gallery/${template.slug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Preview
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground/40">No preview</span>
          )}
          <UseTemplateButton
            templateId={template.id}
            templateSlug={template.slug}
            userId={userId}
            className="ml-auto h-8 text-xs px-3"
          />
        </div>
      </div>
    </div>
  );
}
