"use client";

import { Clock, FileText } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LibraryTemplate } from "./types";

interface TemplateLibraryCardProps {
  template: LibraryTemplate;
  isOwned?: boolean;
  onPreview: (template: LibraryTemplate) => void;
  onUse: (template: LibraryTemplate) => void;
  isCloning?: boolean;
}

export function TemplateLibraryCard({ template, isOwned = false, onPreview, onUse, isCloning }: TemplateLibraryCardProps) {
  const isBeespo = template.workspace_id === null;
  const authorName = isBeespo ? "Beespo Team" : (template.author?.full_name ?? "Community Member");
  const totalDuration = (template.items ?? []).reduce((acc, item) => acc + (item.duration_minutes ?? 0), 0);
  const itemCount = template.items?.length ?? 0;
  const tags = (template.tags as string[] | null) ?? [];

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow duration-200 group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{template.name}</h3>
          </div>
          <Badge
            variant={isOwned ? "outline" : isBeespo ? "secondary" : "outline"}
            className="text-[10px] uppercase shrink-0"
          >
            {isOwned ? "Mine" : isBeespo ? "Beespo" : "Community"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0 pb-3 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description || "No description provided."}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <span>{itemCount} items</span>
          {totalDuration > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {totalDuration} min
              </span>
            </>
          )}
          <span>·</span>
          <span className="truncate">{authorName}</span>
        </div>

        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onPreview(template)}
        >
          {isOwned ? "View" : "Preview"}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onUse(template)}
          disabled={isCloning}
        >
          {isCloning ? "Importing..." : "Use Template"}
        </Button>
      </CardFooter>
    </Card>
  );
}
