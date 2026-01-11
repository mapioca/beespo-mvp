"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Edit,
  FolderInput,
  Trash2,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Database } from "@/types/database";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";

type Template = Database['public']['Tables']['templates']['Row'];
type TemplateItem = Database['public']['Tables']['template_items']['Row'];

interface TemplateDetailPanelProps {
  template: Template | null;
  templateItems: TemplateItem[];
  canEdit: boolean;
  canCreateMeeting: boolean;
  onCreateMeeting: () => void;
  onEdit?: () => void;
  onMoveToFolder?: () => void;
  onDelete?: () => void;
}

// Helper to format calling type labels
function formatCallingType(callingType: string | null): string {
  if (!callingType) return "General";
  return callingType
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TemplateDetailPanel({
  template,
  templateItems,
  canEdit,
  canCreateMeeting,
  onCreateMeeting,
  onEdit,
  onMoveToFolder,
  onDelete,
}: TemplateDetailPanelProps) {
  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
          <div>
            <h3 className="text-lg font-semibold text-muted-foreground">
              No template selected
            </h3>
            <p className="text-sm text-muted-foreground">
              Select a template from the sidebar to view details
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration =
    templateItems?.reduce((sum, item) => sum + (item.duration_minutes || 0), 0) ||
    0;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{template.name}</h1>
              {template.is_shared ? (
                <Badge variant="secondary">Beespo Template</Badge>
              ) : (
                <Badge>Custom</Badge>
              )}
            </div>

            {template.calling_type && (
              <Badge variant="outline" className="capitalize">
                {formatCallingType(template.calling_type)}
              </Badge>
            )}

            {template.description && (
              <p className="text-muted-foreground text-base">
                {template.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {template.created_at && (
                <span>
                  Created {format(new Date(template.created_at), "MMM d, yyyy")}
                </span>
              )}
              {templateItems && templateItems.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span>
                    {templateItems.length} item{templateItems.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              {totalDuration > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {totalDuration} min total
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canCreateMeeting && (
              <Button onClick={onCreateMeeting} size="lg">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Create Meeting
              </Button>
            )}

            {canEdit && !template.is_shared && (
              <>
                {onEdit && (
                  <Button variant="outline" onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}

                {onMoveToFolder && (
                  <Button variant="outline" size="icon" onClick={onMoveToFolder}>
                    <FolderInput className="h-4 w-4" />
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Agenda Items */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Agenda Items</h2>
            <p className="text-sm text-muted-foreground">
              {templateItems?.length || 0} item{templateItems?.length !== 1 ? "s" : ""}{" "}
              in this template
            </p>
          </div>

          {templateItems && templateItems.length > 0 ? (
            <div className="space-y-3">
              {templateItems
                .sort((a, b) => a.order_index - b.order_index)
                .map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge
                            variant={getItemTypeBadgeVariant(item.item_type)}
                            className="text-xs"
                          >
                            {getItemTypeLabel(item.item_type)}
                          </Badge>
                        </div>
                        {item.duration_minutes && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            <Clock className="mr-1 h-3 w-3" />
                            {item.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">
                No agenda items defined for this template
              </p>
              {canEdit && !template.is_shared && onEdit && (
                <Button variant="link" onClick={onEdit} className="mt-2">
                  Add agenda items
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
